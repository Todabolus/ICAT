import os
import sys

# Fix SSL certificates for PyInstaller bundle — must run before any network imports
if getattr(sys, "frozen", False):
    try:
        import certifi
        _cert = certifi.where()
        os.environ.setdefault("SSL_CERT_FILE", _cert)
        os.environ.setdefault("REQUESTS_CA_BUNDLE", _cert)
    except Exception:
        pass

import json
import uuid
import asyncio
import threading
import webbrowser
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uvicorn

from llm_engine import run_workflow_async, run_workflow_stream, summarize_async

app = FastAPI()

CONFIG_PATH = Path.home() / ".icat" / "config.json"

# In-memory job store: job_id -> { events: list[str], done: bool, waiters: set[asyncio.Event] }
jobs: dict = {}
# Strong references to background tasks to prevent garbage collection
_background_tasks: set = set()


def load_config() -> dict:
    if CONFIG_PATH.exists():
        return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    return {}


def save_config(data: dict):
    CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    CONFIG_PATH.write_text(json.dumps(data), encoding="utf-8")


class ConfigInput(BaseModel):
    provider: str       # "openai" | "azure"
    api_key: str
    endpoint: str = ""
    api_version: str = ""


class RunInput(BaseModel):
    company_name: str

class SummarizeInput(BaseModel):
    content: str


@app.get("/api/config/status")
def config_status():
    config = load_config()
    return {
        "has_key": bool(config.get("api_key")),
        "provider": config.get("provider", "openai"),
        "endpoint": config.get("endpoint", ""),
        "api_version": config.get("api_version", ""),
    }


@app.post("/api/config")
def set_config(data: ConfigInput):
    payload = data.model_dump()
    if not payload["api_key"]:
        existing = load_config()
        payload["api_key"] = existing.get("api_key", "")
    save_config(payload)
    return {"success": True}


@app.post("/api/summarize")
async def summarize_endpoint(data: SummarizeInput):
    config = load_config()
    try:
        result = await summarize_async(data.content, config)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    return {"summary": result}


@app.post("/api/run")
async def run(data: RunInput):
    config = load_config()
    try:
        result = await run_workflow_async(data.company_name, config)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    return result


async def _run_job(job_id: str, company_name: str, config: dict):
    """Background task: runs the workflow and stores events in the job store."""
    short = job_id[:8]
    print(f"[JOB {short}] starting for '{company_name}'", flush=True)
    job = jobs[job_id]
    try:
        async for event in run_workflow_stream(company_name, config):
            parsed = json.loads(event)
            detail = parsed.get('message', parsed.get('data', '')[:60] if parsed.get('data') else '')
            print(f"[JOB {short}] {parsed.get('type')}/{parsed.get('step', '')} — {detail}", flush=True)
            job["events"].append(event)
            for waiter in list(job["waiters"]):
                waiter.set()
    except Exception as e:
        print(f"[JOB {short}] EXCEPTION: {e}", flush=True)
        error_event = json.dumps({"type": "step_error", "step": "unknown", "message": str(e)})
        job["events"].append(error_event)
        for waiter in list(job["waiters"]):
            waiter.set()
    finally:
        print(f"[JOB {short}] finished, total events: {len(job['events'])}", flush=True)
        job["done"] = True
        for waiter in list(job["waiters"]):
            waiter.set()


@app.post("/api/run/stream")
async def run_stream(data: RunInput):
    """Start a background job and stream results. First SSE event contains the job_id for reload recovery."""
    config = load_config()
    job_id = str(uuid.uuid4())
    jobs[job_id] = {"events": [], "done": False, "waiters": set()}

    task = asyncio.create_task(_run_job(job_id, data.company_name, config))
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)

    print(f"[STREAM] new job {job_id[:8]} for '{data.company_name}'", flush=True)

    async def event_gen():
        # First event: job_id so the client can save it for reload recovery
        yield f"data: {json.dumps({'type': 'job_id', 'job_id': job_id})}\n\n"

        job = jobs[job_id]
        sent = 0
        while True:
            while sent < len(job["events"]):
                yield f"data: {job['events'][sent]}\n\n"
                sent += 1
            if job["done"]:
                break
            waiter = asyncio.Event()
            job["waiters"].add(waiter)
            try:
                # 60-second timeout to keep connection alive and log slow progress
                try:
                    await asyncio.wait_for(waiter.wait(), timeout=60.0)
                except asyncio.TimeoutError:
                    print(f"[STREAM] keepalive {job_id[:8]} (sent={sent}, done={job['done']})", flush=True)
                    yield ": keepalive\n\n"
            finally:
                job["waiters"].discard(waiter)

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/api/job/{job_id}/stream")
async def job_stream(job_id: str):
    """Reconnect to a running or completed job (for page reload recovery)."""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    print(f"[RECONNECT] job {job_id[:8]}", flush=True)

    async def event_gen():
        job = jobs[job_id]
        sent = 0
        while True:
            while sent < len(job["events"]):
                yield f"data: {job['events'][sent]}\n\n"
                sent += 1
            if job["done"]:
                break
            waiter = asyncio.Event()
            job["waiters"].add(waiter)
            try:
                try:
                    await asyncio.wait_for(waiter.wait(), timeout=60.0)
                except asyncio.TimeoutError:
                    yield ": keepalive\n\n"
            finally:
                job["waiters"].discard(waiter)

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# Determine base directory (handles PyInstaller bundle)
if getattr(sys, "frozen", False):
    BASE_DIR = Path(sys._MEIPASS)
else:
    BASE_DIR = Path(__file__).parent

static_dir = BASE_DIR / "static"
if static_dir.exists():
    app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="static")


def open_browser():
    webbrowser.open("http://localhost:8000")


if __name__ == "__main__":
    threading.Timer(1.5, open_browser).start()
    uvicorn.run(app, host="127.0.0.1", port=8000)
