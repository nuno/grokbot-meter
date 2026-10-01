import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { join } from "path";
import { sandSecretsPaths, todayCandidateDirs, windowsLocalStatePath } from "./grokBotPaths.ts";

const HOME = "/Users/meter";

function macSecrets(home: string): string[] {
  return [
    join(home, "Library/Application Support/Grok Bot/sand-secrets.json"),
    join(home, ".config/Grok Bot/sand-secrets.json"),
    join(home, ".grokbot/sand-secrets.json"),
    join(home, "Library/Application Support/Grok Bot/sand-client-persistence/sand-secrets.json"),
    join(home, ".config/Grok Bot/sand-client-persistence/sand-secrets.json"),
  ];
}

function macToday(home: string): string[] {
  return [
    join(home, "Library/Application Support/Grok Bot/sand-client-persistence"),
    join(home, ".config/Grok Bot/sand-client-persistence"),
    join(home, ".grokbot"),
  ];
}

describe("grok bot paths", () => {
  it("keeps the macOS secret and Today lists when APPDATA is set", () => {
    const env = { home: HOME, platform: "darwin" as const, appData: "C:\\Users\\loaner\\AppData\\Roaming" };
    assert.deepEqual(sandSecretsPaths(env), macSecrets(HOME));
    assert.deepEqual(todayCandidateDirs(env), macToday(HOME));
    assert.equal(windowsLocalStatePath(env), null);
  });

  it("keeps the same lists on linux", () => {
    const env = { home: "/home/meter", platform: "linux" as const, appData: "/tmp/AppData" };
    assert.deepEqual(sandSecretsPaths(env), macSecrets("/home/meter"));
    assert.deepEqual(todayCandidateDirs(env), macToday("/home/meter"));
    assert.equal(windowsLocalStatePath(env), null);
  });

  it("adds the confirmed Roaming Grok Bot dir on win32", () => {
    const appData = join("C:", "Users", "loaner", "AppData", "Roaming");
    const env = { home: join("C:", "Users", "loaner"), platform: "win32" as const, appData };
    const support = join(appData, "Grok Bot");
    assert.deepEqual(sandSecretsPaths(env), [
      join(support, "sand-secrets.json"),
      join(support, "sand-client-persistence", "sand-secrets.json"),
      ...macSecrets(env.home),
    ]);
    assert.deepEqual(todayCandidateDirs(env), [
      join(support, "sand-client-persistence"),
      ...macToday(env.home),
    ]);
    assert.equal(windowsLocalStatePath(env), join(support, "Local State"));
  });

  it("does not invent a Windows dir when APPDATA is missing", () => {
    const env = { home: HOME, platform: "win32" as const };
    assert.deepEqual(sandSecretsPaths(env), macSecrets(HOME));
    assert.deepEqual(todayCandidateDirs(env), macToday(HOME));
    assert.equal(windowsLocalStatePath(env), null);
  });

  it("trims APPDATA", () => {
    const env = { home: HOME, platform: "win32" as const, appData: "  /roaming  " };
    assert.equal(windowsLocalStatePath(env), join("/roaming", "Grok Bot", "Local State"));
  });
});
