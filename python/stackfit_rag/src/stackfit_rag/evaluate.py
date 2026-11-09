import argparse
import json
import time
from datetime import date
from pathlib import Path

from stackfit_rag.corpus import ROOT, load_corpus, read_bounded
from stackfit_rag.embeddings import VectorSearch, model_spec
from stackfit_rag.protocol import CORPUS_VERSION, Filters, Request
from stackfit_rag.retrieval import Retriever


def report_path(day: date | None = None) -> Path:
    return ROOT / "evals/reports" / f"retrieval-{(day or date.today()).isoformat()}.md"


def evaluate(day: date | None = None) -> str:
    day = day or date.today()
    sections, corpus_hash = load_corpus()
    labels = json.loads(read_bounded(ROOT / "evals/queries.json", 65_536))
    if len(labels) != 20 or len({row["id"] for row in labels}) != 20:
        raise ValueError("expected twenty distinct labeled queries")
    ids = {section.id for section in sections}
    vectors = VectorSearch(sections, corpus_hash)
    rows, failures = [], []
    totals = {"lexical": [], "hybrid": []}
    latencies = {"lexical": [], "hybrid": []}
    for label in labels:
        relevant = set(label["relevant_ids"])
        if not relevant <= ids or not set(label["superseded_ids"]) <= ids:
            raise ValueError("unknown labeled section")
        candidates = [
            s.model_copy(update={"superseded": True}) if s.id in label["superseded_ids"] else s
            for s in sections
        ]
        request = Request(
            schema_version=2,
            request_id=label["id"],
            operation="search",
            query=label["query"],
            filters=Filters(**label["filters"]),
            limit=5,
            corpus_version=CORPUS_VERSION,
        )
        scores = []
        for mode in ("lexical", "hybrid"):
            start = time.perf_counter()
            result = Retriever(candidates, vectors if mode == "hybrid" else None).search(
                request, date.fromisoformat(label["as_of"])
            )
            latencies[mode].append((time.perf_counter() - start) * 1000)
            if result.retrieval_mode != mode:
                raise ValueError("real hybrid runtime required for evaluation")
            found = [chunk.id for chunk in result.chunks]
            if relevant:
                recall = len(relevant.intersection(found)) / len(relevant)
                totals[mode].append(recall)
                scores.append(f"{recall:.2f}")
                if recall < 1:
                    failures.append(
                        f"- {label['id']} ({mode}): missing {sorted(relevant.difference(found))}; retrieved {found}."
                    )
            else:
                if found:
                    raise ValueError("negative filter query returned evidence")
                scores.append("N/A (empty)")
            if not result.needs_verification or result.verified_ready:
                raise ValueError("retrieval claimed requirement verification")
            if label["kind"] in ("stale", "superseded"):
                if any(
                    chunk.freshness == "fresh" for chunk in result.chunks if chunk.id in relevant
                ):
                    raise ValueError("stale or superseded evidence labeled fresh")
        rows.append(f"| {label['id']} | {label['kind']} | {scores[0]} | {scores[1]} |")
    spec = model_spec()
    probe = Request(
        schema_version=2,
        request_id="unsupported-probe",
        operation="search",
        query="What is my private negotiated enterprise discount?",
        filters=Filters(),
        limit=5,
        corpus_version=CORPUS_VERSION,
    )
    unsupported = Retriever(sections, vectors).search(probe, date(2026, 11, 7))
    report = [
        f"# Retrieval evaluation — {day.isoformat()}",
        "",
        f"Corpus `{CORPUS_VERSION}`: {len(sections)} curated sections, SHA-256 `{corpus_hash}`.",
        f"Model `{spec['model_id']}` at `{spec['revision']}`, {spec['dimension']} dimensions; `{spec['index_version']}`.",
        "",
        "Command: `uv run --locked --extra vector python -m stackfit_rag.evaluate --write`.",
        "",
        "Twenty fixed labels: 18 queries with relevant evidence and two unsupported exact-filter queries.",
        "Macro Recall@5 averages only the 18 nonempty relevance sets; both negative cases must return no chunks.",
        "Labels were authored from reviewed source sections before measuring. This small development set is not an independent held-out benchmark.",
        "",
        f"Lexical Recall@5: **{sum(totals['lexical']) / len(totals['lexical']):.4f}**.",
        f"Hybrid Recall@5: **{sum(totals['hybrid']) / len(totals['hybrid']):.4f}**.",
        "",
        "| Query | Kind | Lexical Recall@5 | Hybrid Recall@5 |",
        "| --- | --- | --- | --- |",
        *rows,
        "",
        "## Failure inspection",
        "",
        *(failures or ["No positive-label retrieval misses in this run."]),
        "",
        f"Additional unsupported probe: `{probe.query}` returned {[chunk.id for chunk in unsupported.chunks]}. None establishes a private negotiated discount. This is a relevance failure, not an answer; needs_verification remains true. No retrieval threshold was tuned on this probe.",
        "The two missing-fact cases are scoped by provider/runtime filters; empty results retain needs_verification.",
        "Without a restrictive filter, semantic retrieval can return loosely related evidence for an unsupported question. The tool always requires requirement review and never synthesizes an answer.",
        "The conflicting-claim cases test false premises against official evidence (location hints versus jurisdictions; Free versus paid scale-to-zero). They do not prove automatic contradiction resolution.",
        "The stale case advances the evaluation date by eight days for pricing. The superseded case marks an existing section superseded in memory. Neither changes the shipped corpus.",
        "",
        "## Source attribution and operating limits",
        "",
        "Every result carries its reviewed source URL, heading, source/content hashes, and fetch/verification dates. Unit tests reject non-allowlisted URLs and mismatched model/index metadata.",
        "Source text is summarized evidence, not executable instructions. Freshness is a review signal, not verified deployment readiness.",
        f"First hybrid query including model load: {latencies['hybrid'][0]:.1f} ms; warm mean: {sum(latencies['hybrid'][1:]) / 19:.1f} ms on this local machine. This is not a cross-platform performance claim.",
    ]
    return "\n".join(report) + "\n"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args()
    day = date.today()
    report = evaluate(day)
    if args.write:
        path = report_path(day)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(report)
    print(report)


if __name__ == "__main__":
    main()
