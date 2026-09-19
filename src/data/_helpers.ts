import type { Exercise } from "@/types/exercise";

/**
 * Fabrique de familles d'exercices.
 *
 * Une « famille » (pompes, tractions, squats…) partage énormément de
 * métadonnées : muscles sollicités, schéma moteur, erreurs classiques,
 * consignes de sécurité. Plutôt que de dupliquer ces champs sur chaque
 * variante — ce qui rendrait la base impossible à maintenir — on déclare
 * une base de famille, et chaque variante n'exprime que ce qui la distingue.
 *
 * ```ts
 * const pompe = family({ family: "pompes", group: "pectoraux", ... });
 * export const POMPES = [
 *   pompe({ id: "pompe-classique", name: "Pompe classique", description: "…", steps: [...] }),
 * ];
 * ```
 */

/** Champs obligatoires d'une variante : le minimum pour une fiche utile. */
type VariantRequired = Pick<Exercise, "id" | "name" | "description" | "steps">;

/**
 * Entrée d'une variante : tous les champs d'`Exercise` sont surchargeables,
 * plus deux raccourcis `addMistakes` / `addTips` qui *complètent* les listes
 * héritées de la famille au lieu de les remplacer.
 */
export type Variant = VariantRequired &
  Partial<Exercise> & {
    /** Erreurs spécifiques à la variante, ajoutées à celles de la famille. */
    addMistakes?: string[];
    /** Consignes de sécurité spécifiques, ajoutées à celles de la famille. */
    addTips?: string[];
  };

/** Valeurs de repli : garantissent qu'aucune fiche n'est incomplète. */
const FALLBACK = {
  category: "force",
  mechanic: "polyarticulaire",
  force: "poussee-horizontale",
  group: "corps-entier",
  primaryMuscles: [],
  secondaryMuscles: [],
  equipment: ["aucun"],
  difficulty: 2,
  metric: "reps",
  unilateral: false,
  locations: ["maison", "salle"],
  commonMistakes: [],
  safetyTips: [],
  restSeconds: [60, 90],
  xpFactor: 1,
} satisfies Partial<Exercise>;

/**
 * Crée un constructeur de variantes pour une famille donnée.
 * @param base Métadonnées communes à toutes les variantes de la famille.
 */
export function family(base: Partial<Exercise> & { family: string }) {
  return (variant: Variant): Exercise => {
    const { addMistakes, addTips, ...rest } = variant;

    const commonMistakes = [
      ...(rest.commonMistakes ?? base.commonMistakes ?? FALLBACK.commonMistakes),
      ...(addMistakes ?? []),
    ];
    const safetyTips = [
      ...(rest.safetyTips ?? base.safetyTips ?? FALLBACK.safetyTips),
      ...(addTips ?? []),
    ];

    const merged = { ...FALLBACK, ...base, ...rest } as Exercise;

    // Une variante qui redéfinit ses muscles principaux hérite parfois de
    // secondaires devenus redondants : on les retire pour garder des fiches
    // cohérentes sans avoir à redéclarer la liste complète.
    const secondaryMuscles = merged.secondaryMuscles.filter((m) => !merged.primaryMuscles.includes(m));

    return { ...merged, secondaryMuscles, commonMistakes, safetyTips };
  };
}

/**
 * Déduplique et fige une liste d'exercices.
 * Lève une erreur explicite si deux fiches partagent le même identifiant :
 * mieux vaut échouer au build que servir une base silencieusement corrompue.
 */
export function collect(...lists: Exercise[][]): Exercise[] {
  const seen = new Map<string, Exercise>();
  for (const list of lists) {
    for (const ex of list) {
      if (seen.has(ex.id)) {
        throw new Error(`Exercice en double : "${ex.id}" (${ex.name})`);
      }
      seen.set(ex.id, ex);
    }
  }
  return [...seen.values()];
}
