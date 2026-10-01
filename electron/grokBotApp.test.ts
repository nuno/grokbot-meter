import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { join } from "path";
import {
  GROK_BOT_PRESENT_VERSION,
  WINDOWS_EXE_VERSION_SCRIPT,
  pickWindowsExeVersion,
  pickWindowsExeVersionFromStdout,
  readGrokBotVersion,
  versionFromPackageJson,
  versionFromUpdateYml,
  type GrokBotVersionDeps,
  type GrokBotVersionEnv,
} from "./grokBotApp.ts";

const PLIST = "/Applications/Grok Bot.app/Contents/Info.plist";
const INFO = "/Applications/Grok Bot.app/Contents/Info";

type MemValue = string | Buffer | "dir";

function memory(
  files: Record<string, MemValue>,
  hooks?: {
    execFile?: (file: string, args: string[]) => string;
    exeVersion?: (exePath: string) => string | null;
  },
): { deps: GrokBotVersionDeps; execCalls: { file: string; args: string[] }[]; exeCalls: string[] } {
  const blobs = new Map<string, Buffer>();
  const dirs = new Set<string>();
  for (const [path, value] of Object.entries(files)) {
    if (value === "dir") dirs.add(path);
    else blobs.set(path, typeof value === "string" ? Buffer.from(value) : value);
  }
  const execCalls: { file: string; args: string[] }[] = [];
  const exeCalls: string[] = [];
  const deps: GrokBotVersionDeps = {
    exists: (path) => blobs.has(path) || dirs.has(path),
    readText: (path) => blobs.get(path)?.toString("utf8") ?? null,
    execFile: (file, args) => {
      execCalls.push({ file, args });
      if (hooks?.execFile) return hooks.execFile(file, args);
      throw new Error(`unexpected exec ${file}`);
    },
    exeVersion: (path) => {
      exeCalls.push(path);
      return hooks?.exeVersion ? hooks.exeVersion(path) : null;
    },
    fileSize: (path) => blobs.get(path)?.length ?? null,
    readAt: (path, offset, length) => {
      const buf = blobs.get(path);
      if (!buf || offset < 0 || length < 0 || offset + length > buf.length) return null;
      return Buffer.from(buf.subarray(offset, offset + length));
    },
  };
  return { deps, execCalls, exeCalls };
}

function winEnv(over: Partial<GrokBotVersionEnv> = {}): GrokBotVersionEnv {
  return {
    home: join("C:", "Users", "loaner"),
    platform: "win32",
    appData: join("C:", "Users", "loaner", "AppData", "Roaming"),
    localAppData: join("C:", "Users", "loaner", "AppData", "Local"),
    programFiles: join("C:", "Program Files"),
    programFilesX86: join("C:", "Program Files (x86)"),
    ...over,
  };
}

function supportOf(env: GrokBotVersionEnv): string {
  return join(env.appData ?? "", "Grok Bot");
}

function perUserRoot(env: GrokBotVersionEnv): string {
  return join(env.localAppData ?? join(env.home, "AppData", "Local"), "Programs", "Grok Bot");
}

describe("macOS Grok Bot version", () => {
  it("reads CFBundleShortVersionString with defaults and does not call PlistBuddy", () => {
    const { deps, execCalls } = memory(
      { [PLIST]: "plist" },
      {
        execFile: (file) => {
          if (file !== "/usr/bin/defaults") throw new Error(file);
          return "1.4.2";
        },
      },
    );
    const version = readGrokBotVersion(
      { home: "/Users/meter", platform: "darwin", appData: join("C:", "Users", "loaner", "AppData", "Roaming") },
      deps,
    );
    assert.equal(version, "1.4.2");
    assert.deepEqual(execCalls, [
      {
        file: "/usr/bin/defaults",
        args: ["read", INFO, "CFBundleShortVersionString"],
      },
    ]);
  });

  it("does not run defaults when Info.plist is missing", () => {
    const { deps, execCalls } = memory({});
    assert.equal(readGrokBotVersion({ home: "/Users/meter", platform: "darwin" }, deps), null);
    assert.deepEqual(execCalls, []);
  });

  it("falls back to PlistBuddy when defaults throws", () => {
    const { deps, execCalls } = memory(
      { [PLIST]: "plist" },
      {
        execFile: (file) => {
          if (file === "/usr/bin/defaults") throw new Error("defaults failed");
          return "2.0.0";
        },
      },
    );
    assert.equal(readGrokBotVersion({ home: "/Users/meter", platform: "darwin" }, deps), "2.0.0");
    assert.deepEqual(execCalls[1], {
      file: "/usr/libexec/PlistBuddy",
      args: ["-c", "Print :CFBundleShortVersionString", PLIST],
    });
  });

  it("returns null when defaults returns an empty string without trying PlistBuddy", () => {
    const { deps, execCalls } = memory({ [PLIST]: "plist" }, { execFile: () => "" });
    assert.equal(readGrokBotVersion({ home: "/Users/meter", platform: "darwin" }, deps), null);
    assert.equal(execCalls.length, 1);
    assert.equal(execCalls[0]?.file, "/usr/bin/defaults");
  });

  it("returns null when defaults and PlistBuddy both fail", () => {
    const { deps } = memory(
      { [PLIST]: "plist" },
      {
        execFile: () => {
          throw new Error("no");
        },
      },
    );
    assert.equal(readGrokBotVersion({ home: "/Users/meter", platform: "darwin" }, deps), null);
  });

  it("ignores a Windows support dir on darwin and on linux", () => {
    const appData = join("C:", "Users", "loaner", "AppData", "Roaming");
    const support = join(appData, "Grok Bot");
    const { deps, execCalls } = memory({
      [support]: "dir",
      [join(support, "sand-secrets.json")]: "{}",
      [join(support, "Local State")]: "{}",
    });
    for (const platform of ["darwin", "linux"] as const) {
      assert.equal(readGrokBotVersion({ home: "/Users/meter", platform, appData }, deps), null);
    }
    assert.deepEqual(execCalls, []);
  });
});

describe("Windows Grok Bot detection", () => {
  it("does not say not installed when the support dir exists without a version", () => {
    const env = winEnv();
    const { deps, execCalls, exeCalls } = memory({ [supportOf(env)]: "dir" });
    const version = readGrokBotVersion(env, deps);
    assert.equal(version, GROK_BOT_PRESENT_VERSION);
    // AboutPanel renders `Grok Bot ${version}` when version is non-null.
    assert.equal(`Grok Bot ${version}`, "Grok Bot (installed)");
    assert.deepEqual(execCalls, []);
    assert.deepEqual(exeCalls, []);
  });

  it("treats sand-secrets.json as installed", () => {
    const env = winEnv();
    const { deps } = memory({ [join(supportOf(env), "sand-secrets.json")]: "{}" });
    assert.equal(readGrokBotVersion(env, deps), GROK_BOT_PRESENT_VERSION);
  });

  it("treats nested sand-secrets.json as installed", () => {
    const env = winEnv();
    const { deps } = memory({
      [join(supportOf(env), "sand-client-persistence", "sand-secrets.json")]: "{}",
    });
    assert.equal(readGrokBotVersion(env, deps), GROK_BOT_PRESENT_VERSION);
  });

  it("treats Local State as installed", () => {
    const env = winEnv();
    const { deps } = memory({ [join(supportOf(env), "Local State")]: "{}" });
    assert.equal(readGrokBotVersion(env, deps), GROK_BOT_PRESENT_VERSION);
  });

  it("trims APPDATA before looking for the support dir", () => {
    const roaming = join("D:", "roaming");
    const env = winEnv({ appData: `  ${roaming}  ` });
    const { deps } = memory({ [join(roaming, "Grok Bot")]: "dir" });
    assert.equal(readGrokBotVersion(env, deps), GROK_BOT_PRESENT_VERSION);
  });

  it("stays not installed when APPDATA and the install dirs are missing", () => {
    const home = join("C:", "Users", "loaner");
    const { deps, execCalls } = memory({
      [join(home, "Library", "Application Support", "Grok Bot", "sand-secrets.json")]: "{}",
      [PLIST]: "plist",
    }, {
      execFile: () => "9.9.9",
    });
    assert.equal(
      readGrokBotVersion(
        {
          home,
          platform: "win32",
          localAppData: undefined,
          programFiles: undefined,
          programFilesX86: undefined,
        },
        deps,
      ),
      null,
    );
    assert.deepEqual(execCalls, []);
  });

  it("does not run Mac defaults on win32", () => {
    const { deps, execCalls } = memory(
      { [PLIST]: "plist" },
      { execFile: () => "9.9.9" },
    );
    assert.equal(readGrokBotVersion(winEnv(), deps), null);
    assert.deepEqual(execCalls, []);
  });

  // Packed with @electron/asar. package.json version is 0.59.1; main.js sits ahead of it.
  const REAL_APP_ASAR = Buffer.from(
    "BAAAAAACAAD8AQAA9QEAAHsiZmlsZXMiOnsibWFpbi5qcyI6eyJzaXplIjoxNSwib2Zmc2V0IjoiMCIsImludGVncml0eSI6eyJhbGdvcml0aG0iOiJTSEEyNTYiLCJoYXNoIjoiMzg3OWE1ZDkzMGFlMTk5OWIyNzhhM2E0OThmN2RlM2ZkODNiYThkYWU1OTMzMGZjZmEyZGIzMWMxMDNhYzIxZCIsImJsb2NrU2l6ZSI6NDE5NDMwNCwiYmxvY2tzIjpbIjM4NzlhNWQ5MzBhZTE5OTliMjc4YTNhNDk4ZjdkZTNmZDgzYmE4ZGFlNTkzMzBmY2ZhMmRiMzFjMTAzYWMyMWQiXX19LCJwYWNrYWdlLmpzb24iOnsic2l6ZSI6MzgsIm9mZnNldCI6IjE1IiwiaW50ZWdyaXR5Ijp7ImFsZ29yaXRobSI6IlNIQTI1NiIsImhhc2giOiIwNzMyOGE5NzQxY2MwYTUxYzI5NDY4NjdhMzFhYTRhYmQyYjVlODlhZGRiZWU3YWNmYTBkM2VjOTQ2MjU2YTgwIiwiYmxvY2tTaXplIjo0MTk0MzA0LCJibG9ja3MiOlsiMDczMjhhOTc0MWNjMGE1MWMyOTQ2ODY3YTMxYWE0YWJkMmI1ZTg5YWRkYmVlN2FjZmEwZDNlYzk0NjI1NmE4MCJdfX19fQAAAGNvbnNvbGUubG9nKDEpCnsibmFtZSI6Imdyb2stYm90IiwidmVyc2lvbiI6IjAuNTkuMSJ9",
    "base64",
  );

  it("reads package.json from the per-user install", () => {
    const env = winEnv();
    const root = perUserRoot(env);
    const { deps, exeCalls } = memory({
      [supportOf(env)]: "dir",
      [join(root, "resources", "app", "package.json")]: JSON.stringify({ name: "grok-bot", version: "0.59.1" }),
    });
    assert.equal(readGrokBotVersion(env, deps), "0.59.1");
    assert.equal(`Grok Bot ${readGrokBotVersion(env, deps)}`, "Grok Bot 0.59.1");
    assert.deepEqual(exeCalls, []);
  });

  it("reads package.json from a real app.asar before the exe version", () => {
    const env = winEnv();
    const root = perUserRoot(env);
    const exe = join(root, "Grok Bot.exe");
    const { deps, exeCalls } = memory(
      {
        [supportOf(env)]: "dir",
        [join(root, "resources", "app.asar")]: REAL_APP_ASAR,
        [exe]: "exe",
      },
      { exeVersion: () => "9.9.9" },
    );
    assert.equal(readGrokBotVersion(env, deps), "0.59.1");
    assert.deepEqual(exeCalls, []);
  });

  it("ignores a corrupt app.asar and still reports the support dir", () => {
    const env = winEnv();
    const { deps } = memory({
      [supportOf(env)]: "dir",
      [join(perUserRoot(env), "resources", "app.asar")]: Buffer.from("not-an-asar"),
    });
    assert.equal(readGrokBotVersion(env, deps), GROK_BOT_PRESENT_VERSION);
  });

  it("reads an unpacked asar package.json and a quoted app-update.yml version", () => {
    const env = winEnv();
    const root = perUserRoot(env);
    const unpacked = memory({
      [join(root, "resources", "app.asar.unpacked", "package.json")]: '{"version":"0.43.0"}',
    });
    assert.equal(readGrokBotVersion(env, unpacked.deps), "0.43.0");

    const yml = memory({
      [join(root, "resources", "app-update.yml")]: "provider: github\nversion: '0.30.0'\n",
    });
    assert.equal(readGrokBotVersion(env, yml.deps), "0.30.0");
    assert.deepEqual(yml.exeCalls, []);
  });

  it("prefers install metadata over the exe version resource", () => {
    const env = winEnv();
    const root = perUserRoot(env);
    const exe = join(root, "Grok Bot.exe");
    const { deps, exeCalls } = memory(
      {
        [join(root, "resources", "app-update.yml")]: "version: 0.28.0\n",
        [exe]: "exe",
      },
      { exeVersion: () => "9.9.9" },
    );
    assert.equal(readGrokBotVersion(env, deps), "0.28.0");
    assert.deepEqual(exeCalls, []);
  });

  it("reads the exe version when metadata is missing and shortens a trailing .0", () => {
    const env = winEnv();
    const exe = join(perUserRoot(env), "Grok Bot.exe");
    const { deps, exeCalls } = memory({ [exe]: "exe" }, { exeVersion: () => "0.59.1.0" });
    assert.equal(readGrokBotVersion(env, deps), "0.59.1");
    assert.deepEqual(exeCalls, [exe]);
  });

  it("uses Program Files when the per-user install has no version", () => {
    const env = winEnv();
    const exe = join(env.programFiles ?? "", "Grok Bot", "Grok Bot.exe");
    const { deps, exeCalls } = memory({ [exe]: "exe" }, { exeVersion: () => "0.61.2" });
    assert.equal(readGrokBotVersion(env, deps), "0.61.2");
    assert.deepEqual(exeCalls, [exe]);
  });

  it("falls back to the user-profile Local Programs dir when LOCALAPPDATA is unset", () => {
    const env = winEnv({ localAppData: undefined });
    const exe = join(env.home, "AppData", "Local", "Programs", "Grok Bot", "Grok Bot.exe");
    const { deps } = memory({ [exe]: "exe" }, { exeVersion: () => "0.12.0" });
    assert.equal(readGrokBotVersion(env, deps), "0.12.0");
  });

  it("keeps the installed label when the exe version cannot be read", () => {
    const env = winEnv();
    const exe = join(perUserRoot(env), "Grok Bot.exe");
    const { deps } = memory(
      { [supportOf(env)]: "dir", [exe]: "exe" },
      {
        exeVersion: () => {
          throw new Error("powershell blocked");
        },
      },
    );
    assert.equal(readGrokBotVersion(env, deps), GROK_BOT_PRESENT_VERSION);
  });

  it("prefers the per-user version over Program Files", () => {
    const env = winEnv();
    const userExe = join(perUserRoot(env), "Grok Bot.exe");
    const machineExe = join(env.programFiles ?? "", "Grok Bot", "Grok Bot.exe");
    const { deps, exeCalls } = memory(
      { [userExe]: "exe", [machineExe]: "exe" },
      {
        exeVersion: (path) => (path === userExe ? "0.2.0" : "0.9.0"),
      },
    );
    assert.equal(readGrokBotVersion(env, deps), "0.2.0");
    assert.deepEqual(exeCalls, [userExe]);
  });
});

describe("Windows version strings", () => {
  it("prefers ProductVersion and falls back to FileVersion", () => {
    assert.equal(pickWindowsExeVersion("0.59.1\n0.59.1.0\n"), "0.59.1");
    assert.equal(pickWindowsExeVersion("\n0.59.1.0"), "0.59.1");
    assert.equal(pickWindowsExeVersion("0.59.1.4\n1.0.0"), "0.59.1.4");
    assert.equal(pickWindowsExeVersion("\n\n"), null);
    assert.equal(pickWindowsExeVersion("Grok Bot\n"), null);
  });

  it("decodes UTF-8 and UTF-16 PowerShell stdout", () => {
    assert.equal(pickWindowsExeVersionFromStdout(Buffer.from("0.43.0\n0.43.0.0\n", "utf8")), "0.43.0");
    const withBom = Buffer.from("\uFEFF0.59.1\n0.59.1.0\n", "utf16le");
    assert.equal(pickWindowsExeVersionFromStdout(withBom), "0.59.1");
    assert.equal(pickWindowsExeVersionFromStdout(Buffer.from("0.28.0\n0.28.0.0\n", "utf16le")), "0.28.0");
    assert.equal(pickWindowsExeVersionFromStdout(Buffer.alloc(0)), null);
  });

  it("reads version metadata and ignores unrelated yaml keys", () => {
    assert.equal(versionFromUpdateYml("updaterCacheDirName: grok-bot-updater\nversion: \"0.30.0\"\n"), "0.30.0");
    assert.equal(versionFromUpdateYml("provider: github\n"), null);
    assert.equal(versionFromPackageJson('{"name":"grok-bot","version":"0.43.0"}'), "0.43.0");
    assert.equal(versionFromPackageJson("{"), null);
    assert.equal(versionFromPackageJson('{"version":"not-a-release"}'), null);
  });

  it("asks PowerShell for both version fields via an env var", () => {
    assert.match(WINDOWS_EXE_VERSION_SCRIPT, /GROKBOT_METER_EXE/);
    assert.match(WINDOWS_EXE_VERSION_SCRIPT, /ProductVersion/);
    assert.match(WINDOWS_EXE_VERSION_SCRIPT, /FileVersion/);
    assert.doesNotMatch(WINDOWS_EXE_VERSION_SCRIPT, /Grok Bot\.exe/);
  });
});
