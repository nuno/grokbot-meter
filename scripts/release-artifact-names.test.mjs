import assert from "node:assert/strict";
import test from "node:test";
import { isReleaseArtifact } from "./release-artifact-names.mjs";

const version = "0.3.1";

test("mac dmg, zip, and blockmap still match", () => {
  assert.equal(isReleaseArtifact("GrokBot-Meter-0.3.1-arm64.dmg", version), true);
  assert.equal(isReleaseArtifact("GrokBot-Meter-0.3.1-arm64.zip", version), true);
  assert.equal(isReleaseArtifact("GrokBot-Meter-0.3.1-arm64.dmg.blockmap", version), true);
  assert.equal(isReleaseArtifact("GrokBot-Meter-0.3.1-arm64.zip.blockmap", version), true);
});

test("windows nsis exe and portable zip match", () => {
  assert.equal(isReleaseArtifact("GrokBot-Meter-0.3.1-x64.exe", version), true);
  assert.equal(isReleaseArtifact("GrokBot-Meter-0.3.1-x64.zip", version), true);
  assert.equal(isReleaseArtifact("GrokBot-Meter-0.3.1-x64.exe.blockmap", version), true);
});

test("staging directories and builder metadata stay in dist", () => {
  assert.equal(isReleaseArtifact("latest.yml", version), false);
  assert.equal(isReleaseArtifact("builder-debug.yml", version), false);
  assert.equal(isReleaseArtifact("win-unpacked", version), false);
  assert.equal(isReleaseArtifact("mac-arm64", version), false);
  assert.equal(isReleaseArtifact("GrokBot-Meter-0.3.0-x64.exe", version), false);
});
