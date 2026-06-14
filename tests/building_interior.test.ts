import { describe, expect, it } from 'vitest';
import { PROPS } from '../src/sim/data';
import {
  buildingWallBlocks,
  isEnterableBuilding,
  isInsideBuilding,
  resolveBuildingInteriorId,
} from '../src/sim/building_layout';
import { isBlocked, resolvePosition } from '../src/sim/colliders';

const SEED = 20061;

function rotY(lx: number, lz: number, rot: number): { x: number; z: number } {
  const c = Math.cos(rot), s = Math.sin(rot);
  return { x: lx * c + lz * s, z: -lx * s + lz * c };
}

function worldFromLocal(b: { x: number; z: number; rot: number }, lx: number, lz: number) {
  const off = rotY(lx, lz, b.rot);
  return { x: b.x + off.x, z: b.z + off.z };
}

describe('enterable overworld buildings', () => {
  it('all zone1 houses, inn, and chapel are enterable', () => {
    for (const b of PROPS.buildings) {
      expect(isEnterableBuilding(b)).toBe(true);
      expect(resolveBuildingInteriorId(b)).toBeTruthy();
    }
  });

  it('resolves interior layouts by building kind', () => {
    const inn = PROPS.buildings.find((b) => b.kind === 'inn')!;
    const chapel = PROPS.buildings.find((b) => b.kind === 'chapel')!;
    const house2 = PROPS.buildings.find((b) => b.prop === 'house2')!;
    expect(resolveBuildingInteriorId(inn)).toBe('inn_tavern');
    expect(resolveBuildingInteriorId(chapel)).toBe('chapel');
    expect(resolveBuildingInteriorId(house2)).toBe('house_large');
  });

  describe('inn', () => {
    const inn = PROPS.buildings.find((b) => b.kind === 'inn')!;

    it('front and back doors are walkable', () => {
      const front = worldFromLocal(inn, 0, inn.d / 2 + 1.5);
      const back = worldFromLocal(inn, 0, -(inn.d / 2 + 1.5));
      expect(isBlocked(SEED, front.x, front.z, 0.5)).toBe(false);
      expect(isBlocked(SEED, back.x, back.z, 0.5)).toBe(false);
    });

    it('interior center is walkable', () => {
      const center = worldFromLocal(inn, 0, 0);
      const res = resolvePosition(SEED, center.x, center.z, 0.5);
      expect(Math.hypot(res.x - center.x, res.z - center.z)).toBeLessThan(0.05);
      expect(isInsideBuilding(inn, center.x, center.z)).toBe(true);
    });
  });

  describe('house2', () => {
    const house = PROPS.buildings.find((b) => b.prop === 'house2' && b.x === -10)!;

    it('+x door is walkable', () => {
      const door = worldFromLocal(house, house.w / 2 + 1.5, 0);
      expect(isBlocked(SEED, door.x, door.z, 0.5)).toBe(false);
    });

    it('porch overhang under the door is walkable', () => {
      const porch = worldFromLocal(house, 5, 0);
      expect(isBlocked(SEED, porch.x, porch.z, 0.5)).toBe(false);
    });

    it('+z face is solid (door is on +x)', () => {
      const blocks = buildingWallBlocks(house.w / 2, house.d / 2, ['+x']);
      const front = blocks.find((b) => b.lz > 0 && b.hw > 1)!;
      expect(front.lx).toBe(0);
      expect(front.hw).toBe(house.w / 2);
    });
  });

  describe('chapel', () => {
    const chapel = PROPS.buildings.find((b) => b.kind === 'chapel')!;

    it('entry door is walkable', () => {
      const door = worldFromLocal(chapel, 0, chapel.d / 2 + 1.5);
      expect(isBlocked(SEED, door.x, door.z, 0.5)).toBe(false);
    });
  });

  it('inn wall blocks leave door gaps on +z and -z', () => {
    const inn = PROPS.buildings.find((b) => b.kind === 'inn')!;
    const blocks = buildingWallBlocks(inn.w / 2, inn.d / 2, ['+z', '-z']);
    expect(blocks.filter((b) => b.lz > 0).length).toBe(2);
    expect(blocks.filter((b) => b.lz < 0).length).toBe(2);
  });
});
