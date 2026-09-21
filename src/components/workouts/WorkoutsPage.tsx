"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EXERCISES_BY_ID } from "@/data/exercises";
import { GROUP_META } from "@/data/taxonomy";
import { cryptoRandomId } from "@/lib/storage";
import { formatDuration } from "@/lib/records";
import { useApp } from "@/store/useApp";
import { Button, Card, Chip, EmptyState, SectionTitle } from "@/components/ui";
import { WorkoutGeneratorPanel } from "./WorkoutGeneratorPanel";

/** Page « Mes séances » : modèles enregistrés, générateur et historique. */
export function WorkoutsPage() {
  const router = useRouter();
  const templates = useApp((s) => s.state.templates);
  const logs = useApp((s) => s.state.logs);
  const saveTemplate = useApp((s) => s.saveTemplate);
  const deleteTemplate = useApp((s) => s.deleteTemplate);
  const [tab, setTab] = useState<"modeles" | "generateur" | "historique">("modeles");

  function createEmpty() {
    const id = cryptoRandomId();
    saveTemplate({
      id,
      name: "Nouvelle séance",
      description: "",
      exercises: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    router.push(`/seances/editer?id=${id}`);
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionTitle
        icon="🎯"
        title="Mes séances"
        subtitle="Compose tes entraînements, lance-les au chronomètre et retrouve ton historique."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" href="/seances/saisie">
              🗓️ Séance passée
            </Button>
            <Button onClick={createEmpty}>＋ Créer</Button>
          </div>
        }
      />

      <div className="flex gap-1 rounded-xl border border-ink-700 bg-ink-900/50 p-1">
        {(
          [
            ["modeles", `Mes modèles (${templates.length})`],
            ["generateur", "Générateur"],
            ["historique", `Historique (${logs.length})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            aria-pressed={tab === key}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold transition ${
              tab === key ? "bg-ink-700 text-white" : "text-white/45 hover:text-white/75"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "generateur" && <WorkoutGeneratorPanel />}

      {tab === "modeles" &&
        (templates.length === 0 ? (
          <EmptyState
            icon="🏗️"
            title="Aucune séance enregistrée"
            description="Crée ta première séance à la main, ou laisse le générateur t'en composer une en dix secondes."
            action={
              <div className="flex gap-2">
                <Button onClick={createEmpty}>Créer une séance</Button>
                <Button variant="ghost" onClick={() => setTab("generateur")}>
                  Utiliser le générateur
                </Button>
              </div>
            }
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {templates.map((t) => {
              const groups = [
                ...new Set(
                  t.exercises
                    .map((e) => EXERCISES_BY_ID.get(e.exerciseId)?.group)
                    .filter((g): g is NonNullable<typeof g> => Boolean(g)),
                ),
              ];
              const totalSets = t.exercises.reduce((n, e) => n + e.sets.length, 0);
              return (
                <Card as="li" key={t.id} className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate font-display text-sm font-bold">{t.name}</h3>
                      <p className="text-xs text-white/45">
                        {t.exercises.length} exercice{t.exercises.length > 1 ? "s" : ""} · {totalSets} série
                        {totalSets > 1 ? "s" : ""}
                      </p>
                    </div>
                    {t.generated && <Chip color="#22d3ee">🎲 Généré</Chip>}
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {groups.slice(0, 5).map((g) => (
                      <Chip key={g} color={GROUP_META[g].hex}>
                        {GROUP_META[g].icon} {GROUP_META[g].label}
                      </Chip>
                    ))}
                  </div>

                  <div className="mt-auto flex flex-wrap gap-2 pt-1">
                    <Button size="sm" href={`/entrainement?template=${t.id}`}>
                      ▶ Lancer
                    </Button>
                    <Button size="sm" variant="ghost" href={`/seances/editer?id=${t.id}`}>
                      ✎ Modifier
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => deleteTemplate(t.id)}>
                      Supprimer
                    </Button>
                  </div>
                </Card>
              );
            })}
          </ul>
        ))}

      {tab === "historique" &&
        (logs.length === 0 ? (
          <EmptyState
            icon="📜"
            title="Pas encore de séance terminée"
            description="Ton historique apparaîtra ici. Tu peux aussi y ajouter des séances que tu as déjà faites, avec leur date."
            action={<Button href="/seances/saisie">🗓️ Enregistrer une séance passée</Button>}
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {logs.map((log) => (
              <Card as="li" key={log.id} className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-display text-sm font-bold">{log.name}</h3>
                  <p className="text-xs text-white/45">
                    {new Date(log.startedAt).toLocaleDateString("fr-FR", {
                      weekday: "short",
                      day: "numeric",
                      month: "long",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  <Chip color="#a3e635">＋{log.xp} XP</Chip>
                  <Chip className="text-white/55">⏱ {formatDuration(log.durationSeconds)}</Chip>
                  {log.volumeKg > 0 && (
                    <Chip className="text-white/55">🏋️ {Math.round(log.volumeKg).toLocaleString("fr-FR")} kg</Chip>
                  )}
                  <Chip className="text-white/55">🔥 {log.calories} kcal</Chip>
                </div>
                <div className="flex shrink-0 gap-3">
                  <Link
                    href={`/seances/saisie?from=${log.id}`}
                    className="text-xs font-semibold text-white/45 hover:text-white"
                    title="Réenregistrer cette séance à une autre date"
                  >
                    Dupliquer
                  </Link>
                  <Link
                    href={`/progression#seance-${log.id}`}
                    className="text-xs font-semibold text-neon-cyan hover:underline"
                  >
                    Détail
                  </Link>
                </div>
              </Card>
            ))}
          </ul>
        ))}
    </div>
  );
}
