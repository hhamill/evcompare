import { FIELDS } from "./fields.js?v=5";
import { computeDomains, defaultFilterState, matchesFilters, renderFilterSidebar, countActiveFilters } from "./filters.js?v=7";
import { renderCardGrid, renderCompareTable, renderDetailModal } from "./render.js?v=13";
import { carPath, buildCarPathIndex, carForPath, homePath } from "./router.js?v=4";

const AUTO_COMPARE_THRESHOLD = 5;
const MAX_COMPARE = 6;

// Mirrors scripts/prerender.mjs's SITE_NAME/title format so the tab title matches whether a
// car page is reached via a hard load (prerendered <title>) or client-side "navigation" (pushState).
const SITE_NAME = "EV Compare";
const HOME_TITLE = "EV Compare — Find and compare electric vehicles";
const titleFor = car => `${car.modelYear} ${car.make} ${car.model} ${car.trim} — Specs & Price | ${SITE_NAME}`;

const state = {
  cars: [],
  domains: {},
  filterState: {},
  searchText: "",
  compareSet: new Set(),
  view: "results", // "results" | "compare"
  activeDetailCar: null,
  pathIndex: null,
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
  const cars = await res.json();
  state.cars = cars;
  state.domains = computeDomains(cars);
  state.filterState = defaultFilterState(state.domains);
  state.pathIndex = buildCarPathIndex(cars);

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
  });

  el.clearCompareBtn.addEventListener("click", () => {
    state.compareSet.clear();
    state.view = "results";
    renderAll();
  });

  el.compareBarClearBtn.addEventListener("click", () => {
    state.compareSet.clear();
    renderAll();
  });

  el.compareBarViewBtn.addEventListener("click", () => {
    state.view = "compare";
    renderAll();
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
    if (car) openDetail(car, { historyMode: "none" });
    else closeModal({ updateHistory: false });
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

// "Compare all" in the detail modal's Similar Vehicles section: replaces whatever's
// currently selected (not additive — a fresh start, per the request) with this car plus
// its similar-vehicle matches, then jumps straight to the compare view.
function compareAllSimilar(ids) {
  state.compareSet = new Set(ids);
  state.view = "compare";
  closeModal();
  renderAll();
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
  el.modalBody.scrollTop = 0;
  el.detailModal.hidden = false;
  document.title = titleFor(car);
  if (historyMode === "push") history.pushState({ carId: car.id }, "", carPath(car));
}

function closeModal({ updateHistory = true } = {}) {
  el.detailModal.hidden = true;
  state.activeDetailCar = null;
  document.title = HOME_TITLE;
  // Replace, not push: closing shouldn't grow the stack either, so "back" from wherever
  // you land next still goes to wherever you were before you opened a car at all.
  if (updateHistory && location.pathname !== homePath()) history.replaceState({}, "", homePath());
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

  const autoCompare = filtered.length > 0 && filtered.length <= AUTO_COMPARE_THRESHOLD;

  if (state.view === "compare" || autoCompare) {
    el.viewResults.hidden = true;
    el.viewCompare.hidden = false;
    const carsToShow = autoCompare && state.view !== "compare"
      ? filtered
      : state.cars.filter(c => state.compareSet.has(c.id));
    const allowRemove = !(autoCompare && state.view !== "compare");
    el.compareCount.textContent = carsToShow.length;
    renderCompareTable(el.compareTable, carsToShow, {
      onRemove: allowRemove ? (id => { state.compareSet.delete(id); renderAll(); }) : null,
      onOpenDetail: openDetail,
    });
    el.backToResultsBtn.hidden = autoCompare && state.view !== "compare";
    el.clearCompareBtn.hidden = !allowRemove;
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
  el.compareBar.hidden = n === 0 || state.view === "compare" || autoCompare;
  el.compareBarText.textContent = `${n} selected for comparison`;
}

function renderAll() {
  renderResultsView();
}

init();
