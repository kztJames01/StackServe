#!/usr/bin/env python3
"""Exercise a built OCI image over MCP stdio with networking disabled."""

import argparse
import json
import subprocess
import sys
import time
import threading
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXPECTED_TOOLS = {
    "profile_project",
    "search_provider_docs",
    "recommend_stacks",
    "compare_stacks",
    "generate_setup_bundle",
}


def send(process, message):
    process.stdin.write(json.dumps(message) + "\n")
    process.stdin.flush()


def receive(process):
    line = process.stdout.readline()
    if not line:
        raise RuntimeError(process.stderr.read())
    return json.loads(line)


def call(process, request_id, name, arguments):
    started = time.monotonic()
    send(
        process,
        {
            "jsonrpc": "2.0",
            "id": request_id,
            "method": "tools/call",
            "params": {"name": name, "arguments": arguments},
        },
    )
    message = receive(process)
    if "error" in message:
        raise RuntimeError(message["error"])
    if message["result"].get("isError"):
        raise RuntimeError(f"MCP tool failed: {name}")
    return json.loads(message["result"]["content"][0]["text"]), time.monotonic() - started


def main():
    parser = argparse.ArgumentParser()
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--image")
    source.add_argument("--binary", type=Path)
    parser.add_argument("--timeout", type=float, default=120)
    parser.add_argument("--network", default="none")
    parser.add_argument("--platform")
    args = parser.parse_args()

    command = ["docker", "run", "--rm", "-i", "--network", args.network]
    if args.platform:
        command.extend(["--platform", args.platform])
    command.append(args.image)
    if args.binary:
        command = [str(args.binary.resolve()), "serve"]
    if args.timeout <= 0:
        parser.error("--timeout must be positive")
    process = subprocess.Popen(
        command,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        bufsize=1,
    )
    watchdog = threading.Timer(args.timeout, process.kill)
    watchdog.start()
    workload = json.loads((ROOT / "fixtures/workloads/node-sporadic.json").read_text())
    try:
        send(
            process,
            {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "initialize",
                "params": {
                    "protocolVersion": "2025-11-25",
                    "capabilities": {},
                    "clientInfo": {"name": "stackserve-container-smoke", "version": "1"},
                },
            },
        )
        initialized = receive(process)
        assert initialized["result"]["serverInfo"]["name"] == "stackserve-mcp"
        send(process, {"jsonrpc": "2.0", "method": "notifications/initialized"})

        send(process, {"jsonrpc": "2.0", "id": 2, "method": "tools/list"})
        tools = receive(process)["result"]["tools"]
        assert {tool["name"] for tool in tools} == EXPECTED_TOOLS

        recommendation, recommend_seconds = call(
            process, 3, "recommend_stacks", {"workload": workload}
        )
        search, cold_seconds = call(process, 4, "search_provider_docs", {"query": "Render PORT"})
        warm_search, warm_seconds = call(
            process, 5, "search_provider_docs", {"query": "Neon connection pooling"}
        )

        profile, profile_seconds = call(
            process,
            6,
            "profile_project",
            {
                "brief": json.loads(
                    (ROOT / "fixtures/briefs/a-node-postgres-uploads.json").read_text()
                )
            },
        )
        assert profile["requirements"], profile
        assert recommendation["selections"], recommendation
        stack_id = recommendation["selections"][0]["stack_id"]
        comparison, compare_seconds = call(
            process,
            7,
            "compare_stacks",
            {"workload": workload, "stack_ids": [stack_id]},
        )
        assert len(comparison["stacks"][0]["scenarios"]) == 3, comparison
        bundle, bundle_seconds = call(
            process,
            8,
            "generate_setup_bundle",
            {"request": json.loads((ROOT / "fixtures/projects/a-node-uploads.json").read_text())},
        )
        assert bundle["status"] == "prepared", bundle
        assert bundle["validation"]["valid"] is True, bundle
        assert search["needs_verification"] is True, search
        assert search["verified_ready"] is False, search
        assert search["status"] == "ok", search
        if args.binary:
            assert search["retrieval_mode"] in ("lexical", "hybrid"), search
        else:
            assert search["retrieval_mode"] == "lexical", search
        assert warm_search["request_id"] != search["request_id"]
        print(
            json.dumps(
                {
                    "image": args.image,
                    "binary": str(args.binary) if args.binary else None,
                    "profile_seconds": round(profile_seconds, 3),
                    "compare_seconds": round(compare_seconds, 3),
                    "bundle_seconds": round(bundle_seconds, 3),
                    "selected_stack": stack_id,
                    "selected_total": recommendation["selections"][0]["estimate"]["total_known"],
                    "bundle_status": bundle["status"],
                    "needs_verification": search["needs_verification"],
                    "platform": args.platform,
                    "network": args.network if args.image else "host (not isolated)",
                    "tools": sorted(EXPECTED_TOOLS),
                    "retrieval_mode": search["retrieval_mode"],
                    "recommend_seconds": round(recommend_seconds, 3),
                    "cold_search_seconds": round(cold_seconds, 3),
                    "warm_search_seconds": round(warm_seconds, 3),
                },
                indent=2,
            )
        )

        process.stdin.close()
        process.wait(timeout=30)
        assert process.returncode == 0, process.stderr.read()
        assert process.stderr.read() == ""
    finally:
        watchdog.cancel()
        if process.poll() is None:
            process.kill()
            process.wait()


if __name__ == "__main__":
    try:
        main()
    except Exception as error:  # noqa: BLE001 - smoke test must fail loudly
        print(error, file=sys.stderr)
        raise SystemExit(1) from error
