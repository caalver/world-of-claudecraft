// Dev-only: persist a zone-editor export to disk and merge into zone*.ts.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeZoneExport, ZONE_TARGETS } from './merge_zone_export.mjs';
import { ensureZoneFile } from './zone_registry.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * @param {Record<string, unknown>} data
 * @param {{ root?: string; exportPath?: string; zonePath?: string }} [opts]
 */
export function saveZoneEditorExport(data, opts = {}) {
  if (!data?.zone || !data.props || !data.npcs || !data.camps) {
    throw new Error('Export must include zone, props, npcs, and camps');
  }
  const root = opts.root ?? ROOT;
  const zoneId = data.zone;
  const exportData = {
    ...data,
    zoneDef: data.zoneDef ?? null,
    lakes: data.lakes ?? data.zoneDef?.lakes ?? [],
  };
  const exportPath = opts.exportPath ?? path.join(
    root,
    'editor',
    'exports',
    ZONE_TARGETS[zoneId]?.exportName ?? `${zoneId}.json`,
  );
  fs.mkdirSync(path.dirname(exportPath), { recursive: true });
  fs.writeFileSync(exportPath, `${JSON.stringify(exportData, null, 2)}\n`, 'utf8');

  let zonePath = opts.zonePath;
  if (!ZONE_TARGETS[zoneId] && !zonePath) {
    if (!exportData.zoneDef) throw new Error(`Custom zone "${zoneId}" requires zoneDef`);
    const created = ensureZoneFile(exportData.zoneDef);
    zonePath = created.zonePath;
  }

  const result = mergeZoneExport(exportPath, zonePath ?? undefined);
  return { exportPath, ...result };
}
