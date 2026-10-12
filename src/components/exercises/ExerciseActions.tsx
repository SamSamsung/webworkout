"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Exercise } from "@/types/exercise";
import { METRIC_META } from "@/data/taxonomy";
import { formatRecord, progressionPercent } from "@/lib/records";
import { FIELD_META, allFields, defaultSet, isProtocol, type SetField } from "@/lib/sets";
import { estimateOneRmConsensus } from "@/lib/calculs";
import { cryptoRandomId } from "@/lib/storage";
import { useApp } from "@/store/useApp";
import { Button, Card, Chip, ProgressBar, SectionTitle } from "@/components/ui";
import { ExercisePicker } from "@/components/workouts/ExercisePicker";
import { EXERCISES_BY_ID } from "@/data/exercises";

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
  /**
   * Les champs proposés suivent l'exercice : un vélo accepte durée, distance
   * et calories, pas seulement « répétitions ». `level` est exclu — un niveau
   * de résistance décrit la performance, il ne la classe pas.
   */
  const fields = useMemo(() => allFields(exercise).filter((f) => f !== "level"), [exercise]);
  const [form, setForm] = useState<Partial<Record<SetField, string>>>({});

  /**
   * Un format (EMOM, Tabata, AMRAP) ne se classe pas sur sa seule durée :
   * « 20 minutes d'EMOM » ne dit pas si c'était 3 burpees ou 8 tractions par
   * tour. Le record retient donc aussi l'exercice réalisé.
   */
  const protocol = isProtocol(exercise);
  const [target, setTarget] = useState<string | undefined>(undefined);
  const [repsPerRound, setRepsPerRound] = useState("");
  const [rounds, setRounds] = useState("");
  const [pickingTarget, setPickingTarget] = useState(false);
  const targetExercise = target ? EXERCISES_BY_ID.get(target) : undefined;

  const metric = METRIC_META[exercise.metric];
  const isFavorite = favorites.includes(exercise.id);

  const trend = useMemo(() => (record ? progressionPercent(record) : null), [record]);

  /**
   * Ouvre le formulaire pré-rempli avec le protocole de la dernière
   * performance : on refait rarement un EMOM sur un autre exercice, et
   * ressaisir le mouvement à chaque fois conduisait à l'oublier — le record
   * s'affichait alors « 5 × reps », sans dire de quoi.
   */
  function openForm() {
    const last = record?.history.at(-1);
    if (protocol && last) {
      setTarget(last.targetExerciseId);
      setRepsPerRound(last.repsPerRound ? String(last.repsPerRound) : "");
      setRounds(last.rounds ? String(last.rounds) : "");
    }
    setOpen(true);
  }

  function submit() {
    const values = {
      reps: num(form.reps),
      weight: num(form.weight),
      seconds: num(form.seconds),
      meters: num(form.meters),
      calories: num(form.calories),
      targetExerciseId: protocol ? target : undefined,
      repsPerRound: protocol ? num(repsPerRound) : undefined,
      rounds: protocol ? num(rounds) : undefined,
    };
    const hasValue = Object.values(values).some((v) => typeof v === "number" && v > 0);
    if (!hasValue) {
      setFeedback("Saisis au moins une valeur avant d'enregistrer.");
      return;
    }
    const isNewBest = addRecord(exercise.id, values);
    setFeedback(isNewBest ? "🏆 Nouveau record personnel !" : "Performance enregistrée dans l'historique.");
    setForm({});
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
          sets: Array.from({ length: exercise.category === "cardio" ? 1 : 4 }, () => defaultSet(exercise)),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    router.push(`/seances/editer?id=${id}`);
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
          sets: Array.from({ length: exercise.category === "cardio" ? 1 : 3 }, () => defaultSet(exercise)),
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
            {fields.map((field) =>
              field === "seconds" ? (
                <DurationField
                  key={field}
                  value={form.seconds ?? ""}
                  onChange={(v) => setForm({ ...form, seconds: v })}
                />
              ) : (
                <Field
                  key={field}
                  label={labelFor(field, exercise.metric)}
                  step={FIELD_META[field].step.toString()}
                  value={form[field] ?? ""}
                  onChange={(v) => setForm({ ...form, [field]: v })}
                />
              ),
            )}
          </div>
          {protocol && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-ink-600 bg-ink-900/60 px-2.5 py-2">
              <button
                type="button"
                onClick={() => setPickingTarget(true)}
                className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                  targetExercise
                    ? "border-neon-cyan/40 bg-neon-cyan/10 text-white"
                    : "border-dashed border-ink-500 text-white/45 hover:border-neon-cyan hover:text-white"
                }`}
              >
                {targetExercise ? targetExercise.name : "＋ Exercice du protocole"}
              </button>
              <label className="flex items-center gap-1 text-[11px] text-white/40">
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={repsPerRound}
                  placeholder="—"
                  aria-label="Répétitions par tour"
                  onChange={(e) => setRepsPerRound(e.target.value)}
                  className="w-14 rounded border border-ink-600 bg-ink-900 px-1.5 py-1 text-center text-sm tabular-nums outline-none focus:border-neon-violet"
                />
                reps/tour
              </label>
              <label className="flex items-center gap-1 text-[11px] text-white/40">
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={rounds}
                  placeholder="—"
                  aria-label="Nombre de tours"
                  onChange={(e) => setRounds(e.target.value)}
                  className="w-14 rounded border border-ink-600 bg-ink-900 px-1.5 py-1 text-center text-sm tabular-nums outline-none focus:border-neon-violet"
                />
                tours
              </label>
            </div>
          )}
          {protocol && (
            <p className="text-[11px] leading-relaxed text-white/35">
              Le classement se fait sur le <strong className="text-white/60">travail total</strong>, répétitions par
              tour × tours : 5 tractions par minute pendant 10 minutes passe devant 4 par minute, et 11 minutes à 4
              passent devant 10 minutes à 4. Sans précision, un tour par minute est supposé.
            </p>
          )}
          {!protocol && fields.length > 1 && (
            <p className="text-[11px] leading-relaxed text-white/35">
              Remplis ce que tu as sous les yeux : seul {labelFor(fields[0], exercise.metric).toLowerCase()} sert à
              classer le record, le reste enrichit l&apos;historique.
            </p>
          )}
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
          <Button size="sm" onClick={openForm}>
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

      {pickingTarget && (
        <ExercisePicker
          onClose={() => setPickingTarget(false)}
          onPick={(picked) => {
            setTarget(picked.id);
            setPickingTarget(false);
          }}
        />
      )}

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

/** Convertit une saisie texte en nombre positif, ou `undefined` si vide. */
function num(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

/** Libellé d'un champ, nuancé selon la métrique de l'exercice. */
function labelFor(field: SetField, metric: string): string {
  if (field === "weight") return metric === "reps-lestees" ? "Lest (kg)" : "Charge (kg)";
  if (field === "meters") return "Distance (m)";
  if (field === "calories") return "Calories (kcal)";
  return FIELD_META[field].label;
}

/** Durée en minutes + secondes, pour ne pas avoir à convertir de tête. */
function DurationField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const total = Number(value || 0);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  const update = (m: number, s: number) => {
    const next = Math.max(0, m) * 60 + Math.max(0, s);
    onChange(next > 0 ? String(next) : "");
  };
  return (
    <div className="flex flex-col gap-1 text-xs">
      <span className="text-white/45">Durée</span>
      <div className="flex items-center gap-1">
        <input
          type="number"
          inputMode="numeric"
          min="0"
          value={minutes || ""}
          aria-label="Durée : minutes"
          onChange={(e) => update(Number(e.target.value || 0), seconds)}
          className="w-full rounded-lg border border-ink-600 bg-ink-900 px-2 py-1.5 text-sm tabular-nums outline-none focus:border-neon-violet"
        />
        <span className="text-white/35">min</span>
        <input
          type="number"
          inputMode="numeric"
          min="0"
          max="59"
          value={seconds || ""}
          aria-label="Durée : secondes"
          onChange={(e) => update(minutes, Number(e.target.value || 0))}
          className="w-full rounded-lg border border-ink-600 bg-ink-900 px-2 py-1.5 text-sm tabular-nums outline-none focus:border-neon-violet"
        />
        <span className="text-white/35">s</span>
      </div>
    </div>
  );
}
