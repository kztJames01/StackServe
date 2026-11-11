#!/usr/bin/env python3
"""Exercise a built OCI image over MCP stdio with networking disabled."""

import argparse
import json
import subprocess
import sys
import time
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
    return json.loads(message["result"]["content"][0]["text"]), time.monotonic() - started


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", required=True)
    parser.add_argument("--network", default="none")
    parser.add_argument("--platform")
    args = parser.parse_args()

    command = ["docker", "run", "--rm", "-i", "--network", args.network]
    if args.platform:
        command.extend(["--platform", args.platform])
    command.append(args.image)
    process = subprocess.Popen(
        command,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        bufsize=1,
    )
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
                    "clientInfo": {"name": "stackfit-container-smoke", "version": "1"},
                },
            },
        )
        initialized = receive(process)
        assert initialized["result"]["serverInfo"]["name"] == "stackfit-mcp"
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

        assert recommendation["selections"], recommendation
        assert search["status"] == "ok", search
        assert search["retrieval_mode"] == "lexical", search
        assert warm_search["request_id"] != search["request_id"]
        print(
            json.dumps(
                {
                    "image": args.image,
                    "platform": args.platform,
                    "network": args.network,
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
        if process.poll() is None:
            process.kill()
            process.wait()


if __name__ == "__main__":
    try:
        main()
    except Exception as error:  # noqa: BLE001 - smoke test must fail loudly
        print(error, file=sys.stderr)
        raise SystemExit(1) from error
