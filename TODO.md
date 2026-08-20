# TODO: Data coverage

`data/evs.json` now covers **28 makes / 72 models / 128 trims** — up from 9 makes / 16 models / 30 trims. Every make identified in the original survey below (German luxury, other premium/EV-native, mainstream, trucks, and the 2027-ready batch) has been researched and merged in, each trim sourced from manufacturer spec pages + fueleconomy.gov + a review link, following `data/SCHEMA.md`.

## What's in now

- **German luxury**: BMW (i4, i5, i7, iX, iX3), Mercedes-Benz (EQB, EQE sedan/SUV, EQS sedan/SUV), Audi (Q4/Q6/SQ6/Q8 e-tron, e-tron GT), Porsche (Taycan, Macan Electric)
- **Other premium/EV-native**: MINI (Countryman Electric only — see note below), Genesis (GV60, Electrified GV70/G80), Volvo (EX30, EX60, EX90, EC40), Polestar (2, 3, 4), Lucid (Air, Gravity), Lexus (RZ, ES)
- **Mainstream**: Nissan (Ariya, Leaf), Toyota (bZ4X), Subaru (Solterra), Fiat (500e), Acura (ZDX), VinFast (VF8, VF9)
- **Trucks**: Ford F-150 Lightning, Chevrolet Silverado EV, GMC Hummer EV Pickup, GMC Sierra EV, Tesla Cybertruck
- **More trims of makes already covered**: Kia Niro EV, Hyundai Kona Electric + Ioniq 9, Cadillac Optiq + Vistiq + Escalade IQ, Jeep Wagoneer S + Recon
- **2027 models with real published specs**: BMW iX3, Lexus ES 350e/500e, Rivian R2, Chevrolet Bolt relaunch, Volvo EX60, Dodge Charger Daytona

## Known gaps / judgment calls from this pass

- **MINI Cooper SE Hardtop is NOT in the dataset** — it's not actually sold in the US (China-built, currently tariff-blocked; MINI has deferred the US launch indefinitely). Only Countryman Electric made it in.
- **Ram 1500 REV was skipped** — confirmed cancelled; Stellantis reused the name for a gas range-extender instead, not a BEV.
- **Tesla Model S** is still missing (we have 3/X/Y/Cybertruck) — worth a quick follow-up batch.
- **Hyundai Ioniq 5 N** and **Cadillac Celestiq** were deliberately skipped as niche/halo trims — could add if there's interest.
- **GM Super Cruise** is normalized to `selfDriving.available: false` across every Cadillac/Chevrolet/GMC entry (treated as adaptive-cruise-tier driver-assist, not self-driving) — a few early entries briefly drifted from this and were corrected for consistency.

## Still explicitly deferred (low priority / low-volume)

- Rolls-Royce Spectre, Maserati Grecale Folgore/GranTurismo Folgore, Lotus Eletre/Emeya, Land Rover Range Rover Electric, Faraday Future FF91 — ultra-low-volume exotics, low practical value for a shopping-comparison tool. Add on request.

## Not yet on sale (watch, don't add yet)

- **Kia EV4** — full specs exist but US launch delayed indefinitely (tariffs/demand), no confirmed on-sale date.
- **Scout Traveler / Terra** — specs still "estimated," not final; production doesn't start until end of 2027 as **2028** models.
- **Slate Truck** — timing TBD, no confirmed specs yet.

## Next step (data)

Nothing urgent queued. If new 2027 models get real published specs (the way BMW iX3/Lexus ES/Rivian R2/Chevy Bolt/Volvo EX60 did), add them the same way. Otherwise, revisit when Kia EV4 or Scout actually get a confirmed on-sale date.

---

# TODO: Product features

Requested 2026-08-19. Doing these **sequentially, not in parallel** (parallel research agents burned through the session limit last time) — one at a time, in this order:

## 1. Mobile layout redesign — DONE

Desktop had two real mobile problems: the filter sidebar stacked full-width *above* results (long scroll before seeing any car), and the compare table's sticky label column was sized by content (`table-layout: auto` lets the widest label like "Collision Avoidance Auto-Brake" override any `min-width`), squeezing car data almost off-screen.

Fixed: filter sidebar is now an off-canvas drawer on mobile (`<880px`) — a "Filters" button in the topbar (shows active count, e.g. "Filters (3)") opens it, closeable via X/backdrop-tap/Escape/re-toggle, body scroll locked while open. Compare table switches to `table-layout: fixed` with explicit column widths on mobile so both the label column and car columns actually stay their intended size. Desktop (`>880px`) markup/behavior untouched — verified side by side. Also fixed a pre-existing unrelated bug found along the way: the search box wasn't wrapping to its own row on mobile because `flex-basis: 0%` let it shrink to ~38px instead of triggering `flex-wrap`.

## 2. Similar-cars section on the detail view — DONE

Added `js/similar.js`: ranks other cars against the one you're viewing (excludes other trims of the same model — the point is cross-shopping alternatives, not sibling trims), gated first to within ~10% price (widens to 25% if that leaves fewer than 4 matches, and falls back to ranking everything if a car has no MSRP at all), then scored by body style / three-row / drivetrain / EPA range / passenger count closeness. Top 4 shown as tiles below the main spec detail in `renderDetailModal`, each with: price + price delta ("+$1,300 vs. this car"), range delta, and up to 4 boolean feature diffs framed as gained (green "+ Heat Pump") / lost (muted "− Sliding Doors"). Clicking a tile swaps the modal to that car and re-runs the similarity search from its perspective, so you can browse a chain of alternatives without closing the modal. Verified on desktop and mobile.

## 3. Real URLs per car (+ maybe JSON-LD) — DONE (client-side routing)

Asked: is this possible without pivoting to SSR (Next.js etc.)? Short answer: partially, with a real tradeoff to decide.

- **Client-side path routing** (History API, URLs like `/2026/mach-e/gt`, using the "404.html → index.html" trick GitHub Pages needs for SPA deep-links): fully achievable within the current static/no-build architecture. Gets you shareable/bookmarkable links, working back/forward, and a specific car loading directly from a URL. This is the recommended default — small, contained, no new infra.
- **What it does NOT get you**: real SEO or link-preview cards (Slack/Twitter/Discord unfurls, search engine indexing). Those need the *server* to return car-specific HTML/JSON-LD/OpenGraph tags for that exact URL. A pure client-side SPA can't do that — the bytes served are the same generic `index.html` regardless of path; JSON-LD injected by JS after the fact is invisible to anything that doesn't execute JavaScript.
- **If real crawlability/link-previews matter**: don't need a full Next.js pivot — a lightweight prerender script (reads `evs.json`, writes one static HTML file per car with baked-in JSON-LD/OpenGraph, e.g. via a GitHub Action whenever data changes) bolts on top of the existing site without changing how it's built or hosted day-to-day. This is a bigger, separate piece of work — flagged here but not started until it's confirmed as wanted.

**Decision (2026-08-19)**: start with client-side routing only. Revisit static prerendering (real per-car HTML + JSON-LD, needed for AI crawlers like GPTBot/ClaudeBot/PerplexityBot to see anything — they don't execute JS at all, unlike Googlebot which eventually does) once hosting needs are clearer.

**Built**: `js/router.js` maps `/{modelYear}/{model-slug}/{trim-slug}` (e.g. `/2026/mustang-mach-e/gt-awd`) to a car via a precomputed path index. Clicking a car / a similar-car tile pushes a new history entry; closing the modal pushes back to `/`; browser back/forward is handled via `popstate` (no page reload either way). Direct-load and shared-link support needs GitHub Pages' `404.html` trick since there's no server to do real rewrites — added `404.html` (redirects unmatched paths to `index.html?p=/real/path`) and a restoration snippet in `index.html`'s `<head>` that puts the real path back via `history.replaceState` before the app runs.

Hit and fixed one real bug along the way: that `replaceState` call shifts the document's effective base URL *before* the browser parses the CSS/JS `<link>`/`<script>` tags below it, so every relative resource request would 404 (e.g. `css/styles.css` resolving against `/2026/mustang-mach-e/` instead of `/`). Fixed with `<base href>` in `<head>`, which pins relative-URL resolution regardless of what the path becomes.

**Deployment (confirmed 2026-08-19)**: this is live at `hhamill.github.io/evcompare/` — a GitHub Pages *project* page, not root. Set all three deployment-path constants accordingly: `<base href="/evcompare/">` in `index.html`, `BASE_PATH = "/evcompare"` in `js/router.js`, `pathSegmentsToKeep = 1` in `404.html`. Verified end to end against a local server mirroring the `/evcompare/` subpath: home load, clicking into a car, the 404→index.html deep-link restore, and browser back/forward all resolve assets and routes correctly with no 404s.

No filter/search state is reflected in the URL — only the car-detail view. Kept in scope on purpose; broadening it is a separate, larger piece of work if wanted later.

---

# TODO: Post-review polish (2026-08-20)

Five cosmetic/UX fixes from testing the deployed `hhamill.github.io/evcompare/` site — all done:

1. **Spacing** — "Add to compare" button sat right on top of the "Similar Vehicles" heading in the detail view. Added `margin-bottom` to `.modal-actions`.
2. **Mobile search-box zoom** — iOS Safari auto-zooms the page when focusing an input with `font-size` under 16px. The search box and the "Filter make…" box were both at 14px on mobile; bumped to 16px there.
3. **Back navigation not returning to home** — initial diagnosis (every similar-car click doing `pushState`, building a deep stack) turned out to be a red herring; the real fix needed was elsewhere (likely the `homePath()` trailing-slash mismatch fixed alongside this). First attempt made similar-car clicks `replaceState` instead of `pushState` so back would skip straight home from any depth — **overcorrected**: this broke the breadcrumb trail (car3→car2→car1→home) that was explicitly called out as already working well. Reverted: similar-car clicks are back to `pushState`, so back walks one car at a time same as any other trail. `historyMode` on `openDetail` is now just `push` (default — genuine new navigation from the grid/compare view *or* a similar-car hop) vs. `none` (reflecting a popstate/deep-link that already happened). Closing the modal still uses `replaceState` (unrelated to this bug — just avoids leaving a dead "closed" entry behind). Verified: a 3-deep similar-car chain now takes exactly 3 back-presses to reach home, landing on car2 then car1 in between, not skipping straight there.
4. **Unreadable blue links** — the compare table's "Review"/"Specs" links in the Links row were never actually styled, so they rendered in the browser's default link blue (built for white backgrounds) against our dark theme. Styled them with `--accent-2` to match the rest of the app.
5. **No way to open full detail from the compare view** — added a "View details" button to each column header in the compare table (both the auto-compare-at-≤5-results view and the manual multi-select compare view), wired to the same detail modal as the card grid.

All verified against the real `/evcompare/` subpath locally, both desktop and mobile.

---

# TODO: Filter slider precision (2026-08-20)

Sliders were letting continuous physical measurements drift to arbitrary decimals while dragging (step was auto-computed purely from `(max-min)/100`), and count-like fields (passengers, cupholders, USB ports, subscription cost) could land on fractional values that don't mean anything. Fixed:

- `js/fields.js`: range fields now declare an explicit `step` — `0.1` for continuous specs (Level 2 AC charging, 0–60, ground clearance, all three cargo volumes) and `1` for counts (max passengers, cupholders, USB ports, self-driving subscription). Each `format` rounds to that same precision via a shared `roundTo` helper, so raw data display (cards, compare table, modal) and slider-derived display always match.
- `js/filters.js`: the slider's HTML `step` attribute now honors `field.step` when set, instead of only the old auto-computed value.
- Found a second issue while testing: the slider's `min`/`max` bounds come straight from raw data, and real data isn't always aligned to the target precision (ground clearance `4.48`, a subscription at `$49.99`) — so even with the right `step`, dragging would start from that odd fraction and every subsequent stop would drift by the same offset (`49.99, 50.99, 51.99, ...`). Fixed by floor/ceil-ing the domain bounds to the field's step grid in `computeDomains`. Also had to guard that against a classic float bug — `6.6 / 0.1` is `65.99999999999999` in JS, not `66`, which would floor an already-clean value down to the previous step — with a `1e-9` epsilon nudge before flooring/ceiling.

Verified: sliders for the affected fields only stop on clean values, and detail/compare/card display for all of them (e.g. Mustang Mach-E GT: `10.5 kW`, `5.6s`, `5.7 in`, `4.8 cf`, `$50/mo` from a raw `$49.99`) is clean with no stray decimals.

---

# TODO: Dual-range slider stuck-thumb bug (2026-08-20)

Reported: dragging a slider's low and high handles to the same value at the *top* of the range (e.g. Max Passengers to 7–7) made it impossible to drag the low handle back down — every attempt just re-grabbed the high handle instead, which is clamped to never go below the low one, so it looked frozen. Same setup at the *bottom* of the range worked fine.

Root cause: the two handles are separate overlapping `<input type=range>` elements (`.range-min` / `.range-max`), stacked absolutely on top of each other. With equal DOM stacking (no `z-index` set), the later element in the markup (`.range-max`) always wins hit-testing when both thumbs sit at the same track position — regardless of which one the values would suggest you're reaching for. That's why the bottom end (where `.range-max` being on top is what you want, to drag it up) worked, and the top end (where you'd need `.range-min` on top, to drag it down) didn't.

Fixed in `js/filters.js`'s `updateVisual()`: whichever thumb's value is in the upper half of the field's domain now gets `z-index: 3` (the other drops to `1`), recomputed on every drag. This only matters when the thumbs are close enough to visually overlap — for normal, well-separated positions it's a no-op.

Verified both directions on Max Passengers: dragged 7–7 down to 4–7 (previously stuck), and 4–4 up to 4–7 (already worked, confirmed still does).

---

# TODO: Modal scrollbar poking past rounded corner (2026-08-20)

Reported: the detail popover's scrollbar extended straight past the top-right rounded corner instead of curving with it. `.modal` had `overflow-y: auto` and `border-radius` on the same element — clipping content to a rounded corner is one thing, but the actual scrollbar track some browsers draw isn't guaranteed to respect that curvature, so it can poke out past it.

Fixed by moving the scroll to an inner element: `.modal` is now `overflow: hidden` (clips everything, including whatever the browser draws for a child's scrollbar, to the rounded corner — this part is reliable) and a flex column; `.modal-body` (the actual content) got `overflow-y: auto` + the padding that used to live on `.modal` + `min-height: 0` (the standard fix so a flex child scrolls instead of just stretching its parent). `#modalCloseBtn` stays a sibling of `.modal-body`, so it's unaffected by the inner scroll and stays fixed in the corner while content scrolls underneath it, same as before.

`js/app.js` had a `el.modal` reference (`document.querySelector("#detailModal .modal")`) used only to reset scroll position when switching between similar-car suggestions — since `#modalBody` (already referenced separately as `el.modalBody`) *is* the `.modal-body` element, that was a redundant duplicate reference pointing at the wrong element post-fix; removed it and pointed the scroll-reset at `el.modalBody` directly.

Verified on desktop and mobile: corners stay clean while scrolled, close button stays fixed in place during scroll.

---

# TODO: Theme toggle, Similar Vehicles distinction, compare-grid winners (2026-08-20)

Three requests, all done:

## 1. Manual theme toggle (was: system-preference only)

Site only ever followed `prefers-color-scheme`, no way to force a look regardless of system setting for checking both. Added a compact icon-only button in the topbar (fits inline next to Filters/Reset filters on both desktop and mobile — no wrapping issues, confirmed at 375px) that cycles **Auto → Light → Dark → Auto**, persisted in `localStorage`. Icon reflects current mode: 🌓 auto, ☀️ light, 🌙 dark.

Restructured the CSS tokens in `css/styles.css` to make this possible: base `:root` stays the dark palette (unchanged), the light-token block gained a `:not([data-theme])` guard so it only applies in "auto" mode, and two new unconditional blocks — `:root[data-theme="light"]` and `:root[data-theme="dark"]` — let an explicit choice win regardless of what the system prefers. `js/app.js` applies the stored preference (`removeAttribute`/`setAttribute("data-theme", …)` on `<html>`) as the very first thing the script does, before the data fetch even starts, so there's no flash of the wrong theme on load. Verified: cycles correctly, persists across reload, fits on mobile.

## 2. Similar Vehicles section blended into the spec detail above it

Gave `.similar-section` (the wrapping div around the "Similar Vehicles" tiles in the detail modal) a distinct treatment: bleeds to the modal's edges via negative margin (so it reads as a footer band, not just another spec section), a slightly lighter background (`--bg-card` vs the modal's `--bg-elevated`), a top border to separate it from the content above, and the heading recolored to the accent green instead of the neutral gray every other section heading uses.

## 3. Compare grid only highlighted boolean winners, not numeric ones

Added `compareBetter: "higher" | "lower"` to `js/fields.js` for fields with real consensus on which direction is better: price (lower), EPA range, max DC charging, Level 2 charging, USB ports, horsepower (all higher), 0-60 and self-driving subscription cost (lower). Deliberately left neutral — no highlighting — fields that are genuinely tradeoffs rather than a clear win: doors, wheel size, cargo volume, ground clearance, tow capacity, max passengers, cupholders, battery capacity. `renderCompareTable` in `js/render.js` computes the best value per row (only when 2+ cars have real numeric data for that field — a lone value or all-empty row doesn't get highlighted) and marks matching cell(s) with `.cell-winner`; ties are handled correctly (all tied cars get highlighted, not an arbitrary one).

Price needed a different treatment than the rest: `.compare-col-price` is *already* always rendered in accent green (matches the card grid), so marking the cheapest one "winner" the same way would have been invisible. Inverted it instead — the non-cheapest price(s) get dimmed to `--text-dim` via `.compare-col-price-not-cheapest`, so the cheapest one stands out by contrast against the others rather than by a highlight that was already the default.

Verified on a Mustang Mach-E Select vs. GT comparison: range/charging/horsepower/0-60 correctly favor the GT, Level 2 charging correctly ties (both highlighted, same value), price correctly favors the cheaper Select trim.

---

# TODO: Sticky compare-table headers (2026-08-20)

Asked: pin the column headers (car names) when scrolling down a long comparison, since past a certain point you lose track of which column is which. Also floated, more tentatively: compact the sticky header on mobile (drop price/button/icon, keep just the name) once scrolled past the top, leaving desktop's header full always.

**Root cause the header wasn't already sticky** (the CSS had `position: sticky; top: 60px` on it — looked right, didn't work): `.compare-scroll` has `overflow-x: auto` for the horizontal-scrolling-with-pinned-label-column behavior. Per the CSS overflow spec, giving an element overflow-x anything other than `visible` forces `overflow-y`'s *used* value to `auto` too, even though we never set it. That invisible auto-generated vertical scrollbox has no bounded height, so it never actually scrolls internally — and since `position: sticky` pins relative to the nearest *scrolling* ancestor, the header was quietly trying to stick to a scroll context that never scrolls, rather than the page. This is a known, easy-to-miss CSS gotcha, not something introduced by an earlier change.

**Fix**: embrace the forced behavior instead of fighting it. `.compare-scroll` now has an explicit `overflow-y: auto` and a bounded `max-height` (`calc(100vh - 190px)` desktop, `calc(100vh - 260px)` mobile — mobile's topbar wraps to two rows so there's less room above the table). The compare table now scrolls in its own contained viewport, like a spreadsheet, and `position: sticky; top: 0` on the header pins correctly to *that* — no more hardcoded, fragile "guess the topbar's pixel height" offset needed. Verified both sticky axes work together: scrolled a 4-car comparison diagonally (down *and* right) and both the header row (top) and row-label column (left) stayed correctly pinned at the same time.

**Mobile compaction**: implemented, but simplified from what was floated — rather than a scroll-triggered transition from full to compact header (which needs JS scroll-position tracking and two header representations), the mobile sticky header is just always compact: wrapped the body-style icon in its own `<span>` so CSS could target it independently, then hide `.compare-col-icon`, `.compare-col-trim`, `.compare-col-price`, and `.compare-col-view-btn` under the existing `880px` media query, leaving just the car name. Desktop is untouched — full header (icon, trim, price, View details button), always, exactly as requested. Worth revisiting with the fancier scroll-triggered version later if the always-compact tradeoff feels wrong in practice.

---

# TODO: Follow-ups on sticky compare table (2026-08-20)

Three more, after trying the sticky-header version live:

## 1. Mobile compact header dropped too much — restored trim + View details

Testing surfaced that the always-compact mobile header (name only) lost two things that turned out to matter: **trim** (often the only thing telling two rows of the same model apart — e.g. two Mach-E trims look identical as just "Ford Mustang Mach-E") and the **View details button** (no way to reach full detail once scrolled, without scrolling back to the top). Kept the compaction, narrowed its scope: mobile now hides only the icon (decorative) and price (already seen before scrolling); trim and the View details button (shrunk slightly — smaller padding/font) stay in the sticky header.

## 2. Click a row's spec label to jump straight to the winning cell

Added: clicking/tapping a row label (e.g. "Tow Capacity") scrolls that row's winning cell into view, centered — the exact "which one wins, without swiping through every column" shortcut asked for, useful on both a wide desktop comparison and a many-cars mobile swipe. Extended to boolean rows too (jumps to a "Yes" when the cars are split), not just the numeric `compareBetter` rows — same underlying "is there a real winner to point at" logic, so it felt natural to cover both. A row is only clickable when there's an actual difference between the cars (all-same or fully-empty rows have nothing to jump to, so no cursor/hover affordance on those).

Also reclassified **Tow Capacity** from neutral to `compareBetter: "higher"` in `js/fields.js` — it was used as the worked example for this feature, which only makes sense if it has a winner; the earlier "genuinely a tradeoff" reasoning didn't hold up against that.

Hit a real bug building this: `scrollIntoView({behavior: "smooth", ...})` silently did nothing when called from the row-label click handler — confirmed by testing the identical call directly at the console (worked) vs. through the actual click path (didn't), and separately confirmed `behavior: "auto"` works fine through that same click path. Root cause looks like smooth-scrolling not animating reliably through a container that's itself nested inside another sticky-positioned scroll context (the compare table's own header/label-column stickiness) — a real, reproducible browser quirk, not a logic bug. Switched to `behavior: "auto"` (instant, no animation) since a reliable instant jump beats a broken animation.

## 3. Desktop: horizontal scrollbar hard to reach on a tall table

However precisely `.compare-scroll`'s `max-height` is tuned, a scrollbar living at the bottom edge of a tall, capped-height box is an easy target to lose track of. Rather than chase the exact pixel offset, sidestepped the problem: added `‹`/`›` buttons next to the "Comparing N vehicles" heading — which is never capped or internally scrolled, so they're always reachable regardless of table height. They only appear when the table actually overflows horizontally, disable themselves at whichever end you've scrolled to (updates live as you scroll by any method — buttons, trackpad, or the native scrollbar), and scroll by a fixed 280px per click. Desktop-only (`min-width: 881px`) — mobile scrolls the table by touch directly, so there's no equivalent "can't find the scrollbar" problem to solve there.
