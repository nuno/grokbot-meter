use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GrokStatus {
    pub found: bool,
    pub paths: Vec<String>,
    pub agent_count: u32,
}

pub fn candidate_dirs() -> Vec<PathBuf> {
    let home = std::env::var_os("HOME")
        .or_else(|| std::env::var_os("USERPROFILE"))
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("."));

    vec![
        home.join(".grokbot"),
        home.join("Library/Application Support/Grok Bot"),
        home.join("Library/Application Support/Grok Bot/sand-client-persistence"),
        home.join(".config/Grok Bot"),
    ]
}

pub fn status() -> GrokStatus {
    let mut paths = Vec::new();
    for dir in candidate_dirs() {
        if dir.is_dir() {
            paths.push(dir.display().to_string());
        }
    }
    let found = !paths.is_empty();
    let agent_count = count_agents(&paths);
    GrokStatus {
        found,
        paths,
        agent_count,
    }
}

fn count_agents(paths: &[String]) -> u32 {
    const NAMES: &[&str] = &["roster.json", "agents.json", "conversations.json"];
    let mut best = 0u32;
    for path in paths {
        let dir = Path::new(path);
        for name in NAMES {
            best = best.max(count_json_agents(&dir.join(name)));
        }
        let Ok(entries) = fs::read_dir(dir) else {
            continue;
        };
        for entry in entries.flatten() {
            let file = entry.path();
            if file.extension().and_then(|e| e.to_str()) != Some("json") {
                continue;
            }
            best = best.max(count_json_agents(&file));
        }
    }
    best
}

fn count_json_agents(path: &Path) -> u32 {
    let Ok(meta) = fs::metadata(path) else {
        return 0;
    };
    if !meta.is_file() || meta.len() > 2 * 1024 * 1024 {
        return 0;
    }
    let Ok(text) = fs::read_to_string(path) else {
        return 0;
    };
    let Ok(value) = serde_json::from_str::<serde_json::Value>(&text) else {
        return 0;
    };
    array_len_if_objects(&value).unwrap_or_else(|| {
        if let serde_json::Value::Object(map) = value {
            for key in ["agents", "roster", "items", "conversations"] {
                if let Some(inner) = map.get(key) {
                    if let Some(n) = array_len_if_objects(inner) {
                        return n;
                    }
                }
            }
        }
        0
    })
}

fn array_len_if_objects(value: &serde_json::Value) -> Option<u32> {
    match value {
        serde_json::Value::Array(items)
            if !items.is_empty() && items.iter().all(|v| v.is_object()) =>
        {
            Some(items.len() as u32)
        }
        _ => None,
    }
}
