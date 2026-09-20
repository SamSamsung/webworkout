"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Difficulty, Equipment } from "@/types/exercise";
import type { Goal } from "@/types/app";
import { GOAL_LABELS } from "@/types/app";
import { EQUIPMENT_META } from "@/data/taxonomy";
import { EXERCISES_BY_ID } from "@/data/exercises";
import { FOCUS_LABELS, generateWorkout, type GeneratorOptions } from "@/lib/generator";
import { useApp } from "@/store/useApp";
import { Button, Card, Chip, cx, SectionTitle } from "@/components/ui";

/** Matériel proposé dans le générateur : les plus courants, maison et salle. */
const EQUIPMENT_CHOICES: Equipment[] = [
  "halteres",
  "barre",
  "barre-de-traction",
  "elastique",
  "kettlebell",
  "banc",
  "machine",
  "poulie",
  "barres-paralleles",
  "trx",
  "box",
  "chaise",
  "corde-a-sauter",
  "swiss-ball",
  "medecine-ball",
  "anneaux",
];

/**
 * Générateur de séance : l'utilisateur déclare son objectif, son matériel et
 * le temps dont il dispose, et obtient une séance prête à lancer.
 * Un aperçu est proposé avant enregistrement, avec possibilité de relancer
 * le tirage.
 */
export function WorkoutGeneratorPanel() {
  const router = useRouter();
  const profile = useApp((s) => s.state.profile);
  const saveTemplate = useApp((s) => s.saveTemplate);

  const [goal, setGoal] = useState<Goal>(profile.goal);
  const [focus, setFocus] = useState<GeneratorOptions["focus"]>("full");
  const [minutes, setMinutes] = useState(45);
  const [level, setLevel] = useState<Difficulty>(2);
  const [equipment, setEquipment] = useState<Equipment[]>(
    profile.availableEquipment.filter((e): e is Equipment => e !== "aucun"),
  );
  const [preview, setPreview] = useState<ReturnType<typeof generateWorkout> | null>(null);

  function run() {
    setPreview(generateWorkout({ goal, focus, minutes, level, equipment, seed: Math.floor(Math.random() * 99999) }));
  }

  function accept() {
    if (!preview) return;
    saveTemplate(preview);
    router.push(`/seances/editer?id=${preview.id}`);
  }

  return (
    <Card className="flex flex-col gap-4">
      <SectionTitle
        icon="🎲"
        title="Générateur de séance"
        subtitle="Dis-nous ton objectif, ton matériel et ton temps disponible."
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-white/45">Objectif</span>
          <select
            value={goal}
            onChange={(e) => setGoal(e.target.value as Goal)}
            className="rounded-lg border border-ink-600 bg-ink-900 px-2 py-2 text-sm outline-none focus:border-neon-violet"
          >
            {(Object.keys(GOAL_LABELS) as Goal[]).map((g) => (
              <option key={g} value={g}>
                {GOAL_LABELS[g]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs">
          <span className="text-white/45">Zone ciblée</span>
          <select
            value={focus}
            onChange={(e) => setFocus(e.target.value as GeneratorOptions["focus"])}
            className="rounded-lg border border-ink-600 bg-ink-900 px-2 py-2 text-sm outline-none focus:border-neon-violet"
          >
            {(Object.keys(FOCUS_LABELS) as Array<GeneratorOptions["focus"]>).map((f) => (
              <option key={f} value={f}>
                {FOCUS_LABELS[f]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs">
          <span className="text-white/45">
            Durée : <strong className="text-white/80">{minutes} min</strong>
          </span>
          <input
            type="range"
            min={15}
            max={120}
            step={5}
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
            className="accent-neon-violet"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs">
          <span className="text-white/45">
            Niveau : <strong className="text-white/80">{level}/5</strong>
          </span>
          <input
            type="range"
            min={1}
            max={5}
            value={level}
            onChange={(e) => setLevel(Number(e.target.value) as Difficulty)}
            className="accent-neon-cyan"
          />
        </label>
      </div>

      <div>
        <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-white/35">Matériel disponible</p>
        <div className="flex flex-wrap gap-1.5">
          {EQUIPMENT_CHOICES.map((e) => {
            const active = equipment.includes(e);
            return (
              <button
                key={e}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  setEquipment(active ? equipment.filter((x) => x !== e) : [...equipment, e])
                }
              >
                <Chip
                  color={active ? "#22d3ee" : undefined}
                  className={cx(active ? "font-bold" : "text-white/45 hover:text-white/75")}
                >
                  {EQUIPMENT_META[e].icon} {EQUIPMENT_META[e].label}
                </Chip>
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 text-[11px] text-white/35">
          Aucune case cochée = séance 100 % au poids du corps.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={run}>🎲 Générer une séance</Button>
        {preview && (
          <>
            <Button variant="soft" onClick={run}>
              🔄 Relancer le tirage
            </Button>
            <Button variant="ghost" onClick={accept}>
              ✅ Enregistrer cette séance
            </Button>
          </>
        )}
      </div>

      {preview && (
        <div className="rounded-xl border border-ink-600 bg-ink-900/60 p-3">
          <p className="font-display text-sm font-bold">{preview.name}</p>
          <p className="mt-0.5 text-xs text-white/45">{preview.description}</p>
          <ol className="mt-2 flex flex-col gap-1.5">
            {preview.exercises.map((entry, i) => {
              const ex = EXERCISES_BY_ID.get(entry.exerciseId);
              if (!ex) return null;
              const set = entry.sets[0];
              const detail =
                set.seconds !== undefined
                  ? `${entry.sets.length} × ${set.seconds} s`
                  : set.meters !== undefined
                    ? `${entry.sets.length} × ${set.meters} m`
                    : `${entry.sets.length} × ${set.reps} reps`;
              return (
                <li key={`${entry.exerciseId}-${i}`} className="flex items-center gap-2 text-xs">
                  <span className="w-5 shrink-0 text-white/30">{i + 1}.</span>
                  <span className="flex-1 truncate text-white/80">{ex.name}</span>
                  <span className="shrink-0 tabular-nums text-neon-cyan">{detail}</span>
                  <span className="w-12 shrink-0 text-right tabular-nums text-white/35">{entry.restSeconds} s</span>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </Card>
  );
}
