/**
 * Couche de persistance.
 *
 * L'application est conçue « local d'abord » : tout fonctionne sans backend,
 * dans le localStorage du navigateur. Si un projet Supabase est configuré
 * (variables `NEXT_PUBLIC_SUPABASE_*`), le même état est synchronisé dans la
 * base, ce qui débloque les fonctionnalités sociales entre appareils.
 *
 * Les deux implémentations partagent l'interface `StorageAdapter` : le reste
 * du code ne sait pas laquelle est active.
 */
import type { AppState, Profile } from "@/types/app";
import { getSupabase, isSupabaseConfigured } from "./supabase";

export const STORAGE_KEY = "ironquest:state";
/** Incrémenter à chaque changement de schéma, et ajouter la migration associée. */
export const SCHEMA_VERSION = 1;

/** Profil par défaut d'un nouveau joueur. */
export function defaultProfile(): Profile {
  return {
    id: cryptoRandomId(),
    pseudo: "Aventurier",
    avatar: "🦍",
    bodyweightKg: 75,
    createdAt: new Date().toISOString(),
    goal: "general",
    availableEquipment: ["aucun"],
    publicProfile: false,
  };
}

/** État initial d'une installation vierge. */
export function defaultState(): AppState {
  return {
    version: SCHEMA_VERSION,
    profile: defaultProfile(),
    xp: 0,
    records: {},
    templates: [],
    logs: [],
    badges: [],
    streak: { current: 0, best: 0, freezesLeft: 1 },
    friends: [],
    challenges: [],
    quests: [],
    favorites: [],
  };
}

/** Identifiant aléatoire, avec repli si `crypto.randomUUID` est indisponible. */
export function cryptoRandomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

export interface StorageAdapter {
  readonly name: "local" | "supabase";
  load(): Promise<AppState | null>;
  save(state: AppState): Promise<void>;
  clear(): Promise<void>;
}

/**
 * Applique les migrations successives à un état chargé.
 * Chaque montée de version doit ajouter son bloc ici plutôt que de réécrire
 * silencieusement les données du joueur.
 */
export function migrate(raw: unknown): AppState {
  const base = defaultState();
  if (!raw || typeof raw !== "object") return base;
  const state = raw as Partial<AppState>;

  // Fusion défensive : un champ ajouté dans une version ultérieure du schéma
  // ne doit jamais faire planter l'application au chargement.
  const merged: AppState = {
    ...base,
    ...state,
    version: SCHEMA_VERSION,
    profile: { ...base.profile, ...(state.profile ?? {}) },
    streak: { ...base.streak, ...(state.streak ?? {}) },
    records: state.records ?? {},
    templates: state.templates ?? [],
    logs: state.logs ?? [],
    badges: state.badges ?? [],
    friends: state.friends ?? [],
    challenges: state.challenges ?? [],
    quests: state.quests ?? [],
    favorites: state.favorites ?? [],
  };
  return merged;
}

/** Persistance dans le navigateur : le mode par défaut, sans configuration. */
export class LocalStorageAdapter implements StorageAdapter {
  readonly name = "local" as const;

  async load(): Promise<AppState | null> {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? migrate(JSON.parse(raw)) : null;
    } catch {
      // Données corrompues ou stockage bloqué : on repart d'un état sain
      // plutôt que d'empêcher l'application de démarrer.
      return null;
    }
  }

  async save(state: AppState): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Quota dépassé (mode privé, stockage plein) : on ignore silencieusement,
      // la session en cours reste utilisable en mémoire.
    }
  }

  async clear(): Promise<void> {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

/**
 * Persistance Supabase.
 *
 * L'état complet est stocké dans une colonne `jsonb` de la table `profiles`,
 * ce qui évite un schéma relationnel rigide pendant que l'application évolue.
 * Les champs exploités par les classements (pseudo, XP, niveau) sont en
 * revanche dupliqués en colonnes dédiées, indexables et lisibles par les
 * autres joueurs via une politique RLS en lecture seule.
 *
 * Voir `supabase/schema.sql` pour le schéma et les politiques.
 */
export class SupabaseAdapter implements StorageAdapter {
  readonly name = "supabase" as const;

  private async userId(): Promise<string | null> {
    const supabase = getSupabase();
    if (!supabase) return null;
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  }

  async load(): Promise<AppState | null> {
    const supabase = getSupabase();
    const uid = await this.userId();
    if (!supabase || !uid) return null;

    const { data, error } = await supabase.from("profiles").select("state").eq("id", uid).maybeSingle();
    if (error || !data?.state) return null;
    return migrate(data.state);
  }

  async save(state: AppState): Promise<void> {
    const supabase = getSupabase();
    const uid = await this.userId();
    if (!supabase || !uid) return;

    const { levelFromXp } = await import("./xp");
    await supabase.from("profiles").upsert({
      id: uid,
      pseudo: state.profile.pseudo,
      avatar: state.profile.avatar,
      xp: state.xp,
      level: levelFromXp(state.xp).level,
      is_public: state.profile.publicProfile,
      state,
      updated_at: new Date().toISOString(),
    });
  }

  async clear(): Promise<void> {
    const supabase = getSupabase();
    const uid = await this.userId();
    if (!supabase || !uid) return;
    await supabase.from("profiles").delete().eq("id", uid);
  }
}

/**
 * Choisit l'adaptateur actif.
 * Supabase n'est retenu que s'il est configuré ET qu'une session existe :
 * un utilisateur non connecté continue de travailler en local.
 */
export async function resolveAdapter(): Promise<StorageAdapter> {
  if (isSupabaseConfigured) {
    const supabase = getSupabase();
    const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
    if (data.session) return new SupabaseAdapter();
  }
  return new LocalStorageAdapter();
}

/**
 * Choisit l'état à conserver lorsqu'un compte distant et une sauvegarde locale
 * coexistent (première connexion sur un nouvel appareil, par exemple).
 *
 * Règle : on garde le plus riche des deux, mesuré au nombre de séances puis à
 * l'XP. C'est la seule politique automatique qui ne fasse jamais perdre de
 * travail réel ; l'autre sauvegarde reste récupérable par l'export JSON.
 */
export function pickRicher(
  local: AppState,
  remote: AppState,
): { state: AppState; source: "local" | "distant" } {
  const score = (s: AppState) => s.logs.length * 1_000_000 + s.xp;
  return score(remote) >= score(local)
    ? { state: remote, source: "distant" }
    : { state: local, source: "local" };
}

/** Export JSON de la sauvegarde, pour que le joueur reste maître de ses données. */
export function exportState(state: AppState): string {
  return JSON.stringify(state, null, 2);
}

/** Import d'une sauvegarde JSON, avec migration et validation minimale. */
export function importState(json: string): AppState {
  const parsed: unknown = JSON.parse(json);
  if (!parsed || typeof parsed !== "object" || !("profile" in parsed)) {
    throw new Error("Fichier de sauvegarde invalide : profil introuvable.");
  }
  return migrate(parsed);
}
