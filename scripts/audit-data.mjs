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
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const M = JSON.parse(readFileSync(path.join(ROOT, "data", "evs.json"), "utf8")).models;
const n = v => (typeof v === "number" ? v : null);
const name = m => `${m.modelYear} ${m.make} ${m.model} ${m.trim}`;

const byModel = {};
for (const m of M) (byModel[`${m.make} ${m.model}`] ??= []).push(m);
const siblings = Object.entries(byModel).filter(([, l]) => l.length > 1);

const flags = [];
const flag = (check, msg) => flags.push({ check, msg });

// 1. Different power, identical 0-60. Same power + same 0-60 is fine and common (shared
//    powertrain across trim levels), so only differing power is flagged.
for (const [model, l] of siblings)
  for (let i = 0; i < l.length; i++) for (let j = i + 1; j < l.length; j++) {
    const [a, b] = [l[i], l[j]];
    const ah = n(a.performance?.horsepowerHp), bh = n(b.performance?.horsepowerHp);
    const az = n(a.performance?.zeroTo60Sec), bz = n(b.performance?.zeroTo60Sec);
    if (ah && bh && az && bz && ah !== bh && az === bz)
      flag("trim-drift", `${model}: ${a.trim} (${ah}hp) and ${b.trim} (${bh}hp) share ${az}s`);
  }

// 2. More power but slower — implausible within one model unless weight differs a lot.
for (const [model, l] of siblings)
  for (const a of l) for (const b of l) {
    if (a === b) continue;
    const ah = n(a.performance?.horsepowerHp), bh = n(b.performance?.horsepowerHp);
    const az = n(a.performance?.zeroTo60Sec), bz = n(b.performance?.zeroTo60Sec);
    if (ah && bh && az && bz && ah > bh && az > bz)
      flag("implausible", `${model}: ${a.trim} ${ah}hp/${az}s slower than ${b.trim} ${bh}hp/${bz}s`);
  }

// 3. Different drivetrain but identical range AND battery — RWD and AWD of the same car
//    essentially never post the same EPA range.
for (const [model, l] of siblings)
  for (let i = 0; i < l.length; i++) for (let j = i + 1; j < l.length; j++) {
    const [a, b] = [l[i], l[j]];
    const ar = n(a.range?.epaMiles), br = n(b.range?.epaMiles);
    const ab = n(a.battery?.usableKwh), bb = n(b.battery?.usableKwh);
    if (a.drivetrain !== b.drivetrain && ar && br && ar === br && ab === bb)
      flag("trim-drift", `${model}: ${a.trim} (${a.drivetrain}) and ${b.trim} (${b.drivetrain}) share ${ar}mi / ${ab}kWh`);
  }

// 4. Efficiency outside what a road-going EV achieves. Real values run ~1.5 (Hummer) to ~5.4
//    (Tesla Standard on LFP); outside that, either range or battery is wrong.
for (const m of M) {
  const r = n(m.range?.epaMiles), b = n(m.battery?.usableKwh);
  if (!r || !b) continue;
  const e = r / b;
  if (e < 1.4 || e > 5.6) flag("efficiency", `${name(m)}: ${e.toFixed(2)} mi/kWh (${r}mi / ${b}kWh)`);
}

// 5. Duplicate identity.
const seen = new Map();
for (const m of M) {
  const k = `${m.modelYear}|${m.make}|${m.model}|${m.trim}`;
  if (seen.has(k)) flag("duplicate", `two records share identity: ${k}`);
  seen.set(k, m);
}

const byCheck = {};
for (const f of flags) (byCheck[f.check] ??= []).push(f.msg);
const LABELS = {
  "trim-drift": "Possible trim drift — a figure shared where it probably shouldn't be",
  implausible: "Physically implausible within a model",
  efficiency: "Efficiency outside the plausible band — range or battery suspect",
  duplicate: "Duplicate record identity",
};
for (const [check, msgs] of Object.entries(byCheck)) {
  console.log(`\n${LABELS[check]} (${msgs.length}):`);
  for (const m of msgs) console.log(`  · ${m}`);
}
console.log(flags.length
  ? `\n${flags.length} flag(s) — heuristics, not verdicts. Check each against a trim-specific source.`
  : "\nNo flags.");
