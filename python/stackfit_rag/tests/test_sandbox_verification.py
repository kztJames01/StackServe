import importlib.util
import json
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest


@pytest.fixture
def harness(monkeypatch):
    def unexpected(*args, **kwargs):
        raise AssertionError("Unexpected HTTP call")

    http = SimpleNamespace(get=unexpected, post=unexpected, delete=unexpected)
    monkeypatch.setitem(sys.modules, "httpx", http)
    path = Path(__file__).resolve().parents[3] / "scripts/sandbox_deploy_recipe_a.py"
    spec = importlib.util.spec_from_file_location("sandbox_harness", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def response(status, data):
    return SimpleNamespace(status_code=status, json=lambda: data, text=json.dumps(data))


def test_render_listing_only_verifies_access(harness, monkeypatch):
    replies = iter([response(200, [{"owner": {"id": "owner-test"}}]), response(200, [])])
    monkeypatch.setattr(harness.httpx, "get", lambda *a, **kw: next(replies))
    evidence = {}
    assert harness.run_render_sandbox({"RENDER_API_KEY": "synthetic-token"}, evidence)
    assert evidence["render"]["status"] == "access_verified"


@pytest.mark.parametrize("success", [True, False])
def test_pages_requires_api_success_and_only_verifies_access(harness, monkeypatch, success):
    monkeypatch.setattr(
        harness.httpx, "get", lambda *a, **kw: response(200, {"success": success, "result": []})
    )
    evidence = {}
    assert (
        harness.run_cloudflare_sandbox(
            {"CLOUDFLARE_API_TOKEN": "synthetic-token", "CLOUDFLARE_ACCOUNT_ID": "account-test"},
            evidence,
        )
        is success
    )
    assert evidence["cloudflare_pages"]["status"] == ("access_verified" if success else "failed")


def test_neon_requires_explicit_sandbox_project(harness, monkeypatch):
    calls = []
    monkeypatch.setattr(harness.httpx, "get", lambda *a, **kw: calls.append(a))
    evidence = {}
    assert not harness.run_neon_sandbox({"NEON_API_KEY": "synthetic-token"}, evidence)
    assert calls == []
    assert evidence["neon"]["status"] == "skipped"


@pytest.mark.parametrize("delete_status", [204, 500])
def test_neon_cleanup_controls_lifecycle_result(harness, monkeypatch, delete_status):
    def get(url, **kwargs):
        if "organizations" in url:
            return response(200, {"organizations": [{"id": "org-test"}]})
        return response(200, {"projects": [{"id": "sandbox-test", "region_id": "test"}]})

    deleted = []
    monkeypatch.setattr(harness.httpx, "get", get)
    monkeypatch.setattr(
        harness.httpx, "post", lambda *a, **kw: response(201, {"branch": {"id": "branch-test"}})
    )

    def delete(url, **kwargs):
        deleted.append(url)
        return response(delete_status, {})

    monkeypatch.setattr(harness.httpx, "delete", delete)
    evidence = {}
    assert harness.run_neon_sandbox(
        {"NEON_API_KEY": "synthetic-token", "NEON_SANDBOX_PROJECT_ID": "sandbox-test"}, evidence
    ) is (delete_status == 204)
    assert len(deleted) == 1
    assert evidence["neon"]["status"] == (
        "lifecycle_verified" if delete_status == 204 else "failed"
    )


def test_provider_error_does_not_echo_token(harness, monkeypatch):
    marker = "synthetic-sensitive-token"
    monkeypatch.setattr(harness.httpx, "get", lambda *a, **kw: response(403, {"error": marker}))
    evidence = {}
    assert not harness.run_render_sandbox({"RENDER_API_KEY": marker}, evidence)
    assert marker not in json.dumps(evidence)


def test_neon_cleans_up_after_post_creation_error(harness, monkeypatch):
    replies = iter(
        [
            response(200, {"organizations": [{"id": "org-test"}]}),
            response(200, {"projects": [{"id": "sandbox-test"}]}),
        ]
    )
    monkeypatch.setattr(harness.httpx, "get", lambda *a, **kw: next(replies))
    monkeypatch.setattr(
        harness.httpx,
        "post",
        lambda *a, **kw: response(201, {"branch": {"id": "branch-test"}, "endpoints": [None]}),
    )
    deleted = []

    def delete(url, **kwargs):
        deleted.append(url)
        return response(204, {})

    monkeypatch.setattr(harness.httpx, "delete", delete)
    evidence = {}
    assert not harness.run_neon_sandbox(
        {"NEON_API_KEY": "synthetic-token", "NEON_SANDBOX_PROJECT_ID": "sandbox-test"}, evidence
    )
    assert len(deleted) == 1
    assert evidence["neon"]["status"] != "deployment_verified"


def test_neon_cleanup_timeout_fails_without_echoing_exception(harness, monkeypatch):
    monkeypatch.setattr(
        harness.httpx, "post", lambda *a, **kw: response(201, {"branch": {"id": "branch-test"}})
    )

    def timeout(*args, **kwargs):
        raise TimeoutError("synthetic-sensitive-token")

    monkeypatch.setattr(harness.httpx, "delete", timeout)
    evidence = {}
    assert not harness.run_neon_sandbox(
        {"NEON_API_KEY": "synthetic-sensitive-token", "NEON_SANDBOX_PROJECT_ID": "sandbox-test"},
        evidence,
    )
    assert evidence["neon"]["teardown_status"] == "unconfirmed"
    assert "synthetic-sensitive-token" not in json.dumps(evidence)


def test_neon_uses_only_explicit_project(harness, monkeypatch):
    posts = []

    def post(url, **kwargs):
        posts.append(url)
        return response(201, {"branch": {"id": "branch-test"}})

    monkeypatch.setattr(harness.httpx, "post", post)
    monkeypatch.setattr(harness.httpx, "delete", lambda *a, **kw: response(204, {}))
    evidence = {}
    assert harness.run_neon_sandbox(
        {"NEON_API_KEY": "synthetic-token", "NEON_SANDBOX_PROJECT_ID": "explicit-project"},
        evidence,
    )
    assert posts == ["https://console.neon.tech/api/v2/projects/explicit-project/branches"]
