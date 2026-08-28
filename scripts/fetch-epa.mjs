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
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = path.join(ROOT, "scripts", "epa-cache.json");
const REFRESH = process.argv.includes("--refresh");
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
}
