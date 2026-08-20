# EV Compare — Data Schema

Each entry in `evs.json` is one **trim** of one model (a single model year, e.g. "2025 Tesla Model Y Long Range AWD"). Popular models should have 1-2 representative trims (e.g. base RWD + top AWD/Performance) rather than every possible configuration.

```jsonc
{
  "id": "tesla-model-y-2025-long-range-awd",   // kebab-case unique id
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
    "heatPump": true
  },
  "techFeatures": {
    "appleCarPlay": false,
    "androidAuto": false,
    "wirelessPhoneCharging": true,
    "cupholders": 5,
    "usbPorts": { "typeC": 4, "typeA": 0, "total": 4 }
  },
  "driverAssist": {
    "selfDriving": {
      "available": true,
      "name": "Full Self-Driving (Supervised)",
      "subscriptionUsdPerMonth": 99
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
