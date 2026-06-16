import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { replaceMarkedBlock } from './merge_zone_export.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** @param {import('../src/sim/types').ZoneDef} zone */
export function createZoneFileContent(zone, zoneNum) {
  const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const xBounds = zone.xMin != null && zone.xMax != null
    ? `\n  xMin: ${zone.xMin},\n  xMax: ${zone.xMax},`
    : '';
  return `// Zone ${zoneNum} — ${zone.name} (editor-generated).
import type { CampDef, NpcDef, ZoneDef, ZonePropsDef } from '../types';

export const ZONE${zoneNum}_ZONE: ZoneDef = {
  id: '${esc(zone.id)}',
// @zone-editor-begin ZONE${zoneNum}_META
  name: '${esc(zone.name)}',
  zMin: ${zone.zMin},
  zMax: ${zone.zMax},${xBounds}
  levelRange: [${zone.levelRange[0]}, ${zone.levelRange[1]}],
  biome: '${zone.biome}',
  hub: { x: ${zone.hub.x}, z: ${zone.hub.z}, radius: ${zone.hub.radius}, name: '${esc(zone.hub.name)}' },
  graveyard: { x: ${zone.graveyard.x}, z: ${zone.graveyard.z} },
  welcome: '${esc(zone.welcome ?? '')}',
// @zone-editor-end ZONE${zoneNum}_META
// @zone-editor-begin ZONE${zoneNum}_LAKES
  lakes: [],
// @zone-editor-end ZONE${zoneNum}_LAKES
  pois: [],
};

// @zone-editor-begin ZONE${zoneNum}_CAMPS
export const ZONE${zoneNum}_CAMPS: CampDef[] = [];
// @zone-editor-end ZONE${zoneNum}_CAMPS

// @zone-editor-begin ZONE${zoneNum}_ROADS
export const ZONE${zoneNum}_ROADS: { x: number; z: number }[][] = [];
// @zone-editor-end ZONE${zoneNum}_ROADS

export const ZONE${zoneNum}_NPCS: Record<string, NpcDef> = {};

// @zone-editor-begin ZONE${zoneNum}_PROPS
export const ZONE${zoneNum}_PROPS: ZonePropsDef = {
  buildings: [],
  wells: [],
  stalls: [],
  mines: [],
  docks: [],
  tents: [],
  crates: [],
  campfires: [],
  mudHuts: [],
  ruinRings: [],
  fences: [],
  graveyards: [],
  placedAssets: [],
  authoredTrees: [],
  suppressedTrees: [],
};
// @zone-editor-end ZONE${zoneNum}_PROPS
`;
}

export function nextZoneFileNumber(contentDir = path.join(ROOT, 'src/sim/content')) {
  let max = 0;
  for (const f of fs.readdirSync(contentDir)) {
    const m = f.match(/^zone(\d+)\.ts$/);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max + 1;
}

/** @param {import('../src/sim/types').ZoneDef} zone */
export function ensureZoneFile(zone) {
  const contentDir = path.join(ROOT, 'src/sim/content');
  const num = nextZoneFileNumber(contentDir);
  const file = `src/sim/content/zone${num}.ts`;
  const zonePath = path.join(ROOT, file);
  if (fs.existsSync(zonePath)) throw new Error(`Zone file already exists: ${file}`);
  fs.writeFileSync(zonePath, createZoneFileContent(zone, num), 'utf8');
  return { file, zonePath, zoneNum: num, exportName: `${zone.id}.json` };
}

function scanZoneFiles(contentDir = path.join(ROOT, 'src/sim/content')) {
  /** @type {Map<string, { num: string; zoneConst: string }>} */
  const byId = new Map();
  for (const f of fs.readdirSync(contentDir)) {
    const m = f.match(/^zone(\d+)\.ts$/);
    if (!m) continue;
    const text = fs.readFileSync(path.join(contentDir, f), 'utf8');
    const idM = text.match(/id: '([^']+)'/);
    const constM = text.match(/export const (ZONE\d+_ZONE)/);
    if (idM && constM) byId.set(idM[1], { num: m[1], zoneConst: constM[1] });
  }
  return byId;
}

function zoneExportSymbols(num, zoneText) {
  const syms = [];
  for (const suffix of ['ZONE', 'CAMPS', 'NPCS', 'PROPS', 'ROADS', 'MOBS', 'ITEMS', 'OBJECTS', 'QUESTS', 'QUEST_ORDER']) {
    if (zoneText.includes(`export const ZONE${num}_${suffix}`)) syms.push(`ZONE${num}_${suffix}`);
  }
  return syms;
}

function ensureZoneImport(content, num, zoneText) {
  const importPath = `'./content/zone${num}'`;
  if (content.includes(`from ${importPath}`)) return content;
  const syms = zoneExportSymbols(num, zoneText);
  if (!syms.length) return content;
  const block = `import {\n${syms.map((s) => `  ${s},`).join('\n')}\n} from ${importPath};\n`;
  const anchor = "import { DUNGEON_DEFS, DUNGEON_MOBS } from './content/dungeons';";
  if (!content.includes(anchor)) throw new Error('data.ts anchor not found for zone import insert');
  return content.replace(anchor, `${block}${anchor}`);
}

/** @param {{ zoneOrder: string[]; zones: import('../src/sim/types').ZoneDef[] }} payload */
export function mergeZonesRegistry(payload) {
  const dataPath = path.join(ROOT, 'src/sim/data.ts');
  const contentDir = path.join(ROOT, 'src/sim/content');
  let content = fs.readFileSync(dataPath, 'utf8');
  const zoneById = scanZoneFiles(contentDir);

  const ordered = payload.zoneOrder.filter((id) => zoneById.has(id));
  const nums = [...new Set(ordered.map((id) => zoneById.get(id).num))].sort((a, b) => Number(a) - Number(b));

  for (const num of nums) {
    const zoneText = fs.readFileSync(path.join(contentDir, `zone${num}.ts`), 'utf8');
    content = ensureZoneImport(content, num, zoneText);
  }

  const registryBody = ordered.map((id) => `  ${zoneById.get(id).zoneConst},`).join('\n');
  content = replaceMarkedBlock(content, 'ZONES_REGISTRY', registryBody);

  const npcParts = nums.map((n) => `...ZONE${n}_NPCS`);
  content = content.replace(
    /export const NPCS: Record<string, NpcDef> = \{[\s\S]*?\};/,
    `export const NPCS: Record<string, NpcDef> = {\n  ${npcParts.join(', ')},\n};`,
  );

  const campParts = nums.map((n) => `...ZONE${n}_CAMPS`);
  content = content.replace(
    /export const CAMPS: CampDef\[\] = \[[\s\S]*?\];/,
    `export const CAMPS: CampDef[] = [${campParts.join(', ')}];`,
  );

  const roadParts = nums.map((n) => `...ZONE${n}_ROADS`);
  content = content.replace(
    /export const ROADS: \{ x: number; z: number \}\[\]\[\] = \[[\s\S]*?\];/,
    `export const ROADS: { x: number; z: number }[][] = [${roadParts.join(', ')}];`,
  );

  const propParts = nums.map((n) => `ZONE${n}_PROPS`);
  content = content.replace(
    /export const PROPS: ZonePropsDef = mergeProps\(\[[\s\S]*?\]\);/,
    `export const PROPS: ZonePropsDef = mergeProps([${propParts.join(', ')}]);`,
  );

  fs.writeFileSync(dataPath, content, 'utf8');
  return { dataPath, zones: ordered.length };
}
