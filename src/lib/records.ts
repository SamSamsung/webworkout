/**
 * Gestion des records personnels.
 *
 * Chaque exercice a une métrique propre : comparer deux performances demande
 * donc un score normalisé. Pour les exercices chargés, on utilise le 1RM
 * estimé, ce qui permet de comparer « 5 × 100 kg » et « 10 × 85 kg ».
 */
import type { Exercise } from "@/types/exercise";
import type { PersonalRecord, RecordEntry } from "@/types/app";
import { EXERCISES_BY_ID } from "@/data/exercises";
import { estimateOneRmConsensus } from "./calculs";
import { formatDuration, isProtocol, protocolScore } from "./sets";

// Réexporté pour les nombreux écrans qui l'importaient déjà d'ici.
export { formatDuration };

/**
 * Score normalisé d'une performance : plus il est élevé, meilleure elle est.
 * L'unité varie selon la métrique, mais la comparaison reste valide au sein
 * d'un même exercice, ce qui est le seul usage.
 */
export function scoreRecord(exercise: Exercise, entry: Omit<RecordEntry, "score" | "date">): number {
  // Un format se juge au travail accompli, pas à sa seule durée : voir
  // `protocolScore`. La règle vaut pour toutes ses performances, y compris
  // celles enregistrées avant l'ajout des répétitions par tour, pour que les
  // anciennes et les nouvelles restent sur la même échelle.
  if (isProtocol(exercise)) return protocolScore(entry);

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
      return entry.reps ?? 0;
    case "calories":
      // `reps` en repli : ancien emplacement des calories machine.
      return entry.calories ?? entry.reps ?? 0;
    case "temps":
      return entry.seconds ?? 0;
    case "distance":
      return entry.meters ?? 0;
  }
}

/** Construit une entrée de record complète (score + date). */
export function makeRecordEntry(
  exercise: Exercise,
  values: Pick<
    RecordEntry,
    | "reps"
    | "weight"
    | "seconds"
    | "meters"
    | "calories"
    | "targetExerciseId"
    | "repsPerRound"
    | "rounds"
    | "fromWorkoutId"
  >,
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
  // Le score du meilleur est recalculé plutôt que relu : une performance
  // enregistrée sous une version antérieure du barème se comparerait sinon
  // sur une autre échelle, et resterait imbattable.
  const isNewBest = entry.score > scoreRecord(exercise, existing.best);
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
  return [formatMetric(exercise, entry), formatProtocol(entry)].filter(Boolean).join(" · ");
}

/** Valeur brute de la métrique. */
function formatMetric(exercise: Exercise, entry: RecordEntry): string {
  switch (exercise.metric) {
    case "poids-reps":
      return `${entry.weight ?? 0} kg × ${entry.reps ?? 0}`;
    case "reps-lestees":
      return entry.weight ? `${entry.reps ?? 0} reps +${entry.weight} kg` : `${entry.reps ?? 0} reps`;
    case "reps":
      return `${entry.reps ?? 0} reps`;
    case "calories":
      return `${entry.calories ?? entry.reps ?? 0} kcal`;
    case "temps":
      return formatDuration(entry.seconds ?? 0);
    case "distance":
      return (entry.meters ?? 0) >= 1000
        ? `${((entry.meters ?? 0) / 1000).toFixed(2)} km`
        : `${entry.meters ?? 0} m`;
  }
}

/**
 * Contexte d'un format : « 8 × Traction en pronation ».
 * Piloté par la présence des données, et non par le type d'exercice, pour que
 * ce module reste indépendant de `lib/sets.ts` — qui, lui, en dépend.
 */
function formatProtocol(entry: RecordEntry): string {
  const target = entry.targetExerciseId ? EXERCISES_BY_ID.get(entry.targetExerciseId) : undefined;
  if (!entry.repsPerRound && !target) return "";
  const movement = entry.repsPerRound
    ? `${entry.repsPerRound} × ${target ? target.name : "reps"}`
    : (target?.name ?? "");
  // Les tours ne sont affichés que s'ils ont été saisis : pour un EMOM, la
  // durée les donne déjà (un tour par minute), et le répéter alourdit la ligne.
  if (!entry.rounds) return movement;
  return `${movement} · ${entry.rounds} tour${entry.rounds > 1 ? "s" : ""}`;
}

/** Progression en pourcentage entre la première et la dernière performance. */
export function progressionPercent(record: PersonalRecord): number | null {
  if (record.history.length < 2) return null;
  const first = record.history[0].score;
  const last = record.history[record.history.length - 1].score;
  if (first <= 0) return null;
  return ((last - first) / first) * 100;
}
