"use client";

import Link from "next/link";
import type { Exercise } from "@/types/exercise";
import { EQUIPMENT_META, GROUP_META } from "@/data/taxonomy";
import { DIFFICULTY_LABELS } from "@/types/exercise";
import { Chip, DifficultyDots } from "@/components/ui";
import { useApp } from "@/store/useApp";

/** Carte d'exercice affichée dans les listes et les résultats de recherche. */
export function ExerciseCard({ exercise }: { exercise: Exercise }) {
  const favorites = useApp((s) => s.state.favorites);
  const toggleFavorite = useApp((s) => s.toggleFavorite);
  const meta = GROUP_META[exercise.group];
  const isFavorite = favorites.includes(exercise.id);

  return (
    <li className="card group relative flex flex-col gap-2 p-3 transition hover:border-ink-500">
      <button
        type="button"
        onClick={() => toggleFavorite(exercise.id)}
        aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
        aria-pressed={isFavorite}
        className="absolute right-2 top-2 z-10 rounded-lg p-1.5 text-sm transition hover:bg-ink-700"
      >
        <span aria-hidden>{isFavorite ? "⭐" : "☆"}</span>
      </button>

      <Link href={`/exercices/${exercise.id}`} className="flex flex-col gap-2">
        <div className="flex items-start gap-2 pr-7">
          <span aria-hidden className="text-lg leading-none">{meta.icon}</span>
          <div className="min-w-0">
            <h3 className="font-display text-sm font-bold leading-snug group-hover:text-neon-cyan">
              {exercise.name}
            </h3>
            {exercise.nameEn && <p className="truncate text-[11px] text-white/35">{exercise.nameEn}</p>}
          </div>
        </div>

        <p className="line-clamp-2 text-xs leading-relaxed text-white/55">{exercise.description}</p>

        <div className="mt-auto flex flex-wrap items-center gap-1.5">
          <Chip color={meta.hex}>{meta.label}</Chip>
          <Chip title={DIFFICULTY_LABELS[exercise.difficulty]}>
            <DifficultyDots level={exercise.difficulty} />
          </Chip>
          <Chip className="text-white/50">
            {exercise.equipment[0] === "aucun" && exercise.equipment.length === 1
              ? "🙌 Sans matériel"
              : `${EQUIPMENT_META[exercise.equipment[0]].icon} ${EQUIPMENT_META[exercise.equipment[0]].label}`}
          </Chip>
          {exercise.unilateral && <Chip className="text-white/45">↔️ Unilatéral</Chip>}
        </div>
      </Link>
    </li>
  );
}
