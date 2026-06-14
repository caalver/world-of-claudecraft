// Enterable overworld building layouts — shared by colliders and the renderer.
// Coordinates are building-local: origin at footprint center, +x east, +z north
// (door on +z matches props.ts village kit convention).

import { hash2 } from './rng';
import type { BuildingColliderBlock, BuildingDef } from './types';

export const DOOR_HW = 1.45;
const WALL_T = 0.35;

export interface InteriorPropDef {
  /** prop asset key — see render/props.ts PROP_ASSET_DEFS */
  prop: string;
  /** Position as a fraction of half-width (x) and half-depth (z). */
  fx: number;
  fz: number;
  rot?: number;
  scale?: number | [number, number, number];
}

export type BuildingDoorFace = '+z' | '-z' | '+x' | '-x';

export interface BuildingInteriorLayout {
  id: string;
  /** Clip exterior meshes above this normalized asset Y (0 = ground, 1 = roof). */
  roofClipFrac: number;
  /** Footprint faces with a walkable door gap (default +z only). */
  doors?: BuildingDoorFace[];
  floorColor?: number;
  /** Hearth / forge light when inside; omit for unlit interiors. */
  fireLight?: { fx: number; fz: number; color?: number; intensity?: number };
  props: InteriorPropDef[];
}

export const INN_TAVERN: BuildingInteriorLayout = {
  id: 'inn_tavern',
  roofClipFrac: 0.58,
  doors: ['+z', '-z'],
  fireLight: { fx: -0.37, fz: -0.54, color: 0xff8833, intensity: 1.4 },
  props: [
    { prop: 'bonfire', fx: -0.37, fz: -0.54, rot: 0.2, scale: 0.85 },
    { prop: 'stand1', fx: 0.03, fz: -0.69, rot: Math.PI, scale: [2.4, 1.6, 1.1] },
    { prop: 'barrel', fx: 0.67, fz: -0.21, rot: 0.5, scale: 1.05 },
    { prop: 'barrel', fx: 0.75, fz: -0.4, rot: 1.1, scale: 0.95 },
    { prop: 'crateWooden', fx: -0.7, fz: 0.26, rot: -0.3, scale: 1.1 },
    { prop: 'farmCrate', fx: -0.53, fz: 0.37, rot: 0.8, scale: 1.2 },
    { prop: 'lanternWall', fx: 0, fz: 0.74, rot: Math.PI, scale: 1.4 },
  ],
};

export const HOUSE_COTTAGE: BuildingInteriorLayout = {
  id: 'house_cottage',
  roofClipFrac: 0.55,
  props: [
    { prop: 'crateWooden', fx: -0.45, fz: 0.15, rot: 0.2, scale: 1.0 },
    { prop: 'barrel', fx: 0.35, fz: -0.25, rot: 0.6, scale: 0.95 },
    { prop: 'farmCrate', fx: -0.25, fz: -0.35, rot: 1.0, scale: 1.05 },
  ],
};

export const HOUSE_LARGE: BuildingInteriorLayout = {
  id: 'house_large',
  roofClipFrac: 0.52,
  /** house_2 GLB door is on the +x face (see prop_library house2Overhang). */
  doors: ['+x'],
  props: [
    { prop: 'barrel', fx: 0.55, fz: -0.2, rot: 0.4, scale: 1.0 },
    { prop: 'crateWooden', fx: -0.5, fz: 0.25, rot: -0.2, scale: 1.1 },
    { prop: 'weaponStand', fx: -0.15, fz: -0.45, rot: Math.PI * 0.55, scale: 1.1 },
    { prop: 'farmCrate', fx: 0.2, fz: 0.35, rot: 0.5, scale: 1.15 },
  ],
};

export const HOUSE_BLACKSMITH: BuildingInteriorLayout = {
  id: 'house_blacksmith',
  roofClipFrac: 0.5,
  fireLight: { fx: -0.2, fz: -0.35, color: 0xffaa55, intensity: 1.6 },
  props: [
    { prop: 'anvil', fx: 0.15, fz: -0.15, rot: 0.9, scale: 1.25 },
    { prop: 'weaponStand', fx: -0.45, fz: 0.1, rot: 0.5 + Math.PI, scale: 1.15 },
    { prop: 'bonfire', fx: -0.2, fz: -0.35, rot: 0.1, scale: 0.7 },
    { prop: 'barrel', fx: 0.5, fz: 0.3, rot: 0.3, scale: 1.0 },
  ],
};

export const CHAPEL: BuildingInteriorLayout = {
  id: 'chapel',
  roofClipFrac: 0.42,
  floorColor: 0x6a6460,
  props: [
    { prop: 'timberPillar', fx: -0.55, fz: -0.15, rot: 0, scale: 1.3 },
    { prop: 'timberPillar', fx: 0.55, fz: -0.15, rot: 0, scale: 1.3 },
    { prop: 'timberPillar', fx: -0.55, fz: 0.35, rot: 0, scale: 1.2 },
    { prop: 'timberPillar', fx: 0.55, fz: 0.35, rot: 0, scale: 1.2 },
    { prop: 'lanternWall', fx: 0, fz: 0.65, rot: Math.PI, scale: 1.2 },
  ],
};

const LAYOUTS: Record<string, BuildingInteriorLayout> = {
  inn_tavern: INN_TAVERN,
  eastbrook_inn: INN_TAVERN,
  house_cottage: HOUSE_COTTAGE,
  house_large: HOUSE_LARGE,
  house_blacksmith: HOUSE_BLACKSMITH,
  chapel: CHAPEL,
};

export function getBuildingInteriorLayout(id: string): BuildingInteriorLayout | undefined {
  return LAYOUTS[id];
}

/** Door faces for collision — from layout, with house_2 defaulting to +x. */
export function resolveBuildingDoors(b: BuildingDef): BuildingDoorFace[] {
  const layout = getBuildingInteriorLayout(resolveBuildingInteriorId(b)!);
  if (layout?.doors?.length) return layout.doors;
  if (b.prop === 'house2' || (b.kind === 'house' && resolveHouseProp(b) === 'house2')) return ['+x'];
  return ['+z'];
}

function keyRand(key: number, n: number): number {
  return hash2(Math.round(key * 97), n * 7919, 0x9e3779);
}

/** Deterministic house prop when BuildingDef.prop is omitted (matches props.ts). */
export function resolveHouseProp(b: BuildingDef): 'house1' | 'house2' | 'blacksmith' {
  if (b.prop) return b.prop;
  const pool = ['house1', 'house2', 'blacksmith'] as const;
  const key = b.x * 13.7 + b.z * 3.1;
  return pool[Math.floor(keyRand(key, 3) * 0.999 * pool.length)];
}

/** Interior layout key for an enterable overworld building. */
export function resolveBuildingInteriorId(b: BuildingDef): string | undefined {
  if (b.interior) return b.interior;
  switch (b.kind) {
    case 'inn': return 'inn_tavern';
    case 'chapel': return 'chapel';
    case 'house': {
      const prop = resolveHouseProp(b);
      if (prop === 'blacksmith') return 'house_blacksmith';
      if (prop === 'house2') return 'house_large';
      return 'house_cottage';
    }
    default: return undefined;
  }
}

export function isEnterableBuilding(b: BuildingDef): boolean {
  const id = resolveBuildingInteriorId(b);
  return !!id && !!getBuildingInteriorLayout(id);
}

function endWallSegments(hw: number, hd: number, face: '+z' | '-z'): BuildingColliderBlock[] {
  const t2 = WALL_T / 2;
  const segHw = (hw - DOOR_HW) / 2;
  const wallLz = (face === '+z' ? 1 : -1) * (hd - t2);
  const leftLx = -(hw + DOOR_HW) / 2;
  const rightLx = (hw + DOOR_HW) / 2;
  return [
    { lx: leftLx, lz: wallLz, hw: segHw, hd: t2 },
    { lx: rightLx, lz: wallLz, hw: segHw, hd: t2 },
  ];
}

function sideWallSegments(hw: number, hd: number, face: '+x' | '-x'): BuildingColliderBlock[] {
  const t2 = WALL_T / 2;
  const segHd = (hd - DOOR_HW) / 2;
  const wallLx = (face === '+x' ? 1 : -1) * (hw - t2);
  const northLz = -(hd + DOOR_HW) / 2;
  const southLz = (hd + DOOR_HW) / 2;
  return [
    { lx: wallLx, lz: northLz, hw: t2, hd: segHd },
    { lx: wallLx, lz: southLz, hw: t2, hd: segHd },
  ];
}

/** Wall OBB blocks in building-local space; door gaps on the listed faces. */
export function buildingWallBlocks(
  hw: number,
  hd: number,
  doors: BuildingDoorFace[] = ['+z'],
): BuildingColliderBlock[] {
  const t = WALL_T;
  const t2 = t / 2;
  const doorSet = new Set(doors);
  const out: BuildingColliderBlock[] = [];
  if (doorSet.has('+z')) out.push(...endWallSegments(hw, hd, '+z'));
  else out.push({ lx: 0, lz: hd - t2, hw, hd: t2 });
  if (doorSet.has('-z')) out.push(...endWallSegments(hw, hd, '-z'));
  else out.push({ lx: 0, lz: -(hd - t2), hw, hd: t2 });
  if (doorSet.has('+x')) out.push(...sideWallSegments(hw, hd, '+x'));
  else out.push({ lx: hw - t2, lz: 0, hw: t2, hd: hd - t });
  if (doorSet.has('-x')) out.push(...sideWallSegments(hw, hd, '-x'));
  else out.push({ lx: -(hw - t2), lz: 0, hw: t2, hd: hd - t });
  return out;
}

function rotY(lx: number, lz: number, rot: number): { x: number; z: number } {
  const c = Math.cos(rot), s = Math.sin(rot);
  return { x: lx * c + lz * s, z: -lx * s + lz * c };
}

/** True when the player is inside the walkable footprint (inset from walls). */
export function isInsideBuilding(b: BuildingDef, px: number, pz: number, inset = 0.45): boolean {
  const local = rotY(px - b.x, pz - b.z, -b.rot);
  const hw = b.w / 2 - inset;
  const hd = b.d / 2 - inset;
  return Math.abs(local.x) < hw && Math.abs(local.z) < hd;
}
