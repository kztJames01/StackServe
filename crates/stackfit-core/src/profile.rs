use serde::{Deserialize, Serialize};
use serde_json::Value;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ProfileError {
    #[error("brief exceeds size limit")]
    TooLarge,
    #[error("too many selected files")]
    TooManyFiles,
    #[error("brief field is outside the supported range")]
    OutOfRange,
    #[error("invalid project brief: {0}")]
    Invalid(#[from] serde_json::Error),
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Brief {
    pub name: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub runtime: Option<String>,
    #[serde(default)]
    pub traffic: Option<String>,
    #[serde(default)]
    pub database: Option<String>,
    #[serde(default)]
    pub storage_gb: Option<u64>,
    #[serde(default)]
    pub egress_gb: Option<u64>,
    #[serde(default)]
    pub requests_per_month: Option<u64>,
    #[serde(default)]
    pub region: Option<String>,
    #[serde(default)]
    pub commercial_use: Option<bool>,
    #[serde(default)]
    pub availability: Option<String>,
    #[serde(default)]
    pub ops_appetite: Option<String>,
    #[serde(default)]
    pub budget_usd: Option<u64>,
    #[serde(default)]
    pub growth_scenarios: Option<Vec<u64>>,
    #[serde(default)]
    pub files: Vec<SelectedFile>,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SelectedFile {
    pub path: String,
    pub content: String,
}

#[derive(Debug, Serialize)]
pub struct Profile {
    pub name: String,
    pub requirements: Vec<Requirement>,
    pub questions: Vec<String>,
    pub needs_verification: bool,
}

#[derive(Debug, Serialize)]
pub struct Requirement {
    pub field: String,
    pub value: Value,
    pub label: Label,
    pub defaulted: bool,
    pub evidence: Option<Evidence>,
}

#[derive(Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum Label {
    Evidence,
    Inference,
    Constraint,
    Assumption,
}

#[derive(Debug, Serialize)]
pub struct Evidence {
    pub path: String,
    pub line_start: usize,
    pub line_end: usize,
    pub fact: String,
    pub confidence: String,
}

pub fn profile(input: &[u8]) -> Result<Profile, ProfileError> {
    if input.len() > 131_072 {
        return Err(ProfileError::TooLarge);
    }
    let brief: Brief = serde_json::from_slice(input)?;
    if brief.files.len() > 16 {
        return Err(ProfileError::TooManyFiles);
    }
    if brief.name.is_empty()
        || brief.name.len() > 100
        || secret_like(&brief.name)
        || brief.description.len() > 4096
        || [
            brief.runtime.as_ref(),
            brief.traffic.as_ref(),
            brief.database.as_ref(),
            brief.region.as_ref(),
            brief.availability.as_ref(),
            brief.ops_appetite.as_ref(),
        ]
        .into_iter()
        .flatten()
        .any(|value| value.len() > 100 || secret_like(value))
        || brief.storage_gb.is_some_and(|value| value > 1_000_000)
        || brief.egress_gb.is_some_and(|value| value > 1_000_000)
        || brief
            .requests_per_month
            .is_some_and(|value| value > 1_000_000_000_000)
        || brief.budget_usd.is_some_and(|value| value > 1_000_000_000)
        || brief.growth_scenarios.as_ref().is_some_and(|values| {
            values.len() > 3 || values.iter().any(|value| *value == 0 || *value > 100)
        })
        || brief
            .files
            .iter()
            .any(|file| file.path.len() > 256 || file.content.len() > 16_384)
    {
        return Err(ProfileError::OutOfRange);
    }
    let mut requirements = Vec::new();
    let fields = [
        ("runtime", serde_json::to_value(&brief.runtime)?),
        ("traffic", serde_json::to_value(&brief.traffic)?),
        ("database", serde_json::to_value(&brief.database)?),
        ("storage_gb", serde_json::to_value(brief.storage_gb)?),
        ("egress_gb", serde_json::to_value(brief.egress_gb)?),
        (
            "requests_per_month",
            serde_json::to_value(brief.requests_per_month)?,
        ),
        ("region", serde_json::to_value(&brief.region)?),
        (
            "commercial_use",
            serde_json::to_value(brief.commercial_use)?,
        ),
        ("availability", serde_json::to_value(&brief.availability)?),
        ("ops_appetite", serde_json::to_value(&brief.ops_appetite)?),
        ("budget_usd", serde_json::to_value(brief.budget_usd)?),
        (
            "growth_scenarios",
            serde_json::to_value(&brief.growth_scenarios)?,
        ),
    ];
    for (field, value) in fields {
        let defaulted = value.is_null();
        requirements.push(Requirement {
            field: field.to_owned(),
            value,
            label: if defaulted {
                Label::Assumption
            } else {
                Label::Constraint
            },
            defaulted,
            evidence: None,
        });
    }
    for file in &brief.files {
        if !allowed_path(&file.path) || file.content.len() > 16_384 {
            continue;
        }
        if file.path.ends_with("package.json") {
            if let Ok(manifest) = serde_json::from_str::<Value>(&file.content) {
                if let Some(dependencies) = manifest.get("dependencies").and_then(Value::as_object)
                {
                    for (name, version) in dependencies {
                        if let Some(version) = version.as_str() {
                            if safe_dependency(name) && safe_version(version) {
                                let line = file
                                    .content
                                    .lines()
                                    .position(|text| text.contains(&format!("\"{name}\"")))
                                    .map_or(1, |number| number + 1);
                                requirements.push(Requirement {
                                    field: "dependency_version".to_owned(),
                                    value: Value::String(format!("{name}@{version}")),
                                    label: Label::Evidence,
                                    defaulted: false,
                                    evidence: Some(Evidence {
                                        path: file.path.clone(),
                                        line_start: line,
                                        line_end: line,
                                        fact: format!(
                                            "Dependency {name} at declared version {version}"
                                        ),
                                        confidence: "high".to_owned(),
                                    }),
                                });
                            }
                        }
                    }
                }
            }
        }
        for (line_number, line) in file.content.lines().enumerate() {
            if line.len() > 512 {
                continue;
            }
            let env_key = env_reference(line).or_else(|| {
                if file.path.to_ascii_lowercase().ends_with(".env.example") {
                    env_file_reference(line)
                } else {
                    None
                }
            });
            if let Some(key) = env_key {
                requirements.push(Requirement {
                    field: "env_reference".to_owned(),
                    value: Value::String(key.to_owned()),
                    label: Label::Evidence,
                    defaulted: false,
                    evidence: Some(Evidence {
                        path: file.path.clone(),
                        line_start: line_number + 1,
                        line_end: line_number + 1,
                        fact: "Environment variable reference".to_owned(),
                        confidence: "high".to_owned(),
                    }),
                });
            }
            if file.path.ends_with("requirements.txt") {
                if let Some((name, version)) = line.split_once("==") {
                    if safe_dependency(name) && safe_version(version) {
                        requirements.push(Requirement {
                            field: "dependency_version".to_owned(),
                            value: Value::String(format!("{name}@{version}")),
                            label: Label::Evidence,
                            defaulted: false,
                            evidence: Some(Evidence {
                                path: file.path.clone(),
                                line_start: line_number + 1,
                                line_end: line_number + 1,
                                fact: format!("Dependency {name} at declared version {version}"),
                                confidence: "high".to_owned(),
                            }),
                        });
                    }
                }
            }
            if secret_like(line) {
                continue;
            }
            let lower = line.to_ascii_lowercase();
            if file.path.ends_with("Dockerfile") && lower.starts_with("from ") {
                requirements.push(Requirement {
                    field: "container".to_owned(),
                    value: Value::Bool(true),
                    label: Label::Evidence,
                    defaulted: false,
                    evidence: Some(Evidence {
                        path: file.path.clone(),
                        line_start: line_number + 1,
                        line_end: line_number + 1,
                        fact: "Docker build stage".to_owned(),
                        confidence: "high".to_owned(),
                    }),
                });
            }
            for (field, needle, value, fact, inferred) in [
                (
                    "database_reference",
                    "postgres",
                    "postgresql",
                    "PostgreSQL reference",
                    false,
                ),
                ("database_driver", "\"pg\"", "pg", "pg dependency", false),
                (
                    "framework_reference",
                    "express",
                    "express",
                    "Express reference",
                    false,
                ),
                (
                    "framework_reference",
                    "fastapi",
                    "fastapi",
                    "FastAPI reference",
                    false,
                ),
                ("uploads", "upload", "possible", "Upload reference", true),
                (
                    "websockets",
                    "websocket",
                    "possible",
                    "WebSocket reference",
                    true,
                ),
                (
                    "workers",
                    "celery",
                    "possible",
                    "Celery reference; worker requirement unconfirmed",
                    true,
                ),
                (
                    "database_reference",
                    "sqlite",
                    "sqlite",
                    "SQLite reference",
                    false,
                ),
                (
                    "native_module",
                    "sharp",
                    "possible",
                    "Native image module reference",
                    true,
                ),
                (
                    "native_module",
                    "bcrypt",
                    "possible",
                    "Native crypto module reference",
                    true,
                ),
                (
                    "persistent_disk",
                    "writefile",
                    "possible",
                    "File write reference",
                    true,
                ),
            ] {
                if lower.contains(needle) {
                    requirements.push(Requirement {
                        field: field.to_owned(),
                        value: Value::String(value.to_owned()),
                        label: if inferred {
                            Label::Inference
                        } else {
                            Label::Evidence
                        },
                        defaulted: false,
                        evidence: Some(Evidence {
                            path: file.path.clone(),
                            line_start: line_number + 1,
                            line_end: line_number + 1,
                            fact: fact.to_owned(),
                            confidence: "medium".to_owned(),
                        }),
                    });
                }
            }
        }
    }
    requirements.truncate(128);
    let questions: Vec<String> = requirements
        .iter()
        .filter(|requirement| requirement.defaulted)
        .take(8)
        .map(|requirement| question_for(&requirement.field))
        .collect();
    let needs_verification = requirements
        .iter()
        .any(|requirement| requirement.defaulted || matches!(requirement.label, Label::Inference));
    Ok(Profile {
        name: brief.name,
        needs_verification,
        requirements,
        questions,
    })
}

pub(crate) fn allowed_path(path: &str) -> bool {
    let lower = path.to_ascii_lowercase();
    let supported = [
        ".json", ".js", ".ts", ".jsx", ".tsx", ".py", ".rs", ".toml", ".yaml", ".yml",
    ]
    .iter()
    .any(|suffix| lower.ends_with(suffix))
        || lower.ends_with("dockerfile")
        || lower.ends_with("requirements.txt")
        || lower.ends_with(".env.example");
    supported
        && !path.starts_with('/')
        && !secret_like(path)
        && !path.contains('\\')
        && !path.split('/').any(|part| part == "..")
        && !lower.split('/').any(|part| {
            (part == ".env" || (part.starts_with(".env.") && part != ".env.example"))
                || part.contains("credential")
                || part.contains("secret")
                || matches!(
                    part,
                    "node_modules"
                        | ".venv"
                        | "target"
                        | "dist"
                        | "build"
                        | "credentials"
                        | "secrets"
                        | "package-lock.json"
                        | "npm-shrinkwrap.json"
                        | "yarn.lock"
                        | "pnpm-lock.yaml"
                        | "cargo.lock"
                        | "uv.lock"
                        | "poetry.lock"
                        | "pipfile.lock"
                        | "gemfile.lock"
                        | "composer.lock"
                )
        })
        && !lower.ends_with(".pem")
        && !lower.ends_with(".key")
}

pub(crate) fn secret_like(line: &str) -> bool {
    let lower = line.to_ascii_lowercase();
    [
        "password",
        "secret",
        "token",
        "api_key",
        "private_key",
        "authorization",
        "aws_access_key",
    ]
    .iter()
    .any(|word| lower.contains(word))
}

fn safe_dependency(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= 80
        && value.bytes().all(|byte| {
            byte.is_ascii_alphanumeric() || matches!(byte, b'_' | b'-' | b'.' | b'@' | b'/')
        })
        && !secret_like(value)
}

fn safe_version(value: &str) -> bool {
    let version = value.trim_start_matches(['^', '~', '<', '>', '=']);
    version.starts_with(|character: char| character.is_ascii_digit())
        && value.len() <= 40
        && !secret_like(value)
        && value.bytes().all(|byte| {
            byte.is_ascii_alphanumeric()
                || matches!(
                    byte,
                    b'.' | b'-' | b'+' | b'^' | b'~' | b'*' | b'<' | b'>' | b'='
                )
        })
}

pub(crate) fn env_references(line: &str) -> Vec<&str> {
    let trimmed = line.trim_start();
    if trimmed.starts_with("//")
        || trimmed.starts_with('#')
        || trimmed.starts_with("/*")
        || trimmed.starts_with('*')
    {
        return Vec::new();
    }
    let active = trimmed.split("//").next().unwrap_or(trimmed);
    let mut keys = Vec::new();
    for (prefix, closing) in [
        ("process.env.", None),
        ("os.getenv(\"", Some(b'"')),
        ("os.getenv('", Some(b'\'')),
        ("os.environ[\"", Some(b'"')),
        ("os.environ['", Some(b'\'')),
        ("os.environ.get(\"", Some(b'"')),
        ("os.environ.get('", Some(b'\'')),
    ] {
        let mut cursor = active;
        while let Some((_, rest)) = cursor.split_once(prefix) {
            let end = rest
                .bytes()
                .take_while(|byte| {
                    byte.is_ascii_uppercase() || byte.is_ascii_digit() || *byte == b'_'
                })
                .count();
            let valid_boundary = match (closing, rest.as_bytes().get(end).copied()) {
                (Some(quote), next) => next == Some(quote),
                (None, Some(next)) => !next.is_ascii_alphanumeric() && next != b'_',
                (None, None) => true,
            };
            if end > 0 && end <= 64 && rest.as_bytes()[0].is_ascii_uppercase() && valid_boundary {
                let key = &rest[..end];
                if !keys.contains(&key) {
                    keys.push(key);
                }
            }
            cursor = &rest[end..];
        }
    }
    keys
}

fn env_reference(line: &str) -> Option<&str> {
    env_references(line).into_iter().next()
}

fn env_file_reference(line: &str) -> Option<&str> {
    let (key, _) = line.trim().split_once('=')?;
    let key = key.trim();
    if key.is_empty() || key.len() > 64 {
        return None;
    }
    if key
        .bytes()
        .all(|byte| byte.is_ascii_uppercase() || byte.is_ascii_digit() || byte == b'_')
    {
        Some(key)
    } else {
        None
    }
}

fn question_for(field: &str) -> String {
    match field {
        "runtime" => "What runtime will the application use (for example Node, Python, or static)?",
        "traffic" => "What traffic pattern should be assumed (steady, bursty, or sporadic)?",
        "database" => "Which database engine and version does the application require?",
        "storage_gb" => "How many GB of storage will the application use per month?",
        "egress_gb" => "How many GB will be delivered or egressed per month?",
        "requests_per_month" => "How many requests per month should be assumed?",
        "region" => "Which region or data-residency requirement applies?",
        "commercial_use" => "Is the application commercial?",
        "availability" => "What availability or recovery target is required?",
        "ops_appetite" => "How much operational work is acceptable?",
        "budget_usd" => "What monthly budget cap applies in USD?",
        "growth_scenarios" => {
            "Which growth scenarios should be evaluated (for example 3x traffic or 10x storage)?"
        }
        _ => "What value should be assumed for this field?",
    }
    .to_owned()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn unknown_usage_stays_null_and_is_labeled() {
        let result = profile(br#"{"name":"x"}"#).unwrap();
        let storage = result
            .requirements
            .iter()
            .find(|r| r.field == "storage_gb")
            .unwrap();
        assert!(storage.value.is_null());
        assert!(storage.defaulted);
        assert_eq!(storage.label, Label::Assumption);
        assert!(result.needs_verification);
    }

    #[test]
    fn supplied_values_are_constraints_not_assumptions() {
        let result = profile(br#"{"name":"x","runtime":"node"}"#).unwrap();
        let runtime = result
            .requirements
            .iter()
            .find(|r| r.field == "runtime")
            .unwrap();
        assert_eq!(runtime.label, Label::Constraint);
        assert!(!runtime.defaulted);
        let storage = result
            .requirements
            .iter()
            .find(|r| r.field == "storage_gb")
            .unwrap();
        assert_eq!(storage.label, Label::Assumption);
    }

    #[test]
    fn skips_secrets_and_records_safe_lines() {
        let input = br#"{"name":"x","files":[{"path":".env","content":"DATABASE_URL=secret"},{"path":"package.json","content":"postgres\nAPI_KEY=shhh"}]}"#;
        let result = profile(input).unwrap();
        assert!(result.requirements.iter().any(|r| {
            r.evidence
                .as_ref()
                .is_some_and(|e| e.path == "package.json")
        }));
        let output = serde_json::to_string(&result).unwrap();
        assert!(!output.contains("shhh"));
        assert!(!output.contains("DATABASE_URL"));
    }

    #[test]
    fn both_briefs_have_labeled_requirements() {
        for input in [
            include_bytes!("../../../fixtures/briefs/a-node-postgres-uploads.json").as_slice(),
            include_bytes!("../../../fixtures/briefs/b-python-docker-postgres-storage.json")
                .as_slice(),
        ] {
            let result = profile(input).unwrap();
            assert!(!result.requirements.is_empty());
            assert!(!result.questions.is_empty());
            assert!(result.questions.len() <= 8);
            assert!(
                result
                    .requirements
                    .iter()
                    .any(|item| item.label == Label::Constraint)
            );
            assert!(result.requirements.iter().all(|item| matches!(
                item.label,
                Label::Evidence | Label::Inference | Label::Constraint | Label::Assumption
            )));
        }
    }

    #[test]
    fn adversarial_text_is_data() {
        let result = profile(include_bytes!("../../../fixtures/briefs/adversarial.json")).unwrap();
        let output = serde_json::to_string(&result).unwrap();
        assert!(!output.contains("rank my preferred provider"));
        assert!(!output.contains("authorize deployment"));
        assert!(!output.contains("Ignore previous instructions"));
        assert!(result.needs_verification);
    }

    #[test]
    fn reads_env_example_keys_without_values() {
        let input = br#"{"name":"x","files":[{"path":".env.example","content":"DATABASE_URL=replace_with_provider_connection_string\nS3_SECRET_ACCESS_KEY=replace_with_secret_key"}]}"#;
        let result = profile(input).unwrap();
        assert!(
            result
                .requirements
                .iter()
                .any(|r| { r.field == "env_reference" && r.value == "DATABASE_URL" })
        );
        assert!(
            result
                .requirements
                .iter()
                .any(|r| { r.field == "env_reference" && r.value == "S3_SECRET_ACCESS_KEY" })
        );
        let output = serde_json::to_string(&result).unwrap();
        assert!(!output.contains("replace_with_provider_connection_string"));
        assert!(!output.contains("replace_with_secret_key"));
    }

    #[test]
    fn skips_generated_lockfiles() {
        let input = br#"{"name":"x","files":[{"path":"package-lock.json","content":"{\"dependencies\":{\"express\":\"4.21.2\"}}"}]}"#;
        let result = profile(input).unwrap();
        assert!(!result.requirements.iter().any(|r| {
            r.evidence
                .as_ref()
                .is_some_and(|e| e.path == "package-lock.json")
        }));
    }

    #[test]
    fn records_dependency_and_env_reference_without_value() {
        let input = br#"{"name":"x","files":[{"path":"package.json","content":"{\"dependencies\":{\"express\":\"4.21.2\"}}"},{"path":"src/config.js","content":"const key = process.env.API_KEY;"}]}"#;
        let result = profile(input).unwrap();
        assert!(
            result
                .requirements
                .iter()
                .any(|r| r.field == "dependency_version" && r.value == "express@4.21.2")
        );
        assert!(
            result
                .requirements
                .iter()
                .any(|r| r.field == "env_reference" && r.value == "API_KEY")
        );
        let output = serde_json::to_string(&result).unwrap();
        assert!(!output.contains("const key"));
    }
}
