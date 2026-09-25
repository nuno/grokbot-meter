import { mkdir, readdir, rename, rm, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const version = packageJson.version;
const distDir = path.join(root, "dist");
const releaseDir = path.join(root, "releases", version);

await mkdir(releaseDir, { recursive: true });

const prefix = `GrokBot-Meter-${version}-`;
const artifacts = (await readdir(distDir)).filter((name) =>
  name.startsWith(prefix) &&
  (name.endsWith(".dmg") || name.endsWith(".zip") || name.endsWith(".blockmap")),
);

if (artifacts.length === 0) {
  throw new Error(`No ${version} DMG, zip, or blockmap artifacts found in ${distDir}`);
}

for (const artifact of artifacts) {
  const source = path.join(distDir, artifact);
  const destination = path.join(releaseDir, artifact);
  await rm(destination, { force: true });
  await rename(source, destination);
  console.log(`Moved ${artifact} -> releases/${version}/`);
}
