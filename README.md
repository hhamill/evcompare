# EV Compare

A filter-and-compare tool for electric vehicles, live at **[evcompare.org](https://evcompare.org)**. Pick the specs you care about — range, charge port, third-row seating, sliding doors, hands-free driving, whatever — narrow down the field, and see matching EVs side by side.

The app itself is a static single-page app: plain HTML/CSS/vanilla JS, no framework, no runtime dependencies. A small dependency-free Node build step layered on top prerenders real per-car HTML pages (with meta tags and schema.org JSON-LD) for crawlers/AI agents, since the SPA alone can't be seen by anything that doesn't execute JavaScript. Deployed via GitHub Actions.

## Features

- **Filter by anything** — price, EPA range, battery size, charge port type, drivetrain, doors, seating layout, cargo volume, hands-free driving availability, and two dozen more specs, via checkboxes, toggles, and dual-range sliders
- **Compare view** — star up to 6 cars from the browsable card grid, then see them side by side in a full spec table
- **Similar Vehicles** — every detail view suggests close cross-shop alternatives (price/range/spec-scored), with a one-click "Compare all"
- **Detail view** — click into any vehicle for every spec plus links back to the manufacturer page, a review, and its EPA listing
- **Real data, with sources** — every entry links back to where its numbers came from, so you can verify anything before trusting it
- **Shareable URLs** — every car has a real, bookmarkable `/{year}/{model}/{trim}` address
- Manual light/dark/auto theme toggle, responsive down to mobile

## Quick start

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`. (Needs to be served over HTTP, not opened as a `file://` URL, since the app fetches `data/evs.json`.)

That's it for local development — the app itself needs no build step. To also preview the prerendered/crawler-facing output (real per-car HTML, JSON-LD, sitemap):

```bash
npm run prerender   # writes dist/, gitignored
python3 -m http.server 8080 --directory dist
```

**Deployment** is automatic: pushing to `main` triggers `.github/workflows/deploy.yml`, which runs the prerender step and publishes `dist/` to GitHub Pages at the custom domain (DNS/CNAME already configured — no manual steps).

## The dataset

`data/evs.json` currently has **149 trims across 83 models** from 29 automakers — everything from Tesla, Ford, and Chevrolet to BMW, Mercedes-Benz, Audi, Porsche, Genesis, Volvo, Polestar, Lucid, and more, including a few not-yet-shipping models (Rivian R2, the Chevy Bolt relaunch, Volvo EX60, BMW iX3, Lexus ES) that are pre-order/imminent rather than already in dealers — see each entry's `onSaleDate`. Specs were gathered from manufacturer spec sheets, EPA/fueleconomy.gov listings, and outlets like Edmunds and Car and Driver.

Fields that couldn't be confirmed from a real source are left `null` rather than guessed; `"N/A"` and `"Pending"` are used for the two other cases (concept doesn't apply to this vehicle; known to be coming but not yet published) — see `data/SCHEMA.md` for the full convention. Each entry's `notes` field calls out anything a shopper would actually want to know (equipment availability, discontinued trims, spec caveats) — kept deliberately free of research-process commentary. `lastVerifiedDate` tracks when that entry's specs were last confirmed against a real source; it's internal provenance, not shown in the app. Treat the dataset as a snapshot and a starting point, not a live feed — specs, trims, and prices change. See `TODO.md` for what's still deliberately excluded and known gaps.

To add more vehicles, follow the shape documented in `data/SCHEMA.md` and append entries to the `models` array in `data/evs.json`, then run `npm run sync-urls`. That fills in each new entry's `url` (the canonical page for that car, derived from its slug — don't hand-write it) and refreshes the file's wrapper: content hash, licence, terms and the disclaimer, all from `scripts/dataset-meta.mjs`. The prerender step warns if you forget; the deployed dataset regenerates both regardless, so only the GitHub copy of the file is affected.

`evs.json`'s top level is a small wrapper (`hash`/`license`/`url`/`generatedAt`/`count`/`models`), not a bare array — `hash` is a content hash of `models` alone, recomputed on every build so it can never drift from what's actually deployed; a much smaller sibling file, `data/current.json`, carries just that hash so a third party checking for updates doesn't have to re-download the whole dataset. See `data/SCHEMA.md`.

## How it's built

**App**
- `index.html` / `css/styles.css` — page shell and design system
- `js/fields.js` — the single source of truth for every spec field (label, category, type, how to read it off a vehicle). The filter sidebar, card stats, and compare table are all generated from this list, so adding a field here makes it show up everywhere automatically
- `js/filters.js` — computes filter ranges from the dataset, renders the sidebar, applies the active filters
- `js/render.js` — renders the card grid, compare table, and detail modal (escapes all car data before it hits `innerHTML`, since the dataset is hand-researched rather than schema-validated)
- `js/router.js` — maps `/{year}/{model}/{trim}` URLs to a car via the History API; `404.html` handles GitHub Pages deep-link redirects for direct/shared links
- `js/similar.js` — scores and ranks cross-shop alternatives for the Similar Vehicles section
- `js/app.js` — app state and event wiring

**Data**
- `data/evs.json` — the vehicle dataset, wrapped with a content hash (see above)
- `data/SCHEMA.md` — the wrapper shape, the JSON shape for one trim entry, the three-state (`null`/`"N/A"`/`"Pending"`) convention, and the sourcing rules used to fill it in

**Build & deploy**
- `scripts/prerender.mjs` — dependency-free Node script: writes one real static HTML page per trim (meta tags, Open Graph/Twitter Card, schema.org `Car`/`BreadcrumbList` JSON-LD) plus `sitemap.xml`/`robots.txt`, into `dist/` (gitignored)
- `scripts/og-image-template.html` — standalone design tool for the pixel-art logo/OG-image/favicon assets in `assets/`; not part of the build, edits here don't auto-propagate to the shipped assets
- `.github/workflows/deploy.yml` — runs the prerender step and publishes `dist/` on every push to `main`

**Analytics**: a single GoatCounter script tag (privacy-friendly, no cookies, no PII) — see `evcompare.goatcounter.com` for the dashboard.
