import { fieldByKey, fmtVal } from "./fields.js?v=12";

// Landing pages for questions people actually search — "3-row electric SUVs", "EVs that tow".
// Each hub is a PREDICATE evaluated against the dataset, not a list of ids (which would go
// stale silently the moment a model is added) and not a saved filterState (matchesFilters has
// no negation, so it can't express "non-Tesla", and it's shaped for driving the sidebar).
//
// Every hub reads its fields through fieldByKey().get() rather than reaching into the car
// object directly, so a hub's idea of "range" is literally the same accessor the cards and
// the compare table use, and all of them move together if the data shape ever changes.
const val = (key, car) => fieldByKey(key).get(car);
const num = (key, car) => { const v = val(key, car); return typeof v === "number" ? v : null; };
const fmt = (key, v) => fmtVal(fieldByKey(key), v);

// Formats "the longest-range is X at 364 mi" style clauses straight off the matched set, so
// every number in the prose is derived and none of it can go stale.
function extreme(cars, key, dir) {
  const withVal = cars.filter(c => num(key, c) !== null);
  if (!withVal.length) return null;
  const best = withVal.reduce((a, b) =>
    (dir === "desc" ? num(key, b) > num(key, a) : num(key, b) < num(key, a)) ? b : a);
  return { car: best, text: fmt(key, num(key, best)) };
}
const name = car => `${car.modelYear} ${car.make} ${car.model}`;

const PRACTICAL_HUBS = [
  {
    slug: "electric-suvs-with-three-rows",
    noun: "three-row electric SUVs",
    h1: "Electric SUVs with three rows",
    title: "3-Row Electric SUVs — Every Model Compared",
    blurb: "Every three-row electric SUV sold in the US, with seating, range and price side by side.",
    match: c => val("isThreeRow", c) === true,
    highlight: "maxPassengers", order: "desc",
    // Booleans this hub forces. Enums self-collapse (a scoped domain with one value is
    // hidden automatically); ranges are deliberately never listed here — their sliders clamp
    // to the scoped domain instead, so you can still narrow inside the hub.
    determines: ["isThreeRow"],
    intro: (cars, total) => {
      const r = extreme(cars, "epaRange", "desc"), p = extreme(cars, "msrp", "asc");
      return `${cars.length} of the ${total} electric vehicles we track seat three rows.`
        + (r ? ` The longest-range is the ${name(r.car)} at ${r.text}.` : "")
        + (p ? ` The most affordable starts at ${p.text}.` : "");
    },
  },
  {
    slug: "evs-under-40000",
    noun: "EVs under $40,000",
    h1: "Electric cars under $40,000",
    title: "Electric Cars Under $40,000 — Cheapest EVs Compared",
    blurb: "The most affordable electric vehicles on sale in the US, sorted by price.",
    match: c => { const v = num("msrp", c); return v !== null && v < 40000; },
    highlight: "msrp", order: "asc",
    determines: [],
    intro: (cars, total) => {
      const p = extreme(cars, "msrp", "asc"), r = extreme(cars, "epaRange", "desc");
      return `${cars.length} of the ${total} EVs we track start under $40,000.`
        + (p ? ` The cheapest is the ${name(p.car)} at ${p.text}.` : "")
        + (r ? ` The longest-range under $40k is the ${name(r.car)} at ${r.text}.` : "");
    },
  },
  {
    slug: "evs-with-300-mile-range",
    noun: "EVs with 300+ miles of range",
    h1: "EVs with 300+ miles of range",
    title: "Longest-Range EVs — 300+ Mile Electric Cars",
    blurb: "Electric vehicles with an EPA-rated range of 300 miles or more.",
    match: c => { const v = num("epaRange", c); return v !== null && v >= 300; },
    highlight: "epaRange", order: "desc",
    determines: [],
    intro: (cars, total) => {
      const r = extreme(cars, "epaRange", "desc"), p = extreme(cars, "msrp", "asc");
      return `${cars.length} of the ${total} EVs we track are EPA-rated at 300 miles or more.`
        + (r ? ` The longest is the ${name(r.car)} at ${r.text}.` : "")
        + (p ? ` The most affordable starts at ${p.text}.` : "");
    },
  },
  {
    slug: "evs-that-tow",
    noun: "EVs that tow 5,000 lb or more",
    h1: "EVs that tow 5,000 lb or more",
    title: "Electric Trucks & SUVs That Tow 5,000 lb+",
    blurb: "Electric vehicles rated to tow at least 5,000 pounds, sorted by capacity.",
    match: c => { const v = num("towCapacityLbs", c); return v !== null && v >= 5000; },
    highlight: "towCapacityLbs", order: "desc",
    determines: [],
    intro: (cars, total) => {
      const t = extreme(cars, "towCapacityLbs", "desc"), p = extreme(cars, "msrp", "asc");
      return `${cars.length} of the ${total} EVs we track are rated to tow 5,000 lb or more.`
        + (t ? ` The highest-rated is the ${name(t.car)} at ${t.text}.` : "")
        + (p ? ` The most affordable starts at ${p.text}.` : "");
    },
  },
  {
    slug: "quickest-evs",
    noun: "EVs under four seconds to 60",
    h1: "The quickest EVs — 0–60 in under 4 seconds",
    title: "Quickest EVs — 0–60 mph in Under 4 Seconds",
    blurb: "Electric vehicles that reach 60 mph in under four seconds, sorted by acceleration.",
    match: c => { const v = num("zeroTo60", c); return v !== null && v < 4; },
    highlight: "zeroTo60", order: "asc",
    determines: [],
    intro: (cars, total) => {
      const z = extreme(cars, "zeroTo60", "asc"), p = extreme(cars, "msrp", "asc");
      return `${cars.length} of the ${total} EVs we track reach 60 mph in under four seconds.`
        + (z ? ` The quickest is the ${name(z.car)} at ${z.text}.` : "")
        + (p ? ` The most affordable starts at ${p.text}.` : "");
    },
  },
  {
    slug: "fastest-charging-evs",
    noun: "EVs charging at 250 kW or more",
    h1: "The fastest-charging EVs — 250 kW and up",
    title: "Fastest-Charging EVs — 250 kW+ DC Fast Charging",
    blurb: "Electric vehicles that accept 250 kW or more on a DC fast charger.",
    match: c => { const v = num("maxDcKw", c); return v !== null && v >= 250; },
    highlight: "maxDcKw", order: "desc",
    determines: [],
    intro: (cars, total) => {
      const k = extreme(cars, "maxDcKw", "desc"), p = extreme(cars, "msrp", "asc");
      return `${cars.length} of the ${total} EVs we track accept 250 kW or more on a DC fast charger.`
        + (k ? ` The fastest is the ${name(k.car)} at ${k.text}.` : "")
        + (p ? ` The most affordable starts at ${p.text}.` : "");
    },
  },
  {
    slug: "evs-with-most-cargo-space",
    noun: "EVs with 70+ cu ft of cargo space",
    h1: "EVs with the most cargo space",
    title: "EVs With the Most Cargo Space — 70+ Cubic Feet",
    blurb: "Electric vehicles offering 70 cubic feet or more with the seats folded.",
    match: c => { const v = num("maxCubicFeet", c); return v !== null && v >= 70; },
    highlight: "maxCubicFeet", order: "desc",
    determines: [],
    intro: (cars, total) => {
      const g = extreme(cars, "maxCubicFeet", "desc"), p = extreme(cars, "msrp", "asc");
      return `${cars.length} of the ${total} EVs we track offer 70 cu ft or more with the seats folded.`
        + (g ? ` The largest is the ${name(g.car)} at ${g.text}.` : "")
        + (p ? ` The most affordable starts at ${p.text}.` : "");
    },
  },
  {
    slug: "small-electric-suvs",
    noun: "small electric SUVs",
    h1: "Small electric SUVs",
    title: "Small Electric SUVs — Every Model Compared",
    blurb: "Compact electric SUVs and crossovers, sized by the EPA rather than by marketing.",
    match: c => c.epaSizeClass === "Small SUV",
    highlight: "epaRange", order: "desc",
    determines: [],
    intro: (cars, total) => {
      const r = extreme(cars, "epaRange", "desc"), p = extreme(cars, "msrp", "asc");
      return `${cars.length} of the ${total} EVs we track fall in the EPA's Small Sport Utility Vehicle class.`
        + ` That's the agency's own sizing, not ours — the same figure on every window sticker.`
        + (r ? ` The longest-range is the ${name(r.car)} at ${r.text}.` : "")
        + (p ? ` The most affordable starts at ${p.text}.` : "");
    },
  },
  {
    // EPA gives SUVs exactly two classes, Small and Standard, so "Standard" means midsize and
    // up rather than full-size specifically. Titled "Larger" to avoid overclaiming: the class
    // holds an Audi Q4 e-tron alongside an Escalade IQ.
    slug: "large-electric-suvs",
    noun: "larger electric SUVs",
    h1: "Larger electric SUVs",
    title: "Large & Midsize Electric SUVs — Every Model Compared",
    blurb: "The electric SUVs the EPA classes above its Small category — midsize through full-size.",
    match: c => c.epaSizeClass === "Standard SUV",
    highlight: "epaRange", order: "desc",
    determines: [],
    intro: (cars, total) => {
      const r = extreme(cars, "epaRange", "desc"), s3 = cars.filter(c => c.isThreeRow).length;
      return `${cars.length} of the ${total} EVs we track sit in the EPA's Standard Sport Utility Vehicle`
        + ` class — everything it doesn't call Small, so midsize through full-size rather than`
        + ` full-size alone.`
        + (s3 ? ` ${s3} of them seat three rows.` : "")
        + (r ? ` The longest-range is the ${name(r.car)} at ${r.text}.` : "");
    },
  },
  {
    // Repurposed 2026-08-28 from "has a NACS port" to "can actually charge at a Supercharger".
    // The old framing answered how a car plugs in; this one answers what buyers actually ask.
    // Now that charging.superchargerAccess exists, the page can state the answer instead of
    // disclaiming it in a closing sentence. The old slug still resolves — prerender emits a
    // redirect stub there, because it was the most-cited page on the site.
    //
    // The list is deliberately near-total (133 of 138) and that IS the answer: almost every
    // non-Tesla EV can Supercharge now. The information a reader wants is carried by the intro —
    // the native/adapter split, and the handful that still cannot.
    slug: "non-tesla-evs-with-supercharger-access",
    noun: "non-Tesla EVs that can charge at a Tesla Supercharger",
    h1: "Non-Tesla EVs that can charge at a Tesla Supercharger",
    title: "Which Non-Tesla EVs Can Use Tesla Superchargers",
    blurb: "Non-Tesla electric vehicles the manufacturer has enabled on the Tesla Supercharger network, natively or with an approved adapter.",
    match: c => c.make !== "Tesla" && val("superchargerAccess", c) === true,
    highlight: "maxDcKw", order: "desc",
    determines: [],
    intro: (cars, total, all) => {
      const nonTesla = all.filter(c => c.make !== "Tesla");
      const native = cars.filter(c => val("chargePort", c) === "NACS");
      const adapter = cars.filter(c => val("chargePort", c) === "CCS1");
      const free = adapter.filter(c => num("nacsAdapterCost", c) === 0).length;
      const without = nonTesla.filter(c => val("superchargerAccess", c) !== true);
      const names = [...new Set(without.map(c => `${c.make} ${c.model}`))];
      return `${cars.length} of the ${nonTesla.length} non-Tesla EVs we track can charge at a Tesla `
        + `Supercharger — so the question is now which ones can't. `
        + `${native.length} ship with a native NACS port and just plug in. `
        + `${adapter.length} use a CCS1 port with a manufacturer-approved NACS DC fast-charge adapter`
        + (free ? `, ${free} of which include it at no cost` : "")
        + `. `
        + (names.length
            ? `The ${without.length} that cannot: ${names.join(", ")}. `
            : "")
        + `Access is granted by the automaker, not by the plug — it needs an agreement with Tesla `
        + `and app/billing integration, so a car can be physically compatible and still not be `
        + `allowed on the network. Adapters here are DC fast-charge adapters; separate `
        + `NACS-to-J1772 adapters exist for AC/Level 2 charging, and no single adapter does both.`;
    },
  },

];

export function hubBySlug(slug, hubs) {
  return hubs.find(h => h.slug === slug) || null;
}

// Cars matching a hub, ordered by the spec the page is about — that ordering, and the matching
// highlight column, is what keeps these from being one list in eight different arrangements.
export function hubCars(hub, cars) {
  const k = hub.highlight;
  const v = c => { const x = fieldByKey(k).get(c); return typeof x === "number" ? x : null; };
  return cars.filter(hub.match).sort((a, b) => {
    const av = v(a), bv = v(b);
    if (av === null && bv === null) return 0;
    if (av === null) return 1;          // unknowns sink, same as the main sort
    if (bv === null) return -1;
    return hub.order === "asc" ? av - bv : bv - av;
  });
}

// ---------- generated hubs ----------

// Make and body-style hubs are derived from the dataset rather than hand-written, so adding a
// marque to evs.json adds its landing page automatically. Together with the practical hubs
// above these cover every car in the catalogue, which matters because the homepage grid is
// JS-rendered: without a hub linking to it, a car page's only crawlable inbound links are the
// four "similar vehicles" entries on its siblings.
const MAKE_MIN = 4;   // below this a make page is too thin to be worth indexing
const BODY_MIN = 5;   // Minivan (2) and Van (1) fall out; their cars are covered by make hubs

const slugify = str => String(str).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const plural = { SUV: "SUVs", Sedan: "sedans", Truck: "trucks", Hatchback: "hatchbacks",
                 Coupe: "coupes", Minivan: "minivans", Van: "vans" };

function groupBy(cars, key) {
  const out = new Map();
  for (const c of cars) {
    const v = key(c);
    if (v) (out.get(v) ?? out.set(v, []).get(v)).push(c);
  }
  return out;
}

function makeHub(make, n) {
  return {
    slug: `${slugify(make)}-electric-cars`,
    noun: `${make} EVs`,
    h1: `${make} electric vehicles`,
    title: `${make} Electric Cars — Every Model, Range & Price`,
    blurb: `Every ${make} electric vehicle sold in the US, with range, price and charging side by side.`,
    match: c => c.make === make,
    highlight: "epaRange", order: "desc",
    minCount: MAKE_MIN,
    determines: [],
    intro: (cars, total) => {
      const r = extreme(cars, "epaRange", "desc"), p = extreme(cars, "msrp", "asc");
      return `We track ${cars.length} ${make} electric vehicle${cars.length === 1 ? "" : "s"} out of ${total} EVs overall.`
        + (r ? ` The longest-range is the ${name(r.car)} at ${r.text}.` : "")
        + (p ? ` The most affordable starts at ${p.text}.` : "");
    },
  };
}

function bodyHub(body, n) {
  const word = plural[body] ?? `${body}s`;
  return {
    slug: `electric-${slugify(word)}`,
    noun: `electric ${word}`,
    h1: `Electric ${word}`,
    title: `Electric ${word} — Every Model Compared`,
    blurb: `Every electric ${body.toLowerCase()} sold in the US, compared on range, price and charging.`,
    match: c => c.bodyStyle === body,
    highlight: "epaRange", order: "desc",
    minCount: BODY_MIN,
    // The body style is the page; a one-option Body Style list would be noise.
    determines: [],
    intro: (cars, total) => {
      const r = extreme(cars, "epaRange", "desc"), p = extreme(cars, "msrp", "asc");
      return `${cars.length} of the ${total} EVs we track are ${word}.`
        + (r ? ` The longest-range is the ${name(r.car)} at ${r.text}.` : "")
        + (p ? ` The most affordable starts at ${p.text}.` : "");
    },
  };
}

// Called once with the loaded dataset by both prerender and app.js, so the two always agree
// on which hubs exist.
export function buildHubs(cars) {
  const makes = [...groupBy(cars, c => c.make)].filter(([, l]) => l.length >= MAKE_MIN)
    .sort((a, b) => a[0].localeCompare(b[0])).map(([m, l]) => makeHub(m, l.length));
  const bodies = [...groupBy(cars, c => c.bodyStyle)].filter(([, l]) => l.length >= BODY_MIN)
    .sort((a, b) => b[1].length - a[1].length).map(([b, l]) => bodyHub(b, l.length));
  return { practical: PRACTICAL_HUBS, bodies, makes, all: [...PRACTICAL_HUBS, ...bodies, ...makes] };
}

// The hubs a given car belongs to. Trivial precisely because hubs are predicates — with
// hardcoded id lists this would need a reverse index kept in sync by hand.
export function hubsForCar(car, hubs) {
  return hubs.filter(h => h.match(car));
}
