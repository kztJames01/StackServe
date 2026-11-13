use std::collections::{BTreeMap, BTreeSet};

use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::protocol::iso_date;

pub const MAX_CARDS: usize = 128;
pub const MAX_COMBINATIONS: usize = 64;
const EMBEDDED: &str = include_str!("../../../catalog/catalog.json");

#[derive(Debug, Error)]
pub enum CatalogError {
    #[error("catalog is not valid: {0}")]
    Parse(#[from] serde_json::Error),
    #[error("catalog has too many cards or stack combinations")]
    TooLarge,
    #[error("card {id}: {reason}")]
    Card { id: String, reason: String },
    #[error("recipe {id}: {reason}")]
    Recipe { id: String, reason: String },
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Currency {
    Usd,
    Eur,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Region {
    Us,
    Eu,
    Global,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Runtime {
    Static,
    Node,
    Python,
    Docker,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DbEngine {
    Postgresql,
    Sqlite,
    Mysql,
    Mongodb,
    Redis,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Category {
    Frontend,
    Runtime,
    Database,
    ObjectStorage,
    Security,
    Inference,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Status {
    Modeled,
    Discoverable,
    NeedsManualQuote,
}

/// A fact the catalog has checked: `Unverified` is never treated as `Yes`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Support {
    Yes,
    No,
    Unverified,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Sleep {
    Never,
    Optional,
    Always,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum OpsLevel {
    Low,
    Medium,
    High,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Confidence {
    Low,
    Medium,
    High,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Meter {
    StorageGbMonth,
    EgressGb,
    WritesMonth,
    ReadsMonth,
    RequestsMonth,
    AppOutboundGb,
    DbGb,
    DbCuHours,
    CpuSeconds,
    MemoryGibSeconds,
    TokensInputMillion,
    TokensOutputMillion,
    GpuHours,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case", deny_unknown_fields)]
pub enum Free {
    None,
    Units {
        amount: Decimal,
    },
    /// Allowance scales with another meter, e.g. egress free up to 3x stored GB.
    MultipleOf {
        meter: Meter,
        factor: Decimal,
    },
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case", deny_unknown_fields)]
pub enum Charge {
    Fixed {
        label: String,
        amount: Decimal,
    },
    Metered {
        label: String,
        meter: Meter,
        unit: String,
        rate: Decimal,
        per_units: Decimal,
        free: Free,
        round_up: bool,
    },
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct PriceFormula {
    pub charges: Vec<Charge>,
    #[serde(default)]
    pub plan_minimum_monthly: Option<Decimal>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case", deny_unknown_fields)]
pub enum Commitment {
    None,
    MinimumStorageDurationDays { days: u32 },
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Limit {
    pub meter: Meter,
    pub max: Decimal,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum OfferKind {
    Credit,
    Trial,
}

/// Temporary offers are listed beside an estimate and never reduce its total.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Offer {
    pub kind: OfferKind,
    pub label: String,
    pub note: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Source {
    pub source_url: String,
    pub note: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ServicePlan {
    pub id: String,
    pub provider: String,
    pub product: String,
    pub plan: String,
    pub category: Category,
    pub status: Status,
    pub eligible_regions: Vec<Region>,
    pub capabilities: Vec<String>,
    pub exclusions: Vec<String>,
    pub operations_level: OpsLevel,
    pub evidence: Vec<Source>,
    #[serde(default)]
    pub price_formula: Option<PriceFormula>,
    pub commitment: Commitment,
    pub currency: Currency,
    pub priced_region: String,
    pub tax_note: String,
    pub fetched_at: String,
    pub verified_at: String,
    pub confidence: Confidence,
    pub runtimes: Vec<Runtime>,
    pub db_engines: Vec<DbEngine>,
    pub commercial_use: Support,
    pub sleep: Sleep,
    pub backup: Support,
    pub s3_features: Vec<String>,
    pub limits: Vec<Limit>,
    pub temporary_offers: Vec<Offer>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Slot {
    pub category: Category,
    pub card_ids: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Edge {
    pub from: Category,
    pub to: Category,
    pub auth: String,
    pub latency_note: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Recipe {
    pub id: String,
    pub name: String,
    #[serde(default = "default_recipe_currency")]
    pub currency: Currency,
    pub runtimes: Vec<Runtime>,
    pub slots: Vec<Slot>,
    pub edges: Vec<Edge>,
}

fn default_recipe_currency() -> Currency {
    Currency::Usd
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Catalog {
    pub catalog_version: String,
    pub cards: Vec<ServicePlan>,
    pub recipes: Vec<Recipe>,
}

impl Catalog {
    pub fn embedded() -> Result<Self, CatalogError> {
        Self::from_json(EMBEDDED.as_bytes())
    }

    pub fn from_json(input: &[u8]) -> Result<Self, CatalogError> {
        let catalog: Catalog = serde_json::from_slice(input)?;
        catalog.validate()?;
        Ok(catalog)
    }

    pub fn card(&self, id: &str) -> Option<&ServicePlan> {
        self.cards.iter().find(|card| card.id == id)
    }

    fn validate(&self) -> Result<(), CatalogError> {
        if self.cards.len() > MAX_CARDS || self.catalog_version.is_empty() {
            return Err(CatalogError::TooLarge);
        }
        let mut seen = BTreeSet::new();
        for card in &self.cards {
            if !seen.insert(card.id.as_str()) {
                return Err(card_error(card, "duplicate id"));
            }
            validate_card(card)?;
        }
        let mut combinations = 0usize;
        let mut recipe_ids = BTreeSet::new();
        for recipe in &self.recipes {
            if !recipe_ids.insert(recipe.id.as_str()) {
                return Err(recipe_error(recipe, "duplicate id"));
            }
            combinations = combinations.saturating_add(self.validate_recipe(recipe)?);
        }
        if combinations > MAX_COMBINATIONS {
            return Err(CatalogError::TooLarge);
        }
        Ok(())
    }

    fn validate_recipe(&self, recipe: &Recipe) -> Result<usize, CatalogError> {
        if recipe.runtimes.is_empty() || recipe.slots.is_empty() {
            return Err(recipe_error(recipe, "needs runtimes and slots"));
        }
        let mut combinations = 1usize;
        for slot in &recipe.slots {
            if slot.card_ids.is_empty() {
                return Err(recipe_error(recipe, "empty slot"));
            }
            let distinct: BTreeSet<_> = slot.card_ids.iter().collect();
            if distinct.len() != slot.card_ids.len() {
                return Err(recipe_error(recipe, "duplicate card in slot"));
            }
            for id in &slot.card_ids {
                let card = self
                    .card(id)
                    .ok_or_else(|| recipe_error(recipe, &format!("unknown card {id}")))?;
                if card.category != slot.category {
                    return Err(recipe_error(
                        recipe,
                        &format!("card {id} is in the wrong slot"),
                    ));
                }
                if card.status != Status::Modeled {
                    return Err(recipe_error(recipe, &format!("card {id} is not modeled")));
                }
                if card.currency != recipe.currency {
                    return Err(recipe_error(
                        recipe,
                        &format!(
                            "card {id} currency {:?} does not match recipe currency {:?}",
                            card.currency, recipe.currency
                        ),
                    ));
                }
            }
            combinations = combinations.saturating_mul(slot.card_ids.len());
        }
        Ok(combinations)
    }
}

fn card_error(card: &ServicePlan, reason: &str) -> CatalogError {
    CatalogError::Card {
        id: card.id.clone(),
        reason: reason.to_owned(),
    }
}

fn recipe_error(recipe: &Recipe, reason: &str) -> CatalogError {
    CatalogError::Recipe {
        id: recipe.id.clone(),
        reason: reason.to_owned(),
    }
}

fn validate_card(card: &ServicePlan) -> Result<(), CatalogError> {
    if card.id.is_empty() || card.provider.is_empty() || card.eligible_regions.is_empty() {
        return Err(card_error(card, "missing id, provider, or regions"));
    }
    if card.evidence.is_empty()
        || card
            .evidence
            .iter()
            .any(|source| !valid_source_url(&source.source_url))
    {
        return Err(card_error(card, "needs an https source URL"));
    }
    if !iso_date(&card.fetched_at) || !iso_date(&card.verified_at) {
        return Err(card_error(
            card,
            "fetched_at and verified_at must be YYYY-MM-DD",
        ));
    }
    match (card.status, &card.price_formula) {
        (Status::Modeled, None) => {
            return Err(card_error(card, "modeled card needs a price formula"));
        }
        (Status::NeedsManualQuote, Some(_)) => {
            return Err(card_error(card, "manual-quote card must not carry a price"));
        }
        _ => {}
    }
    if card.limits.iter().any(|limit| limit.max < Decimal::ZERO) {
        return Err(card_error(card, "negative limit"));
    }
    if let Some(formula) = &card.price_formula {
        validate_formula(card, formula)?;
    }
    Ok(())
}

fn validate_formula(card: &ServicePlan, formula: &PriceFormula) -> Result<(), CatalogError> {
    if formula.charges.is_empty() {
        return Err(card_error(card, "formula has no charges"));
    }
    if formula
        .plan_minimum_monthly
        .is_some_and(|minimum| minimum < Decimal::ZERO)
    {
        return Err(card_error(card, "negative plan minimum"));
    }
    for charge in &formula.charges {
        match charge {
            Charge::Fixed { amount, .. } if *amount < Decimal::ZERO => {
                return Err(card_error(card, "negative fixed amount"));
            }
            Charge::Metered {
                rate,
                per_units,
                free,
                ..
            } => {
                let bad_free = match free {
                    Free::None => false,
                    Free::Units { amount } => *amount < Decimal::ZERO,
                    Free::MultipleOf { factor, .. } => *factor <= Decimal::ZERO,
                };
                if *rate < Decimal::ZERO || *per_units <= Decimal::ZERO || bad_free {
                    return Err(card_error(
                        card,
                        "rate, unit size, or allowance out of range",
                    ));
                }
            }
            Charge::Fixed { .. } => {}
        }
    }
    Ok(())
}

fn valid_source_url(url: &str) -> bool {
    url.starts_with("https://")
        && url.len() > "https://".len()
        && url.len() <= 512
        && !url.chars().any(|c| c.is_whitespace() || c == '*')
}

pub fn providers(cards: &[&ServicePlan]) -> usize {
    cards
        .iter()
        .map(|card| card.provider.as_str())
        .collect::<BTreeSet<_>>()
        .len()
}

pub type CurrencyTotals = BTreeMap<Currency, Decimal>;

#[cfg(test)]
mod tests {
    use serde_json::{Value, json};

    use super::*;

    fn embedded_value() -> Value {
        serde_json::from_str(EMBEDDED).unwrap()
    }

    fn load(value: &Value) -> Result<Catalog, CatalogError> {
        Catalog::from_json(&serde_json::to_vec(value).unwrap())
    }

    fn card_mut<'a>(value: &'a mut Value, id: &str) -> &'a mut Value {
        value["cards"]
            .as_array_mut()
            .unwrap()
            .iter_mut()
            .find(|card| card["id"] == id)
            .unwrap()
    }

    #[test]
    fn embedded_catalog_is_valid_and_sized_for_v1() {
        let catalog = Catalog::embedded().unwrap();
        assert!((40..=64).contains(&catalog.cards.len()));
        assert_eq!(catalog.recipes.len(), 4);
    }

    #[test]
    fn aikido_is_discovery_only_without_inferred_price_or_eligibility() {
        let catalog = Catalog::embedded().unwrap();
        let card = catalog.card("aikido-security-free").unwrap();
        assert_eq!(card.status, Status::Discoverable);
        assert!(card.price_formula.is_none());
        assert_eq!(card.commercial_use, Support::Unverified);
        assert!(catalog.recipes.iter().all(|recipe| {
            recipe
                .slots
                .iter()
                .all(|slot| !slot.card_ids.contains(&card.id))
        }));
        let mut value = embedded_value();
        value["recipes"][0]["slots"][0]["card_ids"] = json!(["aikido-security-free"]);
        assert!(load(&value).is_err());
    }

    #[test]
    fn every_card_links_a_source_and_a_checked_date() {
        for card in Catalog::embedded().unwrap().cards {
            assert!(!card.evidence.is_empty(), "{}", card.id);
            assert!(iso_date(&card.verified_at), "{}", card.id);
        }
    }

    #[test]
    fn rejects_missing_source_url() {
        let mut value = embedded_value();
        card_mut(&mut value, "neon-launch")["evidence"] = json!([]);
        assert!(matches!(load(&value), Err(CatalogError::Card { .. })));
    }

    #[test]
    fn rejects_non_https_source_url() {
        let mut value = embedded_value();
        card_mut(&mut value, "neon-launch")["evidence"][0]["source_url"] = json!("http://neon.com");
        assert!(matches!(load(&value), Err(CatalogError::Card { .. })));
    }

    #[test]
    fn rejects_malformed_checked_date() {
        for bad in ["2026-13-01", "2026-1-1", "yesterday", "2026-11-00"] {
            let mut value = embedded_value();
            card_mut(&mut value, "neon-launch")["verified_at"] = json!(bad);
            assert!(load(&value).is_err(), "{bad}");
        }
    }

    #[test]
    fn rejects_modeled_card_without_formula() {
        let mut value = embedded_value();
        card_mut(&mut value, "neon-launch")
            .as_object_mut()
            .unwrap()
            .remove("price_formula");
        assert!(load(&value).is_err());
    }

    #[test]
    fn rejects_price_on_manual_quote_card() {
        let mut value = embedded_value();
        card_mut(&mut value, "hetzner-cloud-cx23-eu")["status"] = json!("needs_manual_quote");
        let formula = json!({"charges": [{"kind": "fixed", "label": "x", "amount": "1"}]});
        card_mut(&mut value, "hetzner-cloud-cx23-eu")["price_formula"] = formula;
        assert!(load(&value).is_err());
    }

    #[test]
    fn rejects_wildcard_rate() {
        let mut value = embedded_value();
        card_mut(&mut value, "neon-launch")["price_formula"]["charges"][0]["rate"] = json!("*");
        assert!(matches!(load(&value), Err(CatalogError::Parse(_))));
    }

    #[test]
    fn rejects_negative_rate_and_zero_unit_size() {
        for (field, value_text) in [("rate", "-1"), ("per_units", "0")] {
            let mut value = embedded_value();
            card_mut(&mut value, "neon-launch")["price_formula"]["charges"][0][field] =
                json!(value_text);
            assert!(load(&value).is_err(), "{field}");
        }
    }

    #[test]
    fn rejects_duplicate_card_ids() {
        let mut value = embedded_value();
        let copy = card_mut(&mut value, "neon-launch").clone();
        value["cards"].as_array_mut().unwrap().push(copy);
        assert!(load(&value).is_err());
    }

    #[test]
    fn rejects_recipe_with_unknown_or_unmodeled_card() {
        let mut value = embedded_value();
        value["recipes"][0]["slots"][1]["card_ids"] = json!(["missing-card"]);
        assert!(load(&value).is_err());
        let mut value = embedded_value();
        value["recipes"][0]["slots"][3]["card_ids"] = json!(["wasabi-pay-as-you-go"]);
        assert!(load(&value).is_err());
    }

    #[test]
    fn rejects_card_in_wrong_slot() {
        let mut value = embedded_value();
        value["recipes"][0]["slots"][1]["card_ids"] = json!(["neon-free"]);
        assert!(load(&value).is_err());
    }

    #[test]
    fn bounds_combination_count() {
        let mut value = embedded_value();
        let runtime = card_mut(&mut value, "render-web-starter-hobby").clone();
        let database = card_mut(&mut value, "neon-launch").clone();
        let mut runtime_ids = Vec::new();
        let mut database_ids = Vec::new();
        for index in 0..9 {
            let mut copy = runtime.clone();
            copy["id"] = json!(format!("runtime-{index}"));
            runtime_ids.push(format!("runtime-{index}"));
            value["cards"].as_array_mut().unwrap().push(copy);
            let mut copy = database.clone();
            copy["id"] = json!(format!("database-{index}"));
            database_ids.push(format!("database-{index}"));
            value["cards"].as_array_mut().unwrap().push(copy);
        }
        value["recipes"][1]["slots"][0]["card_ids"] = json!(runtime_ids);
        value["recipes"][1]["slots"][1]["card_ids"] = json!(database_ids);
        assert!(matches!(load(&value), Err(CatalogError::TooLarge)));
    }

    #[test]
    fn only_two_recipes_are_modeled_and_only_modeled_cards_are_composed() {
        let catalog = Catalog::embedded().unwrap();
        for recipe in &catalog.recipes {
            for slot in &recipe.slots {
                for id in &slot.card_ids {
                    assert_eq!(catalog.card(id).unwrap().status, Status::Modeled);
                }
            }
        }
    }
}
