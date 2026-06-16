// Procedural tree suppressions — shared by live world and map editor.

export type SuppressedTreeDef = { x: number; z: number };

const MATCH_EPS = 0.2;

export function treeKey(x: number, z: number): string {
  return `${x.toFixed(2)},${z.toFixed(2)}`;
}

export function isTreeSuppressed(
  x: number,
  z: number,
  suppressed: SuppressedTreeDef[],
  eps = MATCH_EPS,
): boolean {
  for (const s of suppressed) {
    if (Math.hypot(s.x - x, s.z - z) <= eps) return true;
  }
  return false;
}

export function addSuppression(
  suppressed: SuppressedTreeDef[],
  x: number,
  z: number,
): SuppressedTreeDef[] {
  if (isTreeSuppressed(x, z, suppressed)) return suppressed;
  return [...suppressed, { x, z }];
}

export function filterProceduralDecorations<T extends { kind: string; x: number; z: number }>(
  decos: T[],
  suppressed: SuppressedTreeDef[],
): T[] {
  return decos.filter((d) => {
    if (d.kind !== 'tree' && d.kind !== 'tree2') return true;
    return !isTreeSuppressed(d.x, d.z, suppressed);
  });
}
