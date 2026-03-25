# ICAT — Intelligent Client Analysis Tool

> 🇬🇧 [English version](README.md)

Ein internes Capgemini-Desktop-Tool, das die Recherche von Client-Opportunities mithilfe von LLMs automatisiert. Nach Eingabe eines Unternehmensnamens führt ICAT eine mehrstufige KI-Pipeline aus — analysiert Data-Governance-Reife über 8 Dimensionen, extrahiert Finanzdaten und synthetisiert die Top-Business-Value-Opportunitäten.

---

## Inhaltsverzeichnis

- [Überblick](#überblick)
- [Architektur](#architektur)
- [Voraussetzungen](#voraussetzungen)
- [Setup & Entwicklung](#setup--entwicklung)
- [Standalone-Executable bauen](#standalone-executable-bauen)
- [Konfiguration](#konfiguration)
- [Analyse-Pipeline](#analyse-pipeline)
- [Prompt-System](#prompt-system)
- [API-Referenz](#api-referenz)
- [Frontend](#frontend)
- [Projektstruktur](#projektstruktur)

---

## Überblick

ICAT ist eine Desktop-Applikation als einzelne `.exe`. Beim Start wird ein lokaler FastAPI-Server gestartet und die Benutzeroberfläche im Browser geöffnet. Der Nutzer gibt einen Clientnamen ein, das Backend führt einen mehrstufigen LLM-Workflow aus und die Ergebnisse werden in Echtzeit in die UI gestreamt.

**Kernfunktionen:**
- 8 parallele LLM-Calls für Data-Governance-Dimensionsrecherche
- Finanzrecherche über webfähigen LLM
- Strategische Synthese mit Ranking der Top-Business-Value-Opportunitäten nach monetärem Impact
- Echtzeit-SSE-Streaming mit Reload-Recovery
- PDF-Export, Analyse-Verlauf, Zusammenfassungsfunktion
- Dark/Light Theme, mehrsprachige UI (EN, DE, FR, + weitere)
- Unterstützt OpenAI und Azure OpenAI

---

## Architektur

```
┌─────────────────────────────────────────────┐
│  ICAT.exe  (PyInstaller-Bundle)             │
│                                             │
│  ┌──────────────────┐  ┌─────────────────┐  │
│  │  FastAPI Backend │  │  React Frontend │  │
│  │  (uvicorn :8000) │  │  (als statische │  │
│  │                  │  │   Dateien)      │  │
│  └────────┬─────────┘  └────────▲────────┘  │
│           │ SSE / REST          │            │
│           └─────────────────────┘            │
└─────────────────────────────────────────────┘
           │
           ▼
   OpenAI / Azure OpenAI API
   (web_search_preview aktiviert)
```

- **Backend**: Python 3.11+, FastAPI, uvicorn, langchain-openai
- **Frontend**: React 18, Vite, TailwindCSS — gebaut und eingebettet in `backend/static/`
- **Packaging**: PyInstaller bündelt alles in eine einzelne `ICAT.exe`
- **Paketverwaltung**: `uv` (Python), `npm` (Node)

---

## Voraussetzungen

| Tool | Version | Hinweis |
|------|---------|---------|
| Python | ≥ 3.11 | |
| [uv](https://docs.astral.sh/uv/) | aktuell | Python-Paketmanager |
| Node.js + npm | beliebiges LTS | Nur für Frontend nötig |

---

## Setup & Entwicklung

### 1. Klonen und starten

```bash
git clone https://github.com/Todabolus/ICAT.git
cd ICAT
python dev.py
```

`dev.py` führt automatisch Folgendes aus:
1. `uv sync` — installiert Python-Abhängigkeiten
2. Startet das FastAPI-Backend mit Hot-Reload auf `http://localhost:8000`
3. Startet den Vite-Dev-Server auf `http://localhost:5173`

> **Hinweis:** Im Entwicklungsmodus leitet das Frontend API-Aufrufe an `localhost:8000` weiter. Hot-Reload funktioniert für Backend und Frontend unabhängig voneinander.

### 2. Erstmalige API-Key-Einrichtung

`http://localhost:5173` im Browser öffnen. Beim ersten Start erscheint der Setup-Dialog. API-Key und Provider eingeben — wird lokal unter `~/.icat/config.json` gespeichert und nie ins Repo committed.

---

## Standalone-Executable bauen

```bash
python build.py
```

`build.py` führt einen vollständigen Clean-Build durch:

1. Löscht `dist/`, `build/`, `backend/static/`, `frontend/dist/` und `ICAT.spec`
2. Führt `uv sync` aus
3. Führt `npm install && npm run build` im `frontend/`-Verzeichnis aus
4. Kopiert `frontend/dist/` → `backend/static/`
5. Führt PyInstaller mit `--onefile` aus → **`dist/ICAT.exe`**

Die resultierende `ICAT.exe` ist vollständig eigenständig — kein Python, Node oder weitere Software nötig (nur die LLM-API-Aufrufe benötigen Internet).

---

## Konfiguration

`config.toml` im Projektstamm steuert das Backend-Verhalten. Wird beim Build in die `.exe` eingebettet.

```toml
[model]
name = "gpt-4o-mini"           # Modellname / Azure Deployment Name

[workflow]
parallel = true                # true  = alle LLM-Calls laufen gleichzeitig
                               # false = sequentielle Ausführung (reduziert Rate-Limit-Druck)

search = "full"                # "full"           — Websuche bei allen Schritten
                               # "financial_only" — Websuche nur für Finanzrecherche
                               # "none"           — keine Websuche

search_context = "medium"      # Steuert wie viel Webinhalt pro Suche geladen wird
                               # "low"    — minimaler Inhalt, wenigste Tokens/Requests
                               # "medium" — ausgewogen (Standard)
                               # "high"   — maximaler Kontext, gründlichste Recherche
```

> **Tipp bei Azure Rate Limits:** `parallel = false` und `search_context = "low"` setzen, um gleichzeitige API-Anfragen deutlich zu reduzieren.

### Nutzer-Konfiguration (`~/.icat/config.json`)

Wird lokal pro Nutzer gespeichert, nie im Repo. Wird über den UI-Einstellungsdialog verwaltet.

| Feld | Beschreibung |
|------|--------------|
| `provider` | `"openai"` oder `"azure"` |
| `api_key` | OpenAI- oder Azure-API-Key |
| `endpoint` | Azure Endpoint URL (nur Azure) |
| `api_version` | Azure API-Version (Standard: `2025-04-01-preview`) |

---

## Analyse-Pipeline

Nach Eingabe eines Unternehmensnamens laufen folgende Schritte:

```
Unternehmensname
     │
     ├──► dimension_1  (DG1 — Websuche)  ─┐
     ├──► dimension_2  (DG2 — Websuche)   │
     ├──► dimension_3  (DG3 — Websuche)   │  parallel
     ├──► dimension_4  (DG4 — Websuche)   │  (wenn parallel = true)
     ├──► dimension_5  (DG5 — Websuche)   │
     ├──► dimension_6  (DG6 — Websuche)   │
     ├──► dimension_7  (DG7 — Websuche)   │
     ├──► dimension_8  (DG8 — Websuche)  ─┘
     └──► financial_webscraper (Websuche) ─┘
                    │
                    ▼
              synthesis  (keine Websuche)
                    │
                    ▼
              Ergebnis in der UI
```

Ergebnisse werden über **Server-Sent Events (SSE)** gestreamt sobald sie fertig sind. Jeder abgeschlossene Schritt sendet sofort ein `step_done`-Event, sodass die UI Teilergebnisse anzeigen kann ohne auf die gesamte Pipeline zu warten.

Bei einem Seiten-Reload kann die Verbindung über die `job_id` wiederhergestellt werden (wird als erstes SSE-Event gesendet).

---

## Prompt-System

Alle Prompts liegen in `backend/prompts/` als einfache Textdateien mit `{Platzhalter}`-Variablen.

| Datei | Verwendet für | Variablen |
|-------|---------------|-----------|
| `dimensions_system.txt` | System-Prompt für alle 8 Dimensions-Calls | — |
| `dimensions_user.txt` | Dimensions-1-User-Prompt (DG1) | `{company_name}` |
| `dimensions_user_2.txt` | Dimensions-2-User-Prompt (DG2) | `{company_name}` |
| `dimensions_user_3.txt` | Dimensions-3-User-Prompt (DG3) | `{company_name}` |
| `dimensions_user_4.txt` | Dimensions-4-User-Prompt (DG4) | `{company_name}` |
| `dimensions_user_5.txt` | Dimensions-5-User-Prompt (DG5) | `{company_name}` |
| `dimensions_user_6.txt` | Dimensions-6-User-Prompt (DG6) | `{company_name}` |
| `dimensions_user_7.txt` | Dimensions-7-User-Prompt (DG7) | `{company_name}` |
| `dimensions_user_8.txt` | Dimensions-8-User-Prompt (DG8) | `{company_name}` |
| `financial_webscraper_system.txt` | System-Prompt für Finanzrecherche | — |
| `financial_webscraper_user.txt` | User-Prompt für Finanzrecherche | `{company_name}` |
| `business_value_analyst_system.txt` | System-Prompt für Synthese | — |
| `business_value_analyst_user.txt` | User-Prompt für Synthese | `{company_name}`, `{financial_webscraper}`, `{dimensions}` |
| `summary_system.txt` | System-Prompt für die Zusammenfassungsfunktion | — |

### Neue Dimension hinzufügen

1. `backend/prompts/dimensions_user_N.txt` erstellen mit Dimensions-JSON und `{company_name}`
2. `"dimensions_user_N.txt"` zur `DIMENSION_FILES`-Liste in `backend/llm_engine.py` hinzufügen

Keine weiteren Code-Änderungen nötig — die Pipeline übernimmt es automatisch.

---

## API-Referenz

Alle Endpoints werden vom FastAPI-Backend unter `http://localhost:8000` bereitgestellt.

### `GET /api/config/status`
Gibt zurück ob ein API-Key konfiguriert ist.

```json
{ "has_key": true, "provider": "openai", "endpoint": "", "api_version": "" }
```

### `POST /api/config`
API-Zugangsdaten speichern.

```json
{ "provider": "openai", "api_key": "sk-...", "endpoint": "", "api_version": "" }
```

### `POST /api/run/stream`
Streaming-Analyse starten. Gibt SSE-Events zurück.

**Request:** `{ "company_name": "Siemens AG" }`

**SSE-Event-Typen:**

| Typ | Payload | Beschreibung |
|-----|---------|--------------|
| `job_id` | `{ "job_id": "uuid" }` | Erstes Event — für Reconnect speichern |
| `step_done` | `{ "step": "dimension_1", "data": "..." }` | Schritt erfolgreich abgeschlossen |
| `step_start` | `{ "step": "synthesis" }` | Synthese hat begonnen |
| `step_error` | `{ "step": "...", "message": "..." }` | Ein Schritt ist fehlgeschlagen |

Step-Namen: `dimension_1` … `dimension_8`, `financial_webscraper`, `synthesis`

### `GET /api/job/{job_id}/stream`
Verbindung zu einem laufenden oder abgeschlossenen Job wiederherstellen (Reload-Recovery). Gleiches SSE-Format wie oben.

### `POST /api/summarize`
Beliebigen Text per LLM zusammenfassen.

**Request:** `{ "content": "..." }`
**Response:** `{ "summary": "..." }`

### `POST /api/run` *(nicht-streamend)*
Führt die gesamte Pipeline synchron aus und gibt alle Ergebnisse auf einmal zurück. Primär für Tests.

---

## Frontend

Gebaut mit **React 18 + Vite + TailwindCSS**.

**Funktionen:**
- Echtzeit-Streaming-Ergebniskarten — jeder Schritt wird sofort nach Abschluss gerendert
- Analyse-Verlauf in `localStorage` — bleibt sitzungsübergreifend erhalten
- Zusammenfassungs-Toggle pro Ergebniskarte (klappt zur KI-Zusammenfassung ein)
- PDF-Export der vollständigen Analyse via `pdfmake`
- Dark/Light Theme
- Mehrsprachige UI: Englisch, Deutsch, Français (+ weitere in `LANGS` definiert)
- Einstellungsdialog für API-Key / Provider-Konfiguration
- Verbindungswiederherstellung bei Seiten-Reload via `job_id`

**Dev-Server:** `http://localhost:5173` (leitet `/api/*` an `localhost:8000` weiter)
**Produktion:** Gebaut in `backend/static/` und direkt von FastAPI ausgeliefert

---

## Projektstruktur

```
ICAT/
├── backend/
│   ├── main.py                  # FastAPI-App, SSE-Job-System, API-Endpoints
│   ├── llm_engine.py            # LLM-Pipeline: Dimensionen, Finanzen, Synthese
│   └── prompts/                 # Alle LLM-Prompt-Dateien
│       ├── dimensions_system.txt
│       ├── dimensions_user.txt          # DG1
│       ├── dimensions_user_2.txt        # DG2
│       ├── dimensions_user_3.txt        # DG3 (Platzhalter)
│       ├── dimensions_user_4.txt        # DG4 (Platzhalter)
│       ├── dimensions_user_5.txt        # DG5 (Platzhalter)
│       ├── dimensions_user_6.txt        # DG6 (Platzhalter)
│       ├── dimensions_user_7.txt        # DG7 (Platzhalter)
│       ├── dimensions_user_8.txt        # DG8 (Platzhalter)
│       ├── financial_webscraper_system.txt
│       ├── financial_webscraper_user.txt
│       ├── business_value_analyst_system.txt
│       ├── business_value_analyst_user.txt
│       └── summary_system.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Gesamtes Frontend (Single-Component)
│   │   ├── main.jsx
│   │   └── index.css
│   ├── public/
│   │   ├── logo_blue.svg
│   │   └── logo_white.svg
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── postcss.config.js
├── config.toml                  # Backend-Pipeline-Konfiguration (in .exe eingebettet)
├── dev.py                       # Entwicklungsserver-Starter
├── build.py                     # Produktions-Build-Skript → dist/ICAT.exe
├── pyproject.toml               # Python-Abhängigkeiten (verwaltet durch uv)
├── uv.lock                      # Gesperrter Python-Abhängigkeitsbaum
└── .gitignore
```
