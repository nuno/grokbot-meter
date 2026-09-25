import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const repo = process.argv[2] ?? "nuno/grokbot-meter";

function ghJson(apiPath) {
  const raw = execFileSync("gh", ["api", apiPath], { encoding: "utf8" });
  return JSON.parse(raw);
}

const views = ghJson(`repos/${repo}/traffic/views`);
const clones = ghJson(`repos/${repo}/traffic/clones`);
const meta = ghJson(`repos/${repo}`);
const releases = ghJson(`repos/${repo}/releases`).map((release) => ({
  tag: release.tag_name,
  assets: release.assets.map((asset) => ({
    name: asset.name,
    downloads: asset.download_count,
  })),
}));

const entry = {
  at: new Date().toISOString(),
  repo,
  stars: meta.stargazers_count,
  forks: meta.forks_count,
  watchers: meta.subscribers_count,
  views: views.count,
  uniqueViews: views.uniques,
  clones: clones.count,
  uniqueClones: clones.uniques,
  releases,
};

appendFileSync(join(root, "docs/traffic-log.jsonl"), `${JSON.stringify(entry)}\n`);
console.log(JSON.stringify(entry, null, 2));
