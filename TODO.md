# TODO: Data coverage

`data/evs.json` now covers **29 makes / 81 models / 149 trims** — up from 9 makes / 16 models / 30 trims. Every make identified in the original survey below (German luxury, other premium/EV-native, mainstream, trucks, and the 2027-ready batch) has been researched and merged in, each trim sourced from manufacturer spec pages + fueleconomy.gov + a review link, following `data/SCHEMA.md`.

**2026-08-20**: Added the missing **Ford Mustang Mach-E Premium** trim (user noticed the dataset only had Select RWD and GT AWD). Added as `Premium AWD Extended Range` ($48,845, 300mi EPA, 91kWh, 150kW DC) — the popular loaded-but-not-GT configuration. `towCapacityLbs` and `groundClearanceIn` are `null`: the only figures found for these were from older-model-year or EU-spec (kg/liter) aggregator sites, not a reliable MY2026 US-spec primary source, so left null rather than guessed per `data/SCHEMA.md` rules.

**2026-08-20**: Ran a research batch on the 13 most under-researched entries surfaced by the missing-attributes audit (5 with no price at all, plus GMC Sierra EV Elevation and a Mercedes EQS cluster that were missing several core fields each). Closed 51 of ~76 core-field gaps across those entries:
- **Mercedes EQE/EQS SUV+Sedan cluster** (5 entries): filled in missing `msrp` (EQE SUV 500 4MATIC $89,500; EQS SUV 580 4MATIC $128,200), DC/L2 charging speeds (200kW/9.6kW, consistent across the whole EQS family), and 0-60 times. Still open: tow capacity/ground clearance on the two EQS Sedan entries — genuinely couldn't confirm a reliable US-specific figure.
- **Volvo EC40** (both trims): filled in `msrp` ($64,995 each, confirmed via CARB's driveclean.ca.gov, matching each entry's already-on-file range/MPGe exactly). Along the way, resolved real uncertainty about whether EC40 is still sold in the US at all (an earlier note said "reportedly skipped for MY2025") — it's back for MY2026 as part of a 4-model EX30/EX40/EC40/EX90 lineup. **Also surfaced a naming trap worth knowing about**: EC40 and EX40 are NOT the same car under different names — Volvo renamed C40 Recharge → EC40 (coupe-styled) and XC40 Recharge → EX40 (conventional SUV) as two distinct models. Search results kept conflating them. Our two EC40 entries are correctly the coupe-styled EC40; the EX40 is a completely different, real, on-sale Volvo EV (~$55,150 starting) that isn't in this dataset at all yet — worth adding in a future batch.
- **GMC Sierra EV Elevation (Standard Range)**: the worst-researched entry in the dataset (10 missing core fields) — now fully filled in: 120kWh battery (cross-checked against the Silverado EV WT's 119kWh), 4.5s 0-60, 18in wheels, 8,500lb tow, 8.1in ground clearance, and seat features.
- **Lexus RZ** (both trims): filled in 0-60 (7.2s/4.1s), DC fast-charge (150kW), ground clearance (7.9in), and seat features. Still open: tow capacity and max folded-cargo — a general RZ cargo figure was found but didn't line up with this entry's already-sourced rear-cargo number closely enough to trust, so left null rather than risk a mismatched figure.
- **VinFast VF8 (both trims) + VF9**: filled in DC/L2 charging speeds, wheel sizes (VF8 only), and cargo figures (rear/frunk for VF8, rear/max/frunk for VF9) that had been null since the original bulk-research pass.

Remaining gaps across these 13 entries are now down to 25, concentrated in seat-comfort booleans (heated steering wheel/rear seats, ventilated seats) and a few tow-capacity/ground-clearance figures — the same category of "genuinely hard to source per-trim" data that's a known, accepted gap throughout the rest of this dataset. Itemized below so this list is checkable without re-running the audit script:

- [ ] Mercedes-Benz EQE SUV 500 4MATIC (2025) — `seats.heatedSteeringWheel`, `seats.heatedRearSeats`
- [ ] Mercedes-Benz EQS SUV 450+ (2025) — `towCapacityLbs`
- [ ] Mercedes-Benz EQS Sedan 450+ (2025) — `towCapacityLbs`, `groundClearanceIn`
- [ ] Mercedes-Benz EQS Sedan 580 4MATIC (2025) — `towCapacityLbs`, `groundClearanceIn`
- [ ] Volvo EC40 Single Motor Extended Range RWD (2026) — `seats.ventilatedAvailable`, `seats.heatedSteeringWheel`, `seats.heatedRearSeats`
- [ ] Volvo EC40 Twin Motor AWD (2026) — `seats.ventilatedAvailable`, `seats.heatedSteeringWheel`, `seats.heatedRearSeats`
- [ ] Lexus RZ 350e FWD (2026) — `cargo.maxCubicFeet`, `towCapacityLbs`
- [ ] Lexus RZ 550e F SPORT AWD (2026) — `cargo.maxCubicFeet`, `towCapacityLbs`
- [ ] VinFast VF8 Eco AWD (2025) — `seats.ventilatedAvailable`, `seats.heatedRearSeats`
- [ ] VinFast VF8 Plus AWD (2025) — `seats.ventilatedAvailable`, `seats.heatedRearSeats`
- [ ] VinFast VF9 Plus AWD (2025) — `wheelSizesIn`, `seats.ventilatedAvailable`, `seats.heatedSteeringWheel`, `seats.heatedRearSeats`

Not planning to chase these further without a specific reason to — each was already searched for this session and came up empty on a reliable, US-specific, real source (not a vague/conflicting claim). Only fill one in if a genuinely solid source turns up; check the box and note the source when it does.

Also still open from the Volvo EC40 research above: **Volvo EX40 is a real, distinct, on-sale model (~$55,150 starting) that isn't in this dataset at all** — worth adding as its own model in a future batch (not a fix to an existing entry).

**2026-08-20**: Introduced a **three-state convention for numeric fields** — `null` (unknown/unresearched), `"N/A"` (the concept doesn't apply to this vehicle), `"Pending"` (known to be coming, just not published yet) — prompted by the user asking whether a pickup's missing cargo cubic feet (genuinely N/A) was being represented any differently from an unresearched cupholder count (genuinely unknown). It wasn't — both were plain `null` and rendered as the same "—" everywhere. Fixed:
- `js/fields.js`: added an `fmtNum(value, formatter)` helper and routed all 14 range-type fields' `format` functions through it, so `"N/A"`/`"Pending"` display as themselves instead of falling through to number formatting (which would've produced `NaN`/garbage).
- `js/render.js`: compare-table cells get distinct `cell-na`/`cell-pending` classes (`css/styles.css`: both muted like the existing "unknown" dash, `cell-pending` additionally italicized so it reads as "temporary" rather than permanent).
- `filters.js`/domain computation and `app.js`'s `sortCars` needed **no changes** — both already gated on `typeof v === "number"`, so the new sentinel strings automatically behave like `null` there (excluded from slider domains/winner-highlighting, sink to the bottom on sort) with no extra work.
- `data/SCHEMA.md`: documented the three states and when to use each.
- **Data reclassified**: all 10 pickup-truck-body entries' `cargo.rearCubicFeet`/`maxCubicFeet` → `"N/A"` (no enclosed cargo hold exists on a truck bed); 8 adjustable-air-suspension entries' (GMC Hummer EV Pickup/SUV, Lucid Gravity both trims, Rivian R1S both packs, R1T, Silverado EV RST) `groundClearanceIn` → `"N/A"` (no single figure meaningfully exists); Porsche Cayenne Electric's (both trims) `range.epaMiles` → `"Pending"` (on sale now, EPA just hasn't certified it yet — the one clear-cut case found).
- **Bonus fix found during the audit**: 8 entries (Audi Q4 e-tron Premium 45, Honda Prologue x2, Mercedes EQS Sedan 450+, Mercedes G-Class, Mercedes-Maybach EQS SUV, Subaru Uncharted x2) had `cargo.frunkCubicFeet: null` despite their own `notes` explicitly confirming "no frunk" — that's a real `0`, not an unknown, and other entries (BMW iX, Cadillac Lyriq, Lexus RZ, Mercedes EQE Sedan, VW ID. Buzz) already correctly used `0` for the identical situation. Fixed for consistency/comparability.
- Cache versions bumped: `fields.js` v4→v5, `render.js` v12→v13, `similar.js` v4→v5 (transitively, since it re-exports through render.js's import chain), `styles.css` v13→v14, `app.js` v22→v23.
- Verified in the browser: F-150 Lightning shows "N/A" for cargo (vs. "—" for its unresearched cupholders), Rivian R1S shows "N/A" for ground clearance, Porsche Cayenne Electric shows italicized "Pending" for EPA range, and the ground-clearance filter slider's domain is unaffected (4.4–9.8 in, no NaN/string pollution).

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
- **Cadillac Celestiq** was deliberately skipped as a niche/halo trim — could add if there's interest.
- **GM Super Cruise** is normalized to `selfDriving.available: false` across every Cadillac/Chevrolet/GMC entry (treated as adaptive-cruise-tier driver-assist, not self-driving) — a few early entries briefly drifted from this and were corrected for consistency.

## Still explicitly deferred (low priority / low-volume)

- Rolls-Royce Spectre, Maserati Grecale Folgore/GranTurismo Folgore, Lotus Eletre/Emeya, Land Rover Range Rover Electric, Faraday Future FF91, Karma Revero/GS-6/GSe-6 — ultra-low-volume exotics, low practical value for a shopping-comparison tool. Add on request.

## Not yet on sale (watch, don't add yet)

- **Kia EV4** — full specs exist but US launch delayed indefinitely (tariffs/demand), no confirmed on-sale date.
- **Scout Traveler / Terra** — specs still "estimated," not final; production doesn't start until end of 2027 as **2028** models.
- **Slate Truck** — timing TBD, no confirmed specs yet.
- **Acura RSX** — confirmed electric coupe-SUV, launching H2 2026, but no published pricing yet.
- **BMW i3 (Neue Klasse sedan)** and **BMW iX4** — confirmed specs, 2027 MY, US pricing not yet finalized.
- **VW ID. Buzz Tourer 4Motion** — confirmed for MY2027 return after a 2026 hiatus, but no pricing/specs published yet.
- **Volvo ES90** — confirmed coming to the US, only European pricing exists so far, no US configurator live.
- **Mitsubishi Eclipse Sportback EV** — real (Leaf-based), Mitsubishi hasn't published pricing/specs yet ("coming in the near future").
- **Polestar 5 / 6** — real models but not sold in the US (Polestar restricted from selling vehicles with Chinese-origin software/hardware; company refocused on Europe).

## 2026-08-20 audit: 14 confirmed gaps + 3 naming fixes, queued in batches of 3

Ran a full 5-way parallel audit of all 28 makes against current 2025-2027 US-market EV lineups (triggered by spotting the missing Mach-E Premium). Found 14 real, on-sale-or-confirmed-with-published-pricing models/variants that are entirely missing, plus 3 existing entries with stale trim naming. Doing research + add in small batches (3 at a time) rather than one big parallel push, to keep capacity use per session manageable and each batch independently completable/verifiable. Order is roughly "most clearly real/simple" first.

**Batch 1 — done (2026-08-20)**
- Ford **E-Transit** — added as `Cargo Van Low Roof RWD`, $55,355, 159mi (EPA MCT-cycle rating; not in fueleconomy.gov's PowerSearch since commercial vans use a different EPA test methodology than passenger vehicles, so `range.source` points to a press article citing Ford's official figure instead). Added `"Van"` as a new `bodyStyle` value (filter sidebar picks it up automatically, no code change needed). BlueCruise isn't offered on this model at all, so `selfDriving.name` is `null` rather than reusing "BlueCruise" the way Ford's passenger EVs do.
- GMC **Hummer EV SUV** — added as `3X`, $105,300, 312mi (EPA figure carried over from the MY2025 listing, same as the Pickup 3X entry, since MY2026-specific EPA data isn't published yet). Distinct enclosed cargo hold (35.9/81.7 cu ft) vs. the Pickup's bed. Flagged an open question in its `notes`: one source suggests the Hummer EV doesn't get a native NACS port as standard until MY2027, which would contradict the already-existing Pickup 3X entry's `NACS` value — kept `NACS` for consistency with that sibling entry for now, but this is worth confirming against an official GMC spec sheet and fixing both entries together if wrong.
- Hyundai **Ioniq 5 N** — added as its own **model** (`Ioniq 5 N`, not a trim of `Ioniq 5`, matching how Hyundai/reviewers treat the N line), $59,900 (post price-cut MY2026 figure), 221mi, 641hp/3.25s (both are the N Grin Boost peak figures, continuous rating is 601hp).

Verified all three in the card grid (132 vehicles now, was 129), compare table, and detail modal.

**Batch 2 — done (2026-08-20)**
- Audi **A6 e-tron** — added as 2 trims: `Premium` (RWD, $66,700, 348mi, 375hp) and `Premium Plus quattro` (AWD, $72,000, 327mi, 466hp). New sedan nameplate on the PPE platform (shared with Q6 e-tron), sold in the US as the A6 Sportback e-tron fastback body. Tow capacity/ground clearance left null — only European Avant-wagon figures were found, which don't reliably apply to the US sedan.
- Mercedes-Benz **G-Class Electric** — added as `G 580 w/EQ Technology`, $163,200, 239mi, 579hp/4.6s. Single US configuration (no lower trim), so only one entry rather than the usual pair. Not in fueleconomy.gov's PowerSearch despite being on sale — used Edmunds' own confirmed-EPA-figure article as `range.source` instead (same workaround as the E-Transit in Batch 1).
- Mercedes-Benz **CLA Electric** — added as 2 trims: `250+ w/EQ Technology` (RWD, $47,250, 374mi, 268hp) and `350 4MATIC w/EQ Technology` (AWD, $49,800, 312mi, 349hp). Mercedes' first EV on the new MB.EA platform (distinct from the EVA2-based EQB/EQE/EQS already in the dataset) — unusually long EPA range for an 85kWh pack thanks to a new silicon-oxide-blend anode.

Verified all 5 in the card grid (137 vehicles now, was 132), compare table, and detail modal.

**Batch 3 — done (2026-08-20)**
- Mercedes-Maybach **EQS SUV** — added as `680 4MATIC`, $180,000, 300mi, 658hp/4.2s. Listed under its own `make: "Mercedes-Maybach"` (distinct from `Mercedes-Benz`) since that's how it's actually marketed/priced as its own line — filter sidebar picked up the new make automatically (29 makes now). Not in fueleconomy.gov's PowerSearch; used California ARB's driveclean.ca.gov listing as `range.source` instead (same EPA-certified figures, different database).
- Porsche **Cayenne Electric** — added as 2 trims: `Base` (AWD, $109,000, 435hp/4.5s) and `Turbo` (AWD, $163,000, 1,139hp/2.4s). New full-size SUV body style for Porsche EVs, on sale since March 2026. EPA range is genuinely not yet certified (not a fueleconomy.gov-listing gap like the other two — Porsche/reviewers are still citing WLTP/prototype estimates), so `range.epaMiles` is `null` on both trims per this dataset's "don't use uncertified marketing numbers" convention; revisit once fueleconomy.gov publishes a rating.
- Subaru **Uncharted** — added as 2 trims: `Premium` (FWD, $34,995, 308mi, 221hp) and `GT` (AWD, $43,795, 273mi, 338hp/4.7s). Subaru's first FWD-based EV, third model alongside Solterra/Trailseeker, different platform than the Toyota-shared Solterra.

Verified all 5 in the card grid (142 vehicles now, was 137), compare table, and detail modal.

**Batch 4 — done (2026-08-20)**
- Lucid **Gravity Touring** — added as `Touring AWD`, $81,525, 337mi, 560hp/4.0s. Cheaper 89kWh-pack entry point below the already-listed Grand Touring (123kWh). Ground clearance left null to stay consistent with the Grand Touring entry's own reasoning (adjustable air suspension, no single figure this dataset uses).
- Toyota **bZ Woodland** — added as 2 trims: `Woodland` ($45,300, 281mi, 375hp) and `Woodland Premium` ($47,400, adds heated/ventilated seats). Listed as its own model (not a bZ4X trim) since Toyota markets/prices it as a distinct off-road-styled trim family.
- Tesla **Model S** — added as 2 trims: `AWD` ($86,630, 410mi, 670hp/3.1s) and `Plaid AWD` ($101,630, 368mi, 1,020hp/2.0s). Long-known gap (we had 3/X/Y/Cybertruck but not S). Both trims are AWD-only now — Tesla dropped the old single-motor/RWD base config. 2026 is the final model year for this generation per multiple sources. Note: pricing came in noticeably lower than the original audit's finding ($109,990/$124,990) — used the more specific, dedicated-search figures from this session's research, but worth a quick re-check given Tesla's frequent unannounced price changes.

Verified all 5 in the card grid (147 vehicles now, was 142), compare table, and detail modal.

**Batch 5 — done (2026-08-20)**
- Tesla **Model Y L** — added as `L`, $61,990, 325mi, ~444hp (computed from published combined motor kW, not a directly-cited Tesla figure)/4.4s. New long-wheelbase 3-row/6-seat body style, not in fueleconomy.gov yet — used a dedicated review article as `range.source`. Cargo figures left null since the standard 2-row Model Y's numbers don't apply to the stretched 3-row body; frunk/tow/wheel/ground-clearance were carried over from standard Model Y as shared-platform figures.
- Tesla **Model X base AWD** — added as `AWD`, $99,900, 352mi, 670hp/3.8s. Fills the gap where we only had Plaid. Base pricing varied a lot across sources this session ($89,990–$104,990); went with $99,900 as the most consistently-repeated figure. Cargo/frunk/tow/wheel/ground-clearance carried over directly from the existing Plaid entry (shared body/platform, don't vary by motor tier).

Verified both in the card grid (149 vehicles now, was 147), compare table, and detail modal.

All 5 data batches (14 new models/variants) are now complete. Only Batch 6 (naming/staleness fixes) remains.

**Batch 6 — done (2026-08-20)**
- Tesla Model Y **"Long Range AWD" → "Premium AWD"** — confirmed a pure label change (Tesla renamed the tier mid-model-year), same $48,990 price and specs. `id` updated to `tesla-model-y-2026-premium-awd`.
- Tesla Cybertruck **"Dual Motor AWD" → "AWD"** — matches Tesla's actual current 3-tier naming (AWD / Premium AWD / Cyberbeast). Also caught two real spec drifts while in there: price was stale at $59,990 (Tesla raised it to $69,990 on 2026-03-01) and tow capacity corrected from 7,500 lbs to 11,000 lbs per a more specific source. `id` updated to `tesla-cybertruck-2026-awd`.
- Toyota **bZ4X → bZ** — this turned out to be a full MY2026 facelift, not just a badge change: switched CCS1 → native NACS, DC fast-charging unified at 150kW across trims (was split 150/100 FWD/AWD), Level 2 AC bumped 6.6kW → 11kW, and the AWD trim's power jumped 214hp → 338hp. Updated both existing entries in place (`model`, `modelYear` 2025→2026, `id`s, and all the above specs) rather than adding new rows — kept the same base+top trim pattern (XLE FWD + Limited AWD) rather than adding Toyota's new middle XLE Plus trim. New `id`s: `toyota-bz-2026-xle-fwd`, `toyota-bz-2026-limited-awd`.

Verified all three fixes in the card grid, compare table, and detail modal (149 vehicles unchanged — these were edits, not additions).

**All 6 batches from the 2026-08-20 audit are now complete.**

Also worth a quick note while we're in there: Audi Q8 e-tron (ended production Feb 2025) and Dodge Charger Daytona R/T (discontinued for MY2026) are both still accurate for the model year we have them listed as — no fix needed, just flagged in case those entries get refreshed to a newer year later.

## Next step (data)

Work through the 6 batches above in order, one at a time. After each batch: research real specs per `data/SCHEMA.md`, add the entries, verify rendering (card grid count, compare table, detail modal), and check this list off. Otherwise, revisit the "not yet on sale" watch list above once any of those get confirmed pricing/specs.

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

---

# TODO: Scrollbar corner + card grid sort (2026-08-20)

## 1. White square at the bottom-right of the compare grid

The corner where a horizontal and vertical scrollbar meet is a separate pseudo-element (`::-webkit-scrollbar-corner`) from the scrollbar track/thumb — we'd styled those but never that, so it fell back to the browser's default (stark white) styling against the dark theme. Added a themed rule for it alongside the existing scrollbar styles in `css/styles.css`.

## 2. Sort control for the card grid (not compare views)

Added a "Sort by" dropdown above the card grid: Price (low→high / high→low), Range (longest/shortest first), 0–60 (fastest/slowest first), Max Passengers (most/fewest first), plus the original default order. Scoped exactly as asked — it only ever touches `js/app.js`'s card-grid render call; the auto-compare and manual-compare table column order is untouched regardless of what's selected (verified: sorted the grid by "Max Passengers: Most first," then searched down to a 2-result auto-compare view, and the columns still came out in original catalog order, not passenger-sorted).

Cars missing a given spec (e.g. no listed 0-60 time) sink to the bottom of the sort regardless of direction, rather than clustering at the top on an ascending sort via `undefined`/`NaN` comparison weirdness. "Sort by" is independent of "Reset filters" — clearing filters doesn't reset your sort choice, matching how most shopping sites treat the two as separate controls.

---

# TODO: "Compare all" button (2026-08-20)

Added a "Compare all (N)" button next to the "Similar Vehicles" heading in the detail modal. Click it and it: replaces whatever's currently in the compare selection (not additive — a clean slate, as asked) with the car you're viewing plus its similar-vehicle matches, closes the modal, and jumps straight to the compare grid.

Naturally hidden when there are none — `renderSimilarSection` in `js/render.js` already returns nothing at all (no section, no button) when `findSimilarCars` comes back empty, so no extra condition was needed. In practice that's a rare case at our current catalog size (128 cars) — the similarity search's own fallback logic widens its net until it finds matches, so it's more of a defensive guarantee than something you'll normally see.

Verified: pre-selected an unrelated car for comparison, then opened a different car's detail and hit "Compare all" — the compare grid showed exactly the 5 cars from that button (the anchor + its 4 matches), with the earlier unrelated selection correctly gone rather than appended. Works the same on mobile.

# TODO: Static prerendering + GitHub Actions deploy (2026-08-21)

Semi-productionalizing: user wants a custom domain (`evcompare.org`, leaning `.org` over `.net` for the faint "impartial reference" connotation) and per-car pages that expose real content + schema.org structured data to crawlers/AI agents, since the site is a pure client-rendered SPA today (crawlers without JS just see an empty shell).

**What shipped:**
- **`scripts/prerender.mjs`** — a dependency-free Node build script (stdlib only, no npm install, no headless browser) that reads `data/evs.json` and writes one real static HTML page per trim at the same path `js/router.js`'s client-side router already uses (`/{modelYear}/{model-slug}/{trim-slug}/`). Each page gets a real `<title>`/meta description, Open Graph + Twitter Card tags, a `<link rel="canonical">`, and a `<script type="application/ld+json">` block using schema.org's `Car` type (brand/model/bodyType/fuelType/driveWheelConfiguration/seating/doors, an `Offer` with price when known, and an `additionalProperty` list for EV-specific specs like range/battery/charging speed/tow/ground clearance). Also emits `sitemap.xml` and `robots.txt` at the root.
  - Reuses `carPath`/`BASE_PATH` directly from `js/router.js` (imported, not reimplemented) so the URL scheme can never drift between the client router and the prerender step.
  - Respects the `null`/`"N/A"`/`"Pending"` three-state convention from `data/SCHEMA.md` — sentinel values are silently omitted from the structured data and the summary line rather than ever being emitted as a fake number (e.g. Porsche Cayenne Electric's `"Pending"` EPA range doesn't show up as a JSON-LD `additionalProperty` at all).
  - The only thing to change when moving from `hhamill.github.io/evcompare` onto the `evcompare.org` custom domain is the `SITE_BASE_URL` constant at the top of the script — same migration list as the existing `<base>`/`BASE_PATH`/`pathSegmentsToKeep` trio already documented in the code.
- **Human visitors get the full interactive app, not a static page** — each prerendered file includes the exact same `<div class="app">` shell and `<script type="module" src="js/app.js">` as `index.html`. `app.js`'s `init()` already calls `carForPath(state.pathIndex, location.pathname)` on load (this was already built for the deep-linking/back-button work earlier), so it opens the right car's detail modal automatically once JS runs — no prerender-specific client code needed. A `<noscript>` block covers the rare crawler that doesn't execute JS at all.
- **Bug found + fixed while testing this**: `js/router.js`'s `carForPath` did an exact string match against `location.pathname`, but a prerendered page's directory-index URL naturally has a trailing slash (`.../gt-awd/`) while `carPath()` never produces one (`.../gt-awd`) — silent lookup miss, app fell back to showing the homepage instead of the car. Fixed by normalizing a trailing slash off the pathname before the lookup in `carForPath` itself, so it's fixed for real users manually typing a trailing-slash URL too, not just prerendered pages. Bumped `router.js` v2→v3, `app.js` v23→v24 (its own import line changed).
- **`.github/workflows/deploy.yml`** — switches Pages deployment from "deploy from a branch" to the GitHub Actions deploy method: checkout → run the prerender script (no npm install step, since there are zero dependencies) → `actions/upload-pages-artifact` on `dist/` → `actions/deploy-pages`. Triggers on push to `main` or manually. This means `dist/`'s generated output never gets committed to the repo — it's built fresh on every deploy and only exists in the published artifact.
- **`package.json`** (new, minimal) — just `{"type": "module"}` + a `prerender` script alias. Needed only so Node treats the existing `.js` files as ES modules when importing `router.js` from the prerender script (browsers already know this via `<script type="module">`; Node needs it spelled out). No dependencies, no lockfile.
- **`.gitignore`** (new) — excludes `dist/`, `.DS_Store`, `node_modules/`.

**Verified**: ran `node scripts/prerender.mjs` locally (149 pages + sitemap.xml/robots.txt generated), spot-checked the Mach-E GT page's JSON-LD is valid/well-formed JSON, confirmed a `"Pending"`-valued field (Porsche Cayenne Electric's EPA range) is correctly omitted rather than faked, and served `dist/` locally at the `/evcompare/` path to confirm end-to-end: the static `<title>`/meta tags are present in the raw HTML immediately, and the full interactive app boots and opens the correct car's detail modal automatically.

**Still open / not done yet:**
- The GitHub Actions workflow hasn't been run for real yet — needs the repo's Pages source switched from "Deploy from a branch" to "GitHub Actions" in Settings → Pages before the first push will actually deploy anything.
- No `og:image`/`twitter:image` — this project has never stored per-car photos (uses emoji body-style icons instead), so link previews will show title/description text only, no image. Not fixed; would need either real car images or a generated placeholder card per trim.
- `www.evcompare.org` isn't configured (user is deferring this) — apex-only for now, which is what everything below already assumes.

# TODO: Custom domain migration + drop BASE_PATH entirely (2026-08-21)

User bought `evcompare.org`, set it as the GitHub Pages custom domain (verified: "DNS valid for primary"), and the 4 A + 4 AAAA records at `@` were already correctly pointed at GitHub's IPs. Rather than just flipping the 4 `BASE_PATH`-related constants per the migration plan from the prerendering work above, went further and **removed the whole base-path/`<base href>` mechanism**, since the site is now committed to root deployment (no more `hhamill.github.io/evcompare/` project-page path to support) — one less class of "remember to flip 4 constants" bug going forward, and it also fully closes out the original deep-link/404.html asset-resolution issue rather than just working around it.

**What changed:**
- **`index.html`**: removed `<base href>` entirely; `css/styles.css` → `/css/styles.css`, `js/app.js` → `/js/app.js` (both now root-relative, i.e. always resolve against the domain root regardless of what `location.pathname` is or becomes via `history.replaceState`).
- **`js/app.js`**: `fetch("data/evs.json")` → `fetch("/data/evs.json")` (same root-relative reasoning — this was the one other relative resource reference in the codebase, easy to miss since it's not an HTML tag).
- **`js/router.js`**: `BASE_PATH` set to `""` permanently (root deploy is now the only supported target without further changes) — comment rewritten to explain it no longer affects asset loading, only generated route paths.
- **`404.html`**: `pathSegmentsToKeep` → `0`.
- **`scripts/prerender.mjs`**: `SITE_BASE_URL` → `https://evcompare.org`; removed the per-page `<base href>` and made its embedded css/js references root-relative too, matching `index.html`.
- Bumped versions: `router.js` v3→v4, `app.js` v24→v25 (both its own import-line change and the fetch-path change).

**Verified**: regenerated `dist/` clean, confirmed `sitemap.xml`/JSON-LD/canonical URLs all read `https://evcompare.org/...` with no `/evcompare` prefix anywhere, and served `dist/` locally at the domain root (no subpath) to check both critical paths — a prerendered deep-link page (`/2026/mustang-mach-e/gt-awd/`) opened the correct car's detail modal with zero console errors, and in-app client-side navigation (clicking "View details" from the card grid, no page reload) correctly pushed `/2024/zdx/a-spec-rwd` with no `/evcompare` prefix and no errors.

**Not done yet**: the actual DNS `www` CNAME and Pages-source switch to GitHub Actions (see the two items just above) — this batch was purely the root-path code migration.

**Update (later same day)**: user switched Pages source to GitHub Actions, pushed — the first real deploy ran successfully. Hit one snag getting there: GitHub Pages auto-commits a `CNAME` file to the repo whenever a custom domain is set/changed in Settings, so `origin/main` had diverged (3 GitHub-authored "Create/Delete/Create CNAME" commits) from the local work. Zero file overlap between the two histories (GitHub only ever touched `CNAME`; local work never did), so `git merge origin/main` resolved with no conflicts. Site is now live at `evcompare.org`.

**Update (2026-08-21)**: user resolved the `www.evcompare.org` DNS setup on their own (outside this session — no code/config changes here). Both apex and `www` are now covered; the "not done yet" `www` notes above and in the prerendering section are closed out.

# TODO: More JSON-LD — homepage catalog, breadcrumbs, similar-vehicle links (2026-08-21)

Follow-up once the site was confirmed live: asked whether there was other worthwhile structured data beyond the per-car `Car`/`Offer` blocks already shipped. Landed on three additions, all cheap because they reuse data/logic the app already has — skipped a fourth option (dedicated comparison pages with their own JSON-LD) because it's a real feature gap, not a structured-data gap: the compare view has no shareable URL at all (pure client-side `Set` + localStorage), and prerendering every possible car combination isn't remotely tractable at 149 cars.

- **Homepage**: added `WebSite` (name/url/description) and `ItemList` enumerating all 149 cars (name + canonical URL each) as two JSON-LD blocks. `scripts/prerender.mjs` no longer copies `index.html` byte-for-byte — `buildHomepage()` now reads it and does one string-replace injecting both blocks right before `</head>`, so this is the only file where the build step modifies rather than wholly generates or verbatim-copies.
- **Per-car pages**: added `BreadcrumbList` (EV Compare → Make → Model → this trim). Make/Model are name-only, no `item` URL — there's no real crawlable page at those levels (only individual trims are routable), and fabricating URLs that don't actually filter anything felt worse than an honest 2-linked/2-unlinked hierarchy. Schema.org's `ListItem.item` is optional for exactly this reason.
- **Similar vehicles, instead of comparison pages**: added `isSimilarTo` to each car's own `Car` JSON-LD — a lightweight `Car` stub (name + url) per match. Reuses `findSimilarCars()` from `js/similar.js` directly (imported into the prerender script alongside `router.js`'s `carPath`/`BASE_PATH`, same pattern) — this is the exact same algorithm already driving the "Similar Vehicles" section and "Compare all" button in the live app, so the structured data and the UI can never disagree about what counts as similar.

**Verified**: regenerated `dist/` clean — homepage has exactly 2 JSON-LD blocks (`WebSite`, `ItemList` with `numberOfItems: 149`); spot-checked the Mach-E GT page has 2 blocks (`Car` with a 4-entry `isSimilarTo` matching what the live "Similar Vehicles" section shows, and `BreadcrumbList`), both valid JSON; served `dist/` locally at the domain root again to confirm the homepage still boots with zero console errors after switching from a raw file copy to a string-injected one.

# TODO: Discord/social unfurl — homepage meta tags, OG image, crawlable links (2026-08-21)

Follow-up on "what else helps crawlers find the site" — landed on three more additions, prompted by the user specifically caring about Discord unfurl previews (which are OG-tag-based, not Twitter-Card-based — a common mix-up).

- **Homepage `<head>` was missing everything** — no `<meta name="description">`, no OG tags, no Twitter Card, no canonical, despite every per-car page already having the full set. Added all of it directly to `index.html` (static content, no per-build data needed, so no reason to route it through the prerender script's injection step the way the JSON-LD is).
- **New: `assets/og-image.png`** — a real 1200×630 branded image (dark background, ⚡ mark, "EV Compare" wordmark, tagline), since Discord (and most platforms) show a much barer text-only card with no image at all. This project has never stored real per-car photos, so it's one site-wide image, not per-trim. Built with zero new dependencies — hand-authored `scripts/og-image-template.html`, screenshotted via local Chrome's built-in `--headless --screenshot` flag (no Puppeteer/Playwright/canvas library needed). The template is kept as a reference for regenerating later if the branding changes; it's a one-time hand-triggered asset, not rebuilt on every deploy. Deliberately left specific catalog counts (trims/makes/models) off the image itself after first drafting it with them in — hardcoded numbers on a static image would just go stale as the dataset grows.
- **Wired the image in everywhere**: `og:image`/`og:image:width`/`og:image:height`/`twitter:image` on both the homepage and every per-car page, and bumped `twitter:card` from `summary` to `summary_large_image` (the card type meant for a 1200×630-ratio image) now that there's a real one. Also added `theme-color` (`#4ee08a`, the app's accent green) — Discord uses this for the embed's left accent bar.
- **Real crawlable `<a href>` links on car pages**: the `<noscript>` fallback (previously just a plain `<h1>`/`<p>` summary) now includes a real link back to the homepage and a real link to each of the page's `isSimilarTo` matches. This is the one that actually matters for crawler *discovery* as opposed to preview quality — JSON-LD `url` fields are structured data, not something every crawler necessarily follows to find new pages, while `sitemap.xml` only helps a crawler that already knows to fetch it. Plain anchor tags sitting in the raw HTML (which noscript content is, regardless of whether a given crawler executes JS) are the most universally-respected discovery mechanism there is.
- `scripts/prerender.mjs`'s static-copy list now includes `assets/` alongside `css`/`js`/`data`/`404.html`.

**Verified**: regenerated `dist/` clean, confirmed `assets/og-image.png` copied through and served correctly (1200×630), confirmed real `og:image`/`twitter:image` URLs resolve on both the homepage and the Mach-E GT page, confirmed the Mach-E GT page's noscript block now has 5 real links (home + 4 similar cars, matching the JSON-LD `isSimilarTo` list exactly), and reloaded both the homepage and a car page locally with zero console errors.

# TODO: Real pixel-art og-image + logo (2026-08-21)

Replaced the placeholder `assets/og-image.png` (plain text card) with actual 8-bit pixel art per the user's request: two EVs facing off left-to-right. Also produced a standalone `assets/logo.png` (512×512) as a larger brand-mark asset.

- **`scripts/og-image-template.html`** rewritten to draw real pixel art via `<canvas>` instead of styled DOM/CSS — a car sprite is a plain 2D array of single-character color codes (`js/router.js`-adjacent "just data, no library" style), rendered with `fillRect` per cell and `imageSmoothingEnabled = false` for crisp blocky edges. One sprite defined (`CAR_RIGHT`); the second car is generated programmatically by mirroring the grid horizontally and remapping only the body/shadow/highlight color codes to the app's `--accent-2` blue (window/wheel/light colors intentionally stay shared between both cars). Colors are pulled directly from the live app's actual CSS custom properties (`--accent` green, `--accent-2` blue, `--text-dim`, etc.), not invented.
- Iterated on the car shape once after seeing the first render — the initial pass had smooth/rounded silhouette edges (reads as a blob, not "8-bit") and near-invisible wheels (near-black on a near-black background). Fixed with sharper stepped/tiered geometry and a mid-gray tire color plus a hubcap highlight pixel, then added soft ground-shadow ellipses under each car for grounding.
- The template now has two render modes via URL hash (`#og` for the 1200×630 unfurl image, `#logo` for a centered 512×512 single-car brand mark) sharing the same sprite/color code — documented both regeneration commands (still just local headless Chrome, no new dependencies) in the file's header comment.
- **Deliberately did not touch** the real browser-tab favicon (`<link rel="icon">` in `index.html`, an inline SVG bolt) or the in-app topbar `.brand-mark` badge (30×30px) — checked the CSS and confirmed both render far too small for this level of pixel-art detail to stay legible; a full sprite would just look like a colored smear at 16-30px, whereas the existing single bold ⚡ glyph reads cleanly at that size. `logo.png` is meant for larger contexts (README badge, GitHub social preview, Discord server icon) if wanted, not wired into the app UI itself.

**Verified**: regenerated `dist/` clean, confirmed both PNGs copy through the build (`dist/assets/og-image.png` 1200×630, `dist/assets/logo.png` 512×512) with no code changes needed elsewhere, since the OG/Twitter meta tags already point at the same `assets/og-image.png` filename from the previous batch.

# TODO: Pixel-art favicon + topbar brand mark (2026-08-21)

Follow-up: replaced the plain ⚡ emoji (favicon + topbar `.brand-mark` badge) with a small pixel-art bolt matching the new og-image/logo aesthetic. Unlike the two-car sprite, a bolt is simple enough geometry to actually stay legible at 16-30px, so this one *was* worth doing at in-app scale (the car sprite wasn't, per the note above).

- Added `BOLT_ICON` to `scripts/og-image-template.html` and a new `#icon` preview mode for checking it at real badge scale (300×300 on the actual `.brand-mark` gradient) before committing to it.
- **First attempt was a fresh design and it just didn't read as a bolt** — smooth zigzag with arbitrary shading looked like a striped ribbon, not lightning. Threw it out and instead doubled the resolution of the *already-proven* small bolt shape used as the "vs" divider between the two cars in the OG image (`bolt` array in `drawBolt`) — same silhouette, just 2x2-per-cell for more room to add a 1px gold shadow stripe along the trailing edge without touching the outline. Confirmed legible at both the 300px preview and a downscaled 32px/20px check (`sips -z`) before finalizing.
- Converted the final 8×12 pixel grid into inline SVG `<rect>` markup (generated programmatically from the same grid data, then hand-merged into horizontal *and* vertical runs — 12 rects total instead of 96 — to keep the embed reasonably sized) and swapped it into three places: `index.html`'s `<link rel="icon">`, `index.html`'s `.brand-mark` span (replacing the `⚡` text node), and `scripts/prerender.mjs`'s per-car-page favicon (which has its own independent copy of the `<link rel="icon">` tag, same as when the base-path migration touched multiple files — anywhere the favicon is hardcoded needed the same swap).
- Both the favicon and brand-mark SVGs use `shape-rendering="crispEdges"` to stay blocky rather than anti-aliased/blurred at small sizes.

**Verified**: rebuilt `dist/` clean, confirmed the brand-mark SVG is present in the live DOM, and visually checked it at actual render size (zoomed the page 6x and screenshotted the real 30×30 badge) — reads cleanly as a bolt with the gold shading giving it a bit of depth, no console errors on either the homepage or a car page.

# TODO: Favicon contrast fix + two-car topbar mark (2026-08-21)

Two follow-ups from a screenshot of the bolt-in-badge work above: the favicon's pale bolt colors blended into a light browser tab background, and the topbar mark itself was asked to become a small version of the OG image's two-cars-facing-off scene rather than staying a single bolt.

- **Favicon**: was just the bare bolt shape (transparent background, `viewBox="0 0 8 12"`). Redrew it on a solid green (`--accent`) rounded-square background (`viewBox="0 0 16 16" rx="3"`, bolt centered inside) for real contrast against any tab-bar color. Same three-place update as the earlier bolt swap — `index.html`'s `<link rel="icon">` and `scripts/prerender.mjs`'s independent copy of the same tag.
- **Topbar brand mark**: replaced the bolt-only badge with a compact version of the two-car scene. First attempt tried to get there by *cropping* the existing wide 1200×630 "og" composition (translating the canvas so the meeting point landed in a small frame) — the math looked right on paper but the result showed only tiny slivers of each car, because two full-width car sprites with a gap for the bolt are inherently ~4.5:1 on their own, so a tight icon-ish crop of that layout necessarily clips almost everything. Replaced with a purpose-built small layout instead: same `CAR_RIGHT`/`CAR_LEFT`/bolt data and `drawSprite`/`drawBolt` functions, just positioned tight at a smaller scale (`px=3` vs. the OG image's `px=12`) so both full cars actually fit.
  - Needed a real *transparent* background for this one (unlike the OG image, which bakes in its own dark backdrop) so it sits naturally on the topbar in either theme — but Chrome's `--screenshot` CLI flag turned out not to preserve alpha no matter what background-color flags were passed, always flattening to opaque. Sidestepped the whole problem: this is an in-app UI element, not something that needs to be a real image file for an external platform, so it went the same route as the bolt — generated as inline SVG `<rect>` markup (same merge-adjacent-rows-and-columns compaction as the bolt, 62 rects) instead of a PNG. Genuinely transparent by construction, no alpha-export fight needed.
  - Also caught a real gap while touching this: `scripts/prerender.mjs`'s own copy of the topbar (used on every per-car page) still had the *original* `⚡` emoji — the earlier bolt-icon batch only updated its favicon, not its brand-mark span. Fixed both in the same pass this time.
  - `.brand-mark`'s CSS lost its fixed 30×30/gradient-background/border-radius styling (that was specifically for "single glyph in a colored square"; the new mark is its own wider self-contained graphic) — now just a plain flex container sized by its SVG child.
- Bumped `styles.css` v14→v15 for the `.brand-mark` CSS change.

**Verified**: rebuilt `dist/` clean, confirmed both files' favicon and brand-mark markup match, and checked both live in the actual app (not just the isolated template) — zoomed the real page 3x on the homepage to confirm the two-car mark reads clearly next to "EV Compare," and separately rendered the favicon SVG standalone at 6x to confirm the green box now gives real contrast. No console errors.

**Follow-up same day**: user flagged a real problem before shipping — the topbar bolt (`#eef1f6`, near-white) had no background of its own anymore (the `.brand-mark` badge lost its colored backdrop in the swap above), so on a light-theme white page it would have nearly disappeared. Asked to bring back the old `.brand-mark` gradient badge behind the new two-car mark.
- Restored `.brand-mark`'s `linear-gradient(145deg, var(--accent), var(--accent-2))` background + `border-radius: 9px`, now sized as padding (`4px 8px`) around the wider content instead of a fixed 30×30 square. Shrank the SVG's display size from 120×30 to 100×25 to leave room for that padding.
- Real trade-off worth knowing about: putting the cars back on their own accent-colored background means the green car's lighter roof/highlight blends a little into the gradient's green zone (same for blue car/blue zone) — less "pop" than they had sitting on plain white. Judged acceptable since the darker shadow/wheel tones still keep both cars readable as distinct car shapes, and the bolt's contrast problem (the actual blocking issue) is now fully solved. Checked both light and dark theme live — reads cleanly in both.

# TODO: Redrawn car sprite, glow bolt, retro background (2026-08-21)

User shared a reference SVG (a much more detailed 8-bit car-vs-car scene from another site) and asked to nudge the OG image and logo in that direction — the sprites were "a little lo-fi and pointy." Favicon explicitly left alone. Studied the reference's *techniques* (stepped panel tiers instead of a triangular taper, two-tone windows with a reflection pixel, a layered glow instead of a flat-color bolt, retro horizon-glow background) and built an original sprite using them, rather than reusing their actual artwork/code.

- **`CAR_RIGHT` grid grew from 24×12 to 30×15** — the old sprite tapered from cabin straight down to the nose/tail in one step, which is what read as "pointy." The new one adds an extra shoulder tier between the cabin and the full-width body for a rounder profile, a door-line panel break, and two-tone glass (`V` for the far/rear window, `W` for the near/windshield side, plus a bright `X` reflection pixel) instead of one flat window color. Built the grid programmatically (row-by-row band definitions in a Python throwaway script) rather than hand-typing 30-character strings — caught and fixed one off-by-one row-length bug this way before it ever hit a render.
- **New `drawBoltGlow()`** — same proven zigzag shape as the existing `drawBolt`, just drawn three times at decreasing size and increasing brightness (outer orange → mid yellow → white core), centered on one point. Reuses the shape entirely; the "glow" is purely a rendering technique, not a new shape to design. Used for the OG image and logo; the topbar/favicon-scale bolt stays the flat single-color version since a 3-layer glow would likely just look muddy at that size.
- **Retro horizon-glow background** on both the OG image and logo.png — a few stacked violet bars narrowing toward a vanishing point, positioned in the gap between the title and the cars (OG image) or above the car's roof (logo). Iterated once: the first pass used thin 3px lines that read as a stray floating line rather than atmosphere, and a ground grid whose vertical lines crossed right through the tagline text — fixed by widening/brightening the bars and dropping the ground grid down to a single subtle line well clear of the text.
- **Regenerated all three consumers from the same updated grid**: `assets/og-image.png`, `assets/logo.png` (both via the same local-Chrome-headless-screenshot pipeline as before, no new dependencies), and the topbar `.brand-mark` inline SVG. That last one caught a real gotcha: the SVG markup in `index.html`/`prerender.mjs` is a *baked snapshot*, hand-generated from the grid at the time — editing `CAR_RIGHT` in the template doesn't automatically update it. Had to regenerate the rect markup from the new grid/colors and re-paste into both files, same as the very first bolt swap.
- Favicon untouched, exactly as asked — still the simple flat bolt-on-green-box from the previous batch.

**Verified**: rendered each mode standalone and iterated on the rough spots (bolt size, horizon bar visibility/position) before finalizing; regenerated `dist/` clean and checked live in the actual app — zoomed 3x on both the homepage and a car detail page to confirm the new rounder cars render correctly in the topbar badge, no console errors either page.

**Follow-up same day**: user shared a real Discord unfurl screenshot with two notes.
- **"Image feels big, text-to-image ratio is off"** — 1200×630 is actually already the standard OG/Twitter size (Twitter's own docs prefer 2:1, if anything shorter than what we had), so this wasn't a compatibility problem — it was that the actual content (cars, bolt, text) only filled a small fraction of the canvas, leaving a lot of dark empty space. Fixed by shortening the canvas to 1200×600 (2:1, still squarely standard) and scaling the content up slightly (car `px` 10→11, tighter vertical margins throughout) so it fills the frame instead of floating in it. Updated `og:image:height` (1200→600 stays, 630→600) in both `index.html` and `scripts/prerender.mjs`'s independent copy of the same meta tags.
- **Redundant description text** — "Compare specs against other EVs on EV Compare" repeats "compare"/"EV(s)" back to back. Rather than renaming the brand (user floated "EVCompare" as one option but wasn't committed to it), just dropped the trailing "on EV Compare" from the description body entirely — the title suffix and `og:site_name` already carry that attribution, so the description didn't need to repeat it. Now reads e.g. "...0–60 in 4.9s. Full specs and side-by-side comparisons."

**Verified**: regenerated `og-image.png` at the new 1200×600 size, rebuilt `dist/`, confirmed a sample car page's `<meta name="description">` and `og:image:height` both reflect the fix.

# TODO: Added GoatCounter analytics (2026-08-21)

User asked what a GoatCounter integration would require and whether it involved anything sensitive going into the (public) repo. It doesn't — the embed is a single async `<script data-goatcounter="...">` tag with no API key/secret; the site code in the URL is meant to be public (any visitor's browser already sends it, same category as a GA tracking ID).

- Added the script tag to `index.html` right after the stylesheet link, and to `scripts/prerender.mjs`'s `pageFor()` template in the same spot — the usual two-copy pattern for anything in `<head>`. The homepage's prerendered output doesn't need a separate edit since `buildHomepage()` injects JSON-LD into the real `index.html` source rather than maintaining its own copy, so it picked the tag up automatically.
- GoatCounter dashboard privacy is a separate, off-by-default setting on their end (not a repo concern) — adding the script doesn't publish the stats anywhere.

**Verified**: rebuilt `dist/` clean, grepped both the homepage and a sample car page's output for the script tag to confirm both carry it.

# TODO: Tab title didn't update on client-side "navigation" (2026-08-21)

User noticed: clicking a car opens the detail modal and silently pushState's its URL, but the tab title stays "EV Compare" — only a hard load of that same URL (e.g. the prerendered page) showed the real title. `document.title` was never touched anywhere in `js/app.js`; the correct-looking title on a direct load was coming entirely from the prerendered `<title>` tag, not any client-side logic.

- `js/app.js`: added `HOME_TITLE`/`titleFor(car)`, mirroring `scripts/prerender.mjs`'s `SITE_NAME` + per-car title format exactly (`"{year} {make} {model} {trim} — Specs & Price | EV Compare"`) so the title reads identically whether the page was hard-loaded or reached via client nav. `openDetail()` sets `document.title = titleFor(car)`; `closeModal()` sets it back to `HOME_TITLE` — both cover every call site (clicking a car, "similar vehicle" jumps, browser back/forward via `popstate`, closing the modal by backdrop/Escape/back button).
- Bumped `app.js` v25→v26 in both `index.html` and `scripts/prerender.mjs`.

**Verified**: served the site locally, clicked into a car and confirmed the tab title changed to the car's title, then closed the modal and confirmed it reverted to the homepage title — checked via the actual tab title, not just visual inspection. Rebuilt `dist/` clean.

# TODO: Distinct URL/title/pageview per entry point, for GoatCounter (2026-08-21)

User's actual goal: tell "someone looked at the homepage" apart from "someone clicked Compare" vs "someone clicked Compare all from a car's Similar Vehicles section" in GoatCounter, since right now those all look identical (no URL/pageview change on any client-side view switch). Explicitly fine with this being cosmetic/non-dynamic — no static file exists for `/compare` (149 cars → not remotely tractable to prerender every combination, same reasoning as the earlier JSON-LD comparison-pages decision), so a hard load or reload of these URLs just falls through to the homepage like any other unrecognized path.

- **New paths**: `/compare` (the floating compare bar's "Compare" button) and `/compare/similar` ("Compare all" in a car's Similar Vehicles section) — distinct so the two entry points are distinguishable in GoatCounter, not just "compare" vs "not compare." Title becomes `Comparing N vehicles — EV Compare` for both.
- **`history.replaceState`, not `pushState`**, for entering/leaving compare — same reasoning as the existing `closeModal` comment ("closing shouldn't grow the stack"): this is a mode switch on the current page, not a drill-down like opening a car, so it doesn't need its own back-stack entry and popstate doesn't need to know how to reconstruct it. Kept the car-detail pushState behavior (real breadcrumb trail) untouched.
- **`trackPageview()`**: GoatCounter's `count.js` auto-fires one pageview on initial load using whatever URL/title was current at that moment, then has no idea about later client-side changes. Calling `window.goatcounter.count()` with no arguments re-reads whatever's *currently* in the URL bar/`document.title`, so as long as it's called after our own URL/title update (not before), it registers as a real, distinct pageview. Guarded against the script not being loaded yet or being ad-blocked (common for analytics scripts) — silently no-ops rather than erroring, since this is best-effort visibility the app doesn't depend on.
- **Found and fixed the same gap for car-detail views while in there**: clicking into a car from the homepage was *also* invisible to GoatCounter before this — only a hard load/direct link of a car URL got counted, because opening the modal via `openDetail()` only changed the URL/title (from the earlier same-day fix), never called `count()`. Added the same `trackPageview()` call there and to the matching close-modal-back-to-home transition, so all three real view changes (home ↔ car, home ↔ compare, compare-from-similar) are now consistently tracked.
- **Deliberately not tracked**: browser back/forward through car pages (popstate-triggered `openDetail`/`closeModal` calls use `historyMode: "none"` and skip `trackPageview()`), and the filter-sidebar's existing silent `state.view = "results"` snap-back when adjusting a filter while in compare view (fires on every single filter interaction — far too frequent to treat as a deliberate "view" transition, and pre-existing, unrelated behavior). Both are conservative simplifications, not oversights.
- Bumped `app.js` v26→v27 in both `index.html` and `scripts/prerender.mjs`.

**Verified**: stubbed `window.goatcounter.count` with a spy in the browser console and drove all four transitions (Compare button, Compare all from similar, Back to results, Clear all) plus a car-detail open/close — each produced exactly one `count()` call with the correct path and title, no duplicates, no calls on the popstate-only paths. Rebuilt `dist/` clean.

# TODO: Security pass — escape car data before it hits innerHTML (2026-08-21)

User asked for a general security review. Found one real gap: every client-side render function (`js/render.js`, `js/filters.js`) interpolated car data straight into `innerHTML` template strings with zero HTML-escaping — car titles/trims/notes as text, `car.links.*`/`car.range.source` as raw `href` attributes. `data/evs.json` itself is clean right now (verified — no `<`/`>`/non-https scheme anywhere in it), so nothing was live-exploitable, but the data is hand-researched from external sources rather than schema-validated, and `scripts/prerender.mjs` already escapes these exact same fields for the static pages via its own `esc()` — so the client-rendered path everyone actually uses was the one gap. Fixed:

- **`js/render.js`**: added `esc()` (same char-map as `prerender.mjs`'s) and a `safeHref()` guard that only allows `http:`/`https:` URLs through as real `<a href>`s (drops anything else, including `javascript:` and malformed non-absolute strings) rather than trying to sanitize a URL string in place. Applied both across every interpolation point: `carTitle()`, `car.trim`, `car.id`/`compareAllIds` (attribute contexts), `car.notes`, and all four link fields (`links.review`, `links.manufacturerSpec`, `links.epaWindowSticker`, `range.source`). `fmtVal()` now escapes its return value once at the source, covering every field's formatted display value in one place.
- **`js/filters.js`**: same `esc()` helper, applied to enum filter values (`<span>${val}</span>` and the `data-val` attribute, replacing an incomplete manual `"`-only replace) and the range-slider's formatted min/max labels.
- Left `field.label`/`groupName` unescaped — those come from the developer-controlled `FIELDS`/`GROUP_ORDER` arrays in `fields.js`, not car data, same trust boundary as the rest of the app's own source.
- Bumped `filters.js` v7→v8, `render.js` v13→v14, `app.js` v27→v28 (imports both).

**Verified**: dynamically imported the updated `render.js` in the browser console and fed `renderDetailModal`/`renderCardGrid`/`renderCompareTable` a fabricated car object with `<script>`/`<img onerror>`/attribute-breakout payloads in every field (id, make, model, trim, notes, links) plus a `javascript:` URL and a malformed non-URL string in the link fields. No script execution in any case (checked via a `window.__xss` flag the payloads tried to set), all payloads rendered as literal escaped text, the attribute-breakout attempt stayed contained inside its `href` value, and the `javascript:`/malformed links were silently dropped rather than rendered. Then re-tested with the real dataset to confirm no regressions — car titles/prices/links render and work identically to before. Rebuilt `dist/` clean.

**Also discussed, deliberately deferred**: unmatched deep links (typo'd trim slug, or any non-car/non-`/` path) 404 once at the network level, then GitHub Pages' `404.html` redirect trick lands on the homepage with no indication the specific link didn't resolve — silent, since `carForPath()` returning null just skips `openDetail()` with no fallback UI. This is expected/inherent to the static-prerendering + GH Pages approach (same thing would happen for `/compare`/`/compare/similar` reloaded directly). Not a problem today since every car's URL is derived live from `modelYear`/`model`/`trim` (nothing stored in `data/evs.json` itself), but this session already renamed a few `id`s in place (Tesla Model Y "Premium AWD", Cybertruck, Toyota bZ4X→bZ) which silently broke their old URLs. **Revisit with a small dismissible "couldn't find that vehicle" banner once models start actually getting removed from the dataset** (rather than just renamed) — that's when a dead link is most likely to actually happen to a real visitor rather than just to us mid-edit.

# TODO: Cleaned up all 149 car "notes" fields (2026-08-21)

User spotted the GMC Sierra EV Elevation entry's `notes` field on the live site and flagged that it read like Claude's own research scratch-notes rather than customer-facing copy — phrases like "not independently confirmed this session," "Batch fix (2026-08-20): ... confirmed via a second research pass," and "consistent with how this dataset treats X elsewhere" mixed in with genuinely useful facts (no frunk, Super Cruise clarification, standard-vs-optional equipment). Dumped every entry's `notes` field to check scope — confirmed the pattern was universal: all 149 entries had a note, averaging ~640 characters before cleanup, in the exact same house style (this was written as internal batch-research documentation as the dataset was built up over many sessions, not as user-facing content).

Rewrote all 149 by hand: kept genuinely useful shopper-facing facts (no-frunk explanations, drivetrain-only availability, standard-vs-optional equipment call-outs, range-varies-by-wheel-size caveats, safety-system naming clarifications like "Super Cruise ≠ full self-driving," discontinuation/model-year notes), and cut research-process narration (session/sourcing caveats, "left null rather than guess," batch-fix logs, "consistent with this dataset" asides referencing internal field names or conventions). 132 of 149 entries changed (the other 17 were already clean); average note length dropped from ~640 to ~295 characters.

- Applied via a scratch Node script doing a targeted regex replace of just each entry's `"notes": "..."` line in `data/evs.json`, rather than a full JSON parse/stringify round-trip — the first attempt at this **did** round-trip through `JSON.parse`/`JSON.stringify`, which silently normalized every whole-number-with-a-decimal value in the file (`63.0` → `63`, `7.0` → `7`) throughout the *entire* dataset, not just the notes being touched. Caught via `git diff --stat` showing way more changed lines than the 132 notes being edited, reverted with `git checkout`, and redid it as a string-level regex replace that touches only the exact `notes` value text and leaves every other byte of the file untouched (confirmed after: diff shows exactly 132 changed lines, all of them `"notes"` lines).
- **Found and fixed a real data inconsistency in passing** (not a notes-wording issue): the Audi A6 e-tron **Premium Plus quattro** entry's note claimed "single rear motor base trim," which is self-contradictory for an AWD quattro trim — almost certainly copy-pasted from the Premium (base RWD) entry's note without updating for the AWD variant. Dropped the incorrect claim rather than asserting a new one, since the underlying `drivetrain`/`performance` fields (not touched in this pass) are the source of truth and weren't independently re-verified here — worth a quick manufacturer-spec check in a future pass to confirm those fields are correct too.

**Verified**: validated the rewritten `data/evs.json` parses as valid JSON with all 149 entries intact, confirmed via `git diff` that only `notes` lines changed (132 insertions/deletions, nothing else), spot-checked several entries' final text directly from the file (Sierra EV, Cybertruck, Porsche Cayenne Electric, Ioniq 5 N, the corrected A6 e-tron entry), and rebuilt `dist/` clean. Browser-based UI verification hit a stale-cache issue specific to this session's preview tooling (a proxy layer between the sandboxed browser and localhost kept serving pre-edit content even after restarting the dev server and opening fresh tabs) — worked around it by verifying directly against the server with `curl` and a `cache: "no-store"` fetch, both confirming the server serves the corrected content; not a real app issue, just a test-harness quirk in this session.

# TODO: Renamed Self-Driving → Hands-Free Driving, re-audited the data (2026-08-21)

Follow-up to the A6 e-tron note fix above: user asked whether that entry's underlying `drivetrain`/`performance` fields (not just the note) needed correcting too — checked, they were already correct (RWD 375hp vs AWD 466hp, properly differentiated); only the note text had the stray leftover phrase, already fixed.

That led to a bigger finding. The field was labeled "Self-Driving Capability" (`driverAssist.selfDriving.available`), but literally every note in this dataset describing one of these systems says some version of "not full self-driving" — the label never matched what the field actually measures. Audited every entry's value against its own note text and found it wasn't just a naming problem: **GM's Super Cruise was marked `available: false` in all 6 of its appearances**, while Ford's BlueCruise, Hyundai/Kia's Highway Driving Assist, and Tesla's FSD were marked `true` almost everywhere *they* appear — an undocumented, inconsistent bias, not real-world variation (`data/SCHEMA.md` never actually defined the cutoff between this field and the separate `adaptiveCruiseControl` boolean).

**Renamed the concept** to "Hands-Free Driving" — chosen over "Hands-Free *Highway* Driving" per explicit direction: geographic/rollout limits (highway-only today, Mercedes Drive Pilot's CA/NV-only restriction) don't disqualify a system, only whether it's genuinely hands-free under *some* real condition does. ("The where isn't as important as the if.")

- `js/fields.js`: `selfDriving`/`selfDrivingCost` field keys → `handsFreeDriving`/`handsFreeDrivingCost`, labels → "Hands-Free Driving" / "Hands-Free Driving Subscription".
- `js/render.js`: card badge text "Self-Driving" → "Hands-Free Driving".
- `data/SCHEMA.md`: renamed the JSON key in the example, swapped the example system from Tesla's ambiguous "Full Self-Driving (Supervised)" to the clearer BlueCruise, and added the field's first-ever written definition (a system counts if it goes genuinely hands-off under any real condition, contrasted directly against `adaptiveCruiseControl` for hands-on Level 2 systems that never do).
- `data/evs.json`: renamed `driverAssist.selfDriving` → `driverAssist.handsFreeDriving` on all 149 entries, then corrected `available`/`name`/`subscriptionUsdPerMonth` on 22 entries where the note's own description contradicted the stored value — all 6 GM Super Cruise appearances (Cadillac Optiq ×2, Lyriq ×2, Escalade IQ ×2, Vistiq ×2, Chevrolet Silverado EV ×2, GMC Sierra EV ×2, GMC Hummer EV Pickup/SUV ×2), both Ford F-150 Lightning BlueCruise trims (already had a $49.99/mo price recorded despite being marked unavailable — an internal contradiction), Chevrolet Equinox EV RS (optional Active Safety Package), Chevrolet Bolt RS (confirmed-optional per its own note — **left Bolt LT `false`, its note only says "may also be optional," genuinely unconfirmed**, and corrected the note text to preserve that hedge instead of the false certainty my earlier cleanup pass had introduced), Kia Niro EV Wave (its own note already described Highway Driving Assist II, just was never reflected in the field), both Mercedes EQS Sedan trims (SAE Level 3 Drive Pilot — genuinely hands-off, unlike EQE Sedan's lesser "Full Driving Assistance Package," correctly left alone), and Rivian R2 Performance AWD (Autonomy+, explicitly described in its own note as "hands-free" — corrected the note too, which had self-contradictorily called it "adaptive-cruise-tier" right next to that description).
- **Left unchanged, matching real distinctions already in the data**: Rivian R1S/R1T's "Highway Assist" (the dataset's own research already called it hands-on, not hands-free — matches the user's own expectation that Rivian's hands-free system is R2-only), BMW's "Driving Assistant Professional," Porsche's InnoDrive, and base-tier Nissan ProPILOT/Leaf ProPILOT (all Level 2 hands-on per their own notes, correctly excluded).
- **Flagged, not touched**: Tesla's Full Self-Driving (Supervised), true on all 11 Tesla entries — Tesla's own documentation requires hands on/near the wheel at all times, unlike the genuinely hands-off GM/Ford/Mercedes systems, so under a strict reading it may not actually qualify despite the name. Didn't flip this unilaterally given how visible/consequential it'd be (Tesla is a big share of the dataset) — needs an explicit decision. Also flagged: Lucid's DreamDrive Pro is described in 2 of 4 Lucid entries' notes as "hands-free" but never confirmed as actually orderable on those specific trims (described only as "an optional upgrade" lineup-wide) — left unconfirmed rather than guessed.
- Bumped `fields.js` v5→v6, `render.js` v14→v15, `app.js` v28→v29. Caught and fixed a real bug while doing this: only bumped the `fields.js` reference in `app.js`'s own import at first, but `filters.js`/`render.js`/`similar.js` each import `fields.js` directly with their own hardcoded version query string — left at `?v=5` they'd have loaded a second, stale copy of the `FIELDS` module (ES module caching is keyed by exact URL) with the old `selfDriving` key, silently reading `undefined` against the renamed JSON. Caught via the browser network log showing two different `fields.js` versions loading on the same page; fixed by bumping all four import sites to `?v=6` together.

**Verified**: `git diff --stat` shows only `notes`/`selfDriving`→`handsFreeDriving`/`available`/`name`/`subscriptionUsdPerMonth` lines changed in `data/evs.json`, JSON re-validated after every edit. Direct `curl` against the dev server (bypassing this session's flaky preview-tool cache) confirmed all four JS files serve consistent `?v=6` fields.js references. Ran the actual field accessor logic in Node against the real dataset: `handsFreeDriving` field correctly reads `true`/"Super Cruise"/$25 for Cadillac Optiq, and a full sweep confirmed Tesla (still true, unflagged), Rivian R1S (still false, hands-on), Rivian R2 Performance (now true) and R2 Premium (still false, unconfirmed), and BMW i4 (still false, Level 2 only) all come out exactly as intended. Rebuilt `dist/` clean.

**Follow-up same day**: asked whether Tesla's Full Self-Driving (Supervised) — the one flagged-but-unchanged entry above — should actually flip to `false` under the new hands-free definition, since Tesla's FSD nags for hands-on-wheel force when its cabin camera can't confirm attentiveness. User pushed back, correctly recalling that the camera has been able to substitute for physical hand contact for a while now (confirming attentiveness via gaze/attention rather than requiring literal torque on the wheel). Checked via web search rather than continuing from memory — confirmed: Tesla's current FSD (Supervised) is hands-off-capable, gated on eyes-on-road attention via the cabin camera, the same basic category as GM Super Cruise/Ford BlueCruise (hands-off, eyes-on), not the torque-sensed hands-on-only tier (BMW Driving Assistant Professional, Porsche InnoDrive). **No data change** — Tesla correctly stays `true`. One nuance worth remembering if this field ever grows a capability tier later: Mercedes' Drive Pilot is the one genuinely *eyes-off* (SAE Level 3) system in the dataset, a real step above the hands-off-but-eyes-on tier everything else (including Tesla) sits in — doesn't change today's binary field, just a distinction to keep in mind.

**Also confirmed, no action needed**: notes that still say things like "hands-free highway driver-assist, not full self-driving" — user confirmed this phrasing is fine to keep (it's accurate, not internal-process narration like what the earlier notes cleanup pass removed).

# TODO: Research CCS1 entries for NACS/Supercharger adapter availability — DONE (2026-08-22)

Idea floated 2026-08-21, not started at the time. **Completed same batch as the entry below** (full research pass across all 23 CCS1 makes, new `charging.nacsAdapter` field, wired into the filter/compare/detail UI) — see the "NACS/Supercharger adapter research" entry further down for the full writeup.

# TODO: Clickable logo returns home (2026-08-21)

User hit a real dead end: landed on an invalid car URL (typo'd a trim slug), and once there was no way back to the homepage via site nav short of opening a car and closing its modal (which happens to `replaceState` back to `/` as a side effect, not something discoverable). The topbar logo/"EV Compare" text looked clickable but wasn't wired to anything.

- `index.html` / `scripts/prerender.mjs`: converted the `.brand` wrapper from a plain `<div>` to `<button type="button" id="brandHome" aria-label="EV Compare — go to homepage">` (both copies, same markup otherwise) — real button, not a div with a click listener bolted on, so it's keyboard-focusable and activatable via Enter/Space by default, and screen readers announce it correctly.
- `css/styles.css`: added a button reset to `.brand` (`background: none; border: none; padding: 0; margin: 0; font: inherit; color: inherit; cursor: pointer;`) so it renders pixel-identical to the old div.
- `js/app.js`: new click handler — closes any open modal, resets `state.view` to `"results"`, and reuses the existing `leaveCompareUrl()` helper to unconditionally reset the URL/title to home and fire a GoatCounter pageview. Reusing that helper (rather than writing new history logic) means this is a real universal escape hatch: it resets the URL to `/` regardless of what it currently is, including an invalid/unmatched deep link — the exact case that started this.
- Bumped `styles.css` v15→v16, `app.js` v29→v30.

**Verified**: since the local dev server doesn't replicate GitHub Pages' 404→index.html redirect trick, reproduced the reported stuck state directly — pushed an invalid car path into the URL bar via `history.pushState` (matching what the real redirect flow leaves behind) and confirmed clicking the logo resets both the path and title back to home. Also verified it works from inside an open car detail modal (closes it and returns home in one click) and confirmed the button is a real, keyboard-focusable `<button>` with a correct `aria-label`. Rebuilt `dist/` clean, spot-checked both the homepage and a prerendered car page contain the new button.

# TODO: Double scrollbar on the compare view (2026-08-21)

User spotted a second, short (~1 inch), non-resizing scrollbar outside the compare table's own internal one. Root cause: `.content` (the shared wrapper for both the results view and the compare view) had `padding-bottom: 80px` — clearance so the floating "N selected" compare-bar pill doesn't sit on top of the last row of cards in the *results* view. The compare view doesn't need that (the floating bar is hidden while comparing, and `.compare-scroll` is already its own bounded, self-scrolling region), so that extra 80px was just tacked onto the very bottom of the page, pushing total document height past the viewport by a small, fixed amount — matching the "stays the same as I resize the window" symptom exactly, since it's a constant pixel offset, not something proportional to viewport size.

Fixed by moving that padding off the shared `.content` rule and onto `#viewResults` specifically, so the compare view no longer inherits clearance it doesn't need.

**Verified**: measured `document.documentElement.scrollHeight - window.innerHeight` in the browser with 5 cars selected for comparison at 1280×800 — 24px of overflow before the fix, 5px after (a genuine, separate ~5.5px mismatch between the topbar's real rendered height (65.5px) and a hardcoded "60px" baked into a couple of unrelated CSS calcs elsewhere — below any visible/draggable scrollbar threshold, not worth chasing further). Confirmed via git stash/pop that reverting the CSS change reproduces the larger 24px overflow, so this is the real fix and not a coincidental measurement. Rebuilt `dist/` clean.

# TODO: Per-entry lastVerifiedDate + README refresh (2026-08-21)

Two of four data ideas floated in one message; these two were quick/mechanical, done now:

**`lastVerifiedDate`** — added to all 149 entries (right after `id`), set to today (`2026-08-21`) via a script, same targeted-insertion approach as the earlier notes cleanup (confirmed via `git diff --stat`: exactly 149 pure insertions, nothing else touched). Internal provenance only, not shown in the app — tracks when each specific entry's specs were last confirmed against a real source, so staleness can be checked per-trim without re-auditing the whole dataset. Documented the field and the update rule in `data/SCHEMA.md`: bump it when re-researching/correcting that entry's actual data, not for unrelated changes (wording passes, schema/UI work) that didn't touch it.

**README refresh** — was dated Aug 19, before nearly everything from this session and the one before it (custom domain, the prerendering/JSON-LD pipeline, GitHub Actions deploy, GoatCounter, client-side routing, the three-state data convention, the Hands-Free Driving rename, Similar Vehicles, the escaping fix). Rewrote it to match current reality: corrected counts (149 trims / 83 models / 29 makes, was 128/72/28), added a real "How it's built" breakdown covering `router.js`/`similar.js`/`scripts/`/the deploy workflow/analytics (previously only listed the original 4 app files + the dataset), split Quick Start into "run the app" vs. "also preview the prerendered output," and corrected the "no build step" claim (true for the app itself, no longer true site-wide now that prerendering exists).

Not yet done — the other two ideas from the same message (a content-hash/version file for change detection, and compact shareable comparison URLs) need more design discussion before implementing; see chat for the proposed approach on each.

# TODO: Removed auto-compare-under-N-results, shipped the content-hash scheme (2026-08-22)

Two more requests in the same conversation.

**Removed the "collapse to compare view when filtered results are ≤5" behavior** — user felt the card grid is friendlier on mobile even with few results, and the manual star-then-Compare flow already covers the same need. Deleted `AUTO_COMPARE_THRESHOLD`/`autoCompare` from `js/app.js` entirely; `renderResultsView()` now shows the card grid whenever `state.view !== "compare"`, full stop, regardless of result count. Also caught and fixed a stale README bullet describing the removed behavior (had just been written this same session). Verified: narrowed a search down to 2 results and confirmed the card grid stays put rather than collapsing into the compare table.

**Shipped the content-hash idea from earlier today**, per a follow-up design (`hash`/`license`/`url` wrapper, hash covers `models` only): `data/evs.json`'s top level changed from a bare array to `{ hash, license, url, generatedAt, count, models: [...] }`.
- `hash` is `sha256:` + a SHA-256 of `JSON.stringify(models)` — deliberately *not* a hash of the whole wrapper (self-referential otherwise, since the hash field is itself part of what it'd be hashing). The value committed in the source file is cosmetic/whatever it was as of the last local build; `scripts/prerender.mjs` recomputes it fresh from the current `models` content on every deploy and overwrites `dist/data/evs.json` with the authoritative one — so it can never silently go stale the way a manually-bumped value would.
- New sibling file `dist/data/current.json` — `{ current: <same hash>, count, generatedAt }`, a few dozen bytes, so a third party checking for updates doesn't have to re-download the whole dataset just to find out nothing changed.
- `license` is `null` — deliberately not guessed (MIT is a code license; not obviously right for a data file, and it's a real declaration about how a scraped-and-curated automotive dataset can be reused). **Needs your input**, not a technical decision.
- Updated the only two read-sites (`js/app.js`'s fetch, `scripts/prerender.mjs`'s own top-of-file read) to destructure `.models` instead of treating the response as the array directly. Local dev (serving the raw source tree, no build step) keeps working unchanged, since the source file carries the same wrapper shape.
- Documented the new top-level shape in `data/SCHEMA.md` and `README.md`.

**Verified**: recomputed the hash independently from `dist/data/evs.json`'s own `models` content and confirmed it matches the embedded `hash` field and `current.json`'s value exactly. Bumped an unrelated field, rebuilt, confirmed the hash changed; reverted, rebuilt, confirmed it changed back to the original value — deterministic and content-sensitive, not just a timestamp in disguise. Loaded the app against the migrated source file in the browser: 149 cars load correctly, no console errors, manual multi-select-then-Compare flow works end to end. The `data/evs.json` diff for this migration is large (~25k lines) — expected and harmless: wrapping the array in an object shifts every existing line's indentation by one level; the actual `models` content is byte-identical to before (independently diffed to confirm).

**Follow-up same day — settled the `license` field**: user wasn't sure a real license made sense ("we scrape it from public sources, we don't own it") but didn't want to leave it blank either. Landed on **CC0-1.0** (public domain dedication — matches reality, since the underlying specs aren't copyrightable regardless of what's declared) paired with a separate, explicitly non-binding `attribution` field ("EV Compare (evcompare.org) — appreciated, not required") — a courtesy note with zero legal weight, distinct from CC BY's actual attribution *requirement*. Put the note in its own JSON field (not just README prose) so it travels with the data itself, visible to anyone who ends up with a copy secondhand. Updated `scripts/prerender.mjs` to carry `attribution` through to the build output alongside `license`. Confirmed the content hash is correctly unaffected by this change (still covers `models` only) — same hash value before and after, since no car data changed.

# TODO: Shareable comparison links + car-detail Share buttons (2026-08-22)

Built the design discussed earlier: a specific N-car comparison is now a real, reconstructable link, not just a cosmetic path.

- **`catalogId`** — added to every one of 149 `models` entries: a small permanent integer (1-149, current array order), assigned once and never reassigned/reused even if a car is later removed from the dataset. Exists purely to keep share URLs short; not shown anywhere in the app. Documented the assignment/retirement rule in `data/SCHEMA.md`.
- **`js/router.js`**: `compareSharePath(catalogIds)` builds `/compare/{id}-{id}-...`; `compareIdsFromPath(pathname)` parses it back, returning `null` for anything that isn't genuinely this pattern — importantly, this correctly falls through on the existing `/compare` and `/compare/similar` analytics-only paths ("similar" fails to parse as a number) rather than misfiring on them. Path segments, not a query string, so this rides the same 404.html deep-link mechanism already proven for car pages, rather than exercising query-string preservation, which nothing in this app has ever used before.
- **`js/app.js`**: a `catalogId → car` map built alongside the existing path index at load. Both `init()` (fresh/hard load) and the `popstate` handler (browser back/forward) now check for a `/compare/<ids>` URL and reconstruct `state.compareSet`/`state.view` from it — a car since removed from the dataset just gets silently skipped, so a link with one stale id among several still loads the rest; a link where *nothing* resolves falls back to the homepage, same as any other broken deep link. A **"Share" button** in the compare view (next to Clear all) builds the URL from the current selection, updates the address bar (`replaceState`, matching the existing "mode switch, not a new nav step" treatment already used for `/compare` itself), and copies it to the clipboard with a brief "Copied!" label flash.
- **`js/render.js`**: a matching **"Share" button** in the car detail modal, next to "Add to compare" — copies that car's own real, already-crawlable `/{year}/{model}/{trim}` URL. No new encoding needed there since individual car pages are already real prerendered pages with real URLs; this is purely a UI-convenience addition, reusing the identical copy-and-flash pattern (duplicated as a small `copyToClipboard` helper in each file, consistent with this codebase's existing `esc()`-duplication precedent, rather than threading a callback through render.js's already-long options object for something this self-contained).
- Confirmed with the user up front: shared comparison links can't carry JSON-LD or be seen by crawlers (same combinatorial-explosion reasoning as `/compare` itself — no way to prerender every combination of 149+ cars) unless the site ever moves to dynamic hosting; they're real and reconstructable for actual visitors, which was the actual ask.
- Caught and fixed a real bug of my own mid-build: the initial implementation reconstructed the compare view correctly but never updated `document.title` afterward (`closeModal()`'s call along that path unconditionally resets it to the home title, and nothing set it back) — fixed in both `init()` and the `popstate` handler to set `compareTitle(n)` after a successful reconstruction.
- Bumped `router.js` v4→v5, `render.js` v15→v16, `app.js` v32→v33 (twice — once for the feature, once for the title fix), with every importer's version-query reference updated to match (learned that lesson the hard way earlier this session).

**Verified**: unit-tested `compareIdsFromPath` directly in the browser console against good input, `/compare/similar`, bare `/compare`, a trailing slash, a car-detail path, and garbage (`1-abc-3`) — every case returned exactly what it should. Exercised the reconstruction path itself via `pushState` + a manual `popstate` dispatch (the local dev server can't replicate GitHub Pages' 404-redirect trick, so this is the closest faithful simulation, and it shares the same lookup code `init()` uses): a 3-car link reconstructed correctly with the right title; a link with one bad id among three correctly showed the two that resolved; an all-bad-ids link correctly fell back to the homepage. Verified both new Share buttons render and wire up correctly via screenshot (compare view's sits next to Clear All; the modal's sits next to Add to compare) and confirmed the built share URL (`/compare/1-2-3`) matches the actual selected cars' catalogIds. Clipboard-write itself couldn't be end-to-end verified through this session's automated browser tooling specifically (`navigator.clipboard` requires real document focus, which a scripted test lacks) — not a real-session concern, since an actual button click carries genuine focus, but flagged here rather than silently claimed as fully verified. Rebuilt `dist/` clean.

# TODO: Stale scroll position on modal/compare re-open (2026-08-22)

User: open a car's detail, scroll to the bottom, close it, open a different car — the new car's modal opened already scrolled to the bottom instead of the top. Suspected the compare grid had the same issue.

**Root cause, reproduced and confirmed directly** (not just inferred from reading the code): `openDetail()` already had `el.modalBody.scrollTop = 0` — it was just in the wrong order relative to un-hiding the modal. Setting `scrollTop` on an element that's still `hidden` (no layout box yet) is a no-op; when the element becomes visible again afterward, the browser restores whatever scroll offset it had *before* being hidden, not whatever was "written" in the meantime. Confirmed this exact mechanism in isolation in the browser console (scroll to 500, hide, write 0 while still hidden, un-hide → reads back 500, not 0) before touching any code, and confirmed the fix the same way (un-hide first, *then* write 0 → correctly reads back 0).

- **`js/app.js`'s `openDetail()`**: swapped the order — `el.detailModal.hidden = false` now runs before `el.modalBody.scrollTop = 0`, not after.
- **The compare grid had the identical bug**, confirmed by the same reproduce-in-isolation technique before fixing: `.compare-scroll` is a persistent element whose *content* (the `<table>`) gets swapped on every render, but nothing ever reset the scroll container's own `scrollTop`/`scrollLeft`, so leaving compare view and re-entering it (with entirely different, likely shorter, cars) kept showing the old scroll position. Added a `resetCompareScroll()` helper, called after `renderAll()` at each of the three places that actually *enter* compare view (the "Compare" button, "Compare all" from Similar Vehicles, and the share-link `popstate` reconstruction) — deliberately not on every re-render while already in compare view, so removing a car from an in-progress comparison doesn't yank your scroll position back to the top. (The fourth `state.view = "compare"` site, in `init()`'s fresh-load reconstruction, didn't need it — the very first render has nothing stale to reset.)
- Bumped `app.js` v33→v34.

**Verified**: reproduced both bugs live (scroll a car's modal to the bottom, close, open a different car → confirmed it opened scrolled to the bottom before the fix, to the top after; scrolled the compare grid to 300px, left and re-entered compare view with different cars selected → confirmed the same before/after). Then confirmed the fix doesn't over-fire: scrolled the compare grid, removed one car from the comparison (staying in compare view), confirmed scroll position was preserved rather than reset. Rebuilt `dist/` clean.

# TODO: NACS/Supercharger adapter research — all 91 CCS1 entries (2026-08-22)

Picked up the idea logged earlier today: for every CCS1-port entry, does the manufacturer offer a NACS adapter for Tesla Supercharger access, and what does it cost. Researched all 23 affected makes via real web search (manufacturer press releases, dealer parts listings, and press coverage — same sourcing standard as the rest of this dataset), batched by manufacturer rather than per-trim, since adapter policy is a brand-wide decision, not a trim-level one.

- **New field**: `charging.nacsAdapter: { available, costUsd }` on all 87 genuinely-CCS1 entries — `costUsd` is a number for a purchased adapter, `0` if included/standard, `null` if available but the manufacturer hasn't published a price (only Subaru Solterra, as of this research). `available: false` means no approved adapter exists at all yet, not "unresearched" — true for VinFast (no official adapter found for VF8/VF9) and specifically the Audi Q4 e-tron (excluded even though other Audi e-trons have one). Documented the field and its conventions in `data/SCHEMA.md`.
- **Wired into the app**: added `nacsAdapterAvailable` (boolean filter) and `nacsAdapterCost` (range filter, "Included" shown for $0) to `js/fields.js`, same group as the existing charging specs — the filter sidebar, compare table, and detail modal all pick it up automatically since they're generated from the shared `FIELDS` array, no other code changes needed.
- **Found and fixed two real, unrelated data bugs while researching**: the **Porsche Cayenne Electric** and **Mercedes-Benz CLA** are actually NACS-native (not CCS1 as the dataset had them) — both use a NACS port for DC fast charging paired with a separate J1772 port for AC, and both ship with an *included* reverse adapter (NACS-to-CCS1) for accessing non-Tesla CCS networks. Corrected `charging.portType` to `"NACS"` for both (4 entries total) and updated their `notes` to mention the included reverse adapter — a genuinely interesting, customer-relevant detail neither entry's notes previously captured. These 4 were excluded from the new `nacsAdapter` field entirely (it's scoped to CCS1 vehicles only, by design) rather than trying to model the reverse-direction adapter question, which wasn't what was asked.
- Research highlights worth knowing: pricing clusters roughly $175-275 depending on brand (Acura/Honda $225, Audi $200 for older Q8 e-tron but $0/included for the newer Q6 e-tron/A6 e-tron/e-tron GT family, BMW/MINI ~$175, GM $275, Ford/VW $200, Genesis/Hyundai Kona and Porsche Taycan/Macan Electric all complimentary/$0, Lucid $220, Mercedes $185 (Maybach EQS SUV gets it standard/$0), Nissan $235, Polestar/Volvo/Stellantis $230 — Volvo specifically only for EX30, since EC40/EX90 get it included).
- Bumped `fields.js` v6→v7, with every importer (`app.js`, `filters.js`, `render.js`, `similar.js`) updated to match.

**Verified**: applied the 87-entry data update via a targeted regex script (same approach as prior batches — caught and fixed a missing-trailing-comma bug in the first attempt, which broke JSON validity; the retry correctly appends a comma to whatever the prior last field was before inserting the new one). Confirmed `git diff` touches only the intended `nacsAdapter`/`portType`/`notes` lines, JSON re-validated after every edit. Confirmed the exact counts line up: 87 entries got the new field, 0 CCS1 entries were missed, the 4 reclassified entries moved from CCS1→NACS cleanly (149 total unchanged, NACS count 58→62). This session's browser-preview tooling hit its now-familiar caching quirk (a fresh page load kept showing the old sidebar without the two new filters, even after a full dev-server restart) — ruled out a real bug by doing a fully cache-busted dynamic import of the actual `renderFilterSidebar` function with a timestamped query string that had never been requested before, which rendered both new fields correctly; confirmed via `curl` that the server and every source file consistently reference the new field/version throughout. Rebuilt `dist/` clean.

# TODO: Top speed + tow capacity research — 96 fields across ~65 entries (2026-08-22)

Follow-up to "any other frequently-missing attributes worth tracking down" — a fresh null-frequency audit of the whole dataset flagged `performance.topSpeedMph` and `towCapacityLbs` as the next-most-common real gaps (113 entries missing one or both), distinct from previously-tried-and-deprioritized fields like cupholders/USB ports/seat-comfort booleans. Combined the two into one research pass rather than treating them separately, since both come from the same source type (manufacturer spec sheets); heat pump was considered and deliberately *not* chased with a dedicated pass — different, lower-hit-rate source type (feature lists, owner's manuals), left opportunistic-only.

Researched via real web search, batched by manufacturer (23 makes), same sourcing bar as the NACS batch — manufacturer spec/press pages, Edmunds/KBB, and reputable enthusiast sites, cross-checked against each other rather than trusted singly.

- **No new fields** — both `topSpeedMph` and `towCapacityLbs` already existed in the schema; this batch only filled existing `null`s with real figures. Applied `0` (not `null`) wherever a manufacturer explicitly confirmed a vehicle isn't tow-rated in the US (Fiat 500e, Mustang Mach-E, Lucid Air, both Genesis/Lexus/Audi GT-family entries, Porsche Taycan sedan, several Mercedes EQ sedans/EQB) — consistent with this dataset's existing "confirmed-not-tow-rated is a real `0`, not an `N/A`" convention, distinct from the genuine unknowns left as `null`.
- **US-vs-international conflicts handled conservatively**: top speed was treated as usually market-invariant (an electronic/motor limiter, not a certification artifact) and applied even when the clearest source was a UK/EU spec page, *unless* multiple sources actively disagreed. Tow capacity was treated as genuinely market-sensitive (hitch homologation differs by country) — declined wherever a source explicitly flagged the US rating as unconfirmed or different from the international one (both Hyundai Ioniq 6 trims, both Kona trims' tow figures, Lexus RZ, Nissan Ariya/Leaf tow, one Mercedes EQS sedan trim), rather than assuming the EU number carries over.
- **Applied real figures to 96 fields across ~65 entries** — full make list: Acura, Audi, BMW, Cadillac, Chevrolet, Dodge, Fiat, Ford, Genesis, GMC, Honda, Hyundai, Jeep, Kia, Lexus, Lucid, MINI, Mercedes-Benz, Nissan, Polestar, Porsche, Rivian, Subaru, Tesla, Toyota, VinFast, Volkswagen. Data spans both fields fairly evenly — no lopsided "all top speed, no tow" outcome.
- **Resolved an existing note's uncertainty**: the Honda Prologue EX's `notes` previously hedged that the 1,500 lb tow rating "appears tied to AWD/tow-package trims; it's unclear whether base FWD EX is tow-rated at all" — research this batch confirmed all Prologue trims (EX/Touring/Elite, FWD or AWD) share the same 1,500 lb rating, so the note was rewritten to state that plainly instead of hedging.
- **48 entries remain genuinely open** (down from 113) — left `null` rather than guessed, for one of two honest reasons: nothing reliable turned up (Cadillac Escalade IQ/Lyriq top speed, Chevrolet Blazer EV/Equinox EV top speed, GMC Hummer EV SUV top speed, Lexus ES top speed, Lucid Gravity Touring top speed, Nissan Ariya top speed, Rivian R1T Adventure/R2 top speed, Subaru Solterra/Uncharted Premium top speed, several Mercedes EQE/EQS trim-specific top speeds, Toyota bZ/bZ Woodland top speed, Tesla Model S both fields, Audi A6 e-tron both fields, BMW iX3 both fields), or sources actively conflicted on the US-specific figure (Hyundai Ioniq 6 tow, Kona tow, Lexus RZ, Nissan Ariya/Leaf tow, Mercedes CLA tow, one EQS sedan trim, Polestar 4 single-motor tow — AWD-only per Polestar's own rating).

**Verified**: applied via the same targeted-regex apply-script pattern as prior batches (scoped each replacement to a single car object's byte range, keyed off the next `"id":` occurrence, so it can't leak into a neighboring entry even when field values are as generic as `null`); `git diff --stat` showed exactly 96 insertions / 96 deletions for 96 field writes, one line changed per field, confirming no incidental corruption. JSON re-validated after applying. Re-ran the null-frequency query afterward and confirmed the remaining-gap list matches exactly what was intentionally left open (see above) — nothing silently skipped that should've been filled, nothing filled that was already set (e.g. `bmw-i4-2026-edrive40` already had `topSpeedMph: 118` before this batch and was correctly left untouched; `jeep-wagoneer-s-2025-launch-edition-awd` already had both fields and needed no change at all). Rebuilt `dist/`; confirmed the new content hash was recomputed and `current.json` matches it. Spot-checked two entries against the live dev server via `curl` (Acura ZDX A-Spec topSpeedMph: 131, Mustang Mach-E GT towCapacityLbs: 0) to confirm the served data matches the source file, sidestepping this session's known browser-preview caching quirk.

# TODO: Fixed invalid BreadcrumbList JSON-LD flagged by Google Search Console (2026-08-23)

User reported a Search Console rich-results error on `https://evcompare.org/2026/bz-woodland/woodland-premium/`: `Missing field "item" (in "itemListElement")`.

**Root cause**: the 4-level `BreadcrumbList` added back on 2026-08-21 (EV Compare → Make → Model → trim) deliberately left the Make and Model entries without an `item` URL, on the reasoning (recorded in that day's TODO entry) that "Schema.org's `ListItem.item` is optional" since there's no real crawlable page at those levels. That's technically true of the bare schema.org spec, but **wrong about what Google's rich-results validator actually requires**: Google's own structured-data guidelines mandate `item` on every `ListItem` except (optionally) the last one — the earlier design missed that distinction between the spec and Google's stricter subset of it. Confirmed live via `curl` on the reported URL before touching anything: positions 2/3 ("Toyota", "bZ Woodland") were exactly the ones missing `item`, matching the reported error precisely.

- **Fix, in `scripts/prerender.mjs`'s `breadcrumbLdFor()`**: collapsed the breadcrumb from 4 levels to 2 — EV Compare → this trim's own page — since those are the only two levels that correspond to real, crawlable URLs on this site (no separate make/model listing pages exist; it's a single-page app with client-side filtering). Both entries now carry a real `item` URL, so the "optional last item" question doesn't even come up.
- This is a site-wide fix, not specific to the reported page — `breadcrumbLdFor()` runs for all 149 car detail pages, so all of them had this same defect.

**Verified**: rebuilt `dist/` and confirmed the bZ Woodland Woodland Premium page's `BreadcrumbList` now has exactly 2 items, both with `item` URLs. Wrote a one-off script to parse the `BreadcrumbList` JSON-LD out of all 149 generated pages and check every non-last item has an `item` field — 149/149 pass, 0 failures. Didn't attempt to verify against Google's actual Rich Results Test tool (would require a live deploy + re-crawl, outside this session's tooling) — the fix directly addresses the specific field Search Console named as missing, applied identically everywhere the same defect existed.

# TODO: Replaced the pixel-art brand mark with a split-circle logo (2026-08-23)

User wasn't happy with the pixel-art "EV" mark (two tiny 8-bit cars) in the topbar/favicon and asked for alternatives. Explored several directions (split bolt, Venn rings + bolt, overlapping car silhouettes, bracketed bolt, wordmark-only, plug+checkmark) as rendered mockups; user picked a Venn-rings-and-bolt concept, then — while checking how it degraded at favicon size — we landed on something better: a single circle, split green/blue down the middle, with a dark bolt through the center. Same "two things being compared, it's electric" idea as the rings, but as one solid silhouette instead of two thin overlapping strokes, so it holds up all the way down to 16px without a separate simplified variant.

- **New mark**: a 32x32 viewBox SVG — a circle clipped into left (accent green `#4ee08a`) and right (accent blue `#5aa2ff`) halves, with a small lightning-bolt polygon in the site's dark background color (`#0b0d12`) over the middle for contrast against both halves. Fully self-contained, fixed hex values — unlike a CSS-var-driven approach, the same markup works unchanged in the topbar, the favicon, and any future static export (README, social profile), since its internal contrast (dark bolt on bright green/blue) doesn't depend on the surrounding page's theme.
- **Topbar** (`index.html` and `scripts/prerender.mjs`, `.brand-mark` span): replaced the old 68x17 pixel-sprite SVG with the new mark at 28x28. Also stripped `.brand-mark`'s CSS (`css/styles.css`) — it had a leftover diagonal green→blue gradient pill background (`padding`/`border-radius`/`background: linear-gradient(...)`) dating from an earlier single-color-bolt-on-a-badge design that predated the pixel sprite; redundant now that the mark itself already carries the green/blue split, so the pill was just visual noise behind it.
- **Favicon** (`<link rel="icon">` in both files): replaced the old 16x16 pixel gift-box-pattern data-URI with the same circle-and-bolt design, no background plate — confirmed via mockup that the green/blue split alone gives enough contrast against both light and dark browser tab bars, so an extra backing plate would just be unnecessary weight.
- Bumped the versioned `styles.css?v=17→18` reference in both files, consistent with this codebase's cache-busting convention for every asset change.
- **Cleaned up `scripts/og-image-template.html`**: its `icon` and `header` canvas-rendering modes existed specifically to derive the old pixel-art favicon/topbar mark (drawing `BOLT_ICON` on a gradient badge, and a mini two-car+bolt topbar composition) — both now genuinely dead code, since neither asset is sourced from this template anymore. Deleted both modes and their now-unused `BOLT_ICON`/`BOLT_ICON_COLORS`/`drawBoltIcon` helpers, and corrected the file's top comment, which previously (and now wrongly) described this template as "the app's brand mark / favicon source." The `og`/`logo` modes are untouched — the 1200x600 OG banner and the square `logo.png` still render the original two-car race scene, which intentionally doesn't match the new mark yet; flagged as a separate follow-up rather than scope-creeping it into this change, since it's a materially bigger, separately-authored piece of art.

**Verified**: rebuilt `dist/`; confirmed via `grep` that both the homepage and a prerendered car-detail page (`bz-woodland/woodland-premium`) carry the new mark and favicon markup identically. Loaded the app in-browser and visually confirmed the mark renders correctly in both light and dark theme (toggled live via the theme button) with no leftover gradient pill and no console errors. Confirmed `scripts/prerender.mjs` still runs clean end-to-end after the `og-image-template.html` cleanup (unrelated file, but wanted to make sure nothing else referenced the removed modes).

**Same-day follow-up — fixed a real color mismatch the user spotted**: the mark's hardcoded green/blue (`#4ee08a`/`#5aa2ff`) are the *dark* theme's `--accent`/`--accent-2` values, so the mark looked fine in dark mode but visibly brighter/more neon than the actual UI in light mode, where sliders and links use the deeper `#16a35e`/`#2a6fdb`. First attempt just hardcoded the mark to the light-theme colors instead — which predictably only moved the mismatch to dark theme (verified by screenshotting both before settling on a fix, not just assuming). The header mark is inline HTML though, not a data-URI, so it can reference live CSS custom properties: switched it to `var(--accent)`/`var(--accent-2)`/`var(--accent-contrast)` — the exact same tokens driving every slider fill and link color already — giving a pixel-perfect match in both themes with no compromise. The favicon is a genuinely separate data-URI resource with no access to page CSS, so it has no choice but a single fixed pair; kept it on the muted `#16a35e`/`#2a6fdb` values, which earlier testing had already shown read fine against both light and dark browser tab bars.

**Verified**: rebuilt `dist/`, read `getComputedStyle(document.documentElement).getPropertyValue('--accent')` directly in-browser in both themes and visually confirmed the header mark's green/blue exactly matches the sidebar's slider-fill color in each — dark theme first, then light theme via a live `data-theme` override, no restart needed. No console errors either time.

**Same-day follow-up #2 — favicon bolt color**: swapped the favicon's bolt fill from the dark navy `#0b0d12` to plain white — against the favicon's own muted `#16a35e`/`#2a6fdb` circle halves (medium-saturation, not the bright neon dark-theme colors), white reads better than a near-black bolt. Doesn't affect the header mark, which already uses `var(--accent-contrast)` and picks the right contrast color per theme on its own.

# TODO: Added a homepage intro line and a per-car summary sentence (2026-08-23)

User asked for two small content additions: a one-line "what is this page" summary at the top of the homepage (open to wording, mentioned the site being US-focused was worth calling out), and some plain-English summary text on the car detail view — both live and static — following roughly `"The {{make}} {{model}} {{trim}} is a {{maxPassengers}}-seat {{bodyStyle}} with {{epaMiles}} range and MSRP {{msrp}}."`.

- **Homepage intro**: added `<p class="intro-line">View and compare electric vehicles sold in the US. Click a model or use the filters to get started.</p>` directly inside `#viewResults`, above the sort toolbar — in both `index.html` and `scripts/prerender.mjs` (the usual shared-shell duplication in this codebase). Placing it inside `#viewResults` rather than the outer layout means it only shows in the default results view, not compare view, with no extra JS needed — it's just not in the DOM subtree that gets hidden. Mentions "sold in the US" per the request, since this dataset is US-market only (trims/pricing/availability all differ by market) and that's a genuine, useful disambiguation for a first-time visitor.
- **Per-car summary sentence**: added `carSummarySentence(car)` to `js/fields.js` — builds a sentence like *"The 2026 Toyota bZ Woodland Woodland Premium is a 5-seat SUV with 281 miles of estimated range and an MSRP of $47,400."*, gracefully dropping whichever clauses are missing data (falls back to `"an electric vehicle"` if `bodyStyle` is somehow absent, drops the seat-count phrase if `maxPassengers` is null, drops range/price clauses independently). Put it in `fields.js` rather than duplicating the logic, since `fields.js` is already cross-imported by both the browser app and `scripts/prerender.mjs` (same pattern already used for `router.js`/`similar.js`) — this way the live modal and the static page's description can never quietly drift into disagreeing about the same car.
  - Deliberately returns the bare sentence with **no trailing CTA** — an early draft baked in "Full specs below.", but that's only true in the modal (where a spec table genuinely follows); the meta description and the no-JS `<noscript>` fallback don't have one below them, so hard-coding that phrase into the shared function would've made it actively wrong in two of its three call sites. Each call site appends its own fitting ending instead: the modal appends "Full specs below.", the meta description appends "Full specs and side-by-side comparisons." (replacing the old compact `summaryLine()` construction, now deleted as dead code since this was its only caller), and the `<noscript>` block uses the bare sentence as-is.
- **Live modal** (`js/render.js`): renders the sentence as a new `.modal-summary` paragraph between the price and the spec sections.
- Bumped versions for everything touched: `fields.js` v7→v8 (new export) with all four importers updated (`app.js`, `filters.js`, `render.js`, `similar.js`), `render.js` v16→v17 (new import + markup), `app.js` v34→v35 (its own import of `render.js` changed), `styles.css` v18→v19 (new `.intro-line`/`.modal-summary` rules).

**Verified**: rebuilt `dist/`; confirmed via `grep` that the bZ Woodland Woodland Premium page's meta description now reads "The 2026 Toyota bZ Woodland Woodland Premium is a 5-seat SUV with 281 miles of estimated range and an MSRP of $47,400. Full specs and side-by-side comparisons." and its `<noscript>` paragraph carries the bare sentence. Loaded the app live: confirmed the intro line renders above the sort toolbar on the homepage, and opening a car's detail modal (Acura ZDX) shows the summary sentence correctly between the price and the spec table, reading naturally. No console errors in either case.

**Same-day follow-up #3 — promoted the summary sentence out of `<noscript>` into real static content**: user noticed the sentence wasn't showing up in "the static content source" and asked whether that'd affect crawlers, then specifically whether it'd be better placed in the JSON-LD instead. Checked the live page via `curl`: the sentence genuinely was already in the raw HTML (meta description + `<noscript>`), just not anywhere in the normal visible body — the actual detail content only exists once `js/app.js`'s `init()` runs and auto-opens the matching car's modal (confirmed this auto-open logic is real, not assumed, by reading it directly). For Google specifically this isn't a real risk (Googlebot renders JS), but other crawlers that don't execute JS only ever see the meta tag and noscript block, not real page content — and JSON-LD wouldn't help either, since it's rich-result metadata Google doesn't treat as page content for relevance/ranking, not a substitute for visible text.

- Added a genuinely-visible (not noscript-wrapped) `#staticCarIntro` block to `scripts/prerender.mjs`'s per-car page template — an `<h1>` + the summary sentence, rendered directly in the page body right after the topbar. This is real, always-present static content matching the file's own stated goal ("crawlers and AI agents see actual content... without running JS") — previously nothing about a specific car's content was visible without JS at all, only the noscript fallback (present in raw source, but never rendered by an actual browser once scripting is enabled).
- `js/app.js`'s `init()` now removes `#staticCarIntro` unconditionally as its first action — once JS is running, the real modal (or the homepage fallback, if the car's since been removed from the dataset) takes over, so the static intro would otherwise sit duplicated/invisible underneath it. No-op on the homepage, where the element doesn't exist.
- Also added `description: carSummarySentence(car)` to the `Car` JSON-LD object in `jsonLdFor()` — a low-cost addition since the field is genuinely valid schema.org, useful to AI/LLM systems that parse structured data preferentially, but explicitly not a substitute for the real visible content above; it doesn't move the needle on traditional search ranking the way real body text does.
- Bumped `styles.css` v19→v20 (new `.static-car-intro` rules), `app.js` v35→v36 (new removal logic).

**Verified**: rebuilt `dist/`; confirmed via `grep` that the new `#staticCarIntro` block and the JSON-LD `description` field both render correctly in the static output, and that the `Car` JSON-LD still parses as valid JSON. The configured local dev server serves the raw source tree, not `dist/`, so it can't exercise real per-car static pages or the GitHub Pages deep-link trick — started a throwaway `python3 -m http.server` rooted at `dist/` instead, specifically to test this faithfully. Loaded a car's real static page directly by URL: confirmed the static intro block appears correctly in the initial response, JS boots and auto-opens that exact car's detail modal (matching content, richer than the static fallback), and `document.getElementById('staticCarIntro')` returns `null` afterward — genuinely removed, not just covered up. Confirmed the homepage still loads cleanly with no console errors (the removal call is a harmless no-op there). Stopped the throwaway server once done.

**Same-day follow-up #4 — full static spec table, not just a one-liner**: asked the user to look at a real page (`/2024/zdx/type-s-awd/`) as a non-JS crawler would (via `curl`), which surfaced two real gaps: (1) the summary sentence was in `<meta>`/`<noscript>` but not in the normal visible body, since the actual detail content is 100% JS-built; (2) a follow-up question — "would JSON-LD be better?" — no: JSON-LD is rich-result metadata, not a channel Google (or anything else) treats as page content for relevance/ranking, so it doesn't substitute for real visible text. Checked what a non-rendering crawler (GPTBot, ClaudeBot, CCBot, etc. — documented as raw-HTTP fetchers, not browsers) would actually see: title/meta/JSON-LD plus one sentence, none of the other ~25 spec fields in any form. User asked for the full non-interactive render rather than a trimmed-down subset.

- **Moved `fmtVal`/`fieldByKey` from `js/render.js` into `js/fields.js`** (as exports, with fields.js gaining its own small local `esc()` to support them — a 4th copy of that same 4-line helper, consistent with the precedent already set by render.js/filters.js/prerender.mjs each carrying their own). This was necessary, not just tidier: `scripts/prerender.mjs` runs in Node and can't import `render.js` (it manipulates a real DOM), but it *can* import `fields.js` (pure data/formatting, no DOM) — same cross-import pattern already used for `router.js`/`similar.js`. Without this move, the static spec table and the live modal would have no way to guarantee they format the same value identically.
- **Renamed `#staticCarIntro` → `#staticCarDetail`** (`js/app.js`'s removal call updated to match) and expanded it in `scripts/prerender.mjs` into a complete, real rendering of the car: title, trim, price, summary sentence, the full spec table (all 7 groups, same `FIELDS`/`GROUP_ORDER` grouping as the modal, via two new small helpers `staticSpecSections()`/`staticLinksBlock()`), the manufacturer/review/EPA-sticker/fueleconomy links, notes, a back-to-home link, and a plain (non-interactive — no diff badges, no "compare all" button, since those are meaningless without JS) list of links to similar vehicles. Reuses the modal's own CSS classes (`.modal-title`/`.modal-trim`/`.modal-price`/`.modal-summary`/`.modal-section`/`.modal-grid`/`.modal-row`/`.modal-links`) directly rather than inventing parallel ones, since the content is structurally identical to the modal, just non-interactive and outside a modal backdrop.
- **Deleted the `<noscript>` block entirely** — everything it held (title, summary, back-link, similar-vehicle links) is now genuinely visible static content instead of conditionally-hidden-behind-noscript content, which no longer needs the noscript wrapper and was starting to duplicate the new `#staticCarDetail` block verbatim.
- Added a small `safeHref()` to `prerender.mjs` (mirroring `render.js`'s own) so the static links get the same http(s)-only validation as the live modal's links.
- Bumped everything this actually touched: `fields.js` v8→v9 (new exports), its four importers (`app.js`, `filters.js`, `render.js`, `similar.js`) updated to match; `render.js` v17→v18 (removed local `fmtVal`/`fieldByKey`, now imports them) and its own `similar.js` reference bumped v5→v6 purely because `similar.js`'s content changed too (its `fields.js` import line); `app.js` v36→v37 (its own `fields.js`/`filters.js`/`render.js` references all changed, plus the rename); `styles.css` v20→v21 (new `.static-car-detail`/`.static-similar-list` rules, replacing `.static-car-intro`).

**Verified**: rebuilt `dist/`; confirmed the full spec table, links, notes, and similar-vehicles list all render correctly and completely in the raw static HTML for a real page, and that both JSON-LD blocks still parse as valid JSON. Confirmed `grep -c noscript` returns 0 — no remnants. Started the same throwaway `dist/`-rooted `python3 -m http.server` used for the previous follow-up (the configured dev server can't serve real per-car static paths) and drove the actual page: the full static spec table renders on initial load, JS boots and auto-opens the matching detail modal with identical values (confirming the `fmtVal`/`fieldByKey` move didn't change any live-rendered output), `#staticCarDetail` is `null` afterward, and the homepage plus a manual compare-view test both ran clean with zero console errors in every case. Stopped the throwaway server once done.

# TODO: Added real `<lastmod>` to sitemap.xml entries (2026-08-23)

Follow-up to a sitemap question — confirmed `sitemap.xml` is fully dynamic (regenerated from the live `cars` array on every build, not hand-maintained), but it only ever emitted `<loc>`. User asked to add `<lastmod>`, since it's a real crawl-priority signal Google uses and every car already tracks a `lastVerifiedDate`.

- **Deliberately did *not* stamp every URL with the build's own timestamp.** `scripts/prerender.mjs` regenerates all 150 pages on every deploy regardless of whether anything meaningfully changed, so a naive `new Date()` for every entry would mark the whole site "modified today" on every push — exactly the kind of always-changing, ungenuine signal Google's own guidance warns erodes a crawler's trust in `lastmod` over time.
- Each car page's `<lastmod>` is its own `lastVerifiedDate` instead — already tracked for exactly this kind of provenance (per `data/SCHEMA.md`: bumped only when that entry's actual specs are re-researched/corrected, not for unrelated template/wording passes). Genuine, per-page, non-gamed.
- The homepage's `<lastmod>` uses the *most recent* `lastVerifiedDate` across all 149 cars, computed fresh each build — a defensible proxy for "this listing's underlying data last changed," rather than either a static value or the same always-today problem.
- `buildSitemap()` now takes `{ loc, lastmod }` entries instead of bare URL strings; `main()` builds `sitemapEntries` alongside the existing per-car page-writing loop instead of a separate pass.

**Verified**: rebuilt `dist/`; parsed `dist/sitemap.xml` with Python's `xml.etree.ElementTree` to confirm it's well-formed XML, all 150 `<url>` entries (homepage + 149 cars) carry a `<lastmod>`, and none are missing one. Spot-checked the raw output — homepage and the first several car entries all correctly show `2026-08-21`, matching every entry's current `lastVerifiedDate` (all entries happen to share that date today, from the bulk field-add done earlier this session).

# TODO: Redesigned the OG/Twitter card image and logo.png around the new mark (2026-08-23)

User noticed `assets/og-image.png` (the Open Graph/Twitter/Discord unfurl image) still showed the old two-pixel-car race scene — a completely different visual style from the new split-circle mark, and a leftover from before this session's logo work. Agreed on a full redesign rather than trying to patch pixel art into consistency with a flat modern mark: "No more pixel art. Just a right-size version of our new logo."

- **Rewrote `scripts/og-image-template.html`** — deleted all the pixel-art drawing code (`CAR_RIGHT`/`CAR_LEFT` grids, `drawSprite`, `drawBolt`/`drawBoltGlow`, the retro horizon-glow bars, `mirror`/`recolor` helpers) and replaced it with a single `drawBrandMark(ctx, cx, cy, radius)` function that draws the *exact same geometry* as the real SVG mark (a circle clipped into green/blue halves via `translate`+`scale` into the same 32-unit coordinate space the SVG viewBox uses, then the same bolt polygon points) — just on a `<canvas>` at a chosen scale instead of inline SVG. This guarantees the asset can't visually drift from the real favicon/topbar mark the way the old race scene eventually did.
- **`og` mode** (1200x600): a clean horizontal lockup — mark, then "EV Compare" wordmark, centered together as a block (width computed from `ctx.measureText` rather than a hardcoded guess), with the homepage's own tagline ("View and compare electric vehicles sold in the US") centered below. Plain dark background, no retro/atmosphere effects.
- **`logo` mode** (512x512, README/social-profile scale): just the mark, large and centered, no text.
- Updated the file's own top comment, which still described the (now nonexistent) divergence between this asset and the real mark.

**A real bug, caught by the user, not assumed away**: after generating both PNGs (via the browser tooling's `canvas.toDataURL()`, since there's no local headless-Chrome CLI in this environment) and sending them over, the user said the OG image looked right but the logo "looks odd" and couldn't say more precisely why. Rather than guess at a design tweak, inspected the actual file's PNG byte structure directly (walked the chunk table with Python) and found it was genuinely corrupted — the IDAT stream cut off mid-file instead of ending in a proper `IEND` chunk. Root cause: the logo's base64 `toDataURL()` output was short enough to return inline in a tool result rather than auto-saving to a file (unlike the larger OG image, which safely round-tripped through an auto-saved file), and hand-transcribing that long inline string through a Bash heredoc silently dropped/corrupted part of it. Fixed by forcing the same reliable file-based path for the small case too — padded the JS return value past the auto-save size threshold, decoded the real payload back out of the resulting file with Python, and verified the chunk table walks cleanly to a real `IEND` before trusting it — then re-sent the corrected file, which the user confirmed. Lesson: verify binary asset integrity structurally (chunk table, hash, whatever's applicable) before treating a "looks odd" report as a design problem, rather than iterating on the visual first.

**Verified**: rebuilt `dist/`; confirmed both `assets/og-image.png` (1200x600) and `assets/logo.png` (512x512) are valid PNGs with clean chunk tables ending in `IEND`, and that `dist/assets/` picked up both via the existing `cpSync` step. Visually confirmed both renders via direct file inspection (not just a browser screenshot, which can't be trusted at odd viewport sizes — see the earlier follow-up in this same session where the preview pane's minimum size made a correctly-sized canvas look mispositioned).

**Same-day follow-up — cache-busted the og:image URL itself**: pushed and deployed, but the user's live Discord test still showed the old pixel-art image 10+ minutes later, even after busting the *page's* own unfurl cache with a `?v=2` query string. Root cause: Discord (and most platforms) cache a fetched `og:image` by its own exact URL, separately from however aggressively they revalidate the page that links to it — bumping the page's URL doesn't force a re-fetch of an unchanged image URL.

- Added `ogImageVersion` to `scripts/prerender.mjs` — first 10 hex chars of a sha256 of `assets/og-image.png`'s actual bytes, computed fresh at build time (same content-hash philosophy already used for `data/evs.json`'s `hash` field — changes if and only if the file's content actually changes, nothing to remember to bump by hand).
- Appended `?v=${ogImageVersion}` to the `og:image`/`twitter:image` URL in both places it's built: `pageFor()`'s `ogImage` (all 149 car pages) and — new — `buildHomepage()`, which previously copied `index.html`'s two hardcoded image-URL meta tags through completely unmodified; now does a targeted `.replaceAll()` on that literal URL string alongside its existing JSON-LD injection.
- Confirmed the computed version (`9b1be8e7c4`) matches `sha256sum assets/og-image.png`'s first 10 characters exactly, and that it now appears identically in both `dist/index.html` and every car page's `og:image`/`twitter:image` tags.
- Not yet re-verified against a live Discord unfurl at the time of this entry — pending another deploy + the user's own live test.

**Confirmed working**: user tested live in Discord after deploy — new og:image showed up correctly.

# TODO: Moved the detail-modal Share button to the header, added an icon (2026-08-27)

User feedback: the Share button was buried at the very bottom of the modal, past the entire spec table/links/notes — asked to move it up next to the model name, and to consider an icon since there's no unambiguous "share" emoji to reach for instead.

- **`js/render.js`**: wrapped the title in a new `.modal-header-row` (flex, `align-items: center`, gap — not `space-between`, so the button sits right after the title text rather than stretching to the far edge, which would otherwise put it in the same corner as the circular `×` close button) and moved `#modalShareBtn` into it. Removed it from `.modal-actions`, which now holds just the Add/Remove-from-compare button.
- **Icon**: hand-drawn inline SVG (`SHARE_ICON` constant) — the standard "upward arrow escaping an open-top tray" glyph (the iOS/generic share icon), matching this app's existing convention of hand-drawn SVG rather than an icon library or emoji (confirmed there isn't a clean single-emoji match for "share" either, per the user's own read).
- **`css/styles.css`**: added `.modal-header-row` (with a nested override zeroing `.modal-title`'s own `margin-bottom` when inside it, since `.modal-title` is also reused unwrapped on the static per-car page's `<h1>` and shouldn't change there) and `.modal-share-btn` (`inline-flex` so the icon and text align on one line).
- Bumped `render.js` v18→v19 (import + markup change) and its importer `app.js` v37→v38, plus `styles.css` v21→v22, with both referenced from `index.html`/`scripts/prerender.mjs`.

**Verified**: rebuilt `dist/`; opened a car's detail modal live and confirmed via screenshot the Share button now sits directly beside the model name (icon + "Share" text), clear of the close button, with the spec table/links/notes below and only "Add to compare" remaining in the bottom action row. Clicked the button directly — fires without error. Checked console/network logs and confirmed zero errors from this change (one stale 404 in the log was a leftover from unrelated earlier-session debugging navigation, not this change — traced via the network log entries, which show every actually-relevant asset for this change, `styles.css?v=22`/`app.js?v=38`/`render.js?v=19`, loading 200 OK).

**Same-day follow-up — same treatment for the compare-grid Share button**: the compare view's own Share button (next to "Clear all") was still plain text. Renamed `.modal-share-btn` → the more general `.icon-btn` (nothing modal-specific about `display:inline-flex;align-items:center;gap:6px`) in `css/styles.css` and its one reference in `js/render.js`, then added the identical hand-drawn share-icon SVG inline to `#shareCompareBtn` in both `index.html` and `scripts/prerender.mjs` (that button is static markup in the shared app shell, not JS-templated like the modal's, so the icon had to be inlined directly rather than referencing the `SHARE_ICON` JS constant). Bumped `render.js` v19→v20 (class rename), `app.js` v38→v39 (its `render.js` reference), `styles.css` v22→v23.

**Verified**: rebuilt `dist/`; selected two cars, opened compare view, and confirmed via screenshot the Share button in the compare header now shows the same icon+text treatment as the modal's. Clicked it directly — fires without error. Confirmed via network log that every changed asset (`styles.css?v=23`, `app.js?v=39`, `render.js?v=20`) loaded 200 OK on a fresh navigation.

# TODO: Fixed ambiguous remove-X ownership in the compare grid (2026-08-27)

User's screenshot showed the issue clearly: each car's remove (×) button was floated to the full width of its `<th>`, which — since table columns auto-size wider than their actual content — put real visual distance between a car's info block and its own × button, closer to looking like it belonged to the *next* car. Asked for either a visual "box" per car or moving the × closer.

- **`js/render.js`**: wrapped the title and the remove button together in a new `.compare-col-header-row` (flex, `justify-content: space-between`), so the × always sits directly against its own car's title rather than wherever `float: right` happened to land it across a variable-width cell.
- **`css/styles.css`**: added a `border-left` on every table cell except the first column (the sticky row-label column) — a vertical divider running from the header straight down through every data row, so each car reads as one continuous lane and there's no ambiguity scanning any row, not just the header. Removed `.compare-col-remove`'s now-unnecessary `float: right`.
- Bumped `render.js` v20→v21, `app.js` v39→v40 (its `render.js` reference), `styles.css` v23→v24.

**Verified**: rebuilt `dist/`; selected 2 cars in the live app and confirmed via screenshot that each × now sits immediately next to its own car's title, with a clean vertical divider separating the two columns all the way down through every spec row. Clicked a × directly — `compareCount` correctly went from 2 to 1. Confirmed via network log that `styles.css?v=24`/`app.js?v=40`/`render.js?v=21` all loaded 200 OK on a fresh navigation, no console errors introduced by this change.

# TODO: Excluded the blurred background from find-in-page while the detail modal is open (2026-08-27)

User reported: searching (Ctrl/Cmd+F) for a spec while the detail modal is open — e.g. "heat pump" — also highlights matches in the blurred card-grid background behind it. Root cause: `.modal-backdrop`'s `backdrop-filter: blur(3px)` is purely a rendering effect; it doesn't touch the DOM's actual interactivity, so the browser's native find-in-page (which works off the accessibility tree, not pixels) still happily matches and highlights text back there.

- **`js/app.js`**: toggles the HTML `inert` attribute on `.topbar` and `.layout` (the two visible siblings of `#detailModal` — everything in the app shell except the modal itself) in `openDetail()`/`closeModal()`, the single choke point both hold (confirmed via grep — nothing else touches `detailModal.hidden`). `inert` is a standards-based, broadly-supported (Chrome/Edge 102+, Firefox 112+, Safari 15.5+) way to pull a subtree out of the tab order, the accessibility tree, *and* native find-in-page all at once — no ARIA hand-rolling, no custom find-interception logic.
- Bumped `app.js` v40→v41.

**Verified**: rebuilt `dist/`; opened a car's detail modal live and confirmed `document.querySelector('.topbar').inert`/`'.layout'.inert` are both `true` while it's open. Directly tested the actual mechanism find-in-page relies on: called `.focus()` on a background button (`resetFiltersBtn`) while the modal was open — the browser refused, `document.activeElement` stayed `BODY` — then closed the modal and confirmed the same button became focusable again (`inert` back to `false` on both elements). No console errors introduced; confirmed `app.js?v=41` loaded 200 OK.

# TODO: Data sanity audit — classification, coverage gaps, scope (2026-08-27)

User asked for a sanity check of the data itself: missing models/trims, missing fields worth
sourcing, and anything failing a smell test. Findings and the queue that came out of it.

## 1. `bodyStyle` "SUV" vs "Crossover" is not a real distinction — decide and fix

The user spotted this (why is the Mach-E not a Crossover? why is EX30 an SUV but EC40 a
Crossover?). It's worse than inconsistent: **no field in the dataset separates the two.**
Every numeric range overlaps —

| | Crossover (6) | SUV (95) |
| --- | --- | --- |
| ground clearance | 5.3–7.0 in | 5.2–9.8 in |
| max cargo | 42.6–55.5 cu ft | 31.9–120 cu ft |
| max passengers | 5 | 5–7 |
| MSRP | $29,990–64,995 | $32,975–180,000 |

and the specific pairs are *inverted*, not merely arbitrary:

- **EX30 (SUV) vs EC40 (Crossover)** — same make, both 7.0in, but the EC40 has *more* cargo
  (42.6 vs 31.9) while sitting in the smaller-sounding bucket.
- **Mach-E (SUV) at 5.2in** is the lowest-riding vehicle in *either* bucket.
- **Ioniq 5 (SUV) and EV6 (Crossover)** are E-GMP platform siblings at identical 6.1in.
- 16 "SUV" records have less cargo than the largest "Crossover".

The industry definition doesn't rescue it either: crossover = unibody, SUV = body-on-frame,
and essentially every EV here is unibody — applied strictly, nearly all 95 SUVs are crossovers.

**Recommended fix — don't invent our own rule, adopt EPA's.** `fueleconomy.gov` already
assigns every US-market vehicle an official size class, it's the source we already cite for
range, and it's on a **REST API** so this is a script rather than a research slog:

```
https://www.fueleconomy.gov/ws/rest/vehicle/{id}   ->  XML incl. <VClass>
```

Verified by hand against three records:

| record | EPA `VClass` |
| --- | --- |
| Volvo EX30 (id 48450) | Small Sport Utility Vehicle 2WD |
| Ford Mustang Mach-E (id 50204) | Small Sport Utility Vehicle 2WD |
| Hyundai Ioniq 9 (id 49661) | Standard Sport Utility Vehicle 2WD |

Note it resolves the exact case in dispute: EX30 and Mach-E land in the *same* class.

- [x] **Done 2026-08-28.** `epaSizeClass` added to all 149 records, 126 populated from
      `npm run fetch-epa` (new), 23 null for want of an EPA id. EPA's drivetrain suffix is
      stripped since that isn't size. Distribution: 43 Small SUV, 35 Standard SUV, 11 Large
      Cars, 9 Midsize, 8 Compact, 7 Standard Pickup, 4+2 Station Wagons, 3 Special Purpose,
      2 Subcompact, 2 Minivan.
- [x] **Done 2026-08-28 — and it wasn't a blind merge.** EPA classes split the six: EV6 ×2 and
      EC40 ×2 are *Small Sport Utility Vehicle* → **SUV**, but both Leafs are *Small Station
      Wagon*, which is what our existing Hatchback records map to → **Hatchback**. Counts went
      SUV 95→99, Hatchback 9→11, Crossover 6→0.
- [x] Crossover hub dropped (it fell out automatically — `buildHubs` requires ≥5 records).
      `/electric-crossovers/` is retired; sitemap 186→185.
- [x] **Size-class filtering done 2026-08-28.** `epaSizeClass` registered in `FIELDS`, which
      surfaces it in the sidebar filter, the compare table, the detail modal and the
      prerendered spec tables in one change. Verified: filtering to "Small SUV" gives 43 of 149.
- [ ] **Size-class hubs still to do.** Now trivial — `/small-electric-suvs/` is
      `c => c.bodyStyle === "SUV" && c.epaSizeClass === "Small SUV"`, or just the class alone.
      Candidates by size: Small SUV 43, Standard SUV 33, Large Car 11, Midsize Car 9. Note 25
      records have no `epaSizeClass` (no EPA id), so any size hub silently excludes them —
      worth an id-backfill pass first, or accepting the gap knowingly.

**Caveat to accept going in:** EPA gives only two SUV tiers (Small / Standard), not
small/mid/large. That's coarser than ideal but it is authoritative, citable, needs no judgment
calls from us, and self-corrects if EPA reclassifies. Inventing our own three-tier rule means
defending every borderline case forever — which is exactly the trap `bodyStyle` is in now.

Also worth a look while we're in that API: it returns 100+ fields per vehicle and may cover
some passenger/luggage-volume gaps for free.

## 2. Research queue — fields worth sourcing, in priority order

Counts are `null` (genuinely unresearched) out of 149.

Updated 2026-08-28. Every count below is what remains **after** the ground clearance, heat pump
and top speed batches; each remaining record has a `notes` line explaining why it is blank, so
these are the hard residue rather than unstarted work.

- [ ] **`performance.zeroTo60Sec` — 6 null** (was 15).
- [ ] **`performance.topSpeedMph` — 17 null** (was 38). Roughly half are GM, which publishes no
      top speed at all; the rest are new models the spec databases have not picked up.
- [ ] **`charging.heatPump` — 11 null** (was 56). What is left is mostly cases where sources
      actively contradict each other, not cases nobody has looked at — Kona Electric (US review
      says no, UK/Canada say yes), VF9, Lexus RZ/ES, Ariya.
- [ ] **`groundClearanceIn` — 10 null** (was 49), +8 correctly `"N/A"` for air suspension.
- [ ] **`epaSizeClass` — 14 null.** Blocked on the 15 records with no EPA id; `npm run
      find-epa-id` proposes candidates, and most of those 15 are simply absent from EPA.

Follow-on, harder:

- [x] **`charging.nacsAdapter` — done, and it was never as gappy as this file claimed.** The
      "62 null / 69 null" figures recorded here were wrong: they counted the 62 NACS-native cars
      that **deliberately omit the key**, which `SCHEMA.md` has always instructed. Checked
      2026-08-28: all 87 CCS1 records carry it, all 62 NACS-native records omit it, zero
      mismatches. `available` is 100% filled (82 true, 5 false). `costUsd` has 7 nulls, and 5 of
      those are `available: false`, where no price is the correct answer. The only genuine gap is
      the Subaru Solterra pair, where the manufacturer has not published a price — already
      documented in `SCHEMA.md` as exactly that case.

      **Scope clarified 2026-08-28 (user's call):** this field means a **DC fast-charge adapter**
      — the NACS-to-CCS1 kind that gets a CCS1 car onto a Supercharger or Rivian Adventure
      Network stall. A separate NACS-to-J1772 adapter exists for AC/Level 2 and **no single
      adapter does both**. The AC one is deliberately untracked, since the DC adapter is what
      decides whether a car can road-trip on a NACS network. Now said in three places: the two
      UI labels are "NACS DC Adapter" / "NACS DC Adapter Cost", the hub intro spells out the
      AC/DC split, and `SCHEMA.md` carries the full reasoning.

**Decided 2026-08-28 — two deleted, one kept.** `techFeatures.cupholders` (139/149 null) and
`techFeatures.usbPorts` (typeC/typeA/total, ~92 null) are **removed** from the schema, the data and
the field registry. Nobody picks an EV on cupholder count, and a field that is 93% null is worse
than no field — it renders as a column of dashes in the compare table.

`driverAssist.handsFreeDriving.subscriptionUsdPerMonth` (128 null) is **kept**, despite being the
emptiest of the three, because its emptiness is meaningful rather than incidental: it is only ever
populated when hands-free driving is available at all, so the null tracks a real fact about the
car. Where it does have a value it answers a question a shopper actually asks — the system exists,
but is it $25/mo or $99/mo? Sparse-because-conditional is not the same as sparse-because-tedious,
and only the second is worth deleting.

## 3. Missing models and trims

Model coverage is strong (29 makes / 83 models). **The real gap is trim depth: 1.8 trims per
model** — 19 models list a single trim, only 2 list three. Real lineups run 3–5.

- [ ] **Volvo EX40** — already flagged in the 2026-08-20 EC40 research above as a real,
      distinct, on-sale model (~$55,150) missing entirely. Still missing. Worth doing first
      since it's already researched enough to know it belongs.
- [ ] **Kia EV4** — sedan, was slated for early-2026 US dealerships. Verify it actually shipped.
- [ ] Trim-depth pass on the 19 single-trim models, prioritising high-volume ones
      (Rivian R1T has one trim; BMW iX3, Jeep Wagoneer S, Genesis GV70/G80 likewise).

## 4. Scope decision: BEV only — EREV and PHEV are out

User's call, recorded so it doesn't get relitigated: **this site covers battery-electric
vehicles only.** Range-extended EVs (Ram 1500 REV, Scout Traveler/Terra, and the growing 2026–27
EREV wave) are out of scope, as are plug-in hybrids.

This is a scope boundary, not an omission — but nothing currently says so, and `SCHEMA.md` has
no concept of a range extender, so a consumer of the CC0 dataset would read the absence as a
gap rather than a decision.

- [x] **Done 2026-08-27.** Stated on `/data/` ("What counts as an EV here") and in `SCHEMA.md`
      ("Scope: battery-electric only"), both naming Ram 1500 REV / Scout Traveler explicitly so
      the absence reads as a boundary rather than missing research.

## 5. Checks that passed (recorded so they don't get re-run)

- **Efficiency outliers all verified real.** Ran EPA miles ÷ usable kWh across every record and
  chased all five outliers. The Hummer (1.52 mi/kWh), E-Transit (1.77) and Lucid Air Pure
  (5.00) are genuine characteristics.
- **The Tesla Standard trims are correct — this was a false positive.** Model 3 Standard and
  Model Y Standard both showing 321mi / 60kWh looked like a copy-paste (identical figures for a
  sedan and an SUV; 5.35 mi/kWh would beat the Lucid). Checked both cited EPA stickers
  (id 50251, id 50040): **both really are 321 miles**, and the 60 kWh is right too — it's a
  64 kWh LFP pack, 60.5 usable. Don't "fix" these.
- **No duplicate records** (same make+model+trim+year).

## 6. RESOLVED — `towCapacityLbs` uses `0`, never `"N/A"`, and that is correct

Settled 2026-08-28. `0` is a real rating, not a gap: the Mustang Mach-E is literally rated to tow
0 lb. `data/SCHEMA.md` now documents that `0` covers both a published zero and "no US rating
published at all", with `notes` saying which. See the tow-rating batch at the end of this file.

# TODO: 0–60 research batch — 15 nulls (2026-08-27, in progress)

`performance.zeroTo60Sec` is one of the four card stats as of today, so each null renders a
dash in a prime slot on 10% of cards. 15 records, batched by research affinity (same
make/platform usually resolves in one lookup).

Rules, per `data/SCHEMA.md`: only fill from a reliable US-spec source for **that trim** —
manufacturer spec page or a named review that states the trim. Do **not** borrow a figure from
a different trim, a different model year, or a EU-spec page. If nothing solid turns up, leave
`null` and note what was searched, so the next pass doesn't repeat it.

Tick each box and record the value + source as it lands, so this is resumable mid-batch.

### Batch A — Cadillac (3)
- [x] `cadillac-lyriq-2025-luxury-rwd` — **5.7s** (Car and Driver, via SlashGear)
- [x] `cadillac-optiq-2025-luxury-awd` — **5.9s** (Edmunds tested; Hagerty/MotorWeek agree)
- [x] `cadillac-optiq-2025-sport-awd` — **5.9s** (same 300hp AWD powertrain as Luxury)

### Batch B — GM trucks (3)
- [ ] `chevrolet-silverado-ev-2026-wt-standard-range` — **left null.** Only figure findable is
      "under 6 seconds, per company representatives" — a bound, not a number. Don't guess 5.9.
- [ ] `gmc-hummer-ev-2026-pickup-3x` — **left null, and flagged a separate problem.** Figures
      found were 3.3s (measured, a 3X test vehicle) and 2.8s (Carbon Fiber Edition, 24-module
      battery) — different configurations, neither cleanly ours. See the horsepower note below.
- [x] `gmc-sierra-ev-2026-denali-extended-range` — **4.5s** (GMC, tied explicitly to the 645hp
      Extended Range; Max Range at 760hp is also 4.5s, so the figure isn't trim-ambiguous)

### Batch C — Hyundai (3)
- [x] `hyundai-ioniq-9-2026-s-rwd` — **8.4s** (stated for the 215hp single-motor RWD S)
- [ ] `hyundai-kona-electric-2025-se-fwd` — **left null.** No published figure found for the
      133hp/48.6kWh standard-range car at all, in any model year. Don't re-search without a
      new source.
- [ ] `hyundai-kona-electric-2025-limited-fwd` — **left null, borderline.** Found 7.0s for the
      201hp car, but from a *2024* InsideEVs test. Powertrain is reportedly unchanged for 2025,
      so this is probably right — but that's inference, and the repo's own precedent (the
      2026-08-20 Mach-E note) is to leave a cross-model-year figure null. Fill it if a
      2025-specific source turns up.

### Batch D — Nissan Leaf (2)
- [x] `nissan-leaf-2026-s-plus-fwd` — **7.2s** (measured, 2026 Leaf; S+/SV+ share the powertrain)
- [x] `nissan-leaf-2026-sv-plus-fwd` — **7.2s** (same 214hp/72kWh powertrain as S+)

### Batch E — Toyota bZ / Subaru Uncharted (2)
- [x] `toyota-bz-2026-xle-fwd` — **8.0s** (stated for the 168hp base FWD)
- [ ] `subaru-uncharted-2026-premium` — **left null; no figure exists.** Subaru did not provide
      an acceleration estimate for the FWD Premium and no FWD car was available at the press
      launch. Only the dual-motor Sport has a figure (~just under 5s). **Do not re-search** —
      this isn't a gap in our research, it's unpublished.

### Batch F — Acura (1)
- [ ] `acura-zdx-2024-a-spec-rwd` — **left null.** Every figure found is for the dual-motor
      cars (Type S 4.6s, "under 5s" for dual-motor generally). Nothing published for the
      single-motor 358hp RWD, including in Acura's own spec release.

### Batch G — Mercedes (1)
- [x] `mercedes-benz-eqe-suv-2025-350-plus` — **6.4s** (stated for the 288hp 350+; 350 4MATIC
      is 6.2s and 500 4MATIC 4.7s, so the figure is trim-specific)

**Expect a partial close.** The gap skews toward mainstream models (Kona, bZ, Uncharted, Leaf)
where manufacturers frequently don't publish a 0–60 at all. Anything genuinely unpublished
stays `null` with a note — that's the correct outcome, not a failure.

## Results
_(appended per batch as work proceeds)_

**Batch A — Cadillac — done, 3/3.** Two traps worth knowing for the remaining batches:

- The first search for the Lyriq RWD returned **4.8s**, which is wrong — that's near the AWD
  figure. Summaries conflate trims freely when a model has several powertrains. Confirmed
  5.7s (RWD, 365hp) vs 4.6s (AWD, 515hp) from Car and Driver before recording.
- The Optiq's powertrain **changed between model years**: 300hp AWD in 2025 (our records),
  440hp in 2026. A 2026-sourced figure would have been wrong for a 2025 record. Always check
  the model year on the source page.

Added `scripts/set-spec.mjs` to make these edits rather than hand-editing a 400KB file: it
edits one line in place, refuses to overwrite a non-null value without `--force` (so a batch
is safe to re-run after an interruption), and bumps that record's `lastVerifiedDate` — which
also means the sitemap's per-URL `lastmod` starts carrying real signal for the first time.

**Batch B — GM trucks — 1/3, and a data bug found.**

Only the Sierra closed. The other two are correct outcomes, not failures:

- **Silverado EV WT Standard Range** — the only figure available anywhere is "under 6 seconds,
  per company representatives". That's a bound, not a measurement. Recording 5.9 or 6.0 would
  be inventing precision the source doesn't have.
- **Hummer EV Pickup 3X** — every figure found belongs to a different configuration: 3.3s for a
  measured 3X test vehicle, 2.8s for the Carbon Fiber Edition with the 24-module battery.

- [ ] **Root cause found 2026-08-27, and it isn't the horsepower — it's the model year.**
      Both Hummer records are labelled **MY2026** but cite **MY2025** EPA stickers
      (`id=48344` pickup, `id=48348` SUV, both of which return "2025 GMC Hummer EV ... 3X").
      Every figure on those records — 1,000hp, 205kWh, 312mi — is correct *for the 2025 car*
      and correctly sourced. Nothing is internally wrong; the year label doesn't match the data.

      Two ways to resolve, and it's a judgment call worth making deliberately:
      **(a) Relabel to MY2025.** Cheap, and makes each record honest about what it describes.
      But `carPath()` builds URLs from `modelYear`, so `/2026/hummer-ev-pickup/3x/` becomes
      `/2025/...` — an indexed URL disappears, falling through 404.html to the homepage. The
      site has no redirect mechanism.
      **(b) Re-research as MY2026.** Matches the apparent intent (the dataset deliberately
      covers current model years, and a real MY2026 Hummer exists at 830hp / 1,160hp with the
      24-module battery). More work, keeps the URL.
      Left untouched pending that call — this changes public URLs, so it shouldn't be decided
      as a side effect of a research batch.

      *Superseded note:* the earlier reading was — the 3X is 830hp standard, or 1160hp with the optional 24-module
      battery. 1000hp looks like a stale figure from an earlier model year (the original
      Edition 1 was quoted at 1,000hp). Worth re-verifying the whole Hummer record, not just
      this field, and it's probably why the 0-60 couldn't be matched to a configuration.

Third trim-conflation trap in two batches, so it's the rule not the exception: **for any model
sold in multiple powertrain configurations, confirm which one a figure belongs to before
recording it.** So far: Lyriq (RWD vs AWD), Optiq (2025 vs 2026 power), Hummer (3X vs CFE, and
830 vs 1160hp).

**Batch C — Hyundai — 1/3.** Ioniq 9 closed cleanly. Both Konas left null, for different
reasons worth distinguishing: the SE (133hp) has **no** published 0-60 anywhere, while the
Limited (201hp) has a 7.0s figure that is probably correct but comes from a 2024 test. The
second is a judgment call I resolved conservatively — same call the 2026-08-20 Mach-E research
made. If we ever decide cross-model-year figures are acceptable when the powertrain is
demonstrably unchanged, revisit this one first; it's the strongest candidate.

**Batches D–G — done. Final: 9 of 15 filled.**

| filled | left null |
| --- | --- |
| Lyriq Luxury RWD 5.7 · Optiq Luxury/Sport AWD 5.9 · Sierra EV Denali ER 4.5 · Ioniq 9 S RWD 8.4 · Leaf S+/SV+ 7.2 · bZ XLE 8.0 · EQE SUV 350+ 6.4 | Silverado EV WT · Hummer EV Pickup 3X · Kona Electric SE · Kona Electric Limited · Uncharted Premium · ZDX A-Spec RWD |

**The six remaining are the right answer, not unfinished work.** Each was searched and the
reason recorded above. Three categories:

1. **Genuinely unpublished** — Uncharted Premium (Subaru gave no estimate, no FWD press car),
   ZDX A-Spec RWD (only dual-motor figures exist), Kona Electric SE. Don't re-search these
   without a new source appearing.
2. **A bound, not a figure** — Silverado EV WT ("under 6 seconds").
3. **Ambiguous configuration** — Hummer 3X, and see the horsepower bug queued above.

Kona Electric Limited is the one genuinely revisitable case: 7.0s exists but from a 2024 test.

**Predicted at the outset that the gap would skew toward mainstream models where manufacturers
don't publish 0-60 — that held.** The unfilled six are Kona, Uncharted, base-trim ZDX and work
trucks; every premium/performance trim resolved on the first search. Worth carrying into the
heat-pump and ground-clearance batches: expect base and work trims to be the expensive ones,
and budget for a partial close rather than treating leftovers as failure.


# TODO: Automated data audit — `npm run audit` (2026-08-27)

Added `scripts/audit-data.mjs` in response to trim drift proving to be the dominant failure
mode of the 0-60 batch: three near-misses in two batches, every one caught only by hand
(Lyriq RWD handed the AWD figure, Optiq handed a different model year's, Hummer 3X
unresolvable between two configurations). The checks catch that class automatically:

1. **Different power, identical 0-60** across trims of one model. Same power + same figure is
   fine and common, so only differing power flags.
2. **More power but slower** within a model — physically implausible.
3. **Different drivetrain, identical range AND battery** — RWD and AWD essentially never post
   the same EPA range.
4. **Efficiency outside ~1.4–5.6 mi/kWh** — the real band runs from the Hummer (1.52) to the
   Tesla Standard trims on LFP (5.35), so anything outside means range or battery is wrong.
5. **Duplicate record identity.**

Every check is a heuristic. A flag means "look at this", never "this is wrong".

**Run it after every research batch.** Current state — 2 flags, both pre-existing, neither
introduced by today's work:

- [x] **GMC Sierra EV Elevation/Denali sharing 4.5s — cleared, false positive.** GMC publishes
      4.5s across all three power levels (605hp Elevation, 645hp Denali ER, 760hp Denali Max).
      Elevation's 283mi also matches its own source. Nothing to fix.
- [x] **VinFast VF8 Eco/Plus sharing 5.5s — TRUE POSITIVE, fixed.** The Eco had inherited the
      Plus's figure. VinFast's own spec sheet quotes "~6 seconds" for the Eco against "Mid 5
      seconds" for the Plus, and Edmunds renders those as 5.9 / 5.5. Eco corrected to **5.9s**.
      The audit earned its keep on its first run.

Worth extending when a new drift pattern shows up: the point is that each hand-caught mistake
becomes a check, so the same class can't recur silently.


# TODO: Model-year drift — a second audit class (2026-08-27)

The Hummer investigation turned up a failure mode the current audit can't see: **a record's
`modelYear` disagreeing with the model year of its own cited EPA source.** Both Hummer records
are MY2026 carrying MY2025 data and MY2025 sticker links. That's invisible to every in-file
check, because nothing about the record is internally inconsistent — the mismatch only shows
against the external source.

This matters more than one truck. If those two were year-bumped without re-verification,
others may have been. 132 of 149 records cite a specific `fueleconomy.gov` vehicle id, so it
is checkable — just not from inside the file.

- [x] **Done 2026-08-28 — and it found six.** See the results section below.
- [x] **Done.** `npm run audit` now reads `scripts/epa-cache.json` and checks both model year
      and EPA range against source, skipping those two checks cleanly if the cache is absent.

This is the same principle as the trim-drift checks: each mistake found by hand becomes a
check. The difference is that this class needs an external reference, so it belongs in the
research pipeline rather than the offline audit.


# TODO: EPA reconciliation pass — results (2026-08-28)

`npm run fetch-epa` pulled all 126 EPA entries our records cite (122 unique — four ids are
cited twice). Cached to `scripts/epa-cache.json`, which `npm run audit` now reads.

## What it settled

**`epaSizeClass` is populated, and EPA independently confirms Crossover isn't a category.**
Every one of our six "Crossover" records maps to *Small Sport Utility Vehicle* or *Small
Station Wagon* — i.e. EPA files them as small SUVs, exactly as the 2026-08-27 audit argued from
the numbers. The merge is now backed by an external authority rather than our own reasoning.
The remaining SUV/Crossover work is unblocked.

## Six records whose model year disagrees with their own source

- [ ] **Cadillac Optiq ×2** — we say MY2025, source is the *2026* Optiq entry (id 49951). This
      one is genuinely mixed, not just mislabelled: the record carries **2025 horsepower
      (300hp)** and the **2026 EPA range (303mi)**. The 2026 car is 440hp. So either the EPA
      link is wrong for a 2025 record, or the record is a 2026 car with stale power and price.
      *Note on yesterday's 0-60 work:* the 5.9s added on 2026-08-27 is correct **for the record
      as labelled** (MY2025 / 300hp) and was explicitly checked against the year at the time. If
      these get reclassified to MY2026, 0-60, horsepower, and price all change together — the
      0-60 isn't a separate error.
- [ ] **Ford F-150 Lightning Flash and Platinum** — we say MY2026, sources are 2025 entries.
- [ ] **GMC Hummer EV Pickup 3X and SUV 3X** — we say MY2026, sources are 2025 entries. Already
      root-caused on 2026-08-27; now confirmed as part of a pattern rather than a one-off.

**Still needs your decision, unchanged from yesterday:** relabelling to the source year changes
`carPath()` output and therefore public URLs, and the site has no redirects. Re-researching to
the labelled year keeps URLs but is real work. Six records is small enough to do either way
consistently — worth picking one policy and applying it to all six.

## Two range disagreements

- [ ] **Tesla Model 3 Performance AWD** — we say 346mi, its EPA entry says 314mi. A 32-mile gap
      is too large to be a rounding or trim-variant difference; one of the two is wrong.
- [ ] **Volvo EX60 P6 Plus** — we say 307mi, EPA says 295mi. This is a MY2027 car, so ours may
      predate certification; check whether 307 was a manufacturer estimate.

## Four EPA entries cited by two records each

Niro EV Wind/Wave, Optiq Luxury/Sport, bZ Woodland/Woodland Premium, Bolt LT/RS. Legitimate
where trims share a powertrain and EPA certifies one configuration — but it does mean those
pairs' ranges can never disagree, so a genuine per-trim difference would be invisible. Worth a
glance, not obviously wrong.


# TODO: Six model-year mismatches reconciled (2026-08-28)

Policy applied to all six, chosen once rather than case by case: **make the record's label agree
with its own data and its own source.** What settled each was EPA's menu API — which model years
it has actually certified per model:

| model | EPA 2025 | EPA 2026 |
| --- | --- | --- |
| F-150 Lightning | 5 entries | **none** (Mach-E has both, so this isn't a coverage gap) |
| Hummer EV | 8 entries | **none** |
| Optiq | **none** | 6 entries |

**Hummer EV Pickup 3X / SUV 3X, F-150 Lightning Flash / Platinum → relabelled MY2026 → MY2025.**
Every figure on those four already matched the 2025 car and its 2025 EPA entry; only the year
was wrong. `id` was regenerated too, since it embeds the year (`catalogId` is the stable public
identifier for share links, so nothing external breaks).

**Cadillac Optiq Luxury / Sport AWD — year was right, range was wrong.** These are genuinely
MY2025 cars: 300hp AWD at $52,895 / $53,495 matches the 2025 spec, whereas the 2026 is 315hp
RWD base at $52,395 with 440hp AWD costing $3,500 more. The error was the range — **302mi is
the 2025 figure, 303mi is the 2026's**, and the record had taken 303 along with a 2026 EPA link.
Range corrected to 302, and `links.epaWindowSticker` **removed** rather than left pointing at
the wrong model year: EPA has no 2025 Optiq entry to repoint it at. `range.source` now cites
Edmunds' 2025 range page instead.

**Bonus catch: Tesla Model 3 Performance AWD, 346mi → 314mi.** Its own cited EPA sticker says
314; 346 is the Long Range figure. That's trim drift again, found by the EPA-range check rather
than the sibling-comparison one — worth noting that the two checks catch the same class from
different angles.

## Four public URLs changed

    /2026/f-150-lightning/flash/     -> /2025/f-150-lightning/flash/
    /2026/f-150-lightning/platinum/  -> /2025/f-150-lightning/platinum/
    /2026/hummer-ev-pickup/3x/       -> /2025/hummer-ev-pickup/3x/
    /2026/hummer-ev-suv/3x/          -> /2025/hummer-ev-suv/3x/

The old paths have no redirect; they fall through `404.html` to the homepage. Accepted as the
cost of correctness — these pages are days old with minimal index presence, and `npm run
sync-urls` updated the committed `models[].url` values automatically, which is the tooling
working as designed.

## Left flagged deliberately

- [ ] **Volvo EX60 P6 Plus — we say 307mi, EPA says 295mi. Not a wrong value; a specificity
      mismatch.** EPA's only P6 entry is *"22 Inch Wheels"*, and our record lists
      `wheelSizesIn: [20, 21]`. Smaller wheels genuinely give more range, so 307 is plausible
      for our configuration — but the cited source describes a different one. Resolving it means
      deciding what the record represents (which wheel spec), so it wants a decision rather than
      a guess. The sibling P10 matches EPA exactly, which supports the wheel explanation.

## Coverage question this opens

- [ ] **MY2026 Hummer: researched 2026-08-28, not added — see the pre-researched facts below.**
- [x] MY2026 F-150 Lightning is **not** a gap: Ford has ended all-electric Lightning production
      and the successor is an EREV, which this dataset excludes by scope.


# TODO: 2026 GMC Hummer EV — researched, deliberately not added yet (2026-08-28)

Checked whether it qualifies for a `"Pending"` EPA range per `SCHEMA.md` (which requires the
car to be *otherwise on sale now*). **It does qualify** — both Pickup and SUV are orderable
through dealers with published pricing, and EPA has certified no 2026 Hummer at all, which is
exactly the Porsche Cayenne Electric precedent.

**Not added anyway, on completeness grounds.** I could source **11 of 44 fields**; the existing
2025 record has **35 of 44**. A record a quarter filled would render as dashes across its card,
the compare table and its own detail page — worse than the 2025 record that already represents
the Hummer.

The tempting shortcut is to copy the ~33 body-and-features fields from the 2025 record, since a
Hummer's door count and cargo volume don't change with a battery module count. **Deliberately
not doing that.** It is the same reasoning that produced the Optiq's mixed record (2025 power,
2026 range) and the VF8's inherited 0-60 — both found by audit this week. Carrying fields over
wholesale onto a fresh record, then stamping today's `lastVerifiedDate` on them, would assert a
verification that didn't happen.

## Verified 2026 facts, so a future pass doesn't re-research them

| | Pickup | SUV |
| --- | --- | --- |
| 2X (20-module, 2 motors) | $99,895 | $99,895 |
| 3X (20-module, 3 motors, **830hp**) | $107,995 | $107,995 |
| 3X + 24-module (**1,160hp**, 212 kWh usable) | $117,990 | not offered |
| Carbon Fiber Edition | — | $124,900 |

- **DC fast charging:** 800V architecture, up to 300 kW. AC: 19.2 kW onboard charger.
- **GM-estimated range** (not EPA, so `range.epaMiles` must be `"Pending"`, not these):
  Pickup 3X 20-module w/ Extreme Off-Road Package 297mi; 3X 24-module 345mi; SUV up to 315mi.
- **0-60:** 3.3s (Pickup 3X test vehicle), 3.5s (SUV 3X test vehicle), 2.8s (Carbon Fiber
  Edition w/ 24-module, Watts to Freedom). ⚠️ None of these state which battery configuration
  the 3X figures used — the same ambiguity that left the 2025 record's 0-60 null. Don't record
  one without pinning the config.
- Prices rose during MY2026 (GM Authority, Jan 2026) — re-check pricing when adding.

## To actually add it

- [ ] Research the ~33 remaining fields against 2026 sources: battery kWh for the 20-module
      pack, cargo volumes, seating, doors, tow rating, wheel sizes, and the comfort/tech/driver-
      assist booleans. `gmc.com` and `edmunds.com` both return 403 to our fetcher, so this needs
      a different route than the other batches used.
- [ ] Then add Pickup 3X and SUV 3X for MY2026, with `range.epaMiles: "Pending"`, keeping the
      MY2025 records — both years genuinely exist and the 2025 ones are correctly sourced.

# TODO: Ground clearance research batch — 49 nulls (2026-08-28, in progress)

Picked over the heat-pump gap (56 null) because it's far more concentrated — Audi 9, BMW 8,
Mercedes 8 is half the batch in three makes — and because it's a published number rather than a
boolean that spec sheets routinely omit.

**49 nulls across 31 distinct models.** Ground clearance rarely varies by trim within a model,
so one lookup usually closes several records — but confirm that per model rather than assuming
it (an air-suspension or off-road variant can differ, and 8 records are already correctly
`"N/A"` for exactly that reason).

Same sourcing rules as the 0-60 batch: a reliable US-spec figure for that model year, no
borrowing across model years or from EU-spec pages (which quote mm and sometimes a different
suspension setting). Leave `null` and note what was searched if nothing solid turns up.

Watch for the trap that recurred three times in the 0-60 batch: **figures quoted for a
different variant of the same model.** Ground clearance is especially prone to it because
adaptive/air suspension quotes a range, and off-road packages raise it.

### Batch A — Audi (9 records, 6 models) — DONE, 9/9
- [x] Q4 e-tron — Premium 45, Premium Plus 55 quattro — **7.1 in** (180 mm, standard suspension)
- [x] Q6 e-tron — Premium quattro — **7.2 in** (184 mm, standard suspension)
- [x] Q8 e-tron — Premium quattro — **6.9 in** (176 mm, air suspension default height)
- [x] SQ6 e-tron — Premium quattro — **6.5 in** (164 mm, sport suspension)
- [x] e-tron GT — S Premium Plus quattro, RS performance — **4.9 in** (125 mm, air suspension base height)
- [x] A6 e-tron — Premium, Premium Plus quattro — **5.6 in** (143 mm, standard suspension)

### Batch B — BMW (8 records, 5 models) — DONE, 8/8
- [x] i4 — eDrive40, M60 xDrive — **4.9 in** both
- [x] i5 — eDrive40 **5.7 in**, M60 xDrive **5.4 in**
- [x] i7 — xDrive60 **5.4 in**
- [x] iX — xDrive60, M70 xDrive — **8.8 in** both
- [x] iX3 — 50 xDrive **6.9 in**

### Batch C — Mercedes-Benz + Maybach (9 records, 5 models) — 3/9, rest unpublished
- [ ] EQB — 250+, 350 4MATIC — **not published in US data**, confirmed
- [ ] EQE Sedan — 350+, 500 4MATIC — **not published in US data**, confirmed
- [x] EQS Sedan — 450+, 580 4MATIC — **4.8 in** both
- [ ] CLA — 250+ w/EQ, 350 4MATIC w/EQ — **not published in US data**, confirmed
- [x] Maybach EQS SUV — 680 4MATIC — **7.3 in**

### Batch D — Hyundai + Genesis (8 records, 5 models) — 6/8
- [x] Ioniq 9 — S RWD, Calligraphy AWD — **6.9 in** both (S, SE, SEL and Calligraphy all read 6.9)
- [x] Kona Electric — SE FWD, Limited FWD — **5.9 in** both (all four trims read 5.9)
- [x] Ioniq 5 N — N — **5.6 in** (single trim, read directly)
- [x] Electrified G80 — Advanced AWD — **5.5 in** (2024 MY page, the last Edmunds carries; same car)
- [ ] GV60 — Standard RWD, Performance AWD — **not published in US data**, confirmed

**Resume here.** Edmunds began returning 403 partway through this batch, so it was stopped
rather than pushed. The two "reads N in" figures above are for *adjacent trims we do not
carry* and must not be copied across — that is precisely the drift this audit exists to catch.
Re-check `st-402040674`/`st-402040677` (Kona SE/Limited) and the Ioniq 9 S and Performance
Calligraphy style ids, confirming the trim from each page's `<title>` before writing.

### Batch E — Ford + GM (6 records, 4 models) — DONE, 6/6
- [x] F-150 Lightning — Flash, Platinum — **8.4 in** both
- [x] Mustang Mach-E — Premium AWD Extended Range — **5.7 in**
- [x] Chevrolet Bolt — LT, RS — **5.6 in** both
- [x] GMC Sierra EV — Denali (Extended Range) — **8.2 in** (vs the Elevation's 8.1)

### Batch F — remaining (9 records, 6 models) — 7/9
- [x] Tesla Cybertruck — Cyberbeast — **8.0 in**
- [x] Tesla Model S — AWD, Plaid AWD — **4.6 in** both
- [x] Dodge Charger Daytona — R/T **5.5 in**, Scat Pack **5.6 in** (Dodge's own spec sheet)
- [ ] Lexus ES — 350e FWD, 500e AWD — **not published yet**, brand-new model
- [x] MINI Countryman Electric — SE ALL4 — **7.4 in**
- [x] Porsche Taycan — Turbo S — **4.9 in** (vs the base car's 5.0)

**Expect a partial close, and expect it to skew differently from the 0-60 batch.** That one
failed on mainstream trims; this one is concentrated in German luxury, where US spec sheets
often omit ground clearance entirely and the figures that circulate are EU-spec in millimetres.
Air-suspension cars should end up `"N/A"`, not `null` — that distinction already exists in the
data for 8 records.

## Results

### Batch A — Audi (2026-08-28): 9 of 9 filled

Every Audi record closed. The batch went better than the "expect a partial close" warning
predicted, but not via the sources that warning assumed.

**Sources.** Edmunds, KBB and US News all 403 the fetcher, and Audi's own US press-site PDFs
(`media.audiusa.com/assets/...TechnicalSpecifications.pdf`) extract to nothing but the logo —
they are image-rendered, not text. What worked instead were two independent EV spec databases,
[electrichasgoneaudi.net](https://electrichasgoneaudi.net/models/q6-e-tron/specifications/) and
[EVKX.net](https://evkx.net/models/audi/q6_e-tron/q6_e-tron/), which publish ground clearance
per *suspension type* rather than per trim — exactly the axis that actually moves this number.
Every figure below is corroborated across both, plus a third source where noted. The one
official source that did work was
[audi.com's Q8 e-tron chassis page](https://www.audi.com/en/the-audi-q8-e-tron-until-2025-15069/a-high-level-of-driving-fun-and-comfort-chassis-and-steering-15074),
which states the 176 mm default directly.

**Ground clearance varies by suspension, not by trim.** That is the useful finding for the
remaining batches. For every Audi the figure is fixed by which of standard / sport / adaptive
air is fitted, so the research question per record is "which suspension does this US trim ship
with?", not "what is this trim's ground clearance?". Checked per record rather than assumed:

- Q4 e-tron Premium 45 and Premium Plus 55 quattro both ship standard suspension (180 mm); the
  165 mm sport setup only arrives with the S line package, which neither record represents.
- A6 e-tron Premium and Premium Plus quattro both ship standard suspension (143 mm). Adaptive
  air is optional on Premium Plus and only becomes standard at Prestige (and on the S6), so
  neither of these records gets the 105–145 mm air figure.
- SQ6 e-tron gets sport suspension as standard equipment — hence 6.5 in, *lower* than the Q6
  it is derived from. That inversion is real, not a transcription slip.

**Air-suspension cars got numbers, not `"N/A"`.** The eight existing `"N/A"` ground clearance
records are all wide-range off-road adjustable (Rivian, Hummer, Lucid Gravity, Silverado EV
RST) with no meaningful single height. None of the three air-sprung Audis here are that case:
the Q8 e-tron has an Audi-published 176 mm default (raised +35 mm in off-road mode, +15 mm
beyond that), and the e-tron GT's 125 mm is consistently reported as its base height across
sources with 165 mm as the raised limit. This matches how the dataset already treats air-sprung
cars that publish a nominal — Lucid Air at 4.9 in, Porsche Taycan at 5.0 in, Macan at 7.3 in.

**Not repeated from the 0-60 batch:** no figure here was taken from a different body style of
the same nameplate. The spec databases list Sportback and Avant variants alongside the ones we
carry, and the A6 in particular publishes an Avant-wagon figure — an earlier pass had already
left this record null for exactly that reason. All values above are the Sportback/SUV figures
matching the records we hold.

### Batch B — BMW (2026-08-28): 8 of 8 filled

Every BMW record closed, and unlike Batch A this one has a manufacturer cross-check.

**How it was sourced.** BMW's own press spec sheets *are* real text PDFs (Audi's are
image-rendered), so
[BMW USA's 2024 5 Series technical specifications](https://www.press.bmwgroup.com/usa/article/attachment/T0418778EN_US/624323)
could be decompressed and read directly: `Ground clearance inches 6.1 5.7 5.4` across the
530i / i5 eDrive40 / i5 M60 xDrive columns. The rest came from Edmunds, read in a browser
(their pages 403 a plain fetcher), cross-checked against evspecifications.com.

**A near-miss worth recording.** A search summary reported the i5 eDrive40 at 6.1 in. The raw
table shows 6.1 is the *gas* 530i column — the eDrive40 is 5.7. Reading the four-column
dimensions block directly is what caught it. Every figure below was confirmed from a page whose
own `<title>` names the trim, after an Edmunds style id turned out not to follow listing order
(`st-402097385` is the i4 M60, not the eDrive40).

**Two independent US sources agree on all eight**, and where BMW USA publishes a number it
matches: i5 eDrive40 5.7 and M60 5.4 appear identically in BMW's press sheet and on Edmunds;
i7 xDrive60 5.4, iX3 6.9 and i4 4.9 match evspecifications.com.

**The iX is the one to double-check if it ever looks wrong.** Edmunds and evspecifications'
*US* entry both say 8.8 in for the xDrive60 and the M70. EVKX and evspecifications' *EU* entry
say 8.0 in (202 mm) — that is the coil-spring figure, and US iX models ship adaptive two-axle
air suspension as standard. 8.8 in is the US-market number and is what the rest of this
dataset's convention wants.

### Batch C — Mercedes-Benz (2026-08-28): 3 of 9 filled

**Filled:** EQS Sedan 450+ and 580 4MATIC at **4.8 in** — the whole EQS Sedan line reads 4.8
(450+, 450 4MATIC and 580 4MATIC all match; the AMG EQS is a different 5.3). Maybach EQS SUV
680 4MATIC at **7.3 in**, which agrees with the EQS SUV 450+/580 records already in the
dataset. This closes the "genuinely couldn't confirm a reliable US-specific figure" note left
against the EQS Sedan entries earlier in this file.

**Left null on purpose: EQB (2), EQE Sedan (2), CLA with EQ Technology (2).** Mercedes does not
publish ground clearance for these in the US, and the figures that circulate do not agree:

- EQB — 154 mm from one aggregator, 140 mm (5.5 in) from another.
- EQE Sedan — 134 mm from one, 5.5 in (140 mm) from another.
- CLA with EQ Technology — the ~160 mm figure in circulation is explicitly the **Indian-market
  car, which has taller springs**. Copying it into a US record would be the drift trap in its
  purest form.

Checked and came up empty: Edmunds (no ground clearance row at all for the EQB, EQE Sedan or
CLA — it has one for the EQS, which is why those two closed), KBB, US News, and Mercedes-Benz
USA's own press site, whose EQ releases give length/width/height but no ground clearance. The
closest MBUSA gets is prose: AIRMATIC "can be raised by up to 1 inch," with no baseline stated.

### Batches D, E and F (2026-08-28): 26 of 32 filled

Edmunds recovered after a cool-off and the rest of the crawl ran at a deliberately slower
pace — a wait between every navigation, and a settle delay before reading. Both turned out to
matter (see below). Values are listed against each batch's checklist above.

**Read each trim's own page, never the model default.** The trim-level differences here are
real: the Sierra EV Denali is 8.2 in against the Elevation's 8.1; the Cybertruck Dual Motor is
10.0 in against 8.0 for the Base, Premium and Cyberbeast; the Taycan Turbo S is 4.9 in against
the base car's 5.0. Where a figure *is* uniform, that was established by reading the trims
rather than assuming — all four Kona Electric trims read 5.9, and the Ioniq 9 reads 6.9 across
S, SE, SEL and Performance Calligraphy, RWD and AWD alike.

**A "no such row" result is only trustworthy after the page settles.** The Sierra EV Denali read
as having no ground clearance row on the first attempt and 8.2 in on the second — the first read
landed before that section rendered. Every "not published" verdict below was therefore
re-confirmed with a settle delay, checking that the Exterior Dimensions block itself was present
(Length, Width, Height, Wheelbase all populated) and simply lacked the clearance row.

**Edmunds mechanics worth keeping.** Style ids do not follow trim listing order — `st-402097385`
is the i4 M60, not the eDrive40 — but the page's trim `<select>` carries the id-to-trim mapping
directly, which beats probing ids one at a time. Read the value out of the HTML rather than the
rendered text, since the dimensions section renders collapsed:

    /Ground clearance<\/th><td[^>]*>([^<]+)/

Always print `document.title` alongside the value to confirm which trim answered. Edmunds rate
limits to a 403 after roughly fifteen to twenty requests in quick succession; it clears on its
own, and pacing avoids it entirely. Slugs that cost a 404 before being found: `mercedes-benz/eqb`
(not `eqb-class`), `mercedes-benz/cla`, `chevrolet/bolt` (not `bolt-ev`), `dodge/charger` (not
`charger-daytona`), `mini/countryman` (the electric SE ALL4 is a trim inside it, not its own
model), `genesis/electrified-g80/2024` (no current-year page).

**Dodge came from Dodge.** Edmunds, KBB, JD Power and cars.com all lack a ground clearance row
for the Charger Daytona — cars.com renders it as a literal "N/A". The official Stellantis spec
sheet has it, and its PDF is real text, so it was decompressed and read directly: a two-column
table headed `R/T` and `SCAT PACK` with `Ground Clearance 5.5 (141.3) 5.6 (142.8)`. That is the
2024 preliminary sheet; the 2025 sheet carries the same pair and the car is unchanged.

**A conflict that resolved cleanly.** The MINI Countryman SE ALL4 had three figures in
circulation: 7.4 in, 6.7 in (170 mm) and 5.8 in. JD Power and Edmunds independently give 7.4 in
for exactly this trim; the 170 mm is the European car with Adaptive M suspension, and the 5.8
traces to nothing. Two US sources on the right trim beat two aggregator figures on the wrong one.

### Still open: 10 records, and the reason is the same for all of them

- **Genesis GV60** (Standard RWD, Performance AWD) — no row on Edmunds, and cars.com renders
  "Min Ground Clearance" as "N/A". The 160 mm figure that circulates is EU/AU spec.
- **Lexus ES 350e / 500e** — no row on Edmunds for either electric trim. Brand-new model; the
  figure does not appear to be published yet. (Note while here: Edmunds carries these as **2026**
  and this dataset records them as **2027** — worth a look in its own right.)
- **Mercedes-Benz EQB, EQE Sedan, CLA with EQ Technology** (2 records each) — Mercedes does not
  publish a US figure, Edmunds has no row for any of the three, KBB and US News have nothing, and
  MBUSA's own press releases give length/width/height but no ground clearance. The aggregator
  numbers disagree with each other (EQB 154 vs 140 mm; EQE 134 mm vs 5.5 in), and the CLA's
  circulating ~160 mm is the **Indian-market car, which has taller springs**.

These are genuine publication gaps rather than research failures, so they stay `null`. Worth
one more pass if a manufacturer spec sheet in extractable-text form turns up — that is exactly
what unlocked the Dodge and the BMWs.

## Final tally: 39 of 49 filled

Ground clearance nulls across the dataset went from 49 to 10.

## Audit flag cleanup (2026-08-28)

Three correctness items, all closed. `npm run audit` now reports **no flags**.

### 1. Volvo EX60 P6 — 307mi vs EPA's 295mi. Real citation error.

The record was right and its citation was wrong. `links.epaWindowSticker` pointed at
fueleconomy.gov id **50697**, which is specifically the **"EX60 P6 electric (22 Inch Wheels)"**
entry at 295mi — a different configuration from the one this record describes
(`wheelSizesIn: [20, 21]`, 307mi).

Checked whether EPA simply had a second entry we'd missed: it does not. The 2027 Volvo menu
lists exactly one P6, the 22-inch one, and querying its options returns a single id. EPA has not
published the standard-wheel P6 that Volvo already rates at 307mi. (Contrast the EX90, where
both a base and a "(21 Inch Wheels)" entry exist.)

Fixed by repointing `range.source` and `links.epaWindowSticker` at Volvo's own US spec page and
recording the situation in `notes`. `data/SCHEMA.md` gained a rule for this case, since it will
recur: prefer fueleconomy.gov, fall back to the manufacturer's published EPA figure when EPA has
no entry for the exact configuration, and **never cite a fueleconomy.gov entry whose number
differs from the one recorded** — a link to a page that contradicts the value is worse than no
link at all.

### 2. GMC Sierra EV — Elevation and Denali share 4.5s. False positive, and not the first time.

GMC publishes 4.5s across 605hp, 645hp and 760hp Sierra EV configurations; the heavier Extended
Range pack offsets the extra power, and Edmunds separately measured the Denali Extended Range at
4.4s. Re-confirmed today against GMC's own trim pages.

This had **already been investigated and cleared on 2026-08-27** (see `de88ce7`), and the audit
re-raised it anyway, so the same work got paid for twice. That is the actual defect, and it is
fixed rather than re-diagnosed — see below.

### 3. Lexus ES — we say MY2027, Edmunds says 2026. Both are right.

Lexus's own press release of 2026-08-10 designates the battery-electric ES models **MY2027**;
EPA certified them under **MY2026**, which is what Edmunds mirrors. `modelYear` stays 2027,
following the manufacturer's designation — that is what appears on the buyer's order sheet.

The valuable part was the cross-check. These records cited only a Lexus press-release URL, so
attaching the real EPA entries (ids 50450 and 50452, the standard 19-inch configurations)
verified every range figure we hold against EPA directly: 350e 307mi and 500e 276mi both match
exactly, and the 21-inch figures in `notes` (292 and 272) match EPA's separate 21-inch entries.
The records also picked up `epaSizeClass: "Midsize Car"`, taking the missing-size-class count
from 25 to 23.

### The mechanism: `scripts/audit-cleared.json`

A flag that has been investigated and found legitimate needs somewhere to be recorded, or every
run re-raises it. Each flag now carries a stable key, and that file maps keys to why they were
dismissed and when.

**The keys embed the values the flag was raised over** — `.../605+645hp@4.5s`, `.../MY2027-vs-EPA2026`.
That is the safety catch: change the horsepower or the 0-60 and the key changes with it, the
exception stops matching, and the flag comes back. An exception can only ever silence the exact
situation a person actually looked at. Verified by temporarily moving the Denali to 650hp — the
flag reappeared and the now-unmatched entry was reported as stale.

Two deliberate properties:
- Cleared items are **printed, not hidden** — with the reason and the date — so the audit output
  still shows everything that was ever suspicious.
- An entry matching nothing is reported as **stale**, because that means either the data moved on
  and the exception is dead weight, or a key was mistyped and a live flag is going unsilenced.

### Found while here, not fixed

`data/SCHEMA.md` documents `epaSizeClass` as GENERATED and says to run `npm run fetch-epa`, but
`fetch-epa` only writes `scripts/epa-cache.json` — nothing writes the field back into
`data/evs.json`. The 25 (now 23) records missing it are the visible symptom; the two Lexus
records were filled by hand with `set-spec`. Making `fetch-epa` write back would fix the field
permanently and surface any drift between stored and cached values, but it would touch every
record that cites an EPA id, so it belongs in its own change rather than a flag cleanup.

## epaSizeClass write-back (2026-08-28)

`data/SCHEMA.md` described `epaSizeClass` as GENERATED and told you to run `npm run fetch-epa`,
but that script only ever wrote `scripts/epa-cache.json` — nothing put the value into
`data/evs.json`. The field was hand-filled once during the EPA reconciliation pass and had no way
to stay current. Now `fetch-epa` does the write-back, so the documentation is true and the field
regenerates from the cache on every run.

**The first run confirmed all 125 records that cite an EPA id were already correct** — 0 filled,
0 changed. That is the useful result: the field was right, and it is now *checked* rather than
assumed.

Behaviour worth knowing:

- **EPA is the source of truth.** A stored value that disagrees is overwritten, and every change
  is printed under a heading that says why you should care — a size class moving means either an
  EPA reclassification or a record pointed at the wrong vehicle.
- **A record with no cached EPA entry is never cleared.** It is reported as "not derivable"
  instead. Clearing would have wiped the Volvo EX60 P6, which legitimately cites Volvo rather
  than fueleconomy.gov (EPA has no entry for its wheel package) while still having a known size
  class. Reporting keeps a value the generator cannot vouch for visible rather than quietly
  trusted. That record's `notes` now records where its class came from (EPA id 50697 — size class
  is a property of the vehicle, not the wheel package).
- `--dry-run` previews without writing. `lastVerifiedDate` bumps only on records that actually
  change, so a no-op run doesn't churn 125 sitemap dates.
- Line surgery rather than parse-and-stringify, for the same reason as `sync-urls.mjs` and
  `set-spec.mjs`: `data/evs.json` is hand-formatted (indentation isn't even uniform between
  sibling keys) and reserialising would reflow 400KB into an unreadable diff.

Verified by injecting both failure modes — one record set to `null`, another to a deliberately
wrong `"Minivan"` — and confirming the run filled the first, corrected the second, listed them
under separate headings, and left the file byte-identical to the pre-test snapshot.

**Still 23 records with `epaSizeClass: null`**, and the generator can't help: they cite no EPA id
at all (Rivian, Cadillac, VW ID.4, Honda Prologue, Porsche Cayenne Electric, Tesla Cybertruck and
Model Y L, and others). Backfilling those ids is its own task — it would also extend the audit's
model-year and EPA-range checks to cover them, which is the bigger prize.

## EPA id backfill (2026-08-28) — 9 of 24 assigned, coverage 125 -> 134 of 149

An EPA id is the most load-bearing link in a record: `npm run fetch-epa` keys `epaSizeClass` off
it, and the audit's model-year and EPA-range checks compare against it. A record without one is
unchecked by both. 24 records were in that state.

**First, a check on scope: EPA has no heat pump data.** Pulled a full vehicle record to be sure —
the fields are MPGe, kWh/100mi, charge times, drive, motor, size class, range and CO2, with
nothing thermal at all. Edmunds has no heat pump row either. That field needs manufacturer pages
or an EV-specific database; evspecifications carries it (verified: "Thermal Management:
Liquid-based coolant circulation / Updated heat pump" on the BMW iX) **and carries top speed**,
so a heat-pump crawl there fills two gaps per page — heat pump (56 null) and top speed (38 null).

**Assigned, all nine confirmed by exact range and drivetrain match**, and all nine pass both audit
checks afterwards, which is the real confirmation they point at the right vehicle:

    cadillac-lyriq-2025-luxury-rwd      48691  LYRIQ                     RWD 326mi  Small SUV
    cadillac-lyriq-2025-sport-awd       48692  LYRIQ AWD (11 kW)         AWD 319mi  Small SUV
    fiat-500e-2025-red                  48703  500e                      FWD 149mi  Minicompact Car
    honda-prologue-2025-ex-fwd          49091  Prologue FWD              FWD 308mi  Standard SUV
    honda-prologue-2025-elite-awd       49090  Prologue AWD Elite        AWD 283mi  Standard SUV
    volkswagen-id4-2025-standard-rwd    49155  ID.4                      RWD 206mi  Small SUV
    volkswagen-id4-2025-pro-s-awd       48774  ID.4 AWD Pro S            AWD 263mi  Small SUV
    mercedes-benz-g-class-2026-g580     49687  G 580 with EQ Technology  4WD 239mi  Standard SUV
    mercedes-maybach-eqs-suv-2026-680   49690  EQS 680 4matic Maybach    AWD 300mi  Standard SUV

The write-back built earlier today filled all nine `epaSizeClass` values automatically on the next
`npm run fetch-epa`, which is exactly what it was for. `epaSizeClass` nulls: 23 -> 14.

The Fiat 500e came back as **"Minicompact Cars"**, a class the dataset had never seen, and
`shortSizeClass` threw rather than writing `null` — the fail-loudly design working as designed.
Added to `SIZE_CLASS` and to the enum list in `data/SCHEMA.md`.

### New tool: `npm run find-epa-id [id-substring]`

`scripts/find-epa-id.mjs` proposes candidates for every record lacking an id. It deliberately
**proposes and does not assign** — EPA splits entries by wheel size, charger speed and sub-trim,
so one model can carry twenty ids whose ranges differ by 80 miles, and picking wrong is exactly
the trim drift this dataset keeps hitting. It prints each candidate with drive, range and class,
marks the ones whose range matches the record exactly, and leaves the call to a person.

Two things it has to do that were learned the hard way here:

- **Search modelYear-1 through modelYear+1.** EPA's certification year and the maker's model year
  genuinely disagree — Cadillac ships the Optiq as MY2025 and EPA lists it only under 2026.
- **Match on any word of the model name, not just the whole string.** EPA calls the Mercedes
  G-Class "G 580 with EQ Technology", which shares no substring with what we call it, and files
  the Maybach EQS SUV under make "Mercedes-Benz" rather than "Mercedes-Maybach" (aliased).

### The remaining 15, with the reason each is still unassigned

Most are not research failures — **EPA simply has no entry**:

- **Cadillac Escalade IQ** (2) — absent from EPA's Cadillac list in both 2025 and 2026, which
  carries only the gas Escalade 2WD/4WD/V.
- **Chevrolet Silverado EV RST (Max Range)** — EPA's 2026 Silverado EV entries are all WT or
  unlabelled Ext/Std Range; there is no RST, and nothing rated 460mi.
- **Tesla Cybertruck Cyberbeast** — EPA lists Cybertruck AWD and Dual Motor AWD at 325mi and Long
  Range at 335mi. No Cyberbeast entry, and nothing at our 320mi.
- **Tesla Model Y L** — not in EPA's 2026 Tesla list (Long Range AWD/RWD, Performance, Standard).
- **Ford E-Transit** — no Transit entry of any kind in EPA's Ford list.
- **Porsche Cayenne Electric** (2) — absent from EPA entirely, which is consistent: both records
  already carry `range.epaMiles: "Pending"`.
- **Rivian R1S Quad-Motor Max Pack** — EPA published no Quad entries for MY2025 at all.
- **Volvo EX60 P6** — deliberate; cites Volvo because EPA published only the 22-inch car.

Four need a **decision rather than a lookup**, and should not be assigned mechanically:

- **Cadillac Optiq** (2) — we hold MY2025 at 302mi; EPA lists the Optiq only under MY2026, AWD at
  303mi. Same manufacturer-vs-EPA year divergence as the Lexus ES, plus a 1-mile range gap that
  needs explaining before linking.
- **Rivian R1S Dual-Motor Large Pack** and **R1T Adventure Dual-Motor Large Pack** — both record
  329mi with wheels [20, 22], but EPA splits by wheel: 300mi on 20in and 329mi on 22in. Our figure
  is the 22-inch one while the record claims both sizes. The same wheel-specificity problem the
  EX60 P6 had, and it wants the same treatment.
- **Rivian R2 Premium AWD** — worth a proper look. EPA's only 2027 R2 entries are **Performance**
  AWD (307mi on 20in AT, 330mi on 21in). Our record is *Premium* AWD carrying 330mi, which EPA
  attributes to the Performance on 21-inch wheels. That is either a missing EPA entry or trim
  drift in our data, and it should be resolved before an id is attached.

## Heat pump + top speed backfill — queued 2026-08-28

83 records need one or both: **heat pump** is null on 56, **top speed** on 38, overlapping on 11.
Paired because [evspecifications.com](https://www.evspecifications.com/en/brands) carries both on
one page, so most records cost a single visit.

### The rule that matters: on this source, presence is trustworthy and absence is not

Its "Thermal Management" row says "Liquid-based coolant circulation / Heat pump" on the 2026 BMW
i4 and the 2026 iX, but only "Liquid-based coolant circulation" on the 2024 i5 — and the i5 does
have a heat pump. The field is populated inconsistently, and older entries look thinner.

So: **a positive mention writes ; silence writes nothing.** Never record  because the
page didn't say "heat pump" — that would manufacture ~50 wrong booleans, which is far worse than
leaving them null. A  needs a source that explicitly says the trim lacks one.

That distinction matters more here than for most fields, because **heat pump is genuinely
trim-dependent**. The ten  values already in the dataset are all base trims — Q4 e-tron,
Ioniq 5 SE Standard Range, EV6 Light, Solterra, bZ, ID.4 Standard, Uncharted — while the same
nameplate's upper trims are . Getting the trim wrong flips the value.

Top speed has no such problem: it is a clean, single, well-populated row.

### Extraction

    Top speed:  /Top speed:\s*([0-9.]+)\s*mph/          on the summary line
    Heat pump:  "Thermal Management" section, look for /heat pump/i

Model pages are opaque hashes (`/en/model/d47a45e`), so each brand's index page
(`/en/brand/{hash}`, all 48 linked from `/en/brands`) has to be read first to map model names to
URLs. Read them through the browser rather than one fetch per page — several navigations batch
into a single round trip.

### Batch A — Mercedes-Benz (8 records) — DONE, 8/8
- [x] 2025 Mercedes-Benz EQB — 250+ · **99 mph** (matches its EQB 350 sibling; MBUSA/Edmunds)
- [x] 2025 Mercedes-Benz EQE SUV — 350+ · **130 mph**
- [x] 2025 Mercedes-Benz EQE Sedan — 350+ · **130 mph**
- [x] 2025 Mercedes-Benz EQE Sedan — 500 4MATIC · **130 mph**
- [x] 2025 Mercedes-Benz EQS SUV — 450+ · **130 mph**
- [x] 2025 Mercedes-Benz EQS Sedan — 450+ · **130 mph**
- [x] 2025 Mercedes-Benz EQS Sedan — 580 4MATIC · **130 mph**
- [x] 2026 Mercedes-Benz G-Class — G 580 w/EQ Technology · **heat pump true** (MBUSA: standard,
      scavenges waste heat from motors and battery)

Every non-AMG EQE and EQS is electronically limited to the same 210 km/h, which the four sedan
pages on evspecifications render as 130.5 mph. Recorded as **130** to match the US figure and the
EQE SUV 500, EQS SUV 580 and CLA records already in the dataset — the file stores integers.

evspecifications' Mercedes catalogue is thin and EU-only: no EQE SUV, EQS SUV, G-Class or EQB
250+. Those four came from manufacturer and US press sources instead.

### Batch B — Cadillac, Chevrolet (12 records) — 6/12
- [ ] 2026 Cadillac Escalade IQ — Luxury AWD · _top speed_ — **not published**
- [ ] 2026 Cadillac Escalade IQ — Premium Sport AWD · _top speed_ — **not published**
- [x] 2025 Cadillac Lyriq — Luxury RWD · **118 mph**
- [x] 2025 Cadillac Lyriq — Sport AWD · **130 mph**
- [x] 2025 Cadillac Optiq — Luxury AWD · **heat pump true**
- [x] 2025 Cadillac Optiq — Sport AWD · **heat pump true**
- [ ] 2026 Chevrolet Blazer EV — LT FWD · _top speed_ — **not published**
- [ ] 2026 Chevrolet Blazer EV — LT AWD · _top speed_ — **not published**
- [ ] 2026 Chevrolet Equinox EV — LT FWD · _top speed_ — **not published**
- [ ] 2026 Chevrolet Equinox EV — RS AWD · _top speed_ — **not published**
- [x] 2026 Chevrolet Silverado EV — WT (Standard Range) · **heat pump true**
- [x] 2026 Chevrolet Silverado EV — RST (Max Range) · **heat pump true**

The Lyriq splits by drivetrain — **118 mph RWD against 130 mph AWD** — which is why the two
records were looked up separately rather than one figure copied across. Confirmed against a US
source as well as evspecifications.

All four heat pumps are `true` for the same reason: **GM's Ultium Energy Recovery system, a
patented heat pump, is standard across the platform**, which covers the Optiq and both Silverado
EVs. That is a platform fact rather than a per-trim one, so it is safe to apply across GM Ultium
records — but it was confirmed per model, and it should not be extended to the Hummer without
checking, since the Hummer was the first Ultium vehicle and may predate the system.

**GM does not publish top speed.** Neither evspecifications, Edmunds, KBB nor Chevrolet's own
pages carry it for the Blazer EV, Equinox EV or Escalade IQ. The figures that circulate come from
simulation sites, not the manufacturer, so those six stay null.

### Batch C — Audi, GMC (9 records) — 8/9
- [x] 2025 Audi Q8 e-tron — Premium quattro · **heat pump true**
- [x] 2025 Audi e-tron GT — S e-tron GT Premium Plus quattro · **heat pump true**
- [x] 2025 Audi e-tron GT — RS e-tron GT performance · **heat pump true**
- [x] 2027 Audi A6 e-tron — Premium · **130 mph**
- [x] 2027 Audi A6 e-tron — Premium Plus quattro · **130 mph**
- [x] 2025 GMC Hummer EV Pickup — 3X · **heat pump true**
- [x] 2026 GMC Sierra EV — Elevation (Standard Range) · **heat pump true**
- [x] 2026 GMC Sierra EV — Denali (Extended Range) · **heat pump true**
- [~] 2025 GMC Hummer EV SUV — 3X · **heat pump true**, top speed **not published**

evspecifications was no help for Audi either — its catalogue stops at the Q4 e-tron and the old
e-tron, with no Q8 e-tron, e-tron GT or A6 e-tron. All five Audi values came from Audi instead:
the technology portal states the e-tron GT's heat pump is standard equipment, and Audi USA lists
the Q8 e-tron's climate control as including one.

The A6's two top speeds were looked up separately rather than shared, since the records are
different drivetrains — both land on the same 130 mph electronic cap, but that is now a checked
fact rather than an assumption.

**The Hummer question resolved on a platform fact.** GM's Ultium Energy Recovery system — a
patented heat pump — launched *with* the Hummer EV, so the earlier caution about it predating the
system was unfounded. All four GMC heat pumps are `true`. GM still publishes no top speed, so the
Hummer SUV's stays null.

### Batch D — Genesis, Hyundai, Kia (10 records) — 8/10
- [x] 2025 Genesis Electrified G80 — Advanced AWD · **heat pump true**
- [x] 2025 Genesis Electrified GV70 — Advanced AWD · **heat pump true**
- [x] 2025 Genesis GV60 — Standard RWD · **heat pump true**
- [x] 2025 Genesis GV60 — Performance AWD · **heat pump true**
- [x] 2026 Hyundai Ioniq 9 — Calligraphy AWD · **heat pump true**
- [~] 2026 Hyundai Ioniq 9 — S RWD · **heat pump true**, top speed not published
- [ ] 2025 Hyundai Kona Electric — SE FWD · _heat pump_ — **left null on purpose, see below**
- [ ] 2025 Hyundai Kona Electric — Limited FWD · _heat pump_ — **left null on purpose**
- [x] 2025 Kia Niro EV — Wind FWD · **heat pump false**
- [x] 2025 Kia Niro EV — Wave FWD · **heat pump false**

Genesis fits a heat pump across the line — the 2025 GV60 features-and-specs sheet lists it on the
base Standard trim, so it holds for the trims above it. The Ioniq 9's own Hyundai USA S-trim page
lists an HVAC heat pump, and standard on the base trim carries upward.

The **Niro EV is the batch's `false`**, and a sourced one: Kia's own trim comparison shows the
heat pump arriving only via an option package on Wind and via the Preserve package on Wave, so
neither trim has one as standard.

**The Kona Electric is deliberately still null.** The "standard on all Kona Electric" claim traces
to a UK review, and Hyundai's own US trim comparison does not list the feature at all — its
rendered page and full HTML contain no "heat pump" string. Writing `true` from a UK source would
be the same mistake as writing `false` from silence. Hyundai is precisely the make where this
matters: the Ioniq 5 SE Standard Range in this dataset is `false` while the Limited is `true`.

### Batch E — Lexus, Toyota, Subaru (11 records)
- [ ] 2027 Lexus ES — 350e FWD · _heat pump + top speed_
- [ ] 2027 Lexus ES — 500e AWD · _heat pump + top speed_
- [ ] 2026 Lexus RZ — 350e FWD · _heat pump + top speed_
- [ ] 2026 Lexus RZ — 550e F SPORT AWD · _heat pump + top speed_
- [ ] 2026 Toyota bZ — XLE FWD · _top speed_
- [ ] 2026 Toyota bZ — Limited AWD · _top speed_
- [ ] 2026 Toyota bZ Woodland — Woodland · _heat pump + top speed_
- [ ] 2026 Toyota bZ Woodland — Woodland Premium · _heat pump + top speed_
- [ ] 2025 Subaru Solterra — Premium AWD · _top speed_
- [ ] 2025 Subaru Solterra — Touring AWD · _top speed_
- [ ] 2026 Subaru Uncharted — Premium · _top speed_

### Batch F — Nissan, Ford, Honda, Dodge (11 records) — 4/11
- [x] 2025 Ford F-150 Lightning — Flash · **heat pump true**
- [x] 2025 Ford F-150 Lightning — Platinum · **heat pump true**
- [x] 2025 Honda Prologue — EX FWD · **heat pump true**
- [x] 2025 Honda Prologue — Elite AWD · **heat pump true**
- [ ] 2026 Ford E-Transit — Cargo Van Low Roof RWD · _heat pump_
- [ ] 2025 Nissan Ariya — Engage FWD · _heat pump + top speed_
- [ ] 2025 Nissan Ariya — Platinum+ e-4ORCE AWD · _heat pump + top speed_
- [ ] 2026 Nissan Leaf — S+ FWD · _heat pump_
- [ ] 2026 Nissan Leaf — SV+ FWD · _heat pump_
- [ ] 2025 Dodge Charger Daytona — Scat Pack AWD · _heat pump_
- [ ] 2025 Dodge Charger Daytona — R/T AWD · _heat pump_

Ford's own support page states the Vapor Injection Heat Pump is standard on every 2024-and-newer
F-150 Lightning trim. The Prologue is GM Ultium underneath, so it inherits the same Ultium Energy
Recovery heat pump as the Silverado and Sierra — a platform fact, corroborated independently.

### Batch G — Rivian, Tesla, Porsche, Volvo, Volkswagen, BMW, Fiat, MINI, Lucid (15) — 6/15
- [x] 2025 Volkswagen ID. Buzz — Pro S · **heat pump true**
- [x] 2025 Volkswagen ID. Buzz — Pro S Plus 4MOTION · **heat pump true**
- [x] 2026 Porsche Cayenne Electric — Base · **heat pump true**
- [x] 2026 Porsche Cayenne Electric — Turbo · **heat pump true**
- [x] 2025 MINI Countryman Electric — SE ALL4 · **heat pump true**
- [x] 2027 BMW iX3 — 50 xDrive · **130 mph**
- [ ] 2025 Volvo EX30 — Single Motor Extended Range · _heat pump_ — wording is "available on", not
      "standard"; Volvo's own support article 403s the fetcher
- [ ] 2025 Volvo EX30 — Twin Motor Performance · _heat pump_ — same
- [ ] 2025 Fiat 500e — (500e)RED · _heat pump_ — **sources contradict each other**, see below
- [ ] 2026 Tesla Model S — AWD · _top speed_ — **sources contradict each other**
- [ ] 2026 Tesla Model S — Plaid AWD · _top speed_ — **sources contradict each other**
- [ ] 2026 Lucid Gravity — Touring AWD · _top speed_ — Lucid's own Touring spec sheet would settle
      it but the attachment returns only navigation; do **not** copy the Grand Touring's 155 mph
- [ ] 2025 Rivian R1T — Adventure Dual-Motor AWD (Large Pack) · _top speed_
- [ ] 2027 Rivian R2 — Premium AWD · _heat pump + top speed_
- [ ] 2027 Rivian R2 — Performance AWD · _heat pump_

VW states plainly that a heat pump is standard on all US ID. Buzz models. Porsche's own
high-voltage press kit for the Cayenne Electric describes an integrated heat pump as part of the
architecture, consistent with the Taycan and Macan records already `true` here.

**Three left null because sources actively disagree, not because none were found:**

- **Fiat 500e** — one source attributes to Stellantis that the 500e heats the cabin with an HV air
  PTC element rather than a heat pump; another says it has one. An explicit negative would be
  recordable, but not while a positive claim sits beside it.
- **Tesla Model S** — the 2026 Plaid's limit is variously reported as 149 mph, 163 mph on 21-inch
  wheels, and 200 mph with a paid upgrade, and one summary gave 130 mph for the non-Plaid AWD
  while asserting 200 for the Plaid in the same breath. Tesla's own page is the only thing that
  will settle this.
- **Volvo EX30** — every source says the heat pump is "available on" the Single Motor Extended
  Range and Twin Motor Performance, which is exactly the standard-or-optional ambiguity that makes
  the difference between `true` and `false`.

### Batch H — Acura, Jeep, VinFast (7 records) — 2/7 — **not listed on evspecifications**
- [x] 2024 Acura ZDX — A-Spec RWD · **heat pump true**
- [x] 2024 Acura ZDX — Type S AWD · **heat pump true**
- [ ] 2026 Jeep Recon — Moab 4WD · _heat pump_
- [ ] 2025 Jeep Wagoneer S — Launch Edition AWD · _heat pump_
- [ ] 2025 VinFast VF8 — Eco AWD · _heat pump_
- [ ] 2025 VinFast VF8 — Plus AWD · _heat pump_
- [ ] 2025 VinFast VF9 — Plus AWD · _heat pump_

The ZDX is GM Ultium under Acura badging, so it takes the same platform heat pump as the Prologue.

## Progress: 55 of 83 filled. heat pump 56 -> 11 null, top speed 38 -> 17 null.

Batches A-D done or near-done, G part-done; **E is untouched, F, G and H are partial.**

What the batches so far established, worth carrying into the rest:

- **evspecifications is far thinner than its BMW pages suggested.** It has no EQE SUV, EQS SUV,
  G-Class, EQB 250+, Q8 e-tron, e-tron GT or A6 e-tron, and its GM pages carry neither a top speed
  nor a heat pump mention. Most values so far came from manufacturers instead. Check the brand
  index first rather than assuming coverage.
- **Platform facts close whole makes at once.** GM's Ultium Energy Recovery heat pump is standard
  across the platform and it launched *with* the Hummer EV, which settled ten records — Optiq,
  both Silverados, both Sierras, both Hummers, both Prologues and both ZDXs — from one sourced
  fact rather than ten lookups.
- **GM and Rivian do not publish top speed**, and neither do Hyundai or Subaru so far. The figures
  circulating for those come from simulation sites, not manufacturers.
- **Top speed can split by drivetrain within a model.** The Lyriq is 118 mph RWD against 130 mph
  AWD. Look each record up rather than sharing a figure across trims.

## Full-file sanity sweep (2026-08-28) — 26 things to double-check

Ran a broad scan for the failure modes that don't show up as missing data: inverted orderings
within a model, structurally impossible values, unit-conversion tells, cross-model copy-paste, and
internal contradictions. Most of what it surfaced was benign and is explained below so nobody
re-investigates it. Four classes are real and are now **live flags in `npm run audit`** — that
command no longer reports "No flags", deliberately, because these are genuinely unresolved.

### 1. Tow capacity looks European on 20 records — the biggest finding

This dataset is US-market, and US sources quote round pounds: 3,500 / 2,200 / 8,500 / 12,500. But
twenty records carry values that are round in **kilograms** and not in pounds — 3,527 lb is exactly
1,600 kg, 2,205 lb is 1,000 kg, 7,716 lb is 3,500 kg. Those numbers came off European spec sheets.

Two cases prove it rather than merely suggest it, because the same nameplate carries both
conventions:

- **Tesla Model Y** — Standard RWD 3,500 lb, Premium AWD 3,500 lb, **L 3,527 lb**. Tesla's US
  figure is 3,500. The L is the odd one out within its own model.
- **Volvo EX30** — Single Motor Extended Range 2,000 lb, **Twin Motor Performance 3,527 lb**. Two
  conventions in one model, and a Twin Motor rated to tow 76% more than the Single Motor is
  independently odd.

**Why this matters more than tidiness:** the European car is frequently rated to tow when the US
car is not rated at all. A converted figure can therefore be not just imprecise but wrong in kind —
advertising a tow rating the US buyer does not have. Each of the twenty needs checking against a US
rating, and some may belong at `0` (this dataset's existing encoding for "not rated to tow",
used on 34 records) rather than a number.

Affected: BMW i4 x2, i5 x2 · Kia Niro EV x2 · MINI Countryman SE · Porsche Macan x2, Cayenne
Electric x2 · Tesla Model 3 x2, Model Y L · VinFast VF8 x2, VF9 · Volvo EC40 x2, EX30 Twin Motor.

Note the Tesla Model 3 nuance: Tesla USA does now publish a **2,200 lb** rating, so our 2,205 is
the right car with the wrong provenance — nearly right, but sourced from the metric figure.

### 2. Two top speeds where the lower-powered trim is faster

- **Dodge Charger Daytona** — R/T 496 hp does 137 mph, beating the Scat Pack's 670 hp at 134 mph.
- **Tesla Model Y** — Premium AWD 346 hp does 133 mph, beating the L's 444 hp at 125 mph.

Both are *possible* — a heavier three-row body or a tyre rating can lower the limiter on the more
powerful car — but both are the classic shape of a figure taken from the wrong trim.

### 3. Kia Niro EV top speed is 103.8 mph

Every other top speed in the file is a whole number. 103.8 is 167 km/h unrounded — a conversion
that escaped the house convention. Both Niro trims carry it. Round it, or replace it with Kia's
US figure.

### 4. Lucid Gravity Touring tows 5,999 lb

Its Grand Touring sibling is 6,000. A one-pound difference is not a real specification.

### Checked and benign — recorded so it isn't re-investigated

- **26 sibling pairs share a top speed despite different power.** This is the expected pattern, not
  drift: manufacturers cap a whole line at one electronic limit. Volvo is 112 mph across EX30/EC40/
  EX60/EX90, Mercedes 130 across EQE/EQS/CLA, Hyundai 115 across Ioniq 5/6, VW 99. Deliberately
  **not** made an audit check — it would fire 26 times and mean nothing.
- **Rivian R1S and R1T share 329 mi / 109.4 kWh / 533 hp / 4.5 s.** Looks like cross-model
  copy-paste; it isn't. EPA's own listings give both the 22-inch Dual Large at 329 mi.
- **Tesla Model Y L: 79 kWh / 325 mi against Premium AWD's 78.4 kWh / 327 mi.** Bigger battery,
  less range — but the L is the longer, heavier three-row body, so this is real.
- **Mustang Mach-E GT at 5.2 in** ground clearance for an SUV — the GT is lowered.
- **Efficiency outliers** all explicable: Hummer 1.52 mi/kWh (heavy), E-Transit 1.77 (van), Lucid
  Air Pure 5.00 (efficient), Tesla Standard 5.35 (LFP, already confirmed against two EPA stickers).
- **Kia EV9 Light RWD 235 kW vs Wind AWD 210 kW** — the cheaper trim charging faster looks wrong,
  but the Light uses the smaller 76.1 kWh pack with a different charge curve. Worth a glance if
  anyone is in that record anyway; not flagged.
- **Ford E-Transit max cargo 277.7 cu ft** — high, but it is a cargo van.

### Settled: `towCapacityLbs: 0` is correct, and now documented

Raised as an inconsistency — `towCapacityLbs` uses `0` on 34 records and never `"N/A"`, while
`groundClearanceIn` uses `"N/A"` for what looked like the analogous case. It isn't analogous, and
`0` is right: the Mustang Mach-E is **literally rated to tow 0 lb**. That is a published
manufacturer figure, so it is data. Ground clearance on an air-suspension car is the genuinely
different case — no single number was ever quoted.

The test is now written into `data/SCHEMA.md`: **was a number ever quoted, not whether the number
is large.** Keeping the zero also keeps the field numeric for the filter slider.

## Tow-rating batch (2026-08-28) — DONE: 11 corrected, 9 false positives, 0 open

Working the 20 metric-looking tow ratings in batches of under five.

### Corrected from US sources (6)

    Model Y L        3527 -> 3500   Tesla rates 3,500lb across every 2026 trim
    Model 3 x2       2205 -> 2200   Tesla USA publishes 2,200lb; 2,205 was 1,000kg
    EX30 Twin Motor  3527 -> 2000   Volvo USA gives 2,000lb for both EX30 drivelines
    EC40 x2          3307/3968 -> 2000   Volvo rates the C40 Recharge/EC40 at 2,000lb model-wide

Both in-model contradictions resolved in the direction the sweep predicted: the Model Y L and the
EX30 Twin Motor were each carrying a European figure while their own siblings carried the US one.
Confirming the heuristic from the other side, 3,500lb is 1,588kg and 2,000lb is 907kg — neither
round in metric, which is what a natively-US figure looks like.

### False positives — the heuristic's real limitation (4)

**Porsche publishes the metric-derived number as its US spec.** porsche.com/usa quotes **7,716 lbs**
for the Cayenne Electric and **4,409 lbs** for the Macan Electric. Both are exactly round in
kilograms, and both are correct. Cleared in `scripts/audit-cleared.json` with that reasoning.

So the rule is not "round in kg means wrong". It is **"round in kg means check"** — and the check is
whether the *US manufacturer* publishes that number, not whether the number looks metric. Worth
remembering before assuming the remaining ten are errors.

(Noted while there: Porsche raised the Macan 4, 4S and Turbo to 5,500 lbs for MY2026. Our records
are MY2025 and correct at 4,409, but that value must not be carried forward if they move to 2026.)

### Closed — all 20 resolved

**Corrected (11):** the 6 above, plus BMW i4 x2 / i5 x2 and Kia Niro EV x2 to `0`, and the Tesla
Model Y Premium AWD's top speed.

BMW offers no factory tow package on the i4 or i5 in North America and publishes no US rating;
Kia publishes none for the Niro EV and its US owner documentation does not approve towing. Per the
decision recorded in `data/SCHEMA.md`, those become `0` — no published rating means no towing,
which is very likely right and more useful to someone filtering for a car that *can* tow than an
empty cell. Each record's notes say the zero is an inference and names the European figure it
replaced.

The i4 eDrive40 had already been contradicting itself: its notes said "no factory tow rating is
published for the US" while the record carried 3,527 lb. Someone had found this before; only the
number had not caught up.

**Cleared as false positives (9):** Porsche Cayenne Electric x2 (7,716 lb) and Macan x2 (4,409),
MINI Countryman SE (2,645), VinFast VF8 x2 and VF9 (3,968), and the Dodge Charger Daytona top-speed
inversion.

### What the batch taught, which is the part worth keeping

**Nine of twenty were false positives.** Porsche, MINI and VinFast all publish the metric-derived
number as their own US spec — MINI USA's page says "up to 2,645 pounds with the available
factory-installed trailer hitch" in its own words and its FAQ structured data. So the check does
not mean "this number is wrong". It means **"verify this number against the US manufacturer"**, and
roughly half the time the manufacturer is the source of the metric-looking figure.

**The in-model contradictions were the reliable signal**, not the metric shape on its own. Every
case where one nameplate carried two conventions turned out to be a genuine error: the Model Y L
against its siblings' 3,500 lb, the EX30 Twin Motor against the Single Motor's 2,000 lb, and the
Model Y Premium AWD's 133 mph against 125 mph on both its siblings.

**One diagnosis flipped on inspection.** The Model Y top-speed flag read as "the L is too slow";
the L was right at 125 mph and the *Premium AWD's* 133 mph was the error — a figure matching no
Model Y variant. Worth remembering that a flag names a pair, not a culprit.

**The Dodge inversion was real.** Dodge's own spec sheet lists R/T 137 mph against Scat Pack
134 mph, alongside 0-60 of 4.7s and 3.3s. The more powerful car is limited slightly lower.

`npm run audit` is back to **No flags**.

## New field: `charging.superchargerAccess` (2026-08-28)

**Why it exists.** `nacsAdapter.available` and `portType` describe how a car *plugs in*; they do
not say whether it is *allowed on the network*. Those are granted by different mechanisms — an
automaker signs an agreement with Tesla and ships app/billing integration, whereas a connector or
an adapter is just a part. The field answers the question buyers actually mean: can this car
charge at a Supercharger?

**It deliberately cuts across both routes**, so one filter shows every Supercharger-capable car,
whether it gets there natively or with an adapter. `portType` and `nacsAdapter` remain separate
filters for anyone who cares which. Populated on all 149: **144 true, 5 false**.

**The five that cannot:**

- **VinFast VF8 x2, VF9** — no manufacturer-approved adapter and no agreement.
- **Audi Q4 e-tron x2** — Audi states outright that the Q4 "is not currently able to utilize the
  Audi NACS DC Charging Adapter or the Tesla NACS Partner Supercharger network", while every other
  Audi e-tron can. The reason is worth recording: the Q4 is essentially a rebadged VW ID.4 on a
  400V architecture, and it was left out when the rest of the Audi line was enabled.

**They are collinear today, and that is fine.** No car in the set has an approved adapter or a
native port yet lacks access, so the new column agrees with `nacsAdapter.available` everywhere.
That is not an argument against the field — the two demonstrably diverge *in time*. Stellantis
signed its NACS agreement and had approved-adapter plans long before access actually went live for
Jeep, Dodge, Fiat and Ram in **March 2026**. During that window our data said `adapter=true` for
cars that could not in fact charge at a Supercharger. The next brand rollout will do the same.

**This field goes stale**, unlike ground clearance. Brands get switched on; models get added or
excluded. It needs periodic re-checking, and `SCHEMA.md` says so.

**Checked while populating**, so it isn't re-researched:

- **Volkswagen has access** (from 18 Nov 2025, adapter standard on MY2026 cars). An Audi source
  said "Volkswagen is not Tesla's NACS partner yet", which was true when written and is not now —
  a good reminder that sources on this topic date fast.
- **Stellantis is live** as of March 2026, and the eligible list explicitly covers the Charger
  Daytona, Wagoneer S, Fiat 500e and the 2026 Recon — every Stellantis record here.
- **Subaru Solterra has access** through the SubaruConnect app; the certified adapter's price is
  still unpublished, which is why `costUsd` stays null and is correct.
- **Our Nissan Leaf records are the 2026 NACS-native car**, not the old CHAdeMO Leaf that cannot
  use Superchargers at all.
- VW's own wording independently confirms the DC scoping done earlier: "NACS DC adapters are only
  for use with compatible DC fast chargers. They are not designed for use with Level 1 or Level 2
  AC charging equipment."

## Repurposed the NACS hub to Supercharger access (2026-08-28)

`/non-tesla-evs-with-nacs-port/` answered *how a car plugs in*. It now answers what buyers
actually ask — **can it charge at a Supercharger?** — which only became expressible once
`charging.superchargerAccess` existed. The page used to end by disclaiming the very thing it was
being read for ("whether a vehicle can use every Supercharger stall also depends on network
access agreements"); it now states it.

    slug   non-tesla-evs-with-nacs-port  ->  non-tesla-evs-with-supercharger-access
    match  chargePort === "NACS"         ->  superchargerAccess === true
    count  51 cars                       ->  133 cars

**The old URL still works.** GitHub Pages has no server-side redirects, and this was the most
citable page on the site, so `prerender.mjs` now emits a stub at any renamed hub's old path: a
`<link rel="canonical">` at the new URL (which is what actually tells a crawler the page moved and
carries its authority across), plus a meta refresh and a visible link for a human who lands there.
The stub is deliberately kept **out of `sitemap.xml`** and marked `noindex, follow` — it is a
signpost, not a page. `RENAMED_HUBS` in `prerender.mjs` is the table; **keep entries forever**, since
a 404 is worse than a stub.

**The list is now near-total on purpose — 133 of 138 — and that is the answer.** Almost every
non-Tesla EV can Supercharge in 2026, so the interesting content moved into the intro: the
native-vs-adapter split (51 native, 82 by adapter, 21 of those free) and, more usefully, the five
that still cannot — Audi Q4 e-tron and the three VinFasts, named in the page text.

Verified: the new hub renders with 133 cars, the old path redirects to it, the sitemap carries the
new slug and not the old, and hub backlinks on car pages follow the field — an Ioniq 5 carries the
link, while the Q4 e-tron (no access) and any Tesla correctly do not.

## Mobile: category pills were eating the fold (2026-08-28)

On a 375px phone the ten category chips wrapped to roughly **340px of vertical space — taller than
the first car card** — so the list a visitor came for started below the fold. Two changes:

**Shorter chip labels.** Hubs gained an optional `pill` property used only by the homepage nav;
the full `h1` stays the page's heading, its `<title>`, and now the anchor's `title` attribute, so
hover and assistive tech still get the descriptive name. "Non-Tesla EVs that can charge at a Tesla
Supercharger" becomes "Supercharger access". This helped desktop too — three sprawling rows down
to two tidy ones.

**One swipeable row on mobile**, the native chip idiom on both platforms, with a masked right edge
so it reads as scrollable rather than clipped. 340px -> 29px. Every link stays in the DOM and
rendered, so nothing is lost for crawlers or for the internal linking these pills exist to provide.
Scoped to `#hubLinks` deliberately: the make and body navs share `.hub-links` but sit *below* the
grid, where wrapping is fine and 34 chips in one scroller would not be.

### The part that nearly shipped broken: the cache-bust cascade

Assets are versioned by hand in query strings (`app.js?v=56`), and **bumping a module means
bumping everything that imports it** — otherwise a returning visitor keeps the cached parent, which
keeps importing the old child URL. Today's edits touched `fields.js`, `hubs.js` and `styles.css`,
so the full cascade was:

    fields.js  14 -> 15   (app.js, filters.js, render.js, similar.js)
               12 -> 15   (hubs.js — see below)
    filters.js 11 -> 12   render.js 30 -> 31   hubs.js 5 -> 6
    app.js     56 -> 57   styles.css 37 -> 38

This was not cosmetic. `hubs.js` calls `val("superchargerAccess", c)`, which resolves through
`fieldByKey` in `fields.js`; a client holding a pre-change `fields.js` would have got `undefined`
and the repurposed Supercharger hub would have matched nothing.

**Fixed a latent smell while there:** `hubs.js` pinned `fields.js?v=12` while everything else used
`v=14`, so the browser held **two separate module instances of the same file**. Now unified at 15.

Worth automating eventually — a content hash would remove the whole class of error. Noted, not done.

(Unrelated and pre-existing: `/favicon.ico` 404s because the site uses an inline SVG favicon. Harmless.)

## Bug: the logo rewrote the URL without going home (2026-08-28)

Clicking the brand logo while inside a hub set the URL to `/` but left the page scoped to the
category — the one state where the URL actively lies about what you are looking at.

**First attempt was wrong, and worth recording as a lesson.** The logo was a `<button>` running
JS, so I made the handler reproduce a homepage: null the hub, recompute the slider domains against
the full dataset, reset filter state, clear the search, remove the hub `<h1>`, swap the intro
paragraph back to the homepage copy and promote it to an `<h1>`. That is ~60 lines whose entire job
was to re-derive, by hand, the page that the server already renders at `/`.

It also did not work. I shipped it twice — first missing the hub state, then missing the summary
paragraph — with a third gap (the "Browse:" pill row never came back) still outstanding when the
user asked the obvious question: **the "All N models" link is just `<a href="/">` and it works, so
why is the logo a button?**

**No good reason.** The logo is now `<a class="brand" href="/">` and all ~60 lines are deleted.
The browser does the reset by navigating, which is correct by construction — there is no list of
state to keep in sync, so there is nothing to forget. The pill row came back for free, which is
precisely the point: the bug class was "hand-mirroring server-rendered state", and it is now gone
rather than patched a third time.

The codebase already had the answer: `docShell()` renders the same brand as `<a class="brand"
href="...">` on the `/data/` and `/terms/` pages. Only the app shell used a button.

Free with the change: middle-click and cmd-click open the homepage in a new tab, right-click offers
"Copy link address", and every page gains a real internal link home rather than a scripted one.

**Trade-off accepted:** clicking the logo is now a full page load, so `state.compareSet` is lost —
the earlier JS version deliberately preserved it. That matches what the "All N models" link has
always done, the compare bar has its own Clear, and comparisons are shareable by URL. Simplicity
and correctness beat preserving in-memory state on a "take me home" click.

`.brand` needed one CSS line (`text-decoration: none`); it already reset button chrome.

Verified: from `/electric-suvs-with-three-rows/` one click gives `/` with 149 cards, no hub title,
the homepage intro back as the page's single `<h1>`, all 10 category pills, no scope chip, correct
title, no console errors. Also verified the escape-hatch case the button existed for — an app
loaded on an unresolvable car slug — still gets you out.

## Small SUVs get their own silhouette (2026-08-28)

The "Crossover" body silhouette was drawn during the icon work and then orphaned when the
Crossover body style was retired on 2026-08-28 — a good drawing with nothing to point at. It is
now the icon for EPA's **Small SUV** class, which is what it actually depicts.

Worth doing because `bodyStyle: "SUV"` is a very wide bucket — 99 of 149 records — spanning a
Volvo EX30 to an Escalade IQ under one shape. Splitting on `epaSizeClass` distinguishes **47 cars,
a third of the grid**, rather than being a rare special case.

    #body-SUV        52  (37 Standard SUV, 10 unclassed, 2 Midsize Wagon, 3 Special Purpose)
    #body-SUV-Small  47

Implementation notes:

- The symbol was recovered from `dad7d73~1` and re-added as **`body-SUV-Small`**, not
  `body-Crossover`. Reviving the retired name would have quietly reintroduced the concept the
  dataset deliberately dropped; the id now describes what it is used for.
- `bodyIcon(style)` became **`bodyIcon(car)`** — the choice needs two fields, and passing the car
  avoids a two-argument call that would be easy to get backwards. Four callers in `render.js`.
- **Unclassed SUVs keep the generic shape.** 10 records have no `epaSizeClass` (no EPA id), and
  defaulting them to Small would assert something unknown. They read as plain SUVs, which is the
  honest default and matches how the rest of the dataset treats a missing value.

Verified in the browser: Cadillac shows the split correctly within one make — Escalade IQ and
Vistiq (Standard) on the generic shape, Lyriq (Small) on the new one — and the totals match the
data exactly.

Not touched, though it looks odd: EPA classes the **Optiq** as Standard SUV despite it being a
compact crossover. That is EPA's call and this dataset defers to it on purpose (see the Crossover
retirement) — overriding it by eye is exactly what `epaSizeClass` exists to avoid.

## Car detail modal: pin the car's identity while you scroll (2026-08-28)

Several screens of specs down, the "Similar vehicles" list compares each car to "this car" — with
no visible answer to which car that is. The modal's header now sticks to the top of the scrolling
body, so make, model, year, trim and price stay on screen the whole way down.

**Done without scroll-driven JS.** Rather than a header that collapses on scroll (an
IntersectionObserver, a sentinel, and a second condensed layout to maintain), the header was made
compact enough to pin as-is: trim and price now share one flex row instead of stacking, which
takes the pinned block to two lines / 85px — **12% of the modal on a phone**. Cheap enough to
leave visible always, so there is no state to manage.

### The CSS trap worth remembering

First attempt bled the header over `.modal-body`'s 28px padding with `margin: -28px -28px 14px`.
That put the header's *natural* position above the scrollport, so `position: sticky` engaged
immediately at rest — shifting it down 28px visually while layout kept it 28px higher, which slid
the summary paragraph's first line underneath it. It looked like a z-index or margin bug and was
neither.

Fix: `.modal-body` gives up its top padding and `.modal-head` supplies it instead, so the head's
natural position starts flush with the scrollport and sticky is a no-op until you actually scroll.

Also removed `.modal-summary`'s `margin-top: -8px`, which existed only to close the gap under the
old standalone `.modal-price` block — with price now inside the sticky head, it was pulling the
paragraph under it.

Verified at desktop and 375px, opened both by deep link and by clicking a grid card: header pinned
at the bottom of the scroll, 14px clear gap above the summary at rest, no console errors.

## Units were wrapping away from their numbers on mobile (2026-08-28)

The modal's spec grid stays two columns even on a phone, so cells get narrow enough that values
broke at their internal space: **"3,500" / "lb"** and **"7" / "in"** on separate lines, while the
label beside them still had room. A number and its unit are one token to a reader and should
break as one, or not at all.

Fixed in the formatters rather than the CSS: the ten unit-suffixed `format` functions in
`js/fields.js` now join with a **non-breaking space** (`\u00A0`) — mi, kWh, kW (x2), hp, lb, in,
cf (x3). The label wraps instead, which is the right thing to break: "Tow / Capacity" reads fine,
"3,500 / lb" does not.

**Deliberately not `white-space: nowrap` on `.modal-row .v`.** That would have fixed these cases
but also stopped genuinely multi-word values from wrapping — `epaSizeClass` alone has "Minicompact
Car", "Standard Pickup", "Special Purpose" — and an unwrappable long value in a narrow cell
overflows instead of wrapping. The nbsp is targeted at the actual problem and cannot overflow.

Applies everywhere `fmtVal` is used, so cards and the compare table get it too, not just the
modal. Verified in the rendered bytes (`3,500` + `C2 A0` + `lb`) and at 375px.

## Removed hand-maintained `?v=` cache-busting (2026-08-28)

Every `?v=` on css/js is gone — 15 references across five modules, `index.html` and two page
shells. The og-image one **stays**: that is a real content hash, and social scrapers cache far
more aggressively than browsers.

**Why, evidence first.** GitHub Pages serves these assets with `cache-control: max-age=600` and an
ETag (checked against the live site). So they expire on their own within ten minutes.

**And the protection was largely illusory.** A query string cannot pin old content on a static
host: `/js/fields.js?v=16` and `?v=17` both return whatever the file currently is. It only forces
a cache miss. A client with a stale cached `app.js` still requests `fields.js?v=16` and gets it
**from its own cache** — the old file. That is exactly the mismatch the versions were supposed to
prevent, and they did not prevent it.

**What they did reliably cause is the cascade.** The version lives inside the *importing* file, so
touching `fields.js` means bumping it in five importers, then bumping those importers in whatever
imports *them*, then `app.js` in two shells. Missing a link does not ship something stale, it
ships something **broken** — `hubs.js` calling `fieldByKey("superchargerAccess")` against a cached
older `fields.js` gets `undefined` and the Supercharger hub matches nothing. That nearly shipped
today, and the cascade cost something on four separate occasions in one session.

**Deploy frequency argues for removal, not against it.** More deploys means more chances to forget
a bump — a non-self-healing broken deploy — while the risk being mitigated (mixed modules for a
user active across a deploy) self-heals in ten minutes.

**If this ever needs to be strict**, the fix is an import map or hashed filenames, not query
strings. An import map is the better shape here: modules import unversioned specifiers and one
generated block in the HTML maps each to a hashed URL, so changing one file never changes another
— no cascade, and no transitive hashing needed. Naive per-file hashing does *not* remove the
cascade, it only automates it, because the importer embeds the dependency's URL.

Rationale is repeated as a comment next to the `<link>` in `index.html` and in `pageShell()`, since
the natural instinct on seeing an unversioned asset is to helpfully add a version back.
---

# TODO: Compare view — two cars fit the phone viewport exactly (2026-09-01)

**Symptom.** With two cars selected on a phone, the compare grid was slightly wider than the
viewport, so the container scrolled on *both* axes at once — a mostly-vertical drag drifted
sideways, and the horizontal scrollbar flickered in and out. Nothing was clipped badly enough to
look broken; it just felt loose. Wanted: two cars cleanly in view with no horizontal scroll at
all, and swipes that land on a column edge rather than anywhere in between.

**The actual cause, which was not what it looked like.** Measured columns were `[108, 150, 150]`
against a 331px scrollport. My first read was that 150px was a *min-content floor* — that under
`table-layout: auto` no `width` can push a column below its content's minimum, and the nowrap
"View details" button (84px min-content) was setting it. That was wrong, and shrinking the button
proved it: the columns stayed at 150px.

There was simply already a `min-width: 150px` on the car columns, in the existing mobile block at
the bottom of `styles.css` — from the earlier pass that first made this table usable on a phone.
I had written a *new* `@media (max-width: 640px)` block higher up in the file, so the older
880px block won on source order and silently reverted everything. The "mysterious floor" was my
own overridden CSS. Worth remembering: when a declaration appears to have no effect, check for a
later rule at equal specificity before theorizing about intrinsic sizing.

**Fix** — folded into the existing `@media (max-width: 880px)` block rather than adding a second
one:

- `.compare-table` gets `min-width: max(100%, calc(88px + var(--compare-cars, 2) * 118px))`.
  One or two cars resolve to `100%`, so the table fits its container exactly and there is no
  horizontal scroll to fight; three or more deliberately exceed the viewport and swipe over.
- `--compare-cars` is set on the table element by `renderCompareTable` in `js/render.js`, since
  CSS cannot branch on how many columns exist.
- Label column down to 88px (`min-width: 0`, `max-width: none` to clear the old fixed 108px);
  car columns get `width: auto` with `min-width: 0` so fixed layout splits the remainder evenly.
- `.compare-col-title` and `.compare-col-view-btn` get `white-space: normal` so a long name like
  "Audi Q4 e-tron" wraps inside its column instead of demanding width.
- `.compare-scroll` gets `scroll-snap-type: x proximity` + `scroll-padding-left: 88px`, with
  `scroll-snap-align: start` on the car header cells. `proximity` not `mandatory`: this container
  scrolls vertically too, and a mandatory x-snap fights a mostly-vertical drag. The padding keeps
  a snapped column clear of the sticky label column instead of sliding under it.
- `js/app.js`: the desktop prev/next buttons now page by `compareColWidth()` (measured from a real
  header cell) instead of a hardcoded 280px.

**Verified** at 375×812: two cars give `scrollWidth === clientWidth` (331/331, columns
`[88, 122, 122]`), no horizontal overflow, and the scroll nav auto-hides. Four cars overflow on
purpose (560 vs 331, columns `[88, 118×4]`) and `scrollTo({left: 118})` lands column 2 flush
against the sticky label column, confirming the snap points and `scroll-padding-left`. Desktop at
1280px is untouched: `table-layout: auto`, `min-width: 640px`, columns `[180, 200×6]`, no snapping.

**Not verified in-browser:** the prev/next buttons' actual movement. They use
`behavior: "smooth"`, and smooth scroll animations are a no-op in the automation pane — an
identical `behavior: "auto"` scroll on the same element moves it, `"smooth"` fires no scroll
events at all. This is environmental and predates the change; what the change touches
(`compareColWidth()`) was confirmed to return the real column width (200 at desktop).
