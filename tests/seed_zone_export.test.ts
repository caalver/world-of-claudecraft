import { describe, it } from 'vitest';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { buildZoneEditorExport } from '../src/dev/zone_editor';
import { ZONE1_CAMPS, ZONE1_NPCS, ZONE1_PROPS, ZONE1_ROADS, ZONE1_ZONE } from '../src/sim/content/zone1';

// Writes the current zone1 placement snapshot — run once to bootstrap
// editor/exports/eastbrook_vale.json:  npx vitest run tests/seed_zone_export.test.ts
describe('seed zone export fixture', () => {
  it('writes editor/exports/eastbrook_vale.json from live zone1 data', () => {
    const dir = path.join(process.cwd(), 'editor', 'exports');
    mkdirSync(dir, { recursive: true });
    const out = path.join(dir, 'eastbrook_vale.json');
    const json = JSON.stringify(buildZoneEditorExport('eastbrook_vale', ZONE1_ZONE, ZONE1_PROPS, ZONE1_NPCS, ZONE1_CAMPS, ZONE1_ROADS), null, 2);
    writeFileSync(out, `${json}\n`, 'utf8');
  });
});
