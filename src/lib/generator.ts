/**
 * Générateur de séance automatique.
 *
 * Entrées : objectif, matériel disponible, durée, niveau et zone ciblée.
 * Sortie : une séance équilibrée, avec séries, répétitions et repos adaptés.
 *
 * L'algorithme suit une logique de préparateur : on choisit d'abord un ou
 * deux mouvements polyarticulaires lourds, puis on complète avec des
 * accessoires couvrant les schémas moteurs manquants, et on termine par du
 * gainage ou du cardio selon l'objectif.
 */
import type { Difficulty, Equipment, Exercise, ForceType, MuscleGroup } from "@/types/exercise";
import type { Goal, WorkoutExercise, WorkoutTemplate } from "@/types/app";
import { EXERCISES } from "@/data/exercises";

export interface GeneratorOptions {
  goal: Goal;
  /** Matériel disponible ; « aucun » est toujours implicitement disponible. */
  equipment: Equipment[];
  /** Durée visée en minutes. */
  minutes: number;
  /** Niveau du pratiquant : borne la difficulté des exercices retenus. */
  level: Difficulty;
  /** Zone du corps ciblée ; `full` répartit sur tout le corps. */
  focus: "full" | "haut" | "bas" | "push" | "pull" | "core" | "cardio";
  /** Exercices à exclure (blessure, matériel indisponible, préférence). */
  exclude?: string[];
  /** Graine de tirage, pour rendre la génération reproductible. */
  seed?: number;
}

/** Schémas moteurs à couvrir selon la zone ciblée, dans l'ordre de priorité. */
const FOCUS_PATTERNS: Record<GeneratorOptions["focus"], ForceType[]> = {
  full: ["squat", "poussee-horizontale", "tirage-horizontal", "extension-de-hanche", "poussee-verticale", "tirage-vertical", "isometrie"],
  haut: ["poussee-horizontale", "tirage-horizontal", "poussee-verticale", "tirage-vertical", "isometrie"],
  bas: ["squat", "extension-de-hanche", "fente", "flexion-de-hanche", "isometrie"],
  push: ["poussee-horizontale", "poussee-verticale", "poussee-horizontale", "poussee-verticale", "isometrie"],
  pull: ["tirage-vertical", "tirage-horizontal", "tirage-vertical", "tirage-horizontal", "isometrie"],
  core: ["isometrie", "rotation", "anti-rotation", "flexion-de-hanche", "isometrie"],
  cardio: ["locomotion", "explosif", "locomotion", "explosif", "isometrie"],
};

/** Paramètres de série selon l'objectif. */
const GOAL_PRESCRIPTION: Record<Goal, { sets: number; reps: [number, number]; restFactor: number; seconds?: number }> = {
  force: { sets: 5, reps: [3, 6], restFactor: 1.6 },
  hypertrophie: { sets: 4, reps: [8, 12], restFactor: 1 },
  endurance: { sets: 3, reps: [15, 25], restFactor: 0.6 },
  "perte-de-poids": { sets: 4, reps: [12, 20], restFactor: 0.5 },
  mobilite: { sets: 2, reps: [8, 12], restFactor: 0.5 },
  general: { sets: 3, reps: [8, 15], restFactor: 0.9 },
};

/** Générateur pseudo-aléatoire déterministe (xorshift 32 bits). */
function makeRng(seed: number) {
  let s = seed || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

/** L'exercice est-il réalisable avec le matériel déclaré ? */
function isAvailable(ex: Exercise, equipment: Set<Equipment>): boolean {
  return ex.equipment.every((e) => e === "aucun" || equipment.has(e));
}

/** Nombre d'exercices tenant dans la durée demandée. */
function exerciseCount(minutes: number, goal: Goal): number {
  const perExercise = goal === "force" ? 9 : goal === "hypertrophie" ? 7 : 5;
  return Math.max(3, Math.min(10, Math.round((minutes - 8) / perExercise)));
}

/**
 * Génère une séance complète.
 * La fonction est pure : même options et même graine donnent la même séance.
 */
export function generateWorkout(options: GeneratorOptions): WorkoutTemplate {
  const rng = makeRng(options.seed ?? Date.now() % 100000);
  const equipment = new Set<Equipment>([...options.equipment, "aucun"]);
  const excluded = new Set(options.exclude ?? []);
  const prescription = GOAL_PRESCRIPTION[options.goal];
  const target = exerciseCount(options.minutes, options.goal);
  const patterns = FOCUS_PATTERNS[options.focus];

  const pool = EXERCISES.filter(
    (ex) =>
      !excluded.has(ex.id) &&
      ex.difficulty <= Math.min(5, options.level + 1) &&
      isAvailable(ex, equipment) &&
      ex.category !== "étirement" &&
      ex.category !== "rééducation",
  );

  const chosen: Exercise[] = [];
  const usedFamilies = new Set<string>();
  const usedGroups = new Map<MuscleGroup, number>();

  /** Sélectionne le meilleur candidat pour un schéma moteur donné. */
  const pick = (pattern: ForceType, preferCompound: boolean): Exercise | undefined => {
    const candidates = pool.filter(
      (ex) =>
        ex.force === pattern &&
        !usedFamilies.has(ex.family) &&
        !chosen.some((c) => c.id === ex.id) &&
        (!preferCompound || ex.mechanic === "polyarticulaire"),
    );
    if (!candidates.length) return undefined;

    // Score : proximité du niveau, variété des groupes, part d'aléatoire
    // pour que deux générations consécutives ne soient pas identiques.
    const scored = candidates.map((ex) => {
      const levelFit = 3 - Math.abs(ex.difficulty - options.level);
      const groupPenalty = (usedGroups.get(ex.group) ?? 0) * 2.5;
      const staple = ex.tags?.includes("incontournable") ? 2 : 0;
      return { ex, score: levelFit + staple - groupPenalty + rng() * 2.5 };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored[0]?.ex;
  };

  for (let i = 0; i < target; i++) {
    const pattern = patterns[i % patterns.length];
    // Les deux premiers exercices sont polyarticulaires : on attaque frais.
    const ex = pick(pattern, i < 2) ?? pick(pattern, false);
    if (!ex) continue;
    chosen.push(ex);
    usedFamilies.add(ex.family);
    usedGroups.set(ex.group, (usedGroups.get(ex.group) ?? 0) + 1);
  }

  // Si les schémas moteurs n'ont pas suffi, on complète avec les meilleurs
  // candidats restants pour respecter la durée demandée.
  while (chosen.length < target) {
    const fallback = pool.find((ex) => !chosen.some((c) => c.id === ex.id) && !usedFamilies.has(ex.family));
    if (!fallback) break;
    chosen.push(fallback);
    usedFamilies.add(fallback.family);
  }

  const exercises: WorkoutExercise[] = chosen.map((ex) => buildEntry(ex, prescription));

  return {
    id: `gen-${Date.now().toString(36)}`,
    name: workoutName(options),
    description: `Séance générée : ${options.minutes} min · objectif ${options.goal} · zone ${options.focus}.`,
    exercises,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    generated: true,
    tags: [options.goal, options.focus],
  };
}

/** Traduit une prescription en séries concrètes selon la métrique de l'exercice. */
function buildEntry(ex: Exercise, p: (typeof GOAL_PRESCRIPTION)[Goal]): WorkoutExercise {
  const rest = Math.round(((ex.restSeconds[0] + ex.restSeconds[1]) / 2) * p.restFactor);
  const sets = Array.from({ length: p.sets }, () => {
    switch (ex.metric) {
      case "temps":
        return { seconds: clamp(Math.round((ex.repRange?.[0] ?? 30) * 1.2), 15, 180) };
      case "distance":
        return { meters: ex.repRange?.[0] ?? 200 };
      case "calories":
        return { reps: 12 };
      default: {
        // On croise la fourchette de l'objectif et celle de l'exercice.
        const lo = Math.max(p.reps[0], ex.repRange?.[0] ?? p.reps[0]);
        const hi = Math.min(Math.max(lo, p.reps[1]), ex.repRange?.[1] ?? p.reps[1]);
        return { reps: Math.round((lo + hi) / 2) };
      }
    }
  });
  return { exerciseId: ex.id, sets, restSeconds: rest };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Nom lisible et un peu enlevé, dans le ton du site. */
function workoutName(options: GeneratorOptions): string {
  const focusLabel: Record<GeneratorOptions["focus"], string> = {
    full: "Corps entier",
    haut: "Haut du corps",
    bas: "Bas du corps",
    push: "Poussée",
    pull: "Tirage",
    core: "Gainage & tronc",
    cardio: "Cardio",
  };
  const goalLabel: Record<Goal, string> = {
    force: "Force",
    hypertrophie: "Volume",
    endurance: "Endurance",
    "perte-de-poids": "Brûle-graisse",
    mobilite: "Mobilité",
    general: "Équilibre",
  };
  return `${focusLabel[options.focus]} · ${goalLabel[options.goal]} ${options.minutes} min`;
}

/** Libellés des zones, réutilisés par l'interface du générateur. */
export const FOCUS_LABELS: Record<GeneratorOptions["focus"], string> = {
  full: "Corps entier",
  haut: "Haut du corps",
  bas: "Bas du corps",
  push: "Poussée (pecs, épaules, triceps)",
  pull: "Tirage (dos, biceps)",
  core: "Gainage & abdominaux",
  cardio: "Cardio & conditionnement",
};
