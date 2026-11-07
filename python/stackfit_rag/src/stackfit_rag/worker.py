import sys

from pydantic import ValidationError

from stackfit_rag.protocol import Request, Response

MAX_LINE_BYTES = 65_536


def answer(line: bytes) -> Response:
    request = Request.model_validate_json(line)
    return Response(
        schema_version=1,
        request_id=request.request_id,
        corpus_version=request.corpus_version,
        status="unavailable",
        retrieval_mode="none",
        chunks=[],
        error="corpus_not_available",
    )


def main() -> None:
    while line := sys.stdin.buffer.readline(MAX_LINE_BYTES + 1):
        if len(line) > MAX_LINE_BYTES or not line.endswith(b"\n"):
            print("oversized request", file=sys.stderr)
            break
        try:
            response = answer(line)
        except ValidationError:
            print("invalid worker request", file=sys.stderr)
            break
        sys.stdout.write(response.model_dump_json() + "\n")
        sys.stdout.flush()


if __name__ == "__main__":
    main()
