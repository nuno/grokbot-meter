use chrono::{DateTime, Local, NaiveDate};
use serde::Serialize;
use serde_json::Value;
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

const MAX_BLOB_BYTES: u64 = 8 * 1024 * 1024;
const SECOND_MS_THRESHOLD: i64 = 100_000_000_000;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GrokAgent {
    pub id: String,
    pub name: String,
    pub title: String,
    pub last_activity_at: i64,
    pub today_messages: u32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GrokStatus {
    pub found: bool,
    pub paths: Vec<String>,
    pub agent_count: u32,
    pub today_agent_count: u32,
    pub today_message_count: u32,
    pub agents: Vec<GrokAgent>,
}

pub fn candidate_dirs() -> Vec<PathBuf> {
    let home = std::env::var_os("HOME")
        .or_else(|| std::env::var_os("USERPROFILE"))
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("."));

    vec![
        home.join("Library/Application Support/Grok Bot/sand-client-persistence"),
        home.join(".config/Grok Bot/sand-client-persistence"),
        home.join(".grokbot"),
    ]
}

fn is_persistence_dir(path: &Path) -> bool {
    path.file_name()
        .and_then(|n| n.to_str())
        .is_some_and(|n| n == "sand-client-persistence")
}

pub fn status() -> GrokStatus {
    let mut paths = Vec::new();
    let mut persistence_exists = false;
    let mut agents: HashMap<String, GrokAgent> = HashMap::new();
    let today = Local::now().date_naive();

    for dir in candidate_dirs() {
        if !dir.is_dir() {
            continue;
        }
        if is_persistence_dir(&dir) {
            persistence_exists = true;
        }
        paths.push(dir.display().to_string());
        ingest_dir(&dir, today, &mut agents);
    }

    let mut agents: Vec<GrokAgent> = agents.into_values().collect();
    agents.sort_by(|a, b| {
        b.last_activity_at
            .cmp(&a.last_activity_at)
            .then_with(|| a.name.cmp(&b.name))
            .then_with(|| a.id.cmp(&b.id))
    });

    let today_message_count: u32 = agents.iter().map(|a| a.today_messages).sum();
    let today_agent_count = agents.iter().filter(|a| a.today_messages > 0).count() as u32;
    let agent_count = agents.len() as u32;
    let found = persistence_exists || agent_count > 0;

    GrokStatus {
        found,
        paths,
        agent_count,
        today_agent_count,
        today_message_count,
        agents,
    }
}

fn ingest_dir(dir: &Path, today: NaiveDate, agents: &mut HashMap<String, GrokAgent>) {
    let Ok(entries) = fs::read_dir(dir) else {
        return;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) != Some("blob") {
            continue;
        }
        ingest_blob(&path, today, agents);
    }
}

fn ingest_blob(path: &Path, today: NaiveDate, agents: &mut HashMap<String, GrokAgent>) {
    let Ok(meta) = fs::metadata(path) else {
        return;
    };
    if !meta.is_file() || meta.len() > MAX_BLOB_BYTES {
        return;
    }
    let Some(stem) = path.file_stem().and_then(|s| s.to_str()) else {
        return;
    };
    let Some(key) = decode_base32_utf8(stem) else {
        return;
    };
    let is_roster = key.contains(".roster.last-roster");
    let transcript_id = key
        .split(".transcript.replicas.")
        .nth(1)
        .filter(|id| !id.is_empty());
    if !is_roster && transcript_id.is_none() {
        return;
    }
    let Ok(bytes) = fs::read(path) else {
        return;
    };
    let Ok(value) = serde_json::from_slice::<Value>(&bytes) else {
        return;
    };
    if is_roster {
        apply_roster(&value, agents);
    }
    if let Some(id) = transcript_id {
        apply_transcript(id, &value, today, agents);
    }
}

fn apply_roster(root: &Value, agents: &mut HashMap<String, GrokAgent>) {
    let Some(rows) = root.get("value").and_then(|v| v.get("rows")).and_then(Value::as_array) else {
        return;
    };
    for row in rows {
        let Some(id) = row.get("id").and_then(Value::as_str).filter(|s| !s.is_empty()) else {
            continue;
        };
        let name = row
            .get("name")
            .and_then(Value::as_str)
            .unwrap_or("")
            .to_string();
        let title = row
            .get("title")
            .and_then(Value::as_str)
            .unwrap_or("")
            .to_string();
        let last = json_i64(row.get("lastActivityAt"))
            .or_else(|| json_i64(row.get("updatedAt")))
            .or_else(|| json_i64(row.get("createdAt")))
            .map(normalize_ts)
            .unwrap_or(0);

        let entry = agents.entry(id.to_string()).or_insert_with(|| GrokAgent {
            id: id.to_string(),
            name: String::new(),
            title: String::new(),
            last_activity_at: 0,
            today_messages: 0,
        });
        if !name.is_empty() {
            entry.name = name;
        }
        if !title.is_empty() {
            entry.title = title;
        }
        if last > entry.last_activity_at {
            entry.last_activity_at = last;
        }
    }
}

fn apply_transcript(
    agent_id: &str,
    root: &Value,
    today: NaiveDate,
    agents: &mut HashMap<String, GrokAgent>,
) {
    let value = root.get("value").unwrap_or(root);
    let entries = value.get("entries").and_then(Value::as_array);
    let mut today_messages = 0u32;
    let mut latest_message = 0i64;

    if let Some(entries) = entries {
        for entry in entries {
            if entry.get("kind").and_then(Value::as_str) != Some("message") {
                continue;
            }
            let Some(ts) = json_i64(entry.get("timestampMs"))
                .or_else(|| json_i64(entry.get("timestamp")))
                .map(normalize_ts)
            else {
                continue;
            };
            if ts > latest_message {
                latest_message = ts;
            }
            if is_local_today(ts, today) {
                today_messages = today_messages.saturating_add(1);
            }
        }
    }

    if today_messages == 0 && latest_message == 0 && !agents.contains_key(agent_id) {
        return;
    }

    let entry = agents
        .entry(agent_id.to_string())
        .or_insert_with(|| GrokAgent {
            id: agent_id.to_string(),
            name: String::new(),
            title: String::new(),
            last_activity_at: 0,
            today_messages: 0,
        });
    entry.today_messages = entry.today_messages.saturating_add(today_messages);
    if latest_message > entry.last_activity_at {
        entry.last_activity_at = latest_message;
    }
}

fn json_i64(value: Option<&Value>) -> Option<i64> {
    match value? {
        Value::Number(n) => n
            .as_i64()
            .or_else(|| n.as_u64().and_then(|v| i64::try_from(v).ok()))
            .or_else(|| n.as_f64().map(|v| v as i64)),
        Value::String(s) => s.parse().ok(),
        _ => None,
    }
}

fn normalize_ts(ts: i64) -> i64 {
    if ts > 0 && ts < SECOND_MS_THRESHOLD {
        ts.saturating_mul(1000)
    } else {
        ts
    }
}

fn is_local_today(ts_ms: i64, today: NaiveDate) -> bool {
    DateTime::from_timestamp_millis(ts_ms)
        .map(|dt| dt.with_timezone(&Local).date_naive() == today)
        .unwrap_or(false)
}

/// RFC 4648 base32 (A–Z2–7), case-insensitive, `=` padding optional.
fn decode_base32(input: &str) -> Option<Vec<u8>> {
    let mut buf = 0u64;
    let mut bits = 0u32;
    let mut out = Vec::with_capacity(input.len() * 5 / 8 + 1);
    for b in input.as_bytes() {
        if *b == b'=' {
            continue;
        }
        let v = match b {
            b'A'..=b'Z' => b - b'A',
            b'a'..=b'z' => b - b'a',
            b'2'..=b'7' => 26 + (b - b'2'),
            _ => return None,
        } as u64;
        buf = (buf << 5) | v;
        bits += 5;
        if bits >= 8 {
            bits -= 8;
            out.push((buf >> bits) as u8);
            buf &= (1u64 << bits) - 1;
        }
    }
    Some(out)
}

fn decode_base32_utf8(input: &str) -> Option<String> {
    String::from_utf8(decode_base32(input)?).ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn base32_decodes_live_client_meta_key() {
        let stem = "onqw4zbomnwgszlooqxhg3djmnss4y3mnfsw45bnnvsxiyjomfrwg33vnz2c243mn52a";
        assert_eq!(
            decode_base32_utf8(stem).as_deref(),
            Some("sand.client.slice.client-meta.account-slot")
        );
    }

    #[test]
    fn base32_accepts_padding_and_uppercase() {
        let key = "sand.client.slice.account.x.roster.last-roster";
        let encoded = encode_base32(key.as_bytes());
        assert_eq!(decode_base32_utf8(&encoded).as_deref(), Some(key));
        assert_eq!(
            decode_base32_utf8(&encoded.to_ascii_lowercase()).as_deref(),
            Some(key)
        );
        let stripped: String = encoded.chars().filter(|c| *c != '=').collect();
        assert_eq!(decode_base32_utf8(&stripped).as_deref(), Some(key));
    }

    #[test]
    fn normalize_seconds_vs_millis() {
        assert_eq!(normalize_ts(1_787_227_286), 1_787_227_286_000);
        assert_eq!(normalize_ts(1_787_227_286_780), 1_787_227_286_780);
        assert_eq!(normalize_ts(0), 0);
    }

    #[test]
    fn roster_and_transcript_merge() {
        let mut agents = HashMap::new();
        let roster = serde_json::json!({
            "schemaVersion": 2,
            "value": {
                "rows": [{
                    "id": "agent-1",
                    "name": "lead senior grok bot",
                    "title": "CodexBar for Grok Bot",
                    "createdAt": 1787227286780i64,
                    "updatedAt": 1787229944036i64,
                    "lastActivityAt": 1787229944036i64,
                    "unreadCount": 0
                }]
            }
        });
        apply_roster(&roster, &mut agents);

        let today = DateTime::from_timestamp_millis(1_787_229_944_036)
            .unwrap()
            .with_timezone(&Local)
            .date_naive();
        let transcript = serde_json::json!({
            "schemaVersion": 1,
            "value": {
                "entries": [
                    {"kind": "send-message", "timestampMs": 1787229944036i64},
                    {"kind": "message", "timestampMs": 1787229944036i64},
                    {"kind": "message", "timestamp": 1_787_229_944i64}
                ],
                "persistedAt": 1787230009128i64
            }
        });
        apply_transcript("agent-1", &transcript, today, &mut agents);

        let agent = agents.get("agent-1").unwrap();
        assert_eq!(agent.name, "lead senior grok bot");
        assert_eq!(agent.title, "CodexBar for Grok Bot");
        assert_eq!(agent.today_messages, 2);
        assert!(agent.last_activity_at >= 1_787_229_944_036);
    }

    fn encode_base32(input: &[u8]) -> String {
        const ALPH: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        let mut buf = 0u64;
        let mut bits = 0u32;
        let mut out = String::new();
        for &b in input {
            buf = (buf << 8) | b as u64;
            bits += 8;
            while bits >= 5 {
                bits -= 5;
                out.push(ALPH[((buf >> bits) & 31) as usize] as char);
            }
        }
        if bits > 0 {
            out.push(ALPH[((buf << (5 - bits)) & 31) as usize] as char);
        }
        while out.len() % 8 != 0 {
            out.push('=');
        }
        out
    }
}
