"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Exercise } from "@/types/exercise";
import type { WorkoutExercise, WorkoutLog, WorkoutSet } from "@/types/app";
import { EXERCISES_BY_ID } from "@/data/exercises";
import { GROUP_META } from "@/data/taxonomy";
import { estimateCalories } from "@/lib/calculs";
import { formatDuration } from "@/lib/records";
import { cryptoRandomId } from "@/lib/storage";
import { dayKey } from "@/lib/streak";
import { setVolumeKg, setXp } from "@/lib/xp";
import { useApp } from "@/store/useApp";
import { BADGES_BY_ID } from "@/lib/badges";
import { Button, Card, Chip, EmptyState, SectionTitle, StatTile } from "@/components/ui";
import { ExercisePicker } from "./ExercisePicker";

/** Heure locale au format `HH:MM`, pour l'input `time`. */
function localTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/**
 * Saisie d'une séance déjà réalisée.
 *
 * Même chose qu'une séance en direct, mais sans chronomètre : on renseigne la
 * date, les exercices et les séries, et la séance rejoint l'historique. Elle
 * compte exactement comme les autres — XP, records, calendrier, quêtes et
 * badges — puisqu'elle passe par le même point d'entrée du store.
 */
export function ManualWorkoutForm({
  templateId,
  fromLogId,
}: {
  templateId?: string | null;
  fromLogId?: string | null;
}) {
  const templates = useApp((s) => s.state.templates);
  const logs = useApp((s) => s.state.logs);
  const bodyweight = useApp((s) => s.state.profile.bodyweightKg);
  const finishWorkout = useApp((s) => s.finishWorkout);

  const source = useMemo(() => {
    if (fromLogId) {
      const log = logs.find((l) => l.id === fromLogId);
      if (log) return { name: log.name, exercises: log.exercises, minutes: Math.round(log.durationSeconds / 60) };
    }
    if (templateId) {
      const template = templates.find((t) => t.id === templateId);
      if (template) return { name: template.name, exercises: template.exercises, minutes: 45 };
    }
    return null;
  }, [fromLogId, templateId, logs, templates]);

  const [now] = useState(() => new Date());
  const [date, setDate] = useState(() => dayKey(now));
  const [time, setTime] = useState(() => localTime(now));
  const [name, setName] = useState(source?.name ?? "");
  const [minutes, setMinutes] = useState(source?.minutes ?? 45);
  const [entries, setEntries] = useState<WorkoutExercise[]>(source?.exercises ?? []);
  const [picking, setPicking] = useState(false);
  const [saved, setSaved] = useState<{ xp: number; records: string[]; badges: string[] } | null>(null);

  const totals = useMemo(() => {
    let xp = 0;
    let volume = 0;
    let sets = 0;
    for (const entry of entries) {
      const ex = EXERCISES_BY_ID.get(entry.exerciseId);
      if (!ex) continue;
      for (const set of entry.sets) {
        xp += setXp(ex, set, bodyweight);
        volume += setVolumeKg(ex, set, bodyweight);
        sets += 1;
      }
    }
    return { xp, volume: Math.round(volume), sets };
  }, [entries, bodyweight]);

  const updateSet = (exIndex: number, setIndex: number, patch: Partial<WorkoutSet>) =>
    setEntries((prev) =>
      prev.map((e, i) =>
        i === exIndex ? { ...e, sets: e.sets.map((s, j) => (j === setIndex ? { ...s, ...patch } : s)) } : e,
      ),
    );

  const addExercise = (exercise: Exercise) => {
    const defaultSet: WorkoutSet =
      exercise.metric === "temps"
        ? { seconds: exercise.repRange?.[0] ?? 30, done: true }
        : exercise.metric === "distance"
          ? { meters: exercise.repRange?.[0] ?? 200, done: true }
          : { reps: exercise.repRange?.[0] ?? 10, done: true };
    setEntries((prev) => [
      ...prev,
      {
        exerciseId: exercise.id,
        restSeconds: Math.round((exercise.restSeconds[0] + exercise.restSeconds[1]) / 2),
        sets: [defaultSet, { ...defaultSet }, { ...defaultSet }],
      },
    ]);
    setPicking(false);
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= entries.length) return;
    setEntries((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const save = () => {
    const startedAt = new Date(`${date}T${time || "12:00"}`);
    const durationSeconds = Math.max(60, minutes * 60);
    const endedAt = new Date(startedAt.getTime() + durationSeconds * 1000);

    const calories = Math.round(
      entries.reduce((total, entry) => {
        const ex = EXERCISES_BY_ID.get(entry.exerciseId);
        if (!ex) return total;
        const share = totals.sets > 0 ? entry.sets.length / totals.sets : 0;
        return total + estimateCalories(ex.met ?? 5, bodyweight, durationSeconds * share);
      }, 0),
    );

    const log: WorkoutLog = {
      id: cryptoRandomId(),
      templateId: templateId ?? undefined,
      name: name.trim() || `Séance du ${new Date(date).toLocaleDateString("fr-FR")}`,
      startedAt: startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      durationSeconds,
      // Toutes les séries saisies sont réputées réalisées : on enregistre une
      // séance passée, pas une séance à faire.
      exercises: entries.map((e) => ({ ...e, sets: e.sets.map((s) => ({ ...s, done: true })) })),
      volumeKg: totals.volume,
      xp: totals.xp,
      calories,
    };

    const result = finishWorkout(log);
    setSaved({ xp: result.xp, records: result.newRecords, badges: result.newBadges });
  };

  // On compare à l'horodatage figé au montage : le rendu reste pur, et la
  // limite « pas dans le futur » ne bouge pas sous les doigts pendant la saisie.
  const isFuture = new Date(`${date}T${time || "12:00"}`).getTime() > now.getTime();
  const canSave = entries.length > 0 && totals.sets > 0 && !isFuture;

  // ------------------------------------------------------------- Confirmation
  if (saved) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-4 py-6">
        <div className="text-center">
          <div className="text-5xl" aria-hidden>
            ✅
          </div>
          <h1 className="mt-2 font-display text-2xl font-black">Séance enregistrée</h1>
          <p className="text-sm text-white/50">
            {new Date(`${date}T${time || "12:00"}`).toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <StatTile icon="⚡" label="XP" value={`+${saved.xp}`} color="#a3e635" />
          <StatTile icon="🏋️" label="Volume" value={totals.volume.toLocaleString("fr-FR")} unit="kg" color="#fbbf24" />
          <StatTile icon="⏱️" label="Durée" value={minutes} unit="min" color="#22d3ee" />
        </div>

        {saved.records.length > 0 && (
          <Card className="border-neon-lime/40 bg-neon-lime/[0.06]">
            <SectionTitle icon="🏆" title="Nouveaux records" />
            <ul className="flex flex-col gap-1 text-sm text-white/80">
              {saved.records.map((id) => (
                <li key={id}>{EXERCISES_BY_ID.get(id)?.name ?? id}</li>
              ))}
            </ul>
          </Card>
        )}

        {saved.badges.length > 0 && (
          <Card className="border-neon-amber/40 bg-neon-amber/[0.06]">
            <SectionTitle icon="🎖️" title="Badges débloqués" />
            <ul className="flex flex-col gap-1 text-sm text-white/80">
              {saved.badges.map((id) => {
                const badge = BADGES_BY_ID.get(id);
                return (
                  <li key={id}>
                    {badge?.icon} <strong>{badge?.name}</strong>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              setSaved(null);
              setEntries([]);
              setName("");
            }}
          >
            ＋ Saisir une autre séance
          </Button>
          <Button variant="ghost" href="/seances">
            Voir l&apos;historique
          </Button>
          <Button variant="ghost" href="/progression">
            Ma progression
          </Button>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------- Formulaire
  return (
    <div className="flex flex-col gap-4 pb-28">
      <SectionTitle
        icon="🗓️"
        title="Enregistrer une séance passée"
        subtitle="Renseigne ce que tu as fait et quand. La séance compte comme n'importe quelle autre : XP, records, calendrier et badges."
      />

      <Card className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-white/45">Date</span>
            <input
              type="date"
              value={date}
              max={dayKey(now)}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-sm outline-none focus:border-neon-violet"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-white/45">Heure de début</span>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-sm outline-none focus:border-neon-violet"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-white/45">Durée (minutes)</span>
            <input
              type="number"
              min={1}
              max={480}
              step={5}
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
              className="rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-sm tabular-nums outline-none focus:border-neon-violet"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-xs">
          <span className="text-white/45">Nom de la séance</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`Séance du ${new Date(date).toLocaleDateString("fr-FR")}`}
            className="rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-sm outline-none placeholder:text-white/25 focus:border-neon-violet"
          />
        </label>

        {isFuture && (
          <p className="rounded-lg bg-neon-rose/10 px-3 py-2 text-xs text-neon-rose" role="alert">
            Cette date est dans le futur. On enregistre une séance déjà faite : choisis une date passée ou aujourd&apos;hui.
          </p>
        )}

        {/* Reprendre un modèle évite de tout ressaisir. */}
        {templates.length > 0 && entries.length === 0 && (
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-white/35">
              Partir d&apos;un de mes modèles
            </p>
            <div className="flex flex-wrap gap-1.5">
              {templates.slice(0, 6).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setEntries(t.exercises.map((e) => ({ ...e, sets: e.sets.map((s) => ({ ...s, done: true })) })));
                    if (!name) setName(t.name);
                  }}
                >
                  <Chip className="text-white/55 hover:text-white">📋 {t.name}</Chip>
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>

      {entries.length === 0 ? (
        <EmptyState
          icon="➕"
          title="Aucun exercice"
          description="Ajoute les exercices que tu as faits, puis renseigne tes séries."
          action={<Button onClick={() => setPicking(true)}>Choisir un exercice</Button>}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {entries.map((entry, exIndex) => {
            const ex = EXERCISES_BY_ID.get(entry.exerciseId);
            if (!ex) return null;
            const meta = GROUP_META[ex.group];
            return (
              <Card as="li" key={`${entry.exerciseId}-${exIndex}`} className="flex flex-col gap-3">
                <div className="flex items-start gap-2">
                  <span aria-hidden className="text-lg">{meta.icon}</span>
                  <div className="min-w-0 flex-1">
                    <Link href={`/exercices/${ex.id}`} className="font-display text-sm font-bold hover:text-neon-cyan">
                      {ex.name}
                    </Link>
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      <Chip color={meta.hex}>{meta.label}</Chip>
                      <Chip className="text-white/45">
                        {entry.sets.length} série{entry.sets.length > 1 ? "s" : ""}
                      </Chip>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <IconButton label="Monter" onClick={() => move(exIndex, -1)}>↑</IconButton>
                    <IconButton label="Descendre" onClick={() => move(exIndex, 1)}>↓</IconButton>
                    <IconButton
                      label="Retirer"
                      onClick={() => setEntries((prev) => prev.filter((_, i) => i !== exIndex))}
                    >
                      ✕
                    </IconButton>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  {entry.sets.map((set, setIndex) => (
                    <div key={setIndex} className="flex flex-wrap items-center gap-2">
                      <span className="w-14 shrink-0 text-[11px] font-bold text-white/35">Série {setIndex + 1}</span>
                      {ex.metric === "temps" ? (
                        <NumberField
                          label="secondes"
                          value={set.seconds ?? 0}
                          onChange={(v) => updateSet(exIndex, setIndex, { seconds: v })}
                        />
                      ) : ex.metric === "distance" ? (
                        <NumberField
                          label="mètres"
                          value={set.meters ?? 0}
                          onChange={(v) => updateSet(exIndex, setIndex, { meters: v })}
                        />
                      ) : (
                        <>
                          <NumberField
                            label="reps"
                            value={set.reps ?? 0}
                            onChange={(v) => updateSet(exIndex, setIndex, { reps: v })}
                          />
                          {(ex.metric === "poids-reps" || ex.metric === "reps-lestees") && (
                            <NumberField
                              label="kg"
                              step={0.5}
                              value={set.weight ?? 0}
                              onChange={(v) => updateSet(exIndex, setIndex, { weight: v })}
                            />
                          )}
                        </>
                      )}
                      <span className="text-[11px] tabular-nums text-white/30">
                        +{setXp(ex, set, bodyweight)} XP
                      </span>
                      <button
                        type="button"
                        aria-label={`Supprimer la série ${setIndex + 1}`}
                        onClick={() =>
                          setEntries((prev) =>
                            prev.map((e, i) =>
                              i === exIndex ? { ...e, sets: e.sets.filter((_, j) => j !== setIndex) } : e,
                            ),
                          )
                        }
                        className="ml-auto rounded p-1 text-xs text-white/25 hover:text-neon-rose"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="soft"
                    onClick={() =>
                      setEntries((prev) =>
                        prev.map((e, i) =>
                          i === exIndex
                            ? { ...e, sets: [...e.sets, { ...(e.sets.at(-1) ?? { reps: 10 }), done: true }] }
                            : e,
                        ),
                      )
                    }
                  >
                    ＋ Série
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setEntries((prev) =>
                        prev.map((e, i) =>
                          i === exIndex && e.sets.length > 0
                            ? { ...e, sets: e.sets.map(() => ({ ...e.sets[0], done: true })) }
                            : e,
                        ),
                      )
                    }
                    title="Recopier la première série sur toutes les autres"
                  >
                    ⧉ Uniformiser
                  </Button>
                </div>
              </Card>
            );
          })}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant="soft" onClick={() => setPicking(true)}>
          ＋ Ajouter un exercice
        </Button>
        <Button variant="ghost" href="/seances">
          Annuler
        </Button>
      </div>

      {/* Barre de validation fixe : le récapitulatif reste visible pendant la saisie. */}
      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-ink-700 bg-ink-950/95 p-3 backdrop-blur-xl md:bottom-0">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2">
          <div className="flex flex-1 flex-wrap gap-1.5 text-[11px]">
            <Chip color="#a3e635">+{totals.xp} XP</Chip>
            <Chip className="text-white/55">{totals.sets} série{totals.sets > 1 ? "s" : ""}</Chip>
            {totals.volume > 0 && <Chip className="text-white/55">{totals.volume.toLocaleString("fr-FR")} kg</Chip>}
            <Chip className="text-white/55">⏱ {formatDuration(minutes * 60)}</Chip>
          </div>
          <Button size="lg" onClick={save} disabled={!canSave}>
            💾 Enregistrer la séance
          </Button>
        </div>
      </div>

      {picking && <ExercisePicker onPick={addExercise} onClose={() => setPicking(false)} />}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
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
        className="w-16 rounded border border-ink-600 bg-ink-900 px-1.5 py-1 text-center text-sm tabular-nums outline-none focus:border-neon-violet"
      />
      {label}
    </label>
  );
}

function IconButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="rounded-lg border border-ink-600 px-2 py-1 text-xs text-white/50 transition hover:bg-ink-700 hover:text-white"
    >
      {children}
    </button>
  );
}
