"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Metric } from "@/types/exercise";
import { EXERCISES, EXERCISES_BY_ID } from "@/data/exercises";
import { METRIC_META } from "@/data/taxonomy";
import { isSupabaseConfigured } from "@/lib/supabase";
import { levelFromXp, rankIcon } from "@/lib/xp";
import { useApp } from "@/store/useApp";
import { Button, Card, Chip, cx, EmptyState, ProgressBar, SectionTitle } from "@/components/ui";

/**
 * Espace social.
 *
 * En mode local (sans backend), les amis sont des profils que l'on saisit
 * soi-même : cela permet de suivre les performances d'un partenaire
 * d'entraînement et de se lancer des défis, sans compte ni serveur.
 * Si Supabase est configuré, les mêmes écrans s'alimentent depuis la base.
 */
export function SocialPage() {
  const state = useApp((s) => s.state);
  const addFriend = useApp((s) => s.addFriend);
  const removeFriend = useApp((s) => s.removeFriend);
  const seedDemoFriends = useApp((s) => s.seedDemoFriends);
  const createChallenge = useApp((s) => s.createChallenge);
  const updateChallengeProgress = useApp((s) => s.updateChallengeProgress);
  const deleteChallenge = useApp((s) => s.deleteChallenge);

  const [tab, setTab] = useState<"classement" | "amis" | "defis">("classement");
  const [newFriend, setNewFriend] = useState({ pseudo: "", avatar: "🐺", xp: "0" });
  const [challengeForm, setChallengeForm] = useState({
    exerciseId: "pompe-classique",
    target: "100",
    days: "7",
  });

  // Horodatage figé au montage : garde le rendu pur et les échéances stables.
  const [now] = useState(() => Date.now());

  const me = useMemo(
    () => ({
      id: state.profile.id,
      pseudo: `${state.profile.pseudo} (toi)`,
      avatar: state.profile.avatar,
      xp: state.xp,
      level: levelFromXp(state.xp).level,
      demo: false,
    }),
    [state.profile.id, state.profile.pseudo, state.profile.avatar, state.xp],
  );

  const leaderboard = useMemo(() => [me, ...state.friends].sort((a, b) => b.xp - a.xp), [me, state.friends]);
  const myRank = leaderboard.findIndex((p) => p.id === me.id) + 1;

  function submitFriend() {
    if (!newFriend.pseudo.trim()) return;
    const xp = Number(newFriend.xp) || 0;
    addFriend({
      pseudo: newFriend.pseudo.trim(),
      avatar: newFriend.avatar,
      xp,
      level: levelFromXp(xp).level,
      lastActive: new Date().toISOString(),
    });
    setNewFriend({ pseudo: "", avatar: "🐺", xp: "0" });
  }

  function submitChallenge() {
    const exercise = EXERCISES_BY_ID.get(challengeForm.exerciseId);
    if (!exercise) return;
    const deadline = new Date(Date.now() + Number(challengeForm.days) * 86_400_000).toISOString();
    // `Date.now()` est appelé ici dans un gestionnaire d'événement : hors rendu,
    // donc sans impact sur la pureté du composant.
    createChallenge({
      title: `${challengeForm.target} ${METRIC_META[exercise.metric].short} · ${exercise.name}`,
      description: `Premier à atteindre l'objectif avant l'échéance remporte le défi.`,
      exerciseId: exercise.id,
      metric: exercise.metric as Metric,
      target: Number(challengeForm.target),
      deadline,
      participants: [state.profile.id, ...state.friends.map((f) => f.id)],
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionTitle
        icon="⚔️"
        title="Social"
        subtitle="Classements, amis et défis. Rien ne motive autant qu'un partenaire un peu devant toi."
      />

      {!isSupabaseConfigured && (
        <Card className="border-neon-cyan/25 bg-neon-cyan/[0.04] text-xs leading-relaxed text-white/60">
          <strong className="text-white/85">Mode local.</strong> Aucun serveur n&apos;est configuré : les amis que tu
          ajoutes ici sont enregistrés dans ton navigateur, avec l&apos;XP que tu saisis. C&apos;est parfait pour suivre
          un partenaire d&apos;entraînement. Pour un classement synchronisé entre appareils, renseigne les variables
          Supabase (voir le README) — les mêmes écrans s&apos;alimenteront alors depuis la base.
        </Card>
      )}

      <div className="flex gap-1 rounded-xl border border-ink-700 bg-ink-900/50 p-1">
        {(
          [
            ["classement", "🏆 Classement"],
            ["amis", `👥 Amis (${state.friends.length})`],
            ["defis", `⚔️ Défis (${state.challenges.length})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            aria-pressed={tab === key}
            className={cx(
              "flex-1 rounded-lg px-3 py-2 text-xs font-bold transition",
              tab === key ? "bg-ink-700 text-white" : "text-white/45 hover:text-white/75",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* --------------------------------------------------- Classement */}
      {tab === "classement" && (
        <div className="flex flex-col gap-3">
          <Card className="flex items-center gap-3 border-neon-amber/30">
            <span aria-hidden className="text-3xl">🏆</span>
            <div>
              <p className="font-display text-lg font-black">
                {myRank}
                <sup className="text-xs">{myRank === 1 ? "er" : "e"}</sup> sur {leaderboard.length}
              </p>
              <p className="text-xs text-white/50">
                {state.xp.toLocaleString("fr-FR")} XP · {levelFromXp(state.xp).title}
              </p>
            </div>
          </Card>

          <ul className="flex flex-col gap-2">
            {leaderboard.map((p, i) => {
              const isMe = p.id === me.id;
              const top = leaderboard[0].xp || 1;
              return (
                <Card as="li" key={p.id} className={cx("flex items-center gap-3", isMe && "border-neon-violet/50")}>
                  <span
                    className={cx(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-display text-sm font-black",
                      i === 0
                        ? "bg-neon-amber/20 text-neon-amber"
                        : i === 1
                          ? "bg-white/10 text-white/70"
                          : i === 2
                            ? "bg-neon-orange/15 text-neon-orange"
                            : "bg-ink-800 text-white/40",
                    )}
                  >
                    {i + 1}
                  </span>
                  <span aria-hidden className="text-xl">{p.avatar}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {p.pseudo}
                      {"demo" in p && p.demo && <span className="ml-1 text-[10px] text-white/30">(fictif)</span>}
                    </p>
                    <ProgressBar
                      value={p.xp}
                      max={top}
                      color={isMe ? "#a855f7" : "#4a4170"}
                      className="mt-1 h-1.5"
                      label={`XP de ${p.pseudo}`}
                    />
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-display text-sm font-black tabular-nums text-neon-lime">
                      {p.xp.toLocaleString("fr-FR")}
                    </p>
                    <p className="text-[10px] text-white/40">
                      {rankIcon(p.level)} Niv. {p.level}
                    </p>
                  </div>
                </Card>
              );
            })}
          </ul>

          {state.friends.length === 0 && (
            <EmptyState
              icon="👥"
              title="Tu es seul au classement"
              description="Ajoute un partenaire d'entraînement, ou charge quelques profils fictifs pour essayer la fonctionnalité."
              action={
                <div className="flex gap-2">
                  <Button onClick={() => setTab("amis")}>Ajouter un ami</Button>
                  <Button variant="ghost" onClick={seedDemoFriends}>
                    Charger des profils de démo
                  </Button>
                </div>
              }
            />
          )}
        </div>
      )}

      {/* --------------------------------------------------------- Amis */}
      {tab === "amis" && (
        <div className="flex flex-col gap-3">
          <Card className="flex flex-col gap-3">
            <SectionTitle icon="➕" title="Ajouter un ami" />
            <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
              <input
                value={newFriend.pseudo}
                onChange={(e) => setNewFriend({ ...newFriend, pseudo: e.target.value })}
                placeholder="Pseudo"
                aria-label="Pseudo de l'ami"
                className="rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-sm outline-none focus:border-neon-violet"
              />
              <select
                value={newFriend.avatar}
                onChange={(e) => setNewFriend({ ...newFriend, avatar: e.target.value })}
                aria-label="Avatar"
                className="rounded-lg border border-ink-600 bg-ink-900 px-2 py-2 text-lg outline-none focus:border-neon-violet"
              >
                {["🐺", "🦊", "🦅", "🐻", "🦁", "🐯", "🦈", "🐉", "🦍", "🐝", "🦉"].map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={0}
                value={newFriend.xp}
                onChange={(e) => setNewFriend({ ...newFriend, xp: e.target.value })}
                aria-label="XP de l'ami"
                className="w-24 rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-sm tabular-nums outline-none focus:border-neon-violet"
              />
              <Button onClick={submitFriend}>Ajouter</Button>
            </div>
            <p className="text-[11px] text-white/35">
              L&apos;XP saisie sert au classement. Mets-la à jour après chaque séance de ton partenaire.
            </p>
          </Card>

          {state.friends.length === 0 ? (
            <EmptyState
              icon="🫂"
              title="Aucun ami pour l'instant"
              description="Ajoute un partenaire, ou charge cinq profils fictifs pour tester le classement et les défis."
              action={<Button onClick={seedDemoFriends}>Charger des profils de démo</Button>}
            />
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {state.friends.map((f) => (
                <Card as="li" key={f.id} className="flex items-center gap-3">
                  <span aria-hidden className="text-2xl">{f.avatar}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {f.pseudo}
                      {f.demo && <Chip className="ml-1 text-white/30">démo</Chip>}
                    </p>
                    <p className="text-[11px] text-white/40">
                      {rankIcon(f.level)} Niveau {f.level} · {f.xp.toLocaleString("fr-FR")} XP
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFriend(f.id)}
                    aria-label={`Retirer ${f.pseudo}`}
                    className="text-xs text-white/25 hover:text-neon-rose"
                  >
                    ✕
                  </button>
                </Card>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* -------------------------------------------------------- Défis */}
      {tab === "defis" && (
        <div className="flex flex-col gap-3">
          <Card className="flex flex-col gap-3">
            <SectionTitle icon="⚔️" title="Lancer un défi" subtitle="Sur n'importe lequel des 472 exercices." />
            <div className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_auto]">
              <select
                value={challengeForm.exerciseId}
                onChange={(e) => setChallengeForm({ ...challengeForm, exerciseId: e.target.value })}
                aria-label="Exercice du défi"
                className="rounded-lg border border-ink-600 bg-ink-900 px-2 py-2 text-sm outline-none focus:border-neon-violet"
              >
                {EXERCISES.filter((e) => e.tags?.includes("incontournable") || e.equipment[0] === "aucun")
                  .slice(0, 120)
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
              </select>
              <input
                type="number"
                min={1}
                value={challengeForm.target}
                onChange={(e) => setChallengeForm({ ...challengeForm, target: e.target.value })}
                aria-label="Objectif"
                className="rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-sm tabular-nums outline-none focus:border-neon-violet"
              />
              <select
                value={challengeForm.days}
                onChange={(e) => setChallengeForm({ ...challengeForm, days: e.target.value })}
                aria-label="Durée du défi"
                className="rounded-lg border border-ink-600 bg-ink-900 px-2 py-2 text-sm outline-none focus:border-neon-violet"
              >
                <option value="1">1 jour</option>
                <option value="3">3 jours</option>
                <option value="7">1 semaine</option>
                <option value="30">1 mois</option>
              </select>
              <Button onClick={submitChallenge}>Lancer</Button>
            </div>
          </Card>

          {state.challenges.length === 0 ? (
            <EmptyState
              icon="🥊"
              title="Aucun défi en cours"
              description="Choisis un exercice, un objectif et une échéance : le premier à l'atteindre gagne."
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {state.challenges.map((c) => {
                const exercise = c.exerciseId ? EXERCISES_BY_ID.get(c.exerciseId) : null;
                const deadline = new Date(c.deadline);
                const daysLeft = Math.ceil((deadline.getTime() - now) / 86_400_000);
                return (
                  <Card as="li" key={c.id} className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="min-w-0 flex-1 truncate font-display text-sm font-bold">{c.title}</h3>
                      <Chip
                        color={c.status === "reussi" ? "#a3e635" : c.status === "echoue" ? "#fb7185" : "#fbbf24"}
                      >
                        {c.status === "reussi" ? "✓ Réussi" : c.status === "echoue" ? "✗ Échoué" : `${daysLeft} j restants`}
                      </Chip>
                      <button
                        type="button"
                        onClick={() => deleteChallenge(c.id)}
                        aria-label="Supprimer le défi"
                        className="text-xs text-white/25 hover:text-neon-rose"
                      >
                        ✕
                      </button>
                    </div>
                    {exercise && (
                      <Link href={`/exercices/${exercise.id}`} className="text-xs text-neon-cyan hover:underline">
                        {exercise.name}
                      </Link>
                    )}
                    <ul className="flex flex-col gap-1.5">
                      {c.participants.map((pid) => {
                        const participant =
                          pid === state.profile.id
                            ? { pseudo: `${state.profile.pseudo} (toi)`, avatar: state.profile.avatar }
                            : state.friends.find((f) => f.id === pid);
                        if (!participant) return null;
                        const value = c.progress[pid] ?? 0;
                        return (
                          <li key={pid} className="flex items-center gap-2">
                            <span aria-hidden>{participant.avatar}</span>
                            <span className="w-28 shrink-0 truncate text-xs">{participant.pseudo}</span>
                            <ProgressBar
                              value={Math.min(value, c.target)}
                              max={c.target}
                              color={value >= c.target ? "#a3e635" : "#22d3ee"}
                              className="h-1.5 flex-1"
                              label={`Progression de ${participant.pseudo}`}
                            />
                            <input
                              type="number"
                              min={0}
                              value={value}
                              onChange={(e) => updateChallengeProgress(c.id, pid, Number(e.target.value))}
                              aria-label={`Progression de ${participant.pseudo}`}
                              className="w-16 rounded border border-ink-600 bg-ink-900 px-1.5 py-1 text-center text-xs tabular-nums outline-none focus:border-neon-violet"
                            />
                            <span className="w-10 shrink-0 text-[11px] text-white/35">/ {c.target}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </Card>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
