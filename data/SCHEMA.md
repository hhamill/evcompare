# EV Compare — Data Schema

`evs.json`'s top level is a small wrapper, not a bare array:

```jsonc
{
  "hash": "sha256:...",     // content hash of `models` only (never of this wrapper — that would be self-referential, since the hash is itself part of what it would be hashing). The value committed in source is whatever it was as of the last time someone ran the build locally; it's cosmetic — the authoritative one is recomputed fresh by scripts/prerender.mjs on every deploy, so it can never go stale/forgotten the way a manually-bumped value would.
  "license": "CC0-1.0",     // public domain dedication — the underlying specs aren't copyrightable anyway (facts aren't), and this makes reuse unambiguous
  "attribution": "EV Compare (evcompare.org) — appreciated, not required",  // a courtesy note, not a condition of the license the way CC BY's attribution requirement would be — CC0 grants full reuse with zero obligations regardless of whether this is honored
  "url": "https://evcompare.org",
  "generatedAt": "2026-08-21T...",  // ISO timestamp, refreshed on every build
  "count": 149,
  "models": [ /* one entry per trim, shape below */ ]
}
```

A third party that already has a local copy can check `data/current.json` (`{"current": "<hash>", "count", "generatedAt"}`, a few dozen bytes) instead of re-downloading the whole dataset just to find out nothing changed — that file and `evs.json`'s own `hash` field are always written together, so they always agree.

Each entry in `models` is one **trim** of one model (a single model year, e.g. "2025 Tesla Model Y Long Range AWD"). Popular models should have 1-2 representative trims (e.g. base RWD + top AWD/Performance) rather than every possible configuration.

```jsonc
{
  "id": "tesla-model-y-2025-long-range-awd",   // kebab-case unique id
  "url": "https://evcompare.org/2025/model-y/long-range-awd/",  // GENERATED — run `npm run sync-urls` rather than hand-writing it; the script derives it from carPath(). It is committed here so the copy of this file people take from GitHub isn't a dead end, and recomputed at publish so the deployed copy can never be stale. The build ignores whatever is committed here and warns if the two disagree. Its purpose is attribution: CC0 asks for nothing, but a record that links out to the manufacturer and fueleconomy.gov while carrying no reference to where it was compiled leaves a reader no way home even when whoever reused it would happily have pointed the way.
  "catalogId": 149,  // small permanent integer, assigned once. Used only to keep shareable comparison URLs short (/compare/12-87-34 instead of full ids) — never shown in the app. Assign the next unused number (current max + 1) to a newly added car; NEVER reassign or reuse a retired car's number, even after it's removed from `models` — an old shared link should never end up silently pointing at a different car later.
  "lastVerifiedDate": "2026-08-21",  // ISO date this specific entry's specs were last confirmed against a real source (manufacturer spec sheet, fueleconomy.gov, etc.) — not shown in the app, just internal provenance. Bump it when re-researching/correcting this entry's specs; don't bump it for unrelated changes (a notes-wording pass, a schema/UI change) that didn't touch its actual data.
  "make": "Tesla",
  "model": "Model Y",
  "trim": "Long Range AWD",
  "modelYear": 2025,
  "epaSizeClass": "Small SUV",  // GENERATED — EPA's own size class for this exact vehicle, from fueleconomy.gov's REST API (`/ws/rest/vehicle/{id}`, field `VClass`), keyed off the id already in `links.epaWindowSticker`. Run `npm run fetch-epa`. Values are EPA's own classes, **shortened losslessly** — a mechanical
  renaming, reversible to EPA's exact string, not a normalisation onto a size scale of our own
  (the point of using EPA is that it is sourced rather than judged). The full set is:
  `Small SUV`, `Standard SUV`, `Minicompact Car`, `Subcompact Car`, `Compact Car`, `Midsize Car`, `Large Car`,
  `Small Wagon`, `Midsize Wagon`, `Standard Pickup`, `Special Purpose`, `Minivan` — matching
  the short idiom every other enum here uses (`bodyStyle`, `drivetrain`, `charging.portType`).
  The mapping lives in `SIZE_CLASS` in `scripts/fetch-epa.mjs` and **throws on an unmapped
  class**, so a new EPA category fails the build rather than silently landing as `null`. Raw
  EPA values are kept verbatim in `scripts/epa-cache.json`. The drivetrain suffix EPA appends ("... 4WD") is stripped, since that is not size and `drivetrain` already records it. `null` for the 23 records with no EPA id.
  **`npm run fetch-epa` writes this field back into `data/evs.json`** — it is regenerated from the cache on every run, not hand-filled, so it cannot silently rot. EPA is the source of truth: a stored value that disagrees is overwritten, and every such change is printed, because a size class moving means either an EPA reclassification or a record pointed at the wrong vehicle. A record with no cached EPA entry is never cleared — it is reported as "not derivable" instead, so a value the generator cannot vouch for stays visible rather than being quietly trusted (the Volvo EX60 P6 is the current example: it cites Volvo rather than fueleconomy.gov, because EPA has no entry for its wheel package). `--dry-run` previews the write-back without touching the file. Deliberately NOT hand-assigned: `bodyStyle` alone cannot express size (95 of 149 records are "SUV", spanning a Volvo EX30 to an Escalade IQ), and the SUV/Crossover split it used to imply is not defensible — see the 2026-08-27 audit.
  "bodyStyle": "SUV",                // "Sedan" | "SUV" | "Crossover" | "Hatchback" | "Truck" | "Minivan"  // "Sedan" | "Coupe" | "Hatchback" | "SUV" | "Truck" | "Minivan" | "Van". **"Crossover" was retired 2026-08-28** — no field in this dataset separated it from "SUV" (ground clearance, cargo, seating and price all overlapped, and the assignments were inverted: the EX30 was an SUV with less cargo than the EC40 at identical ride height). EPA agrees: every former Crossover record classes as Small Sport Utility Vehicle or Small Station Wagon. Size now lives in `epaSizeClass`, which is sourced rather than judged. Don't reintroduce it.
  "onSaleDate": null,                // ISO date/month ("2026-09-25" or "2026-09") if a manufacturer has published one, else null. For not-yet-shipping models this is what tells a shopper "preorder now, delivery later" vs. "buy today."
  "msrp": 47990,                     // USD, base price for this trim, number or null
  "doors": 5,
  "rearDoorStyle": "Hinged",         // "Hinged" | "Sliding" | "Suicide/Coach"
  "slidingDoors": false,
  "isThreeRow": false,
  "seatingRows": 2,
  "maxPassengers": 5,
  "builtInBoosterSeats": false,
  "drivetrain": "AWD",               // "RWD" | "FWD" | "AWD"
  "allWheelDriveAvailable": true,
  "battery": {
    "usableKwh": 75,
    "warrantyYears": 8,
    "warrantyMiles": 120000
  },
  "range": {
    "epaMiles": 320,
    "source": "https://www.fueleconomy.gov/..."   // link to the EPA/fueleconomy.gov listing used, or to
                                                 // the manufacturer's own page when fueleconomy.gov has
                                                 // no entry for this exact configuration (see below)
  },
  "performance": {
    "zeroTo60Sec": 4.8,
    "horsepowerHp": 384,
    "topSpeedMph": 135
  },
  "charging": {
    "portType": "NACS",              // "NACS" | "CCS1" | "CCS2" | "CHAdeMO"
    "maxDcKw": 250,
    "level2Kw": 11.5,
    "vehicleToLoad": false,          // V2L / bidirectional power outlet
    "heatPump": true,
    "nacsAdapter": { "available": true, "costUsd": 200 }  // CCS1 vehicles only — omit entirely for NACS-native ones, don't set to a false/null placeholder. costUsd: a number for a purchased adapter, 0 if included/standard, null if available but the manufacturer hasn't published a price yet (e.g. Subaru Solterra as of this research). available: false means the manufacturer has no approved adapter at all (e.g. VinFast, and the Audi Q4 e-tron specifically despite other Audi e-trons having one) — not "hasn't been researched."
  },
  "techFeatures": {
    "appleCarPlay": false,
    "androidAuto": false,
    "wirelessPhoneCharging": true,
    "cupholders": 5,
    "usbPorts": { "typeC": 4, "typeA": 0, "total": 4 }
  },
  "driverAssist": {
    "handsFreeDriving": {
      "available": true,                    // true if the system lets you take hands off the wheel under at least some real conditions (even if geo-limited or highway-only for now) — the "if," not the "where." Distinct from adaptiveCruiseControl below, which covers hands-on Level 2 systems (BMW Driving Assistant Professional, Porsche InnoDrive, etc.) that never go hands-free.
      "name": "BlueCruise",
      "subscriptionUsdPerMonth": 49.99
    },
    "collisionAvoidanceAutoBrake": true,
    "laneKeepAssist": true,
    "adaptiveCruiseControl": true
  },
  "wheelSizesIn": [19, 20],
  "seats": {
    "leatherAvailable": false,
    "ventilatedAvailable": true,
    "heatedSteeringWheel": true,
    "heatedRearSeats": true
  },
  "cargo": {
    "rearCubicFeet": 34.4,
    "maxCubicFeet": 72.1,             // rear seats folded
    "frunkCubicFeet": 4.1
  },
  "towCapacityLbs": 3500,             // 0 = rated to tow nothing (a real rating); null = unknown. Never "N/A" — see the three-state rules below
  "groundClearanceIn": 6.6,
  "links": {
    "manufacturerSpec": "https://www.tesla.com/modely/design",
    "review": "https://www.caranddriver.com/tesla/model-y",
    "epaWindowSticker": "https://www.fueleconomy.gov/..."
  },
  "notes": "Optional short freeform note about anything unusual."
}
```

## Scope: battery-electric only

This dataset covers **battery-electric vehicles sold in the US**. Range-extended EVs (EREVs)
and plug-in hybrids are deliberately excluded — if it has an engine, it doesn't belong here,
however the manufacturer markets it. There is consequently no field for a range extender, fuel
tank or engine, and none should be added without revisiting this decision. Absences like the
Ram 1500 REV or Scout Traveler are the boundary working, not missing research.

## No warranty

This data is provided as is. It is hand-compiled and may contain errors or omissions, and figures
correct when verified may since have changed. It carries no warranty of any kind, express or
implied, including fitness for a particular purpose, and no liability is accepted for any use of
it. Verify against the manufacturer before relying on a value — every record carries source links
and a `lastVerifiedDate` for exactly that. The published wrapper repeats this in its `disclaimer`
field so it travels with the file.

## The wrapper

`models` sits inside a small wrapper carrying licence and provenance metadata. It is written
by `npm run sync-urls` here and regenerated at publish, from one shared definition in
`scripts/dataset-meta.mjs`, so the copy taken from GitHub and the copy downloaded from the
site carry identical terms:

- **`hash`** — SHA-256 over the `models` array *alone*. Deliberately excludes the wrapper: a
  file containing a hash of itself could never be stable, and this way adding metadata like
  `terms` doesn't churn the value consumers check against. Mirrored in `data/current.json`.
- **`license`**, **`attribution`** — CC0-1.0; attribution appreciated, never required.
- **`disclaimer`**, **`terms`** — the no-warranty notice and a link to the full terms. Carried
  in the file itself because a notice that lives only on a web page is worthless to someone
  holding the JSON alone.
- **`url`**, **`datasetPage`**, **`documentation`** — the site, the dataset landing page, and
  this file, so a consumer holding only the JSON can find their way back.
- **`count`** — number of records.
- **`generatedAt`** — build timestamp. **Publish-only**; it is not in the committed copy, where
  it would mean nothing (git already records when this file changed) and would churn the repo
  on every sync.

## Generated fields

`dist/data/evs.json` is not a copy of this file — `scripts/prerender.mjs` rewrites it with
values derived from the site's own routing:

- **`models[].url`** — the canonical page for that vehicle. Committed here *and* recomputed at
  publish. The committed copy exists so the file is useful when taken from GitHub; the
  recomputation means the deployed copy can never go stale. The build ignores the committed
  value and warns if it has drifted — run `npm run sync-urls` after adding or renaming a car.
- **`hash`** — SHA-256 over the published `models` array, mirrored in `data/current.json` so a
  consumer can check for changes without re-downloading. It hashes the array *as published*,
  including the derived `url` fields, so it describes the file you actually downloaded.
- **`datasetPage` / `documentation`** — where to find the human landing page and this file.
- **`generatedAt`**, **`count`** — build timestamp and record count.

## Rules for filling this out
- Use only real, verifiable public data (manufacturer spec pages, fueleconomy.gov, EPA, Car and Driver / Edmunds / MotorTrend reviews). Do not invent numbers.
- Every entry MUST have `range.source` and at least one link in `links`. Prefer a fueleconomy.gov
  listing. Cite the manufacturer's own published EPA figure instead **only when fueleconomy.gov has no
  entry for the exact configuration the record describes** — this happens when EPA has certified one
  wheel/tyre package and not another, or has not yet published a car the maker has already rated.
  Never cite a fueleconomy.gov entry whose number differs from the one recorded: a link to a page that
  contradicts the value is worse than no link. Say which configuration is involved in `notes`.
  (Live examples: the Volvo EX60 P6, where EPA lists only the 22-inch car at 295mi while this record is
  the standard 20/21-inch car Volvo rates at 307mi; and the Lexus ES 350e/500e before EPA published.)
- **Numeric ("range"-type) fields have three distinct non-value states — pick the right one, don't default everything to `null`:**
  - `null` — **unknown**: the field applies to this vehicle, we just couldn't confirm a real number from a reliable source. Never guess a number instead — leave it `null`. (e.g. cupholder count, USB port count — routinely hard to source per-trim.)
    When a field is left `null` because the search was genuinely exhausted rather than not yet
    attempted, say so in `notes` — that text is shown to site visitors, so it turns a blank cell
    into an answer. Name what was checked and keep it short, e.g. *"Public sources for this trim
    are limited: neither Lexus nor the usual US spec databases publish a top speed or state
    whether a heat pump is fitted, so both are left blank rather than estimated."*
  - `"N/A"` — **not applicable**: the concept the field measures doesn't exist for this vehicle, so no number could ever fill it in. (e.g. `cargo.rearCubicFeet`/`maxCubicFeet` on a pickup truck — there's no enclosed cargo hold, just a bed, which isn't tracked by this schema; `groundClearanceIn` on a vehicle with adjustable air suspension and no single published figure — clearance genuinely isn't one number for that vehicle.)
  - `"Pending"` — **known but not yet published**: we're confident the real number exists or will exist and just hasn't been released yet, for a vehicle that's otherwise on sale now. (e.g. EPA range certification that hasn't posted to fueleconomy.gov yet for a vehicle already shipping.) Don't use this for "might not even launch in the US" uncertainty — that's still `null`.
  - **A real zero is a value, not a gap.** `towCapacityLbs: 0` means the manufacturer rates this
    vehicle to tow nothing — the Mustang Mach-E is genuinely rated at 0 lb — which is published
    data, so it belongs as a number and not as `"N/A"` or `null`. 34 records use it. Contrast
    `groundClearanceIn`, which does use `"N/A"`: there the vehicle has an adjustable air
    suspension and no single figure exists to publish at all. The test is whether a number was
    ever quoted, not whether the number is large. Keeping the zero also keeps the field numeric
    for the filter slider.
  - Boolean fields stay plain `true`/`false`/`null` (no N/A/Pending) — a feature is either confirmed present, confirmed absent, or unconfirmed.
- Prefer current model year (2025 or 2026) US-market specs; 2027 models are fine to include if the manufacturer has published real (not estimated) specs and pricing.
- Keep `id` unique and kebab-case: `{make}-{model}-{year}-{trim}`.
- `onSaleDate`: only set this when a manufacturer has stated an actual date/month (a press release, an order-bank open date, "arriving September 2026," etc.) — never estimate it. Leave `null` for vehicles already broadly available where no specific "on sale" date is meaningful.
