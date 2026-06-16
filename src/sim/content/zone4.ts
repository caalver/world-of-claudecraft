// Zone 4 — Aldermere (editor-generated).
import type { CampDef, NpcDef, ZoneDef, ZonePropsDef } from '../types';

export const ZONE4_ZONE: ZoneDef = {
  id: 'aldermere',
// @zone-editor-begin ZONE4_META
  name: 'Aldermere',
  zMin: 308,
  zMax: 592,
  levelRange: [8, 12],
  biome: 'marsh',
  hub: { x: 320, z: 465, radius: 78, name: 'Aldermere' },
  graveyard: { x: 320, z: 430 },
  xMin: 148,
  xMax: 502,
  welcome: 'Welcome to Aldermere — the market trades, for now.',
// @zone-editor-end ZONE4_META
// @zone-editor-begin ZONE4_LAKES
  lakes: [
    { x: 388, z: 512, radius: 32 },
  ],
// @zone-editor-end ZONE4_LAKES
  pois: [
    { x: 172, z: 432, label: 'Ironspine Pass' },
    { x: 320, z: 465, label: 'Aldermere' },
    { x: 388, z: 512, label: 'Mirrorfen Basin' },
  ],
};

// @zone-editor-begin ZONE4_CAMPS
export const ZONE4_CAMPS: CampDef[] = [
];
// @zone-editor-end ZONE4_CAMPS

// @zone-editor-begin ZONE4_ROADS
export const ZONE4_ROADS: { x: number; z: number }[][] = [
  [{ x: 148, z: 432 }, { x: 172, z: 433 }],
  [{ x: 172, z: 433 }, { x: 186, z: 434 }, { x: 202, z: 435 }, { x: 220, z: 436 }, { x: 240, z: 438 }, { x: 262, z: 440 }, { x: 282, z: 443 }, { x: 298, z: 447 }, { x: 310, z: 452 }, { x: 316, z: 458 }, { x: 318, z: 464 }, { x: 320, z: 470 }],
];
// @zone-editor-end ZONE4_ROADS

export const ZONE4_NPCS: Record<string, NpcDef> = {
  mayor_elise: {
    id: 'mayor_elise', name: 'Mayor Elise', title: 'Mayor of Aldermere',
    pos: { x: 320, z: 458 }, facing: 3.142, color: 0x5d6d7e,
    questIds: [],
    greeting: 'Welcome to Aldermere, $N. The pass is open and the market is trading — for now.',
  },
  market_warden: {
    id: 'market_warden', name: 'Warden Corrick', title: 'Market Warden',
    pos: { x: 332, z: 452 }, facing: -1.2, color: 0x566573,
    questIds: [],
    greeting: 'Keep your blade sheathed in the square, $C. The merchants pay me to keep order, not bury bodies.',
  },
  goods_merchant: {
    id: 'goods_merchant', name: 'Merchant Sable', title: 'Eastmarch Trader',
    pos: { x: 308, z: 456 }, facing: 0.4, color: 0x784212,
    questIds: [],
    vendorItems: [
      'fenbridge_rye', 'marsh_mint_tea', 'smoked_eel', 'silvermist_cordial',
      'bogiron_mace', 'fenreed_staff', 'fenwalker_boots', 'reedwoven_trousers',
    ],
    greeting: 'Goods from Fenbridge, ore from the peaks, and whatever the marsh couriers dare carry. Browse, $N.',
  },
};

// @zone-editor-begin ZONE4_PROPS
export const ZONE4_PROPS: ZonePropsDef = {
  buildings: [
    { kind: 'inn', x: 320, z: 527.608, w: 12, d: 14, rot: 2.4 },
    { kind: 'chapel', x: 261.864, z: 465, w: 12.5, d: 14, rot: 1.38 },
    { kind: 'house', prop: 'blacksmith', x: 387.08, z: 451.584, w: 12, d: 10, rot: -0.5 },
    { kind: 'house', prop: 'house2', x: 279.752, z: 491.832, w: 14, d: 12, rot: 0.5 },
    { kind: 'house', prop: 'house2', x: 360.248, z: 491.832, w: 12, d: 10, rot: -0.4 },
    { kind: 'house', prop: 'house2', x: 360.248, z: 438.168, w: 12, d: 10, rot: 2 },
    { kind: 'house', prop: 'house2', x: 290.932, z: 541.024, w: 12, d: 10, rot: -2.2 },
    { kind: 'house', prop: 'house2', x: 349.068, z: 541.024, w: 12, d: 10, rot: 2.6 },
    { kind: 'house', prop: 'house2', x: 248.315, z: 480.023, w: 12, d: 10, rot: 0.8 },
    { kind: 'house', prop: 'house2', x: 387.08, z: 482.888, w: 12, d: 10, rot: -1.4 },
    { kind: 'house', prop: 'house2', x: 320, z: 402.392, w: 14, d: 12, rot: 0.2 },
    { kind: 'house', prop: 'house2', x: 257.392, z: 420.28, w: 12, d: 10, rot: 1.6 },
    { kind: 'house', prop: 'house2', x: 382.608, z: 420.28, w: 12, d: 10, rot: -0.9 },
    { kind: 'house', prop: 'house2', x: 230.56, z: 491.832, w: 12, d: 10, rot: 2.3 },
    { kind: 'house', prop: 'house2', x: 409.44, z: 460.528, w: 12, d: 10, rot: -2.5 },
    { kind: 'house', prop: 'house2', x: 284.224, z: 371.088, w: 12, d: 10, rot: 0.6 },
    { kind: 'house', prop: 'house2', x: 355.776, z: 371.088, w: 12, d: 10, rot: -1.8 },
    { kind: 'house', prop: 'house2', x: 248, z: 378, w: 14, d: 12, rot: 0.3 },
    { kind: 'house', prop: 'house2', x: 278, z: 378, w: 12, d: 10, rot: 0.9 },
    { kind: 'house', prop: 'house2', x: 308, z: 378, w: 12, d: 10, rot: 1.5 },
    { kind: 'house', prop: 'house2', x: 338, z: 378, w: 12, d: 10, rot: -0.6 },
    { kind: 'house', prop: 'house2', x: 368, z: 378, w: 12, d: 12, rot: 2.1 },
    { kind: 'house', prop: 'house2', x: 398, z: 378, w: 14, d: 10, rot: -1.3 },
    { kind: 'house', prop: 'house2', x: 248, z: 408, w: 12, d: 10, rot: 0.5 },
    { kind: 'house', prop: 'house2', x: 278, z: 408, w: 12, d: 10, rot: -2 },
    { kind: 'house', prop: 'house2', x: 308, z: 408, w: 12, d: 12, rot: 1.1 },
    { kind: 'house', prop: 'house2', x: 338, z: 408, w: 12, d: 10, rot: 2.7 },
    { kind: 'house', prop: 'house2', x: 368, z: 408, w: 14, d: 10, rot: -0.4 },
    { kind: 'house', prop: 'house2', x: 398, z: 408, w: 12, d: 10, rot: 1.8 },
    { kind: 'house', prop: 'house2', x: 248, z: 538, w: 12, d: 12, rot: 0.3 },
    { kind: 'house', prop: 'house2', x: 278, z: 538, w: 12, d: 10, rot: 0.9 },
    { kind: 'house', prop: 'house2', x: 308, z: 538, w: 12, d: 10, rot: 1.5 },
    { kind: 'house', prop: 'house2', x: 338, z: 538, w: 14, d: 10, rot: -0.6 },
    { kind: 'house', prop: 'house2', x: 248, z: 568, w: 12, d: 12, rot: 2.1 },
    { kind: 'house', prop: 'house2', x: 278, z: 568, w: 12, d: 10, rot: -1.3 },
    { kind: 'house', prop: 'house2', x: 308, z: 568, w: 12, d: 10, rot: 0.5 },
    { kind: 'house', prop: 'house2', x: 338, z: 568, w: 12, d: 10, rot: -2 },
  ],
  wells: [{ x: 320, z: 458, r: 1.5 }],
  stalls: [
    { x: 292, z: 442, rot: 0.2, r: 1.8 },
    { x: 348, z: 442, rot: -0.5, r: 1.8 },
    { x: 320, z: 428, rot: 3.142, r: 1.8 },
    { x: 292, z: 488, rot: 1.1, r: 1.8 },
    { x: 348, z: 488, rot: -1.3, r: 1.8 },
    { x: 320, z: 502, rot: 0.6, r: 1.8 },
    { x: 306, z: 465, rot: 0.8, r: 1.8 },
    { x: 334, z: 465, rot: -0.7, r: 1.8 },
    { x: 320, z: 452, rot: 1.4, r: 1.8 },
    { x: 320, z: 478, rot: -2.1, r: 1.8 },
    { x: 278, z: 465, rot: 2.5, r: 1.8 },
    { x: 362, z: 465, rot: -1.9, r: 1.8 },
  ],
  mines: [],
  docks: [{ x: 418, z: 528, rot: -0.4, hutLocal: { x: 2.8, z: 2.4, hw: 1.7, hd: 1.5 } }],
  tents: [
  ],
  crates: [[298, 448], [320, 458], [342, 448], [308, 472], [332, 482], [320, 492]],
  campfires: [[278, 432], [362, 432], [278, 498], [362, 498]],
  mudHuts: [],
  ruinRings: [],
  fences: [
    { x1: 274.496, z1: 430.573, x2: 362.496, z2: 430.573 },
    { x1: 276.026, z1: 511.754, x2: 364.026, z2: 511.754 },
    { x1: 274.605, z1: 449.009, x2: 274.605, z2: 543.009 },
    { x1: 364, z1: 418, x2: 364, z2: 512 },
  ],
  graveyards: [{ x: 320, z: 430 }],
  placedAssets: [
  ],
  authoredTrees: [
    { x: 171.416, z: 441.179, kind: 'tree2', scale: 1.05 },
    { x: 172.584, z: 424.821, kind: 'tree2', scale: 1 },
    { x: 176.642, z: 441.512, kind: 'tree2', scale: 1.13 },
    { x: 176.691, z: 425.154, kind: 'tree2', scale: 1.1 },
    { x: 181.069, z: 441.846, kind: 'tree2', scale: 1.21 },
    { x: 181.598, z: 425.488, kind: 'tree2', scale: 1 },
    { x: 185.496, z: 442.179, kind: 'tree2', scale: 1.05 },
    { x: 186.504, z: 425.821, kind: 'tree2', scale: 1.1 },
    { x: 185.568, z: 442.184, kind: 'tree2', scale: 1.05 },
    { x: 186.432, z: 425.816, kind: 'tree2', scale: 1 },
    { x: 191.462, z: 442.517, kind: 'tree2', scale: 1.13 },
    { x: 191.205, z: 426.149, kind: 'tree2', scale: 1.1 },
    { x: 196.555, z: 442.851, kind: 'tree2', scale: 1.21 },
    { x: 196.778, z: 426.483, kind: 'tree2', scale: 1 },
    { x: 201.648, z: 443.184, kind: 'tree2', scale: 1.05 },
    { x: 202.352, z: 426.816, kind: 'tree2', scale: 1.1 },
    { x: 201.705, z: 443.187, kind: 'tree2', scale: 1.05 },
    { x: 202.295, z: 426.813, kind: 'tree2', scale: 1 },
    { x: 208.265, z: 443.521, kind: 'tree2', scale: 1.13 },
    { x: 207.735, z: 427.146, kind: 'tree2', scale: 1.1 },
    { x: 214.025, z: 443.854, kind: 'tree2', scale: 1.21 },
    { x: 213.975, z: 427.479, kind: 'tree2', scale: 1 },
    { x: 219.785, z: 444.187, kind: 'tree2', scale: 1.05 },
    { x: 220.215, z: 427.813, kind: 'tree2', scale: 1.1 },
    { x: 219.424, z: 444.159, kind: 'tree2', scale: 1.05 },
    { x: 220.576, z: 427.841, kind: 'tree2', scale: 1 },
    { x: 225.816, z: 428.341, kind: 'tree2', scale: 1.1 },
    { x: 230.256, z: 428.841, kind: 'tree2', scale: 1 },
    { x: 235.496, z: 429.341, kind: 'tree2', scale: 1.1 },
    { x: 239.264, z: 446.159, kind: 'tree2', scale: 1.13 },
    { x: 240.736, z: 429.841, kind: 'tree2', scale: 1 },
    { x: 239.578, z: 446.166, kind: 'tree2', scale: 1.05 },
    { x: 240.422, z: 429.834, kind: 'tree2', scale: 1 },
    { x: 244.838, z: 446.666, kind: 'tree2', scale: 1.13 },
    { x: 246.162, z: 430.334, kind: 'tree2', scale: 1.1 },
    { x: 250.898, z: 447.166, kind: 'tree2', scale: 1.21 },
    { x: 251.102, z: 430.834, kind: 'tree2', scale: 1 },
    { x: 256.158, z: 447.666, kind: 'tree2', scale: 1.05 },
    { x: 256.842, z: 431.334, kind: 'tree2', scale: 1.1 },
    { x: 261.418, z: 448.166, kind: 'tree2', scale: 1.13 },
    { x: 262.582, z: 431.834, kind: 'tree2', scale: 1 },
    { x: 261.184, z: 448.109, kind: 'tree2', scale: 1.05 },
    { x: 262.816, z: 431.891, kind: 'tree2', scale: 1 },
    { x: 265.944, z: 448.859, kind: 'tree2', scale: 1.13 },
    { x: 268.056, z: 432.641, kind: 'tree2', scale: 1.1 },
    { x: 271.504, z: 449.609, kind: 'tree2', scale: 1.21 },
    { x: 272.496, z: 433.391, kind: 'tree2', scale: 1 },
  ],
  suppressedTrees: [
    { x: 219.141, z: 451.046 },
    { x: 230.242, z: 451.368 },
  ],
};
// @zone-editor-end ZONE4_PROPS
