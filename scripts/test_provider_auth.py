"""Test authentication against all provided sandbox credentials in .env.test.local."""

from pathlib import Path
import httpx
import boto3
from botocore.config import Config


def load_env() -> dict[str, str]:
    env = {}
    p = Path(".env.test.local")
    if p.exists():
        for line in p.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                # Strip inline comment and whitespace/quotes
                v = v.split("#")[0].strip()
                v = v.strip("\"'")
                env[k.strip()] = v
    return env


def main():
    env = load_env()
    results = {}

    # 1. Render API
    render_key = env.get("RENDER_API_KEY")
    if render_key:
        try:
            resp = httpx.get(
                "https://api.render.com/v1/owners",
                headers={"Authorization": f"Bearer {render_key}", "Accept": "application/json"},
                timeout=10.0,
            )
            if resp.status_code == 200:
                owners = resp.json()
                results["render"] = f"OK (status 200, {len(owners)} owners found)"
            else:
                results["render"] = f"FAILED (HTTP {resp.status_code})"
        except Exception as e:
            results["render"] = f"ERROR ({type(e).__name__})"
    else:
        results["render"] = "SKIPPED (no key)"

    # 2. Neon API
    neon_key = env.get("NEON_API_KEY")
    if neon_key:
        try:
            # Query organizations / me
            httpx.get(
                "https://console.neon.tech/api/v2/users/me",
                headers={"Authorization": f"Bearer {neon_key}", "Accept": "application/json"},
                timeout=10.0,
            )
            orgs_resp = httpx.get(
                "https://console.neon.tech/api/v2/organizations",
                headers={"Authorization": f"Bearer {neon_key}", "Accept": "application/json"},
                timeout=10.0,
            )
            org_id = None
            if orgs_resp.status_code == 200:
                orgs = orgs_resp.json().get("organizations", [])
                if orgs:
                    org_id = orgs[0]["id"]

            projects_url = "https://console.neon.tech/api/v2/projects"
            if org_id:
                projects_url += f"?org_id={org_id}"

            resp = httpx.get(
                projects_url,
                headers={"Authorization": f"Bearer {neon_key}", "Accept": "application/json"},
                timeout=10.0,
            )
            if resp.status_code == 200:
                data = resp.json()
                count = len(data.get("projects", []))
                results["neon"] = f"OK (status 200, org {org_id}, {count} projects found)"
            else:
                results["neon"] = f"FAILED (HTTP {resp.status_code})"
        except Exception as e:
            results["neon"] = f"ERROR ({type(e).__name__})"
    else:
        results["neon"] = "SKIPPED (no key)"

    # 3. Cloudflare API
    cf_token = env.get("CLOUDFLARE_API_TOKEN")
    if cf_token:
        try:
            resp = httpx.get(
                "https://api.cloudflare.com/client/v4/user/tokens/verify",
                headers={"Authorization": f"Bearer {cf_token}", "Accept": "application/json"},
                timeout=10.0,
            )
            if resp.status_code == 200:
                data = resp.json()
                results["cloudflare_token"] = (
                    f"OK (verified: {data.get('result', {}).get('status')})"
                )
            else:
                results["cloudflare_token"] = f"FAILED (HTTP {resp.status_code})"
        except Exception as e:
            results["cloudflare_token"] = f"ERROR ({type(e).__name__})"
    else:
        results["cloudflare_token"] = "SKIPPED (no token)"

    # 4. Cloudflare R2 S3 API
    r2_key = env.get("R2_ACCESS_KEY_ID")
    r2_secret = env.get("R2_SECRET_ACCESS_KEY")
    r2_endpoint = env.get("R2_ENDPOINT_URL")
    if r2_key and r2_secret and r2_endpoint:
        try:
            s3 = boto3.client(
                "s3",
                endpoint_url=r2_endpoint,
                aws_access_key_id=r2_key,
                aws_secret_access_key=r2_secret,
                region_name="auto",
                config=Config(signature_version="s3v4"),
            )
            buckets = s3.list_buckets()
            results["cloudflare_r2"] = f"OK (status 200, {len(buckets.get('Buckets', []))} buckets)"
        except Exception as e:
            results["cloudflare_r2"] = f"ERROR ({type(e).__name__})"
    else:
        results["cloudflare_r2"] = "SKIPPED (incomplete credentials)"

    # 5. Backblaze B2 S3 API
    b2_key = env.get("B2_KEY_ID")
    b2_secret = env.get("B2_APPLICATION_KEY")
    b2_region = env.get("B2_REGION", "us-west-004")
    b2_endpoint = env.get("B2_ENDPOINT_URL") or f"https://s3.{b2_region}.backblazeb2.com"
    if b2_key and b2_secret:
        try:
            s3 = boto3.client(
                "s3",
                endpoint_url=b2_endpoint,
                aws_access_key_id=b2_key,
                aws_secret_access_key=b2_secret,
                region_name=b2_region,
                config=Config(signature_version="s3v4"),
            )
            buckets = s3.list_buckets()
            results["backblaze_b2"] = f"OK (status 200, {len(buckets.get('Buckets', []))} buckets)"
        except Exception as e:
            results["backblaze_b2"] = f"ERROR ({type(e).__name__})"
    else:
        results["backblaze_b2"] = "SKIPPED (incomplete credentials)"

    print("\n--- Provider Authentication Test Results ---")
    for provider, res in results.items():
        print(f"[{provider}]: {res}")


if __name__ == "__main__":
    main()
