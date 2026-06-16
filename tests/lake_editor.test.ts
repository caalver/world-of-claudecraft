import { describe, expect, it } from 'vitest';
import { nearestLakeAt } from '../src/dev/zone_editor';
import { ZONE1_ZONE } from '../src/sim/content/zone1';

describe('lake editor picking', () => {
  it('nearestLakeAt finds Mirror Lake basin', () => {
    const idx = nearestLakeAt(-92, 88, ZONE1_ZONE.lakes);
    expect(idx).toBe(0);
  });

  it('nearestLakeAt returns -1 when far from all lakes', () => {
    expect(nearestLakeAt(500, 500, ZONE1_ZONE.lakes)).toBe(-1);
  });

  it('nearestLakeAt picks closest when overlapping pick radii', () => {
    const lakes = [
      { x: 0, z: 0, radius: 20 },
      { x: 25, z: 0, radius: 20 },
    ];
    expect(nearestLakeAt(5, 0, lakes)).toBe(0);
    expect(nearestLakeAt(22, 0, lakes)).toBe(1);
  });
});
