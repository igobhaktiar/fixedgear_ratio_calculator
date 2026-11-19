import { describe, expect, it } from 'vitest';
import {
  development,
  equivalentGears,
  gcd,
  gearInches,
  gearRatio,
  skidPatches,
  speedAt,
} from './gearing.js';

describe('gearing', () => {
  it('computes ratio, development and gear inches', () => {
    expect(gearRatio(46, 18)).toBeCloseTo(2.556, 3);
    expect(development(46, 18, 2098)).toBeCloseTo(5.36, 2);
    expect(gearInches(48, 17, 2136)).toBeCloseTo(75.6, 1);
  });

  it('reduces with gcd', () => {
    expect(gcd(48, 18)).toBe(6);
    expect(gcd(47, 17)).toBe(1);
  });

  describe('skidPatches', () => {
    it('one-foot skid = reduced cog', () => {
      expect(skidPatches(46, 18)).toBe(9);
      expect(skidPatches(48, 16)).toBe(1);
      expect(skidPatches(47, 17)).toBe(17);
    });

    it('ambidextrous doubles only when reduced chainring is odd', () => {
      expect(skidPatches(46, 18, true)).toBe(18); // 23/9 → odd front
      expect(skidPatches(48, 18, true)).toBe(3); // 8/3 → even front, no gain
      expect(skidPatches(47, 17, true)).toBe(34);
    });
  });

  it('converts speed between units', () => {
    const dev = development(46, 18, 2098);
    expect(speedAt(90, dev)).toBeCloseTo(28.95, 1);
    expect(speedAt(90, dev, 'imperial')).toBeCloseTo(17.99, 1);
  });

  it('finds equivalent gears within tolerance and excludes current', () => {
    const combos = equivalentGears(46, 18);
    expect(combos.some((c) => c.chainring === 46 && c.cog === 18)).toBe(false);
    expect(combos.some((c) => c.chainring === 28 && c.cog === 11)).toBe(true);
    expect(combos.every((c) => Math.abs(c.diff) <= 0.02)).toBe(true);
  });
});
