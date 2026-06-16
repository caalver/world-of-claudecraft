import { describe, expect, it } from 'vitest';
import {
  addSuppression,
  filterProceduralDecorations,
  isTreeSuppressed,
  treeKey,
} from '../src/sim/tree_suppressions';

describe('tree_suppressions', () => {
  it('treeKey rounds coordinates', () => {
    expect(treeKey(1.234, 5.678)).toBe('1.23,5.68');
  });

  it('isTreeSuppressed matches within epsilon', () => {
    const suppressed = [{ x: 10, z: 20 }];
    expect(isTreeSuppressed(10.1, 20, suppressed)).toBe(true);
    expect(isTreeSuppressed(10.5, 20, suppressed)).toBe(false);
  });

  it('addSuppression dedupes', () => {
    const out = addSuppression([{ x: 1, z: 2 }], 1.05, 2);
    expect(out).toHaveLength(1);
    expect(addSuppression(out, 5, 6)).toHaveLength(2);
  });

  it('filterProceduralDecorations removes suppressed trees only', () => {
    const decos = [
      { kind: 'tree', x: 1, z: 2 },
      { kind: 'tree2', x: 3, z: 4 },
      { kind: 'rock', x: 5, z: 6 },
    ];
    const filtered = filterProceduralDecorations(decos, [{ x: 1, z: 2 }]);
    expect(filtered).toEqual([
      { kind: 'tree2', x: 3, z: 4 },
      { kind: 'rock', x: 5, z: 6 },
    ]);
  });
});
