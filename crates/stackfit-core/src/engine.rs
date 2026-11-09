use rust_decimal::Decimal;
use serde::Serialize;
use thiserror::Error;

use crate::{
    catalog::{
        Catalog, CatalogError, Charge, Edge, Free, Meter, OpsLevel, Recipe, ServicePlan, Sleep,
        providers,
    },
    filters::{self, Finding, ReasonCode},
    pricing::{self, Estimate},
    workload::{Scenario, Workload, WorkloadError},
};

pub const MAX_COMPARED_STACKS: usize = 3;

#[derive(Debug, Error)]
pub enum EngineError {
    #[error("unknown stack id {0:?}")]
    UnknownStack(String),
    #[error("compare at most {MAX_COMPARED_STACKS} stacks")]
    TooManyStacks,
}

#[derive(Debug, Error)]
pub enum AdvisorError {
    #[error(transparent)]
    Workload(#[from] WorkloadError),
    #[error(transparent)]
    Catalog(#[from] CatalogError),
    #[error(transparent)]
    Engine(#[from] EngineError),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum Role {
    LowestCost,
    Balanced,
    Performance,
}

#[derive(Debug, Serialize)]
pub struct Selection {
    pub stack_id: String,
    pub roles: Vec<Role>,
    pub reasons: Vec<String>,
    pub estimate: Estimate,
    pub edges: Vec<Edge>,
}

/// A conditional stack has unverified eligibility or an unknown price, so it gets no rank.
#[derive(Debug, Serialize)]
pub struct Conditional {
    pub stack_id: String,
    pub conditions: Vec<Finding>,
    pub estimate: Estimate,
    pub edges: Vec<Edge>,
}

#[derive(Debug, Serialize)]
pub struct Rejected {
    pub stack_id: String,
    pub findings: Vec<Finding>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct ComparisonRow {
    pub stack_id: String,
    pub monthly_total_usd: Decimal,
    pub provider_count: usize,
    pub ops_score: u32,
    pub pareto_optimal: bool,
}

#[derive(Debug, Serialize)]
pub struct Recommendation {
    pub catalog_version: String,
    pub selections: Vec<Selection>,
    pub conditional: Vec<Conditional>,
    pub rejected: Vec<Rejected>,
    pub comparison: Vec<ComparisonRow>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum CliffKind {
    FreeAllowanceEnds,
    PlanLimit,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Cliff {
    pub card_id: String,
    pub kind: CliffKind,
    pub meter: Meter,
    pub threshold: Decimal,
    pub first_exceeded_in: Scenario,
}

#[derive(Debug, Serialize)]
pub struct ScenarioResult {
    pub scenario: Scenario,
    pub estimate: Estimate,
    pub rejected: Vec<Finding>,
    pub needs_verification: Vec<Finding>,
}

#[derive(Debug, Serialize)]
pub struct StackComparison {
    pub stack_id: String,
    pub scenarios: Vec<ScenarioResult>,
    pub cliffs: Vec<Cliff>,
}

#[derive(Debug, Serialize)]
pub struct Comparison {
    pub catalog_version: String,
    pub stacks: Vec<StackComparison>,
}

struct Candidate<'a> {
    id: String,
    recipe: &'a Recipe,
    cards: Vec<&'a ServicePlan>,
}

struct Evaluation {
    rejected: Vec<Finding>,
    needs_verification: Vec<Finding>,
    estimate: Estimate,
}

/// Only explicit recipe slots are combined, so arbitrary cheapest SKUs are never mixed.
fn candidates(catalog: &Catalog) -> Vec<Candidate<'_>> {
    let mut all = Vec::new();
    for recipe in &catalog.recipes {
        let mut partials: Vec<Vec<&ServicePlan>> = vec![Vec::new()];
        for slot in &recipe.slots {
            partials = partials
                .iter()
                .flat_map(|partial| {
                    slot.card_ids
                        .iter()
                        .filter_map(|id| catalog.card(id))
                        .map(|card| {
                            let mut next = partial.clone();
                            next.push(card);
                            next
                        })
                })
                .collect();
        }
        for cards in partials {
            let ids: Vec<&str> = cards.iter().map(|card| card.id.as_str()).collect();
            all.push(Candidate {
                id: format!("{}/{}", recipe.id, ids.join("+")),
                recipe,
                cards,
            });
        }
    }
    all
}

fn evaluate(catalog: &Catalog, candidate: &Candidate<'_>, workload: &Workload) -> Evaluation {
    let mut rejected = Vec::new();
    let mut needs_verification = Vec::new();
    if !candidate.recipe.runtimes.contains(&workload.runtime) {
        rejected.push(Finding::new(
            None,
            ReasonCode::UnsupportedRuntime,
            format!(
                "recipe {} does not support {:?}",
                candidate.recipe.id, workload.runtime
            ),
        ));
    }
    for card in &candidate.cards {
        let verdict = filters::evaluate_card(card, workload);
        rejected.extend(verdict.rejected);
        needs_verification.extend(verdict.needs_verification);
    }
    needs_verification.extend(filters::missing_capabilities(&candidate.cards, workload));
    let estimate = pricing::estimate(&catalog.catalog_version, &candidate.cards, workload);
    let usd_subtotal = estimate
        .known_subtotal
        .get(&crate::catalog::Currency::Usd)
        .copied()
        .unwrap_or_default();
    rejected.extend(filters::over_budget(workload, usd_subtotal));
    Evaluation {
        rejected,
        needs_verification,
        estimate,
    }
}

fn ops_score(card: &ServicePlan) -> u32 {
    match card.operations_level {
        OpsLevel::Low => 1,
        OpsLevel::Medium => 2,
        OpsLevel::High => 3,
    }
}

struct Feasible<'a> {
    row: ComparisonRow,
    candidate: &'a Candidate<'a>,
    estimate: Estimate,
    can_stay_awake: bool,
}

/// A row is dominated when another row is no worse on every axis and better on one.
fn mark_pareto(rows: &mut [ComparisonRow]) {
    let snapshot = rows.to_vec();
    for row in rows.iter_mut() {
        let key = |r: &ComparisonRow| (r.monthly_total_usd, r.provider_count, r.ops_score);
        row.pareto_optimal = !snapshot.iter().any(|other| {
            let (a, b) = (key(other), key(row));
            a.0 <= b.0 && a.1 <= b.1 && a.2 <= b.2 && a != b
        });
    }
}

pub fn recommend(catalog: &Catalog, workload: &Workload) -> Recommendation {
    let all = candidates(catalog);
    let mut feasible = Vec::new();
    let mut conditional = Vec::new();
    let mut rejected = Vec::new();
    for candidate in &all {
        let evaluation = evaluate(catalog, candidate, workload);
        if !evaluation.rejected.is_empty() {
            rejected.push(Rejected {
                stack_id: candidate.id.clone(),
                findings: evaluation.rejected,
            });
            continue;
        }
        match evaluation.estimate.usd_total() {
            Some(total) if evaluation.needs_verification.is_empty() => feasible.push(Feasible {
                row: ComparisonRow {
                    stack_id: candidate.id.clone(),
                    monthly_total_usd: total,
                    provider_count: providers(&candidate.cards),
                    ops_score: candidate.cards.iter().map(|card| ops_score(card)).sum(),
                    pareto_optimal: false,
                },
                candidate,
                estimate: evaluation.estimate,
                can_stay_awake: candidate
                    .cards
                    .iter()
                    .all(|card| card.sleep != Sleep::Always),
            }),
            _ => conditional.push(Conditional {
                stack_id: candidate.id.clone(),
                conditions: evaluation.needs_verification,
                estimate: evaluation.estimate,
                edges: candidate.recipe.edges.clone(),
            }),
        }
    }

    let mut rows: Vec<ComparisonRow> = feasible.iter().map(|item| item.row.clone()).collect();
    mark_pareto(&mut rows);
    rows.sort_by(|a, b| {
        (a.monthly_total_usd, &a.stack_id).cmp(&(b.monthly_total_usd, &b.stack_id))
    });

    let by_cost = |item: &&Feasible<'_>| (item.row.monthly_total_usd, item.row.stack_id.clone());
    let lowest = feasible.iter().min_by_key(by_cost);
    let performance = feasible
        .iter()
        .filter(|item| item.can_stay_awake)
        .min_by_key(by_cost);
    let balanced = feasible
        .iter()
        .filter(|item| {
            rows.iter()
                .any(|row| row.stack_id == item.row.stack_id && row.pareto_optimal)
        })
        .min_by_key(|item| {
            (
                item.row.provider_count,
                item.row.ops_score,
                item.row.monthly_total_usd,
                item.row.stack_id.clone(),
            )
        });

    let mut chosen: Vec<(&Feasible<'_>, Vec<Role>, Vec<String>)> = Vec::new();
    for (role, pick, reason) in [
        (
            Role::LowestCost,
            lowest,
            "lowest known monthly total among feasible stacks",
        ),
        (
            Role::Balanced,
            balanced,
            "Pareto-optimal with the fewest providers, then the lowest operations level, then the lowest cost",
        ),
        (
            Role::Performance,
            performance,
            "cheapest feasible stack with no component that always sleeps when idle",
        ),
    ] {
        let Some(pick) = pick else { continue };
        match chosen
            .iter_mut()
            .find(|(item, _, _)| item.row.stack_id == pick.row.stack_id)
        {
            Some((_, roles, reasons)) => {
                roles.push(role);
                reasons.push(reason.to_owned());
            }
            None => chosen.push((pick, vec![role], vec![reason.to_owned()])),
        }
    }

    let selections = chosen
        .into_iter()
        .map(|(item, roles, reasons)| Selection {
            stack_id: item.row.stack_id.clone(),
            roles,
            reasons,
            estimate: item.estimate.clone(),
            edges: item.candidate.recipe.edges.clone(),
        })
        .collect();
    conditional.sort_by(|a, b| a.stack_id.cmp(&b.stack_id));
    Recommendation {
        catalog_version: catalog.catalog_version.clone(),
        selections,
        conditional,
        rejected,
        comparison: rows,
    }
}

pub fn compare(
    catalog: &Catalog,
    workload: &Workload,
    stack_ids: &[String],
) -> Result<Comparison, EngineError> {
    if stack_ids.len() > MAX_COMPARED_STACKS {
        return Err(EngineError::TooManyStacks);
    }
    let all = candidates(catalog);
    let mut stacks = Vec::new();
    for id in stack_ids {
        let candidate = all
            .iter()
            .find(|candidate| &candidate.id == id)
            .ok_or_else(|| EngineError::UnknownStack(id.clone()))?;
        let scenarios = [
            Scenario::Now,
            Scenario::ThreeXTraffic,
            Scenario::TenXStorageEgress,
        ]
        .into_iter()
        .map(|scenario| {
            let evaluation = evaluate(catalog, candidate, &workload.scaled(scenario));
            ScenarioResult {
                scenario,
                estimate: evaluation.estimate,
                rejected: evaluation.rejected,
                needs_verification: evaluation.needs_verification,
            }
        })
        .collect();
        stacks.push(StackComparison {
            stack_id: id.clone(),
            scenarios,
            cliffs: cliffs(&candidate.cards, workload),
        });
    }
    Ok(Comparison {
        catalog_version: catalog.catalog_version.clone(),
        stacks,
    })
}

fn first_crossing(
    workload: &Workload,
    usage_and_threshold: impl Fn(&Workload) -> Option<(Decimal, Decimal)>,
) -> Option<(Scenario, Decimal)> {
    let (usage, threshold) = usage_and_threshold(workload)?;
    if usage > threshold {
        return None;
    }
    [Scenario::ThreeXTraffic, Scenario::TenXStorageEgress]
        .into_iter()
        .find_map(|scenario| {
            let (usage, threshold) = usage_and_threshold(&workload.scaled(scenario))?;
            (usage > threshold).then_some((scenario, threshold))
        })
}

/// A cliff is a free allowance or plan limit the workload is under now but exceeds in a scenario.
fn cliffs(cards: &[&ServicePlan], workload: &Workload) -> Vec<Cliff> {
    let mut found = Vec::new();
    for card in cards {
        let charges = card
            .price_formula
            .iter()
            .flat_map(|formula| &formula.charges);
        for charge in charges {
            let Charge::Metered { meter, free, .. } = charge else {
                continue;
            };
            let crossing = first_crossing(workload, |w| {
                let threshold = match free {
                    Free::None => return None,
                    Free::Units { amount } => *amount,
                    Free::MultipleOf { meter, factor } => w.meter(*meter)? * factor,
                };
                Some((w.meter(*meter)?, threshold))
            });
            if let Some((first_exceeded_in, threshold)) = crossing {
                found.push(Cliff {
                    card_id: card.id.clone(),
                    kind: CliffKind::FreeAllowanceEnds,
                    meter: *meter,
                    threshold,
                    first_exceeded_in,
                });
            }
        }
        for limit in &card.limits {
            let crossing = first_crossing(workload, |w| Some((w.meter(limit.meter)?, limit.max)));
            if let Some((first_exceeded_in, threshold)) = crossing {
                found.push(Cliff {
                    card_id: card.id.clone(),
                    kind: CliffKind::PlanLimit,
                    meter: limit.meter,
                    threshold,
                    first_exceeded_in,
                });
            }
        }
    }
    found
}

pub fn recommend_from_json(input: &[u8]) -> Result<Recommendation, AdvisorError> {
    let workload = Workload::parse(input)?;
    Ok(recommend(&Catalog::embedded()?, &workload))
}

pub fn compare_from_json(input: &[u8], stack_ids: &[String]) -> Result<Comparison, AdvisorError> {
    let workload = Workload::parse(input)?;
    Ok(compare(&Catalog::embedded()?, &workload, stack_ids)?)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn row(id: &str, total: i64, providers: usize, ops: u32) -> ComparisonRow {
        ComparisonRow {
            stack_id: id.to_owned(),
            monthly_total_usd: Decimal::from(total),
            provider_count: providers,
            ops_score: ops,
            pareto_optimal: false,
        }
    }

    #[test]
    fn pareto_marks_dominated_rows_and_keeps_tradeoffs() {
        let mut rows = [
            row("cheap-many", 10, 4, 4),
            row("pricey-few", 20, 1, 1),
            row("dominated", 25, 4, 4),
            row("tie", 10, 4, 4),
        ];
        mark_pareto(&mut rows);
        let optimal: Vec<bool> = rows.iter().map(|r| r.pareto_optimal).collect();
        assert_eq!(optimal, [true, true, false, true]);
    }

    #[test]
    fn candidates_are_bounded_explicit_combinations() {
        let catalog = Catalog::embedded().unwrap();
        let all = candidates(&catalog);
        assert_eq!(all.len(), 16);
        assert!(all.iter().all(|candidate| candidate.cards.len() >= 3));
        let mut ids: Vec<_> = all.iter().map(|candidate| candidate.id.clone()).collect();
        ids.sort();
        ids.dedup();
        assert_eq!(ids.len(), 16);
    }
}
