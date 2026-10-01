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
