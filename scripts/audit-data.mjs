// Consistency audit for data/evs.json. Run after any research batch:  npm run audit
//
// Exists because trim drift is the dominant failure mode when researching this dataset — a
// figure gets recorded against the wrong trim of the same model, and nothing about the JSON
// looks wrong afterwards. The 0-60 batch on 2026-08-27 hit it three times in two batches
// (Lyriq RWD given the AWD figure, Optiq given a different model year's, Hummer 3X unresolvable
// between two configurations), all caught by hand. These checks catch the same class
// automatically.
//
// Every check is a HEURISTIC. A flag means "look at this", never "this is wrong" — sibling
// trims legitimately share figures when they share a powertrain, and manufacturers do quote one
// 0-60 across a range. Read the reasoning before changing anything.
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const M = JSON.parse(readFileSync(path.join(ROOT, "data", "evs.json"), "utf8")).models;
const n = v => (typeof v === "number" ? v : null);
const name = m => `${m.modelYear} ${m.make} ${m.model} ${m.trim}`;

const byModel = {};
for (const m of M) (byModel[`${m.make} ${m.model}`] ??= []).push(m);
const siblings = Object.entries(byModel).filter(([, l]) => l.length > 1);

// A flag can be investigated and found legitimate — GMC really does publish one 0-60 across
// three power levels. Without somewhere to record that, every run re-raises it and the same
// investigation gets paid for again (this one already had been, on 2026-08-27).
//
// Each flag therefore carries a stable KEY that embeds the values it was raised over, and
// scripts/audit-cleared.json maps keys to why they were dismissed. Embedding the values is the
// safety catch: change the 0-60 or the horsepower and the key changes with it, the exception
// stops matching, and the flag comes back. An exception can only ever silence the exact
// situation someone actually looked at.
const CLEARED_FILE = path.join(ROOT, "scripts", "audit-cleared.json");
const CLEARED = existsSync(CLEARED_FILE) ? JSON.parse(readFileSync(CLEARED_FILE, "utf8")) : {};
const pair = (a, b) => [a, b].sort().join("+");   // order-independent, so file order can't flip a key

const flags = [];
const cleared = [];
const flag = (check, msg, key) => {
  if (key && CLEARED[key]) cleared.push({ key, msg, ...CLEARED[key] });
  else flags.push({ check, msg });
};

// 1. Different power, identical 0-60. Same power + same 0-60 is fine and common (shared
//    powertrain across trim levels), so only differing power is flagged.
for (const [model, l] of siblings)
  for (let i = 0; i < l.length; i++) for (let j = i + 1; j < l.length; j++) {
    const [a, b] = [l[i], l[j]];
    const ah = n(a.performance?.horsepowerHp), bh = n(b.performance?.horsepowerHp);
    const az = n(a.performance?.zeroTo60Sec), bz = n(b.performance?.zeroTo60Sec);
    if (ah && bh && az && bz && ah !== bh && az === bz)
      flag("trim-drift", `${model}: ${a.trim} (${ah}hp) and ${b.trim} (${bh}hp) share ${az}s`,
        `trim-drift/${pair(a.id, b.id)}/${[ah, bh].sort((x, y) => x - y).join("+")}hp@${az}s`);
  }

// 2. More power but slower — implausible within one model unless weight differs a lot.
for (const [model, l] of siblings)
  for (const a of l) for (const b of l) {
    if (a === b) continue;
    const ah = n(a.performance?.horsepowerHp), bh = n(b.performance?.horsepowerHp);
    const az = n(a.performance?.zeroTo60Sec), bz = n(b.performance?.zeroTo60Sec);
    if (ah && bh && az && bz && ah > bh && az > bz)
      flag("implausible", `${model}: ${a.trim} ${ah}hp/${az}s slower than ${b.trim} ${bh}hp/${bz}s`,
        `implausible/${a.id}+${b.id}/${ah}hp@${az}s-vs-${bh}hp@${bz}s`);
  }

// 3. Different drivetrain but identical range AND battery — RWD and AWD of the same car
//    essentially never post the same EPA range.
for (const [model, l] of siblings)
  for (let i = 0; i < l.length; i++) for (let j = i + 1; j < l.length; j++) {
    const [a, b] = [l[i], l[j]];
    const ar = n(a.range?.epaMiles), br = n(b.range?.epaMiles);
    const ab = n(a.battery?.usableKwh), bb = n(b.battery?.usableKwh);
    if (a.drivetrain !== b.drivetrain && ar && br && ar === br && ab === bb)
      flag("trim-drift", `${model}: ${a.trim} (${a.drivetrain}) and ${b.trim} (${b.drivetrain}) share ${ar}mi / ${ab}kWh`,
        `range-drift/${pair(a.id, b.id)}/${ar}mi@${ab}kWh`);
  }

// 4. Efficiency outside what a road-going EV achieves. Real values run ~1.5 (Hummer) to ~5.4
//    (Tesla Standard on LFP); outside that, either range or battery is wrong.
for (const m of M) {
  const r = n(m.range?.epaMiles), b = n(m.battery?.usableKwh);
  if (!r || !b) continue;
  const e = r / b;
  if (e < 1.4 || e > 5.6)
    flag("efficiency", `${name(m)}: ${e.toFixed(2)} mi/kWh (${r}mi / ${b}kWh)`, `efficiency/${m.id}/${r}mi@${b}kWh`);
}

// 5. Record year vs the year of its own cited EPA entry. This class is invisible to every
//    other check here — a year-drifted record is internally consistent, and only disagrees
//    with an external reference. Reads the cache written by `npm run fetch-epa` so the audit
//    still runs offline in seconds; skipped entirely if the cache is absent.
const CACHE = path.join(ROOT, "scripts", "epa-cache.json");
if (existsSync(CACHE)) {
  const epa = JSON.parse(readFileSync(CACHE, "utf8"));
  for (const m of M) {
    const id = (m.links?.epaWindowSticker || "").match(/[?&]id=(\d+)/)?.[1];
    const e = id && epa[id];
    if (!e) continue;
    if (e.year !== m.modelYear)
      flag("model-year", `${name(m)}: we say MY${m.modelYear}, its EPA source is "${e.year} ${e.make} ${e.model}"`,
        `model-year/${m.id}/MY${m.modelYear}-vs-EPA${e.year}`);
    if (e.range && typeof n(m.range?.epaMiles) === "number" && n(m.range.epaMiles) !== e.range)
      flag("epa-range", `${name(m)}: we say ${m.range.epaMiles}mi, EPA says ${e.range}mi`,
        `epa-range/${m.id}/${m.range.epaMiles}mi-vs-EPA${e.range}mi`);
  }
} else {
  console.log("(no scripts/epa-cache.json — run `npm run fetch-epa` to enable the model-year and EPA-range checks)");
}

// 6. Lower power but higher top speed within one model. The mirror of check 2, and it catches a
//    different failure: a figure taken from the wrong trim of the same nameplate.
for (const [model, l] of siblings)
  for (const a of l) for (const b of l) {
    if (a === b) continue;
    const ah = n(a.performance?.horsepowerHp), bh = n(b.performance?.horsepowerHp);
    const at = n(a.performance?.topSpeedMph), bt = n(b.performance?.topSpeedMph);
    if (ah && bh && at && bt && ah < bh && at > bt)
      flag("implausible", `${model}: ${a.trim} ${ah}hp does ${at}mph, beating ${b.trim} ${bh}hp at ${bt}mph`,
        `topspeed-inverted/${a.id}+${b.id}/${ah}hp@${at}-vs-${bh}hp@${bt}`);
  }

// 7. Figures that are round in METRIC but not in the unit we store. This dataset is US-market, and
//    US sources quote round pounds — 3,500 lb, 2,200 lb. A value like 3,527 lb is 1,600 kg
//    converted, which means the number came off a European spec sheet. That matters beyond
//    tidiness: the European car is often rated to tow when the US one is not rated at all.
//    Caught the Tesla Model Y L at 3,527 lb while its two siblings carry Tesla's US 3,500.
const kgRound = lb => {
  const kg = lb / 2.20462;
  return Math.abs(kg - Math.round(kg / 50) * 50) < 1.2;
};
for (const m of M) {
  const t = n(m.towCapacityLbs);
  if (t === null || t <= 0) continue;
  if (kgRound(t) && t % 50 !== 0)
    flag("unit-tell", `${name(m)}: tow ${t}lb is ${Math.round(t / 2.20462)}kg exactly — a converted European figure?`,
      `unit-tell/${m.id}/tow${t}`);
}
// Same nameplate carrying both conventions is a stronger signal than either value alone.
for (const [model, l] of siblings) {
  const vals = l.map(x => n(x.towCapacityLbs)).filter(v => v !== null && v > 0);
  if (vals.length < 2) continue;
  const metric = vals.filter(v => kgRound(v) && v % 50 !== 0);
  if (metric.length && metric.length < vals.length)
    flag("unit-tell", `${model}: mixed tow units across trims — ${l.filter(x => n(x.towCapacityLbs) > 0).map(x => `${x.trim} ${x.towCapacityLbs}lb`).join(", ")}`,
      `unit-tell-mixed/${model.replace(/\s+/g, "-")}/${vals.slice().sort((a, b) => a - b).join("+")}`);
}

// 8. Top speed that isn't a whole number. Every other figure in this field is, so a fractional one
//    is an unrounded unit conversion that escaped the house convention rather than a real spec.
for (const m of M) {
  const t = n(m.performance?.topSpeedMph);
  if (t !== null && !Number.isInteger(t))
    flag("unit-tell", `${name(m)}: top speed ${t}mph is not a whole number`, `unit-tell-frac/${m.id}/${t}`);
}

// 9. Structural impossibility: seats-folded cargo smaller than seats-up cargo.
for (const m of M) {
  const r = n(m.cargo?.rearCubicFeet), x = n(m.cargo?.maxCubicFeet);
  if (r !== null && x !== null && r > x)
    flag("impossible", `${name(m)}: rear cargo ${r} exceeds max ${x}`, `cargo-order/${m.id}/${r}-${x}`);
}

// 10. links.epaWindowSticker holding something that isn't an EPA link. SCHEMA defines this
// field as a fueleconomy.gov URL, and `npm run fetch-epa` derives epaSizeClass from the id
// inside it — so a manufacturer/review URL parked here doesn't just mislabel the link, it
// silently makes the record underivable. Five records had picked up whatever `range.source`
// happened to be; four of them were sitting in the epaSizeClass gap as a result.
for (const m of M) {
  const u = m.links?.epaWindowSticker;
  if (u && !/(^|\.)fueleconomy\.gov$/.test(new URL(u).hostname))
    flag("bad-link", `${name(m)}: links.epaWindowSticker points at ${new URL(u).hostname}, not fueleconomy.gov`,
      `bad-epa-link/${m.id}/${new URL(u).hostname}`);
}

// 11. Duplicate identity.
const seen = new Map();
for (const m of M) {
  const k = `${m.modelYear}|${m.make}|${m.model}|${m.trim}`;
  if (seen.has(k)) flag("duplicate", `two records share identity: ${k}`);
  seen.set(k, m);
}

const byCheck = {};
for (const f of flags) (byCheck[f.check] ??= []).push(f.msg);
const LABELS = {
  "model-year": "Record's model year disagrees with its own cited EPA source",
  "epa-range": "Recorded EPA range disagrees with the EPA source",
  "trim-drift": "Possible trim drift — a figure shared where it probably shouldn't be",
  implausible: "Physically implausible within a model",
  "bad-link": "links.epaWindowSticker isn't a fueleconomy.gov URL",
  efficiency: "Efficiency outside the plausible band — range or battery suspect",
  duplicate: "Duplicate record identity",
  "unit-tell": "Number looks converted from metric rather than taken from a US source",
  impossible: "Structurally impossible value",
};
for (const [check, msgs] of Object.entries(byCheck)) {
  console.log(`\n${LABELS[check]} (${msgs.length}):`);
  for (const m of msgs) console.log(`  · ${m}`);
}
if (cleared.length) {
  console.log(`\nPreviously investigated and cleared (${cleared.length}) — shown, not hidden:`);
  for (const c of cleared) console.log(`  · ${c.msg}\n      ${c.why} (cleared ${c.clearedOn})`);
}

// A cleared entry that no longer matches anything is itself a defect: either the data moved on
// and the exception is dead weight, or someone mistyped a key and a live flag is going unsilenced.
const matched = new Set(cleared.map(c => c.key));
const stale = Object.keys(CLEARED).filter(k => !matched.has(k));
if (stale.length) {
  console.log(`\nStale entries in audit-cleared.json (${stale.length}) — they match nothing; delete or fix:`);
  for (const k of stale) console.log(`  · ${k}`);
}

console.log(flags.length
  ? `\n${flags.length} flag(s) — heuristics, not verdicts. Check each against a trim-specific source.`
  : "\nNo flags.");
