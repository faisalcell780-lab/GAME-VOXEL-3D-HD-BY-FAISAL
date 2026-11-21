import * as THREE from "three";

// ---------------------------------------------------------------------------
// Living world: boxy voxel animals wandering the meadows, plus villager NPCs.
// Everything is built procedurally from simple boxes to match the art style.
// ---------------------------------------------------------------------------

export type MobKind = "cow" | "pig" | "sheep" | "chicken" | "fox";

interface MobInstance {
  kind: MobKind;
  root: THREE.Group;
  legs: THREE.Mesh[];
  head: THREE.Object3D;
  pos: THREE.Vector3;
  target: THREE.Vector3;
  speed: number;
  phase: number;
  timer: number;
}

export interface NpcInstance {
  name: string;
  role: string;
  lines: string[];
  root: THREE.Group;
  pos: THREE.Vector3;
  marker: THREE.Sprite;
  lineIndex: number;
}

export interface MobsRig {
  group: THREE.Group;
  npcs: NpcInstance[];
  update: (
    dt: number,
    player: THREE.Vector3,
    ground: (x: number, z: number) => number,
    isWater: (x: number, z: number) => boolean
  ) => void;
  nearestNpc: (player: THREE.Vector3) => NpcInstance | null;
}

const mat = (color: number, rough = 0.85) =>
  new THREE.MeshStandardMaterial({ color, roughness: Math.min(1, rough + 0.08), metalness: 0, envMapIntensity: 0.3 });

function box(
  w: number,
  h: number,
  d: number,
  material: THREE.Material,
  x = 0,
  y = 0,
  z = 0
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makeAnimal(kind: MobKind): { root: THREE.Group; legs: THREE.Mesh[]; head: THREE.Group } {
  const white = mat(0xf2f0e6);
  const black = mat(0x2b2724);
  const brown = mat(0x8a5a34);
  const tan = mat(0xd8a97c);
  const pink = mat(0xe39aa5);
  const cream = mat(0xf4e3bd);
  const orange = mat(0xd8842f);
  const dark = mat(0x1d1a17);

  const root = new THREE.Group();
  const legs: THREE.Mesh[] = [];
  const head = new THREE.Group();

  if (kind === "cow") {
    root.add(box(1.0, 0.8, 1.7, white, 0, 0.95, 0));
    root.add(box(0.42, 0.5, 0.5, black, -0.26, 1.05, -0.1));
    root.add(box(0.36, 0.4, 0.42, black, 0.3, 0.94, 0.35));
    head.add(box(0.62, 0.55, 0.62, brown, 0, 1.42, -0.92));
    head.add(box(0.62, 0.18, 0.2, cream, 0, 1.28, -1.16));
    head.add(box(0.08, 0.2, 0.08, cream, -0.24, 1.72, -0.86));
    head.add(box(0.08, 0.2, 0.08, cream, 0.24, 1.72, -0.86));
    head.add(box(0.09, 0.09, 0.06, dark, -0.16, 1.5, -1.23));
    head.add(box(0.09, 0.09, 0.06, dark, 0.16, 1.5, -1.23));
    for (const [x, z] of [[-0.32, -0.55], [0.32, -0.55], [-0.32, 0.55], [0.32, 0.55]] as [number, number][]) {
      legs.push(box(0.2, 0.75, 0.2, brown, x, 0.38, z));
    }
  } else if (kind === "pig") {
    root.add(box(0.86, 0.7, 1.25, pink, 0, 0.72, 0));
    head.add(box(0.62, 0.55, 0.5, pink, 0, 1.0, -0.78));
    head.add(box(0.32, 0.24, 0.1, mat(0xd07d8a), 0, 0.95, -1.03));
    head.add(box(0.08, 0.08, 0.05, dark, -0.17, 1.09, -1.02));
    head.add(box(0.08, 0.08, 0.05, dark, 0.17, 1.09, -1.02));
    for (const [x, z] of [[-0.3, -0.4], [0.3, -0.4], [-0.3, 0.42], [0.3, 0.42]] as [number, number][]) {
      legs.push(box(0.18, 0.5, 0.18, pink, x, 0.25, z));
    }
  } else if (kind === "sheep") {
    root.add(box(1.0, 0.95, 1.3, white, 0, 0.9, 0));
    root.add(box(0.34, 0.34, 0.34, cream, 0.3, 1.42, 0.2));
    head.add(box(0.4, 0.42, 0.42, tan, 0, 1.05, -0.82));
    head.add(box(0.08, 0.08, 0.06, dark, -0.1, 1.1, -1.04));
    head.add(box(0.08, 0.08, 0.06, dark, 0.1, 1.1, -1.04));
    for (const [x, z] of [[-0.3, -0.42], [0.3, -0.42], [-0.3, 0.42], [0.3, 0.42]] as [number, number][]) {
      legs.push(box(0.18, 0.45, 0.18, dark, x, 0.23, z));
    }
  } else if (kind === "chicken") {
    root.add(box(0.4, 0.4, 0.5, white, 0, 0.5, 0));
    root.add(box(0.16, 0.3, 0.16, white, 0, 0.68, 0.28));
    head.add(box(0.3, 0.3, 0.28, white, 0, 0.82, -0.3));
    head.add(box(0.12, 0.1, 0.14, orange, 0, 0.8, -0.48));
    head.add(box(0.16, 0.12, 0.1, mat(0xc0392b), 0, 0.95, -0.28));
    head.add(box(0.05, 0.05, 0.04, dark, -0.08, 0.86, -0.43));
    head.add(box(0.05, 0.05, 0.04, dark, 0.08, 0.86, -0.43));
    for (const [x, z] of [[-0.1, 0], [0.1, 0]] as [number, number][]) {
      legs.push(box(0.06, 0.28, 0.06, orange, x, 0.14, z));
    }
  } else {
    root.add(box(0.42, 0.34, 0.9, orange, 0, 0.5, 0));
    root.add(box(0.16, 0.3, 0.16, orange, 0, 0.72, 0.34));
    head.add(box(0.36, 0.32, 0.34, orange, 0, 0.62, -0.56));
    head.add(box(0.3, 0.16, 0.2, cream, 0, 0.53, -0.74));
    head.add(box(0.1, 0.12, 0.1, dark, 0, 0.62, -0.89));
    head.add(box(0.14, 0.14, 0.05, cream, -0.16, 0.78, -0.42));
    head.add(box(0.14, 0.14, 0.05, cream, 0.16, 0.78, -0.42));
    for (const [x, z] of [[-0.14, -0.3], [0.14, -0.3], [-0.14, 0.3], [0.14, 0.3]] as [number, number][]) {
      legs.push(box(0.1, 0.34, 0.1, dark, x, 0.17, z));
    }
  }

  root.add(head);
  for (const leg of legs) root.add(leg);
  return { root, legs, head };
}

function makeVillager(robe: number, hatColor = 0x6b4a2c) {
  const skin = mat(0xe0b184);
  const brown = mat(0x7a5230);
  const dark = mat(0x1d1a17);
  const robeMat = new THREE.MeshStandardMaterial({ color: robe, roughness: 0.9, metalness: 0, envMapIntensity: 0.25 });
  const apron = mat(0xd8cdb2);
  const root = new THREE.Group();

  // torso + apron + belt
  root.add(box(0.62, 0.78, 0.42, robeMat, 0, 1.0, 0));
  root.add(box(0.44, 0.5, 0.04, apron, 0, 0.95, -0.23));
  root.add(box(0.64, 0.09, 0.44, brown, 0, 0.68, 0));

  // arms with sleeves + hands
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.add(box(0.16, 0.46, 0.18, robeMat, 0, -0.2, 0));
    arm.add(box(0.16, 0.16, 0.18, skin, 0, -0.48, 0));
    arm.position.set(side * 0.39, 1.34, 0);
    arm.rotation.z = side * 0.06;
    root.add(arm);
  }

  // legs + shoes
  root.add(box(0.22, 0.56, 0.24, robeMat, -0.16, 0.3, 0));
  root.add(box(0.22, 0.56, 0.24, robeMat, 0.16, 0.3, 0));
  root.add(box(0.24, 0.14, 0.3, brown, -0.16, 0.07, -0.03));
  root.add(box(0.24, 0.14, 0.3, brown, 0.16, 0.07, -0.03));

  // head: skin, eyes, brows, mouth, nose, hair, wide-brim hat
  const head = new THREE.Group();
  head.add(box(0.5, 0.5, 0.5, skin, 0, 0, 0));
  head.add(box(0.09, 0.09, 0.04, dark, -0.12, 0.06, -0.26));
  head.add(box(0.09, 0.09, 0.04, dark, 0.12, 0.06, -0.26));
  head.add(box(0.12, 0.03, 0.03, dark, -0.12, 0.15, -0.265));
  head.add(box(0.12, 0.03, 0.03, dark, 0.12, 0.15, -0.265));
  head.add(box(0.2, 0.03, 0.04, mat(0x8c5a44), 0, -0.14, -0.26));
  head.add(box(0.12, 0.14, 0.14, skin, 0, -0.04, -0.3));
  head.add(box(0.52, 0.14, 0.52, mat(0x4a3624), 0, 0.23, 0));
  head.add(box(0.62, 0.07, 0.62, mat(hatColor), 0, 0.31, 0));
  head.add(box(0.36, 0.12, 0.36, mat(hatColor), 0, 0.4, 0));
  head.position.set(0, 2.08, 0);
  root.add(head);
  return root;
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function makeNameTag(name: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "rgba(5,16,10,.82)";
  roundedRect(ctx, 6, 26, 500, 76, 20);
  ctx.fill();
  ctx.strokeStyle = "rgba(167,235,118,.55)";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.font = "600 42px 'Plus Jakarta Sans', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#f0ffe4";
  ctx.fillText(name, 256, 66);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, depthTest: false })
  );
  sprite.scale.set(1.9, 0.48, 1);
  return sprite;
}

function makeMarker() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "rgba(6,18,11,.86)";
  roundedRect(ctx, 14, 14, 100, 100, 26);
  ctx.fill();
  ctx.strokeStyle = "rgba(167,235,118,.95)";
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.font = "bold 74px 'Plus Jakarta Sans', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#dcffbc";
  ctx.fillText("!", 64, 66);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, depthTest: false })
  );
  sprite.scale.set(0.42, 0.42, 0.42);
  return sprite;
}

export function createMobs(spawn: { x: number; z: number }): MobsRig {
  const group = new THREE.Group();
  const mobs: MobInstance[] = [];

  const spawnPoints: [MobKind, number, number][] = [
    ["cow", 4, -4], ["cow", -6, 5], ["cow", 11, 7], ["cow", 16, 13],
    ["pig", -5, -7], ["pig", 8, -9], ["pig", -10, 3],
    ["sheep", 6, 10], ["sheep", -8, -3], ["sheep", 13, -5], ["sheep", -13, -11],
    ["chicken", 3, 6], ["chicken", -4, 9], ["chicken", 9, 3],
    ["fox", -11, 8],
  ];

  for (const [kind, dx, dz] of spawnPoints) {
    const { root, legs, head } = makeAnimal(kind);
    const x = spawn.x + dx;
    const z = spawn.z + dz;
    root.position.set(x, 14, z);
    root.rotation.y = Math.random() * Math.PI * 2;
    group.add(root);
    mobs.push({
      kind,
      root,
      legs,
      head,
      pos: new THREE.Vector3(x, 14, z),
      target: new THREE.Vector3(x, 14, z),
      speed: kind === "chicken" ? 1.3 : kind === "fox" ? 1.8 : 0.95,
      phase: Math.random() * Math.PI * 2,
      timer: Math.random() * 4,
    });
  }

  const npcDefs = [
    {
      name: "Petani Arum",
      role: "Petani",
      robe: 0x5d7f45,
      dx: -3,
      dz: -2,
      lines: [
        "Selamat datang di Lembah Zamrud, pengelana!",
        "Gandum di ladangku butuh sinar matahari — mampir kalau sempat.",
        "Butuh papan? Tebang saja pohon di pinggir jalan.",
      ],
    },
    {
      name: "Penjaga Bima",
      role: "Penjaga Desa",
      robe: 0x3f5c86,
      dx: 3,
      dz: -5,
      lines: [
        "Aku menjaga teras desa sejak menara berdiri.",
        "Malam ini langit cerah — kunang-kunang akan menari.",
        "Hati-hati saat terbang, angin di puncak cukup kencang.",
      ],
    },
  ];

  const npcs: NpcInstance[] = [];
  for (const def of npcDefs) {
    const root = makeVillager(def.robe);
    const marker = makeMarker();
    marker.position.set(0, 3.1, 0);
    root.add(marker);
    const nameTag = makeNameTag(def.name);
    nameTag.position.set(0, 2.55, 0);
    root.add(nameTag);
    const pos = new THREE.Vector3(spawn.x + def.dx, 14, spawn.z + def.dz);
    root.position.copy(pos);
    group.add(root);
    npcs.push({ name: def.name, role: def.role, lines: def.lines, root, pos, marker, lineIndex: 0 });
  }

  const nearestNpc = (player: THREE.Vector3) => {
    let best: NpcInstance | null = null;
    let bestDist = 4.5;
    for (const npc of npcs) {
      const d = npc.pos.distanceTo(player);
      if (d < bestDist) {
        best = npc;
        bestDist = d;
      }
    }
    return best;
  };

  let time = 0;
  const update = (
    dt: number,
    player: THREE.Vector3,
    ground: (x: number, z: number) => number,
    isWater: (x: number, z: number) => boolean
  ) => {
    time += dt;
    const maxStep = Math.min(dt, 0.05);

    for (const mob of mobs) {
      mob.timer -= maxStep;
      const here = ground(mob.pos.x, mob.pos.z);
      mob.pos.y = here;

      const distToTarget = Math.hypot(mob.target.x - mob.pos.x, mob.target.z - mob.pos.z);
      if (mob.timer <= 0 || distToTarget < 0.6) {
        mob.timer = 2.5 + Math.random() * 4;
        const angle = Math.random() * Math.PI * 2;
        const radius = 3 + Math.random() * 7;
        const tx = mob.pos.x + Math.cos(angle) * radius;
        const tz = mob.pos.z + Math.sin(angle) * radius;
        if (!isWater(tx, tz)) mob.target.set(tx, ground(tx, tz), tz);
      }

      if (distToTarget > 0.7) {
        const dirX = (mob.target.x - mob.pos.x) / distToTarget;
        const dirZ = (mob.target.z - mob.pos.z) / distToTarget;
        const nextX = mob.pos.x + dirX * mob.speed * maxStep;
        const nextZ = mob.pos.z + dirZ * mob.speed * maxStep;
        if (!isWater(nextX, nextZ)) {
          mob.pos.x = nextX;
          mob.pos.z = nextZ;
          mob.root.rotation.y = Math.atan2(dirX, dirZ);
        } else {
          mob.timer = 0;
        }
        const walk = time * 7 + mob.phase;
        mob.legs.forEach((leg, i) => {
          leg.rotation.x = Math.sin(walk + (i % 2 === 0 ? 0 : Math.PI)) * 0.5;
        });
      } else {
        mob.legs.forEach((leg) => {
          leg.rotation.x *= 0.85;
        });
        mob.head.rotation.y = Math.sin(time * 1.4 + mob.phase) * 0.08;
        mob.head.rotation.x = Math.sin(time * 0.8 + mob.phase) * 0.05;
      }
      mob.root.position.set(mob.pos.x, here + Math.abs(Math.sin(time * 7 + mob.phase)) * 0.04, mob.pos.z);
    }

    for (const npc of npcs) {
      const y = ground(npc.pos.x, npc.pos.z);
      npc.pos.y = y;
      const dx = player.x - npc.pos.x;
      const dz = player.z - npc.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 9) {
        const targetYaw = Math.atan2(dx, dz);
        const diff = Math.atan2(
          Math.sin(targetYaw - npc.root.rotation.y),
          Math.cos(targetYaw - npc.root.rotation.y)
        );
        npc.root.rotation.y += diff * Math.min(1, dt * 4);
      }
      npc.marker.position.y = 3.1 + Math.sin(time * 2.2) * 0.06;
      npc.marker.visible = dist < 16;
      npc.root.position.set(npc.pos.x, y + Math.sin(time * 1.6 + npc.pos.x) * 0.02, npc.pos.z);
    }
  };

  return { group, npcs, update, nearestNpc };
}
