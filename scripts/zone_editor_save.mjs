// Dev-only: persist a zone-editor export to disk and merge into zone*.ts.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeZoneExport } from './merge_zone_export.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * @param {import('../src/dev/zone_editor').ZoneEditorExport} data
 * @param {{ root?: string; exportPath?: string; zonePath?: string }} [opts]
 */
export function saveZoneEditorExport(data, opts = {}) {
  if (!data?.zone || !data.props || !data.npcs || !data.camps) {
    throw new Error('Export must include zone, props, npcs, and camps');
  }
  const root = opts.root ?? ROOT;
  const exportPath = opts.exportPath ?? path.join(root, 'editor', 'exports', 'eastbrook_vale.json');
  const zonePath = opts.zonePath;
  fs.mkdirSync(path.dirname(exportPath), { recursive: true });
  fs.writeFileSync(exportPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  const result = mergeZoneExport(exportPath, zonePath ?? undefined);
  return { exportPath, ...result };
}
