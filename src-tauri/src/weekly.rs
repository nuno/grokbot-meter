use chrono::DateTime;
use serde::Serialize;
use serde_json::Value;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::{Duration, Instant};

const CACHE_TTL: Duration = Duration::from_secs(60);
const HTTP_TIMEOUT: Duration = Duration::from_secs(12);
const USAGE_URL: &str =
    "https://api2.cursor.sh/aiserver.v1.DashboardService/GetSandUsageStatus";
const ME_URL: &str = "https://api2.cursor.sh/aiserver.v1.DashboardService/GetMe";
const TOKEN_URL: &str = "https://api2.cursor.sh/oauth/token";
const OAUTH_CLIENT_ID: &str = "KbZUR41cY7W6zRSdpSUJ7I7mLYBKOCmB";
const SECOND_MS_THRESHOLD: i64 = 100_000_000_000;
const WEEK_MS: i64 = 7 * 24 * 60 * 60 * 1000;
const PBKDF2_SALT: &[u8] = b"saltysalt";
const PBKDF2_ITERS: u32 = 1003;
const V10_PREFIX: &[u8] = b"v10";
#[cfg(target_os = "macos")]
const SAFE_STORAGE_SERVICE: &str = "Grok Bot Safe Storage";
#[cfg(target_os = "macos")]
const SAFE_STORAGE_ACCOUNT: &str = "Grok Bot Key";

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
    pub account_email: Option<String>,
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
static CRYPT_KEY: Mutex<Option<[u8; 16]>> = Mutex::new(None);

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
        UsageCall::Ok(value) => with_account_email(parse_usage(value), &access),
        UsageCall::Unauthorized => {
            let Some(refresh) = tokens.refresh.as_deref().filter(|r| !r.is_empty()) else {
                return signed_out(None);
            };
            match refresh_access(refresh) {
                RefreshOutcome::Access(new_access) => match call_usage(&new_access) {
                    UsageCall::Ok(value) => with_account_email(parse_usage(value), &new_access),
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
        account_email: None,
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

fn with_account_email(mut status: WeeklyStatus, access: &str) -> WeeklyStatus {
    status.account_email = fetch_account_email(access);
    status
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

fn fetch_account_email(access: &str) -> Option<String> {
    let auth = format!("Bearer {access}");
    let result = http_agent()
        .post(ME_URL)
        .set("Authorization", &auth)
        .set("Content-Type", "application/json")
        .set("Connect-Protocol-Version", "1")
        .send_string("{}");
    let resp = match result {
        Ok(resp) => resp,
        Err(_) => return None,
    };
    if !(200..300).contains(&resp.status()) {
        return None;
    }
    let body = resp.into_string().ok()?;
    let v: Value = serde_json::from_str(&body).ok()?;
    extract_account_label(&v)
}

fn extract_account_label(v: &Value) -> Option<String> {
    let from = |obj: &Value| {
        json_str(obj, "email", "Email")
            .or_else(|| json_str(obj, "userEmail", "user_email"))
            .or_else(|| json_str(obj, "displayName", "display_name"))
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .map(str::to_string)
    };
    from(v)
        .or_else(|| v.get("user").and_then(from))
        .or_else(|| v.get("me").and_then(from))
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
        account_email: None,
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
    let crypt_key = crypt_key();

    for path in sand_secrets_paths() {
        if !path.is_file() {
            continue;
        }
        let Ok(bytes) = fs::read(&path) else { continue };
        let Ok(value) = serde_json::from_slice::<Value>(&bytes) else {
            continue;
        };
        if !tokens.access.as_deref().is_some_and(looks_like_jwt) {
            if let Some(access) = json_str(&value, "cursor-access-token", "cursorAccessToken")
                .and_then(|raw| unwrap_secret(raw, crypt_key.as_ref()))
                .filter(|t| looks_like_jwt(t))
            {
                tokens.access = Some(access);
            }
        }
        if tokens.refresh.is_none() {
            if let Some(refresh) = json_str(&value, "cursor-refresh-token", "cursorRefreshToken")
                .and_then(|raw| unwrap_secret(raw, crypt_key.as_ref()))
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

fn unwrap_secret(raw: &str, key: Option<&[u8; 16]>) -> Option<String> {
    let trimmed = normalize_secret(raw);
    if trimmed.is_empty() {
        return None;
    }
    if let Some(plain) = trimmed.strip_prefix("plaintext:v1:") {
        let plain = plain.trim();
        return if plain.is_empty() {
            None
        } else {
            Some(plain.to_string())
        };
    }
    if let Some(rest) = trimmed.strip_prefix("scoped:v1:") {
        let ciphertext = rest.split_once(':')?.1;
        if ciphertext.is_empty() {
            return None;
        }
        return decrypt_safe_storage(ciphertext, key);
    }
    if looks_like_jwt(&trimmed) {
        return Some(trimmed);
    }
    decrypt_safe_storage(&trimmed, key)
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

fn decrypt_safe_storage(ciphertext_b64: &str, key: Option<&[u8; 16]>) -> Option<String> {
    let key = key?;
    let mut data = decode_b64(ciphertext_b64)?;
    if !data.starts_with(V10_PREFIX) {
        return None;
    }
    data.drain(..V10_PREFIX.len());
    if data.is_empty() || data.len() % 16 != 0 {
        return None;
    }
    let plain = aes128_cbc_decrypt(key, &data)?;
    let s = String::from_utf8(plain).ok()?;
    let s = s.trim();
    if s.is_empty() {
        None
    } else {
        Some(s.to_string())
    }
}

fn decode_b64(s: &str) -> Option<Vec<u8>> {
    use base64::Engine;
    let s = s.trim();
    base64::engine::general_purpose::STANDARD
        .decode(s)
        .ok()
        .or_else(|| {
            base64::engine::general_purpose::STANDARD_NO_PAD
                .decode(s)
                .ok()
        })
}

fn aes128_cbc_decrypt(key: &[u8; 16], ciphertext: &[u8]) -> Option<Vec<u8>> {
    use aes::cipher::{block_padding::Pkcs7, BlockDecryptMut, KeyIvInit};
    type Aes128CbcDec = cbc::Decryptor<aes::Aes128>;
    let iv = [b' '; 16];
    let mut buf = ciphertext.to_vec();
    Aes128CbcDec::new(key.into(), &iv.into())
        .decrypt_padded_mut::<Pkcs7>(&mut buf)
        .ok()
        .map(|pt| pt.to_vec())
}

fn crypt_key() -> Option<[u8; 16]> {
    {
        let cache = CRYPT_KEY.lock().unwrap_or_else(|e| e.into_inner());
        if let Some(key) = *cache {
            return Some(key);
        }
    }
    let secret = safe_storage_secret()?;
    let key = derive_crypt_key(&secret);
    let mut cache = CRYPT_KEY.lock().unwrap_or_else(|e| e.into_inner());
    *cache = Some(key);
    Some(key)
}

fn derive_crypt_key(password: &[u8]) -> [u8; 16] {
    use pbkdf2::pbkdf2_hmac;
    use sha1::Sha1;
    let mut key = [0u8; 16];
    pbkdf2_hmac::<Sha1>(password, PBKDF2_SALT, PBKDF2_ITERS, &mut key);
    key
}

/// Chromium/Electron safeStorage secret.
/// macOS: Keychain generic password via security-framework (no `security` CLI).
/// Other OS: stub (no libsecret/DPAPI yet). Never falls back to Cursor IDE.
fn safe_storage_secret() -> Option<Vec<u8>> {
    #[cfg(target_os = "macos")]
    {
        macos_safe_storage_secret()
    }
    #[cfg(not(target_os = "macos"))]
    {
        None
    }
}

#[cfg(target_os = "macos")]
fn macos_safe_storage_secret() -> Option<Vec<u8>> {
    use security_framework::passwords::get_generic_password;
    let bytes = get_generic_password(SAFE_STORAGE_SERVICE, SAFE_STORAGE_ACCOUNT).ok()?;
    if bytes.is_empty() {
        None
    } else {
        Some(bytes)
    }
}
