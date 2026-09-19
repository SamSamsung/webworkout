/**
 * Système d'XP et de niveaux.
 *
 * Principe : l'XP récompense le *travail réel* (volume × difficulté × durée)
 * et non le temps passé sur le site. Un exercice difficile ou un exercice
 * lesté rapporte plus qu'une série facile, et le multiplicateur `xpFactor`
 * de chaque fiche permet d'ajuster finement au cas par cas.
 */
import type { Exercise } from "@/types/exercise";
import type { WorkoutExercise, WorkoutSet } from "@/types/app";

/** Bonus multiplicatif appliqué selon la difficulté de l'exercice (1 → 5). */
const DIFFICULTY_MULTIPLIER = [1, 1, 1.15, 1.35, 1.6, 1.9] as const;

/**
 * XP d'une série unique.
 *
 * Les échelles sont calibrées pour qu'une série « sérieuse » rapporte
 * grossièrement 10 à 30 XP, quelle que soit la métrique :
 * - charge : 10 reps à 60 kg ≈ 60 XP de volume brut ÷ 10 = 6 × facteurs
 * - poids du corps : 10 pompes ≈ 12 XP
 * - temps : 60 s de gainage ≈ 12 XP
 * - distance : 1 km de course ≈ 20 XP
 */
export function setXp(exercise: Exercise, set: WorkoutSet, bodyweightKg = 75): number {
  const diff = DIFFICULTY_MULTIPLIER[exercise.difficulty] ?? 1;
  const factor = exercise.xpFactor * diff;
  let base = 0;

  switch (exercise.metric) {
    case "poids-reps": {
      const volume = (set.weight ?? 0) * (set.reps ?? 0);
      base = volume / 10;
      break;
    }
    case "reps-lestees": {
      // Le poids du corps compte pour une fraction de la charge déplacée :
      // on utilise 35 % pour éviter que 10 pompes ne valent 10 squats lourds.
      const effective = bodyweightKg * 0.35 + (set.weight ?? 0);
      base = (effective * (set.reps ?? 0)) / 22;
      break;
    }
    case "reps": {
      base = (set.reps ?? 0) * 1.2;
      break;
    }
    case "temps": {
      base = (set.seconds ?? 0) / 5;
      break;
    }
    case "distance": {
      base = (set.meters ?? 0) / 50;
      break;
    }
    case "calories": {
      base = (set.reps ?? 0) * 1.5;
      break;
    }
  }

  // Un mouvement unilatéral est réalisé des deux côtés : le travail est double.
  if (exercise.unilateral) base *= 1.7;

  return Math.round(base * factor);
}

/** XP cumulée d'un exercice complet (toutes séries validées). */
export function exerciseXp(exercise: Exercise, entry: WorkoutExercise, bodyweightKg = 75): number {
  return entry.sets
    .filter((s) => s.done !== false)
    .reduce((total, set) => total + setXp(exercise, set, bodyweightKg), 0);
}

/** Volume total soulevé, en kilogrammes (séries chargées uniquement). */
export function setVolumeKg(exercise: Exercise, set: WorkoutSet, bodyweightKg = 75): number {
  if (exercise.metric === "poids-reps") return (set.weight ?? 0) * (set.reps ?? 0);
  if (exercise.metric === "reps-lestees") {
    return (bodyweightKg * 0.35 + (set.weight ?? 0)) * (set.reps ?? 0);
  }
  return 0;
}

// ---------------------------------------------------------------- Niveaux

/**
 * XP nécessaire pour passer du niveau `level` au suivant.
 * Progression volontairement douce au début (on veut voir le niveau 5 vite)
 * puis nettement plus exigeante ensuite.
 */
export function xpForNextLevel(level: number): number {
  return Math.round(120 * Math.pow(level, 1.45));
}

/** XP cumulée nécessaire pour atteindre un niveau donné. */
export function totalXpForLevel(level: number): number {
  let total = 0;
  for (let l = 1; l < level; l++) total += xpForNextLevel(l);
  return total;
}

/** Détail du niveau courant à partir de l'XP totale. */
export function levelFromXp(xp: number): {
  level: number;
  /** XP accumulée dans le niveau courant. */
  xpIntoLevel: number;
  /** XP nécessaire pour terminer le niveau courant. */
  xpForLevel: number;
  /** Progression dans le niveau, de 0 à 1. */
  progress: number;
  title: string;
} {
  let level = 1;
  let remaining = Math.max(0, xp);
  // Garde-fou : le niveau 200 plafonne la boucle.
  while (level < 200 && remaining >= xpForNextLevel(level)) {
    remaining -= xpForNextLevel(level);
    level++;
  }
  const need = xpForNextLevel(level);
  return {
    level,
    xpIntoLevel: Math.round(remaining),
    xpForLevel: need,
    progress: Math.min(1, remaining / need),
    title: rankTitle(level),
  };
}

/** Paliers de titres, dans l'esprit RPG du site. */
const RANKS: Array<{ from: number; title: string; icon: string }> = [
  { from: 1, title: "Poussin de fonte", icon: "🐣" },
  { from: 5, title: "Apprenti de la barre", icon: "🪶" },
  { from: 10, title: "Écuyer d'acier", icon: "🛡️" },
  { from: 16, title: "Chevalier des haltères", icon: "⚔️" },
  { from: 24, title: "Vétéran du rack", icon: "🎖️" },
  { from: 34, title: "Champion de la fonte", icon: "🏆" },
  { from: 46, title: "Maître de gravité", icon: "🌀" },
  { from: 60, title: "Titan", icon: "🗿" },
  { from: 80, title: "Colosse", icon: "🏛️" },
  { from: 100, title: "Légende vivante", icon: "🔥" },
];

export function rankTitle(level: number): string {
  return [...RANKS].reverse().find((r) => level >= r.from)?.title ?? "Poussin de fonte";
}

export function rankIcon(level: number): string {
  return [...RANKS].reverse().find((r) => level >= r.from)?.icon ?? "🐣";
}

export { RANKS };
