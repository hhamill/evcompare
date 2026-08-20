# EV Compare

A filter-and-compare tool for electric vehicles. Pick the specs you care about — range, charge port, third-row seating, sliding doors, self-driving, whatever — narrow down the field, and see matching EVs side by side.

It's a static single-page app: plain HTML/CSS/vanilla JS, no framework, no build step, no backend. The whole thing is a folder of files you can open with any static file server, and it's ready to drop straight onto GitHub Pages.

## Features

- **Filter by anything** — price, EPA range, battery size, charge port type, drivetrain, doors, seating layout, cargo volume, and two dozen more specs, via checkboxes, toggles, and dual-range sliders
- **Compare view** — narrow your filters to 5 or fewer matches and the app automatically shows a full side-by-side spec table; with more matches, star up to 6 cars to compare from a browsable card grid
- **Detail view** — click into any vehicle for every spec plus links back to the manufacturer page, a review, and its EPA listing
- **Real data, with sources** — every entry links back to where its numbers came from, so you can verify anything before trusting it
- Light/dark theme aware, responsive down to mobile

## Quick start

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`. (Needs to be served over HTTP, not opened as a `file://` URL, since the app fetches `data/evs.json`.)

To deploy, push the repo to GitHub and enable **Pages** on it — no build step, no config.

## The dataset

`data/evs.json` currently has **128 trims across 72 models** from 28 automakers — everything from Tesla, Ford, and Chevrolet to BMW, Mercedes-Benz, Audi, Porsche, Genesis, Volvo, Polestar, Lucid, and more, including a few 2027 models (BMW iX3, Lexus ES, Rivian R2, the Chevy Bolt relaunch, Volvo EX60) that are pre-order/imminent rather than already in dealers — see each entry's `onSaleDate`. Specs were gathered from manufacturer spec sheets, EPA/fueleconomy.gov listings, and outlets like Edmunds and Car and Driver. See `TODO.md` for what's still deliberately excluded (a few ultra-low-volume exotics, a couple of not-yet-on-sale models) and known gaps.

Fields that couldn't be confirmed from a real source are left `null` rather than guessed, and many entries carry a `notes` field flagging estimates or discrepancies between sources (e.g. Tesla doesn't publish official battery capacity, so those figures are third-party estimates). Treat this as a snapshot and a starting point, not a live feed — specs, trims, and prices change.

To add more vehicles, follow the shape documented in `data/SCHEMA.md` and append entries to `data/evs.json`.

## How it's built

- `index.html` / `css/styles.css` — page shell and design system
- `js/fields.js` — the single source of truth for every spec field (label, category, type, how to read it off a vehicle). The filter sidebar, card stats, and compare table are all generated from this list, so adding a field here makes it show up everywhere automatically
- `js/filters.js` — computes filter ranges from the dataset, renders the sidebar, applies the active filters
- `js/render.js` — renders the card grid, compare table, and detail modal
- `js/app.js` — app state and event wiring
- `data/evs.json` — the vehicle dataset
- `data/SCHEMA.md` — the JSON shape for one trim entry, and the sourcing rules used to fill it in
