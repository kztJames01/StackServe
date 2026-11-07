import json
from pathlib import Path

import jsonschema

from stackfit_rag.protocol import Request, Response
from stackfit_rag.worker import answer

FIXTURES = Path(__file__).resolve().parents[3] / "fixtures" / "protocol"
SCHEMA = Path(__file__).resolve().parents[3] / "schemas" / "protocol.schema.json"


def test_shared_fixture() -> None:
    request = Request.model_validate_json((FIXTURES / "request.jsonl").read_text())
    response = Response.model_validate_json((FIXTURES / "response.jsonl").read_text())
    schema = json.loads(SCHEMA.read_text())
    jsonschema.Draft202012Validator.check_schema(schema)
    jsonschema.validate(request.model_dump(), schema)
    jsonschema.validate(response.model_dump(), schema)
    assert answer(request.model_dump_json().encode()) == response
