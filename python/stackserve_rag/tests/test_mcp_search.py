import asyncio
import json
import os
from pathlib import Path

import jsonschema
import pytest

TOOL_NAMES = {
    "profile_project",
    "search_provider_docs",
    "recommend_stacks",
    "compare_stacks",
    "generate_setup_bundle",
}


async def start_server(*arguments):
    return await asyncio.create_subprocess_exec(
        os.environ["STACKSERVE_PROFILE_BIN"],
        "serve",
        *arguments,
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        # A setup bundle is a single JSON-RPC line of about 75 KB, above the
        # asyncio 64 KiB default. Clients must allow a bounded larger line.
        limit=1024 * 1024,
    )


async def send(process, message):
    process.stdin.write(json.dumps(message).encode() + b"\n")
    await process.stdin.drain()


async def receive(process):
    return json.loads(await asyncio.wait_for(process.stdout.readline(), timeout=60))


async def initialize(process):
    await send(
        process,
        {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "initialize",
            "params": {
                "protocolVersion": "2025-11-25",
                "capabilities": {},
                "clientInfo": {"name": "stackserve-contract-test", "version": "1"},
            },
        },
    )
    assert (await receive(process))["result"]["serverInfo"]["name"] == "stackserve-mcp"
    await send(process, {"jsonrpc": "2.0", "method": "notifications/initialized"})


async def close(process):
    if process.returncode is None:
        process.kill()
        await process.wait()


def workload():
    return json.loads(
        (Path(__file__).parents[3] / "fixtures/workloads/node-sporadic.json").read_text()
    )


def fixture(relative):
    return json.loads((Path(__file__).parents[3] / relative).read_text())


@pytest.mark.skipif(
    not os.environ.get("STACKSERVE_PROFILE_BIN"), reason="contract job supplies binary"
)
def test_mcp_search_round_trip():
    async def run():
        process = await start_server()
        try:
            await initialize(process)
            await send(process, {"jsonrpc": "2.0", "id": 2, "method": "tools/list"})
            tools = (await receive(process))["result"]["tools"]
            assert {tool["name"] for tool in tools} == TOOL_NAMES
            search = next(tool for tool in tools if tool["name"] == "search_provider_docs")
            arguments = {
                "query": "Render PORT",
                "follow_up_query": "health checks",
                "filters": {"provider": "render"},
                "limit": 2,
            }
            jsonschema.validate(arguments, search["inputSchema"])
            request_ids = set()
            for id_ in (3, 4):
                await send(
                    process,
                    {
                        "jsonrpc": "2.0",
                        "id": id_,
                        "method": "tools/call",
                        "params": {"name": "search_provider_docs", "arguments": arguments},
                    },
                )
                message = await receive(process)
                response = json.loads(message["result"]["content"][0]["text"])
                assert response["status"] == "ok"
                assert len(response["chunks"]) == 2
                assert all(chunk["provider"] == "render" for chunk in response["chunks"])
                assert response["follow_up_used"] and response["needs_verification"]
                assert not response["verified_ready"]
                request_ids.add(response["request_id"])
            assert len(request_ids) == 2
            recommend = next(tool for tool in tools if tool["name"] == "recommend_stacks")
            compare = next(tool for tool in tools if tool["name"] == "compare_stacks")
            rec_args = {"workload": workload()}
            jsonschema.validate(rec_args, recommend["inputSchema"])
            await send(
                process,
                {
                    "jsonrpc": "2.0",
                    "id": 5,
                    "method": "tools/call",
                    "params": {"name": "recommend_stacks", "arguments": rec_args},
                },
            )
            rec_resp = json.loads((await receive(process))["result"]["content"][0]["text"])
            stack_id = rec_resp["selections"][0]["stack_id"]
            assert rec_resp["selections"][0]["estimate"]["total_known"] == {"usd": "10.600"}
            cmp_args = {"workload": workload(), "stack_ids": [stack_id]}
            jsonschema.validate(cmp_args, compare["inputSchema"])
            await send(
                process,
                {
                    "jsonrpc": "2.0",
                    "id": 6,
                    "method": "tools/call",
                    "params": {"name": "compare_stacks", "arguments": cmp_args},
                },
            )
            cmp_resp = json.loads((await receive(process))["result"]["content"][0]["text"])
            assert len(cmp_resp["stacks"][0]["scenarios"]) == 3
            assert len(cmp_resp["stacks"][0]["cliffs"]) == 2
            process.stdin.close()
            await asyncio.wait_for(process.wait(), timeout=10)
            assert not await process.stderr.read()
        finally:
            await close(process)

    asyncio.run(run())


@pytest.mark.skipif(
    not os.environ.get("STACKSERVE_PROFILE_BIN"), reason="contract job supplies binary"
)
def test_retrieval_unavailable_preserves_deterministic_tools(tmp_path):
    async def run():
        missing = tmp_path / "missing-python"
        process = await start_server("--python", str(missing))
        try:
            await initialize(process)
            await send(process, {"jsonrpc": "2.0", "id": 2, "method": "tools/list"})
            tools = (await receive(process))["result"]["tools"]
            assert {tool["name"] for tool in tools} == TOOL_NAMES
            await send(
                process,
                {
                    "jsonrpc": "2.0",
                    "id": 3,
                    "method": "tools/call",
                    "params": {
                        "name": "search_provider_docs",
                        "arguments": {"query": "Render PORT"},
                    },
                },
            )
            search = json.loads((await receive(process))["result"]["content"][0]["text"])
            assert search["status"] == "unavailable"
            assert search["error"]["code"] == "retrieval_unavailable"
            assert "No such file" in search["error"]["message"]
            await send(
                process,
                {
                    "jsonrpc": "2.0",
                    "id": 4,
                    "method": "tools/call",
                    "params": {
                        "name": "recommend_stacks",
                        "arguments": {"workload": workload()},
                    },
                },
            )
            recommendation = json.loads((await receive(process))["result"]["content"][0]["text"])
            assert recommendation["selections"]
            stack_id = recommendation["selections"][0]["stack_id"]
            calls = [
                (
                    5,
                    "profile_project",
                    {"brief": fixture("fixtures/briefs/a-node-postgres-uploads.json")},
                ),
                (
                    6,
                    "compare_stacks",
                    {"workload": workload(), "stack_ids": [stack_id]},
                ),
                (
                    7,
                    "generate_setup_bundle",
                    {"request": fixture("fixtures/projects/a-node-uploads.json")},
                ),
            ]
            for request_id, name, arguments in calls:
                await send(
                    process,
                    {
                        "jsonrpc": "2.0",
                        "id": request_id,
                        "method": "tools/call",
                        "params": {"name": name, "arguments": arguments},
                    },
                )
                result = json.loads((await receive(process))["result"]["content"][0]["text"])
                if name == "profile_project":
                    assert result["requirements"]
                elif name == "compare_stacks":
                    assert len(result["stacks"][0]["scenarios"]) == 3
                else:
                    assert result["status"] == "prepared"
                    assert result["validation"]["valid"] is True
                    assert len(json.dumps(result)) < 262_144
            process.stdin.close()
            await asyncio.wait_for(process.wait(), timeout=10)
        finally:
            await close(process)

    asyncio.run(run())
