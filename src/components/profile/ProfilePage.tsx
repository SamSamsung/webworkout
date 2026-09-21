"use client";

import { useMemo, useRef, useState } from "react";
import type { Equipment } from "@/types/exercise";
import type { Goal } from "@/types/app";
import { GOAL_LABELS } from "@/types/app";
import { EQUIPMENT_META } from "@/data/taxonomy";
import { BADGES, RARITY_META, computeBadgeStats, type BadgeRarity } from "@/lib/badges";
import { exportState } from "@/lib/storage";
import { RANKS, totalXpForLevel } from "@/lib/xp";
import { useApp, useLevel } from "@/store/useApp";
import { Button, Card, Chip, cx, ProgressBar, SectionTitle, StatTile } from "@/components/ui";
import { AccountCard } from "./AccountCard";

/** Avatars proposés : des emoji, pour éviter tout téléversement de fichier. */
const AVATARS = ["🦍", "🐺", "🦅", "🦊", "🐻", "🦁", "🐯", "🦈", "🐉", "🤖", "👹", "🥷", "🦾", "⚡", "🔥", "🗿"];

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
  "roue-abdominale",
  "gilet-leste",
];

/** Page de profil : identité du joueur, collection de badges et données. */
export function ProfilePage() {
  const state = useApp((s) => s.state);
  const storage = useApp((s) => s.storage);
  const updateProfile = useApp((s) => s.updateProfile);
  const importBackup = useApp((s) => s.importBackup);
  const reset = useApp((s) => s.reset);
  const level = useLevel();

  const [filter, setFilter] = useState<BadgeRarity | "tous">("tous");
  const [message, setMessage] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const stats = useMemo(() => computeBadgeStats(state), [state]);
  const owned = useMemo(() => new Set(state.badges.map((b) => b.badgeId)), [state.badges]);

  const badges = useMemo(
    () =>
      BADGES.filter((b) => filter === "tous" || b.rarity === filter).sort((a, b) => {
        const aOwned = owned.has(a.id) ? 0 : 1;
        const bOwned = owned.has(b.id) ? 0 : 1;
        return aOwned - bOwned || (b.progress?.(stats) ?? 0) - (a.progress?.(stats) ?? 0);
      }),
    [filter, owned, stats],
  );

  /** Télécharge la sauvegarde au format JSON. */
  function download() {
    const blob = new Blob([exportState(state)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ironquest-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage("Sauvegarde téléchargée.");
  }

  async function upload(file: File) {
    try {
      importBackup(await file.text());
      setMessage("Sauvegarde importée avec succès.");
    } catch (error) {
      setMessage(`Import impossible : ${error instanceof Error ? error.message : "fichier illisible"}`);
    }
  }

  const toggleEquipment = (e: Equipment) =>
    updateProfile({
      availableEquipment: state.profile.availableEquipment.includes(e)
        ? state.profile.availableEquipment.filter((x) => x !== e)
        : [...state.profile.availableEquipment, e],
    });

  return (
    <div className="flex flex-col gap-5">
      <SectionTitle icon="🎖️" title="Profil & collection" subtitle="Ton identité, ta progression et tes données." />

      {/* ---------------------------------------------------- Carte niveau */}
      <Card className="flex flex-wrap items-center gap-4 border-neon-violet/30">
        <span aria-hidden className="text-5xl">{state.profile.avatar}</span>
        {/* `basis` empêche le bloc d'identité d'être écrasé par la grille de
            statistiques sur un écran étroit : les deux se répartissent sur
            deux lignes au lieu de se disputer la largeur. */}
        <div className="min-w-0 flex-1 basis-56">
          <h2 className="font-display text-xl font-black">{state.profile.pseudo}</h2>
          <p className="text-sm text-white/50">
            {level.title} · Niveau {level.level}
          </p>
          <ProgressBar value={level.progress} className="mt-2" label="Progression de niveau" />
          <p className="mt-1 text-[11px] tabular-nums text-white/40">
            {level.xpIntoLevel} / {level.xpForLevel} XP · {state.xp.toLocaleString("fr-FR")} XP au total
          </p>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:grid-cols-4">
          <StatTile icon="🎽" label="Séances" value={stats.workouts} color="#22d3ee" />
          <StatTile icon="🏅" label="Records" value={stats.recordsCount} color="#a3e635" />
          <StatTile icon="🎖️" label="Badges" value={`${owned.size}/${BADGES.length}`} color="#fbbf24" />
          <StatTile icon="🔥" label="Meilleure série" value={stats.streakBest} unit="j" color="#fb7185" />
        </div>
      </Card>

      {/* --------------------------------------------------------- Réglages */}
      <section>
        <SectionTitle icon="⚙️" title="Réglages" subtitle="Ces informations alimentent l'XP, les calories et le générateur." />
        <Card className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs">
              <span className="text-white/45">Pseudo</span>
              <input
                value={state.profile.pseudo}
                onChange={(e) => updateProfile({ pseudo: e.target.value })}
                className="rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-sm outline-none focus:border-neon-violet"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="text-white/45">Poids de corps (kg)</span>
              <input
                type="number"
                min={20}
                max={250}
                step={0.5}
                value={state.profile.bodyweightKg}
                onChange={(e) => updateProfile({ bodyweightKg: Number(e.target.value) })}
                className="rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-sm tabular-nums outline-none focus:border-neon-violet"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="text-white/45">Année de naissance (facultatif)</span>
              <input
                type="number"
                min={1930}
                max={2020}
                value={state.profile.birthYear ?? ""}
                onChange={(e) => updateProfile({ birthYear: e.target.value ? Number(e.target.value) : undefined })}
                className="rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-sm tabular-nums outline-none focus:border-neon-violet"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="text-white/45">Objectif principal</span>
              <select
                value={state.profile.goal}
                onChange={(e) => updateProfile({ goal: e.target.value as Goal })}
                className="rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-sm outline-none focus:border-neon-violet"
              >
                {(Object.keys(GOAL_LABELS) as Goal[]).map((g) => (
                  <option key={g} value={g}>
                    {GOAL_LABELS[g]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-white/35">Avatar</p>
            <div className="flex flex-wrap gap-1.5">
              {AVATARS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => updateProfile({ avatar: a })}
                  aria-label={`Choisir l'avatar ${a}`}
                  aria-pressed={state.profile.avatar === a}
                  className={cx(
                    "rounded-lg border px-2 py-1 text-xl transition",
                    state.profile.avatar === a
                      ? "border-neon-violet bg-neon-violet/15"
                      : "border-ink-600 hover:bg-ink-800",
                  )}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-white/35">Mon matériel</p>
            <div className="flex flex-wrap gap-1.5">
              {EQUIPMENT_CHOICES.map((e) => {
                const active = state.profile.availableEquipment.includes(e);
                return (
                  <button key={e} type="button" onClick={() => toggleEquipment(e)} aria-pressed={active}>
                    <Chip
                      color={active ? "#22d3ee" : undefined}
                      className={active ? "font-bold" : "text-white/45 hover:text-white/75"}
                    >
                      {EQUIPMENT_META[e].icon} {EQUIPMENT_META[e].label}
                    </Chip>
                  </button>
                );
              })}
            </div>
          </div>
        </Card>
      </section>

      {/* ---------------------------------------------------------- Badges */}
      <section>
        <SectionTitle
          icon="🏆"
          title={`Badges (${owned.size}/${BADGES.length})`}
          subtitle="Les badges verrouillés affichent leur progression : tu sais toujours ce qu'il reste à faire."
          action={
            <div className="flex gap-1">
              {(["tous", "commun", "rare", "epique", "legendaire"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setFilter(r)}
                  aria-pressed={filter === r}
                  className={cx(
                    "rounded-lg px-2 py-1 text-[10px] font-bold uppercase transition",
                    filter === r ? "bg-ink-700 text-white" : "text-white/35 hover:text-white/70",
                  )}
                >
                  {r === "tous" ? "Tous" : RARITY_META[r].label}
                </button>
              ))}
            </div>
          }
        />
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {badges.map((badge) => {
            const isOwned = owned.has(badge.id);
            const rarity = RARITY_META[badge.rarity];
            const progress = badge.progress?.(stats) ?? (isOwned ? 1 : 0);
            return (
              <Card
                as="li"
                key={badge.id}
                className={cx("flex gap-3", !isOwned && "opacity-60")}
                >
                <span
                  aria-hidden
                  className={cx("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl ring-1", rarity.ring)}
                  style={{ background: isOwned ? `${rarity.color}22` : "#16132a" }}
                >
                  {isOwned ? badge.icon : "🔒"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="truncate font-display text-sm font-bold">{badge.name}</h3>
                    <span className="text-[9px] font-bold uppercase" style={{ color: rarity.color }}>
                      {rarity.label}
                    </span>
                  </div>
                  <p className="text-[11px] leading-snug text-white/50">{badge.description}</p>
                  {!isOwned && (
                    <ProgressBar value={progress} color={rarity.color} className="mt-1.5 h-1.5" label={badge.name} />
                  )}
                </div>
              </Card>
            );
          })}
        </ul>
      </section>

      {/* --------------------------------------------------- Rangs à venir */}
      <section>
        <SectionTitle icon="🪜" title="Rangs" subtitle="Le chemin complet, du poussin de fonte à la légende vivante." />
        <Card>
          <ul className="flex flex-col gap-1.5">
            {RANKS.map((rank) => {
              const reached = level.level >= rank.from;
              return (
                <li
                  key={rank.title}
                  className={cx("flex items-center gap-2 text-sm", reached ? "text-white/85" : "text-white/35")}
                >
                  <span aria-hidden className="text-lg">{rank.icon}</span>
                  <span className="flex-1">{rank.title}</span>
                  <span className="text-[11px] tabular-nums text-white/40">
                    Niv. {rank.from} · {totalXpForLevel(rank.from).toLocaleString("fr-FR")} XP
                  </span>
                  {reached && <Chip color="#a3e635">✓</Chip>}
                </li>
              );
            })}
          </ul>
        </Card>
      </section>

      {/* --------------------------------------------------------- Compte */}
      <section>
        <AccountCard />
      </section>

      {/* ---------------------------------------------------------- Données */}
      <section>
        <SectionTitle icon="💾" title="Mes données" subtitle="Elles t'appartiennent : exporte-les ou efface-les quand tu veux." />
        <Card className="flex flex-col gap-3">
          <p className="text-xs text-white/50">
            Mode de stockage actuel :{" "}
            <strong className="text-white/80">
              {storage === "local" ? "navigateur (localStorage)" : "Supabase (compte synchronisé)"}
            </strong>
            .{" "}
            {storage === "local"
              ? "Tes données ne quittent jamais cet appareil. Pense à exporter une sauvegarde avant de changer de navigateur."
              : "Chaque modification est enregistrée sur ton compte. L'export reste disponible pour garder une copie hors ligne."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="soft" onClick={download}>
              ⬇️ Exporter (JSON)
            </Button>
            <Button size="sm" variant="ghost" onClick={() => fileRef.current?.click()}>
              ⬆️ Importer une sauvegarde
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void upload(file);
                e.target.value = "";
              }}
            />
            {confirmReset ? (
              <>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    reset();
                    setConfirmReset(false);
                    setMessage("Toutes les données ont été effacées.");
                  }}
                >
                  Confirmer l&apos;effacement
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmReset(false)}>
                  Annuler
                </Button>
              </>
            ) : (
              <Button size="sm" variant="danger" onClick={() => setConfirmReset(true)}>
                🗑️ Tout effacer
              </Button>
            )}
          </div>
          {message && (
            <p className="rounded-lg bg-ink-800 px-3 py-2 text-xs text-neon-lime" role="status">
              {message}
            </p>
          )}
        </Card>
      </section>
    </div>
  );
}
