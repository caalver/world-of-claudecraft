// Procedural tree hydration + suppression for the map editor.
import { generateDecorations } from '../sim/world';
import type { AuthoredTreeDef } from '../render/foliage';
import { pointInZone } from '../sim/zone_bounds';
import type { ZoneDef } from '../sim/types';
import {
  addSuppression as addSuppressionCore,
  isTreeSuppressed,
  treeKey,
  type SuppressedTreeDef,
} from '../sim/tree_suppressions';

export type { SuppressedTreeDef };
export { treeKey, isTreeSuppressed, filterProceduralDecorations } from '../sim/tree_suppressions';

const MATCH_EPS = 0.2;

export function isNearAuthoredTree(
  x: number,
  z: number,
  trees: AuthoredTreeDef[],
  eps = 1.5,
): boolean {
  for (const t of trees) {
    if (Math.hypot(t.x - x, t.z - z) < eps) return true;
  }
  return false;
}

export function decorationInEditorZone(
  x: number,
  z: number,
  zone: ZoneDef,
): boolean {
  return pointInZone(zone, x, z);
}

/** Procedural trees for one zone band — not already explicit or suppressed. */
export function materializeProceduralTreesForZone(
  zone: ZoneDef,
  seed: number,
  explicitTrees: AuthoredTreeDef[],
  suppressedTrees: SuppressedTreeDef[],
): { trees: AuthoredTreeDef[]; keys: Set<string> } {
  const keys = new Set<string>();
  const trees: AuthoredTreeDef[] = [];
  const explicitKeys = new Set(explicitTrees.map((t) => treeKey(t.x, t.z)));

  for (const d of generateDecorations(seed)) {
    if (d.kind !== 'tree' && d.kind !== 'tree2') continue;
    if (!decorationInEditorZone(d.x, d.z, zone)) continue;
    if (isTreeSuppressed(d.x, d.z, suppressedTrees)) continue;
    const key = treeKey(d.x, d.z);
    if (explicitKeys.has(key)) continue;
    if (isNearAuthoredTree(d.x, d.z, explicitTrees)) continue;

    keys.add(key);
    trees.push({
      x: d.x,
      z: d.z,
      kind: d.kind,
      scale: Math.round(d.scale * 100) / 100,
    });
  }
  return { trees, keys };
}

export function mergeEditorTrees(
  explicit: AuthoredTreeDef[],
  procedural: AuthoredTreeDef[],
): AuthoredTreeDef[] {
  return [...explicit, ...procedural];
}

export function addSuppression(
  suppressed: SuppressedTreeDef[],
  x: number,
  z: number,
): SuppressedTreeDef[] {
  return addSuppressionCore(suppressed, x, z);
}

export function removeExplicitTreeAt(
  explicit: AuthoredTreeDef[],
  x: number,
  z: number,
): AuthoredTreeDef[] {
  const key = treeKey(x, z);
  return explicit.filter((t) => treeKey(t.x, t.z) !== key);
}

export function upsertExplicitTree(
  explicit: AuthoredTreeDef[],
  tree: AuthoredTreeDef,
): AuthoredTreeDef[] {
  const key = treeKey(tree.x, tree.z);
  const out = explicit.filter((t) => treeKey(t.x, t.z) !== key);
  out.push({ ...tree });
  return out;
}
