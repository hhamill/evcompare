import { FIELDS } from "./fields.js?v=2";

// Similar-vehicle finder: ranks other cars against one "anchor" car and
// summarizes what's different (price/range deltas, features gained/lost).

const PRICE_BAND_TIGHT = 0.10; // "~within 10%" as requested
const PRICE_BAND_WIDE = 0.25; // fallback so cheap/expensive anchors still get matches

export function findSimilarCars(anchor, allCars, { limit = 4 } = {}) {
  const candidates = allCars.filter(c =>
    c.id !== anchor.id && !(c.make === anchor.make && c.model === anchor.model)
  );
  if (candidates.length === 0) return [];

  const priceDeltaPct = c =>
    typeof c.msrp === "number" && typeof anchor.msrp === "number"
      ? Math.abs(c.msrp - anchor.msrp) / anchor.msrp
      : null;

  let pool = candidates.filter(c => {
    const d = priceDeltaPct(c);
    return d !== null && d <= PRICE_BAND_TIGHT;
  });
  if (pool.length < limit) {
    const wider = candidates.filter(c => {
      const d = priceDeltaPct(c);
      return d !== null && d <= PRICE_BAND_WIDE;
    });
    if (wider.length > pool.length) pool = wider;
  }
  if (pool.length < limit) pool = candidates; // last resort: rank everything

  const scored = pool.map(c => ({ car: c, score: similarityScore(anchor, c) }));
  scored.sort((a, b) => a.score - b.score);

  return scored.slice(0, limit).map(({ car }) => ({ car, diff: buildDiff(anchor, car) }));
}

function similarityScore(anchor, c) {
  let score = 0;

  if (typeof anchor.msrp === "number" && typeof c.msrp === "number") {
    score += (Math.abs(c.msrp - anchor.msrp) / anchor.msrp) * 10;
  } else {
    score += 3;
  }

  if (c.bodyStyle !== anchor.bodyStyle) score += 3;
  if (!!c.isThreeRow !== !!anchor.isThreeRow) score += 0.6;
  if (c.drivetrain !== anchor.drivetrain) score += 0.3;

  const rangeA = anchor.range?.epaMiles, rangeC = c.range?.epaMiles;
  if (typeof rangeA === "number" && typeof rangeC === "number") {
    score += Math.abs(rangeA - rangeC) / 300;
  }

  if (typeof anchor.maxPassengers === "number" && typeof c.maxPassengers === "number") {
    score += Math.abs(anchor.maxPassengers - c.maxPassengers) * 0.2;
  }

  return score;
}

function buildDiff(anchor, car) {
  const priceDelta =
    typeof anchor.msrp === "number" && typeof car.msrp === "number"
      ? car.msrp - anchor.msrp
      : null;
  const rangeDelta =
    typeof anchor.range?.epaMiles === "number" && typeof car.range?.epaMiles === "number"
      ? car.range.epaMiles - anchor.range.epaMiles
      : null;

  const gained = [];
  const lost = [];
  for (const field of FIELDS) {
    if (field.type !== "boolean") continue;
    const a = !!field.get(anchor);
    const b = !!field.get(car);
    if (a === b) continue;
    if (b) gained.push(field.label);
    else lost.push(field.label);
  }

  return { priceDelta, rangeDelta, gained, lost };
}
