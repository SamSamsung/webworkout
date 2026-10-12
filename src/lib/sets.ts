/**
 * Champs saisissables d'une série, et lesquels proposer pour un exercice.
 *
 * Chaque exercice a une métrique principale — celle qui fait foi pour l'XP et
 * les records. Mais une séance réelle sur machine ne tient pas dans une seule
 * valeur : trente minutes de vélo, c'est aussi une distance, des calories au
 * compteur et un niveau de résistance. Ces champs supplémentaires sont donc
 * proposés, tous facultatifs, pour les exercices de cardio.
 *
 * Point important : ils sont *descriptifs*. L'XP et les records restent
 * calculés sur un seul champ (voir `lib/xp.ts`), sinon remplir trois cases
 * pour un même effort le compterait trois fois.
 */
import type { Equipment, Exercise } from "@/types/exercise";
import type { WorkoutExercise, WorkoutSet } from "@/types/app";
import { EXERCISES_BY_ID } from "@/data/exercises";
import { formatDuration } from "./records";

export type SetField = "reps" | "weight" | "seconds" | "meters" | "calories" | "level";

export const FIELD_META: Record<
  SetField,
  { label: string; suffix: string; step: number; hint: string }
> = {
  reps: { label: "Répétitions", suffix: "reps", step: 1, hint: "Nombre de répétitions" },
  weight: { label: "Charge", suffix: "kg", step: 0.5, hint: "Charge additionnelle en kilogrammes" },
  seconds: { label: "Durée", suffix: "min:s", step: 1, hint: "Durée de l'effort" },
  meters: { label: "Distance", suffix: "m", step: 10, hint: "Distance parcourue, en mètres" },
  calories: { label: "Calories", suffix: "kcal", step: 1, hint: "Calories affichées par la machine" },
  level: { label: "Niveau", suffix: "niv.", step: 1, hint: "Résistance, pente ou programme de la machine" },
};

/** Champ qui porte la performance : celui qui compte pour l'XP et le record. */
export function primaryField(exercise: Exercise): SetField {
  switch (exercise.metric) {
    case "temps":
      return "seconds";
    case "distance":
      return "meters";
    case "calories":
      return "calories";
    default:
      return "reps";
  }
}

/**
 * Matériel qui affiche un écran de bord.
 *
 * C'est lui, et non la catégorie « cardio », qui justifie les champs annexes :
 * un vélo donne distance, calories et résistance, un EMOM au poids du corps
 * ne donne rien de tout cela et n'a donc pas à proposer ces cases.
 */
const CARDIO_MACHINES = new Set<Equipment>([
  "velo",
  "rameur",
  "tapis-de-course",
  "ski-erg",
  "assault-bike",
  "machine",
]);

/** `true` si l'exercice se pratique sur une machine à console. */
export function usesCardioMachine(exercise: Exercise): boolean {
  return exercise.category === "cardio" && exercise.equipment.some((e) => CARDIO_MACHINES.has(e));
}

/**
 * Champs affichés pour un exercice, dans l'ordre de saisie.
 *
 * Le principe : ne proposer que ce que l'utilisateur a réellement sous les
 * yeux. Une machine affiche tout à la fois ; une course se mesure en distance
 * et en temps ; un format au poids du corps se note d'une seule valeur.
 */
export function setFields(exercise: Exercise): { primary: SetField; extra: SetField[] } {
  const primary = primaryField(exercise);

  if (usesCardioMachine(exercise)) {
    const extra = (["seconds", "meters", "calories", "level"] as const).filter((f) => f !== primary);
    return { primary, extra };
  }

  // Une distance parcourue a toujours un chrono : « 5 km en 27 min ». En
  // revanche, ni calories ni niveau de résistance hors machine.
  if (exercise.metric === "distance") return { primary, extra: ["seconds"] };

  const weighted = exercise.metric === "poids-reps" || exercise.metric === "reps-lestees";
  return { primary, extra: weighted ? ["weight"] : [] };
}

/** Tous les champs d'un exercice, principal en tête. */
export function allFields(exercise: Exercise): SetField[] {
  const { primary, extra } = setFields(exercise);
  return [primary, ...extra];
}

/** Valeur d'un champ dans une série. */
export function fieldValue(set: WorkoutSet, field: SetField): number | undefined {
  return set[field];
}

/** Série vide cohérente avec la métrique, utilisée à l'ajout d'un exercice. */
export function defaultSet(exercise: Exercise): WorkoutSet {
  switch (primaryField(exercise)) {
    case "seconds":
      return { seconds: exercise.repRange?.[0] ?? 30 };
    case "meters":
      return { meters: exercise.repRange?.[0] ?? 200 };
    case "calories":
      return { calories: exercise.repRange?.[0] ?? 20 };
    default:
      return { reps: exercise.repRange?.[0] ?? 10 };
  }
}

/** « 12,4 km » au-delà du kilomètre, « 800 m » en deçà. */
export function formatDistance(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(2).replace(/[.,]?0+$/, "").replace(".", ",")} km` : `${meters} m`;
}

/** Résumé d'une série : « 30 min · 12,4 km · 310 kcal · niv. 8 ». */
export function describeSet(exercise: Exercise, set: WorkoutSet): string {
  const parts: string[] = [];
  for (const field of allFields(exercise)) {
    const value = fieldValue(set, field);
    if (!value) continue;
    if (field === "seconds") parts.push(formatDuration(value));
    else if (field === "meters") parts.push(formatDistance(value));
    else if (field === "calories") parts.push(`${value} kcal`);
    else if (field === "level") parts.push(`niv. ${value}`);
    else if (field === "weight") parts.push(`${value} kg`);
    else parts.push(`${value} reps`);
  }
  return parts.join(" · ");
}

/**
 * `true` pour un format d'entraînement — EMOM, Tabata, AMRAP.
 *
 * Ces fiches ne décrivent pas un mouvement mais une façon d'organiser le
 * temps : elles n'ont de sens qu'accompagnées de l'exercice qu'on y réalise.
 * Le repérage passe par le tag « format », pour qu'ajouter un protocole à la
 * base suffise à l'activer, sans toucher au code.
 */
export function isProtocol(exercise: Exercise): boolean {
  return exercise.tags?.includes("format") ?? false;
}

/** « 8 × Traction en pronation · 10 tours », selon ce qui est renseigné. */
export function describeProtocol(entry: WorkoutExercise): string {
  const target = entry.targetExerciseId ? EXERCISES_BY_ID.get(entry.targetExerciseId) : undefined;
  const parts: string[] = [];
  if (target) parts.push(entry.repsPerRound ? `${entry.repsPerRound} × ${target.name}` : target.name);
  else if (entry.repsPerRound) parts.push(`${entry.repsPerRound} reps/tour`);
  if (entry.rounds) parts.push(`${entry.rounds} tour${entry.rounds > 1 ? "s" : ""}`);
  return parts.join(" · ");
}

/** Résumé complet d'un exercice de séance : valeurs de la série et format. */
export function describeEntry(exercise: Exercise, entry: WorkoutExercise): string {
  const base =
    entry.sets.length === 1
      ? describeSet(exercise, entry.sets[0])
      : `${entry.sets.length} séries`;
  const protocol = isProtocol(exercise) ? describeProtocol(entry) : "";
  return [base, protocol].filter(Boolean).join(" · ");
}
