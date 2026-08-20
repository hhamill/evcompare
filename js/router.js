// Client-side path routing: /{modelYear}/{model-slug}/{trim-slug} maps to one car.
//
// If this site is deployed on a GitHub Pages *project* page (e.g. https://user.github.io/evcompare/),
// set BASE_PATH to "/evcompare" (match your repo name) so generated links include it. Leave it ""
// for a user/org root page (https://user.github.io/) or a custom domain at the root. If you change
// this, also update `pathSegmentsToKeep` in 404.html to match (0 = root, 1 = one path segment kept).
export const BASE_PATH = "/evcompare";

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
  return pathIndex.get(pathname) || null;
}

export function homePath() {
  return BASE_PATH ? `${BASE_PATH}/` : "/";
}
