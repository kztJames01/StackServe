"""Check provider access and a disposable Neon branch lifecycle, not app deployment."""

import re
import sys
import time
from pathlib import Path
from uuid import uuid4

import httpx


def load_env() -> dict[str, str]:
    env = {}
    path = Path(".env.test.local")
    if path.exists():
        for line in path.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                env[key.strip()] = value.split("#")[0].strip().strip("\"'")
    return env


def run_neon_sandbox(env: dict[str, str], evidence: dict) -> bool:
    neon_key = env.get("NEON_API_KEY")
    project_id = env.get("NEON_SANDBOX_PROJECT_ID", "")
    result = {"status": "skipped"}
    evidence["neon"] = result
    if not neon_key or not re.fullmatch(r"[A-Za-z0-9-]+", project_id):
        result["reason"] = "NEON_API_KEY and explicit NEON_SANDBOX_PROJECT_ID required"
        return False

    headers = {"Authorization": f"Bearer {neon_key}", "Accept": "application/json"}
    branches_url = f"https://console.neon.tech/api/v2/projects/{project_id}/branches"
    branch_id = None
    result.update(status="failed", teardown_status="not_created")
    try:
        started = time.perf_counter()
        result["teardown_status"] = "unconfirmed"
        created = httpx.post(
            branches_url,
            headers=headers,
            json={"branch": {"name": f"sandbox-test-{uuid4().hex}"}},
            timeout=20.0,
        )
        result["branch_create_ms"] = round((time.perf_counter() - started) * 1000, 2)
        if created.status_code not in (200, 201):
            result["error"] = f"Branch creation HTTP {created.status_code}"
        else:
            data = created.json()
            branch_id = data.get("branch", {}).get("id")
            if not isinstance(branch_id, str) or not re.fullmatch(r"[A-Za-z0-9-]+", branch_id):
                branch_id = None
                result["error"] = (
                    "Branch creation returned no valid resource ID; reconcile manually"
                )
            else:
                result["project_id"] = project_id
                result["branch_id"] = branch_id
                endpoints = data.get("endpoints", [])
                if not isinstance(endpoints, list) or any(
                    not isinstance(e, dict) for e in endpoints
                ):
                    raise ValueError("Invalid endpoints")
                result["status"] = "lifecycle_verified"
    except Exception as error:
        result["status"] = "failed"
        result["error"] = type(error).__name__
    finally:
        if branch_id:
            started = time.perf_counter()
            try:
                deleted = httpx.delete(f"{branches_url}/{branch_id}", headers=headers, timeout=15.0)
                if deleted.status_code in (200, 204):
                    result["teardown_status"] = "delete_acknowledged"
                else:
                    result["status"] = "failed"
                    result["teardown_status"] = "unconfirmed"
                    result["cleanup_error"] = f"Branch deletion HTTP {deleted.status_code}"
            except Exception as error:
                result["status"] = "failed"
                result["teardown_status"] = "unconfirmed"
                result["cleanup_error"] = type(error).__name__
            result["branch_delete_ms"] = round((time.perf_counter() - started) * 1000, 2)
    return result["status"] == "lifecycle_verified"


def run_render_sandbox(env: dict[str, str], evidence: dict) -> bool:
    key = env.get("RENDER_API_KEY")
    result = {"status": "skipped"}
    evidence["render"] = result
    if not key:
        result["reason"] = "RENDER_API_KEY missing"
        return False
    headers = {"Authorization": f"Bearer {key}", "Accept": "application/json"}
    result["status"] = "failed"
    try:
        for label, url in (
            ("owners", "https://api.render.com/v1/owners"),
            ("services", "https://api.render.com/v1/services?limit=10"),
        ):
            started = time.perf_counter()
            response = httpx.get(url, headers=headers, timeout=10.0)
            result[f"{label}_ms"] = round((time.perf_counter() - started) * 1000, 2)
            if response.status_code != 200:
                result["error"] = f"{label} HTTP {response.status_code}"
                return False
            data = response.json()
            if not isinstance(data, list) or (label == "owners" and not data):
                result["error"] = f"Invalid {label} listing"
                return False
            result[f"{label}_count"] = len(data)
        result["status"] = "access_verified"
        return True
    except Exception as error:
        result["error"] = type(error).__name__
        return False


def run_cloudflare_sandbox(env: dict[str, str], evidence: dict) -> bool:
    token = env.get("CLOUDFLARE_API_TOKEN")
    account = env.get("CLOUDFLARE_ACCOUNT_ID", "")
    result = {"status": "skipped"}
    evidence["cloudflare_pages"] = result
    if not token or not re.fullmatch(r"[A-Za-z0-9-]+", account):
        result["reason"] = "Missing token or valid account ID"
        return False
    result["status"] = "failed"
    try:
        started = time.perf_counter()
        response = httpx.get(
            f"https://api.cloudflare.com/client/v4/accounts/{account}/pages/projects",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            timeout=10.0,
        )
        result["pages_api_ms"] = round((time.perf_counter() - started) * 1000, 2)
        if response.status_code != 200:
            result["error"] = f"Pages HTTP {response.status_code}"
            return False
        data = response.json()
        if data.get("success") is not True or not isinstance(data.get("result"), list):
            result["error"] = "Pages API did not confirm success"
            return False
        result.update(status="access_verified", projects_count=len(data["result"]))
        return True
    except Exception as error:
        result["error"] = type(error).__name__
        return False


def main():
    env = load_env()
    evidence = {}
    results = [
        run_neon_sandbox(env, evidence),
        run_render_sandbox(env, evidence),
        run_cloudflare_sandbox(env, evidence),
    ]
    for provider, data in evidence.items():
        print(f"[{provider}]: {data}")
    print("These checks do not verify deployed applications, health checks, or billing teardown.")
    sys.exit(0 if all(results) else 1)


if __name__ == "__main__":
    main()
