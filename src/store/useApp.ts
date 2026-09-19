"use client";

/**
 * Store applicatif (Zustand).
 *
 * Toute mutation passe par ici, puis est persistée via l'adaptateur de
 * stockage. Les composants ne manipulent jamais le localStorage directement :
 * cela garantit que l'XP, les badges, la série et les quêtes sont toujours
 * recalculés de façon cohérente après chaque action.
 */
import { useMemo } from "react";
import { create } from "zustand";
import type {
  AppState,
  Challenge,
  Friend,
  PersonalRecord,
  Profile,
  RecordEntry,
  WorkoutLog,
  WorkoutTemplate,
} from "@/types/app";
import { EXERCISES_BY_ID } from "@/data/exercises";
import { findNewlyUnlocked } from "@/lib/badges";
import { applyRecord, makeRecordEntry } from "@/lib/records";
import { refreshQuestProgress } from "@/lib/quests";
import {
  LocalStorageAdapter,
  cryptoRandomId,
  defaultState,
  importState,
  resolveAdapter,
  type StorageAdapter,
} from "@/lib/storage";
import { refillFreezes, updateStreak } from "@/lib/streak";
import { levelFromXp } from "@/lib/xp";

interface AppStore {
  /** `false` tant que l'état n'a pas été lu depuis le stockage. */
  hydrated: boolean;
  /** Nom de l'adaptateur actif, affiché dans les réglages. */
  storage: StorageAdapter["name"];
  state: AppState;
  /** Badges débloqués depuis la dernière consultation, pour l'animation. */
  pendingBadges: string[];

  hydrate: () => Promise<void>;
  /** Applique une transformation immuable puis persiste. */
  mutate: (fn: (state: AppState) => AppState) => void;

  updateProfile: (patch: Partial<Profile>) => void;
  toggleFavorite: (exerciseId: string) => void;

  saveTemplate: (template: WorkoutTemplate) => void;
  deleteTemplate: (id: string) => void;

  finishWorkout: (log: WorkoutLog) => { newRecords: string[]; newBadges: string[]; xp: number };
  deleteLog: (id: string) => void;

  addRecord: (exerciseId: string, values: Omit<RecordEntry, "score" | "date">, date?: string) => boolean;
  deleteRecord: (exerciseId: string) => void;

  addFriend: (friend: Omit<Friend, "id">) => void;
  removeFriend: (id: string) => void;
  seedDemoFriends: () => void;

  createChallenge: (challenge: Omit<Challenge, "id" | "createdAt" | "status" | "progress">) => void;
  updateChallengeProgress: (id: string, participantId: string, value: number) => void;
  deleteChallenge: (id: string) => void;

  refreshQuests: () => void;
  claimDailyChallenge: (xp: number) => void;

  acknowledgeBadges: () => void;
  importBackup: (json: string) => void;
  reset: () => void;
}

/** Adaptateur courant ; résolu au premier chargement. */
let adapter: StorageAdapter = new LocalStorageAdapter();

export const useApp = create<AppStore>((set, get) => ({
  hydrated: false,
  storage: "local",
  state: defaultState(),
  pendingBadges: [],

  hydrate: async () => {
    adapter = await resolveAdapter();
    const loaded = (await adapter.load()) ?? defaultState();
    // Les jokers de série se rechargent au fil du temps, même hors ligne.
    const withFreezes = { ...loaded, streak: refillFreezes(loaded.streak) };
    const withQuests = { ...withFreezes, quests: refreshQuestProgress(withFreezes) };
    set({ state: withQuests, hydrated: true, storage: adapter.name });
    void adapter.save(withQuests);
  },

  mutate: (fn) => {
    const next = fn(get().state);
    set({ state: next });
    void adapter.save(next);
  },

  updateProfile: (patch) =>
    get().mutate((s) => ({ ...s, profile: { ...s.profile, ...patch } })),

  toggleFavorite: (exerciseId) =>
    get().mutate((s) => ({
      ...s,
      favorites: s.favorites.includes(exerciseId)
        ? s.favorites.filter((id) => id !== exerciseId)
        : [...s.favorites, exerciseId],
    })),

  saveTemplate: (template) =>
    get().mutate((s) => {
      const exists = s.templates.some((t) => t.id === template.id);
      const updated = { ...template, updatedAt: new Date().toISOString() };
      return {
        ...s,
        templates: exists
          ? s.templates.map((t) => (t.id === template.id ? updated : t))
          : [updated, ...s.templates],
      };
    }),

  deleteTemplate: (id) =>
    get().mutate((s) => ({ ...s, templates: s.templates.filter((t) => t.id !== id) })),

  /**
   * Clôture une séance : archive le journal, crédite l'XP, met à jour les
   * records battus, la série, les quêtes, puis évalue les badges.
   * C'est le seul point d'entrée qui fait progresser le joueur.
   */
  finishWorkout: (log) => {
    const before = get().state;
    const newRecords: string[] = [];

    // 1. Records : on ne garde que la meilleure série de chaque exercice.
    const records: Record<string, PersonalRecord> = { ...before.records };
    for (const entry of log.exercises) {
      const exercise = EXERCISES_BY_ID.get(entry.exerciseId);
      if (!exercise) continue;
      const doneSets = entry.sets.filter((s) => s.done !== false);
      if (!doneSets.length) continue;

      const candidates = doneSets.map((s) =>
        makeRecordEntry(
          exercise,
          { reps: s.reps, weight: s.weight, seconds: s.seconds, meters: s.meters, fromWorkoutId: log.id },
          log.endedAt,
        ),
      );
      const best = candidates.reduce((a, b) => (b.score > a.score ? b : a));
      const { record, isNewBest } = applyRecord(exercise, records[exercise.id], best);
      records[exercise.id] = record;
      if (isNewBest && before.records[exercise.id]) newRecords.push(exercise.id);
    }

    // 2. XP, historique et série.
    const withLog: AppState = {
      ...before,
      records,
      logs: [log, ...before.logs],
      xp: before.xp + log.xp,
      streak: updateStreak(before.streak, new Date(log.endedAt)),
    };

    // 3. Quêtes, puis badges (qui dépendent de tout le reste).
    const withQuests: AppState = { ...withLog, quests: refreshQuestProgress(withLog) };
    const newBadges = findNewlyUnlocked(withQuests);
    const next: AppState = {
      ...withQuests,
      badges: [
        ...withQuests.badges,
        ...newBadges.map((badgeId) => ({ badgeId, unlockedAt: new Date().toISOString() })),
      ],
    };

    set({ state: next, pendingBadges: newBadges });
    void adapter.save(next);
    return { newRecords, newBadges, xp: log.xp };
  },

  deleteLog: (id) =>
    get().mutate((s) => {
      const logs = s.logs.filter((l) => l.id !== id);
      const removed = s.logs.find((l) => l.id === id);
      const next = { ...s, logs, xp: Math.max(0, s.xp - (removed?.xp ?? 0)) };
      return { ...next, quests: refreshQuestProgress(next) };
    }),

  /** Saisie manuelle d'un record. Renvoie `true` s'il s'agit d'un nouveau record. */
  addRecord: (exerciseId, values, date) => {
    const exercise = EXERCISES_BY_ID.get(exerciseId);
    if (!exercise) return false;
    const entry = makeRecordEntry(exercise, values, date);
    const current = get().state.records[exerciseId];
    const { record, isNewBest } = applyRecord(exercise, current, entry);

    get().mutate((s) => {
      const withRecord = { ...s, records: { ...s.records, [exerciseId]: record } };
      const newBadges = findNewlyUnlocked(withRecord);
      if (newBadges.length) set({ pendingBadges: newBadges });
      return {
        ...withRecord,
        badges: [
          ...withRecord.badges,
          ...newBadges.map((badgeId) => ({ badgeId, unlockedAt: new Date().toISOString() })),
        ],
      };
    });
    return isNewBest;
  },

  deleteRecord: (exerciseId) =>
    get().mutate((s) => {
      const records = { ...s.records };
      delete records[exerciseId];
      return { ...s, records };
    }),

  addFriend: (friend) =>
    get().mutate((s) => ({ ...s, friends: [...s.friends, { ...friend, id: cryptoRandomId() }] })),

  removeFriend: (id) =>
    get().mutate((s) => ({ ...s, friends: s.friends.filter((f) => f.id !== id) })),

  /**
   * Crée quelques profils de démonstration.
   * En mode local, il n'y a pas de véritable réseau social : ces profils
   * donnent un classement crédible pour explorer la fonctionnalité, et sont
   * explicitement marqués comme fictifs dans l'interface.
   */
  seedDemoFriends: () =>
    get().mutate((s) => {
      if (s.friends.some((f) => f.demo)) return s;
      const roster: Array<[string, string, number]> = [
        ["Camille", "🦊", 5400],
        ["Sofiane", "🐺", 12800],
        ["Nour", "🦉", 3100],
        ["Léa", "🐝", 21500],
        ["Tom", "🐻", 890],
      ];
      return {
        ...s,
        friends: [
          ...s.friends,
          ...roster.map(([pseudo, avatar, xp]) => ({
            id: cryptoRandomId(),
            pseudo,
            avatar,
            xp,
            level: levelFromXp(xp).level,
            lastActive: new Date(Date.now() - Math.random() * 6 * 86_400_000).toISOString(),
            demo: true,
          })),
        ],
      };
    }),

  createChallenge: (challenge) =>
    get().mutate((s) => ({
      ...s,
      challenges: [
        {
          ...challenge,
          id: cryptoRandomId(),
          createdAt: new Date().toISOString(),
          status: "en-cours",
          progress: Object.fromEntries(challenge.participants.map((p) => [p, 0])),
        },
        ...s.challenges,
      ],
    })),

  updateChallengeProgress: (id, participantId, value) =>
    get().mutate((s) => ({
      ...s,
      challenges: s.challenges.map((c) => {
        if (c.id !== id) return c;
        const progress = { ...c.progress, [participantId]: value };
        const reached = Object.values(progress).some((v) => v >= c.target);
        const expired = new Date(c.deadline) < new Date();
        return {
          ...c,
          progress,
          status: reached ? "reussi" : expired ? "echoue" : "en-cours",
        };
      }),
    })),

  deleteChallenge: (id) =>
    get().mutate((s) => ({ ...s, challenges: s.challenges.filter((c) => c.id !== id) })),

  refreshQuests: () => get().mutate((s) => ({ ...s, quests: refreshQuestProgress(s) })),

  /** Crédite l'XP du défi du jour, une seule fois par journée. */
  claimDailyChallenge: (xp) =>
    get().mutate((s) => {
      const today = new Date().toISOString().slice(0, 10);
      if (s.lastDailyChallengeDate === today) return s;
      return { ...s, xp: s.xp + xp, lastDailyChallengeDate: today };
    }),

  acknowledgeBadges: () => set({ pendingBadges: [] }),

  importBackup: (json) => {
    const next = importState(json);
    set({ state: next });
    void adapter.save(next);
  },

  reset: () => {
    const next = defaultState();
    set({ state: next, pendingBadges: [] });
    void adapter.save(next);
  },
}));

/**
 * Sélecteur pratique : informations de niveau dérivées de l'XP.
 *
 * Le sélecteur ne renvoie que l'XP (une primitive) : `levelFromXp` produit un
 * nouvel objet à chaque appel, et le renvoyer directement depuis le sélecteur
 * ferait boucler `useSyncExternalStore` à l'infini.
 */
export function useLevel() {
  const xp = useApp((s) => s.state.xp);
  return useMemo(() => levelFromXp(xp), [xp]);
}
