// Fetches each record's own EPA vehicle entry and caches it.  npm run fetch-epa [--refresh]
//
// fueleconomy.gov's REST API returns, per vehicle id, the official size class (VClass), the
// model year EPA has it under, and the certified range. 132 of our 149 records already cite a
// specific id in links.epaWindowSticker, so this is one pass rather than 132 manual lookups.
//
// Two jobs at once, deliberately:
//   1. VClass populates a size taxonomy that is authoritative and needs no judgment calls from
//      us — the SUV/Crossover distinction in bodyStyle is not defensible (see the 2026-08-27
//      audit: no field separates the two, and the EX30/EC40/Mach-E assignments are inverted).
//   2. `year` reconciles each record's modelYear against its own cited source. That mismatch is
//      invisible to any in-file check — the Hummer records are internally consistent and still
//      wrong — so it can only be caught against the external reference.
//
// Cached to scripts/ rather than data/ because data/ is published to the site; this is
// build-time reference material, not part of the dataset. Committing it keeps the audit
// runnable offline and records what EPA said, and when.
//
// The cache is then written back into data/evs.json as each record's `epaSizeClass`, which is
// what makes that field genuinely GENERATED rather than a one-off hand-fill that silently rots.
// EPA is the source of truth for it, so a stored value that disagrees is overwritten — but every
// such change is printed, because a size class moving is either an EPA reclassification or a
// record pointed at the wrong vehicle, and both deserve a look.
//
// Flags: --refresh re-fetches every id instead of trusting the cache.
//        --dry-run reports what the write-back would do without touching data/evs.json.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = path.join(ROOT, "scripts", "epa-cache.json");
const EVS = path.join(ROOT, "data", "evs.json");
const REFRESH = process.argv.includes("--refresh");
const DRY_RUN = process.argv.includes("--dry-run");
const TODAY = new Date().toISOString().slice(0, 10);
const DELAY_MS = 200;   // be a polite guest on a government server

const get = url => new Promise((resolve, reject) => {
  https.get(url, { headers: { "User-Agent": "evcompare.org dataset build (github.com/hhamill/evcompare)" } }, res => {
    if (res.statusCode !== 200) { res.resume(); return reject(new Error(`HTTP ${res.statusCode}`)); }
    let body = "";
    res.setEncoding("utf8");
    res.on("data", d => (body += d));
    res.on("end", () => resolve(body));
  }).on("error", reject);
});

// EPA's own labels are verbose ("Standard Sport Utility Vehicle"), inconsistently pluralised
// ("Large Cars" but "Minivan"), and out of step with every other enum in this dataset, which
// reads "SUV" / "RWD" / "CCS1". Shortened on the way in.
//
// The mapping is deliberately LOSSLESS and mechanical — a pure renaming, reversible to EPA's
// exact string — rather than a normalisation onto some tidier size scale of our own. The whole
// reason for using EPA here is that it is sourced rather than judged; inventing tiers would
// give that back. The raw value stays in scripts/epa-cache.json regardless.
export const SIZE_CLASS = {
  "Small Sport Utility Vehicle": "Small SUV",
  "Standard Sport Utility Vehicle": "Standard SUV",
  "Subcompact Cars": "Subcompact Car",
  "Compact Cars": "Compact Car",
  "Midsize Cars": "Midsize Car",
  "Large Cars": "Large Car",
  "Small Station Wagons": "Small Wagon",
  "Midsize Station Wagons": "Midsize Wagon",
  "Standard Pickup Trucks": "Standard Pickup",
  "Special Purpose Vehicle": "Special Purpose",
  "Minivan": "Minivan",
};

// EPA appends the drivetrain ("... 4WD"); that is not size and `drivetrain` already records it.
export function shortSizeClass(vclass) {
  if (!vclass) return null;
  const stripped = vclass.replace(/\s*[-–]?\s*(2WD|4WD|AWD)$/, "").trim();
  const short = SIZE_CLASS[stripped];
  if (!short) throw new Error(`unmapped EPA VClass: "${stripped}" — add it to SIZE_CLASS`);
  return short;
}

const tag = (xml, name) => {
  const m = xml.match(new RegExp(`<${name}>([^<]*)</${name}>`));
  return m ? m[1] : null;
};

// Only run the fetch when invoked directly — scripts/ imports shortSizeClass from here,
// and a bare import shouldn't hit a government API as a side effect.
if (import.meta.url === `file://${process.argv[1]}`) {
  const models = JSON.parse(readFileSync(path.join(ROOT, "data", "evs.json"), "utf8")).models;
  const cache = !REFRESH && existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, "utf8")) : {};

  const targets = [];
  for (const m of models) {
    const id = (m.links?.epaWindowSticker || "").match(/[?&]id=(\d+)/)?.[1];
    if (id) targets.push({ recordId: m.id, epaId: id });
  }
  const todo = targets.filter(t => !cache[t.epaId]);
  console.log(`${targets.length} records cite an EPA id · ${Object.keys(cache).length} cached · ${todo.length} to fetch`);

  let ok = 0, failed = [];
  for (const [i, t] of todo.entries()) {
    try {
      const xml = await get(`https://www.fueleconomy.gov/ws/rest/vehicle/${t.epaId}`);
      cache[t.epaId] = {
        year: Number(tag(xml, "year")),
        make: tag(xml, "make"),
        model: tag(xml, "model"),
        vclass: tag(xml, "VClass"),
        range: Number(tag(xml, "range")) || null,
        fetchedOn: new Date().toISOString().slice(0, 10),
      };
      ok++;
    } catch (e) {
      failed.push(`${t.epaId} (${t.recordId}): ${e.message}`);
    }
    if ((i + 1) % 25 === 0) process.stdout.write(`  ...${i + 1}/${todo.length}\n`);
    await new Promise(r => setTimeout(r, DELAY_MS));
  }

  writeFileSync(CACHE, JSON.stringify(cache, null, 2) + "\n");
  console.log(`\nfetched ${ok}, cached ${Object.keys(cache).length} total -> scripts/epa-cache.json`);
  if (failed.length) { console.log(`\n${failed.length} failed:`); failed.forEach(f => console.log("  " + f)); }

  // ---- write epaSizeClass back into data/evs.json -------------------------------------------
  //
  // Line surgery rather than parse-and-stringify: data/evs.json is hand-formatted (indentation is
  // not even uniform between sibling keys) and reserialising would reflow 400KB into an unreadable
  // diff. Same reasoning, and same technique, as scripts/sync-urls.mjs and scripts/set-spec.mjs.
  const raw = readFileSync(EVS, "utf8");
  const lines = raw.split("\n");

  // Record boundaries: an id line starts a record and runs until the next one.
  const starts = [];
  lines.forEach((l, i) => {
    const m = l.match(/^      "id": "([^"]+)",$/);
    if (m) starts.push({ id: m[1], from: i });
  });
  starts.forEach((r, k) => (r.to = k + 1 < starts.length ? starts[k + 1].from - 1 : lines.length - 1));

  const byRecord = new Map(targets.map(t => [t.recordId, t.epaId]));
  const set = [], changed = [], unbacked = [];
  let unchanged = 0;

  for (const r of starts) {
    const entry = cache[byRecord.get(r.id)];
    const idx = (() => {
      for (let i = r.from; i <= r.to; i++) if (/^\s*"epaSizeClass":/.test(lines[i])) return i;
      return -1;
    })();
    if (idx === -1) continue;                         // record predates the field; leave it alone
    const current = JSON.parse(`{${lines[idx].trim().replace(/,$/, "")}}`).epaSizeClass;

    // No cached EPA entry means nothing to derive from. Never clear a value on that basis — the
    // EX60 P6 legitimately cites Volvo rather than EPA (fueleconomy.gov has no entry for its wheel
    // package) while still having a known size class. Report those instead, so a value the
    // generator cannot vouch for is visible rather than quietly trusted.
    if (!entry) { if (current != null) unbacked.push(`${r.id} (${current})`); continue; }

    const want = shortSizeClass(entry.vclass);        // throws on an unmapped class, deliberately
    if (current === want) { unchanged++; continue; }
    (current == null ? set : changed).push(`${r.id}: ${JSON.stringify(current)} -> ${JSON.stringify(want)}`);

    const m = lines[idx].match(/^(\s*)"epaSizeClass": .*?(,?)$/);
    lines[idx] = `${m[1]}"epaSizeClass": ${JSON.stringify(want)}${m[2]}`;
    for (let i = r.from; i <= r.to; i++) {            // filling a generated field is a verification event
      const d = lines[i].match(/^(\s*)"lastVerifiedDate": ".*?"(,?)$/);
      if (d) { lines[i] = `${d[1]}"lastVerifiedDate": ${JSON.stringify(TODAY)}${d[2]}`; break; }
    }
  }

  const report = (label, list) => { if (list.length) { console.log(`\n${label} (${list.length}):`); list.forEach(x => console.log("  · " + x)); } };
  console.log(`\nepaSizeClass: ${unchanged} already correct, ${set.length} filled, ${changed.length} changed, ${unbacked.length} not derivable`);
  report("filled", set);
  report("CHANGED — EPA reclassified, or the record cites the wrong vehicle. Check these", changed);
  report("no cached EPA entry, so left as-is and unverifiable from EPA", unbacked);

  if (set.length + changed.length === 0) console.log("\ndata/evs.json unchanged.");
  else if (DRY_RUN) console.log("\n--dry-run: data/evs.json NOT written.");
  else { writeFileSync(EVS, lines.join("\n")); console.log(`\nwrote ${set.length + changed.length} record(s) -> data/evs.json (run: npm run sync-urls && npm run prerender)`); }
}
