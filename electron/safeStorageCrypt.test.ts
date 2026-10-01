import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { describe, it } from "node:test";
import { createCipheriv, pbkdf2Sync, randomBytes } from "crypto";
import { decryptSafeStorage } from "./macSafeStorage.ts";
import {
  decodeDpapiStdout,
  decryptWindowsV10,
  dpapiPayload,
  dpapiUnprotectCurrentUser,
  readOsCryptKeyFromLocalState,
  readWindowsOsCryptKeyFromFile,
  WIN_OSCRYPT_KEY_LEN,
} from "./winSafeStorage.ts";

const FAKE_JWT = "eyJhbGciOiJub25lIn0.eyJzdWIiOiJtZXRlciJ9.e30";

function sealMac(plain: string, key: Buffer): string {
  const iv = Buffer.alloc(16, 0x20);
  const cipher = createCipheriv("aes-128-cbc", key, iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return Buffer.concat([Buffer.from("v10"), body]).toString("base64");
}

function sealWindows(plain: string, key: Buffer, nonce = randomBytes(12)): string {
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([Buffer.from("v10"), nonce, body, tag]).toString("base64");
}

describe("macOS safeStorage cipher", () => {
  it("decrypts v10 AES-128-CBC with the Keychain-derived key", () => {
    const key = pbkdf2Sync("keychain-secret", Buffer.from("saltysalt"), 1003, 16, "sha1");
    const blob = sealMac(FAKE_JWT, key);
    assert.equal(decryptSafeStorage(blob, key), FAKE_JWT);
  });

  it("does not decrypt a Windows AES-256-GCM blob", () => {
    const macKey = pbkdf2Sync("keychain-secret", Buffer.from("saltysalt"), 1003, 16, "sha1");
    const winKey = randomBytes(WIN_OSCRYPT_KEY_LEN);
    const blob = sealWindows(FAKE_JWT, winKey);
    assert.equal(decryptSafeStorage(blob, macKey), null);
    assert.equal(decryptSafeStorage(blob, winKey.subarray(0, 16)), null);
  });
});

describe("Windows v10 safeStorage cipher", () => {
  it("decrypts v10 AES-256-GCM", () => {
    const key = randomBytes(WIN_OSCRYPT_KEY_LEN);
    assert.equal(decryptWindowsV10(sealWindows(FAKE_JWT, key), key), FAKE_JWT);
  });

  it("rejects a tampered tag, a short key, and a macOS CBC blob", () => {
    const key = randomBytes(WIN_OSCRYPT_KEY_LEN);
    const blob = sealWindows(FAKE_JWT, key);
    const raw = Buffer.from(blob, "base64");
    raw[raw.length - 1] ^= 0xff;
    assert.equal(decryptWindowsV10(raw.toString("base64"), key), null);
    assert.equal(decryptWindowsV10(blob, key.subarray(0, 16)), null);
    const macKey = randomBytes(16);
    assert.equal(decryptWindowsV10(sealMac(FAKE_JWT, macKey), key), null);
  });
});

describe("Local State OSCrypt key", () => {
  it("unwraps a DPAPI-prefixed encrypted_key and ignores other prefixes", async () => {
    const key = randomBytes(WIN_OSCRYPT_KEY_LEN);
    const payload = Buffer.from("dpapi-ciphertext");
    const wrapped = Buffer.concat([Buffer.from("DPAPI"), payload]);
    let seen: Buffer | null = null;
    const got = await readOsCryptKeyFromLocalState(
      { os_crypt: { encrypted_key: wrapped.toString("base64") } },
      async (blob) => {
        seen = blob;
        return key;
      },
    );
    assert.equal(got?.equals(key), true);
    assert.equal(seen?.equals(payload), true);

    let called = false;
    const rejected = await readOsCryptKeyFromLocalState(
      { os_crypt: { encrypted_key: Buffer.from("APPBnot-dpapi").toString("base64") } },
      async () => {
        called = true;
        return key;
      },
    );
    assert.equal(rejected, null);
    assert.equal(called, false);
    assert.equal(dpapiPayload(Buffer.from("nope")), null);
  });

  it("rejects a key that is not 32 bytes", async () => {
    const wrapped = Buffer.concat([Buffer.from("DPAPI"), Buffer.from("x")]).toString("base64");
    const got = await readOsCryptKeyFromLocalState({ os_crypt: { encrypted_key: wrapped } }, async () =>
      Buffer.alloc(16),
    );
    assert.equal(got, null);
  });

  it("reads Local State from disk, including a UTF-8 BOM", async () => {
    const dir = mkdtempSync(join(tmpdir(), "grokbot-meter-"));
    try {
      const file = join(dir, "Local State");
      const key = randomBytes(WIN_OSCRYPT_KEY_LEN);
      const wrapped = Buffer.concat([Buffer.from("DPAPI"), Buffer.from("blob")]);
      writeFileSync(file, `\uFEFF${JSON.stringify({ os_crypt: { encrypted_key: wrapped.toString("base64") } })}`);
      const got = await readWindowsOsCryptKeyFromFile(file, async () => key);
      assert.equal(got?.equals(key), true);
      assert.equal(await readWindowsOsCryptKeyFromFile(join(dir, "missing"), async () => key), null);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("DPAPI stdout", () => {
  it("accepts utf8 and utf16 base64 and rejects CLIXML", () => {
    assert.equal(decodeDpapiStdout(Buffer.from("YWI=\r\n", "utf8")), "YWI=");
    assert.equal(decodeDpapiStdout(Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from("YWI=", "utf16le")])), "YWI=");
    assert.equal(decodeDpapiStdout(Buffer.from("YWI=", "utf16le")), "YWI=");
    assert.equal(decodeDpapiStdout(Buffer.from("#< CLIXML\r\n<Objs></Objs>", "utf8")), null);
    assert.equal(decodeDpapiStdout(Buffer.alloc(0)), null);
  });

  it("does not spawn off win32", async () => {
    if (process.platform === "win32") return;
    assert.equal(await dpapiUnprotectCurrentUser(Buffer.from("blob")), null);
  });
});
