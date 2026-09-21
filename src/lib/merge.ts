/**
 * Fusion de deux sauvegardes.
 *
 * Situation type : on s'entraîne depuis son téléphone, puis on se connecte
 * pour la première fois depuis son ordinateur. Les deux appareils ont chacun
 * leur historique. Choisir « le plus riche » ferait disparaître l'autre :
 * on fusionne donc, en ne perdant rien de ce qui a été réellement fait.
 *
 * Tout ce qui est dérivable (série d'assiduité, quêtes) est recalculé ensuite
 * par le store à partir de l'historique fusionné.
 */
import type { AppState, PersonalRecord, RecordEntry } from "@/types/app";

/** Fusionne deux listes d'objets identifiés, en gardant la version choisie par `pick`. */
function mergeById<T>(a: T[], b: T[], id: (item: T) => string, pick: (x: T, y: T) => T): T[] {
  const map = new Map<string, T>();
  for (const item of [...a, ...b]) {
    const key = id(item);
    const existing = map.get(key);
    map.set(key, existing ? pick(existing, item) : item);
  }
  return [...map.values()];
}

/** Fusionne l'historique d'un record : on dédoublonne sur la date et le score. */
function mergeRecord(a: PersonalRecord, b: PersonalRecord): PersonalRecord {
  const seen = new Map<string, RecordEntry>();
  for (const entry of [...a.history, ...b.history]) {
    seen.set(`${entry.date}|${entry.score}`, entry);
  }
  const history = [...seen.values()].sort((x, y) => x.date.localeCompare(y.date));
  const best = history.reduce((top, entry) => (entry.score > top.score ? entry : top), history[0] ?? a.best);
  return { ...a, best, history };
}

export interface MergeResult {
  state: AppState;
  /** Ce qui a été récupéré de l'autre appareil, pour pouvoir l'annoncer. */
  added: { logs: number; records: number; badges: number; templates: number };
}

/**
 * Fusionne la sauvegarde locale et celle du compte.
 *
 * `base` désigne le côté qui fournit le profil et le total d'XP de référence :
 * c'est celui qui compte le plus de séances, donc l'appareil « principal ».
 * L'XP des séances que lui seul ignorait est ensuite ajoutée, ce qui évite
 * autant le double comptage que la perte sèche.
 */
export function mergeStates(local: AppState, remote: AppState): MergeResult {
  const localIsBase = local.logs.length >= remote.logs.length;
  const base = localIsBase ? local : remote;
  const other = localIsBase ? remote : local;

  const baseLogIds = new Set(base.logs.map((l) => l.id));
  const newLogs = other.logs.filter((l) => !baseLogIds.has(l.id));

  const logs = [...base.logs, ...newLogs].sort((a, b) => b.startedAt.localeCompare(a.startedAt));

  // Records : on réunit les deux historiques et on reprend le meilleur score.
  const records: Record<string, PersonalRecord> = { ...base.records };
  let newRecords = 0;
  for (const [id, record] of Object.entries(other.records)) {
    if (!records[id]) {
      records[id] = record;
      newRecords += 1;
    } else {
      const merged = mergeRecord(records[id], record);
      if (merged.best.score > records[id].best.score) newRecords += 1;
      records[id] = merged;
    }
  }

  const badges = mergeById(
    base.badges,
    other.badges,
    (b) => b.badgeId,
    // Un badge se garde à sa date d'obtention la plus ancienne.
    (x, y) => (x.unlockedAt <= y.unlockedAt ? x : y),
  );

  const templates = mergeById(
    base.templates,
    other.templates,
    (t) => t.id,
    (x, y) => (x.updatedAt >= y.updatedAt ? x : y),
  );

  const state: AppState = {
    ...base,
    profile: base.profile,
    // L'XP des séances que le côté de référence ne connaissait pas s'ajoute ;
    // le reste est déjà compté dans son total.
    xp: base.xp + newLogs.reduce((total, log) => total + log.xp, 0),
    logs,
    records,
    badges,
    templates,
    favorites: [...new Set([...base.favorites, ...other.favorites])],
    friends: mergeById(base.friends, other.friends, (f) => f.id, (x) => x),
    challenges: mergeById(base.challenges, other.challenges, (c) => c.id, (x, y) =>
      x.createdAt >= y.createdAt ? x : y,
    ),
    lastDailyChallengeDate: [base.lastDailyChallengeDate, other.lastDailyChallengeDate]
      .filter(Boolean)
      .sort()
      .pop(),
  };

  return {
    state,
    added: {
      logs: newLogs.length,
      records: newRecords,
      badges: badges.length - base.badges.length,
      templates: templates.length - base.templates.length,
    },
  };
}
