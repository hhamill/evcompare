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

// ---------- helpers ----------

const isReal = v => v != null && v !== "N/A" && v !== "Pending";

function esc(str) {
  return String(str).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
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

function summaryLine(car) {
  const parts = [];
  if (isReal(car.msrp)) parts.push(`$${Math.round(car.msrp).toLocaleString()}`);
  if (isReal(car.range?.epaMiles)) parts.push(`${car.range.epaMiles} mi EPA range`);
  if (isReal(car.performance?.horsepowerHp)) parts.push(`${car.performance.horsepowerHp} hp`);
  if (isReal(car.performance?.zeroTo60Sec)) parts.push(`0–60 in ${car.performance.zeroTo60Sec}s`);
  return parts.join(" · ");
}

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

function breadcrumbLdFor(car, url) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: SITE_NAME, item: `${SITE_BASE_URL}/` },
      { "@type": "ListItem", position: 2, name: car.make },
      { "@type": "ListItem", position: 3, name: car.model },
      { "@type": "ListItem", position: 4, name: `${car.modelYear} ${car.trim}`, item: url },
    ],
  };
}

// ---------- per-car page ----------

function pageFor(car) {
  const title = `${car.modelYear} ${car.make} ${car.model} ${car.trim}`;
  const url = canonicalUrl(car);
  const summary = summaryLine(car);
  // Doesn't restate the site name here — the title suffix and og:site_name already carry that,
  // and "compare...EVs...EV Compare" back to back read as redundant when actually spoken aloud.
  const description = summary
    ? `${title}: ${summary}. Full specs and side-by-side comparisons.`
    : `${title}: full specs, price, and comparisons.`;
  const similar = findSimilarCars(car, cars, { limit: 4 });
  const ld = jsonLdFor(car, url, similar);
  const breadcrumbLd = breadcrumbLdFor(car, url);
  const ogImage = `${SITE_BASE_URL}/assets/og-image.png`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(title)} — Specs &amp; Price | ${SITE_NAME}</title>
<meta name="description" content="${esc(description)}" />
<meta name="robots" content="index,follow" />
<meta name="theme-color" content="#4ee08a" />
<link rel="canonical" href="${esc(url)}" />

<meta property="og:type" content="product" />
<meta property="og:site_name" content="${esc(SITE_NAME)}" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:url" content="${esc(url)}" />
<meta property="og:image" content="${esc(ogImage)}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="600" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(description)}" />
<meta name="twitter:image" content="${esc(ogImage)}" />

<script type="application/ld+json">${JSON.stringify(ld)}</script>
<script type="application/ld+json">${JSON.stringify(breadcrumbLd)}</script>

<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22 shape-rendering=%22crispEdges%22><rect x=%220%22 y=%220%22 width=%2216%22 height=%2216%22 rx=%223%22 fill=%22%234ee08a%22/><rect x=%228%22 y=%222%22 width=%223%22 height=%222%22 fill=%22%23fff3b0%22/><rect x=%2211%22 y=%222%22 width=%221%22 height=%222%22 fill=%22%23e0a940%22/><rect x=%226%22 y=%224%22 width=%223%22 height=%222%22 fill=%22%23fff3b0%22/><rect x=%229%22 y=%224%22 width=%221%22 height=%222%22 fill=%22%23e0a940%22/><rect x=%224%22 y=%226%22 width=%227%22 height=%222%22 fill=%22%23fff3b0%22/><rect x=%2211%22 y=%226%22 width=%221%22 height=%222%22 fill=%22%23e0a940%22/><rect x=%228%22 y=%228%22 width=%223%22 height=%222%22 fill=%22%23fff3b0%22/><rect x=%2211%22 y=%228%22 width=%221%22 height=%222%22 fill=%22%23e0a940%22/><rect x=%226%22 y=%2210%22 width=%223%22 height=%222%22 fill=%22%23fff3b0%22/><rect x=%229%22 y=%2210%22 width=%221%22 height=%222%22 fill=%22%23e0a940%22/><rect x=%224%22 y=%2212%22 width=%223%22 height=%222%22 fill=%22%23fff3b0%22/><rect x=%227%22 y=%2212%22 width=%221%22 height=%222%22 fill=%22%23e0a940%22/></svg>" />
<script>
  (function (l) {
    if (l.search[1] === "p" && l.search[2] === "=") {
      var decoded = l.search.slice(3).split("&").map(function (s) { return s.replace(/~and~/g, "&"); }).join("?");
      window.history.replaceState(null, null, l.pathname.slice(0, -1) + decoded + l.hash);
    }
  })(window.location);
</script>
<link rel="stylesheet" href="/css/styles.css?v=17" />
<script data-goatcounter="https://evcompare.goatcounter.com/count"
        async src="//gc.zgo.at/count.js"></script>
</head>
<body>
<noscript>
  <h1>${esc(title)}</h1>
  <p>${esc(summary)}</p>
  <p><a href="/">&larr; All EVs on ${esc(SITE_NAME)}</a></p>
  ${similar.length ? `<p>Similar vehicles:</p>
  <ul>
${similar.map(({ car: c }) => `    <li><a href="${esc(carPath(c))}/">${esc(`${c.modelYear} ${c.make} ${c.model} ${c.trim}`)}</a></li>`).join("\n")}
  </ul>` : ""}
</noscript>

<div class="app">

  <header class="topbar">
    <button type="button" class="brand" id="brandHome" aria-label="EV Compare — go to homepage">
      <span class="brand-mark"><svg viewBox="0 0 68 17" width="100" height="25" shape-rendering="crispEdges"><rect x="11" y="1" width="8" height="1" fill="#a8f5c9"/><rect x="10" y="2" width="1" height="1" fill="#4ee08a"/><rect x="11" y="2" width="4" height="1" fill="#8fb8cc"/><rect x="15" y="2" width="1" height="1" fill="#4ee08a"/><rect x="16" y="2" width="3" height="1" fill="#eef1f6"/><rect x="19" y="2" width="1" height="1" fill="#4ee08a"/><rect x="10" y="3" width="1" height="1" fill="#4ee08a"/><rect x="11" y="3" width="4" height="1" fill="#8fb8cc"/><rect x="15" y="3" width="1" height="1" fill="#4ee08a"/><rect x="16" y="3" width="1" height="1" fill="#eef1f6"/><rect x="17" y="3" width="1" height="1" fill="#ffffff"/><rect x="18" y="3" width="1" height="1" fill="#eef1f6"/><rect x="19" y="3" width="1" height="1" fill="#4ee08a"/><rect x="8" y="4" width="14" height="1" fill="#4ee08a"/><rect x="6" y="5" width="19" height="1" fill="#4ee08a"/><rect x="3" y="6" width="1" height="1" fill="#ff6b6b"/><rect x="4" y="6" width="25" height="1" fill="#4ee08a"/><rect x="29" y="6" width="1" height="1" fill="#fff3b0"/><rect x="3" y="7" width="1" height="2" fill="#ff6b6b"/><rect x="4" y="7" width="14" height="2" fill="#4ee08a"/><rect x="18" y="7" width="1" height="2" fill="#2c8f5c"/><rect x="19" y="7" width="10" height="2" fill="#4ee08a"/><rect x="29" y="7" width="1" height="2" fill="#fff3b0"/><rect x="4" y="9" width="25" height="1" fill="#4ee08a"/><rect x="4" y="10" width="25" height="2" fill="#2c8f5c"/><rect x="5" y="12" width="7" height="1" fill="#4a5164"/><rect x="21" y="12" width="7" height="1" fill="#4a5164"/><rect x="5" y="13" width="1" height="2" fill="#4a5164"/><rect x="7" y="13" width="3" height="2" fill="#9aa4b6"/><rect x="11" y="13" width="1" height="2" fill="#4a5164"/><rect x="21" y="13" width="1" height="2" fill="#4a5164"/><rect x="23" y="13" width="3" height="2" fill="#9aa4b6"/><rect x="27" y="13" width="1" height="2" fill="#4a5164"/><rect x="5" y="15" width="7" height="1" fill="#4a5164"/><rect x="21" y="15" width="7" height="1" fill="#4a5164"/><rect x="49" y="1" width="8" height="1" fill="#b9d6ff"/><rect x="48" y="2" width="1" height="1" fill="#5aa2ff"/><rect x="49" y="2" width="3" height="1" fill="#eef1f6"/><rect x="52" y="2" width="1" height="1" fill="#5aa2ff"/><rect x="53" y="2" width="4" height="1" fill="#8fb8cc"/><rect x="57" y="2" width="1" height="1" fill="#5aa2ff"/><rect x="48" y="3" width="1" height="1" fill="#5aa2ff"/><rect x="49" y="3" width="1" height="1" fill="#eef1f6"/><rect x="50" y="3" width="1" height="1" fill="#ffffff"/><rect x="51" y="3" width="1" height="1" fill="#eef1f6"/><rect x="52" y="3" width="1" height="1" fill="#5aa2ff"/><rect x="53" y="3" width="4" height="1" fill="#8fb8cc"/><rect x="57" y="3" width="1" height="1" fill="#5aa2ff"/><rect x="46" y="4" width="14" height="1" fill="#5aa2ff"/><rect x="43" y="5" width="19" height="1" fill="#5aa2ff"/><rect x="38" y="6" width="1" height="1" fill="#fff3b0"/><rect x="39" y="6" width="25" height="1" fill="#5aa2ff"/><rect x="64" y="6" width="1" height="1" fill="#ff6b6b"/><rect x="38" y="7" width="1" height="2" fill="#fff3b0"/><rect x="39" y="7" width="10" height="2" fill="#5aa2ff"/><rect x="49" y="7" width="1" height="2" fill="#3a6fc4"/><rect x="50" y="7" width="14" height="2" fill="#5aa2ff"/><rect x="64" y="7" width="1" height="2" fill="#ff6b6b"/><rect x="39" y="9" width="25" height="1" fill="#5aa2ff"/><rect x="39" y="10" width="25" height="2" fill="#3a6fc4"/><rect x="40" y="12" width="7" height="1" fill="#4a5164"/><rect x="56" y="12" width="7" height="1" fill="#4a5164"/><rect x="40" y="13" width="1" height="2" fill="#4a5164"/><rect x="42" y="13" width="3" height="2" fill="#9aa4b6"/><rect x="46" y="13" width="1" height="2" fill="#4a5164"/><rect x="56" y="13" width="1" height="2" fill="#4a5164"/><rect x="58" y="13" width="3" height="2" fill="#9aa4b6"/><rect x="62" y="13" width="1" height="2" fill="#4a5164"/><rect x="40" y="15" width="7" height="1" fill="#4a5164"/><rect x="56" y="15" width="7" height="1" fill="#4a5164"/><rect x="34" y="5" width="2" height="1" fill="#eef1f6"/><rect x="33" y="6" width="2" height="1" fill="#eef1f6"/><rect x="32" y="7" width="4" height="1" fill="#eef1f6"/><rect x="34" y="8" width="2" height="1" fill="#eef1f6"/><rect x="33" y="9" width="2" height="1" fill="#eef1f6"/><rect x="32" y="10" width="2" height="1" fill="#eef1f6"/></svg></span>
      <span class="brand-name">EV Compare</span>
    </button>
    <div class="topbar-search">
      <input type="search" id="searchInput" placeholder="Search make or model…" autocomplete="off" />
    </div>
    <div class="topbar-actions">
      <span id="resultCount" class="result-count">0 vehicles</span>
      <button id="filtersToggleBtn" class="btn btn-ghost filters-toggle-btn" aria-expanded="false" aria-controls="sidebar">Filters</button>
      <button id="resetFiltersBtn" class="btn btn-ghost">Reset filters</button>
      <button id="themeToggleBtn" class="theme-toggle-btn" aria-label="Toggle color theme"></button>
    </div>
  </header>

  <div id="sidebarBackdrop" class="sidebar-backdrop" hidden></div>

  <div class="layout">
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-header">
        <h2>Filters</h2>
        <button id="sidebarCloseBtn" class="sidebar-close" aria-label="Close filters">&times;</button>
      </div>
      <div id="filterGroups" class="filter-groups"><!-- generated --></div>
    </aside>

    <main class="content">
      <div id="viewResults" class="view">
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
        </div>
        <div id="cardGrid" class="card-grid"></div>
      </div>

      <div id="viewCompare" class="view" hidden>
        <div class="compare-header">
          <button id="backToResultsBtn" class="btn btn-ghost">&larr; Back to results</button>
          <h2>Comparing <span id="compareCount">0</span> vehicles</h2>
          <div class="compare-scroll-nav" id="compareScrollNav" hidden>
            <button id="compareScrollLeftBtn" class="compare-scroll-nav-btn" aria-label="Scroll left">&lsaquo;</button>
            <button id="compareScrollRightBtn" class="compare-scroll-nav-btn" aria-label="Scroll right">&rsaquo;</button>
          </div>
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

<script type="module" src="/js/app.js?v=31"></script>
</body>
</html>
`;
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

// Injects the homepage's JSON-LD into the source index.html right before </head> rather than
// copying it byte-for-byte — the only place this build step adds content to a file that isn't
// wholly generated from scratch, so keep this to a single, easy-to-audit string replace.
function buildHomepage() {
  const src = readFileSync(path.join(ROOT, "index.html"), "utf8");
  if (!src.includes("</head>")) throw new Error("index.html has no </head> to inject JSON-LD before");
  return src.replace("</head>", `${homepageJsonLd()}\n</head>`);
}

// ---------- sitemap / robots ----------

function buildSitemap(urls) {
  const entries = urls.map(u => `  <url><loc>${esc(u)}</loc></url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
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

  const urls = [`${SITE_BASE_URL}${BASE_PATH}/`];
  let count = 0;
  for (const car of cars) {
    const rel = relFilePath(car);
    const outDir = path.join(DIST, rel);
    mkdirSync(outDir, { recursive: true });
    writeFileSync(path.join(outDir, "index.html"), pageFor(car));
    urls.push(canonicalUrl(car));
    count++;
  }

  writeFileSync(path.join(DIST, "sitemap.xml"), buildSitemap(urls));
  writeFileSync(path.join(DIST, "robots.txt"), buildRobots());

  console.log(`Prerendered ${count} car pages + sitemap.xml/robots.txt into dist/`);
}

main();
