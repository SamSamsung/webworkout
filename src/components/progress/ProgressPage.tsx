"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { EXERCISES_BY_ID } from "@/data/exercises";
import { GROUP_META, METRIC_META } from "@/data/taxonomy";
import { formatDuration, formatRecord, progressionPercent } from "@/lib/records";
import { dayKey, isoWeek } from "@/lib/streak";
import { levelFromXp } from "@/lib/xp";
import { useApp } from "@/store/useApp";
import { Button, Card, Chip, EmptyState, SectionTitle, StatTile } from "@/components/ui";
import { AreaTrend, Bars, ColoredBars, RecordLine, type Point } from "./Charts";
import { TrainingCalendar } from "./TrainingCalendar";

/** Page de suivi : statistiques globales, courbes, records et historique. */
export function ProgressPage() {
  const state = useApp((s) => s.state);
  const deleteRecord = useApp((s) => s.deleteRecord);
  const [selectedRecord, setSelectedRecord] = useState<string | null>(null);
  const [range, setRange] = useState<30 | 90 | 365>(90);
  // Horodatage figé au montage : la fenêtre glissante ne doit pas bouger
  // d'un rendu à l'autre, et le rendu reste pur.
  const [now] = useState(() => Date.now());

  const logs = state.logs;
  const level = levelFromXp(state.xp);

  /** Séances comprises dans la fenêtre temporelle sélectionnée. */
  const windowed = useMemo(() => {
    const limit = now - range * 86_400_000;
    return logs.filter((l) => new Date(l.startedAt).getTime() >= limit);
  }, [logs, range, now]);

  /** XP cumulée jour après jour. */
  const xpTrend = useMemo<Point[]>(() => {
    const byDay = new Map<string, number>();
    for (const log of [...windowed].reverse()) {
      const key = dayKey(log.startedAt);
      byDay.set(key, (byDay.get(key) ?? 0) + log.xp);
    }
    // Cumul explicite dans une boucle : plus lisible qu'un `reduce` et sans
    // mutation d'une variable capturée par une closure.
    const points: Point[] = [];
    let cumulative = 0;
    for (const [date, xp] of [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      cumulative += xp;
      points.push({ label: date.slice(5).replace("-", "/"), value: cumulative });
    }
    return points;
  }, [windowed]);

  /** Volume soulevé par semaine. */
  const volumeByWeek = useMemo<Point[]>(() => {
    const byWeek = new Map<string, number>();
    for (const log of windowed) {
      const key = isoWeek(new Date(log.startedAt));
      byWeek.set(key, (byWeek.get(key) ?? 0) + log.volumeKg);
    }
    return [...byWeek.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([week, volume]) => ({ label: week.slice(5), value: Math.round(volume) }));
  }, [windowed]);

  /** Répartition des séries par groupe musculaire. */
  const groupDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    for (const log of windowed) {
      for (const entry of log.exercises) {
        const ex = EXERCISES_BY_ID.get(entry.exerciseId);
        if (!ex) continue;
        counts.set(ex.group, (counts.get(ex.group) ?? 0) + entry.sets.length);
      }
    }
    return [...counts.entries()]
      .map(([group, value]) => ({
        label: GROUP_META[group as keyof typeof GROUP_META]?.label ?? group,
        value,
        color: GROUP_META[group as keyof typeof GROUP_META]?.hex ?? "#a855f7",
      }))
      .sort((a, b) => b.value - a.value);
  }, [windowed]);

  const records = useMemo(
    () =>
      Object.values(state.records)
        .map((r) => ({ record: r, exercise: EXERCISES_BY_ID.get(r.exerciseId) }))
        .filter((r) => r.exercise)
        .sort((a, b) => b.record.history.length - a.record.history.length),
    [state.records],
  );

  const active = selectedRecord ? state.records[selectedRecord] : null;
  const activeExercise = active ? EXERCISES_BY_ID.get(active.exerciseId) : null;

  const totals = useMemo(
    () => ({
      volume: logs.reduce((t, l) => t + l.volumeKg, 0),
      minutes: logs.reduce((t, l) => t + l.durationSeconds, 0) / 60,
      calories: logs.reduce((t, l) => t + l.calories, 0),
    }),
    [logs],
  );

  if (!logs.length && !records.length) {
    return (
      <EmptyState
        icon="📈"
        title="Aucune donnée à afficher"
        description="Termine une séance ou note un record pour voir apparaître tes courbes de progression."
        action={
          <div className="flex gap-2">
            <Button href="/entrainement">Démarrer une séance</Button>
            <Button variant="ghost" href="/exercices">
              Parcourir les exercices
            </Button>
          </div>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <SectionTitle
        icon="📈"
        title="Ma progression"
        subtitle="Volume, assiduité, records : tout ce qui se mesure se améliore."
        action={
          <div className="flex gap-1 rounded-lg border border-ink-700 p-0.5">
            {([30, 90, 365] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                aria-pressed={range === r}
                className={`rounded px-2 py-1 text-[11px] font-bold transition ${
                  range === r ? "bg-ink-700 text-white" : "text-white/40 hover:text-white/70"
                }`}
              >
                {r === 365 ? "1 an" : `${r} j`}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon="⚡" label="XP totale" value={state.xp.toLocaleString("fr-FR")} hint={`Niveau ${level.level}`} />
        <StatTile
          icon="🏋️"
          label="Volume soulevé"
          value={Math.round(totals.volume / 1000).toLocaleString("fr-FR")}
          unit="t"
          color="#fbbf24"
          hint={`${Math.round(totals.volume).toLocaleString("fr-FR")} kg`}
        />
        <StatTile
          icon="⏱️"
          label="Temps d'effort"
          value={Math.round(totals.minutes / 60)}
          unit="h"
          color="#22d3ee"
          hint={`${logs.length} séance(s)`}
        />
        <StatTile
          icon="🔥"
          label="Calories"
          value={Math.round(totals.calories).toLocaleString("fr-FR")}
          unit="kcal"
          color="#fb7185"
        />
      </div>

      <section>
        <SectionTitle icon="🗓️" title="Calendrier d'assiduité" subtitle="Chaque case est un jour. Ne casse pas la chaîne." />
        <Card>
          <TrainingCalendar logs={logs} />
          <div className="mt-3 flex flex-wrap gap-2 border-t border-ink-700 pt-3">
            <Chip color="#fb923c">🔥 Série actuelle : {state.streak.current} j</Chip>
            <Chip className="text-white/55">🏅 Record : {state.streak.best} j</Chip>
            <Chip className="text-white/55">🧊 Jokers : {state.streak.freezesLeft}</Chip>
          </div>
        </Card>
      </section>

      {xpTrend.length > 1 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <section>
            <SectionTitle icon="⚡" title="XP cumulée" />
            <Card>
              <AreaTrend data={xpTrend} unit="XP" />
            </Card>
          </section>
          {volumeByWeek.length > 0 && (
            <section>
              <SectionTitle icon="🏋️" title="Volume par semaine" />
              <Card>
                <Bars data={volumeByWeek} unit="kg" />
              </Card>
            </section>
          )}
        </div>
      )}

      {groupDistribution.length > 0 && (
        <section>
          <SectionTitle
            icon="🎯"
            title="Répartition du travail"
            subtitle="Séries réalisées par groupe musculaire : repère tes zones négligées."
          />
          <Card>
            <ColoredBars data={groupDistribution} />
          </Card>
        </section>
      )}

      <section>
        <SectionTitle
          icon="🏅"
          title={`Records personnels (${records.length})`}
          subtitle="Clique sur un record pour afficher sa courbe de progression."
        />
        {records.length === 0 ? (
          <EmptyState
            icon="🥇"
            title="Aucun record enregistré"
            description="Note une performance depuis n'importe quelle fiche d'exercice."
            action={<Button href="/exercices">Parcourir les exercices</Button>}
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
            <ul className="flex flex-col gap-2">
              {records.map(({ record, exercise }) => {
                if (!exercise) return null;
                const trend = progressionPercent(record);
                const meta = GROUP_META[exercise.group];
                const selected = selectedRecord === record.exerciseId;
                return (
                  <Card
                    as="li"
                    key={record.exerciseId}
                    className={selected ? "border-neon-violet/50" : undefined}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedRecord(selected ? null : record.exerciseId)}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                        aria-pressed={selected}
                      >
                        <span aria-hidden>{meta.icon}</span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">{exercise.name}</span>
                          <span className="block text-[11px] text-white/40">
                            {METRIC_META[exercise.metric].label} · {record.history.length} mesure
                            {record.history.length > 1 ? "s" : ""}
                          </span>
                        </span>
                      </button>
                      <span className="font-display text-sm font-black text-neon-lime">
                        {formatRecord(exercise, record.best)}
                      </span>
                      {trend !== null && (
                        <Chip color={trend >= 0 ? "#a3e635" : "#fb7185"}>
                          {trend >= 0 ? "▲" : "▼"} {Math.abs(trend).toFixed(0)} %
                        </Chip>
                      )}
                      <Link
                        href={`/exercices/${exercise.id}`}
                        className="text-[11px] font-semibold text-neon-cyan hover:underline"
                      >
                        Fiche
                      </Link>
                      <button
                        type="button"
                        onClick={() => deleteRecord(record.exerciseId)}
                        aria-label={`Supprimer le record de ${exercise.name}`}
                        className="text-xs text-white/25 hover:text-neon-rose"
                      >
                        ✕
                      </button>
                    </div>
                  </Card>
                );
              })}
            </ul>

            <aside>
              {active && activeExercise ? (
                <Card className="lg:sticky lg:top-24">
                  <SectionTitle icon="📊" title={activeExercise.name} subtitle={METRIC_META[activeExercise.metric].label} />
                  <RecordLine
                    data={active.history.map((h) => ({
                      label: new Date(h.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
                      value: h.score,
                    }))}
                    unit={METRIC_META[activeExercise.metric].unit}
                  />
                  <ul className="mt-2 flex flex-col gap-1 border-t border-ink-700 pt-2 text-xs">
                    {active.history
                      .slice(-6)
                      .reverse()
                      .map((h, i) => (
                        <li key={`${h.date}-${i}`} className="flex justify-between text-white/55">
                          <span>{new Date(h.date).toLocaleDateString("fr-FR")}</span>
                          <span className="tabular-nums text-white/80">{formatRecord(activeExercise, h)}</span>
                        </li>
                      ))}
                  </ul>
                </Card>
              ) : (
                <Card className="text-sm text-white/40">
                  Sélectionne un record dans la liste pour afficher sa courbe.
                </Card>
              )}
            </aside>
          </div>
        )}
      </section>

      {logs.length > 0 && (
        <section>
          <SectionTitle icon="📜" title="Historique détaillé" />
          <ul className="flex flex-col gap-2">
            {logs.slice(0, 20).map((log) => (
              <Card as="li" key={log.id} id={`seance-${log.id}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold">{log.name}</h3>
                    <p className="text-[11px] text-white/40">
                      {new Date(log.startedAt).toLocaleString("fr-FR", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <Chip color="#a3e635">+{log.xp} XP</Chip>
                  <Chip className="text-white/50">⏱ {formatDuration(log.durationSeconds)}</Chip>
                  {log.volumeKg > 0 && (
                    <Chip className="text-white/50">{Math.round(log.volumeKg).toLocaleString("fr-FR")} kg</Chip>
                  )}
                </div>
                <ul className="mt-2 flex flex-wrap gap-1.5 border-t border-ink-700 pt-2">
                  {log.exercises.map((entry, i) => {
                    const ex = EXERCISES_BY_ID.get(entry.exerciseId);
                    if (!ex) return null;
                    return (
                      <li key={`${entry.exerciseId}-${i}`}>
                        <Chip className="text-white/50">
                          {ex.name} · {entry.sets.length} série{entry.sets.length > 1 ? "s" : ""}
                        </Chip>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
