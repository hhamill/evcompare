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

// Hub landing pages: /{hub-slug}. Unlike /compare, these ARE backed by real prerendered
// files, so a crawler or hard reload gets the page itself rather than the 404.html fallback.
export function hubPath(hub) {
  return `${BASE_PATH}/${hub.slug}`;
}

// Matches a pathname to a hub slug. Tolerates the trailing slash the prerendered directories
// are served under (/evs-that-tow/ and /evs-that-tow both land here).
export function hubSlugFromPath(pathname) {
  const base = BASE_PATH && pathname.startsWith(BASE_PATH) ? pathname.slice(BASE_PATH.length) : pathname;
  const parts = base.split("/").filter(Boolean);
  return parts.length === 1 ? parts[0] : null;
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
// "/compare/similar/<ids>" records that the comparison was built by "Compare all" from a car's
// similar-vehicles list, rather than picked by hand. It only distinguishes the entry point for
// analytics; the ids after it are what actually rebuild the view, and both forms restore
// identically.
const SIMILAR_SEGMENT = "similar/";

export function compareSharePath(catalogIds, { fromSimilar = false } = {}) {
  const entry = `${BASE_PATH}/compare${fromSimilar ? "/similar" : ""}`;
  // Removing the last car empties the selection while the view stays open. Return the bare
  // entry path rather than a dangling "/compare/" — it round-trips to null either way, but
  // there's no reason to put a trailing slash in the address bar.
  return catalogIds.length ? `${entry}/${catalogIds.join("-")}` : entry;
}

// Returns an array of positive integers, or null if pathname isn't a comparison link carrying
// ids. Accepts both "/compare/<ids>" and "/compare/similar/<ids>". The bare "/compare" and
// "/compare/similar" still return null and fall through to the homepage — they carry no state
// to restore, which is exactly why entering compare no longer leaves the URL in that shape.
export function compareIdsFromPath(pathname) {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (!normalized.startsWith(COMPARE_PREFIX)) return null;
  let rest = normalized.slice(COMPARE_PREFIX.length);
  if (rest.startsWith(SIMILAR_SEGMENT)) rest = rest.slice(SIMILAR_SEGMENT.length);
  if (!rest) return null;
  const ids = rest.split("-").map(Number);
  if (ids.some(n => !Number.isInteger(n) || n <= 0)) return null;
  return ids;
}

export function isCompareFromSimilarPath(pathname) {
  return pathname.startsWith(`${COMPARE_PREFIX}${SIMILAR_SEGMENT}`);
}

// Which analytics bucket a comparison URL belongs to, independent of the ids in it — so
// GoatCounter keeps seeing two clean paths instead of one row per combination of cars.
export function compareAnalyticsPath(pathname) {
  return isCompareFromSimilarPath(pathname) ? `${BASE_PATH}/compare/similar` : `${BASE_PATH}/compare`;
}
