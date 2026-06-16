// Map editor: per-zone lake overrides before publish (terrain carving preview).

export type LakeDef = { x: number; z: number; radius: number };

const overlay = new Map<string, LakeDef[]>();

export function setRuntimeLakeOverlay(zones: Record<string, LakeDef[]> | null): void {
  overlay.clear();
  if (!zones) return;
  for (const [id, lakes] of Object.entries(zones)) {
    overlay.set(id, structuredClone(lakes));
  }
}

/** Lakes for a zone — editor overlay wins over live zone data when set. */
export function lakesForZone(zoneId: string, fallback: LakeDef[]): LakeDef[] {
  return overlay.has(zoneId) ? overlay.get(zoneId)! : fallback;
}
