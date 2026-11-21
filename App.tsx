import { Component, useCallback, useEffect, useRef, useState, type ErrorInfo, type ReactNode } from "react";
import { X } from "lucide-react";

declare global {
  interface Window {
    __blockrealmShowError?: (message: string) => void;
    __blockrealmClassicBoot?: (force?: boolean) => boolean;
    __BLOCKREALM_BOOTED?: boolean;
  }
}
import {
  DEFAULT_SETTINGS,
  VoxelEngine,
  readSave,
  type GameSettings,
  type GameStats,
  type MapData,
  type SaveData,
} from "./game/engine";
import { HOTBAR } from "./game/hotbar";
import { QUESTS, questProgress } from "./game/quests";

import { ID } from "./game/world";
import type { Panel, ToastItem, ToastTone } from "./types";
import { MainMenu } from "./components/MainMenu";
import { GameHUD } from "./components/GameHUD";
import {
  HelpPanel,
  InventoryPanel,
  LoadingScreen,
  PauseMenu,
  MapPanel,
  MissingWorld,
  PhotoOverlay,
  SettingsPanel,
} from "./components/Panels";

const SETTINGS_KEY = "blockrealm.settings.v3";
const QUESTS_KEY = "blockrealm.quests.v2";
const START_SEED = 9163204;

function freshSave(): SaveData {
  return {
    seed: START_SEED,
    edits: [],
    player: { x: 0, y: 0, z: 0 },
    time: 9.2,
    inventory: {},
    selected: ID.grass,
    mined: 0,
    placed: 0,
    distance: 0,
    peak: 0,
    nights: 0,
    savedAt: Date.now(),
  };
}

function loadSettings(): GameSettings {
  const base = { ...DEFAULT_SETTINGS };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<GameSettings>;
      // visual identity features are always restored as ON; if an older/hostile
      // profile saved them off, we heal it so the world is never flat again.
      return {
        ...base,
        ...parsed,
        shadows: true,
        bloom: true,
        reflections: true,
        ambientOcclusion: true,
        antiAliasing: true,
        effects: true,
        clouds: parsed.clouds ?? true,
      };
    }
  } catch {
    /* ignore */
  }
  return base;
}

function loadCompleted(): string[] {
  try {
    const raw = localStorage.getItem(QUESTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as string[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    /* ignore */
  }
  return [];
}

class GameErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Blockrealm UI error", error, info.componentStack);
    const showError = (window as unknown as { __blockrealmShowError?: (msg: string) => void }).__blockrealmShowError;
    if (showError) showError(`${error.message}\n\n${info.componentStack ?? ""}`);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full min-h-screen flex-col items-center justify-center gap-3 bg-[#040a07] p-6 text-center">
          <p className="font-pixel text-[11px] uppercase tracking-[0.24em] text-[#a7eb76]">BLOCKREALM</p>
          <h1 className="text-lg font-extrabold text-white">Terjadi kesalahan tampilan</h1>
          <p className="max-w-sm text-[12px] leading-relaxed text-[#9db4a6]">
            {this.state.error.message}
          </p>
          <button onClick={() => window.location.reload()} className="btn-primary !px-4 !py-2 text-[11px]">
            Muat ulang game
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <GameErrorBoundary>
      <BlockrealmGame />
    </GameErrorBoundary>
  );
}

function BlockrealmGame() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<VoxelEngine | null>(null);
  const pendingRef = useRef<{ seed: number; mode: "continue" | "new" } | null>(null);
  const loadTokenRef = useRef(0);
  const panelReturnRef = useRef<Panel>(null);
  const toastIdRef = useRef(1);

  const [screen, setScreen] = useState<"menu" | "loading" | "play">("menu");
  const [panel, setPanel] = useState<Panel>(null);
  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());
  const [stats, setStats] = useState<GameStats | null>(null);
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [inventory, setInventory] = useState<Record<number, number>>({});
  const [selected, setSelected] = useState<number>(ID.grass);
  const [seed, setSeed] = useState<number>(() => readSave()?.seed ?? START_SEED);
  const [saveInfo, setSaveInfo] = useState<SaveData | null>(() => readSave());
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingLabel, setLoadingLabel] = useState("Menyiapkan dunia");
  const [loadingSeed, setLoadingSeed] = useState(START_SEED);
  const [inventoryTab, setInventoryTab] = useState<"blocks" | "craft">("blocks");
  const [completedQuests, setCompletedQuests] = useState<string[]>(() => loadCompleted());
  const [initError, setInitError] = useState(false);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia?.("(pointer: coarse)").matches || window.innerWidth < 900 : false
  );
  const isMobileRef = useRef(false);
  const [hudMinimal, setHudMinimal] = useState(false);

  const [showRotateHint, setShowRotateHint] = useState(true);
  const [engineReady, setEngineReady] = useState(false);
  const [wantEngine, setWantEngine] = useState(false);
  const [portrait, setPortrait] = useState(false);
  const [viewport, setViewport] = useState(() => ({
    w: typeof window !== "undefined" ? window.innerWidth : 1280,
    h: typeof window !== "undefined" ? window.innerHeight : 720,
  }));
  const [isNarrow, setIsNarrow] = useState(() => (typeof window !== "undefined" ? window.innerWidth < 420 : false));

  const panelRef = useRef<Panel>(null);
  const settingsLive = useRef(settings);
  settingsLive.current = settings;
  panelRef.current = panel;
  const screenRef = useRef(screen);
  screenRef.current = screen;

  const addToast = useCallback((text: string, tone: ToastTone = "info") => {
    const id = toastIdRef.current++;
    setToasts((prev) => [...prev.slice(-3), { id, text, tone }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  }, []);

  const openPanel = useCallback((next: Panel, returnTo: Panel = null) => {
    panelReturnRef.current = returnTo;
    setPanel(next);
    const engine = engineRef.current;
    if (!engine) return;
    if (next === "photo") {
      engine.setMode("photo");
    } else if (next) {
      engine.setPaused(true);
    } else if (screenRef.current === "play") {
      engine.setMode("play");
      engine.setPaused(false);
    } else {
      engine.setPaused(true);
    }
  }, []);

  const closePanel = useCallback(() => {
    const back = panelReturnRef.current;
    if (back) {
      panelReturnRef.current = null;
      setPanel(back);
      engineRef.current?.setPaused(true);
      return;
    }
    setPanel(null);
    const engine = engineRef.current;
    if (!engine) return;
    if (screenRef.current === "play") {
      engine.setMode("play");
      engine.setPaused(false);
    } else {
      engine.setPaused(true);
    }
  }, []);

  const handleEvent = useCallback(
    (event: string, payload?: unknown) => {
      if (event === "toast") {
        const data = payload as { text?: string; tone?: ToastTone } | undefined;
        if (data?.text) addToast(data.text, data.tone ?? "info");
        return;
      }
      if (event === "pause") {
        if (panelRef.current) closePanel();
        else if (screenRef.current === "play") openPanel("pause");
        return;
      }
      if (event === "welcome") {
        addToast(
          isMobileRef.current
            ? "Geser layar untuk melihat · joystick kiri · tombol aksi kanan"
            : "Seret mouse untuk melihat · WASD bergerak · Klik kiri tambang",
          "info"
        );
        return;
      }
      if (event === "npc") {
        return;
      }
      if (event === "loadprogress") {
        const data = payload as { progress?: number; label?: string } | undefined;
        if (typeof data?.progress === "number") {
          setLoadingProgress((prev) => (data?.progress ? Math.max(prev, Math.min(96, data.progress!)) : prev));
        }
        if (data?.label) setLoadingLabel(data.label);
        return;
      }
      if (event === "quality") {
        const data = payload as { resolution?: number; level?: number } | undefined;
        if (data) {
          setSettings((prev) => ({ ...prev, resolution: data.resolution ?? prev.resolution }));
        }
        return;
      }
      if (event === "setting") {
        const patch = payload as Partial<GameSettings>;
        setSettings((prev) => {
          const next = { ...prev, ...patch };
          try { localStorage.setItem("blockrealm.settings.v3", JSON.stringify(next)); } catch { /* ignore */ }
          return next;
        });
        return;
      }
      if (event === "slot") {
        const index = payload as number;
        const id = HOTBAR[index];
        if (id) {
          engineRef.current?.selectBlock(id);
          setSelected(id);
        }
        return;
      }
      if (event === "inventory" || event === "palette") {
        setInventoryTab("blocks");
        openPanel("inventory");
        return;
      }
      if (event === "craft") {
        setInventoryTab("craft");
        openPanel("inventory");
        return;
      }
      if (event === "map" || event === "help" || event === "settings" || event === "photo") {
        openPanel(event as Panel);
      }
    },
    [addToast, closePanel, openPanel]
  );

  useEffect(() => {
    isMobileRef.current = isMobile;
  }, [isMobile]);

  // Auto landscape without needing a rotation lock: when the device is held in
  // portrait the whole game is rotated 90° and scaled to fill the screen.
  useEffect(() => {
    const update = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      setViewport({ w: vw, h: vh });
      setPortrait(vh > vw && vw < 1024);
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  useEffect(() => {
    const onResize = () => {
      setIsMobile(window.matchMedia?.("(pointer: coarse)").matches || window.innerWidth < 900);
      setIsNarrow(window.innerWidth < 420);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Boot the 3D engine once. The menu paints first, then the engine builds in
  // the background so the app never feels stuck on a blank/boot screen.
  useEffect(() => {
    if (!wantEngine) return;
    let disposed = false;
    let engine: VoxelEngine | null = null;
    let interval = 0;
    let bootTimer = 0;

    const saveOnLeave = () => engineRef.current?.saveGame();

    const boot = () => {
      if (disposed) return;
      const container = mountRef.current;
      if (!container) return;
      // Graceful WebGL check.
      const probe = document.createElement("canvas");
      const gl = probe.getContext("webgl2") || probe.getContext("webgl");
      if (!gl) {
        window.__blockrealmShowError?.(
          "WebGL tidak tersedia di perangkat/WebView ini. Aktifkan akselerasi perangkat keras atau gunakan browser modern."
        );
        setInitError(true);
        return;
      }
      const rawSave = readSave();
      const save = rawSave ?? freshSave();
      try {
        engine = new VoxelEngine(container, {
          settings: loadSettings(),
          save: rawSave,
          seed: save?.seed ?? START_SEED,
          deferInitialWorldLoad: true,
          onStats: (next) => setStats(next),
          onInventory: (inv, selectedId) => {
            setInventory(inv);
            setSelected(selectedId);
          },
          onEvent: handleEvent,
        });
        engineRef.current = engine;
        setEngineReady(true);
        const pendingNow = pendingRef.current;
        if (pendingNow) {
          const requestToken = loadTokenRef.current;
          const restoreNow = pendingNow.mode === "continue" ? readSave() : null;
          setLoadingLabel("Menyiapkan dunia");
          setLoadingProgress(8);
          // Calling the async loader builds the terrain data before its first
          // yield, so the minimap can safely be populated right afterwards.
          const worldLoad = engine.loadWorldProgressive(pendingNow.seed, restoreNow?.edits ?? null, restoreNow);
          setMapData(engine.getMap());
          void worldLoad.then(() => {
            if (disposed || requestToken !== loadTokenRef.current) return;
            engine!.setPaused(true);
            setLoadingProgress(100);
            engine!.startPlay();
            setScreen("play");
            setPanel(null);
            panelReturnRef.current = null;
            pendingRef.current = null;
            setMapData(engine!.getMap());
            setSaveInfo(readSave());
          }).catch((error) => {
            if (disposed || requestToken !== loadTokenRef.current) return;
            console.error("Blockrealm world load failed", error);
            window.__blockrealmShowError?.(error instanceof Error ? error.stack ?? error.message : String(error));
            setInitError(true);
          });
        }
        interval = window.setInterval(() => {
          if (engineRef.current) setMapData(engineRef.current.getMap());
        }, 2500);
        window.addEventListener("beforeunload", saveOnLeave);
      } catch (error) {
        console.error("Blockrealm engine failed to start", error);
        window.__blockrealmShowError?.(error instanceof Error ? error.stack ?? error.message : String(error));
        setInitError(true);
      }
    };

    // Give the loading overlay a frame, then build the world.
    bootTimer = window.setTimeout(boot, 60);

    return () => {
      disposed = true;
      window.clearTimeout(bootTimer);
      window.clearInterval(interval);
      window.removeEventListener("beforeunload", saveOnLeave);
      engine?.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantEngine]);

  // Menu state refresh
  useEffect(() => {
    if (screen === "menu") {
      setSaveInfo(readSave());
      const engine = engineRef.current;
      if (engine) {
        engine.setPaused(true);
        setMapData(engine.getMap());
      }
    }
  }, [screen]);

  // Real progress reported by the engine while it builds terrain.
  useEffect(() => {
    if (screen !== "loading") return;
    const onProgress = (event: Event) => {
      const detail = (event as CustomEvent<{ progress?: number }>).detail;
      if (typeof detail?.progress === "number") {
        setLoadingProgress((prev) => Math.max(prev, Math.min(92, detail.progress ?? prev)));
      }
    };
    window.addEventListener("blockrealm:loadprogress", onProgress);
    return () => window.removeEventListener("blockrealm:loadprogress", onProgress);
  }, [screen]);

  // Quest completion
  useEffect(() => {
    if (screen !== "play" || !stats) return;
    for (const quest of QUESTS) {
      if (completedQuests.includes(quest.id)) continue;
      if (questProgress(quest, stats) >= quest.target) {
        setCompletedQuests((prev) => {
          if (prev.includes(quest.id)) return prev;
          const next = [...prev, quest.id];
          try {
            localStorage.setItem(QUESTS_KEY, JSON.stringify(next));
          } catch {
            /* ignore */
          }
          return next;
        });
        addToast(`Misi selesai — ${quest.title} · Hadiah ${quest.reward}`, "success");
      }
    }
  }, [stats, screen, completedQuests, addToast]);

  const updateSettings = useCallback((patch: Partial<GameSettings>) => {
    engineRef.current?.setSettings(patch);
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const enterLandscape = useCallback(async () => {
    try {
      const el = document.documentElement as HTMLElement & {
        webkitRequestFullscreen?: () => Promise<void>;
      };
      if (!document.fullscreenElement) {
        if (el.requestFullscreen) await el.requestFullscreen();
        else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
      }
    } catch {
      /* fullscreen may be blocked — the game still runs */
    }
    try {
      const orientation = window.screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
      await orientation.lock?.("landscape");
    } catch {
      /* orientation lock is only supported on some mobile browsers */
    }
  }, []);

  const startGame = (worldSeed: number, mode: "continue" | "new") => {
    void enterLandscape();
    const requestToken = ++loadTokenRef.current;
    pendingRef.current = { seed: worldSeed, mode };
    setSeed(worldSeed);
    setLoadingSeed(worldSeed);
    setLoadingProgress(4);
    setPanel(null);
    panelReturnRef.current = null;
    if (mode === "new") setSaveInfo(null);
    if (!engineRef.current) {
      // First run: spin up the renderer now, then continue automatically.
      setLoadingLabel("Menyalakan mesin 3D");
      setScreen("loading");
      setWantEngine(true);
      return;
    }
    setSeed(worldSeed);
    setLoadingSeed(worldSeed);
    setLoadingProgress(4);
    setLoadingLabel("Menyiapkan dunia");
    setPanel(null);
    panelReturnRef.current = null;
    if (mode === "new") setSaveInfo(null);
    setScreen("loading");

    // Reuse the existing renderer and load only the new world data. The old
    // path displayed a loading screen but never actually started this reload.
    const currentEngine = engineRef.current;
    if (currentEngine) {
      const restoreNow = mode === "continue" ? readSave() : null;
      const worldLoad = currentEngine.loadWorldProgressive(worldSeed, restoreNow?.edits ?? null, restoreNow);
      setMapData(currentEngine.getMap());
      void worldLoad.then(() => {
        if (requestToken !== loadTokenRef.current) return;
        currentEngine.setPaused(true);
        setLoadingProgress(100);
        currentEngine.startPlay();
        setScreen("play");
        setPanel(null);
        panelReturnRef.current = null;
        pendingRef.current = null;
        setMapData(currentEngine.getMap());
        setSaveInfo(readSave());
      }).catch((error) => {
        if (requestToken !== loadTokenRef.current) return;
        console.error("Blockrealm world reload failed", error);
        window.__blockrealmShowError?.(error instanceof Error ? error.stack ?? error.message : String(error));
        setInitError(true);
      });
    }
  };

  const cancelLoading = () => {
    loadTokenRef.current += 1;
    pendingRef.current = null;
    setScreen("menu");
    engineRef.current?.cancelWorldLoad();
    engineRef.current?.setPaused(true);
  };

  const randomizeSeed = () => {
    const next = Math.floor(Math.random() * 89_999_999) + 10_000_000;
    setSeed(next);
    addToast(`Seed baru disiapkan: #${next.toString(36).toUpperCase()}`, "info");
  };

  const handleAction = useCallback(
    (action: string) => {
      const engine = engineRef.current;
      switch (action) {
        case "fly":
          engine?.toggleFlying();
          break;
        case "view":
          engine?.toggleView();
          break;
        case "inventory":
        case "palette":
          setInventoryTab("blocks");
          openPanel("inventory");
          break;
        case "craft":
          setInventoryTab("craft");
          openPanel("inventory");
          break;
        case "resetview":
          engine?.resetCameraView();
          break;
        case "sens+":
          engine?.setSensitivity((settingsLive.current?.mouseSensitivity ?? 24) + 3);
          break;
        case "sens-":
          engine?.setSensitivity((settingsLive.current?.mouseSensitivity ?? 24) - 3);
          break;
        case "ultra":
          engine?.applyUltraPreset();
          setSettings((prev) => ({
            ...prev,
            shadows: true,
            shadowQuality: "medium",
            bloom: true,
            reflections: true,
            ambientOcclusion: true,
            antiAliasing: true,
            effects: true,
            clouds: true,
            resolution: Math.min(1.5, Math.max(1, window.devicePixelRatio || 1)),
          }));
          break;
        case "photo":
        case "pause":
        case "map":
        case "help":
        case "settings":
          openPanel(action as Panel);
          break;
        default:
          break;
      }
    },
    [openPanel]
  );

  const handleSelect = (id: number) => {
    engineRef.current?.selectBlock(id);
    setSelected(id);
  };

  const handleFullscreen = () => {
    try {
      if (!document.fullscreenElement) void document.documentElement.requestFullscreen();
      else void document.exitFullscreen();
    } catch {
      /* ignore */
    }
  };

  const handleSave = () => {
    engineRef.current?.saveGame();
    setSaveInfo(readSave());
    addToast("Dunia berhasil disimpan", "success");
  };
  void handleSave;

  const resume = () => closePanel();

  const exitToMenu = () => {
    engineRef.current?.goToMenu();
    setSaveInfo(readSave());
    setScreen("menu");
    setPanel(null);
    panelReturnRef.current = null;
    setToasts([]);
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#040a07] text-[#f2f7ee]">
      {portrait && <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-[#07130e] to-[#040a07]" />}
      <div
        className="absolute"
        style={
          portrait
            ? {
                width: `${viewport.h}px`,
                height: `${viewport.w}px`,
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%) rotate(90deg)",
                transformOrigin: "center center",
              }
            : { inset: 0 }
        }
      >
      <div ref={mountRef} className="absolute inset-0 z-0" />
      {!engineReady && (
        <div className="absolute inset-0 z-0 overflow-hidden bg-[#08140f]">
          <div className="absolute inset-0 bg-[radial-gradient(1200px_600px_at_70%_20%,rgba(120,200,140,0.18),transparent_60%),linear-gradient(160deg,#0a1a13_0%,#0d2418_40%,#07120c_100%)]" />
          <div className="absolute -right-24 top-1/4 h-[420px] w-[420px] rotate-12 rounded-[64px] border border-[#a7eb76]/20 bg-gradient-to-br from-[#2f5a3a] to-[#12261a] shadow-[0_60px_120px_rgba(0,0,0,.55)]" />
          <div className="absolute right-40 bottom-10 h-40 w-40 rounded-2xl border border-[#a7eb76]/15 bg-gradient-to-br from-[#3c6b47] to-[#16301f]" />
        </div>
      )}

      {screen === "menu" && (
        <MainMenu
          save={saveInfo}
          seed={seed}
          mapData={mapData}
          stats={stats}
          soundOn={settings.sound}
          onToggleSound={() => updateSettings({ sound: !settings.sound })}
          onFullscreen={handleFullscreen}
          onStart={startGame}
          onRandomSeed={randomizeSeed}
          onOpenPanel={(p) => openPanel(p)}
        />
      )}

      {screen === "play" && stats && !panel && (
        <GameHUD
          stats={stats}
          inventory={inventory}
          selected={selected}
          mapData={mapData}
          settings={settings}
          toasts={toasts}
          isMobile={isMobile}
          isNarrow={isNarrow}
          hudMinimal={hudMinimal}
          onHudMinimal={setHudMinimal}
          onSelect={handleSelect}
          onAction={handleAction}
          onMobileAxis={(x, y) => engineRef.current?.setMobileAxis(x, y)}
          onMobileAction={(action) => engineRef.current?.mobileAction(action)}
        />
      )}

      {screen === "loading" && (
        <LoadingScreen progress={loadingProgress} seed={loadingSeed} onCancel={cancelLoading} label={loadingLabel} />
      )}

      {screen === "play" && panel === "photo" && stats && (
        <PhotoOverlay
          settings={settings}
          stats={stats}
          onChange={updateSettings}
          onScreenshot={() => engineRef.current?.screenshot()}
          onClose={() => {
            engineRef.current?.setMode("play");
            closePanel();
          }}
        />
      )}

      {panel === "pause" && screen === "play" && stats && (
        <PauseMenu
          stats={stats}
          mapData={mapData}
          settings={settings}
          onResume={resume}
          onOpen={(next) => {
            if (next) openPanel(next, "pause");
          }}
          onSave={handleSave}
          onScreenshot={() => engineRef.current?.screenshot()}
          onExit={exitToMenu}
        />
      )}

      {panel === "settings" && (
        <SettingsPanel
          settings={settings}
          onChange={updateSettings}
          onClose={closePanel}
          initialTab="graphics"
        />
      )}

      {panel === "inventory" && (
        <InventoryPanel
          inventory={inventory}
          selected={selected}
          creative={settings.creative}
          initialTab={inventoryTab}
          onSelect={handleSelect}
          onCraft={(id) => engineRef.current?.craft(id)}
          onClose={closePanel}
        />
      )}

      {panel === "map" && stats && (
        <MapPanel
          mapData={mapData}
          stats={stats}
          onTeleport={(id) => engineRef.current?.teleportWaypoint(id)}
          onClose={closePanel}
        />
      )}

      {panel === "help" && <HelpPanel onClose={closePanel} />}

      {/* menu-level toasts */}
      {screen === "menu" && toasts.length > 0 && (
        <div className="pointer-events-none absolute bottom-6 left-1/2 z-[90] flex -translate-x-1/2 flex-col gap-1.5">
          {toasts.map((t) => (
            <div key={t.id} className="animate-toast rounded-lg border border-[#a7eb76]/30 bg-[#0a1a10]/95 px-3 py-1.5 text-[10px] font-semibold text-[#dcf8c8] shadow-xl backdrop-blur">
              {t.text}
            </div>
          ))}
        </div>
      )}

      

      {initError && <MissingWorld onBack={() => window.location.reload()} />}
      </div>

      {portrait && showRotateHint && (
        <div className="pointer-events-none absolute left-1/2 top-3 z-[90] flex -translate-x-1/2 items-center gap-2 rounded-lg border border-[#a7eb76]/30 bg-[#07130e]/90 px-3 py-1.5 backdrop-blur-md">
          <span className="text-[10px] font-semibold text-[#dcf8c8]">Lanskap otomatis aktif</span>
          <button onClick={() => setShowRotateHint(false)} className="pointer-events-auto text-[#8fa699] hover:text-white">
            <X size={11} />
          </button>
        </div>
      )}
    </div>
  );
}
