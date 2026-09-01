import { FIELDS, BODY_SPRITE } from "./fields.js?v=17";
import { computeDomains, defaultFilterState, matchesFilters, renderFilterSidebar, describeActiveFilters, clearFilter } from "./filters.js?v=13";
import { renderCardGrid, renderCompareTable, renderDetailModal, renderSkeletonGrid, renderLoadError } from "./render.js?v=34";
import { carPath, buildCarPathIndex, carForPath, homePath, compareSharePath, compareIdsFromPath, hubSlugFromPath } from "./router.js?v=6";
import { buildHubs, hubBySlug } from "./hubs.js?v=7";

const MAX_COMPARE = 6;

// Mirrors scripts/prerender.mjs's SITE_NAME/title format so the tab title matches whether a
// car page is reached via a hard load (prerendered <title>) or client-side "navigation" (pushState).
const SITE_NAME = "EV Compare";
const HOME_TITLE = "EV Compare — Find and compare electric vehicles";
const titleFor = car => `${car.modelYear} ${car.make} ${car.model} ${car.trim} — Specs & Price | ${SITE_NAME}`;
const compareTitle = n => `Comparing ${n} vehicle${n === 1 ? "" : "s"} — ${SITE_NAME}`;

// Compare has no prerendered pages of its own (not remotely tractable to prerender every
// combination of 149 cars), so these paths are cosmetic/analytics-only — a direct hard load
// of "/compare" just shows the homepage, same as any other unrecognized path. What they do
// give us: a distinct URL + title per entry point, and (via trackPageview below) a distinct
// GoatCounter pageview, so "clicked Compare" and "clicked Compare all from similar cars" show
// up as different traffic instead of both looking like plain homepage views.
const COMPARE_PATH = "/compare";
const COMPARE_FROM_SIMILAR_PATH = "/compare/similar";

// GoatCounter's count.js auto-fires one pageview on initial load using whatever
// location/title were current at that point; it has no idea about our client-side view
// changes afterwards. Calling count() with no args re-reads the *current* location/title,
// so as long as this runs after we've already updated the URL/title, it records a proper
// virtual pageview for that transition. No-ops quietly if the script hasn't loaded yet
// (slow network) or was blocked (ad blockers commonly block analytics scripts) — this is
// best-effort visibility, not something the app depends on.
function trackPageview() {
  if (window.goatcounter && typeof window.goatcounter.count === "function") {
    window.goatcounter.count();
  }
}

// Shared "Share" button behavior: copy a URL, flash the button's own label to confirm it
// worked instead of a separate toast. navigator.clipboard needs a secure context (fine —
// the site is HTTPS-only) and can still reject in rare cases (permissions policy, an
// unfocused document); a silent failure just means nothing got copied, not a broken button.
function copyToClipboard(text, btn) {
  const original = btn.textContent;
  navigator.clipboard?.writeText(text).then(() => {
    btn.textContent = "Copied!";
    setTimeout(() => { btn.textContent = original; }, 1500);
  }).catch(() => {});
}

// init() can run more than once (Retry on the load-error state), but the global listeners
// must only ever be attached once. See init().
let listenersBound = false;

const state = {
  cars: [],
  domains: {},
  filterState: {},
  searchText: "",
  compareSet: new Set(),
  view: "results", // "results" | "compare"
  activeDetailCar: null,
  hub: null,            // active hub landing page, or null on the homepage
  hubs: [],             // every hub, built from the dataset (see js/hubs.js)
  pathIndex: null,
  catalogIndex: null,
  sortKey: "default",
};

const el = {
  topbar: document.querySelector(".topbar"),
  layoutEl: document.querySelector(".layout"),
  sidebar: document.getElementById("filterGroups"),
  sidebarEl: document.getElementById("sidebar"),
  sidebarBackdrop: document.getElementById("sidebarBackdrop"),
  filtersToggleBtn: document.getElementById("filtersToggleBtn"),
  sidebarCloseBtn: document.getElementById("sidebarCloseBtn"),
  cardGrid: document.getElementById("cardGrid"),
  viewResults: document.getElementById("viewResults"),
  viewCompare: document.getElementById("viewCompare"),
  compareTable: document.getElementById("compareTable"),
  compareScroll: document.querySelector(".compare-scroll"),
  compareScrollNav: document.getElementById("compareScrollNav"),
  compareScrollLeftBtn: document.getElementById("compareScrollLeftBtn"),
  compareScrollRightBtn: document.getElementById("compareScrollRightBtn"),
  compareCount: document.getElementById("compareCount"),
  resultCount: document.getElementById("resultCount"),
  activeFilters: document.getElementById("activeFilters"),
  searchInput: document.getElementById("searchInput"),
  sortSelect: document.getElementById("sortSelect"),
  resetFiltersBtn: document.getElementById("resetFiltersBtn"),
  backToResultsBtn: document.getElementById("backToResultsBtn"),
  clearCompareBtn: document.getElementById("clearCompareBtn"),
  shareCompareBtn: document.getElementById("shareCompareBtn"),
  compareBar: document.getElementById("compareBar"),
  compareBarText: document.getElementById("compareBarText"),
  compareBarClearBtn: document.getElementById("compareBarClearBtn"),
  compareBarViewBtn: document.getElementById("compareBarViewBtn"),
  detailModal: document.getElementById("detailModal"),
  modalBody: document.getElementById("modalBody"),
  modalCloseBtn: document.getElementById("modalCloseBtn"),
  themeToggleBtn: document.getElementById("themeToggleBtn"),
};

// Cycles auto (follow system) -> light -> dark -> auto. Applied as early as possible (before
// the data fetch even starts) so there's no flash of the wrong theme on load.
const THEME_STORAGE_KEY = "evcompare-theme";
const THEME_ORDER = ["auto", "light", "dark"];
const THEME_ICONS = { auto: "🌓", light: "☀️", dark: "🌙" };
const THEME_LABELS = { auto: "Auto (follows system)", light: "Light", dark: "Dark" };

function getStoredTheme() {
  const v = localStorage.getItem(THEME_STORAGE_KEY);
  return THEME_ORDER.includes(v) ? v : "auto";
}

function applyTheme(theme) {
  if (theme === "auto") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", theme);
  el.themeToggleBtn.textContent = THEME_ICONS[theme];
  const description = `Theme: ${THEME_LABELS[theme]} (click to change)`;
  el.themeToggleBtn.title = description;
  el.themeToggleBtn.setAttribute("aria-label", description);
}

function initTheme() {
  applyTheme(getStoredTheme());
  el.themeToggleBtn.addEventListener("click", () => {
    const next = THEME_ORDER[(THEME_ORDER.indexOf(getStoredTheme()) + 1) % THEME_ORDER.length];
    localStorage.setItem(THEME_STORAGE_KEY, next);
    applyTheme(next);
  });
}

initTheme();

async function init() {
  // Static per-car pages render a full server-side fallback (title, summary, complete spec
  // table, links, similar vehicles) so crawlers/clients that don't run JS get real, complete
  // content — see scripts/prerender.mjs. Once JS is running at all, the real interactive
  // detail modal (or homepage fallback) takes over, so drop it here unconditionally; a no-op
  // on the homepage, where it doesn't exist.
  document.getElementById("staticCarDetail")?.remove();
  // Hub landing pages ship the same no-JS fallback treatment: a real, ordered list for
  // crawlers, dropped the moment the interactive grid can take over.
  document.getElementById("staticHubList")?.remove();

  mountBodySprite();

  // ~400KB over the wire with nothing to show until it lands. Previously the user watched an
  // empty grid beside a count reading "0 vehicles" — indistinguishable from "no matches" —
  // and a failed fetch left the page blank forever with only an unhandled rejection to show
  // for it. Skeleton first, real error state on failure, retry without a full page reload.
  renderSkeletonGrid(el.cardGrid);
  el.resultCount.textContent = "Loading vehicles…";

  let cars;
  try {
    const res = await fetch("/data/evs.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    ({ models: cars } = await res.json());
  } catch {
    el.resultCount.textContent = "";
    renderLoadError(el.cardGrid, () => init());
    return;
  }
  state.cars = cars;
  // Built from the loaded dataset, exactly as prerender does, so the two always agree on
  // which hubs exist — make and body-style hubs are derived, not hand-listed.
  state.hubs = buildHubs(cars).all;
  state.hub = hubBySlug(hubSlugFromPath(location.pathname), state.hubs);
  // Domains come from the hub's matched set, not all 149. That single argument is what makes
  // the sliders clamp to the scope: on /evs-under-40000 the price slider tops out at $40k, so
  // you can narrow further but never widen back out of the hub you're standing in.
  state.domains = computeDomains(state.hub ? cars.filter(state.hub.match) : cars);
  state.filterState = defaultFilterState(state.domains);
  state.pathIndex = buildCarPathIndex(cars);
  state.catalogIndex = new Map(cars.map(c => [c.catalogId, c]));

  // A shared comparison link — reconstruct before the first render so there's no flash of
  // the homepage first. A car since removed from the dataset just gets skipped; the rest of
  // the comparison still loads if at least one id resolves.
  const sharedIds = compareIdsFromPath(location.pathname);
  if (sharedIds) {
    const foundCars = sharedIds.map(id => state.catalogIndex.get(id)).filter(Boolean);
    if (foundCars.length) {
      state.compareSet = new Set(foundCars.map(c => c.id));
      state.view = "compare";
      document.title = compareTitle(foundCars.length);
    }
  }

  rebuildSidebar();

  // Guarded because init() is also the Retry handler on the load-error state: without this,
  // a retry would bind a second copy of every global listener (and a second ResizeObserver),
  // so afterwards a single click on Reset/Compare would fire its handler twice.
  if (!listenersBound) {
    bindGlobalEvents();
    syncTopbarHeight();
    listenersBound = true;
  }
  renderAll();

  const carFromUrl = carForPath(state.pathIndex, location.pathname);
  if (carFromUrl) openDetail(carFromUrl, { historyMode: "none" });
}

function bindGlobalEvents() {
  el.searchInput.addEventListener("input", e => {
    state.searchText = e.target.value.trim();
    renderResultsView();
  });

  el.sortSelect.addEventListener("change", e => {
    state.sortKey = e.target.value;
    renderResultsView();
  });

  el.resetFiltersBtn.addEventListener("click", resetFilters);

  el.backToResultsBtn.addEventListener("click", () => {
    state.view = "results";
    renderAll();
    leaveCompareUrl();
  });

  el.clearCompareBtn.addEventListener("click", () => {
    state.compareSet.clear();
    state.view = "results";
    renderAll();
    leaveCompareUrl();
  });

  el.shareCompareBtn.addEventListener("click", () => {
    const ids = state.cars
      .filter(c => state.compareSet.has(c.id))
      .map(c => c.catalogId)
      .filter(id => id != null);
    if (!ids.length) return;
    const path = compareSharePath(ids);
    history.replaceState({}, "", path);
    trackPageview();
    copyToClipboard(`${location.origin}${path}`, el.shareCompareBtn);
  });

  el.compareBarClearBtn.addEventListener("click", () => {
    state.compareSet.clear();
    renderAll();
  });

  el.compareBarViewBtn.addEventListener("click", () => {
    state.view = "compare";
    renderAll();
    resetCompareScroll();
    enterCompareUrl(COMPARE_PATH);
  });

  el.modalCloseBtn.addEventListener("click", closeModal);
  el.detailModal.addEventListener("click", e => {
    if (e.target === el.detailModal) closeModal();
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      closeModal();
      closeSidebar();
    }
  });

  el.filtersToggleBtn.addEventListener("click", openSidebar);
  el.sidebarCloseBtn.addEventListener("click", closeSidebar);
  el.sidebarBackdrop.addEventListener("click", closeSidebar);

  // `behavior: "smooth"` is set in JS, so the prefers-reduced-motion block in styles.css
  // has no say over it — check the query directly instead. Read per click rather than
  // cached, so changing the OS setting takes effect without a reload.
  const scrollCompareBy = left => el.compareScroll.scrollBy({
    left,
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
  });
  el.compareScrollLeftBtn.addEventListener("click", () => scrollCompareBy(-280));
  el.compareScrollRightBtn.addEventListener("click", () => scrollCompareBy(280));
  el.compareScroll.addEventListener("scroll", updateCompareScrollNav);
  window.addEventListener("resize", updateCompareScrollNav);

  window.addEventListener("popstate", () => {
    const car = carForPath(state.pathIndex, location.pathname);
    if (car) {
      openDetail(car, { historyMode: "none" });
      return;
    }
    // Only reachable by hard-loading a shared /compare/<ids> link and then navigating away
    // (opening a car pushes a real history entry) — everything else that touches this URL
    // uses replaceState, so it never sits in the back-stack on its own otherwise.
    const sharedIds = compareIdsFromPath(location.pathname);
    const foundCars = sharedIds ? sharedIds.map(id => state.catalogIndex.get(id)).filter(Boolean) : [];
    closeModal({ updateHistory: false });
    if (foundCars.length) {
      state.compareSet = new Set(foundCars.map(c => c.id));
      state.view = "compare";
      document.title = compareTitle(foundCars.length);
      renderAll();
      resetCompareScroll();
    } else {
      state.view = "results";
      renderAll();
    }
  });
}

// The sidebar's sticky offset and the compare table's max-height are both measured from the
// topbar. Hardcoding 60px left them 5.5px out on desktop and far more once the topbar
// wrapped, so the sidebar overshot the viewport and its last few pixels were unreachable.
// ResizeObserver rather than a resize listener: the topbar also changes height when compare
// mode hides the search field, which fires no window resize.
// The <symbol> sprite every body-style icon points at via <use>. Mounted once, before
// anything renders: a <use> whose target isn't in the document at paint time renders nothing
// and does NOT retroactively resolve when the symbol turns up later.
function mountBodySprite() {
  if (document.getElementById("bodySprite")) return;
  const holder = document.createElement("div");
  holder.id = "bodySprite";
  holder.hidden = true;
  holder.innerHTML = BODY_SPRITE;
  document.body.appendChild(holder);
}

function syncTopbarHeight() {
  const apply = () => {
    const h = el.topbar.getBoundingClientRect().height;
    if (h > 0) document.documentElement.style.setProperty("--topbar-h", `${h}px`);
  };
  apply();
  if (typeof ResizeObserver === "function") new ResizeObserver(apply).observe(el.topbar);
  else window.addEventListener("resize", apply);
}

// Booleans the hub forces come from the hub itself; enums collapse on their own once the
// domain is hub-scoped, so a one-option list is just hidden.
function hiddenFilterKeys() {
  const hidden = new Set(state.hub?.determines ?? []);
  if (state.hub) {
    for (const field of FIELDS) {
      if (field.type !== "enum" && field.type !== "enumMulti") continue;
      const d = state.domains[field.key];
      if (d && d.values.length <= 1) hidden.add(field.key);
    }
  }
  return hidden;
}

function rebuildSidebar() {
  renderFilterSidebar(el.sidebar, state.domains, state.filterState, () => {
    // Filtering doesn't apply to the compare table (it shows an explicit hand-picked
    // selection), so any filter change drops back to the results. Reachable now only via a
    // shared /compare link left open in a stale tab — compare mode hides the filter chrome
    // entirely — but it still has to take the URL back with it, which it previously didn't.
    if (state.view === "compare") leaveCompareUrl();
    state.view = "results";
    renderAll();
  }, hiddenFilterKeys());
}

function resetFilters() {
  state.filterState = defaultFilterState(state.domains);
  state.searchText = "";
  el.searchInput.value = "";
  rebuildSidebar();
  renderAll();
}

// Chip row above the results: what's currently narrowing them, one removable chip per
// applied value. Built with textContent rather than innerHTML because the text embeds car
// data (make names, etc.) that the rest of this codebase is careful to escape.
function renderActiveFilters(chips) {
  el.activeFilters.innerHTML = "";
  el.activeFilters.hidden = chips.length === 0 && !state.hub;
  if (el.activeFilters.hidden) return;

  // On a hub, the scope leads: a filled chip naming the page, then a plain link out to the
  // full catalogue. That link is deliberately separate from "Reset filters" — reset clears
  // filters *within* the hub, leaving is a navigation, and conflating the two would make
  // reset quietly teleport you somewhere else.
  if (state.hub) {
    const scope = document.createElement("span");
    scope.className = "filter-chip filter-chip-scope";
    const scopeText = document.createElement("span");
    scopeText.textContent = state.hub.h1;
    scope.appendChild(scopeText);
    el.activeFilters.appendChild(scope);

    const all = document.createElement("a");
    all.className = "filter-chip-clear";
    all.href = homePath();
    all.textContent = `All ${state.cars.length} models`;
    el.activeFilters.appendChild(all);
  }

  if (chips.length) {
    const label = document.createElement("span");
    label.className = "active-filters-label";
    label.textContent = state.hub ? "also filtered by" : "Filtered by";
    el.activeFilters.appendChild(label);
  }

  for (const chip of chips) {
    const wrap = document.createElement("span");
    wrap.className = "filter-chip";

    const text = document.createElement("span");
    text.textContent = chip.text;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "filter-chip-remove";
    remove.textContent = "\u00d7";
    remove.setAttribute("aria-label", `Remove filter: ${chip.text}`);
    remove.addEventListener("click", () => {
      clearFilter(state.filterState, state.domains, chip.key, chip.value);
      rebuildSidebar();
      renderAll();
    });

    wrap.append(text, remove);
    el.activeFilters.appendChild(wrap);
  }

  if (chips.length) {
    const clearAll = document.createElement("button");
    clearAll.type = "button";
    clearAll.className = "filter-chip-clear";
    clearAll.textContent = "Clear all";
    clearAll.addEventListener("click", resetFilters);
    el.activeFilters.appendChild(clearAll);
  }
}

function openSidebar() {
  el.sidebarEl.classList.add("open");
  el.sidebarBackdrop.hidden = false;
  document.body.classList.add("sidebar-open-lock");
  el.filtersToggleBtn.setAttribute("aria-expanded", "true");
}

function closeSidebar() {
  el.sidebarEl.classList.remove("open");
  el.sidebarBackdrop.hidden = true;
  document.body.classList.remove("sidebar-open-lock");
  el.filtersToggleBtn.setAttribute("aria-expanded", "false");
}

// The hub is a base scope; filters and search narrow within it. Everything downstream (sort,
// compare, the empty state) reads from here, so nothing else needs to know about hubs.
function getFilteredCars() {
  return state.cars.filter(c =>
    (!state.hub || state.hub.match(c)) &&
    matchesFilters(c, state.filterState, state.domains, state.searchText));
}

// Only used for the card grid, never the compare views — sorting there would reorder
// columns out from under whatever order you picked/expected them in.
const SORT_GETTERS = {
  price: c => c.msrp,
  range: c => c.range?.epaMiles,
  zeroTo60: c => c.performance?.zeroTo60Sec,
  maxPassengers: c => c.maxPassengers,
};

function sortCars(cars, sortKey) {
  if (sortKey === "default") return cars;
  const [fieldName, dir] = sortKey.split("-");
  const getter = SORT_GETTERS[fieldName];
  if (!getter) return cars;

  const withValue = [];
  const withoutValue = [];
  for (const car of cars) {
    (typeof getter(car) === "number" ? withValue : withoutValue).push(car);
  }
  // Cars missing this spec sink to the bottom regardless of direction — "lowest price
  // first" shouldn't surface a car with no listed price ahead of a real $30k one.
  withValue.sort((a, b) => (getter(a) - getter(b)) * (dir === "desc" ? -1 : 1));
  return [...withValue, ...withoutValue];
}

// Replace (not push) for entering/leaving compare — like closeModal's own history writes,
// this is a mode switch on the current page rather than a drill-down navigation, so it
// shouldn't grow the back-button stack or need popstate to know how to reconstruct it.
function enterCompareUrl(path) {
  history.replaceState({}, "", path);
  document.title = compareTitle(state.compareSet.size);
  trackPageview();
}

function leaveCompareUrl() {
  history.replaceState({}, "", homePath());
  document.title = HOME_TITLE;
  trackPageview();
}

// "Compare all" in the detail modal's Similar Vehicles section: replaces whatever's
// currently selected (not additive — a fresh start, per the request) with this car plus
// its similar-vehicle matches, then jumps straight to the compare view.
function compareAllSimilar(ids) {
  state.compareSet = new Set(ids);
  state.view = "compare";
  closeModal({ updateHistory: false });
  renderAll();
  resetCompareScroll();
  enterCompareUrl(COMPARE_FROM_SIMILAR_PATH);
}

function toggleCompare(id, shouldAdd) {
  if (shouldAdd) {
    if (state.compareSet.size >= MAX_COMPARE) {
      alert(`You can compare up to ${MAX_COMPARE} vehicles at once.`);
      return;
    }
    state.compareSet.add(id);
  } else {
    state.compareSet.delete(id);
  }
  renderAll();
}

// historyMode: "push" for a genuinely new navigation — clicking a car from the list/compare
// view, or hopping to a similar-car suggestion — so back walks you through each car you
// visited, one at a time, same as any other breadcrumb trail; "none" when we're just
// reflecting a popstate/deep-link that already happened (don't touch history again).
function openDetail(car, { historyMode = "push" } = {}) {
  state.activeDetailCar = car;
  const renderModal = () => {
    renderDetailModal(el.modalBody, car, {
      inCompare: state.compareSet.has(car.id),
      onToggleCompare: id => {
        toggleCompare(id, !state.compareSet.has(id));
        renderModal();
      },
      allCars: state.cars,
      hubs: state.hubs,
      onSelectCar: nextCar => openDetail(nextCar),
      onCompareAll: compareAllSimilar,
    });
  };
  renderModal();
  // Unhide *before* resetting scroll, not after — while the modal is still `hidden` there's
  // no layout box to scroll, so the assignment silently does nothing; once it becomes
  // visible again the browser restores whatever offset it had before being hidden, not
  // whatever was "written" in the meantime. This bit us specifically on close-then-reopen
  // (scroll to the bottom of car A, close, open car B — B opened already scrolled to the
  // bottom) since renderModal()'s content swap alone doesn't touch modalBody's own scroll
  // offset, only its children.
  el.detailModal.hidden = false;
  // `inert` pulls the rest of the page out of the tab order, out of assistive-tech reach, and
  // — the actual bug this fixes — out of the browser's native find-in-page (Ctrl/Cmd+F), which
  // otherwise happily matches and highlights text in the blurred, inert-looking background,
  // since a CSS blur is purely visual and doesn't affect the DOM's real interactivity at all.
  el.topbar.inert = true;
  el.layoutEl.inert = true;
  el.modalBody.scrollTop = 0;
  document.title = titleFor(car);
  if (historyMode === "push") {
    history.pushState({ carId: car.id }, "", carPath(car));
    trackPageview();
  }
}

function closeModal({ updateHistory = true } = {}) {
  el.detailModal.hidden = true;
  el.topbar.inert = false;
  el.layoutEl.inert = false;
  state.activeDetailCar = null;
  document.title = HOME_TITLE;
  // Replace, not push: closing shouldn't grow the stack either, so "back" from wherever
  // you land next still goes to wherever you were before you opened a car at all.
  if (updateHistory && location.pathname !== homePath()) {
    history.replaceState({}, "", homePath());
    trackPageview();
  }
}

// .compare-scroll is a persistent element that only ever gets its *content* (the <table>)
// swapped out — its own scrollTop/scrollLeft otherwise carry over untouched across renders,
// same as the detail modal's scroll body did (see openDetail's comment). Call this right
// after renderAll() has already unhidden #viewCompare — same "unhide before resetting
// scroll" ordering fix, since the assignment is a no-op while the element has no layout box.
function resetCompareScroll() {
  el.compareScroll.scrollTop = 0;
  el.compareScroll.scrollLeft = 0;
}

// Shows/hides the header's left/right nav buttons based on whether the table actually
// overflows horizontally, and disables whichever end you've already scrolled to.
function updateCompareScrollNav() {
  const scrollEl = el.compareScroll;
  const overflows = scrollEl.scrollWidth > scrollEl.clientWidth + 1;
  el.compareScrollNav.hidden = !overflows;
  if (!overflows) return;
  el.compareScrollLeftBtn.disabled = scrollEl.scrollLeft <= 0;
  el.compareScrollRightBtn.disabled = scrollEl.scrollLeft + scrollEl.clientWidth >= scrollEl.scrollWidth - 1;
}

function renderResultsView() {
  const filtered = getFilteredCars();
  el.resultCount.textContent = `${filtered.length} vehicle${filtered.length === 1 ? "" : "s"}`;

  const chips = describeActiveFilters(state.filterState, state.domains);
  el.filtersToggleBtn.textContent = chips.length > 0 ? `Filters (${chips.length})` : "Filters";
  renderActiveFilters(chips);
  // Nothing to reset is a state worth showing rather than a click that silently does nothing.
  el.resetFiltersBtn.disabled = chips.length === 0 && !state.searchText;

  // Drives the compare-mode chrome hiding in styles.css. Filters, search and the vehicle
  // count all describe the results list, none of which the compare table reflects.
  document.body.classList.toggle("compare-view", state.view === "compare");

  if (state.view === "compare") {
    // Compare mode hides the drawer in CSS, but body.sidebar-open-lock (overflow:hidden)
    // is JS-side state and would otherwise survive, locking page scroll with no visible
    // drawer to close.
    closeSidebar();
    el.viewResults.hidden = true;
    el.viewCompare.hidden = false;
    const carsToShow = state.cars.filter(c => state.compareSet.has(c.id));
    el.compareCount.textContent = carsToShow.length;
    renderCompareTable(el.compareTable, carsToShow, {
      onRemove: id => { state.compareSet.delete(id); renderAll(); },
      onOpenDetail: openDetail,
    });
    updateCompareScrollNav();
  } else {
    el.viewResults.hidden = false;
    el.viewCompare.hidden = true;
    renderCardGrid(el.cardGrid, sortCars(filtered, state.sortKey), {
      compareSet: state.compareSet,
      onToggleCompare: (id, checked) => toggleCompare(id, checked),
      onOpenDetail: openDetail,
      scopeLabel: state.hub?.noun ?? null,
    });
  }

  const n = state.compareSet.size;
  el.compareBar.hidden = n === 0 || state.view === "compare";
  el.compareBarText.textContent = `${n} selected for comparison`;
}

function renderAll() {
  renderResultsView();
}

init();
