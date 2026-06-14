import { describe, expect, it } from 'vitest';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { saveZoneEditorExport } from '../scripts/zone_editor_save.mjs';
import { buildZoneEditorExport } from '../src/dev/zone_editor';
import { ZONE1_CAMPS, ZONE1_NPCS, ZONE1_PROPS } from '../src/sim/content/zone1';

describe('zone_editor_save', () => {
  it('writes export JSON and merges into a temp zone file', () => {
    const tmp = path.join(process.cwd(), 'tests', 'fixtures', 'zone_save_tmp');
    mkdirSync(tmp, { recursive: true });
    const zonePath = path.join(tmp, 'zone1.ts');
    const exportPath = path.join(tmp, 'eastbrook_vale.json');
    const original = readFileSync(path.join(process.cwd(), 'src', 'sim', 'content', 'zone1.ts'), 'utf8');
    writeFileSync(zonePath, original, 'utf8');

    const data = buildZoneEditorExport(ZONE1_PROPS, ZONE1_NPCS, ZONE1_CAMPS);
    data.props.placedAssets = [{
      id: 'save_test_barrel',
      model: 'barrel',
      x: 3,
      z: 4,
      rot: 0,
      scale: 1,
    }];

    const result = saveZoneEditorExport(data, { root: tmp, exportPath, zonePath });
    expect(result.exportPath).toBe(exportPath);
    expect(readFileSync(exportPath, 'utf8')).toContain('save_test_barrel');
    const merged = readFileSync(zonePath, 'utf8');
    expect(merged).toContain("id: 'save_test_barrel'");
    expect(merged).toContain('placedAssets: [');

    rmSync(tmp, { recursive: true, force: true });
  });
});
