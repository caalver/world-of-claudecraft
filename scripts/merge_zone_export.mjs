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

/** @type {Record<string, { file: string; exportName: string }>} */
export const ZONE_TARGETS = {
  eastbrook_vale: { file: 'src/sim/content/zone1.ts', exportName: 'eastbrook_vale.json' },
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
export function formatZone1Props(props, stallComments = []) {
  const lines = [
    'export const ZONE1_PROPS: ZonePropsDef = {',
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
    '};',
  ];
  return lines.join('\n');
}

/** @param {import('../src/sim/types').CampDef[]} camps */
export function formatZone1Camps(camps) {
  const lines = [
    'export const ZONE1_CAMPS: CampDef[] = [',
    ...camps.map((c) => `  { mobId: '${c.mobId}', center: { x: ${fmtNum(c.center.x)}, z: ${fmtNum(c.center.z)} }, radius: ${fmtNum(c.radius)}, count: ${c.count} },`),
    '];',
  ];
  return lines.join('\n');
}

export function extractStallComments(zoneContent) {
  const comments = [];
  const m = zoneContent.match(/export const ZONE1_PROPS[\s\S]*?stalls: \[([\s\S]*?)\],/);
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

function loadExport(exportPath) {
  const raw = fs.readFileSync(exportPath, 'utf8');
  const data = JSON.parse(raw);
  if (!data.zone || !data.props || !data.npcs || !data.camps) {
    throw new Error('Export JSON must include zone, props, npcs, and camps');
  }
  return data;
}

export function mergeZoneExport(exportPath, zoneFilePath) {
  const data = loadExport(exportPath);
  const target = ZONE_TARGETS[data.zone];
  if (!target) throw new Error(`Unknown zone id: ${data.zone}`);
  const zonePath = zoneFilePath
    ? (path.isAbsolute(zoneFilePath) ? zoneFilePath : path.join(ROOT, zoneFilePath))
    : path.join(ROOT, target.file);
  let content = fs.readFileSync(zonePath, 'utf8');
  const stallComments = extractStallComments(content);

  if (data.zone === 'eastbrook_vale') {
    content = replaceMarkedBlock(content, 'ZONE1_CAMPS', formatZone1Camps(data.camps));
    content = replaceMarkedBlock(content, 'ZONE1_PROPS', formatZone1Props(data.props, stallComments));
    content = patchNpcPositions(content, data.npcs);
  } else {
    throw new Error(`Merge not implemented for zone: ${data.zone}`);
  }

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
