import type { ZoneDef } from './types';

let runtimeZones: ZoneDef[] | null = null;

/** Map editor: replace live ZONES with draft layout for banners, trees, etc. */
export function setRuntimeZoneOverlay(zones: ZoneDef[] | null): void {
  runtimeZones = zones ? zones.map((z) => structuredClone(z)) : null;
}

export function runtimeZoneList(): ZoneDef[] | null {
  return runtimeZones;
}
