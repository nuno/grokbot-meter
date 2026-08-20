use chrono::DateTime;
use serde::Serialize;
use serde_json::Value;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{Duration, Instant};

const CACHE_TTL: Duration = Duration::from_secs(60);
const HTTP_TIMEOUT: Duration = Duration::from_secs(12);
const USAGE_URL: &str =
    "https://api2.cursor.sh/aiserver.v1.DashboardService/GetSandUsageStatus";
const TOKEN_URL: &str = "https://api2.cursor.sh/oauth/token";
const OAUTH_CLIENT_ID: &str = "KbZUR41cY7W6zRSdpSUJ7I7mLYBKOCmB";
const SECOND_MS_THRESHOLD: i64 = 100_000_000_000;
const WEEK_MS: i64 = 7 * 24 * 60 * 60 * 1000;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WeeklyStatus {
    pub signed_in: bool,
    pub included_limit_zero: bool,
    pub usage_percent: Option<f64>,
    pub next_reset_at: Option<i64>,
    pub current_period_start: Option<String>,
    pub upgrade_label: Option<String>,
    pub sand_trial: bool,
    pub sand_trial_expires_at: Option<i64>,
    pub has_non_zero_included_limit: Option<bool>,
    pub has_available_usage: Option<bool>,
    pub error: Option<String>,
}

struct Tokens {
    access: Option<String>,
    refresh: Option<String>,
}

struct CacheEntry {
    fetched_at: Instant,
    status: WeeklyStatus,
}

static CACHE: Mutex<Option<CacheEntry>> = Mutex::new(None);

pub fn status() -> WeeklyStatus {
    {
        let cache = CACHE.lock().unwrap_or_else(|e| e.into_inner());
        if let Some(entry) = cache.as_ref() {
            if entry.fetched_at.elapsed() < CACHE_TTL {
                return entry.status.clone();
            }
        }
    }
    let fresh = fetch_status();
    let mut cache = CACHE.lock().unwrap_or_else(|e| e.into_inner());
    *cache = Some(CacheEntry {
        fetched_at: Instant::now(),
        status: fresh.clone(),
    });
    fresh
}

fn fetch_status() -> WeeklyStatus {
    let mut tokens = load_tokens();

    if !tokens.access.as_deref().is_some_and(looks_like_jwt) {
        match tokens.refresh.as_deref().filter(|r| !r.is_empty()) {
            Some(refresh) => match refresh_access(refresh) {
                RefreshOutcome::Access(new_access) => tokens.access = Some(new_access),
                RefreshOutcome::SignedOut => return signed_out(None),
                RefreshOutcome::Failed => return signed_out(None),
            },
            None => return signed_out(None),
        }
    }

    let Some(access) = tokens
        .access
        .as_deref()
        .filter(|t| looks_like_jwt(t))
        .map(str::to_string)
    else {
        return signed_out(None);
    };

    match call_usage(&access) {
        UsageCall::Ok(value) => parse_usage(value),
        UsageCall::Unauthorized => {
            let Some(refresh) = tokens.refresh.as_deref().filter(|r| !r.is_empty()) else {
                return signed_out(None);
            };
            match refresh_access(refresh) {
                RefreshOutcome::Access(new_access) => match call_usage(&new_access) {
                    UsageCall::Ok(value) => parse_usage(value),
                    UsageCall::Unauthorized => signed_out(None),
                    UsageCall::Failed(err) => err_status(true, err),
                },
                RefreshOutcome::SignedOut => signed_out(None),
                RefreshOutcome::Failed => signed_out(None),
            }
        }
        UsageCall::Failed(err) => err_status(true, err),
    }
}

fn empty_status() -> WeeklyStatus {
    WeeklyStatus {
        signed_in: false,
        included_limit_zero: false,
        usage_percent: None,
        next_reset_at: None,
        current_period_start: None,
        upgrade_label: None,
        sand_trial: false,
        sand_trial_expires_at: None,
        has_non_zero_included_limit: None,
        has_available_usage: None,
        error: None,
    }
}

fn signed_out(error: Option<String>) -> WeeklyStatus {
    let mut s = empty_status();
    s.error = error;
    s
}

fn err_status(signed_in: bool, error: String) -> WeeklyStatus {
    let mut s = empty_status();
    s.signed_in = signed_in;
    s.error = Some(sanitize_error(&error));
    s
}

enum UsageCall {
    Ok(Value),
    Unauthorized,
    Failed(String),
}

enum RefreshOutcome {
    Access(String),
    SignedOut,
    Failed,
}

fn http_agent() -> ureq::Agent {
    ureq::AgentBuilder::new().timeout(HTTP_TIMEOUT).build()
}

fn call_usage(access: &str) -> UsageCall {
    let auth = format!("Bearer {access}");
    let result = http_agent()
        .post(USAGE_URL)
        .set("Authorization", &auth)
        .set("Content-Type", "application/json")
        .set("Connect-Protocol-Version", "1")
        .send_string("{}");
    match result {
        Ok(resp) => read_json_response(resp),
        Err(ureq::Error::Status(401, _)) => UsageCall::Unauthorized,
        Err(ureq::Error::Status(status, _)) => {
            UsageCall::Failed(format!("usage request failed (HTTP {status})"))
        }
        Err(_) => UsageCall::Failed("network error".to_string()),
    }
}

fn read_json_response(resp: ureq::Response) -> UsageCall {
    let status = resp.status();
    if status == 401 {
        return UsageCall::Unauthorized;
    }
    if !(200..300).contains(&status) {
        return UsageCall::Failed(format!("usage request failed (HTTP {status})"));
    }
    match resp.into_string() {
        Ok(body) => match serde_json::from_str::<Value>(&body) {
            Ok(value) => UsageCall::Ok(value),
            Err(_) => UsageCall::Failed("unexpected usage response".to_string()),
        },
        Err(_) => UsageCall::Failed("unexpected usage response".to_string()),
    }
}

fn refresh_access(refresh: &str) -> RefreshOutcome {
    let body = serde_json::json!({
        "grant_type": "refresh_token",
        "client_id": OAUTH_CLIENT_ID,
        "refresh_token": refresh,
    })
    .to_string();
    let result = http_agent()
        .post(TOKEN_URL)
        .set("Content-Type", "application/json")
        .send_string(&body);
    match result {
        Ok(resp) => parse_refresh_response(resp),
        Err(ureq::Error::Status(401, _)) => RefreshOutcome::SignedOut,
        Err(ureq::Error::Status(_, _)) => RefreshOutcome::Failed,
        Err(_) => RefreshOutcome::Failed,
    }
}

fn parse_refresh_response(resp: ureq::Response) -> RefreshOutcome {
    let status = resp.status();
    match resp.into_string() {
        Ok(body) => match serde_json::from_str::<Value>(&body) {
            Ok(v) => parse_refresh_json(v, status),
            Err(_) => RefreshOutcome::Failed,
        },
        Err(_) => RefreshOutcome::Failed,
    }
}

fn parse_refresh_json(v: Value, http_status: u16) -> RefreshOutcome {
    if json_bool(&v, "shouldLogout", "should_logout").unwrap_or(false) {
        return RefreshOutcome::SignedOut;
    }
    if http_status == 401 {
        return RefreshOutcome::SignedOut;
    }
    if !(200..300).contains(&http_status) {
        return RefreshOutcome::Failed;
    }
    match json_str(&v, "access_token", "accessToken")
        .map(str::to_string)
        .filter(|t| looks_like_jwt(t))
    {
        Some(token) => RefreshOutcome::Access(token),
        None => RefreshOutcome::SignedOut,
    }
}

fn parse_usage(v: Value) -> WeeklyStatus {
    let included_limit_zero =
        json_bool(&v, "includedLimitZero", "included_limit_zero").unwrap_or(false);
    let has_non_zero_included_limit =
        json_bool(&v, "hasNonZeroIncludedLimit", "has_non_zero_included_limit");
    let has_available_usage = json_bool(&v, "hasAvailableUsage", "has_available_usage");

    // Only surface a meter when the RPC actually sent usagePercent.
    // Missing percent + includedLimitZero is an empty plan, not 0% used.
    let usage_percent = json_f64(&v, "usagePercent", "usage_percent");

    let current_period_start = json_str(&v, "currentPeriodStart", "current_period_start")
        .map(str::to_string)
        .or_else(|| {
            v.get("currentPeriodStart")
                .or_else(|| v.get("current_period_start"))
                .and_then(value_to_string)
        });

    let mut next_reset_at = v
        .get("nextResetTimestampUtc")
        .or_else(|| v.get("next_reset_timestamp_utc"))
        .and_then(parse_timestamp_ms);

    let sand_trial_expires_at = v
        .get("sandTrialExpiresAt")
        .or_else(|| v.get("sand_trial_expires_at"))
        .and_then(parse_timestamp_ms);
    let sand_trial = sand_trial_expires_at
        .map(|ms| ms > chrono::Utc::now().timestamp_millis())
        .unwrap_or(false);

    if next_reset_at.is_none() && (usage_percent.is_some() || sand_trial) {
        if let Some(start) = current_period_start.as_deref().and_then(parse_rfc3339_ms) {
            next_reset_at = Some(start + WEEK_MS);
        } else if let Some(start) = v
            .get("currentPeriodStart")
            .or_else(|| v.get("current_period_start"))
            .and_then(parse_timestamp_ms)
        {
            next_reset_at = Some(start + WEEK_MS);
        } else if let Some(expires) = sand_trial_expires_at {
            next_reset_at = Some(expires);
        }
    }

    WeeklyStatus {
        signed_in: true,
        included_limit_zero,
        usage_percent,
        next_reset_at,
        current_period_start,
        upgrade_label: upgrade_label(&v),
        sand_trial,
        sand_trial_expires_at,
        has_non_zero_included_limit,
        has_available_usage,
        error: None,
    }
}

fn upgrade_label(v: &Value) -> Option<String> {
    cta_label(
        v.get("upgradeRecommendation")
            .or_else(|| v.get("upgrade_recommendation")),
    )
    .or_else(|| {
        v.get("upgradeRecommendations")
            .or_else(|| v.get("upgrade_recommendations"))
            .and_then(|a| a.as_array())
            .and_then(|arr| arr.first())
            .and_then(|item| cta_label(Some(item)))
    })
}

fn cta_label(rec: Option<&Value>) -> Option<String> {
    rec.and_then(|r| r.get("cta"))
        .and_then(|cta| cta.get("label"))
        .and_then(|l| l.as_str())
        .map(str::to_string)
        .filter(|s| !s.is_empty())
}

fn parse_timestamp_ms(v: &Value) -> Option<i64> {
    match v {
        Value::String(s) => parse_rfc3339_ms(s).or_else(|| s.parse::<i64>().ok().map(normalize_epoch)),
        Value::Number(n) => n
            .as_i64()
            .or_else(|| n.as_f64().map(|f| f as i64))
            .map(normalize_epoch),
        _ => None,
    }
}

fn parse_rfc3339_ms(s: &str) -> Option<i64> {
    DateTime::parse_from_rfc3339(s)
        .ok()
        .map(|dt| dt.timestamp_millis())
}

fn normalize_epoch(n: i64) -> i64 {
    if n.abs() >= SECOND_MS_THRESHOLD {
        n
    } else {
        n.saturating_mul(1000)
    }
}

fn value_to_string(v: &Value) -> Option<String> {
    match v {
        Value::String(s) => Some(s.clone()),
        Value::Number(n) => Some(n.to_string()),
        _ => None,
    }
}

fn json_bool(v: &Value, camel: &str, snake: &str) -> Option<bool> {
    v.get(camel)
        .or_else(|| v.get(snake))
        .and_then(|x| x.as_bool().or_else(|| x.as_i64().map(|n| n != 0)))
}

fn json_str<'a>(v: &'a Value, camel: &str, snake: &str) -> Option<&'a str> {
    v.get(camel)
        .or_else(|| v.get(snake))
        .and_then(Value::as_str)
}

fn json_f64(v: &Value, camel: &str, snake: &str) -> Option<f64> {
    v.get(camel).or_else(|| v.get(snake)).and_then(|x| {
        x.as_f64()
            .or_else(|| x.as_i64().map(|n| n as f64))
            .or_else(|| x.as_str().and_then(|s| s.parse().ok()))
    })
}

fn looks_like_jwt(token: &str) -> bool {
    let t = token.trim();
    if t.len() < 24 {
        return false;
    }
    let mut parts = t.split('.');
    let Some(a) = parts.next() else { return false };
    let Some(b) = parts.next() else { return false };
    let Some(c) = parts.next() else { return false };
    if parts.next().is_some() || a.is_empty() || b.is_empty() || c.is_empty() {
        return false;
    }
    t.bytes().all(|ch| {
        ch.is_ascii_alphanumeric() || matches!(ch, b'.' | b'-' | b'_' | b'+' | b'/' | b'=')
    })
}

fn sanitize_error(msg: &str) -> String {
    let mut out = Vec::new();
    for raw in msg.split_whitespace() {
        let cleaned = raw.trim_matches(|c: char| c == '"' || c == '\'' || c == ',');
        let lower = cleaned.to_ascii_lowercase();
        if looks_like_jwt(cleaned)
            || lower.contains("bearer")
            || lower.contains("authorization")
            || (cleaned.len() > 40
                && cleaned.bytes().all(|b| {
                    b.is_ascii_alphanumeric()
                        || matches!(b, b'-' | b'_' | b'.' | b'+' | b'/' | b'=')
                }))
        {
            out.push("[redacted]");
        } else {
            out.push(raw);
        }
    }
    let s = out.join(" ");
    let s = if s.chars().count() > 160 {
        format!("{}…", s.chars().take(160).collect::<String>())
    } else {
        s
    };
    if s.is_empty() {
        "usage request failed".to_string()
    } else {
        s
    }
}

fn home_dir() -> PathBuf {
    std::env::var_os("HOME")
        .or_else(|| std::env::var_os("USERPROFILE"))
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("."))
}

fn load_tokens() -> Tokens {
    let mut tokens = Tokens {
        access: None,
        refresh: None,
    };

    for path in cursor_vscdb_paths() {
        if !path.is_file() {
            continue;
        }
        if let Some(access) = read_vscdb_item(&path, "cursorAuth/accessToken") {
            accept_access(&mut tokens.access, access);
        }
        if tokens.refresh.is_none() {
            if let Some(refresh) = read_vscdb_item(&path, "cursorAuth/refreshToken") {
                if !refresh.is_empty() {
                    tokens.refresh = Some(refresh);
                }
            }
        }
        if tokens.access.as_deref().is_some_and(looks_like_jwt) {
            return tokens;
        }
    }

    for path in sand_secrets_paths() {
        if !path.is_file() {
            continue;
        }
        let Ok(bytes) = fs::read(&path) else { continue };
        let Ok(value) = serde_json::from_slice::<Value>(&bytes) else {
            continue;
        };
        if let Some(access) =
            json_str(&value, "cursor-access-token", "cursorAccessToken").map(normalize_secret)
        {
            accept_access(&mut tokens.access, access);
        }
        if tokens.refresh.is_none() {
            if let Some(refresh) = json_str(&value, "cursor-refresh-token", "cursorRefreshToken")
                .map(normalize_secret)
                .filter(|s| !s.is_empty())
            {
                tokens.refresh = Some(refresh);
            }
        }
        if tokens.access.as_deref().is_some_and(looks_like_jwt) {
            break;
        }
    }

    tokens
}

fn accept_access(slot: &mut Option<String>, candidate: String) {
    let candidate = normalize_secret(&candidate);
    if looks_like_jwt(&candidate) {
        *slot = Some(candidate);
    }
}

fn normalize_secret(raw: &str) -> String {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return String::new();
    }
    if let Ok(s) = serde_json::from_str::<String>(trimmed) {
        return s.trim().to_string();
    }
    if trimmed.starts_with('"') && trimmed.ends_with('"') && trimmed.len() >= 2 {
        return trimmed[1..trimmed.len() - 1]
            .replace("\\\"", "\"")
            .trim()
            .to_string();
    }
    trimmed.to_string()
}

fn cursor_vscdb_paths() -> Vec<PathBuf> {
    let home = home_dir();
    let mut paths = vec![
        home.join("Library/Application Support/Cursor/User/globalStorage/state.vscdb"),
        home.join(".config/Cursor/User/globalStorage/state.vscdb"),
    ];
    if let Some(appdata) = std::env::var_os("APPDATA") {
        paths.push(PathBuf::from(appdata).join("Cursor/User/globalStorage/state.vscdb"));
    }
    if let Some(xdg) = std::env::var_os("XDG_CONFIG_HOME") {
        paths.push(PathBuf::from(xdg).join("Cursor/User/globalStorage/state.vscdb"));
    }
    paths
}

fn sand_secrets_paths() -> Vec<PathBuf> {
    let home = home_dir();
    vec![
        home.join("Library/Application Support/Grok Bot/sand-secrets.json"),
        home.join(".config/Grok Bot/sand-secrets.json"),
        home.join(".grokbot/sand-secrets.json"),
        home.join(
            "Library/Application Support/Grok Bot/sand-client-persistence/sand-secrets.json",
        ),
        home.join(".config/Grok Bot/sand-client-persistence/sand-secrets.json"),
    ]
}

fn read_vscdb_item(path: &Path, key: &str) -> Option<String> {
    let conn = rusqlite::Connection::open_with_flags(
        path,
        rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY,
    )
    .ok()?;
    let _ = conn.busy_timeout(Duration::from_millis(400));
    let _ = conn.execute_batch("PRAGMA query_only = ON;");
    let raw: Vec<u8> = conn
        .query_row("SELECT value FROM ItemTable WHERE key = ?1", [key], |row| {
            row.get(0)
        })
        .ok()?;
    let s = String::from_utf8(raw).ok()?;
    let s = normalize_secret(&s);
    if s.is_empty() {
        None
    } else {
        Some(s)
    }
}
