import contextlib
import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from run_study import STUDY_COMMENT, StudyConfig, parse_args, run_study


class _FakeStudy:
    def __init__(self, directory: Path) -> None:
        self.dir = directory
        self.override_max_steps_value: int | None = None
        self.run_arguments: dict[str, object] | None = None

    def override_max_steps(self, max_steps: int) -> None:
        self.override_max_steps_value = max_steps

    def run(self, **kwargs: object) -> None:
        self.run_arguments = kwargs
        self.dir.mkdir(parents=True, exist_ok=True)
        (self.dir / "result.csv").write_text("reward\n1\n", encoding="utf-8")


class RunStudyTests(unittest.TestCase):
    def test_parser_requires_full_benchmark_and_rejects_nonpositive_jobs(self) -> None:
        config = parse_args(["--benchmark", "workarena_l1"])

        self.assertEqual(config.benchmark, "workarena_l1")
        self.assertEqual(config.jobs, 1)
        with contextlib.redirect_stderr(io.StringIO()):
            with self.assertRaises(SystemExit):
                parse_args(["--benchmark", "workarena_l1", "--jobs", "0"])

    def test_runner_writes_a_file_hashed_manifest_without_secrets(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            output_dir = Path(directory)
            study = _FakeStudy(output_dir / "agent-study")
            calls: dict[str, object] = {}

            def make_study(**kwargs: object) -> _FakeStudy:
                calls.update(kwargs)
                return study

            with (
                patch.dict(
                    "os.environ",
                    {
                        "LHIC_SOURCE_REVISION": "0123456789abcdef",
                        "LHIC_IMAGE_DIGEST": "sha256:" + "1" * 64,
                    },
                    clear=True,
                ),
                patch(
                    "run_study.collect_installed_python_packages",
                    return_value=["agentlab==0.4.0", "browsergym==0.14.3"],
                ),
            ):
                manifest_path = run_study(
                    StudyConfig(
                        benchmark="workarena_l1",
                        jobs=1,
                        backend="sequential",
                        relaunches=1,
                        strict_reproducibility=True,
                        output_dir=output_dir,
                        max_steps=None,
                    ),
                    make_study,
                    agent_args="agent",
                )

            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            self.assertEqual(calls["benchmark"], "workarena_l1")
            self.assertEqual(calls["agent_args"], ["agent"])
            self.assertEqual(calls["comment"], STUDY_COMMENT)
            self.assertIsNone(study.override_max_steps_value)
            self.assertEqual(study.run_arguments["n_jobs"], 1)
            self.assertEqual(manifest["config"]["benchmark"], "workarena_l1")
            self.assertEqual(manifest["files"][0]["path"], "result.csv")
            self.assertEqual(
                manifest["runtime"]["imageDigest"], "sha256:" + "1" * 64
            )
            self.assertEqual(
                manifest["runtime"]["pythonPackages"],
                ["agentlab==0.4.0", "browsergym==0.14.3"],
            )
            self.assertRegex(manifest["runtime"]["pythonPackagesSha256"], r"^[0-9a-f]{64}$")
            self.assertTrue(manifest["secretValuesInspected"] is False)

    def test_strict_run_rejects_a_debug_step_limit_or_missing_source_revision(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            config = StudyConfig(
                benchmark="workarena_l1",
                jobs=1,
                backend="sequential",
                relaunches=1,
                strict_reproducibility=True,
                output_dir=Path(directory),
                max_steps=10,
            )

            with self.assertRaisesRegex(ValueError, "max-steps"):
                run_study(config, lambda **_: _FakeStudy(Path(directory)), "agent")

            without_limit = StudyConfig(
                benchmark=config.benchmark,
                jobs=config.jobs,
                backend=config.backend,
                relaunches=config.relaunches,
                strict_reproducibility=config.strict_reproducibility,
                output_dir=config.output_dir,
                max_steps=None,
            )
            with patch.dict(
                "os.environ", {"LHIC_SOURCE_REVISION": "unknown"}, clear=True
            ):
                with self.assertRaisesRegex(ValueError, "LHIC_SOURCE_REVISION"):
                    run_study(
                        without_limit,
                        lambda **_: _FakeStudy(Path(directory)),
                        "agent",
                    )

            with patch.dict(
                "os.environ",
                {"LHIC_SOURCE_REVISION": "0123456789abcdef"},
                clear=True,
            ):
                with self.assertRaisesRegex(ValueError, "LHIC_IMAGE_DIGEST"):
                    run_study(
                        without_limit,
                        lambda **_: _FakeStudy(Path(directory)),
                        "agent",
                    )


if __name__ == "__main__":
    unittest.main()
