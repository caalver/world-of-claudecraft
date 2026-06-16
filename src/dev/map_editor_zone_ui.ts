import type { ZoneDef } from '../sim/types';
import { joinStripZoneBands } from '../sim/zone_bounds';
import {
  ALDERMERE_ZONE_TEMPLATE,
  type MapEditorZoneBundle,
} from './map_editor_types';
import {
  ALL_ZONE_SOURCES,
  captureLiveWorld,
  captureZoneBundleById,
  emptyZoneBundle,
  hasZoneFile,
  isPublishedZoneId,
  allEditorZoneIds,
} from './zone_editor_zones';

export function initialEditorZones(): {
  bundles: Map<string, MapEditorZoneBundle>;
  zoneOrder: string[];
} {
  const live = captureLiveWorld();
  const bundles = new Map(Object.entries(live));
  return { bundles, zoneOrder: allEditorZoneIds() };
}

export function migrateDraftZones(draft: {
  zones?: Record<string, MapEditorZoneBundle>;
  zoneOrder?: string[];
  customZones?: MapEditorZoneBundle[];
}): { bundles: Map<string, MapEditorZoneBundle>; zoneOrder: string[] } {
  const bundles = new Map<string, MapEditorZoneBundle>();
  const zones = draft.zones ?? {};
  for (const [id, bundle] of Object.entries(zones)) {
    if (bundle?.zone) bundles.set(id, structuredClone(bundle));
  }
  for (const custom of draft.customZones ?? []) {
    if (custom?.zone?.id && !bundles.has(custom.zone.id)) {
      bundles.set(custom.zone.id, structuredClone(custom));
    }
  }
  for (const id of allEditorZoneIds()) {
    if (!bundles.has(id)) bundles.set(id, captureZoneBundleById(id));
  }
  const zoneOrder = draft.zoneOrder?.length
    ? [...draft.zoneOrder]
    : allEditorZoneIds();
  for (const id of bundles.keys()) {
    if (!zoneOrder.includes(id)) zoneOrder.push(id);
  }
  return { bundles, zoneOrder };
}

export function readZoneSettingsFromForm(root: ParentNode): Partial<ZoneDef> {
  const val = (sel: string) => (root.querySelector(sel) as HTMLInputElement | HTMLSelectElement)?.value ?? '';
  const num = (sel: string) => {
    const n = parseFloat(val(sel));
    return Number.isFinite(n) ? n : undefined;
  };
  const xMin = num('#zone-x-min');
  const xMax = num('#zone-x-max');
  const patch: Partial<ZoneDef> = {
    id: val('#zone-id').trim() || undefined,
    name: val('#zone-name').trim() || undefined,
    zMin: num('#zone-z-min'),
    zMax: num('#zone-z-max'),
    biome: val('#zone-biome') as ZoneDef['biome'] | undefined,
    levelRange: [num('#zone-level-min') ?? 1, num('#zone-level-max') ?? 10] as [number, number],
    hub: {
      x: num('#zone-hub-x') ?? 0,
      z: num('#zone-hub-z') ?? 0,
      radius: num('#zone-hub-radius') ?? 20,
      name: val('#zone-hub-name') || 'Hub',
    },
    welcome: val('#zone-welcome'),
  };
  if (xMin != null && xMax != null && xMin < xMax) {
    patch.xMin = xMin;
    patch.xMax = xMax;
  } else {
    patch.xMin = undefined;
    patch.xMax = undefined;
  }
  return patch;
}

export function writeZoneSettingsToForm(root: ParentNode, zone: ZoneDef): void {
  const set = (sel: string, value: string | number) => {
    const el = root.querySelector(sel) as HTMLInputElement | HTMLSelectElement | null;
    if (el) el.value = String(value);
  };
  set('#zone-id', zone.id);
  set('#zone-name', zone.name);
  set('#zone-z-min', zone.zMin);
  set('#zone-z-max', zone.zMax);
  set('#zone-x-min', zone.xMin ?? '');
  set('#zone-x-max', zone.xMax ?? '');
  set('#zone-biome', zone.biome);
  set('#zone-level-min', zone.levelRange[0]);
  set('#zone-level-max', zone.levelRange[1]);
  set('#zone-hub-x', zone.hub.x);
  set('#zone-hub-z', zone.hub.z);
  set('#zone-hub-radius', zone.hub.radius);
  set('#zone-hub-name', zone.hub.name);
  set('#zone-welcome', zone.welcome ?? '');
  const idInput = root.querySelector('#zone-id') as HTMLInputElement | null;
  if (idInput) idInput.readOnly = hasZoneFile(zone.id);
}

export function applyZoneSettingsPatch(zone: ZoneDef, patch: Partial<ZoneDef>): ZoneDef {
  const next = structuredClone(zone);
  if (patch.name) next.name = patch.name;
  if (patch.zMin != null) next.zMin = patch.zMin;
  if (patch.zMax != null) next.zMax = patch.zMax;
  if (patch.xMin != null && patch.xMax != null) {
    next.xMin = patch.xMin;
    next.xMax = patch.xMax;
  } else if (patch.xMin === undefined && patch.xMax === undefined && 'xMin' in patch) {
    delete next.xMin;
    delete next.xMax;
  }
  if (patch.biome) next.biome = patch.biome;
  if (patch.levelRange) next.levelRange = patch.levelRange;
  if (patch.hub) next.hub = { ...next.hub, ...patch.hub };
  if (patch.welcome !== undefined) next.welcome = patch.welcome;
  if (patch.id && !hasZoneFile(zone.id)) next.id = patch.id;
  return next;
}

export function createStripZoneBundle(
  bundles: Map<string, MapEditorZoneBundle>,
  customCount: number,
): MapEditorZoneBundle {
  const last = [...bundles.values()].reduce((m, b) => Math.max(m, b.zone.zMax), -180);
  const zMin = last;
  const zMax = last + 180;
  const id = `zone_${Date.now().toString(36)}`;
  const zone: ZoneDef = {
    id,
    name: `New Zone ${customCount + 1}`,
    zMin,
    zMax,
    levelRange: [1, 10],
    biome: 'vale',
    hub: { x: 0, z: zMin + 90, radius: 20, name: 'Hub' },
    graveyard: { x: 0, z: zMin + 85 },
    lakes: [],
    pois: [],
    welcome: '',
  };
  return emptyZoneBundle(zone);
}

export function createAldermereZoneBundle(): MapEditorZoneBundle {
  const zone: ZoneDef = {
    id: 'aldermere',
    name: ALDERMERE_ZONE_TEMPLATE.name ?? 'Aldermere',
    xMin: ALDERMERE_ZONE_TEMPLATE.xMin,
    xMax: ALDERMERE_ZONE_TEMPLATE.xMax,
    zMin: ALDERMERE_ZONE_TEMPLATE.zMin ?? 308,
    zMax: ALDERMERE_ZONE_TEMPLATE.zMax ?? 592,
    levelRange: ALDERMERE_ZONE_TEMPLATE.levelRange ?? [8, 12],
    biome: ALDERMERE_ZONE_TEMPLATE.biome ?? 'marsh',
    hub: ALDERMERE_ZONE_TEMPLATE.hub ?? { x: 320, z: 465, radius: 78, name: 'Aldermere' },
    graveyard: ALDERMERE_ZONE_TEMPLATE.graveyard ?? { x: 320, z: 430 },
    lakes: ALDERMERE_ZONE_TEMPLATE.lakes ?? [],
    pois: ALDERMERE_ZONE_TEMPLATE.pois ?? [],
    welcome: ALDERMERE_ZONE_TEMPLATE.welcome ?? '',
  };
  return emptyZoneBundle(zone);
}

export function joinEditorZoneBands(
  bundles: Map<string, MapEditorZoneBundle>,
  zoneOrder: string[],
): string[] {
  const ordered = zoneOrder
    .map((id) => bundles.get(id))
    .filter((b): b is MapEditorZoneBundle => !!b);
  const joined = joinStripZoneBands(ordered.map((b) => b.zone));
  joined.forEach((zone, i) => {
    const bundle = ordered[i];
    if (bundle) bundle.zone = { ...bundle.zone, zMin: zone.zMin, zMax: zone.zMax };
  });
  return zoneOrder;
}

export function zoneListFromBundles(
  bundles: Map<string, MapEditorZoneBundle>,
  zoneOrder: string[],
): ZoneDef[] {
  return zoneOrder
    .map((id) => bundles.get(id)?.zone)
    .filter((z): z is ZoneDef => !!z)
    .map((z) => structuredClone(z));
}

export function nextCustomZoneFileIndex(): number {
  return 4;
}

export function publishedZoneExportName(id: string): string {
  return ALL_ZONE_SOURCES[id]?.exportFile ?? `${id}.json`;
}
