import { FIELDS, GROUP_ORDER } from "./fields.js";

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

export function countActiveFilters(filterState, domains) {
  let n = 0;
  for (const field of FIELDS) {
    const v = filterState[field.key];
    if (field.type === "enum" || field.type === "enumMulti") {
      if (v && v.size > 0) n++;
    } else if (field.type === "boolean") {
      if (v === true) n++;
    } else if (field.type === "range") {
      const d = domains[field.key];
      if (d && (v[0] > d.min || v[1] < d.max)) n++;
    }
  }
  return n;
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
        const listId = `enum-${field.key}`;
        const label = document.createElement("span");
        label.className = "filter-field-label";
        label.textContent = field.label;
        wrap.appendChild(label);
        const list = document.createElement("div");
        list.className = "enum-list";
        list.id = listId;
        for (const val of domain.values) {
          const row = document.createElement("label");
          row.className = "checkbox-row";
          const checked = filterState[field.key].has(val);
          row.innerHTML = `<input type="checkbox" data-key="${field.key}" data-val="${String(val).replace(/"/g, '&quot;')}" ${checked ? "checked" : ""}/> <span>${val}</span>`;
          row.querySelector("input").addEventListener("change", e => {
            const set = filterState[field.key];
            if (e.target.checked) set.add(field.type === "enumMulti" || typeof val === "number" ? val : val);
            else set.delete(val);
            onChange();
          });
          list.appendChild(row);
        }
        wrap.appendChild(list);
      } else if (field.type === "range") {
        if (!domain || domain.min === domain.max) continue;
        const label = document.createElement("span");
        label.className = "filter-field-label";
        label.textContent = field.label;
        wrap.appendChild(label);

        const dr = document.createElement("div");
        dr.className = "dual-range";
        const step = (domain.max - domain.min) > 50 ? 1 : (domain.max - domain.min) / 100 || 1;
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
          valuesEl.innerHTML = `<span>${fmt(min)}</span><span>${fmt(max)}</span>`;
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
