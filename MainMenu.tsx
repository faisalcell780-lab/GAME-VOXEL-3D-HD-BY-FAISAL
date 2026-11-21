import { useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Boxes,
  Check,
  ChevronRight,
  Compass,
  Copy,
  Expand,
  Globe,
  Layers,
  Map as MapIcon,
  Maximize2,
  MousePointer2,
  Play,
  Plus,
  RefreshCw,
  Settings,
  Shield,
  Snowflake,
  Sparkles,
  Sun,
  TreePine,
  Users,
  Volume2,
  VolumeX,
  Waves,
  Wind,
  Zap,
} from "lucide-react";
import type { GameStats, MapData, SaveData } from "../game/engine";
import type { Panel } from "../types";
import { WorldCanvas } from "./WorldCanvas";
import { BlockIcon } from "./ui";
import { avatarDataUrl } from "../game/textures";
import { ID } from "../game/world";
import { cn } from "../utils/cn";

const REALMS = [
  {
    id: "emerald",
    name: "Lembah Zamrud",
    seed: 20260117,
    biome: "Hutan & Danau",
    desc: "Valley hijau dengan danau bercermin, pondok kayu, dan perbukitan berkabut tipis.",
    theme: "emerald",
    Icon: TreePine,
    tag: "Realm Utama",
    difficulty: "Santai",
    accent: "#a7eb76",
  },
  {
    id: "frost",
    name: "Puncak Frost",
    seed: 8821307,
    biome: "Pegunungan Salju",
    desc: "Puncak beku dengan cahaya utara, hutan pinus raksasa dan tebing es.",
    theme: "frost",
    Icon: Snowflake,
    tag: "Baru",
    difficulty: "Menantang",
    accent: "#a9d8ff",
  },
  {
    id: "terra",
    name: "Gurun Terra",
    seed: 5201903,
    biome: "Gurun & Mesa",
    desc: "Lembah terakota keemasan, batu merah dan oase tersembunyi.",
    theme: "terra",
    Icon: Sun,
    tag: "Eksplorasi",
    difficulty: "Sedang",
    accent: "#ffc98a",
  },
] as const;

function RealmArt({ theme, icon: Icon }: { theme: "emerald" | "frost" | "terra"; icon: typeof TreePine }) {
  const palettes = {
    emerald: {
      sky: "from-[#0f2b27] via-[#28594a] to-[#7fae74]",
      sun: "#eaf7b0",
      far: "#2e5b4a",
      near: "#193a2c",
      accent: "#a7eb76",
    },
    frost: {
      sky: "from-[#0b1b31] via-[#2b4f72] to-[#a2c4dd]",
      sun: "#e3f4ff",
      far: "#385a72",
      near: "#1a3044",
      accent: "#a9d8ff",
    },
    terra: {
      sky: "from-[#2a1610] via-[#7c4027] to-[#e0a06c]",
      sun: "#ffe2a8",
      far: "#8a4a32",
      near: "#4a261b",
      accent: "#ffc98a",
    },
  }[theme];
  return (
    <div className={cn("absolute inset-0 overflow-hidden bg-gradient-to-b", palettes.sky)}>
      <div
        className="absolute right-8 top-5 h-10 w-10 rounded-full opacity-80 blur-[1px]"
        style={{ background: palettes.sun, boxShadow: `0 0 50px ${palettes.sun}` }}
      />
      <div className="absolute inset-x-0 bottom-0 h-[70%]">
        <div
          className="absolute inset-x-0 bottom-0 h-3/4"
          style={{
            background: palettes.far,
            clipPath: "polygon(0 68%, 12% 44%, 22% 56%, 38% 22%, 51% 48%, 61% 34%, 78% 60%, 90% 38%, 100% 58%, 100% 100%, 0 100%)",
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-1/2"
          style={{
            background: palettes.near,
            clipPath: "polygon(0 42%, 18% 30%, 30% 56%, 46% 34%, 60% 64%, 74% 42%, 88% 58%, 100% 40%, 100% 100%, 0 100%)",
          }}
        />
      </div>
      <div className="absolute bottom-4 left-5 flex items-end gap-1 opacity-90">
        <div className="h-6 w-6 rounded-[2px] border border-black/20 bg-white/10" />
        <div className="h-9 w-9 rounded-[2px] border border-black/20 bg-white/15" />
        <div className="h-4 w-4 rounded-[2px] border border-black/20 bg-white/10" />
      </div>
      <div
        className="absolute bottom-6 right-7 flex h-14 w-14 items-center justify-center rounded-xl border backdrop-blur-md"
        style={{ borderColor: `${palettes.accent}55`, background: `${palettes.accent}18`, color: palettes.accent }}
      >
        <Icon size={26} strokeWidth={1.7} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/20 to-transparent" />
    </div>
  );
}

function StatChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/[0.035] px-2.5 py-1.5 backdrop-blur-sm">
      <span className="text-[#a9d8a0]">{icon}</span>
      <div className="leading-none">
        <p className="font-pixel text-[9px] text-white">{value}</p>
        <p className="mt-0.5 text-[9px] text-[#93a99a]">{label}</p>
      </div>
    </div>
  );
}

export function MainMenu({
  save,
  seed,
  mapData,
  stats,
  soundOn,
  onToggleSound,
  onFullscreen,
  onStart,
  onRandomSeed,
  onOpenPanel,
}: {
  save: SaveData | null;
  seed: number;
  mapData: MapData | null;
  stats: GameStats | null;
  soundOn: boolean;
  onToggleSound: () => void;
  onFullscreen: () => void;
  onStart: (seed: number, mode: "continue" | "new") => void;
  onRandomSeed: () => void;
  onOpenPanel: (panel: Panel) => void;
}) {
  const [copied, setCopied] = useState(false);
  const avatar = useMemo(() => avatarDataUrl(3, 128), []);
  const [nav, setNav] = useState("Beranda");
  const lastPlayed = save ? new Date(save.savedAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : null;

  const copySeed = async () => {
    try {
      await navigator.clipboard.writeText(String(seed));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="pointer-events-auto absolute inset-0 z-20 flex h-full flex-col overflow-y-auto scroll-thin">
      <div className="scrim-left pointer-events-none absolute inset-0 -z-10" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(900px_500px_at_72%_36%,rgba(240,200,120,0.08),transparent_65%)]" />

      {/* top navigation */}
      <header className="relative z-10 flex shrink-0 items-center justify-between gap-4 px-5 py-4 lg:px-9 lg:py-5">
        <div className="flex items-center gap-3">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-[#b7e8a0]/25 bg-[#0c1a12]/80 shadow-[0_10px_24px_rgba(0,0,0,.45)]">
            <BlockIcon id={ID.grass} size={40} glow />
            <span className="absolute -right-1 -top-1 rounded-md border border-[#d8c084]/40 bg-[#e8c987] px-1 py-0.5 font-pixel text-[6px] text-[#241b0d]">
              v2.4
            </span>
          </div>
          <div className="leading-none">
            <div className="flex items-center gap-2">
              <h1 className="font-pixel text-[17px] tracking-[0.06em] text-[#f4faed] sm:text-[19px]">BLOCKREALM</h1>
              <span className="hidden rounded border border-[#9fdc84]/30 bg-[#7fb96a]/10 px-1.5 py-0.5 font-pixel text-[6px] uppercase tracking-wider text-[#b8eaa0] sm:inline">
                Ultra
              </span>
            </div>
            <p className="mt-1.5 hidden text-[9px] font-medium uppercase tracking-[0.24em] text-[#8fa699] sm:block">
              3D Voxel Open World Studio
            </p>
          </div>
        </div>

        <nav className="hidden items-center gap-1 rounded-xl border border-white/8 bg-[#07120d]/60 p-1 backdrop-blur-md lg:flex">
          {[
            { label: "Beranda", panel: null },
            { label: "Peta Dunia", panel: "map" },
            { label: "Panduan", panel: "help" },
            { label: "Pengaturan", panel: "settings" },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => {
                setNav(item.label);
                if (item.panel) onOpenPanel(item.panel as Panel);
              }}
              className={cn(
                "rounded-lg px-3.5 py-2 text-[11px] font-semibold transition-colors",
                nav === item.label ? "bg-[#a7eb76]/15 text-[#d7f5c2]" : "text-[#a6bbaa] hover:bg-white/5 hover:text-white"
              )}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-1.5 rounded-lg border border-emerald-300/20 bg-emerald-400/10 px-2 py-1.5 md:flex">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#9fe87a] opacity-70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#9fe87a]" />
            </span>
            <span className="font-pixel text-[8px] uppercase tracking-wider text-[#b9ef9b]">Online</span>
            <span className="text-[9px] font-semibold text-[#7f9c87]">· 1.284 builder</span>
          </div>
          <button onClick={onToggleSound} className="btn-icon h-9 w-9" aria-label="Suara">
            {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          <button onClick={onFullscreen} className="btn-icon h-9 w-9" aria-label="Layar penuh">
            <Maximize2 size={16} />
          </button>
          <button
            onClick={() => onOpenPanel("settings")}
            className="ml-1 flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.06] p-1 pr-2 transition-colors hover:border-[#a7eb76]/40 hover:bg-white/10"
          >
            <img src={avatar} alt="Avatar pemain" className="h-8 w-8 rounded-lg [image-rendering:pixelated]" />
            <div className="hidden text-left sm:block">
              <p className="text-[10px] font-bold leading-none text-white">PlayerOne</p>
              <p className="mt-1 font-pixel text-[7px] text-[#a7eb76]">LEVEL 27</p>
            </div>
            <ChevronRight size={13} className="text-[#8fa699]" />
          </button>
        </div>
      </header>

      {/* hero + side cards */}
      <main className="relative z-10 grid flex-1 grid-cols-1 gap-6 px-5 pb-3 pt-2 lg:grid-cols-12 lg:px-9 xl:gap-10">
        <section className="flex flex-col justify-center lg:col-span-7 xl:col-span-7">
          <div className="animate-rise mb-3 flex items-center gap-2 self-start rounded-full border border-[#eccb83]/30 bg-[#eccb83]/10 px-2.5 py-1.5 backdrop-blur-md">
            <Sparkles size={11} className="text-[#f1d79a]" />
            <span className="font-pixel text-[8px] uppercase tracking-[0.16em] text-[#f1d79a]">Season IV · The Emerald Update</span>
            <span className="rounded bg-[#f0d79a] px-1 py-px font-pixel text-[6px] text-[#2b2310]">BARU</span>
          </div>

          <div className="max-w-[640px]">
            <h2 className="text-[38px] font-extrabold leading-[0.98] tracking-[-0.035em] text-[#f6fbf2] sm:text-[48px] xl:text-[58px]">
              Dunia voxel,
              <br />
              <span className="bg-gradient-to-r from-[#eaf7b0] via-[#b8ed82] to-[#68cf86] bg-clip-text text-transparent">
                tanpa batas.
              </span>
            </h2>
            <p className="mt-3 max-w-[520px] text-[12.5px] leading-relaxed text-[#b9ccbd] sm:text-[13.5px]">
              Jelajahi lembah 3D seluas mata memandang. Tambang, bangun, dan ubah setiap blok dalam dunia yang
              hidup — pencahayaan dinamis, bayangan nyata, refleksi air, dan tekstur piksel 32×32.
              <span className="ml-1 font-semibold text-[#e8f4de]">Tanpa kabut, tanpa batas.</span>
            </p>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={() => onStart(save ? save.seed : seed, save ? "continue" : "new")}
              className="btn-primary group text-[13px]"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#1c3b1c]/15">
                <Play size={13} className="fill-[#173018] text-[#173018]" />
              </span>
              <span>{save ? "Lanjutkan Petualangan" : "Mulai Petualangan"}</span>
              <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
            </button>
            {save ? (
              <button onClick={() => onStart(seed, "new")} className="btn-secondary text-[12px]">
                <Layers size={14} className="text-[#a7eb76]" />
                Dunia Baru
              </button>
            ) : (
              <button onClick={() => onOpenPanel("help")} className="btn-secondary text-[12px]">
                <BookOpen size={14} className="text-[#a7eb76]" />
                Cara Bermain
              </button>
            )}
            <span className="hidden items-center gap-1.5 text-[10px] text-[#8ba093] sm:flex">
              <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-pixel text-[8px] text-white">WASD</kbd>
              untuk bergerak
            </span>
          </div>

          <div className="mt-5 grid max-w-[560px] grid-cols-2 gap-2 sm:grid-cols-4">
            <StatChip icon={<Globe size={13} />} value="OPEN WORLD" label="96 × 96 × 40" />
            <StatChip icon={<Sun size={13} />} value="REALTIME 3D" label="Pencahayaan" />
            <StatChip icon={<Waves size={13} />} value="REFLEKSI" label="Air & kaca" />
            <StatChip icon={<Boxes size={13} />} value="32 × 32" label="Tekstur piksel" />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#06110c]/65 px-2.5 py-2 backdrop-blur-md">
              <span className="font-pixel text-[7px] uppercase tracking-wider text-[#829b8b]">Seed</span>
              <span className="font-pixel text-[10px] text-[#e7f4dd]">#{seed.toString(36).toUpperCase()}</span>
              <span className="text-[9px] text-[#688273]">· Lembah Zamrud</span>
              <button onClick={copySeed} className="ml-1 text-[#8ba593] transition-colors hover:text-[#d9f5c9]" aria-label="Salin seed">
                {copied ? <Check size={12} className="text-[#a7eb76]" /> : <Copy size={12} />}
              </button>
            </div>
            <button
              onClick={onRandomSeed}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-2 text-[10px] font-semibold text-[#b9cfbd] transition-colors hover:border-[#a7eb76]/40 hover:text-white"
            >
              <RefreshCw size={12} /> Acak seed
            </button>
            <button
              onClick={() => onOpenPanel("settings")}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-2 text-[10px] font-semibold text-[#b9cfbd] transition-colors hover:border-[#a7eb76]/40 hover:text-white"
            >
              <Settings size={12} /> Opsi render
            </button>
          </div>
        </section>

        <aside className="flex flex-col justify-center gap-3 lg:col-span-5 xl:col-span-4 xl:col-start-9">
          {save ? (
            <div className="animate-rise glass overflow-hidden rounded-2xl" style={{ animationDelay: "80ms" }}>
              <div className="relative h-[142px] overflow-hidden">
                {mapData ? (
                  <WorldCanvas data={mapData} size={320} className="!h-[142px] !w-full !object-cover opacity-90" zoom={1.15} />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-[#21452f] to-[#0c1d13]" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#081410] via-[#081410]/30 to-transparent" />
                <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-md border border-[#a7eb76]/30 bg-[#07120d]/80 px-2 py-1 backdrop-blur">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#a7eb76] shadow-[0_0_8px_#a7eb76]" />
                  <span className="font-pixel text-[7px] uppercase tracking-wider text-[#c8f3b0]">Dunia Aktif</span>
                </div>
                <div className="absolute right-3 top-3 flex items-center gap-1 rounded-md border border-white/15 bg-black/45 px-1.5 py-1 font-pixel text-[7px] text-white/90 backdrop-blur">
                  <Users size={9} /> 1 / 4
                </div>
                <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                  <div>
                    <p className="font-pixel text-[12px] tracking-wide text-white">LEMBAH ZAMRUD</p>
                    <p className="mt-1 text-[9.5px] text-[#b6cdb9]">Hutan & Danau · {mapData?.waypoints.length ?? 6} waypoint</p>
                  </div>
                  <span className="rounded border border-[#eccb83]/35 bg-[#eccb83]/15 px-1.5 py-0.5 font-pixel text-[6px] uppercase tracking-wider text-[#f2dca5]">
                    Kreatif
                  </span>
                </div>
              </div>
              <div className="p-3.5">
                <div className="mb-2.5 flex items-center justify-between text-[9px]">
                  <span className="text-[#8fa699]">Terakhir dimainkan</span>
                  <span className="font-semibold text-[#dfeede]">{lastPlayed}</span>
                </div>
                <div className="mb-3 grid grid-cols-3 gap-1.5">
                  {[
                    { label: "Blok diedit", value: save.edits.length },
                    { label: "Ditambang", value: save.mined },
                    { label: "Dipasang", value: save.placed },
                  ].map((x) => (
                    <div key={x.label} className="rounded-lg border border-white/8 bg-black/20 px-2 py-1.5 text-center">
                      <p className="font-pixel text-[10px] text-[#e8f5df]">{x.value}</p>
                      <p className="mt-0.5 text-[8px] text-[#849b8b]">{x.label}</p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => onStart(save.seed, "continue")}
                  className="btn-primary w-full !py-2.5 text-[12px]"
                >
                  <Play size={12} className="fill-[#173018]" /> Lanjutkan Petualangan
                </button>
                <div className="mt-2 flex gap-1.5">
                  <button onClick={() => onOpenPanel("map")} className="btn-secondary flex-1 !px-2 !py-1.5 text-[10px]">
                    <MapIcon size={11} /> Peta
                  </button>
                  <button onClick={() => onOpenPanel("help")} className="btn-secondary flex-1 !px-2 !py-1.5 text-[10px]">
                    <BookOpen size={11} /> Panduan
                  </button>
                  <button onClick={onFullscreen} className="btn-secondary !px-2 !py-1.5" aria-label="Layar penuh">
                    <Expand size={11} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="animate-rise glass overflow-hidden rounded-2xl">
              <div className="relative h-[150px]">
                {mapData ? (
                  <WorldCanvas data={mapData} size={320} className="!h-[150px] !w-full !object-cover" zoom={1.1} />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-[#21452f] to-[#0c1d13]" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#081410] via-transparent to-transparent" />
                <div className="absolute bottom-3 left-3">
                  <p className="font-pixel text-[11px] text-white">REALM BARU</p>
                  <p className="mt-1 text-[9.5px] text-[#bdd3c0]">Pratinjau dunia seed #{seed.toString(36).toUpperCase()}</p>
                </div>
              </div>
              <div className="p-4">
                <h3 className="text-sm font-bold text-white">Sebuah lembah menunggu tanganmu</h3>
                <p className="mt-1 text-[11px] leading-relaxed text-[#9fb3a5]">
                  Tekstur, bayangan, dan refleksi sudah disiapkan. Semua yang tersisa adalah langkah pertama.
                </p>
                <button onClick={() => onStart(seed, "new")} className="btn-primary mt-3 w-full !py-2.5 text-[12px]">
                  <Plus size={13} /> Buat Dunia Ini
                </button>
              </div>
            </div>
          )}

          <div className="animate-rise glass-soft relative overflow-hidden rounded-2xl p-3.5" style={{ animationDelay: "160ms" }}>
            <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-[#eccb83]/10 blur-2xl" />
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#eccb83]/25 bg-[#eccb83]/10 text-[#f0d79a]">
                <Zap size={13} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-pixel text-[7px] uppercase tracking-[0.18em] text-[#eccb83]">Patch 2.4.0</p>
                <p className="text-[12px] font-bold text-white">The Emerald Update</p>
              </div>
              <span className="font-pixel text-[7px] text-[#8fa699]">HARI INI</span>
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[9.5px] text-[#a9bdaf]">
              <span className="flex items-center gap-1.5"><Check size={9} className="text-[#a7eb76]" /> Refleksi air real-time</span>
              <span className="flex items-center gap-1.5"><Check size={9} className="text-[#a7eb76]" /> Kamera orbit jauh</span>
              <span className="flex items-center gap-1.5"><Check size={9} className="text-[#a7eb76]" /> Bayangan 4K dinamis</span>
              <span className="flex items-center gap-1.5"><Check size={9} className="text-[#a7eb76]" /> 10 blok baru</span>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-white/8 pt-2.5">
              <span className="flex items-center gap-1.5 text-[9px] text-[#8fa699]">
                <Shield size={10} className="text-[#a7eb76]" /> Renderer stabil · {stats?.fps ?? 60} FPS
              </span>
              <button
                onClick={() => onOpenPanel("help")}
                className="group flex items-center gap-1 text-[9.5px] font-semibold text-[#d9eccd] hover:text-white"
              >
                Detail <ChevronRight size={11} className="transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        </aside>
      </main>

      {/* realm strip */}
      <footer className="relative z-10 shrink-0 px-5 pb-3 lg:px-9">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass size={12} className="text-[#eccb83]" />
            <h3 className="font-pixel text-[8px] uppercase tracking-[0.2em] text-[#c9d9c9]">Pilih Realm</h3>
            <span className="text-[9px] text-[#6f8678]">· dunia tersimpan terpisah</span>
          </div>
          <button
            onClick={() => onStart(seed, "new")}
            className="flex items-center gap-1 text-[9px] font-semibold text-[#a6baaa] transition-colors hover:text-[#d7f5c2]"
          >
            Lihat semua realm <ArrowRight size={10} />
          </button>
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {REALMS.map((realm, i) => (
            <button
              key={realm.id}
              onClick={() => onStart(realm.seed, "new")}
              className="group animate-rise relative h-[104px] overflow-hidden rounded-xl border border-white/10 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-white/25 hover:shadow-[0_18px_36px_rgba(0,0,0,.4)]"
              style={{ animationDelay: `${180 + i * 60}ms` }}
            >
              <RealmArt theme={realm.theme} icon={realm.Icon} />
              <div className="relative flex h-full flex-col justify-between p-3">
                <div className="flex items-start justify-between">
                  <span
                    className="rounded border px-1.5 py-0.5 font-pixel text-[6px] uppercase tracking-wider backdrop-blur-sm"
                    style={{ borderColor: `${realm.accent}45`, background: `${realm.accent}18`, color: realm.accent }}
                  >
                    {realm.tag}
                  </span>
                  <span className="rounded border border-white/15 bg-black/30 px-1.5 py-0.5 text-[7.5px] font-semibold text-white/80 backdrop-blur">
                    {realm.difficulty}
                  </span>
                </div>
                <div className="flex items-end justify-between gap-2">
                  <div className="max-w-[190px]">
                    <p className="text-[13px] font-extrabold leading-none text-white">{realm.name}</p>
                    <p className="mt-1 text-[9px] text-white/65">{realm.biome}</p>
                  </div>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/25 bg-black/35 text-white backdrop-blur transition-colors group-hover:border-white/60 group-hover:bg-white/20">
                    <Play size={11} className="fill-white" />
                  </span>
                </div>
              </div>
              {realm.id === "emerald" && save && (
                <span className="absolute right-2 top-2 hidden rounded bg-black/50 px-1.5 py-0.5 font-pixel text-[6px] text-[#d9f5c7] backdrop-blur">
                  TERSIMPAN
                </span>
              )}
            </button>
          ))}
        </div>
      </footer>

      <div className="relative z-10 flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-white/8 bg-[#040b07]/55 px-5 py-2 text-[9px] text-[#728a7c] backdrop-blur-md lg:px-9">
        <div className="flex items-center gap-3">
          <span className="font-pixel text-[7px] tracking-wider text-[#9ab29f]">BLOCKREALM v2.4.0</span>
          <span className="hidden sm:inline">React · Vite · Three.js</span>
          <span className="hidden items-center gap-1 sm:flex"><span className="h-1 w-1 rounded-full bg-[#a7eb76]" /> Semua sistem normal</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-1 md:flex"><MousePointer2 size={9} /> Seret untuk orbit kamera</span>
          <span className="hidden items-center gap-1 md:flex"><Wind size={9} /> Tanpa fog</span>
          <button onClick={() => onOpenPanel("help")} className="font-semibold text-[#a6bdab] hover:text-white">Bantuan & kontrol</button>
          <span className="text-[#42564a]">© 2026 Blockrealm Studio</span>
        </div>
      </div>
    </div>
  );
}
