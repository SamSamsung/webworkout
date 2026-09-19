/**
 * Gestion des records personnels.
 *
 * Chaque exercice a une métrique propre : comparer deux performances demande
 * donc un score normalisé. Pour les exercices chargés, on utilise le 1RM
 * estimé, ce qui permet de comparer « 5 × 100 kg » et « 10 × 85 kg ».
 */
import type { Exercise } from "@/types/exercise";
import type { PersonalRecord, RecordEntry } from "@/types/app";
import { estimateOneRmConsensus } from "./calculs";

/**
 * Score normalisé d'une performance : plus il est élevé, meilleure elle est.
 * L'unité varie selon la métrique, mais la comparaison reste valide au sein
 * d'un même exercice, ce qui est le seul usage.
 */
export function scoreRecord(exercise: Exercise, entry: Omit<RecordEntry, "score" | "date">): number {
  switch (exercise.metric) {
    case "poids-reps":
      // 1RM estimé : permet de comparer des séries de longueurs différentes.
      return Math.round(estimateOneRmConsensus(entry.weight ?? 0, entry.reps ?? 1) * 100) / 100;
    case "reps-lestees": {
      // Le lest compte pour beaucoup plus qu'une répétition supplémentaire.
      const reps = entry.reps ?? 0;
      const load = entry.weight ?? 0;
      return Math.round((reps + load * 0.6) * 100) / 100;
    }
    case "reps":
    case "calories":
      return entry.reps ?? 0;
    case "temps":
      return entry.seconds ?? 0;
    case "distance":
      return entry.meters ?? 0;
  }
}

/** Construit une entrée de record complète (score + date). */
export function makeRecordEntry(
  exercise: Exercise,
  values: Pick<RecordEntry, "reps" | "weight" | "seconds" | "meters" | "fromWorkoutId">,
  date = new Date().toISOString(),
): RecordEntry {
  return { ...values, date, score: scoreRecord(exercise, values) };
}

/**
 * Intègre une performance dans le record d'un exercice.
 * Renvoie le record mis à jour et indique s'il s'agit d'un nouveau record.
 */
export function applyRecord(
  exercise: Exercise,
  existing: PersonalRecord | undefined,
  entry: RecordEntry,
): { record: PersonalRecord; isNewBest: boolean } {
  if (!existing) {
    return {
      record: { exerciseId: exercise.id, metric: exercise.metric, best: entry, history: [entry] },
      isNewBest: true,
    };
  }
  const isNewBest = entry.score > existing.best.score;
  return {
    record: {
      ...existing,
      best: isNewBest ? entry : existing.best,
      // L'historique reste trié par date pour alimenter directement les courbes.
      history: [...existing.history, entry].sort((a, b) => a.date.localeCompare(b.date)),
    },
    isNewBest,
  };
}

/** Formate une performance pour l'affichage, selon la métrique de l'exercice. */
export function formatRecord(exercise: Exercise, entry: RecordEntry): string {
  switch (exercise.metric) {
    case "poids-reps":
      return `${entry.weight ?? 0} kg × ${entry.reps ?? 0}`;
    case "reps-lestees":
      return entry.weight ? `${entry.reps ?? 0} reps +${entry.weight} kg` : `${entry.reps ?? 0} reps`;
    case "reps":
      return `${entry.reps ?? 0} reps`;
    case "calories":
      return `${entry.reps ?? 0} kcal`;
    case "temps":
      return formatDuration(entry.seconds ?? 0);
    case "distance":
      return (entry.meters ?? 0) >= 1000
        ? `${((entry.meters ?? 0) / 1000).toFixed(2)} km`
        : `${entry.meters ?? 0} m`;
  }
}

/** Formate une durée en `1 h 05 min`, `12 min 30 s` ou `45 s`. */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h} h ${String(m).padStart(2, "0")} min`;
  if (m > 0) return sec > 0 ? `${m} min ${String(sec).padStart(2, "0")} s` : `${m} min`;
  return `${sec} s`;
}

/** Progression en pourcentage entre la première et la dernière performance. */
export function progressionPercent(record: PersonalRecord): number | null {
  if (record.history.length < 2) return null;
  const first = record.history[0].score;
  const last = record.history[record.history.length - 1].score;
  if (first <= 0) return null;
  return ((last - first) / first) * 100;
}
