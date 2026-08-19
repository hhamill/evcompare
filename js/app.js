import { FIELDS } from "./fields.js";
import { computeDomains, defaultFilterState, matchesFilters, renderFilterSidebar, countActiveFilters } from "./filters.js";
import { renderCardGrid, renderCompareTable, renderDetailModal } from "./render.js";

const AUTO_COMPARE_THRESHOLD = 5;
const MAX_COMPARE = 6;

const state = {
  cars: [],
  domains: {},
  filterState: {},
  searchText: "",
  compareSet: new Set(),
  view: "results", // "results" | "compare"
  activeDetailCar: null,
};

const el = {
  sidebar: document.getElementById("filterGroups"),
  cardGrid: document.getElementById("cardGrid"),
  viewResults: document.getElementById("viewResults"),
  viewCompare: document.getElementById("viewCompare"),
  compareTable: document.getElementById("compareTable"),
  compareCount: document.getElementById("compareCount"),
  resultCount: document.getElementById("resultCount"),
  searchInput: document.getElementById("searchInput"),
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
};

async function init() {
  const res = await fetch("data/evs.json");
  const cars = await res.json();
  state.cars = cars;
  state.domains = computeDomains(cars);
  state.filterState = defaultFilterState(state.domains);

  renderFilterSidebar(el.sidebar, state.domains, state.filterState, () => {
    state.view = "results";
    renderAll();
  });

  bindGlobalEvents();
  renderAll();
}

function bindGlobalEvents() {
  el.searchInput.addEventListener("input", e => {
    state.searchText = e.target.value.trim();
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
    if (e.key === "Escape") closeModal();
  });
}

function getFilteredCars() {
  return state.cars.filter(c => matchesFilters(c, state.filterState, state.domains, state.searchText));
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

function openDetail(car) {
  state.activeDetailCar = car;
  const renderModal = () => {
    renderDetailModal(el.modalBody, car, {
      inCompare: state.compareSet.has(car.id),
      onToggleCompare: id => {
        toggleCompare(id, !state.compareSet.has(id));
        renderModal();
      },
    });
  };
  renderModal();
  el.detailModal.hidden = false;
}

function closeModal() {
  el.detailModal.hidden = true;
  state.activeDetailCar = null;
}

function renderResultsView() {
  const filtered = getFilteredCars();
  el.resultCount.textContent = `${filtered.length} vehicle${filtered.length === 1 ? "" : "s"}`;

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
    });
    el.backToResultsBtn.hidden = autoCompare && state.view !== "compare";
    el.clearCompareBtn.hidden = !allowRemove;
  } else {
    el.viewResults.hidden = false;
    el.viewCompare.hidden = true;
    renderCardGrid(el.cardGrid, filtered, {
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
