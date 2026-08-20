// Central field registry: drives filter UI, card stats, and the compare table.
// type: "enum" | "enumMulti" | "boolean" | "range" | "text"
//
// Range fields may set `step` (the slider's drag granularity, e.g. 0.1 for a field that's
// naturally fractional like charging kW, 1 for a field that's naturally a count like
// passengers) — filters.js uses it for the <input type=range> step attribute instead of
// guessing one from the domain's min/max spread. `roundTo` below keeps displayed values
// at the same precision regardless of whether the number came from raw car data or from
// dragging the slider (which can otherwise accumulate floating-point noise).

function roundTo(value, decimals) {
  if (value == null) return value;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

// `compareBetter: "higher" | "lower"` marks a numeric field as having a genuinely
// uncontroversial "better" direction, so the compare table can highlight the winning
// value(s) — used only where there's broad consensus (price, range, charging speed,
// 0-60, horsepower, USB ports, self-driving cost). Left unset for fields that are more
// about tradeoffs than a clear win (doors, wheel size, cargo volume, ground clearance,
// tow capacity, passenger count) — those stay neutral rather than implying a value
// judgment that doesn't hold for every shopper.

export const FIELDS = [
  // ---- Overview ----
  { key: "make", label: "Make", group: "Overview", type: "enum", get: c => c.make },
  { key: "bodyStyle", label: "Body Style", group: "Overview", type: "enum", get: c => c.bodyStyle },
  { key: "modelYear", label: "Model Year", group: "Overview", type: "enum", get: c => c.modelYear },
  { key: "msrp", label: "Price (MSRP)", group: "Overview", type: "range", compareBetter: "lower", get: c => c.msrp,
    format: v => v == null ? "—" : `$${Math.round(v).toLocaleString()}` },
  { key: "onSaleDate", label: "On Sale Date", group: "Overview", type: "text", get: c => c.onSaleDate,
    format: v => v == null ? "Available now" : v },

  // ---- Range & Charging ----
  { key: "epaRange", label: "EPA Range", group: "Range & Charging", type: "range", compareBetter: "higher", get: c => c.range?.epaMiles,
    format: v => v == null ? "—" : `${v} mi` },
  { key: "usableKwh", label: "Battery Capacity", group: "Range & Charging", type: "range", get: c => c.battery?.usableKwh,
    format: v => v == null ? "—" : `${v} kWh` },
  { key: "chargePort", label: "Charge Port Type", group: "Range & Charging", type: "enum", get: c => c.charging?.portType },
  { key: "maxDcKw", label: "Max DC Fast Charging", group: "Range & Charging", type: "range", compareBetter: "higher", get: c => c.charging?.maxDcKw,
    format: v => v == null ? "—" : `${v} kW` },
  { key: "level2Kw", label: "Level 2 AC Charging", group: "Range & Charging", type: "range", step: 0.1, compareBetter: "higher", get: c => c.charging?.level2Kw,
    format: v => v == null ? "—" : `${roundTo(v, 1)} kW` },
  { key: "vehicleToLoad", label: "Vehicle-to-Load (V2L)", group: "Range & Charging", type: "boolean", get: c => c.charging?.vehicleToLoad },
  { key: "heatPump", label: "Heat Pump", group: "Range & Charging", type: "boolean", get: c => c.charging?.heatPump },

  // ---- Performance & Drivetrain ----
  { key: "drivetrain", label: "Drivetrain", group: "Performance & Drivetrain", type: "enum", get: c => c.drivetrain },
  { key: "allWheelDriveAvailable", label: "All-Wheel Drive Available", group: "Performance & Drivetrain", type: "boolean", get: c => c.allWheelDriveAvailable },
  { key: "zeroTo60", label: "0–60 mph", group: "Performance & Drivetrain", type: "range", step: 0.1, compareBetter: "lower", get: c => c.performance?.zeroTo60Sec,
    format: v => v == null ? "—" : `${roundTo(v, 1)}s` },
  { key: "horsepower", label: "Horsepower", group: "Performance & Drivetrain", type: "range", compareBetter: "higher", get: c => c.performance?.horsepowerHp,
    format: v => v == null ? "—" : `${v} hp` },
  { key: "towCapacityLbs", label: "Tow Capacity", group: "Performance & Drivetrain", type: "range", compareBetter: "higher", get: c => c.towCapacityLbs,
    format: v => v == null ? "—" : `${v.toLocaleString()} lb` },
  { key: "groundClearanceIn", label: "Ground Clearance", group: "Performance & Drivetrain", type: "range", step: 0.1, get: c => c.groundClearanceIn,
    format: v => v == null ? "—" : `${roundTo(v, 1)} in` },
  { key: "wheelSizesIn", label: "Wheel Size", group: "Performance & Drivetrain", type: "enumMulti", get: c => c.wheelSizesIn,
    format: v => Array.isArray(v) && v.length ? v.map(x => `${x}"`).join(", ") : "—" },

  // ---- Doors & Seating ----
  { key: "doors", label: "Number of Doors", group: "Doors & Seating", type: "enum", get: c => c.doors },
  { key: "rearDoorStyle", label: "Rear Door Style", group: "Doors & Seating", type: "enum", get: c => c.rearDoorStyle },
  { key: "slidingDoors", label: "Sliding Doors", group: "Doors & Seating", type: "boolean", get: c => c.slidingDoors },
  { key: "isThreeRow", label: "Three-Row Seating", group: "Doors & Seating", type: "boolean", get: c => c.isThreeRow },
  { key: "maxPassengers", label: "Max Passengers", group: "Doors & Seating", type: "range", step: 1, get: c => c.maxPassengers,
    format: v => v == null ? "—" : `${roundTo(v, 0)}` },
  { key: "builtInBoosterSeats", label: "Built-in Booster Seats", group: "Doors & Seating", type: "boolean", get: c => c.builtInBoosterSeats },

  // ---- Comfort ----
  { key: "leatherAvailable", label: "Leather Seats Available", group: "Comfort", type: "boolean", get: c => c.seats?.leatherAvailable },
  { key: "ventilatedAvailable", label: "Ventilated Seats Available", group: "Comfort", type: "boolean", get: c => c.seats?.ventilatedAvailable },
  { key: "heatedSteeringWheel", label: "Heated Steering Wheel", group: "Comfort", type: "boolean", get: c => c.seats?.heatedSteeringWheel },
  { key: "heatedRearSeats", label: "Heated Rear Seats", group: "Comfort", type: "boolean", get: c => c.seats?.heatedRearSeats },

  // ---- Tech & Safety ----
  { key: "appleCarPlay", label: "Apple CarPlay", group: "Tech & Safety", type: "boolean", get: c => c.techFeatures?.appleCarPlay },
  { key: "androidAuto", label: "Android Auto", group: "Tech & Safety", type: "boolean", get: c => c.techFeatures?.androidAuto },
  { key: "wirelessPhoneCharging", label: "Wireless Phone Charging", group: "Tech & Safety", type: "boolean", get: c => c.techFeatures?.wirelessPhoneCharging },
  { key: "cupholders", label: "Cupholders", group: "Tech & Safety", type: "range", step: 1, get: c => c.techFeatures?.cupholders,
    format: v => v == null ? "—" : `${roundTo(v, 0)}` },
  { key: "usbPortsTotal", label: "USB Ports (total)", group: "Tech & Safety", type: "range", step: 1, compareBetter: "higher", get: c => c.techFeatures?.usbPorts?.total,
    format: v => v == null ? "—" : `${roundTo(v, 0)}` },
  { key: "selfDriving", label: "Self-Driving Capability", group: "Tech & Safety", type: "boolean", get: c => c.driverAssist?.selfDriving?.available },
  { key: "selfDrivingCost", label: "Self-Driving Subscription", group: "Tech & Safety", type: "range", step: 1, compareBetter: "lower", get: c => c.driverAssist?.selfDriving?.subscriptionUsdPerMonth,
    format: v => v == null ? "—" : (roundTo(v, 0) === 0 ? "Included" : `$${roundTo(v, 0)}/mo`) },
  { key: "collisionAvoidanceAutoBrake", label: "Collision Avoidance Auto-Brake", group: "Tech & Safety", type: "boolean", get: c => c.driverAssist?.collisionAvoidanceAutoBrake },
  { key: "laneKeepAssist", label: "Lane Keep Assist", group: "Tech & Safety", type: "boolean", get: c => c.driverAssist?.laneKeepAssist },
  { key: "adaptiveCruiseControl", label: "Adaptive Cruise Control", group: "Tech & Safety", type: "boolean", get: c => c.driverAssist?.adaptiveCruiseControl },

  // ---- Cargo ----
  { key: "rearCubicFeet", label: "Rear Cargo Volume", group: "Cargo", type: "range", step: 0.1, get: c => c.cargo?.rearCubicFeet,
    format: v => v == null ? "—" : `${roundTo(v, 1)} cf` },
  { key: "maxCubicFeet", label: "Max Cargo (seats folded)", group: "Cargo", type: "range", step: 0.1, get: c => c.cargo?.maxCubicFeet,
    format: v => v == null ? "—" : `${roundTo(v, 1)} cf` },
  { key: "frunkCubicFeet", label: "Frunk Volume", group: "Cargo", type: "range", step: 0.1, get: c => c.cargo?.frunkCubicFeet,
    format: v => v == null ? "—" : `${roundTo(v, 1)} cf` },
];

export const GROUP_ORDER = [
  "Overview",
  "Range & Charging",
  "Performance & Drivetrain",
  "Doors & Seating",
  "Comfort",
  "Tech & Safety",
  "Cargo",
];

export const BODY_ICONS = {
  Sedan: "🚗",
  SUV: "🚙",
  Crossover: "🚘",
  Hatchback: "🚗",
  Truck: "🛻",
  Minivan: "🚐",
};

export function bodyIcon(style) {
  return BODY_ICONS[style] || "⚡";
}
