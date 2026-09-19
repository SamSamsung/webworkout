"use client";

import { useDeferredValue, useMemo, useState } from "react";
import type { Category, Difficulty, Equipment, Location, MuscleGroup } from "@/types/exercise";
import { CATEGORIES, DIFFICULTY_LABELS, LOCATIONS, MUSCLE_GROUPS } from "@/types/exercise";
import { EQUIPMENT_META, GROUP_META } from "@/data/taxonomy";
import { EXERCISES } from "@/data/exercises";
import { filterExercises, type SortKey } from "@/lib/search";
import { Button, Card, Chip, cx, EmptyState } from "@/components/ui";
import { ExerciseCard } from "./ExerciseCard";
import { useApp } from "@/store/useApp";

/** Matériel proposé en filtre rapide : les plus courants d'abord. */
const QUICK_EQUIPMENT: Equipment[] = [
  "aucun",
  "halteres",
  "barre",
  "barre-de-traction",
  "elastique",
  "kettlebell",
  "machine",
  "poulie",
  "banc",
  "barres-paralleles",
  "trx",
  "anneaux",
  "swiss-ball",
  "box",
  "chaise",
  "corde-a-sauter",
];

/**
 * Explorateur de la base d'exercices.
 *
 * Le filtrage est entièrement côté client : la base tient en mémoire, la
 * recherche est donc instantanée et fonctionne hors ligne.
 */
export function ExerciseBrowser({ initialGroup }: { initialGroup?: MuscleGroup }) {
  const favorites = useApp((s) => s.state.favorites);
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<MuscleGroup[]>(initialGroup ? [initialGroup] : []);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [difficulties, setDifficulties] = useState<Difficulty[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [sort, setSort] = useState<SortKey>("pertinence");
  const [showAllFilters, setShowAllFilters] = useState(false);
  const [limit, setLimit] = useState(48);

  // `useDeferredValue` garde la saisie fluide même pendant le filtrage.
  const deferredQuery = useDeferredValue(query);

  const results = useMemo(
    () =>
      filterExercises(
        EXERCISES,
        {
          query: deferredQuery,
          groups,
          equipment,
          difficulties,
          categories,
          locations,
          ids: onlyFavorites ? favorites : undefined,
        },
        sort,
      ),
    [deferredQuery, groups, equipment, difficulties, categories, locations, onlyFavorites, favorites, sort],
  );

  const activeFilters =
    groups.length + equipment.length + difficulties.length + categories.length + locations.length + (onlyFavorites ? 1 : 0);

  /** Bascule une valeur dans un filtre multiple. */
  function toggle<T>(list: T[], setList: (v: T[]) => void, value: T) {
    setLimit(48);
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  function resetFilters() {
    setGroups([]);
    setEquipment([]);
    setDifficulties([]);
    setCategories([]);
    setLocations([]);
    setOnlyFavorites(false);
    setQuery("");
    setLimit(48);
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
              🔎
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setLimit(48);
              }}
              placeholder="Pompe archer, traction, squat bulgare…"
              aria-label="Rechercher un exercice"
              className="w-full rounded-xl border border-ink-600 bg-ink-900 py-2.5 pl-9 pr-3 text-sm outline-none placeholder:text-white/30 focus:border-neon-violet"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label="Trier les résultats"
            className="rounded-xl border border-ink-600 bg-ink-900 px-2 text-xs font-semibold outline-none focus:border-neon-violet"
          >
            <option value="pertinence">Pertinence</option>
            <option value="nom">Nom A→Z</option>
            <option value="difficulte">Facile → dur</option>
            <option value="difficulte-desc">Dur → facile</option>
            <option value="groupe">Groupe musculaire</option>
          </select>
        </div>

        {/* Groupes musculaires */}
        <FilterRow label="Groupe musculaire">
          {MUSCLE_GROUPS.map((g) => (
            <FilterChip
              key={g}
              active={groups.includes(g)}
              color={GROUP_META[g].hex}
              onClick={() => toggle(groups, setGroups, g)}
            >
              <span aria-hidden>{GROUP_META[g].icon}</span> {GROUP_META[g].label}
            </FilterChip>
          ))}
        </FilterRow>

        {/* Matériel */}
        <FilterRow label="Matériel">
          {(showAllFilters ? (Object.keys(EQUIPMENT_META) as Equipment[]) : QUICK_EQUIPMENT).map((e) => (
            <FilterChip key={e} active={equipment.includes(e)} onClick={() => toggle(equipment, setEquipment, e)}>
              <span aria-hidden>{EQUIPMENT_META[e].icon}</span> {EQUIPMENT_META[e].label}
            </FilterChip>
          ))}
        </FilterRow>

        {/* Niveau */}
        <FilterRow label="Niveau">
          {([1, 2, 3, 4, 5] as Difficulty[]).map((d) => (
            <FilterChip key={d} active={difficulties.includes(d)} onClick={() => toggle(difficulties, setDifficulties, d)}>
              {"★".repeat(d)} {DIFFICULTY_LABELS[d]}
            </FilterChip>
          ))}
          <FilterChip active={onlyFavorites} onClick={() => setOnlyFavorites((v) => !v)}>
            ⭐ Mes favoris ({favorites.length})
          </FilterChip>
        </FilterRow>

        {showAllFilters && (
          <>
            <FilterRow label="Catégorie">
              {CATEGORIES.map((c) => (
                <FilterChip key={c} active={categories.includes(c)} onClick={() => toggle(categories, setCategories, c)}>
                  {c}
                </FilterChip>
              ))}
            </FilterRow>
            <FilterRow label="Lieu">
              {LOCATIONS.map((l) => (
                <FilterChip key={l} active={locations.includes(l)} onClick={() => toggle(locations, setLocations, l)}>
                  {l}
                </FilterChip>
              ))}
            </FilterRow>
          </>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink-700 pt-2">
          <p className="text-xs text-white/50">
            <strong className="font-display text-sm text-white">{results.length}</strong> exercice
            {results.length > 1 ? "s" : ""} sur {EXERCISES.length}
          </p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => setShowAllFilters((v) => !v)}>
              {showAllFilters ? "Moins de filtres" : "Tous les filtres"}
            </Button>
            {activeFilters > 0 && (
              <Button size="sm" variant="soft" onClick={resetFilters}>
                Réinitialiser ({activeFilters})
              </Button>
            )}
          </div>
        </div>
      </Card>

      {results.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="Aucun exercice ne correspond"
          description="Essaie d'élargir les filtres ou de simplifier ta recherche."
          action={<Button onClick={resetFilters}>Réinitialiser les filtres</Button>}
        />
      ) : (
        <>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {results.slice(0, limit).map((ex) => (
              <ExerciseCard key={ex.id} exercise={ex} />
            ))}
          </ul>
          {results.length > limit && (
            <div className="flex justify-center">
              <Button variant="soft" onClick={() => setLimit((l) => l + 48)}>
                Afficher 48 exercices de plus ({results.length - limit} restants)
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-white/35">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
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
    <button type="button" onClick={onClick} aria-pressed={active}>
      <Chip
        color={active ? (color ?? "#a855f7") : undefined}
        className={cx(
          "transition",
          active ? "font-bold" : "text-white/45 hover:text-white/75",
        )}
      >
        {children}
      </Chip>
    </button>
  );
}
