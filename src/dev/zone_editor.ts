// Dev-only zone content editor (Phase 1). Toggle with F8 in `npm run dev`.
// Edits a working copy of the active zone's props / NPCs / camps; live meshes
// + wireframes show placement. Save merges into zone*.ts via the Vite dev endpoint.
import * as THREE from 'three';
import type { Renderer } from '../render/renderer';
import { buildProps } from '../render/props';
import type { IWorld } from '../world_api';
import type { Sim } from '../sim/sim';
import type { BuildingDef, CampDef, NpcDef, PlacedAssetDef, ZonePropsDef } from '../sim/types';
import {
  cloneZoneEditorProps,
  resolveEditorZoneId,
  ZONE_EDITOR_IDS,
  ZONE_EDITOR_SOURCES,
  type EditorZoneId,
} from './zone_editor_zones';
import {
  PROP_LIBRARY,
  defaultPlacedColliders,
  getPropLibraryEntry,
  house2DoorOverhangColliders,
  placedAssetFootprintRadius,
  refreshPlacedColliders,
} from '../sim/prop_library';
import { terrainHeight } from '../sim/world';

const WORLD_SEED = 20061;

function fenceMidpoint(f: { x1: number; z1: number; x2: number; z2: number }): { x: number; z: number } {
  return { x: (f.x1 + f.x2) / 2, z: (f.z1 + f.z2) / 2 };
}

function pointSegDist(px: number, pz: number, x1: number, z1: number, x2: number, z2: number): number {
  const abx = x2 - x1, abz = z2 - z1;
  const apx = px - x1, apz = pz - z1;
  const len2 = abx * abx + abz * abz;
  const t = len2 > 1e-6 ? Math.max(0, Math.min(1, (apx * abx + apz * abz) / len2)) : 0;
  return Math.hypot(apx - abx * t, apz - abz * t);
}

type SelKind = 'building' | 'well' | 'stall' | 'mine' | 'dock' | 'tent' | 'crate' | 'campfire' | 'mudHut' | 'graveyard' | 'fence' | 'npc' | 'camp' | 'placedAsset';

interface Selection {
  kind: SelKind;
  index: number;
  npcId?: string;
}

export interface ZoneEditorExport {
  zone: EditorZoneId;
  props: ZonePropsDef;
  npcs: Record<string, Pick<NpcDef, 'pos' | 'facing'>>;
  camps: CampDef[];
}

export function buildZoneEditorExport(
  zone: EditorZoneId,
  props: ZonePropsDef,
  npcs: Record<string, NpcDef>,
  camps: CampDef[],
): ZoneEditorExport {
  const npcOut: ZoneEditorExport['npcs'] = {};
  for (const [id, n] of Object.entries(npcs)) {
    npcOut[id] = { pos: { x: n.pos.x, z: n.pos.z }, facing: n.facing };
  }
  return {
    zone,
    props: structuredClone(props),
    npcs: npcOut,
    camps: structuredClone(camps),
  };
}

export class ZoneEditor {
  active = false;
  private zoneId: EditorZoneId = 'eastbrook_vale';
  private panel: HTMLDivElement;
  private group = new THREE.Group();
  private meshGroup = new THREE.Group();
  private props: ZonePropsDef;
  private npcs: Record<string, NpcDef>;
  private camps: CampDef[];
  private sel: Selection | null = null;
  private dragging = false;
  private dragOffset = { x: 0, z: 0 };
  private canvas: HTMLCanvasElement | null = null;
  private raycaster = new THREE.Raycaster();
  private ndc = new THREE.Vector2();
  private hit = new THREE.Vector3();
  private keys = new Set<string>();
  private pickables: { sel: Selection; x: number; z: number; r: number }[] = [];
  private placeMode = false;
  private libraryModel = PROP_LIBRARY[0]?.id ?? 'barrel';
  private placedIdSeq = 0;
  private wireDirty = true;
  private meshDirty = true;
  private saving = false;

  constructor(
    private renderer: Renderer,
    private world: IWorld,
    private offlineSim: Sim | null,
  ) {
    this.props = cloneZoneEditorProps(ZONE_EDITOR_SOURCES.eastbrook_vale.props);
    this.npcs = structuredClone(ZONE_EDITOR_SOURCES.eastbrook_vale.npcs);
    this.camps = structuredClone(ZONE_EDITOR_SOURCES.eastbrook_vale.camps);
    this.group.name = 'zone-editor';
    this.renderer.scene.add(this.group);
    this.meshGroup.name = 'zone-editor-meshes';
    this.renderer.scene.add(this.meshGroup);

    this.panel = document.createElement('div');
    this.panel.id = 'zone-editor-panel';
    this.panel.innerHTML = `
      <div class="ze-title">Zone Editor <span class="ze-badge">DEV</span></div>
      <div class="ze-status">Press <kbd>F8</kbd> to toggle</div>
      <div class="ze-zone">
        <label>Zone
          <select class="ze-zone-select"></select>
        </label>
      </div>
      <div class="ze-library">
        <label>Asset
          <select class="ze-asset-select"></select>
        </label>
      </div>
      <div class="ze-mode">Place: <kbd>P</kbd> + click · Scale: <kbd>[</kbd>/<kbd>]</kbd> · Delete: <kbd>Del</kbd></div>
      <div class="ze-sel">Nothing selected</div>
      <div class="ze-help">
        Click: select · Drag: move · <kbd>Tab</kbd>: cycle<br>
        <kbd>Q</kbd>/<kbd>E</kbd>: rotate/facing · <kbd>[</kbd>/<kbd>]</kbd>: width/scale · <kbd>-</kbd>/<kbd>=</kbd>: depth<br>
        <kbd>C</kbd>: copy JSON · <kbd>D</kbd>: download JSON · <kbd>Ctrl+S</kbd>: save
      </div>
      <button type="button" class="ze-save">Save to zone file</button>
      <button type="button" class="ze-export">Copy JSON (C)</button>
      <button type="button" class="ze-download">Download JSON (D)</button>
      <div class="ze-merge">Save writes <code>editor/exports/&lt;zone&gt;.json</code> and runs merge. Reload (F5) + restart server for collision.</div>
    `;
    Object.assign(this.panel.style, {
      position: 'fixed', left: '12px', bottom: '12px', zIndex: '9999',
      background: 'rgba(8,12,20,0.92)', color: '#e8ecf4', font: '12px/1.45 Consolas, monospace',
      padding: '10px 12px', borderRadius: '8px', border: '1px solid #3a5068',
      maxWidth: '320px', display: 'none', pointerEvents: 'auto', boxShadow: '0 4px 20px rgba(0,0,0,0.45)',
    });
    const title = this.panel.querySelector('.ze-title') as HTMLDivElement;
    Object.assign(title.style, { fontWeight: '700', marginBottom: '6px', fontSize: '13px' });
    const badge = this.panel.querySelector('.ze-badge') as HTMLSpanElement;
    Object.assign(badge.style, {
      background: '#2d6a4f', color: '#fff', fontSize: '10px', padding: '1px 5px',
      borderRadius: '4px', marginLeft: '6px',
    });
    const saveBtn = this.panel.querySelector('.ze-save') as HTMLButtonElement;
    Object.assign(saveBtn.style, {
      marginTop: '8px', padding: '6px 12px', cursor: 'pointer', display: 'block', width: '100%',
      background: '#5c2e8a', color: '#fff', border: '1px solid #9b59b6', borderRadius: '4px',
      fontWeight: '700',
    });
    saveBtn.addEventListener('click', () => void this.saveChanges());
    const btn = this.panel.querySelector('.ze-export') as HTMLButtonElement;
    Object.assign(btn.style, {
      marginTop: '6px', padding: '6px 10px', cursor: 'pointer',
      background: '#1b4332', color: '#fff', border: '1px solid #40916c', borderRadius: '4px',
    });
    btn.addEventListener('click', () => void this.copyJson());
    const dl = this.panel.querySelector('.ze-download') as HTMLButtonElement;
    Object.assign(dl.style, {
      marginTop: '6px', marginLeft: '6px', padding: '6px 10px', cursor: 'pointer',
      background: '#1d3557', color: '#fff', border: '1px solid #457b9d', borderRadius: '4px',
    });
    dl.addEventListener('click', () => this.downloadJson());
    const merge = this.panel.querySelector('.ze-merge') as HTMLDivElement;
    Object.assign(merge.style, { marginTop: '8px', fontSize: '11px', color: '#9ab', lineHeight: '1.4' });
    const lib = this.panel.querySelector('.ze-library') as HTMLDivElement;
    Object.assign(lib.style, { marginTop: '6px', marginBottom: '4px' });
    const zoneRow = this.panel.querySelector('.ze-zone') as HTMLDivElement;
    Object.assign(zoneRow.style, { marginTop: '6px', marginBottom: '4px' });
    const zoneSelect = this.panel.querySelector('.ze-zone-select') as HTMLSelectElement;
    Object.assign(zoneSelect.style, { marginLeft: '6px', maxWidth: '200px' });
    for (const id of ZONE_EDITOR_IDS) {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = ZONE_EDITOR_SOURCES[id].name;
      zoneSelect.appendChild(opt);
    }
    zoneSelect.addEventListener('change', () => {
      const next = zoneSelect.value as EditorZoneId;
      if (next === this.zoneId) return;
      this.loadZone(next);
      if (this.active) this.syncZonePropsVisibility();
    });
    const mode = this.panel.querySelector('.ze-mode') as HTMLDivElement;
    Object.assign(mode.style, { fontSize: '11px', color: '#8ac', marginBottom: '6px' });
    const select = this.panel.querySelector('.ze-asset-select') as HTMLSelectElement;
    Object.assign(select.style, { marginLeft: '6px', maxWidth: '180px' });
    for (const entry of PROP_LIBRARY) {
      const opt = document.createElement('option');
      opt.value = entry.id;
      opt.textContent = entry.label;
      select.appendChild(opt);
    }
    select.addEventListener('change', () => { this.libraryModel = select.value; });
    document.body.appendChild(this.panel);

    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
  }

  attachCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    window.addEventListener('pointermove', (e) => this.onPointerMove(e));
    window.addEventListener('pointerup', () => {
      if (this.dragging) this.meshDirty = true;
      this.dragging = false;
    });
  }

  update(_dt: number): void {
    if (!this.active) return;
    const nudged = this.applyKeyNudges();
    if (nudged || this.dragging) this.markDirty(!this.dragging);
    this.syncNpcEntities();
    if (this.meshDirty) {
      this.rebuildMeshPreviews();
      this.meshDirty = false;
    }
    if (this.wireDirty) {
      this.rebuildWireframes();
      this.wireDirty = false;
    }
    this.refreshPanel();
  }

  private loadZone(zoneId: EditorZoneId, resetSelection = true): void {
    const src = ZONE_EDITOR_SOURCES[zoneId];
    this.zoneId = zoneId;
    this.props = cloneZoneEditorProps(src.props);
    this.npcs = structuredClone(src.npcs);
    this.camps = structuredClone(src.camps);
    this.placedIdSeq = 0;
    if (resetSelection) this.sel = null;
    const zoneSelect = this.panel.querySelector('.ze-zone-select') as HTMLSelectElement;
    if (zoneSelect.value !== zoneId) zoneSelect.value = zoneId;
    this.markDirty();
  }

  private syncZonePropsVisibility(): void {
    this.renderer.setWorldPropsVisible(true);
    for (const id of ZONE_EDITOR_IDS) {
      this.renderer.setZonePropsVisible(id, !this.active || id !== this.zoneId);
    }
  }

  private markDirty(mesh = true): void {
    this.wireDirty = true;
    if (mesh) this.meshDirty = true;
  }

  private setActive(on: boolean): void {
    this.active = on;
    this.group.visible = on;
    this.meshGroup.visible = on;
    this.panel.style.display = on ? 'block' : 'none';
    if (on) {
      const { x, z } = this.world.player.pos;
      this.loadZone(resolveEditorZoneId(x, z));
    }
    this.syncZonePropsVisibility();
    if (!on) {
      this.dragging = false;
      this.sel = null;
      this.clearMeshPreviews();
    } else {
      this.markDirty();
    }
    this.wireDirty = true;
    if (on) this.meshDirty = true;
    if (!on) {
      this.rebuildWireframes();
      this.wireDirty = false;
    }
    this.refreshPanel();
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.code === 'F8') {
      e.preventDefault();
      this.setActive(!this.active);
      return;
    }
    if (!this.active) return;
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

    this.keys.add(e.code);
    if (e.code === 'KeyC') { e.preventDefault(); void this.copyJson(); }
    if (e.code === 'KeyD') { e.preventDefault(); this.downloadJson(); }
    if (e.code === 'KeyS' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void this.saveChanges(); }
    if (e.code === 'KeyP') { e.preventDefault(); this.placeMode = !this.placeMode; this.refreshPanel(); }
    if (e.code === 'Delete' || e.code === 'Backspace') { e.preventDefault(); this.deleteSelection(); }
    if (e.code === 'Tab') { e.preventDefault(); this.cycleSelection(e.shiftKey ? -1 : 1); }
  }

  private applyKeyNudges(): boolean {
    if (!this.sel) return false;
    const rotStep = 0.06;
    const sizeStep = 0.5;
    let changed = false;
    if (this.keys.has('KeyQ')) { this.nudgeRotation(-rotStep); changed = true; }
    if (this.keys.has('KeyE')) { this.nudgeRotation(rotStep); changed = true; }
    if (this.sel.kind === 'building') {
      if (this.keys.has('BracketLeft')) { this.nudgeBuildingSize(-sizeStep, 0); changed = true; }
      if (this.keys.has('BracketRight')) { this.nudgeBuildingSize(sizeStep, 0); changed = true; }
      if (this.keys.has('Minus')) { this.nudgeBuildingSize(0, -sizeStep); changed = true; }
      if (this.keys.has('Equal')) { this.nudgeBuildingSize(0, sizeStep); changed = true; }
    } else if (this.sel.kind === 'placedAsset') {
      if (this.keys.has('BracketLeft')) { this.nudgePlacedScale(-0.1); changed = true; }
      if (this.keys.has('BracketRight')) { this.nudgePlacedScale(0.1); changed = true; }
    }
    return changed;
  }

  private nudgeRotation(delta: number): void {
    if (!this.sel) return;
    if (this.sel.kind === 'building') {
      const b = this.props.buildings[this.sel.index];
      if (b) b.rot += delta;
    } else if (this.sel.kind === 'npc' && this.sel.npcId) {
      const n = this.npcs[this.sel.npcId];
      if (n) n.facing += delta;
    } else if (this.sel.kind === 'stall') {
      const s = this.props.stalls[this.sel.index];
      if (s) s.rot += delta;
    } else if (this.sel.kind === 'mine') {
      const m = this.props.mines[this.sel.index];
      if (m) m.rot += delta;
    } else if (this.sel.kind === 'dock') {
      const d = this.props.docks[this.sel.index];
      if (d) d.rot += delta;
    } else if (this.sel.kind === 'placedAsset') {
      const a = this.props.placedAssets[this.sel.index];
      if (a) a.rot += delta;
    }
  }

  private nudgePlacedScale(delta: number): void {
    if (!this.sel || this.sel.kind !== 'placedAsset') return;
    const a = this.props.placedAssets[this.sel.index];
    if (!a) return;
    a.scale = Math.max(0.2, Math.round((a.scale + delta) * 100) / 100);
    refreshPlacedColliders(a);
    this.markDirty();
  }

  private deleteSelection(): void {
    if (!this.sel) return;
    const s = this.sel;
    switch (s.kind) {
      case 'building':
        this.props.buildings.splice(s.index, 1);
        break;
      case 'well':
        this.props.wells.splice(s.index, 1);
        break;
      case 'stall':
        this.props.stalls.splice(s.index, 1);
        break;
      case 'mine':
        this.props.mines.splice(s.index, 1);
        break;
      case 'dock':
        this.props.docks.splice(s.index, 1);
        break;
      case 'tent':
        this.props.tents.splice(s.index, 1);
        break;
      case 'crate':
        this.props.crates.splice(s.index, 1);
        break;
      case 'campfire':
        this.props.campfires.splice(s.index, 1);
        break;
      case 'mudHut':
        this.props.mudHuts.splice(s.index, 1);
        break;
      case 'graveyard':
        this.props.graveyards.splice(s.index, 1);
        break;
      case 'fence':
        this.props.fences.splice(s.index, 1);
        break;
      case 'placedAsset':
        this.props.placedAssets.splice(s.index, 1);
        break;
      case 'camp':
        this.camps.splice(s.index, 1);
        break;
      case 'npc':
        if (s.npcId) delete this.npcs[s.npcId];
        break;
      default:
        return;
    }
    this.sel = null;
    this.markDirty();
  }

  private nudgeBuildingSize(dw: number, dd: number): void {
    if (!this.sel || this.sel.kind !== 'building') return;
    const b = this.props.buildings[this.sel.index];
    if (!b) return;
    b.w = Math.max(2, b.w + dw);
    b.d = Math.max(2, b.d + dd);
    if (b.prop === 'house2') b.colliders = house2DoorOverhangColliders(b.w, b.d);
    this.markDirty();
  }

  private cycleSelection(dir: number): void {
    this.rebuildPickables();
    if (!this.pickables.length) return;
    let idx = 0;
    if (this.sel) {
      const id = this.selKey(this.sel);
      const cur = this.pickables.findIndex((p) => this.selKey(p.sel) === id);
      if (cur >= 0) idx = (cur + dir + this.pickables.length) % this.pickables.length;
    }
    this.sel = this.pickables[idx].sel;
  }

  private selKey(s: Selection): string {
    return `${s.kind}:${s.index}:${s.npcId ?? ''}`;
  }

  private onPointerDown(e: PointerEvent): void {
    if (!this.active || !this.canvas || e.button !== 0) return;
    const ground = this.groundAtClient(e.clientX, e.clientY);
    if (!ground) return;
    if (this.placeMode) {
      this.placeAsset(ground.x, ground.z);
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    const hit = this.pickNearest(ground.x, ground.z);
    if (hit) {
      this.sel = hit.sel;
      this.dragging = true;
      const anchor = this.anchorFor(hit.sel);
      this.dragOffset.x = anchor.x - ground.x;
      this.dragOffset.z = anchor.z - ground.z;
      e.preventDefault();
      e.stopPropagation();
    }
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.active || !this.dragging || !this.sel) return;
    const ground = this.groundAtClient(e.clientX, e.clientY);
    if (!ground) return;
    this.moveSelection(ground.x + this.dragOffset.x, ground.z + this.dragOffset.z);
  }

  private groundAtClient(clientX: number, clientY: number): { x: number; z: number } | null {
    if (!this.canvas) return null;
    const rect = this.canvas.getBoundingClientRect();
    this.ndc.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.ndc, this.renderer.camera);
    const y = this.world.player.pos.y;
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -y);
    return this.raycaster.ray.intersectPlane(plane, this.hit)
      ? { x: this.hit.x, z: this.hit.z }
      : null;
  }

  private moveSelection(x: number, z: number): void {
    if (!this.sel) return;
    const s = this.sel;
    if (s.kind === 'building') {
      const b = this.props.buildings[s.index];
      if (b) { b.x = x; b.z = z; }
    } else if (s.kind === 'well') {
      const w = this.props.wells[s.index];
      if (w) { w.x = x; w.z = z; }
    } else if (s.kind === 'stall') {
      const st = this.props.stalls[s.index];
      if (st) { st.x = x; st.z = z; }
    } else if (s.kind === 'mine') {
      const m = this.props.mines[s.index];
      if (m) { m.x = x; m.z = z; }
    } else if (s.kind === 'dock') {
      const d = this.props.docks[s.index];
      if (d) { d.x = x; d.z = z; }
    } else if (s.kind === 'tent') {
      const t = this.props.tents[s.index];
      if (t) { t.x = x; t.z = z; }
    } else if (s.kind === 'crate') {
      this.props.crates[s.index] = [x, z];
    } else if (s.kind === 'campfire') {
      this.props.campfires[s.index] = [x, z];
    } else if (s.kind === 'mudHut') {
      this.props.mudHuts[s.index] = [x, z];
    } else if (s.kind === 'graveyard') {
      const g = this.props.graveyards[s.index];
      if (g) { g.x = x; g.z = z; }
    } else if (s.kind === 'fence') {
      const f = this.props.fences[s.index];
      if (f) {
        const mid = fenceMidpoint(f);
        const dx = x - mid.x, dz = z - mid.z;
        f.x1 += dx; f.z1 += dz; f.x2 += dx; f.z2 += dz;
      }
    } else if (s.kind === 'npc' && s.npcId) {
      const n = this.npcs[s.npcId];
      if (n) { n.pos.x = x; n.pos.z = z; }
    } else if (s.kind === 'camp') {
      const c = this.camps[s.index];
      if (c) { c.center.x = x; c.center.z = z; }
    } else if (s.kind === 'placedAsset') {
      const a = this.props.placedAssets[s.index];
      if (a) { a.x = x; a.z = z; }
    }
    this.markDirty(false);
  }

  private placeAsset(x: number, z: number): void {
    const entry = getPropLibraryEntry(this.libraryModel);
    if (!entry) return;
    const asset: PlacedAssetDef = {
      id: `placed_${++this.placedIdSeq}`,
      model: this.libraryModel,
      x, z,
      rot: 0,
      scale: 1,
    };
    const colliders = defaultPlacedColliders(asset.model, asset.scale);
    if (colliders) asset.colliders = colliders;
    this.props.placedAssets.push(asset);
    this.sel = { kind: 'placedAsset', index: this.props.placedAssets.length - 1 };
    this.markDirty();
  }

  private anchorFor(sel: Selection): { x: number; z: number } {
    if (sel.kind === 'building') {
      const b = this.props.buildings[sel.index];
      return { x: b?.x ?? 0, z: b?.z ?? 0 };
    }
    if (sel.kind === 'npc' && sel.npcId) {
      const n = this.npcs[sel.npcId];
      return { x: n?.pos.x ?? 0, z: n?.pos.z ?? 0 };
    }
    if (sel.kind === 'camp') {
      const c = this.camps[sel.index];
      return { x: c?.center.x ?? 0, z: c?.center.z ?? 0 };
    }
    if (sel.kind === 'placedAsset') {
      const a = this.props.placedAssets[sel.index];
      return { x: a?.x ?? 0, z: a?.z ?? 0 };
    }
    if (sel.kind === 'fence') {
      const f = this.props.fences[sel.index];
      return f ? fenceMidpoint(f) : { x: 0, z: 0 };
    }
    const p = this.pickables.find((pk) => this.selKey(pk.sel) === this.selKey(sel));
    return { x: p?.x ?? 0, z: p?.z ?? 0 };
  }

  private pickNearest(x: number, z: number): { sel: Selection; x: number; z: number; r: number } | null {
    this.rebuildPickables();
    let best: typeof this.pickables[0] | null = null;
    let bestScore = Infinity;
    for (const p of this.pickables) {
      let score: number;
      if (p.sel.kind === 'fence') {
        const f = this.props.fences[p.sel.index];
        if (!f) continue;
        const d = pointSegDist(x, z, f.x1, f.z1, f.x2, f.z2);
        score = d / 2.5;
      } else {
        const d = Math.hypot(p.x - x, p.z - z);
        score = d / Math.max(0.5, p.r);
      }
      if (score < 1.2 && score < bestScore) {
        bestScore = score;
        best = p;
      }
    }
    return best;
  }

  private rebuildPickables(): void {
    const out: typeof this.pickables = [];
    this.props.buildings.forEach((b, i) => {
      out.push({ sel: { kind: 'building', index: i }, x: b.x, z: b.z, r: Math.max(b.w, b.d) * 0.5 });
    });
    this.props.wells.forEach((w, i) => {
      out.push({ sel: { kind: 'well', index: i }, x: w.x, z: w.z, r: w.r });
    });
    this.props.stalls.forEach((s, i) => {
      out.push({ sel: { kind: 'stall', index: i }, x: s.x, z: s.z, r: s.r });
    });
    this.props.mines.forEach((m, i) => {
      out.push({ sel: { kind: 'mine', index: i }, x: m.x, z: m.z, r: 4 });
    });
    this.props.docks.forEach((d, i) => {
      out.push({ sel: { kind: 'dock', index: i }, x: d.x, z: d.z, r: 5 });
    });
    this.props.tents.forEach((t, i) => {
      out.push({ sel: { kind: 'tent', index: i }, x: t.x, z: t.z, r: 1.5 * t.scale });
    });
    this.props.crates.forEach((c, i) => {
      out.push({ sel: { kind: 'crate', index: i }, x: c[0], z: c[1], r: 0.65 });
    });
    this.props.campfires.forEach((c, i) => {
      out.push({ sel: { kind: 'campfire', index: i }, x: c[0], z: c[1], r: 0.85 });
    });
    this.props.mudHuts.forEach((h, i) => {
      out.push({ sel: { kind: 'mudHut', index: i }, x: h[0], z: h[1], r: 1.1 });
    });
    this.props.graveyards.forEach((g, i) => {
      out.push({ sel: { kind: 'graveyard', index: i }, x: g.x, z: g.z, r: 3 });
    });
    this.props.fences.forEach((f, i) => {
      const mid = fenceMidpoint(f);
      const len = Math.hypot(f.x2 - f.x1, f.z2 - f.z1);
      out.push({ sel: { kind: 'fence', index: i }, x: mid.x, z: mid.z, r: Math.max(2, len * 0.5) });
    });
    for (const [id, n] of Object.entries(this.npcs)) {
      out.push({ sel: { kind: 'npc', index: 0, npcId: id }, x: n.pos.x, z: n.pos.z, r: 1.2 });
    }
    this.camps.forEach((c, i) => {
      out.push({ sel: { kind: 'camp', index: i }, x: c.center.x, z: c.center.z, r: c.radius });
    });
    this.props.placedAssets.forEach((a, i) => {
      out.push({
        sel: { kind: 'placedAsset', index: i },
        x: a.x, z: a.z,
        r: placedAssetFootprintRadius(a),
      });
    });
    this.pickables = out;
  }

  private syncNpcEntities(): void {
    if (!this.offlineSim) return;
    for (const [id, def] of Object.entries(this.npcs)) {
      for (const e of this.offlineSim.entities.values()) {
        if (e.kind === 'npc' && e.templateId === id) {
          e.pos.x = def.pos.x;
          e.pos.z = def.pos.z;
          e.facing = def.facing;
          e.prevFacing = def.facing;
          break;
        }
      }
    }
  }

  private clearMeshPreviews(): void {
    while (this.meshGroup.children.length) {
      this.meshGroup.remove(this.meshGroup.children[0]);
    }
  }

  private rebuildMeshPreviews(): void {
    this.clearMeshPreviews();
    if (!this.active) return;
    const preview = buildProps(WORLD_SEED, this.props);
    this.meshGroup.add(preview.group);
  }

  private rebuildWireframes(): void {
    this.clearGroup();
    if (!this.active) return;

    for (let i = 0; i < this.props.buildings.length; i++) {
      const b = this.props.buildings[i];
      const sel = this.sel?.kind === 'building' && this.sel.index === i;
      this.addBuildingFootprint(b, sel ? 0x66ff99 : 0x44aaff);
      if (b.colliders?.length) {
        for (const block of b.colliders) {
          this.addObbWorld(
            b.x, b.z, b.rot,
            block.lx, block.lz, block.hw, block.hd,
            0xff8844, 0.15,
          );
        }
      } else {
        this.addObbWorld(b.x, b.z, b.rot, 0, 0, b.w / 2, b.d / 2, 0xff8844, 0.12);
      }
    }

    for (const w of this.props.wells) this.addCircle(w.x, w.z, w.r, 0x88ccff);
    for (const s of this.props.stalls) this.addCircle(s.x, s.z, s.r, 0xccaa66);
    for (const t of this.props.tents) this.addCircle(t.x, t.z, 1.5 * t.scale, 0xaa88cc);
    for (const [x, z] of this.props.crates) this.addCircle(x, z, 0.65, 0xaaaaaa);
    for (const [x, z] of this.props.campfires) this.addCircle(x, z, 0.85, 0xff6622);
    for (let i = 0; i < this.props.fences.length; i++) {
      const f = this.props.fences[i];
      const sel = this.sel?.kind === 'fence' && this.sel.index === i;
      this.addFenceSegment(f, sel ? 0x66ff99 : 0xcc8844);
    }
    for (const c of this.camps) this.addCircle(c.center.x, c.center.z, c.radius, 0xff4466);
    for (const [id, n] of Object.entries(this.npcs)) {
      const hi = this.sel?.kind === 'npc' && this.sel.npcId === id;
      this.addNpcMarker(n.pos.x, n.pos.z, n.facing, hi ? 0x66ff99 : 0xffee55);
    }

    for (let i = 0; i < this.props.placedAssets.length; i++) {
      const a = this.props.placedAssets[i];
      const entry = getPropLibraryEntry(a.model);
      const sel = this.sel?.kind === 'placedAsset' && this.sel.index === i;
      if (!entry) continue;
      if (entry.collision === 'circle') {
        this.addCircle(a.x, a.z, (entry.baseR ?? 1) * a.scale, sel ? 0x66ff99 : 0xbb66ff);
      } else {
        const blocks = a.colliders ?? defaultPlacedColliders(a.model, a.scale) ?? [];
        const w = (entry.baseW ?? 4) * a.scale;
        const d = (entry.baseD ?? 4) * a.scale;
        this.addBuildingFootprint(
          { kind: 'house', x: a.x, z: a.z, w, d, rot: a.rot },
          sel ? 0x66ff99 : 0xbb66ff,
        );
        for (const block of blocks) {
          this.addObbWorld(a.x, a.z, a.rot, block.lx, block.lz, block.hw, block.hd, 0xff66bb, 0.15);
        }
      }
    }
  }

  private clearGroup(): void {
    while (this.group.children.length) {
      const ch = this.group.children[0];
      this.group.remove(ch);
      if (ch instanceof THREE.Line || ch instanceof THREE.LineSegments) {
        ch.geometry.dispose();
        (ch.material as THREE.Material).dispose();
      }
    }
  }

  private groundY(x: number, z: number): number {
    return terrainHeight(x, z, WORLD_SEED) + 0.08;
  }

  private addFenceSegment(f: { x1: number; z1: number; x2: number; z2: number }, color: number): void {
    const y1 = this.groundY(f.x1, f.z1);
    const y2 = this.groundY(f.x2, f.z2);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([f.x1, y1, f.z1, f.x2, y2, f.z2], 3));
    const mat = new THREE.LineBasicMaterial({ color });
    this.group.add(new THREE.Line(geo, mat));
    this.addCircle(f.x1, f.z1, 0.55, color);
    this.addCircle(f.x2, f.z2, 0.55, color);
  }

  private addBuildingFootprint(b: BuildingDef, color: number): void {
    const y = this.groundY(b.x, b.z);
    const geo = new THREE.BoxGeometry(b.w, 0.2, b.d);
    const edges = new THREE.EdgesGeometry(geo);
    geo.dispose();
    const mat = new THREE.LineBasicMaterial({ color });
    const lines = new THREE.LineSegments(edges, mat);
    lines.position.set(b.x, y, b.z);
    lines.rotation.y = b.rot;
    this.group.add(lines);
  }

  private addObbWorld(
    bx: number, bz: number, rot: number,
    lx: number, lz: number, hw: number, hd: number,
    color: number, lift: number,
  ): void {
    const c = Math.cos(rot);
    const s = Math.sin(rot);
    const wx = bx + lx * c + lz * s;
    const wz = bz + -lx * s + lz * c;
    const y = this.groundY(wx, wz) + lift;
    const geo = new THREE.BoxGeometry(hw * 2, 0.12, hd * 2);
    const edges = new THREE.EdgesGeometry(geo);
    geo.dispose();
    const mat = new THREE.LineBasicMaterial({ color });
    const lines = new THREE.LineSegments(edges, mat);
    lines.position.set(wx, y, wz);
    lines.rotation.y = rot;
    this.group.add(lines);
  }

  private addCircle(x: number, z: number, r: number, color: number): void {
    const y = this.groundY(x, z);
    const seg = 48;
    const pts: number[] = [];
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      pts.push(x + Math.sin(a) * r, y, z + Math.cos(a) * r);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const mat = new THREE.LineBasicMaterial({ color });
    this.group.add(new THREE.Line(geo, mat));
  }

  private addNpcMarker(x: number, z: number, facing: number, color: number): void {
    this.addCircle(x, z, 0.9, color);
    const y = this.groundY(x, z);
    const fx = x + Math.sin(facing) * 1.6;
    const fz = z + Math.cos(facing) * 1.6;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([x, y, z, fx, y + 0.05, fz], 3));
    const mat = new THREE.LineBasicMaterial({ color });
    this.group.add(new THREE.Line(geo, mat));
  }

  private refreshPanel(): void {
    const status = this.panel.querySelector('.ze-status') as HTMLDivElement;
    const selEl = this.panel.querySelector('.ze-sel') as HTMLDivElement;
    const mode = this.panel.querySelector('.ze-mode') as HTMLDivElement;
    const saveBtn = this.panel.querySelector('.ze-save') as HTMLButtonElement;
    const src = ZONE_EDITOR_SOURCES[this.zoneId];
    saveBtn.textContent = `Save to ${src.file}`;
    status.textContent = this.active
      ? `Active — ${src.name} — F8 to hide`
      : 'Press F8 to toggle';
    mode.style.color = this.placeMode ? '#6f6' : '#8ac';
    mode.textContent = this.placeMode
      ? 'Place mode ON — click ground to add · P to exit'
      : 'Place: P + click · Scale: [ / ] · Delete: Del';
    if (!this.sel) {
      selEl.textContent = 'Nothing selected';
      return;
    }
    selEl.textContent = this.describeSelection();
  }

  private describeSelection(): string {
    if (!this.sel) return '';
    const s = this.sel;
    if (s.kind === 'building') {
      const b = this.props.buildings[s.index];
      return b ? `building[${s.index}] ${b.kind} @ (${b.x.toFixed(1)}, ${b.z.toFixed(1)}) w=${b.w} d=${b.d} rot=${b.rot.toFixed(2)}` : '';
    }
    if (s.kind === 'npc' && s.npcId) {
      const n = this.npcs[s.npcId];
      return n ? `npc ${s.npcId} @ (${n.pos.x.toFixed(1)}, ${n.pos.z.toFixed(1)}) face=${n.facing.toFixed(2)}` : '';
    }
    if (s.kind === 'camp') {
      const c = this.camps[s.index];
      return c ? `camp[${s.index}] ${c.mobId} @ (${c.center.x.toFixed(1)}, ${c.center.z.toFixed(1)}) r=${c.radius}` : '';
    }
    if (s.kind === 'fence') {
      const f = this.props.fences[s.index];
      return f
        ? `fence[${s.index}] (${f.x1.toFixed(1)}, ${f.z1.toFixed(1)}) → (${f.x2.toFixed(1)}, ${f.z2.toFixed(1)})`
        : '';
    }
    if (s.kind === 'placedAsset') {
      const a = this.props.placedAssets[s.index];
      const label = getPropLibraryEntry(a?.model ?? '')?.label ?? a?.model;
      return a ? `asset ${a.id} (${label}) @ (${a.x.toFixed(1)}, ${a.z.toFixed(1)}) scale=${a.scale} rot=${a.rot.toFixed(2)}` : '';
    }
    return `${s.kind}[${s.index}]`;
  }

  exportJson(): ZoneEditorExport {
    return buildZoneEditorExport(this.zoneId, this.props, this.npcs, this.camps);
  }

  private async copyJson(): Promise<void> {
    const json = JSON.stringify(this.exportJson(), null, 2);
    const exportFile = ZONE_EDITOR_SOURCES[this.zoneId].exportFile;
    try {
      await navigator.clipboard.writeText(json);
      const status = this.panel.querySelector('.ze-status') as HTMLDivElement;
      status.textContent = `JSON copied — save to editor/exports/${exportFile}`;
      window.setTimeout(() => this.refreshPanel(), 3000);
    } catch {
      console.log('Zone editor export:\n', json);
      alert('Could not copy — JSON logged to browser console.');
    }
  }

  private downloadJson(): void {
    const json = JSON.stringify(this.exportJson(), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = ZONE_EDITOR_SOURCES[this.zoneId].exportFile;
    a.click();
    URL.revokeObjectURL(a.href);
    const status = this.panel.querySelector('.ze-status') as HTMLDivElement;
    status.textContent = 'Downloaded — or use Save to merge directly';
    window.setTimeout(() => this.refreshPanel(), 3000);
  }

  private async saveChanges(): Promise<void> {
    if (this.saving) return;
    this.saving = true;
    const status = this.panel.querySelector('.ze-status') as HTMLDivElement;
    const saveBtn = this.panel.querySelector('.ze-save') as HTMLButtonElement;
    status.textContent = 'Saving…';
    saveBtn.disabled = true;
    try {
      const res = await fetch('/__zone-editor/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.exportJson()),
      });
      const data = await res.json() as { ok?: boolean; error?: string; zonePath?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? `Save failed (${res.status})`);
      status.textContent = `Saved to ${ZONE_EDITOR_SOURCES[this.zoneId].file} — reload page (F5); restart server for collision`;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      status.textContent = `Save failed: ${msg}`;
      console.error('Zone editor save failed:', e);
    } finally {
      this.saving = false;
      saveBtn.disabled = false;
      window.setTimeout(() => this.refreshPanel(), 6000);
    }
  }
}

export function createZoneEditor(
  renderer: Renderer,
  world: IWorld,
  offlineSim: Sim | null,
): ZoneEditor | null {
  if (!import.meta.env.DEV) return null;
  return new ZoneEditor(renderer, world, offlineSim);
}
