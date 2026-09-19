"use client";

import { useEffect } from "react";
import { useApp } from "@/store/useApp";
import { BADGES_BY_ID, RARITY_META } from "@/lib/badges";

/**
 * Affiche une carte de félicitations lorsqu'un badge est débloqué.
 * La récompense doit se voir : c'est le retour immédiat qui donne envie de
 * relancer une séance.
 */
export function BadgeToaster() {
  const pending = useApp((s) => s.pendingBadges);
  const acknowledge = useApp((s) => s.acknowledgeBadges);

  // La liste affichée est directement celle du store : l'effet ne sert qu'à
  // programmer la disparition, sans dupliquer l'état côté composant.
  useEffect(() => {
    if (!pending.length) return;
    const timer = setTimeout(acknowledge, 6000);
    return () => clearTimeout(timer);
  }, [pending, acknowledge]);

  if (!pending.length) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4 md:bottom-6"
      role="status"
      aria-live="polite"
    >
      {pending.map((id) => {
        const badge = BADGES_BY_ID.get(id);
        if (!badge) return null;
        const rarity = RARITY_META[badge.rarity];
        return (
          <div
            key={id}
            className="pointer-events-auto flex w-full max-w-sm animate-pop items-center gap-3 rounded-2xl border p-3 shadow-2xl backdrop-blur-xl"
            style={{ borderColor: `${rarity.color}66`, background: `${rarity.color}1a` }}
          >
            <span aria-hidden className="text-3xl">{badge.icon}</span>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: rarity.color }}>
                Badge {rarity.label} débloqué
              </div>
              <div className="truncate font-display text-sm font-bold">{badge.name}</div>
              <div className="truncate text-xs text-white/60">{badge.description}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
