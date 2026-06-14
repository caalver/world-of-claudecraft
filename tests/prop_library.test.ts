import { describe, expect, it } from 'vitest';
import {
  defaultPlacedColliders,
  getPropLibraryEntry,
  house2DoorOverhangColliders,
  placedAssetColliders,
  placedAssetFootprintRadius,
  refreshPlacedColliders,
} from '../src/sim/prop_library';
import type { PlacedAssetDef } from '../src/sim/types';

describe('prop_library', () => {
  it('getPropLibraryEntry resolves known models', () => {
    expect(getPropLibraryEntry('barrel')?.propKey).toBe('barrel');
    expect(getPropLibraryEntry('house2')?.house2Overhang).toBe(true);
  });

  it('placedAssetColliders scales circle props', () => {
    const asset: PlacedAssetDef = { id: 'b1', model: 'barrel', x: 10, z: 20, rot: 0, scale: 2 };
    const c = placedAssetColliders(asset);
    expect(c).toHaveLength(1);
    expect(c[0]).toMatchObject({ type: 'circle', x: 10, z: 20, r: 1.1 });
  });

  it('refreshPlacedColliders updates house2 overhang blocks', () => {
    const asset: PlacedAssetDef = { id: 'h1', model: 'house2', x: 0, z: 0, rot: 0, scale: 1 };
    refreshPlacedColliders(asset);
    expect(asset.colliders).toEqual(house2DoorOverhangColliders(14, 12));
    asset.scale = 2;
    refreshPlacedColliders(asset);
    expect(asset.colliders).toEqual(house2DoorOverhangColliders(28, 24));
  });

  it('defaultPlacedColliders returns full OBB for non-overhang buildings', () => {
    const blocks = defaultPlacedColliders('inn', 1);
    expect(blocks).toEqual([{ lx: 0, lz: 0, hw: 6, hd: 7 }]);
  });

  it('placedAssetFootprintRadius grows with scale', () => {
    const asset: PlacedAssetDef = { id: 'w1', model: 'well', x: 0, z: 0, rot: 0, scale: 2 };
    expect(placedAssetFootprintRadius(asset)).toBe(3);
  });
});
