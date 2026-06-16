import { afterEach, describe, expect, it } from 'vitest';
import { ZONE1_PROPS } from '../src/sim/content/zone1';
import {
  authoredTreeColliderRadius,
  isBlocked,
  setRuntimeTreeColliderOverlay,
} from '../src/sim/colliders';

const SEED = 20061;

afterEach(() => {
  setRuntimeTreeColliderOverlay(null);
});

describe('authored tree colliders', () => {
  it('published authored trees block movement', () => {
    const tree = ZONE1_PROPS.authoredTrees?.[0];
    expect(tree).toBeDefined();
    expect(isBlocked(SEED, tree!.x, tree!.z, 0.5)).toBe(true);
    expect(authoredTreeColliderRadius(tree!.scale)).toBeCloseTo(0.55 * (tree!.scale ?? 1.05));
  });

  it('runtime overlay adds colliders before publish', () => {
    setRuntimeTreeColliderOverlay({
      authoredTrees: [{ x: 42, z: -42, scale: 1.2 }],
      suppressedTrees: [],
    });
    expect(isBlocked(SEED, 42, -42, 0.5)).toBe(true);
  });

  it('runtime overlay applies suppressions to procedural trees', () => {
    setRuntimeTreeColliderOverlay({
      authoredTrees: [],
      suppressedTrees: [{ x: -30.413, z: -59.072 }],
    });
    // Open ground near a suppressed procedural slot should stay walkable.
    expect(isBlocked(SEED, -30.413, -59.072, 0.5)).toBe(false);
  });
});
