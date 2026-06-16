// Merge a zone-editor JSON export back into src/sim/content/zone*.ts.
//
// Usage:
//   1. In-game (F8): copy JSON or download eastbrook_vale.json
//   2. Save to editor/exports/eastbrook_vale.json
//   3. npm run merge:zone
//   4. Restart npm run server + refresh the client
//
// The script updates ZONE1_PROPS, ZONE1_CAMPS, and NPC pos/facing in zone1.ts.
// Markers // @zone-editor-begin/end in the zone file delimit auto-generated blocks.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** @type {Record<string, { file: string; exportName: string; propsMarker: string; campsMarker: string; roadsMarker: string; lakesMarker: string }>} */
export const ZONE_TARGETS = {
  eastbrook_vale: {
    file: 'src/sim/content/zone1.ts',
    exportName: 'eastbrook_vale.json',
    propsMarker: 'ZONE1_PROPS',
    campsMarker: 'ZONE1_CAMPS',
    roadsMarker: 'ZONE1_ROADS',
    lakesMarker: 'ZONE1_LAKES',
    metaMarker: 'ZONE1_META',
  },
  mirefen_marsh: {
    file: 'src/sim/content/zone2.ts',
    exportName: 'mirefen_marsh.json',
    propsMarker: 'ZONE2_PROPS',
    campsMarker: 'ZONE2_CAMPS',
    roadsMarker: 'ZONE2_ROADS',
    lakesMarker: 'ZONE2_LAKES',
    metaMarker: 'ZONE2_META',
  },
  thornpeak_heights: {
    file: 'src/sim/content/zone3.ts',
    exportName: 'thornpeak_heights.json',
    propsMarker: 'ZONE3_PROPS',
    campsMarker: 'ZONE3_CAMPS',
    roadsMarker: 'ZONE3_ROADS',
    lakesMarker: 'ZONE3_LAKES',
    metaMarker: 'ZONE3_META',
  },
  aldermere: {
    file: 'src/sim/content/zone4.ts',
    exportName: 'aldermere.json',
    propsMarker: 'ZONE4_PROPS',
    campsMarker: 'ZONE4_CAMPS',
    roadsMarker: 'ZONE4_ROADS',
    lakesMarker: 'ZONE4_LAKES',
    metaMarker: 'ZONE4_META',
  },
};

export function fmtNum(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '0';
  const r = Math.round(n * 1000) / 1000;
  if (Number.isInteger(r)) return String(r);
  const s = r.toFixed(3);
  return s.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
}

export function house2DoorOverhangColliders(w, d) {
  const overhang = Math.min(4, w * 0.33);
  const bodyHw = (w - overhang) / 2;
  const bodyLx = -overhang / 2;
  return [{ lx: bodyLx, lz: 0, hw: bodyHw, hd: d / 2 }];
}

export function collidersMatchHouse2(colliders, w, d) {
  if (!colliders?.length || colliders.length !== 1) return false;
  const ref = house2DoorOverhangColliders(w, d)[0];
  const c = colliders[0];
  const eps = 0.05;
  return Math.abs(c.lx - ref.lx) < eps
    && Math.abs(c.lz - ref.lz) < eps
    && Math.abs(c.hw - ref.hw) < eps
    && Math.abs(c.hd - ref.hd) < eps;
}

function formatColliderBlock(c) {
  return `{ lx: ${fmtNum(c.lx)}, lz: ${fmtNum(c.lz)}, hw: ${fmtNum(c.hw)}, hd: ${fmtNum(c.hd)} }`;
}

function formatBuilding(b) {
  const head = [
    `kind: '${b.kind}'`,
    b.prop ? `prop: '${b.prop}'` : null,
    b.interior ? `interior: '${b.interior}'` : null,
    `x: ${fmtNum(b.x)}`,
    `z: ${fmtNum(b.z)}`,
    `w: ${fmtNum(b.w)}`,
    `d: ${fmtNum(b.d)}`,
    `rot: ${fmtNum(b.rot)}`,
  ].filter(Boolean).join(', ');
  let collider = '';
  if (b.colliders?.length) {
    if (b.prop === 'house2' && collidersMatchHouse2(b.colliders, b.w, b.d)) {
      collider = `,\n      colliders: house2DoorOverhangColliders(${fmtNum(b.w)}, ${fmtNum(b.d)})`;
    } else {
      collider = `,\n      colliders: [${b.colliders.map(formatColliderBlock).join(', ')}]`;
    }
    return `    {\n      ${head}${collider},\n    }`;
  }
  return `    { ${head} }`;
}

function formatVec2Pair(pair) {
  return `[${fmtNum(pair[0])}, ${fmtNum(pair[1])}]`;
}

function formatRuinRing(r) {
  return `{ x: ${fmtNum(r.x)}, z: ${fmtNum(r.z)}, ringR: ${fmtNum(r.ringR)}, columns: ${r.columns} }`;
}

function formatFence(f) {
  return `{ x1: ${fmtNum(f.x1)}, z1: ${fmtNum(f.z1)}, x2: ${fmtNum(f.x2)}, z2: ${fmtNum(f.z2)} }`;
}

function formatDock(d) {
  const h = d.hutLocal;
  return `{ x: ${fmtNum(d.x)}, z: ${fmtNum(d.z)}, rot: ${fmtNum(d.rot)}, hutLocal: { x: ${fmtNum(h.x)}, z: ${fmtNum(h.z)}, hw: ${fmtNum(h.hw)}, hd: ${fmtNum(h.hd)} } }`;
}

/** Footprint bases for house2 overhang collider emission (matches prop_library). */
const HOUSE2_BASE = { w: 14, d: 12 };

function formatPlacedAsset(a) {
  const head = [
    `id: '${a.id}'`,
    `model: '${a.model}'`,
    `x: ${fmtNum(a.x)}`,
    `z: ${fmtNum(a.z)}`,
    `rot: ${fmtNum(a.rot)}`,
    `scale: ${fmtNum(a.scale)}`,
  ].join(', ');
  if (!a.colliders?.length) return `    { ${head} }`;
  let collider = '';
  if (a.model === 'house2' && a.colliders.length === 1) {
    const w = HOUSE2_BASE.w * a.scale;
    const d = HOUSE2_BASE.d * a.scale;
    if (collidersMatchHouse2(a.colliders, w, d)) {
      collider = `,\n      colliders: house2DoorOverhangColliders(${fmtNum(w)}, ${fmtNum(d)})`;
      return `    {\n      ${head}${collider},\n    }`;
    }
  }
  collider = `,\n      colliders: [${a.colliders.map(formatColliderBlock).join(', ')}]`;
  return `    {\n      ${head}${collider},\n    }`;
}

/** @param {import('../src/sim/types').ZonePropsDef} props */
export function formatZoneProps(props, stallComments = [], propsExport = 'ZONE1_PROPS') {
  const lines = [
    `export const ${propsExport}: ZonePropsDef = {`,
    '  buildings: [',
    ...props.buildings.map((b) => `${formatBuilding(b)},`),
    '  ],',
    `  wells: [${props.wells.map((w) => `{ x: ${fmtNum(w.x)}, z: ${fmtNum(w.z)}, r: ${fmtNum(w.r)} }`).join(', ')}],`,
    '  stalls: [',
    ...props.stalls.map((s, i) => {
      const comment = stallComments[i] ? ` ${stallComments[i]}` : '';
      return `    { x: ${fmtNum(s.x)}, z: ${fmtNum(s.z)}, rot: ${fmtNum(s.rot)}, r: ${fmtNum(s.r)} },${comment}`;
    }),
    '  ],',
    `  mines: [${props.mines.map((m) => `{ x: ${fmtNum(m.x)}, z: ${fmtNum(m.z)}, rot: ${fmtNum(m.rot)} }`).join(', ')}],`,
    `  docks: [${props.docks.map(formatDock).join(', ')}],`,
    '  tents: [',
    ...props.tents.map((t) => `    { x: ${fmtNum(t.x)}, z: ${fmtNum(t.z)}, rot: ${fmtNum(t.rot)}, scale: ${fmtNum(t.scale)} },`),
    '  ],',
    `  crates: [${props.crates.map(formatVec2Pair).join(', ')}],`,
    `  campfires: [${props.campfires.map(formatVec2Pair).join(', ')}],`,
    `  mudHuts: [${props.mudHuts.map(formatVec2Pair).join(', ')}],`,
    `  ruinRings: [${props.ruinRings.map(formatRuinRing).join(', ')}],`,
    '  fences: [',
    ...props.fences.map((f) => `    ${formatFence(f)},`),
    '  ],',
    `  graveyards: [${props.graveyards.map((g) => `{ x: ${fmtNum(g.x)}, z: ${fmtNum(g.z)} }`).join(', ')}],`,
    '  placedAssets: [',
    ...(props.placedAssets ?? []).map((a) => `${formatPlacedAsset(a)},`),
    '  ],',
    formatAuthoredTrees(props.authoredTrees),
    formatSuppressedTrees(props.suppressedTrees),
    '};',
  ];
  return lines.join('\n');
}

function formatSuppressedTrees(suppressed) {
  if (!suppressed?.length) return '  suppressedTrees: [],';
  const rows = suppressed.map((s) => `    { x: ${fmtNum(s.x)}, z: ${fmtNum(s.z)} },`);
  return ['  suppressedTrees: [', ...rows, '  ],'].join('\n');
}

function formatAuthoredTrees(trees) {
  if (!trees?.length) return '  authoredTrees: [],';
  const rows = trees.map((t) => {
    const parts = [`x: ${fmtNum(t.x)}`, `z: ${fmtNum(t.z)}`];
    if (t.kind) parts.push(`kind: '${t.kind}'`);
    if (t.scale != null) parts.push(`scale: ${fmtNum(t.scale)}`);
    return `    { ${parts.join(', ')} },`;
  });
  return ['  authoredTrees: [', ...rows, '  ],'].join('\n');
}

/** Back-compat alias */
export const formatZone1Props = formatZoneProps;

/** @param {import('../src/sim/types').CampDef[]} camps */
export function formatZoneCamps(camps, campsExport = 'ZONE1_CAMPS') {
  const lines = [
    `export const ${campsExport}: CampDef[] = [`,
    ...camps.map((c) => `  { mobId: '${c.mobId}', center: { x: ${fmtNum(c.center.x)}, z: ${fmtNum(c.center.z)} }, radius: ${fmtNum(c.radius)}, count: ${c.count} },`),
    '];',
  ];
  return lines.join('\n');
}

/** Back-compat alias */
export const formatZone1Camps = formatZoneCamps;

/** @param {{ x: number; z: number }[][]} roads */
export function formatZoneRoads(roads, roadsExport = 'ZONE1_ROADS') {
  if (!roads?.length) {
    return `export const ${roadsExport}: { x: number; z: number }[][] = [];`;
  }
  const rows = roads.map((seg) => {
    const pts = seg.map((p) => `{ x: ${fmtNum(p.x)}, z: ${fmtNum(p.z)} }`).join(', ');
    return `  [${pts}],`;
  });
  return [`export const ${roadsExport}: { x: number; z: number }[][] = [`, ...rows, '];'].join('\n');
}

export function extractStallComments(zoneContent, propsMarker = 'ZONE1_PROPS') {
  const comments = [];
  const m = zoneContent.match(new RegExp(`export const ${propsMarker}[\\s\\S]*?stalls: \\[([\\s\\S]*?)\\],`));
  if (!m) return comments;
  for (const line of m[1].split('\n')) {
    const cm = line.match(/\/\/.*$/);
    comments.push(cm ? cm[0] : '');
  }
  return comments;
}

export function replaceMarkedBlock(content, markerName, generatedBody) {
  const begin = `// @zone-editor-begin ${markerName}`;
  const end = `// @zone-editor-end ${markerName}`;
  const i0 = content.indexOf(begin);
  const i1 = content.indexOf(end);
  if (i0 < 0 || i1 < 0 || i1 <= i0) {
    throw new Error(`Missing zone-editor markers for ${markerName}`);
  }
  return `${content.slice(0, i0 + begin.length)}\n${generatedBody}\n${content.slice(i1)}`;
}

export function patchNpcPositions(content, npcUpdates) {
  let out = content;
  for (const [id, { pos, facing }] of Object.entries(npcUpdates)) {
    const re = new RegExp(
      `(  ${id}: \\{[\\s\\S]*?pos: )\\{ x: [-\\d.]+, z: [-\\d.]+ \\}([\\s\\S]*?facing: )[^,\\n]+`,
    );
    if (!re.test(out)) throw new Error(`NPC block not found in zone file: ${id}`);
    out = out.replace(
      re,
      `$1{ x: ${fmtNum(pos.x)}, z: ${fmtNum(pos.z)} }$2${fmtNum(facing)}`,
    );
  }
  return out;
}

/** @param {{ x: number; z: number; radius: number }[]} lakes */
export function formatInlineLakes(lakes) {
  if (!lakes?.length) return '  lakes: [],';
  const rows = lakes.map((l) => `    { x: ${fmtNum(l.x)}, z: ${fmtNum(l.z)}, radius: ${fmtNum(l.radius)} },`);
  return ['  lakes: [', ...rows, '  ],'].join('\n');
}

/** @param {import('../src/sim/types').ZoneDef} zone */
export function formatZoneMeta(zone) {
  const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const lines = [
    `  name: '${esc(zone.name)}',`,
    `  zMin: ${fmtNum(zone.zMin)},`,
    `  zMax: ${fmtNum(zone.zMax)},`,
    `  levelRange: [${zone.levelRange[0]}, ${zone.levelRange[1]}],`,
    `  biome: '${zone.biome}',`,
    `  hub: { x: ${fmtNum(zone.hub.x)}, z: ${fmtNum(zone.hub.z)}, radius: ${fmtNum(zone.hub.radius)}, name: '${esc(zone.hub.name)}' },`,
    `  graveyard: { x: ${fmtNum(zone.graveyard.x)}, z: ${fmtNum(zone.graveyard.z)} },`,
  ];
  if (zone.xMin != null && zone.xMax != null) {
    lines.push(`  xMin: ${fmtNum(zone.xMin)},`);
    lines.push(`  xMax: ${fmtNum(zone.xMax)},`);
  }
  if (zone.settlements?.length) {
    lines.push('  settlements: [');
    for (const s of zone.settlements) {
      lines.push(`    { x: ${fmtNum(s.x)}, z: ${fmtNum(s.z)}, radius: ${fmtNum(s.radius)}, name: '${esc(s.name)}' },`);
    }
    lines.push('  ],');
  }
  if (zone.welcome) lines.push(`  welcome: '${esc(zone.welcome)}',`);
  if (zone.welcomeQuestId) lines.push(`  welcomeQuestId: '${esc(zone.welcomeQuestId)}',`);
  return lines.join('\n');
}

/** @param {{ zoneOrder: string[]; zones: import('../src/sim/types').ZoneDef[] }} payload */
export function formatZonesRegistry(zoneOrder, zonesById) {
  const imports = [];
  const entries = [];
  for (const id of zoneOrder) {
    const zone = zonesById[id];
    if (!zone) continue;
    const target = ZONE_TARGETS[id];
    if (target) {
      const num = target.file.match(/zone(\d+)/)?.[1] ?? '1';
      imports.push(`  ZONE${num}_ZONE,`);
      entries.push(`  ZONE${num}_ZONE,`);
    }
  }
  return {
    imports: [...new Set(imports)].join('\n'),
    body: entries.join('\n'),
  };
}

function loadExport(exportPath) {
  const raw = fs.readFileSync(exportPath, 'utf8');
  const data = JSON.parse(raw);
  if (!data.zone || !data.props || !data.npcs || !data.camps) {
    throw new Error('Export JSON must include zone, props, npcs, and camps');
  }
  if (!Array.isArray(data.roads)) data.roads = [];
  if (!Array.isArray(data.lakes)) data.lakes = [];
  if (data.zoneDef) {
    data.zoneDef.lakes = data.lakes;
  }
  return data;
}

export function mergeZoneExport(exportPath, zoneFilePath) {
  const data = loadExport(exportPath);
  let target = ZONE_TARGETS[data.zone];
  let zonePath = zoneFilePath
    ? (path.isAbsolute(zoneFilePath) ? zoneFilePath : path.join(ROOT, zoneFilePath))
    : target ? path.join(ROOT, target.file) : null;
  if (!zonePath) throw new Error(`Unknown zone id: ${data.zone}`);
  if (!target) {
    const num = zonePath.match(/zone(\d+)\.ts/i)?.[1];
    if (!num) throw new Error(`Unknown zone id: ${data.zone}`);
    target = {
      file: path.relative(ROOT, zonePath).replace(/\\/g, '/'),
      propsMarker: `ZONE${num}_PROPS`,
      campsMarker: `ZONE${num}_CAMPS`,
      roadsMarker: `ZONE${num}_ROADS`,
      lakesMarker: `ZONE${num}_LAKES`,
      metaMarker: `ZONE${num}_META`,
    };
  }
  let content = fs.readFileSync(zonePath, 'utf8');
  const stallComments = extractStallComments(content, target.propsMarker);

  content = replaceMarkedBlock(content, target.campsMarker, formatZoneCamps(data.camps, target.campsMarker));
  content = replaceMarkedBlock(content, target.propsMarker, formatZoneProps(data.props, stallComments, target.propsMarker));
  if (content.includes(`// @zone-editor-begin ${target.roadsMarker}`)) {
    content = replaceMarkedBlock(content, target.roadsMarker, formatZoneRoads(data.roads, target.roadsMarker));
  }
  if (content.includes(`// @zone-editor-begin ${target.lakesMarker}`)) {
    content = replaceMarkedBlock(content, target.lakesMarker, formatInlineLakes(data.lakes));
  }
  if (data.zoneDef && content.includes(`// @zone-editor-begin ${target.metaMarker}`)) {
    content = replaceMarkedBlock(content, target.metaMarker, formatZoneMeta(data.zoneDef));
  }
  content = patchNpcPositions(content, data.npcs);

  fs.writeFileSync(zonePath, content, 'utf8');
  return { zonePath, zone: data.zone };
}

function main() {
  const arg = process.argv[2];
  const exportPath = path.resolve(ROOT, arg ?? 'editor/exports/eastbrook_vale.json');
  if (!fs.existsSync(exportPath)) {
    console.error(`Export file not found: ${exportPath}`);
    console.error('Save your in-game export to editor/exports/eastbrook_vale.json first.');
    process.exit(1);
  }
  const { zonePath, zone } = mergeZoneExport(exportPath);
  console.log(`Merged ${path.relative(ROOT, exportPath)} → ${path.relative(ROOT, zonePath)} (${zone})`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
