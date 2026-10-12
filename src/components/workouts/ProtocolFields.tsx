"use client";

import type { WorkoutExercise } from "@/types/app";
import { EXERCISES_BY_ID } from "@/data/exercises";
import { GROUP_META } from "@/data/taxonomy";

/**
 * Réglages d'un format d'entraînement (EMOM, Tabata, AMRAP).
 *
 * Un format n'est pas un mouvement : « EMOM » seul ne dit pas ce qu'on a
 * fait. Ce bloc complète la fiche par l'exercice réellement réalisé, le
 * nombre de répétitions par tour et le nombre de tours — exactement ce qu'on
 * annonce à voix haute avant de lancer le chrono.
 */
export function ProtocolFields({
  entry,
  onChange,
  onChooseTarget,
  tone = "plan",
}: {
  entry: WorkoutExercise;
  onChange: (patch: Partial<WorkoutExercise>) => void;
  /** Ouvre le sélecteur d'exercice, géré par l'écran parent. */
  onChooseTarget: () => void;
  tone?: "plan" | "live";
}) {
  const target = entry.targetExerciseId ? EXERCISES_BY_ID.get(entry.targetExerciseId) : undefined;
  const box = tone === "live" ? "bg-ink-950" : "bg-ink-900";

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-ink-700 bg-ink-900/40 px-2.5 py-2">
      <span className="text-[11px] font-bold uppercase tracking-wider text-white/35">Protocole</span>

      <button
        type="button"
        onClick={onChooseTarget}
        className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
          target
            ? "border-neon-cyan/40 bg-neon-cyan/10 text-white"
            : "border-dashed border-ink-500 text-white/45 hover:border-neon-cyan hover:text-white"
        }`}
      >
        {target ? (
          <>
            <span aria-hidden>{GROUP_META[target.group].icon}</span>
            {target.name}
          </>
        ) : (
          "＋ Choisir l'exercice"
        )}
      </button>

      {target && (
        <button
          type="button"
          onClick={() => onChange({ targetExerciseId: undefined })}
          aria-label="Retirer l'exercice du protocole"
          className="rounded p-1 text-xs text-white/30 hover:text-neon-rose"
        >
          ✕
        </button>
      )}

      <label className="flex items-center gap-1 text-[11px] text-white/40">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={entry.repsPerRound ?? ""}
          placeholder="—"
          aria-label="Répétitions par tour"
          onChange={(e) => onChange({ repsPerRound: numberOrUndefined(e.target.value) })}
          className={`w-14 rounded border border-ink-600 ${box} px-1.5 py-1 text-center text-sm tabular-nums outline-none focus:border-neon-violet`}
        />
        reps/tour
      </label>

      <label className="flex items-center gap-1 text-[11px] text-white/40">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={entry.rounds ?? ""}
          placeholder="—"
          aria-label="Nombre de tours"
          onChange={(e) => onChange({ rounds: numberOrUndefined(e.target.value) })}
          className={`w-14 rounded border border-ink-600 ${box} px-1.5 py-1 text-center text-sm tabular-nums outline-none focus:border-neon-violet`}
        />
        tours
      </label>
    </div>
  );
}

function numberOrUndefined(raw: string): number | undefined {
  if (raw === "") return undefined;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}
