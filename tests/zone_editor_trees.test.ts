import { describe, expect, it } from 'vitest';
import {
  materializeProceduralTreesForZone,
  mergeEditorTrees,
  removeExplicitTreeAt,
  upsertExplicitTree,
} from '../src/dev/zone_editor_trees';

const SEED = 20061;

describe('zone_editor_trees', () => {
  it('materializeProceduralTreesForZone skips explicit trees', () => {
    const { trees, keys } = materializeProceduralTreesForZone('eastbrook_vale', SEED, [], []);
    expect(trees.length).toBeGreaterThan(0);
    expect(keys.size).toBe(trees.length);

    const first = trees[0];
    const withExplicit = materializeProceduralTreesForZone(
      'eastbrook_vale', SEED, [first], [],
    );
    expect(withExplicit.trees.some((t) => t.x === first.x && t.z === first.z)).toBe(false);
  });

  it('materializeProceduralTreesForZone respects suppressions', () => {
    const { trees } = materializeProceduralTreesForZone('eastbrook_vale', SEED, [], []);
    const target = trees[0];
    const suppressed = materializeProceduralTreesForZone(
      'eastbrook_vale', SEED, [], [{ x: target.x, z: target.z }],
    );
    expect(suppressed.trees.some((t) => t.x === target.x && t.z === target.z)).toBe(false);
  });

  it('mergeEditorTrees puts explicit first', () => {
    const merged = mergeEditorTrees(
      [{ x: 0, z: 0, kind: 'tree', scale: 1 }],
      [{ x: 1, z: 1, kind: 'tree2', scale: 1.1 }],
    );
    expect(merged).toHaveLength(2);
    expect(merged[0].x).toBe(0);
  });

  it('upsertExplicitTree replaces same slot', () => {
    const out = upsertExplicitTree(
      [{ x: 1, z: 2, kind: 'tree', scale: 1 }],
      { x: 1, z: 2, kind: 'tree2', scale: 1.5 },
    );
    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe('tree2');
  });

  it('removeExplicitTreeAt removes by key', () => {
    const out = removeExplicitTreeAt(
      [{ x: 1, z: 2, kind: 'tree', scale: 1 }, { x: 3, z: 4, kind: 'tree2', scale: 1 }],
      1, 2,
    );
    expect(out).toHaveLength(1);
    expect(out[0].x).toBe(3);
  });
});
