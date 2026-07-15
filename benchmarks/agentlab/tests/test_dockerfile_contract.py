import re
import unittest
from pathlib import Path


class DockerfileContractTests(unittest.TestCase):
    def test_uses_an_immutable_python_base_image(self) -> None:
        dockerfile = (Path(__file__).parents[1] / "Dockerfile").read_text(
            encoding="utf-8"
        )

        self.assertRegex(
            dockerfile,
            r"(?m)^ARG PYTHON_IMAGE=python:3\.12-slim-bookworm@sha256:[0-9a-f]{64}$",
        )
        self.assertIn("FROM ${PYTHON_IMAGE} AS dependencies", dockerfile)


if __name__ == "__main__":
    unittest.main()
