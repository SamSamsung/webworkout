/**
 * Quêtes hebdomadaires et défi du jour.
 *
 * Les deux sont générés de façon déterministe à partir de la date : tous les
 * joueurs voient le même défi du jour, et les quêtes d'une semaine restent
 * stables même si l'on recharge la page.
 */
import type { AppState, Quest } from "@/types/app";
import { EXERCISES, EXERCISES_BY_ID } from "@/data/exercises";
import { GROUP_META } from "@/data/taxonomy";
import { dayKey, isoWeek } from "./streak";

/** Hachage déterministe d'une chaîne (FNV-1a 32 bits). */
function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ------------------------------------------------------- Quêtes hebdo

/** Plus petit commun diviseur, pour choisir un pas de parcours valide. */
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** Pas candidats, testés dans l'ordre jusqu'à en trouver un premier avec la taille. */
const STEPS = [5, 7, 11, 13, 1];

/** Modèles de quêtes ; le tirage choisit trois modèles différents par semaine. */
const QUEST_TEMPLATES: Array<(seed: number) => Omit<Quest, "id" | "week" | "progress" | "completed">> = [
  (seed) => {
    const target = 3 + (seed % 3);
    return {
      title: `${target} séances cette semaine`,
      description: "La régularité bat l'intensité. Termine tes séances, peu importe leur durée.",
      kind: "seances",
      target,
      xpReward: 150 + target * 30,
    };
  },
  (seed) => {
    const target = 5000 + (seed % 6) * 2500;
    return {
      title: `${(target / 1000).toFixed(1)} tonnes de volume`,
      description: "Cumule ce volume total (charge × répétitions) sur la semaine.",
      kind: "volume",
      target,
      xpReward: 200,
    };
  },
  (seed) => {
    const target = 600 + (seed % 5) * 200;
    return {
      title: `${target} XP en sept jours`,
      description: "Toutes les séances comptent : le total d'XP de la semaine doit atteindre l'objectif.",
      kind: "xp",
      target,
      xpReward: 180,
    };
  },
  (seed) => {
    const candidates = EXERCISES.filter((e) => e.tags?.includes("incontournable") && e.metric !== "distance");
    const ex = candidates[seed % candidates.length];
    const target = ex.metric === "temps" ? 300 : 80;
    return {
      title: `${target}${ex.metric === "temps" ? " s" : " répétitions"} de ${ex.name.toLowerCase()}`,
      description: "Cumule ce total sur la semaine, en autant de séries que nécessaire.",
      kind: "exercice",
      param: ex.id,
      target,
      xpReward: 220,
    };
  },
  (seed) => {
    const groups = Object.keys(GROUP_META) as Array<keyof typeof GROUP_META>;
    const group = groups[seed % groups.length];
    return {
      title: `Travailler ${GROUP_META[group].label.toLowerCase()} 3 fois`,
      description: "Inclus ce groupe musculaire dans trois séances différentes.",
      kind: "groupe",
      param: group,
      target: 3,
      xpReward: 200,
    };
  },
  (seed) => {
    const target = 90 + (seed % 5) * 30;
    return {
      title: `${target} minutes d'entraînement`,
      description: "Cumule ce temps d'entraînement effectif sur la semaine.",
      kind: "duree",
      target,
      xpReward: 170,
    };
  },
];

/** Génère les trois quêtes de la semaine indiquée. */
export function generateWeeklyQuests(week = isoWeek()): Quest[] {
  const seed = hash(week);
  // Tirage sans remise : on parcourt les modèles avec un pas premier avec
  // leur nombre, ce qui garantit de visiter chaque indice exactement une fois.
  const count = QUEST_TEMPLATES.length;
  const step = STEPS.find((s) => gcd(s, count) === 1) ?? 1;
  const indices = [0, 1, 2].map((i) => (seed + i * step) % count);
  return indices.map((idx, i) => {
    const base = QUEST_TEMPLATES[idx](seed + i * 101);
    return { ...base, id: `${week}-${idx}`, week, progress: 0, completed: false };
  });
}

/**
 * Recalcule la progression des quêtes à partir des séances de la semaine.
 * On repart systématiquement des journaux : impossible de désynchroniser
 * la progression, et l'historique reste la seule source de vérité.
 */
export function refreshQuestProgress(state: AppState, week = isoWeek()): Quest[] {
  const quests = state.quests.filter((q) => q.week === week);
  const active = quests.length ? quests : generateWeeklyQuests(week);
  const logs = state.logs.filter((log) => isoWeek(new Date(log.startedAt)) === week);

  return active.map((quest) => {
    let progress = 0;
    switch (quest.kind) {
      case "seances":
        progress = logs.length;
        break;
      case "volume":
        progress = Math.round(logs.reduce((t, l) => t + l.volumeKg, 0));
        break;
      case "xp":
        progress = logs.reduce((t, l) => t + l.xp, 0);
        break;
      case "duree":
        progress = Math.round(logs.reduce((t, l) => t + l.durationSeconds, 0) / 60);
        break;
      case "exercice": {
        const ex = quest.param ? EXERCISES_BY_ID.get(quest.param) : undefined;
        for (const log of logs) {
          for (const entry of log.exercises) {
            if (entry.exerciseId !== quest.param) continue;
            for (const set of entry.sets) {
              if (set.done === false) continue;
              progress += ex?.metric === "temps" ? (set.seconds ?? 0) : (set.reps ?? 0);
            }
          }
        }
        break;
      }
      case "groupe": {
        progress = logs.filter((log) =>
          log.exercises.some((e) => EXERCISES_BY_ID.get(e.exerciseId)?.group === quest.param),
        ).length;
        break;
      }
    }
    return { ...quest, progress, completed: progress >= quest.target };
  });
}

// --------------------------------------------------------- Défi du jour

export interface DailyChallenge {
  date: string;
  exerciseId: string;
  target: number;
  /** Unité affichée : « répétitions », « secondes »… */
  unit: string;
  xpReward: number;
  /** Phrase d'accroche, pour le ton du site. */
  tagline: string;
}

const TAGLINES = [
  "Tout le monde s'y colle aujourd'hui. Pas d'excuse.",
  "Cinq minutes, une seule ligne à cocher.",
  "Le genre de défi qu'on regrette de sauter.",
  "Aujourd'hui, c'est ça ou rien.",
  "Petit sur le papier. Moins petit à la dixième répétition.",
  "Le défi du jour ne se négocie pas.",
  "Un objectif, une série d'efforts, un badge de plus.",
];

/**
 * Défi du jour, identique pour tous les joueurs à une date donnée.
 * On ne tire que parmi les exercices sans matériel, pour que le défi soit
 * réellement relevable où que l'on soit.
 */
export function dailyChallenge(date = new Date()): DailyChallenge {
  const key = dayKey(date);
  const seed = hash(key);
  const pool = EXERCISES.filter(
    (e) =>
      e.equipment.length === 1 &&
      e.equipment[0] === "aucun" &&
      e.difficulty <= 3 &&
      (e.metric === "reps" || e.metric === "reps-lestees" || e.metric === "temps"),
  );
  const ex = pool[seed % pool.length];
  const isTime = ex.metric === "temps";
  const base = isTime ? 60 : 50;
  const target = Math.round((base + (seed % 5) * (isTime ? 15 : 10)) / (ex.unilateral ? 2 : 1));

  return {
    date: key,
    exerciseId: ex.id,
    target,
    unit: isTime ? "secondes" : "répétitions",
    xpReward: 120,
    tagline: TAGLINES[seed % TAGLINES.length],
  };
}
