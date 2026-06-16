import { describe, expect, it } from 'vitest';
import { nearestRoadAt } from '../src/dev/zone_editor';
import { ZONE1_ROADS } from '../src/sim/content/zone1';

describe('road editor picking', () => {
  it('nearestRoadAt finds a segment near the town hub road', () => {
    const idx = nearestRoadAt(0, 10, ZONE1_ROADS);
    expect(idx).toBe(0);
  });

  it('nearestRoadAt returns -1 when far from all roads', () => {
    expect(nearestRoadAt(500, 500, ZONE1_ROADS)).toBe(-1);
  });

  it('nearestRoadAt ignores incomplete polylines', () => {
    const idx = nearestRoadAt(0, 10, [[{ x: 0, z: 0 }], [{ x: 0, z: 8 }, { x: 5, z: 12 }]]);
    expect(idx).toBe(1);
  });
});
