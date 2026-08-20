import { FIELDS, GROUP_ORDER, bodyIcon } from "./fields.js?v=5";
import { findSimilarCars } from "./similar.js?v=5";

const CARD_STAT_KEYS = ["epaRange", "msrp", "drivetrain", "maxPassengers"];

function fieldByKey(key) {
  return FIELDS.find(f => f.key === key);
}

function fmtVal(field, value) {
  if (field.format) return field.format(value);
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export function carTitle(car) {
  return `${car.make} ${car.model}`;
}

export function renderCardGrid(container, cars, { compareSet, onToggleCompare, onOpenDetail }) {
  container.innerHTML = "";
  if (cars.length === 0) {
    container.innerHTML = `<div class="empty-state"><h3>No vehicles match your filters</h3><p>Try loosening a filter or resetting them.</p></div>`;
    return;
  }
  for (const car of cars) {
    const card = document.createElement("div");
    card.className = "ev-card";

    const stats = CARD_STAT_KEYS.map(key => {
      const field = fieldByKey(key);
      return `<div class="ev-stat"><span class="ev-stat-label">${field.label}</span><span class="ev-stat-value">${fmtVal(field, field.get(car))}</span></div>`;
    }).join("");

    const badges = [];
    if (car.driverAssist?.selfDriving?.available) badges.push("Self-Driving");
    if (car.isThreeRow) badges.push("3-Row");
    if (car.allWheelDriveAvailable) badges.push("AWD Avail.");

    card.innerHTML = `
      <div class="ev-card-top">
        <div style="display:flex; gap:10px; align-items:flex-start;">
          <div class="ev-card-icon">${bodyIcon(car.bodyStyle)}</div>
          <div>
            <div class="ev-card-title">${carTitle(car)}</div>
            <div class="ev-card-trim">${car.modelYear} · ${car.trim}</div>
          </div>
        </div>
        <div class="ev-card-price">${fmtVal(fieldByKey("msrp"), car.msrp)}</div>
      </div>
      <div class="ev-card-badges">${badges.map(b => `<span class="badge">${b}</span>`).join("")}</div>
      <div class="ev-card-stats">${stats}</div>
      <div class="ev-card-footer">
        <label class="ev-card-add" data-role="add-label">
          <input type="checkbox" data-role="add-checkbox" ${compareSet.has(car.id) ? "checked" : ""}/>
          Add to compare
        </label>
        <button class="btn btn-sm" data-role="view-btn">View details</button>
      </div>
    `;

    card.querySelector('[data-role="add-checkbox"]').addEventListener("change", e => {
      e.stopPropagation();
      onToggleCompare(car.id, e.target.checked);
    });
    card.querySelector('[data-role="add-label"]').addEventListener("click", e => e.stopPropagation());
    card.querySelector('[data-role="view-btn"]').addEventListener("click", e => {
      e.stopPropagation();
      onOpenDetail(car);
    });
    card.addEventListener("click", () => onOpenDetail(car));

    container.appendChild(card);
  }
}

export function renderCompareTable(table, cars, { onRemove, onOpenDetail }) {
  table.innerHTML = "";
  if (cars.length === 0) {
    table.innerHTML = `<tr><td class="empty-state">No vehicles selected for comparison.</td></tr>`;
    return;
  }

  const prices = cars.map(car => car.msrp).filter(v => typeof v === "number");
  const bestPrice = prices.length > 1 ? Math.min(...prices) : null;

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  headRow.innerHTML = `<th></th>` + cars.map(car => `
    <th class="compare-col-header">
      ${onRemove ? `<button class="compare-col-remove" data-id="${car.id}" aria-label="Remove">&times;</button>` : ""}
      <div class="compare-col-title"><span class="compare-col-icon">${bodyIcon(car.bodyStyle)}</span> ${carTitle(car)}</div>
      <div class="compare-col-trim">${car.modelYear} · ${car.trim}</div>
      <div class="compare-col-price${bestPrice !== null && car.msrp !== bestPrice ? " compare-col-price-not-cheapest" : ""}">${fmtVal(fieldByKey("msrp"), car.msrp)}</div>
      ${onOpenDetail ? `<button class="btn btn-sm compare-col-view-btn" data-id="${car.id}">View details</button>` : ""}
    </th>
  `).join("");
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  const byGroup = {};
  for (const field of FIELDS) {
    if (field.key === "msrp") continue; // already shown in header
    if (!byGroup[field.group]) byGroup[field.group] = [];
    byGroup[field.group].push(field);
  }

  for (const groupName of GROUP_ORDER) {
    const fields = byGroup[groupName];
    if (!fields) continue;
    const groupRow = document.createElement("tr");
    groupRow.className = "group-row";
    groupRow.innerHTML = `<th>${groupName}</th>` + cars.map(() => `<td></td>`).join("");
    tbody.appendChild(groupRow);

    for (const field of fields) {
      const row = document.createElement("tr");

      // Only highlight/enable jump-to-winner when there's an actual difference to point
      // out — a tie across every car (or an empty row) has nothing worth jumping to.
      let bestValue = null;
      let hasDifferentiation = false;
      if (field.type === "boolean") {
        const bools = cars.map(car => !!field.get(car));
        hasDifferentiation = bools.some(b => b) && bools.some(b => !b);
      } else if (field.compareBetter && cars.length > 1) {
        const numericValues = cars.map(car => field.get(car)).filter(v => typeof v === "number");
        if (numericValues.length > 1 && new Set(numericValues).size > 1) {
          bestValue = field.compareBetter === "higher" ? Math.max(...numericValues) : Math.min(...numericValues);
          hasDifferentiation = true;
        }
      }

      const cells = cars.map(car => {
        const v = field.get(car);
        let cls = "";
        if (field.type === "boolean") cls = v ? "cell-yes" : "cell-no";
        else if (v === undefined || v === null || v === "") cls = "cell-empty";
        else if (v === "N/A") cls = "cell-na";
        else if (v === "Pending") cls = "cell-pending";
        else if (bestValue !== null && v === bestValue) cls = "cell-winner";
        return `<td class="${cls}">${fmtVal(field, v)}</td>`;
      }).join("");
      row.innerHTML = `<th${hasDifferentiation ? ' class="row-label-clickable" title="Jump to the winner"' : ""}>${field.label}</th>${cells}`;
      tbody.appendChild(row);

      if (hasDifferentiation) {
        const winnerCell = row.querySelector("td.cell-winner, td.cell-yes");
        const labelCell = row.querySelector("th");
        if (winnerCell && labelCell) {
          labelCell.addEventListener("click", () => {
            // behavior:"smooth" silently fails to scroll at all here — this container is
            // nested inside another sticky-positioned scroll context (the header row/label
            // column stickiness), and smooth scrollIntoView across that setup just doesn't
            // animate in testing, even from this exact handler. Instant is reliable.
            winnerCell.scrollIntoView({ behavior: "auto", block: "center", inline: "center" });
          });
        }
      }
    }
  }

  // Links row
  const linkRow = document.createElement("tr");
  linkRow.innerHTML = `<th>Links</th>` + cars.map(car => {
    const links = [];
    if (car.links?.review) links.push(`<a href="${car.links.review}" target="_blank" rel="noopener">Review</a>`);
    if (car.links?.manufacturerSpec) links.push(`<a href="${car.links.manufacturerSpec}" target="_blank" rel="noopener">Specs</a>`);
    return `<td>${links.join(" ") || "—"}</td>`;
  }).join("");
  tbody.appendChild(linkRow);

  table.appendChild(tbody);

  if (onRemove) {
    table.querySelectorAll(".compare-col-remove").forEach(btn => {
      btn.addEventListener("click", () => onRemove(btn.dataset.id));
    });
  }

  if (onOpenDetail) {
    table.querySelectorAll(".compare-col-view-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const car = cars.find(c => c.id === btn.dataset.id);
        if (car) onOpenDetail(car);
      });
    });
  }
}

function fmtPriceDelta(v) {
  if (v == null) return null;
  const sign = v > 0 ? "+" : v < 0 ? "−" : "";
  return `${sign}$${Math.round(Math.abs(v)).toLocaleString()}`;
}

function fmtRangeDelta(v) {
  if (v == null) return null;
  const sign = v > 0 ? "+" : v < 0 ? "−" : "";
  return `${sign}${Math.abs(v)} mi range`;
}

function renderSimilarSection(anchor, allCars) {
  const matches = findSimilarCars(anchor, allCars, { limit: 4 });
  if (matches.length === 0) return "";

  const compareAllIds = [anchor.id, ...matches.map(m => m.car.id)];

  const tiles = matches.map(({ car, diff }) => {
    const priceDeltaText = fmtPriceDelta(diff.priceDelta);
    const rangeDeltaText = fmtRangeDelta(diff.rangeDelta);
    const badges = [];
    if (rangeDeltaText) {
      badges.push(`<span class="diff-badge ${diff.rangeDelta > 0 ? "diff-gain" : diff.rangeDelta < 0 ? "diff-loss" : ""}">${rangeDeltaText}</span>`);
    }
    diff.gained.slice(0, 2).forEach(label => badges.push(`<span class="diff-badge diff-gain">+ ${label}</span>`));
    diff.lost.slice(0, 2).forEach(label => badges.push(`<span class="diff-badge diff-loss">− ${label}</span>`));

    return `
      <div class="similar-card" data-id="${car.id}">
        <div class="similar-card-top">
          <span class="similar-card-icon">${bodyIcon(car.bodyStyle)}</span>
          <div>
            <div class="similar-card-title">${carTitle(car)}</div>
            <div class="similar-card-trim">${car.modelYear} · ${car.trim}</div>
          </div>
        </div>
        <div class="similar-card-price">
          ${fmtVal(fieldByKey("msrp"), car.msrp)}
          ${priceDeltaText ? `<span class="similar-price-delta">${priceDeltaText} vs. this car</span>` : ""}
        </div>
        <div class="similar-diff-list">${badges.join("")}</div>
      </div>
    `;
  }).join("");

  return `
    <div class="modal-section similar-section">
      <div class="similar-section-header">
        <h4>Similar Vehicles</h4>
        <button id="compareAllBtn" class="btn btn-sm btn-primary" data-ids="${compareAllIds.join(",")}">Compare all (${compareAllIds.length})</button>
      </div>
      <p class="similar-hint">Close matches on price and specs — click one to compare it in this view.</p>
      <div class="similar-grid">${tiles}</div>
    </div>
  `;
}

export function renderDetailModal(body, car, { inCompare, onToggleCompare, allCars, onSelectCar, onCompareAll }) {
  const groups = {};
  for (const field of FIELDS) {
    if (field.key === "msrp") continue;
    if (!groups[field.group]) groups[field.group] = [];
    groups[field.group].push(field);
  }

  const sections = GROUP_ORDER.map(groupName => {
    const fields = groups[groupName];
    if (!fields) return "";
    const rows = fields.map(f => {
      const v = f.get(car);
      return `<div class="modal-row"><span class="k">${f.label}</span><span class="v">${fmtVal(f, v)}</span></div>`;
    }).join("");
    return `<div class="modal-section"><h4>${groupName}</h4><div class="modal-grid">${rows}</div></div>`;
  }).join("");

  const links = [];
  if (car.links?.manufacturerSpec) links.push(`<a href="${car.links.manufacturerSpec}" target="_blank" rel="noopener">Manufacturer specs ↗</a>`);
  if (car.links?.review) links.push(`<a href="${car.links.review}" target="_blank" rel="noopener">Review ↗</a>`);
  if (car.links?.epaWindowSticker) links.push(`<a href="${car.links.epaWindowSticker}" target="_blank" rel="noopener">EPA window sticker ↗</a>`);
  if (car.range?.source) links.push(`<a href="${car.range.source}" target="_blank" rel="noopener">fueleconomy.gov ↗</a>`);

  body.innerHTML = `
    <div class="modal-title">${bodyIcon(car.bodyStyle)} ${carTitle(car)}</div>
    <div class="modal-trim">${car.modelYear} · ${car.trim}</div>
    <div class="modal-price">${fmtVal(fieldByKey("msrp"), car.msrp)}</div>
    ${sections}
    ${links.length ? `<div class="modal-section"><h4>Links</h4><div class="modal-links">${links.join("")}</div></div>` : ""}
    ${car.notes ? `<div class="modal-section"><h4>Notes</h4><p style="font-size:13px;color:var(--text-dim);">${car.notes}</p></div>` : ""}
    <div class="modal-actions">
      <button id="modalCompareBtn" class="btn ${inCompare ? "btn-ghost" : "btn-primary"}">${inCompare ? "Remove from compare" : "Add to compare"}</button>
    </div>
    ${allCars ? renderSimilarSection(car, allCars) : ""}
  `;
  body.querySelector("#modalCompareBtn").addEventListener("click", () => onToggleCompare(car.id));

  if (allCars && onSelectCar) {
    body.querySelectorAll(".similar-card").forEach(el => {
      el.addEventListener("click", () => {
        const target = allCars.find(c => c.id === el.dataset.id);
        if (target) onSelectCar(target);
      });
    });
  }

  const compareAllBtn = body.querySelector("#compareAllBtn");
  if (compareAllBtn && onCompareAll) {
    compareAllBtn.addEventListener("click", () => onCompareAll(compareAllBtn.dataset.ids.split(",")));
  }
}
