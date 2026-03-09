"""
Build-Skript: React bauen -> in backend/static kopieren -> PyInstaller ausfuehren

Voraussetzungen:
  - Node.js + npm installiert
  - uv installiert (https://docs.astral.sh/uv/)

Ausfuehren:
  python build.py
"""

import subprocess
import shutil
from pathlib import Path

ROOT = Path(__file__).parent
FRONTEND = ROOT / "frontend"
BACKEND = ROOT / "backend"
STATIC = BACKEND / "static"
DIST = ROOT / "dist"
BUILD = ROOT / "build"
SPEC = ROOT / "ICAT.spec"


def run(cmd, cwd=None, shell=False):
    print(f"\n> {' '.join(str(c) for c in cmd)}")
    subprocess.run(cmd, cwd=cwd, check=True, shell=shell)


def clean():
    """Temporaere Build-Ordner und -Dateien loeschen fuer einen sauberen Build."""
    print("=== Temporaere Build-Artefakte loeschen ===")
    for d in [DIST, BUILD, STATIC, FRONTEND / "dist"]:
        if d.exists():
            print(f"  Loesche {d}")
            shutil.rmtree(d)
    if SPEC.exists():
        print(f"  Loesche {SPEC}")
        SPEC.unlink()


def build():
    # 0. Clean
    clean()

    # 1. Abhaengigkeiten synchronisieren
    print("\n=== Abhaengigkeiten synchronisieren ===")
    run(["uv", "sync"], cwd=ROOT)

    # 1. Frontend bauen
    print("\n=== Frontend bauen ===")
    run(["npm", "install"], cwd=FRONTEND, shell=True)
    run(["npm", "run", "build"], cwd=FRONTEND, shell=True)

    # 2. Build-Output nach backend/static kopieren
    print("\n=== Frontend nach backend/static kopieren ===")
    if STATIC.exists():
        shutil.rmtree(STATIC)
    shutil.copytree(FRONTEND / "dist", STATIC)
    print(f"Kopiert: {FRONTEND / 'dist'} -> {STATIC}")

    # 3. PyInstaller
    print("\n=== PyInstaller ausfuehren ===")
    run([
        "uv", "run", "pyinstaller",
        "--onefile",
        "--name", "ICAT",
        "--add-data", f"{STATIC};static",
        "--add-data", f"{BACKEND / 'prompts'};prompts",
        "--add-data", f"{ROOT / 'config.toml'};.",
        # SSL / Zertifikate
        "--collect-data", "certifi",
        "--hidden-import", "certifi",
        # httpx / httpcore async transport (von openai genutzt)
        "--collect-all", "httpx",
        "--collect-all", "httpcore",
        "--hidden-import", "anyio",
        "--hidden-import", "anyio._backends._asyncio",
        "--hidden-import", "anyio._backends._trio",
        "--hidden-import", "sniffio",
        # charset_normalizer (requests-Abhängigkeit)
        "--collect-all", "charset_normalizer",
        "--hidden-import", "charset_normalizer",
        # uvicorn
        "--hidden-import", "uvicorn.logging",
        "--hidden-import", "uvicorn.loops",
        "--hidden-import", "uvicorn.loops.auto",
        "--hidden-import", "uvicorn.loops.asyncio",
        "--hidden-import", "uvicorn.protocols",
        "--hidden-import", "uvicorn.protocols.http",
        "--hidden-import", "uvicorn.protocols.http.auto",
        "--hidden-import", "uvicorn.protocols.http.h11_impl",
        "--hidden-import", "uvicorn.protocols.websockets.auto",
        "--hidden-import", "uvicorn.lifespan.on",
        "--hidden-import", "uvicorn.lifespan.off",
        str(BACKEND / "main.py"),
    ], cwd=ROOT)

    print(f"\n=== Fertig! Ausgabe: {DIST / 'ICAT.exe'} ===")


if __name__ == "__main__":
    build()
