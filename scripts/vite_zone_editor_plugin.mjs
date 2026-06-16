// Vite dev-server middleware: zone editor save + map editor draft CRUD.
import { saveZoneEditorExport } from './zone_editor_save.mjs';
import {
  deleteMapDraft,
  listMapDrafts,
  loadMapDraft,
  saveMapDraft,
} from './map_editor_draft.mjs';

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function parseUrl(req) {
  const raw = req.url ?? '';
  const qIdx = raw.indexOf('?');
  const path = qIdx >= 0 ? raw.slice(0, qIdx) : raw;
  const search = qIdx >= 0 ? raw.slice(qIdx + 1) : '';
  const params = new URLSearchParams(search);
  return { path, params };
}

/** @returns {import('vite').Plugin} */
export function zoneEditorDevPlugin() {
  return {
    name: 'zone-editor-save',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const { path, params } = parseUrl(req);

        if (req.method === 'OPTIONS' && (path === '/__zone-editor/save' || path === '/__zone-editor/publish-zones' || path.startsWith('/__map-editor/draft/'))) {
          res.writeHead(204, {
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          });
          res.end();
          return;
        }

        if (path === '/__zone-editor/publish-zones') {
          if (req.method !== 'POST') {
            sendJson(res, 405, { ok: false, error: 'method not allowed' });
            return;
          }
          try {
            const body = await readJsonBody(req);
            const { mergeZonesRegistry } = await import('./zone_registry.mjs');
            const result = mergeZonesRegistry(body);
            sendJson(res, 200, { ok: true, ...result });
          } catch (e) {
            sendJson(res, 500, { ok: false, error: e instanceof Error ? e.message : String(e) });
          }
          return;
        }

        if (path === '/__zone-editor/save') {
          if (req.method !== 'POST') {
            sendJson(res, 405, { ok: false, error: 'method not allowed' });
            return;
          }
          try {
            const body = await readJsonBody(req);
            const result = saveZoneEditorExport(body);
            sendJson(res, 200, { ok: true, ...result });
          } catch (e) {
            sendJson(res, 500, { ok: false, error: e instanceof Error ? e.message : String(e) });
          }
          return;
        }

        if (path === '/__map-editor/draft/save') {
          if (req.method !== 'POST') {
            sendJson(res, 405, { ok: false, error: 'method not allowed' });
            return;
          }
          try {
            const body = await readJsonBody(req);
            const result = saveMapDraft(body);
            sendJson(res, 200, { ok: true, ...result });
          } catch (e) {
            sendJson(res, 500, { ok: false, error: e instanceof Error ? e.message : String(e) });
          }
          return;
        }

        if (path === '/__map-editor/draft/list') {
          if (req.method !== 'GET') {
            sendJson(res, 405, { ok: false, error: 'method not allowed' });
            return;
          }
          try {
            sendJson(res, 200, { ok: true, drafts: listMapDrafts() });
          } catch (e) {
            sendJson(res, 500, { ok: false, error: e instanceof Error ? e.message : String(e) });
          }
          return;
        }

        if (path === '/__map-editor/draft/load') {
          if (req.method !== 'GET') {
            sendJson(res, 405, { ok: false, error: 'method not allowed' });
            return;
          }
          try {
            const id = params.get('id');
            if (!id) throw new Error('Missing id');
            sendJson(res, 200, { ok: true, draft: loadMapDraft(id) });
          } catch (e) {
            sendJson(res, 500, { ok: false, error: e instanceof Error ? e.message : String(e) });
          }
          return;
        }

        if (path === '/__map-editor/draft/delete') {
          if (req.method !== 'POST') {
            sendJson(res, 405, { ok: false, error: 'method not allowed' });
            return;
          }
          try {
            const id = params.get('id');
            if (!id) throw new Error('Missing id');
            const result = deleteMapDraft(id);
            sendJson(res, 200, { ok: true, ...result });
          } catch (e) {
            sendJson(res, 500, { ok: false, error: e instanceof Error ? e.message : String(e) });
          }
          return;
        }

        next();
      });
    },
  };
}
