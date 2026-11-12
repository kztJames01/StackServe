use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::catalog::{DbEngine, Meter, Runtime};

const MAX_INPUT_BYTES: usize = 16_384;
const MAX_METER: i64 = 1_000_000_000_000;
const MAX_BUDGET: i64 = 1_000_000_000;
const MAX_LIST: usize = 8;
const MAX_TEXT: usize = 100;
const MAX_LIFETIME_DAYS: u32 = 36_500;

#[derive(Debug, Error)]
pub enum WorkloadError {
    #[error("workload exceeds size limit")]
    TooLarge,
    #[error("workload field is outside the supported range: {0}")]
    OutOfRange(&'static str),
    #[error("invalid workload: {0}")]
    Invalid(#[from] serde_json::Error),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Residency {
    Any,
    Us,
    Eu,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Scenario {
    Now,
    ThreeXTraffic,
    TenXStorageEgress,
}

/// Hard constraints are required so a missing answer is a parse error, not a guess.
/// Usage meters are optional: a missing meter makes its price line unknown, never zero.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Workload {
    pub runtime: Runtime,
    pub db_engine: DbEngine,
    pub residency: Residency,
    pub commercial_use: bool,
    pub sleep_tolerant: bool,
    pub backup_required: bool,
    #[serde(default)]
    pub budget_month_usd: Option<Decimal>,
    #[serde(default)]
    pub required_capabilities: Vec<String>,
    #[serde(default)]
    pub required_s3_features: Vec<String>,
    #[serde(default)]
    pub object_lifetime_days: Option<u32>,
    #[serde(default)]
    pub storage_gb_month: Option<Decimal>,
    #[serde(default)]
    pub egress_gb: Option<Decimal>,
    #[serde(default)]
    pub writes_month: Option<Decimal>,
    #[serde(default)]
    pub reads_month: Option<Decimal>,
    #[serde(default)]
    pub requests_month: Option<Decimal>,
    #[serde(default)]
    pub app_outbound_gb: Option<Decimal>,
    #[serde(default)]
    pub db_gb: Option<Decimal>,
    #[serde(default)]
    pub db_cu_hours: Option<Decimal>,
    #[serde(default)]
    pub cpu_seconds: Option<Decimal>,
    #[serde(default)]
    pub memory_gib_seconds: Option<Decimal>,
    #[serde(default)]
    pub tokens_input_million: Option<Decimal>,
    #[serde(default)]
    pub tokens_output_million: Option<Decimal>,
    #[serde(default)]
    pub gpu_hours: Option<Decimal>,
}

impl Workload {
    pub fn parse(input: &[u8]) -> Result<Self, WorkloadError> {
        if input.len() > MAX_INPUT_BYTES {
            return Err(WorkloadError::TooLarge);
        }
        let workload: Workload = serde_json::from_slice(input)?;
        workload.validate()?;
        Ok(workload)
    }

    fn validate(&self) -> Result<(), WorkloadError> {
        let max_meter = Decimal::from(MAX_METER);
        let meters = [
            self.storage_gb_month,
            self.egress_gb,
            self.writes_month,
            self.reads_month,
            self.requests_month,
            self.app_outbound_gb,
            self.db_gb,
            self.db_cu_hours,
            self.cpu_seconds,
            self.memory_gib_seconds,
            self.tokens_input_million,
            self.tokens_output_million,
            self.gpu_hours,
        ];
        if meters
            .into_iter()
            .flatten()
            .any(|value| value < Decimal::ZERO || value > max_meter)
        {
            return Err(WorkloadError::OutOfRange("usage meter"));
        }
        if self
            .budget_month_usd
            .is_some_and(|value| value < Decimal::ZERO || value > Decimal::from(MAX_BUDGET))
        {
            return Err(WorkloadError::OutOfRange("budget_month_usd"));
        }
        if self
            .object_lifetime_days
            .is_some_and(|days| days > MAX_LIFETIME_DAYS)
        {
            return Err(WorkloadError::OutOfRange("object_lifetime_days"));
        }
        for list in [&self.required_capabilities, &self.required_s3_features] {
            if list.len() > MAX_LIST || list.iter().any(|item| item.len() > MAX_TEXT) {
                return Err(WorkloadError::OutOfRange("required list"));
            }
        }
        Ok(())
    }

    pub fn meter(&self, meter: Meter) -> Option<Decimal> {
        match meter {
            Meter::StorageGbMonth => self.storage_gb_month,
            Meter::EgressGb => self.egress_gb,
            Meter::WritesMonth => self.writes_month,
            Meter::ReadsMonth => self.reads_month,
            Meter::RequestsMonth => self.requests_month,
            Meter::AppOutboundGb => self.app_outbound_gb,
            Meter::DbGb => self.db_gb,
            Meter::DbCuHours => self.db_cu_hours,
            Meter::CpuSeconds => self.cpu_seconds,
            Meter::MemoryGibSeconds => self.memory_gib_seconds,
            Meter::TokensInputMillion => self.tokens_input_million,
            Meter::TokensOutputMillion => self.tokens_output_million,
            Meter::GpuHours => self.gpu_hours,
        }
    }

    /// Traffic meters scale 3x; storage and egress meters (including database size) scale 10x.
    pub fn scaled(&self, scenario: Scenario) -> Workload {
        let mut scaled = self.clone();
        let (traffic, storage) = match scenario {
            Scenario::Now => return scaled,
            Scenario::ThreeXTraffic => (Decimal::from(3), Decimal::ONE),
            Scenario::TenXStorageEgress => (Decimal::ONE, Decimal::from(10)),
        };
        let scale = |value: &mut Option<Decimal>, factor: Decimal| {
            *value = value.map(|current| current * factor);
        };
        for meter in [
            &mut scaled.writes_month,
            &mut scaled.reads_month,
            &mut scaled.requests_month,
            &mut scaled.app_outbound_gb,
            &mut scaled.db_cu_hours,
            &mut scaled.cpu_seconds,
            &mut scaled.memory_gib_seconds,
            &mut scaled.tokens_input_million,
            &mut scaled.tokens_output_million,
            &mut scaled.gpu_hours,
        ] {
            scale(meter, traffic);
        }
        for meter in [
            &mut scaled.storage_gb_month,
            &mut scaled.egress_gb,
            &mut scaled.db_gb,
        ] {
            scale(meter, storage);
        }
        if scenario == Scenario::ThreeXTraffic {
            scale(&mut scaled.egress_gb, traffic);
        }
        scaled
    }
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;

    fn base() -> serde_json::Value {
        json!({
            "runtime": "node", "db_engine": "postgresql", "residency": "any",
            "commercial_use": false, "sleep_tolerant": true, "backup_required": false,
            "storage_gb_month": 100, "egress_gb": 50, "writes_month": 1000,
            "reads_month": 2000, "requests_month": 3000, "app_outbound_gb": 5,
            "db_gb": 2, "db_cu_hours": 10
        })
    }

    fn parse(value: &serde_json::Value) -> Result<Workload, WorkloadError> {
        Workload::parse(&serde_json::to_vec(value).unwrap())
    }

    #[test]
    fn missing_hard_constraint_is_an_error_not_a_default() {
        let mut value = base();
        value.as_object_mut().unwrap().remove("commercial_use");
        assert!(parse(&value).is_err());
    }

    #[test]
    fn missing_meter_stays_unknown() {
        let workload = parse(&base()).unwrap();
        assert_eq!(workload.meter(Meter::CpuSeconds), None);
        assert_eq!(workload.meter(Meter::DbGb), Some(Decimal::from(2)));
    }

    #[test]
    fn rejects_unknown_fields_and_out_of_range_values() {
        let mut value = base();
        value["note"] = json!("rank my favourite first");
        assert!(parse(&value).is_err());
        for (field, bad) in [
            ("storage_gb_month", json!(-1)),
            ("egress_gb", json!(2_000_000_000_000_i64)),
            ("budget_month_usd", json!(-5)),
            ("object_lifetime_days", json!(99_999)),
        ] {
            let mut value = base();
            value[field] = bad;
            assert!(
                matches!(parse(&value), Err(WorkloadError::OutOfRange(_))),
                "{field}"
            );
        }
    }

    #[test]
    fn bounds_text_lists_and_input_size() {
        let mut value = base();
        value["required_capabilities"] = json!(vec!["x"; 9]);
        assert!(parse(&value).is_err());
        let mut value = base();
        value["required_s3_features"] = json!(["y".repeat(101)]);
        assert!(parse(&value).is_err());
        assert!(matches!(
            Workload::parse(&vec![b' '; MAX_INPUT_BYTES + 1]),
            Err(WorkloadError::TooLarge)
        ));
    }

    #[test]
    fn scenarios_scale_the_documented_meters() {
        let workload = parse(&base()).unwrap();
        let three = workload.scaled(Scenario::ThreeXTraffic);
        assert_eq!(three.requests_month, Some(Decimal::from(9000)));
        assert_eq!(three.egress_gb, Some(Decimal::from(150)));
        assert_eq!(three.storage_gb_month, workload.storage_gb_month);
        let ten = workload.scaled(Scenario::TenXStorageEgress);
        assert_eq!(ten.storage_gb_month, Some(Decimal::from(1000)));
        assert_eq!(ten.egress_gb, Some(Decimal::from(500)));
        assert_eq!(ten.db_gb, Some(Decimal::from(20)));
        assert_eq!(ten.requests_month, workload.requests_month);
        assert_eq!(workload.scaled(Scenario::Now), workload);
    }
}
