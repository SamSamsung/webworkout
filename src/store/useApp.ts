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
  Quest,
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
  SupabaseAdapter,
  cryptoRandomId,
  defaultState,
  importState,
  type StorageAdapter,
} from "@/lib/storage";
import { getSession, onAuthChange, signOut, type AuthSession } from "@/lib/auth";
import { computeStreak } from "@/lib/streak";
import { mergeStates } from "@/lib/merge";
import { levelFromXp } from "@/lib/xp";

interface AppStore {
  /** `false` tant que l'état n'a pas été lu depuis le stockage. */
  hydrated: boolean;
  /** Nom de l'adaptateur actif, affiché dans les réglages. */
  storage: StorageAdapter["name"];
  state: AppState;
  /** Badges débloqués depuis la dernière consultation, pour l'animation. */
  pendingBadges: string[];
  /** Session Supabase courante, `null` en mode local. */
  session: AuthSession | null;
  /** Vrai pendant une synchronisation avec le serveur. */
  syncing: boolean;
  /** Dernier message de synchronisation à afficher dans les réglages. */
  syncMessage: string | null;

  hydrate: () => Promise<void>;
  /** Applique une session (connexion, déconnexion) et bascule le stockage. */
  applySession: (session: AuthSession | null) => Promise<void>;
  /** Ferme la session et repasse en stockage local. */
  disconnect: () => Promise<void>;
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

/** Adaptateur courant ; résolu au premier chargement puis à chaque session. */
let adapter: StorageAdapter = new LocalStorageAdapter();

/**
 * Remet un état chargé en cohérence : jokers de série recrédités et quêtes de
 * la semaine recalculées depuis l'historique.
 */
/**
 * Recalcule les quêtes et crédite la récompense de celles qui viennent d'être
 * terminées.
 *
 * Une quête terminée le reste : sans cela, supprimer une séance la ferait
 * repasser en cours, et la terminer à nouveau reverserait l'XP une seconde
 * fois. C'est ce verrou qui rend la récompense versable une fois et une seule.
 */
function settleQuests(state: AppState): { quests: Quest[]; reward: number } {
  const wasCompleted = new Map(state.quests.map((q) => [q.id, q.completed]));
  const quests = refreshQuestProgress(state).map((q) =>
    wasCompleted.get(q.id) ? { ...q, completed: true } : q,
  );
  const reward = quests
    .filter((q) => q.completed && !wasCompleted.get(q.id))
    .reduce((total, q) => total + q.xpReward, 0);
  return { quests, reward };
}

function prepare(state: AppState): AppState {
  // La série et les quêtes sont entièrement dérivées de l'historique : on les
  // recalcule au chargement plutôt que de faire confiance à une valeur
  // stockée, qui peut dater d'une autre session ou d'un autre appareil.
  const withStreak = { ...state, streak: computeStreak(state.logs) };
  const { quests, reward } = settleQuests(withStreak);
  return { ...withStreak, quests, xp: withStreak.xp + reward };
}

export const useApp = create<AppStore>((set, get) => ({
  hydrated: false,
  storage: "local",
  state: defaultState(),
  pendingBadges: [],
  session: null,
  syncing: false,
  syncMessage: null,

  hydrate: async () => {
    // On affiche toujours l'état local en premier : l'application est
    // utilisable immédiatement, même si le réseau est lent ou absent.
    adapter = new LocalStorageAdapter();
    const local = (await adapter.load()) ?? defaultState();
    const prepared = prepare(local);
    set({ state: prepared, hydrated: true, storage: "local" });
    void adapter.save(prepared);

    // Puis, si un compte est connecté, on bascule sur le stockage distant.
    const session = await getSession();
    if (session) await get().applySession(session);

    // Enfin, on suit les changements de session pour la suite de la visite
    // (retour d'un lien magique, expiration, déconnexion sur un autre onglet).
    onAuthChange((next) => {
      if (next?.userId === get().session?.userId) return;
      void get().applySession(next);
    });
  },

  applySession: async (session) => {
    if (!session) {
      adapter = new LocalStorageAdapter();
      const local = (await adapter.load()) ?? defaultState();
      set({ session: null, storage: "local", state: prepare(local), syncMessage: "Déconnecté : retour au stockage local." });
      return;
    }

    set({ syncing: true, syncMessage: null });
    try {
      const remote = new SupabaseAdapter();
      const cloud = await remote.load();
      const local = get().state;

      // Sans état distant, la progression locale devient celle du compte.
      // Sinon on fusionne : rien de ce qui a été fait sur l'un ou l'autre
      // appareil ne doit disparaître à la connexion.
      const merged = cloud ? mergeStates(local, cloud) : null;
      const state = merged?.state ?? local;

      adapter = remote;
      const prepared = prepare(state);

      const added = merged?.added;
      const recovered = added
        ? [
            added.logs > 0 && `${added.logs} séance${added.logs > 1 ? "s" : ""}`,
            added.records > 0 && `${added.records} record${added.records > 1 ? "s" : ""}`,
            added.templates > 0 && `${added.templates} modèle${added.templates > 1 ? "s" : ""}`,
          ].filter(Boolean)
        : [];

      set({
        session,
        storage: "supabase",
        state: prepared,
        syncing: false,
        syncMessage: !cloud
          ? "Connecté. Ta progression locale a été envoyée sur ton compte."
          : recovered.length
            ? `Connecté. Fusion effectuée : ${recovered.join(", ")} récupéré(s) depuis tes autres appareils.`
            : "Connecté. Tes appareils étaient déjà à jour.",
      });
      await remote.save(prepared);
    } catch (error) {
      // Un échec de synchronisation ne doit jamais bloquer l'entraînement :
      // on reste en local et on le dit clairement.
      adapter = new LocalStorageAdapter();
      set({
        session,
        storage: "local",
        syncing: false,
        syncMessage: `Synchronisation impossible (${error instanceof Error ? error.message : "erreur réseau"}). Tes données restent sur cet appareil.`,
      });
    }
  },

  disconnect: async () => {
    await signOut();
    await get().applySession(null);
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
    // L'historique reste trié par date décroissante : une séance saisie après
    // coup doit se ranger à sa place, pas en tête de liste.
    const logs = [log, ...before.logs].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    const withLog: AppState = {
      ...before,
      records,
      logs,
      xp: before.xp + log.xp,
      streak: computeStreak(logs),
    };

    // 3. Quêtes — dont la récompense est versée à l'achèvement —, puis badges
    //    (qui dépendent de tout le reste).
    const { quests, reward } = settleQuests(withLog);
    const withQuests: AppState = { ...withLog, quests, xp: withLog.xp + reward };
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
      // Supprimer une séance peut rompre une série : on la recalcule aussi.
      const next = { ...s, logs, xp: Math.max(0, s.xp - (removed?.xp ?? 0)), streak: computeStreak(logs) };
      // Les quêtes déjà terminées le restent : on ne reprend pas une
      // récompense déjà versée.
      return { ...next, quests: settleQuests(next).quests };
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

  refreshQuests: () =>
    get().mutate((s) => {
      const { quests, reward } = settleQuests(s);
      return { ...s, quests, xp: s.xp + reward };
    }),

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
