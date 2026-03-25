# ICAT — Intelligent Client Analysis Tool

A Capgemini-internal desktop tool that automates client opportunity research using LLMs. Given a company name, ICAT runs a multi-step AI pipeline — researching data governance maturity across 8 dimensions, extracting financial data, and synthesizing the top business value opportunities.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Setup & Development](#setup--development)
- [Building a Standalone Executable](#building-a-standalone-executable)
- [Configuration](#configuration)
- [Analysis Pipeline](#analysis-pipeline)
- [Prompt System](#prompt-system)
- [API Reference](#api-reference)
- [Frontend](#frontend)
- [Project Structure](#project-structure)

---

## Overview

ICAT is a single-binary desktop application (`.exe`). When launched, it starts a local FastAPI server and opens the UI in the browser. The user enters a client name, the backend runs a multi-step LLM workflow, and results are streamed to the UI in real time.

**Key capabilities:**
- 8 parallel LLM calls for Data Governance dimension research
- Financial research via web-enabled LLM
- Strategic synthesis ranking top business value opportunities by monetary impact
- Real-time SSE streaming with page-reload recovery
- PDF export, analysis history, summarization
- Dark/Light theme, multi-language UI (EN, DE, FR, + more)
- Supports OpenAI and Azure OpenAI

---

## Architecture

```
┌─────────────────────────────────────────────┐
│  ICAT.exe  (PyInstaller bundle)             │
│                                             │
│  ┌──────────────────┐  ┌─────────────────┐  │
│  │  FastAPI Backend │  │  React Frontend │  │
│  │  (uvicorn :8000) │  │  (served as     │  │
│  │                  │  │   static files) │  │
│  └────────┬─────────┘  └────────▲────────┘  │
│           │ SSE / REST          │            │
│           └─────────────────────┘            │
└─────────────────────────────────────────────┘
           │
           ▼
   OpenAI / Azure OpenAI API
   (web_search_preview tool enabled)
```

- **Backend**: Python 3.11+, FastAPI, uvicorn, langchain-openai
- **Frontend**: React 18, Vite, TailwindCSS — built and embedded in `backend/static/`
- **Packaging**: PyInstaller bundles everything into a single `ICAT.exe`
- **Package manager**: `uv` (Python), `npm` (Node)

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Python | ≥ 3.11 | |
| [uv](https://docs.astral.sh/uv/) | latest | Python package manager |
| Node.js + npm | any LTS | Required for frontend |

---

## Setup & Development

### 1. Clone and start

```bash
git clone https://github.com/Todabolus/ICAT.git
cd ICAT
python dev.py
```

`dev.py` does the following automatically:
1. Runs `uv sync` to install Python dependencies
2. Starts the FastAPI backend with hot-reload on `http://localhost:8000`
3. Starts the Vite dev server on `http://localhost:5173`

> **Note:** During development, the frontend proxies API calls to `localhost:8000`. Hot-reload works for both backend and frontend independently.

### 2. First-time API key setup

Open `http://localhost:5173` in your browser. The setup screen appears on first launch. Enter your API key and provider — this is saved locally at `~/.icat/config.json` and never committed to the repo.

---

## Building a Standalone Executable

```bash
python build.py
```

`build.py` performs a full clean build:

1. Deletes `dist/`, `build/`, `backend/static/`, `frontend/dist/`, and `ICAT.spec`
2. Runs `uv sync` to ensure dependencies are up to date
3. Runs `npm install && npm run build` in `frontend/`
4. Copies `frontend/dist/` → `backend/static/`
5. Runs PyInstaller with `--onefile` → **`dist/ICAT.exe`**

The resulting `ICAT.exe` is fully self-contained — no Python, Node, or internet connection required to run it (only for the LLM API calls).

---

## Configuration

`config.toml` in the project root controls backend behavior. It is bundled into the `.exe` at build time.

```toml
[model]
name = "gpt-4o-mini"           # Model name / Azure deployment name

[workflow]
parallel = true                # true = all LLM calls run concurrently
                               # false = sequential execution (reduces rate limit pressure)

search = "full"                # "full"           — web search on all steps
                               # "financial_only" — web search only for financial research
                               # "none"           — no web search on any step

search_context = "medium"      # Controls how much web content is fetched per search call
                               # "low"    — minimal content, fewest tokens/requests
                               # "medium" — balanced (default)
                               # "high"   — maximum context, most thorough
```

> **Tip for Azure rate limits:** Set `parallel = false` and `search_context = "low"` to significantly reduce concurrent API requests.

### User config (`~/.icat/config.json`)

Stored locally per user, never in the repo. Managed through the UI settings dialog.

| Field | Description |
|-------|-------------|
| `provider` | `"openai"` or `"azure"` |
| `api_key` | OpenAI or Azure API key |
| `endpoint` | Azure endpoint URL (Azure only) |
| `api_version` | Azure API version (default: `2025-04-01-preview`) |

---

## Analysis Pipeline

When a user submits a company name, the following steps run:

```
Company Name
     │
     ├──► dimension_1  (DG1 — web search)  ─┐
     ├──► dimension_2  (DG2 — web search)   │
     ├──► dimension_3  (DG3 — web search)   │  parallel
     ├──► dimension_4  (DG4 — web search)   │  (if parallel = true)
     ├──► dimension_5  (DG5 — web search)   │
     ├──► dimension_6  (DG6 — web search)   │
     ├──► dimension_7  (DG7 — web search)   │
     ├──► dimension_8  (DG8 — web search)  ─┘
     └──► financial_webscraper (web search) ─┘
                    │
                    ▼
              synthesis  (no web search)
                    │
                    ▼
              Result delivered to UI
```

Results are streamed to the frontend as they complete via **Server-Sent Events (SSE)**. Each completed step emits a `step_done` event immediately, so the UI can render partial results without waiting for the full pipeline.

If the browser page is reloaded mid-analysis, the job can be reconnected via its `job_id` (sent as the first SSE event).

---

## Prompt System

All prompts live in `backend/prompts/`. They are plain text files with `{placeholder}` variables.

| File | Used for | Variables |
|------|----------|-----------|
| `dimensions_system.txt` | System prompt shared by all 8 dimension calls | — |
| `dimensions_user.txt` | Dimension 1 user prompt (DG1) | `{company_name}` |
| `dimensions_user_2.txt` | Dimension 2 user prompt (DG2) | `{company_name}` |
| `dimensions_user_3.txt` | Dimension 3 user prompt (DG3) | `{company_name}` |
| `dimensions_user_4.txt` | Dimension 4 user prompt (DG4) | `{company_name}` |
| `dimensions_user_5.txt` | Dimension 5 user prompt (DG5) | `{company_name}` |
| `dimensions_user_6.txt` | Dimension 6 user prompt (DG6) | `{company_name}` |
| `dimensions_user_7.txt` | Dimension 7 user prompt (DG7) | `{company_name}` |
| `dimensions_user_8.txt` | Dimension 8 user prompt (DG8) | `{company_name}` |
| `financial_webscraper_system.txt` | System prompt for financial research | — |
| `financial_webscraper_user.txt` | User prompt for financial research | `{company_name}` |
| `business_value_analyst_system.txt` | System prompt for synthesis | — |
| `business_value_analyst_user.txt` | User prompt for synthesis | `{company_name}`, `{financial_webscraper}`, `{dimensions}` |
| `summary_system.txt` | System prompt for the summarization feature | — |

### Adding a new dimension

1. Create `backend/prompts/dimensions_user_N.txt` with your dimension JSON and `{company_name}`
2. Add `"dimensions_user_N.txt"` to the `DIMENSION_FILES` list in `backend/llm_engine.py`

No other code changes needed — the pipeline picks it up automatically.

---

## API Reference

All endpoints are served by the FastAPI backend at `http://localhost:8000`.

### `GET /api/config/status`
Returns whether an API key is configured.

```json
{ "has_key": true, "provider": "openai", "endpoint": "", "api_version": "" }
```

### `POST /api/config`
Save API credentials.

```json
{ "provider": "openai", "api_key": "sk-...", "endpoint": "", "api_version": "" }
```

### `POST /api/run/stream`
Start a streaming analysis. Returns SSE events.

**Request:** `{ "company_name": "Siemens AG" }`

**SSE event types:**

| Type | Payload | Description |
|------|---------|-------------|
| `job_id` | `{ "job_id": "uuid" }` | First event — save for reconnect |
| `step_done` | `{ "step": "dimension_1", "data": "..." }` | Step finished successfully |
| `step_start` | `{ "step": "synthesis" }` | Synthesis has started |
| `step_error` | `{ "step": "...", "message": "..." }` | A step failed |

Step names: `dimension_1` … `dimension_8`, `financial_webscraper`, `synthesis`

### `GET /api/job/{job_id}/stream`
Reconnect to a running or completed job (page reload recovery). Same SSE event format as above.

### `POST /api/summarize`
Summarize arbitrary text using the LLM.

**Request:** `{ "content": "..." }`
**Response:** `{ "summary": "..." }`

### `POST /api/run` *(non-streaming)*
Runs the full pipeline synchronously and returns all results at once. Primarily for testing.

---

## Frontend

Built with **React 18 + Vite + TailwindCSS**.

**Features:**
- Real-time streaming result cards — each step renders as it completes
- Analysis history stored in `localStorage` — persists across sessions
- Summarization toggle per result card (collapses to AI summary)
- PDF export of full analysis via `pdfmake`
- Dark / Light theme toggle
- Multi-language UI: English, Deutsch, Français (+ more defined in `LANGS`)
- Settings dialog for API key / provider configuration
- Reconnect on page reload via `job_id`

**Dev server:** `http://localhost:5173` (proxies `/api/*` to `localhost:8000`)
**Production:** Built into `backend/static/` and served directly by FastAPI

---

## Project Structure

```
ICAT/
├── backend/
│   ├── main.py                  # FastAPI app, SSE job system, API endpoints
│   ├── llm_engine.py            # LLM pipeline: dimensions, financial, synthesis
│   └── prompts/                 # All LLM prompt files
│       ├── dimensions_system.txt
│       ├── dimensions_user.txt          # DG1
│       ├── dimensions_user_2.txt        # DG2
│       ├── dimensions_user_3.txt        # DG3 (placeholder)
│       ├── dimensions_user_4.txt        # DG4 (placeholder)
│       ├── dimensions_user_5.txt        # DG5 (placeholder)
│       ├── dimensions_user_6.txt        # DG6 (placeholder)
│       ├── dimensions_user_7.txt        # DG7 (placeholder)
│       ├── dimensions_user_8.txt        # DG8 (placeholder)
│       ├── financial_webscraper_system.txt
│       ├── financial_webscraper_user.txt
│       ├── business_value_analyst_system.txt
│       ├── business_value_analyst_user.txt
│       └── summary_system.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Entire frontend (single-component)
│   │   ├── main.jsx
│   │   └── index.css
│   ├── public/
│   │   ├── logo_blue.svg
│   │   └── logo_white.svg
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── postcss.config.js
├── config.toml                  # Backend pipeline configuration (bundled into .exe)
├── dev.py                       # Development server launcher
├── build.py                     # Production build script → dist/ICAT.exe
├── pyproject.toml               # Python dependencies (managed by uv)
├── uv.lock                      # Locked Python dependency tree
└── .gitignore
```
