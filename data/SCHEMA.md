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
- If a field is genuinely unknown/not applicable, use `null` (numbers/strings) or omit nested optional sub-fields — never guess.
- Every entry MUST have `range.source` (EPA/fueleconomy.gov link) and at least one link in `links`.
- Prefer current model year (2025 or 2026) US-market specs.
- Keep `id` unique and kebab-case: `{make}-{model}-{year}-{trim}`.
