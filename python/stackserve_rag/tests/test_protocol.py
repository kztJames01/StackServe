import json
from pathlib import Path

import jsonschema
import pytest
from pydantic import TypeAdapter, ValidationError

from stackserve_rag.protocol import Request, Response

ROOT = Path(__file__).resolve().parents[3]
FIXTURES = ROOT / "fixtures" / "protocol"
SCHEMA = ROOT / "schemas" / "protocol.schema.json"


def test_shared_fixture():
    request = Request.model_validate_json((FIXTURES / "request.jsonl").read_text())
    response = Response.model_validate_json((FIXTURES / "response.jsonl").read_text())
    schema = json.loads(SCHEMA.read_text())
    jsonschema.Draft202012Validator.check_schema(schema)
    for record in (request, response):
        jsonschema.validate(record.model_dump(), schema)
    assert response.request_id == request.request_id
    assert response.chunks and response.chunks[0].source_url.startswith("https://render.com/")
    generated = TypeAdapter(Request | Response).json_schema()
    assert {
        key: value for key, value in schema.items() if key not in ("$schema", "$id")
    } == generated


@pytest.mark.parametrize(
    "update",
    [
        {"schema_version": 1},
        {"limit": 9},
        {"query": " "},
        {"query": "é" * 2049},
        {"follow_up_query": []},
        {"filters": {"url": "https://example.com"}},
    ],
)
def test_invalid_request(update):
    record = json.loads((FIXTURES / "request.jsonl").read_text())
    record.update(update)
    with pytest.raises(ValidationError):
        Request.model_validate(record)
