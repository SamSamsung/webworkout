"use client";

import type { Exercise } from "@/types/exercise";
import type { WorkoutSet } from "@/types/app";
import { FIELD_META, setFields, type SetField } from "@/lib/sets";

/**
 * Saisie d'une série, pilotée par les champs que l'exercice accepte.
 *
 * Le même composant sert à la préparation d'une séance et au suivi en direct ;
 * seule la densité change. Centraliser la saisie ici évite que les deux écrans
 * divergent — c'est ce qui faisait qu'un vélo ne pouvait s'enregistrer qu'en
 * secondes, sans distance, ni calories, ni niveau de résistance.
 */
export function SetFieldInputs({
  exercise,
  set,
  onChange,
  tone = "plan",
}: {
  exercise: Exercise;
  set: WorkoutSet;
  onChange: (patch: Partial<WorkoutSet>) => void;
  tone?: "plan" | "live";
}) {
  const { primary, extra } = setFields(exercise);

  return (
    <div className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-1.5">
      {[primary, ...extra].map((field) => (
        <FieldInput
          key={field}
          field={field}
          value={set[field]}
          optional={field !== primary}
          tone={tone}
          onChange={(v) => onChange({ [field]: v } as Partial<WorkoutSet>)}
        />
      ))}
    </div>
  );
}

/**
 * Un champ. La durée est saisie en minutes + secondes : taper « 1800 » pour
 * trente minutes de vélo est une invitation à l'erreur.
 */
function FieldInput({
  field,
  value,
  optional,
  tone,
  onChange,
}: {
  field: SetField;
  value: number | undefined;
  optional: boolean;
  tone: "plan" | "live";
  onChange: (value: number | undefined) => void;
}) {
  const meta = FIELD_META[field];
  const box = tone === "live" ? "bg-ink-950" : "bg-ink-900";
  const muted = optional ? "text-white/30" : "text-white/45";

  if (field === "seconds") {
    const total = value ?? 0;
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return (
      <span className={`flex items-center gap-1 text-[11px] ${muted}`}>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          value={minutes || ""}
          placeholder="0"
          aria-label="Durée : minutes"
          onChange={(e) => onChange(clampTotal(Number(e.target.value || 0), seconds))}
          className={`w-12 rounded border border-ink-600 ${box} px-1 py-1 text-center text-sm tabular-nums outline-none focus:border-neon-violet`}
        />
        min
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={59}
          step={1}
          value={seconds || ""}
          placeholder="0"
          aria-label="Durée : secondes"
          onChange={(e) => onChange(clampTotal(minutes, Number(e.target.value || 0)))}
          className={`w-12 rounded border border-ink-600 ${box} px-1 py-1 text-center text-sm tabular-nums outline-none focus:border-neon-violet`}
        />
        s
      </span>
    );
  }

  return (
    <label className={`flex items-center gap-1 text-[11px] ${muted}`} title={meta.hint}>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step={meta.step}
        value={value ?? ""}
        placeholder={optional ? "—" : "0"}
        aria-label={meta.hint}
        onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
        className={`w-16 rounded border border-ink-600 ${box} px-1.5 py-1 text-center text-sm tabular-nums outline-none focus:border-neon-violet`}
      />
      {meta.suffix}
    </label>
  );
}

/** Recompose une durée en secondes à partir des deux champs. */
function clampTotal(minutes: number, seconds: number): number | undefined {
  const total = Math.max(0, Math.round(minutes)) * 60 + Math.max(0, Math.round(seconds));
  return total > 0 ? total : undefined;
}
