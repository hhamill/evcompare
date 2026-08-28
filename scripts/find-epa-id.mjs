// Proposes a fueleconomy.gov vehicle id for each record that lacks one.  npm run find-epa-id [id-substring]
//
// An EPA id is the single most load-bearing link in a record: it is what `npm run fetch-epa`
// keys `epaSizeClass` off, and what the audit's model-year and EPA-range checks compare
// against. A record without one is unchecked by both. 15 records are in that state.
//
// This PROPOSES, it does not assign. Picking the wrong id is exactly the trim-drift failure this
// dataset keeps hitting — EPA splits entries by wheel size, charger speed and sub-trim, so a
// model can have twenty ids whose ranges differ by 80 miles. So it prints every candidate with
// its drive, range and class, marks the ones whose range matches the record exactly, and leaves
// the judgement to a person. Assign with:
//
//   node scripts/set-spec.mjs <record-id> links.epaWindowSticker \
//     "https://www.fueleconomy.gov/feg/Find.do?action=sbs&id=<epa-id>" --force
//   npm run fetch-epa      # fills epaSizeClass, and the audit then covers the record
//
// Searches modelYear-1 through modelYear+1, because EPA's certification year and the maker's
// model year genuinely disagree (Cadillac ships the Optiq as MY2025, EPA lists it only under
// 2026; Lexus calls the electric ES MY2027, EPA certified it as 2026).
import { readFileSync } from "node:fs";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FILTER = process.argv[2];
const B = "https://www.fueleconomy.gov/ws/rest/vehicle";
const DELAY_MS = 200;

// EPA files sub-brands under the parent make; we record them as the sub-brand.
const MAKE_ALIAS = { "Mercedes-Maybach": "Mercedes-Benz" };

const get = url => new Promise((resolve, reject) => {
  https.get(url, { headers: { "User-Agent": "evcompare.org dataset build (github.com/hhamill/evcompare)" } }, res => {
    if (res.statusCode !== 200) { res.resume(); return reject(new Error(`HTTP ${res.statusCode}`)); }
    let body = ""; res.setEncoding("utf8");
    res.on("data", d => (body += d));
    res.on("end", () => resolve(body));
  }).on("error", reject);
});
const fetched = new Map();
const cached = async url => {
  if (!fetched.has(url)) { fetched.set(url, await get(url)); await new Promise(r => setTimeout(r, DELAY_MS)); }
  return fetched.get(url);
};
const values = xml => [...xml.matchAll(/<value>([^<]*)<\/value>/g)].map(m => m[1]);
const tag = (xml, n) => (xml.match(new RegExp(`<${n}>([^<]*)</${n}>`)) || [])[1];
const squash = s => s.replace(/[^a-z0-9]/gi, "").toLowerCase();

const models = JSON.parse(readFileSync(path.join(ROOT, "data", "evs.json"), "utf8")).models;
const targets = models.filter(m => !/[?&]id=\d+/.test(m.links?.epaWindowSticker || "")
                                && (!FILTER || m.id.includes(FILTER)));
console.log(`${targets.length} record(s) with no EPA id\n`);

for (const m of targets) {
  const want = typeof m.range?.epaMiles === "number" ? m.range.epaMiles : null;
  console.log(`=== ${m.id}`);
  console.log(`    MY${m.modelYear} ${m.make} ${m.model} ${m.trim} · ${m.drivetrain} · range ${JSON.stringify(m.range?.epaMiles)} · wheels ${JSON.stringify(m.wheelSizesIn)}`);
  const make = MAKE_ALIAS[m.make] || m.make;
  if (make !== m.make) console.log(`    (EPA files this make under "${make}")`);

  let candidates = 0, listedSomething = false;
  for (const year of [m.modelYear - 1, m.modelYear, m.modelYear + 1]) {
    let list;
    try { list = values(await cached(`${B}/menu/model?year=${year}&make=${encodeURIComponent(make)}`)); }
    catch (e) { console.log(`    [${year}] ${e.message}`); continue; }
    if (!list.length) continue;
    listedSomething = true;

    // Match on the model name, then on any word of it — EPA names the Mercedes G-Class
    // "G 580 with EQ Technology", which shares no substring with what we call it.
    const words = m.model.split(/[^A-Za-z0-9]+/).filter(w => w.length > 1).map(squash);
    const hits = list.filter(s => squash(s).includes(squash(m.model)) || words.some(w => squash(s).includes(w)));
    if (!hits.length) { console.log(`    [${year}] no name match among ${list.length} models`); continue; }

    for (const h of hits) {
      for (const id of values(await cached(`${B}/menu/options?year=${year}&make=${encodeURIComponent(make)}&model=${encodeURIComponent(h)}`))) {
        const x = await cached(`${B}/${id}`);
        const r = Number(tag(x, "range")) || null;
        const mark = want !== null && r === want ? "   <-- range matches" : "";
        console.log(`    [${year}] id ${id}  "${tag(x, "model")}"  ${tag(x, "drive")}  ${r}mi  ${tag(x, "VClass")}${mark}`);
        candidates++;
      }
    }
  }
  if (!candidates) console.log(listedSomething ? "    -> no candidate found" : "    -> EPA lists nothing for this make/year");
  console.log("");
}
