/**
 * Strip Aldermere content from zone2 (zone4 already owns it).
 * Run: npx vitest run scripts/migrate_aldermere_content.test.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { pointInZone } from '../src/sim/zone_bounds';
import type { NpcDef, ZoneDef, ZonePropsDef } from '../src/sim/types';
import { ZONE2_NPCS, ZONE2_PROPS, ZONE2_ROADS, ZONE2_ZONE } from '../src/sim/content/zone2';
import { ZONE4_ZONE } from '../src/sim/content/zone4';
import {
  formatInlineLakes,
  formatZoneProps,
  formatZoneRoads,
  replaceMarkedBlock,
} from './merge_zone_export.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const ALD = ZONE4_ZONE;
const inAld = (x: number, z: number) => pointInZone(ALD, x, z);

const ALDERMERE_NPC_IDS = ['mayor_elise', 'market_warden', 'goods_merchant'] as const;

function splitRoads(roads: { x: number; z: number }[][]) {
  const marsh: { x: number; z: number }[][] = [];
  const ald: { x: number; z: number }[][] = [];
  for (const seg of roads) {
    let marshBuf: { x: number; z: number }[] = [];
    let aldBuf: { x: number; z: number }[] = [];
    const flushMarsh = (bridge?: { x: number; z: number }) => {
      if (marshBuf.length) marsh.push(bridge ? [...marshBuf, bridge] : [...marshBuf]);
      marshBuf = [];
    };
    const flushAld = (bridge?: { x: number; z: number }) => {
      if (aldBuf.length) ald.push(bridge ? [...aldBuf, bridge] : [...aldBuf]);
      aldBuf = [];
    };
    for (const p of seg) {
      if (inAld(p.x, p.z)) {
        flushMarsh(p);
        aldBuf.push(p);
      } else {
        flushAld(p);
        marshBuf.push(p);
      }
    }
    flushMarsh();
    flushAld();
  }
  return {
    marsh: marsh.filter((s) => s.length >= 2),
    ald: ald.filter((s) => s.length >= 2),
  };
}

function splitProps(props: ZonePropsDef): { marsh: ZonePropsDef; ald: ZonePropsDef } {
  const empty = (): ZonePropsDef => ({
    buildings: [], wells: [], stalls: [], mines: [], docks: [], tents: [],
    crates: [], campfires: [], mudHuts: [], ruinRings: [], fences: [], graveyards: [],
    placedAssets: [], authoredTrees: [], suppressedTrees: [],
  });
  const marsh = empty();
  const ald = empty();
  const pick = <T>(items: T[], test: (t: T) => boolean, m: T[], a: T[]) => {
    for (const item of items) (test(item) ? a : m).push(item);
  };
  pick(props.buildings, (b) => inAld(b.x, b.z), marsh.buildings, ald.buildings);
  pick(props.wells, (w) => inAld(w.x, w.z), marsh.wells, ald.wells);
  pick(props.stalls, (s) => inAld(s.x, s.z), marsh.stalls, ald.stalls);
  pick(props.mines, (m) => inAld(m.x, m.z), marsh.mines, ald.mines);
  pick(props.docks, (d) => inAld(d.x, d.z), marsh.docks, ald.docks);
  pick(props.tents, (t) => inAld(t.x, t.z), marsh.tents, ald.tents);
  pick(props.ruinRings, (r) => inAld(r.x, r.z), marsh.ruinRings, ald.ruinRings);
  pick(props.graveyards, (g) => inAld(g.x, g.z), marsh.graveyards, ald.graveyards);
  pick(props.placedAssets ?? [], (p) => inAld(p.x, p.z), marsh.placedAssets!, ald.placedAssets!);
  pick(props.authoredTrees ?? [], (t) => inAld(t.x, t.z), marsh.authoredTrees!, ald.authoredTrees!);
  pick(props.suppressedTrees ?? [], (t) => inAld(t.x, t.z), marsh.suppressedTrees!, ald.suppressedTrees!);
  for (const c of props.crates) (inAld(c[0], c[1]) ? ald.crates : marsh.crates).push(c);
  for (const c of props.campfires) (inAld(c[0], c[1]) ? ald.campfires : marsh.campfires).push(c);
  for (const c of props.mudHuts) (inAld(c[0], c[1]) ? ald.mudHuts : marsh.mudHuts).push(c);
  for (const f of props.fences) {
    const mx = (f.x1 + f.x2) / 2;
    const mz = (f.z1 + f.z2) / 2;
    (inAld(mx, mz) ? ald.fences : marsh.fences).push(f);
  }
  return { marsh, ald };
}

function splitLakes(zone: ZoneDef) {
  const marsh: NonNullable<ZoneDef['lakes']> = [];
  const ald: NonNullable<ZoneDef['lakes']> = [];
  for (const lake of zone.lakes ?? []) (inAld(lake.x, lake.z) ? ald : marsh).push(lake);
  return { marsh, ald };
}

function splitPois(zone: ZoneDef) {
  const marsh: NonNullable<ZoneDef['pois']> = [];
  const ald: NonNullable<ZoneDef['pois']> = [];
  for (const poi of zone.pois ?? []) (inAld(poi.x, poi.z) ? ald : marsh).push(poi);
  return { marsh, ald };
}

function removeNpcBlocks(content: string, ids: readonly string[]): string {
  let out = content;
  for (const id of ids) {
    out = out.replace(new RegExp(`\\n  ${id}: \\{[\\s\\S]*?\\},(?=\\n  [a-z_]+:|\\n\\};)`), '');
  }
  return out;
}

describe('migrate aldermere content', () => {
  it('strips aldermere content from zone2 only', () => {
    const { marsh: marshProps } = splitProps(ZONE2_PROPS);
    const { marsh: marshRoads } = splitRoads(ZONE2_ROADS);
    const { marsh: marshLakes } = splitLakes(ZONE2_ZONE);
    const { marsh: marshPois } = splitPois(ZONE2_ZONE);

    expect(marshProps.buildings.length).toBe(4);
    expect(marshRoads.length).toBeGreaterThanOrEqual(4);
    expect(marshLakes.length).toBe(3);

    const zone2Path = path.join(ROOT, 'src/sim/content/zone2.ts');
    let zone2 = fs.readFileSync(zone2Path, 'utf8');

    zone2 = replaceMarkedBlock(zone2, 'ZONE2_PROPS', formatZoneProps(marshProps, [], 'ZONE2_PROPS'));

    zone2 = zone2.replace(
      /export const ZONE2_ROADS: \{ x: number; z: number \}\[\]\[\] = \[[\s\S]*?\];\n/,
      `${formatZoneRoads(marshRoads, 'ZONE2_ROADS')}\n`,
    );

    const lakeBody = formatInlineLakes(marshLakes).split('\n').slice(1).join('\n').replace(/,\s*$/, '');
    zone2 = zone2.replace(/lakes: \[[\s\S]*?\],(?=\n  pois:)/, lakeBody);

    const poiLines = marshPois!.map((p) => `    { x: ${p.x}, z: ${p.z}, label: '${p.label.replace(/'/g, "\\'")}' },`).join('\n');
    zone2 = zone2.replace(
      /pois: \[[\s\S]*?\],(?=\n  settlements:)/,
      `pois: [\n${poiLines}\n  ],`,
    );
    zone2 = zone2.replace(/\n  settlements: \[\{ x: 320, z: 465, radius: 78, name: 'Aldermere' \}\],/, '');

    const aldStart = zone2.indexOf('// Aldermere — enlarged');
    const staticProps = zone2.indexOf('// Static props (rendering');
    if (aldStart >= 0 && staticProps > aldStart) {
      zone2 = zone2.slice(0, aldStart) + zone2.slice(staticProps);
    }

    zone2 = removeNpcBlocks(zone2, ALDERMERE_NPC_IDS);

    fs.writeFileSync(zone2Path, zone2, 'utf8');
  });
});
