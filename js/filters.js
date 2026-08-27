import { FIELDS, GROUP_ORDER } from "./fields.js?v=9";

// Mirrors js/render.js's own esc() (and scripts/prerender.mjs's) — enum values here are
// car data (make, body style, drivetrain, etc.), hand-researched rather than validated, so
// they get the same treatment before landing in innerHTML/attribute context.
function esc(str) {
  return String(str).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

// Enum filter lists longer than this get a "Show all" toggle + type-to-filter box
// instead of an inner scrollbar, so the sidebar only ever scrolls at the outer level.
const ENUM_VISIBLE_COUNT = 6;

// A field's declared `step` implies its display precision (0.1 -> 1 decimal, 1 -> whole
// numbers). Snapping the domain's min/max to that same grid (floor/ceil, so real data at
// the edges is never excluded) keeps every subsequent step landing on a clean number too —
// otherwise a raw value like "$49.99/mo" or "4.48 in" becomes the slider's zero point and
// every step drifts by that same fraction (49.99, 50.99, 51.99, ...).
function stepDecimals(step) {
  return (String(step).split(".")[1] || "").length;
}
// value/step is prone to float representation error (6.6/0.1 is 65.99999999999999 in JS,
// not 66), which would floor a value that's already exactly on the grid down to the
// previous step. A tiny epsilon — far smaller than any real spec's precision — corrects
// for that noise without masking genuine extra precision in the source data (4.48 should
// still floor to 4.4, not get rounded up to the grid first).
const EPSILON = 1e-9;
function floorToStep(value, step) {
  const decimals = stepDecimals(step);
  return Number((Math.floor(value / step + EPSILON) * step).toFixed(decimals));
}
function ceilToStep(value, step) {
  const decimals = stepDecimals(step);
  return Number((Math.ceil(value / step - EPSILON) * step).toFixed(decimals));
}

// Build the domain (possible values / min-max) for each filterable field from the dataset.
export function computeDomains(cars) {
  const domains = {};
  for (const field of FIELDS) {
    if (field.type === "enum") {
      const values = new Set();
      for (const c of cars) {
        const v = field.get(c);
        if (v !== undefined && v !== null && v !== "") values.add(v);
      }
      domains[field.key] = { values: [...values].sort((a, b) => (typeof a === "number" ? a - b : String(a).localeCompare(String(b)))) };
    } else if (field.type === "enumMulti") {
      const values = new Set();
      for (const c of cars) {
        const arr = field.get(c);
        if (Array.isArray(arr)) arr.forEach(v => values.add(v));
      }
      domains[field.key] = { values: [...values].sort((a, b) => a - b) };
    } else if (field.type === "range") {
      let min = Infinity, max = -Infinity;
      for (const c of cars) {
        const v = field.get(c);
        if (typeof v === "number" && !Number.isNaN(v)) {
          if (v < min) min = v;
          if (v > max) max = v;
        }
      }
      if (min === Infinity) { min = 0; max = 0; }
      else if (field.step) { min = floorToStep(min, field.step); max = ceilToStep(max, field.step); }
      domains[field.key] = { min, max };
    }
  }
  return domains;
}

// Default (empty) filter state: no constraints applied.
export function defaultFilterState(domains) {
  const state = {};
  for (const field of FIELDS) {
    if (field.type === "enum" || field.type === "enumMulti") {
      state[field.key] = new Set();
    } else if (field.type === "boolean") {
      state[field.key] = false;
    } else if (field.type === "range") {
      const d = domains[field.key];
      state[field.key] = d ? [d.min, d.max] : [0, 0];
    }
  }
  return state;
}

export function matchesFilters(car, filterState, domains, searchText) {
  if (searchText) {
    const hay = `${car.make} ${car.model} ${car.trim}`.toLowerCase();
    if (!hay.includes(searchText.toLowerCase())) return false;
  }
  for (const field of FIELDS) {
    const filterValue = filterState[field.key];
    if (field.type === "enum") {
      if (filterValue && filterValue.size > 0) {
        const v = field.get(car);
        if (!filterValue.has(v)) return false;
      }
    } else if (field.type === "enumMulti") {
      if (filterValue && filterValue.size > 0) {
        const arr = field.get(car) || [];
        const hit = arr.some(v => filterValue.has(v));
        if (!hit) return false;
      }
    } else if (field.type === "boolean") {
      if (filterValue === true) {
        if (!field.get(car)) return false;
      }
    } else if (field.type === "range") {
      const d = domains[field.key];
      if (!d) continue;
      const [selMin, selMax] = filterValue;
      const isFullRange = selMin <= d.min && selMax >= d.max;
      if (!isFullRange) {
        const v = field.get(car);
        if (typeof v !== "number") return false;
        if (v < selMin || v > selMax) return false;
      }
    }
  }
  return true;
}

// Enumerates every applied constraint as a removable descriptor, for the chip row above the
// results. Multi-select enums emit one chip *per selected value* rather than one per field,
// so "Make: Audi, BMW, Kia" can be narrowed a make at a time instead of all-or-nothing.
//
// Returns plain text (never markup) — the caller sets it via textContent, so unlike the
// innerHTML paths elsewhere in this file there's nothing here to escape.
export function describeActiveFilters(filterState, domains) {
  const chips = [];
  for (const field of FIELDS) {
    const v = filterState[field.key];
    if (field.type === "enum") {
      if (v && v.size > 0) {
        for (const value of v) chips.push({ key: field.key, value, text: `${field.label}: ${value}` });
      }
    } else if (field.type === "enumMulti") {
      if (v && v.size > 0) {
        // format() on these fields takes the whole array (wheel sizes render as `19", 20"`),
        // so hand it a one-element array to get a single value formatted the same way.
        for (const value of v) {
          const shown = field.format ? field.format([value]) : String(value);
          chips.push({ key: field.key, value, text: `${field.label}: ${shown}` });
        }
      }
    } else if (field.type === "boolean") {
      // The label alone is the whole constraint here — a chip reading "Heat Pump: Yes" says
      // no more than "Heat Pump", since false is the same as unset for these.
      if (v === true) chips.push({ key: field.key, value: null, text: field.label });
    } else if (field.type === "range") {
      const d = domains[field.key];
      if (!d) continue;
      const [lo, hi] = v;
      const loMoved = lo > d.min;
      const hiMoved = hi < d.max;
      if (!loMoved && !hiMoved) continue;
      const fmt = n => (field.format ? field.format(n) : String(n));
      let shown;
      if (loMoved && hiMoved) shown = `${fmt(lo)} – ${fmt(hi)}`;
      else if (loMoved) shown = `${fmt(lo)}+`;
      else shown = `Up to ${fmt(hi)}`;
      chips.push({ key: field.key, value: null, text: `${field.label}: ${shown}` });
    }
  }
  return chips;
}

// Undoes exactly one chip. `value` is the specific enum entry to drop (the rest of that
// field's selection survives); null means clear the whole field, which is the only
// meaningful operation for booleans and ranges.
export function clearFilter(filterState, domains, key, value) {
  const field = FIELDS.find(f => f.key === key);
  if (!field) return;
  if (field.type === "enum" || field.type === "enumMulti") {
    if (value === null) filterState[key] = new Set();
    else filterState[key].delete(value);
  } else if (field.type === "boolean") {
    filterState[key] = false;
  } else if (field.type === "range") {
    const d = domains[key];
    filterState[key] = d ? [d.min, d.max] : [0, 0];
  }
}

// ---------- Sidebar rendering ----------

export function renderFilterSidebar(container, domains, filterState, onChange) {
  container.innerHTML = "";
  const byGroup = {};
  for (const field of FIELDS) {
    if (!byGroup[field.group]) byGroup[field.group] = [];
    byGroup[field.group].push(field);
  }

  GROUP_ORDER.forEach((groupName, idx) => {
    const fields = byGroup[groupName];
    if (!fields) return;
    const groupEl = document.createElement("div");
    groupEl.className = "filter-group";

    const header = document.createElement("div");
    header.className = "filter-group-header";
    header.innerHTML = `<h3>${groupName}</h3><span class="chev">▾</span>`;
    header.addEventListener("click", () => groupEl.classList.toggle("collapsed"));
    groupEl.appendChild(header);

    const body = document.createElement("div");
    body.className = "filter-group-body";

    for (const field of fields) {
      const domain = domains[field.key];
      const wrap = document.createElement("div");
      wrap.className = "filter-field";

      if (field.type === "boolean") {
        wrap.innerHTML = `
          <label class="bool-toggle">
            <span class="bool-toggle-label">${field.label}</span>
            <span class="switch">
              <input type="checkbox" data-key="${field.key}" ${filterState[field.key] ? "checked" : ""}/>
              <span class="switch-track"></span>
            </span>
          </label>`;
        wrap.querySelector("input").addEventListener("change", e => {
          filterState[field.key] = e.target.checked;
          onChange();
        });
      } else if (field.type === "enum" || field.type === "enumMulti") {
        if (!domain || domain.values.length === 0) continue;
        const label = document.createElement("span");
        label.className = "filter-field-label";
        label.textContent = field.label;
        wrap.appendChild(label);

        const values = domain.values;
        const needsExpand = values.length > ENUM_VISIBLE_COUNT;
        const selectedSet = filterState[field.key];

        let searchInput = null;
        if (needsExpand) {
          searchInput = document.createElement("input");
          searchInput.type = "text";
          searchInput.className = "enum-filter-input";
          searchInput.placeholder = `Filter ${field.label.toLowerCase()}…`;
          wrap.appendChild(searchInput);
        }

        const list = document.createElement("div");
        list.className = "enum-list";
        wrap.appendChild(list);

        let expandBtn = null;
        if (needsExpand) {
          expandBtn = document.createElement("button");
          expandBtn.type = "button";
          expandBtn.className = "enum-expand-btn";
          wrap.appendChild(expandBtn);
        }

        // If a value beyond the visible cutoff is already selected, start expanded so it stays visible.
        let expanded = values.some((val, i) => i >= ENUM_VISIBLE_COUNT && selectedSet.has(val));

        const rows = values.map(val => {
          const row = document.createElement("label");
          row.className = "checkbox-row";
          const checked = selectedSet.has(val);
          row.innerHTML = `<input type="checkbox" data-key="${field.key}" data-val="${esc(val)}" ${checked ? "checked" : ""}/> <span>${esc(val)}</span>`;
          row.querySelector("input").addEventListener("change", e => {
            if (e.target.checked) selectedSet.add(val);
            else selectedSet.delete(val);
            onChange();
          });
          list.appendChild(row);
          return { el: row, text: String(val).toLowerCase() };
        });

        function applyVisibility() {
          const query = searchInput ? searchInput.value.trim().toLowerCase() : "";
          rows.forEach((r, i) => {
            const matchesQuery = !query || r.text.includes(query);
            const withinLimit = expanded || query || i < ENUM_VISIBLE_COUNT;
            r.el.style.display = matchesQuery && withinLimit ? "" : "none";
          });
          if (expandBtn) {
            expandBtn.hidden = !!query;
            expandBtn.textContent = expanded ? "Show less" : `Show all (${rows.length})`;
          }
        }

        if (searchInput) searchInput.addEventListener("input", applyVisibility);
        if (expandBtn) {
          expandBtn.addEventListener("click", () => {
            expanded = !expanded;
            applyVisibility();
          });
        }
        applyVisibility();
      } else if (field.type === "range") {
        if (!domain || domain.min === domain.max) continue;
        const label = document.createElement("span");
        label.className = "filter-field-label";
        label.textContent = field.label;
        wrap.appendChild(label);

        const dr = document.createElement("div");
        dr.className = "dual-range";
        const step = field.step ?? ((domain.max - domain.min) > 50 ? 1 : (domain.max - domain.min) / 100 || 1);
        dr.innerHTML = `
          <div class="dual-range-track"></div>
          <div class="dual-range-fill"></div>
          <input type="range" class="range-min" min="${domain.min}" max="${domain.max}" step="${step}" value="${filterState[field.key][0]}" />
          <input type="range" class="range-max" min="${domain.min}" max="${domain.max}" step="${step}" value="${filterState[field.key][1]}" />
        `;
        const fill = dr.querySelector(".dual-range-fill");
        const minInput = dr.querySelector(".range-min");
        const maxInput = dr.querySelector(".range-max");
        const valuesEl = document.createElement("div");
        valuesEl.className = "range-values";

        const fmt = field.format || (v => v);

        function updateVisual() {
          const min = parseFloat(minInput.value), max = parseFloat(maxInput.value);
          const pct = v => ((v - domain.min) / (domain.max - domain.min || 1)) * 100;
          fill.style.left = pct(min) + "%";
          fill.style.width = Math.max(0, pct(max) - pct(min)) + "%";
          valuesEl.innerHTML = `<span>${esc(fmt(min))}</span><span>${esc(fmt(max))}</span>`;

          // Both thumbs are two overlapping <input>s at the same track position; whichever is
          // later in the DOM (max) always wins clicks by default, so once min catches up to max
          // (e.g. dragged both to the top of the range) min becomes physically unreachable —
          // every drag just grabs max again, which is clamped to never go below min, so it looks
          // stuck. Give whichever thumb is in the upper half of the domain priority instead, so
          // the one you'd actually be reaching for at each end is the one that's clickable.
          const midpoint = (domain.min + domain.max) / 2;
          const minOnTop = min > midpoint;
          minInput.style.zIndex = minOnTop ? 3 : 1;
          maxInput.style.zIndex = minOnTop ? 1 : 3;
        }
        updateVisual();

        minInput.addEventListener("input", () => {
          if (parseFloat(minInput.value) > parseFloat(maxInput.value)) minInput.value = maxInput.value;
          filterState[field.key][0] = parseFloat(minInput.value);
          updateVisual();
        });
        minInput.addEventListener("change", onChange);
        maxInput.addEventListener("input", () => {
          if (parseFloat(maxInput.value) < parseFloat(minInput.value)) maxInput.value = minInput.value;
          filterState[field.key][1] = parseFloat(maxInput.value);
          updateVisual();
        });
        maxInput.addEventListener("change", onChange);

        wrap.appendChild(dr);
        wrap.appendChild(valuesEl);
      } else {
        continue;
      }

      body.appendChild(wrap);
    }

    groupEl.appendChild(body);
    container.appendChild(groupEl);
  });
}
