from __future__ import annotations

import argparse
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
SOCIAL_SCRIPTS = ROOT / "social_generator" / "scripts" / "social"
RENDERER = SOCIAL_SCRIPTS / "render_cards.py"
MANIFEST_GENERATOR = SOCIAL_SCRIPTS / "generate_social_manifest.R"
INTEGRATION_VALIDATOR = (
    SOCIAL_SCRIPTS / "validate_social_integration.R"
)


def run(command: list[str], *, environment: dict[str, str] | None = None) -> None:
    print("+", " ".join(command), flush=True)
    subprocess.run(command, cwd=ROOT, env=environment, check=True)


def find_rscript() -> str | None:
    for variable in ("RSCRIPT_BIN", "RSCRIPT"):
        configured = os.environ.get(variable)
        if configured and Path(configured).is_file():
            return str(Path(configured).resolve())

    discovered = shutil.which("Rscript")
    if discovered:
        return discovered

    if os.name == "nt":
        local_app_data = Path(os.environ.get("LOCALAPPDATA", ""))
        program_files = Path(os.environ.get("ProgramFiles", r"C:\Program Files"))
        candidates: list[Path] = []
        for directory in (
            local_app_data / "Programs" / "R",
            program_files / "R",
        ):
            try:
                candidates.extend(directory.glob("R-*/bin/Rscript.exe"))
            except OSError:
                continue
        candidates = sorted(
            candidates,
            key=lambda path: tuple(
                int(part) for part in re.findall(r"\d+", path.parent.parent.name)
            ),
            reverse=True,
        )
        if candidates:
            return str(candidates[0])

    return None


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Run the complete text-only social-card validation pipeline"
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Render every card instead of only changed cards",
    )
    args = parser.parse_args()

    rscript = find_rscript()
    if rscript is None:
        print(
            "ERROR: Rscript was not found on PATH. "
            "Install R or run this from an R-enabled shell.",
            file=sys.stderr,
        )
        return 1

    r_environment = os.environ.copy()
    repository_r_library = ROOT / ".r-library"
    if repository_r_library.is_dir():
        r_environment["R_LIBS_USER"] = str(repository_r_library.resolve())

    run([rscript, str(MANIFEST_GENERATOR)], environment=r_environment)
    run([sys.executable, str(RENDERER), "--validate-only"])
    run([rscript, str(INTEGRATION_VALIDATOR)], environment=r_environment)
    run(
        [
            sys.executable,
            str(RENDERER),
            "--all" if args.all else "--changed",
        ]
    )

    print("Text-only social-card pipeline passed.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except subprocess.CalledProcessError as exc:
        raise SystemExit(exc.returncode)
