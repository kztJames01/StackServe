#![deny(unsafe_code)]

mod worker;

use std::{path::PathBuf, sync::Arc};

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
    profile,
    protocol::{CORPUS_VERSION, Filters, SCHEMA_VERSION, WorkerRequest},
};
use worker::Worker;

#[derive(Parser)]
struct Args {
    #[command(subcommand)]
    command: Command,
    #[arg(long, env = "STACKFIT_PYTHON")]
    python: Option<PathBuf>,
}

#[derive(Subcommand)]
enum Command {
    Serve,
    Profile { file: PathBuf },
    Search { query: String },
}

#[derive(Debug, Deserialize, JsonSchema)]
struct ProfileParams {
    brief: Value,
}

#[derive(Debug, Deserialize, JsonSchema)]
struct SearchParams {
    query: String,
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
        description = "Check the pinned provider corpus for evidence; unavailable until corpus ingestion is complete"
    )]
    async fn search_provider_docs(&self, Parameters(params): Parameters<SearchParams>) -> String {
        let request = WorkerRequest {
            schema_version: SCHEMA_VERSION,
            request_id: "mcp-1".to_owned(),
            operation: "search".to_owned(),
            query: params.query,
            filters: Filters::default(),
            limit: 8,
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
    let worker = Arc::new(Worker::new(python, root.join("python/stackfit_rag")));
    match args.command {
        Command::Profile { file } => {
            let input = std::fs::read(file).context("reading brief")?;
            let result = profile::profile(&input)?;
            println!("{}", serde_json::to_string_pretty(&result)?);
        }
        Command::Search { query } => {
            let request = WorkerRequest {
                schema_version: SCHEMA_VERSION,
                request_id: "cli-1".to_owned(),
                operation: "search".to_owned(),
                query,
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
