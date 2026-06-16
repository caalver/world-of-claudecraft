import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import {
  deleteMapDraft,
  listMapDrafts,
  loadMapDraft,
  saveMapDraft,
} from '../scripts/map_editor_draft.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DRAFTS_DIR = path.join(ROOT, 'editor', 'drafts');

describe('map_editor_draft', () => {
  const testId = `vitest_${Date.now().toString(36)}`;
  const draftPath = path.join(DRAFTS_DIR, `${testId}.json`);

  afterEach(() => {
    if (fs.existsSync(draftPath)) fs.unlinkSync(draftPath);
  });

  it('saves, lists, loads, and deletes drafts', () => {
    const draft = {
      id: testId,
      name: 'Test Draft',
      savedAt: new Date().toISOString(),
      zones: {
        eastbrook_vale: {
          zone: { id: 'eastbrook_vale', name: 'Eastbrook Vale', zMin: -180, zMax: 0, levelRange: [1, 7], biome: 'vale', hub: { x: 0, z: 0, radius: 20, name: 'Hub' }, graveyard: { x: 0, z: 0 }, lakes: [], pois: [], welcome: '' },
          props: { buildings: [], wells: [], stalls: [], mines: [], docks: [], tents: [], crates: [], campfires: [], mudHuts: [], ruinRings: [], fences: [], graveyards: [], placedAssets: [] },
          npcs: {},
          camps: [],
          roads: [],
        },
      },
      zoneOrder: ['eastbrook_vale'],
    };
    saveMapDraft(draft);
    expect(fs.existsSync(draftPath)).toBe(true);
    expect(listMapDrafts().some((d) => d.id === testId)).toBe(true);
    expect(loadMapDraft(testId).name).toBe('Test Draft');
    deleteMapDraft(testId);
    expect(fs.existsSync(draftPath)).toBe(false);
    expect(() => loadMapDraft(testId)).toThrow(/not found/i);
  });
});
