"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useApp, useLevel } from "@/store/useApp";
import { rankIcon } from "@/lib/xp";
import { isStreakAlive } from "@/lib/streak";
import { cx, ProgressBar } from "./ui";

/**
 * Entrées de navigation.
 * `tab` = visible dans la barre d'onglets mobile ; les autres sont regroupées
 * derrière un bouton « Plus », pour qu'aucune page ne soit inaccessible au
 * doigt. Le profil n'apparaît nulle part dans ces listes : l'avatar en haut à
 * droite y mène déjà, sur mobile comme sur grand écran.
 */
const NAV = [
  { href: "/", label: "Accueil", icon: "🏠", tab: true },
  { href: "/exercices", label: "Exercices", icon: "📚", tab: true },
  { href: "/seances", label: "Séances", icon: "🎯", tab: true },
  { href: "/progression", label: "Progression", icon: "📈", tab: true },
  { href: "/defis", label: "Défis", icon: "🔥", tab: false },
  { href: "/social", label: "Social", icon: "⚔️", tab: false },
  { href: "/outils", label: "Outils", icon: "🧮", tab: false },
] as const;

/** Pages accessibles depuis le bouton « Plus » de la barre mobile. */
const MORE = [...NAV.filter((n) => !n.tab), { href: "/profil", label: "Profil & badges", icon: "🎖️", tab: false }];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hydrated = useApp((s) => s.hydrated);
  const profile = useApp((s) => s.state.profile);
  const streak = useApp((s) => s.state.streak);
  const level = useLevel();
  // Le menu « Plus » se referme depuis les liens eux-mêmes plutôt que via un
  // effet sur le chemin : pas de rendu en cascade au changement de page.
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const alive = isStreakAlive(streak);
  const moreActive = MORE.some((item) => isActive(item.href));

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

          <nav className="ml-3 hidden flex-1 items-center gap-0.5 md:flex" aria-label="Navigation principale">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={cx(
                  "rounded-lg px-2.5 py-1.5 text-sm font-semibold transition",
                  isActive(item.href) ? "bg-ink-700 text-white" : "text-white/55 hover:bg-ink-800 hover:text-white/85",
                )}
              >
                <span aria-hidden className="mr-1">{item.icon}</span>
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

      {/* Menu « Plus » : évite qu'une page soit hors d'atteinte sur mobile. */}
      {moreOpen && (
        <>
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={() => setMoreOpen(false)}
            className="fixed inset-0 z-40 bg-ink-950/70 backdrop-blur-sm md:hidden"
          />
          <div className="fixed inset-x-0 bottom-16 z-50 mx-3 rounded-2xl border border-ink-600 bg-ink-900 p-2 shadow-2xl md:hidden">
            {MORE.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMoreOpen(false)}
                className={cx(
                  "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition",
                  isActive(item.href) ? "bg-ink-700 text-white" : "text-white/70 hover:bg-ink-800",
                )}
              >
                <span aria-hidden className="text-lg">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Barre d'onglets mobile */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-ink-700/70 bg-ink-950/95 backdrop-blur-xl md:hidden"
        aria-label="Navigation mobile"
      >
        <div className="flex items-stretch justify-around pb-[env(safe-area-inset-bottom)]">
          {NAV.filter((n) => n.tab).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMoreOpen(false)}
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
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            aria-expanded={moreOpen}
            aria-label="Plus de pages"
            className={cx(
              "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold transition",
              moreOpen || moreActive ? "text-neon-cyan" : "text-white/45",
            )}
          >
            <span aria-hidden className="text-lg leading-none">{moreOpen ? "✕" : "⋯"}</span>
            Plus
          </button>
        </div>
      </nav>
    </div>
  );
}
