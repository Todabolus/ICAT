import sys
import json
import asyncio
import tomllib
from pathlib import Path
import httpx
import certifi
from langchain_openai import ChatOpenAI, AzureChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage


def _make_async_client() -> httpx.AsyncClient:
    """Async HTTP client with explicit certifi SSL — required for PyInstaller builds."""
    return httpx.AsyncClient(verify=certifi.where())


# --- Prompt-Laden ---

def _prompts_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys._MEIPASS) / "prompts"
    return Path(__file__).parent / "prompts"


def _load(filename: str) -> str:
    return (_prompts_dir() / filename).read_text(encoding="utf-8")


# --- Projekt-Konfiguration ---

def _project_root() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys._MEIPASS)
    return Path(__file__).parent.parent


def _load_project_config() -> dict:
    path = _project_root() / "config.toml"
    if path.exists():
        with open(path, "rb") as f:
            return tomllib.load(f)
    return {}


_PROJECT_CONFIG = _load_project_config()
DEFAULT_MODEL = _PROJECT_CONFIG.get("model", {}).get("name", "gpt-5-mini")
PARALLEL_LLM = _PROJECT_CONFIG.get("workflow", {}).get("parallel", True)


# --- LLM-Factory ---

def _build_llm(config: dict, use_search: bool = False):
    provider = config.get("provider", "openai")
    api_key = config.get("api_key", "")
    model = DEFAULT_MODEL
    kwargs = {"model": model, "api_key": api_key, "http_async_client": _make_async_client()}

    if provider == "azure":
        llm = AzureChatOpenAI(
            azure_endpoint=config["endpoint"],
            api_version=config.get("api_version") or "2025-04-01-preview",
            **kwargs,
        )
    else:
        if config.get("endpoint"):
            kwargs["base_url"] = config["endpoint"]
        llm = ChatOpenAI(**kwargs)

    if use_search:
        llm = llm.bind_tools([{"type": "web_search_preview"}])

    return llm


# --- Einzelner LLM-Call ---

async def _call(llm, system: str, user: str) -> str:
    messages = [SystemMessage(content=system), HumanMessage(content=user)]
    try:
        response = await llm.ainvoke(messages)
    except Exception as e:
        cause = getattr(e, '__cause__', None) or getattr(e, '__context__', None)
        print(f"[LLM] {type(e).__name__}: {e}", flush=True)
        if cause:
            print(f"[LLM]  caused by {type(cause).__name__}: {cause}", flush=True)
        raise RuntimeError(str(e)) from e

    content = response.content
    if isinstance(content, list):
        content = "".join(
            block.get("text", "") if isinstance(block, dict) else str(block)
            for block in content
        )
    if not content:
        raise RuntimeError("Die API lieferte kein Ergebnis.")
    return content


# --- Haupt-Workflow ---

async def run_workflow_async(company_name: str, config: dict) -> dict:
    llm_search = _build_llm(config, use_search=True)
    llm = _build_llm(config, use_search=False)

    dimensions_system = _load("dimensions_system.txt")
    dimensions_user_1 = _load("dimensions_user.txt").replace("{company_name}", company_name)
    dimensions_user_2 = _load("dimensions_user_2.txt").replace("{company_name}", company_name)
    financial_user = _load("financial_webscraper_user.txt").replace("{company_name}", company_name)

    if PARALLEL_LLM:
        dimensions_1, dimensions_2, financial = await asyncio.gather(
            _call(llm_search, dimensions_system, dimensions_user_1),
            _call(llm_search, dimensions_system, dimensions_user_2),
            _call(llm_search, _load("financial_webscraper_system.txt"), financial_user),
        )
    else:
        dimensions_1 = await _call(llm_search, dimensions_system, dimensions_user_1)
        dimensions_2 = await _call(llm_search, dimensions_system, dimensions_user_2)
        financial = await _call(llm_search, _load("financial_webscraper_system.txt"), financial_user)

    synthesis_user = (
        _load("business_value_analyst_user.txt")
        .replace("{company_name}", company_name)
        .replace("{financial_webscraper}", financial)
        .replace("{dimensions_1}", dimensions_1)
        .replace("{dimensions_2}", dimensions_2)
    )
    synthesis = await _call(llm, _load("business_value_analyst_system.txt"), synthesis_user)

    return {
        "dimensions_1": dimensions_1,
        "dimensions_2": dimensions_2,
        "financial_webscraper": financial,
        "synthesis": synthesis,
    }


# --- Streaming Workflow ---

async def run_workflow_stream(company_name: str, config: dict):
    """Async generator that yields SSE-ready JSON strings as each step completes."""
    llm_search = _build_llm(config, use_search=True)
    llm = _build_llm(config, use_search=False)

    dimensions_system = _load("dimensions_system.txt")
    dimensions_user_1 = _load("dimensions_user.txt").replace("{company_name}", company_name)
    dimensions_user_2 = _load("dimensions_user_2.txt").replace("{company_name}", company_name)
    financial_user = _load("financial_webscraper_user.txt").replace("{company_name}", company_name)

    results = {}

    if PARALLEL_LLM:
        tasks = {
            "dimensions_1": asyncio.create_task(
                _call(llm_search, dimensions_system, dimensions_user_1)
            ),
            "dimensions_2": asyncio.create_task(
                _call(llm_search, dimensions_system, dimensions_user_2)
            ),
            "financial_webscraper": asyncio.create_task(
                _call(llm_search, _load("financial_webscraper_system.txt"), financial_user)
            ),
        }

        pending = set(tasks.values())
        task_to_name = {v: k for k, v in tasks.items()}

        while pending:
            done, pending = await asyncio.wait(pending, return_when=asyncio.FIRST_COMPLETED)
            for task in done:
                name = task_to_name[task]
                try:
                    data = task.result()
                    results[name] = data
                    yield json.dumps({"type": "step_done", "step": name, "data": data})
                except Exception as e:
                    yield json.dumps({"type": "step_error", "step": name, "message": str(e)})
    else:
        for name, coro in [
            ("dimensions_1", _call(llm_search, dimensions_system, dimensions_user_1)),
            ("dimensions_2", _call(llm_search, dimensions_system, dimensions_user_2)),
            ("financial_webscraper", _call(llm_search, _load("financial_webscraper_system.txt"), financial_user)),
        ]:
            try:
                data = await coro
                results[name] = data
                yield json.dumps({"type": "step_done", "step": name, "data": data})
            except Exception as e:
                yield json.dumps({"type": "step_error", "step": name, "message": str(e)})

    if len(results) == 3:
        yield json.dumps({"type": "step_start", "step": "synthesis"})
        synthesis_user = (
            _load("business_value_analyst_user.txt")
            .replace("{company_name}", company_name)
            .replace("{financial_webscraper}", results["financial_webscraper"])
            .replace("{dimensions_1}", results["dimensions_1"])
            .replace("{dimensions_2}", results["dimensions_2"])
        )
        try:
            synthesis = await _call(llm, _load("business_value_analyst_system.txt"), synthesis_user)
            yield json.dumps({"type": "step_done", "step": "synthesis", "data": synthesis})
        except Exception as e:
            yield json.dumps({"type": "step_error", "step": "synthesis", "message": str(e)})
    else:
        yield json.dumps({"type": "step_error", "step": "synthesis", "message": "Prerequisite steps failed."})


# --- Zusammenfassung ---

async def summarize_async(content: str, config: dict) -> str:
    llm = _build_llm(config, use_search=False)
    return await _call(llm, _load("summary_system.txt"), content)
