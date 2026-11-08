use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use thiserror::Error;

pub const SCHEMA_VERSION: u8 = 2;
pub const CORPUS_VERSION: &str = "2026-11-07.1";
pub const MAX_LINE_BYTES: usize = 65_536;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct WorkerRequest {
    pub schema_version: u8,
    pub request_id: String,
    pub operation: String,
    pub query: String,
    pub follow_up_query: Option<String>,
    pub filters: Filters,
    pub limit: u8,
    pub corpus_version: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq, JsonSchema)]
#[serde(deny_unknown_fields)]
pub struct Filters {
    pub provider: Option<String>,
    pub product: Option<String>,
    pub runtime_version: Option<String>,
    pub region: Option<String>,
    pub document_type: Option<String>,
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
    pub warnings: Vec<String>,
    pub needs_verification: bool,
    pub verified_ready: bool,
    pub follow_up_used: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct Chunk {
    pub id: String,
    pub text: String,
    pub source_url: String,
    pub source_fetch_url: String,
    pub heading: String,
    pub parent_context: String,
    pub content_hash: String,
    pub source_hash: String,
    pub provider: String,
    pub product: String,
    pub product_version: String,
    pub runtime_version: Option<String>,
    pub regions: Vec<String>,
    pub document_type: String,
    pub fetched_at: String,
    pub verified_at: Option<String>,
    pub superseded: bool,
    pub freshness: String,
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

fn bounded(value: &str, max: usize) -> bool {
    !value.trim().is_empty() && value.len() <= max
}

fn document_type(value: &str) -> bool {
    matches!(
        value,
        "pricing" | "limits" | "setup" | "security" | "compatibility"
    )
}

impl WorkerRequest {
    pub fn validate(&self) -> Result<(), ProtocolError> {
        if self.schema_version != SCHEMA_VERSION || self.corpus_version != CORPUS_VERSION {
            return Err(ProtocolError::VersionMismatch);
        }
        if !bounded(&self.request_id, 64)
            || !bounded(&self.query, 4096)
            || self
                .follow_up_query
                .as_ref()
                .is_some_and(|s| !bounded(s, 4096))
            || !(1..=8).contains(&self.limit)
            || self.operation != "search"
            || [
                &self.filters.provider,
                &self.filters.product,
                &self.filters.runtime_version,
                &self.filters.region,
                &self.filters.document_type,
            ]
            .iter()
            .any(|s| s.as_ref().is_some_and(|v| !bounded(v, 100)))
            || self
                .filters
                .document_type
                .as_ref()
                .is_some_and(|v| !document_type(v))
        {
            return Err(ProtocolError::InvalidRequest);
        }
        Ok(())
    }
}

fn official_url(value: &str) -> bool {
    bounded(value, 500)
        && [
            "https://developers.cloudflare.com/",
            "https://render.com/",
            "https://neon.com/",
        ]
        .iter()
        .any(|prefix| value.starts_with(prefix))
        && !value.contains(['?', '#', '\\'])
        && !value.chars().any(char::is_whitespace)
}

fn hash(value: &str) -> bool {
    value.len() == 64
        && value
            .bytes()
            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
}

fn iso_date(value: &str) -> bool {
    let bytes = value.as_bytes();
    if bytes.len() != 10
        || bytes[4] != b'-'
        || bytes[7] != b'-'
        || bytes
            .iter()
            .enumerate()
            .any(|(i, b)| i != 4 && i != 7 && !b.is_ascii_digit())
    {
        return false;
    }
    let Ok(year) = value[..4].parse::<u32>() else {
        return false;
    };
    let Ok(month) = value[5..7].parse::<u32>() else {
        return false;
    };
    let Ok(day) = value[8..].parse::<u32>() else {
        return false;
    };
    let max = match month {
        4 | 6 | 9 | 11 => 30,
        2 if year % 400 == 0 || (year % 4 == 0 && year % 100 != 0) => 29,
        2 => 28,
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        _ => 0,
    };
    year > 0 && day > 0 && day <= max
}

impl Chunk {
    fn valid(&self, filters: &Filters) -> bool {
        bounded(&self.id, 100)
            && self
                .id
                .bytes()
                .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-')
            && bounded(&self.text, 8000)
            && bounded(&self.heading, 800)
            && bounded(&self.parent_context, 800)
            && official_url(&self.source_url)
            && official_url(&self.source_fetch_url)
            && hash(&self.content_hash)
            && hash(&self.source_hash)
            && [&self.provider, &self.product, &self.product_version]
                .iter()
                .all(|s| bounded(s, 100))
            && self
                .runtime_version
                .as_ref()
                .is_none_or(|s| bounded(s, 100))
            && self.regions.len() <= 20
            && self.regions.iter().all(|s| bounded(s, 100))
            && document_type(&self.document_type)
            && iso_date(&self.fetched_at)
            && self.verified_at.as_ref().is_none_or(|s| iso_date(s))
            && matches!(
                self.freshness.as_str(),
                "fresh" | "stale" | "unverified" | "superseded" | "invalid_date"
            )
            && (!self.superseded || self.freshness != "fresh")
            && (self.verified_at.is_some() || self.freshness != "fresh")
            && filters
                .provider
                .as_ref()
                .is_none_or(|s| s == &self.provider)
            && filters.product.as_ref().is_none_or(|s| s == &self.product)
            && filters
                .runtime_version
                .as_ref()
                .is_none_or(|s| Some(s) == self.runtime_version.as_ref())
            && filters
                .region
                .as_ref()
                .is_none_or(|s| self.regions.contains(s))
            && filters
                .document_type
                .as_ref()
                .is_none_or(|s| s == &self.document_type)
    }
}

impl WorkerResponse {
    pub fn validate_for(&self, request: &WorkerRequest) -> Result<(), ProtocolError> {
        if self.schema_version != SCHEMA_VERSION || self.corpus_version != CORPUS_VERSION {
            return Err(ProtocolError::VersionMismatch);
        }
        let ok = self.status == "ok";
        let unique: std::collections::HashSet<_> = self.chunks.iter().map(|c| &c.id).collect();
        if self.request_id != request.request_id
            || self.chunks.len() > request.limit.into()
            || unique.len() != self.chunks.len()
            || !matches!(self.status.as_str(), "ok" | "unavailable" | "error")
            || !matches!(self.retrieval_mode.as_str(), "lexical" | "hybrid" | "none")
            || (ok && (self.retrieval_mode == "none" || self.error.is_some()))
            || (!ok
                && (!self.chunks.is_empty()
                    || self.retrieval_mode != "none"
                    || self.error.is_none()))
            || !self.needs_verification
            || self.verified_ready
            || (self.follow_up_used != (ok && request.follow_up_query.is_some()))
            || self.warnings.len() > 8
            || self.warnings.iter().any(|s| !bounded(s, 200))
            || self.error.as_ref().is_some_and(|s| !bounded(s, 200))
            || self
                .chunks
                .iter()
                .any(|chunk| !chunk.valid(&request.filters))
        {
            return Err(ProtocolError::ResponseMismatch);
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn fixtures() -> (WorkerRequest, WorkerResponse) {
        (
            serde_json::from_str(include_str!("../../../fixtures/protocol/request.jsonl")).unwrap(),
            serde_json::from_str(include_str!("../../../fixtures/protocol/response.jsonl"))
                .unwrap(),
        )
    }

    #[test]
    fn shared_fixture() {
        let (request, response) = fixtures();
        request.validate().unwrap();
        response.validate_for(&request).unwrap();
    }

    #[test]
    fn rejects_invalid_boundaries() {
        let (mut request, mut response) = fixtures();
        request.follow_up_query = Some(" ".to_owned());
        assert!(request.validate().is_err());
        request.follow_up_query = None;
        response.verified_ready = true;
        assert!(response.validate_for(&request).is_err());
        response.verified_ready = false;
        response.chunks[0].source_url = "https://render.com.evil.test/doc".to_owned();
        assert!(response.validate_for(&request).is_err());
    }

    #[test]
    fn rejects_filters_and_duplicate_results() {
        let (mut request, mut response) = fixtures();
        request.filters.provider = Some("neon".to_owned());
        assert!(response.validate_for(&request).is_err());
        request.filters = Filters::default();
        response.chunks.push(response.chunks[0].clone());
        assert!(response.validate_for(&request).is_err());
    }

    #[test]
    fn dates_validate_calendar_boundaries() {
        assert!(iso_date("2024-02-29"));
        for value in [
            "2026-02-29",
            "2026-04-31",
            "0000-01-01",
            "2026-00-01",
            "ééééé",
        ] {
            assert!(!iso_date(value));
        }
    }
}
