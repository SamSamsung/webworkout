"use client";

import { useEffect, useMemo, useState } from "react";
import { EXERCISES } from "@/data/exercises";
import {
  basalMetabolicRate,
  bmi,
  estimateCalories,
  estimateOneRm,
  heartRateZones,
  maxHeartRate,
  ONE_RM_FORMULA_LABELS,
  RM_PERCENT_TABLE,
  roundToPlate,
  type OneRmFormula,
} from "@/lib/calculs";
import { formatDuration } from "@/lib/records";
import { useApp } from "@/store/useApp";
import { Button, Card, Chip, cx, ProgressBar, SectionTitle } from "@/components/ui";

/** Ensemble des calculateurs, regroupés en une page unique. */
export function ToolsPage() {
  const profile = useApp((s) => s.state.profile);

  return (
    <div className="flex flex-col gap-5">
      <SectionTitle
        icon="🧮"
        title="Outils & calculateurs"
        subtitle="Les chiffres qui servent vraiment à programmer une séance."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <OneRmCalculator />
        <PlateCalculator />
        <CalorieCalculator bodyweightKg={profile.bodyweightKg} />
        <HeartRateCalculator birthYear={profile.birthYear} />
        <BodyCalculator bodyweightKg={profile.bodyweightKg} birthYear={profile.birthYear} />
        <RestTimer />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ 1RM */

function OneRmCalculator() {
  const [weight, setWeight] = useState(80);
  const [reps, setReps] = useState(5);
  const [formula, setFormula] = useState<OneRmFormula>("epley");

  const result = estimateOneRm(weight, reps, formula);

  return (
    <Card className="flex flex-col gap-3">
      <SectionTitle icon="🏋️" title="Calculateur de 1RM" subtitle="Estime ta charge maximale à partir d'une série." />

      <div className="grid grid-cols-2 gap-2">
        <NumberInput label="Charge (kg)" value={weight} onChange={setWeight} step={2.5} />
        <NumberInput label="Répétitions" value={reps} onChange={setReps} max={30} />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(ONE_RM_FORMULA_LABELS) as OneRmFormula[]).map((f) => (
          <button key={f} type="button" onClick={() => setFormula(f)} aria-pressed={formula === f}>
            <Chip
              color={formula === f ? "#a855f7" : undefined}
              className={formula === f ? "font-bold" : "text-white/45"}
            >
              {ONE_RM_FORMULA_LABELS[f]}
            </Chip>
          </button>
        ))}
      </div>

      <div className="rounded-xl bg-ink-900/70 p-3 text-center">
        <p className="text-[11px] text-white/45">1RM estimé</p>
        <p className="font-display text-3xl font-black text-neon-lime">{result.value.toFixed(1)} kg</p>
        {!result.reliable && (
          <p className="mt-1 text-[11px] text-neon-amber">
            Au-delà de 12 répétitions, l&apos;estimation devient peu fiable.
          </p>
        )}
      </div>

      <div>
        <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-white/35">
          Table de charges (% du 1RM)
        </p>
        <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs sm:grid-cols-3">
          {RM_PERCENT_TABLE.map((row) => (
            <li key={row.percent} className="flex justify-between border-b border-ink-700/60 py-0.5">
              <span className="text-white/40">
                {row.percent} % · {row.reps} rep{row.reps > 1 ? "s" : ""}
              </span>
              <span className="font-semibold tabular-nums text-white/80">
                {roundToPlate((result.value * row.percent) / 100)} kg
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

/* --------------------------------------------------- Chargement de barre */

/** Disques les plus courants en salle, du plus lourd au plus léger. */
const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];
const PLATE_COLORS: Record<number, string> = {
  25: "#fb7185",
  20: "#60a5fa",
  15: "#fbbf24",
  10: "#34d399",
  5: "#e5e7eb",
  2.5: "#a855f7",
  1.25: "#94a3b8",
};

function PlateCalculator() {
  const [target, setTarget] = useState(100);
  const [bar, setBar] = useState(20);

  /** Décomposition gloutonne, côté par côté. */
  const loading = useMemo(() => {
    const perSide = (target - bar) / 2;
    if (perSide <= 0) return { perSide: 0, plates: [] as number[], rest: 0 };
    const plates: number[] = [];
    let remaining = perSide;
    for (const plate of PLATES) {
      while (remaining >= plate - 0.001) {
        plates.push(plate);
        remaining -= plate;
      }
    }
    return { perSide, plates, rest: Math.round(remaining * 100) / 100 };
  }, [target, bar]);

  return (
    <Card className="flex flex-col gap-3">
      <SectionTitle icon="💿" title="Chargement de barre" subtitle="Quels disques mettre de chaque côté." />

      <div className="grid grid-cols-2 gap-2">
        <NumberInput label="Charge visée (kg)" value={target} onChange={setTarget} step={2.5} />
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-white/45">Barre</span>
          <select
            value={bar}
            onChange={(e) => setBar(Number(e.target.value))}
            className="rounded-lg border border-ink-600 bg-ink-900 px-2 py-2 text-sm outline-none focus:border-neon-violet"
          >
            <option value={20}>Olympique 20 kg</option>
            <option value={15}>Olympique femme 15 kg</option>
            <option value={10}>Barre courte 10 kg</option>
            <option value={7}>Barre EZ 7 kg</option>
            <option value={0}>Sans barre</option>
          </select>
        </label>
      </div>

      {loading.perSide <= 0 ? (
        <p className="text-sm text-white/50">La charge visée est inférieure au poids de la barre.</p>
      ) : (
        <>
          <p className="text-xs text-white/45">
            {loading.perSide} kg par côté
            {loading.rest > 0 && (
              <span className="text-neon-amber"> · reste {loading.rest} kg non décomposable</span>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            {loading.plates.map((p, i) => (
              <span
                key={`${p}-${i}`}
                className="flex h-9 items-center rounded px-2 font-display text-xs font-black text-ink-950"
                style={{ background: PLATE_COLORS[p] }}
              >
                {p}
              </span>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}

/* -------------------------------------------------------------- Calories */

function CalorieCalculator({ bodyweightKg }: { bodyweightKg: number }) {
  const [exerciseId, setExerciseId] = useState("course-endurance");
  const [minutes, setMinutes] = useState(30);
  const [weight, setWeight] = useState(bodyweightKg);

  const exercise = EXERCISES.find((e) => e.id === exerciseId);
  const met = exercise?.met ?? 5;
  const kcal = Math.round(estimateCalories(met, weight, minutes * 60));

  // Les exercices les plus pertinents pour une estimation calorique.
  const options = useMemo(() => EXERCISES.filter((e) => e.met && e.met >= 4).sort((a, b) => (b.met ?? 0) - (a.met ?? 0)), []);

  return (
    <Card className="flex flex-col gap-3">
      <SectionTitle icon="🔥" title="Dépense énergétique" subtitle="Estimation par la méthode des MET." />

      <label className="flex flex-col gap-1 text-xs">
        <span className="text-white/45">Activité</span>
        <select
          value={exerciseId}
          onChange={(e) => setExerciseId(e.target.value)}
          className="rounded-lg border border-ink-600 bg-ink-900 px-2 py-2 text-sm outline-none focus:border-neon-violet"
        >
          {options.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name} (MET {e.met})
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-2">
        <NumberInput label="Durée (min)" value={minutes} onChange={setMinutes} step={5} />
        <NumberInput label="Poids (kg)" value={weight} onChange={setWeight} step={0.5} />
      </div>

      <div className="rounded-xl bg-ink-900/70 p-3 text-center">
        <p className="text-[11px] text-white/45">Dépense estimée</p>
        <p className="font-display text-3xl font-black text-neon-rose">{kcal} kcal</p>
        <p className="mt-1 text-[11px] text-white/35">
          Soit environ {(kcal / Math.max(1, minutes)).toFixed(1)} kcal par minute.
        </p>
      </div>
      <p className="text-[11px] leading-relaxed text-white/35">
        Les MET sont une moyenne de population : la dépense réelle varie avec l&apos;intensité, la composition
        corporelle et le niveau d&apos;entraînement. À utiliser comme ordre de grandeur, pas comme mesure.
      </p>
    </Card>
  );
}

/* -------------------------------------------------------- Fréquence cardiaque */

function HeartRateCalculator({ birthYear }: { birthYear?: number }) {
  const [age, setAge] = useState(birthYear ? new Date().getFullYear() - birthYear : 30);
  const zones = heartRateZones(age);

  return (
    <Card className="flex flex-col gap-3">
      <SectionTitle icon="❤️‍🔥" title="Zones cardiaques" subtitle="Formule de Tanaka : 208 − 0,7 × âge." />
      <NumberInput label="Âge" value={age} onChange={setAge} max={100} />
      <p className="text-sm text-white/60">
        FC max estimée : <strong className="font-display text-lg text-neon-rose">{maxHeartRate(age)} bpm</strong>
      </p>
      <ul className="flex flex-col gap-1.5">
        {zones.map((z) => (
          <li key={z.name} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: z.color }} />
            <span className="w-32 shrink-0 text-xs font-semibold" style={{ color: z.color }}>
              {z.name}
            </span>
            <span className="shrink-0 text-xs tabular-nums text-white/70">
              {z.range[0]}–{z.range[1]}
            </span>
            <span className="truncate text-[11px] text-white/35">{z.usage}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ------------------------------------------------------- IMC & métabolisme */

function BodyCalculator({ bodyweightKg, birthYear }: { bodyweightKg: number; birthYear?: number }) {
  const [weight, setWeight] = useState(bodyweightKg);
  const [height, setHeight] = useState(175);
  const [age, setAge] = useState(birthYear ? new Date().getFullYear() - birthYear : 30);
  const [sex, setSex] = useState<"homme" | "femme">("homme");
  const [activity, setActivity] = useState(1.55);

  const bmiResult = bmi(weight, height);
  const bmr = basalMetabolicRate(weight, height, age, sex);

  return (
    <Card className="flex flex-col gap-3">
      <SectionTitle icon="⚖️" title="IMC & besoins caloriques" subtitle="Mifflin-St Jeor, la formule la plus fiable." />

      <div className="grid grid-cols-2 gap-2">
        <NumberInput label="Poids (kg)" value={weight} onChange={setWeight} step={0.5} />
        <NumberInput label="Taille (cm)" value={height} onChange={setHeight} />
        <NumberInput label="Âge" value={age} onChange={setAge} max={100} />
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-white/45">Sexe biologique</span>
          <select
            value={sex}
            onChange={(e) => setSex(e.target.value as "homme" | "femme")}
            className="rounded-lg border border-ink-600 bg-ink-900 px-2 py-2 text-sm outline-none focus:border-neon-violet"
          >
            <option value="homme">Homme</option>
            <option value="femme">Femme</option>
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1 text-xs">
        <span className="text-white/45">Niveau d&apos;activité</span>
        <select
          value={activity}
          onChange={(e) => setActivity(Number(e.target.value))}
          className="rounded-lg border border-ink-600 bg-ink-900 px-2 py-2 text-sm outline-none focus:border-neon-violet"
        >
          <option value={1.2}>Sédentaire (peu ou pas d&apos;exercice)</option>
          <option value={1.375}>Légèrement actif (1 à 3 séances / semaine)</option>
          <option value={1.55}>Modérément actif (3 à 5 séances)</option>
          <option value={1.725}>Très actif (6 à 7 séances)</option>
          <option value={1.9}>Extrêmement actif (travail physique + sport)</option>
        </select>
      </label>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-ink-900/70 p-3 text-center">
          <p className="text-[11px] text-white/45">IMC</p>
          <p className="font-display text-2xl font-black text-neon-cyan">{bmiResult.value.toFixed(1)}</p>
          <p className="text-[11px] text-white/40">{bmiResult.label}</p>
        </div>
        <div className="rounded-xl bg-ink-900/70 p-3 text-center">
          <p className="text-[11px] text-white/45">Besoins quotidiens</p>
          <p className="font-display text-2xl font-black text-neon-amber">{Math.round(bmr * activity)}</p>
          <p className="text-[11px] text-white/40">kcal · métabolisme de base {bmr}</p>
        </div>
      </div>
      <p className="text-[11px] leading-relaxed text-white/35">
        L&apos;IMC ne distingue pas masse grasse et masse musculaire : un pratiquant musclé sera souvent classé en
        « surpoids » sans que cela ait la moindre signification. Ces chiffres ne remplacent pas un avis médical.
      </p>
    </Card>
  );
}

/* ---------------------------------------------------------- Minuteur de repos */

const PRESETS = [45, 60, 90, 120, 180, 300];

function RestTimer() {
  const [duration, setDuration] = useState(90);
  const [remaining, setRemaining] = useState(90);
  const [running, setRunning] = useState(false);

  // Décompte : la mise à jour se fait dans le callback du timer, jamais
  // directement dans le corps de l'effet.
  useEffect(() => {
    if (!running) return;
    const id = setTimeout(() => {
      setRemaining((r) => {
        if (r <= 1) {
          setRunning(false);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearTimeout(id);
  }, [running, remaining]);

  const select = (seconds: number) => {
    setDuration(seconds);
    setRemaining(seconds);
    setRunning(false);
  };

  return (
    <Card className="flex flex-col gap-3">
      <SectionTitle icon="⏱️" title="Minuteur de repos" subtitle="Le repos fait partie de l'entraînement." />

      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button key={p} type="button" onClick={() => select(p)} aria-pressed={duration === p}>
            <Chip color={duration === p ? "#22d3ee" : undefined} className={duration === p ? "font-bold" : "text-white/45"}>
              {formatDuration(p)}
            </Chip>
          </button>
        ))}
      </div>

      <div className="rounded-xl bg-ink-900/70 p-4 text-center">
        <p className={cx("font-display text-5xl font-black tabular-nums", remaining === 0 ? "text-neon-lime" : "text-neon-cyan")}>
          {String(Math.floor(remaining / 60)).padStart(2, "0")}:{String(remaining % 60).padStart(2, "0")}
        </p>
        <ProgressBar
          value={duration - remaining}
          max={duration}
          color="#22d3ee"
          className="mt-3"
          label="Temps de repos écoulé"
        />
      </div>

      <div className="flex gap-2">
        <Button className="flex-1" onClick={() => setRunning((r) => !r)} disabled={remaining === 0}>
          {running ? "⏸ Pause" : "▶ Démarrer"}
        </Button>
        <Button variant="ghost" onClick={() => select(duration)}>
          ↺ Réinitialiser
        </Button>
      </div>

      <p className="text-[11px] leading-relaxed text-white/35">
        Repères usuels : 2 à 5 min en force, 1 à 2 min en hypertrophie, 30 à 60 s en endurance. Chaque fiche
        d&apos;exercice indique sa propre fourchette.
      </p>
    </Card>
  );
}

/* ------------------------------------------------------------------ Champ */

function NumberInput({
  label,
  value,
  onChange,
  step = 1,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  max?: number;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="text-white/45">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-sm tabular-nums outline-none focus:border-neon-violet"
      />
    </label>
  );
}
