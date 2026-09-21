/**
 * Série d'assiduité (« streak ») et calendrier d'entraînement.
 *
 * Règle retenue : la série est conservée si l'on s'entraîne le jour même ou
 * la veille. Un jour manqué peut être « gelé » grâce à un joker, avec un
 * joker regagné chaque semaine — pour encourager la régularité sans punir
 * un imprévu.
 */
import type { StreakState, WorkoutLog } from "@/types/app";

/** Clé de jour locale au format AAAA-MM-JJ (évite les décalages UTC). */
export function dayKey(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Nombre de jours calendaires entre deux clés de jour. */
export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const da = Date.UTC(ay, am - 1, ad);
  const db = Date.UTC(by, bm - 1, bd);
  return Math.round((db - da) / 86_400_000);
}

/** Nombre de jours d'inactivité qui redonne un joker. */
const FREEZE_RECHARGE_DAYS = 7;
/** Plafond de jokers accumulables. */
const MAX_FREEZES = 3;

/**
 * Recalcule entièrement la série à partir de l'historique.
 *
 * C'est une fonction *dérivée* et non incrémentale, et c'est délibéré :
 * l'utilisateur peut saisir une séance passée, en corriger la date ou en
 * supprimer une. Une série mise à jour pas à pas se désynchroniserait au
 * premier de ces cas ; recalculée depuis les journaux, elle reste toujours
 * juste, quel que soit l'ordre dans lequel les séances ont été saisies.
 *
 * Règles :
 * - deux jours consécutifs prolongent la série ;
 * - un seul jour manqué est pardonné si un joker est disponible ;
 * - un joker est regagné par tranche de sept jours écoulés, plafonné à trois.
 */
export function computeStreak(logs: WorkoutLog[], now: Date = new Date()): StreakState {
  const days = [...new Set(logs.map((log) => dayKey(log.startedAt)))].sort();
  if (!days.length) return { current: 0, best: 0, freezesLeft: 1 };

  let current = 1;
  let best = 1;
  let freezes = 1;

  for (let i = 1; i < days.length; i++) {
    const gap = daysBetween(days[i - 1], days[i]);
    // Le temps écoulé recharge les jokers, y compris pendant une interruption.
    freezes = Math.min(MAX_FREEZES, freezes + Math.floor(gap / FREEZE_RECHARGE_DAYS));

    if (gap === 1) {
      current += 1;
    } else if (gap === 2 && freezes > 0) {
      current += 1;
      freezes -= 1;
    } else {
      current = 1;
    }
    best = Math.max(best, current);
  }

  // Jokers regagnés depuis la dernière séance, pour l'affichage du jour.
  const sinceLast = Math.max(0, daysBetween(days[days.length - 1], dayKey(now)));
  freezes = Math.min(MAX_FREEZES, freezes + Math.floor(sinceLast / FREEZE_RECHARGE_DAYS));

  return { current, best, lastTrainingDay: days[days.length - 1], freezesLeft: freezes };
}

/**
 * Détermine si la série est encore vivante à la date donnée.
 * Une série « expirée » reste affichée mais doit être signalée comme rompue.
 */
export function isStreakAlive(streak: StreakState, now = new Date()): boolean {
  if (!streak.lastTrainingDay) return false;
  const gap = daysBetween(streak.lastTrainingDay, dayKey(now));
  return gap <= 1 || (gap === 2 && streak.freezesLeft > 0);
}

/** Ensemble des jours entraînés, pour le calendrier d'assiduité. */
export function trainingDays(logs: WorkoutLog[]): Set<string> {
  return new Set(logs.map((log) => dayKey(log.startedAt)));
}

/**
 * Grille du calendrier sur N semaines, à la manière d'un graphe de
 * contributions : chaque case porte sa date, son intensité et son volume.
 */
export function calendarGrid(logs: WorkoutLog[], weeks = 26, now = new Date()) {
  const byDay = new Map<string, { count: number; xp: number; volume: number }>();
  for (const log of logs) {
    const key = dayKey(log.startedAt);
    const prev = byDay.get(key) ?? { count: 0, xp: 0, volume: 0 };
    byDay.set(key, { count: prev.count + 1, xp: prev.xp + log.xp, volume: prev.volume + log.volumeKg });
  }

  const cells: Array<{ date: string; count: number; xp: number; volume: number; level: 0 | 1 | 2 | 3 | 4 }> = [];
  const end = new Date(now);
  // On remonte jusqu'au lundi qui ouvre la période affichée.
  const start = new Date(end);
  start.setDate(start.getDate() - weeks * 7 + 1);
  const offset = (start.getDay() + 6) % 7; // lundi = 0
  start.setDate(start.getDate() - offset);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = dayKey(d);
    const data = byDay.get(key) ?? { count: 0, xp: 0, volume: 0 };
    const level = data.xp === 0 ? 0 : data.xp < 80 ? 1 : data.xp < 200 ? 2 : data.xp < 400 ? 3 : 4;
    cells.push({ date: key, ...data, level });
  }
  return cells;
}

/** Identifiant de la semaine ISO (ex. « 2026-W12 »), clé des quêtes hebdomadaires. */
export function isoWeek(date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
