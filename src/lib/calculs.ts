/**
 * Calculateurs : 1RM, dépense énergétique, fréquence cardiaque, repos.
 * Ces formules sont des estimations largement utilisées dans la littérature
 * d'entraînement ; elles ne remplacent pas un test réel ni un avis médical.
 */
import type { Exercise } from "@/types/exercise";

/** Formules de 1RM disponibles. Les résultats divergent surtout au-delà de 10 reps. */
export const ONE_RM_FORMULAS = {
  /** Epley (1985) — la plus répandue, tendance à surestimer au-delà de 10 reps. */
  epley: (weight: number, reps: number) => weight * (1 + reps / 30),
  /** Brzycki (1993) — plus conservatrice, fiable jusqu'à 10 reps. */
  brzycki: (weight: number, reps: number) => weight * (36 / (37 - reps)),
  /** Lombardi — courbe puissance, intermédiaire. */
  lombardi: (weight: number, reps: number) => weight * Math.pow(reps, 0.1),
  /** O'Conner — très conservatrice. */
  oconner: (weight: number, reps: number) => weight * (1 + reps / 40),
} as const;

export type OneRmFormula = keyof typeof ONE_RM_FORMULAS;

export const ONE_RM_FORMULA_LABELS: Record<OneRmFormula, string> = {
  epley: "Epley",
  brzycki: "Brzycki",
  lombardi: "Lombardi",
  oconner: "O'Conner",
};

/**
 * Estime le 1RM à partir d'une performance sous-maximale.
 * Au-delà de 12 répétitions, toutes les formules perdent en fiabilité :
 * on le signale via `reliable`.
 */
export function estimateOneRm(
  weight: number,
  reps: number,
  formula: OneRmFormula = "epley",
): { value: number; reliable: boolean } {
  if (reps <= 0 || weight <= 0) return { value: 0, reliable: false };
  if (reps === 1) return { value: weight, reliable: true };
  // Brzycki diverge à 37 répétitions (division par zéro) : on borne.
  const safeReps = Math.min(reps, 30);
  return { value: ONE_RM_FORMULAS[formula](weight, safeReps), reliable: reps <= 12 };
}

/** Moyenne des quatre formules : plus robuste qu'une seule estimation. */
export function estimateOneRmConsensus(weight: number, reps: number): number {
  const values = (Object.keys(ONE_RM_FORMULAS) as OneRmFormula[]).map(
    (f) => estimateOneRm(weight, reps, f).value,
  );
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Table de charges en pourcentage du 1RM, avec le nombre de répétitions
 * généralement réalisable. Référence classique de la programmation en force.
 */
export const RM_PERCENT_TABLE: Array<{ percent: number; reps: number }> = [
  { percent: 100, reps: 1 },
  { percent: 95, reps: 2 },
  { percent: 93, reps: 3 },
  { percent: 90, reps: 4 },
  { percent: 87, reps: 5 },
  { percent: 85, reps: 6 },
  { percent: 83, reps: 7 },
  { percent: 80, reps: 8 },
  { percent: 77, reps: 9 },
  { percent: 75, reps: 10 },
  { percent: 70, reps: 12 },
  { percent: 67, reps: 15 },
  { percent: 60, reps: 20 },
];

/**
 * Dépense énergétique estimée par la méthode des MET.
 * kcal = MET × poids(kg) × durée(h). C'est une approximation : la dépense
 * réelle dépend de l'intensité, de la composition corporelle et du repos.
 */
export function estimateCalories(met: number, bodyweightKg: number, seconds: number): number {
  return (met * bodyweightKg * seconds) / 3600;
}

/** Dépense estimée d'une séance à partir de ses exercices et de sa durée. */
export function sessionCalories(
  exercises: Array<{ exercise: Exercise; activeSeconds: number }>,
  bodyweightKg: number,
): number {
  return Math.round(
    exercises.reduce(
      (total, { exercise, activeSeconds }) =>
        total + estimateCalories(exercise.met ?? 5, bodyweightKg, activeSeconds),
      0,
    ),
  );
}

/** Fréquence cardiaque maximale estimée (formule de Tanaka, plus fiable que 220 − âge). */
export function maxHeartRate(age: number): number {
  return Math.round(208 - 0.7 * age);
}

/** Zones cardiaques classiques, en pourcentage de la FC max. */
export function heartRateZones(age: number) {
  const max = maxHeartRate(age);
  const z = (lo: number, hi: number) => [Math.round(max * lo), Math.round(max * hi)] as const;
  return [
    { name: "Z1 — Récupération", range: z(0.5, 0.6), color: "#34d399", usage: "Échauffement, retour au calme" },
    { name: "Z2 — Endurance", range: z(0.6, 0.7), color: "#60a5fa", usage: "Base aérobie, longues sorties" },
    { name: "Z3 — Tempo", range: z(0.7, 0.8), color: "#fbbf24", usage: "Allure soutenue régulière" },
    { name: "Z4 — Seuil", range: z(0.8, 0.9), color: "#fb923c", usage: "Fractionné long, seuil lactique" },
    { name: "Z5 — Maximale", range: z(0.9, 1), color: "#fb7185", usage: "Intervalles courts, VMA" },
  ];
}

/**
 * Repos conseillé selon l'objectif, en secondes.
 * Sources convergentes de la littérature : la force nécessite une
 * récupération quasi complète du système nerveux, l'hypertrophie tolère
 * des repos plus courts, l'endurance les raccourcit encore.
 */
export function recommendedRest(goal: string, exercise: Exercise): [number, number] {
  const [lo, hi] = exercise.restSeconds;
  switch (goal) {
    case "force":
      return [Math.max(lo, 150), Math.max(hi, 300)];
    case "hypertrophie":
      return [lo, hi];
    case "endurance":
    case "perte-de-poids":
      return [Math.round(lo * 0.5), Math.round(hi * 0.6)];
    default:
      return [lo, hi];
  }
}

/** Indice de masse corporelle, avec sa catégorie. */
export function bmi(weightKg: number, heightCm: number): { value: number; label: string } {
  const h = heightCm / 100;
  const value = weightKg / (h * h);
  const label =
    value < 18.5 ? "Insuffisance pondérale" : value < 25 ? "Corpulence normale" : value < 30 ? "Surpoids" : "Obésité";
  return { value, label };
}

/**
 * Métabolisme de base selon Mifflin-St Jeor, plus fiable que Harris-Benedict
 * sur les populations contemporaines.
 */
export function basalMetabolicRate(
  weightKg: number,
  heightCm: number,
  age: number,
  sex: "homme" | "femme",
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(sex === "homme" ? base + 5 : base - 161);
}

/** Convertit une charge en pourcentage du 1RM. */
export function percentOfOneRm(weight: number, oneRm: number): number {
  return oneRm > 0 ? (weight / oneRm) * 100 : 0;
}

/** Arrondit une charge au multiple de 2,5 kg le plus proche (plus petits disques courants). */
export function roundToPlate(weight: number, step = 2.5): number {
  return Math.round(weight / step) * step;
}
