"use client";

import { useState } from "react";
import Link from "next/link";
import { BENCHMARKS, nextTier, tierFor, type Benchmark } from "@/data/benchmarks";
import { EXERCISES_BY_ID } from "@/data/exercises";
import { GROUP_META } from "@/data/taxonomy";
import { formatDuration } from "@/lib/records";
import { useApp } from "@/store/useApp";
import { Card, Chip, cx, ProgressBar, SectionTitle } from "@/components/ui";
import { ChallengeTimer } from "./ChallengeTimer";

/**
 * Page des défis chronométrés.
 *
 * Chaque défi s'appuie sur un exercice de la base : la fiche technique, le
 * record et les courbes de progression sont ceux du mouvement, le défi n'y
 * ajoute que la règle du jeu et les paliers.
 */
export function ChallengesPage() {
  const records = useApp((s) => s.state.records);
  const [active, setActive] = useState<Benchmark | null>(null);

  // Deux mesures distinctes : les défis déjà tentés, et les paliers réellement
  // décrochés. Un défi peut avoir un record sans qu'aucun palier ne soit atteint.
  const tentés = BENCHMARKS.filter((b) => (records[b.exerciseId]?.best.seconds ?? 0) > 0).length;
  const paliers = BENCHMARKS.reduce((total, b) => {
    const best = records[b.exerciseId]?.best.seconds ?? 0;
    return total + b.tiers.filter((t) => best >= t.seconds).length;
  }, 0);
  const paliersTotal = BENCHMARKS.reduce((total, b) => total + b.tiers.length, 0);

  return (
    <div className="flex flex-col gap-4">
      <SectionTitle
        icon="🔥"
        title="Défis chronométrés"
        subtitle="Des protocoles simples, un chrono, des paliers à décrocher. Chaque temps enregistré compte comme une séance."
        action={
          <div className="flex gap-1.5">
            <Chip color="#22d3ee">{tentés} / {BENCHMARKS.length} tentés</Chip>
            <Chip color="#fbbf24">🏅 {paliers} / {paliersTotal} paliers</Chip>
          </div>
        }
      />

      <ul className="grid gap-3 sm:grid-cols-2">
        {BENCHMARKS.map((benchmark) => {
          const exercise = EXERCISES_BY_ID.get(benchmark.exerciseId);
          if (!exercise) return null;
          const meta = GROUP_META[exercise.group];
          const best = records[benchmark.exerciseId]?.best.seconds ?? 0;
          const tier = tierFor(benchmark, best);
          const upcoming = nextTier(benchmark, best);
          const finalTier = benchmark.tiers[benchmark.tiers.length - 1];

          return (
            <Card
              as="li"
              key={benchmark.id}
              className={cx("flex flex-col gap-2", tier && "border-neon-amber/30")}
            >
              <div className="flex items-start gap-2">
                <span aria-hidden className="text-2xl leading-none">{benchmark.icon}</span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-sm font-bold leading-tight">{benchmark.name}</h3>
                  <p className="mt-0.5 text-xs leading-relaxed text-white/50">{benchmark.tagline}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <Chip color={meta.hex}>{meta.icon} {meta.label}</Chip>
                {benchmark.music && <Chip className="text-white/45">🎧 {benchmark.music.title}</Chip>}
                {tier && <Chip color={tier.color}>{tier.icon} {tier.label}</Chip>}
              </div>

              <div>
                <ProgressBar
                  value={Math.min(best, finalTier.seconds)}
                  max={finalTier.seconds}
                  color={tier?.color ?? "#4a4170"}
                  className="h-1.5"
                  label={`Meilleur temps sur ${benchmark.name}`}
                />
                <p className="mt-1 text-[11px] text-white/45">
                  {best > 0 ? (
                    <>
                      Record : <strong className="text-neon-lime">{formatDuration(best)}</strong>
                      {upcoming && ` · ${upcoming.icon} ${upcoming.label} à ${formatDuration(upcoming.seconds)}`}
                    </>
                  ) : (
                    <>Jamais tenté · premier palier à {formatDuration(benchmark.tiers[0].seconds)}</>
                  )}
                </p>
              </div>

              <div className="mt-auto flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setActive(benchmark)}
                  className="flex-1 rounded-xl bg-gradient-to-r from-neon-violet to-neon-cyan px-4 py-2 text-sm font-semibold text-ink-950 transition hover:brightness-110 active:scale-[0.97]"
                >
                  ▶ Lancer le défi
                </button>
                <Link
                  href={`/exercices/${exercise.id}`}
                  className="rounded-xl border border-ink-600 px-3 py-2 text-xs font-semibold text-white/60 transition hover:bg-ink-800 hover:text-white"
                >
                  Fiche
                </Link>
              </div>
            </Card>
          );
        })}
      </ul>

      <Card className="text-xs leading-relaxed text-white/50">
        <strong className="text-white/80">Comment c&apos;est compté.</strong> Un temps enregistré crée une séance
        courte : il alimente ton XP, ta série d&apos;assiduité, tes quêtes de la semaine et peut débloquer des badges.
        Le record apparaît sur la fiche de l&apos;exercice et dans tes courbes de progression, comme n&apos;importe
        quelle autre performance.
      </Card>

      {active && <ChallengeTimer benchmark={active} onClose={() => setActive(null)} />}
    </div>
  );
}
