import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EXERCISES, EXERCISES_BY_ID, getExercise } from "@/data/exercises";
import { EQUIPMENT_META, FORCE_LABELS, GROUP_META, METRIC_META, MUSCLE_LABELS } from "@/data/taxonomy";
import { DIFFICULTY_LABELS } from "@/types/exercise";
import { familyVariants, relatedExercises } from "@/lib/search";
import { formatDuration } from "@/lib/records";
import { Card, Chip, DifficultyDots, SectionTitle } from "@/components/ui";
import { MuscleMap } from "@/components/exercises/MuscleMap";
import { ExerciseActions } from "@/components/exercises/ExerciseActions";

/** Toutes les fiches sont pré-rendues : navigation instantanée et bon référencement. */
export function generateStaticParams() {
  return EXERCISES.map((ex) => ({ id: ex.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const exercise = getExercise(id);
  if (!exercise) return { title: "Exercice introuvable" };
  return {
    title: exercise.name,
    description: exercise.description.slice(0, 180),
    keywords: [exercise.name, exercise.nameEn ?? "", ...(exercise.aliases ?? []), exercise.group],
  };
}

export default async function ExercicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const exercise = getExercise(id);
  if (!exercise) notFound();

  const meta = GROUP_META[exercise.group];
  const variants = familyVariants(EXERCISES, exercise.family).filter((v) => v.id !== exercise.id);
  const related = relatedExercises(EXERCISES, exercise);
  const metric = METRIC_META[exercise.metric];

  return (
    <article className="flex flex-col gap-5">
      {/* ------------------------------------------------------- En-tête */}
      <header className="flex flex-col gap-3">
        <nav className="text-xs text-white/40" aria-label="Fil d'Ariane">
          <Link href="/exercices" className="hover:text-neon-cyan">
            Exercices
          </Link>
          <span aria-hidden> › </span>
          <span style={{ color: meta.hex }}>{meta.label}</span>
          <span aria-hidden> › </span>
          <span className="text-white/60">{exercise.name}</span>
        </nav>

        <div className="flex items-start gap-3">
          <span aria-hidden className="text-4xl leading-none">{meta.icon}</span>
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-black leading-tight sm:text-3xl">{exercise.name}</h1>
            <p className="mt-1 text-sm text-white/45">
              {exercise.nameEn}
              {exercise.aliases?.length ? ` · aussi appelé ${exercise.aliases.join(", ")}` : ""}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Chip color={meta.hex}>{meta.label}</Chip>
          <Chip title={`Difficulté ${exercise.difficulty}/5`}>
            <DifficultyDots level={exercise.difficulty} /> {DIFFICULTY_LABELS[exercise.difficulty]}
          </Chip>
          <Chip className="text-white/55">{exercise.mechanic}</Chip>
          <Chip className="text-white/55">{FORCE_LABELS[exercise.force]}</Chip>
          <Chip className="text-white/55">{exercise.category}</Chip>
          {exercise.unilateral && <Chip className="text-neon-amber">↔️ Unilatéral</Chip>}
          {exercise.tags?.includes("incontournable") && <Chip color="#fbbf24">⭐ Incontournable</Chip>}
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        {/* ------------------------------------------------ Colonne principale */}
        <div className="flex flex-col gap-5">
          <Card>
            <p className="text-sm leading-relaxed text-white/80">{exercise.description}</p>
          </Card>

          <section>
            <SectionTitle icon="🎬" title="Exécution" subtitle="Déroulé du mouvement, étape par étape" />
            <Card>
              <ol className="flex flex-col gap-3">
                {exercise.steps.map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span
                      aria-hidden
                      className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neon-violet/20 font-display text-xs font-black text-neon-violet"
                    >
                      {i + 1}
                    </span>
                    <span className="text-sm leading-relaxed text-white/80">{step}</span>
                  </li>
                ))}
              </ol>
              {(exercise.breathing || exercise.tempo) && (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-ink-700 pt-3 text-xs">
                  {exercise.breathing && (
                    <p className="text-white/55">
                      <span aria-hidden>🌬️</span> <strong className="text-white/75">Respiration :</strong>{" "}
                      {exercise.breathing}
                    </p>
                  )}
                  {exercise.tempo && (
                    <p className="text-white/55">
                      <span aria-hidden>⏳</span> <strong className="text-white/75">Tempo :</strong> {exercise.tempo}
                    </p>
                  )}
                </div>
              )}
            </Card>
          </section>

          <div className="grid gap-4 sm:grid-cols-2">
            <section>
              <SectionTitle icon="⚠️" title="Erreurs fréquentes" />
              <Card className="border-neon-rose/25 bg-neon-rose/[0.04]">
                <ul className="flex flex-col gap-2">
                  {exercise.commonMistakes.map((m, i) => (
                    <li key={i} className="flex gap-2 text-sm leading-relaxed text-white/75">
                      <span aria-hidden className="text-neon-rose">✗</span>
                      <span>{m}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </section>

            <section>
              <SectionTitle icon="🛡️" title="Sécurité" />
              <Card className="border-neon-amber/25 bg-neon-amber/[0.04]">
                <ul className="flex flex-col gap-2">
                  {exercise.safetyTips.map((t, i) => (
                    <li key={i} className="flex gap-2 text-sm leading-relaxed text-white/75">
                      <span aria-hidden className="text-neon-amber">✓</span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </section>
          </div>

          {/* Progressions et régressions */}
          {(exercise.regressions?.length || exercise.progressions?.length) && (
            <section>
              <SectionTitle
                icon="🪜"
                title="Échelle de progression"
                subtitle="Par où passer avant, et vers quoi aller ensuite"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Card>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-neon-emerald">
                    ↓ Plus accessible
                  </p>
                  {exercise.regressions?.length ? (
                    <ul className="flex flex-col gap-1.5">
                      {exercise.regressions.map((rid) => (
                        <ExerciseLink key={rid} id={rid} />
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-white/40">C&apos;est déjà une porte d&apos;entrée du mouvement.</p>
                  )}
                </Card>
                <Card>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-neon-rose">↑ Plus difficile</p>
                  {exercise.progressions?.length ? (
                    <ul className="flex flex-col gap-1.5">
                      {exercise.progressions.map((pid) => (
                        <ExerciseLink key={pid} id={pid} />
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-white/40">Sommet de cette branche de progression.</p>
                  )}
                </Card>
              </div>
            </section>
          )}

          {variants.length > 0 && (
            <section>
              <SectionTitle
                icon="🧩"
                title={`Variantes de la famille « ${exercise.family} »`}
                subtitle={`${variants.length} autre${variants.length > 1 ? "s" : ""} mouvement${variants.length > 1 ? "s" : ""} de la même famille, du plus simple au plus dur`}
              />
              <ul className="grid gap-2 sm:grid-cols-2">
                {variants.map((v) => (
                  <li key={v.id}>
                    <Link
                      href={`/exercices/${v.id}`}
                      className="card flex items-center gap-2 p-2.5 text-sm transition hover:border-ink-500"
                    >
                      <DifficultyDots level={v.difficulty} />
                      <span className="truncate font-medium">{v.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <SectionTitle icon="🔗" title="Exercices proches" subtitle="Même groupe musculaire, niveau comparable" />
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/exercices/${r.id}`}
                    className="card flex items-center gap-2 p-2.5 text-sm transition hover:border-ink-500"
                  >
                    <span aria-hidden>{GROUP_META[r.group].icon}</span>
                    <span className="truncate font-medium">{r.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* ------------------------------------------------------ Colonne latérale */}
        <aside className="flex flex-col gap-4">
          <Card>
            <SectionTitle icon="🫀" title="Muscles sollicités" />
            <MuscleMap primary={exercise.primaryMuscles} secondary={exercise.secondaryMuscles} />
            <div className="mt-3 flex flex-col gap-2 border-t border-ink-700 pt-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-neon-rose">Principaux</p>
                <p className="text-xs text-white/70">
                  {exercise.primaryMuscles.map((m) => MUSCLE_LABELS[m]).join(" · ") || "—"}
                </p>
              </div>
              {exercise.secondaryMuscles.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neon-cyan">Secondaires</p>
                  <p className="text-xs text-white/55">
                    {exercise.secondaryMuscles.map((m) => MUSCLE_LABELS[m]).join(" · ")}
                  </p>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <SectionTitle icon="📋" title="Fiche technique" />
            <dl className="flex flex-col gap-2 text-sm">
              <Row label="Matériel">
                <span className="flex flex-wrap gap-1">
                  {exercise.equipment.map((e) => (
                    <Chip key={e} className="text-white/60">
                      {EQUIPMENT_META[e].icon} {EQUIPMENT_META[e].label}
                    </Chip>
                  ))}
                </span>
              </Row>
              <Row label="Lieu">
                <span className="text-white/70">{exercise.locations.join(", ")}</span>
              </Row>
              <Row label="Mesure">
                <span className="text-white/70">{metric.label}</span>
              </Row>
              {exercise.repRange && (
                <Row label={exercise.metric === "temps" ? "Durée conseillée" : "Répétitions"}>
                  <span className="text-white/70">
                    {exercise.metric === "temps"
                      ? `${exercise.repRange[0]} à ${exercise.repRange[1]} s`
                      : `${exercise.repRange[0]} à ${exercise.repRange[1]}`}
                  </span>
                </Row>
              )}
              <Row label="Repos">
                <span className="text-white/70">
                  {formatDuration(exercise.restSeconds[0])} à {formatDuration(exercise.restSeconds[1])}
                </span>
              </Row>
              <Row label="Multiplicateur XP">
                <span className="font-bold text-neon-lime">×{exercise.xpFactor}</span>
              </Row>
              {exercise.met && (
                <Row label="Intensité (MET)">
                  <span className="text-white/70">{exercise.met}</span>
                </Row>
              )}
            </dl>
          </Card>

          <ExerciseActions exercise={exercise} />
        </aside>
      </div>
    </article>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-ink-700/60 pb-2 last:border-0 last:pb-0">
      <dt className="shrink-0 text-xs text-white/40">{label}</dt>
      <dd className="text-right text-xs">{children}</dd>
    </div>
  );
}

/** Lien vers un autre exercice, avec son nom et sa difficulté. */
function ExerciseLink({ id }: { id: string }) {
  const ex = EXERCISES_BY_ID.get(id);
  if (!ex) return null;
  return (
    <li>
      <Link href={`/exercices/${ex.id}`} className="flex items-center gap-2 text-sm hover:text-neon-cyan">
        <DifficultyDots level={ex.difficulty} />
        <span className="truncate">{ex.name}</span>
      </Link>
    </li>
  );
}
