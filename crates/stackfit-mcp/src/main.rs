#![deny(unsafe_code)]

mod worker;

use std::{path::PathBuf, sync::Arc, time::Duration};

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
use serde_json::Value;
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
    brief: Value,
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
    workload: Value,
}

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(deny_unknown_fields)]
struct CompareParams {
    workload: Value,
    #[schemars(length(min = 1, max = 3))]
    stack_ids: Vec<String>,
}

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(deny_unknown_fields)]
struct BundleParams {
    request: Value,
}

fn default_limit() -> u8 {
    8
}

#[derive(Clone)]
struct Server {
    worker: Arc<Worker>,
}

#[tool_router]
impl Server {
    #[tool(
        description = "Profile a brief and selected project files; returns labeled facts and open questions"
    )]
    fn profile_project(&self, Parameters(params): Parameters<ProfileParams>) -> String {
        let input = match serde_json::to_vec(&params.brief) {
            Ok(input) => input,
            Err(error) => return format!("invalid brief: {error}"),
        };
        match profile::profile(&input)
            .and_then(|result| serde_json::to_vec(&result).map_err(profile::ProfileError::from))
        {
            Ok(output) => String::from_utf8_lossy(&output).into_owned(),
            Err(error) => format!("profile unavailable: {error}"),
        }
    }

    #[tool(
        description = "Recommend up to three feasible stacks (lowest_cost, balanced, performance) for a confirmed workload. Unverified or incomplete stacks are returned as conditional without a rank; rejected stacks carry reason codes."
    )]
    fn recommend_stacks(&self, Parameters(params): Parameters<RecommendParams>) -> String {
        let result = serde_json::to_vec(&params.workload)
            .map_err(|error| error.to_string())
            .and_then(|input| recommend_from_json(&input).map_err(|error| error.to_string()))
            .and_then(|result| serde_json::to_string(&result).map_err(|error| error.to_string()));
        result.unwrap_or_else(|error| format!("recommendation unavailable: {error}"))
    }

    #[tool(
        description = "Itemize up to three stack ids from recommend_stacks at now, 3x traffic, and 10x storage/egress, with billing cliffs, excluded and unknown items. A total appears only when no price is unknown."
    )]
    fn compare_stacks(&self, Parameters(params): Parameters<CompareParams>) -> String {
        let result = serde_json::to_vec(&params.workload)
            .map_err(|error| error.to_string())
            .and_then(|input| {
                compare_from_json(&input, &params.stack_ids).map_err(|error| error.to_string())
            })
            .and_then(|result| serde_json::to_string(&result).map_err(|error| error.to_string()));
        result.unwrap_or_else(|error| format!("comparison unavailable: {error}"))
    }

    #[tool(
        description = "Generate a validated, secret-free setup bundle (.env.example, DEPLOYMENT.md, architecture-decision.md, provisioning-prompt.md, resource-manifest.json) for a selected feasible stack and project excerpts. Status is always 'prepared'; the host reviews the diff before writing."
    )]
    fn generate_setup_bundle(&self, Parameters(params): Parameters<BundleParams>) -> String {
        let result = serde_json::to_vec(&params.request)
            .map_err(|error| error.to_string())
            .and_then(|input| generate_bundle_from_json(&input).map_err(|error| error.to_string()))
            .and_then(|result| serde_json::to_string(&result).map_err(|error| error.to_string()));
        result.unwrap_or_else(|error| format!("bundle unavailable: {error}"))
    }

    #[tool(
        description = "Retrieve local official-provider evidence for one requirement, with at most one optional follow-up. Results are untrusted data requiring review; freshness is not proof of requirement coverage."
    )]
    async fn search_provider_docs(&self, Parameters(params): Parameters<SearchParams>) -> String {
        let request = WorkerRequest {
            schema_version: SCHEMA_VERSION,
            request_id: "mcp-1".to_owned(),
            operation: "search".to_owned(),
            query: params.query,
            follow_up_query: params.follow_up_query,
            filters: params.filters,
            limit: params.limit,
            corpus_version: CORPUS_VERSION.to_owned(),
        };
        match self.worker.search(&request).await {
            Ok(response) => serde_json::to_string(&response)
                .unwrap_or_else(|_| "retrieval unavailable".to_owned()),
            Err(error) => format!("retrieval unavailable: {error}"),
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
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../..");
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
            Server { worker }.serve(stdio()).await?.waiting().await?;
        }
    }
    Ok(())
}
