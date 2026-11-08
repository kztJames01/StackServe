import asyncio
import json
import os

import jsonschema
import pytest


@pytest.mark.skipif(
    not os.environ.get("STACKFIT_PROFILE_BIN"), reason="contract job supplies binary"
)
def test_mcp_search_round_trip():
    async def run():
        process = await asyncio.create_subprocess_exec(
            os.environ["STACKFIT_PROFILE_BIN"],
            "serve",
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        async def send(message):
            process.stdin.write(json.dumps(message).encode() + b"\n")
            await process.stdin.drain()

        async def receive():
            return json.loads(await asyncio.wait_for(process.stdout.readline(), timeout=60))

        try:
            await send(
                {
                    "jsonrpc": "2.0",
                    "id": 1,
                    "method": "initialize",
                    "params": {
                        "protocolVersion": "2025-11-25",
                        "capabilities": {},
                        "clientInfo": {"name": "stackfit-contract-test", "version": "1"},
                    },
                }
            )
            assert (await receive())["result"]["serverInfo"]["name"] == "stackfit-mcp"
            await send({"jsonrpc": "2.0", "method": "notifications/initialized"})
            await send({"jsonrpc": "2.0", "id": 2, "method": "tools/list"})
            tools = (await receive())["result"]["tools"]
            search = next(tool for tool in tools if tool["name"] == "search_provider_docs")
            arguments = {
                "query": "Render PORT",
                "follow_up_query": "health checks",
                "filters": {"provider": "render"},
                "limit": 2,
            }
            jsonschema.validate(arguments, search["inputSchema"])
            for id_ in (3, 4):
                await send(
                    {
                        "jsonrpc": "2.0",
                        "id": id_,
                        "method": "tools/call",
                        "params": {"name": "search_provider_docs", "arguments": arguments},
                    }
                )
                message = await receive()
                response = json.loads(message["result"]["content"][0]["text"])
                assert response["status"] == "ok"
                assert len(response["chunks"]) == 2
                assert all(chunk["provider"] == "render" for chunk in response["chunks"])
                assert response["follow_up_used"] and response["needs_verification"]
                assert not response["verified_ready"]
            process.stdin.close()
            await asyncio.wait_for(process.wait(), timeout=10)
            assert not await process.stderr.read()
        finally:
            if process.returncode is None:
                process.kill()
                await process.wait()

    asyncio.run(run())
