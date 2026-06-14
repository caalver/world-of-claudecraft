// Prop asset library: default footprints, collision shape, and render hints for
// models under public/models/props/. Shared by the renderer, colliders, zone
// editor, and merge script.

import type { BuildingColliderBlock, PlacedAssetDef } from './types';

type PlacedCollider =
  | { type: 'circle'; x: number; z: number; r: number }
  | { type: 'obb'; x: number; z: number; hw: number; hd: number; rot: number };

export interface PropLibraryEntry {
  id: string;
  label: string;
  /** Key into PROP_ASSET_DEFS in render/props.ts */
  propKey: string;
  collision: 'obb' | 'circle' | 'none';
  baseW?: number;
  baseD?: number;
  baseH?: number;
  baseR?: number;
  /** house_2 door-side overhang uses a recessed OBB instead of full footprint */
  house2Overhang?: boolean;
}

export const PROP_LIBRARY: PropLibraryEntry[] = [
  { id: 'house1', label: 'House 1', propKey: 'house1', collision: 'obb', baseW: 7, baseD: 6, baseH: 8 },
  { id: 'house2', label: 'House 2', propKey: 'house2', collision: 'obb', baseW: 14, baseD: 12, baseH: 15.2, house2Overhang: true },
  { id: 'house3', label: 'House 3', propKey: 'house3', collision: 'obb', baseW: 6, baseD: 5, baseH: 5 },
  { id: 'blacksmith', label: 'Blacksmith', propKey: 'blacksmith', collision: 'obb', baseW: 6, baseD: 5, baseH: 6.6 },
  { id: 'inn', label: 'Inn', propKey: 'inn', collision: 'obb', baseW: 12, baseD: 14, baseH: 15.2 },
  { id: 'bell_tower', label: 'Bell Tower', propKey: 'bellTower', collision: 'obb', baseW: 5, baseD: 5, baseH: 21 },
  { id: 'well', label: 'Well', propKey: 'well', collision: 'circle', baseR: 1.5 },
  { id: 'market_stand_1', label: 'Market Stand 1', propKey: 'stand1', collision: 'circle', baseR: 1.7 },
  { id: 'market_stand_2', label: 'Market Stand 2', propKey: 'stand2', collision: 'circle', baseR: 1.7 },
  { id: 'cart', label: 'Cart', propKey: 'cart', collision: 'circle', baseR: 1.5 },
  { id: 'fence', label: 'Fence Module', propKey: 'fence', collision: 'obb', baseW: 2.35, baseD: 0.6, baseH: 3 },
  { id: 'bonfire', label: 'Bonfire', propKey: 'bonfire', collision: 'circle', baseR: 0.85 },
  { id: 'ore_rocks', label: 'Ore Rocks', propKey: 'oreRocks', collision: 'circle', baseR: 2.5 },
  { id: 'tent_open', label: 'Tent (open)', propKey: 'tentOpen', collision: 'circle', baseR: 1.5 },
  { id: 'tent_small', label: 'Tent (small)', propKey: 'tentSmall', collision: 'circle', baseR: 1.5 },
  { id: 'rock_tall_a', label: 'Rock Tall A', propKey: 'rockTallA', collision: 'circle', baseR: 0.7 },
  { id: 'rock_tall_h', label: 'Rock Tall H', propKey: 'rockTallH', collision: 'circle', baseR: 0.7 },
  { id: 'rock_large_d', label: 'Rock Large D', propKey: 'rockLargeD', collision: 'circle', baseR: 0.8 },
  { id: 'rock_large_f', label: 'Rock Large F', propKey: 'rockLargeF', collision: 'circle', baseR: 0.8 },
  { id: 'mushroom_red', label: 'Mushroom Red', propKey: 'mushroomRed', collision: 'circle', baseR: 1.1 },
  { id: 'mushroom_tan', label: 'Mushroom Tan', propKey: 'mushroomTan', collision: 'circle', baseR: 1.1 },
  { id: 'column', label: 'Column', propKey: 'column', collision: 'circle', baseR: 0.6 },
  { id: 'column_broken', label: 'Column Broken', propKey: 'columnBroken', collision: 'circle', baseR: 0.6 },
  { id: 'statue_head', label: 'Statue Head', propKey: 'statueHead', collision: 'circle', baseR: 0.6 },
  { id: 'statue_block', label: 'Statue Block', propKey: 'statueBlock', collision: 'circle', baseR: 0.6 },
  { id: 'dock_platform', label: 'Dock Platform', propKey: 'dockPlatform', collision: 'obb', baseW: 8, baseD: 6, baseH: 1 },
  { id: 'rowboat', label: 'Rowboat', propKey: 'rowboat', collision: 'circle', baseR: 1.2 },
  { id: 'gravestone_round', label: 'Gravestone Round', propKey: 'graveRound', collision: 'circle', baseR: 0.5 },
  { id: 'gravestone_cross', label: 'Gravestone Cross', propKey: 'graveCross', collision: 'circle', baseR: 0.5 },
  { id: 'gravestone_bevel', label: 'Gravestone Bevel', propKey: 'graveBevel', collision: 'circle', baseR: 0.5 },
  { id: 'gravestone_decorative', label: 'Gravestone Decorative', propKey: 'graveDecor', collision: 'circle', baseR: 0.5 },
  { id: 'timber_pillar', label: 'Timber Pillar', propKey: 'timberPillar', collision: 'circle', baseR: 0.5 },
  { id: 'crate_wooden', label: 'Wooden Crate', propKey: 'crateWooden', collision: 'circle', baseR: 0.65 },
  { id: 'farmcrate_apple', label: 'Farm Crate', propKey: 'farmCrate', collision: 'circle', baseR: 0.65 },
  { id: 'barrel', label: 'Barrel', propKey: 'barrel', collision: 'circle', baseR: 0.55 },
  { id: 'anvil', label: 'Anvil', propKey: 'anvil', collision: 'circle', baseR: 0.5 },
  { id: 'weapon_stand', label: 'Weapon Stand', propKey: 'weaponStand', collision: 'circle', baseR: 0.7 },
  { id: 'lantern_wall', label: 'Wall Lantern', propKey: 'lanternWall', collision: 'circle', baseR: 0.4 },
];

const LIB_BY_ID = new Map(PROP_LIBRARY.map((e) => [e.id, e]));

export function getPropLibraryEntry(model: string): PropLibraryEntry | undefined {
  return LIB_BY_ID.get(model);
}

/** house_2 upper storey overhangs toward the door on the east face (+x local). */
export function house2DoorOverhangColliders(w: number, d: number): BuildingColliderBlock[] {
  const overhang = Math.min(4, w * 0.33);
  const bodyHw = (w - overhang) / 2;
  const bodyLx = -overhang / 2;
  return [{ lx: bodyLx, lz: 0, hw: bodyHw, hd: d / 2 }];
}

export function collidersMatchHouse2(colliders: BuildingColliderBlock[], w: number, d: number): boolean {
  if (!colliders?.length || colliders.length !== 1) return false;
  const ref = house2DoorOverhangColliders(w, d)[0];
  const c = colliders[0];
  const eps = 0.05;
  return Math.abs(c.lx - ref.lx) < eps
    && Math.abs(c.lz - ref.lz) < eps
    && Math.abs(c.hw - ref.hw) < eps
    && Math.abs(c.hd - ref.hd) < eps;
}

export function refreshPlacedColliders(asset: PlacedAssetDef): void {
  const entry = getPropLibraryEntry(asset.model);
  if (!entry || entry.collision !== 'obb') {
    delete asset.colliders;
    return;
  }
  asset.colliders = defaultPlacedColliders(asset.model, asset.scale);
}

export function defaultPlacedColliders(model: string, scale: number): BuildingColliderBlock[] | undefined {
  const entry = getPropLibraryEntry(model);
  if (!entry || entry.collision !== 'obb') return undefined;
  const w = (entry.baseW ?? 4) * scale;
  const d = (entry.baseD ?? 4) * scale;
  if (entry.house2Overhang) return house2DoorOverhangColliders(w, d);
  return [{ lx: 0, lz: 0, hw: w / 2, hd: d / 2 }];
}

export function placedAssetFootprintRadius(asset: PlacedAssetDef): number {
  const entry = getPropLibraryEntry(asset.model);
  const s = asset.scale;
  if (!entry) return 2 * s;
  if (entry.collision === 'circle') return (entry.baseR ?? 1) * s;
  return Math.max(entry.baseW ?? 4, entry.baseD ?? 4) * 0.5 * s;
}

function rotY(lx: number, lz: number, rot: number): { x: number; z: number } {
  const c = Math.cos(rot), sin = Math.sin(rot);
  return { x: lx * c + lz * sin, z: -lx * sin + lz * c };
}

/** Collision primitives for a placed library asset (world space). */
export function placedAssetColliders(asset: PlacedAssetDef): PlacedCollider[] {
  const entry = getPropLibraryEntry(asset.model);
  if (!entry || entry.collision === 'none') return [];
  const s = asset.scale;
  if (entry.collision === 'circle') {
    return [{ type: 'circle', x: asset.x, z: asset.z, r: (entry.baseR ?? 1) * s }];
  }
  const blocks = asset.colliders ?? defaultPlacedColliders(asset.model, s) ?? [];
  return blocks.map((block) => {
    const off = rotY(block.lx, block.lz, asset.rot);
    return {
      type: 'obb' as const,
      x: asset.x + off.x,
      z: asset.z + off.z,
      hw: block.hw,
      hd: block.hd,
      rot: asset.rot,
    };
  });
}

export function placedAssetRenderScale(
  entry: PropLibraryEntry,
  scale: number,
  assetSize: { x: number; y: number; z: number },
): [number, number, number] {
  const s = scale;
  if (entry.collision === 'circle') {
    const target = (entry.baseR ?? 1) * 2 * s;
    const max = Math.max(assetSize.x, assetSize.z);
    const u = target / max;
    return [u, (entry.baseH ?? target) / assetSize.y * s, u];
  }
  return [
    (entry.baseW ?? 4) * s / assetSize.x,
    (entry.baseH ?? entry.baseD ?? 4) * s / assetSize.y,
    (entry.baseD ?? 4) * s / assetSize.z,
  ];
}
