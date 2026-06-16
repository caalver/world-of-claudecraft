import type { CampDef, NpcDef, ZonePropsDef } from '../sim/types';
import { zoneAt } from '../sim/data';
import { ZONE1_CAMPS, ZONE1_NPCS, ZONE1_PROPS } from '../sim/content/zone1';
import { ZONE2_CAMPS, ZONE2_NPCS, ZONE2_PROPS } from '../sim/content/zone2';
import { ZONE3_CAMPS, ZONE3_NPCS, ZONE3_PROPS } from '../sim/content/zone3';

export type EditorZoneId = 'eastbrook_vale' | 'mirefen_marsh' | 'thornpeak_heights';

export interface ZoneEditorSource {
  id: EditorZoneId;
  name: string;
  file: string;
  exportFile: string;
  props: ZonePropsDef;
  npcs: Record<string, NpcDef>;
  camps: CampDef[];
}

export const ZONE_EDITOR_SOURCES: Record<EditorZoneId, ZoneEditorSource> = {
  eastbrook_vale: {
    id: 'eastbrook_vale',
    name: 'Eastbrook Vale',
    file: 'zone1.ts',
    exportFile: 'eastbrook_vale.json',
    props: ZONE1_PROPS,
    npcs: ZONE1_NPCS,
    camps: ZONE1_CAMPS,
  },
  mirefen_marsh: {
    id: 'mirefen_marsh',
    name: 'Mirefen Marsh',
    file: 'zone2.ts',
    exportFile: 'mirefen_marsh.json',
    props: ZONE2_PROPS,
    npcs: ZONE2_NPCS,
    camps: ZONE2_CAMPS,
  },
  thornpeak_heights: {
    id: 'thornpeak_heights',
    name: 'Thornpeak Heights',
    file: 'zone3.ts',
    exportFile: 'thornpeak_heights.json',
    props: ZONE3_PROPS,
    npcs: ZONE3_NPCS,
    camps: ZONE3_CAMPS,
  },
};

export const ZONE_EDITOR_IDS = Object.keys(ZONE_EDITOR_SOURCES) as EditorZoneId[];

export function resolveEditorZoneId(_x: number, z: number): EditorZoneId {
  return zoneAt(z).id as EditorZoneId;
}

export function cloneZoneEditorProps(props: ZonePropsDef): ZonePropsDef {
  const cloned = structuredClone(props);
  if (!cloned.placedAssets) cloned.placedAssets = [];
  if (!cloned.authoredTrees) cloned.authoredTrees = [];
  return cloned;
}
