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
