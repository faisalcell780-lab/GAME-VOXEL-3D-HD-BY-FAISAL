import { useMemo, type ReactNode } from "react";
import { ChevronRight, X } from "lucide-react";
import { BLOCKS } from "../game/world";
import { blockIconDataUrl } from "../game/textures";
import { cn } from "../utils/cn";

export function BlockIcon({
  id,
  size = 44,
  className,
  glow = false,
}: {
  id: number;
  size?: number;
  className?: string;
  glow?: boolean;
}) {
  const url = useMemo(() => {
    const def = BLOCKS[id] ?? BLOCKS[1];
    return blockIconDataUrl(def, 128);
  }, [id]);
  return (
    <img
      src={url}
      alt={BLOCKS[id]?.name ?? "Blok"}
      draggable={false}
      className={cn("select-none object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,.45)]", className)}
      style={{ width: size, height: size, filter: glow ? "drop-shadow(0 0 12px rgba(167,235,118,.35))" : undefined }}
    />
  );
}

export function ProgressBar({
  value,
  max,
  className,
  barClassName,
  color = "#a7eb76",
}: {
  value: number;
  max: number;
  className?: string;
  barClassName?: string;
  color?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-black/40", className)}>
      <div
        className={cn("h-full rounded-full transition-all duration-500", barClassName)}
        style={{ width: `${pct}%`, background: color, boxShadow: `0 0 10px ${color}66` }}
      />
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-4 py-3", disabled && "opacity-50")}>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[#eaf5e9]">{label}</p>
        {description && <p className="mt-0.5 text-[11px] leading-relaxed text-[#8fa699]">{description}</p>}
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!checked)}
        aria-pressed={checked}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-200",
          checked ? "border-[#9fe06f] bg-[#5aa84a]" : "border-white/15 bg-black/40"
        )}
      >
        <span
          className={cn(
            "absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-[4px] transition-all duration-200",
            checked ? "left-6 bg-[#f2ffe4] shadow-[0_0_10px_rgba(167,235,118,.6)]" : "left-1 bg-[#8ba192]"
          )}
        />
      </button>
    </div>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  hint?: string;
}) {
  return (
    <div className="py-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#eaf5e9]">{label}</p>
          {hint && <p className="text-[11px] text-[#8fa699]">{hint}</p>}
        </div>
        <span className="rounded-md border border-white/10 bg-black/35 px-2 py-1 font-pixel text-[10px] text-[#d9eccb]">
          {format ? format(value) : value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label?: string;
}) {
  return (
    <div className="py-3">
      {label && <p className="mb-2 text-sm font-semibold text-[#eaf5e9]">{label}</p>}
      <div className="flex gap-1 rounded-lg border border-white/10 bg-black/30 p-1">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex-1 rounded-md px-2 py-1.5 text-[11px] font-semibold transition-colors",
              value === opt.value
                ? "bg-[#8fd36d] text-[#10210f] shadow-[0_2px_8px_rgba(143,211,109,.3)]"
                : "text-[#9db3a4] hover:bg-white/5 hover:text-white"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ModalShell({
  title,
  subtitle,
  eyebrow,
  icon,
  onClose,
  children,
  footer,
  width = "max-w-4xl",
  accent = "#a7eb76",
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  icon?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
  accent?: string;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-[#030a06]/70 backdrop-blur-[7px] animate-fade"
        onClick={onClose}
        aria-hidden
      />
      <div
        className={cn(
          "glass animate-rise relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-2xl",
          width
        )}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 opacity-30"
          style={{ background: `radial-gradient(600px 90px at 20% 0%, ${accent}44, transparent)` }}
        />
        <header className="relative flex items-start justify-between gap-4 border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-3">
            {icon && (
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl border"
                style={{ borderColor: `${accent}44`, background: `${accent}18`, color: accent }}
              >
                {icon}
              </div>
            )}
            <div>
              {eyebrow && (
                <p className="font-pixel text-[9px] uppercase tracking-[0.18em]" style={{ color: accent }}>
                  {eyebrow}
                </p>
              )}
              <h2 className="text-lg font-extrabold tracking-tight text-white">{title}</h2>
              {subtitle && <p className="text-[11px] text-[#93a99a]">{subtitle}</p>}
            </div>
          </div>
          <button onClick={onClose} className="btn-icon h-8 w-8 shrink-0" aria-label="Tutup">
            <X size={15} />
          </button>
        </header>
        <div className="scroll-thin relative min-h-0 flex-1 overflow-y-auto px-6 py-4">{children}</div>
        {footer && <footer className="relative border-t border-white/10 bg-black/20 px-6 py-3">{footer}</footer>}
      </div>
    </div>
  );
}

export function SectionLabel({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <p className="font-pixel text-[9px] uppercase tracking-[0.2em] text-[#8fab95]">{children}</p>
      {right}
    </div>
  );
}

export function ListRow({
  children,
  onClick,
  active,
}: {
  children: ReactNode;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border border-white/8 bg-white/[0.025] px-3 py-2.5 text-left transition-colors",
        onClick && "hover:border-[#a7eb7655] hover:bg-white/[0.06]",
        active && "border-[#a7eb7688] bg-[#a7eb7614]"
      )}
    >
      {children}
      {onClick && <ChevronRight size={14} className="ml-auto shrink-0 text-[#7f9788]" />}
    </button>
  );
}
