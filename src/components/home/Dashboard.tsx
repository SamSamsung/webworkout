"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { EXERCISES, EXERCISES_BY_ID } from "@/data/exercises";
import { GROUP_META } from "@/data/taxonomy";
import { dailyChallenge } from "@/lib/quests";
import { formatDuration } from "@/lib/records";
import { isStreakAlive } from "@/lib/streak";
import { rankIcon } from "@/lib/xp";
import { useApp, useLevel } from "@/store/useApp";
import { Button, Card, Chip, ProgressBar, SectionTitle, StatTile } from "@/components/ui";

/**
 * Tableau de bord.
 *
 * Principe : en dix secondes, on doit savoir où l'on en est (niveau, série),
 * ce qu'on peut faire maintenant (défi du jour, quêtes, lancer une séance) et
 * ce qu'on a fait récemment.
 */
export function Dashboard() {
  const state = useApp((s) => s.state);
  const hydrated = useApp((s) => s.hydrated);
  const claimDaily = useApp((s) => s.claimDailyChallenge);
  const level = useLevel();

  // Le défi du jour est déterministe : figé au montage, il ne change pas
  // pendant la session.
  const [challenge] = useState(() => dailyChallenge());
  // Horodatage figé au montage : garde le rendu pur et la fenêtre stable.
  const [now] = useState(() => Date.now());
  const challengeExercise = EXERCISES_BY_ID.get(challenge.exerciseId);
  const claimed = state.lastDailyChallengeDate === new Date().toISOString().slice(0, 10);

  const alive = isStreakAlive(state.streak);
  const quests = state.quests;

  const weekStats = useMemo(() => {
    const limit = now - 7 * 86_400_000;
    const week = state.logs.filter((l) => new Date(l.startedAt).getTime() >= limit);
    return {
      sessions: week.length,
      xp: week.reduce((t, l) => t + l.xp, 0),
      minutes: Math.round(week.reduce((t, l) => t + l.durationSeconds, 0) / 60),
      volume: Math.round(week.reduce((t, l) => t + l.volumeKg, 0)),
    };
  }, [state.logs, now]);

  const lastLog = state.logs[0];
  const isNewcomer = hydrated && state.logs.length === 0;

  return (
    <div className="flex flex-col gap-5">
      {/* --------------------------------------------------------- Bannière */}
      <Card className="relative overflow-hidden border-neon-violet/30">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-neon-violet/20 blur-3xl"
        />
        <div className="relative flex flex-wrap items-center gap-4">
          <div className="text-5xl" aria-hidden>
            {state.profile.avatar}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-white/45">Salut {state.profile.pseudo} 👋</p>
            <h1 className="font-display text-xl font-black leading-tight sm:text-2xl">
              {rankIcon(level.level)} {level.title}
              <span className="ml-2 text-sm font-bold text-white/40">Niveau {level.level}</span>
            </h1>
            <div className="mt-2 flex items-center gap-2">
              <ProgressBar value={level.progress} className="flex-1" label="Progression de niveau" />
              <span className="shrink-0 text-[11px] tabular-nums text-white/50">
                {level.xpIntoLevel} / {level.xpForLevel} XP
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button href="/entrainement" size="lg">
              ▶ Séance
            </Button>
            <Button href="/seances" variant="ghost" size="lg">
              Mes séances
            </Button>
          </div>
        </div>
      </Card>

      {isNewcomer && (
        <Card className="border-neon-cyan/30 bg-neon-cyan/[0.04]">
          <SectionTitle icon="🚀" title="Bienvenue dans IronQuest" />
          <p className="text-sm leading-relaxed text-white/70">
            Tout fonctionne sans compte : tes données restent dans ce navigateur. Commence par explorer les{" "}
            <Link href="/exercices" className="font-semibold text-neon-cyan hover:underline">
              {EXERCISES.length} exercices
            </Link>
            , laisse le{" "}
            <Link href="/seances" className="font-semibold text-neon-cyan hover:underline">
              générateur
            </Link>{" "}
            te composer une séance, puis lance-la au chronomètre pour gagner tes premiers points d&apos;expérience.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" href="/exercices">
              Explorer la base
            </Button>
            <Button size="sm" variant="ghost" href="/seances">
              Générer une séance
            </Button>
            <Button size="sm" variant="ghost" href="/profil">
              Régler mon profil
            </Button>
          </div>
        </Card>
      )}

      {/* ------------------------------------------- Série et défi du jour */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className={alive && state.streak.current > 0 ? "border-neon-orange/40" : undefined}>
          <SectionTitle icon="🔥" title="Série d'assiduité" />
          <div className="flex items-end gap-3">
            <span className="font-display text-4xl font-black text-neon-orange">{state.streak.current}</span>
            <span className="pb-1 text-sm text-white/50">jour{state.streak.current > 1 ? "s" : ""} d&apos;affilée</span>
          </div>
          <p className="mt-1 text-xs text-white/45">
            {state.streak.current === 0
              ? "Termine une séance aujourd'hui pour lancer ta série."
              : alive
                ? "Série active. Entraîne-toi aujourd'hui ou demain pour la conserver."
                : "Série interrompue : une nouvelle séance la relance à 1."}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Chip className="text-white/50">🏅 Record : {state.streak.best} j</Chip>
            <Chip className="text-white/50">🧊 Jokers : {state.streak.freezesLeft}</Chip>
          </div>
        </Card>

        <Card className="border-neon-lime/30">
          <SectionTitle icon="🎯" title="Défi du jour" subtitle={challenge.tagline} />
          {challengeExercise ? (
            <>
              <p className="font-display text-lg font-bold">
                {challenge.target} {challenge.unit}
              </p>
              <Link href={`/exercices/${challengeExercise.id}`} className="text-sm text-neon-cyan hover:underline">
                {challengeExercise.name}
              </Link>
              <p className="mt-1 text-xs text-white/45">
                {GROUP_META[challengeExercise.group].icon} {GROUP_META[challengeExercise.group].label} · sans matériel
              </p>
              <div className="mt-3">
                {claimed ? (
                  <Chip color="#a3e635">✓ Défi relevé aujourd&apos;hui</Chip>
                ) : (
                  <Button size="sm" onClick={() => claimDaily(challenge.xpReward)}>
                    ✅ J&apos;ai relevé le défi (+{challenge.xpReward} XP)
                  </Button>
                )}
              </div>
            </>
          ) : null}
        </Card>
      </div>

      {/* ------------------------------------------------------- Quêtes */}
      {quests.length > 0 && (
        <section>
          <SectionTitle
            icon="📜"
            title="Quêtes de la semaine"
            subtitle="Trois objectifs renouvelés chaque lundi."
          />
          <div className="grid gap-3 sm:grid-cols-3">
            {quests.map((quest) => (
              <Card key={quest.id} className={quest.completed ? "border-neon-lime/40 bg-neon-lime/[0.05]" : undefined}>
                <h3 className="font-display text-sm font-bold">{quest.title}</h3>
                <p className="mt-0.5 text-xs leading-relaxed text-white/50">{quest.description}</p>
                <ProgressBar
                  value={Math.min(quest.progress, quest.target)}
                  max={quest.target}
                  color={quest.completed ? "#a3e635" : "#a855f7"}
                  className="mt-2"
                  label={quest.title}
                />
                <div className="mt-1.5 flex items-center justify-between text-[11px]">
                  <span className="tabular-nums text-white/45">
                    {Math.round(quest.progress).toLocaleString("fr-FR")} / {quest.target.toLocaleString("fr-FR")}
                  </span>
                  <Chip color={quest.completed ? "#a3e635" : "#fbbf24"}>
                    {quest.completed ? "✓ Terminée" : `+${quest.xpReward} XP`}
                  </Chip>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* ------------------------------------------------ Cette semaine */}
      <section>
        <SectionTitle icon="📊" title="Cette semaine" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile icon="🎽" label="Séances" value={weekStats.sessions} color="#22d3ee" />
          <StatTile icon="⚡" label="XP gagnée" value={weekStats.xp.toLocaleString("fr-FR")} color="#a3e635" />
          <StatTile icon="⏱️" label="Temps" value={weekStats.minutes} unit="min" color="#fbbf24" />
          <StatTile
            icon="🏋️"
            label="Volume"
            value={weekStats.volume.toLocaleString("fr-FR")}
            unit="kg"
            color="#fb7185"
          />
        </div>
      </section>

      {/* -------------------------------------------- Raccourcis & activité */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section>
          <SectionTitle icon="⚡" title="Accès rapide" />
          <div className="grid grid-cols-2 gap-2">
            <QuickLink href="/exercices" icon="📚" label="Base d'exercices" hint={`${EXERCISES.length} fiches`} />
            <QuickLink href="/defis" icon="🔥" label="Défis chronométrés" hint="Bring Sally Up & co" />
            <QuickLink href="/seances" icon="🎲" label="Générer une séance" hint="En 10 secondes" />
            <QuickLink href="/entrainement" icon="▶️" label="Séance libre" hint="Sans modèle" />
            <QuickLink href="/progression" icon="📈" label="Ma progression" hint="Courbes et records" />
            <QuickLink href="/outils" icon="🧮" label="Calculateurs" hint="1RM, calories, zones" />
            <QuickLink href="/social" icon="⚔️" label="Classements & duels" hint="Amis et défis" />
            <QuickLink href="/profil" icon="🎖️" label="Badges" hint={`${state.badges.length} débloqué(s)`} />
          </div>
        </section>

        <section>
          <SectionTitle icon="🕒" title="Dernière séance" />
          {lastLog ? (
            <Card>
              <h3 className="font-display text-sm font-bold">{lastLog.name}</h3>
              <p className="text-xs text-white/45">
                {new Date(lastLog.startedAt).toLocaleString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Chip color="#a3e635">+{lastLog.xp} XP</Chip>
                <Chip className="text-white/50">⏱ {formatDuration(lastLog.durationSeconds)}</Chip>
                <Chip className="text-white/50">🔥 {lastLog.calories} kcal</Chip>
              </div>
              <ul className="mt-2 flex flex-wrap gap-1 border-t border-ink-700 pt-2">
                {lastLog.exercises.slice(0, 6).map((entry, i) => {
                  const ex = EXERCISES_BY_ID.get(entry.exerciseId);
                  return ex ? (
                    <li key={`${entry.exerciseId}-${i}`}>
                      <Chip className="text-white/45">{ex.name}</Chip>
                    </li>
                  ) : null;
                })}
              </ul>
              <div className="mt-3">
                <Button
                  size="sm"
                  variant="soft"
                  href={lastLog.templateId ? `/entrainement?template=${lastLog.templateId}` : "/entrainement"}
                >
                  ↻ Refaire cette séance
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="text-sm text-white/45">
              Aucune séance terminée pour l&apos;instant. Lance ta première séance : même quinze minutes comptent.
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}

function QuickLink({ href, icon, label, hint }: { href: string; icon: string; label: string; hint: string }) {
  return (
    <Link href={href} className="card flex items-center gap-2 p-3 transition hover:border-ink-500">
      <span aria-hidden className="text-xl">{icon}</span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{label}</span>
        <span className="block truncate text-[11px] text-white/40">{hint}</span>
      </span>
    </Link>
  );
}
