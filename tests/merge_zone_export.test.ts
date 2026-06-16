import { describe, expect, it } from 'vitest';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  collidersMatchHouse2,
  formatZone1Camps,
  formatZone1Props,
  house2DoorOverhangColliders,
  mergeZoneExport,
  patchNpcPositions,
} from '../scripts/merge_zone_export.mjs';
import { ZONE1_CAMPS, ZONE1_NPCS, ZONE1_PROPS } from '../src/sim/content/zone1';
import { ZONE2_CAMPS, ZONE2_NPCS, ZONE2_PROPS } from '../src/sim/content/zone2';
import { buildZoneEditorExport } from '../src/dev/zone_editor';

describe('merge_zone_export', () => {
  it('house2DoorOverhangColliders matches detector', () => {
    const c = house2DoorOverhangColliders(14, 12);
    expect(collidersMatchHouse2(c, 14, 12)).toBe(true);
  });

  it('formatZone1Props emits zone1 buildings without legacy overhang colliders', () => {
    const props = structuredClone(ZONE1_PROPS);
    const text = formatZone1Props(props);
    expect(text).toContain("kind: 'house', prop: 'house2', x: 11.441");
    expect(text).not.toContain('house2DoorOverhangColliders');
    expect(text).toContain('placedAssets: [');
  });

  it('formatZone1Props emits placed asset colliders', () => {
    const props = structuredClone(ZONE1_PROPS);
    props.placedAssets = [{
      id: 'test_barrel',
      model: 'barrel',
      x: 5,
      z: 6,
      rot: 0.5,
      scale: 1,
    }];
    const text = formatZone1Props(props);
    expect(text).toContain("id: 'test_barrel'");
    expect(text).toContain("model: 'barrel'");
  });

  it('patchNpcPositions replaces Math.PI facing expressions', () => {
    const sample = `  apothecary_lin: {
    pos: { x: 11, z: -3 }, facing: -Math.PI / 2, color: 0x1,
  },`;
    const out = patchNpcPositions(sample, {
      apothecary_lin: { pos: { x: 11, z: -3 }, facing: -1.571 },
    });
    expect(out).toContain('facing: -1.571');
    expect(out).not.toContain('Math.PI');
  });

  it('patchNpcPositions updates marshal_redbrook without touching other fields', () => {
    const sample = `export const ZONE1_NPCS = {
  marshal_redbrook: {
    id: 'marshal_redbrook', name: 'Marshal',
    pos: { x: 4, z: 6 }, facing: 3.14,
    questIds: ['q_wolves'],
  },
};`;
    const out = patchNpcPositions(sample, {
      marshal_redbrook: { pos: { x: 5.5, z: 7.2 }, facing: 1.2 },
    });
    expect(out).toContain('pos: { x: 5.5, z: 7.2 }');
    expect(out).toContain('facing: 1.2');
    expect(out).toContain("questIds: ['q_wolves']");
  });

  it('round-trips zone1 through export → merge without losing markers', () => {
    const fixture = buildZoneEditorExport('eastbrook_vale', ZONE1_PROPS, ZONE1_NPCS, ZONE1_CAMPS);
    const zonePath = path.join(process.cwd(), 'src', 'sim', 'content', 'zone1.ts');
    const original = readFileSync(zonePath, 'utf8');
    const tmpExport = path.join(process.cwd(), 'tests', 'fixtures', 'eastbrook_roundtrip.json');
    mkdirSync(path.dirname(tmpExport), { recursive: true });
    writeFileSync(tmpExport, JSON.stringify(fixture, null, 2));

    mergeZoneExport(tmpExport, zonePath);
    const merged = readFileSync(zonePath, 'utf8');
    expect(merged).toContain('// @zone-editor-begin ZONE1_PROPS');
    expect(merged).toContain('// @zone-editor-end ZONE1_CAMPS');
    expect(merged).toContain('marshal_redbrook');
    expect(formatZone1Camps(fixture.camps)).toContain("mobId: 'forest_wolf'");

    writeFileSync(zonePath, original, 'utf8');
  });

  it('round-trips zone2 through export → merge without losing markers', () => {
    const fixture = buildZoneEditorExport('mirefen_marsh', ZONE2_PROPS, ZONE2_NPCS, ZONE2_CAMPS);
    const zonePath = path.join(process.cwd(), 'src', 'sim', 'content', 'zone2.ts');
    const original = readFileSync(zonePath, 'utf8');
    const tmpExport = path.join(process.cwd(), 'tests', 'fixtures', 'mirefen_roundtrip.json');
    mkdirSync(path.dirname(tmpExport), { recursive: true });
    writeFileSync(tmpExport, JSON.stringify(fixture, null, 2));

    mergeZoneExport(tmpExport, zonePath);
    const merged = readFileSync(zonePath, 'utf8');
    expect(merged).toContain('// @zone-editor-begin ZONE2_PROPS');
    expect(merged).toContain('// @zone-editor-end ZONE2_CAMPS');
    expect(merged).toContain('mayor_elise');

    writeFileSync(zonePath, original, 'utf8');
  });
});
