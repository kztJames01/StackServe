import re
import sys

from pydantic import ValidationError

from stackfit_rag.corpus import IntegrityError, load_corpus
from stackfit_rag.embeddings import VectorSearch
from stackfit_rag.protocol import Request, Response
from stackfit_rag.retrieval import Retriever

MAX_LINE_BYTES = 65_536


def sanitize(query: str) -> str:
    query = re.sub(
        r"(?s)-----BEGIN [^-]*PRIVATE KEY-----.*?(?:-----END [^-]*PRIVATE KEY-----|$)",
        "[REDACTED]",
        query,
    )
    query = re.sub(r"\b[a-zA-Z][a-zA-Z0-9+.-]*://[^\s]+", "[REDACTED_URL]", query)
    query = re.sub(
        r"(?i)\b([\w-]*(?:secret|token|password|pwd|api[_-]?key|access[_-]?key|credential)[\w-]*)\s*[:=]\s*(?:\"[^\"]*\"|'[^']*'|\S+)",
        r"\1=[REDACTED]",
        query,
    )
    query = re.sub(r"(?i)\bBearer\s+[A-Za-z0-9._~+/-]+=*", "Bearer [REDACTED]", query)
    query = re.sub(r"\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b", "[REDACTED]", query)
    return re.sub(
        r"\b(?:sk-[A-Za-z0-9_-]{8,}|AKIA[A-Z0-9]{16}|gh[pousr]_[A-Za-z0-9_]{10,})\b",
        "[REDACTED]",
        query,
    )


def failure(request: Request, status: str, error: str) -> Response:
    return Response(
        schema_version=2,
        request_id=request.request_id,
        corpus_version=request.corpus_version,
        status=status,
        retrieval_mode="none",
        chunks=[],
        error=error,
        warnings=[],
        follow_up_used=False,
    )


class Worker:
    def __init__(self):
        self.retriever = None

    def answer(self, line: bytes) -> Response:
        request = Request.model_validate_json(line)
        request = request.model_copy(
            update={
                "query": sanitize(request.query),
                "follow_up_query": sanitize(request.follow_up_query)
                if request.follow_up_query
                else None,
            }
        )
        try:
            if self.retriever is None:
                sections, corpus_hash = load_corpus()
                self.retriever = Retriever(sections, VectorSearch(sections, corpus_hash))
            return self.retriever.search(request)
        except FileNotFoundError:
            return failure(request, "unavailable", "corpus_not_available")
        except IntegrityError as error:
            return failure(request, "error", str(error))
        except (ValueError, OSError, RuntimeError):
            return failure(request, "error", "retrieval_artifact_or_runtime_invalid")


def main() -> None:
    worker = Worker()
    while line := sys.stdin.buffer.readline(MAX_LINE_BYTES + 1):
        if len(line) > MAX_LINE_BYTES or not line.endswith(b"\n"):
            print("oversized request", file=sys.stderr)
            break
        try:
            response = worker.answer(line)
        except ValidationError:
            print("invalid worker request", file=sys.stderr)
            break
        output = response.model_dump_json() + "\n"
        if len(output.encode()) > MAX_LINE_BYTES:
            print("oversized response", file=sys.stderr)
            break
        sys.stdout.write(output)
        sys.stdout.flush()


if __name__ == "__main__":
    main()
