/**
 * Types du domaine applicatif : profil, records, séances, gamification.
 * Ces structures sont persistées telles quelles (localStorage aujourd'hui,
 * Supabase demain) : toute évolution doit rester rétrocompatible ou passer
 * par une migration dans `src/lib/storage.ts`.
 */
import type { Metric } from "./exercise";

/** Une série réalisée ou planifiée. Les champs dépendent de la métrique. */
export interface WorkoutSet {
  /** Répétitions effectuées. */
  reps?: number;
  /** Charge en kilogrammes (charge additionnelle pour le poids du corps). */
  weight?: number;
  /** Durée en secondes (gainage, isométrie, cardio). */
  seconds?: number;
  /** Distance en mètres (course, rameur, portés). */
  meters?: number;
  /** Série validée pendant la séance en direct. */
  done?: boolean;
  /** RPE ressenti de 1 à 10, optionnel. */
  rpe?: number;
}

/** Un exercice au sein d'une séance, avec ses séries. */
export interface WorkoutExercise {
  exerciseId: string;
  sets: WorkoutSet[];
  /** Repos conseillé entre les séries, en secondes. */
  restSeconds: number;
  notes?: string;
}

/** Modèle de séance réutilisable, créé par l'utilisateur ou généré. */
export interface WorkoutTemplate {
  id: string;
  name: string;
  description?: string;
  exercises: WorkoutExercise[];
  createdAt: string;
  updatedAt: string;
  /** Marqueur des séances produites par le générateur automatique. */
  generated?: boolean;
  tags?: string[];
}

/** Séance effectivement réalisée, archivée dans l'historique. */
export interface WorkoutLog {
  id: string;
  templateId?: string;
  name: string;
  /** Date ISO du début de séance. */
  startedAt: string;
  /** Date ISO de fin de séance. */
  endedAt: string;
  /** Durée réelle en secondes (hors pauses longues). */
  durationSeconds: number;
  exercises: WorkoutExercise[];
  /** Volume total en kilogrammes soulevés (charge × répétitions). */
  volumeKg: number;
  /** XP gagnée sur cette séance. */
  xp: number;
  /** Estimation de la dépense énergétique, en kcal. */
  calories: number;
  notes?: string;
}

/**
 * Record personnel sur un exercice.
 * On conserve la meilleure valeur par métrique ainsi que l'historique complet,
 * ce dernier alimentant les courbes de progression.
 */
export interface PersonalRecord {
  exerciseId: string;
  metric: Metric;
  /** Meilleure performance enregistrée (voir `scoreRecord`). */
  best: RecordEntry;
  /** Toutes les performances enregistrées, par ordre chronologique. */
  history: RecordEntry[];
}

/** Une performance datée. */
export interface RecordEntry {
  date: string;
  reps?: number;
  weight?: number;
  seconds?: number;
  meters?: number;
  /** Score normalisé servant à comparer deux performances entre elles. */
  score: number;
  /** Renseigné quand l'entrée provient d'une séance et non d'une saisie manuelle. */
  fromWorkoutId?: string;
}

/** Profil du joueur. */
export interface Profile {
  id: string;
  pseudo: string;
  /** Emoji servant d'avatar : léger, sans upload, et cohérent avec le ton du site. */
  avatar: string;
  /** Poids de corps en kg, utilisé pour l'XP et l'estimation calorique. */
  bodyweightKg: number;
  /** Année de naissance, optionnelle, pour l'estimation de la FC max. */
  birthYear?: number;
  createdAt: string;
  /** Objectif déclaré, utilisé par le générateur de séance. */
  goal: Goal;
  /** Matériel disponible, utilisé par le générateur et les filtres par défaut. */
  availableEquipment: string[];
  /** Visibilité du profil pour les fonctionnalités sociales. */
  publicProfile: boolean;
}

export type Goal = "force" | "hypertrophie" | "endurance" | "perte-de-poids" | "mobilite" | "general";

export const GOAL_LABELS: Record<Goal, string> = {
  force: "Gagner en force",
  hypertrophie: "Prendre du muscle",
  endurance: "Améliorer mon endurance",
  "perte-de-poids": "Perdre du gras",
  mobilite: "Gagner en mobilité",
  general: "Forme générale",
};

/** Badge débloqué, avec la date d'obtention. */
export interface UnlockedBadge {
  badgeId: string;
  unlockedAt: string;
}

/** Série de jours consécutifs d'entraînement. */
export interface StreakState {
  /** Série en cours, en jours. */
  current: number;
  /** Meilleure série atteinte. */
  best: number;
  /** Dernière date d'entraînement (AAAA-MM-JJ). */
  lastTrainingDay?: string;
  /** Jokers restants : un jour manqué peut être « gelé » une fois par semaine. */
  freezesLeft: number;
}

/** Ami suivi, en mode local ou synchronisé. */
export interface Friend {
  id: string;
  pseudo: string;
  avatar: string;
  xp: number;
  level: number;
  /** Dernière activité connue, date ISO. */
  lastActive?: string;
  /** Vrai pour les profils de démonstration générés localement. */
  demo?: boolean;
}

/** Défi lancé à un ami ou relevé collectivement. */
export interface Challenge {
  id: string;
  title: string;
  description: string;
  exerciseId?: string;
  /** Objectif à atteindre, exprimé dans l'unité de la métrique de l'exercice. */
  target: number;
  metric: Metric;
  /** Date ISO d'échéance. */
  deadline: string;
  /** Identifiants des participants (profil local inclus). */
  participants: string[];
  /** Progression par participant. */
  progress: Record<string, number>;
  status: "en-cours" | "reussi" | "echoue";
  createdAt: string;
}

/** Quête hebdomadaire générée automatiquement. */
export interface Quest {
  id: string;
  title: string;
  description: string;
  /** Type de condition évaluée. */
  kind: "seances" | "volume" | "xp" | "exercice" | "duree" | "groupe";
  /** Paramètre de la condition (id d'exercice, groupe musculaire…). */
  param?: string;
  target: number;
  progress: number;
  xpReward: number;
  /** Semaine ISO à laquelle la quête se rattache (ex. 2026-W12). */
  week: string;
  completed: boolean;
}

/** Racine de l'état persisté. */
export interface AppState {
  /** Version du schéma, pour les migrations. */
  version: number;
  profile: Profile;
  xp: number;
  records: Record<string, PersonalRecord>;
  templates: WorkoutTemplate[];
  logs: WorkoutLog[];
  badges: UnlockedBadge[];
  streak: StreakState;
  friends: Friend[];
  challenges: Challenge[];
  quests: Quest[];
  /** Exercices mis en favori. */
  favorites: string[];
  /** Date ISO du dernier défi du jour relevé. */
  lastDailyChallengeDate?: string;
}
