"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp, useLevel } from "@/store/useApp";
import { rankIcon } from "@/lib/xp";
import { isStreakAlive } from "@/lib/streak";
import { cx, ProgressBar } from "./ui";

/** Entrées de navigation. `primary` = visible dans la barre mobile. */
const NAV = [
  { href: "/", label: "Accueil", icon: "🏠", primary: true },
  { href: "/exercices", label: "Exercices", icon: "📚", primary: true },
  { href: "/seances", label: "Séances", icon: "🎯", primary: true },
  { href: "/progression", label: "Progression", icon: "📈", primary: true },
  { href: "/social", label: "Social", icon: "⚔️", primary: false },
  { href: "/outils", label: "Outils", icon: "🧮", primary: false },
  { href: "/profil", label: "Profil", icon: "🎖️", primary: true },
] as const;

/**
 * Coquille de l'application : barre supérieure sur grand écran, barre
 * d'onglets fixée en bas sur mobile. La progression de niveau est toujours
 * visible : c'est le fil conducteur de la gamification.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hydrated = useApp((s) => s.hydrated);
  const profile = useApp((s) => s.state.profile);
  const streak = useApp((s) => s.state.streak);
  const level = useLevel();

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const alive = isStreakAlive(streak);

  return (
    <div className="min-h-dvh pb-20 md:pb-0">
      <header className="sticky top-0 z-40 border-b border-ink-700/70 bg-ink-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
          <Link href="/" className="flex items-center gap-2 font-display text-lg font-black tracking-tight">
            <span aria-hidden className="text-xl">⚡</span>
            <span className="bg-gradient-to-r from-neon-violet via-neon-cyan to-neon-lime bg-clip-text text-transparent">
              IronQuest
            </span>
          </Link>

          <nav className="ml-4 hidden flex-1 items-center gap-1 md:flex" aria-label="Navigation principale">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={cx(
                  "rounded-lg px-3 py-1.5 text-sm font-semibold transition",
                  isActive(item.href) ? "bg-ink-700 text-white" : "text-white/55 hover:bg-ink-800 hover:text-white/85",
                )}
              >
                <span aria-hidden className="mr-1.5">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            {hydrated && streak.current > 0 && (
              <span
                className={cx("chip", alive ? "text-neon-orange" : "text-white/40")}
                title={alive ? "Série en cours" : "Série interrompue"}
              >
                🔥 {streak.current}
              </span>
            )}
            <Link href="/profil" className="flex items-center gap-2 rounded-xl px-2 py-1 hover:bg-ink-800">
              <span aria-hidden className="text-xl">{profile.avatar}</span>
              <span className="hidden text-left sm:block">
                <span className="block text-xs font-bold leading-tight">
                  {rankIcon(level.level)} Niv. {level.level}
                </span>
                <span className="block text-[10px] text-white/45 tabular-nums">
                  {level.xpIntoLevel} / {level.xpForLevel} XP
                </span>
              </span>
            </Link>
          </div>
        </div>
        <ProgressBar value={level.progress} className="h-1 rounded-none" label="Progression vers le niveau suivant" />
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5">{children}</main>

      {/* Barre d'onglets mobile */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-700/70 bg-ink-950/95 backdrop-blur-xl md:hidden"
        aria-label="Navigation mobile"
      >
        <div className="flex items-stretch justify-around pb-[env(safe-area-inset-bottom)]">
          {NAV.filter((n) => n.primary).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cx(
                "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold transition",
                isActive(item.href) ? "text-neon-cyan" : "text-white/45",
              )}
            >
              <span aria-hidden className="text-lg leading-none">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
