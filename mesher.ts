import * as THREE from "three";
import {
  BLOCKS,
  SX,
  SY,
  SZ,
  blockDef,
  getBlock,
  ID,
  type World,
} from "./world";
import { getAtlas } from "./textures";

export const AO_SHADE = [0.5, 0.7, 0.86, 1];
const FACE_LIGHT = [0.78, 0.62, 1, 0.48, 0.86, 0.8];

interface FaceDef {
  dir: [number, number, number];
  n: [number, number, number];
  verts: [number, number, number][];
  tile: "top" | "side" | "bottom";
}

const FACES: FaceDef[] = [
  {
    dir: [1, 0, 0],
    n: [1, 0, 0],
    verts: [
      [1, 0, 1],
      [1, 0, 0],
      [1, 1, 0],
      [1, 1, 1],
    ],
    tile: "side",
  },
  {
    dir: [-1, 0, 0],
    n: [-1, 0, 0],
    verts: [
      [0, 0, 0],
      [0, 0, 1],
      [0, 1, 1],
      [0, 1, 0],
    ],
    tile: "side",
  },
  {
    dir: [0, 1, 0],
    n: [0, 1, 0],
    verts: [
      [0, 1, 1],
      [1, 1, 1],
      [1, 1, 0],
      [0, 1, 0],
    ],
    tile: "top",
  },
  {
    dir: [0, -1, 0],
    n: [0, -1, 0],
    verts: [
      [0, 0, 0],
      [1, 0, 0],
      [1, 0, 1],
      [0, 0, 1],
    ],
    tile: "bottom",
  },
  {
    dir: [0, 0, 1],
    n: [0, 0, 1],
    verts: [
      [0, 0, 1],
      [1, 0, 1],
      [1, 1, 1],
      [0, 1, 1],
    ],
    tile: "side",
  },
  {
    dir: [0, 0, -1],
    n: [0, 0, -1],
    verts: [
      [1, 0, 0],
      [0, 0, 0],
      [0, 1, 0],
      [1, 1, 0],
    ],
    tile: "side",
  },
];

const UV_ORDER: [number, number][] = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
];

function blockTint(x: number, y: number, z: number): number {
  let h = Math.imul(x * 73856093, 19349663) ^ Math.imul(y * 83492791, 2654435761) ^ Math.imul(z * 425989, 2246822519);
  h = h >>> 0;
  return 0.955 + ((h % 1000) / 1000) * 0.09;
}

function isOccluder(w: World, x: number, y: number, z: number): number {
  const b = getBlock(w, x, y, z);
  const def = BLOCKS[b];
  if (!def || !def.opaque) return 0;
  return 1;
}

interface Buffers {
  pos: number[];
  norm: number[];
  uv: number[];
  col: number[];
  idx: number[];
}

const makeBuffers = (): Buffers => ({ pos: [], norm: [], uv: [], col: [], idx: [] });

function toGeometry(buf: Buffers): THREE.BufferGeometry | null {
  if (buf.idx.length === 0) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(buf.pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(buf.norm, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(buf.uv, 2));
  g.setAttribute("color", new THREE.Float32BufferAttribute(buf.col, 3));
  g.setIndex(buf.idx);
  g.computeBoundingSphere();
  return g;
}

const tangentAxes = (n: [number, number, number]): [number, number] => {
  if (n[0] !== 0) return [1, 2]; // z, y
  if (n[1] !== 0) return [0, 2]; // x, z
  return [0, 1]; // x, y
};

function pushFace(
  buf: Buffers,
  w: World,
  x: number,
  y: number,
  z: number,
  face: FaceDef,
  blockId: number,
  uvs: [number, number, number, number],
  tint: number,
  faceIdx: number
) {
  const def = BLOCKS[blockId];
  const u0 = uvs[0];
  const v0 = uvs[1];
  const u1 = uvs[2];
  const v1 = uvs[3];
  const start = buf.pos.length / 3;
  const axes = tangentAxes(face.n);
  for (let i = 0; i < 4; i++) {
    const v = face.verts[i];
    buf.pos.push(x + v[0], y + v[1], z + v[2]);
    buf.norm.push(face.n[0], face.n[1], face.n[2]);
    const tu = UV_ORDER[i];
    buf.uv.push(u0 + tu[0] * (u1 - u0), v0 + tu[1] * (v1 - v0));
    // ambient occlusion sampling
    const s: number[] = [0, 0, 0];
    s[axes[0]] = v[axes[0]] === 1 ? 1 : -1;
    s[axes[1]] = v[axes[1]] === 1 ? 1 : -1;
    const bx = x + face.dir[0];
    const by = y + face.dir[1];
    const bz = z + face.dir[2];
    const s1 = isOccluder(w, bx + (axes[0] === 0 ? s[0] : 0), by + (axes[0] === 1 ? s[1] : 0), bz + (axes[0] === 2 ? s[2] : 0));
    const s2 = isOccluder(w, bx + (axes[1] === 0 ? s[0] : 0), by + (axes[1] === 1 ? s[1] : 0), bz + (axes[1] === 2 ? s[2] : 0));
    const c1 = isOccluder(w, bx + s[0], by + s[1], bz + s[2]);
    const aoIndex = s1 && s2 ? 0 : 3 - (s1 + s2 + c1);
    const shade = AO_SHADE[aoIndex] * FACE_LIGHT[faceIdx] * tint;
    buf.col.push(shade, shade, shade);
  }
  buf.idx.push(start, start + 1, start + 2, start, start + 2, start + 3);
  void def;
}

function pushCross(buf: Buffers, x: number, y: number, z: number, uvs: [number, number, number, number], tint: number, seed: number) {
  const u0 = uvs[0];
  const v0 = uvs[1];
  const u1 = uvs[2];
  const v1 = uvs[3];
  const offset = ((seed % 100) / 100 - 0.5) * 0.22;
  const planes: [number, number, number, number][] = [
    [-0.42, -0.42, 0.42, 0.42],
    [-0.42, 0.42, 0.42, -0.42],
  ];
  for (const [ax, az, bx, bz] of planes) {
    const start = buf.pos.length / 3;
    const h = 0.94;
    const verts: [number, number, number][] = [
      [x + 0.5 + ax + offset, y, z + 0.5 + az + offset],
      [x + 0.5 + bx + offset, y, z + 0.5 + bz + offset],
      [x + 0.5 + bx + offset, y + h, z + 0.5 + bz + offset],
      [x + 0.5 + ax + offset, y + h, z + 0.5 + az + offset],
    ];
    for (let i = 0; i < 4; i++) {
      buf.pos.push(...verts[i]);
      buf.norm.push(0, 1, 0);
      buf.uv.push(i === 0 || i === 3 ? u0 : u1, i < 2 ? v0 : v1);
      const shade = 0.98 * tint;
      buf.col.push(shade, shade, shade);
    }
    buf.idx.push(start, start + 1, start + 2, start, start + 2, start + 3);
  }
}

export interface ChunkGeometry {
  opaque: THREE.BufferGeometry | null;
  cutout: THREE.BufferGeometry | null;
  plants: THREE.BufferGeometry | null;
  translucent: THREE.BufferGeometry | null;
  water: THREE.BufferGeometry | null;
  emissive: THREE.BufferGeometry | null;
}

export function buildChunkGeometry(w: World, cx: number, cz: number): ChunkGeometry {
  const { uv } = getAtlas();
  const opaque = makeBuffers();
  const cutout = makeBuffers();
  const plants = makeBuffers();
  const translucent = makeBuffers();
  const water = makeBuffers();
  const emissive = makeBuffers();
  const x0 = cx * 16;
  const z0 = cz * 16;
  const x1 = Math.min(SX, x0 + 16);
  const z1 = Math.min(SZ, z0 + 16);

  for (let x = x0; x < x1; x++) {
    for (let z = z0; z < z1; z++) {
      for (let y = 0; y < SY; y++) {
        const id = w.blocks[(y * SZ + z) * SX + x];
        if (id === 0) continue;
        const def = BLOCKS[id];
        if (!def) continue;
        const tint = blockTint(x, y, z);

        if (id === ID.water || id === ID.lava) {
          // liquid sides; the top surface is a single animated ocean/lake plane
          for (let fi = 0; fi < FACES.length; fi++) {
            const face = FACES[fi];
            if (face.dir[1] === 1) continue;
            const nId = getBlock(w, x + face.dir[0], y + face.dir[1], z + face.dir[2]);
            if (nId === id) continue;
            if (blockDef(nId).opaque) continue;
            const uvs = uv[def.tex.side];
            pushFace(water, w, x, y, z, face, id, uvs, tint * 0.92, fi);
          }
          continue;
        }

        if (def.cross) {
          pushCross(plants, x, y, z, uv[def.tex.side], tint, x * 31 + y * 7 + z * 13);
          continue;
        }

        if (def.light > 0 && id !== ID.lava) {
          for (let fi = 0; fi < FACES.length; fi++) {
            const face = FACES[fi];
            const nId = getBlock(w, x + face.dir[0], y + face.dir[1], z + face.dir[2]);
            const nDef = BLOCKS[nId] ?? BLOCKS[0];
            if (nDef.opaque) continue;
            pushFace(emissive, w, x, y, z, face, id, uv[def.tex[face.tile]], 1, fi);
          }
        }

        for (let fi = 0; fi < FACES.length; fi++) {
          const face = FACES[fi];
          const nId = getBlock(w, x + face.dir[0], y + face.dir[1], z + face.dir[2]);
          const nDef = BLOCKS[nId] ?? BLOCKS[0];
          if (nId === id && !def.opaque) continue;
          if (nDef.opaque) continue;
          if (def.cutout && nDef.cutout && def.id !== nDef.id) {
            // different foliage types still connect visually
          }
          const tile = def.tex[face.tile];
          const target = def.opaque ? opaque : def.cutout ? cutout : translucent;
          pushFace(target, w, x, y, z, face, id, uv[tile], tint, fi);
        }
      }
    }
  }

  return {
    opaque: toGeometry(opaque),
    cutout: toGeometry(cutout),
    plants: toGeometry(plants),
    translucent: toGeometry(translucent),
    water: toGeometry(water),
    emissive: toGeometry(emissive),
  };
}

export function disposeChunkGeometry(c: ChunkGeometry) {
  c.opaque?.dispose();
  c.cutout?.dispose();
  c.plants?.dispose();
  c.translucent?.dispose();
  c.water?.dispose();
  c.emissive?.dispose();
}

export function mapColorForBlock(id: number): string {
  return BLOCKS[id]?.mapColor ?? "#7a8c55";
}

export function worldMapPixels(w: World): Uint8ClampedArray {
  const data = new Uint8ClampedArray(SX * SZ * 4);
  for (let z = 0; z < SZ; z++) {
    for (let x = 0; x < SX; x++) {
      const top = w.surface[z * SX + x];
      let id = w.blocks[(top * SZ + z) * SX + x];
      const above = top + 1 < SY ? w.blocks[((top + 1) * SZ + z) * SX + x] : 0;
      if (above === ID.water) id = ID.water;
      const color = mapColorForBlock(id);
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      const shade = 0.86 + ((x * 37 + z * 91) % 100) / 100 * 0.24;
      const i = (z * SX + x) * 4;
      data[i] = r * shade;
      data[i + 1] = g * shade;
      data[i + 2] = b * shade;
      data[i + 3] = 255;
    }
  }
  return data;
}
