// Writes each model's canonical page URL into data/evs.json.
//
// Why the source file carries a value the build recomputes anyway: the published copy at
// evcompare.org/data/evs.json gets its urls injected at build time, but plenty of people will
// take the file straight from the public GitHub repo instead, and that copy would otherwise
// hold no reference back to where each record came from. The dataset is CC0 and requires
// nothing — this just makes pointing a reader home possible from either copy.
//
// The build never trusts these values: prerender.mjs recomputes them and only warns if the
// committed file has drifted, so a stale source url can't reach production.
//
// Edits are surgical — a line inserted after each "id", not a JSON.parse/stringify round trip.
// data/evs.json is hand-formatted (small objects like nacsAdapter sit inline on one line) and
// reserialising it would reflow all 400KB into an unreadable diff.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { carPath } from "../js/router.js";
import { datasetWrapper, SITE } from "./dataset-meta.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FILE = path.join(ROOT, "data", "evs.json");

const raw = readFileSync(FILE, "utf8");
const byId = new Map(JSON.parse(raw).models.map(m => [m.id, `${SITE}${carPath(m)}/`]));

const lines = raw.split("\n");
const out = [];
let added = 0, updated = 0, unchanged = 0;

for (let i = 0; i < lines.length; i++) {
  out.push(lines[i]);
  const m = lines[i].match(/^(\s{6})"id": "([^"]+)",$/);   // 6 spaces = a record's own key
  if (!m) continue;
  const [, indent, id] = m;
  const url = byId.get(id);
  if (!url) throw new Error(`id in text but not in parsed models: ${id}`);
  const line = `${indent}"url": "${url}",`;
  const next = lines[i + 1] ?? "";
  if (next.startsWith(`${indent}"url": `)) {
    if (next === line) { unchanged++; } else { updated++; }
    out.push(line);
    i++;                                                   // consume the old url line
  } else {
    out.push(line);
    added++;
  }
}

let result = out.join("\n");

// Rewrite the wrapper too. The committed copy previously carried a hash left over from
// whenever it was last hand-set — by now describing nothing — and lacked the disclaimer,
// terms and pointer fields the published copy gained. Someone taking this file from GitHub
// should get the same terms as someone downloading it from the site.
//
// Safe to regenerate wholesale, unlike `models`: the wrapper is machine-written, so there is
// no hand-formatting to preserve. The models array is left strictly alone.
const parsed = JSON.parse(result);
const hash = "sha256:" + createHash("sha256").update(JSON.stringify(parsed.models)).digest("hex");
const wrapper = datasetWrapper({ hash, count: parsed.models.length });
const wrapperLines = Object.entries(wrapper)
  .map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`)
  .join("\n");

const modelsAt = result.indexOf('  "models": [');
if (modelsAt === -1) throw new Error('could not find the "models" key to splice the wrapper before');
result = `{\n${wrapperLines}\n${result.slice(modelsAt)}`;

if (result === raw) {
  console.log(`data/evs.json already in sync (${unchanged} urls, wrapper current)`);
} else {
  writeFileSync(FILE, result);
  const parts = [];
  if (added) parts.push(`${added} url(s) added`);
  if (updated) parts.push(`${updated} url(s) updated`);
  parts.push(`wrapper rewritten (hash ${hash.slice(0, 15)}…)`);
  console.log(`data/evs.json: ${parts.join(", ")}`);
}
