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
SEARCH_MODE = _PROJECT_CONFIG.get("workflow", {}).get("search", "full")
SEARCH_CONTEXT = _PROJECT_CONFIG.get("workflow", {}).get("search_context", "medium")

# Dimension prompt files in order — add new files here to extend the pipeline
DIMENSION_FILES = [
    "dimensions_user.txt",
    "dimensions_user_2.txt",
    "dimensions_user_3.txt",
    "dimensions_user_4.txt",
    "dimensions_user_5.txt",
    "dimensions_user_6.txt",
    "dimensions_user_7.txt",
    "dimensions_user_8.txt",
]


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
        llm = llm.bind_tools([{"type": "web_search_preview", "search_context_size": SEARCH_CONTEXT}])

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

def _search_llms(config: dict):
    """Returns (llm_dimensions, llm_financial) based on SEARCH_MODE."""
    llm_plain = _build_llm(config, use_search=False)
    llm_search = _build_llm(config, use_search=True)
    if SEARCH_MODE == "none":
        return llm_plain, llm_plain
    if SEARCH_MODE == "financial_only":
        return llm_plain, llm_search
    # "full" (default)
    return llm_search, llm_search


async def run_workflow_async(company_name: str, config: dict) -> dict:
    llm_dim, llm_fin = _search_llms(config)
    llm = _build_llm(config, use_search=False)

    dimensions_system = _load("dimensions_system.txt")
    dimension_users = [
        _load(f).replace("{company_name}", company_name)
        for f in DIMENSION_FILES
    ]
    financial_user = _load("financial_webscraper_user.txt").replace("{company_name}", company_name)

    if PARALLEL_LLM:
        *dim_results, financial = await asyncio.gather(
            *[_call(llm_dim, dimensions_system, u) for u in dimension_users],
            _call(llm_fin, _load("financial_webscraper_system.txt"), financial_user),
        )
    else:
        dim_results = []
        for u in dimension_users:
            dim_results.append(await _call(llm_dim, dimensions_system, u))
        financial = await _call(llm_fin, _load("financial_webscraper_system.txt"), financial_user)

    dimensions_combined = "\n\n".join(dim_results)
    synthesis_user = (
        _load("business_value_analyst_user.txt")
        .replace("{company_name}", company_name)
        .replace("{financial_webscraper}", financial)
        .replace("{dimensions}", dimensions_combined)
    )
    synthesis = await _call(llm, _load("business_value_analyst_system.txt"), synthesis_user)

    return {
        **{f"dimension_{i+1}": r for i, r in enumerate(dim_results)},
        "financial_webscraper": financial,
        "synthesis": synthesis,
    }


# --- Streaming Workflow ---

async def run_workflow_stream(company_name: str, config: dict):
    """Async generator that yields SSE-ready JSON strings as each step completes."""
    llm_dim, llm_fin = _search_llms(config)
    llm = _build_llm(config, use_search=False)

    dimensions_system = _load("dimensions_system.txt")
    dimension_users = [
        _load(f).replace("{company_name}", company_name)
        for f in DIMENSION_FILES
    ]
    financial_user = _load("financial_webscraper_user.txt").replace("{company_name}", company_name)

    # Step keys: dimension_1 … dimension_N, financial_webscraper
    dim_keys = [f"dimension_{i+1}" for i in range(len(DIMENSION_FILES))]
    expected_steps = len(dim_keys) + 1  # + financial_webscraper

    results = {}

    if PARALLEL_LLM:
        tasks = {
            key: asyncio.create_task(_call(llm_dim, dimensions_system, u))
            for key, u in zip(dim_keys, dimension_users)
        }
        tasks["financial_webscraper"] = asyncio.create_task(
            _call(llm_fin, _load("financial_webscraper_system.txt"), financial_user)
        )

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
        for key, u in zip(dim_keys, dimension_users):
            try:
                data = await _call(llm_dim, dimensions_system, u)
                results[key] = data
                yield json.dumps({"type": "step_done", "step": key, "data": data})
            except Exception as e:
                yield json.dumps({"type": "step_error", "step": key, "message": str(e)})

        try:
            data = await _call(llm_fin, _load("financial_webscraper_system.txt"), financial_user)
            results["financial_webscraper"] = data
            yield json.dumps({"type": "step_done", "step": "financial_webscraper", "data": data})
        except Exception as e:
            yield json.dumps({"type": "step_error", "step": "financial_webscraper", "message": str(e)})

    if len(results) == expected_steps:
        yield json.dumps({"type": "step_start", "step": "synthesis"})
        dimensions_combined = "\n\n".join(results[k] for k in dim_keys)
        synthesis_user = (
            _load("business_value_analyst_user.txt")
            .replace("{company_name}", company_name)
            .replace("{financial_webscraper}", results["financial_webscraper"])
            .replace("{dimensions}", dimensions_combined)
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
