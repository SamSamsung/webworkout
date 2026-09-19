"use client";

import { useDeferredValue, useMemo, useState } from "react";
import type { Exercise, MuscleGroup } from "@/types/exercise";
import { MUSCLE_GROUPS } from "@/types/exercise";
import { GROUP_META } from "@/data/taxonomy";
import { EXERCISES } from "@/data/exercises";
import { filterExercises } from "@/lib/search";
import { Button, Chip, cx, DifficultyDots } from "@/components/ui";
import { useApp } from "@/store/useApp";

/**
 * Sélecteur d'exercice en surcouche.
 * Réutilise le moteur de recherche de la base pour retrouver n'importe
 * laquelle des 472 fiches sans quitter l'éditeur de séance.
 */
export function ExercisePicker({
  onPick,
  onClose,
}: {
  onPick: (exercise: Exercise) => void;
  onClose: () => void;
}) {
  const favorites = useApp((s) => s.state.favorites);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<MuscleGroup | null>(null);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const deferred = useDeferredValue(query);

  const results = useMemo(
    () =>
      filterExercises(EXERCISES, {
        query: deferred,
        groups: group ? [group] : undefined,
        ids: onlyFavorites ? favorites : undefined,
      }).slice(0, 60),
    [deferred, group, onlyFavorites, favorites],
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/80 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Choisir un exercice"
    >
      <div className="flex h-[85dvh] w-full max-w-2xl flex-col gap-3 rounded-t-2xl border border-ink-600 bg-ink-900 p-4 sm:h-[70dvh] sm:rounded-2xl">
        <div className="flex items-center gap-2">
          <h2 className="flex-1 font-display text-base font-bold">Ajouter un exercice</h2>
          <Button size="sm" variant="ghost" onClick={onClose}>
            Fermer
          </Button>
        </div>

        <input
          type="search"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher parmi 472 exercices…"
          aria-label="Rechercher un exercice"
          className="w-full rounded-xl border border-ink-600 bg-ink-950 px-3 py-2.5 text-sm outline-none placeholder:text-white/30 focus:border-neon-violet"
        />

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button type="button" onClick={() => setOnlyFavorites((v) => !v)} aria-pressed={onlyFavorites}>
            <Chip color={onlyFavorites ? "#fbbf24" : undefined} className={onlyFavorites ? "" : "text-white/45"}>
              ⭐ Favoris
            </Chip>
          </button>
          {MUSCLE_GROUPS.map((g) => (
            <button key={g} type="button" onClick={() => setGroup(group === g ? null : g)} aria-pressed={group === g}>
              <Chip
                color={group === g ? GROUP_META[g].hex : undefined}
                className={cx("whitespace-nowrap", group === g ? "font-bold" : "text-white/45")}
              >
                {GROUP_META[g].icon} {GROUP_META[g].label}
              </Chip>
            </button>
          ))}
        </div>

        <ul className="flex-1 overflow-y-auto">
          {results.map((ex) => (
            <li key={ex.id}>
              <button
                type="button"
                onClick={() => onPick(ex)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition hover:bg-ink-800"
              >
                <span aria-hidden className="text-base">{GROUP_META[ex.group].icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{ex.name}</span>
                  <span className="block truncate text-[11px] text-white/40">
                    {GROUP_META[ex.group].label} · {ex.equipment.map((e) => e).join(", ")}
                  </span>
                </span>
                <DifficultyDots level={ex.difficulty} />
              </button>
            </li>
          ))}
          {results.length === 0 && (
            <li className="py-8 text-center text-sm text-white/40">Aucun exercice trouvé.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
