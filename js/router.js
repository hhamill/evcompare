// Client-side path routing: /{modelYear}/{model-slug}/{trim-slug} maps to one car.
//
// BASE_PATH only affects generated route paths (pushState targets, canonical URLs) — every actual
// resource reference (css/js/fetch) in index.html and the prerendered pages is root-relative (a
// leading "/"), not built from this constant, so there's no base-href juggling tied to this value
// anymore. Leave "" for a domain/user-page root deploy (our actual deployment: evcompare.org). Only
// set it back to "/evcompare" if this ever moves to a GitHub Pages *project* page again (e.g.
// https://user.github.io/evcompare/ with no custom domain) — and if so, also restore root-relative
// asset paths to be BASE_PATH-prefixed instead, and match `pathSegmentsToKeep` in 404.html (0 = root,
// 1 = one path segment kept).
export const BASE_PATH = "";

function slugify(str) {
  return String(str)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function carPath(car) {
  return `${BASE_PATH}/${car.modelYear}/${slugify(car.model)}/${slugify(car.trim)}`;
}

// Precompute path -> car once per dataset load so routing lookups are O(1).
export function buildCarPathIndex(cars) {
  const map = new Map();
  for (const car of cars) {
    const path = carPath(car);
    const existing = map.get(path);
    if (existing && existing.id !== car.id) {
      console.warn(`[router] URL collision: "${path}" matches both ${existing.id} and ${car.id}; keeping the first.`);
      continue;
    }
    map.set(path, car);
  }
  return map;
}

export function carForPath(pathIndex, pathname) {
  // carPath() never has a trailing slash, but a prerendered page's directory-index URL
  // (".../gt-awd/") or a manually-typed one does — normalize so both match the same key.
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return pathIndex.get(normalized) || null;
}

export function homePath() {
  return BASE_PATH ? `${BASE_PATH}/` : "/";
}

// Shareable comparison links: /compare/{catalogId}-{catalogId}-... — deliberately path
// segments, not a query string, so this rides the exact same 404.html deep-link mechanism
// already proven for car pages above, rather than exercising the query-string-preserving
// branch of that redirect trick, which nothing else in this app has ever used or tested.
// No static file backs this route (can't prerender every combination of 149+ cars), so a
// hard reload/crawler hit falls back to the homepage — same accepted tradeoff as /compare
// itself; catalogId exists purely to keep this URL short, not for anything else.
const COMPARE_PREFIX = `${BASE_PATH}/compare/`;

export function compareSharePath(catalogIds) {
  return `${COMPARE_PREFIX}${catalogIds.join("-")}`;
}

// Returns an array of positive integers, or null if pathname isn't a "/compare/<ids>" share
// link at all (including the plain "/compare" and "/compare/similar" analytics-only paths —
// "similar" fails to parse as a number, so this correctly falls through without touching them).
export function compareIdsFromPath(pathname) {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (!normalized.startsWith(COMPARE_PREFIX)) return null;
  const rest = normalized.slice(COMPARE_PREFIX.length);
  if (!rest) return null;
  const ids = rest.split("-").map(Number);
  if (ids.some(n => !Number.isInteger(n) || n <= 0)) return null;
  return ids;
}
