import { RAISED_TOP_FOR, type TileName } from "./textures";

export const SX = 256;
export const SZ = 256;
export const SY = 44;
export const CHUNK = 16;
export const SEA = 10;
export const WATER_Y = SEA + 0.015;

export interface BlockDef {
  id: number;
  name: string;
  tex: { top: TileName; side: TileName; bottom: TileName };
  solid: boolean;
  opaque: boolean;
  cutout: boolean;
  cross: boolean;
  liquid: boolean;
  light: number;
  hardness: number;
  mapColor: string;
  group: string;
}

const B = (
  id: number,
  name: string,
  top: TileName,
  side: TileName,
  bottom: TileName,
  opts: Partial<BlockDef> = {}
): BlockDef => ({
  id,
  name,
  tex: { top, side, bottom },
  solid: true,
  opaque: true,
  cutout: false,
  cross: false,
  liquid: false,
  light: 0,
  hardness: 1,
  mapColor: "#7a8c55",
  group: "Alam",
  ...opts,
});

export const ID = {
  air: 0,
  grass: 1,
  dirt: 2,
  stone: 3,
  cobblestone: 4,
  sand: 5,
  sandstone: 6,
  log: 7,
  leaves: 8,
  planks: 9,
  glass: 10,
  water: 11,
  snow: 12,
  gravel: 13,
  coalOre: 14,
  ironOre: 15,
  goldOre: 16,
  diamondOre: 17,
  bricks: 18,
  glowstone: 19,
  obsidian: 20,
  woolRed: 21,
  woolYellow: 22,
  woolBlue: 23,
  farmland: 24,
  wheat: 25,
  path: 26,
  lantern: 27,
  bookshelf: 28,
  crafting: 29,
  bedrock: 30,
  flowerRed: 31,
  flowerYellow: 32,
  tallGrass: 33,
  roof: 34,
  stoneBricks: 35,
  mossyCobble: 36,
  door: 37,
  birchLog: 38,
  pineLeaves: 39,
  hay: 40,
  lava: 41,
  ice: 42,
} as const;

export const BLOCKS: BlockDef[] = [
  B(0, "Udara", "grass_top", "grass_side", "dirt", { solid: false, opaque: false }),
  B(1, "Rumput", "grass_top", "grass_side", "dirt", {
    mapColor: "#6ca044",
    hardness: 0.6,
    group: "Alam",
  }),
  B(2, "Tanah", "dirt", "dirt", "dirt", { mapColor: "#8a6244", hardness: 0.5, group: "Alam" }),
  B(3, "Batu", "stone", "stone", "stone", { mapColor: "#8c8c8c", hardness: 1.5, group: "Alam" }),
  B(4, "Batu Bulat", "cobblestone", "cobblestone", "cobblestone", {
    mapColor: "#8f8f8f",
    hardness: 1.7,
    group: "Bangunan",
  }),
  B(5, "Pasir", "sand", "sand", "sand", { mapColor: "#ddd0a0", hardness: 0.5, group: "Alam" }),
  B(6, "Batupasir", "sandstone", "sandstone", "sandstone", {
    mapColor: "#d5c692",
    hardness: 1.2,
    group: "Bangunan",
  }),
  B(7, "Kayu Oak", "log_top", "log_side", "log_top", {
    mapColor: "#7c5a35",
    hardness: 1.3,
    group: "Alam",
  }),
  B(8, "Dedaunan", "leaves_oak", "leaves_oak", "leaves_oak", {
    opaque: false,
    cutout: true,
    mapColor: "#4c862f",
    hardness: 0.3,
    group: "Alam",
  }),
  B(9, "Papan Oak", "planks", "planks", "planks", {
    mapColor: "#b28a52",
    hardness: 1,
    group: "Bangunan",
  }),
  B(10, "Kaca", "glass", "glass", "glass", {
    opaque: false,
    mapColor: "#b9e4f2",
    hardness: 0.4,
    group: "Bangunan",
  }),
  B(11, "Air", "water", "water", "water", {
    solid: false,
    opaque: false,
    liquid: true,
    mapColor: "#3276a8",
    hardness: 0,
    group: "Alam",
  }),
  B(12, "Salju", "snow", "snow", "snow", { mapColor: "#f2f8fb", hardness: 0.4, group: "Alam" }),
  B(13, "Kerikil", "gravel", "gravel", "gravel", {
    mapColor: "#87837e",
    hardness: 0.6,
    group: "Alam",
  }),
  B(14, "Bijih Batubara", "coal_ore", "coal_ore", "coal_ore", {
    mapColor: "#5a5a5a",
    hardness: 2,
    group: "Tambang",
  }),
  B(15, "Bijih Besi", "iron_ore", "iron_ore", "iron_ore", {
    mapColor: "#b99a83",
    hardness: 2.4,
    group: "Tambang",
  }),
  B(16, "Bijih Emas", "gold_ore", "gold_ore", "gold_ore", {
    mapColor: "#d8b53c",
    hardness: 3,
    group: "Tambang",
  }),
  B(17, "Bijih Berlian", "diamond_ore", "diamond_ore", "diamond_ore", {
    mapColor: "#48c9cd",
    hardness: 4,
    group: "Tambang",
  }),
  B(18, "Bata", "bricks", "bricks", "bricks", {
    mapColor: "#a8533d",
    hardness: 1.8,
    group: "Bangunan",
  }),
  B(19, "Batu Bercahaya", "glowstone", "glowstone", "glowstone", {
    light: 14,
    mapColor: "#f0c14f",
    hardness: 0.5,
    group: "Dekorasi",
  }),
  B(20, "Obsidian", "obsidian", "obsidian", "obsidian", {
    mapColor: "#2a2136",
    hardness: 5,
    group: "Tambang",
  }),
  B(21, "Wol Merah", "wool_red", "wool_red", "wool_red", {
    mapColor: "#c33a34",
    hardness: 0.5,
    group: "Dekorasi",
  }),
  B(22, "Wol Kuning", "wool_yellow", "wool_yellow", "wool_yellow", {
    mapColor: "#e5bf3b",
    hardness: 0.5,
    group: "Dekorasi",
  }),
  B(23, "Wol Biru", "wool_blue", "wool_blue", "wool_blue", {
    mapColor: "#3b62c9",
    hardness: 0.5,
    group: "Dekorasi",
  }),
  B(24, "Lahan Tani", "farmland", "dirt", "dirt", {
    mapColor: "#6b492c",
    hardness: 0.5,
    group: "Alam",
  }),
  B(25, "Gandum", "wheat", "wheat", "wheat", {
    solid: false,
    opaque: false,
    cutout: true,
    cross: true,
    mapColor: "#c9b252",
    hardness: 0,
    group: "Alam",
  }),
  B(26, "Jalan Setapak", "path", "path", "path", {
    mapColor: "#a89d80",
    hardness: 0.7,
    group: "Bangunan",
  }),
  B(27, "Lentera", "lantern", "lantern", "lantern", {
    light: 15,
    mapColor: "#f2c45b",
    hardness: 0.6,
    group: "Dekorasi",
  }),
  B(28, "Rak Buku", "planks", "bookshelf", "planks", {
    mapColor: "#7c5429",
    hardness: 1,
    group: "Dekorasi",
  }),
  B(29, "Meja Kerajinan", "crafting_top", "crafting_side", "planks", {
    mapColor: "#9c7440",
    hardness: 1,
    group: "Dekorasi",
  }),
  B(30, "Bedrock", "bedrock", "bedrock", "bedrock", {
    mapColor: "#3a3a3a",
    hardness: 99,
    group: "Tambang",
  }),
  B(31, "Bunga Merah", "flower_red", "flower_red", "flower_red", {
    solid: false,
    opaque: false,
    cutout: true,
    cross: true,
    mapColor: "#c73832",
    hardness: 0,
    group: "Dekorasi",
  }),
  B(32, "Bunga Kuning", "flower_yellow", "flower_yellow", "flower_yellow", {
    solid: false,
    opaque: false,
    cutout: true,
    cross: true,
    mapColor: "#e5c341",
    hardness: 0,
    group: "Dekorasi",
  }),
  B(33, "Rumput Tinggi", "tall_grass", "tall_grass", "tall_grass", {
    solid: false,
    opaque: false,
    cutout: true,
    cross: true,
    mapColor: "#5e963a",
    hardness: 0,
    group: "Alam",
  }),
  B(34, "Genteng Tanah Liat", "terracotta", "terracotta", "terracotta", {
    mapColor: "#b4543f",
    hardness: 1.8,
    group: "Bangunan",
  }),
  B(35, "Batu Bata Stone", "stone_bricks", "stone_bricks", "stone_bricks", {
    mapColor: "#7e7e7e",
    hardness: 1.8,
    group: "Bangunan",
  }),
  B(36, "Batu Berlumut", "mossy_cobble", "mossy_cobble", "mossy_cobble", {
    mapColor: "#6e8458",
    hardness: 1.8,
    group: "Alam",
  }),
  B(37, "Pintu Kayu", "door", "door", "door", {
    solid: false,
    mapColor: "#7d5a30",
    hardness: 1,
    group: "Bangunan",
  }),
  B(38, "Kayu Birch", "birch_top", "birch_side", "birch_top", {
    mapColor: "#d4d0be",
    hardness: 1.3,
    group: "Alam",
  }),
  B(39, "Dedaunan Pinus", "leaves_pine", "leaves_pine", "leaves_pine", {
    opaque: false,
    cutout: true,
    mapColor: "#33582b",
    hardness: 0.3,
    group: "Alam",
  }),
  B(40, "Jemuran Jerami", "hay", "hay", "hay", {
    mapColor: "#c8a63c",
    hardness: 0.5,
    group: "Alam",
  }),
  B(41, "Lava", "lava", "lava", "lava", {
    solid: false,
    opaque: false,
    liquid: true,
    light: 13,
    mapColor: "#e0611f",
    hardness: 0,
    group: "Alam",
  }),
  B(42, "Es", "ice", "ice", "ice", {
    opaque: false,
    mapColor: "#a4d6ec",
    hardness: 0.8,
    group: "Alam",
  }),
];

// Swap every block's TOP texture to its raised "chunky" variant. Sides and
// bottoms stay flat and clean, exactly like classic Minecraft.
for (const block of BLOCKS) {
  const raised = RAISED_TOP_FOR[block.tex.top];
  if (raised) block.tex = { ...block.tex, top: raised };
}

export const BUILDABLE_BLOCKS = BLOCKS.filter((b) => b.id !== 0);

export function blockDef(id: number): BlockDef {
  return BLOCKS[id] ?? BLOCKS[0];
}

export function isOpaque(id: number): boolean {
  return blockDef(id).opaque;
}

// ---------------------------------------------------------------------------
// Deterministic noise helpers
// ---------------------------------------------------------------------------
function hash2(x: number, y: number, seed: number): number {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967296;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => t * t * (3 - 2 * t);

function valueNoise(x: number, y: number, seed: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = smooth(x - x0);
  const ty = smooth(y - y0);
  const a = hash2(x0, y0, seed);
  const b = hash2(x0 + 1, y0, seed);
  const c = hash2(x0, y0 + 1, seed);
  const d = hash2(x0 + 1, y0 + 1, seed);
  return lerp(lerp(a, b, tx), lerp(c, d, tx), ty);
}

function fbm(x: number, y: number, seed: number, octaves = 4): number {
  let v = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    v += valueNoise(x * freq, y * freq, seed + i * 97) * amp;
    amp *= 0.5;
    freq *= 2;
  }
  return v;
}

// ---------------------------------------------------------------------------
// World
// ---------------------------------------------------------------------------
export interface Waypoint {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  icon: string;
  color: string;
}

export interface World {
  seed: number;
  blocks: Uint8Array;
  surface: Int16Array;
  spawn: { x: number; y: number; z: number };
  waypoints: Waypoint[];
  biomeName: string;
  edits: Map<number, number>;
}

export function index(x: number, y: number, z: number): number {
  return (y * SZ + z) * SX + x;
}

export function inBounds(x: number, y: number, z: number): boolean {
  return x >= 0 && x < SX && z >= 0 && z < SZ && y >= 0 && y < SY;
}

export function getBlock(w: World, x: number, y: number, z: number): number {
  if (y < 0) return ID.bedrock;
  if (x < 0 || x >= SX || z < 0 || z >= SZ || y >= SY) return ID.air;
  return w.blocks[index(Math.floor(x), Math.floor(y), Math.floor(z))];
}

export function setBlock(w: World, x: number, y: number, z: number, id: number) {
  if (!inBounds(x, y, z)) return;
  w.blocks[index(x, y, z)] = id;
  w.edits.set(index(x, y, z), id);
}

export function isSolidAt(w: World, x: number, y: number, z: number): boolean {
  return blockDef(getBlock(w, x, y, z)).solid;
}

export function isWaterAt(w: World, x: number, y: number, z: number): boolean {
  return getBlock(w, x, y, z) === ID.water;
}

export function surfaceHeight(w: World, x: number, z: number): number {
  const ix = Math.max(0, Math.min(SX - 1, Math.floor(x)));
  const iz = Math.max(0, Math.min(SZ - 1, Math.floor(z)));
  const column = iz * SX + ix;
  const top = w.surface[column];
  return top + 1;
}

export function biomeAt(w: World, x: number, z: number): string {
  const h = surfaceHeight(w, x, z);
  if (h > 28) return "Puncak Bersalju";
  if (h > 21) return "Pegunungan";
  if (Math.hypot(x - 60, z - 68) < 20) return "Tepi Danau";
  if (Math.hypot(x - 60, z - 38) < 20) return "Perbukitan";
  return "Lembah Zamrud";
}

// ---------------------------------------------------------------------------
// Feature builders
// ---------------------------------------------------------------------------
function setIfAir(w: World, x: number, y: number, z: number, id: number) {
  if (getBlock(w, x, y, z) === ID.air) setBlock(w, x, y, z, id);
}

function placeOak(w: World, x: number, z: number, baseY: number, seed: number, pine = false, birch = false) {
  const r = (n: number) => hash2(x * 7 + n, z * 13 + n * 3, seed);
  const height = pine ? 7 + Math.floor(r(1) * 5) : 5 + Math.floor(r(1) * 3);
  const trunk = birch ? ID.birchLog : ID.log;
  for (let i = 0; i < height; i++) setBlock(w, x, baseY + i, z, trunk);
  const leaf = pine ? ID.pineLeaves : ID.leaves;
  if (pine) {
    let radius = 2.6;
    for (let layer = height - 1; layer >= 3; layer--) {
      const rad = Math.max(0, Math.floor(radius));
      for (let dx = -rad; dx <= rad; dx++) {
        for (let dz = -rad; dz <= rad; dz++) {
          if (Math.abs(dx) + Math.abs(dz) > rad + 1) continue;
          if (dx === 0 && dz === 0 && layer < height) continue;
          if (r(dx * 31 + dz * 17 + layer) > 0.18) setIfAir(w, x + dx, baseY + layer, z + dz, leaf);
        }
      }
      radius -= 0.42;
    }
    setBlock(w, x, baseY + height, z, leaf);
  } else {
    const top = baseY + height;
    for (let dy = -2; dy <= 2; dy++) {
      const rad = dy === 2 ? 1 : dy === -2 ? 2 : 2 + (dy === 0 ? 1 : 0);
      for (let dx = -rad; dx <= rad; dx++) {
        for (let dz = -rad; dz <= rad; dz++) {
          const dist = Math.hypot(dx, dz);
          if (dist > rad + 0.4) continue;
          if (dx === 0 && dz === 0 && dy < 2) continue;
          if (r(dx * 19 + dz * 37 + dy * 11) > 0.12) setIfAir(w, x + dx, top + dy, z + dz, leaf);
        }
      }
    }
    for (const [dx, dz] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]) {
      setIfAir(w, x + dx, top + 2, z + dz, leaf);
    }
  }
}

function flatten(w: World, x0: number, z0: number, width: number, depth: number, targetH: number) {
  for (let x = x0; x < x0 + width; x++) {
    for (let z = z0; z < z0 + depth; z++) {
      for (let y = 0; y < SY; y++) {
        if (y < targetH - 2) setBlock(w, x, y, z, y < 4 ? ID.stone : ID.dirt);
        else if (y < targetH) setBlock(w, x, y, z, y === 0 ? ID.bedrock : ID.dirt);
        else setBlock(w, x, y, z, ID.air);
      }
      setBlock(w, x, targetH - 1, z, ID.grass);
    }
  }
}

function drawPath(w: World, x1: number, z1: number, x2: number, z2: number, width = 2) {
  const steps = Math.ceil(Math.hypot(x2 - x1, z2 - z1) * 2);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const cx = Math.round(lerp(x1, x2, t));
    const cz = Math.round(lerp(z1, z2, t));
    for (let dx = -Math.floor(width / 2); dx <= Math.floor(width / 2); dx++) {
      for (let dz = -Math.floor(width / 2); dz <= Math.floor(width / 2); dz++) {
        const x = cx + dx;
        const z = cz + dz;
        let surface = 0;
        for (let y = SY - 1; y >= 0; y--) {
          if (blockDef(getBlock(w, x, y, z)).solid) {
            surface = y;
            break;
          }
        }
        if (surface > SEA && getBlock(w, x, surface, z) !== ID.water) {
          const topId = getBlock(w, x, surface, z);
          if (topId === ID.grass || topId === ID.dirt || topId === ID.path || topId === ID.sand) {
            setBlock(w, x, surface, z, ID.path);
            if (getBlock(w, x, surface + 1, z) !== ID.air) setBlock(w, x, surface + 1, z, ID.air);
          }
        }
      }
    }
  }
}

function buildCottage(w: World, x0: number, z0: number) {
  const width = 9;
  const depth = 7;
  flatten(w, x0 - 1, z0 - 1, width + 2, depth + 2, 12);
  const floorY = 11;
  const wallStart = 12;
  const wallHeight = 4;
  // floor
  for (let x = x0; x < x0 + width; x++) {
    for (let z = z0; z < z0 + depth; z++) setBlock(w, x, floorY, z, ID.planks);
  }
  // foundation & walls
  for (let layer = 0; layer <= wallHeight; layer++) {
    const y = wallStart + layer;
    for (let x = x0; x < x0 + width; x++) {
      for (let z = z0; z < z0 + depth; z++) {
        const edge = x === x0 || x === x0 + width - 1 || z === z0 || z === z0 + depth - 1;
        if (!edge) {
          if (layer === wallHeight) setBlock(w, x, y, z, ID.planks);
          continue;
        }
        const corner = (x === x0 || x === x0 + width - 1) && (z === z0 || z === z0 + depth - 1);
        let mat: number = corner ? ID.log : ID.planks;
        if (layer === 0) mat = ID.cobblestone;
        setBlock(w, x, y, z, mat);
      }
    }
  }
  // windows (cut 2x2 holes + glass)
  const addWindow = (x: number, z: number) => {
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = 0; dx < 2; dx++) setBlock(w, x + dx, wallStart + 1 + dy, z, ID.glass);
    }
  };
  addWindow(x0 + 2, z0 + depth - 1);
  addWindow(x0 + 5, z0 + depth - 1);
  addWindow(x0 + 2, z0);
  addWindow(x0 + 5, z0);
  addWindow(x0 + width - 1, z0 + 2);
  addWindow(x0, z0 + 2);
  addWindow(x0 + width - 1, z0 + 4);
  addWindow(x0, z0 + 4);
  // door
  const doorX = x0 + 4;
  const doorZ = z0 + depth - 1;
  for (let dy = 0; dy < 2; dy++) setBlock(w, doorX, wallStart + dy, doorZ, ID.door);
  setBlock(w, doorX, wallStart + 2, doorZ, ID.planks);
  setBlock(w, doorX - 1, 11, doorZ + 1, ID.path);
  setBlock(w, doorX, 11, doorZ + 1, ID.path);
  setBlock(w, doorX + 1, 11, doorZ + 1, ID.path);
  // roof - stepped pyramid in terracotta
  let layer = 0;
  const roofBase = wallStart + wallHeight + 1;
  while (layer < 5) {
    const insetX = Math.floor(layer / 2);
    const insetZ = Math.floor(layer / 2);
    for (let x = x0 - 1 + insetX; x <= x0 + width - insetX; x++) {
      for (let z = z0 - 1 + insetZ; z <= z0 + depth - insetZ; z++) {
        const edge = x === x0 - 1 + insetX || x === x0 + width - insetX || z === z0 - 1 + insetZ || z === z0 + depth - insetZ;
        if (edge || layer === 4) setBlock(w, x, roofBase + layer, z, ID.roof);
      }
    }
    layer++;
  }
  // gable + chimney
  for (let i = 0; i < 4; i++) {
    for (let x = x0 + 2 + i; x <= x0 + width - 3 - i; x++) {
      setBlock(w, x, roofBase + i, z0 + 1, ID.planks);
    }
  }
  for (let y = wallStart; y < roofBase + 5; y++) {
    setBlock(w, x0 + width - 2, y, z0 + 1, ID.cobblestone);
    setBlock(w, x0 + width - 3, y, z0 + 1, ID.cobblestone);
  }
  setBlock(w, x0 + width - 2, roofBase + 5, z0 + 1, ID.lantern);
  // interior
  setBlock(w, x0 + 1, wallStart, z0 + 1, ID.crafting);
  for (let y = wallStart; y < wallStart + 2; y++) {
    for (let x = x0 + 1; x <= x0 + 3; x++) setBlock(w, x, y, z0, ID.bookshelf);
  }
  setBlock(w, x0 + 2, floorY + 1, z0 + 4, ID.woolRed);
  setBlock(w, x0 + 2, floorY + 1, z0 + 5, ID.woolRed);
  setBlock(w, x0 + 3, floorY + 1, z0 + 4, ID.woolRed);
  setBlock(w, x0 + 3, floorY + 1, z0 + 5, ID.woolRed);
  setBlock(w, x0 + 1, floorY + 1, z0 + 4, ID.planks);
  setBlock(w, x0 + 1, floorY + 1, z0 + 5, ID.planks);
  // suspended lanterns
  setBlock(w, x0 + 2, wallStart + wallHeight - 1, z0 + 3, ID.lantern);
  setBlock(w, x0 + 6, wallStart + wallHeight - 1, z0 + 3, ID.lantern);
  // porch, garden, fence
  for (let x = x0 + 2; x <= x0 + 6; x++) {
    for (let z = doorZ + 1; z <= doorZ + 2; z++) {
      setBlock(w, x, 11, z, ID.planks);
      setBlock(w, x, 12, z, ID.air);
    }
  }
  for (let x = x0 - 2; x < x0 + width + 2; x++) {
    if (x % 2 === 0) {
      setBlock(w, x, 12, z0 - 2, ID.planks);
      setBlock(w, x, 13, z0 - 2, ID.air);
    }
  }
  const flowers = [ID.flowerRed, ID.flowerYellow, ID.tallGrass];
  for (let i = 0; i < 26; i++) {
    const fx = x0 - 3 + Math.floor(hash2(i, 3, 88) * (width + 6));
    const fz = z0 + depth + 2 + Math.floor(hash2(i, 9, 99) * 4);
    setBlock(w, fx, 12, fz, flowers[i % 3]);
  }
  // farm
  const farmX = x0 - 6;
  const farmZ = z0 + 1;
  flatten(w, farmX - 1, farmZ - 1, 6, 9, 12);
  for (let x = farmX; x < farmX + 4; x++) {
    for (let z = farmZ; z < farmZ + 7; z++) {
      setBlock(w, x, 11, z, ID.farmland);
      setBlock(w, x, 12, z, ID.wheat);
    }
  }
  for (let i = 0; i < 4; i++) {
    setBlock(w, farmX + 4, 12, farmZ + i * 2, ID.planks);
    setBlock(w, farmX - 1, 12, farmZ + i * 2, ID.planks);
  }
  setBlock(w, farmX + 4, 12, farmZ + 7, ID.hay);
  setBlock(w, farmX + 4, 13, farmZ + 7, ID.hay);
  setBlock(w, farmX + 3, 12, farmZ + 7, ID.hay);
}

function buildTower(w: World, x0: number, z0: number, ground: number) {
  const height = 9;
  for (let x = x0; x < x0 + 5; x++) {
    for (let z = z0; z < z0 + 5; z++) {
      const edge = x === x0 || x === x0 + 4 || z === z0 || z === z0 + 4;
      for (let y = ground; y < ground + height; y++) {
        if (edge) setBlock(w, x, y, z, y < ground + 2 ? ID.mossyCobble : ID.stoneBricks);
      }
      setBlock(w, x, ground + height, z, ID.planks);
    }
  }
  // battlements
  for (let x = x0; x < x0 + 5; x++) {
    for (let z = z0; z < z0 + 5; z++) {
      const edge = x === x0 || x === x0 + 4 || z === z0 || z === z0 + 4;
      if (edge && (x + z) % 2 === 0) setBlock(w, x, ground + height + 1, z, ID.stoneBricks);
    }
  }
  for (let x = x0 + 1; x < x0 + 4; x++) {
    for (let z = z0 + 1; z < z0 + 4; z++) {
      for (let y = ground + height - 2; y < ground + height; y++) setBlock(w, x, y, z, ID.air);
      setBlock(w, x, ground + height - 3, z, ID.planks);
    }
  }
  setBlock(w, x0 + 2, ground + height, z0 + 2, ID.glowstone);
  setBlock(w, x0 + 1, ground + height + 1, z0 + 1, ID.lantern);
  setBlock(w, x0 + 3, ground + height + 1, z0 + 3, ID.lantern);
  // rope bridge to nowhere / banners
  for (let y = ground + 3; y < ground + height - 1; y++) {
    setBlock(w, x0, y, z0 + 2, ID.log);
    setBlock(w, x0 + 4, y, z0 + 2, ID.log);
  }
  setBlock(w, x0, ground + height + 2, z0 + 2, ID.woolBlue);
  setBlock(w, x0 + 4, ground + height + 2, z0 + 2, ID.woolYellow);
}

function buildLighthouse(w: World, x0: number, z0: number, baseY: number) {
  const height = 8;
  for (let y = 0; y < height; y++) {
    const radius = y < height - 3 ? 1 : 2;
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        const edge = Math.abs(dx) === radius || Math.abs(dz) === radius;
        if (!edge) continue;
        const band = Math.floor(y / 3) % 2 === 0;
        setBlock(w, x0 + dx, baseY + y, z0 + dz, band ? ID.woolRed : ID.woolYellow);
        if (y > 2 && y < 6 && Math.abs(dx) + Math.abs(dz) === radius) setBlock(w, x0 + dx, baseY + y, z0 + dz, ID.glass);
      }
    }
  }
  setBlock(w, x0, baseY + height - 1, z0, ID.glowstone);
  for (let dx = -2; dx <= 2; dx++) {
    for (let dz = -2; dz <= 2; dz++) {
      if (Math.abs(dx) === 2 || Math.abs(dz) === 2) setBlock(w, x0 + dx, baseY + height, z0 + dz, ID.planks);
    }
  }
  setBlock(w, x0, baseY + height, z0, ID.glowstone);
  setBlock(w, x0, baseY + height + 1, z0, ID.lantern);
  setBlock(w, x0, baseY + height + 2, z0, ID.roof);
}

function buildCamp(w: World, x0: number, z0: number, ground: number) {
  // two canvas tents, a campfire and supply crates
  const tents: [number, number, number][] = [[x0, z0, ID.woolRed], [x0 + 4, z0 + 1, ID.woolBlue]];
  for (const [tx, tz, color] of tents) {
    for (let x = 0; x < 4; x++) {
      for (let z = 0; z < 3; z++) {
        const h = 3 - Math.floor(Math.abs(x - 1.5));
        for (let y = 0; y < Math.max(1, h); y++) {
          const edge = x === 0 || x === 3 || z === 0 || z === 2 || y === Math.max(1, h) - 1;
          if (edge) setBlock(w, tx + x, ground + y, tz + z, color);
          else setBlock(w, tx + x, ground + y, tz + z, ID.air);
        }
      }
    }
    setBlock(w, tx + 1, ground, tz + 1, ID.woolYellow);
    setBlock(w, tx + 2, ground, tz + 1, ID.woolYellow);
  }
  const fx = x0 + 2;
  const fz = z0 + 5;
  setBlock(w, fx, ground - 1, fz, ID.glowstone);
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    setBlock(w, fx + dx, ground - 1, fz + dz, ID.log);
  }
  setBlock(w, fx, ground, fz, ID.lantern);
  setBlock(w, x0 + 6, ground, z0 + 3, ID.hay);
  setBlock(w, x0 + 6, ground + 1, z0 + 3, ID.hay);
  setBlock(w, x0 + 7, ground, z0 + 3, ID.crafting);
  setBlock(w, x0 - 1, ground, z0 + 2, ID.lantern);
}

function buildArch(w: World, cx: number, cz: number, ground: number) {
  const height = 7;
  for (let y = 0; y < height; y++) {
    setBlock(w, cx - 4, ground + y, cz, ID.stoneBricks);
    setBlock(w, cx + 4, ground + y, cz, ID.stoneBricks);
    if (y > 1) {
      setBlock(w, cx - 3, ground + y, cz, ID.air);
      setBlock(w, cx + 3, ground + y, cz, ID.air);
    }
  }
  for (let x = -4; x <= 4; x++) {
    setBlock(w, cx + x, ground + height, cz, ID.stoneBricks);
    if (x > -4 && x < 4) setBlock(w, cx + x, ground + height - 1, cz, ID.air);
    if (x > -3 && x < 3) setBlock(w, cx + x, ground + height - 2, cz, ID.air);
  }
  setBlock(w, cx, ground + height, cz, ID.glowstone);
  setBlock(w, cx - 4, ground + height + 1, cz, ID.lantern);
  setBlock(w, cx + 4, ground + height + 1, cz, ID.lantern);
  for (let x = -3; x <= 3; x++) setBlock(w, cx + x, ground - 1, cz, ID.path);
}

function buildWaterfall(w: World, x0: number, z0: number) {
  let top = 0;
  for (let y = SY - 1; y >= 0; y--) {
    if (blockDef(getBlock(w, x0, y, z0)).solid) {
      top = y;
      break;
    }
  }
  if (top <= SEA + 4) return;
  for (let dz = 0; dz < 3; dz++) {
    for (let x = x0 - 1; x <= x0 + 1; x++) {
      setBlock(w, x, SEA, z0 + dz, ID.water);
      for (let y = SEA + 1; y <= top; y++) setBlock(w, x, y, z0 + dz, ID.water);
    }
  }
  // splash pool rim
  for (let dx = -3; dx <= 3; dx++) {
    for (let dz = -2; dz <= 5; dz++) {
      const d = Math.hypot(dx, dz);
      if (d > 2.2 && d < 4) {
        if (getBlock(w, x0 + dx, SEA, z0 + dz) === ID.air) setBlock(w, x0 + dx, SEA - 1, z0 + dz, ID.stone);
      }
    }
  }
  setBlock(w, x0 - 2, SEA + 1, z0 + 1, ID.lantern);
  setBlock(w, x0 + 2, SEA + 1, z0 + 1, ID.lantern);
}

function buildDock(w: World) {
  const start = { x: 45, z: 56 };
  const end = { x: 54, z: 63 };
  drawPath(w, 44, 51, start.x, start.z, 2);
  const steps = Math.ceil(Math.hypot(end.x - start.x, end.z - start.z));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const cx = Math.round(lerp(start.x, end.x, t));
    const cz = Math.round(lerp(start.z, end.z, t));
    for (let dx = 0; dx < 2; dx++) {
      for (let dz = 0; dz < 2; dz++) {
        const x = cx + dx;
        const z = cz + dz;
        const previous = getBlock(w, x, 12, z);
        setBlock(w, x, 11, z, ID.planks);
        if (previous === ID.water) setBlock(w, x, 12, z, ID.air);
        if (i % 2 === 0 && dz === 0) {
          for (let y = 7; y < 11; y++) setBlock(w, x, y, z, ID.log);
        }
      }
    }
    if (i === steps) {
      setBlock(w, cx, 12, cz, ID.planks);
      setBlock(w, cx, 13, cz, ID.lantern);
      setBlock(w, cx + 1, 12, cz + 1, ID.lantern);
    }
  }
  // little boat
  const bx = 55;
  const bz = 59;
  for (let x = bx; x < bx + 4; x++) {
    for (let z = bz; z < bz + 2; z++) {
      const edge = x === bx || x === bx + 3 || z === bz || z === bz + 1;
      setBlock(w, x, 10, z, edge ? ID.log : ID.air);
      if (edge) setBlock(w, x, 11, z, ID.log);
    }
  }
  for (let x = bx + 1; x < bx + 3; x++) setBlock(w, x, 10, bz + 1, ID.planks);
}

// ---------------------------------------------------------------------------
// Main generator
// ---------------------------------------------------------------------------
export function generateWorld(seed: number): World {
  const blocks = new Uint8Array(SX * SY * SZ);
  const surface = new Int16Array(SX * SZ);
  const w: World = {
    seed,
    blocks,
    surface,
    spawn: { x: 51.5, y: 14, z: 38.5 },
    waypoints: [],
    biomeName: "Lembah Zamrud",
    edits: new Map(),
  };
  // Landmarks stay aligned with the hand-built structures (cottage, dock,
  // lighthouse, tower) while noise relief makes each seed feel new.
  const lake = { x: 60, z: 67, r: 16 };
  const lake2 = { x: 176, z: 178, r: 30 };
  const mountain = { x: 186, z: 62 };
  const mountain2 = { x: 60, z: 196 };
  const hill = { x: 16, z: 28 };

  for (let x = 0; x < SX; x++) {
    for (let z = 0; z < SZ; z++) {
      const n = fbm(x * 0.045, z * 0.045, seed, 4);
      const detail = fbm(x * 0.13, z * 0.13, seed + 41, 2);
      let h = 11 + (n - 0.5) * 9 + (detail - 0.5) * 3;
      // mountain range
      const md = Math.hypot(x - mountain.x, z - mountain.z);
      const ridge = Math.max(0, 1 - md / 28);
      const ridgeNoise = fbm(x * 0.085, z * 0.085, seed + 7, 3);
      h += Math.pow(ridge, 1.35) * 26 + (ridgeNoise - 0.32) * ridge * 19;
      // secondary mountain chain NE
      const md2 = Math.hypot(x - 40, z - 12);
      const ridge2 = Math.max(0, 1 - md2 / 26);
      h += Math.pow(ridge2, 1.7) * 16 + (fbm(x * 0.1 + 8, z * 0.1, seed + 11, 2) - 0.38) * ridge2 * 10;
      // second hills
      const hd = Math.hypot(x - hill.x, z - hill.z);
      h += Math.max(0, 1 - hd / 22) * 5;
      // second far mountain chain (south-west)
      const md3 = Math.hypot(x - mountain2.x, z - mountain2.z);
      const ridge3 = Math.max(0, 1 - md3 / 44);
      h += Math.pow(ridge3, 1.4) * 24 + (fbm(x * 0.07 + 21, z * 0.07, seed + 31, 3) - 0.35) * ridge3 * 18;
      // broad mid-continent highlands
      const hd2 = Math.hypot(x - 132, z - 150);
      h += Math.max(0, 1 - hd2 / 60) * 8;
      // lake bowl
      const ld = Math.hypot(x - lake.x, z - lake.z) + (n - 0.5) * 6;
      const lakeBlend = Math.max(0, 1 - ld / (lake.r + 5));
      h = lerp(h, 6.4, smooth(Math.min(1, lakeBlend)));
      const ld2 = Math.hypot(x - lake2.x, z - lake2.z) + (n - 0.5) * 10;
      const lakeBlend2 = Math.max(0, 1 - ld2 / (lake2.r + 12));
      h = lerp(h, 5.6, smooth(Math.min(1, lakeBlend2)));
      // Inland continent: the ground stays high all the way to the world
      // border, so there is no sea wrapping the playable area. Water only
      // exists as lakes and ponds inside the landmass.
      const edgeDist = Math.min(x, z, SX - 1 - x, SZ - 1 - z);
      if (edgeDist < 30) {
        const t = 1 - edgeDist / 30;
        // raised mountain rim hides the world border naturally
        h = Math.max(h, 15 + smooth(t) * 12 + (fbm(x * 0.12, z * 0.12, seed + 77, 2) - 0.5) * 8);
      }
      // keep the interior high and green: only explicit lakes go below sea level
      const interior = Math.min(x, z, SX - 1 - x, SZ - 1 - z) > 34;
      const inLake = Math.hypot(x - lake.x, z - lake.z) < lake.r + 9 || Math.hypot(x - lake2.x, z - lake2.z) < lake2.r + 16;
      if (interior && !inLake) h = Math.max(SEA + 3, h);
      h = Math.max(4, Math.min(SY - 12, Math.round(h)));
      surface[z * SX + x] = h - 1;
      const beach = h <= SEA + 1 && !((Math.min(x, z, SX - 1 - x, SZ - 1 - z) > 34) && !inLake);
      const snowy = h >= 27;
      const rocky = h >= 22;
      for (let y = 0; y < h; y++) {
        let id: number = ID.stone;
        if (y === 0) id = ID.bedrock;
        else if (snowy && y === h - 1) id = ID.snow;
        else if (snowy && y >= h - 4) id = ID.stone;
        else if (rocky && y >= h - 2) {
          const rr = hash2(x * 11 + y, z * 7, seed + 71);
          id = rr > 0.82 ? ID.gravel : rr > 0.74 ? ID.cobblestone : ID.stone;
        }
        else if (beach && y >= h - 3) id = y === h - 1 ? ID.sand : ID.sandstone;
        else if (y === h - 1) id = x > 70 && z > 60 ? ID.sand : ID.grass;
        else if (y >= h - 4) id = beach ? ID.sand : ID.dirt;
        else id = ID.stone;
        // ores
        if (id === ID.stone && y < 16) {
          const o = hash2(x * 3 + y, z * 5 + y * 2, seed + 17);
          if (y < 5 && o > 0.988) id = ID.diamondOre;
          else if (y < 8 && o > 0.978) id = ID.goldOre;
          else if (o > 0.962) id = ID.ironOre;
          else if (o > 0.94) id = ID.coalOre;
        }
        blocks[index(x, y, z)] = id;
      }
      // ocean / lake water
      for (let y = h; y < SEA; y++) {
        if (blocks[index(x, y, z)] === 0) blocks[index(x, y, z)] = ID.water;
      }
      if (h <= SEA && hash2(x, z, seed + 91) > 0.86) {
        blocks[index(x, Math.max(0, h - 1), z)] = ID.gravel;
      }
    }
  }

  // Clear the meadow of trees so the vista stays open and beautiful.
  const clearRadius = 17;
  for (let x = 0; x < SX; x++) {
    for (let z = 0; z < SZ; z++) {
      if (Math.hypot(x - 51, z - 38) > clearRadius) continue;
      for (let y = SEA + 1; y < SY; y++) {
        const b = blocks[index(x, y, z)];
        if (b === ID.log || b === ID.birchLog || b === ID.leaves || b === ID.pineLeaves || b === ID.tallGrass || b === ID.flowerRed || b === ID.flowerYellow || b === ID.wheat) {
          blocks[index(x, y, z)] = ID.air;
        }
      }
    }
  }

  // Wide green meadow around spawn: no sea, no ponds, gentle grassy ground.
  const meadowCx = 51;
  const meadowCz = 38;
  for (let x = 0; x < SX; x++) {
    for (let z = 0; z < SZ; z++) {
      const d = Math.hypot(x - meadowCx, z - meadowCz);
      if (d > 46) continue;
      let top = 12;
      for (let y = SY - 1; y >= 0; y--) {
        const b = blocks[index(x, y, z)];
        if (blockDef(b).solid) {
          top = y;
          break;
        }
      }
      const targetTop = Math.max(13, top);
      if (targetTop > top) {
        for (let y = top + 1; y <= targetTop; y++) blocks[index(x, y, z)] = y === targetTop ? ID.grass : ID.dirt;
      } else {
        blocks[index(x, targetTop, z)] = ID.grass;
      }
      for (let y = targetTop + 1; y < SEA + 2; y++) blocks[index(x, y, z)] = ID.air;
      for (let y = SEA; y <= targetTop; y++) {
        if (blocks[index(x, y, z)] === ID.water) blocks[index(x, y, z)] = y === targetTop ? ID.grass : ID.dirt;
      }
    }
  }

  // Spawn clearing — a natural grassy terrace on the south slope, with a
  // broad valley view. Terrain is only carved above the ground level so no
  // water can leak into the meadow.
  const terraceH = 14;
  for (let x = 44; x <= 58; x++) {
    for (let z = 29; z <= 44; z++) {
      const dx = Math.max(0, 47 - x, x - 55);
      const dz = Math.max(0, 32 - z, z - 41);
      const inside = dx === 0 && dz === 0;
      const t = Math.min(1, (dx + dz) / 3);
      const h = inside ? terraceH : Math.max(terraceH - 1, Math.round(terraceH - t * 3));
      for (let y = 0; y < SY; y++) {
        const current = getBlock(w, x, y, z);
        if (y < h - 3) {
          if (current === ID.air || current === ID.water) setBlock(w, x, y, z, ID.stone);
        } else if (y < h - 1) {
          if (current === ID.air || current === ID.water || current === ID.grass) setBlock(w, x, y, z, ID.dirt);
        } else if (y === h - 1) {
          setBlock(w, x, y, z, ID.grass);
        } else {
          setBlock(w, x, y, z, ID.air);
        }
      }
      // mossy stones on the lower rim facing the lake
      if (x === 58 && z >= 31 && z <= 42 && getBlock(w, 58, terraceH - 2, z) === ID.dirt) {
        setBlock(w, 58, terraceH - 2, z, ID.mossyCobble);
        setBlock(w, 59, terraceH - 4, z, ID.stone);
        setBlock(w, 59, terraceH - 3, z, ID.grass);
      }
      if (z === 44 && x >= 47 && x <= 55) setBlock(w, x, terraceH - 2, 44, ID.mossyCobble);
    }
  }
  const stepOut = (x0: number, x1: number, z0: number, z1: number, h: number) => {
    for (let x = x0; x <= x1; x++) {
      for (let z = z0; z <= z1; z++) {
        const rim = x === x0 || x === x1 || z === z0 || z === z1;
        if (rim && getBlock(w, x, h - 1, z) === ID.air) setBlock(w, x, h - 1, z, ID.grass);
        if (rim && getBlock(w, x, h - 2, z) === ID.air) setBlock(w, x, h - 2, z, ID.dirt);
      }
    }
  };
  stepOut(43, 59, 28, 45, terraceH - 1);
  stepOut(42, 60, 27, 46, terraceH - 3);
  stepOut(41, 61, 26, 47, terraceH - 5);

  // grassy lip and single-block path across the terrace
  for (let z = 35; z <= 42; z++) setBlock(w, 54, terraceH - 1, z, ID.path);
  for (let x = 47; x <= 54; x++) setBlock(w, x, terraceH - 1, 33, ID.path);
  for (let x = 44; x <= 58; x++) {
    for (let z = 29; z <= 44; z++) {
      for (let y = 6; y < terraceH - 3; y++) {
        if (getBlock(w, x, y, z) === ID.air) setBlock(w, x, y, z, y < 9 ? ID.stone : ID.dirt);
      }
    }
  }

  // a few benches and decorative shrubs
  setBlock(w, 56, terraceH, 31, ID.planks);
  setBlock(w, 57, terraceH, 31, ID.planks);

  setBlock(w, 45, terraceH, 43, ID.lantern);
  for (const [fx, fz] of [[47, 31], [48, 31], [56, 40], [45, 42], [46, 30]]) setBlock(w, fx, terraceH, fz, ID.tallGrass);

  buildCottage(w, 21, 33);
  for (let x = 65; x <= 71; x++) for (let z = 42; z <= 48; z++) {
    for (let y = 0; y < SY; y++) if (getBlock(w, x, y, z) !== ID.air && y > 11) setBlock(w, x, y, z, ID.air);
    for (let y = 0; y < 12; y++) setBlock(w, x, y, z, y < 4 ? ID.stone : ID.dirt);
    setBlock(w, x, 11, z, ID.grass);
  }
  buildLighthouse(w, 68, 45, 12);
  buildDock(w);
  const towerGround = Math.max(SEA + 2, surfaceHeight(w, 74, 30));
  buildTower(w, 72, 28, towerGround);
  drawPath(w, 29, 47, 43, 44, 3);
  drawPath(w, 43, 44, 48, 42, 3);
  drawPath(w, 48, 42, 52, 39, 2);
  drawPath(w, 52, 39, 55, 36, 2);
  drawPath(w, 31, 47, 43, 53, 2);

  const campGround = Math.max(SEA + 2, surfaceHeight(w, 64, 52));
  for (let x = 60; x <= 71; x++) for (let z = 49; z <= 57; z++) setBlock(w, x, campGround - 1, z, ID.grass);
  buildCamp(w, 62, 50, campGround);
  const archGround = Math.max(SEA + 2, surfaceHeight(w, 38, 60));
  for (let x = 33; x <= 43; x++) for (let z = 58; z <= 62; z++) setBlock(w, x, archGround - 1, z, ID.grass);
  buildArch(w, 38, 60, archGround);
  buildWaterfall(w, 76, 61);

  // Lantern posts along main path
  const posts: [number, number][] = [
    [33, 46],
    [39, 45],
    [44, 44],
    [58, 44],
    [45, 51],
    [58, 51],
  ];
  for (const [x, z] of posts) {
    const y = Math.min(SY - 4, surfaceHeight(w, x, z) + 1);
    setBlock(w, x, y, z, ID.planks);
    setBlock(w, x, y + 1, z, ID.lantern);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        if (getBlock(w, x + dx, y, z + dz) === ID.water) setBlock(w, x + dx, y, z + dz, ID.air);
      }
    }
  }

  // Trees
  for (let gx = 2; gx < SX - 3; gx += 4) {
    for (let gz = 2; gz < SZ - 3; gz += 4) {
      const jx = gx + Math.floor(hash2(gx, gz, seed + 3) * 4);
      const jz = gz + Math.floor(hash2(gx, gz, seed + 8) * 4);
      const r = hash2(jx, jz, seed + 13);
      const h = surfaceHeight(w, jx, jz);
      const groundId = getBlock(w, jx, h - 1, jz);
      if (groundId !== ID.grass && groundId !== ID.dirt) continue;
      if (h <= SEA + 1 || h > 24) continue;
      const nearCottage = jx > 13 && jx < 35 && jz > 26 && jz < 49;
      const nearTerrace = jx > 43 && jx < 58 && jz > 25 && jz < 46;
      const nearSpawn = Math.hypot(jx - 51, jz - 37) < 9;
      const nearTower = Math.hypot(jx - 74, jz - 30) < 7;
      const nearLighthouse = Math.hypot(jx - 68, jz - 45) < 7;
      const nearPath = Math.hypot(jx - 44, jz - 43) < 3;
      if (nearCottage || nearTerrace || nearSpawn || nearTower || nearLighthouse || nearPath || Math.hypot(jx - 51, jz - 38) < 20) continue;
      const forestWest = jx < 30 && r < 0.66;
      const chance = h > 26 ? 0.14 : forestWest ? 0.68 : 0.38;
      if (r > chance) continue;
      const pine = h > 16 || r < 0.18;
      const birch = !pine && r > 0.5 && r < 0.62;
      placeOak(w, jx, jz, h, seed, pine, birch);
    }
  }

  // Hero trees with broad canopies near the lake and spawn
  for (const [x, z, isPine] of [
    [35, 60, false],
    [22, 52, false],
    [24, 24, false],
    [52, 30, true],
    [70, 62, true],
    [30, 25, false],
  ] as [number, number, boolean][]) {
    const h = surfaceHeight(w, x, z);
    if (h > SEA && !(x > 42 && x < 60 && z > 27 && z < 46)) placeOak(w, x, z, h, seed + x, isPine, false);
  }

  // Flowers and ground cover
  for (let x = 1; x < SX - 1; x++) {
    for (let z = 1; z < SZ - 1; z++) {
      const h = surfaceHeight(w, x, z);
      if (h > SEA && getBlock(w, x, h - 1, z) === ID.grass && getBlock(w, x, h, z) === ID.air) {
        const r = hash2(x * 5, z * 7, seed + 23);
        if (r > 0.86) setBlock(w, x, h, z, ID.tallGrass);
        else if (r > 0.83) setBlock(w, x, h, z, r > 0.845 ? ID.flowerRed : ID.flowerYellow);
        else if (r > 0.825 && x > 45 && x < 56 && z > 29 && z < 40) setBlock(w, x, h, z, ID.flowerYellow);
      }
    }
  }

  // A small ruin with a glowing monument on the east ridge
  const ruinY = surfaceHeight(w, 73, 50);
  for (let x = 71; x < 77; x++) {
    for (let z = 48; z < 53; z++) {
      const edge = x === 71 || x === 76 || z === 48 || z === 52;
      if (edge && (x + z) % 2 === 0) {
        setBlock(w, x, ruinY, z, ID.stoneBricks);
        setBlock(w, x, ruinY + 1, z, ID.mossyCobble);
      }
    }
  }
  setBlock(w, 74, ruinY, 50, ID.obsidian);
  setBlock(w, 74, ruinY + 1, 50, ID.glowstone);
  setBlock(w, 74, ruinY + 2, 50, ID.glowstone);
  setBlock(w, 73, ruinY + 1, 50, ID.woolBlue);
  setBlock(w, 75, ruinY + 1, 50, ID.woolYellow);

  // Inland highlands near the border for a dramatic skyline
  for (const [px, pz, radius] of [[18, 16, 22], [238, 20, 26], [24, 238, 24], [232, 232, 20]] as [number, number, number][]) {
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        const x = px + dx;
        const z = pz + dz;
        if (x < 1 || x >= SX - 1 || z < 1 || z >= SZ - 1) continue;
        const d = Math.hypot(dx, dz) / radius;
        if (d > 1) continue;
        const peak = Math.round(SEA + 6 + (1 - d) * (16 + fbm(x * 0.18, z * 0.18, seed + 9) * 14));
        for (let y = 0; y < Math.min(SY, peak); y++) {
          if (y >= peak - 1) blocks[index(x, y, z)] = peak > 32 ? ID.snow : ID.grass;
          else if (y >= peak - 4) blocks[index(x, y, z)] = ID.dirt;
          else blocks[index(x, y, z)] = ID.stone;
        }
      }
    }
  }

  // Recompute surface heights
  for (let x = 0; x < SX; x++) {
    for (let z = 0; z < SZ; z++) {
      for (let y = SY - 1; y >= 0; y--) {
        const b = blocks[index(x, y, z)];
        if (blockDef(b).solid && !blockDef(b).cross) {
          surface[z * SX + x] = y;
          break;
        }
      }
    }
  }

  // keep the two blocks in front of the player's eyes completely clear
  for (let dx = -2; dx <= 2; dx++) {
    for (let dz = -3; dz <= 3; dz++) {
      const bx = Math.floor(w.spawn.x) + dx;
      const bz = Math.floor(w.spawn.z) + dz;
      for (let y = Math.floor(w.spawn.y); y <= Math.floor(w.spawn.y) + 3; y++) setBlock(w, bx, y, bz, ID.air);
    }
  }
  const spawnH = surfaceHeight(w, w.spawn.x, w.spawn.z);
  w.spawn.y = spawnH + 0.2;
  w.waypoints = [
    { id: "spawn", name: "Titik Awal", x: 52, y: spawnH, z: 39, icon: "flag", color: "#f2c45b" },
    { id: "cottage", name: "Pondok Zamrud", x: 33, y: 13, z: 48, icon: "home", color: "#8fd3a4" },
    { id: "farm", name: "Ladang Gandum", x: 16, y: 13, z: 37, icon: "home", color: "#e7c479" },
    { id: "lake", name: "Dermaga Danau", x: 54, y: 12, z: 63, icon: "waves", color: "#6fc6ef" },
    { id: "peak", name: "Puncak Kabut", x: 76, y: surfaceHeight(w, 76, 22), z: 22, icon: "mountain", color: "#e9f2f7" },
    { id: "tower", name: "Menara Pengawas", x: 74, y: towerGround, z: 30, icon: "tower", color: "#d6b58a" },
    { id: "camp", name: "Kemah Penjelajah", x: 65, y: surfaceHeight(w, 65, 53), z: 53, icon: "home", color: "#ffb0a0" },
    { id: "arch", name: "Gerbang Batu", x: 38, y: surfaceHeight(w, 38, 60), z: 60, icon: "sparkles", color: "#bcd6ff" },
    { id: "waterfall", name: "Air Terjun", x: 76, y: SEA + 1, z: 63, icon: "waves", color: "#9fe0ff" },
    { id: "lighthouse", name: "Mercusuar Spawn", x: 68, y: 12, z: 45, icon: "sparkles", color: "#ff9a8a" },
    { id: "ruin", name: "Reruntuhan Timur", x: 74, y: surfaceHeight(w, 74, 50), z: 50, icon: "sparkles", color: "#d8b4fe" },
  ];
  // Generation is deterministic, so structural edits are not persisted as
  // player edits. Only changes made after the world is loaded are saved.
  w.edits.clear();
  return w;
}

// ---------------------------------------------------------------------------
// Voxel raycasting (DDA)
// ---------------------------------------------------------------------------
export interface RayHit {
  x: number;
  y: number;
  z: number;
  nx: number;
  ny: number;
  nz: number;
  id: number;
  distance: number;
}

export function raycastVoxel(
  w: World,
  origin: { x: number; y: number; z: number },
  dir: { x: number; y: number; z: number },
  maxDistance = 80,
  selectPlants = false
): RayHit | null {
  let x = Math.floor(origin.x);
  let y = Math.floor(origin.y);
  let z = Math.floor(origin.z);
  const stepX = dir.x > 0 ? 1 : -1;
  const stepY = dir.y > 0 ? 1 : -1;
  const stepZ = dir.z > 0 ? 1 : -1;
  const tDeltaX = Math.abs(1 / (dir.x || 1e-9));
  const tDeltaY = Math.abs(1 / (dir.y || 1e-9));
  const tDeltaZ = Math.abs(1 / (dir.z || 1e-9));
  let tMaxX = ((dir.x > 0 ? x + 1 - origin.x : origin.x - x) || 1e-6) * tDeltaX;
  let tMaxY = ((dir.y > 0 ? y + 1 - origin.y : origin.y - y) || 1e-6) * tDeltaY;
  let tMaxZ = ((dir.z > 0 ? z + 1 - origin.z : origin.z - z) || 1e-6) * tDeltaZ;
  let nx = 0;
  let ny = 0;
  let nz = 0;
  let distance = 0;
  for (let i = 0; i < 512; i++) {
    if (distance > maxDistance) break;
    const id = getBlock(w, x, y, z);
    const def = blockDef(id);
    if (def.solid || (selectPlants && def.cross && id !== 0)) {
      return { x, y, z, nx, ny, nz, id, distance };
    }
    if (tMaxX < tMaxY && tMaxX < tMaxZ) {
      x += stepX;
      distance = tMaxX;
      tMaxX += tDeltaX;
      nx = -stepX;
      ny = 0;
      nz = 0;
    } else if (tMaxY < tMaxZ) {
      y += stepY;
      distance = tMaxY;
      tMaxY += tDeltaY;
      nx = 0;
      ny = -stepY;
      nz = 0;
    } else {
      z += stepZ;
      distance = tMaxZ;
      tMaxZ += tDeltaZ;
      nx = 0;
      ny = 0;
      nz = -stepZ;
    }
  }
  return null;
}

export function exportWorldState(w: World) {
  return {
    seed: w.seed,
    edits: Array.from(w.edits.entries()),
  };
}

export function applyWorldEdits(w: World, edits: [number, number][]) {
  for (const [i, id] of edits) {
    if (i < 0 || i >= w.blocks.length) continue;
    w.blocks[i] = id;
    w.edits.set(i, id);
  }
  for (let x = 0; x < SX; x++) {
    for (let z = 0; z < SZ; z++) {
      for (let y = SY - 1; y >= 0; y--) {
        const b = w.blocks[index(x, y, z)];
        if (blockDef(b).solid) {
          w.surface[z * SX + x] = y;
          break;
        }
      }
    }
  }
}
