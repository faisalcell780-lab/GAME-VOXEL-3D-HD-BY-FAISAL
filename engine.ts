import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
import { SMAAPass } from "three/examples/jsm/postprocessing/SMAAPass.js";
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { getAtlas, getAtlasNormalMap, getAtlasRoughnessMap, radialGlow, tileCanvas } from "./textures";
import {
  AO_SHADE,
  buildChunkGeometry,
  disposeChunkGeometry,
  worldMapPixels,
  type ChunkGeometry,
} from "./mesher";
import {
  BLOCKS,
  BUILDABLE_BLOCKS,
  CHUNK,
  ID,
  SEA,
  SX,
  SY,
  SZ,
  WATER_Y,
  applyWorldEdits,
  biomeAt,
  blockDef,
  generateWorld,
  getBlock,
  index,
  isSolidAt,
  raycastVoxel,
  surfaceHeight,
  type RayHit,
  type Waypoint,
  type World,
} from "./world";
import {
  BlockParticles,
  computeSky,
  createCharacter,
  createDustMotes,
  createEnvironmentMap,
  createGodRays,
  createHandRig,
  createLeaves,
  createWeather,
  createButterflies,
  createSkyRig,
  type CharacterRig,
  type HandRig,
  type SkyRig,
  type SkyState,
  type WeatherRig,
} from "./scenery";
import { AudioEngine } from "./audio";
import { createMobs, type MobsRig } from "./mobs";
import { RECIPES } from "./recipes";

export interface GameSettings {
  creative: boolean;
  shadows: boolean;
  shadowQuality: "low" | "medium" | "high";
  bloom: boolean;
  reflections: boolean;
  effects: boolean;
  clouds: boolean;
  fov: number;
  cameraDistance: number;
  mouseSensitivity: number;
  dayCycle: boolean;
  time: number;
  resolution: number;
  sound: boolean;
  showGrid: boolean;
  firstPerson: boolean;
  ambientOcclusion: boolean;
  antiAliasing: boolean;
  depthOfField: boolean;
  hudCompact: boolean;
  showHand: boolean;
  invertLookY: boolean;
  weather: "clear" | "rain" | "storm";
  effectStrength: number;
  autoQuality: boolean;
  targetFps: number;
}

export const DEFAULT_SETTINGS: GameSettings = {
  creative: true,
  shadows: true,
  shadowQuality: "high",
  bloom: true,
  reflections: true,
  effects: true,
  clouds: true,
  fov: 68,
  cameraDistance: 8,
  mouseSensitivity: 32,
  dayCycle: true,
  time: 8.3,
  resolution: 1,
  firstPerson: true,
  sound: true,
  showGrid: false,
  ambientOcclusion: true,
  antiAliasing: true,
  depthOfField: false,
  hudCompact: false,
  showHand: false,
  invertLookY: false,
  weather: "clear",
  effectStrength: 2.0,
  autoQuality: true,
  targetFps: 60,
};

export interface TargetInfo {
  id: number;
  name: string;
  hardness: number;
  distance: number;
}

export interface GameStats {
  fps: number;
  x: number;
  y: number;
  z: number;
  health: number;
  hunger: number;
  time: number;
  timeLabel: string;
  phase: string;
  biome: string;
  seed: number;
  seedLabel: string;
  flying: boolean;
  firstPerson: boolean;
  inWater: boolean;
  mined: number;
  placed: number;
  distance: number;
  peak: number;
  nights: number;
  target: TargetInfo | null;
  mode: "menu" | "play" | "paused" | "photo";
  selected: number;
  day: number;
  weather: "clear" | "rain" | "storm";
  effectStrength: number;
  autoQuality: boolean;
  targetFps: number;
  qualityLevel: number;
}

export interface MapData {
  width: number;
  height: number;
  pixels: Uint8ClampedArray;
  player: { x: number; z: number; yaw: number };
  waypoints: Waypoint[];
  biome: string;
}

export interface SaveData {
  seed: number;
  edits: [number, number][];
  player: { x: number; y: number; z: number };
  time: number;
  inventory: Record<number, number>;
  selected: number;
  mined: number;
  placed: number;
  distance: number;
  peak: number;
  nights: number;
  savedAt: number;
}

export const SAVE_KEY = "blockrealm.save.v2";
export const PROFILE_KEY = "blockrealm.profile.v2";

export function readSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SaveData;
    if (typeof data.seed !== "number" || !Array.isArray(data.edits)) return null;
    return data;
  } catch {
    return null;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}

export interface EngineOptions {
  settings: GameSettings;
  save?: SaveData | null;
  seed?: number;
  /** Build the first world through loadWorldProgressive instead of blocking in the constructor. */
  deferInitialWorldLoad?: boolean;
  onStats?: (stats: GameStats) => void;
  onInventory?: (inventory: Record<number, number>, selected: number) => void;
  onTarget?: (target: TargetInfo | null) => void;
  onEffects?: (active: Record<string, boolean>) => void;
  onEvent?: (event: string, payload?: unknown) => void;
}

type Mode = "menu" | "play" | "paused" | "photo";

function initialInventory(): Record<number, number> {
  const inv: Record<number, number> = {};
  for (const b of BUILDABLE_BLOCKS) {
    let count = 48;
    if ([ID.diamondOre, ID.goldOre, ID.glowstone, ID.obsidian, ID.ironOre, ID.lava].includes(b.id as never)) count = 12;
    if ([ID.flowerRed, ID.flowerYellow, ID.wheat, ID.tallGrass].includes(b.id as never)) count = 24;
    inv[b.id] = count;
  }
  return inv;
}

export class VoxelEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private composer!: EffectComposer;
  private bloom!: UnrealBloomPass;
  private cloudUniforms: Record<string, THREE.IUniform> | null = null;
  private skyRig!: SkyRig;
  private clock = new THREE.Clock();
  private elapsed = 0;
  private frameId = 0;
  private disposed = false;
  private animationStarted = false;
  private worldReady = false;
  private worldLoadVersion = 0;

  private atlasMap!: THREE.Texture;
  private atlasNormal!: THREE.Texture;
  private atlasRoughness!: THREE.Texture;
  private opaqueMat!: THREE.MeshStandardMaterial;
  private cutoutMat!: THREE.MeshStandardMaterial;
  private plantMat!: THREE.MeshStandardMaterial;
  private emissiveMat!: THREE.MeshBasicMaterial;
  private plantUniforms: { uTime: { value: number } } = { uTime: { value: 0 } };
  private translucentMat!: THREE.MeshStandardMaterial;
  private waterSideMat!: THREE.MeshStandardMaterial;
  private ocean!: THREE.Mesh;
  private oceanMap!: THREE.CanvasTexture;
  private oceanNormal!: THREE.CanvasTexture;
  private environment: THREE.Texture | null = null;
  private pmrem: THREE.PMREMGenerator | null = null;
  private pmremRenderer: THREE.WebGLRenderer | null = null;
  private cubeRT!: THREE.WebGLCubeRenderTarget;
  private cubeCamera!: THREE.CubeCamera;
  private reflectionTimer = 0;
  private waterRT!: THREE.WebGLRenderTarget;
  private waterCam!: THREE.PerspectiveCamera;
  private waterTexMatrix = new THREE.Matrix4();
  private waterUniforms: Record<string, THREE.IUniform> | null = null;
  private waterFrame = 0;
  private waterWaveUniform: { value: number } | null = null;

  private hemi!: THREE.HemisphereLight;
  private sunLight!: THREE.DirectionalLight;
  private fillLight!: THREE.DirectionalLight;
  private bounceLight!: THREE.DirectionalLight;
  private rimLight!: THREE.DirectionalLight;
  private ambient!: THREE.AmbientLight;
  private sunTarget = new THREE.Object3D();
  private pointLights: THREE.PointLight[] = [];
  private lightGroup = new THREE.Group();
  private glowMaterial!: THREE.SpriteMaterial;

  private world!: World;
  private seed = 9163204;
  private chunkGroup = new THREE.Group();
  private chunkMeshes = new Map<string, { meshes: THREE.Mesh[]; geo: ChunkGeometry }>();
  private chunkTimer = 0;
  private character!: CharacterRig;
  private particles!: BlockParticles;
  private hand!: HandRig;
  private dust!: ReturnType<typeof createDustMotes>;
  private leaves!: ReturnType<typeof createLeaves>;
  private foam: THREE.InstancedMesh | null = null;
  private foamMaterial: THREE.MeshBasicMaterial | null = null;
  private weatherRig!: WeatherRig;
  private mobs!: MobsRig;
  private butterflies!: ReturnType<typeof createButterflies>;
  private ripples!: THREE.InstancedMesh;
  private rippleData: { x: number; z: number; life: number; max: number }[] = [];
  private rippleCursor = 0;
  private rippleClock = 0;
  private wetness = 0;
  private lightningTimer = 8;
  private lightningFlash = 0;
  private rainAudioLevel = -1;
  private wasInWater = false;
  private gradePass!: ShaderPass;
  private gtaoPass!: GTAOPass;
  private smaaPass!: SMAAPass;
  private bokehPass!: BokehPass;
  private miningSwing = 0;
  private shake = 0;
  private mobileAxis = { x: 0, y: 0 };
  private mobileSprint = false;
  private touchJumpTimer = 0;
  private isMobileDevice = false;
  private softwareRenderer = false;
  private deferredQuality = false;
  private bootRender = false;
  private godRays!: ReturnType<typeof createGodRays>;
  private godPass!: ShaderPass;
  private rayScene!: THREE.Scene;
  private rayCamera!: THREE.OrthographicCamera;
  private rayTarget!: THREE.WebGLRenderTarget;
  private highlight!: THREE.Group;
  private fireflies!: THREE.Points;
  private sparkles!: THREE.Points;

  private settings: GameSettings;
  private inventory: Record<number, number>;
  private selected: number = ID.grass;
  private callbacks: Omit<EngineOptions, "settings" | "save" | "seed">;
  private audio = new AudioEngine();

  private mode: Mode = "menu";
  private paused = false;
  private inputEnabled = true;
  private flying = false;
  private firstPerson = true;
  private grounded = false;
  private inWater = false;
  private health = 20;
  private hunger = 18;
  private pos = new THREE.Vector3(44.5, 20, 50.5);
  private velocity = new THREE.Vector3();
  private keys = new Set<string>();
  private yaw = 1.42;
  private pitch = 0.12;
  private cameraDistance = 32;
  private currentHit: RayHit | null = null;
  private lastTargetKey = "";
  private moveAccumulator = 0;
  private distanceWalked = 0;
  private mined = 0;
  private placed = 0;
  private peak = 0;
  private nights = 0;
  private lastNight = false;
  private hurtCooldown = 0;
  private fallStart = 0;

  private statsTimer = 0;
  private firstPersonLook: { dir: THREE.Vector3; eye: THREE.Vector3 } | null = null;
  private saveTimer = 0;
  private saveDirty = false;
  private fps = 60;
  private frameCount = 0;
  private fpsTimer = 0;
  private skyState: SkyState = computeSky(9.2);
  private skyTimer = 0;
  private pendingStart = false;
  private lowFpsTime = 0;
  private highFpsTime = 0;
  private qualityLevel = 2;
  private fpsHistory: number[] = [];
  private onEffectsChanged: (() => void) | null = null;
  private effectsTimer = 0;
  private baseResolution = 1;
  private contextLost = false;
  private welcomeTimer = 0;
  private envTimer = 3.5;
  private shadowAnchor = new THREE.Vector3(44.5, 20, 50.5);
  private shadowTimer = 0;
  private mapDirty = true;
  private sessionStarted = false;
  private cachedMap: Uint8ClampedArray | null = null;

  private pointerDown = false;
  private pointerTravel = 0;
  private pointerId: number | null = null;
  private lastPointer = { x: 0, y: 0 };
  private lastPointerTime = 0;
  private cameraYawSmooth = 1.42;
  private cameraPitchSmooth = 0.12;
  private cameraDistanceSmooth = 8;
  private invertLookY = false;

  constructor(container: HTMLElement, options: EngineOptions) {
    this.container = container;
    this.settings = { ...DEFAULT_SETTINGS, ...options.settings };
    this.isMobileDevice =
      (typeof window !== "undefined" && (window.matchMedia?.("(pointer: coarse)").matches || window.innerWidth < 900)) || false;
    if (this.isMobileDevice) {
      // keep every visual effect enabled on mobile too, only cap the render scale
      this.settings.resolution = Math.min(this.settings.resolution, 0.95);
      this.settings.depthOfField = false;
    }
    this.callbacks = {
      onStats: options.onStats,
      onInventory: options.onInventory,
      onTarget: options.onTarget,
      onEvent: options.onEvent,
    };
    this.inventory = initialInventory();
    this.seed = options.seed ?? options.save?.seed ?? 9163204;
    this.settings.time = options.save?.time ?? this.settings.time;
    this.firstPerson = this.settings.firstPerson ?? true;
    this.cameraDistance = this.settings.cameraDistance;

    this.renderer = new THREE.WebGLRenderer({
      // MSAA is very expensive on mobile GPUs and we run SMAA in post instead.
      antialias: false,
      powerPreference: "high-performance",
      preserveDrawingBuffer: false,
      alpha: false,
      stencil: false,
    });
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;
    this.renderer.shadowMap.enabled = this.settings.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.settings.resolution));
    try {
      const glCtx = this.renderer.getContext();
      const dbg = glCtx.getExtension("WEBGL_debug_renderer_info");
      const rendererName = dbg ? String(glCtx.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : "";
      this.softwareRenderer = /swiftshader|llvmpipe|software/i.test(rendererName);
    } catch {
      this.softwareRenderer = false;
    }
    this.renderer.domElement.className = "blockrealm-canvas";
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(this.settings.fov, 16 / 9, 0.1, 2600 );
    this.camera.position.set(10, 26, 92);
    this.scene.fog = null;
    this.scene.background = new THREE.Color("#0b1422");

    const atlas = getAtlas();
    this.atlasMap = new THREE.CanvasTexture(atlas.canvas);
    this.atlasMap.colorSpace = THREE.SRGBColorSpace;
    this.atlasMap.magFilter = THREE.NearestFilter;
    this.atlasMap.minFilter = THREE.NearestMipmapLinearFilter;
    this.atlasMap.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    this.atlasMap.needsUpdate = true;

    // per-pixel relief so every block face has real 3D bumps (32x32 texture detail)
    this.atlasNormal = new THREE.CanvasTexture(getAtlasNormalMap());
    this.atlasNormal.magFilter = THREE.NearestFilter;
    this.atlasNormal.minFilter = THREE.NearestMipmapLinearFilter;
    this.atlasNormal.anisotropy = this.atlasMap.anisotropy;
    this.atlasNormal.needsUpdate = true;
    this.atlasRoughness = new THREE.CanvasTexture(getAtlasRoughnessMap());
    this.atlasRoughness.magFilter = THREE.LinearFilter;
    this.atlasRoughness.minFilter = THREE.LinearMipmapLinearFilter;
    this.atlasRoughness.needsUpdate = true;
    this.createMaterials();
    this.setupLights();
    this.setupScenery();
    this.setupPost();
    this.setupInput();
    this.particles = new BlockParticles(this.scene);
    this.dust = createDustMotes(this.scene);
    this.leaves = createLeaves(this.scene);

    const save = options.save ?? null;
    const deferInitialWorldLoad = options.deferInitialWorldLoad === true;
    // The app uses the progressive loader on first start. Avoid constructing
    // the whole world here only to clear and rebuild it a moment later.
    if (!deferInitialWorldLoad) this.loadWorld(this.seed, save?.edits ?? null, save);
    this.audio.enable(this.settings.sound);
    this.setupResize();
    this.emitInventory();
    if (!deferInitialWorldLoad) {
      this.emitStats();
      this.emitLoadProgress(92, "Menyiapkan kamera & efek");
    }
    this.onEffectsChanged = () => this.emitEffects();
    this.emitEffects();
    this.bootRender = true;
    this.renderer.shadowMap.enabled = false;
    this.sunLight.castShadow = false;
    const cheapRatio = Math.min(window.devicePixelRatio || 1, this.softwareRenderer ? 0.4 : 0.7);
    this.renderer.setPixelRatio(cheapRatio);
    this.composer.setPixelRatio(cheapRatio);
    if (this.bloom) this.bloom.enabled = false;
    if (this.smaaPass) this.smaaPass.enabled = false;
    if (this.gtaoPass) this.gtaoPass.enabled = false;
    window.setTimeout(() => {
      this.bootRender = false;
      const ratio = Math.min(window.devicePixelRatio || 1, this.settings.resolution);
      this.renderer.setPixelRatio(ratio);
      this.composer.setPixelRatio(ratio);
      const w = this.container.clientWidth || window.innerWidth;
      const h = this.container.clientHeight || window.innerHeight;
      this.renderer.setSize(w, h);
      this.composer.setSize(w, h);
      if (this.bloom) this.bloom.enabled = this.settings.bloom;
      if (this.smaaPass) this.smaaPass.enabled = this.settings.antiAliasing;
      if (this.gtaoPass) this.gtaoPass.enabled = this.settings.ambientOcclusion && !this.softwareRenderer;
      this.renderer.shadowMap.enabled = this.settings.shadows && !this.softwareRenderer;
      this.sunLight.castShadow = this.settings.shadows && !this.softwareRenderer;
      this.renderer.shadowMap.needsUpdate = true;
      if (this.softwareRenderer) {
        this.settings.bloom = false;
        this.settings.effects = false;
        this.settings.ambientOcclusion = false;
        if (this.bloom) this.bloom.enabled = false;
        this.settings.resolution = Math.min(this.settings.resolution, 0.75);
      }
      this.deferredQuality = true;
    }, 1600);
    if (!deferInitialWorldLoad) {
      this.animationStarted = true;
      this.animate();
    }
  }

  // -------------------------------------------------------------------------
  // Materials and scene
  // -------------------------------------------------------------------------
  private createMaterials() {
    this.opaqueMat = new THREE.MeshStandardMaterial({
      map: this.atlasMap,
      normalMap: this.atlasNormal,
      normalScale: new THREE.Vector2(0.6, 0.6),
      roughnessMap: this.atlasRoughness,
      vertexColors: true,
      roughness: 1.0,
      metalness: 0.02,
      envMapIntensity: 0.3,
    });
    this.cutoutMat = new THREE.MeshStandardMaterial({
      map: this.atlasMap,
      normalMap: this.atlasNormal,
      normalScale: new THREE.Vector2(0.5, 0.5),
      roughnessMap: this.atlasRoughness,
      vertexColors: true,
      roughness: 1.0,
      metalness: 0.02,
      alphaTest: 0.45,
      side: THREE.DoubleSide,
      envMapIntensity: 0.2,
    });
    this.emissiveMat = new THREE.MeshBasicMaterial({
      map: this.atlasMap,
      vertexColors: true,
      color: new THREE.Color(1.55, 1.38, 1.1),
      toneMapped: true,
      fog: false,
    });
    this.plantMat = new THREE.MeshStandardMaterial({
      map: this.atlasMap,
      normalMap: this.atlasNormal,
      normalScale: new THREE.Vector2(0.45, 0.45),
      roughnessMap: this.atlasRoughness,
      vertexColors: true,
      roughness: 1.0,
      metalness: 0.03,
      alphaTest: 0.42,
      side: THREE.DoubleSide,
      envMapIntensity: 0.5,
    });
    this.plantMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = this.plantUniforms.uTime;
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `#include <common>
           uniform float uTime;`
        )
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
           float swayFactor = clamp(uv.y, 0.0, 1.0);
           float phase = position.x * 0.85 + position.z * 1.15;
           float gust = 0.6 + 0.4 * sin(uTime * 0.55 + phase * 0.15);
           transformed.x += sin(uTime * 1.9 + phase) * 0.055 * swayFactor * gust;
           transformed.z += cos(uTime * 1.45 + phase * 1.21) * 0.04 * swayFactor * gust;`
        );
    };
    this.plantMat.customProgramCacheKey = () => "blockrealm-plants-v1";
    this.translucentMat = new THREE.MeshStandardMaterial({
      map: this.atlasMap,
      normalMap: this.atlasNormal,
      normalScale: new THREE.Vector2(0.9, 0.9),
      vertexColors: true,
      roughness: 0.12,
      metalness: 0.04,
      transparent: true,
      opacity: 0.62,
      envMapIntensity: 2.4,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.waterSideMat = new THREE.MeshStandardMaterial({
      map: this.atlasMap,
      color: 0x7cc4dd,
      roughness: 0.22,
      metalness: 0.06,
      transparent: true,
      opacity: 0.68,
      envMapIntensity: 2.8,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  }

  private setupLights() {
    this.hemi = new THREE.HemisphereLight(0xcfe6ff, 0x4a5b3a, 0.9);
    this.scene.add(this.hemi);
    this.ambient = new THREE.AmbientLight(0xbfd4ff, 0.18);
    this.scene.add(this.ambient);

    this.sunLight = new THREE.DirectionalLight(0xfff1d0, 2.6);
    this.sunLight.castShadow = this.settings.shadows;
    this.sunLight.shadow.bias = -0.00045;
    this.sunLight.shadow.normalBias = 0.06;
    this.sunLight.shadow.radius = 5.0;
    this.sunLight.shadow.intensity = 1;
    this.sunLight.shadow.camera.near = 1;
    this.sunLight.shadow.camera.far = 220;
    this.applyShadowQuality();
    this.scene.add(this.sunLight);
    this.scene.add(this.sunTarget);
    this.shadowAnchor.copy(this.pos);
    this.sunLight.target = this.sunTarget;

    this.fillLight = new THREE.DirectionalLight(0xa9c8ff, 0.45);
    this.fillLight.position.set(-40, 34, -30);
    this.scene.add(this.fillLight);

    // warm bounce light from the sunlit terrain, and a cool rim from the sky
    this.bounceLight = new THREE.DirectionalLight(0xffd9a0, 0.55);
    this.bounceLight.position.set(20, -18, 30);
    this.scene.add(this.bounceLight);
    this.rimLight = new THREE.DirectionalLight(0x9dc4ff, 0.4);
    this.rimLight.position.set(-40, 22, -55);
    this.scene.add(this.rimLight);

    this.glowMaterial = new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(radialGlow()),
      color: 0xffc46b,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.scene.add(this.lightGroup);
  }

  private applyShadowQuality() {
    const map = { low: 2048, medium: 4096, high: 4096 }[this.settings.shadowQuality];
    // much wider coverage so distant trees/terrain also cast shadows
    const extent = { low: 40, medium: 52, high: 66 }[this.settings.shadowQuality];
    const initialMap = this.softwareRenderer ? 512 : Math.min(map, 2048);
    this.sunLight.shadow.mapSize.set(initialMap, initialMap);
    this.sunLight.shadow.camera.updateProjectionMatrix();
    const cam = this.sunLight.shadow.camera;
    cam.left = -extent;
    cam.right = extent;
    cam.top = extent;
    cam.bottom = -extent;
    cam.updateProjectionMatrix();
    if (this.sunLight.shadow.map) {
      this.sunLight.shadow.map.dispose();
      this.sunLight.shadow.map = null;
    }
  }

  private setupScenery() {
    this.skyRig = createSkyRig(this.scene);
    const waterTexture = new THREE.CanvasTexture(tileCanvas("water"));
    waterTexture.wrapS = THREE.RepeatWrapping;
    waterTexture.wrapT = THREE.RepeatWrapping;
    waterTexture.repeat.set(720, 720);
    waterTexture.magFilter = THREE.NearestFilter;
    waterTexture.minFilter = THREE.LinearMipmapLinearFilter;
    waterTexture.colorSpace = THREE.SRGBColorSpace;
    this.oceanMap = waterTexture;

    const normalCanvas = document.createElement("canvas");
    normalCanvas.width = normalCanvas.height = 128;
    const nctx = normalCanvas.getContext("2d")!;
    const img = nctx.createImageData(128, 128);
    for (let y = 0; y < 128; y++) {
      for (let x = 0; x < 128; x++) {
        const i = (y * 128 + x) * 4;
        const wave = Math.sin(x * 0.45 + Math.cos(y * 0.31) * 2.2) * Math.cos(y * 0.39 + x * 0.12);
        img.data[i] = 128 + wave * 26;
        img.data[i + 1] = 128 + Math.cos(x * 0.28 + y * 0.34) * 22;
        img.data[i + 2] = 255;
        img.data[i + 3] = 255;
      }
    }
    nctx.putImageData(img, 0, 0);
    const normal = new THREE.CanvasTexture(normalCanvas);
    normal.wrapS = THREE.RepeatWrapping;
    normal.wrapT = THREE.RepeatWrapping;
    normal.repeat.set(420, 420);
    this.oceanNormal = normal;

    const oceanMat = new THREE.MeshPhysicalMaterial({
      map: waterTexture,
      normalMap: normal,
      normalScale: new THREE.Vector2(0.9, 0.9),
      color: 0x2f7396,
      roughness: 0.2,
      metalness: 0.04,
      transparent: true,
      opacity: 0.82,
      envMapIntensity: 0.75,
      clearcoat: 0.35,
      clearcoatRoughness: 0.22,
      ior: 1.33,
      specularIntensity: 0.45,
    });
    // --- RTX-style planar water reflection -------------------------------
    const rtSize = this.isMobileDevice ? 512 : 1024;
    this.waterRT = new THREE.WebGLRenderTarget(rtSize, rtSize, {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: true,
    });
    this.waterCam = new THREE.PerspectiveCamera(this.camera.fov, 1, 0.5, 900);
    const reflectionUniforms: Record<string, THREE.IUniform> = {
      uReflectMap: { value: this.waterRT.texture },
      uTextureMatrix: { value: this.waterTexMatrix },
      uReflectStrength: { value: this.settings.reflections ? 1.0 : 0 },
      uReflectTime: { value: 0 },
    };
    this.waterUniforms = reflectionUniforms;
    oceanMat.onBeforeCompile = (shader) => {
      shader.uniforms.uReflectMap = reflectionUniforms.uReflectMap;
      shader.uniforms.uTextureMatrix = reflectionUniforms.uTextureMatrix;
      shader.uniforms.uReflectStrength = reflectionUniforms.uReflectStrength;
      shader.uniforms.uReflectTime = reflectionUniforms.uReflectTime;
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `#include <common>
           uniform mat4 uTextureMatrix;
           varying vec4 vReflectCoord;
           varying vec3 vWaterWorld;`
        )
        .replace(
          "#include <project_vertex>",
          `#include <project_vertex>
           vec4 waterWorldPos = modelMatrix * vec4(transformed, 1.0);
           vWaterWorld = waterWorldPos.xyz;
           vReflectCoord = uTextureMatrix * waterWorldPos;`
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
           uniform sampler2D uReflectMap;
           uniform float uReflectStrength;
           uniform float uReflectTime;
           varying vec4 vReflectCoord;
           varying vec3 vWaterWorld;`
        )
        .replace(
          "#include <dithering_fragment>",
          `#include <dithering_fragment>
           if (uReflectStrength > 0.01) {
             vec2 ruv = vReflectCoord.xy / max(vReflectCoord.w, 0.0001);
             float ripple = sin(vWaterWorld.x * 1.7 + uReflectTime * 1.1) * cos(vWaterWorld.z * 1.4 - uReflectTime * 0.9);
             ruv += vec2(ripple, ripple * 0.6) * 0.006;
             vec3 reflected = texture2D(uReflectMap, clamp(ruv, 0.001, 0.999)).rgb;
             float fres = pow(1.0 - clamp(dot(normalize(vViewPosition), vec3(0.0, 0.0, 1.0)), 0.0, 1.0), 2.2);
             fres = 0.12 + 0.4 * fres;
             // crisp mirrored image with a subtle sun-glitter mix
             vec3 mirror = reflected * vec3(0.96, 0.99, 1.05);
             gl_FragColor.rgb = mix(gl_FragColor.rgb, mirror * 0.8, clamp(fres * uReflectStrength, 0.0, 0.58));
           }`
        );
    };
    oceanMat.customProgramCacheKey = () => "blockrealm-water-planar-v2";
    const waveUniform = { value: 0 };
    this.waterWaveUniform = waveUniform;
    const prevCompile = oceanMat.onBeforeCompile;
    oceanMat.onBeforeCompile = (shader, renderer) => {
      prevCompile.call(oceanMat, shader, renderer);
      shader.uniforms.uWaveTime = waveUniform;
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\n uniform float uWaveTime;")
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
           float w1 = sin(transformed.x * 0.09 + uWaveTime * 1.1) * 0.28;
           float w2 = cos(transformed.y * 0.11 + uWaveTime * 0.8) * 0.24;
           float w3 = sin((transformed.x + transformed.y) * 0.05 + uWaveTime * 0.55) * 0.35;
           transformed.z += w1 + w2 + w3;`
        );
    };

    this.ocean = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000, 160, 160), oceanMat);
    this.ocean.rotation.x = -Math.PI / 2;
    this.ocean.position.y = WATER_Y;
    this.ocean.receiveShadow = true;
    this.scene.add(this.ocean);

    const fireflyGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(260 * 3);
    for (let i = 0; i < 260; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 6 + Math.random() * 42;
      const cx = Math.random() > 0.4 ? 58 : 34;
      const cz = Math.random() > 0.4 ? 64 : 50;
      positions.set([cx + Math.cos(angle) * r, 11 + Math.random() * 7, cz + Math.sin(angle) * r * 0.8], i * 3);
    }
    fireflyGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.fireflies = new THREE.Points(
      fireflyGeo,
      new THREE.PointsMaterial({
        color: 0xffe49a,
        size: 0.18,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      })
    );
    this.scene.add(this.fireflies);

    const sparkleGeo = new THREE.BufferGeometry();
    const sparklePos = new Float32Array(260 * 3);
    for (let i = 0; i < 260; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * 36;
      sparklePos.set([58 + Math.cos(angle) * r, WATER_Y + 0.03, 64 + Math.sin(angle) * r * 0.8], i * 3);
    }
    sparkleGeo.setAttribute("position", new THREE.BufferAttribute(sparklePos, 3));
    this.sparkles = new THREE.Points(
      sparkleGeo,
      new THREE.PointsMaterial({
        color: 0xfff6dc,
        size: 0.09,
        transparent: true,
        opacity: 0.28,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    this.scene.add(this.sparkles);

    this.scene.add(this.chunkGroup);
    this.weatherRig = createWeather(this.scene);
    this.butterflies = createButterflies(this.scene);

    // real world reflections: capture the surroundings into a cubemap and feed
    // it to water & glass so the lake mirrors trees, the cottage and the sky.
    this.cubeRT = new THREE.WebGLCubeRenderTarget(this.isMobileDevice ? 96 : 192, {
      type: THREE.HalfFloatType,
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
    });
    this.cubeCamera = new THREE.CubeCamera(0.5, 600, this.cubeRT);
    this.cubeCamera.position.set(58, 14, 64);
    this.scene.add(this.cubeCamera);

    const rippleGeo = new THREE.RingGeometry(0.42, 0.5, 24);
    rippleGeo.rotateX(-Math.PI / 2);
    const rippleMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.ripples = new THREE.InstancedMesh(rippleGeo, rippleMat, 48);
    this.ripples.frustumCulled = false;
    this.ripples.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(48 * 3), 3);
    const rippleDummy = new THREE.Object3D();
    for (let i = 0; i < 48; i++) {
      rippleDummy.position.set(0, -100, 0);
      rippleDummy.scale.setScalar(0.001);
      rippleDummy.updateMatrix();
      this.ripples.setMatrixAt(i, rippleDummy.matrix);
      this.ripples.setColorAt(i, new THREE.Color(0, 0, 0));
      this.rippleData.push({ x: 0, z: 0, life: 0, max: 1 });
    }
    if (this.ripples.instanceColor) this.ripples.instanceColor.needsUpdate = true;
    this.scene.add(this.ripples);

    this.highlight = new THREE.Group();
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1.012, 1.012, 1.012)),
      new THREE.LineBasicMaterial({ color: 0xf7ffe9, transparent: true, opacity: 0.92, depthTest: false })
    );
    edges.renderOrder = 10;
    const fill = new THREE.Mesh(
      new THREE.BoxGeometry(1.008, 1.008, 1.008),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, depthWrite: false })
    );
    fill.renderOrder = 9;
    this.highlight.add(edges, fill);
    this.highlight.visible = false;
    this.scene.add(this.highlight);
  }

  private setupPost() {
    this.composer = new EffectComposer(this.renderer);
    this.composer.setPixelRatio(Math.min(window.devicePixelRatio, this.settings.resolution));
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.composer.setSize(w, h);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.gtaoPass = new GTAOPass(this.scene, this.camera, w, h);
    this.gtaoPass.output = GTAOPass.OUTPUT.Default;
    this.gtaoPass.blendIntensity = 1.25;
    this.gtaoPass.updateGtaoMaterial({
      radius: 0.6,
      distanceExponent: 1.9,
      thickness: 1.7,
      scale: 1.5,
      samples: this.isMobileDevice ? 8 : 16,
      distanceFallOff: 1,
      screenSpaceRadius: false,
    });
    this.gtaoPass.updatePdMaterial({
      lumaPhi: 10,
      depthPhi: 2,
      normalPhi: 3,
      radius: 5,
      radiusExponent: 1.2,
      rings: 2,
      samples: this.isMobileDevice ? 8 : 16,
    });
    this.gtaoPass.enabled = this.settings.ambientOcclusion && !this.isMobileDevice;
    // effects stay on for every device: the auto-quality ladder only touches
    // resolution and shadow-map size, never the visual identity of the game.
    this.composer.addPass(this.gtaoPass);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.62, 0.62, 1.05);
    this.bloom.radius = 0.7;
    this.bloom.enabled = this.settings.bloom;
    this.composer.addPass(this.bloom);
    this.godRays = createGodRays();
    this.godPass = new ShaderPass(
      new THREE.ShaderMaterial({
        uniforms: {
          tDiffuse: { value: null as THREE.Texture | null },
          uRays: { value: null as THREE.Texture | null },
        },
        vertexShader: this.godRays.material.vertexShader,
        fragmentShader: `
          uniform sampler2D tDiffuse; uniform sampler2D uRays; varying vec2 vUv;
          void main(){
            vec4 base = texture2D(tDiffuse, vUv);
            vec4 rays = texture2D(uRays, vUv);
            gl_FragColor = vec4(base.rgb + rays.rgb * rays.a, 1.0);
          }`,
      })
    );
    this.godPass.needsSwap = true;
    const overlay = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      this.godRays.material
    );
    overlay.frustumCulled = false;
    this.godRays.material.uniforms.uRaysTex = { value: null };
    (this.godRays.material.uniforms as Record<string, THREE.IUniform>).uRayTexture = { value: null };
    this.rayScene = new THREE.Scene();
    this.rayScene.add(overlay);
    this.rayCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.rayTarget = new THREE.WebGLRenderTarget(512, 512, { type: THREE.HalfFloatType });
    this.godPass.uniforms.uRays.value = this.rayTarget.texture;
    this.composer.addPass(this.godPass);
    this.composer.addPass(new OutputPass());
    const gradeShader = {
      uniforms: {
        tDiffuse: { value: null as THREE.Texture | null },
        uTime: { value: 0 },
        uSat: { value: 1.12 },
        uContrast: { value: 1.06 },
        uVignette: { value: 0.34 },
        uGrain: { value: 0.016 },
        uAberration: { value: 0.0018 },
        uSunPos: { value: new THREE.Vector2(0.5, 0.8) },
        uFlare: { value: 1 },
        uAspect: { value: 1 },
        uUnderwater: { value: 0 },
        uFlash: { value: 0 },
        uSpeed: { value: 0 },
        uWet: { value: 0 },
        uSharpen: { value: 1 },
        uCaustics: { value: 0 },
        uTexel: { value: new THREE.Vector2(1 / 1920, 1 / 1080) },
      },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        uniform sampler2D tDiffuse; uniform float uTime, uSat, uContrast, uVignette, uGrain, uAberration, uFlare, uAspect, uFlash, uSpeed, uWet, uSharpen, uCaustics;
        uniform vec2 uTexel;
        uniform vec2 uSunPos; uniform float uUnderwater;
        varying vec2 vUv;
        float flareDisc(vec2 uv, vec2 p, float r){ vec2 d = uv - p; d.x *= uAspect; return smoothstep(r, r * 0.25, length(d)); }
        void main(){
          vec2 uv = vUv;
          if (uUnderwater > 0.01) {
            uv.x += sin(uv.y * 38.0 + uTime * 2.1) * 0.0022 * uUnderwater;
            uv.y += cos(uv.x * 46.0 + uTime * 1.7) * 0.0018 * uUnderwater;
          }
          vec2 d = uv - vec2(0.5);
          float dist = length(d);
          vec2 off = normalize(d + 1e-5) * uAberration * dist * dist;
          vec3 col;
          col.r = texture2D(tDiffuse, uv + off).r;
          col.g = texture2D(tDiffuse, uv).g;
          col.b = texture2D(tDiffuse, uv - off).b;

          // rain droplets on the lens (subtle refraction during wet weather)
          if (uWet > 0.15) {
            vec2 g = uv * vec2(uAspect * 30.0, 30.0);
            vec2 cell = fract(g) - 0.5;
            float drop = smoothstep(0.16, 0.02, length(cell));
            float noise = fract(sin(dot(floor(g), vec2(12.9, 78.2))) * 43758.5);
            float alive = step(0.88, noise);
            float edgeMask = smoothstep(0.25, 0.6, length(vUv - 0.5));
            col.rgb = mix(col.rgb, col.rgb * 0.96 - 0.01, drop * alive * uWet * 0.6);
            col.rgb += vec3(0.6, 0.78, 0.95) * drop * alive * edgeMask * uWet * 0.05;
          }

          // underwater caustics
          if (uCaustics > 0.01) {
            vec2 c = vUv * 9.0;
            float ca = sin(c.x * 3.1 + uTime * 0.9) * sin(c.y * 2.7 - uTime * 1.1);
            ca = pow(abs(ca), 2.0) * 0.5;
            float ca2 = sin(c.x * 5.3 - uTime * 1.3) * sin(c.y * 4.1 + uTime * 0.7);
            ca += pow(abs(ca2), 4.0);
            col.rgb += vec3(0.45, 0.8, 1.0) * ca * uCaustics * 0.18;
          }
          float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
          col = mix(vec3(lum), col, uSat);
          col = (col - 0.5) * uContrast + 0.5;
          // filmic soft shoulder: compress highlights instead of clipping to white
          vec3 over = max(col - 0.76, 0.0);
          col -= over * 0.75;
          col = max(col, 0.0);
          col *= vec3(1.02, 1.0, 0.975);
          // gentle filmic split tone: cool shadows, warm highlights
          float l2 = dot(col, vec3(0.2126, 0.7152, 0.0722));
          vec3 cool = vec3(0.94, 0.99, 1.07);
          vec3 warm = vec3(1.05, 1.015, 0.96);
          col *= mix(cool, warm, smoothstep(0.25, 0.85, l2));
          col = pow(max(col, 0.0), vec3(0.96));
          col = mix(vec3(0.012), col, 1.02);
          col = mix(col, col * vec3(0.52, 0.85, 1.12) + vec3(0.01, 0.05, 0.09), uUnderwater * 0.72);
          // wet / overcast cinematic grade
          col = mix(col, vec3(dot(col, vec3(0.299, 0.587, 0.114))) * vec3(0.82, 0.93, 1.05), uWet * 0.22);
          // speed lines + tunnel vignette while sprinting or flying
          float radial = smoothstep(0.18, 0.72, dist);
          float lines = pow(abs(sin(atan(d.y, d.x) * 34.0)), 8.0) * radial;
          col += vec3(0.75, 0.88, 1.0) * lines * uSpeed * 0.16;
          col *= 1.0 - radial * uSpeed * 0.22;
          // lightning flash
          col += vec3(0.86, 0.93, 1.0) * uFlash * (0.35 + smoothstep(0.2, 0.9, 1.0 - dist) * 0.4);

          // --- CAS-style sharpening (keeps pixel art crisp in HD/4K) ---
          vec3 n1 = texture2D(tDiffuse, uv + vec2(uTexel.x, 0.0)).rgb;
          vec3 n2 = texture2D(tDiffuse, uv - vec2(uTexel.x, 0.0)).rgb;
          vec3 n3 = texture2D(tDiffuse, uv + vec2(0.0, uTexel.y)).rgb;
          vec3 n4 = texture2D(tDiffuse, uv - vec2(0.0, uTexel.y)).rgb;
          vec3 blur = (n1 + n2 + n3 + n4) * 0.25;
          col += (col - blur) * uSharpen * 0.6;

          // --- filmic halation around highlights ---
          vec3 hi = max(col - 0.78, 0.0);
          vec3 halation = vec3(1.0, 0.42, 0.2) * dot(hi, vec3(0.33));
          col += halation * 0.35;
          col *= 1.0 - uVignette * smoothstep(0.32, 0.95, dist);
          float grain = fract(sin(dot(uv * (1.0 + fract(uTime)), vec2(12.9898, 78.233))) * 43758.5453);
          col += (grain - 0.5) * uGrain;
          // anamorphic sun streaks + subtle lens ghosts (only when the sun is in view)
          vec2 sun = uSunPos;
          float sunVisible = smoothstep(-0.05, 0.25, sun.y) * smoothstep(1.25, 0.65, sun.x) * smoothstep(-0.25, 0.15, sun.x) * uFlare;
          if (sunVisible > 0.001) {
            vec2 d = uv - sun; d.x *= uAspect;
            float streakH = exp(-abs(d.y) * 190.0) * exp(-abs(d.x) * 1.6) * 0.16;
            float halo = smoothstep(0.22, 0.0, length(d)) * 0.06;
            vec3 flareCol = vec3(1.0, 0.9, 0.72);
            col += flareCol * (streakH + halo) * sunVisible;
            vec2 axis = (vec2(0.5) - sun);
            for (int i = 1; i <= 4; i++) {
              float t = float(i) * 0.42;
              vec2 gp = sun + axis * t;
              float r = 0.026 + float(i) * 0.012;
              float disc = smoothstep(r, r * 0.55, length((uv - gp) * vec2(uAspect, 1.0)));
              vec3 tint = i == 1 ? vec3(0.55, 0.82, 1.0) : i == 2 ? vec3(1.0, 0.72, 0.45) : i == 3 ? vec3(0.7, 1.0, 0.78) : vec3(0.9, 0.6, 1.0);
              col += tint * disc * 0.045 * sunVisible;
            }
          }
          gl_FragColor = vec4(col, 1.0);
        }`,
    };
    this.gradePass = new ShaderPass(gradeShader);
    this.composer.addPass(this.gradePass);
  }

  // -------------------------------------------------------------------------
  // World loading
  // -------------------------------------------------------------------------
  async loadWorldProgressive(seed: number, edits: [number, number][] | null, restore?: SaveData | null) {
    const loadVersion = ++this.worldLoadVersion;
    const isCurrentLoad = () => !this.disposed && loadVersion === this.worldLoadVersion;
    const generation = () => this.generateAndRestore(seed, edits, restore);
    generation();
    this.emitLoadProgress(55, "Menyusun blok & landmark");
    await this.yieldToBrowser();
    if (!isCurrentLoad()) return;

    // Build the very first chunks (a small ring) so play can start immediately.
    const radius = 1;
    const pcx = Math.floor(this.pos.x / CHUNK);
    const pcz = Math.floor(this.pos.z / CHUNK);
    const totalX = Math.ceil(SX / CHUNK);
    const totalZ = Math.ceil(SZ / CHUNK);
    const rings: { cx: number; cz: number; d: number }[] = [];
    for (let cx = pcx - radius; cx <= pcx + radius; cx++) {
      for (let cz = pcz - radius; cz <= pcz + radius; cz++) {
        if (cx < 0 || cz < 0 || cx >= totalX || cz >= totalZ) continue;
        rings.push({ cx, cz, d: Math.hypot(cx - pcx, cz - pcz) });
      }
    }
    rings.sort((a, b) => a.d - b.d);
    for (let i = 0; i < rings.length; i++) {
      this.buildChunk(rings[i].cx, rings[i].cz);
      this.emitLoadProgress(58 + Math.round((i / Math.max(1, rings.length)) * 26), "Membangun kubus dunia");
      await this.yieldToBrowser();
      if (!isCurrentLoad()) return;
    }

    if (this.mobs) this.scene.remove(this.mobs.group);
    this.mobs = createMobs({ x: 51, z: 38 });
    this.scene.add(this.mobs.group);
    if (!this.character) {
      this.character = createCharacter();
      this.scene.add(this.character.group);
      this.hand = createHandRig(this.camera, this.scene);
    }
    this.emitLoadProgress(90, "Menyiapkan kamera, hewan & NPC");
    await this.yieldToBrowser();
    if (!isCurrentLoad()) return;
    this.finalizeWorld(restore);
    this.emitLoadProgress(96, "Hampir selesai");
    // Rendering begins as soon as the spawn area and player are ready. Distant
    // chunks continue streaming through the normal frame loop.
    if (!this.animationStarted) {
      this.animationStarted = true;
      this.animate();
    }
    // Decorative light emitters and shoreline foam are still generated, but
    // after the player has entered the world so they do not extend the loading
    // screen. The version check prevents stale work after cancel/restart.
    window.setTimeout(() => {
      if (!isCurrentLoad()) return;
      this.setupWorldLights();
      this.buildShoreFoam();
    }, 80);
  }

  private generateAndRestore(seed: number, edits: [number, number][] | null, restore?: SaveData | null) {
    this.seed = seed;
    this.sessionStarted = false;
    this.worldReady = false;
    this.clearWorldMeshes();
    this.emitLoadProgress(12, "Membentuk daratan & danau");
    this.world = generateWorld(seed);
    this.worldReady = true;
    this.mapDirty = true;
    this.cachedMap = null;
    this.emitLoadProgress(35, "Menumbuhkan hutan & landmark");
    if (edits && edits.length) applyWorldEdits(this.world, edits);
    this.applyRestoreState(restore);
  }

  private applyRestoreState(restore?: SaveData | null) {
    if (restore) {
      this.inventory = { ...this.inventory, ...restore.inventory };
      this.selected = restore.selected ?? ID.grass;
      this.mined = restore.mined ?? 0;
      this.placed = restore.placed ?? 0;
      this.distanceWalked = restore.distance ?? 0;
      this.peak = restore.peak ?? 0;
      this.nights = restore.nights ?? 0;
      this.settings.time = restore.time ?? this.settings.time;
      this.pos.set(restore.player.x, restore.player.y, restore.player.z);
    } else {
      this.inventory = initialInventory();
      this.selected = ID.grass;
      this.mined = 0;
      this.placed = 0;
      this.distanceWalked = 0;
      this.peak = 0;
      this.nights = 0;
      this.pos.set(this.world.spawn.x, this.world.spawn.y, this.world.spawn.z);
    }
  }

  private finalizeWorld(restore?: SaveData | null) {
    this.firstPerson = this.settings.firstPerson ?? true;
    this.cameraDistance = this.settings.cameraDistance;
    this.character.group.position.copy(this.pos);
    this.character.setHeld(this.selected);
    this.hand?.setHeld(this.selected);
    this.velocity.set(0, 0, 0);
    this.mapDirty = true;
    this.reflectionTimer = 0.6;
    this.yaw = 1.42;
    this.pitch = 0.12;
    this.cameraYawSmooth = this.yaw;
    this.cameraPitchSmooth = this.pitch;
    this.cameraDistanceSmooth = this.settings.cameraDistance;
    this.applySky(true);
    this.emitInventory();
    this.emitEffects();
    this.emitStats();
    this.saveDirty = false;
    void restore;
  }

  loadWorld(seed: number, edits: [number, number][] | null, restore?: SaveData | null) {
    this.seed = seed;
    this.sessionStarted = false;
    this.clearWorldMeshes();
    this.emitLoadProgress(20, "Membentuk daratan & danau");
    this.world = generateWorld(seed);
    this.worldReady = true;
    this.emitLoadProgress(52, "Menumbuhkan hutan & landmark");
    this.pendingStart = true;
    if (edits && edits.length) applyWorldEdits(this.world, edits);
    if (restore) {
      this.inventory = { ...this.inventory, ...restore.inventory };
      this.selected = restore.selected ?? ID.grass;
      this.mined = restore.mined ?? 0;
      this.placed = restore.placed ?? 0;
      this.distanceWalked = restore.distance ?? 0;
      this.peak = restore.peak ?? 0;
      this.nights = restore.nights ?? 0;
      this.settings.time = restore.time ?? this.settings.time;
      this.pos.set(restore.player.x, restore.player.y, restore.player.z);
    } else {
      this.inventory = initialInventory();
      this.selected = ID.grass;
      this.mined = 0;
      this.placed = 0;
      this.distanceWalked = 0;
      this.peak = 0;
      this.nights = 0;
      this.pos.set(this.world.spawn.x, this.world.spawn.y, this.world.spawn.z);
    }

    this.emitLoadProgress(62, "Membangun dunia awal");
    this.updateChunkStreaming(true);
    this.emitLoadProgress(80, "Memasang pencahayaan");
    this.setupWorldLights();
    this.buildShoreFoam();
    if (this.mobs) {
      this.scene.remove(this.mobs.group);
    }
    this.mobs = createMobs({ x: 51, z: 38 });
    this.scene.add(this.mobs.group);
    if (!this.character) {
      this.character = createCharacter();
      this.scene.add(this.character.group);
      this.hand = createHandRig(this.camera, this.scene);
    }
    this.firstPerson = this.settings.firstPerson ?? true;
    this.cameraDistance = this.settings.cameraDistance;
    this.character.group.position.copy(this.pos);
    this.character.setHeld(this.selected);
    this.hand?.setHeld(this.selected);
    this.velocity.set(0, 0, 0);
    this.mapDirty = true;
    this.yaw = 1.42;
    this.applySky(true);
    this.emitInventory();
    this.emitStats();
    this.saveDirty = false;
  }

  private clearWorldMeshes() {
    if (this.foam) {
      this.scene.remove(this.foam);
      this.foam.geometry.dispose();
      (this.foamMaterial as THREE.Material | null)?.dispose();
      this.foam = null;
      this.foamMaterial = null;
    }
    for (const [, entry] of this.chunkMeshes) {
      for (const mesh of entry.meshes) {
        this.chunkGroup.remove(mesh);
      }
      disposeChunkGeometry(entry.geo);
    }
    this.chunkMeshes.clear();
    for (const light of this.pointLights) {
      this.scene.remove(light);
    }
    this.pointLights = [];
    while (this.lightGroup.children.length) {
      const child = this.lightGroup.children[0];
      this.lightGroup.remove(child);
    }
  }

  private makeMesh(geometry: THREE.BufferGeometry | null, material: THREE.Material, castShadow: boolean, order = 0): THREE.Mesh | null {
    if (!geometry) return null;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = castShadow && this.settings.shadows;
    mesh.receiveShadow = true;
    mesh.renderOrder = order;
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    return mesh;
  }

  private buildChunk(cx: number, cz: number) {
    const key = `${cx},${cz}`;
    const previous = this.chunkMeshes.get(key);
    if (previous) {
      for (const mesh of previous.meshes) this.chunkGroup.remove(mesh);
      disposeChunkGeometry(previous.geo);
    }
    const geo = buildChunkGeometry(this.world, cx, cz);
    const meshes: THREE.Mesh[] = [];
    const opaque = this.makeMesh(geo.opaque, this.opaqueMat, true);
    if (opaque) meshes.push(opaque);
    const cutout = this.makeMesh(geo.cutout, this.cutoutMat, true);
    if (cutout) meshes.push(cutout);
    const plants = this.makeMesh(geo.plants, this.plantMat, true);
    if (plants) meshes.push(plants);
    const emissive = this.makeMesh(geo.emissive, this.emissiveMat, false, 1);
    if (emissive) {
      emissive.castShadow = false;
      emissive.receiveShadow = false;
      meshes.push(emissive);
    }
    const translucent = this.makeMesh(geo.translucent, this.translucentMat, false, 2);
    if (translucent) meshes.push(translucent);
    const water = this.makeMesh(geo.water, this.waterSideMat, false, 3);
    if (water) meshes.push(water);
    for (const mesh of meshes) this.chunkGroup.add(mesh);
    this.chunkMeshes.set(key, { meshes, geo });
  }

  private chunkRadius() {
    return this.isMobileDevice ? 3 : 5;
  }

  private initialChunkRadius() {
    return this.isMobileDevice ? 2 : 2;
  }

  private yieldToBrowser(): Promise<void> {
    return new Promise((resolve) => {
      const schedule = typeof requestAnimationFrame === "function" ? requestAnimationFrame : (cb: FrameRequestCallback) => window.setTimeout(() => cb(performance.now()), 16);
      schedule(() => resolve());
    });
  }

  private updateChunkStreaming(initial = false) {
    const radius = initial ? this.initialChunkRadius() : this.chunkRadius();
    const pcx = Math.floor(this.pos.x / CHUNK);
    const pcz = Math.floor(this.pos.z / CHUNK);
    const totalX = Math.ceil(SX / CHUNK);
    const totalZ = Math.ceil(SZ / CHUNK);
    const wanted = new Set<string>();
    const queue: { cx: number; cz: number; dist: number }[] = [];
    for (let cx = pcx - radius; cx <= pcx + radius; cx++) {
      for (let cz = pcz - radius; cz <= pcz + radius; cz++) {
        if (cx < 0 || cz < 0 || cx >= totalX || cz >= totalZ) continue;
        const key = `${cx},${cz}`;
        wanted.add(key);
        if (!this.chunkMeshes.has(key)) {
          queue.push({ cx, cz, dist: Math.hypot(cx - pcx, cz - pcz) });
        }
      }
    }
    // unload far chunks to keep memory and draw calls healthy
    for (const key of Array.from(this.chunkMeshes.keys())) {
      if (wanted.has(key)) continue;
      const [cx, cz] = key.split(",").map(Number);
      if (Math.hypot(cx - pcx, cz - pcz) <= radius + 1) continue;
      const entry = this.chunkMeshes.get(key);
      if (!entry) continue;
      for (const mesh of entry.meshes) this.chunkGroup.remove(mesh);
      disposeChunkGeometry(entry.geo);
      this.chunkMeshes.delete(key);
    }
    queue.sort((a, b) => a.dist - b.dist);
    const budget = initial ? queue.length : 2;
    for (let i = 0; i < Math.min(budget, queue.length); i++) {
      this.buildChunk(queue[i].cx, queue[i].cz);
    }
  }

  private rebuildAround(x: number, z: number) {
    this.renderer.shadowMap.needsUpdate = true;
    const cx = Math.floor(x / CHUNK);
    const cz = Math.floor(z / CHUNK);
    const coords = new Set<string>([`${cx},${cz}`]);
    if (x % CHUNK === 0) coords.add(`${cx - 1},${cz}`);
    if (x % CHUNK === CHUNK - 1) coords.add(`${cx + 1},${cz}`);
    if (z % CHUNK === 0) coords.add(`${cx},${cz - 1}`);
    if (z % CHUNK === CHUNK - 1) coords.add(`${cx},${cz + 1}`);
    for (const key of coords) {
      const [a, b] = key.split(",").map(Number);
      if (a < 0 || b < 0 || a >= Math.ceil(SX / CHUNK) || b >= Math.ceil(SZ / CHUNK)) continue;
      if (!this.chunkMeshes.has(key) && this.chunkMeshes.size > 0) {
        // only remesh chunks that are currently streamed in
        const dist = Math.hypot(a - Math.floor(x / CHUNK), b - Math.floor(z / CHUNK));
        if (dist > this.chunkRadius() + 1) continue;
      }
      this.buildChunk(a, b);
    }
    this.mapDirty = true;
  }

  private hash01(a: number, b: number) {
    let h = Math.imul(a * 374761393, 19349663) ^ Math.imul(b * 668265263, 2654435761);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  private buildShoreFoam() {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext("2d")!;
    const grad = ctx.createRadialGradient(32, 32, 3, 32, 32, 31);
    grad.addColorStop(0, "rgba(255,255,255,0)");
    grad.addColorStop(0.62, "rgba(255,255,255,0)");
    grad.addColorStop(0.76, "rgba(255,255,255,.95)");
    grad.addColorStop(0.9, "rgba(245,253,255,.35)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    ctx.strokeStyle = "rgba(255,255,255,.8)";
    for (let i = 0; i < 7; i++) {
      ctx.beginPath();
      ctx.arc(32, 32, 10 + i * 2.4, Math.random() * 6, Math.random() * 6 + 0.8);
      ctx.stroke();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    const cells: { x: number; z: number; s: number; r: number }[] = [];
    for (let x = 1; x < SX - 1; x++) {
      for (let z = 1; z < SZ - 1; z++) {
        const here = this.world.blocks[((SEA + 1) * SZ + z) * SX + x];
        const atSea = this.world.blocks[(SEA * SZ + z) * SX + x];
        if (here !== ID.water && atSea !== ID.water) continue;
        let shoreline = false;
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const n = getBlock(this.world, x + dx, SEA + 1, z + dz);
          if (n !== ID.air && blockDef(n).solid) shoreline = true;
        }
        if (!shoreline) continue;
        if (this.hash01(x * 7 + z, 13) > 0.55) continue;
        cells.push({ x: x + 0.5, z: z + 0.5, s: 0.7 + this.hash01(x, z * 3) * 0.9, r: this.hash01(x * 5, z) * Math.PI * 2 });
        if (cells.length >= 420) break;
      }
      if (cells.length >= 420) break;
    }
    if (!cells.length) return;
    this.foamMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    this.foam = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.1, 1.1), this.foamMaterial, cells.length);
    const dummy = new THREE.Object3D();
    cells.forEach((c, i) => {
      dummy.position.set(c.x, WATER_Y + 0.02, c.z);
      dummy.rotation.set(-Math.PI / 2, 0, c.r);
      dummy.scale.set(c.s, c.s, c.s);
      dummy.updateMatrix();
      this.foam!.setMatrixAt(i, dummy.matrix);
    });
    this.foam.instanceMatrix.needsUpdate = true;
    this.foam.frustumCulled = false;
    this.scene.add(this.foam);
  }

  private setupWorldLights() {
    const candidates: { x: number; y: number; z: number }[] = [];
    // Scan the voxel buffer linearly (the original x/z/y traversal jumped
    // through memory) and sort the small result to preserve the original
    // candidate order before selecting the same lights.
    const blocks = this.world.blocks;
    const layerSize = SX * SZ;
    for (let i = 0; i < blocks.length; i++) {
      const id = blocks[i];
      if (id !== ID.lantern && id !== ID.glowstone && id !== ID.lava) continue;
      candidates.push({
        x: i % SX,
        z: Math.floor(i / SX) % SZ,
        y: Math.floor(i / layerSize),
      });
    }
    candidates.sort((a, b) => a.x - b.x || a.z - b.z || a.y - b.y);
    if (candidates.length > 90) candidates.length = 90;
    // all lights get a bloom sprite
    for (let i = 0; i < Math.min(candidates.length, 80); i++) {
      const c = candidates[i];
      const sprite = new THREE.Sprite(this.glowMaterial);
      sprite.position.set(c.x + 0.5, c.y + 0.55, c.z + 0.5);
      sprite.scale.setScalar(c.y > 14 ? 3.6 : 2.6);
      this.lightGroup.add(sprite);
    }
    // only a handful of real point lights for performance
    const selected: { x: number; y: number; z: number }[] = [];
    for (const c of candidates) {
      if (c.y < 11) continue;
      if (selected.some((s) => Math.hypot(s.x - c.x, s.z - c.z) < 11)) continue;
      selected.push(c);
      if (selected.length >= 4) break;
    }
    for (const c of selected) {
      const light = new THREE.PointLight(0xffbf70, 14, 13, 2);
      light.position.set(c.x + 0.5, c.y + 0.6, c.z + 0.5);
      this.scene.add(light);
      this.pointLights.push(light);
    }
  }

  // -------------------------------------------------------------------------
  // Sky, environment and lighting
  // -------------------------------------------------------------------------
  private captureReflections() {
    if (!this.cubeCamera || !this.cubeRT) return;
    const hidden: THREE.Object3D[] = [];
    const hide = (obj: THREE.Object3D | null) => {
      if (obj && obj.visible) {
        hidden.push(obj);
        obj.visible = false;
      }
    };
    hide(this.ocean);
    hide(this.foam);
    hide(this.character?.group ?? null);
    hide(this.hand?.group ?? null);
    hide(this.weatherRig?.rain ?? null);
    hide(this.highlight);
    this.cubeCamera.position.set(this.pos.x, WATER_Y + 2.2, this.pos.z);
    this.cubeCamera.update(this.renderer, this.scene);
    for (const obj of hidden) obj.visible = true;
    const env = this.cubeRT.texture;
    const oceanMat = this.ocean.material as THREE.MeshPhysicalMaterial;
    oceanMat.envMap = env;
    oceanMat.envMapIntensity = 1.7 + (this.settings.effectStrength - 1) * 1.0;
    oceanMat.needsUpdate = true;
    this.waterSideMat.envMap = env;
    this.waterSideMat.envMapIntensity = 1.3;
    this.waterSideMat.needsUpdate = true;
    this.translucentMat.envMap = env;
    this.translucentMat.envMapIntensity = 1.6;
    this.translucentMat.needsUpdate = true;
    this.plantMat.envMap = env;
    this.plantMat.needsUpdate = true;
    this.opaqueMat.envMap = env;
    this.opaqueMat.envMapIntensity = 0.5;
    this.opaqueMat.needsUpdate = true;
    this.reflectionTimer = 14;
  }

  private spawnRipple(x: number, z: number, life = 1.1, size = 1) {
    this.rippleData[this.rippleCursor] = { x, z, life, max: life * (1.4 + size) };
    this.rippleCursor = (this.rippleCursor + 1) % this.rippleData.length;
  }

  private updateRipples(dt: number) {
    if (!this.ripples) return;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    let dirty = false;
    this.rippleClock -= dt;
    const raining = this.settings.weather !== "clear";
    if (this.rippleClock <= 0) {
      this.rippleClock = raining ? 0.12 : 0.5;
      const radius = raining ? 16 : 5;
      for (let i = 0; i < (raining ? 4 : 1); i++) {
        const rx = Math.floor(this.pos.x + (Math.random() - 0.5) * radius * 2);
        const rz = Math.floor(this.pos.z + (Math.random() - 0.5) * radius * 2);
        if (getBlock(this.world, rx, SEA, rz) === ID.water && getBlock(this.world, rx, SEA + 1, rz) === ID.air) {
          this.spawnRipple(rx + 0.5, rz + 0.5, 0.9, raining ? 1.1 : 0.7);
        }
      }
    }
    for (let i = 0; i < this.rippleData.length; i++) {
      const r = this.rippleData[i];
      if (r.life <= 0) {
        dummy.position.set(0, -100, 0);
        dummy.scale.setScalar(0.001);
      } else {
        r.life -= dt;
        const p = 1 - Math.max(0, r.life) / r.max;
        const scale = 0.35 + p * 2.6;
        dummy.position.set(r.x, WATER_Y + 0.04, r.z);
        dummy.scale.set(scale, 1, scale);
        const fade = Math.max(0, 1 - p) * 0.85;
        color.setRGB(fade * 0.55, fade * 0.78, fade);
        this.ripples.setColorAt(i, color);
        dirty = true;
      }
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      this.ripples.setMatrixAt(i, dummy.matrix);
    }
    this.ripples.instanceMatrix.needsUpdate = true;
    if (dirty && this.ripples.instanceColor) this.ripples.instanceColor.needsUpdate = true;
  }

  applyUltraPreset() {
    if (!this.bloom || !this.gtaoPass || !this.smaaPass) return;
    this.setSettings({
      shadows: true,
      shadowQuality: "high",
      bloom: true,
      reflections: true,
      ambientOcclusion: true,
      antiAliasing: true,
      effects: true,
      clouds: true,
      depthOfField: false,
      resolution: Math.min(2, Math.max(1, window.devicePixelRatio || 1)),
    });
    this.captureReflections();
    this.callbacks.onEvent?.("toast", { text: "Ultra Visual MAX aktif — bloom, bayangan 4K, refleksi & efek diperkuat", tone: "success" });
  }

  setWeather(weather: "clear" | "rain" | "storm") {
    this.settings.weather = weather;
    this.skyTimer = 0.05;
    this.envTimer = 0;
    this.lightningTimer = 4;
    this.callbacks.onEvent?.("toast", {
      text: weather === "storm" ? "Badai petir datang — siapkan lentera" : weather === "rain" ? "Hujan turun di lembah" : "Langit kembali cerah",
      tone: weather === "clear" ? "success" : "info",
    });
  }

  private applySky(forceEnv = false) {
    this.skyState = computeSky(this.settings.time);
    const state = this.skyState;
    const targetWet = this.settings.weather === "storm" ? 1 : this.settings.weather === "rain" ? 0.55 : 0;
    this.wetness += (targetWet - this.wetness) * 0.06;
    const overcast = this.wetness;
    const stormGrey = new THREE.Color("#6a7683");
    const stormHorizon = new THREE.Color("#93a1ac");
    state.top.lerp(stormGrey, overcast * 0.85);
    state.horizon.lerp(stormHorizon, overcast * 0.8);
    state.bottom.lerp(new THREE.Color("#4a555f"), overcast * 0.7);
    state.sun.lerp(new THREE.Color("#e8eef5"), overcast * 0.6);
    this.skyRig.update(state, this.elapsed);
    this.skyRig.sky.position.copy(this.camera.position);
    this.hemi.color.copy(state.top).lerp(new THREE.Color("#ffffff"), 0.4);
    this.hemi.groundColor.setRGB(0.26 + state.day * 0.2, 0.34 + state.day * 0.22, 0.18 + state.day * 0.12);
    this.hemi.intensity = 0.2 + state.day * 0.4;
    this.ambient.intensity = 0.22 + state.day * 0.11 + state.night * 0.08;
    const isNight = state.sunDir.y <= 0.02;
    // lower the light elevation a touch so shadows stretch across the terrain
    const lightDir = isNight
      ? state.sunDir.clone().multiplyScalar(-1)
      : new THREE.Vector3(state.sunDir.x, Math.max(0.3, state.sunDir.y * 0.6), state.sunDir.z).normalize();
    const anchor = this.playerAnchor();
    this.sunLight.position.copy(anchor).add(lightDir.multiplyScalar(78));
    this.sunLight.position.y = Math.max(this.sunLight.position.y, anchor.y + 12);
    // texel snapping keeps shadow edges perfectly stable while walking
    const shadowExtent = { low: 40, medium: 52, high: 66 }[this.settings.shadowQuality];
    const texelSize = (shadowExtent * 2) / this.sunLight.shadow.mapSize.x;
    const snapped = new THREE.Vector3(
      Math.round(anchor.x / texelSize) * texelSize,
      Math.round(anchor.y / texelSize) * texelSize,
      Math.round(anchor.z / texelSize) * texelSize
    );
    this.sunTarget.position.copy(snapped);
    this.sunTarget.updateMatrixWorld();
    this.shadowTimer -= 0.14;
    if (this.settings.shadows && (this.shadowTimer <= 0 || this.shadowAnchor.distanceToSquared(snapped) > texelSize * texelSize * 4)) {
      this.renderer.shadowMap.needsUpdate = true;
      this.shadowAnchor.copy(snapped);
      this.shadowTimer = 0.35;
    }
    this.sunLight.color.copy(isNight ? new THREE.Color("#7e93e0") : state.sun);
    const sunBase = isNight ? 0.45 + state.night * 0.2 : 1.55 + state.day * 1.9;
    this.sunLight.intensity = sunBase * (1 - overcast * 0.72) + this.lightningFlash * 14;
    this.sunLight.shadow.radius = 1.8 + state.day * 0.6;
    this.hemi.intensity = (0.26 + state.day * 0.34) * (1 - overcast * 0.3) + this.lightningFlash * 2;
    this.sunLight.castShadow = this.settings.shadows;
    this.fillLight.intensity = 0.14 + state.day * 0.24 - state.night * 0.02;
    this.fillLight.color.copy(state.horizon).lerp(new THREE.Color("#8fb4ff"), 0.5);
    this.bounceLight.intensity = (0.22 + state.day * 0.38) * (1 - overcast * 0.5);
    this.bounceLight.color.copy(state.sun).lerp(new THREE.Color("#ffbf7a"), 0.45);
    this.bounceLight.position.copy(anchor).add(new THREE.Vector3(-lightDir.x * 30, -22, -lightDir.z * 30));
    this.rimLight.intensity = 0.2 + state.day * 0.34 + state.night * 0.14;
    this.rimLight.color.copy(state.horizon).lerp(new THREE.Color("#a9c8ff"), 0.6);
    this.rimLight.position.copy(anchor).add(new THREE.Vector3(-lightDir.x * 50, 26, -lightDir.z * 50));
    const flicker = 0.86 + Math.sin(this.elapsed * 7.3) * 0.08 + Math.sin(this.elapsed * 3.1) * 0.06;
    for (const l of this.pointLights) l.intensity = (9 + state.night * 34) * flicker;
    this.lightGroup.visible = this.settings.effects;
    this.glowMaterial.opacity = 0.2 + state.night * 0.85;
    const warm = 0.9 + state.night * 0.55;
    this.emissiveMat.color.setRGB(warm, warm * 0.9, warm * 0.72);
    const deepNight = state.sunDir.y < -0.05 ? Math.min(1, (-state.sunDir.y - 0.05) * 6) : 0;
    (this.fireflies.material as THREE.PointsMaterial).opacity = this.settings.effects ? deepNight * 0.9 : 0;
    (this.sparkles.material as THREE.PointsMaterial).opacity = this.settings.effects ? 0.12 + state.day * 0.28 : 0;
    this.skyRig.clouds.visible = this.settings.clouds;
    this.skyRig.stars.visible = state.night > 0.02;
    this.skyRig.islands.visible = true;

    if (forceEnv) this.envTimer = 0;
  }

  private updateEnvironment() {
    // The first frame should be cheap: build the reflective environment after
    // the world is already on screen (or skip it entirely on software GL).
    if (this.elapsed < 1.2 || this.softwareRenderer) {
      this.envTimer = 6;
      if (this.softwareRenderer && this.environment === null) {
        if (this.gtaoPass) this.gtaoPass.enabled = false;
      }
      return;
    }
    if (!this.settings.reflections) {
      if (this.environment) {
        this.environment.dispose();
        this.environment = null;
        this.scene.environment = null;
      }
      this.envTimer = 8;
      return;
    }
    if (this.environment) this.environment.dispose();
    if (!this.pmrem || this.pmremRenderer !== this.renderer) {
      this.pmrem?.dispose();
    this.rayTarget?.dispose();
    this.godRays?.material.dispose();
    this.godPass?.material.dispose();
      this.pmrem = new THREE.PMREMGenerator(this.renderer);
      this.pmremRenderer = this.renderer;
    }
    const result = createEnvironmentMap(this.renderer, this.skyState, this.pmrem);
    this.pmrem = result.generator;
    this.environment = result.texture;
    this.scene.environment = this.environment;
    this.envTimer = 40;
  }

  // -------------------------------------------------------------------------
  // Input
  // -------------------------------------------------------------------------
  private setupInput() {
    const el = this.renderer.domElement;
    el.addEventListener("pointerdown", this.onPointerDown);
    el.addEventListener("pointermove", this.onPointerMove);
    el.addEventListener("pointerup", this.onPointerUp);
    el.addEventListener("pointercancel", this.onPointerUp);
    window.addEventListener("pointerup", this.onPointerUp);
    el.addEventListener("wheel", this.onWheel, { passive: false });
    el.addEventListener("contextmenu", this.onContextMenu);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
  }

  private onContextMenu = (e: Event) => e.preventDefault();

  private onPointerDown = (e: PointerEvent) => {
    if (this.mode === "menu" || !this.inputEnabled) return;
    if (e.button !== 0 && e.button !== 2 && e.pointerType !== "touch") return;
    this.pointerDown = true;
    this.pointerId = e.pointerId;
    this.pointerTravel = 0;
    this.lastPointer = { x: e.clientX, y: e.clientY };
    this.lastPointerTime = performance.now();
    try {
      this.renderer.domElement.setPointerCapture(e.pointerId);
    } catch {
      /* capture is optional */
    }
    this.audio.start();
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.pointerDown || this.pointerId !== e.pointerId || !this.inputEnabled) return;
    const now = performance.now();
    if (now - this.lastPointerTime > 180) {
      // stale pointer (tab switch / lost frame): start a fresh delta instead of jumping
      this.lastPointer = { x: e.clientX, y: e.clientY };
      this.lastPointerTime = now;
      return;
    }
    let dx = e.clientX - this.lastPointer.x;
    let dy = e.clientY - this.lastPointer.y;
    this.lastPointer = { x: e.clientX, y: e.clientY };
    this.lastPointerTime = now;
    // guard against huge single-event deltas that make the view spin
    const maxStep = 400;
    dx = Math.max(-maxStep, Math.min(maxStep, dx));
    dy = Math.max(-maxStep, Math.min(maxStep, dy));
    this.pointerTravel += Math.abs(dx) + Math.abs(dy);
    this.shake = 0;
    const sens = (e.pointerType === "touch" ? 0.0062 : 0.0056) * (this.settings.mouseSensitivity / 10);
    this.yaw -= dx * sens;
    const pitchDelta = dy * sens * (this.invertLookY ? -1 : 1);
    if (this.firstPerson) {
      this.pitch = THREE.MathUtils.clamp(this.pitch + pitchDelta, -0.72, 1.32);
    } else {
      this.pitch = THREE.MathUtils.clamp(this.pitch + pitchDelta * 0.9, -0.18, 1.28);
    }
  };

  private onPointerUp = (e: PointerEvent) => {
    if (!this.pointerDown || (this.pointerId !== null && this.pointerId !== e.pointerId)) return;
    this.pointerDown = false;
    this.pointerId = null;
    try {
      this.renderer.domElement.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    if (this.mode === "menu" || !this.inputEnabled) return;
    const tapLimit = e.pointerType === "touch" ? 26 : 16;
    if (this.pointerTravel < tapLimit) {
      if (e.button === 2 || e.pointerType === "touch") {
        if (e.button === 2) this.place();
        else this.mine();
      } else {
        this.mine();
      }
    }
  };

  setSensitivity(value: number) {
    this.settings.mouseSensitivity = Math.max(1, Math.min(50, value));
    this.callbacks.onEvent?.("setting", { mouseSensitivity: this.settings.mouseSensitivity });
    this.callbacks.onEvent?.("toast", { text: `Sensitivitas kamera ${Math.round(this.settings.mouseSensitivity)} / 50`, tone: "info" });
  }

  resetCameraView() {
    this.yaw = this.character ? Math.atan2(
      this.character.group.position.x - this.pos.x || 0.001,
      this.character.group.position.z - this.pos.z || 0.001
    ) : 0;
    this.pitch = 0.12;
    this.cameraDistance = 8;
    if (!this.firstPerson) this.cameraDistance = 18;
    this.cameraDistanceSmooth = this.cameraDistance;
    this.callbacks.onEvent?.("toast", { text: "Pandangan kamera diatur ulang", tone: "info" });
  }

  private onWheel = (e: WheelEvent) => {
    if (this.mode === "menu") return;
    e.preventDefault();
    this.cameraDistance = THREE.MathUtils.clamp(this.cameraDistance + Math.sign(e.deltaY) * 1.6, 6, 48);
    this.settings.cameraDistance = this.cameraDistance;
    this.callbacks.onEvent?.("setting", { cameraDistance: this.cameraDistance });
    this.emitStats();
  };

  private isTyping(e: KeyboardEvent) {
    const t = e.target as HTMLElement | null;
    return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (this.isTyping(e)) return;
    if (this.mode === "menu") return;
    if (this.paused && e.code !== "Escape") return;
    this.keys.add(e.code);
    if (e.code === "Space") e.preventDefault();
    switch (e.code) {
      case "Escape":
        this.callbacks.onEvent?.("pause");
        break;
      case "KeyE":
        this.callbacks.onEvent?.("inventory");
        break;
      case "KeyB":
        this.callbacks.onEvent?.("palette");
        break;
      case "KeyM":
        this.callbacks.onEvent?.("map");
        break;
      case "KeyH":
        this.callbacks.onEvent?.("help");
        break;
      case "KeyP":
        this.callbacks.onEvent?.("photo");
        break;
      case "KeyV":
        this.toggleView();
        break;
      case "KeyF":
        this.toggleFlying();
        break;
      case "KeyC":
        this.cycleCamera();
        break;
      case "KeyO":
        this.screenshot();
        break;
      case "KeyR":
        this.respawn();
        break;
      case "KeyT":
        this.talkToNpc();
        break;
      case "Digit1":
      case "Digit2":
      case "Digit3":
      case "Digit4":
      case "Digit5":
      case "Digit6":
      case "Digit7":
      case "Digit8":
      case "Digit9":
        this.callbacks.onEvent?.("slot", Number(e.code.replace("Digit", "")) - 1);
        break;
      default:
        break;
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private onBlur = () => {
    this.keys.clear();
    this.pointerDown = false;
  };

  private setupResize() {
    const onResize = () => {
      const w = Math.max(1, this.container.clientWidth || window.innerWidth);
      const h = Math.max(1, this.container.clientHeight || window.innerHeight);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.settings.resolution));
      this.renderer.setSize(w, h);
      this.composer.setPixelRatio(Math.min(window.devicePixelRatio, this.settings.resolution));
      this.composer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    this.resizeHandler = onResize;
    // The game shell can be rotated/scaled by CSS (auto landscape) without a
    // window resize, so observe the container itself as well.
    try {
      this.resizeObserver = new ResizeObserver(() => onResize());
      this.resizeObserver.observe(this.container);
    } catch {
      /* older browsers: window resize is enough */
    }
    onResize();
    window.setTimeout(onResize, 120);
    window.setTimeout(onResize, 480);
  }

  private resizeHandler: (() => void) | null = null;
  private resizeObserver: ResizeObserver | null = null;

  // -------------------------------------------------------------------------
  // Public game API
  // -------------------------------------------------------------------------
  private adaptQuality() {
    if (!this.settings.dayCycle) return;
    const heavy = this.settings.shadowQuality === "high" && this.settings.bloom && this.settings.reflections;
    const pixelRatio = Math.min(window.devicePixelRatio, this.settings.resolution);
    if (heavy && pixelRatio > 1) {
      this.renderer.setPixelRatio(Math.min(pixelRatio, 1.15));
      this.composer.setPixelRatio(Math.min(pixelRatio, 1.15));
    }
  }

  startPlay() {
    this.pendingStart = false;
    this.baseResolution = Math.min(window.devicePixelRatio || 1, this.settings.resolution);
    this.fpsHistory = [];
    this.adaptQuality();
    this.welcomeTimer = 0;
    this.mode = "play";
    this.applySky(true);
    this.skyTimer = 0.14;
    this.envTimer = 0;
    this.elapsed = 0;
    this.paused = false;
    this.inputEnabled = true;
    this.sessionStarted = true;
    this.yaw = 1.42;
    this.pitch = 0.12;
    this.cameraYawSmooth = this.yaw;
    this.cameraPitchSmooth = this.pitch;
    this.cameraDistanceSmooth = this.settings.cameraDistance;
    if (this.pos.y < surfaceHeight(this.world, this.pos.x, this.pos.z)) {
      this.pos.y = surfaceHeight(this.world, this.pos.x, this.pos.z) + 0.2;
    }
    this.character.group.position.copy(this.pos);
    this.audio.start();
    this.audio.play("chime");
    this.emitStats();
  }

  goToMenu() {
    this.mode = "menu";
    this.paused = true;
    this.inputEnabled = false;
    this.saveGame();
    this.emitStats();
  }

  setMode(mode: Mode) {
    this.mode = mode;
    if (this.bokehPass) this.bokehPass.enabled = this.settings.depthOfField && mode === "photo";
    this.paused = mode === "paused";
    this.inputEnabled = mode === "play" || mode === "photo";
    this.emitStats();
  }

  setPaused(paused: boolean) {
    this.paused = paused;
    this.inputEnabled = !paused && this.mode !== "menu";
    if (paused) this.keys.clear();
    if (!paused && this.pendingStart) {
      this.pendingStart = false;
      this.mode = "play";
      this.welcomeTimer = 1.35;
      this.callbacks.onEvent?.("welcome");
    }
    this.emitStats();
  }

  setInputEnabled(enabled: boolean) {
    this.inputEnabled = enabled;
    this.emitStats();
  }

  setSettings(partial: Partial<GameSettings>) {
    const before = this.settings;
    this.settings = { ...this.settings, ...partial };
    if (partial.fov !== undefined) {
      this.camera.fov = partial.fov;
      this.camera.updateProjectionMatrix();
    }
    if (partial.cameraDistance !== undefined) this.cameraDistance = partial.cameraDistance;
    if (partial.shadows !== undefined) {
      this.renderer.shadowMap.enabled = partial.shadows;
      this.renderer.shadowMap.needsUpdate = true;
      this.sunLight.castShadow = partial.shadows;
      for (const [, entry] of this.chunkMeshes) {
        for (const mesh of entry.meshes) mesh.castShadow = partial.shadows;
      }
      this.opaqueMat.needsUpdate = true;
      this.cutoutMat.needsUpdate = true;
    }
    if (partial.shadowQuality !== undefined && partial.shadowQuality !== before.shadowQuality) {
      this.applyShadowQuality();
    }
    if (partial.bloom !== undefined && this.bloom) this.bloom.enabled = partial.bloom;
    if (partial.effectStrength !== undefined && this.bloom) {
      this.bloom.strength = Math.min(1.25, 0.4 + partial.effectStrength * 0.32);
      this.applySky(false);
    }
    if (partial.ambientOcclusion !== undefined && this.gtaoPass) this.gtaoPass.enabled = partial.ambientOcclusion && !this.isMobileDevice;
    if (partial.antiAliasing !== undefined && this.smaaPass) this.smaaPass.enabled = partial.antiAliasing;
    if (partial.depthOfField !== undefined && this.bokehPass) this.bokehPass.enabled = partial.depthOfField && this.mode === "photo";
    if (partial.effects !== undefined) this.renderer.shadowMap.needsUpdate = true;
    if (partial.resolution !== undefined) {
      this.gtaoPass?.setSize(this.container.clientWidth, this.container.clientHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, partial.resolution));
      const w = this.container.clientWidth || window.innerWidth;
      const h = this.container.clientHeight || window.innerHeight;
      this.renderer.setSize(w, h);
      this.composer.setPixelRatio(Math.min(window.devicePixelRatio, partial.resolution));
      this.composer.setSize(w, h);
    }
    if (partial.sound !== undefined) this.audio.enable(partial.sound);
    if (partial.reflections !== undefined) {
      const env = partial.reflections ? 1 : 0;
      this.opaqueMat.envMapIntensity = 0.25 * env;
      this.cutoutMat.envMapIntensity = 0.2 * env;
      this.translucentMat.envMapIntensity = 1.6 * env;
      this.waterSideMat.envMapIntensity = 2 * env;
      (this.ocean.material as THREE.MeshStandardMaterial).envMapIntensity = 1.7 * env;
      this.envTimer = 0;
    }
    if (partial.firstPerson !== undefined) this.firstPerson = partial.firstPerson;
    if (partial.invertLookY !== undefined) this.invertLookY = partial.invertLookY;
    if (partial.weather !== undefined && partial.weather !== before.weather) this.setWeather(partial.weather);
    if (partial.showHand !== undefined && this.hand) this.hand.setVisible(this.firstPerson && this.settings.showHand && this.mode !== "menu");
    if (partial.time !== undefined) {
      this.applySky(true);
      this.envTimer = 0;
    }
    this.applySky(false);
  }

  setMobileAxis(x: number, y: number) {
    this.mobileAxis.x = x;
    this.mobileAxis.y = y;
    this.mobileSprint = Math.hypot(x, y) > 0.92;
  }

  mobileAction(action: "mine" | "place" | "jump" | "drop") {
    if (this.mode === "menu") return;
    if (action === "jump") {
      this.touchJumpTimer = 0.18;
      this.keys.add("Space");
      window.setTimeout(() => this.keys.delete("Space"), 170);
      return;
    }
    this.updateHighlight();
    if (action === "mine") this.mine();
    else if (action === "place") this.place();
    this.miningSwing = 0.85;
  }

  isMobile() {
    return this.isMobileDevice;
  }

  selectBlock(id: number) {
    this.selected = id;
    this.character.setHeld(id);
    this.hand?.setHeld(id);
    this.emitInventory();
    this.emitStats();
    this.audio.play("click");
  }

  toggleFlying() {
    this.flying = !this.flying;
    this.velocity.y = 0;
    this.callbacks.onEvent?.("toast", { text: this.flying ? "Mode terbang aktif — Space naik, Shift turun" : "Mode terbang nonaktif", tone: "info" });
    this.emitStats();
  }

  toggleView() {
    this.firstPerson = !this.firstPerson;
    this.cameraDistanceSmooth = this.firstPerson ? 8 : this.settings.cameraDistance;
    this.settings.firstPerson = this.firstPerson;
    this.callbacks.onEvent?.("setting", { firstPerson: this.firstPerson });
    this.callbacks.onEvent?.("toast", { text: this.firstPerson ? "Kamera orang pertama" : "Kamera orang ketiga", tone: "info" });
    this.emitStats();
  }

  cycleCamera() {
    const options = [12, 19, 28, 38];
    const current = options.findIndex((v) => v >= this.cameraDistance - 0.1);
    this.cameraDistance = options[(current + 1) % options.length];
    this.callbacks.onEvent?.("toast", { text: `Jarak kamera ${this.cameraDistance} blok`, tone: "info" });
    this.emitStats();
  }

  talkToNpc() {
    const npc = this.mobs?.nearestNpc(this.pos);
    if (!npc) {
      this.callbacks.onEvent?.("toast", { text: "Tidak ada penduduk di dekatmu", tone: "info" });
      return;
    }
    const line = npc.lines[npc.lineIndex % npc.lines.length];
    npc.lineIndex += 1;
    this.callbacks.onEvent?.("npc", { name: npc.name, role: npc.role, line });
    this.callbacks.onEvent?.("toast", { text: `${npc.name}: ${line}`, tone: "success" });
    this.audio.play("chime");
  }

  respawn() {
    this.pos.set(this.world.spawn.x, surfaceHeight(this.world, this.world.spawn.x, this.world.spawn.z) + 0.2, this.world.spawn.z);
    this.velocity.set(0, 0, 0);
    this.health = 20;
    this.character.group.position.copy(this.pos);
    this.callbacks.onEvent?.("toast", { text: "Kembali ke titik awal", tone: "success" });
  }

  teleportWaypoint(id: string) {
    const wp = this.world.waypoints.find((w) => w.id === id);
    if (!wp) return;
    const y = surfaceHeight(this.world, wp.x, wp.z);
    this.pos.set(wp.x + 0.5, y + 0.4, wp.z + 0.5);
    this.velocity.set(0, 0, 0);
    this.character.group.position.copy(this.pos);
    this.chunkTimer = 0;
    this.reflectionTimer = 0.3;
    this.callbacks.onEvent?.("toast", { text: `Menuju ${wp.name}`, tone: "success" });
  }

  craft(recipeId: string) {
    const recipe = RECIPES.find((r) => r.id === recipeId);
    if (!recipe) return;
    if (!this.settings.creative) {
      for (const input of recipe.inputs) {
        if ((this.inventory[input.id] ?? 0) < input.count) {
          this.callbacks.onEvent?.("toast", { text: `Bahan kurang: ${blockDef(input.id).name}`, tone: "warn" });
          return;
        }
      }
      for (const input of recipe.inputs) this.inventory[input.id] = (this.inventory[input.id] ?? 0) - input.count;
    }
    this.inventory[recipe.output.id] = (this.inventory[recipe.output.id] ?? 0) + recipe.output.count;
    this.audio.play("craft");
    this.callbacks.onEvent?.("toast", { text: `Berhasil membuat ${recipe.name} ×${recipe.output.count}`, tone: "success" });
    this.emitInventory();
    this.saveDirty = true;
  }

  screenshot() {
    this.renderFrame();
    this.renderer.getContext().finish();
    try {
      const url = this.renderer.domElement.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = url;
      link.download = `blockrealm-${this.seed}-${Date.now()}.png`;
      link.click();
      this.callbacks.onEvent?.("toast", { text: "Tangkapan layar disimpan", tone: "success" });
    } catch {
      this.callbacks.onEvent?.("toast", { text: "Gagal menyimpan tangkapan layar", tone: "warn" });
    }
  }

  getSeed() {
    return this.seed;
  }

  cancelWorldLoad() {
    this.worldLoadVersion += 1;
  }

  getMap(): MapData {
    if (!this.worldReady) {
      return {
        width: SX,
        height: SZ,
        pixels: new Uint8ClampedArray(SX * SZ),
        player: { x: this.pos.x, z: this.pos.z, yaw: this.yaw },
        waypoints: [],
        biome: "Lembah Zamrud",
      };
    }
    if (this.mapDirty || !this.cachedMap) {
      this.cachedMap = worldMapPixels(this.world);
      this.mapDirty = false;
    }
    return {
      width: SX,
      height: SZ,
      pixels: this.cachedMap,
      player: { x: this.pos.x, z: this.pos.z, yaw: this.yaw },
      waypoints: this.world.waypoints,
      biome: biomeAt(this.world, this.pos.x, this.pos.z),
    };
  }

  saveGame() {
    if (!this.sessionStarted) return;
    try {
      const data: SaveData = {
        seed: this.seed,
        edits: Array.from(this.world.edits.entries()),
        player: { x: this.pos.x, y: this.pos.y, z: this.pos.z },
        time: this.settings.time,
        inventory: this.inventory,
        selected: this.selected,
        mined: this.mined,
        placed: this.placed,
        distance: Math.round(this.distanceWalked),
        peak: this.peak,
        nights: this.nights,
        savedAt: Date.now(),
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      this.saveDirty = false;
    } catch {
      /* storage might be unavailable */
    }
  }

  // -------------------------------------------------------------------------
  // Gameplay actions
  // -------------------------------------------------------------------------
  private mine() {
    const hit = this.currentHit;
    if (!hit || !this.inputEnabled || this.mode === "menu") return;
    if (hit.id === ID.bedrock) {
      this.callbacks.onEvent?.("toast", { text: "Bedrock tidak bisa ditambang", tone: "warn" });
      return;
    }
    if (hit.id === ID.water || hit.id === ID.lava) return;
    const def = blockDef(hit.id);
    this.world.blocks[index(hit.x, hit.y, hit.z)] = ID.air;
    this.world.edits.set(index(hit.x, hit.y, hit.z), ID.air);
    this.updateColumn(hit.x, hit.z);
    this.rebuildAround(hit.x, hit.z);
    this.particles.spawn(hit.x, hit.y, hit.z, def.mapColor);
    this.miningSwing = 1;
    this.inventory[hit.id] = (this.inventory[hit.id] ?? 0) + 1;
    this.mined += 1;
    this.audio.play("break");
    this.shake = Math.min(0.35, this.shake + 0.06);
    this.saveDirty = true;
    this.emitInventory();
    this.emitStats();
  }

  private place() {
    const hit = this.currentHit;
    if (!hit || !this.inputEnabled || this.mode === "menu") return;
    const x = hit.x + hit.nx;
    const y = hit.y + hit.ny;
    const z = hit.z + hit.nz;
    if (x < 0 || x >= SX || z < 0 || z >= SZ || y < 0 || y >= SY) return;
    const existing = getBlock(this.world, x, y, z);
    if (existing !== ID.air && !blockDef(existing).cross && existing !== ID.water) return;
    const def = blockDef(this.selected);
    if (!this.settings.creative && (this.inventory[this.selected] ?? 0) <= 0) {
      this.callbacks.onEvent?.("toast", { text: `Stok ${def.name} habis`, tone: "warn" });
      return;
    }
    // do not build inside the player
    const px = this.pos.x;
    const py = this.pos.y;
    const pz = this.pos.z;
    if (x + 1 > px - 0.32 && x < px + 0.32 && z + 1 > pz - 0.32 && z < pz + 0.32 && y + 1 > py + 0.1 && y < py + 1.75) {
      this.callbacks.onEvent?.("toast", { text: "Tidak bisa menaruh blok di badanmu", tone: "warn" });
      return;
    }
    this.world.blocks[index(x, y, z)] = this.selected;
    this.world.edits.set(index(x, y, z), this.selected);
    this.updateColumn(x, z);
    this.rebuildAround(x, z);
    if (!this.settings.creative) this.inventory[this.selected] = Math.max(0, (this.inventory[this.selected] ?? 0) - 1);
    this.placed += 1;
    this.miningSwing = 1;
    this.particles.spawn(x, y - 1, z, def.mapColor);
    this.audio.play("place");
    this.saveDirty = true;
    this.emitInventory();
    this.emitStats();
  }

  private updateColumn(x: number, z: number) {
    for (let y = SY - 1; y >= 0; y--) {
      const b = getBlock(this.world, x, y, z);
      if (blockDef(b).solid) {
        this.world.surface[z * SX + x] = y;
        return;
      }
    }
    this.world.surface[z * SX + x] = 0;
  }

  // -------------------------------------------------------------------------
  // Update loop
  // -------------------------------------------------------------------------
  private setRenderScale(scale: number, fps = 0) {
    this.settings.resolution = scale;
    const ratio = Math.min(window.devicePixelRatio, scale);
    this.renderer.setPixelRatio(ratio);
    this.composer.setPixelRatio(ratio);
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    if (this.gtaoPass) this.gtaoPass.setSize(w, h);
    if (this.smaaPass) this.smaaPass.setSize(w, h);
    this.renderer.shadowMap.needsUpdate = true;
    this.callbacks.onEvent?.("quality", { resolution: scale, level: this.qualityLevel, fps });
  }

  private applyQualityLevel(level: number, fps = 0) {
    // Keep bloom, reflections, AO, AA and real-time shadows enabled at every
    // level; only scale the cost (resolution + shadow map + AO sample count).
    if (this.gtaoPass) {
      this.gtaoPass.enabled = this.settings.ambientOcclusion;
      this.gtaoPass.updateGtaoMaterial({ samples: level === 2 ? 16 : level === 1 ? 10 : 6 });
    }
    if (this.smaaPass) this.smaaPass.enabled = this.settings.antiAliasing;
    this.settings.shadowQuality = level === 2 ? "high" : level === 1 ? "medium" : "low";
    if (this.softwareRenderer) this.settings.shadowQuality = level === 2 ? "medium" : "low";
    this.settings.shadows = true;
    this.applyShadowQuality();
    this.renderer.shadowMap.enabled = true;
    this.sunLight.castShadow = true;
    const scales = [0.7, 0.85, Math.max(1, Math.min(this.baseResolution, 1.25))];
    this.setRenderScale(Math.max(0.62, scales[level]), fps);
    this.onEffectsChanged?.();
    this.callbacks.onEvent?.("toast", {
      text: level === 2 ? "Kualitas Ultra penuh — semua efek aktif" : `Auto-quality ${level === 1 ? "Seimbang" : "Performa"}: resolusi disesuaikan, efek tetap aktif`,
      tone: level === 2 ? "success" : "info",
    });
  }

  private animate = () => {
    if (this.disposed) return;
    this.frameId = requestAnimationFrame(this.animate);
    const rawDt = this.clock.getDelta();
    const dt = Math.min(rawDt, 0.05);
    this.elapsed += dt;
    if (!this.paused && this.mode !== "menu" && this.settings.dayCycle) {
      this.settings.time = (this.settings.time + dt * (24 / 420)) % 24;
    }
    this.skyTimer -= dt;
    if (this.skyTimer <= 0) {
      this.applySky();
      this.skyTimer = 0.14;
    }
    this.envTimer -= dt;
    if (this.envTimer <= 0) this.updateEnvironment();

    if (!this.deferredQuality && this.elapsed > 0.9) {
      this.deferredQuality = true;
      if (this.smaaPass) this.smaaPass.enabled = this.settings.antiAliasing;
      if (this.gtaoPass) this.gtaoPass.enabled = this.settings.ambientOcclusion && !this.softwareRenderer;
      this.renderer.shadowMap.needsUpdate = true;
    }
    this.updatePlayer(dt);
    this.updateCamera(dt);
    this.shake = Math.max(0, this.shake - dt * 2.6);
    this.character.group.position.copy(this.pos);
    const speed = this.velocity.length();
    const moving = this.inputEnabled && this.mode === "play" && speed > 0.6;
    this.character.update(dt, moving, !this.grounded && !this.flying, Math.min(speed, 9) * 0.4);
    this.character.setVisible(!this.firstPerson && this.mode !== "menu");
    this.hand.setVisible(this.firstPerson && this.mode !== "menu" && this.settings.showHand);
    this.hand.update(dt, moving, this.miningSwing);
    this.dust.update(dt, this.pos, this.skyState.day);
    if (this.cloudUniforms) {
      (this.cloudUniforms.uCloudTime as THREE.IUniform).value = this.elapsed;
      (this.cloudUniforms.uCloudStrength as THREE.IUniform).value =
        (this.settings.effects ? 0.26 : 0) * (1 - this.wetness * 0.7) * (0.35 + this.skyState.day * 0.65);
    }
    this.leaves.update(dt, this.pos, this.settings.effects ? 1 : 0);
    this.mobs.update(
      dt,
      this.pos,
      (x, z) => surfaceHeight(this.world, x, z),
      (x, z) => getBlock(this.world, Math.floor(x), SEA + 1, Math.floor(z)) === ID.water || getBlock(this.world, Math.floor(x), SEA, Math.floor(z)) === ID.water
    );
    if (this.butterflies) this.butterflies.update(dt, this.pos, this.skyState.day);
    this.updateRipples(dt);
    if (this.inWater && Math.hypot(this.velocity.x, this.velocity.z) > 1.2) {
      this.spawnRipple(this.pos.x, this.pos.z, 0.7, 0.9);
    }
    this.reflectionTimer -= dt;
    if (this.reflectionTimer <= 0 && this.settings.reflections) this.captureReflections();
    if (this.weatherRig) {
      this.weatherRig.update(dt, this.pos, this.settings.weather, this.skyState.night);
      if (this.settings.weather !== "clear" && this.settings.sound) this.audio.start();
      this.lightningFlash = Math.max(0, this.lightningFlash - dt * 4.5);
      if (this.settings.weather === "storm") {
        this.lightningTimer -= dt;
        if (this.lightningTimer <= 0) {
          this.lightningTimer = 7 + Math.random() * 11;
          this.lightningFlash = 1;
          this.weatherRig.strike();
          this.audio.play("thunder");
        }
      }
    }
    if (this.gradePass) {
      this.gradePass.uniforms.uFlash.value = this.lightningFlash * 0.22;
      const speedNorm = Math.min(1, Math.max(0, (Math.hypot(this.velocity.x, this.velocity.z) - 6.5) / 8));
      const currentSpeed = this.gradePass.uniforms.uSpeed.value as number;
      this.gradePass.uniforms.uSpeed.value = THREE.MathUtils.lerp(currentSpeed, speedNorm, 0.1);
      this.gradePass.uniforms.uWet.value = this.wetness;
      const fx = this.settings.effectStrength ?? 1;
      this.gradePass.uniforms.uVignette.value = 0.24 + fx * 0.14;
      this.gradePass.uniforms.uGrain.value = 0.01 + fx * 0.006;
      this.gradePass.uniforms.uSat.value = 1.16 + fx * 0.07 + this.skyState.night * 0.06;
      this.gradePass.uniforms.uContrast.value = 1.13 + fx * 0.06;
      this.gradePass.uniforms.uCaustics.value = this.camera.position.y < WATER_Y - 0.08 ? 1 : 0;
      this.gradePass.uniforms.uSharpen.value = this.settings.resolution >= 1 ? 2.4 : 1.8;
      this.gradePass.uniforms.uTexel.value.set(
        1 / Math.max(1, this.renderer.domElement.width),
        1 / Math.max(1, this.renderer.domElement.height)
      );
    }
    if (Math.abs(this.wetness - this.rainAudioLevel) > 0.08) {
      this.rainAudioLevel = this.wetness;
      this.audio.setRain(this.wetness);
    }
    if (this.inWater && !this.wasInWater) {
      this.particles.spawn(Math.floor(this.pos.x), Math.floor(WATER_Y) - 1, Math.floor(this.pos.z), "#bfe9ff");
      this.audio.play("splash");
    }
    this.wasInWater = this.inWater;

    this.welcomeTimer = Math.max(0, this.welcomeTimer - dt);
    if (this.welcomeTimer > 0) {
      this.emitStats();
      this.renderFrame();
      return;
    }
    this.updateHighlight();
    this.particles.update(dt);
    this.plantUniforms.uTime.value = this.elapsed;
    this.updateScenery(dt);
    this.chunkTimer -= dt;
    if (this.chunkTimer <= 0) {
      this.chunkTimer = 0.35;
      this.updateChunkStreaming();
    }

    this.frameCount++;
    this.fpsTimer += rawDt;
    if (this.fpsTimer > 0.5) {
      this.fps = Math.round(this.frameCount / this.fpsTimer);
      this.frameCount = 0;
      this.fpsTimer = 0;
    }
    this.fpsHistory.push(this.fps);
    if (this.fpsHistory.length > 12) this.fpsHistory.shift();
    const smoothFps = this.fpsHistory.reduce((a, b) => a + b, 0) / Math.max(1, this.fpsHistory.length);
    const target = 60;
    if (this.settings.autoQuality && this.mode === "play" && this.fpsHistory.length >= 6) {
      if (smoothFps < target - 6 && this.qualityLevel > 0) {
        this.lowFpsTime += dt;
        this.highFpsTime = 0;
        if (this.lowFpsTime > 1.6) {
          this.lowFpsTime = 0;
          this.qualityLevel -= 1;
          this.applyQualityLevel(this.qualityLevel, smoothFps);
        }
      } else if (smoothFps < target - 6) {
        // even at the lowest level, gently reduce the render scale to hold 60fps
        this.lowFpsTime += dt;
        if (this.lowFpsTime > 2.2 && this.settings.resolution > 0.62) {
          this.lowFpsTime = 0;
          this.setRenderScale(Math.max(0.62, Number((this.settings.resolution - 0.1).toFixed(2))), smoothFps);
        }
      } else if (smoothFps > target + 6) {
        this.lowFpsTime = 0;
        this.highFpsTime += dt;
        if (this.highFpsTime > 6 && this.qualityLevel < 2) {
          this.highFpsTime = 0;
          this.qualityLevel += 1;
          this.applyQualityLevel(this.qualityLevel, smoothFps);
        }
      } else {
        this.lowFpsTime = Math.max(0, this.lowFpsTime - dt * 0.5);
        this.highFpsTime = Math.max(0, this.highFpsTime - dt * 0.3);
      }
    }
    this.effectsTimer -= dt;
    if (this.effectsTimer <= 0) {
      this.emitEffects();
      this.effectsTimer = 2;
    }
    this.statsTimer -= dt;
    if (this.statsTimer <= 0) {
      this.emitStats();
      this.statsTimer = 0.22;
    }
    if (this.saveDirty) {
      this.saveTimer += dt;
      if (this.saveTimer > 2.5) {
        this.saveGame();
        this.saveTimer = 0;
      }
    }
    if (!this.contextLost) this.renderFrame();
  };

  private renderWaterReflection() {
    if (!this.settings.reflections || !this.waterRT || !this.waterCam || !this.ocean) return;
    this.waterFrame++;
    if (this.waterFrame % 2 === 0) return; // 30hz keeps it smooth yet affordable
    const cam = this.camera;
    const h = WATER_Y;
    const camPos = cam.getWorldPosition(new THREE.Vector3());
    if (camPos.y < h - 0.05) return;
    const dir = cam.getWorldDirection(new THREE.Vector3());
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion);
    this.waterCam.position.set(camPos.x, 2 * h - camPos.y, camPos.z);
    this.waterCam.up.set(up.x, -up.y, up.z);
    this.waterCam.lookAt(
      this.waterCam.position.x + dir.x,
      this.waterCam.position.y - dir.y,
      this.waterCam.position.z + dir.z
    );
    this.waterCam.fov = cam.fov;
    this.waterCam.aspect = cam.aspect;
    this.waterCam.near = 0.5;
    this.waterCam.far = 900;
    this.waterCam.updateProjectionMatrix();
    this.waterCam.updateMatrixWorld(true);

    this.waterTexMatrix.set(
      0.5, 0, 0, 0.5,
      0, 0.5, 0, 0.5,
      0, 0, 0.5, 0.5,
      0, 0, 0, 1
    );
    this.waterTexMatrix.multiply(this.waterCam.projectionMatrix);
    this.waterTexMatrix.multiply(this.waterCam.matrixWorldInverse);

    const wasVisible = this.ocean.visible;
    this.ocean.visible = false;
    if (this.foam) this.foam.visible = false;
    if (this.ripples) this.ripples.visible = false;
    if (this.hand) this.hand.group.visible = false;
    if (this.skyRig) this.skyRig.sky.position.copy(this.waterCam.position);
    const prevTarget = this.renderer.getRenderTarget();
    const prevShadow = this.renderer.shadowMap.enabled;
    this.renderer.shadowMap.enabled = false;
    this.renderer.setRenderTarget(this.waterRT);
    this.renderer.clear();
    this.renderer.render(this.scene, this.waterCam);
    this.renderer.setRenderTarget(prevTarget);
    this.renderer.shadowMap.enabled = prevShadow;
    this.ocean.visible = wasVisible;
    if (this.foam) this.foam.visible = true;
    if (this.ripples) this.ripples.visible = true;
    if (this.hand) this.hand.group.visible = this.firstPerson && this.settings.showHand;
    if (this.waterUniforms) {
      (this.waterUniforms.uReflectStrength as THREE.IUniform).value = 1;
      (this.waterUniforms.uReflectTime as THREE.IUniform).value = this.elapsed;
    }
  }

  private renderFrame() {
    this.renderWaterReflection();
    if (this.gradePass) {
      this.gradePass.uniforms.uTime.value = this.elapsed % 120;
      const sunDir = this.skyState.sunDir;
      const projected = this.camera.position.clone().add(sunDir.clone().multiplyScalar(900)).project(this.camera);
      this.gradePass.uniforms.uSunPos.value.set(projected.x * 0.5 + 0.5, projected.y * 0.5 + 0.5);
      const aboveHorizon = Math.max(0, sunDir.y);
      this.gradePass.uniforms.uFlare.value = this.settings.effects ? Math.min(1, aboveHorizon * 1.6 + this.skyState.dusk * 0.5) : 0;
      this.gradePass.uniforms.uAspect.value = this.camera.aspect;
      this.gradePass.uniforms.uSat.value = 1.1 + this.skyState.night * 0.08;
      this.gradePass.uniforms.uContrast.value = 1.08 + (this.settings.bloom ? 0.04 : 0);
      const underwaterTarget = this.camera.position.y < WATER_Y - 0.1 ? 1 : 0;
      const currentUw = this.gradePass.uniforms.uUnderwater.value as number;
      this.gradePass.uniforms.uUnderwater.value = THREE.MathUtils.lerp(currentUw, underwaterTarget, 0.12);
    }
    if (this.godRays && this.rayTarget && this.skyState) {
      const sun = this.skyState.sunDir.clone();
      const strength = this.settings.effects && !this.bootRender ? Math.max(0, sun.y) * 0.1 + this.skyState.dusk * 0.08 : 0;
      this.godRays.update(this.container.clientWidth, this.container.clientHeight, Math.min(1, strength), this.camera, sun);
      if (strength > 0.02 && !this.contextLost) {
        const previous = this.renderer.getRenderTarget();
        this.renderer.setRenderTarget(this.rayTarget);
        this.renderer.clear();
        this.renderer.render(this.rayScene, this.rayCamera);
        this.renderer.setRenderTarget(previous);
      }
    }
    this.composer.render();
  }

  private updateScenery(dt: number) {
    if (this.oceanMap) {
      this.oceanMap.offset.x += dt * 0.0045;
      this.oceanMap.offset.y += dt * 0.0018;
    }
    if (this.oceanNormal) {
      this.oceanNormal.offset.x -= dt * 0.002;
      this.oceanNormal.offset.y += dt * 0.003;
    }
    const night = this.skyState.night;
    const ffMat = this.fireflies.material as THREE.PointsMaterial;
    if (this.settings.effects) ffMat.opacity = night * 0.8 * (0.8 + Math.sin(this.elapsed * 2.2) * 0.2);
    const sparkMat = this.sparkles.material as THREE.PointsMaterial;
    sparkMat.opacity = (0.03 + this.skyState.day * 0.09) * (0.7 + Math.sin(this.elapsed * 1.4) * 0.3);
    this.ocean.position.x = Math.round(this.camera.position.x / 120) * 120;
    this.ocean.position.z = Math.round(this.camera.position.z / 120) * 120;
    if (night > 0.6 && !this.lastNight && this.mode === "play") {
      this.nights += 1;
      this.lastNight = true;
    }
    if (night < 0.3) this.lastNight = false;
    this.envTimer = Math.max(this.envTimer, 0);
    if (this.bokehPass && this.bokehPass.enabled) {
      const hit = this.currentHit;
      const focus = this.firstPerson ? (hit ? hit.distance : 22) : this.camera.position.distanceTo(this.playerAnchor());
      (this.bokehPass.materialBokeh as THREE.ShaderMaterial).uniforms.focus.value = Math.max(2, focus);
    }
    this.ocean.position.y = WATER_Y;
    const wet = this.wetness;
    this.opaqueMat.roughness = THREE.MathUtils.lerp(0.9, 0.6, wet);
    this.opaqueMat.envMapIntensity = THREE.MathUtils.lerp(0.12, 0.4, wet);
    this.plantMat.roughness = THREE.MathUtils.lerp(0.86, 0.5, wet);
    this.atlasMap.needsUpdate = false;
    const oceanMat = this.ocean.material as THREE.MeshPhysicalMaterial;
    oceanMat.normalScale.set(0.75 + wet * 0.9, 0.75 + wet * 0.9);
    if (wet > 0.05) this.oceanMap.offset.x += dt * wet * 0.01;
    if (this.waterWaveUniform) this.waterWaveUniform.value = this.elapsed;
    if (this.foamMaterial) {
      this.foamMaterial.opacity = 0.32 + Math.sin(this.elapsed * 1.4) * 0.12 + this.skyState.day * 0.22;
      this.foamMaterial.color.setRGB(0.86, 0.96, 1);
      this.foamMaterial.color.multiplyScalar(0.7 + this.skyState.day * 0.4);
    }
  }

  private playerAnchor() {
    return new THREE.Vector3(this.pos.x, this.pos.y + 1, this.pos.z);
  }

  private updatePlayer(dt: number) {
    if (this.mode !== "play" || this.paused || !this.inputEnabled) {
      return;
    }
    let forward = (this.keys.has("KeyW") ? 1 : 0) - (this.keys.has("KeyS") ? 1 : 0);
    let strafe = (this.keys.has("KeyD") ? 1 : 0) - (this.keys.has("KeyA") ? 1 : 0);
    const joy = this.mobileAxis;
    if (Math.hypot(joy.x, joy.y) > 0.12) {
      forward = -joy.y;
      strafe = joy.x;
    }
    this.inWater = getBlock(this.world, this.pos.x, this.pos.y + 0.4, this.pos.z) === ID.water;
    const sprint = this.keys.has("ShiftLeft") || this.keys.has("ShiftRight") || this.mobileSprint;
    let speed = this.flying ? 13 : sprint ? 8.2 : 4.7;
    if (this.inWater) speed *= 0.62;
    const dir = new THREE.Vector3();
    if (forward || strafe) {
      const f = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
      const r = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw)).normalize();
      dir.addScaledVector(f, forward).addScaledVector(r, strafe);
      if (dir.lengthSq() > 0) dir.normalize();
    }
    const before = this.pos.clone();
    this.moveHorizontal(dir.x * speed * dt, dir.z * speed * dt);
    this.distanceWalked += Math.hypot(this.pos.x - before.x, this.pos.z - before.z);
    this.moveAccumulator += Math.hypot(this.pos.x - before.x, this.pos.z - before.z);
    if (this.grounded && this.moveAccumulator > (sprint ? 1.5 : 2.1)) {
      this.moveAccumulator = 0;
      this.audio.play("step");
      if (this.settings.effects) {
        this.particles.spawn(Math.floor(this.pos.x), Math.floor(this.pos.y) - 1, Math.floor(this.pos.z), "#b9a888");
      }
    }
    if (this.flying) {
      const vertical = (this.keys.has("Space") ? 1 : 0) - (sprint ? 1 : 0);
      this.velocity.y = 0;
      const ny = this.pos.y + vertical * speed * dt;
      if (ny > 1 && ny < SY - 1 && !this.bodyCollides(this.pos.x, ny, this.pos.z)) this.pos.y = ny;
      this.grounded = false;
    } else {
      const gravity = this.inWater ? 9 : 24;
      this.velocity.y -= gravity * dt;
      if (this.inWater && this.pos.y < WATER_Y - 0.05) this.velocity.y += 10.5 * dt;
      const maxFall = this.inWater ? -3.2 : -26;
      this.velocity.y = Math.max(this.velocity.y, maxFall);
      this.touchJumpTimer = Math.max(0, this.touchJumpTimer - dt);
      if (this.keys.has("Space") || this.touchJumpTimer > 0) {
        if (this.inWater) this.velocity.y = Math.max(this.velocity.y, 3.6);
        else if (this.grounded) {
          this.velocity.y = 8.6;
          this.grounded = false;
          this.fallStart = this.pos.y;
          this.audio.play("step");
        }
      }
      const ground = this.findGround(this.pos.x, this.pos.z, this.pos.y + 0.35);
      const nextY = this.pos.y + this.velocity.y * dt;
      if (this.velocity.y <= 0 && nextY <= ground + 0.001) {
        const fallDistance = this.fallStart - ground;
        if (fallDistance > 5.5 && !this.inWater && this.hurtCooldown <= 0 && this.mode === "play") {
          this.health = Math.max(0, this.health - Math.min(8, Math.floor((fallDistance - 5) * 1.4)));
          this.hurtCooldown = 1.4;
          this.callbacks.onEvent?.("toast", { text: `Terjatuh! -${Math.min(8, Math.floor((fallDistance - 5) * 1.4))} nyawa`, tone: "warn" });
          if (this.health <= 0) {
            this.health = 20;
            this.respawn();
          }
        }
        if (fallDistance > 3) this.shake = Math.min(0.7, this.shake + 0.3);
        this.pos.y = ground;
        this.velocity.y = 0;
        this.grounded = true;
        this.fallStart = this.pos.y;
      } else {
        this.grounded = false;
        this.pos.y = nextY;
      }
      if (this.pos.y > SY + 8) this.pos.y = SY + 8;
      if (this.pos.y < -6) this.respawn();
    }
    this.hurtCooldown = Math.max(0, this.hurtCooldown - dt);
    this.hunger = Math.max(6, this.hunger - dt * 0.008);
    this.health = Math.min(20, this.health + dt * 0.025);
    this.peak = Math.max(this.peak, Math.floor(this.pos.y));
    this.pos.x = THREE.MathUtils.clamp(this.pos.x, 1.2, SX - 1.2);
    this.pos.z = THREE.MathUtils.clamp(this.pos.z, 1.2, SZ - 1.2);

    // face movement direction, idle looks toward camera forward
    let targetYaw = this.character.group.rotation.y;
    if (dir.lengthSq() > 0) targetYaw = Math.atan2(dir.x, dir.z);
    else targetYaw = Math.atan2(-Math.sin(this.yaw), -Math.cos(this.yaw));
    const diff = Math.atan2(Math.sin(targetYaw - this.character.group.rotation.y), Math.cos(targetYaw - this.character.group.rotation.y));
    this.character.group.rotation.y += diff * Math.min(1, dt * 12);
  }

  private bodyCollides(x: number, y: number, z: number): boolean {
    const half = 0.3;
    const ys = [y + 0.06, y + 0.95, y + 1.74];
    for (const dx of [-half, half]) {
      for (const dz of [-half, half]) {
        for (const py of ys) {
          if (isSolidAt(this.world, Math.floor(x + dx), Math.floor(py), Math.floor(z + dz))) return true;
        }
      }
    }
    return false;
  }

  private findGround(x: number, z: number, fromY: number): number {
    const start = Math.floor(fromY);
    for (let y = start; y >= 0; y--) {
      if (isSolidAt(this.world, Math.floor(x), y, Math.floor(z))) return y + 1;
    }
    return 0;
  }

  private moveHorizontal(dx: number, dz: number) {
    const nx = this.pos.x + dx;
    if (!this.bodyCollides(nx, this.pos.y, this.pos.z)) {
      this.pos.x = nx;
    } else if (this.grounded) {
      const stepY = this.pos.y + 1.03;
      if (!this.bodyCollides(nx, stepY, this.pos.z)) {
        this.pos.x = nx;
        this.pos.y = stepY;
      }
    }
    const nz = this.pos.z + dz;
    if (!this.bodyCollides(this.pos.x, this.pos.y, nz)) {
      this.pos.z = nz;
    } else if (this.grounded) {
      const stepY = this.pos.y + 1.03;
      if (!this.bodyCollides(this.pos.x, stepY, nz)) {
        this.pos.z = nz;
        this.pos.y = stepY;
      }
    }
  }

  private updateCamera(dt: number) {
    const aspect = this.container.clientWidth / Math.max(1, this.container.clientHeight);
    if (Math.abs(aspect - this.camera.aspect) > 0.001) {
      this.camera.aspect = aspect;
      this.camera.updateProjectionMatrix();
    }
    const lookLerp = 1 - Math.exp(-dt * 160);
    this.cameraYawSmooth += Math.atan2(Math.sin(this.yaw - this.cameraYawSmooth), Math.cos(this.yaw - this.cameraYawSmooth)) * lookLerp;
    this.cameraPitchSmooth += (this.pitch - this.cameraPitchSmooth) * lookLerp;

    if (this.mode === "menu") {
      const target = new THREE.Vector3(this.pos.x, this.pos.y + 2.2, this.pos.z);
      const dist = 34;
      const pitch = 0.26;
      this.yaw = 1.05 + Math.sin(this.elapsed * 0.055) * 0.4;
      this.cameraYawSmooth = this.yaw;
      this.cameraPitchSmooth = pitch;
      const offset = new THREE.Vector3(
        Math.sin(this.yaw) * Math.cos(pitch) * dist,
        Math.sin(pitch) * dist,
        Math.cos(this.yaw) * Math.cos(pitch) * dist
      );
      const desired = target.clone().add(offset);
      this.camera.position.lerp(desired, 1 - Math.exp(-dt * 2.0));
      this.camera.lookAt(target);
      this.camera.fov = 56;
      this.camera.updateProjectionMatrix();
      return;
    }

    const anchor = this.playerAnchor();
    if (this.firstPerson) {
      const dir = new THREE.Vector3(
        -Math.sin(this.cameraYawSmooth) * Math.cos(this.cameraPitchSmooth),
        -Math.sin(this.cameraPitchSmooth),
        -Math.cos(this.cameraYawSmooth) * Math.cos(this.cameraPitchSmooth)
      ).normalize();
      const moving = this.inputEnabled && (this.keys.has("KeyW") || this.keys.has("KeyA") || this.keys.has("KeyS") || this.keys.has("KeyD") || Math.hypot(this.mobileAxis.x, this.mobileAxis.y) > 0.2);
      const bob = moving ? Math.sin(this.elapsed * 9.5) * 0.028 : Math.sin(this.elapsed * 1.7) * 0.007;
      const eye = new THREE.Vector3(this.pos.x, this.pos.y + 1.62 + bob, this.pos.z);
      this.camera.position.lerp(eye, 1 - Math.exp(-dt * 30));
      const shakePitch = this.shake > 0.001 ? (Math.random() - 0.5) * this.shake * 0.008 : 0;
      const shakeYaw = this.shake > 0.001 ? (Math.random() - 0.5) * this.shake * 0.008 : 0;
      this.camera.quaternion.setFromEuler(new THREE.Euler(-this.cameraPitchSmooth + shakePitch, this.cameraYawSmooth + shakeYaw, 0, "YXZ"));
      this.firstPersonLook = { dir, eye };
      this.camera.fov = this.settings.fov;
      this.camera.updateProjectionMatrix();
      return;
    }

    // third person: elevation is clamped only for the orbit pose, not for the stored look
    const pitch = THREE.MathUtils.clamp(this.cameraPitchSmooth, 0.04, 1.26);
    const targetDist = THREE.MathUtils.clamp(this.settings.cameraDistance || this.cameraDistance, 6, 48);
    const dirOffset = new THREE.Vector3(
      Math.sin(this.cameraYawSmooth) * Math.cos(pitch),
      Math.sin(pitch),
      Math.cos(this.cameraYawSmooth) * Math.cos(pitch)
    ).normalize();
    // camera collision: pull closer along the ray (no flying lift)
    let allowed = targetDist;
    for (let d = 1.2; d <= targetDist; d += 0.35) {
      const p = anchor.clone().add(dirOffset.clone().multiplyScalar(d));
      if (isSolidAt(this.world, p.x, p.y, p.z)) {
        allowed = Math.max(1.6, d - 0.55);
        break;
      }
    }
    this.cameraDistanceSmooth += (allowed - this.cameraDistanceSmooth) * (1 - Math.exp(-dt * (allowed < this.cameraDistanceSmooth ? 26 : 9)));
    const desired = anchor.clone().add(dirOffset.clone().multiplyScalar(this.cameraDistanceSmooth));
    // keep the camera above the terrain surface
    const groundY = this.findGround(desired.x, desired.z, desired.y + 3) + 0.65;
    if (desired.y < groundY) desired.y = groundY;
    this.camera.position.lerp(desired, 1 - Math.exp(-dt * 14));
    if (this.shake > 0.001) {
      const sh = this.shake * 0.06;
      this.camera.position.x += (Math.random() - 0.5) * sh;
      this.camera.position.y += (Math.random() - 0.5) * sh;
    }
    this.camera.lookAt(anchor);
    this.firstPersonLook = null;
    this.camera.fov = this.settings.fov;
    this.camera.updateProjectionMatrix();
  }

  private updateHighlight() {
    if (this.mode === "menu" || this.paused) {
      this.highlight.visible = false;
      this.currentHit = null;
      return;
    }
    const dir: THREE.Vector3 = this.firstPerson && this.firstPersonLook ? this.firstPersonLook.dir.clone() : new THREE.Vector3();
    if (!this.firstPerson) this.camera.getWorldDirection(dir);
    if (this.firstPerson) dir.set(
      -Math.sin(this.yaw) * Math.cos(this.pitch),
      -Math.sin(this.pitch),
      -Math.cos(this.yaw) * Math.cos(this.pitch)
    ).normalize();
    const origin = this.firstPerson
      ? new THREE.Vector3(this.pos.x, this.pos.y + 1.66, this.pos.z)
      : new THREE.Vector3(this.pos.x, this.pos.y + 1.4, this.pos.z);
    const hit = raycastVoxel(this.world, origin, dir, 72, true);
    this.currentHit = hit;
    if (hit) {
      const def = blockDef(hit.id);
      if (def.cross) {
        this.highlight.visible = false;
      } else {
        this.highlight.visible = true;
        this.highlight.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
      }
      const key = `${hit.id}`;
      if (key !== this.lastTargetKey) {
        this.lastTargetKey = key;
        this.emitTarget();
      }
    } else {
      this.highlight.visible = false;
      if (this.lastTargetKey !== "") {
        this.lastTargetKey = "";
        this.emitTarget();
      }
    }
  }

  // -------------------------------------------------------------------------
  // Callbacks
  // -------------------------------------------------------------------------
  private emitTarget() {
    if (!this.currentHit) {
      this.callbacks.onTarget?.(null);
      return;
    }
    const def = blockDef(this.currentHit.id);
    this.callbacks.onTarget?.({
      id: this.currentHit.id,
      name: def.name,
      hardness: def.hardness,
      distance: Math.round(this.currentHit.distance * 10) / 10,
    });
  }

  private emitLoadProgress(progress: number, label: string) {
    this.callbacks.onEvent?.("loadprogress", { progress, label });
    try {
      window.dispatchEvent(new CustomEvent("blockrealm:loadprogress", { detail: { progress, label } }));
    } catch {
      /* ignore */
    }
  }

  private emitInventory() {
    this.callbacks.onInventory?.({ ...this.inventory }, this.selected);
  }

  private emitEffects() {
    this.callbacks.onEffects?.({
      shadows: this.settings.shadows && this.renderer.shadowMap.enabled,
      bloom: this.settings.bloom && !!this.bloom?.enabled,
      reflections: this.settings.reflections,
      occlusion: this.settings.ambientOcclusion && !!this.gtaoPass?.enabled,
      antialias: this.settings.antiAliasing && !!this.smaaPass?.enabled,
      weather: this.settings.weather !== "clear",
      sunShafts: this.settings.effects,
    });
  }

  private emitStats() {
    const t = this.settings.time;
    const hours = Math.floor(t);
    const minutes = Math.floor((t - hours) * 60);
    const phase = t < 5 ? "Malam" : t < 8 ? "Fajar" : t < 12 ? "Pagi" : t < 16 ? "Siang" : t < 19 ? "Sore" : "Malam";
    const target = this.currentHit
      ? {
          id: this.currentHit.id,
          name: blockDef(this.currentHit.id).name,
          hardness: blockDef(this.currentHit.id).hardness,
          distance: Math.round(this.currentHit.distance * 10) / 10,
        }
      : null;
    this.callbacks.onStats?.({
      fps: this.fps,
      x: this.pos.x,
      y: this.pos.y,
      z: this.pos.z,
      health: Math.round(this.health),
      hunger: Math.round(this.hunger),
      time: t,
      timeLabel: `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
      phase,
      biome: biomeAt(this.world, this.pos.x, this.pos.z),
      seed: this.seed,
      seedLabel: `#${this.seed.toString(36).toUpperCase()}`,
      flying: this.flying,
      firstPerson: this.firstPerson,
      inWater: this.inWater,
      mined: this.mined,
      placed: this.placed,
      distance: Math.round(this.distanceWalked),
      peak: this.peak,
      nights: this.nights,
      weather: this.settings.weather,
      effectStrength: this.settings.effectStrength,
      autoQuality: this.settings.autoQuality,
      targetFps: this.settings.targetFps,
      qualityLevel: this.qualityLevel,
      target,
      mode: this.mode,
      selected: this.selected,
      day: Math.floor(this.elapsed / 300) + 1,
    });
  }

  dispose() {
    this.disposed = true;
    this.worldLoadVersion += 1;
    if (this.mobs) {
      this.scene.remove(this.mobs.group);
      this.mobs.group.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
        }
      });
    }
    cancelAnimationFrame(this.frameId);
    this.saveGame();
    const el = this.renderer.domElement;
    el.removeEventListener("pointerdown", this.onPointerDown);
    el.removeEventListener("pointermove", this.onPointerMove);
    el.removeEventListener("pointerup", this.onPointerUp);
    el.removeEventListener("pointercancel", this.onPointerUp);
    window.removeEventListener("pointerup", this.onPointerUp);
    el.removeEventListener("wheel", this.onWheel);
    el.removeEventListener("contextmenu", this.onContextMenu);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    if (this.resizeHandler) {
      window.removeEventListener("resize", this.resizeHandler);
      window.removeEventListener("orientationchange", this.resizeHandler);
    }
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.audio.dispose();
    this.environment?.dispose();
    this.clearWorldMeshes();
    this.opaqueMat.dispose();
    this.cutoutMat.dispose();
    this.plantMat.dispose();
    this.emissiveMat.dispose();
    this.cubeRT?.dispose();
    this.waterRT?.dispose();
    if (this.butterflies) {
      this.scene.remove(this.butterflies.mesh);
      this.butterflies.mesh.geometry.dispose();
      (this.butterflies.mesh.material as THREE.Material).dispose();
    }
    if (this.ripples) {
      this.scene.remove(this.ripples);
      this.ripples.geometry.dispose();
      (this.ripples.material as THREE.Material).dispose();
    }
    this.translucentMat.dispose();
    this.waterSideMat.dispose();
    this.atlasMap.dispose();
    this.atlasNormal.dispose();
    this.atlasRoughness.dispose();
    if (this.weatherRig) {
      this.scene.remove(this.weatherRig.rain, this.weatherRig.birds, this.weatherRig.shootingStar);
      this.weatherRig.rain.geometry.dispose();
      (this.weatherRig.rain.material as THREE.Material).dispose();
    }
    this.composer.dispose?.();
    this.gtaoPass?.dispose();
    this.bokehPass?.dispose();
    this.pmrem?.dispose();
    this.rayTarget?.dispose();
    this.godRays?.material.dispose();
    this.godPass?.material.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

void AO_SHADE;
void SEA;
void waterBlockGuard;
function waterBlockGuard() {
  return BLOCKS.length;
}
