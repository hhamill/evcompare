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

// Car data is hand-researched from external sources rather than programmatically validated,
// so it isn't safe to assume it never contains characters that would break out of the
// innerHTML/attribute context it's interpolated into. Mirrors the same small helper already
// duplicated in render.js/filters.js/prerender.mjs for their own direct interpolation needs.
function esc(str) {
  return String(str).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

// Formats one field's raw value into display text, escaped and ready to interpolate — shared
// by the live card grid/modal (render.js) and the static per-car page's spec table
// (prerender.mjs), so a value's on-screen formatting can never quietly drift between the two.
export function fmtVal(field, value) {
  let out;
  if (field.format) out = field.format(value);
  else if (value === undefined || value === null || value === "") out = "—";
  else if (typeof value === "boolean") out = value ? "Yes" : "No";
  else out = String(value);
  return esc(out);
}

export function fieldByKey(key) {
  return FIELDS.find(f => f.key === key);
}

// Numeric ("range"-type) fields carry three distinct non-value states, not just one:
//   null      — unknown: we looked and couldn't confirm a real number.
//   "N/A"     — not applicable: the concept doesn't exist for this vehicle (e.g. enclosed
//               cargo volume on a pickup truck bed, or a single ground-clearance figure on
//               a vehicle with adjustable air suspension).
//   "Pending" — known to be coming but not yet available (e.g. EPA range certification
//               that hasn't been published yet for an already-on-sale vehicle).
// `fmtNum` centralizes that three-way branch so every field's `format` only has to supply
// the actual-number case.
function fmtNum(value, formatter) {
  if (value === "N/A") return "N/A";
  if (value === "Pending") return "Pending";
  if (value == null) return "—";
  return formatter(value);
}

// `compareBetter: "higher" | "lower"` marks a numeric field as having a genuinely
// uncontroversial "better" direction, so the compare table can highlight the winning
// value(s) — used only where there's broad consensus (price, range, charging speed,
// 0-60, horsepower, hands-free driving cost). Left unset for fields that are more
// about tradeoffs than a clear win (doors, wheel size, cargo volume, ground clearance,
// tow capacity, passenger count) — those stay neutral rather than implying a value
// judgment that doesn't hold for every shopper.

export const FIELDS = [
  // ---- Overview ----
  { key: "make", label: "Make", group: "Overview", type: "enum", get: c => c.make },
  { key: "bodyStyle", label: "Body Style", group: "Overview", type: "enum", get: c => c.bodyStyle },
  // EPA's own size class, sourced rather than judged — see data/SCHEMA.md. Sits beside
  // bodyStyle because the two answer different questions: bodyStyle is the shape (and drives
  // the silhouettes), this is the size. Together they express "small SUV", which bodyStyle
  // alone cannot — 99 of 149 records are "SUV", spanning a Volvo EX30 to an Escalade IQ.
  { key: "epaSizeClass", label: "EPA Size Class", group: "Overview", type: "enum", get: c => c.epaSizeClass },
  { key: "modelYear", label: "Model Year", group: "Overview", type: "enum", get: c => c.modelYear },
  { key: "msrp", label: "Price (MSRP)", group: "Overview", type: "range", compareBetter: "lower", get: c => c.msrp,
    format: v => fmtNum(v, n => `$${Math.round(n).toLocaleString()}`) },
  { key: "onSaleDate", label: "On Sale Date", group: "Overview", type: "text", get: c => c.onSaleDate,
    format: v => v == null ? "Available now" : v },

  // ---- Range & Charging ----
  { key: "epaRange", label: "EPA Range", group: "Range & Charging", type: "range", compareBetter: "higher", get: c => c.range?.epaMiles,
    format: v => fmtNum(v, n => `${n} mi`) },
  { key: "usableKwh", label: "Battery Capacity", group: "Range & Charging", type: "range", get: c => c.battery?.usableKwh,
    format: v => fmtNum(v, n => `${n} kWh`) },
  { key: "chargePort", label: "Charge Port Type", group: "Range & Charging", type: "enum", get: c => c.charging?.portType },
  { key: "maxDcKw", label: "Max DC Fast Charging", group: "Range & Charging", type: "range", compareBetter: "higher", get: c => c.charging?.maxDcKw,
    format: v => fmtNum(v, n => `${n} kW`) },
  { key: "level2Kw", label: "Level 2 AC Charging", group: "Range & Charging", type: "range", step: 0.1, compareBetter: "higher", get: c => c.charging?.level2Kw,
    format: v => fmtNum(v, n => `${roundTo(n, 1)} kW`) },
  { key: "vehicleToLoad", label: "Vehicle-to-Load (V2L)", group: "Range & Charging", type: "boolean", get: c => c.charging?.vehicleToLoad },
  { key: "heatPump", label: "Heat Pump", group: "Range & Charging", type: "boolean", get: c => c.charging?.heatPump },
  // "DC" is load-bearing in these two labels, not decoration. A CCS1 car can take either a
  // NACS-to-CCS1 DC adapter (Supercharger, Rivian Adventure Network) or a NACS-to-J1772 AC
  // adapter for Level 2 — and no single adapter does both. Only the DC one is tracked here,
  // because it is the one that decides whether the car can road-trip on a NACS network.
  { key: "nacsAdapterAvailable", label: "NACS DC Adapter", group: "Range & Charging", type: "boolean", get: c => c.charging?.nacsAdapter?.available },
  { key: "nacsAdapterCost", label: "NACS DC Adapter Cost", group: "Range & Charging", type: "range", step: 1, compareBetter: "lower", get: c => c.charging?.nacsAdapter?.costUsd,
    format: v => fmtNum(v, n => (roundTo(n, 0) === 0 ? "Included" : `$${roundTo(n, 0)}`)) },

  // ---- Performance & Drivetrain ----
  { key: "drivetrain", label: "Drivetrain", group: "Performance & Drivetrain", type: "enum", get: c => c.drivetrain },
  { key: "allWheelDriveAvailable", label: "All-Wheel Drive Available", group: "Performance & Drivetrain", type: "boolean", get: c => c.allWheelDriveAvailable },
  { key: "zeroTo60", label: "0–60 mph", group: "Performance & Drivetrain", type: "range", step: 0.1, compareBetter: "lower", get: c => c.performance?.zeroTo60Sec,
    format: v => fmtNum(v, n => `${roundTo(n, 1)}s`) },
  { key: "horsepower", label: "Horsepower", group: "Performance & Drivetrain", type: "range", compareBetter: "higher", get: c => c.performance?.horsepowerHp,
    format: v => fmtNum(v, n => `${n} hp`) },
  { key: "towCapacityLbs", label: "Tow Capacity", group: "Performance & Drivetrain", type: "range", compareBetter: "higher", get: c => c.towCapacityLbs,
    format: v => fmtNum(v, n => `${n.toLocaleString()} lb`) },
  { key: "groundClearanceIn", label: "Ground Clearance", group: "Performance & Drivetrain", type: "range", step: 0.1, get: c => c.groundClearanceIn,
    format: v => fmtNum(v, n => `${roundTo(n, 1)} in`) },
  { key: "wheelSizesIn", label: "Wheel Size", group: "Performance & Drivetrain", type: "enumMulti", get: c => c.wheelSizesIn,
    format: v => Array.isArray(v) && v.length ? v.map(x => `${x}"`).join(", ") : "—" },

  // ---- Doors & Seating ----
  { key: "doors", label: "Number of Doors", group: "Doors & Seating", type: "enum", get: c => c.doors },
  { key: "rearDoorStyle", label: "Rear Door Style", group: "Doors & Seating", type: "enum", get: c => c.rearDoorStyle },
  { key: "slidingDoors", label: "Sliding Doors", group: "Doors & Seating", type: "boolean", get: c => c.slidingDoors },
  { key: "isThreeRow", label: "Three-Row Seating", group: "Doors & Seating", type: "boolean", get: c => c.isThreeRow },
  { key: "maxPassengers", label: "Max Passengers", group: "Doors & Seating", type: "range", step: 1, get: c => c.maxPassengers,
    format: v => fmtNum(v, n => `${roundTo(n, 0)}`) },
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
  { key: "handsFreeDriving", label: "Hands-Free Driving", group: "Tech & Safety", type: "boolean", get: c => c.driverAssist?.handsFreeDriving?.available },
  { key: "handsFreeDrivingCost", label: "Hands-Free Driving Subscription", group: "Tech & Safety", type: "range", step: 1, compareBetter: "lower", get: c => c.driverAssist?.handsFreeDriving?.subscriptionUsdPerMonth,
    format: v => fmtNum(v, n => (roundTo(n, 0) === 0 ? "Included" : `$${roundTo(n, 0)}/mo`)) },
  { key: "collisionAvoidanceAutoBrake", label: "Collision Avoidance Auto-Brake", group: "Tech & Safety", type: "boolean", get: c => c.driverAssist?.collisionAvoidanceAutoBrake },
  { key: "laneKeepAssist", label: "Lane Keep Assist", group: "Tech & Safety", type: "boolean", get: c => c.driverAssist?.laneKeepAssist },
  { key: "adaptiveCruiseControl", label: "Adaptive Cruise Control", group: "Tech & Safety", type: "boolean", get: c => c.driverAssist?.adaptiveCruiseControl },

  // ---- Cargo ----
  { key: "rearCubicFeet", label: "Rear Cargo Volume", group: "Cargo", type: "range", step: 0.1, get: c => c.cargo?.rearCubicFeet,
    format: v => fmtNum(v, n => `${roundTo(n, 1)} cf`) },
  { key: "maxCubicFeet", label: "Max Cargo (seats folded)", group: "Cargo", type: "range", step: 0.1, get: c => c.cargo?.maxCubicFeet,
    format: v => fmtNum(v, n => `${roundTo(n, 1)} cf`) },
  { key: "frunkCubicFeet", label: "Frunk Volume", group: "Cargo", type: "range", step: 0.1, get: c => c.cargo?.frunkCubicFeet,
    format: v => fmtNum(v, n => `${roundTo(n, 1)} cf`) },
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

// Side-profile silhouette per body style: one evenodd path each — body outline, window
// cutouts as holes, wheels as solid discs. All eight are normalised to a shared baseline and
// scale, so relative size between body styles is real (a van *is* taller than a sedan) while
// every shape still sits on the same ground line in its tile.
//
// Wheel rims are deliberately filled rather than cut out: at the 30px similar-vehicle tile a
// rim hole is sub-pixel and only muddies the glyph.
//
// Shipped as a <symbol> sprite injected once (see mountBodySprite in app.js) with each icon
// referencing it via <use>. Inlining the full path per icon instead cost 165KB across a
// 149-card grid — 47% of the grid"s markup — for eight distinct shapes.
const BODY_VIEWBOX = "0 0 72 30.7";

export const BODY_SPRITE =
  `<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">
  <symbol id="body-Sedan" viewBox="0 0 72 30.7"><path fill-rule="evenodd" d="M35.27,8.42 L48.75,8.54 L53.36,9.76 L60.89,12.91 L66.48,13.4 L67.33,18.38 L68.3,19.35 L68.3,22.51 L67.21,24.09 L60.16,25.3 L59.8,22.51 L58.83,20.56 L56.28,18.74 L54.09,18.5 L52.15,18.99 L49.84,21.05 L49.11,22.75 L48.99,25.79 L21.31,26.03 L21.19,22.75 L20.46,21.05 L17.42,18.74 L15.24,18.5 L13.05,19.23 L10.99,21.29 L10.38,26.03 L4.31,25.3 L3.94,20.56 L5.16,18.14 L6.25,17.29 L12.32,15.59 L20.82,14.61 L29.08,10.0 Z M36.12,9.27 L30.78,10.49 L26.89,12.43 L23.37,15.22 L37.58,14.61 L38.67,9.39 Z M40.49,9.03 L39.89,13.04 L40.25,14.61 L49.11,14.01 L48.99,10.0 Z M49.96,10.49 L49.96,14.13 L53.49,13.52 L53.73,12.55 L52.88,11.7 Z M14.87,19.35 L17.91,19.71 L19.73,21.29 L20.46,22.99 L19.97,26.39 L17.66,28.46 L14.02,28.46 L11.96,26.88 L11.23,25.42 L10.99,23.72 L11.71,21.54 L12.81,20.2 Z M53.73,19.35 L55.31,19.23 L57.49,20.2 L59.31,23.72 L58.34,26.88 L55.31,28.7 L51.91,27.97 L49.84,25.18 L49.84,22.75 L50.57,21.29 L51.91,19.96 Z"/></symbol>
  <symbol id="body-Coupe" viewBox="0 0 72 30.7"><path fill-rule="evenodd" d="M36.61,8.66 L48.14,9.03 L53.97,10.49 L60.29,12.91 L66.84,13.4 L67.45,17.16 L68.66,18.38 L68.42,21.78 L67.09,23.84 L61.01,25.06 L60.65,22.02 L58.59,19.23 L56.4,18.26 L53.97,18.26 L52.03,19.23 L50.45,21.05 L49.72,22.99 L49.84,25.79 L21.19,26.03 L21.31,22.51 L20.34,20.56 L17.54,18.5 L15.11,18.26 L12.69,19.23 L10.86,21.29 L10.14,23.48 L10.26,26.03 L5.16,25.54 L3.34,24.69 L3.34,19.84 L4.67,18.26 L7.1,17.04 L14.87,15.1 L22.4,14.61 L32.84,9.27 Z M39.4,9.51 L32.36,10.73 L25.19,15.22 L42.8,14.37 L43.89,10.12 Z M45.47,10.0 L44.74,14.13 L51.06,13.64 L52.64,12.79 L51.79,11.7 Z M15.24,19.11 L18.27,19.71 L20.58,22.51 L20.09,26.39 L18.51,27.97 L16.57,28.7 L12.93,27.73 L11.11,24.69 L11.84,21.29 L13.41,19.71 Z M54.82,19.11 L58.1,19.96 L59.44,21.29 L60.16,23.48 L59.92,25.42 L58.71,27.36 L55.91,28.7 L52.76,27.97 L51.18,26.39 L50.45,24.21 L51.18,21.29 L52.76,19.71 Z"/></symbol>
  <symbol id="body-Hatchback" viewBox="0 0 72 30.7"><path fill-rule="evenodd" d="M39.89,5.51 L48.26,5.39 L60.16,6.36 L59.56,7.45 L64.41,12.31 L65.14,14.25 L65.14,17.41 L66.6,18.86 L66.36,22.26 L64.29,24.57 L62.47,24.69 L62.47,22.26 L60.41,19.23 L58.46,18.26 L55.79,18.26 L54.09,18.99 L52.27,20.81 L51.54,22.51 L51.42,25.3 L23.74,25.54 L23.37,22.26 L22.4,20.32 L20.34,18.5 L17.42,18.01 L14.75,18.99 L13.41,20.32 L12.2,22.99 L12.08,25.54 L6.98,25.3 L5.64,24.69 L6.13,22.26 L5.4,21.54 L5.4,20.32 L6.37,17.89 L8.19,15.83 L13.78,13.89 L21.55,12.67 L32.24,6.6 Z M38.55,6.6 L34.18,7.33 L29.56,9.27 L26.77,11.09 L26.53,13.76 L39.76,12.91 L41.1,6.72 Z M43.41,6.6 L42.92,12.67 L54.82,11.94 L55.67,10.85 L53.85,7.33 Z M16.81,19.11 L18.88,18.99 L20.58,19.71 L22.64,22.51 L22.89,23.96 L22.16,26.39 L19.12,28.7 L16.94,28.7 L15.24,27.97 L13.17,25.18 L13.41,21.78 L15.24,19.71 Z M56.16,19.11 L57.98,18.99 L59.68,19.71 L61.26,21.29 L61.99,23.24 L61.74,25.42 L60.77,27.12 L58.22,28.7 L56.04,28.7 L54.34,27.97 L52.27,25.18 L52.27,22.51 L53.0,21.05 L54.34,19.71 Z"/></symbol>
  <symbol id="body-SUV" viewBox="0 0 72 30.7"><path fill-rule="evenodd" d="M44.62,3.32 L53.49,3.2 L62.96,3.93 L65.75,7.21 L67.69,11.82 L67.69,17.16 L68.91,18.14 L68.91,20.32 L67.09,22.63 L60.77,23.36 L60.65,20.32 L59.68,17.16 L56.64,15.83 L53.24,15.83 L50.57,16.56 L48.99,18.62 L48.14,24.33 L21.43,24.57 L20.58,19.11 L19.0,16.8 L17.54,16.31 L12.93,16.31 L10.26,17.29 L8.92,19.84 L8.31,25.3 L5.89,25.3 L3.82,22.51 L3.09,19.35 L4.31,17.65 L4.55,14.01 L5.89,12.67 L10.99,11.46 L19.73,10.73 L29.2,4.41 L32.84,3.69 Z M51.06,4.66 L50.69,5.02 L51.66,6.96 L54.7,10.97 L65.02,10.85 L61.99,4.9 Z M33.57,4.9 L30.41,5.63 L26.53,8.3 L26.16,11.58 L36.97,11.46 L36.85,5.26 Z M39.89,4.66 L39.28,5.26 L39.64,11.21 L46.93,11.21 L48.63,10.97 L49.48,10.12 L49.48,8.91 L47.66,5.14 L46.44,4.66 Z M14.75,17.89 L18.03,18.74 L20.34,22.02 L20.34,24.69 L19.61,26.39 L16.33,28.7 L13.41,28.7 L11.47,27.73 L9.41,24.21 L9.41,22.51 L10.38,20.08 L11.71,18.74 Z M54.09,17.89 L57.37,18.5 L58.95,19.84 L59.92,21.78 L60.16,23.72 L59.19,26.39 L55.91,28.7 L53.24,28.7 L51.54,27.97 L49.96,26.39 L48.99,23.72 L50.21,19.84 L51.79,18.5 Z"/></symbol>
  <symbol id="body-Truck" viewBox="0 0 72 30.7"><path fill-rule="evenodd" d="M30.54,5.99 L43.53,6.11 L44.38,7.69 L44.99,12.19 L67.57,11.94 L68.42,12.79 L68.66,14.25 L68.42,19.84 L69.64,20.08 L69.64,22.02 L68.54,22.87 L62.23,23.36 L61.86,21.05 L59.8,18.26 L57.86,17.29 L55.19,17.29 L52.15,19.35 L50.94,22.02 L50.81,23.84 L19.97,24.09 L19.12,20.32 L17.3,18.26 L15.11,17.29 L12.93,17.29 L10.5,18.5 L9.16,20.08 L8.31,25.3 L4.67,25.3 L4.55,24.21 L2.36,22.99 L3.09,15.71 L4.19,13.89 L11.23,12.43 L18.51,11.94 L27.01,6.6 Z M29.93,7.33 L27.74,8.06 L22.89,11.21 L22.52,13.52 L28.23,13.64 L30.17,12.91 L34.06,12.91 L34.42,7.45 Z M36.97,7.09 L36.85,12.55 L41.59,12.43 L42.19,11.82 L41.71,7.45 Z M13.54,19.35 L17.06,20.2 L18.88,23.24 L18.64,25.91 L16.57,28.21 L15.36,28.7 L11.71,28.21 L9.41,25.42 L9.41,22.75 L10.14,21.29 L11.96,19.71 Z M55.79,19.35 L59.07,19.96 L60.65,21.54 L61.38,23.48 L60.65,26.64 L57.86,28.7 L55.19,28.7 L53.73,27.97 L51.66,24.69 L52.39,21.54 L53.97,19.96 Z"/></symbol>
  <symbol id="body-Minivan" viewBox="0 0 72 30.7"><path fill-rule="evenodd" d="M40.86,4.29 L57.25,4.41 L64.78,5.39 L67.09,8.91 L68.79,13.28 L68.79,19.84 L70.0,21.05 L69.15,24.09 L61.62,25.06 L61.26,22.26 L59.68,19.96 L57.49,18.74 L54.58,18.74 L52.64,19.71 L51.06,21.54 L50.21,25.54 L19.36,26.03 L19.0,22.51 L18.27,21.05 L15.72,18.99 L12.08,18.74 L8.8,21.29 L7.95,25.79 L4.79,25.79 L2.49,24.69 L2.0,20.56 L3.7,17.16 L5.76,15.59 L13.05,12.91 L21.79,7.81 L27.14,5.63 L32.72,4.66 Z M42.44,5.63 L28.35,6.6 L22.04,9.27 L15.84,13.76 L18.15,14.13 L49.48,12.67 L48.87,5.99 Z M50.94,5.87 L51.66,12.43 L63.56,12.19 L64.9,11.58 L63.69,8.66 L61.86,6.84 L56.28,5.87 Z M12.44,19.59 L14.75,19.47 L16.21,20.2 L18.27,22.75 L17.79,26.64 L15.24,28.7 L11.11,28.21 L9.04,25.42 L9.53,21.78 Z M54.94,19.59 L57.01,19.47 L58.71,20.2 L60.53,22.51 L60.53,25.91 L58.95,27.97 L57.49,28.7 L54.58,28.7 L53.12,27.97 L51.3,25.18 L51.3,22.99 L52.03,21.54 Z"/></symbol>
  <symbol id="body-Van" viewBox="0 0 72 30.7"><path fill-rule="evenodd" d="M40.37,2.11 L63.81,1.99 L65.02,2.47 L65.87,4.54 L67.09,13.52 L66.96,24.33 L60.65,25.3 L59.8,22.02 L56.76,19.96 L54.34,20.2 L53.12,20.93 L51.54,22.99 L51.18,25.3 L19.36,25.79 L18.51,25.42 L17.3,21.78 L14.75,20.2 L12.56,20.2 L11.11,20.93 L9.53,22.75 L8.92,25.79 L6.25,25.3 L4.67,24.21 L4.91,18.86 L5.64,16.92 L13.05,13.64 L23.49,3.93 L28.35,2.23 Z M51.66,6.6 L30.29,6.84 L29.44,7.21 L29.93,13.28 L30.54,14.13 L31.75,14.37 L64.05,13.89 L64.41,13.04 L63.69,8.18 L62.84,6.84 Z M24.46,7.09 L21.55,7.57 L18.76,9.88 L17.54,11.58 L17.91,14.86 L25.56,13.28 L26.29,11.82 L26.77,7.69 L26.16,7.09 Z M13.41,21.05 L15.96,21.66 L17.54,23.72 L17.06,27.12 L14.75,28.7 L11.59,28.21 L10.01,26.15 L10.26,22.99 L11.84,21.41 Z M55.67,21.05 L58.46,21.9 L59.8,24.21 L59.31,26.88 L57.01,28.7 L53.85,28.21 L52.03,25.66 L52.76,22.51 Z"/></symbol>
</svg>`;

const BODY_STYLES = new Set(["Sedan", "Coupe", "Hatchback", "SUV", "Truck", "Minivan", "Van"]);

// Falls back to the SUV shape, not a lightning bolt: an unmapped body style should degrade to
// a generic vehicle rather than to something that reads as an error. That bolt was reachable
// in practice — "Van" was simply missing from the old emoji map. The fallback was the crossover
// silhouette until that body style was retired on 2026-08-28 (see data/SCHEMA.md); SUV is now
// both the generic shape and by far the most common, at 99 of 149.
export function bodyIcon(style) {
  const key = BODY_STYLES.has(style) ? style : "SUV";
  return `<svg class="body-icon" viewBox="${BODY_VIEWBOX}" fill="currentColor" aria-hidden="true">`
    + `<use href="#body-${key}"/></svg>`;
}

// Builds a one-sentence, plain-English description of a car from its core specs — shared by
// the detail modal (render.js) and the static per-car page's meta description / no-JS
// fallback (prerender.mjs), so the two stay in sync instead of drifting into separate,
// hand-written blurbs that could disagree with each other. Deliberately returns just the
// descriptive sentence with no trailing CTA — "full specs below" is only true in the modal
// (where a spec table genuinely follows); the meta description and no-JS fallback don't have
// one, so each call site appends whatever ending actually fits its own context.
// A numeric field actually holds a number — not null (unknown), "N/A" (doesn't apply) or
// "Pending" (real but unpublished). Exported because callers outside the summary need the
// same test: render.js decides whether the summary will state a price before it hides the
// standalone price element, and those two must not drift apart.
export function isRealValue(v) {
  return v != null && v !== "N/A" && v !== "Pending";
}

export function carSummarySentence(car) {
  const isReal = isRealValue;
  const name = `${car.modelYear} ${car.make} ${car.model} ${car.trim}`;

  let subject = "an electric vehicle";
  if (car.bodyStyle) {
    subject = isReal(car.maxPassengers)
      ? `a ${car.maxPassengers}-seat ${car.bodyStyle}`
      : `${car.bodyStyle === "SUV" ? "an" : "a"} ${car.bodyStyle}`;
  }

  const details = [];
  if (isReal(car.range?.epaMiles)) details.push(`${car.range.epaMiles} miles of estimated range`);
  if (isReal(car.msrp)) details.push(`an MSRP of $${Math.round(car.msrp).toLocaleString()}`);

  let sentence = `The ${name} is ${subject}`;
  if (details.length) sentence += ` with ${details.join(" and ")}`;
  return sentence + ".";
}
