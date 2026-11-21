import * as THREE from "three";
import { radialGlow, tileCanvas, TILE_NAMES } from "./textures";
import { BLOCKS, ID } from "./world";

export interface SkyState {
  sunDir: THREE.Vector3;
  top: THREE.Color;
  horizon: THREE.Color;
  bottom: THREE.Color;
  sun: THREE.Color;
  day: number;
  dusk: number;
  night: number;
}

const C = (hex: string) => new THREE.Color(hex);

export function computeSky(time: number): SkyState {
  const t = ((time % 24) + 24) % 24;
  const angle = ((t - 6) / 12) * Math.PI;
  const sunDir = new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0.32).normalize();
  const day = THREE.MathUtils.smoothstep(sunDir.y, -0.12, 0.35);
  const dusk = Math.max(0, 1 - Math.abs(sunDir.y) / 0.38);
  const night = 1 - THREE.MathUtils.smoothstep(sunDir.y, -0.15, 0.12);
  const top = C("#050a18").lerp(C("#2a72cf"), day).lerp(C("#4b4a7f"), dusk * 0.55);
  const horizon = C("#0d1730").lerp(C("#a9daf7"), day).lerp(C("#ff8f4a"), dusk * 0.84);
  const bottom = C("#060f1d").lerp(C("#5fa3c8"), day).lerp(C("#b9683f"), dusk * 0.55);
  const sun = C("#9fc0ff").lerp(C("#fff5dc"), day).lerp(C("#ffb36b"), dusk);
  return { sunDir, top, horizon, bottom, sun, day, dusk, night };
}

// ---------------------------------------------------------------------------
// Sky, stars, sun, moon and clouds
// ---------------------------------------------------------------------------
const skyVertex = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vWorld = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const skyFragment = /* glsl */ `
  varying vec3 vWorld;
  uniform vec3 topColor;
  uniform vec3 horizonColor;
  uniform vec3 bottomColor;
  uniform vec3 sunColor;
  uniform vec3 sunDir;
  uniform float sunStrength;
  uniform float uAurora;
  void main() {
    vec3 dir = normalize(vWorld);
    float h = dir.y;
    vec3 col = mix(bottomColor, horizonColor, smoothstep(-0.12, 0.09, h));
    col = mix(col, topColor, smoothstep(0.04, 0.85, h));
    float sunAmt = max(dot(dir, normalize(sunDir)), 0.0);
    col += sunColor * pow(sunAmt, 1400.0) * 4.0;
    col += sunColor * pow(sunAmt, 24.0) * 0.06 * sunStrength;
    col += sunColor * pow(max(0.0, 1.0 - abs(h)), 22.0) * 0.14 * sunStrength;
    // --- aurora borealis at night -------------------------------------------
    float night = uAurora;
    float a1 = sin(dir.x * 5.2 + dir.z * 2.4 + sunStrength) * 0.5 + 0.5;
    float a2 = sin(dir.x * 1.5 - dir.z * 6.8 + 1.7) * 0.5 + 0.5;
    float band = smoothstep(0.02, 0.32, h) * smoothstep(0.72, 0.24, h);
    float curtain = pow(a1 * a2, 2.2) * band;
    vec3 aurora = mix(vec3(0.15, 0.95, 0.55), vec3(0.35, 0.35, 0.95), a2);
    col += aurora * curtain * night * 0.55;
    gl_FragColor = vec4(col, 1.0);
  }
`;

export interface SkyRig {
  sky: THREE.Mesh;
  sunSprite: THREE.Sprite;
  moonSprite: THREE.Sprite;
  stars: THREE.Points;
  clouds: THREE.Group;
  islands: THREE.Group;
  update: (state: SkyState, elapsed: number) => void;
}

function moonTexture(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 10, 64, 64, 62);
  g.addColorStop(0, "rgba(245,248,255,1)");
  g.addColorStop(0.35, "rgba(224,235,255,.9)");
  g.addColorStop(0.48, "rgba(200,220,255,.35)");
  g.addColorStop(1, "rgba(160,190,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = "rgba(180,196,220,.4)";
  for (const [x, y, r] of [
    [48, 50, 9],
    [76, 62, 13],
    [58, 82, 7],
    [84, 42, 6],
  ]) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  return canvas;
}

function sunTexture(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,246,1)");
  g.addColorStop(0.14, "rgba(255,246,208,1)");
  g.addColorStop(0.3, "rgba(255,216,140,.75)");
  g.addColorStop(0.72, "rgba(255,180,90,.16)");
  g.addColorStop(1, "rgba(255,160,60,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  ctx.save();
  ctx.translate(64, 64);
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 12; i++) {
    ctx.rotate(Math.PI / 6);
    const ray = ctx.createLinearGradient(0, 0, 0, -62);
    ray.addColorStop(0, "rgba(255,236,180,.35)");
    ray.addColorStop(1, "rgba(255,220,150,0)");
    ctx.fillStyle = ray;
    ctx.beginPath();
    ctx.moveTo(-2.5, -12);
    ctx.lineTo(2.5, -12);
    ctx.lineTo(6, -62);
    ctx.lineTo(-6, -62);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  return canvas;
}

function createClouds(): THREE.Group {
  const group = new THREE.Group();
  const material = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 0.9,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    fog: false,
  });
  const count = 120;
  const geo = new THREE.SphereGeometry(1, 7, 5);
  const mesh = new THREE.InstancedMesh(geo, material, count);
  const matrix = new THREE.Matrix4();
  const color = new THREE.Color();
  let i = 0;
  const clusters: [number, number, number][] = [];
  for (let c = 0; c < 12; c++) {
    clusters.push([(Math.random() - 0.5) * 900, 86 + Math.random() * 42, (Math.random() - 0.5) * 900]);
  }
  for (const [cx, cy, cz] of clusters) {
    const pieces = 7 + Math.floor(Math.random() * 6);
    for (let p = 0; p < pieces && i < count; p++) {
      const w = 12 + Math.random() * 26;
      const h = 3.5 + Math.random() * 4.5;
      const d = 11 + Math.random() * 22;
      matrix.compose(
        new THREE.Vector3(cx + (Math.random() - 0.5) * 44, cy + (Math.random() - 0.5) * 6, cz + (Math.random() - 0.5) * 40),
        new THREE.Quaternion(),
        new THREE.Vector3(w, h, d)
      );
      mesh.setMatrixAt(i, matrix);
      const shade = 0.94 + Math.random() * 0.06;
      color.setRGB(shade, shade, shade);
      mesh.setColorAt(i, color);
      i++;
    }
  }
  mesh.count = i;
  mesh.instanceMatrix.needsUpdate = true;
  mesh.instanceColor!.needsUpdate = true;
  mesh.frustumCulled = false;
  group.add(mesh);
  group.userData.material = material;
  return group;
}

function createDistantIslands(): THREE.Group {
  const group = new THREE.Group();
  const count = 900;
  const mesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshLambertMaterial({ color: 0xffffff }),
    count
  );
  const matrix = new THREE.Matrix4();
  const color = new THREE.Color();
  let n = 0;
  const rng = (() => {
    let s = 424242;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  })();
  const islands = 4;
  for (let isl = 0; isl < islands; isl++) {
    const angle = (isl / islands) * Math.PI * 2 + 0.5;
    const dist = 230 + rng() * 190;
    const cx = Math.cos(angle) * dist;
    const cz = Math.sin(angle) * dist;
    const cell = 4.6 + rng() * 2;
    const radius = 6 + Math.floor(rng() * 3);
    for (let x = -radius; x <= radius; x++) {
      for (let z = -radius; z <= radius; z++) {
        if (n >= count) break;
        const d = Math.hypot(x, z) / radius;
        if (d > 1) continue;
        if (rng() > 0.92) continue;
        const height = Math.max(1, Math.round((1 - d) * (5 + rng() * 5) + rng() * 1.6));
        const px = cx + x * cell;
        const pz = cz + z * cell;
        const py = 8 + height * cell * 0.5;
        matrix.compose(
          new THREE.Vector3(px, py + height * cell * 0.5, pz),
          new THREE.Quaternion(),
          new THREE.Vector3(cell * 1.02, height * cell, cell * 1.02)
        );
        mesh.setMatrixAt(n, matrix);
        const top = height > 7;
        const shore = d > 0.72;
        if (top) color.setRGB(0.88, 0.93, 0.98);
        else if (shore) color.setRGB(0.62, 0.7, 0.48);
        else color.setRGB(0.32 + rng() * 0.08, 0.42 + rng() * 0.08, 0.28 + rng() * 0.06);
        mesh.setColorAt(n, color);
        n++;
      }
    }
  }
  mesh.count = n;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  group.add(mesh);
  return group;
}

export function createSkyRig(scene: THREE.Scene): SkyRig {
  const uniforms = {
    topColor: { value: new THREE.Color("#3f86d5") },
    horizonColor: { value: new THREE.Color("#d3ebff") },
    bottomColor: { value: new THREE.Color("#0b1a2d") },
    sunColor: { value: new THREE.Color("#fff2d0") },
    sunDir: { value: new THREE.Vector3(0.4, 0.7, 0.3) },
    sunStrength: { value: 1 },
    uAurora: { value: 0 },
  };
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(1500, 40, 28),
    new THREE.ShaderMaterial({
      uniforms,
      vertexShader: skyVertex,
      fragmentShader: skyFragment,
      side: THREE.BackSide,
      depthWrite: false,
    })
  );
  sky.frustumCulled = false;
  scene.add(sky);

  const sunSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(sunTexture()),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    })
  );
  sunSprite.scale.setScalar(170);
  scene.add(sunSprite);

  const moonSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(moonTexture()),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      opacity: 0,
    })
  );
  moonSprite.scale.setScalar(95);
  scene.add(moonSprite);

  // stars
  const starCount = 1400;
  const positions = new Float32Array(starCount * 3);
  const colors = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(1300);
    v.y = Math.abs(v.y) * 0.95 + 40;
    positions.set([v.x, v.y, v.z], i * 3);
    const warm = Math.random();
    colors.set([0.85 + warm * 0.15, 0.9, 1.0], i * 3);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  starGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const stars = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({
      size: 2.1,
      sizeAttenuation: false,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      toneMapped: false,
    })
  );
  scene.add(stars);

  const clouds = createClouds();
  scene.add(clouds);
  const islands = createDistantIslands();
  scene.add(islands);
  islands.visible = false;

  const sunMap = sunSprite.material.map;
  const update = (state: SkyState, elapsed: number) => {
    uniforms.topColor.value.copy(state.top);
    uniforms.horizonColor.value.copy(state.horizon);
    uniforms.bottomColor.value.copy(state.bottom);
    uniforms.sunColor.value.copy(state.sun);
    uniforms.sunDir.value.copy(state.sunDir);
    uniforms.sunStrength.value = 0.2 + state.day;
    uniforms.uAurora.value = state.sunDir.y < -0.12 ? Math.min(1, (-state.sunDir.y - 0.12) * 4) * 0.8 : 0;
    const sunPos = state.sunDir.clone().multiplyScalar(1150);
    sunSprite.position.copy(sunPos);
    sunSprite.visible = state.sunDir.y > -0.06;
    sunSprite.material.opacity = THREE.MathUtils.smoothstep(state.sunDir.y, -0.15, 0.05);
    moonSprite.visible = state.sunDir.y < 0.12;
    sunSprite.material.color.copy(state.sun);
    scene.userData.sun = state.sunDir;
    moonSprite.position.copy(sunDirMoon(state.sunDir).multiplyScalar(1150));
    moonSprite.material.opacity = state.night * 0.9;
    const twinkle = 0.86 + Math.sin(elapsed * 1.7) * 0.06 + Math.sin(elapsed * 3.9) * 0.04;
    const starVisibility = state.sunDir.y < -0.08 ? Math.min(1, (-state.sunDir.y - 0.08) * 4.5) : 0;
    (stars.material as THREE.PointsMaterial).opacity = starVisibility * 0.95 * twinkle;
    stars.visible = starVisibility > 0.01;

    stars.rotation.y = elapsed * 0.003;
    void sunMap;
    const cloudBase = 0.34 + state.day * 0.5;
    const cm = clouds.userData.material as THREE.MeshLambertMaterial;
    cm.color.setRGB(cloudBase + state.dusk * 0.24, cloudBase + state.dusk * 0.12, cloudBase + state.dusk * 0.06);
    cm.emissive.copy(state.horizon).lerp(new THREE.Color("#ffffff"), 0.6).multiplyScalar(0.1 + state.day * 0.16);
    cm.opacity = 0.4 + state.day * 0.12;
    clouds.position.x = ((elapsed * 1.1) % 160) - 80;
  };

  return { sky, sunSprite, moonSprite, stars, clouds, islands, update };
}

function sunDirMoon(sunDir: THREE.Vector3) {
  return new THREE.Vector3(-sunDir.x, -sunDir.y, -sunDir.z).normalize();
}

// ---------------------------------------------------------------------------
// Environment / reflection map
// ---------------------------------------------------------------------------
export function createEnvironmentMap(renderer: THREE.WebGLRenderer, state: SkyState, generator?: THREE.PMREMGenerator): { texture: THREE.Texture; generator: THREE.PMREMGenerator } {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, `#${state.top.getHexString()}`);
  grad.addColorStop(0.42, `#${state.horizon.getHexString()}`);
  grad.addColorStop(0.5, `#${state.horizon.getHexString()}`);
  grad.addColorStop(0.56, `#${state.bottom.getHexString()}`);
  grad.addColorStop(1, `#${new THREE.Color("#0a1b27").getHexString()}`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 512);

  // sun glow position on equirectangular map
  const u = 0.5 + Math.atan2(state.sunDir.z, state.sunDir.x) / (Math.PI * 2);
  const v = 0.5 - Math.asin(state.sunDir.y) / Math.PI;
  const sx = ((u + 1) % 1) * 1024;
  const sy = Math.max(0, Math.min(1, v)) * 512;
  const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, 190);
  glow.addColorStop(0, "rgba(255,250,230,1)");
  glow.addColorStop(0.08, "rgba(255,238,190,.9)");
  glow.addColorStop(0.35, "rgba(255,205,140,.25)");
  glow.addColorStop(1, "rgba(255,180,100,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 1024, 512);

  // soft cloud bands for interesting sky reflections
  for (let i = 0; i < 40; i++) {
    const y = 70 + Math.random() * 150;
    const x = Math.random() * 1024;
    const w = 40 + Math.random() * 130;
    const h = 4 + Math.random() * 12;
    const cg = ctx.createRadialGradient(x, y, 1, x, y, w);
    cg.addColorStop(0, `rgba(255,255,255,${0.08 + state.day * 0.16})`);
    cg.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = cg;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, h / w);
    ctx.beginPath();
    ctx.arc(0, 0, w, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  const pmrem = generator ?? new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromEquirectangular(texture).texture;
  texture.dispose();
  return { texture: env, generator: pmrem };
}

// ---------------------------------------------------------------------------
// Character
// ---------------------------------------------------------------------------
export interface CharacterRig {
  group: THREE.Group;
  update: (dt: number, moving: boolean, airborne: boolean, speed: number) => void;
  setHeld: (id: number) => void;
  setVisible: (v: boolean) => void;
}

function faceTexture(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#d9a37b";
  ctx.fillRect(0, 0, 32, 32);
  ctx.fillStyle = "#5a3a22";
  ctx.fillRect(0, 0, 32, 7);
  ctx.fillRect(0, 7, 4, 4);
  ctx.fillRect(28, 7, 4, 4);
  ctx.fillStyle = "#452a17";
  ctx.fillRect(4, 9, 3, 2);
  ctx.fillRect(25, 9, 3, 2);
  ctx.fillStyle = "#f8fbf6";
  ctx.fillRect(7, 13, 6, 5);
  ctx.fillRect(19, 13, 6, 5);
  ctx.fillStyle = "#245a5a";
  ctx.fillRect(9, 14, 3, 4);
  ctx.fillRect(21, 14, 3, 4);
  ctx.fillStyle = "#132e2f";
  ctx.fillRect(10, 15, 2, 2);
  ctx.fillRect(22, 15, 2, 2);
  ctx.fillStyle = "#b87a58";
  ctx.fillRect(13, 20, 6, 2);
  ctx.fillStyle = "#7a4430";
  ctx.fillRect(12, 23, 8, 2);
  ctx.fillStyle = "rgba(255,255,255,.16)";
  ctx.fillRect(0, 0, 32, 2);
  return canvas;
}

export function createCharacter(): CharacterRig {
  const group = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0xd9a37b, roughness: 0.82 });
  const hair = new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 0.9 });
  const shirt = new THREE.MeshStandardMaterial({ color: 0x2f8f83, roughness: 0.8 });
  const sleeve = new THREE.MeshStandardMaterial({ color: 0x2a7f75, roughness: 0.8 });
  const pants = new THREE.MeshStandardMaterial({ color: 0x2c3e63, roughness: 0.85 });
  const shoe = new THREE.MeshStandardMaterial({ color: 0x3b2d24, roughness: 0.9 });
  const belt = new THREE.MeshStandardMaterial({ color: 0x5b3d26, roughness: 0.9 });

  const faceMap = new THREE.CanvasTexture(faceTexture());
  faceMap.magFilter = THREE.NearestFilter;
  faceMap.minFilter = THREE.NearestFilter;
  faceMap.colorSpace = THREE.SRGBColorSpace;
  const headMats = [skin, skin, hair, skin, new THREE.MeshStandardMaterial({ map: faceMap, roughness: 0.8 }), skin];
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.52, 0.52), headMats);
  head.position.y = 1.74;
  group.add(head);
  const fringe = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.16, 0.56), hair);
  fringe.position.set(0, 1.98, 0);
  group.add(fringe);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.62, 0.3), shirt);
  torso.position.y = 1.17;
  group.add(torso);
  const beltMesh = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.09, 0.32), belt);
  beltMesh.position.y = 0.9;
  group.add(beltMesh);

  const armGeo = new THREE.BoxGeometry(0.16, 0.6, 0.2);
  const makeArm = (side: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.35, 1.4, 0);
    const upper = new THREE.Mesh(armGeo, sleeve);
    upper.position.y = -0.16;
    pivot.add(upper);
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.2, 0.21), skin);
    hand.position.y = -0.48;
    pivot.add(hand);
    group.add(pivot);
    return pivot;
  };
  const armL = makeArm(-1);
  const armR = makeArm(1);

  const legGeo = new THREE.BoxGeometry(0.2, 0.62, 0.24);
  const makeLeg = (side: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.14, 0.85, 0);
    const leg = new THREE.Mesh(legGeo, pants);
    leg.position.y = -0.3;
    pivot.add(leg);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.15, 0.3), shoe);
    foot.position.set(0, -0.67, 0.04);
    pivot.add(foot);
    group.add(pivot);
    return pivot;
  };
  const legL = makeLeg(-1);
  const legR = makeLeg(1);

  let held: THREE.Mesh<THREE.BoxGeometry, THREE.Material | THREE.Material[]> = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.24, 0.24),
    new THREE.MeshStandardMaterial({ color: 0x7a9c4a })
  );
  held.position.set(0, -0.66, 0.08);
  armR.add(held);

  group.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });

  let t = 0;
  let currentYaw = 0;
  let walk = 0;
  const update = (dt: number, moving: boolean, airborne: boolean, speed: number) => {
    t += dt;
    walk += dt * (moving ? speed * 1.6 : 0);
    const amp = moving ? 0.6 : 0;
    legL.rotation.x = Math.sin(walk) * amp;
    legR.rotation.x = -Math.sin(walk) * amp;
    armL.rotation.x = -Math.sin(walk) * amp * 0.9;
    armR.rotation.x = Math.sin(walk) * amp * 0.9;
    armL.rotation.z = 0.06;
    armR.rotation.z = -0.06;
    if (airborne) {
      legL.rotation.x = -0.45;
      legR.rotation.x = 0.3;
      armL.rotation.x = -0.9;
      armR.rotation.x = -0.7;
    }
    const bob = moving ? Math.abs(Math.sin(walk)) * 0.05 : Math.sin(t * 1.6) * 0.014;
    head.position.y = 1.74 + bob;
    fringe.position.y = 1.98 + bob;
    torso.position.y = 1.17 + bob;
    beltMesh.position.y = 0.9 + bob;
    armL.position.y = 1.4 + bob;
    armR.position.y = 1.4 + bob;
    void currentYaw;
  };

  const tileIndex = (name: string) => TILE_NAMES.indexOf(name as (typeof TILE_NAMES)[number]);
  void tileIndex;
  const makeTex = (name: (typeof TILE_NAMES)[number]) => {
    const tex = new THREE.CanvasTexture(tileCanvas(name));
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  };
  const setHeld = (id: number) => {
    const def = BLOCKS[id] ?? BLOCKS[ID.grass];
    const top = makeTex(def.tex.top);
    const side = makeTex(def.tex.side);
    const bottom = makeTex(def.tex.bottom);
    const mats = [
      new THREE.MeshStandardMaterial({ map: side, roughness: 0.7 }),
      new THREE.MeshStandardMaterial({ map: side, roughness: 0.7 }),
      new THREE.MeshStandardMaterial({ map: top, roughness: 0.7 }),
      new THREE.MeshStandardMaterial({ map: bottom, roughness: 0.7 }),
      new THREE.MeshStandardMaterial({ map: side, roughness: 0.7 }),
      new THREE.MeshStandardMaterial({ map: side, roughness: 0.7 }),
    ];
    held.geometry.dispose();
    held.geometry = new THREE.BoxGeometry(0.26, 0.26, 0.26);
    const previous = held.material as THREE.Material | THREE.Material[];
    (Array.isArray(previous) ? previous : [previous]).forEach((m) => m.dispose());
    held.material = mats;
    held.castShadow = true;
  };
  setHeld(ID.grass);

  return {
    group,
    update,
    setHeld,
    setVisible: (v: boolean) => {
      group.visible = v;
    },
  };
}

// ---------------------------------------------------------------------------
// Block break particles
// ---------------------------------------------------------------------------
export class BlockParticles {
  mesh: THREE.InstancedMesh;
  private data: { pos: THREE.Vector3; vel: THREE.Vector3; life: number; spin: number }[] = [];
  private max = 90;
  private dummy = new THREE.Object3D();
  private cursor = 0;

  constructor(scene: THREE.Scene) {
    const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
    this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 0.16, 0.16), material, this.max);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.castShadow = false;
    this.mesh.frustumCulled = false;
    for (let i = 0; i < this.max; i++) {
      this.data.push({ pos: new THREE.Vector3(0, -100, 0), vel: new THREE.Vector3(), life: 0, spin: 0 });
      this.dummy.position.set(0, -100, 0);
      this.dummy.scale.setScalar(0);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
      this.mesh.setColorAt(i, new THREE.Color(0xffffff));
    }
    scene.add(this.mesh);
  }

  spawn(x: number, y: number, z: number, color: string) {
    const c = new THREE.Color(color);
    for (let k = 0; k < 12; k++) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % this.max;
      const p = this.data[i];
      p.pos.set(x + 0.5 + (Math.random() - 0.5) * 0.7, y + 0.5 + Math.random() * 0.6, z + 0.5 + (Math.random() - 0.5) * 0.7);
      p.vel.set((Math.random() - 0.5) * 4, 2 + Math.random() * 3.5, (Math.random() - 0.5) * 4);
      p.life = 0.6 + Math.random() * 0.5;
      p.spin = (Math.random() - 0.5) * 12;
      (this.mesh.material as THREE.MeshStandardMaterial).color.set(c);
      this.mesh.setColorAt(i, c.clone().multiplyScalar(0.75 + Math.random() * 0.3));
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  update(dt: number) {
    let dirty = false;
    for (let i = 0; i < this.max; i++) {
      const p = this.data[i];
      if (p.life <= 0) continue;
      p.life -= dt;
      p.vel.y -= 20 * dt;
      p.pos.addScaledVector(p.vel, dt);
      if (p.pos.y < 0) p.life = 0;
      this.dummy.position.copy(p.pos);
      this.dummy.rotation.set(p.life * p.spin, p.life * p.spin * 0.7, 0);
      this.dummy.scale.setScalar(Math.max(0, Math.min(1, p.life * 2.4)));
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
      dirty = true;
    }
    if (dirty) this.mesh.instanceMatrix.needsUpdate = true;
  }
}

export const SCENERY_VERSION = "1.0";
void radialGlow;


// ---------------------------------------------------------------------------
// First-person hand & held block
// ---------------------------------------------------------------------------
export interface HandRig {
  group: THREE.Group;
  setHeld: (id: number) => void;
  setVisible: (v: boolean) => void;
  update: (dt: number, moving: boolean, swing: number) => void;
}

export function createHandRig(camera: THREE.PerspectiveCamera, scene: THREE.Scene): HandRig {
  scene.add(camera);
  const group = new THREE.Group();
  group.position.set(0.42, -0.4, -1.05);
  group.rotation.set(-0.02, -0.5, 0.08);
  camera.add(group);

  const skin = new THREE.MeshStandardMaterial({ color: 0xd9a37b, roughness: 0.85 });
  const sleeve = new THREE.MeshStandardMaterial({ color: 0x2f8f83, roughness: 0.8 });
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.075, 0.3), skin);
  arm.position.set(0.11, -0.19, 0.2);
  arm.rotation.set(0.62, 0.12, 0.12);
  const cuff = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.11, 0.1), sleeve);
  cuff.position.set(0.11, -0.17, 0.36);
  const fingers = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.06, 0.09), new THREE.MeshStandardMaterial({ color: 0xc9906b, roughness: 0.9 }));
  fingers.position.set(0.16, -0.16, 0.04);
  group.add(arm, cuff, fingers);

  let held: THREE.Mesh<THREE.BoxGeometry, THREE.Material | THREE.Material[]> = new THREE.Mesh(
    new THREE.BoxGeometry(0.17, 0.17, 0.17),
    new THREE.MeshStandardMaterial({ color: 0x77a244 })
  );
  held.position.set(-0.06, 0.02, -0.1);
  held.rotation.set(0.1, 0.66, 0.04);
  held.scale.setScalar(0.78);
  held.castShadow = false;
  held.receiveShadow = false;
  group.add(held);

  const textureCache = new Map<string, THREE.CanvasTexture>();
  const getTexture = (name: (typeof TILE_NAMES)[number]) => {
    const key = String(name);
    let tex = textureCache.get(key);
    if (!tex) {
      tex = new THREE.CanvasTexture(tileCanvas(name));
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      textureCache.set(key, tex);
    }
    return tex;
  };

  const setHeld = (id: number) => {
    const def = BLOCKS[id] ?? BLOCKS[ID.grass];
    const side = getTexture(def.tex.side);
    const top = getTexture(def.tex.top);
    const bottom = getTexture(def.tex.bottom);
    const mats = [
      new THREE.MeshStandardMaterial({ map: side, roughness: 0.55, metalness: 0.08, envMapIntensity: 0.8 }),
      new THREE.MeshStandardMaterial({ map: side, roughness: 0.55, metalness: 0.08, envMapIntensity: 0.8 }),
      new THREE.MeshStandardMaterial({ map: top, roughness: 0.55, metalness: 0.08 }),
      new THREE.MeshStandardMaterial({ map: bottom, roughness: 0.7, metalness: 0.05 }),
      new THREE.MeshStandardMaterial({ map: side, roughness: 0.55, metalness: 0.08, envMapIntensity: 0.8 }),
      new THREE.MeshStandardMaterial({ map: side, roughness: 0.55, metalness: 0.08, envMapIntensity: 0.8 }),
    ];
    const previous = held.material;
    (Array.isArray(previous) ? previous : [previous]).forEach((m) => m.dispose());
    held.material = mats;
    held.geometry.dispose();
    held.geometry = new THREE.BoxGeometry(0.17, 0.17, 0.17);
  };
  setHeld(ID.grass);

  let time = 0;
  let swingT = 0;
  const update = (dt: number, moving: boolean, swing: number) => {
    time += dt;
    swingT = Math.max(0, swingT - dt * 3.4);
    if (swing > 0) swingT = Math.min(1, swingT + dt * 9);
    const bob = moving ? Math.sin(time * 9) * 0.022 : Math.sin(time * 1.4) * 0.006;
    group.position.set(0.42 + bob * 0.5, -0.4 + Math.abs(bob) * 0.8, -1.05 - swingT * 0.1);
    group.rotation.set(-0.02 - swingT * 0.7, -0.5 + swingT * 0.22, 0.08 + swingT * 0.18);
  };

  return { group, setHeld, setVisible: (v) => { group.visible = v; }, update };
}

// ---------------------------------------------------------------------------
// Floating dust / pollen motes for atmospheric depth
// ---------------------------------------------------------------------------
export function createDustMotes(scene: THREE.Scene): { points: THREE.Points; update: (dt: number, center: THREE.Vector3, day: number) => void } {
  const count = 220;
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 46;
    positions[i * 3 + 1] = Math.random() * 12;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 46;
    seeds[i] = Math.random() * Math.PI * 2;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xfff6dc,
    size: 0.045,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  const points = new THREE.Points(geo, material);
  points.frustumCulled = false;
  scene.add(points);
  const update = (dt: number, center: THREE.Vector3, day: number) => {
    const arr = geo.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < count; i++) {
      const ix = i * 3;
      arr.array[ix] += Math.sin(seeds[i] + i) * dt * 0.22;
      arr.array[ix + 1] += Math.cos(seeds[i] * 1.7 + i) * dt * 0.12;
      arr.array[ix + 2] += Math.cos(seeds[i] + i * 0.7) * dt * 0.2;
      const dx = arr.array[ix] - center.x;
      const dz = arr.array[ix + 2] - center.z;
      if (dx > 23) arr.array[ix] -= 46;
      if (dx < -23) arr.array[ix] += 46;
      if (dz > 23) arr.array[ix + 2] -= 46;
      if (dz < -23) arr.array[ix + 2] += 46;
      const dy = arr.array[ix + 1] - center.y;
      if (dy > 14) arr.array[ix + 1] -= 18;
      if (dy < -4) arr.array[ix + 1] += 18;
    }
    arr.needsUpdate = true;
    material.opacity = 0.05 + day * 0.16;
  };
  return { points, update };
}


// ---------------------------------------------------------------------------
// Screen-space sun shafts (prefiltered radial streak)
// ---------------------------------------------------------------------------
export function createGodRays(): { material: THREE.ShaderMaterial; update: (uw: number, uh: number, opacity: number, camera: THREE.PerspectiveCamera, dir: THREE.Vector3) => void } {
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uSun: { value: new THREE.Vector2(0.5, 0.9) },
      uAspect: { value: 1.0 },
      uIntensity: { value: 0.5 },
      uColor: { value: new THREE.Color("#ffdda0") },
      uSky: { value: new THREE.Color("#9ec8ff") },
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      uniform vec2 uSun; uniform float uAspect; uniform float uIntensity; uniform vec3 uColor; uniform vec3 uSky;
      varying vec2 vUv;
      float streak(vec2 uv, float seed){
        vec2 d = uv - uSun; d.x *= uAspect;
        float ang = atan(d.y, d.x);
        float len = length(d);
        float n = sin(ang * 22.0 + seed * 9.0) * 0.5 + 0.5;
        n *= sin(ang * 7.0 + seed * 3.1) * 0.35 + 0.65;
        float falloff = smoothstep(0.85, 0.0, len);
        return pow(n, 3.0) * falloff;
      }
      void main(){
        vec2 uv = vUv;
        vec3 col = mix(uSky, uColor, smoothstep(0.25, 0.0, length((uv - uSun) * vec2(uAspect, 1.0))));
        float rays = streak(uv, 0.0) * 0.55 + streak(uv, 0.37) * 0.35 + streak(uv, 0.74) * 0.25;
        float glow = smoothstep(0.65, 0.0, length((uv - uSun) * vec2(uAspect, 1.0)));
        float horizon = smoothstep(0.0, 0.35, uv.y);
        float alpha = (rays * 0.26 + glow * 0.12) * uIntensity * (0.25 + horizon * 0.75);
        alpha *= smoothstep(0.0, 0.08, uSun.y);
        gl_FragColor = vec4(col, alpha);
      }`,
  });
  const update = (uw: number, uh: number, opacity: number, camera: THREE.PerspectiveCamera, dir: THREE.Vector3) => {
    const p = camera.position.clone().add(dir.clone().normalize().multiplyScalar(1000));
    p.project(camera);
    material.uniforms.uSun.value.set(p.x * 0.5 + 0.5, p.y * 0.5 + 0.5);
    material.uniforms.uAspect.value = uw / Math.max(1, uh);
    material.uniforms.uIntensity.value = opacity;
  };
  return { material, update };
}


// ---------------------------------------------------------------------------
// Drifting leaves around forest areas
// ---------------------------------------------------------------------------
export function createLeaves(scene: THREE.Scene): { mesh: THREE.InstancedMesh; update: (dt: number, center: THREE.Vector3, wind: number) => void } {
  const count = 40;
  const geo = new THREE.PlaneGeometry(0.13, 0.13);
  const material = new THREE.MeshStandardMaterial({
    color: 0x8ec95c,
    side: THREE.DoubleSide,
    roughness: 0.85,
    transparent: true,
    opacity: 0.9,
  });
  const mesh = new THREE.InstancedMesh(geo, material, count);
  mesh.frustumCulled = false;
  const data = Array.from({ length: count }, () => ({
    pos: new THREE.Vector3((Math.random() - 0.5) * 30, 1 + Math.random() * 9, (Math.random() - 0.5) * 30),
    speed: 0.4 + Math.random() * 0.9,
    phase: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 3,
  }));
  const dummy = new THREE.Object3D();
  scene.add(mesh);
  const colors = [0x8ec95c, 0x6fae45, 0xa7d06a, 0xd9c06a];
  for (let i = 0; i < count; i++) mesh.setColorAt(i, new THREE.Color(colors[i % colors.length]));
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  let t = 0;
  const update = (dt: number, center: THREE.Vector3, wind: number) => {
    t += dt;
    for (let i = 0; i < count; i++) {
      const d = data[i];
      d.pos.y -= d.speed * dt * (0.6 + wind * 0.4);
      d.pos.x += Math.sin(t * 1.2 + d.phase) * dt * 0.7;
      d.pos.z += Math.cos(t * 0.9 + d.phase) * dt * 0.5;
      if (d.pos.y < 0) {
        d.pos.y = 8 + Math.random() * 4;
        d.pos.x = center.x + (Math.random() - 0.5) * 28;
        d.pos.z = center.z + (Math.random() - 0.5) * 28;
      }
      dummy.position.set(d.pos.x, d.pos.y, d.pos.z);
      dummy.rotation.set(t * d.spin + d.phase, t * d.spin * 0.7, d.phase);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  return { mesh, update };
}


// ---------------------------------------------------------------------------
// Weather: rain streaks
// ---------------------------------------------------------------------------
export interface WeatherRig {
  rain: THREE.LineSegments;
  birds: THREE.Group;
  shootingStar: THREE.Mesh;
  update: (dt: number, center: THREE.Vector3, weather: string, night: number) => void;
  strike: () => void;
  intensity: number;
}

export function createWeather(scene: THREE.Scene): WeatherRig {
  const maxDrops = 1600;
  const positions = new Float32Array(maxDrops * 6);
  const drops: { x: number; y: number; z: number; v: number }[] = [];
  for (let i = 0; i < maxDrops; i++) {
    drops.push({
      x: (Math.random() - 0.5) * 48,
      y: Math.random() * 26,
      z: (Math.random() - 0.5) * 48,
      v: 24 + Math.random() * 20,
    });
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const rainMat = new THREE.LineBasicMaterial({
    color: 0xbfe2ff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const rain = new THREE.LineSegments(geo, rainMat);
  rain.frustumCulled = false;
  rain.visible = false;
  scene.add(rain);

  // birds
  const birds = new THREE.Group();
  const birdMat = new THREE.MeshBasicMaterial({ color: 0x1d2a24, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
  const birdGeo = new THREE.BufferGeometry();
  birdGeo.setAttribute("position", new THREE.Float32BufferAttribute([-0.9, 0, 0, 0, 0.22, 0, 0.9, 0, 0, -0.35, 0, 0, 0, 0.16, 0.28, 0.35, 0, 0], 3));
  const birdList: { root: THREE.Group; wingL: THREE.Mesh; wingR: THREE.Mesh; r: number; a: number; h: number; speed: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const root = new THREE.Group();
    const wingL = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.42), birdMat);
    wingL.position.x = -0.8;
    const wingR = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.42), birdMat);
    wingR.position.x = 0.8;
    root.add(wingL, wingR);
    root.scale.setScalar(0.9 + Math.random() * 0.6);
    birds.add(root);
    birdList.push({ root, wingL, wingR, r: 20 + Math.random() * 26, a: Math.random() * Math.PI * 2, h: 26 + Math.random() * 12, speed: 0.06 + Math.random() * 0.05 });
  }
  scene.add(birds);

  // shooting star (thin additive quad)
  const starCanvas = document.createElement("canvas");
  starCanvas.width = 256;
  starCanvas.height = 32;
  const sc = starCanvas.getContext("2d")!;
  const grad = sc.createLinearGradient(0, 16, 256, 16);
  grad.addColorStop(0, "rgba(255,255,255,0)");
  grad.addColorStop(0.55, "rgba(210,235,255,.75)");
  grad.addColorStop(1, "rgba(255,255,255,1)");
  sc.fillStyle = grad;
  sc.beginPath();
  sc.moveTo(0, 14);
  sc.lineTo(250, 15);
  sc.lineTo(256, 16);
  sc.lineTo(250, 17);
  sc.lineTo(0, 18);
  sc.closePath();
  sc.fill();
  const starTex = new THREE.CanvasTexture(starCanvas);
  const shootingStar = new THREE.Mesh(
    new THREE.PlaneGeometry(150, 2.2),
    new THREE.MeshBasicMaterial({ map: starTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
  );
  shootingStar.frustumCulled = false;
  scene.add(shootingStar);

  let time = 0;
  let flight = 0;
  let nextFlight = 6;
  let flashTimer = 0;
  let intensitySmooth = 0;

  const update = (dt: number, center: THREE.Vector3, weather: string, night: number) => {
    time += dt;
    const targetIntensity = weather === "storm" ? 1 : weather === "rain" ? 0.55 : 0;
    intensitySmooth += (targetIntensity - intensitySmooth) * Math.min(1, dt * 0.8);
    rain.visible = intensitySmooth > 0.02;
    rainMat.opacity = 0.12 + intensitySmooth * 0.32;

    if (rain.visible) {
      const visible = Math.floor(maxDrops * Math.min(1, 0.35 + intensitySmooth));
      const arr = geo.getAttribute("position") as THREE.BufferAttribute;
      const wind = weather === "storm" ? 6.5 : 2.2;
      for (let i = 0; i < maxDrops; i++) {
        const d = drops[i];
        if (i < visible) {
          d.y -= d.v * dt;
          d.x += wind * dt;
          if (d.y < -3) {
            d.y = 22 + Math.random() * 4;
            d.x = (Math.random() - 0.5) * 48;
            d.z = (Math.random() - 0.5) * 48;
          }
          if (d.x > 26) d.x -= 52;
          const px = center.x + d.x;
          const py = center.y + d.y;
          const pz = center.z + d.z;
          const len = 0.7 + d.v * 0.02;
          arr.setXYZ(i * 2, px, py, pz);
          arr.setXYZ(i * 2 + 1, px - wind * 0.04, py - len, pz);
        } else {
          arr.setXYZ(i * 2, 0, -999, 0);
          arr.setXYZ(i * 2 + 1, 0, -999, 0);
        }
      }
      arr.needsUpdate = true;
    }

    // birds circle lazily
    birdList.forEach((b, i) => {
      b.a += b.speed * dt;
      const x = 48 + Math.cos(b.a) * b.r;
      const z = 52 + Math.sin(b.a) * b.r * 0.8;
      b.root.position.set(x, b.h + Math.sin(time * 0.6 + i) * 1.4, z);
      b.root.rotation.y = -b.a + Math.PI / 2;
      const flap = Math.sin(time * (5 + i * 0.4) + i) * 0.55;
      b.wingL.rotation.z = flap;
      b.wingR.rotation.z = -flap;
    });

    // shooting stars at night
    if (flight > 0) {
      flight -= dt;
      const p = 1 - flight / 1.4;
      shootingStar.position.set(-260 + p * 640, 300 - p * 150, -420);
      shootingStar.rotation.z = -0.25;
      (shootingStar.material as THREE.MeshBasicMaterial).opacity = Math.sin(Math.min(1, p) * Math.PI) * 0.9;
      if (flight <= 0) (shootingStar.material as THREE.MeshBasicMaterial).opacity = 0;
    } else if (night > 0.5) {
      nextFlight -= dt;
      if (nextFlight <= 0) {
        flight = 1.4;
        nextFlight = 9 + Math.random() * 14;
      }
    }
    if (flashTimer > 0) flashTimer = Math.max(0, flashTimer - dt);
    if (flashTimer > 0) {
      const f = Math.sin(flashTimer * 40) * 0.5 + 0.5;
      (rainMat.color as THREE.Color).setRGB(0.75 + f * 0.25, 0.86 + f * 0.14, 1);
    } else {
      (rainMat.color as THREE.Color).setRGB(0.75, 0.89, 1);
    }
  };

  return {
    rain,
    birds,
    shootingStar,
    update,
    intensity: 0,
    strike: () => {
      flashTimer = 0.35;
    },
  };
}


// ---------------------------------------------------------------------------
// Butterflies in sunny meadows
// ---------------------------------------------------------------------------
export function createButterflies(scene: THREE.Scene): { mesh: THREE.InstancedMesh; update: (dt: number, center: THREE.Vector3, day: number) => void } {
  const count = 22;
  const geo = new THREE.PlaneGeometry(0.2, 0.14);
  const mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, transparent: true, opacity: 0.95, vertexColors: false, toneMapped: false });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.frustumCulled = false;
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3);
  const colors = [0xffe08a, 0xffb0c8, 0xbfe6ff, 0xfff4d0, 0xe3b8ff];
  const anchors = [
    { x: 48, z: 47 }, { x: 31, z: 44 }, { x: 54, z: 58 }, { x: 42, z: 54 },
  ];
  const data = Array.from({ length: count }, (_, i) => {
    const a = anchors[i % anchors.length];
    return {
      ax: a.x + (Math.random() - 0.5) * 7,
      az: a.z + (Math.random() - 0.5) * 7,
      ay: 13 + Math.random() * 2.2,
      phase: Math.random() * Math.PI * 2,
      speed: 0.5 + Math.random() * 0.7,
      radius: 1.4 + Math.random() * 2.6,
    };
  });
  const dummy = new THREE.Object3D();
  data.forEach((_, i) => mesh.setColorAt(i, new THREE.Color(colors[i % colors.length])));
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  scene.add(mesh);
  let t = 0;
  const update = (dt: number, center: THREE.Vector3, day: number) => {
    t += dt;
    data.forEach((d, i) => {
      const ang = t * d.speed + d.phase;
      const x = d.ax + Math.cos(ang) * d.radius;
      const z = d.az + Math.sin(ang * 0.8) * d.radius;
      const y = d.ay + Math.sin(t * 1.6 + d.phase) * 0.5;
      const flap = 0.35 + Math.abs(Math.sin(t * 13 + d.phase)) * 0.65;
      dummy.position.set(x, y, z);
      dummy.rotation.set(-Math.PI / 2 + Math.sin(t * 1.2 + d.phase) * 0.3, ang + Math.PI / 2, 0);
      dummy.scale.set(flap, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mat.opacity = Math.max(0, day - 0.15) * 1.1;
    mesh.visible = mat.opacity > 0.03;
    void center;
  };
  return { mesh, update };
}
