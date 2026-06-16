import type { CampDef, NpcDef, ZoneDef, ZonePropsDef } from '../sim/types';

/** Full editable snapshot for one zone band or city pocket. */
export interface MapEditorZoneBundle {
  zone: ZoneDef;
  props: ZonePropsDef;
  npcs: Record<string, NpcDef>;
  camps: CampDef[];
  roads: { x: number; z: number }[][];
}

/** Draft world — saved to editor/drafts/ without touching live zone*.ts files. */
export interface MapEditorDraft {
  id: string;
  name: string;
  savedAt: string;
  /** All zone bundles keyed by zone id. */
  zones: Record<string, MapEditorZoneBundle>;
  /** Display/edit order (north → south for strip bands). */
  zoneOrder: string[];
}

export type MapEditorTool =
  | 'select'
  | 'placeAsset'
  | 'placeTree'
  | 'placeRoad'
  | 'placeLake'
  | 'placeNpc'
  | 'placeCamp';

/** Aldermere city pocket bounds (matches EAST_PROTRUSION in data.ts). */
export const ALDERMERE_ZONE_TEMPLATE: Omit<ZoneDef, 'id'> & { id?: string } = {
  name: 'Aldermere',
  xMin: 148,
  xMax: 502,
  zMin: 308,
  zMax: 592,
  levelRange: [8, 12],
  biome: 'marsh',
  hub: { x: 320, z: 465, radius: 78, name: 'Aldermere' },
  graveyard: { x: 320, z: 430 },
  lakes: [{ x: 388, z: 512, radius: 32 }],
  pois: [{ x: 320, z: 465, label: 'Aldermere' }, { x: 388, z: 512, label: 'Mirrorfen Basin' }],
  welcome: 'Welcome to Aldermere — the market trades, for now.',
};
