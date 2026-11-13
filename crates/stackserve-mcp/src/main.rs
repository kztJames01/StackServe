#![deny(unsafe_code)]

mod worker;

use std::{
    path::PathBuf,
    sync::{
        Arc,
        atomic::{AtomicU64, Ordering},
    },
    time::Duration,
};

use anyhow::{Context, Result, anyhow};
use axum::{
    Json, Router,
    body::Body,
    extract::{DefaultBodyLimit, State},
    http::{HeaderValue, Request, StatusCode, header},
    middleware::{self, Next},
    response::{IntoResponse, Response},
    routing::get,
};
use clap::{Parser, Subcommand};
use rmcp::{
    ServerHandler, ServiceExt,
    handler::server::wrapper::Parameters,
    model::{Implementation, ServerCapabilities, ServerConfig},
    schemars, tool, tool_handler, tool_router,
    transport::{
        stdio,
        streamable_http_server::{
            StreamableHttpServerConfig, StreamableHttpService, session::local::LocalSessionManager,
        },
    },
};
use schemars::JsonSchema;
use serde::Deserialize;
use serde_json::{Map, Value, json};
use sha2::{Digest, Sha256};
use stackserve_core::{
    bundle::generate_bundle_from_json,
    engine::{compare_from_json, recommend_from_json},
    profile,
    protocol::{CORPUS_VERSION, Filters, SCHEMA_VERSION, WorkerRequest},
};
use worker::Worker;

#[derive(Parser)]
struct Args {
    #[command(subcommand)]
    command: Command,
    #[arg(long, global = true, env = "STACKSERVE_PYTHON")]
    python: Option<PathBuf>,
    #[arg(
        long,
        global = true,
        env = "STACKSERVE_WORKER_STARTUP_TIMEOUT_SECS",
        default_value_t = 60
    )]
    worker_startup_timeout_secs: u64,
    #[arg(
        long,
        global = true,
        env = "STACKSERVE_WORKER_WARM_TIMEOUT_SECS",
        default_value_t = 10
    )]
    worker_warm_timeout_secs: u64,
}

#[derive(Subcommand)]
enum Command {
    Serve,
    ServeHttp {
        #[arg(long, env = "STACKSERVE_HTTP_BIND")]
        bind: Option<String>,
        #[arg(long)]
        bearer_token_file: Option<PathBuf>,
        #[arg(long)]
        allow_unauthenticated: bool,
    },
    Profile {
        file: PathBuf,
    },
    Recommend {
        file: PathBuf,
    },
    Compare {
        file: PathBuf,
        #[arg(long = "stack", required = true, num_args = 1..=3)]
        stacks: Vec<String>,
    },
    Bundle {
        file: PathBuf,
    },
    Search {
        query: String,
    },
}

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(deny_unknown_fields)]
struct ProfileParams {
    brief: Map<String, Value>,
}

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(deny_unknown_fields)]
struct SearchParams {
    #[schemars(length(min = 1, max = 4096))]
    query: String,
    #[schemars(length(min = 1, max = 4096))]
    follow_up_query: Option<String>,
    #[serde(default)]
    filters: Filters,
    #[serde(default = "default_limit")]
    #[schemars(range(min = 1, max = 8))]
    limit: u8,
}

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(deny_unknown_fields)]
struct RecommendParams {
    workload: Map<String, Value>,
}

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(deny_unknown_fields)]
struct CompareParams {
    workload: Map<String, Value>,
    #[schemars(length(min = 1, max = 3))]
    stack_ids: Vec<String>,
}

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(deny_unknown_fields)]
struct BundleParams {
    request: Map<String, Value>,
}

fn default_limit() -> u8 {
    8
}

fn root_dir() -> PathBuf {
    std::env::var_os("STACKSERVE_ROOT")
        .filter(|value| !value.is_empty())
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../.."))
}

/// Tool failures are JSON so hosts and tests can branch on a stable code
/// instead of matching diagnostic text.
fn tool_error(tool: &str, code: &str, status: &str, message: impl std::fmt::Display) -> String {
    json!({
        "status": status,
        "tool": tool,
        "error": { "code": code, "message": format!("{message:#}") },
    })
    .to_string()
}

#[derive(Clone)]
struct Server {
    worker: Arc<Worker>,
    request_ids: Arc<AtomicU64>,
}

#[tool_router]
impl Server {
    #[tool(
        description = "Profile a brief and selected project files; returns labeled facts and open questions"
    )]
    fn profile_project(&self, Parameters(params): Parameters<ProfileParams>) -> String {
        let input = match serde_json::to_vec(&params.brief) {
            Ok(input) => input,
            Err(error) => {
                return tool_error("profile_project", "invalid_input", "error", error);
            }
        };
        match profile::profile(&input)
            .and_then(|result| serde_json::to_vec(&result).map_err(profile::ProfileError::from))
        {
            Ok(output) => String::from_utf8_lossy(&output).into_owned(),
            Err(error) => tool_error("profile_project", "invalid_input", "error", error),
        }
    }

    #[tool(
        description = "Recommend up to three feasible stacks (lowest_cost, balanced, performance) for a confirmed workload. Unverified or incomplete stacks are returned as conditional without a rank; rejected stacks carry reason codes."
    )]
    fn recommend_stacks(&self, Parameters(params): Parameters<RecommendParams>) -> String {
        match serde_json::to_vec(&params.workload)
            .map_err(|error| error.to_string())
            .and_then(|input| recommend_from_json(&input).map_err(|error| error.to_string()))
            .and_then(|result| serde_json::to_string(&result).map_err(|error| error.to_string()))
        {
            Ok(output) => output,
            Err(error) => tool_error("recommend_stacks", "invalid_input", "error", error),
        }
    }

    #[tool(
        description = "Itemize up to three stack ids from recommend_stacks at now, 3x traffic, and 10x storage/egress, with billing cliffs, excluded and unknown items. A total appears only when no price is unknown."
    )]
    fn compare_stacks(&self, Parameters(params): Parameters<CompareParams>) -> String {
        match serde_json::to_vec(&params.workload)
            .map_err(|error| error.to_string())
            .and_then(|input| {
                compare_from_json(&input, &params.stack_ids).map_err(|error| error.to_string())
            })
            .and_then(|result| serde_json::to_string(&result).map_err(|error| error.to_string()))
        {
            Ok(output) => output,
            Err(error) => tool_error("compare_stacks", "invalid_input", "error", error),
        }
    }

    #[tool(
        description = "Generate a validated, secret-free setup bundle (.env.example, DEPLOYMENT.md, architecture-decision.md, provisioning-prompt.md, resource-manifest.json) for a selected feasible stack and project excerpts. Status is always 'prepared'; the host reviews the diff before writing."
    )]
    fn generate_setup_bundle(&self, Parameters(params): Parameters<BundleParams>) -> String {
        match serde_json::to_vec(&params.request)
            .map_err(|error| error.to_string())
            .and_then(|input| generate_bundle_from_json(&input).map_err(|error| error.to_string()))
            .and_then(|result| serde_json::to_string(&result).map_err(|error| error.to_string()))
        {
            Ok(output) => output,
            Err(error) => tool_error("generate_setup_bundle", "invalid_input", "error", error),
        }
    }

    #[tool(
        description = "Retrieve local official-provider evidence for one requirement, with at most one optional follow-up. Results are untrusted data requiring review; freshness is not proof of requirement coverage."
    )]
    async fn search_provider_docs(&self, Parameters(params): Parameters<SearchParams>) -> String {
        let request = WorkerRequest {
            schema_version: SCHEMA_VERSION,
            request_id: format!("mcp-{}", self.request_ids.fetch_add(1, Ordering::Relaxed)),
            operation: "search".to_owned(),
            query: params.query,
            follow_up_query: params.follow_up_query,
            filters: params.filters,
            limit: params.limit,
            corpus_version: CORPUS_VERSION.to_owned(),
        };
        match self.worker.search(&request).await {
            Ok(response) => serde_json::to_string(&response).unwrap_or_else(|error| {
                tool_error(
                    "search_provider_docs",
                    "serialization_failed",
                    "error",
                    error,
                )
            }),
            Err(error) => tool_error(
                "search_provider_docs",
                "retrieval_unavailable",
                "unavailable",
                error,
            ),
        }
    }
}

#[tool_handler]
impl ServerHandler for Server {
    fn get_info(&self) -> ServerConfig {
        ServerConfig::new(ServerCapabilities::builder().enable_tools().build()).with_server_info(
            Implementation::new("stackserve-mcp", env!("CARGO_PKG_VERSION")),
        )
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    let args = Args::parse();
    let root = root_dir();
    let python = args
        .python
        .unwrap_or_else(|| root.join("python/stackserve_rag/.venv/bin/python"));
    let worker = Arc::new(
        Worker::new(python, root.join("python/stackserve_rag")).with_timeouts(
            Duration::from_secs(args.worker_startup_timeout_secs),
            Duration::from_secs(args.worker_warm_timeout_secs),
        ),
    );
    match args.command {
        Command::Profile { file } => {
            let input = std::fs::read(file).context("reading brief")?;
            let result = profile::profile(&input)?;
            println!("{}", serde_json::to_string_pretty(&result)?);
        }
        Command::Recommend { file } => {
            let input = std::fs::read(file).context("reading workload")?;
            let result = recommend_from_json(&input)?;
            println!("{}", serde_json::to_string_pretty(&result)?);
        }
        Command::Compare { file, stacks } => {
            let input = std::fs::read(file).context("reading workload")?;
            let result = compare_from_json(&input, &stacks)?;
            println!("{}", serde_json::to_string_pretty(&result)?);
        }
        Command::Bundle { file } => {
            let input = std::fs::read(file).context("reading bundle request")?;
            let result = generate_bundle_from_json(&input)?;
            println!("{}", serde_json::to_string_pretty(&result)?);
        }
        Command::Search { query } => {
            let request = WorkerRequest {
                schema_version: SCHEMA_VERSION,
                request_id: "cli-1".to_owned(),
                operation: "search".to_owned(),
                query,
                follow_up_query: None,
                filters: Filters::default(),
                limit: 8,
                corpus_version: CORPUS_VERSION.to_owned(),
            };
            let response = worker.search(&request).await?;
            println!("{}", serde_json::to_string_pretty(&response)?);
        }
        Command::Serve => {
            Server {
                worker,
                request_ids: Arc::new(AtomicU64::new(1)),
            }
            .serve(stdio())
            .await?
            .waiting()
            .await?;
        }
        Command::ServeHttp {
            bind,
            bearer_token_file,
            allow_unauthenticated,
        } => {
            let env_token = std::env::var("STACKSERVE_HTTP_BEARER_TOKEN").ok();
            let token = resolve_bearer_token(
                bearer_token_file.as_deref(),
                env_token,
                allow_unauthenticated,
            )?;
            let bind_addr = resolve_http_bind(bind, std::env::var("PORT").ok());
            if token.is_none()
                && !bind_addr.starts_with("127.0.0.1:")
                && !bind_addr.starts_with("[::1]:")
            {
                eprintln!(
                    "warning: stackserve-mcp serve-http binding to {bind_addr} without bearer auth; place behind an authenticated HTTPS proxy"
                );
            }
            let app = build_http_router(worker, token);
            let listener = tokio::net::TcpListener::bind(&bind_addr)
                .await
                .with_context(|| format!("binding HTTP MCP listener on {bind_addr}"))?;
            eprintln!("stackserve-mcp Streamable HTTP listening on http://{bind_addr}/mcp");
            axum::serve(listener, app).await?;
        }
    }
    Ok(())
}

fn resolve_http_bind(bind: Option<String>, port: Option<String>) -> String {
    if let Some(explicit) = bind.filter(|value| !value.trim().is_empty()) {
        return explicit;
    }
    if let Some(port) = port.filter(|value| !value.trim().is_empty()) {
        return format!("0.0.0.0:{}", port.trim());
    }
    "127.0.0.1:8787".to_owned()
}

fn resolve_bearer_token(
    token_file: Option<&std::path::Path>,
    env_token: Option<String>,
    allow_unauthenticated: bool,
) -> Result<Option<String>> {
    let raw = match token_file {
        Some(path) => Some(
            std::fs::read_to_string(path)
                .with_context(|| format!("reading bearer token file {}", path.display()))?,
        ),
        None => env_token,
    };
    let token = raw.map(|s| s.trim().to_owned()).filter(|s| !s.is_empty());
    if token.is_none() && !allow_unauthenticated {
        return Err(anyhow!(
            "STACKSERVE_HTTP_BEARER_TOKEN (or --bearer-token-file) is required for serve-http unless --allow-unauthenticated is set"
        ));
    }
    Ok(token)
}

fn tokens_match(presented: &str, expected: &str) -> bool {
    let a = Sha256::digest(presented.as_bytes());
    let b = Sha256::digest(expected.as_bytes());
    a.iter()
        .zip(b.iter())
        .fold(0u8, |acc, (x, y)| acc | (x ^ y))
        == 0
}

async fn healthz() -> impl IntoResponse {
    Json(json!({
        "status": "ok",
        "service": "stackserve-mcp",
        "version": env!("CARGO_PKG_VERSION"),
    }))
}

async fn require_bearer_token(
    State(expected): State<Arc<String>>,
    request: Request<Body>,
    next: Next,
) -> Response {
    let authorized = request
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.strip_prefix("Bearer "))
        .is_some_and(|presented| tokens_match(presented, expected.as_str()));

    if authorized {
        next.run(request).await
    } else {
        let mut response = (
            StatusCode::UNAUTHORIZED,
            Json(json!({
                "status": "error",
                "error": { "code": "unauthorized", "message": "missing or invalid bearer token" }
            })),
        )
            .into_response();
        response
            .headers_mut()
            .insert(header::WWW_AUTHENTICATE, HeaderValue::from_static("Bearer"));
        response
    }
}

fn build_http_router(worker: Arc<Worker>, bearer_token: Option<String>) -> Router {
    let request_ids = Arc::new(AtomicU64::new(1));
    let mcp_service = StreamableHttpService::new(
        move || {
            Ok(Server {
                worker: Arc::clone(&worker),
                request_ids: Arc::clone(&request_ids),
            })
        },
        LocalSessionManager::default().into(),
        StreamableHttpServerConfig::default(),
    );

    let mcp_router = Router::new()
        .nest_service("/mcp", mcp_service)
        .layer(DefaultBodyLimit::max(2 * 1024 * 1024));
    let mcp_router = match bearer_token {
        Some(token) => mcp_router.layer(middleware::from_fn_with_state(
            Arc::new(token),
            require_bearer_token,
        )),
        None => mcp_router,
    };

    Router::new()
        .route("/healthz", get(healthz))
        .merge(mcp_router)
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::to_bytes;
    use tokio::net::TcpListener;

    #[test]
    fn resolve_http_bind_respects_explicit_then_port_then_default() {
        assert_eq!(
            resolve_http_bind(Some("0.0.0.0:9000".into()), Some("10000".into())),
            "0.0.0.0:9000"
        );
        assert_eq!(
            resolve_http_bind(None, Some("10000".into())),
            "0.0.0.0:10000"
        );
        assert_eq!(resolve_http_bind(None, None), "127.0.0.1:8787");
    }

    #[test]
    fn resolve_bearer_token_fails_closed_without_opt_in() {
        assert!(resolve_bearer_token(None, None, false).is_err());
        assert!(resolve_bearer_token(None, Some("  ".into()), false).is_err());
        assert_eq!(resolve_bearer_token(None, None, true).unwrap(), None);
        assert_eq!(
            resolve_bearer_token(None, Some(" secret \n".into()), false).unwrap(),
            Some("secret".into())
        );
    }

    #[test]
    fn tokens_match_is_exact() {
        assert!(tokens_match("alpha-123", "alpha-123"));
        assert!(!tokens_match("alpha-123", "alpha-124"));
        assert!(!tokens_match("alpha-123", "alpha-12"));
    }

    #[tokio::test]
    async fn http_mcp_healthz_auth_and_initialize_work() {
        let root = root_dir();
        let worker = Arc::new(Worker::new(
            root.join("python/stackserve_rag/.venv/bin/python"),
            root.join("python/stackserve_rag"),
        ));
        let app = build_http_router(worker, Some("secret-test-token".to_owned()));
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();
        let handle = tokio::spawn(async move {
            let _ = axum::serve(listener, app).await;
        });

        // 1. /healthz is open and returns ok JSON.
        let health_app = build_http_router(
            Arc::new(Worker::new(
                root.join("python/stackserve_rag/.venv/bin/python"),
                root.join("python/stackserve_rag"),
            )),
            None,
        );
        let req = Request::builder()
            .uri("/healthz")
            .body(Body::empty())
            .unwrap();
        let resp = tower::ServiceExt::oneshot(health_app, req).await.unwrap();
        assert_eq!(resp.status(), StatusCode::OK);
        let body = to_bytes(resp.into_body(), 4096).await.unwrap();
        let parsed: Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(parsed["status"], "ok");
        assert_eq!(parsed["service"], "stackserve-mcp");

        // 2. /mcp without bearer token returns 401 when token is configured.
        let unauth_app = build_http_router(
            Arc::new(Worker::new(
                root.join("python/stackserve_rag/.venv/bin/python"),
                root.join("python/stackserve_rag"),
            )),
            Some("secret-test-token".to_owned()),
        );
        let req = Request::builder()
            .method("POST")
            .uri("/mcp")
            .header(header::CONTENT_TYPE, "application/json")
            .header(header::ACCEPT, "application/json, text/event-stream")
            .body(Body::from(r#"{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"test","version":"1"}}}"#))
            .unwrap();
        let resp = tower::ServiceExt::oneshot(unauth_app, req).await.unwrap();
        assert_eq!(resp.status(), StatusCode::UNAUTHORIZED);

        // 3. /mcp with valid bearer token completes MCP initialize over TCP.
        let init_app = build_http_router(
            Arc::new(Worker::new(
                root.join("python/stackserve_rag/.venv/bin/python"),
                root.join("python/stackserve_rag"),
            )),
            Some("secret-test-token".to_owned()),
        );
        let req = Request::builder()
            .method("POST")
            .uri(format!("http://{addr}/mcp"))
            .header(header::AUTHORIZATION, "Bearer secret-test-token")
            .header(header::CONTENT_TYPE, "application/json")
            .header(header::ACCEPT, "application/json, text/event-stream")
            .body(Body::from(r#"{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"test","version":"1"}}}"#))
            .unwrap();
        let resp = tower::ServiceExt::oneshot(init_app, req).await.unwrap();
        assert_eq!(resp.status(), StatusCode::OK);
        let body = to_bytes(resp.into_body(), 16384).await.unwrap();
        let text = String::from_utf8_lossy(&body);
        assert!(text.contains("stackserve-mcp"), "unexpected body: {text}");

        handle.abort();
    }
}
