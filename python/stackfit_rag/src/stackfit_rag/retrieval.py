import math
import re
from collections import Counter
from datetime import date

from stackfit_rag.corpus import matches, with_freshness
from stackfit_rag.protocol import Request, Response, Section

STOP_WORDS = frozenset(
    "a an and are as at be by can for from how i in is it of on or the to use with".split()
)


def tokens(text: str) -> list[str]:
    return [word for word in re.findall(r"[a-z0-9_]+", text.lower()) if word not in STOP_WORDS]


def bm25(query: str, sections: list[Section]) -> list[str]:
    documents = [Counter(tokens(f"{s.parent_context} {s.heading} {s.text}")) for s in sections]
    if not documents:
        return []
    lengths = [sum(doc.values()) for doc in documents]
    average = sum(lengths) / len(lengths)
    scores = [0.0] * len(documents)
    for word in set(tokens(query)):
        frequency = sum(word in doc for doc in documents)
        inverse = math.log(1 + (len(documents) - frequency + 0.5) / (frequency + 0.5))
        for i, doc in enumerate(documents):
            count = doc[word]
            scores[i] += (
                inverse * count * 2.5 / (count + 1.5 * (0.25 + 0.75 * lengths[i] / average))
            )
    return [
        sections[i].id
        for i in sorted(range(len(scores)), key=lambda i: (-scores[i], sections[i].id))
        if scores[i] > 0
    ]


def rrf(rankings: list[list[str]]) -> list[str]:
    scores: Counter = Counter()
    for ranking in rankings:
        for rank, identifier in enumerate(ranking, 1):
            scores[identifier] += 1 / (60 + rank)
    return sorted(scores, key=lambda identifier: (-scores[identifier], identifier))


class Retriever:
    def __init__(self, sections: list[Section], vectors=None):
        self.sections = sections
        self.vectors = vectors

    def search(self, request: Request, today: date | None = None) -> Response:
        today = today or date.today()
        candidates = [section for section in self.sections if matches(section, request.filters)]
        queries = [request.query]
        if request.follow_up_query:
            queries.append(request.follow_up_query)
        rankings = []
        fallback = "vector_artifacts_unavailable"
        hybrid = False
        for query in queries:
            lexical = bm25(query, candidates)
            if self.vectors is not None:
                semantic, fallback = self.vectors.rank(query, candidates)
                if semantic is not None:
                    hybrid = True
                    lexical = rrf([lexical, semantic])
            rankings.append(lexical)
        ranked = rrf(rankings) if len(rankings) > 1 else rankings[0]
        by_id = {section.id: section for section in candidates}
        chunks = [with_freshness(by_id[key], today) for key in ranked[: request.limit]]
        warnings = ["evidence_requires_requirement_review"]
        if not hybrid:
            warnings.append(fallback or "lexical_requested")
        if not chunks:
            warnings.append("no_matching_evidence")
        if any(chunk.freshness != "fresh" for chunk in chunks):
            warnings.append("essential_evidence_requires_freshness_review")
        return Response(
            schema_version=2,
            request_id=request.request_id,
            corpus_version=request.corpus_version,
            status="ok",
            retrieval_mode="hybrid" if hybrid else "lexical",
            chunks=chunks,
            error=None,
            warnings=warnings,
            follow_up_used=request.follow_up_query is not None,
        )
