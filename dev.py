"""
Startet Backend und Frontend gleichzeitig fuer lokale Entwicklung.

Ausfuehren:  python dev.py
Beenden:     Ctrl+C
"""

import subprocess
import signal
import time
from pathlib import Path

ROOT = Path(__file__).parent


def main():
    print("=== Abhaengigkeiten synchronisieren ===")
    subprocess.run(["uv", "sync"], cwd=ROOT, check=True)

    procs = []

    try:
        backend = subprocess.Popen(
            ["uv", "run", "uvicorn", "main:app", "--reload", "--port", "8000"],
            cwd=ROOT / "backend",
        )
        procs.append(backend)

        # Kurz warten damit der Backend-Port offen ist bevor Vite startet
        time.sleep(1)

        frontend = subprocess.Popen(
            ["npm", "run", "dev"],
            cwd=ROOT / "frontend",
            shell=True,
        )
        procs.append(frontend)

        print("\nEntwicklungsserver laufen:")
        print("  Frontend:  http://localhost:5173")
        print("  Backend:   http://localhost:8000")
        print("\nCtrl+C zum Beenden\n")

        for p in procs:
            p.wait()

    except KeyboardInterrupt:
        print("\nBeende Server...")
        for p in procs:
            p.terminate()
        for p in procs:
            try:
                p.wait(timeout=5)
            except subprocess.TimeoutExpired:
                p.kill()


if __name__ == "__main__":
    main()
