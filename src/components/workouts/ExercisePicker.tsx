"use client";

import { useDeferredValue, useMemo, useState } from "react";
import type { Difficulty, Exercise, MuscleGroup } from "@/types/exercise";
import { DIFFICULTY_LABELS, MUSCLE_GROUPS } from "@/types/exercise";
import { EQUIPMENT_META, GROUP_META, METRIC_META, MUSCLE_LABELS } from "@/data/taxonomy";
import { EXERCISES } from "@/data/exercises";
import { filterExercises } from "@/lib/search";
import { formatDuration } from "@/lib/records";
import { useApp } from "@/store/useApp";
import { Button, Chip, cx, DifficultyDots } from "@/components/ui";
import { MuscleMap } from "@/components/exercises/MuscleMap";

const PAGE_SIZE = 30;

/**
 * Sélecteur d'exercice de l'éditeur de séance.
 *
 * Ce n'est pas une simple liste de noms : on y retrouve la même richesse que
 * la base d'exercices — aperçu des muscles sollicités, description, technique
 * et lien vers la fiche complète — pour pouvoir choisir en connaissance de
 * cause sans quitter sa séance.
 *
 * Deux vitesses : le bouton « ＋ » ajoute directement pour qui sait ce qu'il
 * veut, le reste de la carte ouvre l'aperçu détaillé.
 */
export function ExercisePicker({
  onPick,
  onClose,
}: {
  onPick: (exercise: Exercise) => void;
  onClose: () => void;
}) {
  const favorites = useApp((s) => s.state.favorites);
  const records = useApp((s) => s.state.records);

  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<MuscleGroup | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [noEquipment, setNoEquipment] = useState(false);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [preview, setPreview] = useState<Exercise | null>(null);

  const deferred = useDeferredValue(query);

  const results = useMemo(
    () =>
      filterExercises(EXERCISES, {
        query: deferred,
        groups: group ? [group] : undefined,
        difficulties: difficulty ? [difficulty] : undefined,
        noEquipmentOnly: noEquipment,
        ids: onlyFavorites ? favorites : undefined,
      }),
    [deferred, group, difficulty, noEquipment, onlyFavorites, favorites],
  );

  /** Réinitialise la pagination à chaque changement de critère. */
  const resetAnd = <T,>(setter: (v: T) => void) => (value: T) => {
    setLimit(PAGE_SIZE);
    setter(value);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-ink-950/85 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Choisir un exercice"
    >
      <div className="flex h-dvh w-full max-w-5xl flex-col gap-2.5 bg-ink-900 p-3 sm:h-[85dvh] sm:gap-3 sm:rounded-2xl sm:border sm:border-ink-600 sm:p-4">
        {/* ------------------------------------------------------- En-tête */}
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-base font-bold">Ajouter un exercice</h2>
            <p className="text-[11px] text-white/40">
              {results.length} exercice{results.length > 1 ? "s" : ""} sur {EXERCISES.length}
            </p>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose}>
            Fermer
          </Button>
        </div>

        <input
          type="search"
          autoFocus
          value={query}
          onChange={(e) => resetAnd(setQuery)(e.target.value)}
          placeholder={`Rechercher parmi ${EXERCISES.length} exercices…`}
          aria-label="Rechercher un exercice"
          className="w-full rounded-xl border border-ink-600 bg-ink-950 px-3 py-2.5 text-sm outline-none placeholder:text-white/30 focus:border-neon-violet"
        />

        {/* -------------------------------------------------------- Filtres */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <FilterChip active={onlyFavorites} color="#fbbf24" onClick={() => resetAnd(setOnlyFavorites)(!onlyFavorites)}>
            ⭐ Favoris
          </FilterChip>
          <FilterChip active={noEquipment} color="#a3e635" onClick={() => resetAnd(setNoEquipment)(!noEquipment)}>
            🙌 Sans matériel
          </FilterChip>
          {([1, 2, 3, 4, 5] as Difficulty[]).map((d) => (
            <FilterChip
              key={d}
              active={difficulty === d}
              color="#22d3ee"
              onClick={() => resetAnd(setDifficulty)(difficulty === d ? null : d)}
            >
              {"★".repeat(d)}
            </FilterChip>
          ))}
          {MUSCLE_GROUPS.map((g) => (
            <FilterChip
              key={g}
              active={group === g}
              color={GROUP_META[g].hex}
              onClick={() => resetAnd(setGroup)(group === g ? null : g)}
            >
              {GROUP_META[g].icon} {GROUP_META[g].label}
            </FilterChip>
          ))}
        </div>

        {/* --------------------------------------------- Liste et aperçu */}
        <div className="flex min-h-0 flex-1 gap-3">
          <ul className="flex-1 space-y-2 overflow-y-auto pr-1">
            {results.slice(0, limit).map((ex) => {
              const meta = GROUP_META[ex.group];
              const selected = preview?.id === ex.id;
              const record = records[ex.id];
              return (
                <li key={ex.id}>
                  <div
                    className={cx(
                      "flex items-start gap-2 rounded-xl border p-2 transition",
                      selected ? "border-neon-violet/60 bg-ink-800" : "border-ink-700 hover:border-ink-500 hover:bg-ink-850",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setPreview(ex)}
                      aria-label={`Voir le détail de ${ex.name}`}
                      className="flex min-w-0 flex-1 items-start gap-2 text-left"
                    >
                      <span className="shrink-0 rounded-lg bg-ink-950/60 px-1 py-1">
                        <MuscleMap
                          primary={ex.primaryMuscles}
                          secondary={ex.secondaryMuscles}
                          showLabels={false}
                          size="sm"
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{ex.name}</span>
                        {ex.nameEn && <span className="block truncate text-[11px] text-white/35">{ex.nameEn}</span>}
                        <span className="mt-1 flex flex-wrap items-center gap-1">
                          <Chip color={meta.hex}>{meta.label}</Chip>
                          <Chip title={DIFFICULTY_LABELS[ex.difficulty]}>
                            <DifficultyDots level={ex.difficulty} />
                          </Chip>
                          <Chip className="text-white/45">
                            {ex.equipment[0] === "aucun" && ex.equipment.length === 1
                              ? "🙌 Sans matériel"
                              : `${EQUIPMENT_META[ex.equipment[0]].icon} ${EQUIPMENT_META[ex.equipment[0]].label}`}
                          </Chip>
                          {record && <Chip color="#a3e635">🏅 record</Chip>}
                        </span>
                        <span className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-white/45">
                          {ex.description}
                        </span>
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onPick(ex)}
                      aria-label={`Ajouter ${ex.name} à la séance`}
                      title="Ajouter à la séance"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-neon-violet to-neon-cyan text-lg font-black text-ink-950 transition hover:brightness-110 active:scale-95"
                    >
                      ＋
                    </button>
                  </div>
                </li>
              );
            })}

            {results.length === 0 && (
              <li className="py-10 text-center text-sm text-white/40">Aucun exercice ne correspond.</li>
            )}

            {results.length > limit && (
              <li className="pt-1">
                <Button variant="soft" size="sm" className="w-full" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
                  Afficher {Math.min(PAGE_SIZE, results.length - limit)} exercices de plus
                </Button>
              </li>
            )}
          </ul>

          {/* Aperçu : colonne fixe sur grand écran */}
          <aside className="hidden w-[340px] shrink-0 overflow-y-auto rounded-xl border border-ink-700 bg-ink-950/40 p-3 lg:block">
            {preview ? (
              <ExercisePreview exercise={preview} onAdd={() => onPick(preview)} />
            ) : (
              <p className="px-2 py-10 text-center text-xs leading-relaxed text-white/35">
                Sélectionne un exercice pour voir les muscles sollicités, la technique et les erreurs à éviter.
                <br />
                <br />
                Le bouton <strong className="text-white/60">＋</strong> l&apos;ajoute directement à ta séance.
              </p>
            )}
          </aside>
        </div>
      </div>

      {/* Aperçu en feuille sur mobile */}
      {preview && (
        <div className="fixed inset-0 z-[70] flex items-end bg-ink-950/85 backdrop-blur-sm lg:hidden">
          <div className="h-dvh w-full overflow-y-auto bg-ink-900 p-4">
            <div className="mb-2 flex justify-end">
              <Button size="sm" variant="ghost" onClick={() => setPreview(null)}>
                Fermer l&apos;aperçu
              </Button>
            </div>
            <ExercisePreview exercise={preview} onAdd={() => onPick(preview)} />
          </div>
        </div>
      )}
    </div>
  );
}

/** Aperçu détaillé d'un exercice, partagé entre la colonne et la feuille mobile. */
function ExercisePreview({ exercise, onAdd }: { exercise: Exercise; onAdd: () => void }) {
  const meta = GROUP_META[exercise.group];
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="font-display text-sm font-bold leading-tight">{exercise.name}</h3>
        {exercise.nameEn && <p className="text-[11px] text-white/35">{exercise.nameEn}</p>}
      </div>

      <MuscleMap primary={exercise.primaryMuscles} secondary={exercise.secondaryMuscles} />

      <div className="flex flex-wrap gap-1">
        <Chip color={meta.hex}>{meta.icon} {meta.label}</Chip>
        <Chip title={DIFFICULTY_LABELS[exercise.difficulty]}>
          <DifficultyDots level={exercise.difficulty} /> {DIFFICULTY_LABELS[exercise.difficulty]}
        </Chip>
        {exercise.unilateral && <Chip className="text-neon-amber">↔️ Unilatéral</Chip>}
        {exercise.equipment.map((e) => (
          <Chip key={e} className="text-white/50">
            {EQUIPMENT_META[e].icon} {EQUIPMENT_META[e].label}
          </Chip>
        ))}
      </div>

      <p className="text-xs leading-relaxed text-white/70">{exercise.description}</p>

      <div>
        <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-white/35">Muscles principaux</p>
        <p className="text-[11px] text-white/60">
          {exercise.primaryMuscles.map((m) => MUSCLE_LABELS[m]).join(" · ") || "—"}
        </p>
      </div>

      <div>
        <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-white/35">Exécution</p>
        <ol className="flex flex-col gap-1">
          {exercise.steps.map((step, i) => (
            <li key={i} className="flex gap-1.5 text-[11px] leading-relaxed text-white/65">
              <span aria-hidden className="text-neon-violet">{i + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {exercise.commonMistakes.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-neon-rose">À éviter</p>
          <ul className="flex flex-col gap-1">
            {exercise.commonMistakes.slice(0, 3).map((m, i) => (
              <li key={i} className="flex gap-1.5 text-[11px] leading-relaxed text-white/60">
                <span aria-hidden className="text-neon-rose">✗</span>
                <span>{m}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-1 border-t border-ink-700 pt-2 text-[11px] text-white/45">
        <Chip className="text-white/50">{METRIC_META[exercise.metric].label}</Chip>
        {exercise.repRange && (
          <Chip className="text-white/50">
            {exercise.metric === "temps"
              ? `${exercise.repRange[0]}-${exercise.repRange[1]} s`
              : `${exercise.repRange[0]}-${exercise.repRange[1]} reps`}
          </Chip>
        )}
        <Chip className="text-white/50">Repos {formatDuration(exercise.restSeconds[0])}</Chip>
      </div>

      <div className="flex gap-2">
        <Button className="flex-1" onClick={onAdd}>
          ＋ Ajouter à la séance
        </Button>
        {/* Nouvel onglet volontaire : on ne veut pas sortir de l'éditeur de
            séance pour aller lire une fiche. */}
        <a
          href={`/exercices/${exercise.id}`}
          target="_blank"
          rel="noopener noreferrer"
          title="Ouvrir la fiche complète dans un nouvel onglet"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-ink-600 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-ink-800 active:scale-[0.97]"
        >
          Fiche ↗
        </a>
      </div>
    </div>
  );
}

function FilterChip({
  children,
  active,
  color,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  color?: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className="shrink-0">
      <Chip
        color={active ? color : undefined}
        className={cx("whitespace-nowrap", active ? "font-bold" : "text-white/45 hover:text-white/75")}
      >
        {children}
      </Chip>
    </button>
  );
}
