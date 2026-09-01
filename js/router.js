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

// Comparison links come in two shapes:
//
//   /compare/12-87-34            a hand-picked comparison
//   /compare/12/similar/87-34    built by "Compare all" from car 12's Similar Vehicles list
//
// The second names its origin car in its own path segment rather than relying on a
// first-id-is-special convention, so the view can anchor to it — pin it as the leftmost
// column and send "Back to" there — after a reload or a handoff to another device.
//
// Order is meaningful and preserved exactly as given: these ids drive the column order, so a
// link can hand someone the same left-to-right arrangement the sender was looking at. (They
// used to come out in dataset order regardless, which is why the origin car was only
// accidentally first — and only while catalogIds happened to ascend with file position.)
//
// Deliberately path segments, not a query string, so this rides the exact same 404.html
// deep-link mechanism already proven for car pages above, rather than exercising the
// query-string-preserving branch of that redirect trick, which nothing else in this app has
// ever used or tested. No static file backs these routes (can't prerender every combination
// of 149+ cars), so a crawler hit falls back to the homepage. catalogId exists purely to keep
// these URLs short, not for anything else.
const COMPARE_ROOT = `${BASE_PATH}/compare`;
const SIMILAR_ROUTE = /^(\d+)\/similar\/(.+)$/;

// `originId` must also appear in `catalogIds` — it's part of the comparison, not separate
// from it — and is emitted from its own segment rather than repeated in the id list.
export function compareSharePath(catalogIds, { originId = null } = {}) {
  if (originId != null) {
    const rest = catalogIds.filter(id => id !== originId);
    return rest.length ? `${COMPARE_ROOT}/${originId}/similar/${rest.join("-")}` : `${COMPARE_ROOT}/${originId}`;
  }
  return catalogIds.length ? `${COMPARE_ROOT}/${catalogIds.join("-")}` : COMPARE_ROOT;
}

// Returns { ids, originId } for a comparison link, or null if this isn't one. `ids` is the
// whole comparison in display order, origin first when there is one; `originId` is null for a
// hand-picked comparison. A bare "/compare" carries nothing to restore and returns null.
export function compareRouteFromPath(pathname) {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (normalized !== COMPARE_ROOT && !normalized.startsWith(`${COMPARE_ROOT}/`)) return null;
  const rest = normalized.slice(COMPARE_ROOT.length + 1);
  if (!rest) return null;

  const similar = rest.match(SIMILAR_ROUTE);
  if (similar) {
    const originId = Number(similar[1]);
    const ids = parseIds(similar[2]);
    if (!isId(originId) || !ids) return null;
    // Origin leads, and can't also appear in the tail — that would render it twice.
    return { ids: [originId, ...ids.filter(id => id !== originId)], originId };
  }

  const ids = parseIds(rest);
  return ids ? { ids, originId: null } : null;
}

function isId(n) {
  return Number.isInteger(n) && n > 0;
}

function parseIds(segment) {
  const ids = segment.split("-").map(Number);
  return ids.every(isId) ? ids : null;
}
