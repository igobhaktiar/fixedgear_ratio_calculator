// Pure gearing math. No React, no DOM — easy to test and reuse.

export const KMH_PER_MPH = 1.609344;
const MM_PER_INCH = 25.4;

export const CHAINRING_RANGE = { min: 28, max: 60 };
export const COG_RANGE = { min: 9, max: 24 };

export function gcd(a, b) {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y) [x, y] = [y, x % y];
  return x;
}

export const gearRatio = (chainring, cog) => chainring / cog;

/** Distance travelled per crank revolution, in metres. */
export const development = (chainring, cog, circumferenceMm) =>
  (gearRatio(chainring, cog) * circumferenceMm) / 1000;

/** Classic "gear inches": ratio × wheel diameter in inches. */
export const gearInches = (chainring, cog, circumferenceMm) =>
  gearRatio(chainring, cog) * (circumferenceMm / Math.PI / MM_PER_INCH);

/**
 * Number of distinct spots on the rear tyre that touch the ground when
 * skidding. Reduce the ratio to lowest terms (f/r): one-foot skidders get
 * r patches; ambidextrous skidders double that only when f is odd.
 */
export function skidPatches(chainring, cog, ambidextrous = false) {
  const divisor = gcd(chainring, cog);
  const front = chainring / divisor;
  const rear = cog / divisor;
  return ambidextrous && front % 2 === 1 ? rear * 2 : rear;
}

/** Speed in km/h (metric) or mph (imperial) at a given cadence. */
export function speedAt(cadenceRpm, developmentM, unit = 'metric') {
  const kmh = (cadenceRpm * developmentM * 60) / 1000;
  return unit === 'imperial' ? kmh / KMH_PER_MPH : kmh;
}

/** Other chainring × cog combos within ±tolerance of the target ratio. */
export function equivalentGears(chainring, cog, tolerance = 0.02) {
  const target = gearRatio(chainring, cog);
  const combos = [];
  for (let front = CHAINRING_RANGE.min; front <= CHAINRING_RANGE.max; front++) {
    for (let rear = COG_RANGE.min; rear <= COG_RANGE.max; rear++) {
      if (front === chainring && rear === cog) continue;
      const ratio = front / rear;
      const diff = ratio / target - 1;
      if (Math.abs(diff) <= tolerance) combos.push({ chainring: front, cog: rear, ratio, diff });
    }
  }
  return combos.sort((a, b) => a.chainring - b.chainring);
}

/** Tyre circumference from ETRTO (bead seat diameter + 2 × width) × π. */
export const etrtoCircumference = (beadSeatMm, widthMm) =>
  Math.round((beadSeatMm + 2 * widthMm) * Math.PI);
