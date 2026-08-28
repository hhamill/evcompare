import { FIELDS, GROUP_ORDER, bodyIcon, carSummarySentence, fmtVal, fieldByKey, isRealValue } from "./fields.js?v=14";
import { findSimilarCars } from "./similar.js?v=6";
import { carPath, hubPath } from "./router.js?v=6";
import { hubsForCar } from "./hubs.js?v=4";

// "msrp" used to sit here too, printing the same number a second time directly under the
// green price in the card header. The freed slot goes to 0-60, which actually varies across
// the catalog. drivetrain stays because it's now the only place AWD is stated on a card
// (see the badge rule below), and maxPassengers stays because it's what you're scanning for
// the moment you need more than five seats.
const CARD_STAT_KEYS = ["epaRange", "zeroTo60", "drivetrain", "maxPassengers"];

// The standard "share" glyph (an upward arrow escaping an open-top tray) — no single emoji
// reads unambiguously as "share" across platforms, so this is hand-drawn to match the rest of
// this app's inline-SVG icons (the brand mark, etc.) rather than reaching for an icon library.
const SHARE_ICON = `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 1v9"/><path d="M4.5 4.5L8 1l3.5 3.5"/><path d="M3 7v6a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V7"/></svg>`;

// Car data is hand-researched from external sources rather than programmatically validated,
// so it isn't safe to assume it never contains characters that would break out of the
// innerHTML/attribute context it's interpolated into below. Mirrors scripts/prerender.mjs's
// own esc() helper, which already does this for the static/prerendered pages — this closes
// the same gap for the client-rendered path everyone actually sees and interacts with.
function esc(str) {
  return String(str).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

// Only allow http(s) links to render as actual <a href>s — a manufacturer/review link
// should never resolve to a javascript: URL or similar, and this also catches malformed
// values (missing scheme, stray whitespace) that aren't real absolute URLs at all.
function safeHref(url) {
  if (typeof url !== "string") return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

// Mirrors js/app.js's own copyToClipboard — same "flash the button's label" confirmation,
// duplicated rather than threaded through as a callback since it's small and self-contained
// (no app state involved).
function copyToClipboard(text, btn) {
  const original = btn.textContent;
  navigator.clipboard?.writeText(text).then(() => {
    btn.textContent = "Copied!";
    setTimeout(() => { btn.textContent = original; }, 1500);
  }).catch(() => {});
}

export function carTitle(car) {
  return `${esc(car.make)} ${esc(car.model)}`;
}

// Placeholder grid shown while /data/evs.json is in flight. Purely decorative, so the whole
// block is aria-hidden — the real "what's happening" signal for assistive tech is the
// aria-live result count, which app.js sets to "Loading vehicles…" over the same window.
// Card count is arbitrary; it just needs to fill a first screen at typical widths.
export function renderSkeletonGrid(container, count = 9) {
  const card = `
    <div class="skeleton-card">
      <div class="skeleton-row">
        <div class="skeleton-icon skeleton-shimmer"></div>
        <div style="flex:1; min-width:0;">
          <div class="skeleton-line skeleton-shimmer" style="width:62%"></div>
          <div class="skeleton-line skeleton-shimmer" style="width:40%; margin-top:8px; height:8px;"></div>
        </div>
      </div>
      <div class="skeleton-line skeleton-shimmer" style="width:28%; height:16px; border-radius:999px;"></div>
      <div class="skeleton-row" style="gap:24px; margin-top:2px;">
        <div style="flex:1"><div class="skeleton-line skeleton-shimmer" style="width:70%; height:8px;"></div>
          <div class="skeleton-line skeleton-shimmer" style="width:45%; margin-top:7px;"></div></div>
        <div style="flex:1"><div class="skeleton-line skeleton-shimmer" style="width:70%; height:8px;"></div>
          <div class="skeleton-line skeleton-shimmer" style="width:45%; margin-top:7px;"></div></div>
      </div>
      <div class="skeleton-line skeleton-shimmer" style="width:100%; height:8px; margin-top:auto;"></div>
    </div>`;
  container.className = "skeleton-grid";
  container.setAttribute("aria-hidden", "true");
  container.innerHTML = card.repeat(count);
}

// Terminal state for a failed dataset fetch. Retry re-runs the same load path rather than
// reloading the document, so a transient network blip doesn't cost a full page boot.
export function renderLoadError(container, onRetry) {
  container.className = "load-error";
  container.removeAttribute("aria-hidden");
  container.innerHTML = `
    <h3>Couldn't load vehicle data</h3>
    <p>Check your connection and try again.</p>
    <button class="btn btn-primary" data-role="retry">Retry</button>`;
  container.querySelector('[data-role="retry"]').addEventListener("click", onRetry);
}

export function renderCardGrid(container, cars, { compareSet, onToggleCompare, onOpenDetail, scopeLabel = null }) {
  // Reclaim the container from renderSkeletonGrid/renderLoadError, which repurpose it.
  container.className = "card-grid";
  container.removeAttribute("aria-hidden");
  container.innerHTML = "";
  if (cars.length === 0) {
    // Hub-aware: on a scoped page the hub is usually the binding constraint, not the user's
    // filter, so "try loosening a filter" would send them after the wrong thing.
    container.innerHTML = scopeLabel
      ? `<div class="empty-state"><h3>No ${esc(scopeLabel)} match these filters</h3>
         <p>Try loosening a filter, or <a href="/">search all vehicles</a>.</p></div>`
      : `<div class="empty-state"><h3>No vehicles match your filters</h3><p>Try loosening a filter or resetting them.</p></div>`;
    return;
  }
  for (const car of cars) {
    const card = document.createElement("div");
    card.className = "ev-card";

    const stats = CARD_STAT_KEYS.map(key => {
      const field = fieldByKey(key);
      return `<div class="ev-stat"><span class="ev-stat-label">${field.label}</span><span class="ev-stat-value">${fmtVal(field, field.get(car))}</span></div>`;
    }).join("");

    // Body style leads, and unlike the rest it's a category rather than a feature — styled
    // as a filled pill (.badge-body) to say so. It's the only place the style is stated in
    // text: the silhouette carries it visually but is aria-hidden, so without this a screen
    // reader gets no body style from a card at all.
    const badges = [];
    // srPrefix is read aloud but not shown: on its own "SUV" is a non sequitur in the middle
    // of a card, and the silhouette that gives it context is aria-hidden.
    if (car.bodyStyle) badges.push({ text: car.bodyStyle, kind: "body", srPrefix: "Body style: " });
    if (car.driverAssist?.handsFreeDriving?.available) badges.push("Hands-Free Driving");
    if (car.isThreeRow) badges.push("3-Row");
    // Only when the trim itself isn't already AWD. Unconditionally, this fired on 101 of 149
    // cars — including every AWD trim, where it restated the Drivetrain stat two rows down
    // and told you nothing. Restricted to non-AWD trims it carries a real, non-obvious fact:
    // this particular trim is RWD/FWD, but you can order the same model with AWD.
    if (car.allWheelDriveAvailable && car.drivetrain !== "AWD") badges.push("AWD Avail.");

    card.innerHTML = `
      <div class="ev-card-top">
        <div style="display:flex; gap:10px; align-items:flex-start;">
          <div class="ev-card-icon">${bodyIcon(car.bodyStyle)}</div>
          <div>
            <div class="ev-card-title">${carTitle(car)}</div>
            <div class="ev-card-trim">${car.modelYear} · ${esc(car.trim)}</div>
          </div>
        </div>
        <div class="ev-card-price"><span class="sr-only">Price: </span>${fmtVal(fieldByKey("msrp"), car.msrp)}</div>
      </div>
      ${badges.length ? `<div class="ev-card-badges">${badges.map(b => typeof b === "string" ? `<span class="badge">${b}</span>` : `<span class="badge badge-${b.kind}"><span class="sr-only">${b.srPrefix}</span>${esc(b.text)}</span>`).join("")}</div>` : ""}
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
      <div class="compare-col-header-row">
        <div class="compare-col-title"><span class="compare-col-icon">${bodyIcon(car.bodyStyle)}</span> ${carTitle(car)}</div>
        ${onRemove ? `<button class="compare-col-remove" data-id="${esc(car.id)}" aria-label="Remove">&times;</button>` : ""}
      </div>
      <div class="compare-col-trim">${car.modelYear} · ${esc(car.trim)}</div>
      <div class="compare-col-price${bestPrice !== null && car.msrp !== bestPrice ? " compare-col-price-not-cheapest" : ""}">${fmtVal(fieldByKey("msrp"), car.msrp)}</div>
      ${onOpenDetail ? `<button class="btn btn-sm compare-col-view-btn" data-id="${esc(car.id)}">View details</button>` : ""}
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
    const review = safeHref(car.links?.review);
    const spec = safeHref(car.links?.manufacturerSpec);
    if (review) links.push(`<a href="${esc(review)}" target="_blank" rel="noopener">Review</a>`);
    if (spec) links.push(`<a href="${esc(spec)}" target="_blank" rel="noopener">Specs</a>`);
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
      <div class="similar-card" data-id="${esc(car.id)}">
        <div class="similar-card-top">
          <span class="similar-card-icon">${bodyIcon(car.bodyStyle)}</span>
          <div>
            <div class="similar-card-title">${carTitle(car)}</div>
            <div class="similar-card-trim">${car.modelYear} · ${esc(car.trim)}</div>
          </div>
        </div>
        <div class="similar-card-price">
          <span class="sr-only">Price: </span>${fmtVal(fieldByKey("msrp"), car.msrp)}
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
        <button id="compareAllBtn" class="btn btn-sm btn-primary" data-ids="${esc(compareAllIds.join(","))}">Compare all (${compareAllIds.length})</button>
      </div>
      <p class="similar-hint">Close matches on price and specs — click one to compare it in this view.</p>
      <div class="similar-grid">${tiles}</div>
    </div>
  `;
}

export function renderDetailModal(body, car, { inCompare, onToggleCompare, allCars, onSelectCar, onCompareAll, hubs = [] }) {
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
  const manufacturerSpecHref = safeHref(car.links?.manufacturerSpec);
  const reviewHref = safeHref(car.links?.review);
  const epaStickerHref = safeHref(car.links?.epaWindowSticker);
  const rangeSourceHref = safeHref(car.range?.source);
  if (manufacturerSpecHref) links.push(`<a href="${esc(manufacturerSpecHref)}" target="_blank" rel="noopener">Manufacturer specs ↗</a>`);
  if (reviewHref) links.push(`<a href="${esc(reviewHref)}" target="_blank" rel="noopener">Review ↗</a>`);
  if (epaStickerHref) links.push(`<a href="${esc(epaStickerHref)}" target="_blank" rel="noopener">EPA window sticker ↗</a>`);
  if (rangeSourceHref) links.push(`<a href="${esc(rangeSourceHref)}" target="_blank" rel="noopener">fueleconomy.gov ↗</a>`);

  body.innerHTML = `
    <div class="modal-header-row">
      <div class="modal-title">${bodyIcon(car.bodyStyle)} ${carTitle(car)}</div>
      <button id="modalShareBtn" class="btn btn-ghost btn-sm icon-btn">${SHARE_ICON} Share</button>
    </div>
    <div class="modal-trim">${car.modelYear} · ${esc(car.trim)}</div>
    ${/* The summary sentence directly below states the price in context ("...and an MSRP of
         $64,500"), so announcing this standalone number too is pure repetition. It only does
         so when the price is a real number, though: for null/"N/A"/"Pending" the sentence
         omits price entirely, and then this element is the *only* place a screen reader
         learns the price is unpublished — so it stays announced, with a label. */""}
    <div class="modal-price"${isRealValue(car.msrp) ? ' aria-hidden="true"' : ""}>${
      isRealValue(car.msrp) ? "" : '<span class="sr-only">Price: </span>'
    }${fmtVal(fieldByKey("msrp"), car.msrp)}</div>
    <p class="modal-summary">${esc(carSummarySentence(car))} Full specs below.</p>
    ${sections}
    ${links.length ? `<div class="modal-section"><h4>Links</h4><div class="modal-links">${links.join("")}</div></div>` : ""}
    ${(() => {
      // Mirrors the "Also in" block on the prerendered page. That one lives inside
      // #staticCarDetail, which app.js removes on boot — so without this, the hub links a
      // crawler sees are invisible to everyone actually using the site.
      const belongs = hubsForCar(car, hubs);
      if (!belongs.length) return "";
      return `<div class="modal-section"><h4>Also in</h4><div class="modal-links">${
        belongs.map(h => `<a href="${esc(hubPath(h))}/">${esc(h.h1)}</a>`).join("")
      }</div></div>`;
    })()}
    ${car.notes ? `<div class="modal-section"><h4>Notes</h4><p style="font-size:13px;color:var(--text-dim);">${esc(car.notes)}</p></div>` : ""}
    <div class="modal-actions">
      <button id="modalCompareBtn" class="btn ${inCompare ? "btn-ghost" : "btn-primary"}">${inCompare ? "Remove from compare" : "Add to compare"}</button>
    </div>
    ${allCars ? renderSimilarSection(car, allCars) : ""}
  `;
  body.querySelector("#modalCompareBtn").addEventListener("click", () => onToggleCompare(car.id));
  body.querySelector("#modalShareBtn").addEventListener("click", e => {
    copyToClipboard(`${location.origin}${carPath(car)}`, e.currentTarget);
  });

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
