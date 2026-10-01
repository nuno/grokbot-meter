import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { winLoginItemTarget } from "./winLoginItem.ts";

const INSTALLED_EXE =
  "C:\\Users\\dev\\AppData\\Local\\Programs\\GrokBot Meter\\GrokBot Meter.exe";

describe("winLoginItemTarget", () => {
  it("stays unsupported off win32", () => {
    for (const platform of ["darwin", "linux"]) {
      const target = winLoginItemTarget({
        platform,
        packaged: true,
        execPath: INSTALLED_EXE,
        appPath: "C:\\proj",
      });
      assert.deepEqual(target, { supported: false, path: "", args: [] });
    }
  });

  it("launches the packaged exe with no extra args", () => {
    const target = winLoginItemTarget({
      platform: "win32",
      packaged: true,
      execPath: INSTALLED_EXE,
      appPath: "C:\\Users\\dev\\AppData\\Local\\Programs\\GrokBot Meter\\resources\\app.asar",
    });
    assert.equal(target.supported, true);
    assert.equal(target.path, INSTALLED_EXE);
    assert.deepEqual(target.args, []);
  });

  it("does not retarget a packaged app at a Squirrel stub", () => {
    const target = winLoginItemTarget({
      platform: "win32",
      packaged: true,
      execPath: INSTALLED_EXE,
      appPath: "",
    });
    assert.equal(target.path, INSTALLED_EXE);
    assert.equal(target.path.endsWith("Update.exe"), false);
  });

  it("passes the app directory when running unpackaged", () => {
    const electronExe = "C:\\proj\\node_modules\\electron\\dist\\electron.exe";
    const target = winLoginItemTarget({
      platform: "win32",
      packaged: false,
      execPath: electronExe,
      appPath: "C:\\proj",
    });
    assert.equal(target.supported, true);
    assert.equal(target.path, electronExe);
    assert.deepEqual(target.args, ["C:\\proj"]);
  });

  it("omits a blank unpackaged app path", () => {
    const target = winLoginItemTarget({
      platform: "win32",
      packaged: false,
      execPath: "C:\\electron.exe",
      appPath: "   ",
    });
    assert.deepEqual(target.args, []);
  });
});
