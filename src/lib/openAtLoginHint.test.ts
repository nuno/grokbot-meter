import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { openAtLoginHint } from "./openAtLoginHint.ts";

const MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
const WINDOWS = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

describe("openAtLoginHint", () => {
  it("keeps the Mac strings", () => {
    assert.equal(openAtLoginHint(true, true, MAC), "Launch GrokBot Meter when you sign in to this Mac.");
    assert.equal(openAtLoginHint(false, false, MAC), "Launch GrokBot Meter when you sign in to this Mac.");
    assert.equal(openAtLoginHint(false, true, MAC), "macOS only.");
  });

  it("enables the Windows hint when login items are supported", () => {
    assert.equal(
      openAtLoginHint(true, true, WINDOWS),
      "Launch GrokBot Meter when you sign in to Windows.",
    );
    assert.equal(
      openAtLoginHint(false, false, WINDOWS),
      "Launch GrokBot Meter when you sign in to Windows.",
    );
  });

  it("keeps the Windows unsupported hint when the platform reports off", () => {
    assert.equal(openAtLoginHint(false, true, WINDOWS), "Not available on Windows yet.");
  });
});
