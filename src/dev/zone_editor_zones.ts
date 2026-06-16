import type { CampDef, NpcDef, ZoneDef, ZonePropsDef } from '../sim/types';
import { ZONES, zoneAtPosition } from '../sim/data';
import {
  ZONE1_CAMPS, ZONE1_NPCS, ZONE1_PROPS, ZONE1_ROADS, ZONE1_ZONE,
} from '../sim/content/zone1';
import {
  ZONE2_CAMPS, ZONE2_NPCS, ZONE2_PROPS, ZONE2_ROADS, ZONE2_ZONE,
} from '../sim/content/zone2';
import {
  ZONE3_CAMPS, ZONE3_NPCS, ZONE3_PROPS, ZONE3_ROADS, ZONE3_ZONE,
} from '../sim/content/zone3';
import {
  ZONE4_CAMPS, ZONE4_NPCS, ZONE4_PROPS, ZONE4_ROADS, ZONE4_ZONE,
} from '../sim/content/zone4';
import type { MapEditorZoneBundle } from './map_editor_types';

/** Original three strip zones in zone1–zone3.ts. */
export type PublishedZoneId = 'eastbrook_vale' | 'mirefen_marsh' | 'thornpeak_heights';

export type EditorZoneId = PublishedZoneId | (string & {});

export interface ZoneEditorSource {
  id: string;
  name: string;
  file: string;
  exportFile: string;
  zone: ZoneDef;
  props: ZonePropsDef;
  npcs: Record<string, NpcDef>;
  camps: CampDef[];
  roads: { x: number; z: number }[][];
}

export const ZONE_EDITOR_SOURCES: Record<PublishedZoneId, ZoneEditorSource> = {
  eastbrook_vale: {
    id: 'eastbrook_vale',
    name: 'Eastbrook Vale',
    file: 'zone1.ts',
    exportFile: 'eastbrook_vale.json',
    zone: ZONE1_ZONE,
    props: ZONE1_PROPS,
    npcs: ZONE1_NPCS,
    camps: ZONE1_CAMPS,
    roads: ZONE1_ROADS,
  },
  mirefen_marsh: {
    id: 'mirefen_marsh',
    name: 'Mirefen Marsh',
    file: 'zone2.ts',
    exportFile: 'mirefen_marsh.json',
    zone: ZONE2_ZONE,
    props: ZONE2_PROPS,
    npcs: ZONE2_NPCS,
    camps: ZONE2_CAMPS,
    roads: ZONE2_ROADS,
  },
  thornpeak_heights: {
    id: 'thornpeak_heights',
    name: 'Thornpeak Heights',
    file: 'zone3.ts',
    exportFile: 'thornpeak_heights.json',
    zone: ZONE3_ZONE,
    props: ZONE3_PROPS,
    npcs: ZONE3_NPCS,
    camps: ZONE3_CAMPS,
    roads: ZONE3_ROADS,
  },
};

/** Extra zone files (zone4.ts, …) registered for editor + runtime. */
export const EXTENDED_ZONE_SOURCES: Record<string, ZoneEditorSource> = {
  aldermere: {
    id: 'aldermere',
    name: 'Aldermere',
    file: 'zone4.ts',
    exportFile: 'aldermere.json',
    zone: ZONE4_ZONE,
    props: ZONE4_PROPS,
    npcs: ZONE4_NPCS,
    camps: ZONE4_CAMPS,
    roads: ZONE4_ROADS,
  },
};

export const ALL_ZONE_SOURCES: Record<string, ZoneEditorSource> = {
  ...ZONE_EDITOR_SOURCES,
  ...EXTENDED_ZONE_SOURCES,
};

export const ZONE_EDITOR_IDS = Object.keys(ZONE_EDITOR_SOURCES) as PublishedZoneId[];

export function allEditorZoneIds(): string[] {
  const ids: string[] = [];
  for (const z of ZONES) {
    if (ALL_ZONE_SOURCES[z.id]) ids.push(z.id);
  }
  for (const id of Object.keys(EXTENDED_ZONE_SOURCES)) {
    if (!ids.includes(id)) ids.push(id);
  }
  return ids;
}

export function isPublishedZoneId(id: string): id is PublishedZoneId {
  return id in ZONE_EDITOR_SOURCES;
}

/** Zone has a live content file and can be published/reloaded. */
export function hasZoneFile(id: string): boolean {
  return id in ALL_ZONE_SOURCES;
}

export function resolveEditorZoneId(x: number, z: number): string {
  return zoneAtPosition(x, z).id;
}

export function cloneZoneEditorProps(props: ZonePropsDef): ZonePropsDef {
  const cloned = structuredClone(props);
  if (!cloned.placedAssets) cloned.placedAssets = [];
  if (!cloned.authoredTrees) cloned.authoredTrees = [];
  if (!cloned.suppressedTrees) cloned.suppressedTrees = [];
  return cloned;
}

export function captureZoneBundle(id: PublishedZoneId): MapEditorZoneBundle {
  return captureZoneBundleById(id);
}

export function captureZoneBundleById(id: string): MapEditorZoneBundle {
  const src = ALL_ZONE_SOURCES[id];
  if (!src) throw new Error(`Unknown zone: ${id}`);
  return {
    zone: structuredClone(src.zone),
    props: cloneZoneEditorProps(src.props),
    npcs: structuredClone(src.npcs),
    camps: structuredClone(src.camps),
    roads: structuredClone(src.roads),
  };
}

export function emptyZoneBundle(zone: ZoneDef): MapEditorZoneBundle {
  return {
    zone: structuredClone(zone),
    props: cloneZoneEditorProps({
      buildings: [], wells: [], stalls: [], mines: [], docks: [], tents: [],
      crates: [], campfires: [], mudHuts: [], ruinRings: [], fences: [], graveyards: [],
      placedAssets: [], authoredTrees: [], suppressedTrees: [],
    }),
    npcs: {},
    camps: [],
    roads: [],
  };
}

/** Live world snapshot for map editor boot + reload. */
export function captureLiveWorld(): Record<string, MapEditorZoneBundle> {
  const out: Record<string, MapEditorZoneBundle> = {};
  for (const id of allEditorZoneIds()) out[id] = captureZoneBundleById(id);
  return out;
}

/** Per-zone prop sets for renderer world mesh baking. */
export function worldZonePropSets(): { id: string; props: ZonePropsDef }[] {
  return allEditorZoneIds().map((id) => ({
    id,
    props: ALL_ZONE_SOURCES[id].props,
  }));
}
