// Sets one numeric/boolean spec on one record in data/evs.json, by id.
//
//   node scripts/set-spec.mjs <id> <dotted.path> <value> [--date YYYY-MM-DD]
//
// Exists for the queued research batches (0-60, heat pump, ground clearance, NACS adapter):
// a hundred-odd hand edits to a 400KB JSON file is how a stray comma or a value dropped into
// the wrong record happens. Edits the line in place rather than reserialising, because
// data/evs.json is hand-formatted (see scripts/sync-urls.mjs for the same reasoning).
//
// Refuses to overwrite an existing non-null value unless --force, so a batch can be re-run
// after an interruption without silently clobbering earlier work.
//
// Bumps the record's lastVerifiedDate, since filling a field IS a verification event — that
// date drives the sitemap's per-URL lastmod.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FILE = path.join(ROOT, "data", "evs.json");

const [id, dotted, rawValue, ...rest] = process.argv.slice(2);
if (!id || !dotted || rawValue === undefined) {
  console.error("usage: set-spec.mjs <id> <dotted.path> <value> [--date YYYY-MM-DD] [--force]");
  process.exit(1);
}
const force = rest.includes("--force");
const dateArg = rest.includes("--date") ? rest[rest.indexOf("--date") + 1] : new Date().toISOString().slice(0, 10);
const value = rawValue === "null" ? null
  : rawValue === "true" ? true
  : rawValue === "false" ? false
  : Number.isNaN(Number(rawValue)) ? rawValue          // string sentinels: "N/A", "Pending"
  : Number(rawValue);

const raw = readFileSync(FILE, "utf8");
const doc = JSON.parse(raw);
const rec = doc.models.find(m => m.id === id);
if (!rec) throw new Error(`no record with id ${id}`);

const parts = dotted.split(".");
const leaf = parts[parts.length - 1];
let cur = rec;
for (const p of parts.slice(0, -1)) {
  if (cur[p] === undefined) throw new Error(`${id}: no such path segment "${p}" in ${dotted}`);
  cur = cur[p];
}
if (!(leaf in cur)) throw new Error(`${id}: record has no key "${leaf}" — refusing to invent one`);
if (cur[leaf] !== null && !force) throw new Error(`${id}: ${dotted} is already ${JSON.stringify(cur[leaf])} — pass --force to overwrite`);

// Locate this record's line range, then edit only within it.
const lines = raw.split("\n");
const startIdx = lines.findIndex(l => l.includes(`"id": ${JSON.stringify(id)},`));
if (startIdx === -1) throw new Error(`id line not found in text: ${id}`);
let endIdx = lines.length - 1;
for (let i = startIdx + 1; i < lines.length; i++) {
  if (/^      "id": "/.test(lines[i])) { endIdx = i - 1; break; }
}

const leafRe = new RegExp(`^(\\s*)${JSON.stringify(leaf)}: .*?(,?)$`);
let edited = 0;
for (let i = startIdx; i <= endIdx; i++) {
  const m = lines[i].match(leafRe);
  if (!m) continue;
  lines[i] = `${m[1]}${JSON.stringify(leaf)}: ${JSON.stringify(value)}${m[2]}`;
  edited++;
}
if (edited !== 1) throw new Error(`${id}: expected exactly one "${leaf}" line in the record, found ${edited}`);

const dateRe = /^(\s*)"lastVerifiedDate": ".*?"(,?)$/;
for (let i = startIdx; i <= endIdx; i++) {
  const m = lines[i].match(dateRe);
  if (m) { lines[i] = `${m[1]}"lastVerifiedDate": ${JSON.stringify(dateArg)}${m[2]}`; break; }
}

writeFileSync(FILE, lines.join("\n"));
console.log(`  ${id}: ${dotted} = ${JSON.stringify(value)}  (verified ${dateArg})`);
