from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

try:
    from publication_config import (
        load_legacy_dispositions,
        load_publication_identity,
        publication_mode,
    )
except ModuleNotFoundError:  # Imported as scripts.bs_pre_render in tests.
    from scripts.publication_config import (
        load_legacy_dispositions,
        load_publication_identity,
        publication_mode,
    )


REPO_ROOT = Path(__file__).resolve().parents[1]
FULL_BUILD_MARKER = REPO_ROOT / "site" / "_site" / ".bs-full-build.json"
SKIP_SOCIAL_ENV = "BS_SKIP_SOCIAL_CARDS"
RESOURCE_REVIEW_ENV = "TSK_RESOURCE_REVIEW"


def run(command: list[str]) -> None:
    """Run one required build step from the repository root."""
    subprocess.run(command, cwd=REPO_ROOT, check=True)


def invalidate_full_build_marker(path: Path = FULL_BUILD_MARKER) -> bool:
    if not path.exists():
        return False
    path.unlink()
    return True


def main() -> int:
    publication = load_publication_identity()
    load_legacy_dispositions(publication)
    mode, _ = publication_mode(publication)
    print(
        f"Publication identity: {publication['name']} "
        f"({publication['canonical-origin']}); indexing mode: {mode}."
    )

    if invalidate_full_build_marker():
        print("Invalidated the previous full-build completion marker.")

    print("Generating changed approved resource worksheet exports.")
    run(
        [
            sys.executable,
            str(REPO_ROOT / "scripts" / "generate-resource-exports.py"),
            "--changed",
        ]
    )

    print("Building publication-gated resource paraphrase assets.")
    resource_command = [
        sys.executable,
        str(REPO_ROOT / "scripts" / "build-resource-paraphrase-assets.py"),
    ]
    if os.getenv(RESOURCE_REVIEW_ENV) == "1":
        resource_command.append("--review")
    run(resource_command)

    # Quarto sets this to "1" only when rendering the complete project.
    if os.getenv("QUARTO_PROJECT_RENDER_ALL") != "1":
        print("Incremental development render: verifying glossary freshness.")
        run(
            [
                sys.executable,
                str(REPO_ROOT / "scripts" / "learn_glossary.py"),
                "validate",
            ]
        )
        print("Incremental development render: glossary outputs are current.")
        return 0

    print("Full project render: generating glossary.")
    run(
        [
            sys.executable,
            str(REPO_ROOT / "scripts" / "learn_glossary.py"),
            "generate",
        ]
    )

    if os.getenv(SKIP_SOCIAL_ENV) == "1":
        print("Local preview: skipping social-card pipeline.")
        return 0

    print("Full project render: running social-card pipeline.")
    run(
        [
            sys.executable,
            str(
                REPO_ROOT
                / "social_generator"
                / "scripts"
                / "social"
                / "run_social_pipeline.py"
            ),
        ]
    )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
