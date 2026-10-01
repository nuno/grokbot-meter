/**
 * Run the local electron-builder with code-signing auto-discovery off.
 *
 * `CSC_IDENTITY_AUTO_DISCOVERY=false electron-builder` works in a Unix shell
 * and fails in Windows cmd, which is where `npm run dist:win` runs on the loaner.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const builder = path.join(root, "node_modules", "electron-builder", "cli.js");
const args = process.argv.slice(2);

// NSIS embeds its uninstaller by launching a 32-bit installer stub. Windows runs
// that stub natively. Linux and macOS need Wine on PATH. electron-builder's
// bundled Wine 11 toolset does not include a runnable prefix, so use system Wine.
if (args.includes("--win") && process.platform !== "win32") {
  const wine = spawnSync("wine", ["--version"], { encoding: "utf8" });
  if (wine.status !== 0) {
    console.error(
      "npm run dist:win on Linux/macOS needs Wine on PATH (the NSIS stub is 32-bit).\n" +
        "Install Wine and retry, or run the same script on the Windows loaner, where Wine is not used.",
    );
    process.exit(1);
  }
}

const result = spawnSync(process.execPath, [builder, ...args], {
  cwd: root,
  stdio: "inherit",
  env: {
    ...process.env,
    CSC_IDENTITY_AUTO_DISCOVERY: "false",
  },
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
