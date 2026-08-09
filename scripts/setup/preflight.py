#!/usr/bin/env python3
"""Non-mutating checks for the repository-managed developer environment."""

from __future__ import annotations

import argparse
import importlib.util
import os
import re
import shutil
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


QUARTO_VERSION = "1.10.15"
PYTHON_IMPORTS = {
    "Jinja2": "jinja2",
    "PyYAML": "yaml",
    "playwright": "playwright",
    "Pillow": "PIL",
    "fonttools": "fontTools",
}


def _version_key(path: Path) -> tuple[int, ...]:
    numbers = re.findall(r"\d+", str(path))
    return tuple(int(number) for number in numbers)


def _existing(candidates: Iterable[Path]) -> list[Path]:
    found: list[Path] = []
    for candidate in candidates:
        try:
            if candidate.is_file():
                found.append(candidate)
        except OSError:
            continue
    return found


def _safe_glob(directory: Path, pattern: str) -> list[Path]:
    try:
        return list(directory.glob(pattern))
    except OSError:
        return []


def find_windows_tool(name: str, environment: dict[str, str] | None = None) -> str | None:
    """Find a supported Windows tool, including versioned per-user installs."""
    env = os.environ if environment is None else environment
    override_names = {
        "node": ("NODE_BIN",),
        "quarto": ("QUARTO_BIN",),
        "rscript": ("RSCRIPT_BIN", "RSCRIPT"),
        "bash": ("BASH_BIN",),
    }
    for variable in override_names.get(name.lower(), ()):
        configured = env.get(variable)
        if configured and Path(configured).is_file():
            return str(Path(configured).resolve())

    discovered = shutil.which(name, path=env.get("PATH"))
    if discovered:
        return str(Path(discovered).resolve())

    if os.name != "nt":
        return None

    local = Path(env.get("LOCALAPPDATA", ""))
    program_files = Path(env.get("ProgramFiles", r"C:\Program Files"))
    candidates: list[Path] = []
    if name.lower() == "bash":
        candidates.extend((program_files / "Git" / "bin" / "bash.exe",))
    elif name.lower() == "node":
        candidates.extend((local / "Programs" / "nodejs" / "node.exe",))
        candidates.extend(_safe_glob(local / "Programs" / "nodejs", "node-v*/node.exe"))
        candidates.extend((program_files / "nodejs" / "node.exe",))
    elif name.lower() == "quarto":
        candidates.extend((local / "Programs" / "Quarto" / "bin" / "quarto.exe",))
        candidates.extend(_safe_glob(local / "Programs" / "Quarto", "*/bin/quarto.exe"))
        candidates.extend((program_files / "Quarto" / "bin" / "quarto.exe",))
    elif name.lower() == "rscript":
        candidates.extend(_safe_glob(local / "Programs" / "R", "R-*/bin/Rscript.exe"))
        candidates.extend(_safe_glob(program_files / "R", "R-*/bin/Rscript.exe"))

    found = sorted(_existing(candidates), key=_version_key, reverse=True)
    return str(found[0].resolve()) if found else None


def find_tool(name: str) -> str | None:
    if os.name == "nt":
        return find_windows_tool(name)
    override = {
        "node": "NODE_BIN",
        "quarto": "QUARTO_BIN",
        "rscript": "RSCRIPT_BIN",
    }.get(name.lower())
    if override and os.environ.get(override):
        configured = Path(os.environ[override])
        if configured.is_file():
            return str(configured.resolve())
    if name.lower() == "rscript" and os.environ.get("RSCRIPT"):
        configured = Path(os.environ["RSCRIPT"])
        if configured.is_file():
            return str(configured.resolve())
    return shutil.which(name)


def command_version(command: str, *arguments: str) -> str:
    completed = subprocess.run(
        [command, *arguments],
        check=False,
        capture_output=True,
        text=True,
    )
    output = (completed.stdout or completed.stderr).strip().splitlines()
    if completed.returncode != 0 or not output:
        raise RuntimeError(f"could not execute {command}")
    return output[0].strip()


def expected_venv_python(repo_root: Path) -> Path:
    relative = Path(".venv/Scripts/python.exe") if os.name == "nt" else Path(".venv/bin/python")
    return (repo_root / relative).resolve()


def missing_python_imports() -> list[str]:
    return [
        distribution
        for distribution, module in PYTHON_IMPORTS.items()
        if importlib.util.find_spec(module) is None
    ]


def check_r_dependencies(rscript: str, repo_root: Path) -> tuple[bool, str]:
    library = (repo_root / ".r-library").resolve()
    requirements = (repo_root / "social_generator" / "requirements-social.R").resolve()
    checker = (repo_root / "scripts" / "setup" / "install-r-dependencies.R").resolve()
    environment = os.environ.copy()
    environment["R_LIBS_USER"] = str(library)
    completed = subprocess.run(
        [
            rscript,
            "--vanilla",
            str(checker),
            "--check-only",
            str(library),
            str(requirements),
        ],
        cwd=repo_root,
        env=environment,
        check=False,
        capture_output=True,
        text=True,
    )
    output = "\n".join(
        part.strip() for part in (completed.stdout, completed.stderr) if part.strip()
    )
    return completed.returncode == 0, output


@dataclass
class PreflightResult:
    messages: list[str]
    failures: list[str]

    @property
    def ok(self) -> bool:
        return not self.failures


def run_preflight(repo_root: Path, *, quick: bool, with_social_cards: bool) -> PreflightResult:
    messages: list[str] = []
    failures: list[str] = []

    expected_python = expected_venv_python(repo_root)
    actual_python = Path(sys.executable).resolve()
    if actual_python == expected_python and expected_python.is_file():
        messages.append(f"PASS Python: {sys.version.split()[0]} ({actual_python})")
    else:
        failures.append(
            "repository .venv is not selected; run "
            "`bash scripts/setup/windows-dev.sh` on Windows or "
            "`bash scripts/setup/setup.sh` on Linux"
        )

    if sys.version_info < (3, 11):
        failures.append(f"Python 3.11+ is required; found {sys.version.split()[0]}")

    missing_imports = missing_python_imports()
    if missing_imports:
        failures.append(
            "missing Python dependencies from social_generator/requirements-social.txt: "
            + ", ".join(missing_imports)
        )
    else:
        messages.append("PASS Python dependencies: declared imports are available")

    pip_check = subprocess.run(
        [sys.executable, "-m", "pip", "check"],
        cwd=repo_root,
        check=False,
        capture_output=True,
        text=True,
    )
    if pip_check.returncode == 0:
        messages.append("PASS Python dependency consistency: pip check")
    else:
        failures.append((pip_check.stdout or pip_check.stderr).strip())

    required_tools = [
        ("git", ("--version",)),
        ("bash", ("--version",)),
        ("node", ("--version",)),
    ]
    if not quick:
        required_tools.extend(
            (("quarto", ("--version",)), ("rscript", ("--version",)))
        )

    resolved: dict[str, str] = {}
    for name, version_args in required_tools:
        path = find_tool(name)
        if path is None:
            failures.append(f"missing system tool: {name}")
            continue
        resolved[name] = path
        try:
            version = command_version(path, *version_args)
        except (OSError, RuntimeError) as error:
            failures.append(f"system tool is not executable: {name} ({error})")
        else:
            messages.append(f"PASS {name}: {version} ({path})")

    quarto = resolved.get("quarto")
    if quarto:
        try:
            found_quarto = command_version(quarto, "--version")
        except (OSError, RuntimeError):
            pass
        else:
            if found_quarto != QUARTO_VERSION:
                failures.append(
                    f"Quarto {QUARTO_VERSION} is required; found {found_quarto} at {quarto}"
                )

    if with_social_cards:
        if "playwright" not in missing_imports:
            try:
                from playwright.sync_api import sync_playwright

                with sync_playwright() as playwright:
                    browser_path = Path(playwright.chromium.executable_path)
                if browser_path.is_file():
                    messages.append(f"PASS Playwright Chromium: {browser_path}")
                else:
                    failures.append(
                        "Playwright Chromium is missing; rerun the repository setup command"
                    )
            except Exception as error:  # Playwright reports platform-specific launch errors.
                failures.append(f"Playwright Chromium check failed: {error}")

        rscript = resolved.get("rscript")
        if rscript:
            ok, detail = check_r_dependencies(rscript, repo_root)
            if ok:
                messages.append(f"PASS R dependencies: {detail}")
            else:
                failures.append(
                    f"social-card R dependency check failed before render: {detail}. "
                    "Run `bash scripts/setup/windows-dev.sh`."
                )

    return PreflightResult(messages=messages, failures=failures)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--quick", action="store_true", help="check the quick-gate tool set")
    parser.add_argument(
        "--with-social-cards",
        action="store_true",
        help="also require the declared R packages in the repository R library",
    )
    parser.add_argument("--repo-root", type=Path, default=Path(__file__).resolve().parents[2])
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.quick and args.with_social_cards:
        print("ERROR: --quick and --with-social-cards cannot be combined.", file=sys.stderr)
        return 2
    repo_root = args.repo_root.resolve()
    result = run_preflight(
        repo_root,
        quick=args.quick,
        with_social_cards=args.with_social_cards,
    )
    print("BS environment preflight")
    print(f"Repository: {repo_root}")
    for message in result.messages:
        print(message)
    if result.failures:
        for failure in result.failures:
            print(f"FAIL {failure}", file=sys.stderr)
        return 1
    print("PASS: environment is ready.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
