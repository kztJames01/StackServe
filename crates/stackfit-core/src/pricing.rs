use rust_decimal::Decimal;
use serde::Serialize;

use crate::{
    catalog::{
        Charge, Commitment, Currency, CurrencyTotals, Free, OfferKind, PriceFormula, ServicePlan,
    },
    workload::Workload,
};

/// Units billed after the free allowance, optionally rounded up to whole billing units.
/// Every charge path uses `Decimal`; floats never touch money.
pub fn billable_units(
    usage: Decimal,
    free: Decimal,
    per_units: Decimal,
    round_up: bool,
) -> Decimal {
    let units = (usage - free).max(Decimal::ZERO) / per_units;
    if round_up { units.ceil() } else { units }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct LineItem {
    pub card_id: String,
    pub provider: String,
    pub product: String,
    pub label: String,
    pub unit: String,
    pub billable_units: Decimal,
    pub amount: Decimal,
    pub currency: Currency,
    pub priced_region: String,
    pub checked_at: String,
    pub source_url: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct UnknownItem {
    pub card_id: String,
    pub label: String,
    pub reason: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct ExcludedItem {
    pub card_id: Option<String>,
    pub item: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct OfferNote {
    pub card_id: String,
    pub kind: OfferKind,
    pub label: String,
    pub note: String,
}

/// `total_known` exists only when no price is unknown. Excluded items (such as taxes)
/// are always listed, and temporary offers never reduce any amount.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Estimate {
    pub catalog_version: String,
    pub lines: Vec<LineItem>,
    pub unknown_items: Vec<UnknownItem>,
    pub excluded_items: Vec<ExcludedItem>,
    pub temporary_offers: Vec<OfferNote>,
    pub known_subtotal: CurrencyTotals,
    pub total_known: Option<CurrencyTotals>,
}

impl Estimate {
    pub fn usd_total(&self) -> Option<Decimal> {
        let totals = self.total_known.as_ref()?;
        if totals.len() == 1 {
            totals.get(&Currency::Usd).copied()
        } else {
            None
        }
    }

    pub fn eur_total(&self) -> Option<Decimal> {
        let totals = self.total_known.as_ref()?;
        if totals.len() == 1 {
            totals.get(&Currency::Eur).copied()
        } else {
            None
        }
    }
}

pub fn estimate(catalog_version: &str, cards: &[&ServicePlan], workload: &Workload) -> Estimate {
    let mut lines = Vec::new();
    let mut unknown_items = Vec::new();
    let mut excluded_items = vec![ExcludedItem {
        card_id: None,
        item: "Taxes (jurisdiction unknown)".to_owned(),
    }];
    let mut temporary_offers = Vec::new();
    for card in cards {
        price_card(card, workload, &mut lines, &mut unknown_items);
        excluded_items.extend(card.exclusions.iter().map(|item| ExcludedItem {
            card_id: Some(card.id.clone()),
            item: item.clone(),
        }));
        temporary_offers.extend(card.temporary_offers.iter().map(|offer| OfferNote {
            card_id: card.id.clone(),
            kind: offer.kind,
            label: offer.label.clone(),
            note: offer.note.clone(),
        }));
    }
    let mut known_subtotal = CurrencyTotals::new();
    for line in &lines {
        *known_subtotal.entry(line.currency).or_default() += line.amount;
    }
    let total_known = unknown_items.is_empty().then(|| known_subtotal.clone());
    Estimate {
        catalog_version: catalog_version.to_owned(),
        lines,
        unknown_items,
        excluded_items,
        temporary_offers,
        known_subtotal,
        total_known,
    }
}

fn price_card(
    card: &ServicePlan,
    workload: &Workload,
    lines: &mut Vec<LineItem>,
    unknown_items: &mut Vec<UnknownItem>,
) {
    let Some(formula) = &card.price_formula else {
        unknown_items.push(UnknownItem {
            card_id: card.id.clone(),
            label: "Price".to_owned(),
            reason: "no verified price formula in the catalog".to_owned(),
        });
        return;
    };
    let before = unknown_items.len();
    let first_line = lines.len();
    for charge in &formula.charges {
        match charge {
            Charge::Fixed { label, amount } => {
                lines.push(line(card, label, "month", Decimal::ONE, *amount));
            }
            Charge::Metered {
                label,
                meter,
                unit,
                rate,
                per_units,
                free,
                round_up,
            } => {
                let Some(usage) = workload.meter(*meter) else {
                    unknown_items.push(unknown(card, label, format!("{meter:?} not provided")));
                    continue;
                };
                let allowance = match free {
                    Free::None => Some(Decimal::ZERO),
                    Free::Units { amount } => Some(*amount),
                    Free::MultipleOf { meter, factor } => {
                        workload.meter(*meter).map(|base| base * factor)
                    }
                };
                let Some(allowance) = allowance else {
                    unknown_items.push(unknown(
                        card,
                        label,
                        "free allowance meter not provided".to_owned(),
                    ));
                    continue;
                };
                let units = billable_units(usage, allowance, *per_units, *round_up);
                lines.push(line(card, label, unit, units, units * rate));
            }
        }
    }
    apply_plan_minimum(
        card,
        formula,
        lines,
        first_line,
        unknown_items.len() == before,
    );
    check_commitment(card, workload, unknown_items);
}

fn apply_plan_minimum(
    card: &ServicePlan,
    formula: &PriceFormula,
    lines: &mut Vec<LineItem>,
    first_line: usize,
    all_priced: bool,
) {
    let Some(minimum) = formula.plan_minimum_monthly else {
        return;
    };
    let subtotal: Decimal = lines[first_line..].iter().map(|item| item.amount).sum();
    if all_priced && subtotal < minimum {
        lines.push(line(
            card,
            "Plan minimum top-up",
            "month",
            Decimal::ONE,
            minimum - subtotal,
        ));
    }
}

fn check_commitment(card: &ServicePlan, workload: &Workload, unknown_items: &mut Vec<UnknownItem>) {
    let Commitment::MinimumStorageDurationDays { days } = card.commitment else {
        return;
    };
    let reason = match workload.object_lifetime_days {
        None => format!(
            "object lifetime not provided; {days}-day minimum storage duration may add charges"
        ),
        Some(lifetime) if lifetime < days => {
            format!(
                "objects deleted before {days} days are still billed; the amount is not modeled"
            )
        }
        Some(_) => return,
    };
    unknown_items.push(unknown(card, "Minimum storage duration", reason));
}

fn unknown(card: &ServicePlan, label: &str, reason: String) -> UnknownItem {
    UnknownItem {
        card_id: card.id.clone(),
        label: label.to_owned(),
        reason,
    }
}

fn line(card: &ServicePlan, label: &str, unit: &str, units: Decimal, amount: Decimal) -> LineItem {
    LineItem {
        card_id: card.id.clone(),
        provider: card.provider.clone(),
        product: card.product.clone(),
        label: label.to_owned(),
        unit: unit.to_owned(),
        billable_units: units,
        amount,
        currency: card.currency,
        priced_region: card.priced_region.clone(),
        checked_at: card.verified_at.clone(),
        source_url: card.evidence[0].source_url.clone(),
    }
}

#[cfg(test)]
mod tests {
    use std::str::FromStr;

    use serde_json::json;

    use super::*;
    use crate::catalog::Catalog;

    fn dec(text: &str) -> Decimal {
        Decimal::from_str(text).unwrap()
    }

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

    fn price(card_id: &str, extra: serde_json::Value) -> Estimate {
        let catalog = Catalog::embedded().unwrap();
        estimate(
            &catalog.catalog_version,
            &[catalog.card(card_id).unwrap()],
            &workload(extra),
        )
    }

    fn amount(estimate: &Estimate, label: &str) -> Decimal {
        estimate
            .lines
            .iter()
            .find(|item| item.label == label)
            .unwrap()
            .amount
    }

    #[test]
    fn r2_storage_boundary_at_the_free_allowance() {
        for (gb, expected) in [("9.9", "0"), ("10", "0"), ("10.1", "0.015")] {
            let result = price(
                "cloudflare-r2-standard",
                json!({"storage_gb_month": dec(gb), "writes_month": 0, "reads_month": 0}),
            );
            assert_eq!(
                amount(&result, "Standard storage"),
                dec(expected),
                "{gb} GB"
            );
        }
    }

    #[test]
    fn r2_write_boundary_at_the_free_allowance() {
        for (writes, expected) in [(900_000, "0"), (1_000_000, "0"), (1_100_000, "4.50")] {
            let result = price(
                "cloudflare-r2-standard",
                json!({"storage_gb_month": 1, "writes_month": writes, "reads_month": 0}),
            );
            assert_eq!(
                amount(&result, "Class A operations"),
                dec(expected),
                "{writes}"
            );
        }
    }

    #[test]
    fn r2_rounds_one_million_and_one_reads_up_to_the_next_unit() {
        let result = price(
            "cloudflare-r2-standard",
            json!({"storage_gb_month": 1, "writes_month": 0, "reads_month": 10_000_001}),
        );
        assert_eq!(amount(&result, "Class B operations"), dec("0.36"));
    }

    #[test]
    fn r2_matches_the_vendor_published_example() {
        let result = price(
            "cloudflare-r2-standard",
            json!({"storage_gb_month": 1000, "writes_month": 1000, "reads_month": 1_000_000}),
        );
        assert_eq!(result.total_known.unwrap()[&Currency::Usd], dec("14.85"));
    }

    #[test]
    fn sliplane_bills_rounded_up_250_gb_blocks_in_euros() {
        for (gb, expected) in [(1, "0"), (100, "5"), (251, "5"), (252, "10")] {
            let result = price("sliplane-object-storage", json!({"storage_gb_month": gb}));
            assert_eq!(amount(&result, "Storage blocks"), dec(expected), "{gb} GB");
            assert_eq!(result.lines[0].currency, Currency::Eur);
        }
    }

    #[test]
    fn b2_egress_is_free_up_to_three_times_stored_gb() {
        for (egress, expected) in [(300, "0"), (301, "0.01"), (400, "1.00")] {
            let result = price(
                "backblaze-b2",
                json!({"storage_gb_month": 100, "egress_gb": egress}),
            );
            assert_eq!(
                amount(&result, "Egress above free allowance"),
                dec(expected),
                "{egress}"
            );
        }
    }

    #[test]
    fn b2_storage_is_priced_per_terabyte_after_ten_free_gb() {
        let result = price(
            "backblaze-b2",
            json!({"storage_gb_month": 100, "egress_gb": 0}),
        );
        assert_eq!(amount(&result, "Storage"), dec("0.6255"));
    }

    #[test]
    fn wasabi_applies_the_plan_minimum_and_never_prices_ten_gb_proportionally() {
        let small = price(
            "wasabi-pay-as-you-go",
            json!({"storage_gb_month": 10, "object_lifetime_days": 90}),
        );
        assert_eq!(small.total_known.unwrap()[&Currency::Usd], dec("7.99"));
        let large = price(
            "wasabi-pay-as-you-go",
            json!({"storage_gb_month": 2000, "object_lifetime_days": 365}),
        );
        assert_eq!(large.total_known.unwrap()[&Currency::Usd], dec("15.98"));
    }

    #[test]
    fn wasabi_minimum_duration_is_unknown_unless_lifetime_covers_it() {
        for lifetime in [json!(null), json!(30)] {
            let result = price(
                "wasabi-pay-as-you-go",
                json!({"storage_gb_month": 10, "object_lifetime_days": lifetime}),
            );
            assert!(result.total_known.is_none());
            assert_eq!(result.unknown_items[0].label, "Minimum storage duration");
        }
    }

    #[test]
    fn trials_are_listed_but_never_reduce_the_recurring_total() {
        let result = price(
            "wasabi-pay-as-you-go",
            json!({"storage_gb_month": 10, "object_lifetime_days": 90}),
        );
        assert_eq!(result.temporary_offers.len(), 1);
        assert_eq!(result.usd_total(), Some(dec("7.99")));
    }

    #[test]
    fn neon_launch_bills_cu_hours_and_storage() {
        let result = price("neon-launch", json!({"db_cu_hours": 100, "db_gb": 2}));
        assert_eq!(amount(&result, "Compute"), dec("10.600"));
        assert_eq!(amount(&result, "Database storage"), dec("0.70"));
    }

    #[test]
    fn cloud_run_bills_cpu_memory_and_requests_as_separate_meters() {
        let result = price(
            "gcp-cloud-run-request-based",
            json!({"cpu_seconds": 200_000, "memory_gib_seconds": 400_000, "requests_month": 3_000_000}),
        );
        assert_eq!(amount(&result, "CPU"), dec("0.48"));
        assert_eq!(amount(&result, "Memory"), dec("0.10"));
        assert_eq!(amount(&result, "Requests"), dec("0.40"));
        assert_eq!(result.usd_total(), Some(dec("0.98")));
    }

    #[test]
    fn render_bandwidth_allowance_differs_by_workspace_plan() {
        let hobby = price("render-web-starter-hobby", json!({"app_outbound_gb": 20}));
        assert_eq!(hobby.usd_total(), Some(dec("9.25")));
        let pro = price("render-web-starter-pro", json!({"app_outbound_gb": 20}));
        assert_eq!(pro.usd_total(), Some(dec("32")));
    }

    #[test]
    fn missing_meter_is_unknown_not_zero() {
        let result = price("cloudflare-r2-standard", json!({"storage_gb_month": 50}));
        assert!(result.total_known.is_none());
        assert_eq!(result.unknown_items.len(), 2);
        assert!(
            result
                .lines
                .iter()
                .all(|item| item.label == "Standard storage")
        );
    }

    #[test]
    fn unpriced_card_is_unknown_and_never_free() {
        let result = price("aikido-security-free", json!({}));
        assert!(result.lines.is_empty() && result.total_known.is_none());
    }

    #[test]
    fn currencies_stay_separate_without_an_exchange_rate() {
        let catalog = Catalog::embedded().unwrap();
        let cards = [
            catalog.card("sliplane-object-storage").unwrap(),
            catalog.card("backblaze-b2").unwrap(),
        ];
        let result = estimate(
            "v",
            &cards,
            &workload(json!({"storage_gb_month": 100, "egress_gb": 0})),
        );
        let totals = result.total_known.as_ref().unwrap();
        assert_eq!(totals[&Currency::Eur], dec("5"));
        assert_eq!(totals[&Currency::Usd], dec("0.6255"));
        assert_eq!(result.usd_total(), None);
    }

    #[test]
    fn every_line_links_card_region_and_checked_date() {
        let result = price("render-web-starter-pro", json!({"app_outbound_gb": 1}));
        for item in &result.lines {
            assert!(item.source_url.starts_with("https://"));
            assert_eq!(item.checked_at, "2026-11-07");
            assert!(!item.priced_region.is_empty() && !item.card_id.is_empty());
        }
    }

    #[test]
    fn taxes_are_always_listed_as_excluded() {
        let result = price("cloudflare-pages-free", json!({}));
        assert!(
            result
                .excluded_items
                .iter()
                .any(|item| item.item.starts_with("Taxes"))
        );
    }
}
