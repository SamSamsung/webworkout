"use client";

import { useState } from "react";
import Link from "next/link";
import type { Exercise } from "@/types/exercise";
import type { WorkoutExercise, WorkoutSet } from "@/types/app";
import { EXERCISES_BY_ID } from "@/data/exercises";
import { GROUP_META } from "@/data/taxonomy";
import { useApp } from "@/store/useApp";
import { Button, Card, Chip, EmptyState, SectionTitle } from "@/components/ui";
import { ExercisePicker } from "./ExercisePicker";

/**
 * Éditeur de modèle de séance.
 * Les modifications sont persistées à chaque changement : pas de bouton
 * « enregistrer » à oublier.
 */
export function WorkoutEditor({ templateId }: { templateId: string }) {
  const template = useApp((s) => s.state.templates.find((t) => t.id === templateId));
  const saveTemplate = useApp((s) => s.saveTemplate);
  const [picking, setPicking] = useState(false);

  if (!template) {
    return (
      <EmptyState
        icon="🕳️"
        title="Séance introuvable"
        description="Elle a peut-être été supprimée."
        action={<Button href="/seances">Retour aux séances</Button>}
      />
    );
  }

  const update = (patch: Partial<typeof template>) => saveTemplate({ ...template, ...patch });

  const updateExercise = (index: number, patch: Partial<WorkoutExercise>) =>
    update({
      exercises: template.exercises.map((e, i) => (i === index ? { ...e, ...patch } : e)),
    });

  const updateSet = (exIndex: number, setIndex: number, patch: Partial<WorkoutSet>) =>
    updateExercise(exIndex, {
      sets: template.exercises[exIndex].sets.map((s, i) => (i === setIndex ? { ...s, ...patch } : s)),
    });

  const addExercise = (exercise: Exercise) => {
    const defaultSet: WorkoutSet =
      exercise.metric === "temps"
        ? { seconds: exercise.repRange?.[0] ?? 30 }
        : exercise.metric === "distance"
          ? { meters: exercise.repRange?.[0] ?? 200 }
          : { reps: exercise.repRange?.[0] ?? 10 };
    update({
      exercises: [
        ...template.exercises,
        {
          exerciseId: exercise.id,
          restSeconds: Math.round((exercise.restSeconds[0] + exercise.restSeconds[1]) / 2),
          sets: [defaultSet, { ...defaultSet }, { ...defaultSet }],
        },
      ],
    });
    setPicking(false);
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= template.exercises.length) return;
    const next = [...template.exercises];
    [next[index], next[target]] = [next[target], next[index]];
    update({ exercises: next });
  };

  const totalSets = template.exercises.reduce((n, e) => n + e.sets.length, 0);

  return (
    <div className="flex flex-col gap-4">
      <SectionTitle
        icon="✎"
        title="Éditeur de séance"
        subtitle={`${template.exercises.length} exercice(s) · ${totalSets} série(s)`}
        action={
          template.exercises.length > 0 ? (
            <Button href={`/entrainement?template=${template.id}`}>▶ Lancer</Button>
          ) : undefined
        }
      />

      <Card className="flex flex-col gap-2">
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-white/45">Nom de la séance</span>
          <input
            value={template.name}
            onChange={(e) => update({ name: e.target.value })}
            className="rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 font-display text-sm font-bold outline-none focus:border-neon-violet"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-white/45">Description (facultatif)</span>
          <textarea
            value={template.description ?? ""}
            onChange={(e) => update({ description: e.target.value })}
            rows={2}
            className="resize-none rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-sm outline-none focus:border-neon-violet"
          />
        </label>
      </Card>

      {template.exercises.length === 0 ? (
        <EmptyState
          icon="➕"
          title="Séance vide"
          description="Ajoute un premier exercice depuis la base."
          action={<Button onClick={() => setPicking(true)}>Choisir un exercice</Button>}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {template.exercises.map((entry, exIndex) => {
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
                      <Chip className="text-white/45">Repos {entry.restSeconds} s</Chip>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <IconButton label="Monter" onClick={() => move(exIndex, -1)}>↑</IconButton>
                    <IconButton label="Descendre" onClick={() => move(exIndex, 1)}>↓</IconButton>
                    <IconButton
                      label="Retirer"
                      onClick={() => update({ exercises: template.exercises.filter((_, i) => i !== exIndex) })}
                    >
                      ✕
                    </IconButton>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  {entry.sets.map((set, setIndex) => (
                    <div key={setIndex} className="flex items-center gap-2">
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
                      <button
                        type="button"
                        aria-label={`Supprimer la série ${setIndex + 1}`}
                        onClick={() =>
                          updateExercise(exIndex, { sets: entry.sets.filter((_, i) => i !== setIndex) })
                        }
                        className="ml-auto rounded p-1 text-xs text-white/30 hover:text-neon-rose"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="soft"
                    onClick={() =>
                      updateExercise(exIndex, {
                        sets: [...entry.sets, { ...(entry.sets.at(-1) ?? { reps: 10 }) }],
                      })
                    }
                  >
                    ＋ Série
                  </Button>
                  <label className="flex items-center gap-1.5 text-[11px] text-white/45">
                    Repos
                    <input
                      type="number"
                      min={0}
                      step={15}
                      value={entry.restSeconds}
                      onChange={(e) => updateExercise(exIndex, { restSeconds: Number(e.target.value) })}
                      className="w-16 rounded border border-ink-600 bg-ink-900 px-1.5 py-1 text-center tabular-nums outline-none focus:border-neon-violet"
                    />
                    s
                  </label>
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
          Retour aux séances
        </Button>
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
