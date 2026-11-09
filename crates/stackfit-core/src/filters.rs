use rust_decimal::Decimal;
use serde::Serialize;

use crate::{
    catalog::{Category, Region, ServicePlan, Sleep, Support},
    workload::{Residency, Workload},
};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum Filter {
    Runtime,
    Database,
    Region,
    CommercialUse,
    Sleep,
    Backup,
    S3Compatibility,
    Quota,
    Budget,
    Capability,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ReasonCode {
    UnsupportedRuntime,
    UnsupportedDatabase,
    RegionNotAvailable,
    CommercialUseUnverified,
    SleepNotTolerated,
    BackupNotIncluded,
    BackupUnverified,
    S3FeatureUnverified,
    QuotaExceeded,
    QuotaUnknown,
    OverBudget,
    CapabilityUnverified,
}

impl ReasonCode {
    fn filter(self) -> Filter {
        match self {
            Self::UnsupportedRuntime => Filter::Runtime,
            Self::UnsupportedDatabase => Filter::Database,
            Self::RegionNotAvailable => Filter::Region,
            Self::CommercialUseUnverified => Filter::CommercialUse,
            Self::SleepNotTolerated => Filter::Sleep,
            Self::BackupNotIncluded | Self::BackupUnverified => Filter::Backup,
            Self::S3FeatureUnverified => Filter::S3Compatibility,
            Self::QuotaExceeded | Self::QuotaUnknown => Filter::Quota,
            Self::OverBudget => Filter::Budget,
            Self::CapabilityUnverified => Filter::Capability,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Finding {
    pub card_id: Option<String>,
    pub filter: Filter,
    pub code: ReasonCode,
    pub detail: String,
}

impl Finding {
    pub fn new(card_id: Option<&str>, code: ReasonCode, detail: impl Into<String>) -> Self {
        Self {
            card_id: card_id.map(str::to_owned),
            filter: code.filter(),
            code,
            detail: detail.into(),
        }
    }
}

/// `rejected` findings make a plan infeasible; `needs_verification` findings leave it
/// conditional because the catalog cannot confirm eligibility.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct Verdict {
    pub rejected: Vec<Finding>,
    pub needs_verification: Vec<Finding>,
}

pub fn evaluate_card(card: &ServicePlan, workload: &Workload) -> Verdict {
    let mut verdict = Verdict::default();
    let id = Some(card.id.as_str());
    let reject = |verdict: &mut Verdict, code, detail: String| {
        verdict.rejected.push(Finding::new(id, code, detail));
    };

    if card.category == Category::Runtime && !card.runtimes.contains(&workload.runtime) {
        reject(
            &mut verdict,
            ReasonCode::UnsupportedRuntime,
            format!("{:?} is not a verified runtime", workload.runtime),
        );
    }
    if card.category == Category::Database && !card.db_engines.contains(&workload.db_engine) {
        reject(
            &mut verdict,
            ReasonCode::UnsupportedDatabase,
            format!("{:?} is not supported", workload.db_engine),
        );
    }
    if card.category != Category::Frontend && !region_allowed(card, workload.residency) {
        reject(
            &mut verdict,
            ReasonCode::RegionNotAvailable,
            format!("no binding {:?} placement is verified", workload.residency),
        );
    }
    if workload.commercial_use && card.commercial_use != Support::Yes {
        verdict.needs_verification.push(Finding::new(
            id,
            ReasonCode::CommercialUseUnverified,
            "commercial use is not confirmed for this plan",
        ));
    }
    if !workload.sleep_tolerant && card.sleep == Sleep::Always {
        reject(
            &mut verdict,
            ReasonCode::SleepNotTolerated,
            "the plan sleeps when idle".to_owned(),
        );
    }
    if card.category == Category::Database && workload.backup_required {
        match card.backup {
            Support::Yes => {}
            Support::No => reject(
                &mut verdict,
                ReasonCode::BackupNotIncluded,
                "no backup or restore".to_owned(),
            ),
            Support::Unverified => verdict.needs_verification.push(Finding::new(
                id,
                ReasonCode::BackupUnverified,
                "backup and restore are not confirmed",
            )),
        }
    }
    if card.category == Category::ObjectStorage {
        for feature in &workload.required_s3_features {
            if !card.s3_features.contains(feature) {
                verdict.needs_verification.push(Finding::new(
                    id,
                    ReasonCode::S3FeatureUnverified,
                    format!("S3 feature {feature:?} is not confirmed"),
                ));
            }
        }
    }
    for limit in &card.limits {
        match workload.meter(limit.meter) {
            None => verdict.needs_verification.push(Finding::new(
                id,
                ReasonCode::QuotaUnknown,
                format!(
                    "{:?} not provided; plan limit is {}",
                    limit.meter, limit.max
                ),
            )),
            Some(usage) if usage > limit.max => reject(
                &mut verdict,
                ReasonCode::QuotaExceeded,
                format!(
                    "{:?} {} exceeds the plan limit {}",
                    limit.meter, usage, limit.max
                ),
            ),
            Some(_) => {}
        }
    }
    verdict
}

fn region_allowed(card: &ServicePlan, residency: Residency) -> bool {
    match residency {
        Residency::Any => true,
        Residency::Us => card.eligible_regions.contains(&Region::Us),
        Residency::Eu => card.eligible_regions.contains(&Region::Eu),
    }
}

pub fn missing_capabilities(cards: &[&ServicePlan], workload: &Workload) -> Vec<Finding> {
    workload
        .required_capabilities
        .iter()
        .filter(|needed| !cards.iter().any(|card| card.capabilities.contains(needed)))
        .map(|needed| {
            Finding::new(
                None,
                ReasonCode::CapabilityUnverified,
                format!("capability {needed:?} is not confirmed"),
            )
        })
        .collect()
}

pub fn over_budget(workload: &Workload, usd_subtotal: Decimal) -> Option<Finding> {
    let budget = workload.budget_month_usd?;
    (usd_subtotal > budget).then(|| {
        Finding::new(
            None,
            ReasonCode::OverBudget,
            format!("known monthly cost {usd_subtotal} exceeds the budget {budget}"),
        )
    })
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;
    use crate::catalog::Catalog;

    fn workload(extra: serde_json::Value) -> Workload {
        let mut value = json!({
            "runtime": "node", "db_engine": "postgresql", "residency": "any",
            "commercial_use": false, "sleep_tolerant": true, "backup_required": false
        });
        value
            .as_object_mut()
            .unwrap()
            .extend(extra.as_object().unwrap().clone());
        Workload::parse(&serde_json::to_vec(&value).unwrap()).unwrap()
    }

    fn verdict(card_id: &str, extra: serde_json::Value) -> Verdict {
        let catalog = Catalog::embedded().unwrap();
        evaluate_card(catalog.card(card_id).unwrap(), &workload(extra))
    }

    fn codes(findings: &[Finding]) -> Vec<ReasonCode> {
        findings.iter().map(|finding| finding.code).collect()
    }

    #[test]
    fn runtime_must_be_verified_for_the_plan() {
        let result = verdict("render-web-starter-hobby", json!({"runtime": "static"}));
        assert_eq!(codes(&result.rejected), [ReasonCode::UnsupportedRuntime]);
        assert!(
            verdict("render-web-starter-hobby", json!({}))
                .rejected
                .is_empty()
        );
    }

    #[test]
    fn sqlite_cannot_silently_replace_postgresql() {
        let result = verdict("neon-launch", json!({"db_engine": "sqlite"}));
        assert_eq!(codes(&result.rejected), [ReasonCode::UnsupportedDatabase]);
        assert_eq!(result.rejected[0].filter, Filter::Database);
    }

    #[test]
    fn us_residency_rejects_a_plan_with_only_eu_placement() {
        let result = verdict("cloudflare-r2-standard", json!({"residency": "us"}));
        assert_eq!(codes(&result.rejected), [ReasonCode::RegionNotAvailable]);
        assert!(
            verdict("cloudflare-r2-standard", json!({"residency": "eu"}))
                .rejected
                .is_empty()
        );
        assert!(
            verdict("backblaze-b2", json!({"residency": "us"}))
                .rejected
                .is_empty()
        );
    }

    #[test]
    fn frontend_assets_skip_the_data_residency_check() {
        assert!(
            verdict("cloudflare-pages-free", json!({"residency": "us"}))
                .rejected
                .is_empty()
        );
    }

    #[test]
    fn commercial_use_is_conditional_unless_confirmed() {
        let unconfirmed = verdict(
            "neon-free",
            json!({"commercial_use": true, "db_gb": 0.5, "db_cu_hours": 1}),
        );
        assert_eq!(
            codes(&unconfirmed.needs_verification),
            [ReasonCode::CommercialUseUnverified]
        );
        assert!(unconfirmed.rejected.is_empty());
        assert!(
            verdict("neon-launch", json!({"commercial_use": true}))
                .needs_verification
                .is_empty()
        );
        assert!(
            verdict(
                "neon-free",
                json!({"commercial_use": false, "db_gb": 0.5, "db_cu_hours": 1})
            )
            .needs_verification
            .is_empty()
        );
    }

    #[test]
    fn sleeping_plan_is_rejected_when_sleep_is_not_tolerated() {
        let result = verdict("neon-free", json!({"sleep_tolerant": false}));
        assert_eq!(codes(&result.rejected), [ReasonCode::SleepNotTolerated]);
        assert!(
            verdict("neon-launch", json!({"sleep_tolerant": false}))
                .rejected
                .is_empty()
        );
    }

    #[test]
    fn backup_requirement_is_checked_on_databases_only() {
        let free = verdict(
            "neon-free",
            json!({"backup_required": true, "db_gb": 0.5, "db_cu_hours": 1}),
        );
        assert_eq!(
            codes(&free.needs_verification),
            [ReasonCode::BackupUnverified]
        );
        assert!(
            verdict("neon-launch", json!({"backup_required": true}))
                .needs_verification
                .is_empty()
        );
        assert!(
            verdict("backblaze-b2", json!({"backup_required": true}))
                .needs_verification
                .is_empty()
        );
    }

    #[test]
    fn s3_features_must_be_confirmed() {
        let extra = json!({"required_s3_features": ["object_lock"]});
        assert!(
            verdict("backblaze-b2", extra.clone())
                .needs_verification
                .is_empty()
        );
        let r2 = verdict("cloudflare-r2-standard", extra);
        assert_eq!(
            codes(&r2.needs_verification),
            [ReasonCode::S3FeatureUnverified]
        );
    }

    #[test]
    fn quota_boundary_at_99_100_101_cu_hours() {
        for (hours, rejected) in [(99, false), (100, false), (101, true)] {
            let result = verdict("neon-free", json!({"db_gb": 0.5, "db_cu_hours": hours}));
            assert_eq!(!result.rejected.is_empty(), rejected, "{hours}");
        }
    }

    #[test]
    fn quota_boundary_at_database_size() {
        for (gb, rejected) in [("0.9", false), ("1", false), ("1.1", true)] {
            let result = verdict("neon-free", json!({"db_gb": gb, "db_cu_hours": 1}));
            assert_eq!(!result.rejected.is_empty(), rejected, "{gb}");
        }
    }

    #[test]
    fn unknown_quota_meter_needs_verification_instead_of_passing() {
        let result = verdict("neon-free", json!({"db_gb": 0.5}));
        assert_eq!(
            codes(&result.needs_verification),
            [ReasonCode::QuotaUnknown]
        );
    }

    #[test]
    fn budget_boundary() {
        let work = workload(json!({"budget_month_usd": 10}));
        assert!(over_budget(&work, Decimal::from(10)).is_none());
        let finding = over_budget(&work, "10.01".parse().unwrap()).unwrap();
        assert_eq!(
            (finding.code, finding.filter),
            (ReasonCode::OverBudget, Filter::Budget)
        );
        assert!(over_budget(&workload(json!({})), Decimal::from(1_000_000)).is_none());
    }

    #[test]
    fn required_capabilities_are_checked_across_the_stack() {
        let catalog = Catalog::embedded().unwrap();
        let cards = [
            catalog.card("neon-launch").unwrap(),
            catalog.card("backblaze-b2").unwrap(),
        ];
        let present = workload(
            json!({"required_capabilities": ["point_in_time_restore", "s3_compatible_api"]}),
        );
        assert!(missing_capabilities(&cards, &present).is_empty());
        let absent = workload(json!({"required_capabilities": ["gpu"]}));
        assert_eq!(
            codes(&missing_capabilities(&cards, &absent)),
            [ReasonCode::CapabilityUnverified]
        );
    }
}
