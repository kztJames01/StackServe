//! The container image relocates the worker and corpus under `/app`. The
//! binary must honor that runtime root instead of the build-time source path.

#[cfg(unix)]
#[test]
fn stackserve_root_selects_packaged_worker() {
    use std::os::unix::fs::PermissionsExt;
    use std::process::Command;
    use std::time::{SystemTime, UNIX_EPOCH};

    let unique = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    let root =
        std::env::temp_dir().join(format!("stackserve-root-{}-{unique}", std::process::id()));
    let worker_dir = root.join("python/stackserve_rag");
    let bin_dir = worker_dir.join(".venv/bin");
    std::fs::create_dir_all(&bin_dir).unwrap();

    let response = include_str!("../../../fixtures/protocol/response.jsonl")
        .replace("\"fixture-1\"", "\"cli-1\"")
        .replace(
            "[\"evidence_requires_requirement_review\",\"vector_artifacts_unavailable\"]",
            "[\"fake_root_worker\"]",
        );
    let cwd_marker = root.join("worker-cwd.txt");
    let worker = bin_dir.join("python");
    std::fs::write(
        &worker,
        format!(
            "#!/bin/sh\npwd > '{}'\nread line\ncat <<'STACKSERVE_EOF'\n{response}\nSTACKSERVE_EOF\n",
            cwd_marker.display()
        ),
    )
    .unwrap();
    std::fs::set_permissions(&worker, std::fs::Permissions::from_mode(0o700)).unwrap();

    let output = Command::new(env!("CARGO_BIN_EXE_stackserve-mcp"))
        .env("STACKSERVE_ROOT", &root)
        .args(["search", "Render PORT"])
        .output()
        .unwrap();

    let cwd = std::fs::read_to_string(&cwd_marker).ok();
    let expected_cwd = std::fs::canonicalize(&worker_dir).unwrap();
    let actual_cwd = cwd
        .as_deref()
        .map(str::trim)
        .map(std::fs::canonicalize)
        .transpose()
        .unwrap();
    let _ = std::fs::remove_dir_all(&root);
    assert!(
        output.status.success(),
        "stderr: {}",
        String::from_utf8_lossy(&output.stderr)
    );
    let response: serde_json::Value = serde_json::from_slice(&output.stdout).unwrap();
    assert_eq!(
        response["warnings"],
        serde_json::json!(["fake_root_worker"]),
        "the build-time worker path was used instead of STACKSERVE_ROOT"
    );
    assert_eq!(actual_cwd, Some(expected_cwd));
}

#[cfg(unix)]
#[test]
fn empty_stackserve_root_falls_back_to_the_build_root() {
    use std::os::unix::fs::PermissionsExt;
    use std::process::Command;
    use std::time::{SystemTime, UNIX_EPOCH};

    let unique = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    let scratch = std::env::temp_dir().join(format!(
        "stackserve-empty-root-{}-{unique}",
        std::process::id()
    ));
    std::fs::create_dir_all(&scratch).unwrap();

    // The worker lives outside the runtime root, so only the working directory
    // can prove which root was used. An empty value must not resolve to cwd.
    let response = include_str!("../../../fixtures/protocol/response.jsonl")
        .replace("\"fixture-1\"", "\"cli-1\"");
    let marker = scratch.join("worker-cwd.txt");
    let worker = scratch.join("python");
    std::fs::write(
        &worker,
        format!(
            "#!/bin/sh\npwd > '{}'\nread line\ncat <<'STACKSERVE_EOF'\n{response}\nSTACKSERVE_EOF\n",
            marker.display()
        ),
    )
    .unwrap();
    std::fs::set_permissions(&worker, std::fs::Permissions::from_mode(0o700)).unwrap();

    let output = Command::new(env!("CARGO_BIN_EXE_stackserve-mcp"))
        .env("STACKSERVE_ROOT", "")
        .arg("--python")
        .arg(&worker)
        .args(["search", "Render PORT"])
        .output()
        .unwrap();

    let cwd = std::fs::read_to_string(&marker).ok();
    let build_root = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
    let expected_cwd = std::fs::canonicalize(build_root.join("python/stackserve_rag")).unwrap();
    let actual_cwd = cwd
        .as_deref()
        .map(str::trim)
        .map(std::fs::canonicalize)
        .transpose()
        .unwrap();
    let _ = std::fs::remove_dir_all(&scratch);
    assert!(
        output.status.success(),
        "stderr: {}",
        String::from_utf8_lossy(&output.stderr)
    );
    assert_eq!(actual_cwd, Some(expected_cwd));
}
