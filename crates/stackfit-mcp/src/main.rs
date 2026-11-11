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

use anyhow::{Context, Result};
use clap::{Parser, Subcommand};
use rmcp::{
    ServerHandler, ServiceExt,
    handler::server::wrapper::Parameters,
    model::{Implementation, ServerCapabilities, ServerConfig},
    schemars, tool, tool_handler, tool_router,
    transport::stdio,
};
use schemars::JsonSchema;
use serde::Deserialize;
use serde_json::{Map, Value, json};
use stackfit_core::{
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
    #[arg(long, global = true, env = "STACKFIT_PYTHON")]
    python: Option<PathBuf>,
    #[arg(
        long,
        global = true,
        env = "STACKFIT_WORKER_STARTUP_TIMEOUT_SECS",
        default_value_t = 60
    )]
    worker_startup_timeout_secs: u64,
    #[arg(
        long,
        global = true,
        env = "STACKFIT_WORKER_WARM_TIMEOUT_SECS",
        default_value_t = 10
    )]
    worker_warm_timeout_secs: u64,
}

#[derive(Subcommand)]
enum Command {
    Serve,
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
    std::env::var_os("STACKFIT_ROOT")
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
            Implementation::new("stackfit-mcp", env!("CARGO_PKG_VERSION")),
        )
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    let args = Args::parse();
    let root = root_dir();
    let python = args
        .python
        .unwrap_or_else(|| root.join("python/stackfit_rag/.venv/bin/python"));
    let worker = Arc::new(
        Worker::new(python, root.join("python/stackfit_rag")).with_timeouts(
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
    }
    Ok(())
}
