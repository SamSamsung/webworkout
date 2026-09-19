/**
 * Badges et succès.
 *
 * Chaque badge est une donnée pure (id, libellé, icône, rareté) associée à un
 * prédicat évalué sur un instantané de statistiques. Ajouter un badge = ajouter
 * une entrée dans `BADGES`, rien d'autre.
 */
import type { AppState } from "@/types/app";
import { EXERCISES_BY_ID } from "@/data/exercises";
import { levelFromXp } from "./xp";

export type BadgeRarity = "commun" | "rare" | "epique" | "legendaire";

export const RARITY_META: Record<BadgeRarity, { label: string; color: string; ring: string }> = {
  commun: { label: "Commun", color: "#94a3b8", ring: "ring-slate-400/40" },
  rare: { label: "Rare", color: "#60a5fa", ring: "ring-sky-400/50" },
  epique: { label: "Épique", color: "#a855f7", ring: "ring-purple-400/50" },
  legendaire: { label: "Légendaire", color: "#fbbf24", ring: "ring-amber-400/60" },
};

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: BadgeRarity;
  category: "assiduite" | "volume" | "performance" | "exploration" | "social" | "secret";
  /** Condition d'obtention, évaluée sur les statistiques agrégées. */
  check: (s: BadgeStats) => boolean;
  /** Progression de 0 à 1 pour les badges à jauge (facultatif). */
  progress?: (s: BadgeStats) => number;
}

/** Instantané des statistiques du joueur, recalculé à chaque évaluation. */
export interface BadgeStats {
  level: number;
  xp: number;
  workouts: number;
  totalVolumeKg: number;
  totalMinutes: number;
  totalCalories: number;
  streakCurrent: number;
  streakBest: number;
  recordsCount: number;
  distinctExercises: number;
  distinctGroups: number;
  distinctFamilies: number;
  favorites: number;
  friends: number;
  challengesWon: number;
  questsCompleted: number;
  /** Séances démarrées avant 7 h. */
  earlyWorkouts: number;
  /** Séances démarrées après 22 h. */
  lateWorkouts: number;
  /** Séances du week-end. */
  weekendWorkouts: number;
  /** Plus longue séance, en minutes. */
  longestSessionMinutes: number;
  /** Meilleur nombre de répétitions sur une pompe classique. */
  bestPushups: number;
  /** Meilleur nombre de tractions strictes. */
  bestPullups: number;
  /** Meilleur gainage, en secondes. */
  bestPlankSeconds: number;
  /** Meilleur squat barre nuque, en kg. */
  bestSquatKg: number;
  /** Meilleur développé couché, en kg. */
  bestBenchKg: number;
  /** Meilleur soulevé de terre, en kg. */
  bestDeadliftKg: number;
  /** Poids de corps déclaré, pour les ratios de force relative. */
  bodyweightKg: number;
}

const ratio = (value: number, target: number) => Math.max(0, Math.min(1, value / target));

export const BADGES: Badge[] = [
  // ------------------------------------------------------------ Assiduité
  {
    id: "premiere-seance",
    name: "Première foulée",
    description: "Terminer sa toute première séance.",
    icon: "🌱",
    rarity: "commun",
    category: "assiduite",
    check: (s) => s.workouts >= 1,
    progress: (s) => ratio(s.workouts, 1),
  },
  {
    id: "dix-seances",
    name: "Régularité",
    description: "Terminer 10 séances.",
    icon: "📅",
    rarity: "commun",
    category: "assiduite",
    check: (s) => s.workouts >= 10,
    progress: (s) => ratio(s.workouts, 10),
  },
  {
    id: "cinquante-seances",
    name: "Habitué",
    description: "Terminer 50 séances.",
    icon: "🗓️",
    rarity: "rare",
    category: "assiduite",
    check: (s) => s.workouts >= 50,
    progress: (s) => ratio(s.workouts, 50),
  },
  {
    id: "cent-seances",
    name: "Centurion",
    description: "Terminer 100 séances.",
    icon: "💯",
    rarity: "epique",
    category: "assiduite",
    check: (s) => s.workouts >= 100,
    progress: (s) => ratio(s.workouts, 100),
  },
  {
    id: "cinq-cents-seances",
    name: "Institution",
    description: "Terminer 500 séances.",
    icon: "🏛️",
    rarity: "legendaire",
    category: "assiduite",
    check: (s) => s.workouts >= 500,
    progress: (s) => ratio(s.workouts, 500),
  },
  {
    id: "streak-7",
    name: "Semaine parfaite",
    description: "Sept jours d'entraînement d'affilée.",
    icon: "🔥",
    rarity: "commun",
    category: "assiduite",
    check: (s) => s.streakBest >= 7,
    progress: (s) => ratio(s.streakBest, 7),
  },
  {
    id: "streak-30",
    name: "Mois de feu",
    description: "Trente jours d'entraînement d'affilée.",
    icon: "🌋",
    rarity: "rare",
    category: "assiduite",
    check: (s) => s.streakBest >= 30,
    progress: (s) => ratio(s.streakBest, 30),
  },
  {
    id: "streak-100",
    name: "Flamme éternelle",
    description: "Cent jours d'entraînement d'affilée.",
    icon: "☄️",
    rarity: "legendaire",
    category: "assiduite",
    check: (s) => s.streakBest >= 100,
    progress: (s) => ratio(s.streakBest, 100),
  },
  {
    id: "leve-tot",
    name: "Lève-tôt",
    description: "Dix séances démarrées avant 7 h du matin.",
    icon: "🌅",
    rarity: "rare",
    category: "assiduite",
    check: (s) => s.earlyWorkouts >= 10,
    progress: (s) => ratio(s.earlyWorkouts, 10),
  },
  {
    id: "oiseau-de-nuit",
    name: "Oiseau de nuit",
    description: "Dix séances démarrées après 22 h.",
    icon: "🦉",
    rarity: "rare",
    category: "assiduite",
    check: (s) => s.lateWorkouts >= 10,
    progress: (s) => ratio(s.lateWorkouts, 10),
  },
  {
    id: "guerrier-du-week-end",
    name: "Guerrier du week-end",
    description: "Vingt séances un samedi ou un dimanche.",
    icon: "🎉",
    rarity: "commun",
    category: "assiduite",
    check: (s) => s.weekendWorkouts >= 20,
    progress: (s) => ratio(s.weekendWorkouts, 20),
  },

  // --------------------------------------------------------------- Volume
  {
    id: "une-tonne",
    name: "Une tonne",
    description: "Cumuler 1 000 kg de volume soulevé.",
    icon: "🪨",
    rarity: "commun",
    category: "volume",
    check: (s) => s.totalVolumeKg >= 1_000,
    progress: (s) => ratio(s.totalVolumeKg, 1_000),
  },
  {
    id: "cent-tonnes",
    name: "Cent tonnes",
    description: "Cumuler 100 000 kg de volume soulevé.",
    icon: "🏗️",
    rarity: "rare",
    category: "volume",
    check: (s) => s.totalVolumeKg >= 100_000,
    progress: (s) => ratio(s.totalVolumeKg, 100_000),
  },
  {
    id: "tour-eiffel",
    name: "Tour Eiffel",
    description: "Cumuler 10 100 tonnes, soit le poids de la tour Eiffel.",
    icon: "🗼",
    rarity: "legendaire",
    category: "volume",
    check: (s) => s.totalVolumeKg >= 10_100_000,
    progress: (s) => ratio(s.totalVolumeKg, 10_100_000),
  },
  {
    id: "dix-heures",
    name: "Dix heures de sueur",
    description: "Cumuler 10 heures d'entraînement.",
    icon: "⏱️",
    rarity: "commun",
    category: "volume",
    check: (s) => s.totalMinutes >= 600,
    progress: (s) => ratio(s.totalMinutes, 600),
  },
  {
    id: "cent-heures",
    name: "Cent heures",
    description: "Cumuler 100 heures d'entraînement.",
    icon: "🕰️",
    rarity: "epique",
    category: "volume",
    check: (s) => s.totalMinutes >= 6_000,
    progress: (s) => ratio(s.totalMinutes, 6_000),
  },
  {
    id: "marathon-de-salle",
    name: "Marathon de salle",
    description: "Réaliser une séance de plus de deux heures.",
    icon: "🏃",
    rarity: "rare",
    category: "volume",
    check: (s) => s.longestSessionMinutes >= 120,
    progress: (s) => ratio(s.longestSessionMinutes, 120),
  },
  {
    id: "dix-mille-calories",
    name: "Fournaise",
    description: "Brûler 10 000 kcal cumulées en séance.",
    icon: "🔥",
    rarity: "rare",
    category: "volume",
    check: (s) => s.totalCalories >= 10_000,
    progress: (s) => ratio(s.totalCalories, 10_000),
  },

  // ---------------------------------------------------------- Performance
  {
    id: "niveau-10",
    name: "Écuyer d'acier",
    description: "Atteindre le niveau 10.",
    icon: "🛡️",
    rarity: "commun",
    category: "performance",
    check: (s) => s.level >= 10,
    progress: (s) => ratio(s.level, 10),
  },
  {
    id: "niveau-25",
    name: "Vétéran",
    description: "Atteindre le niveau 25.",
    icon: "🎖️",
    rarity: "rare",
    category: "performance",
    check: (s) => s.level >= 25,
    progress: (s) => ratio(s.level, 25),
  },
  {
    id: "niveau-50",
    name: "Maître de gravité",
    description: "Atteindre le niveau 50.",
    icon: "🌀",
    rarity: "epique",
    category: "performance",
    check: (s) => s.level >= 50,
    progress: (s) => ratio(s.level, 50),
  },
  {
    id: "niveau-100",
    name: "Légende vivante",
    description: "Atteindre le niveau 100.",
    icon: "👑",
    rarity: "legendaire",
    category: "performance",
    check: (s) => s.level >= 100,
    progress: (s) => ratio(s.level, 100),
  },
  {
    id: "cent-pompes",
    name: "Cent pompes",
    description: "Réaliser 100 pompes classiques en une série.",
    icon: "💪",
    rarity: "epique",
    category: "performance",
    check: (s) => s.bestPushups >= 100,
    progress: (s) => ratio(s.bestPushups, 100),
  },
  {
    id: "vingt-tractions",
    name: "Vingt tractions",
    description: "Réaliser 20 tractions strictes en une série.",
    icon: "🦅",
    rarity: "epique",
    category: "performance",
    check: (s) => s.bestPullups >= 20,
    progress: (s) => ratio(s.bestPullups, 20),
  },
  {
    id: "gainage-5-minutes",
    name: "Statue de marbre",
    description: "Tenir cinq minutes de gainage sur les avant-bras.",
    icon: "🗿",
    rarity: "rare",
    category: "performance",
    check: (s) => s.bestPlankSeconds >= 300,
    progress: (s) => ratio(s.bestPlankSeconds, 300),
  },
  {
    id: "club-100kg-bench",
    name: "Club des 100 kg",
    description: "Développé couché à 100 kg ou plus.",
    icon: "🏋️",
    rarity: "rare",
    category: "performance",
    check: (s) => s.bestBenchKg >= 100,
    progress: (s) => ratio(s.bestBenchKg, 100),
  },
  {
    id: "squat-2x-poids-de-corps",
    name: "Deux fois mon poids",
    description: "Squatter le double de son poids de corps.",
    icon: "🦵",
    rarity: "epique",
    category: "performance",
    check: (s) => s.bodyweightKg > 0 && s.bestSquatKg >= 2 * s.bodyweightKg,
    progress: (s) => (s.bodyweightKg > 0 ? ratio(s.bestSquatKg, 2 * s.bodyweightKg) : 0),
  },
  {
    id: "souleve-3x-poids-de-corps",
    name: "Force tellurique",
    description: "Soulever de terre trois fois son poids de corps.",
    icon: "⚡",
    rarity: "legendaire",
    category: "performance",
    check: (s) => s.bodyweightKg > 0 && s.bestDeadliftKg >= 3 * s.bodyweightKg,
    progress: (s) => (s.bodyweightKg > 0 ? ratio(s.bestDeadliftKg, 3 * s.bodyweightKg) : 0),
  },
  {
    id: "total-1000",
    name: "Club des 500",
    description: "Cumuler 500 kg au total squat + développé + soulevé.",
    icon: "🥇",
    rarity: "epique",
    category: "performance",
    check: (s) => s.bestSquatKg + s.bestBenchKg + s.bestDeadliftKg >= 500,
    progress: (s) => ratio(s.bestSquatKg + s.bestBenchKg + s.bestDeadliftKg, 500),
  },

  // ---------------------------------------------------------- Exploration
  {
    id: "curieux",
    name: "Curieux",
    description: "Pratiquer 25 exercices différents.",
    icon: "🧭",
    rarity: "commun",
    category: "exploration",
    check: (s) => s.distinctExercises >= 25,
    progress: (s) => ratio(s.distinctExercises, 25),
  },
  {
    id: "explorateur",
    name: "Explorateur",
    description: "Pratiquer 100 exercices différents.",
    icon: "🗺️",
    rarity: "rare",
    category: "exploration",
    check: (s) => s.distinctExercises >= 100,
    progress: (s) => ratio(s.distinctExercises, 100),
  },
  {
    id: "encyclopediste",
    name: "Encyclopédiste",
    description: "Pratiquer 250 exercices différents.",
    icon: "📚",
    rarity: "legendaire",
    category: "exploration",
    check: (s) => s.distinctExercises >= 250,
    progress: (s) => ratio(s.distinctExercises, 250),
  },
  {
    id: "corps-complet",
    name: "Aucun maillon faible",
    description: "Travailler les 17 groupes musculaires de la base.",
    icon: "🧬",
    rarity: "epique",
    category: "exploration",
    check: (s) => s.distinctGroups >= 17,
    progress: (s) => ratio(s.distinctGroups, 17),
  },
  {
    id: "polyvalent",
    name: "Polyvalent",
    description: "Toucher 20 familles de mouvement différentes.",
    icon: "🎨",
    rarity: "rare",
    category: "exploration",
    check: (s) => s.distinctFamilies >= 20,
    progress: (s) => ratio(s.distinctFamilies, 20),
  },
  {
    id: "archiviste",
    name: "Archiviste",
    description: "Enregistrer 30 records personnels.",
    icon: "📈",
    rarity: "rare",
    category: "exploration",
    check: (s) => s.recordsCount >= 30,
    progress: (s) => ratio(s.recordsCount, 30),
  },
  {
    id: "collectionneur",
    name: "Collectionneur",
    description: "Mettre 20 exercices en favori.",
    icon: "⭐",
    rarity: "commun",
    category: "exploration",
    check: (s) => s.favorites >= 20,
    progress: (s) => ratio(s.favorites, 20),
  },

  // -------------------------------------------------------------- Social
  {
    id: "premier-ami",
    name: "Pas tout seul",
    description: "Ajouter un premier ami.",
    icon: "🤝",
    rarity: "commun",
    category: "social",
    check: (s) => s.friends >= 1,
    progress: (s) => ratio(s.friends, 1),
  },
  {
    id: "cercle-de-fer",
    name: "Cercle de fer",
    description: "Compter 10 amis.",
    icon: "🫂",
    rarity: "rare",
    category: "social",
    check: (s) => s.friends >= 10,
    progress: (s) => ratio(s.friends, 10),
  },
  {
    id: "duelliste",
    name: "Duelliste",
    description: "Remporter cinq défis.",
    icon: "⚔️",
    rarity: "rare",
    category: "social",
    check: (s) => s.challengesWon >= 5,
    progress: (s) => ratio(s.challengesWon, 5),
  },
  {
    id: "chasseur-de-quetes",
    name: "Chasseur de quêtes",
    description: "Terminer 25 quêtes hebdomadaires.",
    icon: "📜",
    rarity: "epique",
    category: "social",
    check: (s) => s.questsCompleted >= 25,
    progress: (s) => ratio(s.questsCompleted, 25),
  },
];

/** Calcule l'instantané de statistiques à partir de l'état persisté. */
export function computeBadgeStats(state: AppState): BadgeStats {
  const logs = state.logs;
  const exerciseIds = new Set<string>();
  const groups = new Set<string>();
  const families = new Set<string>();
  let totalVolume = 0;
  let totalMinutes = 0;
  let totalCalories = 0;
  let early = 0;
  let late = 0;
  let weekend = 0;
  let longest = 0;

  for (const log of logs) {
    totalVolume += log.volumeKg;
    totalMinutes += log.durationSeconds / 60;
    totalCalories += log.calories;
    longest = Math.max(longest, log.durationSeconds / 60);

    const started = new Date(log.startedAt);
    const hour = started.getHours();
    if (hour < 7) early++;
    if (hour >= 22) late++;
    const day = started.getDay();
    if (day === 0 || day === 6) weekend++;

    for (const entry of log.exercises) {
      exerciseIds.add(entry.exerciseId);
      const ex = EXERCISES_BY_ID.get(entry.exerciseId);
      if (ex) {
        groups.add(ex.group);
        families.add(ex.family);
      }
    }
  }

  const bestOf = (id: string, field: "reps" | "weight" | "seconds") =>
    state.records[id]?.best?.[field] ?? 0;

  return {
    level: levelFromXp(state.xp).level,
    xp: state.xp,
    workouts: logs.length,
    totalVolumeKg: totalVolume,
    totalMinutes,
    totalCalories,
    streakCurrent: state.streak.current,
    streakBest: state.streak.best,
    recordsCount: Object.keys(state.records).length,
    distinctExercises: exerciseIds.size,
    distinctGroups: groups.size,
    distinctFamilies: families.size,
    favorites: state.favorites.length,
    friends: state.friends.length,
    challengesWon: state.challenges.filter((c) => c.status === "reussi").length,
    questsCompleted: state.quests.filter((q) => q.completed).length,
    earlyWorkouts: early,
    lateWorkouts: late,
    weekendWorkouts: weekend,
    longestSessionMinutes: longest,
    bestPushups: bestOf("pompe-classique", "reps"),
    bestPullups: bestOf("traction-pronation", "reps"),
    bestPlankSeconds: bestOf("planche-avant-bras", "seconds"),
    bestSquatKg: bestOf("squat-barre-nuque", "weight"),
    bestBenchKg: bestOf("developpe-couche-barre", "weight"),
    bestDeadliftKg: bestOf("souleve-de-terre-conventionnel", "weight"),
    bodyweightKg: state.profile.bodyweightKg,
  };
}

/** Retourne les identifiants des badges nouvellement débloqués. */
export function findNewlyUnlocked(state: AppState): string[] {
  const stats = computeBadgeStats(state);
  const owned = new Set(state.badges.map((b) => b.badgeId));
  return BADGES.filter((b) => !owned.has(b.id) && b.check(stats)).map((b) => b.id);
}

export const BADGES_BY_ID = new Map(BADGES.map((b) => [b.id, b]));
