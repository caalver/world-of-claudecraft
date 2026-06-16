// Dedicated map editor — standalone page with draft save + publish to live.
import * as THREE from 'three';
import type { Renderer } from '../render/renderer';
import type { Sim } from '../sim/sim';
import type { IWorld } from '../world_api';
import type { ZoneDef } from '../sim/types';
import { NPCS } from '../sim/data';
import { terrainHeight, terrainHeightUncarved } from '../sim/world';
import {
  ALL_ZONE_SOURCES,
  allEditorZoneIds,
  cloneZoneEditorProps,
  hasZoneFile,
  isPublishedZoneId,
} from './zone_editor_zones';
import { createMapEditorCore, type ZoneEditor } from './zone_editor';
import type { MapEditorDraft, MapEditorTool, MapEditorZoneBundle } from './map_editor_types';
import { setRuntimeTreeColliderOverlay } from '../sim/colliders';
import { setRuntimeLakeOverlay } from '../sim/lake_overlay';
import { setRuntimeZoneOverlay } from '../sim/editor_zone_overlay';
import { zoneBoundaryCorners, isProtrusionZone } from '../sim/zone_bounds';
import {
  applyZoneSettingsPatch,
  createAldermereZoneBundle,
  createStripZoneBundle,
  initialEditorZones,
  joinEditorZoneBands,
  migrateDraftZones,
  readZoneSettingsFromForm,
  writeZoneSettingsToForm,
  zoneListFromBundles,
} from './map_editor_zone_ui';

const WORLD_SEED = 20061;

export class MapEditor {
  private core: ZoneEditor;
  private bundles = new Map<string, MapEditorZoneBundle>();
  private zoneOrder: string[] = [];
  private tool: MapEditorTool = 'select';
  private roadDraft: { x: number; z: number }[] = [];
  private roadGroup = new THREE.Group();
  private lakeGroup = new THREE.Group();
  private zoneBoundaryGroup = new THREE.Group();
  private coreZoneSelect!: HTMLSelectElement;
  private statusEl: HTMLElement;
  private draftSelect: HTMLSelectElement;
  private npcSelect: HTMLSelectElement;
  private mobSelect: HTMLSelectElement;
  private treeKindSelect: HTMLSelectElement;
  private treeScaleInput: HTMLInputElement;
  private lakeRadiusInput: HTMLInputElement;
  private lakeRadius = 25;
  private lastSelectionKey = '';

  constructor(
    private renderer: Renderer,
    private world: IWorld,
    private sim: Sim,
    private root: HTMLElement,
  ) {
    const init = initialEditorZones();
    this.bundles = init.bundles;
    this.zoneOrder = init.zoneOrder;
    this.core = createMapEditorCore(renderer, world, sim);
    this.core.switchToBundle(this.bundles.get('eastbrook_vale')!);

    this.roadGroup.name = 'map-editor-roads';
    this.renderer.scene.add(this.roadGroup);
    this.lakeGroup.name = 'map-editor-lakes';
    this.renderer.scene.add(this.lakeGroup);
    this.zoneBoundaryGroup.name = 'map-editor-zone-bounds';
    this.renderer.scene.add(this.zoneBoundaryGroup);

    const sidebar = this.root.querySelector('#editor-sidebar') as HTMLElement;
    const panelHost = sidebar.querySelector('#ze-panel-host') as HTMLElement;
    this.core.mountPanel(panelHost);
    this.statusEl = sidebar.querySelector('#editor-status') as HTMLElement;
    this.draftSelect = sidebar.querySelector('#draft-select') as HTMLSelectElement;
    this.npcSelect = sidebar.querySelector('#npc-template-select') as HTMLSelectElement;
    this.mobSelect = sidebar.querySelector('#mob-template-select') as HTMLSelectElement;
    this.treeKindSelect = sidebar.querySelector('#tree-kind-select') as HTMLSelectElement;
    this.treeScaleInput = sidebar.querySelector('#tree-scale-input') as HTMLInputElement;

    this.coreZoneSelect = sidebar.querySelector('#core-zone-select') as HTMLSelectElement;

    this.populateNpcMobSelects();
    this.wireToolbar(sidebar);
    this.wireZoneControls(sidebar);
    this.wireTreeControls();
    this.wireLakeControls();
    this.refreshZoneSelect();
    writeZoneSettingsToForm(this.root, this.currentBundle().zone);
    void this.refreshDraftList();
    this.pushColliderOverlayFromBundles();
    this.pushLakeOverlayFromBundles();
    this.pushZoneOverlayFromBundles();
    this.core.setRoads(this.bundles.get('eastbrook_vale')!.roads);
    this.core.setLakes(this.bundles.get('eastbrook_vale')!.zone.lakes ?? []);
    this.rebuildRoadWireframes();
    this.rebuildLakeWireframes();
    this.rebuildZoneBoundaryWireframes();
    this.setStatus('Map editor ready — draft saves do not affect the live world.');
  }

  attachCanvas(canvas: HTMLCanvasElement): void {
    this.core.attachCanvas(canvas);
    canvas.addEventListener('pointerdown', (e) => this.onCanvasPointer(e), true);
  }

  update(dt: number): void {
    this.core.update(dt);
    if (this.core.consumeTreeFoliageDirty()) {
      this.renderer.rebuildFoliageTrees(this.core.readExportState().props.suppressedTrees ?? []);
      this.pushColliderOverlayFromBundles();
    }
    if (this.core.consumeRoadsDirty()) {
      this.flushCoreToBundle();
      this.rebuildRoadWireframes();
      this.setStatus('Road removed — Del on selected road · Publish to save.');
    }
    if (this.core.consumeLakesDirty()) {
      this.flushCoreToBundle();
      this.pushLakeOverlayFromBundles();
      this.rebuildLakeWireframes();
      this.setStatus('Lake changed — Del on selected lake · Publish to save.');
    }
    const selKey = this.selectionKey(this.core.selection);
    if (selKey !== this.lastSelectionKey) {
      this.lastSelectionKey = selKey;
      this.rebuildRoadWireframes();
      this.rebuildLakeWireframes();
    }
    this.syncTreeControlsFromSelection();
    this.syncLakeControlsFromSelection();
  }

  private wireZoneControls(sidebar: HTMLElement): void {
    sidebar.querySelector('#btn-apply-zone')?.addEventListener('click', () => this.applyZoneSettingsFromForm());
    sidebar.querySelector('#btn-new-zone')?.addEventListener('click', () => this.createStripZone());
    sidebar.querySelector('#btn-add-aldermere')?.addEventListener('click', () => this.createAldermereZone());
    sidebar.querySelector('#btn-join-zone')?.addEventListener('click', () => this.joinZoneBands());
    sidebar.querySelector('#btn-delete-zone')?.addEventListener('click', () => this.deleteCurrentZone());
    this.coreZoneSelect.addEventListener('change', (e) => {
      const id = (e.target as HTMLSelectElement).value;
      this.switchToZone(id);
    });
    for (const sel of ['#zone-z-min', '#zone-z-max', '#zone-x-min', '#zone-x-max', '#zone-name', '#zone-biome']) {
      this.root.querySelector(sel)?.addEventListener('change', () => this.applyZoneSettingsFromForm(false));
    }
  }

  private refreshZoneSelect(): void {
    this.coreZoneSelect.innerHTML = '';
    for (const id of this.zoneOrder) {
      const bundle = this.bundles.get(id);
      if (!bundle) continue;
      const opt = document.createElement('option');
      opt.value = id;
      const tag = isProtrusionZone(bundle.zone) ? ' [city]' : '';
      opt.textContent = `${bundle.zone.name}${tag} (${id})`;
      this.coreZoneSelect.appendChild(opt);
    }
    this.coreZoneSelect.value = this.core.currentZoneId;
    this.core.refreshZoneSelectFromOrder(this.zoneOrder, this.bundles);
    const zeSelect = this.root.querySelector('.ze-zone-select') as HTMLSelectElement | null;
    if (zeSelect) zeSelect.value = this.core.currentZoneId;
  }

  private switchToZone(id: string): void {
    this.flushCoreToBundle();
    const bundle = this.bundles.get(id);
    if (!bundle) return;
    this.applyBundleToCore(bundle);
    writeZoneSettingsToForm(this.root, bundle.zone);
    this.pushColliderOverlayFromBundles();
    this.pushLakeOverlayFromBundles();
    this.pushZoneOverlayFromBundles();
    this.rebuildRoadWireframes();
    this.rebuildLakeWireframes();
    this.rebuildZoneBoundaryWireframes();
    this.setStatus(`Editing zone: ${bundle.zone.name}`);
  }

  private applyZoneSettingsFromForm(rebuild = true): void {
    const id = this.core.currentZoneId;
    const bundle = this.bundles.get(id);
    if (!bundle) return;
    const patch = readZoneSettingsFromForm(this.root);
    const nextZone = applyZoneSettingsPatch(bundle.zone, patch);
    const nextId = nextZone.id;
    if (nextId !== id) {
      if (this.bundles.has(nextId)) {
        this.setStatus(`Zone id "${nextId}" already exists.`);
        writeZoneSettingsToForm(this.root, bundle.zone);
        return;
      }
      this.bundles.delete(id);
      this.bundles.set(nextId, bundle);
      this.zoneOrder = this.zoneOrder.map((zid) => (zid === id ? nextId : zid));
      bundle.zone = nextZone;
    } else {
      bundle.zone = nextZone;
    }
    this.refreshZoneSelect();
    this.pushZoneOverlayFromBundles();
    if (rebuild) this.rebuildZoneBoundaryWireframes();
    this.setStatus(`Zone bounds updated: ${nextZone.name} z ${nextZone.zMin}–${nextZone.zMax}${nextZone.xMin != null ? ` x ${nextZone.xMin}–${nextZone.xMax}` : ''}`);
  }

  private createStripZone(): void {
    this.flushCoreToBundle();
    const customCount = [...this.bundles.keys()].filter((id) => !isPublishedZoneId(id)).length;
    const bundle = createStripZoneBundle(this.bundles, customCount);
    this.bundles.set(bundle.zone.id, bundle);
    this.zoneOrder.push(bundle.zone.id);
    this.refreshZoneSelect();
    this.switchToZone(bundle.zone.id);
    this.setStatus(`Created strip zone "${bundle.zone.name}" — adjust zMin/zMax below.`);
  }

  private createAldermereZone(): void {
    if (this.bundles.has('aldermere')) {
      this.switchToZone('aldermere');
      this.setStatus('Aldermere zone already exists — switched to it.');
      return;
    }
    this.flushCoreToBundle();
    const bundle = createAldermereZoneBundle();
    this.bundles.set('aldermere', bundle);
    this.zoneOrder.push('aldermere');
    this.refreshZoneSelect();
    this.switchToZone('aldermere');
    this.setStatus('Created Aldermere city zone — eastern protrusion bounds preset. Publish when ready.');
  }

  private joinZoneBands(): void {
    this.flushCoreToBundle();
    joinEditorZoneBands(this.bundles, this.zoneOrder);
    this.pushZoneOverlayFromBundles();
    this.rebuildZoneBoundaryWireframes();
    writeZoneSettingsToForm(this.root, this.currentBundle().zone);
    this.setStatus('Joined strip zone bands: each zMin now meets the previous zMax (city zones unchanged).');
  }

  private deleteCurrentZone(): void {
    const id = this.core.currentZoneId;
    if (hasZoneFile(id)) {
      this.setStatus('Published zones cannot be deleted — edit their bounds instead.');
      return;
    }
    if (!confirm(`Delete custom zone "${id}"?`)) return;
    this.bundles.delete(id);
    this.zoneOrder = this.zoneOrder.filter((zid) => zid !== id);
    const fallback = this.zoneOrder[0] ?? allEditorZoneIds()[0];
    this.refreshZoneSelect();
    this.switchToZone(fallback);
    this.setStatus(`Deleted zone ${id}.`);
  }

  private pushZoneOverlayFromBundles(): void {
    setRuntimeZoneOverlay(zoneListFromBundles(this.bundles, this.zoneOrder));
  }

  private rebuildZoneBoundaryWireframes(): void {
    while (this.zoneBoundaryGroup.children.length) {
      this.zoneBoundaryGroup.remove(this.zoneBoundaryGroup.children[0]);
    }
    const currentId = this.core.currentZoneId;
    const palette = [0x66ccff, 0x88ff88, 0xffaa66, 0xcc88ff, 0xffff66];
    this.zoneOrder.forEach((id, idx) => {
      const zone = this.bundles.get(id)?.zone;
      if (!zone) return;
      const selected = id === currentId;
      const color = selected ? 0xff6644 : palette[idx % palette.length];
      const corners = zoneBoundaryCorners(zone);
      const pts: number[] = [];
      for (const c of corners) {
        const cy = terrainHeightUncarved(c.x, c.z, WORLD_SEED) + 0.55;
        pts.push(c.x, cy, c.z);
      }
      const c0y = terrainHeightUncarved(corners[0].x, corners[0].z, WORLD_SEED) + 0.55;
      pts.push(corners[0].x, c0y, corners[0].z);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      const mat = new THREE.LineBasicMaterial({ color, depthTest: false, transparent: true, opacity: selected ? 1 : 0.65 });
      const line = new THREE.Line(geo, mat);
      line.renderOrder = 5;
      this.zoneBoundaryGroup.add(line);
    });
  }

  private selectionKey(sel: ReturnType<ZoneEditor['selection']>): string {
    if (!sel) return '';
    return `${sel.kind}:${sel.index}:${sel.npcId ?? ''}`;
  }

  private wireTreeControls(): void {
    const applyToSelection = (): void => {
      const sel = this.core.selection;
      if (sel?.kind !== 'authoredTree') return;
      const kind = this.treeKindSelect.value as 'tree' | 'tree2';
      const scale = parseFloat(this.treeScaleInput.value);
      this.core.updateSelectedAuthoredTree({
        kind,
        scale: Number.isFinite(scale) ? scale : undefined,
      });
      this.flushCoreToBundle();
    };
    this.treeKindSelect.addEventListener('change', () => applyToSelection());
    this.treeScaleInput.addEventListener('change', () => applyToSelection());
  }

  private wireLakeControls(): void {
    this.lakeRadiusInput = this.root.querySelector('#lake-radius-input') as HTMLInputElement;
    const applyRadius = (): void => {
      const sel = this.core.selection;
      if (sel?.kind !== 'lake') return;
      const radius = parseFloat(this.lakeRadiusInput.value);
      if (!Number.isFinite(radius)) return;
      this.core.updateSelectedLake({ radius });
      this.flushCoreToBundle();
      this.pushLakeOverlayFromBundles();
      this.rebuildLakeWireframes();
    };
    this.lakeRadiusInput?.addEventListener('change', () => applyRadius());
  }

  private syncLakeControlsFromSelection(): void {
    const sel = this.core.selection;
    if (sel?.kind !== 'lake') return;
    const lakes = this.core.readExportState().lakes;
    const lake = lakes[sel.index];
    if (!lake) return;
    const rStr = lake.radius.toFixed(1);
    if (this.lakeRadiusInput?.value !== rStr) this.lakeRadiusInput.value = rStr;
    this.lakeRadius = lake.radius;
  }

  private readLakeRadius(): number {
    const radius = parseFloat(this.lakeRadiusInput?.value ?? String(this.lakeRadius));
    return Number.isFinite(radius) ? Math.max(3, Math.min(120, radius)) : this.lakeRadius;
  }

  private syncTreeControlsFromSelection(): void {
    const sel = this.core.selection;
    if (sel?.kind !== 'authoredTree') return;
    const trees = this.core.readWorkingState().props.authoredTrees ?? [];
    const t = trees[sel.index];
    if (!t) return;
    if (this.treeKindSelect.value !== (t.kind ?? 'tree2')) {
      this.treeKindSelect.value = t.kind ?? 'tree2';
    }
    const scaleStr = (t.scale ?? 1.05).toFixed(2);
    if (this.treeScaleInput.value !== scaleStr) this.treeScaleInput.value = scaleStr;
  }

  private readTreePlacement(): { kind: 'tree' | 'tree2'; scale: number } {
    const kind = this.treeKindSelect.value === 'tree' ? 'tree' : 'tree2';
    const scale = parseFloat(this.treeScaleInput.value);
    return { kind, scale: Number.isFinite(scale) ? Math.max(0.3, Math.min(3, scale)) : 1.05 };
  }

  private populateNpcMobSelects(): void {
    for (const [id, n] of Object.entries(NPCS)) {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = `${n.name} (${id})`;
      this.npcSelect.appendChild(opt);
    }
    const mobIds = [...new Set(Object.values(ALL_ZONE_SOURCES).flatMap((z) => z.camps.map((c) => c.mobId)))];
    for (const id of mobIds.sort()) {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = id;
      this.mobSelect.appendChild(opt);
    }
  }

  private wireToolbar(sidebar: HTMLElement): void {
    sidebar.querySelectorAll<HTMLButtonElement>('[data-tool]').forEach((btn) => {
      btn.addEventListener('click', () => this.setTool(btn.dataset.tool as MapEditorTool));
    });
    sidebar.querySelector('#btn-new-road')?.addEventListener('click', () => {
      this.setTool('placeRoad');
      this.roadDraft = [];
      this.rebuildRoadWireframes();
      this.setStatus('New road — click the ground to add points, then Finish Road (or Enter).');
    });
    sidebar.querySelector('#btn-finish-road')?.addEventListener('click', () => this.finishRoad());
    sidebar.querySelector('#btn-save-draft')?.addEventListener('click', () => void this.saveDraft());
    sidebar.querySelector('#btn-load-draft')?.addEventListener('click', () => void this.loadSelectedDraft());
    sidebar.querySelector('#btn-delete-draft')?.addEventListener('click', () => void this.deleteSelectedDraft());
    sidebar.querySelector('#btn-publish-live')?.addEventListener('click', () => void this.publishLive());
    sidebar.querySelector('#btn-publish-all')?.addEventListener('click', () => void this.publishAllLive());
    sidebar.querySelector('#btn-reload-live')?.addEventListener('click', () => this.reloadFromLive());
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Enter' && this.tool === 'placeRoad') this.finishRoad();
    });
  }

  private setTool(tool: MapEditorTool): void {
    this.tool = tool;
    this.core.setPlaceModeEnabled(tool === 'placeAsset');
    this.root.querySelectorAll('[data-tool]').forEach((el) => {
      el.classList.toggle('active', (el as HTMLElement).dataset.tool === tool);
    });
    const hints: Record<MapEditorTool, string> = {
      select: 'Click a road or lake to select · Del removes · Tab cycles pickables.',
      placeAsset: 'Click to place library asset (use asset list below).',
      placeTree: 'Click to plant tree · species/scale below · [ ] to resize selected',
      placeRoad: 'Click waypoints · New Road · Finish Road (or Enter).',
      placeLake: 'Click to add lake · set radius below · drag selected lake to move.',
      placeNpc: 'Click to clone selected NPC template.',
      placeCamp: 'Click to place mob camp.',
    };
    this.setStatus(hints[tool]);
  }

  private onCanvasPointer(e: PointerEvent): void {
    if (e.button !== 0) return;
    const ground = this.core.pickGroundAt(e.clientX, e.clientY);
    if (!ground) return;
    const bundle = this.currentBundle();

    if (this.tool === 'placeTree') {
      e.stopImmediatePropagation();
      e.preventDefault();
      const { kind, scale } = this.readTreePlacement();
      const idx = this.core.addExplicitAuthoredTree(ground.x, ground.z, kind, scale);
      this.core.selectAuthoredTree(idx);
      this.flushCoreToBundle();
      this.pushColliderOverlayFromBundles();
      this.setStatus(`Tree placed (${kind === 'tree' ? 'pine' : 'oak'}) scale=${scale.toFixed(2)}`);
      return;
    }
    if (this.tool === 'placeRoad') {
      e.stopImmediatePropagation();
      e.preventDefault();
      this.roadDraft.push({ x: ground.x, z: ground.z });
      this.rebuildRoadWireframes();
      this.setStatus(`Road point ${this.roadDraft.length} @ (${ground.x.toFixed(1)}, ${ground.z.toFixed(1)}) — Finish Road when done.`);
      return;
    }
    if (this.tool === 'placeLake') {
      e.stopImmediatePropagation();
      e.preventDefault();
      const radius = this.readLakeRadius();
      const idx = this.core.addLake(ground.x, ground.z, radius);
      this.core.selectLake(idx);
      this.flushCoreToBundle();
      this.pushLakeOverlayFromBundles();
      this.rebuildLakeWireframes();
      this.setStatus(`Lake added @ (${ground.x.toFixed(0)}, ${ground.z.toFixed(0)}) r=${radius} · Publish to save.`);
      return;
    }
    if (this.tool === 'placeNpc') {
      e.stopImmediatePropagation();
      e.preventDefault();
      const tplId = this.npcSelect.value;
      const tpl = NPCS[tplId];
      if (!tpl) return;
      const newId = `${tplId}_edit_${Date.now().toString(36)}`;
      bundle.npcs[newId] = {
        ...structuredClone(tpl),
        id: newId,
        pos: { x: ground.x, z: ground.z },
        facing: 0,
        questIds: [],
      };
      this.applyBundleToCore(bundle);
      return;
    }
    if (this.tool === 'placeCamp') {
      e.stopImmediatePropagation();
      e.preventDefault();
      bundle.camps.push({
        mobId: this.mobSelect.value,
        center: { x: ground.x, z: ground.z },
        radius: 18,
        count: 6,
      });
      this.applyBundleToCore(bundle);
    }
  }

  private finishRoad(): void {
    if (this.roadDraft.length < 2) {
      this.setStatus('Road needs at least 2 points.');
      return;
    }
    const bundle = this.bundles.get(this.core.currentZoneId)!;
    bundle.roads.push(structuredClone(this.roadDraft));
    this.roadDraft = [];
    this.core.setRoads(bundle.roads);
    this.core.selectRoad(bundle.roads.length - 1);
    this.rebuildRoadWireframes();
    this.setStatus(`Road segment added (${bundle.roads.length} total). Del to remove · Publish to save.`);
  }

  private currentBundle(): MapEditorZoneBundle {
    this.flushCoreToBundle();
    return this.bundles.get(this.core.currentZoneId)!;
  }

  private flushCoreToBundle(): void {
    const id = this.core.currentZoneId;
    const ws = this.core.readExportState();
    const b = this.bundles.get(id)!;
    b.props = ws.props;
    b.npcs = ws.npcs;
    b.camps = ws.camps;
    b.roads = structuredClone(ws.roads);
    b.zone.lakes = structuredClone(ws.lakes);
    b.zone = applyZoneSettingsPatch(b.zone, readZoneSettingsFromForm(this.root));
  }

  /** Keep terrain carving in sync with unsaved lake edits. */
  private pushLakeOverlayFromBundles(): void {
    const id = this.core.currentZoneId;
    const liveLakes = this.core.readExportState().lakes;
    const zones: Record<string, { x: number; z: number; radius: number }[]> = {};
    for (const [zid, b] of this.bundles) {
      zones[zid] = zid === id ? liveLakes : (b.zone.lakes ?? []);
    }
    setRuntimeLakeOverlay(zones);
  }

  /** Keep movement collision in sync with unsaved tree edits. */
  private pushColliderOverlayFromBundles(): void {
    const id = this.core.currentZoneId;
    const liveProps = this.core.readExportState().props;
    const authoredTrees = [];
    const suppressedTrees = [];
    for (const [zid, b] of this.bundles) {
      const props = zid === id ? liveProps : b.props;
      authoredTrees.push(...(props.authoredTrees ?? []));
      suppressedTrees.push(...(props.suppressedTrees ?? []));
    }
    setRuntimeTreeColliderOverlay({ authoredTrees, suppressedTrees });
  }

  private applyBundleToCore(bundle: MapEditorZoneBundle): void {
    this.core.switchToBundle(bundle);
    this.core.setRoads(bundle.roads);
    this.core.setLakes(bundle.zone.lakes ?? []);
    this.rebuildRoadWireframes();
    this.rebuildLakeWireframes();
  }

  private rebuildRoadWireframes(): void {
    while (this.roadGroup.children.length) this.roadGroup.remove(this.roadGroup.children[0]);
    const roads = this.core.readExportState().roads;
    const sel = this.core.selection;
    const selRoadIdx = sel?.kind === 'road' ? sel.index : -1;
    const drawSeg = (a: { x: number; z: number }, b: { x: number; z: number }, color: number) => {
      const y1 = terrainHeight(a.x, a.z, WORLD_SEED) + 0.12;
      const y2 = terrainHeight(b.x, b.z, WORLD_SEED) + 0.12;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute([a.x, y1, a.z, b.x, y2, b.z], 3));
      const mat = new THREE.LineBasicMaterial({ color });
      mat.linewidth = 2;
      this.roadGroup.add(new THREE.Line(geo, mat));
    };
    roads.forEach((road, ri) => {
      const color = ri === selRoadIdx ? 0xff6644 : 0xddcc66;
      for (let i = 0; i + 1 < road.length; i++) drawSeg(road[i], road[i + 1], color);
    });
    for (let i = 0; i + 1 < this.roadDraft.length; i++) drawSeg(this.roadDraft[i], this.roadDraft[i + 1], 0x66ff99);
  }

  private rebuildLakeWireframes(): void {
    while (this.lakeGroup.children.length) this.lakeGroup.remove(this.lakeGroup.children[0]);
    const lakes = this.core.readExportState().lakes;
    const sel = this.core.selection;
    const selLakeIdx = sel?.kind === 'lake' ? sel.index : -1;
    const segments = 64;
    for (let li = 0; li < lakes.length; li++) {
      const lake = lakes[li];
      const selected = li === selLakeIdx;
      const color = selected ? 0xff6644 : 0x44aaff;
      const y = terrainHeightUncarved(lake.x, lake.z, WORLD_SEED) + 0.45;

      const fill = new THREE.Mesh(
        new THREE.CircleGeometry(lake.radius, segments),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: selected ? 0.35 : 0.22,
          depthTest: false,
          side: THREE.DoubleSide,
        }),
      );
      fill.rotation.x = -Math.PI / 2;
      fill.position.set(lake.x, y, lake.z);
      fill.renderOrder = 10;
      this.lakeGroup.add(fill);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(Math.max(0.5, lake.radius - 1.2), lake.radius, segments),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.9,
          depthTest: false,
          side: THREE.DoubleSide,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(lake.x, y + 0.02, lake.z);
      ring.renderOrder = 11;
      this.lakeGroup.add(ring);

      const outline: number[] = [];
      for (let i = 0; i <= segments; i++) {
        const a = (i / segments) * Math.PI * 2;
        const x = lake.x + Math.cos(a) * lake.radius;
        const z = lake.z + Math.sin(a) * lake.radius;
        outline.push(x, y + 0.04, z);
      }
      const lineGeo = new THREE.BufferGeometry();
      lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(outline, 3));
      const lineMat = new THREE.LineBasicMaterial({ color, depthTest: false });
      const line = new THREE.Line(lineGeo, lineMat);
      line.renderOrder = 12;
      this.lakeGroup.add(line);
    }
  }

  private buildDraft(name: string, id: string): MapEditorDraft {
    this.flushCoreToBundle();
    const zones: Record<string, MapEditorZoneBundle> = {};
    for (const [zid, b] of this.bundles) zones[zid] = structuredClone(b);
    return {
      id,
      name,
      savedAt: new Date().toISOString(),
      zones,
      zoneOrder: [...this.zoneOrder],
    };
  }

  private async saveDraft(): Promise<void> {
    const nameInput = this.root.querySelector('#draft-name') as HTMLInputElement;
    const idInput = this.root.querySelector('#draft-id') as HTMLInputElement;
    const name = nameInput.value.trim() || 'Untitled Map';
    const id = idInput.value.trim() || `draft_${Date.now().toString(36)}`;
    const draft = this.buildDraft(name, id);
    try {
      const res = await fetch('/__map-editor/draft/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'Save failed');
      idInput.value = id;
      await this.refreshDraftList();
      this.setStatus(`Draft saved: ${name} (does not affect live world).`);
    } catch (e) {
      this.setStatus(`Draft save failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  private async refreshDraftList(): Promise<void> {
    try {
      const res = await fetch('/__map-editor/draft/list');
      const data = await res.json() as { ok?: boolean; drafts?: { id: string; name: string }[] };
      this.draftSelect.innerHTML = '';
      for (const d of data.drafts ?? []) {
        const opt = document.createElement('option');
        opt.value = d.id;
        opt.textContent = `${d.name} (${d.id})`;
        this.draftSelect.appendChild(opt);
      }
    } catch { /* dev server may be offline */ }
  }

  private async loadSelectedDraft(): Promise<void> {
    const id = this.draftSelect.value;
    if (!id) return;
    try {
      const res = await fetch(`/__map-editor/draft/load?id=${encodeURIComponent(id)}`);
      const data = await res.json() as { ok?: boolean; draft?: MapEditorDraft; error?: string };
      if (!res.ok || !data.ok || !data.draft) throw new Error(data.error ?? 'Load failed');
      this.applyDraft(data.draft);
      this.setStatus(`Loaded draft: ${data.draft.name}`);
    } catch (e) {
      this.setStatus(`Load failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  private applyDraft(draft: MapEditorDraft): void {
    const migrated = migrateDraftZones(draft);
    this.bundles = migrated.bundles;
    this.zoneOrder = migrated.zoneOrder;
    this.refreshZoneSelect();
    this.switchToZone(this.zoneOrder[0] ?? allEditorZoneIds()[0]);
    (this.root.querySelector('#draft-name') as HTMLInputElement).value = draft.name;
    (this.root.querySelector('#draft-id') as HTMLInputElement).value = draft.id;
  }

  private async deleteSelectedDraft(): Promise<void> {
    const id = this.draftSelect.value;
    if (!id || !confirm(`Delete draft "${id}"?`)) return;
    await fetch(`/__map-editor/draft/delete?id=${encodeURIComponent(id)}`, { method: 'POST' });
    await this.refreshDraftList();
    this.setStatus(`Deleted draft ${id}.`);
  }

  private reloadFromLive(): void {
    if (!confirm('Discard unsaved edits and reload from live zone files?')) return;
    const init = initialEditorZones();
    this.bundles = init.bundles;
    this.zoneOrder = init.zoneOrder;
    this.refreshZoneSelect();
    this.switchToZone('eastbrook_vale');
    this.setStatus('Reloaded from live world data.');
  }

  private async publishLive(): Promise<void> {
    const id = this.core.currentZoneId;
    const name = this.bundles.get(id)?.zone.name ?? id;
    if (!confirm(`Publish ${name} to LIVE zone files?`)) return;
    try {
      await this.publishZone(id);
    } catch (e) {
      this.setStatus(`Publish failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  private async publishAllLive(): Promise<void> {
    if (!confirm('Publish ALL zones to LIVE game files?')) return;
    this.flushCoreToBundle();
    try {
      for (const id of this.zoneOrder) await this.publishZone(id);
      await this.publishZonesRegistry();
      this.setStatus('Published all zones + registry. Restart server + reload game.');
    } catch (e) {
      this.setStatus(`Publish failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  private async publishZonesRegistry(): Promise<void> {
    const res = await fetch('/__zone-editor/publish-zones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zoneOrder: this.zoneOrder, zones: zoneListFromBundles(this.bundles, this.zoneOrder) }),
    });
    const data = await res.json() as { ok?: boolean; error?: string };
    if (!res.ok || !data.ok) throw new Error(data.error ?? 'Zone registry publish failed');
  }

  private async publishZone(id: string): Promise<void> {
    this.flushCoreToBundle();
    const bundle = this.bundles.get(id);
    if (!bundle) throw new Error(`Unknown zone: ${id}`);
    const exportBody = {
      zone: id,
      zoneDef: bundle.zone,
      props: bundle.props,
      npcs: Object.fromEntries(
        Object.entries(bundle.npcs).map(([nid, n]) => [nid, { pos: n.pos, facing: n.facing }]),
      ),
      camps: bundle.camps,
      roads: bundle.roads,
      lakes: bundle.zone.lakes ?? [],
    };
    const res = await fetch('/__zone-editor/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(exportBody),
    });
    const data = await res.json() as { ok?: boolean; error?: string; zonePath?: string };
    if (!res.ok || !data.ok) throw new Error(data.error ?? 'Publish failed');
    const label = ALL_ZONE_SOURCES[id]?.name ?? bundle.zone.name;
    this.setStatus(`Published ${label} → ${data.zonePath ?? 'zone file'}.`);
  }

  private setStatus(msg: string): void {
    if (this.statusEl) this.statusEl.textContent = msg;
  }
}

export function createMapEditor(
  renderer: Renderer,
  world: IWorld,
  sim: Sim,
  root: HTMLElement,
): MapEditor {
  return new MapEditor(renderer, world, sim, root);
}
