import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUp,
  CloudRain as CloudRainIcon,
  Backpack,
  Box,
  ChevronDown,
  ChevronUp,
  Compass,
  Eye,
  Hammer,
  Heart,
  Layers,
  Map as MapIcon,
  Menu,
  Moon,
  Move3d,
  Navigation,
  Pickaxe,
  Plus,
  Settings,
  Sparkles,
  Sun,
  Wheat,
  Wind,
  X,
  Zap,
} from "lucide-react";
import type { GameSettings, GameStats, MapData } from "../game/engine";
import { HOTBAR, SHORTCUT_LABELS } from "../game/hotbar";
import { QUESTS, questProgress } from "../game/quests";
import { BLOCKS, blockDef } from "../game/world";
import { avatarDataUrl } from "../game/textures";
import type { ToastItem } from "../types";
import { BlockIcon, ProgressBar } from "./ui";
import { WorldCanvas } from "./WorldCanvas";
import { cn } from "../utils/cn";

const QUEST_ICONS: Record<string, React.ReactNode> = {
  footprints: <Navigation size={10} />,
  pickaxe: <Pickaxe size={10} />,
  hammer: <Hammer size={10} />,
  mountain: <Layers size={10} />,
  moon: <Moon size={10} />,
  compass: <Compass size={10} />,
};

// ---------------------------------------------------------------------------
// Touch joystick
// ---------------------------------------------------------------------------
function Joystick({ onChange }: { onChange: (x: number, y: number) => void }) {
  const baseRef = useRef<HTMLDivElement | null>(null);
  const [thumb, setThumb] = useState({ x: 0, y: 0 });
  const activeId = useRef<number | null>(null);
  const radius = 46;

  const update = (clientX: number, clientY: number) => {
    const el = baseRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const len = Math.hypot(dx, dy);
    if (len > radius) {
      dx = (dx / len) * radius;
      dy = (dy / len) * radius;
    }
    setThumb({ x: dx, y: dy });
    onChange(dx / radius, dy / radius);
  };

  const reset = () => {
    activeId.current = null;
    setThumb({ x: 0, y: 0 });
    onChange(0, 0);
  };

  return (
    <div
      ref={baseRef}
      className="pointer-events-auto relative h-[122px] w-[122px] touch-none select-none rounded-full border border-white/20 bg-[#06110c]/55 backdrop-blur-md"
      style={{ boxShadow: "inset 0 0 30px rgba(0,0,0,.5), 0 10px 30px rgba(0,0,0,.35)" }}
      onPointerDown={(e) => {
        e.preventDefault();
        activeId.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        update(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (activeId.current !== e.pointerId) return;
        update(e.clientX, e.clientY);
      }}
      onPointerUp={reset}
      onPointerCancel={reset}
      onLostPointerCapture={reset}
    >
      <div className="absolute inset-2 rounded-full border border-white/8" />
      <span className="absolute left-1/2 top-2 -translate-x-1/2 text-[8px] text-white/30">▲</span>
      <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[8px] text-white/30">▼</span>
      <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10" />
      <div
        className="absolute left-1/2 top-1/2 flex h-12 w-12 items-center justify-center rounded-full border border-[#cdf3a6]/60 bg-gradient-to-b from-[#a9e07c] to-[#5c9c4a] text-[#183014] shadow-[0_6px_16px_rgba(0,0,0,.45)]"
        style={{ transform: `translate(calc(-50% + ${thumb.x}px), calc(-50% + ${thumb.y}px))` }}
      >
        <Move3d size={17} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Touch action buttons
// ---------------------------------------------------------------------------
function TouchButton({
  children,
  label,
  onPress,
  onRelease,
  variant = "dark",
  size = 54,
  active,
}: {
  children: React.ReactNode;
  label?: string;
  onPress: () => void;
  onRelease?: () => void;
  variant?: "dark" | "lime" | "amber";
  size?: number;
  active?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        aria-label={label}
        onPointerDown={(e) => {
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          onPress();
        }}
        onPointerUp={(e) => {
          e.currentTarget.releasePointerCapture?.(e.pointerId);
          onRelease?.();
        }}
        onPointerCancel={() => onRelease?.()}
        onContextMenu={(e) => e.preventDefault()}
        className={cn(
          "pointer-events-auto flex touch-none select-none items-center justify-center rounded-full border-2 active:scale-95",
          variant === "lime"
            ? "border-[#e7ffd0]/70 bg-gradient-to-b from-[#b4ef8a] to-[#5f9f4b] text-[#16300f] shadow-[0_6px_18px_rgba(120,200,110,.35)]"
            : variant === "amber"
              ? "border-[#f0d79a]/60 bg-gradient-to-b from-[#e9cf95] to-[#b08d4c] text-[#2a1f0d] shadow-[0_6px_18px_rgba(220,180,100,.3)]"
              : "border-white/20 bg-[#08130e]/75 text-[#e3f2e0] backdrop-blur-md shadow-[0_6px_18px_rgba(0,0,0,.4)]",
          active && "ring-2 ring-[#a7eb76]/70"
        )}
        style={{ width: size, height: size }}
      >
        {children}
      </button>
      {label && <span className="pointer-events-none text-[7px] font-bold tracking-wide text-white/70 drop-shadow-[0_1px_2px_rgba(0,0,0,.8)] sm:text-[8px]">{label}</span>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// HUD
// ---------------------------------------------------------------------------
export function GameHUD({
  stats,
  inventory,
  selected,
  mapData,
  settings,
  toasts,
  isMobile,
  isNarrow,
  hudMinimal,
  onSelect,
  onAction,
  onMobileAxis,
  onMobileAction,
  onHudMinimal,
}: {
  stats: GameStats;
  inventory: Record<number, number>;
  selected: number;
  mapData: MapData | null;
  settings: GameSettings;
  toasts: ToastItem[];
  isMobile: boolean;
  isNarrow: boolean;
  onSelect: (id: number) => void;
  onAction: (action: string) => void;
  onMobileAxis: (x: number, y: number) => void;
  onMobileAction: (action: "mine" | "place" | "jump") => void;
  onHudMinimal: (v: boolean) => void;
  hudMinimal: boolean;
}) {
  const avatar = useMemo(() => avatarDataUrl(3, 128), []);
  const [playerOpen, setPlayerOpen] = useState(!isMobile);
  const [questsOpen, setQuestsOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(!isMobile && !settings.hudCompact);
  const [menuOpen, setMenuOpen] = useState(false);
  const [flying, setFlying] = useState(stats.flying);
  const mineTimer = useRef<number | null>(null);

  useEffect(() => setFlying(stats.flying), [stats.flying]);
  useEffect(() => () => {
    if (mineTimer.current) window.clearInterval(mineTimer.current);
  }, []);

  const activeQuests = useMemo(() => {
    const incomplete = QUESTS.filter((q) => questProgress(q, stats) < q.target);
    return (incomplete.length ? incomplete : QUESTS).slice(0, 3);
  }, [stats]);
  const completed = useMemo(() => QUESTS.filter((q) => questProgress(q, stats) >= q.target).length, [stats]);
  const selectedDef = blockDef(selected);
  const count = inventory[selected] ?? 0;
  const xp = Math.min(100, (stats.mined * 3 + stats.placed * 5 + stats.distance) % 100);


  return (
    <div className="pointer-events-none absolute inset-0 z-30 select-none">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(125%_92%_at_50%_50%,transparent_62%,rgba(2,8,5,.32)_100%)]" />

      {hudMinimal && (
        <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
          <button
            onClick={() => onHudMinimal(false)}
            className="pointer-events-auto flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#06110c]/55 px-2.5 py-1.5 text-[9px] font-semibold text-white/80 backdrop-blur-md transition-colors hover:bg-[#06110c]/80 hover:text-white"
          >
            <Eye size={11} /> Tampilkan HUD
          </button>
          <button onClick={() => onAction("pause")} className="btn-icon pointer-events-auto !h-7 !w-7" aria-label="Menu">
            <Menu size={12} />
          </button>
        </div>
      )}

      {/* ---------- compact player card ---------- */}
      {!hudMinimal && (
        <div className="absolute left-2.5 top-2.5 flex flex-col gap-1.5 sm:left-4 sm:top-4">
          <div className="glass pointer-events-auto w-[196px] overflow-hidden rounded-xl sm:w-[230px]">
            <button onClick={() => setPlayerOpen((v) => !v)} className="flex w-full items-center gap-2 px-2 py-1.5">
              <img src={avatar} alt="Pemain" className="h-8 w-8 rounded-md border border-white/15 [image-rendering:pixelated]" />
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-[10.5px] font-bold leading-none text-white">PlayerOne</p>
                <p className="mt-0.5 font-pixel text-[6px] text-[#8fa699] sm:hidden">{stats.timeLabel} · {stats.phase} · {stats.fps} FPS</p>
              </div>
              {playerOpen ? <ChevronUp size={11} className="text-white/50" /> : <ChevronDown size={11} className="text-white/50" />}
            </button>
            {playerOpen && (
              <div className="border-t border-white/8 px-2 py-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex gap-[1px]">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <Heart key={i} size={9} className={i < Math.ceil(stats.health / 2) ? "fill-[#ff6b6b] text-[#ff8080]" : "fill-black/40 text-white/20"} />
                    ))}
                  </div>
                  <div className="flex gap-[1px]">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <Wheat key={i} size={9} className={i < Math.ceil(stats.hunger / 2) ? "text-[#e7c479]" : "text-white/20"} />
                    ))}
                  </div>
                </div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className="font-pixel text-[6px] text-[#a7eb76]">XP</span>
                  <ProgressBar value={xp} max={100} className="h-[3px]" color="#8fd36d" />
                  <span className="font-pixel text-[6px] text-[#8fa699]">{xp}%</span>
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[7.5px] text-[#8fa699]">
                  <span className="flex items-center gap-1"><Pickaxe size={8} /> {stats.mined}</span>
                  <span className="flex items-center gap-1"><Hammer size={8} /> {stats.placed}</span>
                  <span className="flex items-center gap-1"><Navigation size={8} /> {stats.distance}</span>
                  <span className={cn("flex items-center gap-1 rounded px-1 font-pixel text-[5.5px]", stats.fps >= 55 ? "bg-[#a7eb76]/15 text-[#c9f3b2]" : stats.fps >= 35 ? "bg-[#eccb83]/15 text-[#f2dca5]" : "bg-white/10 text-[#c3d2c4]")}>
                    {stats.qualityLevel >= 2 ? "ULTRA" : stats.qualityLevel === 1 ? "SEIMBANG" : "PERFORMA"} · {stats.fps}FPS
                  </span>
                </div>
              </div>
            )}
          </div>

          {!isMobile && !settings.hudCompact && (
            <div className="glass pointer-events-auto w-[230px] overflow-hidden rounded-xl">
              <button onClick={() => setQuestsOpen((v) => !v)} className="flex w-full items-center justify-between px-2.5 py-1.5">
                <span className="flex items-center gap-1.5">
                  <Sparkles size={10} className="text-[#eccb83]" />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#d9e9d5]">Misi</span>
                  <span className="rounded bg-white/8 px-1 py-0.5 font-pixel text-[6px] text-[#9db4a1]">{completed}/{QUESTS.length}</span>
                </span>
                {questsOpen ? <ChevronUp size={11} className="text-[#8fa699]" /> : <ChevronDown size={11} className="text-[#8fa699]" />}
              </button>
              {questsOpen && (
                <div className="space-y-1.5 border-t border-white/8 px-2.5 py-2">
                  {activeQuests.map((q) => {
                    const progress = questProgress(q, stats);
                    return (
                      <div key={q.id}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex min-w-0 items-center gap-1.5 text-[9px] font-semibold text-[#dceada]">
                            <span style={{ color: q.accent }}>{QUEST_ICONS[q.icon]}</span>
                            <span className="truncate">{q.title}</span>
                          </span>
                          <span className="shrink-0 font-pixel text-[6.5px] text-[#8ba093]">{progress}/{q.target}</span>
                        </div>
                        <ProgressBar value={progress} max={q.target} className="mt-1 h-[3px]" color={q.accent} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ---------- top center status ---------- */}
      <div className={cn("absolute left-1/2 top-2 -translate-x-1/2 items-center gap-1.5 rounded-full border border-white/12 bg-[#06110c]/65 px-2.5 py-1 backdrop-blur-md sm:top-3", isNarrow || hudMinimal ? "hidden" : "flex")}>
        {stats.phase === "Malam" ? <Moon size={11} className="text-[#b9c8ff]" /> : <Sun size={11} className="text-[#f3d88c]" />}
        <span className="font-pixel text-[8px] text-white">{stats.timeLabel}</span>
        <span className="h-2.5 w-px bg-white/15" />
        <span className="text-[8px] text-[#bcd3bb]">{stats.phase}</span>
        <span className="hidden h-2.5 w-px bg-white/15 sm:block" />
        <span className="hidden items-center gap-1 text-[8px] text-[#a9bfae] sm:flex"><Wind size={9} /> {stats.biome}</span>
        <span className="h-2.5 w-px bg-white/15" />
        <span className="flex items-center gap-1 text-[8px] text-[#a9bfae]">
          {stats.weather === "storm" ? <Zap size={9} className="text-[#ffe08a]" /> : stats.weather === "rain" ? <CloudRainIcon /> : <Sun size={9} className="text-[#f3d88c]" />}
          {stats.weather === "storm" ? "Badai" : stats.weather === "rain" ? "Hujan" : "Cerah"}
        </span>
        <span className="hidden h-2.5 w-px bg-white/15 sm:block" />
        <span className="hidden font-pixel text-[7px] text-[#8fa699] sm:inline">HARI {stats.day}</span>
      </div>

      {/* ---------- top right: minimap + menu ---------- */}
      <div className={cn("absolute right-2.5 top-2.5 flex-col items-end gap-1.5 sm:right-4 sm:top-4", hudMinimal ? "hidden" : "flex")}>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setMapOpen((v) => !v)}
            className="btn-icon pointer-events-auto !h-8 !w-8"
            aria-label={mapOpen ? "Sembunyikan peta" : "Tampilkan peta"}
          >
            <MapIcon size={14} />
          </button>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="pointer-events-auto flex h-8 items-center gap-1 rounded-lg border border-[#a7eb76]/35 bg-[#a7eb76]/12 px-2 text-[9px] font-bold text-[#dcf8c8] backdrop-blur-md transition-colors hover:bg-[#a7eb76]/20"
          >
            <Menu size={13} /> Menu
          </button>
        </div>

        {mapOpen && (
          <div className="glass pointer-events-auto overflow-hidden rounded-xl">
            <div className="relative m-1 overflow-hidden rounded-lg border border-[#9ec9a5]/20">
              <WorldCanvas data={mapData} size={isMobile ? 118 : 152} zoom={1} frame />
              <span className="absolute left-1/2 top-0.5 -translate-x-1/2 font-pixel text-[6px] text-white/90 hud-text">N</span>
              <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 font-pixel text-[6px] text-white/60 hud-text">S</span>
              <div className="absolute bottom-1 left-1 flex items-center gap-1 rounded bg-black/55 px-1 py-0.5">
                <span className="font-pixel text-[6px] text-white/85">{stats.timeLabel}</span>
                <span className="text-[6px] text-white/50">X{Math.floor(stats.x)} Z{Math.floor(stats.z)}</span>
              </div>
            </div>
            <div className="flex items-center justify-between px-1.5 pb-1 pt-0.5 text-[7px] text-[#8fa699]">
              <span className={cn("flex items-center gap-1 font-pixel", stats.fps >= 55 ? "text-[#a7eb76]" : stats.fps >= 35 ? "text-[#eccb83]" : "text-[#ff9a8a]")}>
                <Eye size={8} /> {stats.fps} FPS
              </span>
              <span className="flex items-center gap-1">
                <span className={cn("rounded px-1 py-[1px] font-pixel text-[6px]", stats.qualityLevel >= 2 ? "bg-[#a7eb76]/20 text-[#c9f3b2]" : stats.qualityLevel === 1 ? "bg-[#eccb83]/20 text-[#f2dca5]" : "bg-white/10 text-[#c3d2c4]")}>
                  {stats.qualityLevel >= 2 ? "ULTRA" : stats.qualityLevel === 1 ? "SEIMBANG" : "PERFORMA"}
                </span>
                <Zap size={8} className="text-[#eccb83]" /> {stats.seedLabel}
              </span>
            </div>
          </div>
        )}

        {menuOpen && (
          <div className="glass pointer-events-auto w-[250px] animate-rise rounded-xl p-2">
            <div className="mb-1.5 flex items-center justify-between px-1">
              <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-[#a7eb76]">Menu</p>
              <button onClick={() => setMenuOpen(false)} className="text-[#8fa699] hover:text-white"><X size={11} /></button>
            </div>
            <button
              onClick={() => { onAction("ultra"); setMenuOpen(false); }}
              className="mb-1.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#f0d79a]/50 bg-gradient-to-b from-[#f2dda4] to-[#c9a552] py-2 text-[10px] font-extrabold text-[#2a2109] shadow-[0_4px_14px_rgba(240,200,120,.3)] transition-all hover:brightness-110 active:scale-[.98]"
            >
              <Sparkles size={12} /> Ultra Visual 4K MAX
            </button>
            <div className="grid grid-cols-2 gap-1">
              {[
                { label: "Blok", icon: <Backpack size={15} />, action: "inventory" },
                { label: "Peta", icon: <MapIcon size={15} />, action: "map" },
                { label: "Kamera", icon: <Eye size={15} />, action: "view" },
                { label: "Pengaturan", icon: <Settings size={15} />, action: "settings" },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => { onAction(item.action); setMenuOpen(false); }}
                  className="flex flex-col items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/[0.05] py-2.5 text-[9.5px] font-semibold text-[#dcefdc] transition-colors hover:border-[#a7eb76]/40 hover:bg-[#a7eb76]/12 hover:text-white"
                >
                  <span className="text-[#a7eb76]">{item.icon}</span> {item.label}
                </button>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-3 gap-1">
              {[
                { label: "Kerajinan", action: "craft" },
                { label: "Foto", action: "photo" },
                { label: "Bantuan", action: "help" },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => { onAction(item.action); setMenuOpen(false); }}
                  className="rounded-lg border border-white/8 bg-black/25 py-1.5 text-[8.5px] font-semibold text-[#b8cdb9] hover:text-white"
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="mt-1.5 rounded-lg border border-white/8 bg-black/25 p-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[8.5px] font-semibold text-[#b8cdb9]">Sensitivitas kamera</span>
                <span className="font-pixel text-[8px] text-[#e6f4e2]">{Math.round(settings.mouseSensitivity)}/50</span>
              </div>
              <div className="mt-1 flex items-center gap-1">
                <button onClick={() => onAction("sens-")} className="flex-1 rounded-md border border-white/10 bg-white/[0.04] py-1 text-[10px] font-bold text-[#cfe0d0] hover:text-white">−</button>
                <div className="flex-1 rounded-md border border-[#a7eb76]/25 bg-[#a7eb76]/10 py-1 text-center text-[8px] font-semibold text-[#dcf8c8]">Pelan ⟷ Licin</div>
                <button onClick={() => onAction("sens+")} className="flex-1 rounded-md border border-white/10 bg-white/[0.04] py-1 text-[10px] font-bold text-[#cfe0d0] hover:text-white">+</button>
              </div>
            </div>
            <div className="mt-1 grid grid-cols-2 gap-1">
              <button
                onClick={() => { onAction("resetview"); setMenuOpen(false); }}
                className="flex items-center justify-center gap-1 rounded-md border border-white/10 bg-black/25 py-1.5 text-[8.5px] font-semibold text-[#b8cdb9] hover:text-white"
              >
                <Eye size={10} /> Reset Kamera
              </button>
              <button
                onClick={() => { setMenuOpen(false); onAction("fly"); }}
                className={cn(
                  "flex items-center justify-center gap-1 rounded-md border py-1.5 text-[8.5px] font-semibold",
                  flying ? "border-[#a7eb76]/40 bg-[#a7eb76]/15 text-[#d9f8c7]" : "border-white/10 bg-black/25 text-[#b8cdb9]"
                )}
              >
                <Move3d size={10} /> Terbang
              </button>
            </div>
            <button
              onClick={() => { onHudMinimal(!hudMinimal); setMenuOpen(false); }}
              className="mt-1 flex w-full items-center justify-center gap-1 rounded-md border border-white/10 bg-black/25 py-1.5 text-[8.5px] font-semibold text-[#b8cdb9] hover:text-white"
            >
              <Eye size={10} /> Mode Sinematik
            </button>
          </div>
        )}
      </div>

      {/* ---------- toasts ---------- */}
      <div className="pointer-events-none absolute left-1/2 top-[68px] flex w-[260px] -translate-x-1/2 flex-col items-center gap-1 sm:top-16 sm:w-[320px]">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "animate-toast flex w-full items-center gap-2 rounded-lg border px-2 py-1 backdrop-blur-md",
              toast.tone === "warn"
                ? "border-[#ffb26b]/35 bg-[#2a1a0e]/88 text-[#ffd9a8]"
                : toast.tone === "success"
                  ? "border-[#a7eb76]/35 bg-[#122415]/92 text-[#dcf8c8]"
                  : "border-white/15 bg-[#07130e]/92 text-[#dcebdc]"
            )}
          >
            <Sparkles size={11} className="shrink-0" />
            <p className="text-[9px] font-semibold leading-tight">{toast.text}</p>
          </div>
        ))}
      </div>

      {/* ---------- crosshair ---------- */}
      {!hudMinimal && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="relative h-5 w-5 opacity-90">
            <span className="absolute left-1/2 top-0 h-1.5 w-px -translate-x-1/2 bg-white/85 shadow-[0_0_3px_rgba(0,0,0,.9)]" />
            <span className="absolute bottom-0 left-1/2 h-1.5 w-px -translate-x-1/2 bg-white/85 shadow-[0_0_3px_rgba(0,0,0,.9)]" />
            <span className="absolute left-0 top-1/2 h-px w-1.5 -translate-y-1/2 bg-white/85 shadow-[0_0_3px_rgba(0,0,0,.9)]" />
            <span className="absolute right-0 top-1/2 h-px w-1.5 -translate-y-1/2 bg-white/85 shadow-[0_0_3px_rgba(0,0,0,.9)]" />
            <span className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_4px_rgba(0,0,0,.9)]" />
          </div>
          {stats.target && (
            <div className="absolute left-1/2 top-6 flex -translate-x-1/2 flex-col items-center">
              <div className="flex items-center gap-1.5 rounded-md border border-white/20 bg-black/60 px-2 py-0.5 whitespace-nowrap backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-[#a7eb76]" />
                <span className="text-[8.5px] font-semibold text-white">{stats.target.name}</span>
                <span className="font-pixel text-[6.5px] text-[#9fb4a0]">{stats.target.distance}m</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---------- desktop coordinates ---------- */}
      {!isMobile && !hudMinimal && (
        <div className="absolute bottom-3 left-4 hidden flex-col gap-1 rounded-lg border border-white/10 bg-[#06110c]/60 px-2.5 py-1.5 backdrop-blur-md lg:flex">
          <div className="flex items-center gap-2 font-pixel text-[7.5px] text-[#e6f3e0]">
            <span className="text-[#ff9a8a]">X</span>{stats.x.toFixed(1)}
            <span className="text-[#a7eb76]">Y</span>{stats.y.toFixed(1)}
            <span className="text-[#9ec9ff]">Z</span>{stats.z.toFixed(1)}
            <span className="ml-1 rounded bg-black/35 px-1 text-[6px] text-[#a7eb76]">{settings.creative ? "KREATIF" : "SURVIVAL"}</span>
          </div>
          <div className="flex items-center gap-2 text-[7px] text-[#8ea595]">
            <span>{stats.biome}</span>
            <span className="text-white/20">·</span>
            <span className={cn(stats.fps > 45 ? "text-[#a7eb76]" : stats.fps > 28 ? "text-[#eccb83]" : "text-[#ff9a8a]")}>{stats.fps} FPS</span>
            <span className="text-white/20">·</span>
            <kbd className="font-pixel text-[6px] text-white/60">C</kbd> kamera
            <kbd className="font-pixel text-[6px] text-white/60">V</kbd> sudut
          </div>
        </div>
      )}

      {/* ---------- mobile controls ---------- */}
      {isMobile && !hudMinimal && (
        <>
          <div className="absolute bottom-[56px] left-2 scale-[.76] origin-bottom-left sm:bottom-[78px] sm:left-3 sm:scale-100">
            <Joystick onChange={onMobileAxis} />
          </div>
          <div className="absolute bottom-[58px] right-2 flex scale-[.88] origin-bottom-right flex-col items-end gap-1.5 sm:bottom-[78px] sm:right-3 sm:scale-100 sm:gap-2">
            <div className="flex items-end gap-2">
              <TouchButton label="Pasang" onPress={() => onMobileAction("place")} variant="amber" size={46}>
                <Box size={18} />
              </TouchButton>
              <TouchButton
                label="Tambang"
                variant="lime"
                size={56}
                onPress={() => {
                  onMobileAction("mine");
                  if (mineTimer.current) window.clearInterval(mineTimer.current);
                  mineTimer.current = window.setInterval(() => onMobileAction("mine"), 260);
                }}
                onRelease={() => {
                  if (mineTimer.current) window.clearInterval(mineTimer.current);
                  mineTimer.current = null;
                }}
              >
                <Pickaxe size={23} />
              </TouchButton>
            </div>
            <div className="flex items-end gap-2">
              <TouchButton label={flying ? "Turun" : "Terbang"} active={flying} onPress={() => onAction("fly")} size={40}>
                <Move3d size={15} />
              </TouchButton>
              <TouchButton label="Sudut" onPress={() => onAction("view")} size={40}>
                <Eye size={15} />
              </TouchButton>
              <TouchButton label="Lompat" variant="dark" size={48} onPress={() => onMobileAction("jump")}>
                <ArrowUp size={19} />
              </TouchButton>
            </div>
          </div>
        </>
      )}

      {/* ---------- hotbar ---------- */}
      <div className={cn("absolute left-1/2 -translate-x-1/2", isMobile ? "bottom-1.5" : "bottom-2.5", hudMinimal && "hidden")}>
        <div className="mb-1 flex items-center justify-center gap-2">
          <span className="rounded border border-white/10 bg-black/45 px-2 py-0.5 text-[8.5px] font-semibold text-[#e7f2e2] backdrop-blur">
            {selectedDef.name}
            <span className="ml-1.5 font-pixel text-[6.5px] text-[#8fa699]">{settings.creative ? "∞" : `${count}`}</span>
          </span>
          {stats.target && <span className="hidden font-pixel text-[6.5px] text-[#eccb83] sm:inline">HARDNESS {stats.target.hardness}</span>}
        </div>
        <div className="pointer-events-auto flex items-end gap-[3px] rounded-xl border border-white/10 bg-[#050f0a]/75 p-1 shadow-[0_16px_36px_rgba(0,0,0,.45)] backdrop-blur-md">
          {HOTBAR.map((id, i) => {
            const isActive = id === selected;
            return (
              <button
                key={id}
                onClick={() => onSelect(id)}
                className={cn("slot", isMobile ? (isNarrow ? "h-[32px] w-[32px]" : "h-[38px] w-[38px]") : "h-[48px] w-[48px]", isActive && "slot-active")}
                title={BLOCKS[id].name}
              >
                <BlockIcon id={id} size={isMobile ? (isNarrow ? 23 : 27) : 33} />
                {!isNarrow && <span className="absolute left-0.5 top-0 font-pixel text-[5.5px] text-white/40">{SHORTCUT_LABELS[i]}</span>}
                {!settings.creative && <span className="absolute bottom-0 right-0.5 font-pixel text-[6px] text-white/90">{inventory[id] ?? 0}</span>}
                {isActive && <span className="absolute -top-1 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-[#f0d79a] shadow-[0_0_8px_#f0d79a]" />}
              </button>
            );
          })}
          <button
            onClick={() => onAction("inventory")}
            className={cn("slot ml-0.5", isMobile ? (isNarrow ? "h-[32px] w-[26px]" : "h-[38px] w-[30px]") : "h-[48px] w-[34px]")}
            title="Semua blok"
          >
            <Plus size={isMobile ? 13 : 16} className="text-[#cfe3cc]" />
          </button>
        </div>
        {!isMobile && (
          <div className="mt-1 flex items-center justify-center gap-3 text-[7px] text-[#8fa699] hud-text">
            <span><kbd className="font-pixel text-[6px] text-white/70">WASD</kbd> gerak</span>
            <span><kbd className="font-pixel text-[6px] text-white/70">SPACE</kbd> lompat</span>
            <span><kbd className="font-pixel text-[6px] text-white/70">E</kbd> blok</span>
            <span><kbd className="font-pixel text-[6px] text-white/70">T</kbd> bicara NPC</span>
            <span><kbd className="font-pixel text-[6px] text-white/70">M</kbd> peta</span>
            <span><kbd className="font-pixel text-[6px] text-white/70">ESC</kbd> menu</span>
          </div>
        )}
      </div>
    </div>
  );
}
