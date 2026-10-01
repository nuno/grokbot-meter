import { createDecipheriv } from "crypto";

const V10_PREFIX = Buffer.from("v10");

/** macOS Chromium safeStorage: `v10` + AES-128-CBC, IV of 16 spaces. */
export function decryptSafeStorage(b64: string, key: Buffer): string | null {
  let data: Buffer;
  try {
    data = Buffer.from(b64.trim(), "base64");
    if (data.length === 0) data = Buffer.from(b64.trim(), "base64url");
  } catch {
    return null;
  }
  if (!data.subarray(0, 3).equals(V10_PREFIX)) return null;
  data = data.subarray(3);
  if (data.length === 0 || data.length % 16 !== 0) return null;
  try {
    const iv = Buffer.alloc(16, 32); // 16 spaces
    const dec = createDecipheriv("aes-128-cbc", key, iv);
    dec.setAutoPadding(true);
    const out = Buffer.concat([dec.update(data), dec.final()]);
    const s = out.toString("utf8").trim();
    return s || null;
  } catch {
    return null;
  }
}
