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
3. **Back navigation not returning to home** — root cause: every "similar vehicle" click was a `pushState`, so hopping through several related cars built a deep history stack — "back" walked you through every car you'd glanced at, not straight back to where you started. Fixed by giving `openDetail` three history modes: `push` (a genuine new navigation, e.g. from the results grid), `replace` (hopping between similar-car suggestions — swaps what you're looking at without growing the stack), and `none` (reflecting a popstate/deep-link that already happened). Closing the modal now also replaces rather than pushes, so it doesn't leave a dead entry either. One back-press from any depth of similar-car browsing now returns directly home.
4. **Unreadable blue links** — the compare table's "Review"/"Specs" links in the Links row were never actually styled, so they rendered in the browser's default link blue (built for white backgrounds) against our dark theme. Styled them with `--accent-2` to match the rest of the app.
5. **No way to open full detail from the compare view** — added a "View details" button to each column header in the compare table (both the auto-compare-at-≤5-results view and the manual multi-select compare view), wired to the same detail modal as the card grid.

All verified against the real `/evcompare/` subpath locally, both desktop and mobile.
