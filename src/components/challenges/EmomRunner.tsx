"use client";

import { useEffect, useMemo, useState } from "react";
import type { Exercise } from "@/types/exercise";
import type { WorkoutLog, WorkoutSet } from "@/types/app";
import { EXERCISES_BY_ID } from "@/data/exercises";
import { GROUP_META } from "@/data/taxonomy";
import { beepFinish, beepRoundStart, beepTick } from "@/lib/audio";
import { estimateCalories } from "@/lib/calculs";
import { formatDuration } from "@/lib/records";
import { cryptoRandomId } from "@/lib/storage";
import { setVolumeKg, setXp } from "@/lib/xp";
import { useApp } from "@/store/useApp";
import { Button, Card, Chip, cx, ProgressBar, SectionTitle } from "@/components/ui";
import { ExercisePicker } from "@/components/workouts/ExercisePicker";

/** Intervalles proposés : la minute est le standard, les autres sont des variantes courantes. */
const INTERVALS = [
  { seconds: 30, label: "E30S — toutes les 30 s" },
  { seconds: 60, label: "EMOM — chaque minute" },
  { seconds: 90, label: "E90S — toutes les 90 s" },
  { seconds: 120, label: "E2MOM — toutes les 2 min" },
];

/** Suggestions d'exercices adaptés au format, proposées avant d'ouvrir la base complète. */
const SUGGESTIONS = ["pompe-classique", "traction-pronation", "squat-poids-du-corps", "burpee", "kettlebell-swing", "dips-barres-paralleles"];

function clock(seconds: number): string {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(Math.floor(seconds) % 60).padStart(2, "0")}`;
}

/**
 * Protocole EMOM (« Every Minute On the Minute »).
 *
 * On choisit un exercice, un nombre de répétitions et un nombre de tours :
 * à chaque top, on refait la série, et tout le temps qu'il reste dans
 * l'intervalle est du repos. Plus on va vite, plus on récupère — c'est ce qui
 * rend le format à la fois simple et impitoyable.
 */
export function EmomRunner({ onClose }: { onClose: () => void }) {
  const bodyweight = useApp((s) => s.state.profile.bodyweightKg);
  const finishWorkout = useApp((s) => s.finishWorkout);

  // ------------------------------------------------------------ Réglages
  const [exercise, setExercise] = useState<Exercise | null>(EXERCISES_BY_ID.get("pompe-classique") ?? null);
  const [picking, setPicking] = useState(false);
  const [target, setTarget] = useState(10);
  const [weight, setWeight] = useState(0);
  const [rounds, setRounds] = useState(10);
  const [interval, setIntervalSeconds] = useState(60);

  // -------------------------------------------------------------- Chrono
  const [startMs, setStartMs] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  /** Temps mis pour boucler chaque tour, indexé par numéro de tour (base 0). */
  const [splits, setSplits] = useState<number[]>([]);
  const [stoppedAtRound, setStoppedAtRound] = useState<number | null>(null);
  const [saved, setSaved] = useState<{ xp: number } | null>(null);

  const isTimed = exercise?.metric === "temps";
  const isWeighted = exercise?.metric === "poids-reps" || exercise?.metric === "reps-lestees";
  const total = rounds * interval;
  const started = startMs !== null;
  const finished = started && (elapsed >= total || stoppedAtRound !== null);

  const round = Math.min(rounds, Math.floor(elapsed / interval) + 1);
  const intoRound = elapsed % interval;
  const remaining = interval - intoRound;
  const roundDone = splits[round - 1] !== undefined;

  // Le chrono se déduit d'un horodatage de départ : il reste juste même si
  // l'onglet passe en veille, contrairement à un compteur incrémenté.
  useEffect(() => {
    if (startMs === null) return;
    const id = setInterval(() => {
      const value = Math.floor((Date.now() - startMs) / 1000);
      setElapsed(value);
      if (value >= total) clearInterval(id);
    }, 200);
    return () => clearInterval(id);
  }, [startMs, total]);

  // Signaux sonores : départ de tour, décompte, fin de protocole.
  useEffect(() => {
    if (!started || finished) return;
    beepRoundStart();
  }, [round, started, finished]);

  useEffect(() => {
    if (!started || finished || roundDone) return;
    if (remaining <= 3 && remaining > 0) beepTick();
  }, [remaining, started, finished, roundDone]);

  useEffect(() => {
    if (finished) beepFinish();
  }, [finished]);

  /**
   * Tours effectivement bouclés. Le tour courant compte dès qu'il est validé :
   * sans cela, s'arrêter juste après avoir fini sa série perdait ce tour.
   */
  const roundsSoFar = roundDone ? round : round - 1;
  const completedRounds = stoppedAtRound ?? (elapsed >= total ? rounds : roundsSoFar);

  const perSet: WorkoutSet = useMemo(
    () => (isTimed ? { seconds: target, done: true } : { reps: target, weight: isWeighted ? weight : undefined, done: true }),
    [isTimed, isWeighted, target, weight],
  );

  const xpTotal = useMemo(
    () => (exercise ? completedRounds * setXp(exercise, perSet, bodyweight) : 0),
    [exercise, completedRounds, perSet, bodyweight],
  );

  if (!exercise) return null;
  const meta = GROUP_META[exercise.group];

  const start = () => {
    setSplits([]);
    setStoppedAtRound(null);
    setSaved(null);
    setElapsed(0);
    setStartMs(Date.now());
  };

  const reset = () => {
    setStartMs(null);
    setElapsed(0);
    setSplits([]);
    setStoppedAtRound(null);
    setSaved(null);
  };

  /** Marque le tour courant comme bouclé et mémorise le temps mis. */
  const validateRound = () => {
    setSplits((prev) => {
      const next = [...prev];
      next[round - 1] = intoRound;
      return next;
    });
  };

  /** Arrête le protocole en cours : les tours déjà bouclés restent acquis. */
  const giveUp = () => setStoppedAtRound(Math.max(0, roundsSoFar));

  const save = () => {
    const sets = Array.from({ length: completedRounds }, () => ({ ...perSet }));
    const durationSeconds = Math.max(1, Math.min(elapsed, total));
    const volumeKg = sets.reduce((t, s) => t + setVolumeKg(exercise, s, bodyweight), 0);

    const log: WorkoutLog = {
      id: cryptoRandomId(),
      name: `EMOM ${completedRounds} × ${target}${isTimed ? " s" : ""} — ${exercise.name}`,
      startedAt: new Date(Date.now() - durationSeconds * 1000).toISOString(),
      endedAt: new Date().toISOString(),
      durationSeconds,
      exercises: [{ exerciseId: exercise.id, sets, restSeconds: interval }],
      volumeKg: Math.round(volumeKg),
      xp: xpTotal,
      calories: Math.round(estimateCalories(exercise.met ?? 8, bodyweight, durationSeconds)),
    };

    const result = finishWorkout(log);
    setSaved({ xp: result.xp });
  };

  const averageSplit = splits.filter((s) => s !== undefined).length
    ? splits.filter((s) => s !== undefined).reduce((a, b) => a + b, 0) / splits.filter((s) => s !== undefined).length
    : null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-ink-950/85 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Protocole EMOM"
    >
      <div className="flex h-dvh w-full max-w-lg flex-col gap-3 overflow-y-auto bg-ink-900 p-4 sm:h-auto sm:max-h-[92dvh] sm:rounded-2xl sm:border sm:border-ink-600">
        <div className="flex items-start gap-2">
          <span aria-hidden className="text-2xl">⏱️</span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-base font-bold leading-tight">EMOM — chaque minute, une série</h2>
            <p className="text-[11px] text-white/45">Tout le temps que tu ne passes pas à travailler est du repos.</p>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose}>
            Fermer
          </Button>
        </div>

        {/* ======================================================= RÉGLAGES */}
        {!started && (
          <>
            <Card className="flex flex-col gap-3 bg-ink-950/40">
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-white/35">Exercice</p>
                <button
                  type="button"
                  onClick={() => setPicking(true)}
                  className="flex w-full items-center gap-2 rounded-xl border border-ink-600 bg-ink-900 p-2.5 text-left transition hover:border-ink-500"
                >
                  <span aria-hidden className="text-lg">{meta.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{exercise.name}</span>
                    <span className="block text-[11px] text-white/40">{meta.label} · changer</span>
                  </span>
                  <span aria-hidden className="text-white/30">›</span>
                </button>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {SUGGESTIONS.map((id) => {
                    const suggestion = EXERCISES_BY_ID.get(id);
                    if (!suggestion) return null;
                    const active = suggestion.id === exercise.id;
                    return (
                      <button key={id} type="button" onClick={() => setExercise(suggestion)} aria-pressed={active}>
                        <Chip
                          color={active ? GROUP_META[suggestion.group].hex : undefined}
                          className={active ? "font-bold" : "text-white/45 hover:text-white/75"}
                        >
                          {suggestion.name}
                        </Chip>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Field
                  label={isTimed ? "Secondes par tour" : "Répétitions par tour"}
                  value={target}
                  onChange={setTarget}
                  min={1}
                />
                <Field label="Nombre de tours" value={rounds} onChange={setRounds} min={1} max={60} />
                {isWeighted && <Field label="Charge (kg)" value={weight} onChange={setWeight} step={2.5} />}
              </div>

              <label className="flex flex-col gap-1 text-xs">
                <span className="text-white/45">Intervalle</span>
                <select
                  value={interval}
                  onChange={(e) => setIntervalSeconds(Number(e.target.value))}
                  className="rounded-lg border border-ink-600 bg-ink-900 px-2 py-2 text-sm outline-none focus:border-neon-violet"
                >
                  {INTERVALS.map((i) => (
                    <option key={i.seconds} value={i.seconds}>
                      {i.label}
                    </option>
                  ))}
                </select>
              </label>
            </Card>

            <div className="rounded-xl border border-ink-700 bg-ink-950/40 p-3 text-center">
              <p className="font-display text-sm font-bold">
                {rounds} × {target}
                {isTimed ? " s" : " reps"} de {exercise.name.toLowerCase()}
              </p>
              <p className="mt-0.5 text-xs text-white/50">
                {formatDuration(rounds * interval)} au total ·{" "}
                {isTimed ? `${Math.max(0, interval - target)} s de repos par tour` : "le repos, c'est ce qu'il te reste"}
              </p>
              <p className="mt-1 text-[11px] text-neon-lime">+{rounds * setXp(exercise, perSet, bodyweight)} XP si tu vas au bout</p>
            </div>

            <Button size="lg" onClick={start}>
              ▶ Lancer le protocole
            </Button>
          </>
        )}

        {/* ========================================================= EN COURS */}
        {started && !finished && (
          <>
            <div className="rounded-2xl border border-ink-600 bg-ink-950/60 p-4 text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-white/40">
                Tour {round} / {rounds}
              </p>
              <p
                className={cx(
                  "font-display text-6xl font-black tabular-nums",
                  roundDone ? "text-neon-lime" : remaining <= 10 ? "text-neon-rose" : "text-neon-cyan",
                )}
              >
                {clock(remaining)}
              </p>
              <p className="mt-1 text-sm text-white/60">
                {roundDone ? (
                  <>
                    ✅ Tour bouclé en {splits[round - 1]} s — <strong className="text-neon-lime">{remaining} s de repos</strong>
                  </>
                ) : (
                  <>
                    {target}
                    {isTimed ? " s" : " reps"} de {exercise.name.toLowerCase()}
                  </>
                )}
              </p>

              <ProgressBar
                value={intoRound}
                max={interval}
                color={roundDone ? "#a3e635" : "#22d3ee"}
                className="mt-3"
                label="Temps écoulé dans le tour"
              />
              <ProgressBar
                value={elapsed}
                max={total}
                color="#a855f7"
                className="mt-1.5 h-1"
                label="Progression du protocole"
              />
              <p className="mt-1 text-[11px] text-white/35">
                {formatDuration(Math.max(0, total - elapsed))} restantes · +{xpTotal} XP acquis
              </p>
            </div>

            <Button size="lg" onClick={validateRound} disabled={roundDone}>
              {roundDone ? "✅ Tour validé" : "✓ J'ai fini ma série"}
            </Button>

            {/* Récapitulatif des tours bouclés */}
            <div className="flex flex-wrap gap-1">
              {Array.from({ length: rounds }, (_, i) => (
                <span
                  key={i}
                  title={splits[i] !== undefined ? `Tour ${i + 1} : ${splits[i]} s` : `Tour ${i + 1}`}
                  className={cx(
                    "flex h-7 min-w-7 items-center justify-center rounded-md px-1 text-[10px] font-bold tabular-nums",
                    splits[i] !== undefined
                      ? "bg-neon-lime/20 text-neon-lime"
                      : i + 1 === round
                        ? "bg-neon-cyan/20 text-neon-cyan"
                        : "bg-ink-800 text-white/25",
                  )}
                >
                  {splits[i] !== undefined ? `${splits[i]}s` : i + 1}
                </span>
              ))}
            </div>

            <Button variant="danger" onClick={giveUp}>
              ✋ J&apos;arrête là
            </Button>
          </>
        )}

        {/* =========================================================== BILAN */}
        {finished && (
          <>
            <div className="rounded-2xl border border-neon-violet/40 bg-neon-violet/[0.06] p-4 text-center">
              <div className="text-4xl" aria-hidden>
                {completedRounds >= rounds ? "🏁" : "💪"}
              </div>
              <p className="mt-1 font-display text-lg font-black">
                {completedRounds} / {rounds} tours
              </p>
              <p className="text-xs text-white/55">
                {completedRounds * target}
                {isTimed ? " secondes" : " répétitions"} au total
                {averageSplit !== null && ` · ${averageSplit.toFixed(0)} s en moyenne par tour`}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <Metric label="XP" value={`+${xpTotal}`} color="#a3e635" />
              <Metric label="Durée" value={formatDuration(Math.min(elapsed, total))} color="#22d3ee" />
              <Metric label="Repos moyen" value={averageSplit !== null ? `${Math.max(0, interval - averageSplit).toFixed(0)} s` : "—"} color="#fbbf24" />
            </div>

            {saved ? (
              <p className="rounded-lg bg-neon-lime/10 px-3 py-2 text-center text-xs text-neon-lime" role="status">
                Enregistré : +{saved.xp} XP, compté comme une séance du jour.
              </p>
            ) : (
              <Button size="lg" onClick={save} disabled={completedRounds === 0}>
                💾 Enregistrer la séance
              </Button>
            )}

            <div className="flex gap-2">
              <Button className="flex-1" variant="soft" onClick={reset}>
                ↺ Recommencer
              </Button>
              <Button variant="ghost" onClick={onClose}>
                Fermer
              </Button>
            </div>
          </>
        )}

        {!started && (
          <Card className="bg-ink-950/40">
            <SectionTitle icon="📜" title="Comment ça marche" />
            <ul className="flex flex-col gap-1.5 text-xs leading-relaxed text-white/60">
              <li>À chaque top, tu fais ta série. Le temps qu&apos;il te reste dans l&apos;intervalle est ton repos.</li>
              <li>Un bip double annonce chaque nouveau tour, trois bips courts les dernières secondes.</li>
              <li>Vise un volume qui te laisse au moins 20 s de repos sur les premiers tours, sinon tu exploses à la moitié.</li>
              <li>Les tours bouclés sont comptés même si tu t&apos;arrêtes avant la fin.</li>
            </ul>
          </Card>
        )}
      </div>

      {picking && (
        <ExercisePicker
          onClose={() => setPicking(false)}
          onPick={(ex) => {
            setExercise(ex);
            // On repart sur une valeur plausible pour le nouvel exercice.
            setTarget(ex.metric === "temps" ? (ex.repRange?.[0] ?? 30) : (ex.repRange?.[0] ?? 10));
            setPicking(false);
          }}
        />
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  min = 0,
  max,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="text-white/45">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-sm tabular-nums outline-none focus:border-neon-violet"
      />
    </label>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg border border-ink-700 bg-ink-950/40 p-2">
      <div className="text-[10px] text-white/40">{label}</div>
      <div className="font-display text-sm font-black tabular-nums" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
