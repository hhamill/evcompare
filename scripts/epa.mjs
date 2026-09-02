// Shared, cached, deliberately slow client for fueleconomy.gov.
//
// Exists because we throttled ourselves out of the API on 2026-09-02: audit-coverage fired 112
// menu requests at 120ms on top of a day of ad-hoc per-variant lookups, and EPA stopped answering
// — empty bodies from every endpoint, including a plain /vehicle/{id} that had worked minutes
// earlier. Not a 404 and not a 429, just silence.
//
// Two rules follow from that, and both are load-bearing:
//
//   1. EVERY response is cached, including the per-variant /menu/options lookups that previously
//      were not cached at all. Resolving "which EPA id is the i4 xDrive40 on 18-inch wheels" is
//      the single most repeated call in trim work, and it was being paid for every time.
//
//   2. A FAILED request is never cached. This is the subtle one. EPA signals failure with an empty
//      body rather than a status code, so a failed call parses to the same `[]` as a model/year
//      that genuinely has no entries. Caching that writes "this make has nothing" into the cache
//      permanently, and every later run reads the lie without re-checking. `ok` therefore tracks
//      whether the HTTP call itself succeeded, separately from whether the result was empty, and
//      only ok responses are stored.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// 600ms, not the 120ms that got us cut off. Nothing here is latency-sensitive: every caller is a
// batch job, and the cache means a warm run makes no requests at all.
export const DELAY_MS = Number(process.env.EPA_DELAY_MS ?? 600);

const FILES = {
  vehicle: path.join(ROOT, "scripts", "epa-cache.json"),
  models:  path.join(ROOT, "scripts", "epa-menu-cache.json"),
  options: path.join(ROOT, "scripts", "epa-options-cache.json"),
};
const load = f => (existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : {});
const caches = { vehicle: load(FILES.vehicle), models: load(FILES.models), options: load(FILES.options) };
export const save = kind => writeFileSync(FILES[kind], JSON.stringify(caches[kind], null, 1) + "\n");

let lastCall = 0;
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Resolves { ok, json }. ok:false means the request failed — an empty body, a non-2xx, or
// unparseable JSON — and must not be cached.
function request(url) {
  return new Promise(async res => {
    const wait = lastCall + DELAY_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastCall = Date.now();
    https.get(url, { headers: { Accept: "application/json" } }, r => {
      let d = "";
      r.on("data", c => d += c);
      r.on("end", () => {
        if (r.statusCode < 200 || r.statusCode >= 300 || !d.trim()) return res({ ok: false, json: null });
        try { res({ ok: true, json: JSON.parse(d) }); } catch { res({ ok: false, json: null }); }
      });
    }).on("error", () => res({ ok: false, json: null }));
  });
}

const list = j => {
  const i = j?.menuItem ?? [];
  return (Array.isArray(i) ? i : [i]).filter(Boolean);
};

export const failures = [];
async function cached(kind, key, url, shape) {
  if (key in caches[kind]) return caches[kind][key];
  const { ok, json } = await request(url);
  if (!ok) { failures.push(`${kind} ${key}`); return null; }   // deliberately not cached
  caches[kind][key] = shape(json);
  return caches[kind][key];
}

const B = "https://www.fueleconomy.gov/ws/rest/vehicle";
const q = s => encodeURIComponent(s);

/** Model names EPA lists for a make/year. Returns null if the request failed. */
export const getModels = (year, make) =>
  cached("models", `${year}|${make}`, `${B}/menu/model?year=${year}&make=${q(make)}`,
    j => list(j).map(x => x.value));

/**
 * EPA vehicle ids for one model name. NOTE: the name must be EPA's *full* string including its
 * parenthetical — "i4 xDrive40 Gran Coupe (18 inch Wheels)". Querying the stripped name returns
 * null, which cost a debugging detour once already.
 */
export const getOptions = (year, make, model) =>
  cached("options", `${year}|${make}|${model}`,
    `${B}/menu/options?year=${year}&make=${q(make)}&model=${q(model)}`,
    j => list(j).map(x => ({ text: x.text, id: x.value })));

/** Full record for one EPA vehicle id. */
export const getVehicle = id =>
  cached("vehicle", String(id), `${B}/${id}`, j => ({
    year: Number(j.year), make: j.make, model: j.model, vclass: j.VClass,
    drive: j.drive, range: Number(j.range) || null,
    fetchedOn: new Date().toISOString().slice(0, 10),
  }));

export function report() {
  if (!failures.length) return true;
  console.log(`\n${failures.length} request(s) FAILED and were deliberately not cached:`);
  for (const f of failures.slice(0, 10)) console.log(`  · ${f}`);
  if (failures.length > 10) console.log(`  · ...and ${failures.length - 10} more`);
  console.log(`fueleconomy.gov returns an empty body rather than an error code, so this is most`);
  console.log(`likely throttling. Wait and re-run — cached entries won't be re-fetched.`);
  return false;
}
