use std::{fs, path::PathBuf, str::FromStr};

use rust_decimal::Decimal;
use stackfit_core::{
    bundle::{ArtifactStatus, generate_bundle_from_json, scan_for_secrets},
    engine::{CliffKind, Comparison, Recommendation, Role, compare_from_json, recommend_from_json},
    filters::{Filter, ReasonCode},
    workload::Scenario,
};

const NODE_STACK: &str =
    "recipe-a/cloudflare-pages-free+render-web-starter-hobby+neon-free+cloudflare-r2-standard";
const NODE_LAUNCH_STACK: &str =
    "recipe-a/cloudflare-pages-free+render-web-starter-hobby+neon-launch+cloudflare-r2-standard";
const PYTHON_STACK: &str = "recipe-b/render-web-starter-hobby+neon-launch+backblaze-b2";
const PYTHON_R2_STACK: &str =
    "recipe-b/render-web-starter-hobby+neon-launch+cloudflare-r2-standard";

fn fixture(name: &str) -> Vec<u8> {
    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../fixtures/workloads")
        .join(name);
    fs::read(path).unwrap()
}

fn dec(text: &str) -> Decimal {
    Decimal::from_str(text).unwrap()
}

fn recommend(name: &str) -> Recommendation {
    recommend_from_json(&fixture(name)).unwrap()
}

fn compare(name: &str, stack: &str) -> Comparison {
    compare_from_json(&fixture(name), &[stack.to_owned()]).unwrap()
}

#[test]
fn node_estimate_matches_the_hand_calculation() {
    let result = recommend("node-sporadic.json");
    let lowest = &result.selections[0];
    assert_eq!(lowest.stack_id, NODE_STACK);
    assert_eq!(lowest.roles, [Role::LowestCost, Role::Balanced]);
    // Render Starter 7.00 + (20 - 5) GB x 0.15 = 9.25; Neon Free 0; R2 (100 - 10) GB x 0.015 = 1.35
    assert_eq!(lowest.estimate.usd_total(), Some(dec("10.60")));
}

#[test]
fn node_performance_pick_avoids_the_always_sleeping_database() {
    let result = recommend("node-sporadic.json");
    let performance = &result.selections[1];
    assert_eq!(performance.stack_id, NODE_LAUNCH_STACK);
    assert_eq!(performance.roles, [Role::Performance]);
    // 9.25 + Neon Launch (60 x 0.106 + 0.5 x 0.35 = 6.535) + 1.35
    assert_eq!(performance.estimate.usd_total(), Some(dec("17.135")));
}

#[test]
fn recipe_for_a_different_runtime_is_rejected_with_the_failed_filter() {
    let result = recommend("node-sporadic.json");
    let rejected: Vec<_> = result
        .rejected
        .iter()
        .filter(|item| item.stack_id.starts_with("recipe-b/"))
        .collect();
    assert_eq!(rejected.len(), 8);
    for item in rejected {
        assert!(item.findings.iter().any(|finding| {
            finding.filter == Filter::Runtime && finding.code == ReasonCode::UnsupportedRuntime
        }));
    }
}

#[test]
fn python_estimate_matches_the_hand_calculation() {
    let result = recommend("python-us-always-on.json");
    assert_eq!(result.selections.len(), 1);
    let pick = &result.selections[0];
    assert_eq!(pick.stack_id, PYTHON_STACK);
    assert_eq!(
        pick.roles,
        [Role::LowestCost, Role::Balanced, Role::Performance]
    );
    // Render 7.00 + (30 - 5) x 0.15 = 10.75; Neon Launch 200 x 0.106 + 2 x 0.35 = 21.90;
    // B2 (100 - 10) GB / 1000 x 6.95 = 0.6255 and egress 250 <= 3 x 100 free
    assert_eq!(pick.estimate.usd_total(), Some(dec("33.2755")));
}

#[test]
fn cheap_plan_is_rejected_with_reason_codes() {
    let result = recommend("python-us-always-on.json");
    let free = result
        .rejected
        .iter()
        .find(|item| item.stack_id == "recipe-b/render-web-starter-hobby+neon-free+backblaze-b2")
        .unwrap();
    let codes: Vec<_> = free.findings.iter().map(|finding| finding.code).collect();
    assert!(codes.contains(&ReasonCode::SleepNotTolerated));
    assert!(codes.contains(&ReasonCode::QuotaExceeded));
}

#[test]
fn unverified_commercial_terms_give_a_conditional_result_without_a_rank() {
    let result = recommend("node-commercial.json");
    assert!(result.selections.is_empty());
    assert!(result.comparison.is_empty());
    assert_eq!(result.conditional.len(), 8);
    assert!(result.conditional.iter().all(|item| {
        item.conditions
            .iter()
            .any(|finding| finding.code == ReasonCode::CommercialUseUnverified)
    }));
}

#[test]
fn unknown_essential_price_is_conditional_not_ranked() {
    let result = recommend("unknown-meters.json");
    assert!(result.selections.is_empty());
    assert!(
        result
            .conditional
            .iter()
            .all(|item| item.estimate.total_known.is_none())
    );
    assert!(
        result
            .conditional
            .iter()
            .all(|item| !item.estimate.unknown_items.is_empty())
    );
}

#[test]
fn adversarial_text_cannot_change_prices_or_rankings() {
    let result = recommend("adversarial.json");
    assert!(result.selections.is_empty());
    let baseline = recommend("node-sporadic.json");
    let lowest = result
        .conditional
        .iter()
        .find(|item| item.stack_id == NODE_STACK)
        .unwrap();
    assert_eq!(
        lowest.estimate.usd_total(),
        baseline.selections[0].estimate.usd_total()
    );
    assert!(
        lowest
            .conditions
            .iter()
            .any(|f| f.code == ReasonCode::CapabilityUnverified)
    );
    assert!(
        lowest
            .conditions
            .iter()
            .any(|f| f.code == ReasonCode::S3FeatureUnverified)
    );
    assert_eq!(result.rejected.len(), baseline.rejected.len());
}

#[test]
fn node_scenarios_match_hand_calculations_and_flag_cliffs() {
    let result = compare("node-sporadic.json", NODE_STACK);
    let stack = &result.stacks[0];
    let totals: Vec<_> = stack
        .scenarios
        .iter()
        .map(|item| item.estimate.usd_total().unwrap())
        .collect();
    // 3x: Render 7 + (60 - 5) x 0.15 + R2 1.35 = 16.60; 10x: 7 + 2.25 + (1000 - 10) x 0.015 = 24.10
    assert_eq!(totals, [dec("10.60"), dec("16.60"), dec("24.10")]);
    assert!(stack.scenarios[0].rejected.is_empty());
    assert_eq!(
        stack.scenarios[1].rejected[0].code,
        ReasonCode::QuotaExceeded
    );
    assert_eq!(
        stack.scenarios[2].rejected[0].code,
        ReasonCode::QuotaExceeded
    );
    let cliffs: Vec<_> = stack
        .cliffs
        .iter()
        .map(|cliff| (cliff.kind, cliff.first_exceeded_in, cliff.threshold))
        .collect();
    assert_eq!(
        cliffs,
        [
            (CliffKind::PlanLimit, Scenario::TenXStorageEgress, dec("1")),
            (CliffKind::PlanLimit, Scenario::ThreeXTraffic, dec("100")),
        ]
    );
}

#[test]
fn python_scenarios_show_the_egress_allowance_cliff() {
    let result = compare("python-us-always-on.json", PYTHON_STACK);
    let stack = &result.stacks[0];
    let totals: Vec<_> = stack
        .scenarios
        .iter()
        .map(|item| item.estimate.usd_total().unwrap())
        .collect();
    // 3x: 19.75 + 63.60 + 0.70 + 0.6255 + 450 GB x 0.01 = 89.1755
    // 10x: 10.75 + 21.20 + 20 x 0.35 + (1000 - 10) / 1000 x 6.95 = 45.8305
    assert_eq!(totals, [dec("33.2755"), dec("89.1755"), dec("45.8305")]);
    assert_eq!(stack.cliffs.len(), 1);
    assert_eq!(stack.cliffs[0].card_id, "backblaze-b2");
    assert_eq!(stack.cliffs[0].first_exceeded_in, Scenario::ThreeXTraffic);
    assert_eq!(stack.cliffs[0].threshold, dec("300"));

    let r2_cmp = compare("python-us-always-on.json", PYTHON_R2_STACK);
    let r2_totals: Vec<_> = r2_cmp.stacks[0]
        .scenarios
        .iter()
        .map(|item| item.estimate.usd_total().unwrap())
        .collect();
    // R2 is $34.00 at now ($0.7245 more than B2) but $85.40 at 3x ($3.7755 cheaper than B2's egress cliff)
    // 3x: 19.75 + 63.60 + 0.70 + 1.35 = 85.400
    // 10x: 10.75 + 21.20 + 7.00 + 990 x 0.015 = 53.800
    assert_eq!(r2_totals, [dec("34.000"), dec("85.400"), dec("53.800")]);
}

#[test]
fn every_estimate_line_links_source_region_and_date() {
    let result = recommend("node-sporadic.json");
    for selection in &result.selections {
        for line in &selection.estimate.lines {
            assert!(line.source_url.starts_with("https://"));
            assert!(!line.priced_region.is_empty());
            assert_eq!(line.checked_at, "2026-11-07");
        }
        assert!(
            selection
                .estimate
                .excluded_items
                .iter()
                .any(|i| i.item.starts_with("Taxes"))
        );
    }
}

#[test]
fn compare_rejects_unknown_ids_and_too_many_stacks() {
    let work = fixture("node-sporadic.json");
    assert!(compare_from_json(&work, &["nope".to_owned()]).is_err());
    let many = vec![NODE_STACK.to_owned(); 4];
    assert!(compare_from_json(&work, &many).is_err());
}

#[test]
fn recommend_rejects_malformed_workload() {
    assert!(recommend_from_json(b"{}").is_err());
    assert!(recommend_from_json(b"not json").is_err());
}

fn project_fixture(name: &str) -> Vec<u8> {
    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../fixtures/projects")
        .join(name);
    fs::read(path).unwrap()
}

#[test]
fn both_project_bundles_validate_and_match_hand_calculated_totals() {
    for (file, expected_stack, expected_total) in [
        ("a-node-uploads.json", NODE_STACK, "$10.60"),
        ("b-python-docker.json", PYTHON_STACK, "$33.2755"),
    ] {
        let bundle = generate_bundle_from_json(&project_fixture(file)).unwrap();
        assert_eq!(bundle.status, ArtifactStatus::Prepared);
        assert_eq!(bundle.stack_id, expected_stack);
        assert!(bundle.validation.valid, "{file}");
        assert!(bundle.validation.secret_scan_clean, "{file}");
        assert!(scan_for_secrets(&bundle.files).is_empty(), "{file}");
        assert_eq!(bundle.files.len(), 5);
        assert!(!bundle.sources.is_empty());
        assert!(
            bundle
                .sources
                .iter()
                .all(|s| s.source_url.starts_with("https://")
                    && matches!(s.verified_at.as_str(), "2026-11-07" | "2026-11-09"))
        );
        let adr = &bundle
            .files
            .iter()
            .find(|f| f.path == "architecture-decision.md")
            .unwrap()
            .content;
        assert!(adr.contains(expected_total), "{file}: {expected_total}");
        assert!(adr.contains("2026-11-07"));
    }
}
