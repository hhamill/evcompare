// What the dataset is MISSING, which npm run audit structurally cannot see.  npm run audit-coverage
//
// audit-data.mjs checks the records we hold: internal consistency, agreement with the EPA entry a
// record cites, physically implausible values. Every one of those checks needs a record to exist
// first. It has no way to notice that a trim we never entered is on sale, or that the model year
// we recorded has been superseded — absence and staleness are invisible to it, so "No flags" says
// nothing about coverage.
//
// This walks EPA's menu API instead and compares its catalogue against ours, reporting:
//   A. models where EPA lists a NEWER model year than the newest we hold  -> probably stale
//   B. models where EPA lists MORE powertrain variants than we have trims -> probably incomplete
//   C. models EPA never matched                                          -> unassessed, see below
//
// Three limits worth knowing before acting on the output:
//
//   * B is a FLOOR, not a census. EPA only certifies powertrains, so it cannot see equipment
//     ladders at all — it would never have revealed the Genesis GV70's Advanced/Prestige or the
//     Volvo EX60's Plus/Ultra, both of which were real missing trims. Where B says we are short we
//     are definitely short; where B is quiet we may still be.
//   * A newer EPA year is evidence of staleness, not proof, and the same year is not proof of
//     currency. EPA lags brand-new cars (the 2027 EX60 has no entry at all) and sometimes disagrees
//     with the maker outright — Lexus designates the electric ES as MY2027 while EPA certified it
//     as 2026, already investigated and cleared.
//   * C is "our matcher could not assess this", NOT "EPA has nothing". Model naming diverges wildly
//     between sources, and a name we fail to match looks identical to a car that is absent.
//
// EPA also splits a single real variant across many entries by wheel size, tire compound and
// charger speed — none of which this dataset models as trims (see SCHEMA, "A record is one trim in
// its base configuration"). NOISE below collapses those so the comparison is variant-to-trim
// rather than entry-to-trim; without it the Cadillac Lyriq reads as six variants when it is two
// powertrains times two chargers.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EVS = path.join(ROOT, "data", "evs.json");
const CACHE = path.join(ROOT, "scripts", "epa-menu-cache.json");
const REFRESH = process.argv.includes("--refresh");
const YEARS = [2025, 2026, 2027, 2028];
const DELAY_MS = 120;

// EPA files sub-brands under the parent make; we record them as the sub-brand.
const ALIAS = { "Mercedes-Maybach": "Mercedes-Benz" };

// Qualifiers EPA puts in a model name that are configuration, not variant.
const NOISE = [
  /\([^)]*\)/g,                          // "(19 inch Wheels)", "(11 kW Charger)"
  /\b\d+\s*kW\s*Charger\b/gi,
  /\bw(?:ith)?\s*\/?\s*\d+\s*inch\s*wheels?\b/gi,
  /\bw\/\d+F\d+R\s*wheels?\b/gi,          // Lucid "w/20F21R wheels"
  /\b\d+\s*inch\b/gi,
  /\b(?:MT|A\/S)\s*Tires?\b/gi,
  /\b(?:All[- ]Season|Summer)(?:\s*Tires?)?\b/gi,
  /\b\d{3}\/\d{2}[A-Z]*R\d{2}(?:\s*Rear)?\b/gi, // Dodge tire sizes
];
const strip = s => NOISE.reduce((a, re) => a.replace(re, " "), s).replace(/\s+/g, " ").trim();
const norm = s => s.toLowerCase().replace(/[^a-z0-9]+/g, "");

const cache = !REFRESH && existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, "utf8")) : {};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const get = u => new Promise(res => {
  https.get(u, { headers: { Accept: "application/json" } }, r => {
    let d = ""; r.on("data", c => d += c);
    r.on("end", () => { try { res(JSON.parse(d)); } catch { res(null); } });
  }).on("error", () => res(null));
});

const cars = JSON.parse(readFileSync(EVS, "utf8")).models;
const byModel = new Map();
for (const c of cars) {
  const k = `${c.make}|${c.model}`;
  if (!byModel.has(k)) byModel.set(k, []);
  byModel.get(k).push(c);
}

const makes = [...new Set(cars.map(c => ALIAS[c.make] ?? c.make))];
let fetched = 0;
for (const mk of makes) for (const y of YEARS) {
  const key = `${y}|${mk}`;
  if (cache[key]) continue;
  const j = await get(`https://www.fueleconomy.gov/ws/rest/vehicle/menu/model?year=${y}&make=${encodeURIComponent(mk)}`);
  let items = j?.menuItem ?? [];
  if (!Array.isArray(items)) items = [items];
  cache[key] = items.map(x => x?.value).filter(Boolean);
  fetched++;
  await sleep(DELAY_MS);
}
writeFileSync(CACHE, JSON.stringify(cache, null, 1) + "\n");
console.log(`${makes.length} makes x ${YEARS.length} years · ${fetched} fetched, ${Object.keys(cache).length} cached\n`);

// Assign each EPA name to the LONGEST model name we hold that prefixes it, so "Ioniq 5" cannot
// swallow entries that belong to "Ioniq 5 N".
const ours = [...byModel.keys()].map(k => {
  const [make, model] = k.split("|");
  return { k, make, model, n: norm(model) };
});
const rows = ours.map(({ k, make, model, n }) => {
  const recs = byModel.get(k);
  const ourYear = Math.max(...recs.map(r => r.modelYear));
  const epaMake = ALIAS[make] ?? make;
  let latestYear = null, variants = [];
  for (const y of YEARS) {
    const hits = (cache[`${y}|${epaMake}`] ?? []).filter(v => {
      const nv = norm(strip(v));
      return nv.startsWith(n)
        && !ours.some(o => o.make === make && o.n !== n && o.n.length > n.length && nv.startsWith(o.n));
    });
    if (hits.length) { latestYear = y; variants = [...new Set(hits.map(strip))]; }
  }
  return { make, model, ourYear, ourTrims: recs.length, latestYear, variants };
});

const stale = rows.filter(r => r.latestYear && r.latestYear > r.ourYear)
  .sort((a, b) => (b.latestYear - b.ourYear) - (a.latestYear - a.ourYear) || a.make.localeCompare(b.make));
const thin = rows.filter(r => r.latestYear && r.variants.length > r.ourTrims)
  .sort((a, b) => (b.variants.length - b.ourTrims) - (a.variants.length - a.ourTrims));
const blind = rows.filter(r => !r.latestYear);

console.log(`A. EPA lists a newer model year than we hold (${stale.length}/${rows.length}) — probably stale`);
for (const r of stale) console.log(`   ${r.make} ${r.model}: ours MY${r.ourYear} -> EPA MY${r.latestYear}`);
console.log(`\nB. EPA lists more powertrain variants than we have trims (${thin.length}/${rows.length}) — probably incomplete`);
for (const r of thin) console.log(`   +${r.variants.length - r.ourTrims}  ${r.make} ${r.model} MY${r.latestYear}: ${r.ourTrims} trims vs ${r.variants.length} variants [${r.variants.join(" | ")}]`);
console.log(`\nC. no EPA match — unassessed, likely a naming mismatch on our side (${blind.length}/${rows.length})`);
for (const r of blind) console.log(`   ${r.make} ${r.model} MY${r.ourYear}`);
console.log(`\nB is a floor: EPA cannot see equipment trims, so a quiet model may still be short.`);
