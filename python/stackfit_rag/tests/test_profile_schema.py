import json
import os
import subprocess
from pathlib import Path

import jsonschema
import pytest

ROOT = Path(__file__).resolve().parents[3]


@pytest.mark.parametrize(
    "brief",
    ["a-node-postgres-uploads.json", "b-python-docker-postgres-storage.json"],
)
def test_profile_matches_schema(brief: str) -> None:
    binary = os.environ.get("STACKFIT_PROFILE_BIN")
    if not binary:
        pytest.skip("contract job supplies STACKFIT_PROFILE_BIN")
    schema = json.loads((ROOT / "schemas/profile-output.schema.json").read_text())
    jsonschema.Draft202012Validator.check_schema(schema)
    result = subprocess.run(
        [binary, "profile", str(ROOT / "fixtures/briefs" / brief)],
        check=True,
        capture_output=True,
        text=True,
        timeout=10,
    )
    jsonschema.validate(json.loads(result.stdout), schema)
