import { FIELDS } from "./fields.js?v=7";
import { computeDomains, defaultFilterState, matchesFilters, renderFilterSidebar, countActiveFilters } from "./filters.js?v=8";
import { renderCardGrid, renderCompareTable, renderDetailModal } from "./render.js?v=16";
import { carPath, buildCarPathIndex, carForPath, homePath, compareSharePath, compareIdsFromPath } from "./router.js?v=5";

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

const state = {
  cars: [],
  domains: {},
  filterState: {},
  searchText: "",
  compareSet: new Set(),
  view: "results", // "results" | "compare"
  activeDetailCar: null,
  pathIndex: null,
  catalogIndex: null,
  sortKey: "default",
};

const el = {
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
  brandHome: document.getElementById("brandHome"),
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
  el.themeToggleBtn.title = `Theme: ${THEME_LABELS[theme]} (click to change)`;
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
  const res = await fetch("/data/evs.json");
  const { models: cars } = await res.json();
  state.cars = cars;
  state.domains = computeDomains(cars);
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

  renderFilterSidebar(el.sidebar, state.domains, state.filterState, () => {
    state.view = "results";
    renderAll();
  });

  bindGlobalEvents();
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

  el.resetFiltersBtn.addEventListener("click", () => {
    state.filterState = defaultFilterState(state.domains);
    state.searchText = "";
    el.searchInput.value = "";
    renderFilterSidebar(el.sidebar, state.domains, state.filterState, () => {
      state.view = "results";
      renderAll();
    });
    renderAll();
  });

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

  // The one universal escape hatch: closes any open modal, drops back to the results
  // view, and resets the URL to "/" regardless of what it currently is — including an
  // invalid/unmatched deep link (e.g. a typo'd car slug), which nothing else in the nav
  // gives you a direct way out of.
  el.brandHome.addEventListener("click", () => {
    closeModal({ updateHistory: false });
    state.view = "results";
    renderAll();
    leaveCompareUrl();
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

  el.compareScrollLeftBtn.addEventListener("click", () => {
    el.compareScroll.scrollBy({ left: -280, behavior: "smooth" });
  });
  el.compareScrollRightBtn.addEventListener("click", () => {
    el.compareScroll.scrollBy({ left: 280, behavior: "smooth" });
  });
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

function getFilteredCars() {
  return state.cars.filter(c => matchesFilters(c, state.filterState, state.domains, state.searchText));
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
  el.modalBody.scrollTop = 0;
  document.title = titleFor(car);
  if (historyMode === "push") {
    history.pushState({ carId: car.id }, "", carPath(car));
    trackPageview();
  }
}

function closeModal({ updateHistory = true } = {}) {
  el.detailModal.hidden = true;
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

  const activeCount = countActiveFilters(state.filterState, state.domains);
  el.filtersToggleBtn.textContent = activeCount > 0 ? `Filters (${activeCount})` : "Filters";

  if (state.view === "compare") {
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
