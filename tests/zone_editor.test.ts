import { describe, expect, it } from 'vitest';
import { buildZoneEditorExport } from '../src/dev/zone_editor';
import { ZONE1_CAMPS, ZONE1_NPCS, ZONE1_PROPS } from '../src/sim/content/zone1';

describe('zone editor', () => {
  it('buildZoneEditorExport includes zone1 props, npc positions, and camps', () => {
    const out = buildZoneEditorExport(ZONE1_PROPS, ZONE1_NPCS, ZONE1_CAMPS);
    expect(out.zone).toBe('eastbrook_vale');
    expect(out.props.buildings.length).toBeGreaterThan(0);
    expect(Array.isArray(out.props.placedAssets)).toBe(true);
    expect(out.npcs.marshal_redbrook.pos).toBeDefined();
    expect(out.camps.length).toBeGreaterThan(0);
  });
});
