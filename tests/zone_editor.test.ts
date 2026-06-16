import { describe, expect, it } from 'vitest';
import { buildZoneEditorExport } from '../src/dev/zone_editor';
import { resolveEditorZoneId } from '../src/dev/zone_editor_zones';
import { ZONE1_CAMPS, ZONE1_NPCS, ZONE1_PROPS, ZONE1_ROADS, ZONE1_ZONE } from '../src/sim/content/zone1';
import { ZONE2_CAMPS, ZONE2_NPCS, ZONE2_PROPS, ZONE2_ROADS, ZONE2_ZONE } from '../src/sim/content/zone2';

describe('zone editor', () => {
  it('buildZoneEditorExport includes zone1 props, npc positions, and camps', () => {
    const out = buildZoneEditorExport('eastbrook_vale', ZONE1_ZONE, ZONE1_PROPS, ZONE1_NPCS, ZONE1_CAMPS, ZONE1_ROADS);
    expect(out.zone).toBe('eastbrook_vale');
    expect(out.props.buildings.length).toBeGreaterThan(0);
    expect(Array.isArray(out.props.placedAssets)).toBe(true);
    expect(out.npcs.marshal_redbrook.pos).toBeDefined();
    expect(out.camps.length).toBeGreaterThan(0);
    expect(out.roads.length).toBeGreaterThan(0);
  });

  it('resolveEditorZoneId picks aldermere for Aldermere city coordinates', () => {
    expect(resolveEditorZoneId(320, 465)).toBe('aldermere');
  });

  it('buildZoneEditorExport supports mirefen_marsh', () => {
    const out = buildZoneEditorExport('mirefen_marsh', ZONE2_ZONE, ZONE2_PROPS, ZONE2_NPCS, ZONE2_CAMPS, ZONE2_ROADS);
    expect(out.zone).toBe('mirefen_marsh');
    expect(out.props.buildings.length).toBeGreaterThan(0);
    expect(out.npcs.warden_fenwick.pos).toBeDefined();
  });
});
