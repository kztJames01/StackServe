use serde::{Deserialize, Serialize};
use thiserror::Error;

pub const SCHEMA_VERSION: u8 = 1;
pub const CORPUS_VERSION: &str = "sprint1-placeholder";
pub const MAX_LINE_BYTES: usize = 65_536;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct WorkerRequest {
    pub schema_version: u8,
    pub request_id: String,
    pub operation: String,
    pub query: String,
    pub filters: Filters,
    pub limit: u8,
    pub corpus_version: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct Filters {
    pub provider: Option<String>,
    pub product: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct WorkerResponse {
    pub schema_version: u8,
    pub request_id: String,
    pub corpus_version: String,
    pub status: String,
    pub retrieval_mode: String,
    pub chunks: Vec<Chunk>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct Chunk {
    pub id: String,
    pub text: String,
    pub source_url: String,
    pub heading: String,
    pub verified_at: String,
}

#[derive(Debug, Error)]
pub enum ProtocolError {
    #[error("unsupported schema or corpus version")]
    VersionMismatch,
    #[error("invalid request")]
    InvalidRequest,
    #[error("response does not match request")]
    ResponseMismatch,
}

impl WorkerRequest {
    pub fn validate(&self) -> Result<(), ProtocolError> {
        if self.schema_version != SCHEMA_VERSION || self.corpus_version != CORPUS_VERSION {
            return Err(ProtocolError::VersionMismatch);
        }
        if self.request_id.is_empty()
            || self.request_id.len() > 64
            || self.query.len() > 4096
            || self.limit == 0
            || self.limit > 8
            || self.operation != "search"
            || self
                .filters
                .provider
                .as_ref()
                .is_some_and(|value| value.len() > 100)
            || self
                .filters
                .product
                .as_ref()
                .is_some_and(|value| value.len() > 100)
        {
            return Err(ProtocolError::InvalidRequest);
        }
        Ok(())
    }
}

impl WorkerResponse {
    pub fn validate_for(&self, request: &WorkerRequest) -> Result<(), ProtocolError> {
        if self.schema_version != SCHEMA_VERSION || self.corpus_version != CORPUS_VERSION {
            return Err(ProtocolError::VersionMismatch);
        }
        if self.request_id != request.request_id
            || self.chunks.len() > request.limit.into()
            || !matches!(self.status.as_str(), "ok" | "unavailable" | "error")
            || !matches!(self.retrieval_mode.as_str(), "lexical" | "hybrid" | "none")
            || (self.status == "unavailable" && !self.chunks.is_empty())
        {
            return Err(ProtocolError::ResponseMismatch);
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn shared_fixture() {
        let request: WorkerRequest =
            serde_json::from_str(include_str!("../../../fixtures/protocol/request.jsonl")).unwrap();
        let response: WorkerResponse =
            serde_json::from_str(include_str!("../../../fixtures/protocol/response.jsonl"))
                .unwrap();
        request.validate().unwrap();
        response.validate_for(&request).unwrap();
    }
}
