"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { WorkoutExercise, WorkoutLog, WorkoutSet } from "@/types/app";
import { EXERCISES_BY_ID } from "@/data/exercises";
import { GROUP_META } from "@/data/taxonomy";
import { estimateCalories } from "@/lib/calculs";
import { formatDuration } from "@/lib/records";
import { cryptoRandomId } from "@/lib/storage";
import { setVolumeKg, setXp } from "@/lib/xp";
import { useApp } from "@/store/useApp";
import { BADGES_BY_ID } from "@/lib/badges";
import { Button, Card, Chip, EmptyState, ProgressBar, SectionTitle } from "@/components/ui";
import { ExercisePicker } from "./ExercisePicker";

/** Bip de fin de repos, généré à la volée : aucun fichier audio à charger. */
function beep() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    osc.start();
    osc.stop(ctx.currentTime + 0.42);
    setTimeout(() => void ctx.close(), 600);
  } catch {
    // L'audio peut être bloqué tant que l'utilisateur n'a pas interagi :
    // ce n'est pas bloquant pour la séance.
  }
}

/**
 * Lecteur de séance en direct.
 *
 * L'état de la séance vit dans le composant (copie de travail) ; il n'est
 * écrit dans le store qu'à la validation finale. On évite ainsi de polluer
 * l'historique avec des séances abandonnées.
 */
export function SessionPlayer() {
  const router = useRouter();
  const params = useSearchParams();
  const templateId = params.get("template");

  const template = useApp((s) => s.state.templates.find((t) => t.id === templateId));
  const bodyweight = useApp((s) => s.state.profile.bodyweightKg);
  const finishWorkout = useApp((s) => s.finishWorkout);

  const [name, setName] = useState(template?.name ?? "Séance libre");
  const [entries, setEntries] = useState<WorkoutExercise[]>(template?.exercises ?? []);
  const [startedAt] = useState(() => new Date().toISOString());
  const [elapsed, setElapsed] = useState(0);
  const [rest, setRest] = useState<{ remaining: number; total: number } | null>(null);
  const [picking, setPicking] = useState(false);
  const [summary, setSummary] = useState<{ xp: number; records: string[]; badges: string[]; log: WorkoutLog } | null>(
    null,
  );
  // Horodatage de départ figé : dérivé de `startedAt` plutôt que relu à
  // chaque rendu, pour que le composant reste pur.
  const startMs = useMemo(() => new Date(startedAt).getTime(), [startedAt]);

  // Chronomètre global : on mesure depuis l'horodatage de départ plutôt que
  // d'incrémenter un compteur, pour rester juste si l'onglet passe en veille.
  useEffect(() => {
    if (summary) return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startMs) / 1000)), 1000);
    return () => clearInterval(id);
  }, [summary, startMs]);

  // Minuteur de repos.
  // La mise à jour se fait dans le callback du timer : l'effet lui-même ne
  // déclenche aucun rendu en cascade.
  useEffect(() => {
    if (!rest) return;
    const id = setTimeout(() => {
      if (rest.remaining <= 1) {
        beep();
        setRest(null);
      } else {
        setRest({ ...rest, remaining: rest.remaining - 1 });
      }
    }, 1000);
    return () => clearTimeout(id);
  }, [rest]);

  const totalSets = entries.reduce((n, e) => n + e.sets.length, 0);
  const doneSets = entries.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);

  /** XP courante, recalculée à chaque validation de série. */
  const liveXp = useMemo(
    () =>
      entries.reduce((total, entry) => {
        const ex = EXERCISES_BY_ID.get(entry.exerciseId);
        if (!ex) return total;
        return (
          total +
          entry.sets.filter((s) => s.done).reduce((sum, set) => sum + setXp(ex, set, bodyweight), 0)
        );
      }, 0),
    [entries, bodyweight],
  );

  const liveVolume = useMemo(
    () =>
      entries.reduce((total, entry) => {
        const ex = EXERCISES_BY_ID.get(entry.exerciseId);
        if (!ex) return total;
        return (
          total + entry.sets.filter((s) => s.done).reduce((sum, set) => sum + setVolumeKg(ex, set, bodyweight), 0)
        );
      }, 0),
    [entries, bodyweight],
  );

  const updateSet = useCallback(
    (exIndex: number, setIndex: number, patch: Partial<WorkoutSet>) =>
      setEntries((prev) =>
        prev.map((e, i) =>
          i === exIndex ? { ...e, sets: e.sets.map((s, j) => (j === setIndex ? { ...s, ...patch } : s)) } : e,
        ),
      ),
    [],
  );

  /** Valide une série et démarre le repos si l'exercice n'est pas terminé. */
  function toggleSet(exIndex: number, setIndex: number) {
    const entry = entries[exIndex];
    const wasDone = entry.sets[setIndex].done;
    updateSet(exIndex, setIndex, { done: !wasDone });
    if (!wasDone && entry.restSeconds > 0) {
      setRest({ remaining: entry.restSeconds, total: entry.restSeconds });
    }
  }

  /** Clôt la séance : calcule le journal puis le transmet au store. */
  function finish() {
    const endedAt = new Date().toISOString();
    const durationSeconds = Math.max(1, Math.floor((Date.now() - startMs) / 1000));

    const calories = Math.round(
      entries.reduce((total, entry) => {
        const ex = EXERCISES_BY_ID.get(entry.exerciseId);
        if (!ex) return total;
        const share = totalSets > 0 ? entry.sets.filter((s) => s.done).length / totalSets : 0;
        return total + estimateCalories(ex.met ?? 5, bodyweight, durationSeconds * share);
      }, 0),
    );

    const log: WorkoutLog = {
      id: cryptoRandomId(),
      templateId: template?.id,
      name,
      startedAt,
      endedAt,
      durationSeconds,
      exercises: entries.map((e) => ({ ...e, sets: e.sets.filter((s) => s.done) })).filter((e) => e.sets.length > 0),
      volumeKg: Math.round(liveVolume),
      xp: liveXp,
      calories,
    };

    const result = finishWorkout(log);
    setSummary({ xp: result.xp, records: result.newRecords, badges: result.newBadges, log });
  }

  // ------------------------------------------------------------- Rendu
  if (summary) {
    return <SessionSummary summary={summary} onClose={() => router.push("/")} />;
  }

  if (!entries.length) {
    return (
      <EmptyState
        icon="🎬"
        title="Séance vide"
        description="Ajoute des exercices pour démarrer, ou choisis une séance enregistrée."
        action={
          <div className="flex gap-2">
            <Button onClick={() => setPicking(true)}>Ajouter un exercice</Button>
            <Button variant="ghost" href="/seances">
              Mes séances
            </Button>
            {picking && (
              <ExercisePicker
                onClose={() => setPicking(false)}
                onPick={(ex) => {
                  setEntries((prev) => [
                    ...prev,
                    {
                      exerciseId: ex.id,
                      restSeconds: Math.round((ex.restSeconds[0] + ex.restSeconds[1]) / 2),
                      sets: Array.from({ length: 3 }, () =>
                        ex.metric === "temps" ? { seconds: 30 } : { reps: ex.repRange?.[0] ?? 10 },
                      ),
                    },
                  ]);
                  setPicking(false);
                }}
              />
            )}
          </div>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-24">
      {/* Bandeau de séance : chrono, progression, XP en direct */}
      <Card className="sticky top-[57px] z-30 flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Nom de la séance"
            className="w-full bg-transparent font-display text-base font-bold outline-none"
          />
          <ProgressBar value={doneSets} max={Math.max(1, totalSets)} className="mt-1.5" label="Progression de la séance" />
          <p className="mt-1 text-[11px] text-white/45">
            {doneSets} / {totalSets} séries validées
          </p>
        </div>
        <div className="flex gap-2 text-center">
          <Metric label="Chrono" value={formatDuration(elapsed)} color="#22d3ee" />
          <Metric label="XP" value={`+${liveXp}`} color="#a3e635" />
          {liveVolume > 0 && <Metric label="Volume" value={`${Math.round(liveVolume)} kg`} color="#fbbf24" />}
        </div>
      </Card>

      {/* Minuteur de repos */}
      {rest && (
        <Card className="flex items-center gap-3 border-neon-cyan/40 bg-neon-cyan/[0.06]">
          <span aria-hidden className="text-2xl">⏳</span>
          <div className="flex-1">
            <p className="font-display text-sm font-bold text-neon-cyan">Repos : {rest.remaining} s</p>
            <ProgressBar
              value={rest.total - rest.remaining}
              max={rest.total}
              color="#22d3ee"
              className="mt-1"
              label="Temps de repos écoulé"
            />
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={() => setRest({ ...rest, remaining: rest.remaining + 30 })}>
              +30 s
            </Button>
            <Button size="sm" variant="soft" onClick={() => setRest(null)}>
              Passer
            </Button>
          </div>
        </Card>
      )}

      {/* Exercices */}
      <ul className="flex flex-col gap-3">
        {entries.map((entry, exIndex) => {
          const ex = EXERCISES_BY_ID.get(entry.exerciseId);
          if (!ex) return null;
          const meta = GROUP_META[ex.group];
          const allDone = entry.sets.every((s) => s.done);
          return (
            <Card
              as="li"
              key={`${entry.exerciseId}-${exIndex}`}
              className={allDone ? "border-neon-lime/30 bg-neon-lime/[0.04]" : undefined}
            >
              <div className="mb-2 flex items-start gap-2">
                <span aria-hidden className="text-lg">{meta.icon}</span>
                <div className="min-w-0 flex-1">
                  <Link href={`/exercices/${ex.id}`} className="font-display text-sm font-bold hover:text-neon-cyan">
                    {ex.name}
                  </Link>
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    <Chip color={meta.hex}>{meta.label}</Chip>
                    <Chip className="text-white/40">Repos {entry.restSeconds} s</Chip>
                    {allDone && <Chip color="#a3e635">✓ Terminé</Chip>}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                {entry.sets.map((set, setIndex) => (
                  <div
                    key={setIndex}
                    className={`flex items-center gap-2 rounded-lg px-2 py-1.5 transition ${
                      set.done ? "bg-neon-lime/10" : "bg-ink-900/50"
                    }`}
                  >
                    <span className="w-6 shrink-0 text-[11px] font-bold text-white/35">{setIndex + 1}</span>

                    {ex.metric === "temps" ? (
                      <LiveField
                        suffix="s"
                        value={set.seconds ?? 0}
                        onChange={(v) => updateSet(exIndex, setIndex, { seconds: v })}
                      />
                    ) : ex.metric === "distance" ? (
                      <LiveField
                        suffix="m"
                        value={set.meters ?? 0}
                        onChange={(v) => updateSet(exIndex, setIndex, { meters: v })}
                      />
                    ) : (
                      <>
                        <LiveField
                          suffix="reps"
                          value={set.reps ?? 0}
                          onChange={(v) => updateSet(exIndex, setIndex, { reps: v })}
                        />
                        {(ex.metric === "poids-reps" || ex.metric === "reps-lestees") && (
                          <LiveField
                            suffix="kg"
                            step={0.5}
                            value={set.weight ?? 0}
                            onChange={(v) => updateSet(exIndex, setIndex, { weight: v })}
                          />
                        )}
                      </>
                    )}

                    <span className="ml-auto text-[11px] tabular-nums text-white/35">
                      +{setXp(ex, set, bodyweight)} XP
                    </span>

                    <button
                      type="button"
                      onClick={() => toggleSet(exIndex, setIndex)}
                      aria-pressed={Boolean(set.done)}
                      aria-label={`Valider la série ${setIndex + 1}`}
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-black transition ${
                        set.done
                          ? "bg-neon-lime text-ink-950"
                          : "border border-ink-600 text-white/40 hover:border-neon-lime hover:text-neon-lime"
                      }`}
                    >
                      ✓
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-2 flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setEntries((prev) =>
                      prev.map((e, i) =>
                        i === exIndex ? { ...e, sets: [...e.sets, { ...(e.sets.at(-1) ?? { reps: 10 }), done: false }] } : e,
                      ),
                    )
                  }
                >
                  ＋ Série
                </Button>
              </div>
            </Card>
          );
        })}
      </ul>

      <div className="flex flex-wrap gap-2">
        <Button variant="soft" onClick={() => setPicking(true)}>
          ＋ Ajouter un exercice
        </Button>
      </div>

      {/* Barre d'action fixe */}
      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-ink-700 bg-ink-950/95 p-3 backdrop-blur-xl md:bottom-0">
        <div className="mx-auto flex max-w-6xl gap-2">
          <Button className="flex-1" size="lg" onClick={finish} disabled={doneSets === 0}>
            🏁 Terminer la séance ({liveXp} XP)
          </Button>
          <Button variant="ghost" size="lg" href="/seances">
            Quitter
          </Button>
        </div>
      </div>

      {picking && (
        <ExercisePicker
          onClose={() => setPicking(false)}
          onPick={(ex) => {
            setEntries((prev) => [
              ...prev,
              {
                exerciseId: ex.id,
                restSeconds: Math.round((ex.restSeconds[0] + ex.restSeconds[1]) / 2),
                sets: Array.from({ length: 3 }, () =>
                  ex.metric === "temps" ? { seconds: 30 } : { reps: ex.repRange?.[0] ?? 10 },
                ),
              },
            ]);
            setPicking(false);
          }}
        />
      )}
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg bg-ink-900/70 px-2.5 py-1.5">
      <div className="text-[10px] font-medium text-white/40">{label}</div>
      <div className="font-display text-sm font-black tabular-nums" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

function LiveField({
  value,
  onChange,
  suffix,
  step = 1,
}: {
  value: number;
  onChange: (v: number) => void;
  suffix: string;
  step?: number;
}) {
  return (
    <label className="flex items-center gap-1 text-[11px] text-white/40">
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-14 rounded border border-ink-600 bg-ink-950 px-1 py-1 text-center text-sm tabular-nums outline-none focus:border-neon-violet"
      />
      {suffix}
    </label>
  );
}

/** Écran de fin : récapitulatif, records battus et badges débloqués. */
function SessionSummary({
  summary,
  onClose,
}: {
  summary: { xp: number; records: string[]; badges: string[]; log: WorkoutLog };
  onClose: () => void;
}) {
  const { log } = summary;
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 py-6">
      <div className="text-center">
        <div className="animate-float text-6xl" aria-hidden>
          🏁
        </div>
        <h1 className="mt-2 font-display text-2xl font-black">Séance terminée</h1>
        <p className="text-sm text-white/50">{log.name}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryTile label="XP gagnée" value={`+${summary.xp}`} color="#a3e635" />
        <SummaryTile label="Durée" value={formatDuration(log.durationSeconds)} color="#22d3ee" />
        <SummaryTile label="Volume" value={`${Math.round(log.volumeKg).toLocaleString("fr-FR")} kg`} color="#fbbf24" />
        <SummaryTile label="Calories" value={`${log.calories} kcal`} color="#fb7185" />
      </div>

      {summary.records.length > 0 && (
        <Card className="border-neon-lime/40 bg-neon-lime/[0.06]">
          <SectionTitle icon="🏆" title="Nouveaux records" />
          <ul className="flex flex-col gap-1">
            {summary.records.map((id) => (
              <li key={id} className="text-sm text-white/80">
                {EXERCISES_BY_ID.get(id)?.name ?? id}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {summary.badges.length > 0 && (
        <Card className="border-neon-amber/40 bg-neon-amber/[0.06]">
          <SectionTitle icon="🎖️" title="Badges débloqués" />
          <ul className="flex flex-col gap-1">
            {summary.badges.map((id) => {
              const badge = BADGES_BY_ID.get(id);
              return (
                <li key={id} className="text-sm text-white/80">
                  {badge?.icon} <strong>{badge?.name}</strong> — {badge?.description}
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <div className="flex gap-2">
        <Button className="flex-1" size="lg" onClick={onClose}>
          Retour à l&apos;accueil
        </Button>
        <Button variant="ghost" size="lg" href="/progression">
          Voir ma progression
        </Button>
      </div>
    </div>
  );
}

function SummaryTile({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="card p-3 text-center">
      <div className="text-[10px] text-white/45">{label}</div>
      <div className="font-display text-lg font-black tabular-nums" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
