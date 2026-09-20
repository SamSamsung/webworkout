"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { WorkoutLog } from "@/types/app";
import { EXERCISES_BY_ID } from "@/data/exercises";
import { nextTier, tierFor, type Benchmark } from "@/data/benchmarks";
import { estimateCalories } from "@/lib/calculs";
import { formatDuration } from "@/lib/records";
import { cryptoRandomId } from "@/lib/storage";
import { setXp } from "@/lib/xp";
import { useApp } from "@/store/useApp";
import { Button, Card, Chip, cx, ProgressBar, SectionTitle } from "@/components/ui";

/** Formate un chrono en mm:ss. */
function clock(seconds: number): string {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

/**
 * Chronomètre d'un défi.
 *
 * Le temps est mesuré par différence d'horodatages plutôt qu'en incrémentant
 * un compteur : le chrono reste juste même si l'onglet passe en veille.
 * L'enregistrement crée une vraie séance (courte) : le défi alimente donc
 * l'XP, la série d'assiduité, les quêtes, les records et les badges, au lieu
 * de vivre dans son coin.
 */
export function ChallengeTimer({ benchmark, onClose }: { benchmark: Benchmark; onClose: () => void }) {
  const exercise = EXERCISES_BY_ID.get(benchmark.exerciseId);
  const record = useApp((s) => s.state.records[benchmark.exerciseId]);
  const bodyweight = useApp((s) => s.state.profile.bodyweightKg);
  const finishWorkout = useApp((s) => s.finishWorkout);

  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [saved, setSaved] = useState<{ xp: number; isRecord: boolean } | null>(null);

  useEffect(() => {
    if (!running || startedAt === null) return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 200);
    return () => clearInterval(id);
  }, [running, startedAt]);

  const best = record?.best.seconds ?? 0;
  const current = tierFor(benchmark, elapsed);
  const upcoming = nextTier(benchmark, elapsed);
  const finalTier = benchmark.tiers[benchmark.tiers.length - 1];

  const xpPreview = useMemo(
    () => (exercise ? setXp(exercise, { seconds: elapsed }, bodyweight) : 0),
    [exercise, elapsed, bodyweight],
  );

  if (!exercise) return null;

  const start = () => {
    // `Date.now()` dans un gestionnaire d'événement : hors rendu, sans effet
    // sur la pureté du composant.
    setStartedAt(Date.now() - elapsed * 1000);
    setRunning(true);
  };

  const reset = () => {
    setRunning(false);
    setStartedAt(null);
    setElapsed(0);
    setSaved(null);
  };

  /** Enregistre la performance comme une séance courte. */
  const save = () => {
    setRunning(false);
    const endedAt = new Date().toISOString();
    const startIso = new Date(Date.now() - elapsed * 1000).toISOString();
    const set = { seconds: elapsed, done: true };

    const log: WorkoutLog = {
      id: cryptoRandomId(),
      name: `Défi : ${benchmark.name}`,
      startedAt: startIso,
      endedAt,
      durationSeconds: Math.max(1, elapsed),
      exercises: [{ exerciseId: exercise.id, sets: [set], restSeconds: 0 }],
      volumeKg: 0,
      xp: setXp(exercise, set, bodyweight),
      calories: Math.round(estimateCalories(exercise.met ?? 8, bodyweight, elapsed)),
    };

    const result = finishWorkout(log);
    setSaved({ xp: result.xp, isRecord: elapsed > best });
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-ink-950/85 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={benchmark.name}
    >
      <div className="flex max-h-[92dvh] w-full max-w-lg flex-col gap-3 overflow-y-auto rounded-t-2xl border border-ink-600 bg-ink-900 p-4 sm:rounded-2xl">
        <div className="flex items-start gap-2">
          <span aria-hidden className="text-2xl">{benchmark.icon}</span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-base font-bold leading-tight">{benchmark.name}</h2>
            <Link href={`/exercices/${exercise.id}`} className="text-xs text-neon-cyan hover:underline">
              Voir la fiche technique
            </Link>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose}>
            Fermer
          </Button>
        </div>

        {/* ---------------------------------------------------- Chronomètre */}
        <div className="rounded-2xl border border-ink-600 bg-ink-950/60 p-4 text-center">
          <p
            className="font-display text-6xl font-black tabular-nums"
            style={{ color: current?.color ?? "#22d3ee" }}
            aria-live="off"
          >
            {clock(elapsed)}
          </p>

          <div className="mt-3">
            <ProgressBar
              value={Math.min(elapsed, finalTier.seconds)}
              max={finalTier.seconds}
              color={current?.color ?? "#22d3ee"}
              label="Progression vers le dernier palier"
            />
            <div className="mt-1.5 flex justify-between text-[10px] text-white/40">
              {benchmark.tiers.map((t) => (
                <span key={t.label} className={cx(elapsed >= t.seconds && "font-bold text-white/80")}>
                  {t.icon} {clock(t.seconds)}
                </span>
              ))}
            </div>
          </div>

          <p className="mt-3 text-xs text-white/55">
            {current ? (
              <>
                Palier atteint : <strong style={{ color: current.color }}>{current.icon} {current.label}</strong>
                {upcoming && ` · ${upcoming.label} dans ${clock(upcoming.seconds - elapsed)}`}
              </>
            ) : upcoming ? (
              <>Premier palier ({upcoming.icon} {upcoming.label}) dans {clock(upcoming.seconds - elapsed)}</>
            ) : null}
          </p>
          {elapsed > 0 && <p className="mt-1 text-[11px] text-neon-lime">+{xpPreview} XP si tu t&apos;arrêtes maintenant</p>}
        </div>

        {/* ------------------------------------------------------ Commandes */}
        <div className="flex gap-2">
          <Button className="flex-1" size="lg" onClick={running ? () => setRunning(false) : start}>
            {running ? "⏸ Pause" : elapsed > 0 ? "▶ Reprendre" : "▶ Démarrer"}
          </Button>
          <Button size="lg" variant="ghost" onClick={reset}>
            ↺
          </Button>
        </div>

        {elapsed > 0 && !saved && (
          <Button variant="soft" onClick={save}>
            💾 Enregistrer {clock(elapsed)}
          </Button>
        )}

        {saved && (
          <div className="rounded-xl border border-neon-lime/40 bg-neon-lime/[0.07] p-3 text-center" role="status">
            <p className="font-display text-sm font-bold text-neon-lime">
              {saved.isRecord ? "🏆 Nouveau record personnel !" : "Performance enregistrée"}
            </p>
            <p className="mt-0.5 text-xs text-white/60">
              {clock(elapsed)} · +{saved.xp} XP · compté comme une séance du jour
            </p>
          </div>
        )}

        {/* ------------------------------------------------ Record et règles */}
        <div className="flex flex-wrap gap-1.5">
          <Chip color="#a3e635">🏅 Record : {best > 0 ? formatDuration(best) : "—"}</Chip>
          {benchmark.music && (
            <Chip className="text-white/55">
              🎧 {benchmark.music.title} — {benchmark.music.artist} ({clock(benchmark.music.seconds)})
            </Chip>
          )}
        </div>

        <Card className="bg-ink-950/40">
          <SectionTitle icon="📜" title="Règle du jeu" />
          <ol className="flex flex-col gap-1.5">
            {benchmark.rules.map((rule, i) => (
              <li key={i} className="flex gap-2 text-xs leading-relaxed text-white/70">
                <span aria-hidden className="text-white/30">{i + 1}.</span>
                <span>{rule}</span>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  );
}
