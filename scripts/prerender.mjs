#!/usr/bin/env node
// Static prerender step: generates one real HTML file per trim (title, meta description,
// Open Graph/Twitter Card tags, and schema.org JSON-LD) so crawlers and AI agents see actual
// content and structured data without running JS, plus a sitemap.xml/robots.txt for search
// engines. Human visitors still get the full interactive app — app.js's existing router
// (js/router.js's carForPath) already opens the right car's detail view based on
// location.pathname, so these pages don't need any client-side logic of their own.
//
// This has no dependencies beyond Node's standard library and doesn't touch git — it writes
// into dist/, which .gitignore excludes. Run it locally with `node scripts/prerender.mjs`,
// or let the GitHub Actions workflow (.github/workflows/deploy.yml) run it on every deploy.
//
// SITE_BASE_URL below is currently https://evcompare.org (root deploy). Site-wide, resource
// references (css/js/fetch) are root-relative rather than BASE_PATH-prefixed, so this constant
// only affects the *_absolute_* URLs this script embeds (canonical/OG/JSON-LD/sitemap) — see
// js/router.js's BASE_PATH comment if this ever moves back to a GitHub Pages project page.

import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { BASE_PATH, carPath } from "../js/router.js";
import { findSimilarCars } from "../js/similar.js";
import { buildHubs, hubCars, hubsForCar } from "../js/hubs.js";
import { hubPath } from "../js/router.js";
import { FIELDS, GROUP_ORDER, carSummarySentence, fmtVal, fieldByKey, isRealValue } from "../js/fields.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");

const SITE_BASE_URL = "https://evcompare.org";
const SITE_NAME = "EV Compare";

const { license, attribution, models: cars } = JSON.parse(readFileSync(path.join(ROOT, "data", "evs.json"), "utf8"));

// Content hash of the models array only (never the wrapper it sits in — hashing the whole
// file would be self-referential, since the hash field is itself part of what's hashed).
// Recomputed fresh on every build rather than trusted from the committed source file, so it
// can never go stale/forgotten the way a manually-bumped value would — see data/SCHEMA.md.
function hashModels(models) {
  return "sha256:" + createHash("sha256").update(JSON.stringify(models)).digest("hex");
}

// Short content hash of the hand-authored OG image, appended as a `?v=` query string to every
// og:image/twitter:image URL. Platforms like Discord cache a fetched image by its exact URL,
// independent of how aggressively they revalidate the *page* that references it — so bumping
// only the page (e.g. a `?v=` on the page URL itself) doesn't reliably bust an already-cached
// image. Deriving this from the file's own bytes means it changes if and only if the image
// actually changes, with nothing to remember to bump by hand.
const ogImageVersion = createHash("sha256").update(readFileSync(path.join(ROOT, "assets", "og-image.png"))).digest("hex").slice(0, 10);

// ---------- helpers ----------

const isReal = v => v != null && v !== "N/A" && v !== "Pending";

function esc(str) {
  return String(str).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

// Mirrors js/render.js's own safeHref — only allow http(s) links through, so a malformed or
// unexpected value in the hand-researched dataset can never resolve to a javascript: URL or
// similar when interpolated straight into an <a href>.
function safeHref(url) {
  if (typeof url !== "string") return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

// carPath() returns the real browser-visible path, e.g. "/evcompare/2026/mach-e/gt-awd" —
// already including BASE_PATH. The dist/ directory's root is what GitHub Pages mounts *at*
// BASE_PATH (project pages auto-prefix with the repo name), so the on-disk path underneath
// dist/ needs that same prefix stripped back off before joining.
function relFilePath(car) {
  const p = carPath(car);
  const rel = p.startsWith(BASE_PATH) ? p.slice(BASE_PATH.length) : p;
  return rel.replace(/^\/+/, "");
}

function canonicalUrl(car) {
  return `${SITE_BASE_URL}${carPath(car)}/`;
}

const DRIVE_CONFIG = {
  AWD: "https://schema.org/AllWheelDriveConfiguration",
  RWD: "https://schema.org/RearWheelDriveConfiguration",
  FWD: "https://schema.org/FrontWheelDriveConfiguration",
};

function jsonLdFor(car, url, similar) {
  const additionalProperty = [];
  const addProp = (name, value, unit) => {
    if (!isReal(value)) return;
    additionalProperty.push({ "@type": "PropertyValue", name, value: unit ? `${value} ${unit}` : String(value) });
  };
  addProp("EPA Range", car.range?.epaMiles, "mi");
  addProp("Battery Capacity", car.battery?.usableKwh, "kWh");
  addProp("0-60 mph", car.performance?.zeroTo60Sec, "s");
  addProp("Max DC Fast Charging", car.charging?.maxDcKw, "kW");
  addProp("Tow Capacity", car.towCapacityLbs, "lb");
  addProp("Ground Clearance", car.groundClearanceIn, "in");

  const ld = {
    "@context": "https://schema.org",
    "@type": "Car",
    name: `${car.modelYear} ${car.make} ${car.model} ${car.trim}`,
    brand: { "@type": "Brand", name: car.make },
    model: car.model,
    vehicleModelDate: String(car.modelYear),
    bodyType: car.bodyStyle,
    fuelType: "Electric",
    description: carSummarySentence(car),
    url,
  };
  if (isReal(car.doors)) ld.numberOfDoors = car.doors;
  if (isReal(car.maxPassengers)) ld.vehicleSeatingCapacity = car.maxPassengers;
  if (DRIVE_CONFIG[car.drivetrain]) ld.driveWheelConfiguration = DRIVE_CONFIG[car.drivetrain];
  if (additionalProperty.length) ld.additionalProperty = additionalProperty;
  if (isReal(car.msrp)) {
    ld.offers = {
      "@type": "Offer",
      price: car.msrp,
      priceCurrency: "USD",
      availability: car.onSaleDate ? "https://schema.org/PreOrder" : "https://schema.org/InStock",
      url,
    };
  }
  if (car.onSaleDate) ld.releaseDate = car.onSaleDate;

  if (similar.length) {
    ld.isSimilarTo = similar.map(({ car: c }) => ({
      "@type": "Car",
      name: `${c.modelYear} ${c.make} ${c.model} ${c.trim}`,
      url: canonicalUrl(c),
    }));
  }
  return ld;
}

// Google requires every ListItem in a BreadcrumbList to carry an `item` URL (except
// optionally the last one) — this site has no separate make/model listing pages to link
// intermediate crumbs to (it's a single-page app with client-side filtering, not a real
// crawlable page per make/model), so the breadcrumb only reflects pages that actually exist:
// the homepage and this car's own page. Search Console flagged the old 4-level version
// ("Missing field 'item'") for exactly this reason.
function breadcrumbLdFor(car, url) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: SITE_NAME, item: `${SITE_BASE_URL}/` },
      { "@type": "ListItem", position: 2, name: `${car.modelYear} ${car.make} ${car.model} ${car.trim}`, item: url },
    ],
  };
}

// ---------- per-car page ----------

// A plain, non-interactive rendering of the same spec sections the live detail modal builds
// (js/render.js's renderDetailModal) — same FIELDS/GROUP_ORDER grouping and the same shared
// fmtVal() formatting, so the static page can never show a value the modal wouldn't. The HTML
// structure itself is necessarily duplicated (this runs in Node, render.js manipulates a real
// DOM), but every actual value/label comes from the one shared source of truth.
function staticSpecSections(car) {
  const groups = {};
  for (const field of FIELDS) {
    if (field.key === "msrp") continue;
    if (!groups[field.group]) groups[field.group] = [];
    groups[field.group].push(field);
  }
  return GROUP_ORDER.map(groupName => {
    const fields = groups[groupName];
    if (!fields) return "";
    const rows = fields.map(f => {
      const v = f.get(car);
      return `<div class="modal-row"><span class="k">${esc(f.label)}</span><span class="v">${fmtVal(f, v)}</span></div>`;
    }).join("");
    return `<div class="modal-section"><h4>${esc(groupName)}</h4><div class="modal-grid">${rows}</div></div>`;
  }).join("");
}

function staticLinksBlock(car) {
  const links = [];
  const manufacturerSpecHref = safeHref(car.links?.manufacturerSpec);
  const reviewHref = safeHref(car.links?.review);
  const epaStickerHref = safeHref(car.links?.epaWindowSticker);
  const rangeSourceHref = safeHref(car.range?.source);
  if (manufacturerSpecHref) links.push(`<a href="${esc(manufacturerSpecHref)}" target="_blank" rel="noopener">Manufacturer specs ↗</a>`);
  if (reviewHref) links.push(`<a href="${esc(reviewHref)}" target="_blank" rel="noopener">Review ↗</a>`);
  if (epaStickerHref) links.push(`<a href="${esc(epaStickerHref)}" target="_blank" rel="noopener">EPA window sticker ↗</a>`);
  if (rangeSourceHref) links.push(`<a href="${esc(rangeSourceHref)}" target="_blank" rel="noopener">fueleconomy.gov ↗</a>`);
  return links.length ? `<div class="modal-section"><h4>Links</h4><div class="modal-links">${links.join("")}</div></div>` : "";
}

// Shared page shell for every prerendered page. Extracted from pageFor() so hub landing
// pages emit byte-identical chrome (topbar, sidebar, compare view, modal) rather than a
// second copy that quietly drifts. Only the head metadata, the no-JS static block and the
// intro line differ between page types.
const OG_IMAGE = `${SITE_BASE_URL}/assets/og-image.png?v=${ogImageVersion}`;

function pageShell(o) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(o.pageTitle)}</title>
<meta name="description" content="${esc(o.description)}" />
<meta name="robots" content="index,follow" />
<meta name="theme-color" content="#4ee08a" />
<link rel="canonical" href="${esc(o.url)}" />

<meta property="og:type" content="${esc(o.ogType)}" />
<meta property="og:site_name" content="${esc(SITE_NAME)}" />
<meta property="og:title" content="${esc(o.ogTitle)}" />
<meta property="og:description" content="${esc(o.description)}" />
<meta property="og:url" content="${esc(o.url)}" />
<meta property="og:image" content="${esc(OG_IMAGE)}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="600" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(o.ogTitle)}" />
<meta name="twitter:description" content="${esc(o.description)}" />
<meta name="twitter:image" content="${esc(OG_IMAGE)}" />

${o.jsonLd.map(j => `<script type="application/ld+json">${JSON.stringify(j)}</script>`).join("\n")}

<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 32 32%22><defs><clipPath id=%22fc%22><circle cx=%2216%22 cy=%2216%22 r=%2215%22/></clipPath></defs><g clip-path=%22url(%23fc)%22><rect width=%2216%22 height=%2232%22 fill=%22%230f7a46%22/><rect x=%2216%22 width=%2216%22 height=%2232%22 fill=%22%232a6fdb%22/></g><polygon points=%2218.4,8 10.4,17.6 15.2,17.6 13.6,24 21.6,12.8 16.8,12.8%22 fill=%22%23ffffff%22/></svg>" />
<script>
  (function (l) {
    if (l.search[1] === "p" && l.search[2] === "=") {
      var decoded = l.search.slice(3).split("&").map(function (s) { return s.replace(/~and~/g, "&"); }).join("?");
      window.history.replaceState(null, null, l.pathname.slice(0, -1) + decoded + l.hash);
    }
  })(window.location);
</script>
<link rel="stylesheet" href="/css/styles.css?v=36" />
<script data-goatcounter="https://evcompare.goatcounter.com/count"
        async src="//gc.zgo.at/count.js"></script>
</head>
<body>
<div class="app">

  <header class="topbar">
    <button type="button" class="brand" id="brandHome" aria-label="EV Compare — go to homepage">
      <span class="brand-mark"><svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true"><defs><clipPath id="brandMarkClip"><circle cx="16" cy="16" r="15"/></clipPath></defs><g clip-path="url(#brandMarkClip)"><rect width="16" height="32" fill="var(--accent)"/><rect x="16" width="16" height="32" fill="var(--accent-2)"/></g><polygon points="18.4,8 10.4,17.6 15.2,17.6 13.6,24 21.6,12.8 16.8,12.8" fill="var(--accent-contrast)"/></svg></span>
      <span class="brand-name">EV Compare</span>
    </button>
    <div class="topbar-search">
      <input type="search" id="searchInput" aria-label="Search vehicles by make or model" placeholder="Search make or model…" autocomplete="off" />
    </div>
    <div class="topbar-actions">
      <button id="filtersToggleBtn" class="btn btn-ghost filters-toggle-btn" aria-expanded="false" aria-controls="sidebar">Filters</button>
      <button id="resetFiltersBtn" class="btn btn-ghost">Reset filters</button>
      <button id="themeToggleBtn" class="theme-toggle-btn" aria-label="Color theme"></button>
    </div>
  </header>

${o.staticBlock}

  <div id="sidebarBackdrop" class="sidebar-backdrop" hidden></div>

  <div class="layout">
    <aside class="sidebar" id="sidebar" aria-label="Filters">
      <div class="sidebar-header">
        <h2>Filters</h2>
        <button id="sidebarCloseBtn" class="sidebar-close" aria-label="Close filters">&times;</button>
      </div>
      <div id="filterGroups" class="filter-groups"><!-- generated --></div>
    </aside>

    <main class="content">
      <div id="viewResults" class="view">
${o.introHtml}
        <div id="activeFilters" class="active-filters" hidden></div>
        <div class="results-toolbar">
          <label for="sortSelect" class="results-toolbar-label">Sort by</label>
          <select id="sortSelect" class="sort-select">
            <option value="default">Default</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="range-desc">Range: Longest first</option>
            <option value="range-asc">Range: Shortest first</option>
            <option value="zeroTo60-asc">0–60: Fastest first</option>
            <option value="zeroTo60-desc">0–60: Slowest first</option>
            <option value="maxPassengers-desc">Max Passengers: Most first</option>
            <option value="maxPassengers-asc">Max Passengers: Fewest first</option>
          </select>
          <span id="resultCount" class="result-count" role="status" aria-live="polite"></span>
        </div>
        <div id="cardGrid" class="card-grid"></div>
        ${o.footerNav ?? ""}
      </div>

      <div id="viewCompare" class="view" hidden>
        <div class="compare-header">
          <button id="backToResultsBtn" class="btn btn-ghost">&larr; Back to results</button>
          <h2>Comparing <span id="compareCount">0</span> vehicles</h2>
          <div class="compare-scroll-nav" id="compareScrollNav" hidden>
            <button id="compareScrollLeftBtn" class="compare-scroll-nav-btn" aria-label="Scroll left">&lsaquo;</button>
            <button id="compareScrollRightBtn" class="compare-scroll-nav-btn" aria-label="Scroll right">&rsaquo;</button>
          </div>
          <button id="shareCompareBtn" class="btn btn-ghost icon-btn"><svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 1v9"/><path d="M4.5 4.5L8 1l3.5 3.5"/><path d="M3 7v6a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V7"/></svg> Share</button>
          <button id="clearCompareBtn" class="btn btn-ghost">Clear all</button>
        </div>
        <div class="compare-scroll">
          <table id="compareTable" class="compare-table"></table>
        </div>
      </div>
    </main>
  </div>

  <div id="compareBar" class="compare-bar" hidden>
    <div class="compare-bar-inner">
      <span id="compareBarText">0 selected</span>
      <div class="compare-bar-actions">
        <button id="compareBarClearBtn" class="btn btn-ghost">Clear</button>
        <button id="compareBarViewBtn" class="btn btn-primary">Compare</button>
      </div>
    </div>
  </div>

  <div id="detailModal" class="modal-backdrop" hidden>
    <div class="modal" role="dialog" aria-modal="true">
      <button id="modalCloseBtn" class="modal-close" aria-label="Close">&times;</button>
      <div id="modalBody" class="modal-body"></div>
    </div>
  </div>

</div>

<script type="module" src="/js/app.js?v=52"></script>
</body>
</html>
`;
}



// The no-JS fallback for a single car: a complete, real rendering of its title, price, full
// spec table, links and similar vehicles, for crawlers and clients that don't run JS. app.js
// removes it as soon as it boots.
function staticCarBlock(car, title, summary, similar) {
  return `  <div id="staticCarDetail" class="static-car-detail">
    <h1 class="modal-title">${esc(title)}</h1>
    <div class="modal-trim">${car.modelYear} · ${esc(car.trim)}</div>
    <div class="modal-price"${isRealValue(car.msrp) ? ` aria-hidden="true"` : ""}>${
      isRealValue(car.msrp) ? "" : `<span class="sr-only">Price: </span>`
    }${fmtVal(fieldByKey("msrp"), car.msrp)}</div>
    <p class="modal-summary">${esc(summary)} Full specs below.</p>
    ${staticSpecSections(car)}
    ${staticLinksBlock(car)}
    ${car.notes ? `<div class="modal-section"><h4>Notes</h4><p style="font-size:13px;color:var(--text-dim);">${esc(car.notes)}</p></div>` : ""}
    ${(() => {
      const belongs = hubsForCar(car, HUBS);
      return belongs.length ? `<div class="modal-section"><h4>Also in</h4>
      <p class="static-hub-links">${belongs.map(h => `<a href="${esc(hubPath(h))}/">${esc(h.h1)}</a>`).join(" &middot; ")}</p>
    </div>` : "";
    })()}
    <p><a href="/">&larr; All EVs on ${esc(SITE_NAME)}</a></p>
    ${similar.length ? `<div class="modal-section">
      <h4>Similar Vehicles</h4>
      <ul class="static-similar-list">
${similar.map(({ car: c }) => `        <li><a href="${esc(carPath(c))}/">${esc(`${c.modelYear} ${c.make} ${c.model} ${c.trim}`)}</a> — ${fmtVal(fieldByKey("msrp"), c.msrp)}</li>`).join("\n")}
      </ul>
    </div>` : ""}
  </div>`;
}

function pageFor(car) {
  const title = `${car.modelYear} ${car.make} ${car.model} ${car.trim}`;
  const url = canonicalUrl(car);
  const summary = carSummarySentence(car);
  // Doesn't restate the site name here — the title suffix and og:site_name already carry that,
  // and "compare...EVs...EV Compare" back to back read as redundant when actually spoken aloud.
  const description = `${summary} Full specs and side-by-side comparisons.`;
  const similar = findSimilarCars(car, cars, { limit: 4 });

  return pageShell({
    pageTitle: `${title} — Specs & Price | ${SITE_NAME}`,
    ogTitle: title,
    description,
    url,
    ogType: "product",
    jsonLd: [jsonLdFor(car, url, similar), breadcrumbLdFor(car, url)],
    staticBlock: staticCarBlock(car, title, summary, similar),
    footerNav: footerNavHtml(),
    // Stays a <p>: this page's <h1> is the car's own title inside #staticCarDetail above,
    // and a page gets one.
    introHtml: `        <p class="intro-line">View and compare electric vehicles sold in the US. Click a model or use the filters to get started.</p>`,
  });
}

// ---------- hub landing pages ----------

// Below this, a hub is too thin to be worth indexing. It WARNS rather than skipping: once a
// URL is indexed, having it start 404ing is worse than a thin page, and silently dropping it
// means finding out from Search Console weeks later. A human decides.
const HUB_MIN = 8;   // default floor; make/body hubs carry their own (see js/hubs.js)

const HUBSETS = buildHubs(cars);
const HUBS = HUBSETS.all;

// Practical hubs ride at the top of the page; make and body-style hubs go in a footer nav.
// 34 pills above the grid would bury the results, and a footer nav is the conventional place
// for this kind of breadth linking anyway.
function hubNavHtml(hubs, label) {
  if (!hubs.length) return "";
  const links = hubs.map(h => `<a href="${esc(hubPath(h))}/">${esc(h.h1)}</a>`).join("\n      ");
  return `<span class="hub-links-label">${esc(label)}</span>\n      ${links}`;
}

function footerNavHtml() {
  return `<nav class="hub-links hub-links-footer" aria-label="Browse by body style and make">
      ${hubNavHtml(HUBSETS.bodies, "By body style:")}
    </nav>
    <nav class="hub-links hub-links-footer" aria-label="Browse by make">
      ${hubNavHtml(HUBSETS.makes, "By make:")}
    </nav>`;
}

function hubJsonLd(hub, url, matched) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: hub.h1,
    description: hub.blurb,
    url,
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: `${SITE_BASE_URL}${BASE_PATH}/` },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: matched.length,
      itemListElement: matched.map((car, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: canonicalUrl(car),
        name: `${car.modelYear} ${car.make} ${car.model} ${car.trim}`,
      })),
    },
  };
}

function hubBreadcrumbLd(hub, url) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: SITE_NAME, item: `${SITE_BASE_URL}${BASE_PATH}/` },
      { "@type": "ListItem", position: 2, name: hub.h1, item: url },
    ],
  };
}

// The no-JS fallback list. Leads with the spec the page is about, so a crawler (and a reader
// without JS) gets the ordering the page promises rather than an arbitrary list.
function staticHubBlock(hub, matched, total) {
  const field = fieldByKey(hub.highlight);
  const rows = matched.map(car => {
    const name = `${car.modelYear} ${car.make} ${car.model} ${car.trim}`;
    return `        <li><a href="${esc(carPath(car))}/">${esc(name)}</a>`
      + ` — ${esc(field.label)}: ${fmtVal(field, field.get(car))}`
      + ` · ${fmtVal(fieldByKey("msrp"), car.msrp)}</li>`;
  }).join("\n");
  return `  <div id="staticHubList" class="static-car-detail">
    <h4>${esc(matched.length)} vehicles, sorted by ${esc(field.label)}</h4>
    <ul class="static-similar-list">
${rows}
    </ul>
    <p><a href="${BASE_PATH}/">&larr; All ${total} models on ${esc(SITE_NAME)}</a></p>
  </div>`;
}

function pageForHub(hub, matched) {
  const url = `${SITE_BASE_URL}${hubPath(hub)}/`;
  const description = `${hub.blurb} ${matched.length} models, updated regularly.`;
  return pageShell({
    pageTitle: `${hub.title} | ${SITE_NAME}`,
    ogTitle: hub.h1,
    description,
    url,
    ogType: "website",
    jsonLd: [hubJsonLd(hub, url, matched), hubBreadcrumbLd(hub, url)],
    staticBlock: staticHubBlock(hub, matched, cars.length),
    footerNav: footerNavHtml(),
    // Heading + generated intro live here, not in the static block: app.js removes that block
    // on boot, and taking the page's only <h1> with it would be a real regression for anyone
    // running JS. Only the list is disposable — the interactive grid replaces it.
    introHtml: `        <h1 class="hub-title">${esc(hub.h1)}</h1>
        <p class="intro-line">${esc(hub.intro(matched, cars.length, cars))}</p>`,
  });
}

// ---------- homepage ----------

function homepageJsonLd() {
  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: `${SITE_BASE_URL}/`,
    description: "Filter and compare electric vehicles by price, range, charging speed, and dozens of other specs.",
  };
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "All EVs on EV Compare",
    numberOfItems: cars.length,
    itemListElement: cars.map((car, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: canonicalUrl(car),
      name: `${car.modelYear} ${car.make} ${car.model} ${car.trim}`,
    })),
  };
  return `<script type="application/ld+json">${JSON.stringify(website)}</script>\n<script type="application/ld+json">${JSON.stringify(itemList)}</script>`;
}

// Injects the homepage's JSON-LD into the source index.html right before </head>, and appends
// the same og-image cache-busting version query used on every car page (see ogImageVersion
// above) to index.html's own two hardcoded og:image/twitter:image URLs — rather than copying
// the source byte-for-byte, these are the only two places this build step adds/rewrites content
// in a file that isn't wholly generated from scratch, so keep both to single, easy-to-audit
// string operations.
function buildHomepage() {
  const src = readFileSync(path.join(ROOT, "index.html"), "utf8");
  if (!src.includes("</head>")) throw new Error("index.html has no </head> to inject JSON-LD before");
  // Hub links are injected here rather than hardcoded in index.html so they can't drift from
  // js/hubs.js, and rendered server-side rather than by app.js so a crawler actually sees
  // them — a sitemap entry with no inbound link is a weak signal.
  const links = HUBSETS.practical.map(h =>
    `<a href="${esc(hubPath(h))}/">${esc(h.h1)}</a>`).join("\n      ");
  return src
    .replace('<nav id="hubLinks" class="hub-links" aria-label="Browse by category"></nav>',
             `<nav id="hubLinks" class="hub-links" aria-label="Browse by category">\n      <span class="hub-links-label">Browse:</span>\n      ${links}\n    </nav>`)
    .replace('<div id="cardGrid" class="card-grid"></div>',
             `<div id="cardGrid" class="card-grid"></div>\n        ${footerNavHtml()}`)
    .replace("</head>", `${homepageJsonLd()}\n</head>`)
    .replaceAll("https://evcompare.org/assets/og-image.png", `${SITE_BASE_URL}/assets/og-image.png?v=${ogImageVersion}`);
}

// ---------- sitemap / robots ----------

// `lastmod` is each entry's real `lastVerifiedDate` (or, for the homepage, the most recent
// one across all cars) — not the build timestamp. The build regenerates every page on every
// deploy regardless of whether anything actually changed, so stamping "today" on all 150
// URLs every time would be noise, not signal; Google's own guidance is that lastmod should
// reflect genuine content changes; a value that's always "now" is exactly what erodes a
// crawler's trust in it. `lastVerifiedDate` is already tracked for precisely this reason (see
// data/SCHEMA.md) — bumped only when that entry's actual specs are re-researched/corrected.
function buildSitemap(entries) {
  const items = entries.map(({ loc, lastmod }) => `  <url><loc>${esc(loc)}</loc><lastmod>${esc(lastmod)}</lastmod></url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</urlset>\n`;
}

function buildRobots() {
  return `User-agent: *\nAllow: /\nSitemap: ${SITE_BASE_URL}${BASE_PATH}/sitemap.xml\n`;
}

// ---------- run ----------

function main() {
  if (existsSync(DIST)) rmSync(DIST, { recursive: true, force: true });
  mkdirSync(DIST, { recursive: true });

  // Copy the existing static site as-is, except index.html gets homepage JSON-LD injected
  // and data/evs.json gets a freshly-computed hash (see below) rather than whatever value
  // happened to be committed in the source file.
  for (const item of ["404.html", "css", "js", "data", "assets"]) {
    cpSync(path.join(ROOT, item), path.join(DIST, item), { recursive: true });
  }
  writeFileSync(path.join(DIST, "index.html"), buildHomepage());

  // Rewrite the copied evs.json with a hash computed from *this build's* models array, and
  // drop a tiny sibling file with just that hash — a third party who already has a local
  // copy can check data/current.json (a few dozen bytes) instead of re-downloading the
  // whole dataset just to find out nothing changed.
  const generatedAt = new Date().toISOString();
  const dataHash = hashModels(cars);
  writeFileSync(
    path.join(DIST, "data", "evs.json"),
    JSON.stringify({ hash: dataHash, license, attribution, url: SITE_BASE_URL, generatedAt, count: cars.length, models: cars }, null, 2) + "\n"
  );
  writeFileSync(
    path.join(DIST, "data", "current.json"),
    JSON.stringify({ current: dataHash, count: cars.length, generatedAt }, null, 2) + "\n"
  );

  const mostRecentVerified = cars.reduce((max, c) => c.lastVerifiedDate > max ? c.lastVerifiedDate : max, cars[0].lastVerifiedDate);
  const sitemapEntries = [{ loc: `${SITE_BASE_URL}${BASE_PATH}/`, lastmod: mostRecentVerified }];

  // Hub landing pages. lastmod is the most recent verification date *among that hub's own
  // members*, so a hub only claims freshness its content actually earned.
  let hubCount = 0;
  for (const hub of HUBS) {
    const matched = hubCars(hub, cars);
    const floor = hub.minCount ?? HUB_MIN;
    if (matched.length < floor) {
      console.warn(`  ! hub /${hub.slug}/ has only ${matched.length} vehicles (min ${floor}) — emitting anyway; review it`);
    }
    const outDir = path.join(DIST, hub.slug);
    mkdirSync(outDir, { recursive: true });
    writeFileSync(path.join(outDir, "index.html"), pageForHub(hub, matched));
    const lastmod = matched.reduce((max, c) => c.lastVerifiedDate > max ? c.lastVerifiedDate : max,
                                   matched[0]?.lastVerifiedDate ?? mostRecentVerified);
    sitemapEntries.push({ loc: `${SITE_BASE_URL}${hubPath(hub)}/`, lastmod });
    hubCount++;
  }
  let count = 0;
  for (const car of cars) {
    const rel = relFilePath(car);
    const outDir = path.join(DIST, rel);
    mkdirSync(outDir, { recursive: true });
    writeFileSync(path.join(outDir, "index.html"), pageFor(car));
    sitemapEntries.push({ loc: canonicalUrl(car), lastmod: car.lastVerifiedDate });
    count++;
  }

  writeFileSync(path.join(DIST, "sitemap.xml"), buildSitemap(sitemapEntries));
  writeFileSync(path.join(DIST, "robots.txt"), buildRobots());

  console.log(`Prerendered ${count} car pages + ${hubCount} hub pages + sitemap.xml/robots.txt into dist/`);
}

main();
