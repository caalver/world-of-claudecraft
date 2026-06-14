// Hybrid enterable buildings: keep the exterior GLB, clip the roof when inside,
// and reveal a composed interior (floor, hearth, bar props).

import * as THREE from 'three';
import type { BuildingDef } from '../sim/types';
import {
  getBuildingInteriorLayout,
  isInsideBuilding,
  resolveBuildingInteriorId,
  resolveHouseProp,
} from '../sim/building_layout';
import { surfaceMat } from './gfx';

type Scale = number | [number, number, number];

export interface EnterableBuildDeps {
  addParts: (parent: THREE.Object3D, key: string, opts: {
    x?: number; y?: number; z?: number; rot?: number; scale: Scale; euler?: THREE.Euler;
  }) => THREE.Group;
  assetSize: (key: string) => THREE.Vector3;
  houseHeight: (key: string) => number;
}

export interface EnterableBuildingView {
  building: BuildingDef;
  root: THREE.Group;
  exterior: THREE.Group;
  interior: THREE.Group;
  clipPlane: THREE.Plane;
  fireLight: THREE.PointLight | null;
}

/** propAsset materials are cached globally — clone per building so clipping is independent. */
function isolateExteriorMaterials(exterior: THREE.Group): void {
  exterior.traverse((c) => {
    const mesh = c as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map((m) => m.clone());
    } else {
      mesh.material = (mesh.material as THREE.Material).clone();
    }
  });
}

function setClipOnBranch(root: THREE.Object3D, plane: THREE.Plane | null): void {
  root.traverse((c) => {
    const mesh = c as THREE.Mesh;
    if (!mesh.isMesh) return;
    (mesh as THREE.Mesh & { localClippingEnabled?: boolean }).localClippingEnabled = !!plane;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      const mat = m as THREE.Material;
      mat.clippingPlanes = plane ? [plane] : [];
      mat.clipShadows = !!plane;
      mat.needsUpdate = true;
    }
  });
}

function buildExterior(b: BuildingDef, exterior: THREE.Group, deps: EnterableBuildDeps): number {
  if (b.kind === 'chapel') {
    const tower = deps.assetSize('bellTower');
    const hall = deps.assetSize('house3');
    deps.addParts(exterior, 'bellTower', {
      z: -1.5,
      scale: [(b.w * 0.98) / tower.x, 21.2 / tower.y, (b.d * 0.72) / tower.z],
    });
    deps.addParts(exterior, 'house3', {
      z: b.d / 2 - 3.24,
      scale: [(b.w * 0.9) / hall.x, 5.0 / hall.y, 6.4 / hall.z],
    });
    return hall.y;
  }
  const assetKey = b.kind === 'inn' ? 'inn' : resolveHouseProp(b);
  const size = deps.assetSize(assetKey);
  const height = deps.houseHeight(assetKey);
  deps.addParts(exterior, assetKey, {
    scale: [b.w / size.x, height / size.y, b.d / size.z],
  });
  return size.y;
}

export function buildEnterableBuilding(b: BuildingDef, deps: EnterableBuildDeps): EnterableBuildingView {
  const layoutId = resolveBuildingInteriorId(b)!;
  const layout = getBuildingInteriorLayout(layoutId);
  if (!layout) throw new Error(`unknown building interior: ${layoutId}`);

  const exterior = new THREE.Group();
  const clipRefY = buildExterior(b, exterior, deps);
  isolateExteriorMaterials(exterior);
  const clipY = clipRefY * layout.roofClipFrac;
  const clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), clipY);

  const root = new THREE.Group();
  root.add(exterior);

  const hw = b.w / 2 - 0.5;
  const hd = b.d / 2 - 0.5;
  const interior = new THREE.Group();
  interior.visible = false;
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(hw * 2, 0.12, hd * 2),
    surfaceMat({ color: layout.floorColor ?? 0x5c4a38, roughness: 0.95 }),
  );
  floor.position.y = 0.06;
  floor.receiveShadow = true;
  interior.add(floor);

  for (const p of layout.props) {
    deps.addParts(interior, p.prop, {
      x: p.fx * hw,
      z: p.fz * hd,
      rot: p.rot,
      scale: p.scale ?? 1,
    });
  }
  root.add(interior);

  let fireLight: THREE.PointLight | null = null;
  if (layout.fireLight) {
    const fl = layout.fireLight;
    fireLight = new THREE.PointLight(fl.color ?? 0xff8833, 0, 14, 1.6);
    fireLight.position.set(fl.fx * hw, 2.2, fl.fz * hd);
    fireLight.userData.buildingInterior = true;
    fireLight.userData.interiorIntensity = fl.intensity ?? 1.4;
    root.add(fireLight);
  }

  return { building: b, root, exterior, interior, clipPlane, fireLight };
}

export function updateEnterableBuildings(views: EnterableBuildingView[], px: number, pz: number): boolean {
  let anyInside = false;
  for (const view of views) {
    const inside = isInsideBuilding(view.building, px, pz);
    if (inside) anyInside = true;
    view.interior.visible = inside;
    if (view.fireLight) {
      view.fireLight.intensity = inside
        ? (view.fireLight.userData.interiorIntensity as number | undefined) ?? 1.4
        : 0;
    }
    setClipOnBranch(view.exterior, inside ? view.clipPlane : null);
  }
  return anyInside;
}
