import { describe, expect, it } from 'vitest';
import { pointInZone, zoneAtPosition } from '../src/sim/zone_bounds';
import type { ZoneDef } from '../src/sim/types';

const stripZones: ZoneDef[] = [
  { id: 'a', name: 'A', zMin: -180, zMax: 180, levelRange: [1, 5], biome: 'vale', hub: { x: 0, z: 0, radius: 20, name: 'A' }, graveyard: { x: 0, z: 0 }, lakes: [], pois: [], welcome: '' },
  { id: 'b', name: 'B', zMin: 180, zMax: 540, levelRange: [6, 10], biome: 'marsh', hub: { x: 0, z: 300, radius: 20, name: 'B' }, graveyard: { x: 0, z: 0 }, lakes: [], pois: [], welcome: '' },
];

const cityZone: ZoneDef = {
  id: 'aldermere',
  name: 'Aldermere',
  xMin: 148,
  xMax: 502,
  zMin: 308,
  zMax: 592,
  levelRange: [8, 12],
  biome: 'marsh',
  hub: { x: 320, z: 465, radius: 78, name: 'Aldermere' },
  graveyard: { x: 320, z: 430 },
  lakes: [],
  pois: [],
  welcome: '',
};

describe('zone_bounds', () => {
  it('pointInZone respects x bounds for city zones', () => {
    expect(pointInZone(cityZone, 320, 465)).toBe(true);
    expect(pointInZone(cityZone, 0, 400)).toBe(false);
  });

  it('zoneAtPosition picks protrusion over strip band', () => {
    const zones = [...stripZones, cityZone];
    expect(zoneAtPosition(0, 400, zones).id).toBe('b');
    expect(zoneAtPosition(320, 465, zones).id).toBe('aldermere');
  });
});
