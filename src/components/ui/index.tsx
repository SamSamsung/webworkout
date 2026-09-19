/**
 * Primitives d'interface partagées.
 * Volontairement minimalistes : pas de bibliothèque de composants, juste des
 * briques Tailwind cohérentes avec le design system défini dans globals.css.
 */
import Link from "next/link";
import type { ReactNode } from "react";

/** Fusionne des classes en ignorant les valeurs falsy. */
export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function Card({
  children,
  className,
  as: As = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "li";
}) {
  return <As className={cx("card p-4", className)}>{children}</As>;
}

export function SectionTitle({
  icon,
  title,
  subtitle,
  action,
}: {
  icon?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-lg font-bold tracking-tight sm:text-xl">
          {icon && <span aria-hidden className="mr-2">{icon}</span>}
          {title}
        </h2>
        {subtitle && <p className="mt-0.5 text-sm text-white/55">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/** Pastille d'information. `tone` pilote la couleur d'accent. */
export function Chip({
  children,
  color,
  className,
  title,
}: {
  children: ReactNode;
  color?: string;
  className?: string;
  title?: string;
}) {
  return (
    <span
      className={cx("chip", className)}
      title={title}
      style={color ? { color, borderColor: `${color}55`, background: `${color}14` } : undefined}
    >
      {children}
    </span>
  );
}

/** Barre de progression accessible (role progressbar + valeurs ARIA). */
export function ProgressBar({
  value,
  max = 1,
  color = "#a855f7",
  className,
  label,
}: {
  value: number;
  max?: number;
  color?: string;
  className?: string;
  label?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cx("h-2 w-full overflow-hidden rounded-full bg-ink-700", className)}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}aa)` }}
      />
    </div>
  );
}

/** Tuile de statistique : une valeur, une unité, un libellé. */
export function StatTile({
  icon,
  label,
  value,
  unit,
  hint,
  color = "#a855f7",
}: {
  icon?: string;
  label: string;
  value: ReactNode;
  unit?: string;
  hint?: string;
  color?: string;
}) {
  return (
    <div className="card p-3">
      <div className="flex items-center gap-1.5 text-xs font-medium text-white/50">
        {icon && <span aria-hidden>{icon}</span>}
        <span>{label}</span>
      </div>
      <div className="mt-1 font-display text-2xl font-black tabular-nums" style={{ color }}>
        {value}
        {unit && <span className="ml-1 text-sm font-bold text-white/40">{unit}</span>}
      </div>
      {hint && <div className="mt-0.5 text-[11px] text-white/40">{hint}</div>}
    </div>
  );
}

/** Bouton principal du site. Rendu en `<a>` si `href` est fourni. */
export function Button({
  children,
  onClick,
  href,
  variant = "primary",
  size = "md",
  className,
  disabled,
  type = "button",
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: "primary" | "ghost" | "danger" | "soft";
  size?: "sm" | "md" | "lg";
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit";
  title?: string;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40";
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm", lg: "px-5 py-3 text-base" };
  const variants = {
    primary: "bg-gradient-to-r from-neon-violet to-neon-cyan text-ink-950 hover:brightness-110",
    soft: "bg-ink-700 text-white/90 hover:bg-ink-600",
    ghost: "border border-ink-600 text-white/80 hover:bg-ink-800",
    danger: "bg-neon-rose/20 text-neon-rose border border-neon-rose/40 hover:bg-neon-rose/30",
  };
  const cls = cx(base, sizes[size], variants[variant], className);

  if (href) {
    return (
      <Link href={href} className={cls} title={title}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cls} title={title}>
      {children}
    </button>
  );
}

/** État vide : évite les pages blanches et oriente vers l'action suivante. */
export function EmptyState({
  icon = "🗒️",
  title,
  description,
  action,
}: {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-10 text-center">
      <div className="text-4xl" aria-hidden>
        {icon}
      </div>
      <h3 className="font-display text-base font-bold">{title}</h3>
      {description && <p className="max-w-sm text-sm text-white/55">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/** Indicateur de difficulté sur cinq crans. */
export function DifficultyDots({ level, className }: { level: number; className?: string }) {
  const colors = ["#34d399", "#a3e635", "#fbbf24", "#fb923c", "#fb7185"];
  return (
    <span className={cx("inline-flex items-center gap-0.5", className)} title={`Difficulté ${level}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: i <= level ? colors[level - 1] : "#2f2a45" }}
        />
      ))}
    </span>
  );
}
