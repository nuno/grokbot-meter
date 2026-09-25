const { execFileSync } = require("node:child_process");
const path = require("node:path");

/**
 * electron-builder afterPack: ad-hoc sign the whole .app before DMG/zip are built.
 * Unsigned builds otherwise keep Electron's linker-only signature, which Gatekeeper
 * reports as "damaged" once the download is quarantined. Developer ID builds re-sign
 * with --force afterwards, so this is harmless there.
 */
exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== "darwin") return;
  const app = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  execFileSync("codesign", ["--force", "--deep", "--sign", "-", "--timestamp=none", app], { stdio: "inherit" });
  execFileSync("codesign", ["--verify", "--deep", "--strict", "--verbose=2", app], { stdio: "inherit" });
};
