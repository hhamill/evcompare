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
  "bodyStyle": "SUV",                // "Sedan" | "SUV" | "Crossover" | "Hatchback" | "Truck" | "Minivan"
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
    "source": "https://www.fueleconomy.gov/..."   // link to EPA/fueleconomy.gov listing used
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
  "towCapacityLbs": 3500,
  "groundClearanceIn": 6.6,
  "links": {
    "manufacturerSpec": "https://www.tesla.com/modely/design",
    "review": "https://www.caranddriver.com/tesla/model-y",
    "epaWindowSticker": "https://www.fueleconomy.gov/..."
  },
  "notes": "Optional short freeform note about anything unusual."
}
```

## No warranty

This data is provided as is. It is hand-compiled and may contain errors or omissions, and figures
correct when verified may since have changed. It carries no warranty of any kind, express or
implied, including fitness for a particular purpose, and no liability is accepted for any use of
it. Verify against the manufacturer before relying on a value — every record carries source links
and a `lastVerifiedDate` for exactly that. The published wrapper repeats this in its `disclaimer`
field so it travels with the file.

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
- Every entry MUST have `range.source` (EPA/fueleconomy.gov link) and at least one link in `links`.
- **Numeric ("range"-type) fields have three distinct non-value states — pick the right one, don't default everything to `null`:**
  - `null` — **unknown**: the field applies to this vehicle, we just couldn't confirm a real number from a reliable source. Never guess a number instead — leave it `null`. (e.g. cupholder count, USB port count — routinely hard to source per-trim.)
  - `"N/A"` — **not applicable**: the concept the field measures doesn't exist for this vehicle, so no number could ever fill it in. (e.g. `cargo.rearCubicFeet`/`maxCubicFeet` on a pickup truck — there's no enclosed cargo hold, just a bed, which isn't tracked by this schema; `groundClearanceIn` on a vehicle with adjustable air suspension and no single published figure — clearance genuinely isn't one number for that vehicle.)
  - `"Pending"` — **known but not yet published**: we're confident the real number exists or will exist and just hasn't been released yet, for a vehicle that's otherwise on sale now. (e.g. EPA range certification that hasn't posted to fueleconomy.gov yet for a vehicle already shipping.) Don't use this for "might not even launch in the US" uncertainty — that's still `null`.
  - Boolean fields stay plain `true`/`false`/`null` (no N/A/Pending) — a feature is either confirmed present, confirmed absent, or unconfirmed.
- Prefer current model year (2025 or 2026) US-market specs; 2027 models are fine to include if the manufacturer has published real (not estimated) specs and pricing.
- Keep `id` unique and kebab-case: `{make}-{model}-{year}-{trim}`.
- `onSaleDate`: only set this when a manufacturer has stated an actual date/month (a press release, an order-bank open date, "arriving September 2026," etc.) — never estimate it. Leave `null` for vehicles already broadly available where no specific "on sale" date is meaningful.
