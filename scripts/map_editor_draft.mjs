// Draft map saves — stored under editor/drafts/ and never merged into live zone*.ts.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DRAFTS_DIR = path.join(ROOT, 'editor', 'drafts');

function safeId(id) {
  return String(id).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
}

export function listMapDrafts() {
  fs.mkdirSync(DRAFTS_DIR, { recursive: true });
  return fs.readdirSync(DRAFTS_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const full = path.join(DRAFTS_DIR, f);
      try {
        const data = JSON.parse(fs.readFileSync(full, 'utf8'));
        return {
          id: data.id ?? f.replace(/\.json$/, ''),
          name: data.name ?? f,
          savedAt: data.savedAt ?? null,
          file: f,
        };
      } catch {
        return { id: f.replace(/\.json$/, ''), name: f, savedAt: null, file: f };
      }
    })
    .sort((a, b) => String(b.savedAt ?? '').localeCompare(String(a.savedAt ?? '')));
}

export function loadMapDraft(id) {
  const sid = safeId(id);
  const full = path.join(DRAFTS_DIR, `${sid}.json`);
  if (!fs.existsSync(full)) throw new Error(`Draft not found: ${id}`);
  return JSON.parse(fs.readFileSync(full, 'utf8'));
}

export function saveMapDraft(data) {
  if (!data?.id || !data?.name || !data?.zones) {
    throw new Error('Draft must include id, name, and zones');
  }
  fs.mkdirSync(DRAFTS_DIR, { recursive: true });
  const sid = safeId(data.id);
  const out = { ...data, id: sid, savedAt: new Date().toISOString() };
  const full = path.join(DRAFTS_DIR, `${sid}.json`);
  fs.writeFileSync(full, `${JSON.stringify(out, null, 2)}\n`, 'utf8');
  return { path: full, draft: out };
}

export function deleteMapDraft(id) {
  const sid = safeId(id);
  const full = path.join(DRAFTS_DIR, `${sid}.json`);
  if (!fs.existsSync(full)) throw new Error(`Draft not found: ${id}`);
  fs.unlinkSync(full);
  return { path: full };
}
