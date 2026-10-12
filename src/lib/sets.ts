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
import type { Exercise } from "@/types/exercise";
import type { WorkoutSet } from "@/types/app";
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
 * Champs affichés pour un exercice, dans l'ordre de saisie.
 *
 * Hors cardio, on s'en tient au strict nécessaire : ajouter « distance » sous
 * un développé couché n'aide personne. Le cardio, lui, se pratique sur des
 * machines qui affichent tout à la fois, et c'est exactement ce que
 * l'utilisateur a sous les yeux au moment de saisir.
 */
export function setFields(exercise: Exercise): { primary: SetField; extra: SetField[] } {
  const primary = primaryField(exercise);

  if (exercise.category === "cardio") {
    const extra = (["seconds", "meters", "calories", "level"] as const).filter((f) => f !== primary);
    return { primary, extra };
  }

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
