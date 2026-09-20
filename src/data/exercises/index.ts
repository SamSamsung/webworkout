/**
 * Point d'entrée unique de la base d'exercices.
 *
 * Ajouter un exercice = créer une entrée dans le fichier thématique
 * correspondant (ou créer un nouveau fichier et l'importer ici).
 * `collect()` lève une erreur au build si deux identifiants se répètent.
 */
import { collect } from "../_helpers";
import { POMPES } from "./pompes";
import { PECTORAUX } from "./pectoraux";
import { TRACTIONS } from "./tractions";
import { DOS } from "./dos";
import { EPAULES } from "./epaules";
import { BRAS } from "./bras";
import { SQUATS } from "./squats";
import { JAMBES } from "./jambes";
import { FESSIERS } from "./fessiers";
import { ABDOMINAUX } from "./abdominaux";
import { CORPS_ENTIER } from "./corps-entier";
import { CARDIO } from "./cardio";
import { MOBILITE } from "./mobilite";
import { DEFIS } from "./defis";

/** Toutes les fiches, dans l'ordre de déclaration. */
export const EXERCISES = collect(
  POMPES,
  PECTORAUX,
  TRACTIONS,
  DOS,
  EPAULES,
  BRAS,
  SQUATS,
  JAMBES,
  FESSIERS,
  ABDOMINAUX,
  CORPS_ENTIER,
  CARDIO,
  MOBILITE,
  DEFIS,
);

/** Index par identifiant, pour un accès O(1) depuis les records et les séances. */
export const EXERCISES_BY_ID = new Map(EXERCISES.map((ex) => [ex.id, ex]));

/** Récupère une fiche par son identifiant. */
export function getExercise(id: string) {
  return EXERCISES_BY_ID.get(id);
}

/** Toutes les familles présentes dans la base, avec leur nombre de variantes. */
export const FAMILIES = [...new Set(EXERCISES.map((ex) => ex.family))].sort();

export { POMPES, PECTORAUX, TRACTIONS, DOS, EPAULES, BRAS, SQUATS, JAMBES, FESSIERS, ABDOMINAUX, CORPS_ENTIER, CARDIO, MOBILITE, DEFIS };
