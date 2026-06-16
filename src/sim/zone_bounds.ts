import type { ZoneDef } from './types';

/** Main overworld strip width (x in [-WORLD_STRIP_HALF, WORLD_STRIP_HALF)). */
export const WORLD_STRIP_HALF = 180;

export function isProtrusionZone(zone: ZoneDef): boolean {
  return zone.xMin != null && zone.xMax != null;
}

/** North–south strip bands only (excludes x-bounded protrusion pockets like Aldermere). */
export function stripZoneBands(zones: readonly ZoneDef[]): ZoneDef[] {
  return zones.filter((z) => !isProtrusionZone(z));
}

export function zoneXMin(zone: ZoneDef): number {
  return zone.xMin ?? -WORLD_STRIP_HALF;
}

export function zoneXMax(zone: ZoneDef): number {
  return zone.xMax ?? WORLD_STRIP_HALF;
}

/** True when (x, z) lies inside a zone's declared bounds. */
export function pointInZone(zone: ZoneDef, x: number, z: number): boolean {
  return x >= zoneXMin(zone) && x < zoneXMax(zone) && z >= zone.zMin && z < zone.zMax;
}

/** True when (x, z) is on the main north–south strip (not a protrusion-only pocket). */
export function pointInMainStrip(x: number, z: number): boolean {
  return x >= -WORLD_STRIP_HALF && x < WORLD_STRIP_HALF;
}

/**
 * Resolve the zone at a world position. Protrusion/box zones (xMin/xMax set) win
 * over the main strip bands when they overlap in z.
 */
export function zoneAtPosition(x: number, z: number, zones: readonly ZoneDef[]): ZoneDef {
  for (const zone of zones) {
    if (isProtrusionZone(zone) && pointInZone(zone, x, z)) return zone;
  }
  for (const zone of zones) {
    if (isProtrusionZone(zone)) continue;
    if (z >= zone.zMin && z < zone.zMax && pointInMainStrip(x, z)) return zone;
  }
  for (const zone of zones) {
    if (z >= zone.zMin && z < zone.zMax) return zone;
  }
  return zones[zones.length - 1];
}

/** Sort zones north-to-south by zMin (stable for strip bands). */
export function sortZonesByBand(zones: ZoneDef[]): ZoneDef[] {
  return [...zones].sort((a, b) => a.zMin - b.zMin || a.zMax - b.zMax);
}

/** Join strip zones so each zMin meets the previous zMax (protrusion zones unchanged). */
export function joinStripZoneBands(zones: ZoneDef[]): ZoneDef[] {
  const sorted = sortZonesByBand(zones);
  let lastStripMax = sorted[0]?.zMin ?? -180;
  return sorted.map((zone) => {
    if (isProtrusionZone(zone)) return zone;
    const next = { ...zone, zMin: lastStripMax };
    lastStripMax = next.zMax;
    return next;
  });
}

/** Rectangle corners for editor boundary wireframes. */
export function zoneBoundaryCorners(zone: ZoneDef): { x: number; z: number }[] {
  const x0 = zoneXMin(zone);
  const x1 = zoneXMax(zone);
  const z0 = zone.zMin;
  const z1 = zone.zMax;
  return [
    { x: x0, z: z0 },
    { x: x1, z: z0 },
    { x: x1, z: z1 },
    { x: x0, z: z1 },
  ];
}
