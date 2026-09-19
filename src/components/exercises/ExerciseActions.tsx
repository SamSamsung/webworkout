"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Exercise } from "@/types/exercise";
import { METRIC_META } from "@/data/taxonomy";
import { formatRecord, progressionPercent } from "@/lib/records";
import { estimateOneRmConsensus } from "@/lib/calculs";
import { cryptoRandomId } from "@/lib/storage";
import { useApp } from "@/store/useApp";
import { Button, Card, Chip, ProgressBar, SectionTitle } from "@/components/ui";

/**
 * Panneau d'actions d'une fiche : record personnel, saisie d'une nouvelle
 * performance, favori et ajout à une séance.
 * Composant client isolé pour que la fiche elle-même reste statique.
 */
export function ExerciseActions({ exercise }: { exercise: Exercise }) {
  const router = useRouter();
  const record = useApp((s) => s.state.records[exercise.id]);
  const templates = useApp((s) => s.state.templates);
  const favorites = useApp((s) => s.state.favorites);
  const addRecord = useApp((s) => s.addRecord);
  const toggleFavorite = useApp((s) => s.toggleFavorite);
  const saveTemplate = useApp((s) => s.saveTemplate);

  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [form, setForm] = useState({ reps: "", weight: "", seconds: "", meters: "" });

  const metric = METRIC_META[exercise.metric];
  const isFavorite = favorites.includes(exercise.id);

  const trend = useMemo(() => (record ? progressionPercent(record) : null), [record]);

  function submit() {
    const values = {
      reps: form.reps ? Number(form.reps) : undefined,
      weight: form.weight ? Number(form.weight) : undefined,
      seconds: form.seconds ? Number(form.seconds) : undefined,
      meters: form.meters ? Number(form.meters) : undefined,
    };
    const hasValue = Object.values(values).some((v) => typeof v === "number" && v > 0);
    if (!hasValue) {
      setFeedback("Saisis au moins une valeur avant d'enregistrer.");
      return;
    }
    const isNewBest = addRecord(exercise.id, values);
    setFeedback(isNewBest ? "🏆 Nouveau record personnel !" : "Performance enregistrée dans l'historique.");
    setForm({ reps: "", weight: "", seconds: "", meters: "" });
    setOpen(false);
  }

  /** Crée une séance dédiée à cet exercice et ouvre l'éditeur. */
  function createWorkout() {
    const id = cryptoRandomId();
    saveTemplate({
      id,
      name: `Séance ${exercise.name}`,
      description: `Séance construite autour de ${exercise.name.toLowerCase()}.`,
      exercises: [
        {
          exerciseId: exercise.id,
          restSeconds: Math.round((exercise.restSeconds[0] + exercise.restSeconds[1]) / 2),
          sets: Array.from({ length: 4 }, () =>
            exercise.metric === "temps"
              ? { seconds: exercise.repRange?.[0] ?? 30 }
              : exercise.metric === "distance"
                ? { meters: exercise.repRange?.[0] ?? 200 }
                : { reps: exercise.repRange?.[0] ?? 10 },
          ),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    router.push(`/seances/${id}`);
  }

  /** Ajoute l'exercice à une séance existante. */
  function addToTemplate(templateId: string) {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;
    saveTemplate({
      ...template,
      exercises: [
        ...template.exercises,
        {
          exerciseId: exercise.id,
          restSeconds: Math.round((exercise.restSeconds[0] + exercise.restSeconds[1]) / 2),
          sets: Array.from({ length: 3 }, () =>
            exercise.metric === "temps" ? { seconds: 30 } : { reps: exercise.repRange?.[0] ?? 10 },
          ),
        },
      ],
    });
    setFeedback(`Ajouté à « ${template.name} ».`);
  }

  return (
    <Card className="flex flex-col gap-3">
      <SectionTitle icon="🏅" title="Mon record" subtitle={metric.label} />

      {record ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl font-black text-neon-lime">
              {formatRecord(exercise, record.best)}
            </span>
            {trend !== null && (
              <Chip color={trend >= 0 ? "#a3e635" : "#fb7185"}>
                {trend >= 0 ? "▲" : "▼"} {Math.abs(trend).toFixed(0)} %
              </Chip>
            )}
          </div>
          <p className="text-xs text-white/45">
            Établi le{" "}
            {new Date(record.best.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
            {" · "}
            {record.history.length} performance{record.history.length > 1 ? "s" : ""} enregistrée
            {record.history.length > 1 ? "s" : ""}
          </p>
          {exercise.metric === "poids-reps" && record.best.weight && record.best.reps ? (
            <p className="text-xs text-white/45">
              1RM estimé :{" "}
              <strong className="text-neon-cyan">
                {estimateOneRmConsensus(record.best.weight, record.best.reps).toFixed(1)} kg
              </strong>
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-white/50">
          Aucun record enregistré. Note ta meilleure performance pour suivre ta progression.
        </p>
      )}

      {open ? (
        <div className="flex flex-col gap-2 rounded-xl border border-ink-600 bg-ink-900/60 p-3">
          <div className="grid grid-cols-2 gap-2">
            {(exercise.metric === "poids-reps" ||
              exercise.metric === "reps-lestees" ||
              exercise.metric === "reps" ||
              exercise.metric === "calories") && (
              <Field
                label={exercise.metric === "calories" ? "Calories" : "Répétitions"}
                value={form.reps}
                onChange={(v) => setForm({ ...form, reps: v })}
              />
            )}
            {(exercise.metric === "poids-reps" || exercise.metric === "reps-lestees") && (
              <Field
                label={exercise.metric === "reps-lestees" ? "Lest (kg)" : "Charge (kg)"}
                value={form.weight}
                onChange={(v) => setForm({ ...form, weight: v })}
                step="0.5"
              />
            )}
            {exercise.metric === "temps" && (
              <Field label="Durée (s)" value={form.seconds} onChange={(v) => setForm({ ...form, seconds: v })} />
            )}
            {exercise.metric === "distance" && (
              <Field label="Distance (m)" value={form.meters} onChange={(v) => setForm({ ...form, meters: v })} />
            )}
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={submit}>
              Enregistrer
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Annuler
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setOpen(true)}>
            ➕ Noter une performance
          </Button>
          <Button size="sm" variant="ghost" onClick={() => toggleFavorite(exercise.id)}>
            {isFavorite ? "⭐ Favori" : "☆ Ajouter aux favoris"}
          </Button>
        </div>
      )}

      {feedback && (
        <p className="rounded-lg bg-ink-800 px-3 py-2 text-xs text-neon-lime" role="status">
          {feedback}
        </p>
      )}

      <div className="border-t border-ink-700 pt-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-white/35">Ajouter à une séance</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="soft" onClick={createWorkout}>
            🆕 Nouvelle séance
          </Button>
          {templates.slice(0, 4).map((t) => (
            <Button key={t.id} size="sm" variant="ghost" onClick={() => addToTemplate(t.id)}>
              ＋ {t.name}
            </Button>
          ))}
        </div>
      </div>

      {record && record.history.length > 1 && (
        <div className="border-t border-ink-700 pt-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-white/35">
            Dernières performances
          </p>
          <ul className="flex flex-col gap-1.5">
            {record.history
              .slice(-5)
              .reverse()
              .map((entry, i) => (
                <li key={`${entry.date}-${i}`} className="flex items-center gap-2 text-xs">
                  <span className="w-20 shrink-0 text-white/40">
                    {new Date(entry.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}
                  </span>
                  <ProgressBar
                    value={entry.score}
                    max={record.best.score || 1}
                    color="#22d3ee"
                    className="h-1.5 flex-1"
                    label={`Performance du ${entry.date}`}
                  />
                  <span className="w-24 shrink-0 text-right tabular-nums text-white/70">
                    {formatRecord(exercise, entry)}
                  </span>
                </li>
              ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

function Field({
  label,
  value,
  onChange,
  step = "1",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  step?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="text-white/45">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        min="0"
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-ink-600 bg-ink-900 px-2 py-1.5 text-sm tabular-nums outline-none focus:border-neon-violet"
      />
    </label>
  );
}
