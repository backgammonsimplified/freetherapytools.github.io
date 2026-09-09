from __future__ import annotations

import os
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from scripts.setup import preflight


REPO_ROOT = Path(__file__).resolve().parents[1]
R_INSTALLER = REPO_ROOT / "scripts" / "setup" / "install-r-dependencies.R"


class EnvironmentBuildOrderingTests(unittest.TestCase):
    def test_social_preflight_runs_before_quarto_render(self) -> None:
        script = (REPO_ROOT / "scripts/testing/build/comprehensive.sh").read_text(
            encoding="utf-8"
        )
        self.assertLess(
            script.index("scripts/setup/preflight.sh"),
            script.index("quarto render site"),
        )
        self.assertIn("PREFLIGHT_ARGUMENTS+=(--with-social-cards)", script)


class RDependencyContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.rscript = preflight.find_tool("rscript")
        if cls.rscript is None:
            raise unittest.SkipTest("Rscript is not installed")
        try:
            preflight.command_version(cls.rscript, "--version")
        except (OSError, RuntimeError) as error:
            raise unittest.SkipTest(f"Rscript is not executable: {error}") from error

    def run_r_installer(
        self,
        library: Path,
        requirements: Path,
        *,
        check_only: bool,
    ) -> subprocess.CompletedProcess[str]:
        arguments = [self.rscript, "--vanilla", str(R_INSTALLER)]
        if check_only:
            arguments.append("--check-only")
        arguments.extend((str(library), str(requirements)))
        environment = os.environ.copy()
        environment["R_LIBS_USER"] = str(library)
        environment["R_LIBS_SITE"] = str(library)
        return subprocess.run(
            arguments,
            cwd=REPO_ROOT,
            env=environment,
            check=False,
            capture_output=True,
            text=True,
        )

    def test_missing_declared_r_dependency_fails_non_mutating_check(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            library = root / "library"
            library.mkdir()
            requirements = root / "requirements.R"
            requirements.write_text(
                'required_r_packages <- c(bsenvmissing = "99.0.0")\n',
                encoding="utf-8",
            )
            completed = self.run_r_installer(
                library,
                requirements,
                check_only=True,
            )

        self.assertNotEqual(completed.returncode, 0)
        output = completed.stdout + completed.stderr
        self.assertIn("Missing required R packages in .r-library", output)
        self.assertIn("bsenvmissing >= 99.0.0", output)

    def test_social_preflight_reports_missing_r_dependency_before_render(self) -> None:
        missing_message = "Missing required R packages in .r-library: yaml >= 2.3.10"
        with mock.patch.object(
            preflight,
            "check_r_dependencies",
            return_value=(False, missing_message),
        ):
            result = preflight.run_preflight(
                REPO_ROOT,
                quick=False,
                with_social_cards=True,
        )

        self.assertFalse(result.ok)
        self.assertTrue(
            any(
                "social-card R dependency check failed before render" in item
                and missing_message in item
                for item in result.failures
            )
        )

    def test_repeated_check_is_idempotent_for_prepared_library(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            library = root / "library"
            library.mkdir()
            requirements = root / "requirements.R"
            requirements.write_text(
                'required_r_packages <- c(stats = "4.0.0")\n',
                encoding="utf-8",
            )

            first = self.run_r_installer(library, requirements, check_only=True)
            second = self.run_r_installer(library, requirements, check_only=True)

        self.assertEqual(first.returncode, 0, first.stdout + first.stderr)
        self.assertEqual(second.returncode, 0, second.stdout + second.stderr)
        self.assertIn("already satisfied", first.stdout)
        self.assertIn("already satisfied", second.stdout)


if __name__ == "__main__":
    unittest.main()
