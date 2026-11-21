import { useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Box,
  Boxes,
  Camera,
  Check,
  ChevronRight,
  Clock,
  CloudSun,
  Compass,
  Copy,
  Crosshair,
  Download,
  Droplets,
  Eye,
  Flag,
  Gamepad2,
  Gauge,
  Grid3X3,
  Hammer,
  Home,
  Info,
  Keyboard,
  Layers,
  Lock,
  LogOut,
  Map as MapIcon,
  MapPin,
  Maximize2,
  Monitor,
  Moon,
  Mountain,
  Mouse,
  Move3d,
  Navigation,
  Package,
  Pause,
  Pickaxe,
  Play,
  RotateCcw,
  Save,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Volume2,
  Users,
  Waves,
  Wind,
  X,
  Zap,
} from "lucide-react";
import {
  DEFAULT_SETTINGS,
  type GameSettings,
  type GameStats,
  type MapData,
} from "../game/engine";
import { RECIPES } from "../game/recipes";
import { BUILDABLE_BLOCKS, ID, blockDef } from "../game/world";
import type { Panel } from "../types";
import { BlockIcon, ModalShell, ProgressBar, SectionLabel, Segmented, Slider, Toggle } from "./ui";
import { WorldCanvas } from "./WorldCanvas";
import { cn } from "../utils/cn";

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------
type SettingsTab = "graphics" | "world" | "controls" | "audio";

export function SettingsPanel({
  settings,
  onChange,
  onClose,
  initialTab = "graphics",
}: {
  settings: GameSettings;
  onChange: (patch: Partial<GameSettings>) => void;
  onClose: () => void;
  initialTab?: SettingsTab;
}) {
  const [tab, setTab] = useState<SettingsTab>(initialTab);
  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: "graphics", label: "Grafis & Efek", icon: <Monitor size={13} /> },
    { id: "world", label: "Dunia & Waktu", icon: <Sun size={13} /> },
    { id: "controls", label: "Kamera & Kontrol", icon: <Gamepad2 size={13} /> },
    { id: "audio", label: "Suara", icon: <Volume2 size={13} /> },
  ];
  const quality = settings.shadows ? (settings.shadowQuality === "high" ? "Ultra" : settings.shadowQuality === "medium" ? "Tinggi" : "Hemat") : "Nonaktif";

  const presets = [
    {
      id: "ultra",
      label: "Ultra Visual",
      hint: "Bayangan 4K, bloom, refleksi penuh",
      active: settings.shadows && settings.shadowQuality === "high" && settings.bloom && settings.reflections && settings.ambientOcclusion,
      patch: { shadows: true, shadowQuality: "high", bloom: true, reflections: true, effects: true, clouds: true, resolution: 1.25, ambientOcclusion: true, antiAliasing: true } as Partial<GameSettings>,
    },
    {
      id: "balance",
      label: "Seimbang",
      hint: "Kualitas tinggi, lebih ringan",
      active: settings.shadows && settings.shadowQuality === "medium" && !settings.bloom,
      patch: { shadows: true, shadowQuality: "medium", bloom: false, reflections: true, effects: true, clouds: true, resolution: 0.9, ambientOcclusion: false, antiAliasing: true } as Partial<GameSettings>,
    },
    {
      id: "perform",
      label: "Performa",
      hint: "Untuk perangkat hemat daya",
      active: !settings.shadows && !settings.bloom,
      patch: { shadows: false, shadowQuality: "low", bloom: false, reflections: false, effects: false, clouds: true, resolution: 0.75, ambientOcclusion: false, antiAliasing: false } as Partial<GameSettings>,
    },
  ];
  return (
    <ModalShell
      title="Pengaturan"
      eyebrow="Konfigurasi Render"
      subtitle="Semua perubahan diterapkan langsung ke dunia 3D."
      icon={<SlidersHorizontal size={18} />}
      onClose={onClose}
      width="max-w-4xl"
      footer={
        <div className="flex items-center justify-between gap-3">
          <button onClick={() => onChange({ ...DEFAULT_SETTINGS })} className="btn-secondary !px-3 !py-1.5 text-[10px]">
            <RotateCcw size={11} /> Kembalikan default
          </button>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1 text-[9px] text-[#7f9788] sm:flex">
              <ShieldCheck size={10} className="text-[#a7eb76]" /> Tersimpan otomatis
            </span>
            <button onClick={onClose} className="btn-primary !px-4 !py-2 text-[11px]">Selesai</button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4 sm:flex-row">
        <aside className="flex w-full shrink-0 gap-1 overflow-x-auto sm:w-44 sm:flex-col sm:overflow-visible scroll-thin">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-[11px] font-semibold transition-colors",
                tab === t.id
                  ? "border-[#a7eb76]/30 bg-[#a7eb76]/12 text-[#def8cd]"
                  : "border-transparent text-[#9db3a4] hover:bg-white/5 hover:text-white"
              )}
            >
              <span className={tab === t.id ? "text-[#a7eb76]" : "text-[#7e9787]"}>{t.icon}</span>
              {t.label}
            </button>
          ))}
          <div className="mt-2 rounded-xl border border-white/10 bg-black/25 p-2.5">
            <p className="font-pixel text-[7px] uppercase tracking-[0.16em] text-[#8fa699]">Status Render</p>
            <p className="mt-1 text-[15px] font-extrabold leading-none text-white">{quality}</p>
            <div className="mt-2 space-y-1 text-[8.5px] text-[#93a99a]">
              <p className="flex items-center justify-between"><span>Bayangan</span><span className="text-[#dcebdc]">{settings.shadows ? `${settings.shadowQuality}` : "off"}</span></p>
              <p className="flex items-center justify-between"><span>Bloom</span><span className="text-[#dcebdc]">{settings.bloom ? "on" : "off"}</span></p>
              <p className="flex items-center justify-between"><span>Refleksi</span><span className="text-[#dcebdc]">{settings.reflections ? "on" : "off"}</span></p>
              <p className="flex items-center justify-between"><span>Resolusi</span><span className="text-[#dcebdc]">{Math.round(settings.resolution * 100)}%</span></p>
            </div>
          </div>
          <div className="mt-auto hidden rounded-xl border border-[#eccb83]/20 bg-[#eccb83]/8 p-2.5 sm:block">
            <p className="flex items-center gap-1 font-pixel text-[7px] uppercase tracking-wider text-[#eccb83]"><Sparkles size={9} /> Tips</p>
            <p className="mt-1 text-[9px] leading-relaxed text-[#a9bfae]">Aktifkan bayangan tinggi dan refleksi untuk tampilan ultra. Turunkan resolusi jika FPS di bawah 40.</p>
          </div>
        </aside>

        <div className="min-w-0 flex-1 rounded-xl border border-white/8 bg-black/15 px-4 py-2">
          {tab === "graphics" && (
            <div>
              <SectionLabel right={<span className="font-pixel text-[7px] text-[#a7eb76]">PRESET</span>}>Kualitas Visual</SectionLabel>
              <div className="mb-2 grid grid-cols-3 gap-1.5">
                {presets.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => onChange(p.patch)}
                    className={cn(
                      "rounded-lg border px-2 py-2 text-left transition-colors",
                      p.active
                        ? "border-[#a7eb76]/45 bg-[#a7eb76]/12"
                        : "border-white/8 bg-white/[0.03] hover:border-[#a7eb76]/30 hover:bg-white/[0.06]"
                    )}
                  >
                    <p className={cn("flex items-center gap-1 text-[10px] font-bold", p.active ? "text-[#d9f6c8]" : "text-[#dcebdc]")}>
                      {p.active ? <Check size={10} className="text-[#a7eb76]" /> : <Sparkles size={10} className="text-[#8fa699]" />} {p.label}
                    </p>
                    <p className="mt-0.5 text-[8px] leading-tight text-[#8fa699]">{p.hint}</p>
                  </button>
                ))}
              </div>
              <SectionLabel right={<span className="font-pixel text-[7px] text-[#a7eb76]">REALTIME</span>}>Pencahayaan & Bayangan</SectionLabel>
              <Toggle label="Tangan & blok di tangan" description="Tampilkan lengan dan blok yang sedang dipegang. Matikan untuk layar benar-benar bersih." checked={settings.showHand} onChange={(showHand) => onChange({ showHand })} />
              <Toggle label="Kamera orang pertama" description="Melihat langsung dari mata karakter dengan tangan & blok di tangan." checked={settings.firstPerson} onChange={(firstPerson) => onChange({ firstPerson })} />
              <Slider
                label="Intensitas efek Ultra"
                value={settings.effectStrength}
                min={1}
                max={2.2}
                step={0.05}
                onChange={(effectStrength) => onChange({ effectStrength })}
                format={(v) => `${v.toFixed(2)}×`}
                hint="Memperkuat bloom, god rays, refleksi, vignette & grain sekaligus"
              />
              <div className="mb-1 flex gap-1">
                {[
                  { label: "Standar", v: 1.15 },
                  { label: "Tinggi", v: 1.45 },
                  { label: "ULTRA MAX", v: 2.1 },
                ].map((p) => (
                  <button
                    key={p.label}
                    onClick={() => onChange({ effectStrength: p.v })}
                    className={cn(
                      "flex-1 rounded-md border py-1.5 text-[9px] font-bold transition-colors",
                      Math.abs(settings.effectStrength - p.v) < 0.03
                        ? "border-[#a7eb76]/50 bg-[#a7eb76]/15 text-[#dcf8c8]"
                        : "border-white/10 bg-white/[0.03] text-[#9db3a4] hover:text-white"
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <Toggle label="Auto-quality 60 FPS" description="Menyesuaikan bayangan, AO, AA, dan resolusi secara otomatis agar tetap 60 FPS." checked={settings.autoQuality} onChange={(autoQuality) => onChange({ autoQuality })} />
              <Toggle label="Bayangan dinamis" description="Bayangan matahari, pohon, karakter dan blok secara real-time." checked={settings.shadows} onChange={(shadows) => onChange({ shadows })} />
              <Segmented
                label="Kualitas bayangan"
                value={settings.shadowQuality}
                onChange={(shadowQuality) => onChange({ shadowQuality })}
                options={[
                  { value: "low", label: "Hemat" },
                  { value: "medium", label: "Tinggi" },
                  { value: "high", label: "Ultra 4K" },
                ]}
              />
              <div className="my-2 h-px bg-white/8" />
              <Toggle label="Bloom sinematik" description="Cahaya lentera, matahari dan glowstone memancar lembut." checked={settings.bloom} onChange={(bloom) => onChange({ bloom })} />
              <Toggle label="Ambient occlusion (GTAO)" description="Kontak bayangan halus di sudut blok, rumput dan dedaunan." checked={settings.ambientOcclusion} onChange={(ambientOcclusion) => onChange({ ambientOcclusion })} />
              <Toggle label="Anti-aliasing SMAA" description="Tepi geometri dan garis blok terlihat lebih bersih dan tajam." checked={settings.antiAliasing} onChange={(antiAliasing) => onChange({ antiAliasing })} />
              <Toggle label="Depth of field" description="Latar belakang lembut saat Mode Foto untuk hasil sinematik." checked={settings.depthOfField} onChange={(depthOfField) => onChange({ depthOfField })} />
              <Toggle label="Refleksi air & kaca" description="Lingkungan langit dipantulkan pada permukaan air dan kaca." checked={settings.reflections} onChange={(reflections) => onChange({ reflections })} />
              <Toggle label="Partikel & kunang-kunang" description="Efek debu, serpihan blok, kunang-kunang malam dan kilau air." checked={settings.effects} onChange={(effects) => onChange({ effects })} />
              <Toggle label="Awan melayang" description="Awan voxel yang bergerak di langit terbuka." checked={settings.clouds} onChange={(clouds) => onChange({ clouds })} />
              <div className="my-2 h-px bg-white/8" />
              <SectionLabel>Lensa & Resolusi</SectionLabel>
              <Slider label="Field of view" value={settings.fov} min={48} max={92} onChange={(fov) => onChange({ fov })} format={(v) => `${v}°`} hint="Sudut pandang kamera" />
              <Slider label="Skala render (HD / 4K)" value={settings.resolution} min={0.65} max={2} step={0.05} onChange={(resolution) => onChange({ resolution })} format={(v) => `${Math.round(v * 100)}%`} hint="100% HD · 150% QHD+ · 200% supersampling 4K" />
              <div className="-mt-1 pb-2 grid grid-cols-3 gap-1.5">
                {[
                  { label: "HD 100%", v: 1 },
                  { label: "QHD 150%", v: 1.5 },
                  { label: "4K 200%", v: 2 },
                ].map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => onChange({ resolution: opt.v })}
                    className={cn(
                      "rounded-md border py-1.5 text-[9px] font-bold transition-colors",
                      Math.abs(settings.resolution - opt.v) < 0.03
                        ? "border-[#a7eb76]/50 bg-[#a7eb76]/15 text-[#dcf8c8]"
                        : "border-white/10 bg-white/[0.03] text-[#9db3a4] hover:text-white"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {tab === "world" && (
            <div>
              <SectionLabel right={<span className="font-pixel text-[7px] text-[#8fa699]">OPEN WORLD</span>}>Siklus Waktu</SectionLabel>
              <Slider label="Jam dunia" value={settings.time} min={0} max={23.9} step={0.1} onChange={(time) => onChange({ time })} format={(v) => `${String(Math.floor(v)).padStart(2, "0")}:${String(Math.floor((v % 1) * 60)).padStart(2, "0")}`} hint="Atur matahari dan kualitas cahaya" />
              <div className="grid grid-cols-4 gap-1.5 pb-2">
                {[
                  { label: "Fajar", time: 6.2, icon: <Sun size={11} /> },
                  { label: "Siang", time: 12.2, icon: <Sun size={11} /> },
                  { label: "Senja", time: 18.1, icon: <CloudSun size={11} /> },
                  { label: "Malam", time: 22.4, icon: <Moon size={11} /> },
                ].map((p) => (
                  <button
                    key={p.label}
                    onClick={() => onChange({ time: p.time })}
                    className="flex items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] py-1.5 text-[9.5px] font-semibold text-[#c6d9c8] transition-colors hover:border-[#a7eb76]/40 hover:text-white"
                  >
                    {p.icon} {p.label}
                  </button>
                ))}
              </div>
              <Toggle label="Waktu berjalan otomatis" description="Matahari, bulan, dan bintang bergerak mengelilingi dunia." checked={settings.dayCycle} onChange={(dayCycle) => onChange({ dayCycle })} />
              <Segmented
                label="Cuaca"
                value={settings.weather}
                onChange={(weather) => onChange({ weather })}
                options={[
                  { value: "clear", label: "Cerah" },
                  { value: "rain", label: "Hujan" },
                  { value: "storm", label: "Badai" },
                ]}
              />
              <p className="-mt-1 pb-2 text-[9.5px] leading-relaxed text-[#8fa699]">
                Hujan membuat permukaan basah dan reflektif. Badai menambahkan kilat, guntur, dan angin kencang.
              </p>
              <div className="my-2 h-px bg-white/8" />
              <SectionLabel>Mode Permainan</SectionLabel>
              <Toggle label="Mode kreatif" description="Stok blok tak terbatas. Matikan untuk mode survival dengan stok terbatas." checked={settings.creative} onChange={(creative) => onChange({ creative })} />
              <div className="mt-2 rounded-xl border border-[#a7eb76]/20 bg-[#a7eb76]/8 p-3">
                <p className="flex items-center gap-1.5 text-[10px] font-bold text-[#d9f6c8]"><Sparkles size={11} /> Dunia terbuka tanpa kabut</p>
                <p className="mt-1 text-[9.5px] leading-relaxed text-[#9fb6a3]">
                  Cakrawala tetap jernih hingga radius pandang maksimum. Gunakan kamera jauh untuk menikmati lembah, danau, dan pegunungan sekaligus.
                </p>
              </div>
            </div>
          )}
          {tab === "controls" && (
            <div>
              <SectionLabel right={<span className="font-pixel text-[7px] text-[#8fa699]">MOUSE + KEYBOARD</span>}>Kamera</SectionLabel>
              <Slider label="Jarak kamera" value={settings.cameraDistance} min={6} max={40} step={1} onChange={(cameraDistance) => onChange({ cameraDistance })} format={(v) => `${v} blok`} hint="Kamera orang ketiga (bisa juga scroll)" />
              <Slider label="Sensitivitas kamera" value={settings.mouseSensitivity} min={1} max={50} step={1} onChange={(mouseSensitivity) => onChange({ mouseSensitivity })} format={(v) => `${Math.round(v)} / 50`} hint="Geser ke kanan untuk kamera makin licin (hingga 50)" />
              <div className="-mt-1 grid grid-cols-4 gap-1.5 pb-2">
                {[8, 18, 32, 50].map((v) => (
                  <button
                    key={v}
                    onClick={() => onChange({ mouseSensitivity: v })}
                    className={cn(
                      "rounded-md border py-1.5 text-[9px] font-bold transition-colors",
                      Math.round(settings.mouseSensitivity) === v
                        ? "border-[#a7eb76]/50 bg-[#a7eb76]/15 text-[#dcf8c8]"
                        : "border-white/10 bg-white/[0.03] text-[#9db3a4] hover:text-white"
                    )}
                  >
                    {v === 50 ? "50 LICIN" : v}
                  </button>
                ))}
              </div>
              <Toggle label="HUD ringkas" description="Sembunyikan panel misi dan minimap besar untuk layar kecil." checked={settings.hudCompact} onChange={(hudCompact) => onChange({ hudCompact })} />
              <Toggle label="Balikkan sumbu Y" description="Untuk pemain yang terbiasa kontrol kamera terbalik." checked={settings.invertLookY} onChange={(invertLookY) => onChange({ invertLookY })} />
              <div className="my-2 h-px bg-white/8" />
              <SectionLabel>Peta Kontrol</SectionLabel>
              <div className="grid grid-cols-2 gap-1.5 pb-2">
                {[
                  ["WASD", "Bergerak"],
                  ["Space", "Lompat / naik"],
                  ["Shift", "Lari / turun"],
                  ["Seret kiri", "Orbit kamera"],
                  ["Scroll", "Zoom kamera"],
                  ["Klik kiri", "Tambang blok"],
                  ["Klik kanan", "Pasang blok"],
                  ["E", "Inventori"],
                  ["B", "Semua blok"],
                  ["M", "Peta dunia"],
                  ["F", "Terbang"],
                  ["V", "Orang 1/3"],
                  ["C", "Jarak kamera"],
                  ["P", "Mode foto"],
                  ["R", "Respawn"],
                  ["Esc", "Jeda"],
                ].map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between rounded-lg border border-white/8 bg-white/[0.025] px-2 py-1.5">
                    <span className="text-[9.5px] text-[#a9bdae]">{label}</span>
                    <kbd className="rounded border border-white/15 bg-black/35 px-1.5 py-0.5 font-pixel text-[7px] text-[#e2f0df]">{key}</kbd>
                  </div>
                ))}
              </div>
            </div>
          )}
          {tab === "audio" && (
            <div>
              <SectionLabel right={<span className="font-pixel text-[7px] text-[#a7eb76]">PROSEDURAL</span>}>Audio Dunia</SectionLabel>
              <Toggle label="Suara & ambience" description="Angin lembut, burung, langkah kaki, tambang dan pasang blok — disintesis langsung di browser." checked={settings.sound} onChange={(sound) => onChange({ sound })} />
              <div className="my-3 grid grid-cols-3 gap-2">
                {[
                  { label: "Angin", value: "Lo-fi", icon: <Wind size={14} /> },
                  { label: "Burung", value: "Organik", icon: <Sun size={14} /> },
                  { label: "Interaksi", value: "Piksel", icon: <Hammer size={14} /> },
                ].map((x) => (
                  <div key={x.label} className="rounded-xl border border-white/8 bg-white/[0.03] p-2.5 text-center">
                    <span className="mx-auto flex h-7 w-7 items-center justify-center rounded-lg border border-[#a7eb76]/20 bg-[#a7eb76]/10 text-[#a7eb76]">{x.icon}</span>
                    <p className="mt-1.5 text-[10px] font-semibold text-white">{x.label}</p>
                    <p className="text-[8px] text-[#829b8b]">{x.value}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-white/8 bg-black/20 p-3 text-[9.5px] leading-relaxed text-[#93a99a]">
                <p className="mb-1 flex items-center gap-1 font-semibold text-[#dcebdc]"><Info size={10} /> Tentang audio</p>
                Semua suara dihasilkan dengan WebAudio: tidak ada file audio eksternal. Volume mengikuti pengaturan perangkatmu.
              </div>
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  );
}

// ---------------------------------------------------------------------------
// Pause
// ---------------------------------------------------------------------------
export function PauseMenu({
  stats,
  mapData,
  settings,
  onResume,
  onOpen,
  onSave,
  onScreenshot,
  onExit,
}: {
  stats: GameStats;
  mapData: MapData | null;
  settings: GameSettings;
  onResume: () => void;
  onOpen: (panel: Panel) => void;
  onSave: () => void;
  onScreenshot: () => void;
  onExit: () => void;
}) {
  return (
    <ModalShell
      title="Permainan Dijeda"
      eyebrow="Blockrealm · Lembah Zamrud"
      subtitle={`Seed ${stats.seedLabel} · ${stats.biome} · Hari ${stats.day}`}
      icon={<Pause size={18} />}
      onClose={onResume}
      width="max-w-3xl"
      footer={
        <div className="flex items-center justify-between text-[9px] text-[#80998a]">
          <span className="flex items-center gap-1"><ShieldCheck size={10} className="text-[#a7eb76]" /> Progres tersimpan otomatis</span>
          <span className="font-pixel text-[7px]">v2.4.0 · RENDER {stats.fps} FPS</span>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-[1.05fr_.95fr]">
        <div className="space-y-1.5">
          <button onClick={onResume} className="btn-primary w-full !justify-start !py-3 text-[12px]">
            <Play size={14} className="fill-[#173018]" /> Lanjutkan Permainan
            <span className="ml-auto font-pixel text-[8px] text-[#2d5527]">ESC</span>
          </button>
          {[
            { label: "Pengaturan & Grafis", icon: <Settings size={14} />, panel: "settings" as Panel, hint: "Grafis, waktu, kamera" },
            { label: "Peta Dunia", icon: <MapIcon size={14} />, panel: "map" as Panel, hint: "Waypoint & navigasi" },
            { label: "Inventori & Kerajinan", icon: <Package size={14} />, panel: "inventory" as Panel, hint: "Semua blok" },
            { label: "Panduan Kontrol", icon: <BookOpen size={14} />, panel: "help" as Panel, hint: "Cara bermain" },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => onOpen(item.panel)}
              className="group flex w-full items-center gap-2.5 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 text-left transition-colors hover:border-[#a7eb76]/30 hover:bg-white/[0.06]"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-black/25 text-[#b9d3ba] group-hover:text-[#a7eb76]">{item.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-semibold text-[#e5f1e1]">{item.label}</span>
                <span className="block text-[8.5px] text-[#829b8b]">{item.hint}</span>
              </span>
              <ChevronRight size={13} className="text-[#6f8878]" />
            </button>
          ))}
          <div className="grid grid-cols-2 gap-1.5 pt-1">
            <button onClick={onScreenshot} className="btn-secondary !px-2 !py-2 text-[10px]"><Camera size={12} /> Foto</button>
            <button onClick={onSave} className="btn-secondary !px-2 !py-2 text-[10px]"><Save size={12} /> Simpan</button>
          </div>
          <button onClick={onExit} className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-red-400/20 bg-red-500/8 py-2 text-[10px] font-semibold text-[#f0b4a8] transition-colors hover:bg-red-500/15">
            <LogOut size={12} /> Simpan & Menu Utama
          </button>
        </div>

        <div className="space-y-2">
          <div className="overflow-hidden rounded-xl border border-white/10 bg-black/25">
            <div className="flex items-center justify-between border-b border-white/8 px-2.5 py-1.5">
              <span className="font-pixel text-[7px] uppercase tracking-[0.16em] text-[#c8dcc6]">Dunia Saat Ini</span>
              <span className="rounded bg-[#a7eb76]/15 px-1.5 py-0.5 font-pixel text-[6px] text-[#c9f3b2]">{settings.creative ? "KREATIF" : "SURVIVAL"}</span>
            </div>
            <WorldCanvas data={mapData} size={286} className="!h-[150px] !w-full !object-cover" frame />
            <div className="grid grid-cols-2 gap-px bg-white/8">
              {[
                { icon: <Compass size={10} />, label: "Biome", value: stats.biome },
                { icon: <Clock size={10} />, label: "Waktu", value: `${stats.timeLabel} · ${stats.phase}` },
                { icon: <Pickaxe size={10} />, label: "Ditambang", value: `${stats.mined} blok` },
                { icon: <Hammer size={10} />, label: "Dipasang", value: `${stats.placed} blok` },
                { icon: <Navigation size={10} />, label: "Jarak", value: `${stats.distance} blok` },
                { icon: <Mountain size={10} />, label: "Puncak", value: `Y ${stats.peak}` },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-1.5 bg-[#08140e] px-2 py-1.5">
                  <span className="text-[#7f9b88]">{s.icon}</span>
                  <div className="min-w-0">
                    <p className="text-[7.5px] text-[#7f9788]">{s.label}</p>
                    <p className="truncate text-[9px] font-semibold text-[#dcebdc]">{s.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-[#eccb83]/20 bg-[#eccb83]/8 p-2.5">
            <p className="flex items-center gap-1.5 text-[10px] font-bold text-[#f1dca8]"><Sparkles size={11} /> Kamera jauh aktif</p>
            <p className="mt-1 text-[9px] leading-relaxed text-[#a9bfae]">Seret mouse untuk orbit, scroll untuk zoom, dan klik kiri pada blok untuk menambang dari jarak jauh.</p>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

// ---------------------------------------------------------------------------
// Inventory & crafting
// ---------------------------------------------------------------------------
export function InventoryPanel({
  inventory,
  selected,
  creative,
  onSelect,
  onCraft,
  onClose,
  initialTab = "blocks",
}: {
  inventory: Record<number, number>;
  selected: number;
  creative: boolean;
  onSelect: (id: number) => void;
  onCraft: (id: string) => void;
  onClose: () => void;
  initialTab?: "blocks" | "craft";
}) {
  const [tab, setTab] = useState<"blocks" | "craft">(initialTab);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("Semua");
  const [chosen, setChosen] = useState(selected);
  const groups = ["Semua", "Alam", "Bangunan", "Dekorasi", "Tambang"];
  const filtered = useMemo(
    () =>
      BUILDABLE_BLOCKS.filter((b) => {
        if (b.id === ID.lava) return false;
        if (group !== "Semua" && b.group !== group) return false;
        if (query && !b.name.toLowerCase().includes(query.toLowerCase())) return false;
        return true;
      }),
    [group, query]
  );
  const detail = blockDef(chosen);

  return (
    <ModalShell
      title="Inventori & Kerajinan"
      eyebrow={`${creative ? "Mode Kreatif · Stok Tak Terbatas" : "Mode Survival"}`}
      subtitle={`${BUILDABLE_BLOCKS.length} jenis blok · pilih satu untuk dibawa di tangan`}
      icon={<Package size={18} />}
      onClose={onClose}
      width="max-w-5xl"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3 text-[9px] text-[#829b8b]">
            <span className="flex items-center gap-1"><Box size={10} /> {BUILDABLE_BLOCKS.length} jenis blok</span>
            <span className="flex items-center gap-1"><Grid3X3 size={10} /> 32×32 tekstur</span>
            <span className="hidden items-center gap-1 sm:flex"><Check size={10} className="text-[#a7eb76]" /> {creative ? "∞ stok" : "stok terbatas"}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-secondary !px-3 !py-1.5 text-[10px]">Tutup</button>
            <button onClick={() => { onSelect(chosen); onClose(); }} className="btn-primary !px-3.5 !py-1.5 text-[10px]">
              <Play size={11} /> Pakai {detail.name}
            </button>
          </div>
        </div>
      }
    >
      <div className="mb-3 flex items-center gap-2">
        <div className="flex rounded-lg border border-white/10 bg-black/30 p-1">
          {[
            { id: "blocks" as const, label: "Blok", icon: <Grid3X3 size={11} /> },
            { id: "craft" as const, label: "Kerajinan", icon: <Hammer size={11} /> },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[10px] font-semibold transition-colors",
                tab === t.id ? "bg-[#8fd36d] text-[#10210f]" : "text-[#9db3a4] hover:text-white"
              )}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
        {tab === "blocks" && (
          <>
            <div className="relative ml-auto w-44">
              <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#7f9788]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari blok…"
                className="w-full rounded-lg border border-white/10 bg-black/30 py-1.5 pl-7 pr-2 text-[10px] text-white outline-none placeholder:text-[#6f8678] focus:border-[#a7eb76]/50"
              />
            </div>
          </>
        )}
      </div>

      {tab === "blocks" ? (
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <div>
            <div className="mb-2 flex flex-wrap gap-1">
              {groups.map((g) => (
                <button
                  key={g}
                  onClick={() => setGroup(g)}
                  className={cn(
                    "rounded-md border px-2 py-1 text-[9px] font-semibold transition-colors",
                    group === g ? "border-[#a7eb76]/40 bg-[#a7eb76]/12 text-[#dcf8c8]" : "border-white/8 bg-white/[0.02] text-[#8fa699] hover:text-white"
                  )}
                >
                  {g}
                </button>
              ))}
            </div>
            <div className="scroll-thin grid max-h-[330px] grid-cols-6 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-7 lg:grid-cols-8">
              {filtered.map((b) => {
                const isChosen = chosen === b.id;
                return (
                  <button
                    key={b.id}
                    onClick={() => setChosen(b.id)}
                    onDoubleClick={() => { onSelect(b.id); onClose(); }}
                    className={cn("slot group h-[54px] w-full", isChosen && "slot-active")}
                    title={`${b.name} · ${b.group}`}
                  >
                    <BlockIcon id={b.id} size={38} />
                    {!creative && (
                      <span className="absolute bottom-0.5 right-1 font-pixel text-[7px] text-white/85">{inventory[b.id] ?? 0}</span>
                    )}
                    {selected === b.id && <span className="absolute left-1 top-1 h-1 w-1 rounded-full bg-[#a7eb76]" />}
                  </button>
                );
              })}
              {filtered.length === 0 && <p className="col-span-full py-8 text-center text-[10px] text-[#829b8b]">Tidak ada blok yang cocok.</p>}
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-black/20 p-3">
            <div className="flex flex-col items-center rounded-lg border border-white/8 bg-black/20 py-3">
              <div className="animate-floaty">
                <BlockIcon id={chosen} size={76} glow />
              </div>
              <p className="mt-1 text-[12px] font-bold text-white">{detail.name}</p>
              <p className="text-[8.5px] text-[#8fa699]">{detail.group} · ID {detail.id}</p>
            </div>
            <div className="mt-2 space-y-1 text-[9px]">
              {[
                ["Ketahanan", `${detail.hardness}`],
                ["Solid", detail.solid ? "Ya" : "Tidak"],
                ["Transparan", detail.opaque ? "Tidak" : "Ya"],
                ["Cahaya", detail.light ? `${detail.light}` : "—"],
                ["Stok", creative ? "∞" : `${inventory[chosen] ?? 0}`],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between rounded border border-white/6 bg-black/15 px-2 py-1">
                  <span className="text-[#829b8b]">{k}</span>
                  <span className="font-semibold text-[#dcebdc]">{v}</span>
                </div>
              ))}
            </div>
            <button onClick={() => { onSelect(chosen); onClose(); }} className="btn-primary mt-2 w-full !py-1.5 text-[10px]">
              <Play size={10} /> Pilih ke tangan
            </button>
          </div>
        </div>
      ) : (
        <div className="scroll-thin grid max-h-[390px] grid-cols-1 gap-2 overflow-y-auto pr-1 lg:grid-cols-2">
          {RECIPES.map((r) => {
            const canCraft = creative || r.inputs.every((i) => (inventory[i.id] ?? 0) >= i.count);
            return (
              <div key={r.id} className="rounded-xl border border-white/8 bg-white/[0.025] p-2.5">
                <div className="flex items-start gap-2.5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/25">
                    <BlockIcon id={r.output.id} size={38} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[11px] font-bold text-white">{r.name}</p>
                      <span className="shrink-0 font-pixel text-[7px] text-[#8fa699]">×{r.output.count}</span>
                    </div>
                    <p className="mt-0.5 text-[8.5px] leading-relaxed text-[#8fa699]">{r.description}</p>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 border-t border-white/8 pt-2">
                  <div className="flex items-center gap-1">
                    {r.inputs.map((input) => (
                      <span key={input.id} className="flex items-center gap-0.5 rounded border border-white/10 bg-black/20 px-1 py-0.5" title={blockDef(input.id).name}>
                        <BlockIcon id={input.id} size={16} />
                        <span className="font-pixel text-[7px] text-[#b9cfb9]">{input.count}</span>
                      </span>
                    ))}
                  </div>
                  <button
                    disabled={!canCraft}
                    onClick={() => onCraft(r.id)}
                    className={cn(
                      "flex items-center gap-1 rounded-md border px-2 py-1 text-[8.5px] font-bold transition-colors",
                      canCraft
                        ? "border-[#a7eb76]/40 bg-[#a7eb76]/15 text-[#d9f6c8] hover:bg-[#a7eb76]/25"
                        : "cursor-not-allowed border-white/8 bg-white/[0.02] text-[#62786a]"
                    )}
                  >
                    {canCraft ? <Hammer size={9} /> : <Lock size={9} />} Buat
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </ModalShell>
  );
}

// ---------------------------------------------------------------------------
// World map
// ---------------------------------------------------------------------------
const WAYPOINT_ICONS: Record<string, React.ReactNode> = {
  flag: <Flag size={12} />,
  home: <Home size={12} />,
  waves: <Waves size={12} />,
  mountain: <Mountain size={12} />,
  tower: <Layers size={12} />,
  sparkles: <Sparkles size={12} />,
};

export function MapPanel({
  mapData,
  stats,
  onTeleport,
  onClose,
}: {
  mapData: MapData | null;
  stats: GameStats;
  onTeleport: (id: string) => void;
  onClose: () => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [copied, setCopied] = useState(false);
  return (
    <ModalShell
      title="Peta Lembah Zamrud"
      eyebrow="Navigasi Dunia"
      subtitle={`Open world ${mapData?.width ?? 96} × ${mapData?.height ?? 96} blok · tanpa kabut`}
      icon={<MapIcon size={18} />}
      onClose={onClose}
      width="max-w-5xl"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2 text-[9px] text-[#829b8b]">
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-[#6ca044]" /> Rumput</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-[#3276a8]" /> Air</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-[#ddd0a0]" /> Pasir</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-[#f2f8fb]" /> Salju</span>
          </span>
          <button onClick={onClose} className="btn-primary !px-3 !py-1.5 text-[10px]">Kembali ke Dunia</button>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-[1fr_240px]">
        <div>
          <div className="relative overflow-hidden rounded-xl border border-[#a7eb76]/20 bg-[#06120c]">
            <WorldCanvas data={mapData} size={440} className="!h-[420px] !w-full" zoom={zoom} frame />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#04100a]/10 via-transparent to-[#04100a]/30" />
            <div className="absolute left-2 top-2 rounded-md border border-white/15 bg-black/50 px-2 py-1 backdrop-blur">
              <p className="font-pixel text-[7px] uppercase tracking-wider text-[#dcebdc]">{stats.biome}</p>
              <p className="mt-0.5 font-pixel text-[6px] text-[#8fa699]">X {Math.floor(stats.x)} · Z {Math.floor(stats.z)}</p>
            </div>
            <div className="absolute right-2 top-2 flex gap-1">
              {[1, 1.6, 2.2].map((z) => (
                <button
                  key={z}
                  onClick={() => setZoom(z)}
                  className={cn(
                    "rounded border px-1.5 py-1 font-pixel text-[7px] backdrop-blur transition-colors",
                    zoom === z ? "border-[#a7eb76]/50 bg-[#a7eb76]/20 text-[#e0f8d0]" : "border-white/15 bg-black/40 text-[#a9bfae] hover:text-white"
                  )}
                >
                  {z}×
                </button>
              ))}
            </div>
            <div className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-md border border-white/15 bg-black/55 px-2 py-1 font-pixel text-[7px] text-white/85 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-[#fff6d8]" /> KAMU
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <SectionLabel right={<button onClick={() => setZoom((z) => (z > 1.2 ? 1 : 2))} className="text-[#8fa699] hover:text-white"><Maximize2 size={11} /></button>}>
            Waypoint
          </SectionLabel>
          <div className="scroll-thin space-y-1 overflow-y-auto pr-1" style={{ maxHeight: 240 }}>
            {(mapData?.waypoints ?? []).map((wp) => (
              <button
                key={wp.id}
                onClick={() => { onTeleport(wp.id); onClose(); }}
                className="group flex w-full items-center gap-2 rounded-lg border border-white/8 bg-white/[0.03] px-2 py-1.5 text-left transition-colors hover:border-[#a7eb76]/35 hover:bg-white/[0.06]"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-md border" style={{ borderColor: `${wp.color}45`, background: `${wp.color}18`, color: wp.color }}>
                  {WAYPOINT_ICONS[wp.icon] ?? <MapPin size={12} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[9.5px] font-semibold text-[#dcebdc]">{wp.name}</span>
                  <span className="block font-pixel text-[6.5px] text-[#7f9788]">X {wp.x} · Y {wp.y} · Z {wp.z}</span>
                </span>
                <Navigation size={10} className="text-[#6f8878] group-hover:text-[#a7eb76]" />
              </button>
            ))}
          </div>
          <div className="rounded-xl border border-white/8 bg-black/20 p-2.5">
            <p className="font-pixel text-[7px] uppercase tracking-[0.16em] text-[#8fa699]">Info Dunia</p>
            <div className="mt-1.5 space-y-1 text-[9px]">
              {[
                ["Seed", stats.seedLabel],
                ["Waktu", `${stats.timeLabel} · ${stats.phase}`],
                ["Hari", `${stats.day}`],
                ["Pemain", "PlayerOne"],
                ["Mode", stats.mode === "play" ? "Bermain" : "Jeda"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2">
                  <span className="text-[#829b8b]">{k}</span>
                  <span className="truncate font-semibold text-[#dcebdc]">{v}</span>
                </div>
              ))}
            </div>
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(String(stats.seed));
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1500);
                } catch { /* clipboard optional */ }
              }}
              className="mt-2 flex w-full items-center justify-center gap-1 rounded-md border border-white/10 bg-white/[0.04] py-1 text-[8.5px] font-semibold text-[#b8cdb9] hover:text-white"
            >
              {copied ? <Check size={9} className="text-[#a7eb76]" /> : <Copy size={9} />} Salin seed
            </button>
          </div>
          <div className="mt-auto rounded-xl border border-[#eccb83]/20 bg-[#eccb83]/8 p-2.5 text-[8.5px] leading-relaxed text-[#b4c9b4]">
            <p className="mb-1 flex items-center gap-1 font-pixel text-[7px] text-[#eccb83]"><Compass size={9} /> PETUNJUK</p>
            Klik waypoint untuk teleport seketika. Arahkan kamera ke blok jauh dan klik untuk menambang dari jarak pandang.
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

// ---------------------------------------------------------------------------
// Help
// ---------------------------------------------------------------------------
export function HelpPanel({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"controls" | "features">("controls");
  return (
    <ModalShell
      title="Panduan Blockrealm"
      eyebrow="Selamat Datang, Builder"
      subtitle="Semua yang perlu kamu tahu untuk menjelajahi dan membangun dunia."
      icon={<BookOpen size={18} />}
      onClose={onClose}
      width="max-w-4xl"
      footer={
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[9px] text-[#829b8b]"><ShieldCheck size={10} className="text-[#a7eb76]" /> Tekstur & aset dibuat secara prosedural</span>
          <button onClick={onClose} className="btn-primary !px-3 !py-1.5 text-[10px]">Siap Menjelajah</button>
        </div>
      }
    >
      <div className="mb-3 flex items-center gap-2">
        <div className="flex rounded-lg border border-white/10 bg-black/30 p-1">
          {[
            { id: "controls" as const, label: "Kontrol", icon: <Keyboard size={11} /> },
            { id: "features" as const, label: "Fitur Dunia", icon: <Sparkles size={11} /> },
          ].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[10px] font-semibold", tab === t.id ? "bg-[#8fd36d] text-[#10210f]" : "text-[#9db3a4] hover:text-white")}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
        <span className="ml-auto hidden items-center gap-1 rounded-md border border-[#eccb83]/25 bg-[#eccb83]/10 px-2 py-1 text-[8.5px] font-semibold text-[#f0d79a] sm:flex">
          <Maximize2 size={9} /> Terbaik dalam mode lanskap
        </span>
      </div>

      {tab === "controls" ? (
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <SectionLabel>Gerakan & Kamera</SectionLabel>
            <div className="space-y-1">
              {[
                { icon: <Move3d size={11} />, keys: "W A S D", desc: "Bergerak mengikuti arah kamera" },
                { icon: <Zap size={11} />, keys: "SPACE", desc: "Lompat · terbang naik" },
                { icon: <Wind size={11} />, keys: "SHIFT", desc: "Lari cepat · terbang turun" },
                { icon: <Mouse size={11} />, keys: "SERET", desc: "Orbit kamera mengelilingi karakter" },
                { icon: <Eye size={11} />, keys: "SCROLL", desc: "Zoom kamera 6–48 blok" },
                { icon: <Camera size={11} />, keys: "C", desc: "Siklus preset jarak kamera jauh" },
                { icon: <Crosshair size={11} />, keys: "V", desc: "Ganti orang pertama / ketiga" },
                { icon: <Move3d size={11} />, keys: "F", desc: "Aktifkan mode terbang bebas" },
              ].map((x) => (
                <div key={x.keys} className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/[0.025] px-2.5 py-1.5">
                  <span className="text-[#a7eb76]">{x.icon}</span>
                  <span className="min-w-0 flex-1 text-[9.5px] text-[#a9bdae]">{x.desc}</span>
                  <kbd className="shrink-0 rounded border border-white/15 bg-black/35 px-1.5 py-0.5 font-pixel text-[7px] text-white">{x.keys}</kbd>
                </div>
              ))}
            </div>
          </div>
          <div>
            <SectionLabel>Interaksi & Menu</SectionLabel>
            <div className="space-y-1">
              {[
                { icon: <Pickaxe size={11} />, keys: "KLIK KIRI", desc: "Tambang blok yang dibidik" },
                { icon: <Box size={11} />, keys: "KLIK KANAN", desc: "Pasang blok terpilih" },
                { icon: <Grid3X3 size={11} />, keys: "1–9", desc: "Pilih slot hotbar" },
                { icon: <Package size={11} />, keys: "E", desc: "Buka inventori & kerajinan" },
                { icon: <Boxes size={11} />, keys: "B", desc: "Katalog semua blok" },
                { icon: <MapIcon size={11} />, keys: "M", desc: "Peta dunia & teleport" },
                { icon: <Camera size={11} />, keys: "P", desc: "Mode foto sinematik" },
                { icon: <Home size={11} />, keys: "R", desc: "Kembali ke titik awal" },
                { icon: <Users size={11} />, keys: "T", desc: "Bicara dengan penduduk desa" },
                { icon: <Pause size={11} />, keys: "ESC", desc: "Jeda & menu pengaturan" },
                { icon: <Download size={11} />, keys: "O", desc: "Simpan tangkapan layar" },
              ].map((x) => (
                <div key={x.keys} className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/[0.025] px-2.5 py-1.5">
                  <span className="text-[#a7eb76]">{x.icon}</span>
                  <span className="min-w-0 flex-1 text-[9.5px] text-[#a9bdae]">{x.desc}</span>
                  <kbd className="shrink-0 rounded border border-white/15 bg-black/35 px-1.5 py-0.5 font-pixel text-[7px] text-white">{x.keys}</kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: <Mountain size={16} />, title: "Open World 3D Asli", desc: "Dunia 96×96×40 blok dengan lembah, danau, pegunungan salju, hutan, dan pulau-pulau jauh di cakrawala." },
            { icon: <Sun size={16} />, title: "Pencahayaan Dinamis", desc: "Matahari dan bulan bergerak, warna langit berubah, dan cahaya lentera menyala di malam hari." },
            { icon: <Layers size={16} />, title: "Bayangan & AO", desc: "Bayangan real-time PCF soft, ambient occlusion per vertex untuk sudut blok yang dalam dan dramatis." },
            { icon: <Droplets size={16} />, title: "Refleksi Nyata", desc: "Danau dan laut memantulkan langit dengan normal map bergerak, kilau matahari dan sparkle permukaan." },
            { icon: <Box size={16} />, title: "Tekstur 32×32", desc: "Setiap blok digambar secara prosedural dengan gaya voxel klasik yang tajam, tanpa aset eksternal." },
            { icon: <Hammer size={16} />, title: "Bangun Tanpa Batas", desc: "Tambang dan pasang semua jenis blok, dari dedaunan sampai glowstone, lengkap dengan sistem kerajinan." },
            { icon: <CloudSun size={16} />, title: "Tanpa Kabut", desc: "Tidak ada fog sama sekali. Garis pandang jernih sampai ujung dunia dan pulau-pulau nun jauh." },
            { icon: <Camera size={16} />, title: "Kamera Jauh", desc: "Kamera orbit 6–48 blok dengan benturan medan, mode orang pertama, dan mode foto sinematik." },
            { icon: <Gauge size={16} />, title: "Dapat Diatur", desc: "Atur kualitas bayangan, bloom, refleksi, awan, resolusi, FOV, dan sensitivitas sesuai perangkatmu." },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border border-white/8 bg-white/[0.03] p-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#a7eb76]/25 bg-[#a7eb76]/10 text-[#a7eb76]">{f.icon}</span>
              <p className="mt-2 text-[11px] font-bold text-white">{f.title}</p>
              <p className="mt-1 text-[9px] leading-relaxed text-[#8fa699]">{f.desc}</p>
            </div>
          ))}
        </div>
      )}
    </ModalShell>
  );
}

// ---------------------------------------------------------------------------
// Photo mode
// ---------------------------------------------------------------------------
export function PhotoOverlay({
  settings,
  stats,
  onChange,
  onScreenshot,
  onClose,
}: {
  settings: GameSettings;
  stats: GameStats;
  onChange: (patch: Partial<GameSettings>) => void;
  onScreenshot: () => void;
  onClose: () => void;
}) {
  const weatherChoices: { id: "clear" | "rain" | "storm"; label: string }[] = [
    { id: "clear", label: "Cerah" },
    { id: "rain", label: "Hujan" },
    { id: "storm", label: "Badai" },
  ];
  const presets = [
    { label: "Fajar", icon: <Sun size={11} />, time: 6.1 },
    { label: "Siang", icon: <Sun size={11} />, time: 12.1 },
    { label: "Senja", icon: <CloudSun size={11} />, time: 18.0 },
    { label: "Malam", icon: <Moon size={11} />, time: 22.2 },
  ];
  return (
    <div className="pointer-events-none fixed inset-0 z-[70]">
      <div className="absolute inset-4 border border-white/25 sm:inset-6" />
      {[
        "left-4 top-4 border-l-2 border-t-2",
        "right-4 top-4 border-r-2 border-t-2",
        "left-4 bottom-4 border-l-2 border-b-2",
        "right-4 bottom-4 border-r-2 border-b-2",
      ].map((c) => (
        <span key={c} className={cn("absolute h-8 w-8 border-[#f2e7c6]/80 sm:h-10 sm:w-10", c)} />
      ))}
      <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/60 to-transparent p-4 sm:p-6">
        <div className="pointer-events-auto mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-xl border border-white/15 bg-black/50 px-3 py-2 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md border border-[#eccb83]/35 bg-[#eccb83]/15 text-[#f2dca5]"><Camera size={14} /></span>
            <div>
              <p className="font-pixel text-[8px] uppercase tracking-[0.18em] text-[#f2e7c6]">Mode Foto</p>
              <p className="text-[9px] text-[#a9bfae]">Lembah Zamrud · {stats.timeLabel} · {stats.phase}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="hidden items-center gap-1 font-pixel text-[7px] text-[#a9bfae] sm:flex"><Grid3X3 size={9} /> SCROLL UNTUK ZOOM</span>
            <button onClick={onScreenshot} className="btn-primary !px-3 !py-1.5 text-[10px]"><Download size={11} /> Ambil Foto</button>
            <button onClick={onClose} className="btn-secondary !px-2.5 !py-1.5 text-[10px]"><X size={12} /> Keluar</button>
          </div>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 sm:p-6">
        <div className="pointer-events-auto mx-auto flex max-w-3xl flex-wrap items-center gap-3 rounded-xl border border-white/15 bg-black/50 px-3 py-2 backdrop-blur-md">
          <div className="flex items-center gap-1">
            {presets.map((p) => (
              <button key={p.label} onClick={() => onChange({ time: p.time })} className={cn("flex items-center gap-1 rounded-md border px-2 py-1 text-[9px] font-semibold", Math.abs(settings.time - p.time) < 0.5 ? "border-[#eccb83]/50 bg-[#eccb83]/20 text-[#f5e6bd]" : "border-white/10 bg-white/[0.04] text-[#a9bfae] hover:text-white")}>
                {p.icon} {p.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            {weatherChoices.map((w) => (
              <button
                key={w.id}
                onClick={() => onChange({ weather: w.id })}
                className={cn(
                  "rounded-md border px-2 py-1 text-[9px] font-semibold",
                  settings.weather === w.id
                    ? "border-[#a7eb76]/50 bg-[#a7eb76]/20 text-[#e0f8d0]"
                    : "border-white/10 bg-white/[0.04] text-[#a9bfae] hover:text-white"
                )}
              >
                {w.label}
              </button>
            ))}
          </div>
          <div className="h-5 w-px bg-white/15" />
          <div className="flex min-w-[130px] flex-1 items-center gap-2">
            <span className="font-pixel text-[7px] text-[#8fa699]">FOV</span>
            <input type="range" min={40} max={100} value={settings.fov} onChange={(e) => onChange({ fov: Number(e.target.value) })} />
            <span className="font-pixel text-[7px] text-white">{settings.fov}°</span>
          </div>
          <div className="flex min-w-[130px] flex-1 items-center gap-2">
            <span className="font-pixel text-[7px] text-[#8fa699]">KAMERA</span>
            <input type="range" min={6} max={48} value={settings.cameraDistance} onChange={(e) => onChange({ cameraDistance: Number(e.target.value) })} />
            <span className="font-pixel text-[7px] text-white">{settings.cameraDistance}</span>
          </div>
          <span className="flex items-center gap-1 font-pixel text-[7px] text-[#a9bfae]"><Sparkles size={9} className="text-[#eccb83]" /> HUD DISEMBUNYIKAN</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading & orientation
// ---------------------------------------------------------------------------
export function LoadingScreen({ progress, seed, onCancel, label }: { progress: number; seed: number; onCancel: () => void; label?: string }) {
  const steps = [
    "Membentuk benua & laut",
    "Menumbuhkan hutan & bunga",
    "Membangun pondok & menara",
    "Memasang lentera & cahaya",
    "Menghitung refleksi air",
    "Menyiapkan kamera jauh",
  ];
  const active = Math.min(steps.length - 1, Math.floor((progress / 100) * steps.length));
  return (
    <div className="fixed inset-0 z-[60] flex flex-col overflow-hidden bg-[#040b07]/72 backdrop-blur-md">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_500px_at_50%_40%,rgba(70,130,80,.22),transparent_70%)]" />
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="pointer-events-none absolute animate-floaty opacity-40"
          style={{
            left: `${10 + i * 19}%`,
            top: `${18 + ((i * 37) % 54)}%`,
            animationDelay: `${i * 0.7}s`,
            animationDuration: `${5 + i}s`,
          }}
        >
          <BlockIcon id={[1, 9, 7, 19, 3][i]} size={26 + (i % 3) * 14} />
        </div>
      ))}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 lg:px-10">
        <div className="flex items-center gap-2.5">
          <BlockIcon id={1} size={34} glow />
          <div>
            <p className="font-pixel text-[13px] text-white">BLOCKREALM</p>
            <p className="text-[8px] uppercase tracking-[0.22em] text-[#8fa699]">Realm Engine v2.4</p>
          </div>
        </div>
        <span className="flex items-center gap-1.5 rounded-md border border-white/10 bg-black/35 px-2 py-1 text-[8.5px] text-[#a9bfae]">
          <ShieldCheck size={10} className="text-[#a7eb76]" /> Seed terverifikasi
        </span>
      </header>
      <main className="relative z-10 flex flex-1 items-center justify-center px-4">
        <div className="glass w-full max-w-[620px] overflow-hidden rounded-2xl">
          <div className="border-b border-white/8 px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#a7eb76]/25 bg-[#a7eb76]/10 text-[#a7eb76]"><Compass size={15} className="animate-spin-slow" /></span>
                <div>
                  <p className="font-pixel text-[8px] uppercase tracking-[0.16em] text-[#a7eb76]">Membangun Dunia</p>
                  <h2 className="text-[19px] font-extrabold leading-tight text-white">Lembah Zamrud</h2>
                </div>
              </div>
              <div className="text-right">
                <p className="font-pixel text-[16px] text-[#e7f5dc]">{Math.round(progress)}%</p>
                <p className="font-pixel text-[6.5px] text-[#8fa699]">SEED #{seed.toString(36).toUpperCase()}</p>
              </div>
            </div>
            <ProgressBar value={progress} max={100} className="mt-3 h-2" color="#a7eb76" />
            {progress < 8 && (
              <p className="mt-2 text-[9px] leading-relaxed text-[#8fa699]">
                Menyiapkan renderer, tekstur 64×64, dan pencahayaan. Jangan tutup aplikasi.
              </p>
            )}
            <div className="mt-2 flex items-center justify-between text-[8.5px] text-[#8fa699]">
              <span>{progress >= 100 ? "Dunia siap. Memasuki realm…" : label || steps[active]}</span>
              <span className="font-pixel text-[6.5px]">{active + 1} / {steps.length} TAHAP</span>
            </div>
          </div>
          <div className="grid gap-1.5 px-5 py-4 sm:grid-cols-2">
            {steps.map((step, i) => {
              const done = i < active || progress >= 100;
              const current = i === active && progress < 100;
              return (
                <div key={step} className={cn("flex items-center gap-2 rounded-lg border px-2 py-1.5 transition-colors", done ? "border-[#a7eb76]/18 bg-[#a7eb76]/6" : current ? "border-white/15 bg-white/[0.04]" : "border-white/6 bg-black/15")}>
                  <span className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded-full border", done ? "border-[#a7eb76]/50 bg-[#a7eb76]/20 text-[#b7f095]" : current ? "border-[#eccb83]/50 text-[#eccb83]" : "border-white/10 text-[#53695b]")}>
                    {done ? <Check size={9} /> : current ? <span className="h-1.5 w-1.5 animate-ping rounded-full bg-[#eccb83]" /> : <span className="h-1 w-1 rounded-full bg-current" />}
                  </span>
                  <span className={cn("text-[9px]", done ? "text-[#b8d3b7]" : current ? "font-semibold text-white" : "text-[#7b9283]")}>{step}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between border-t border-white/8 bg-black/20 px-5 py-2.5">
            <p className="flex items-center gap-1.5 text-[8.5px] text-[#8fa699]">
              <Sparkles size={9} className="text-[#eccb83]" /> Muat pertama menyiapkan mesin 3D — setelah itu instan.
            </p>
            <button onClick={onCancel} className="text-[8.5px] font-semibold text-[#a9bfae] hover:text-white">Batalkan</button>
          </div>
        </div>
      </main>
      <footer className="relative z-10 flex items-center justify-between px-6 py-4 text-[8.5px] text-[#7d9585] lg:px-10">
        <span className="flex items-center gap-1.5"><Monitor size={10} /> Pengalaman optimal dalam mode lanskap · 3D WebGL</span>
        <span className="font-pixel text-[6.5px]">TANPA FOG · OPEN WORLD · ULTRA VISUAL</span>
      </footer>
    </div>
  );
}

export function OrientationGuard({ onContinue }: { onContinue?: () => void }) {
  return (
    <div className="landscape-hide fixed inset-0 z-[200] flex-col items-center justify-center bg-[#040b07] p-8 text-center">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_400px_at_50%_40%,rgba(100,180,100,.18),transparent)]" />
      <div className="relative">
        <div className="mx-auto mb-5 flex h-20 w-20 rotate-[-20deg] items-center justify-center rounded-2xl border border-[#a7eb76]/30 bg-[#a7eb76]/10 text-[#a7eb76]">
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
            <rect x="6" y="2" width="12" height="20" rx="2" />
            <path d="M10 18h4" />
            <path d="M2 8a8 8 0 0 1 3-3" />
          </svg>
        </div>
        <p className="font-pixel text-[10px] uppercase tracking-[0.2em] text-[#a7eb76]">Blockrealm</p>
        <h1 className="mt-2 text-2xl font-extrabold text-white">Putar perangkatmu</h1>
        <p className="mx-auto mt-2 max-w-[300px] text-[12px] leading-relaxed text-[#a9bfae]">
          Dunia voxel 3D ini dirancang untuk layar lanskap. Putar perangkat secara horizontal untuk pengalaman terbaik.
        </p>
        <div className="mx-auto mt-5 flex flex-col items-center gap-2">
          <div className="flex w-fit items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[10px] text-[#dcebdc]">
            <RotateCcw size={12} className="text-[#eccb83]" /> Disarankan lanskap
          </div>
          {onContinue && (
            <button onClick={onContinue} className="btn-primary mt-1 !px-4 !py-2 text-[11px]">
              <Maximize2 size={12} /> Tetap bermain portrait
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function MissingWorld({ onBack }: { onBack: () => void }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#040b07]">
      <div className="glass max-w-md rounded-2xl p-6 text-center">
        <Boxes size={30} className="mx-auto text-[#a7eb76]" />
        <h2 className="mt-3 text-lg font-bold text-white">WebGL tidak tersedia</h2>
        <p className="mt-1 text-[11px] text-[#9fb3a5]">Aktifkan akselerasi perangkat keras atau gunakan browser modern untuk memuat dunia 3D.</p>
        <button onClick={onBack} className="btn-primary mt-4 text-[11px]"><ArrowLeft size={12} /> Kembali</button>
      </div>
    </div>
  );
}
