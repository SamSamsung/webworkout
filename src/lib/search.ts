/**
 * Recherche et filtrage de la base d'exercices.
 *
 * Tout se fait côté client : la base tient largement en mémoire et la
 * navigation reste instantanée, sans aller-retour réseau.
 */
import type { Category, Difficulty, Equipment, Exercise, Location, MuscleGroup } from "@/types/exercise";

/** Normalise une chaîne : minuscules, sans accents, sans ponctuation. */
export function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Index de recherche précalculé : évite de renormaliser à chaque frappe. */
const SEARCH_INDEX = new WeakMap<Exercise, string>();

function haystack(ex: Exercise): string {
  let value = SEARCH_INDEX.get(ex);
  if (!value) {
    value = normalize(
      [ex.name, ex.nameEn ?? "", ...(ex.aliases ?? []), ex.family, ex.group, ...(ex.tags ?? []), ex.description].join(" "),
    );
    SEARCH_INDEX.set(ex, value);
  }
  return value;
}

export interface ExerciseFilters {
  query?: string;
  groups?: MuscleGroup[];
  equipment?: Equipment[];
  difficulties?: Difficulty[];
  categories?: Category[];
  locations?: Location[];
  /** Ne garder que les exercices ne nécessitant aucun matériel. */
  noEquipmentOnly?: boolean;
  /** Ne garder que les exercices unilatéraux. */
  unilateralOnly?: boolean;
  /** Restreindre à une famille de mouvement. */
  family?: string;
  /** Restreindre à un ensemble d'identifiants (favoris, par exemple). */
  ids?: string[];
}

export type SortKey = "pertinence" | "nom" | "difficulte" | "difficulte-desc" | "groupe";

/**
 * Applique les filtres puis trie.
 * La pertinence est calculée à partir de la position du terme recherché :
 * un nom qui commence par la requête remonte avant une simple mention dans
 * la description.
 */
export function filterExercises(
  exercises: Exercise[],
  filters: ExerciseFilters,
  sort: SortKey = "pertinence",
): Exercise[] {
  const q = filters.query ? normalize(filters.query) : "";
  const terms = q ? q.split(" ").filter(Boolean) : [];
  const idSet = filters.ids ? new Set(filters.ids) : null;

  const scored: Array<{ ex: Exercise; score: number }> = [];

  for (const ex of exercises) {
    if (idSet && !idSet.has(ex.id)) continue;
    if (filters.family && ex.family !== filters.family) continue;
    if (filters.groups?.length && !filters.groups.includes(ex.group)) continue;
    if (filters.difficulties?.length && !filters.difficulties.includes(ex.difficulty)) continue;
    if (filters.categories?.length && !filters.categories.includes(ex.category)) continue;
    if (filters.locations?.length && !filters.locations.some((l) => ex.locations.includes(l))) continue;
    if (filters.unilateralOnly && !ex.unilateral) continue;
    if (filters.noEquipmentOnly && !(ex.equipment.length === 1 && ex.equipment[0] === "aucun")) continue;
    if (filters.equipment?.length && !filters.equipment.some((e) => ex.equipment.includes(e))) continue;

    let score = 0;
    if (terms.length) {
      const name = normalize(ex.name);
      const hay = haystack(ex);
      let matchedAll = true;
      for (const term of terms) {
        if (name.startsWith(term)) score += 100;
        else if (name.includes(term)) score += 60;
        else if (hay.includes(term)) score += 20;
        else {
          matchedAll = false;
          break;
        }
      }
      if (!matchedAll) continue;
      // Les exercices de base priment sur les variantes exotiques.
      if (!ex.variantOf) score += 15;
      if (ex.tags?.includes("incontournable")) score += 10;
    }

    scored.push({ ex, score });
  }

  const byName = (a: Exercise, b: Exercise) => a.name.localeCompare(b.name, "fr");

  switch (sort) {
    case "nom":
      scored.sort((a, b) => byName(a.ex, b.ex));
      break;
    case "difficulte":
      scored.sort((a, b) => a.ex.difficulty - b.ex.difficulty || byName(a.ex, b.ex));
      break;
    case "difficulte-desc":
      scored.sort((a, b) => b.ex.difficulty - a.ex.difficulty || byName(a.ex, b.ex));
      break;
    case "groupe":
      scored.sort((a, b) => a.ex.group.localeCompare(b.ex.group) || byName(a.ex, b.ex));
      break;
    default:
      scored.sort((a, b) => b.score - a.score || byName(a.ex, b.ex));
  }

  return scored.map((s) => s.ex);
}

/** Suggestions de saisie semi-automatique sur les noms et alias. */
export function suggest(exercises: Exercise[], query: string, limit = 8): Exercise[] {
  if (!query.trim()) return [];
  return filterExercises(exercises, { query }, "pertinence").slice(0, limit);
}

/** Variantes d'un même mouvement, triées par difficulté croissante. */
export function familyVariants(exercises: Exercise[], family: string): Exercise[] {
  return exercises.filter((e) => e.family === family).sort((a, b) => a.difficulty - b.difficulty);
}

/** Exercices proches : même groupe musculaire, difficulté voisine. */
export function relatedExercises(exercises: Exercise[], ex: Exercise, limit = 6): Exercise[] {
  return exercises
    .filter((e) => e.id !== ex.id && e.group === ex.group)
    .sort(
      (a, b) =>
        Math.abs(a.difficulty - ex.difficulty) - Math.abs(b.difficulty - ex.difficulty) ||
        (a.family === ex.family ? -1 : 1),
    )
    .slice(0, limit);
}
