/**
 * Schéma de la base d'exercices.
 *
 * Objectif : décrire un mouvement de façon suffisamment riche pour alimenter
 * à la fois la fiche informative (technique, erreurs, sécurité), les filtres
 * de recherche, le générateur de séance et le calcul d'XP.
 *
 * Règle d'or : tout est typé par union littérale (pas de `string` libre) afin
 * qu'un exercice mal renseigné casse la compilation plutôt que l'application.
 */

/** Groupes musculaires "gros grain" — servent de filtre principal et de code couleur. */
export const MUSCLE_GROUPS = [
  "pectoraux",
  "dos",
  "epaules",
  "biceps",
  "triceps",
  "avant-bras",
  "abdominaux",
  "lombaires",
  "fessiers",
  "quadriceps",
  "ischio-jambiers",
  "mollets",
  "adducteurs",
  "abducteurs",
  "cou",
  "cardio",
  "corps-entier",
] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

/** Muscles "grain fin" — utilisés dans les fiches et la carte musculaire. */
export const MUSCLES = [
  // Torse
  "grand-pectoral-claviculaire",
  "grand-pectoral-sternal",
  "petit-pectoral",
  "dentele-anterieur",
  // Dos
  "grand-dorsal",
  "grand-rond",
  "trapeze-superieur",
  "trapeze-moyen",
  "trapeze-inferieur",
  "rhomboides",
  "erecteurs-du-rachis",
  "carre-des-lombes",
  // Épaules
  "deltoide-anterieur",
  "deltoide-lateral",
  "deltoide-posterieur",
  "coiffe-des-rotateurs",
  // Bras
  "biceps-brachial",
  "brachial-anterieur",
  "brachio-radial",
  "triceps-longue-portion",
  "triceps-vaste-lateral",
  "triceps-vaste-medial",
  "flechisseurs-avant-bras",
  "extenseurs-avant-bras",
  // Tronc
  "grand-droit-abdomen",
  "obliques-externes",
  "obliques-internes",
  "transverse",
  "psoas-iliaque",
  // Bas du corps
  "grand-fessier",
  "moyen-fessier",
  "petit-fessier",
  "quadriceps-droit-femoral",
  "quadriceps-vastes",
  "ischio-jambiers",
  "adducteurs",
  "tenseur-fascia-lata",
  "gastrocnemien",
  "soleaire",
  "tibial-anterieur",
  // Divers
  "sterno-cleido-mastoidien",
  "splenius",
  "diaphragme",
] as const;
export type Muscle = (typeof MUSCLES)[number];

/** Matériel requis. `aucun` = faisable partout, c'est le filtre le plus utilisé. */
export const EQUIPMENT = [
  "aucun",
  "barre",
  "halteres",
  "kettlebell",
  "machine",
  "poulie",
  "barre-de-traction",
  "barres-paralleles",
  "banc",
  "elastique",
  "trx",
  "swiss-ball",
  "medecine-ball",
  "corde-a-sauter",
  "roue-abdominale",
  "box",
  "step",
  "chaise",
  "serviette",
  "sac-a-dos-leste",
  "gilet-leste",
  "ceinture-de-lest",
  "sangles-ab",
  "anneaux",
  "bosu",
  "rameur",
  "velo",
  "tapis-de-course",
  "ski-erg",
  "assault-bike",
  "sled",
  "corde-ondulatoire",
  "sac-de-sable",
  "trap-bar",
  "smith-machine",
  "banc-a-lombaires",
  "chaise-romaine",
  "espalier",
  "mur",
  "tapis",
  "plateau",
  "poignees-de-pompes",
  "grip-trainer",
  "roue-de-poignet",
  "harnais-de-cou",
  "escalier",
  "piscine",
] as const;
export type Equipment = (typeof EQUIPMENT)[number];

/**
 * Difficulté sur 5 niveaux, alignée sur la nomenclature du jeu :
 * 1 Initié · 2 Apprenti · 3 Confirmé · 4 Expert · 5 Légende
 */
export type Difficulty = 1 | 2 | 3 | 4 | 5;

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  1: "Initié",
  2: "Apprenti",
  3: "Confirmé",
  4: "Expert",
  5: "Légende",
};

/** Polyarticulaire vs isolation — pilote le calcul d'XP et le générateur. */
export type Mechanic = "polyarticulaire" | "isolation";

/** Schéma moteur dominant. */
export const FORCE_TYPES = [
  "poussee-horizontale",
  "poussee-verticale",
  "tirage-horizontal",
  "tirage-vertical",
  "flexion-de-hanche",
  "extension-de-hanche",
  "squat",
  "fente",
  "isometrie",
  "rotation",
  "anti-rotation",
  "traction-du-sol",
  "locomotion",
  "explosif",
  "etirement",
] as const;
export type ForceType = (typeof FORCE_TYPES)[number];

/**
 * Métrique de performance : détermine les champs du formulaire de série
 * et la façon dont on calcule un record personnel.
 */
export const METRICS = [
  "reps", // poids du corps : nombre de répétitions
  "poids-reps", // charge additionnelle × répétitions
  "temps", // isométrie / gainage, en secondes
  "distance", // course, marche, nage, en mètres
  "reps-lestees", // poids du corps + lest optionnel
  "calories", // machines de cardio
] as const;
export type Metric = (typeof METRICS)[number];

/** Famille de mouvement : regroupe toutes les variantes (pompes, tractions…). */
export const CATEGORIES = [
  "force",
  "poids-du-corps",
  "haltérophilie",
  "pliométrie",
  "isométrie",
  "cardio",
  "mobilité",
  "étirement",
  "gainage",
  "street-workout",
  "strongman",
  "rééducation",
] as const;
export type Category = (typeof CATEGORIES)[number];

/** Lieu où le mouvement est réalisable. */
export const LOCATIONS = ["maison", "salle", "exterieur", "bureau", "hotel"] as const;
export type Location = (typeof LOCATIONS)[number];

/** Fiche complète d'un exercice. */
export interface Exercise {
  /** Slug stable, en kebab-case. Sert de clé partout (records, séances, URLs). */
  id: string;
  /** Nom français affiché. */
  name: string;
  /** Nom anglais, utile pour la recherche et les références externes. */
  nameEn?: string;
  /** Synonymes et noms familiers, indexés par la recherche. */
  aliases?: string[];
  /** Famille de mouvement (ex. `pompes`) : toutes les variantes la partagent. */
  family: string;
  /** Id de la variante de référence, si cet exercice en dérive. */
  variantOf?: string;

  category: Category;
  mechanic: Mechanic;
  force: ForceType;

  /** Groupe musculaire principal — un seul, pour le code couleur. */
  group: MuscleGroup;
  primaryMuscles: Muscle[];
  secondaryMuscles: Muscle[];

  equipment: Equipment[];
  difficulty: Difficulty;
  metric: Metric;
  /** Mouvement réalisé un côté à la fois (compte double en volume). */
  unilateral: boolean;
  locations: Location[];

  /** Résumé en une à trois phrases : à quoi sert le mouvement. */
  description: string;
  /** Exécution pas à pas. */
  steps: string[];
  /** Erreurs fréquentes observées. */
  commonMistakes: string[];
  /** Points de sécurité / contre-indications. */
  safetyTips: string[];
  /** Consigne respiratoire. */
  breathing?: string;
  /** Tempo conseillé, notation 4 chiffres (excentrique-pause-concentrique-pause). */
  tempo?: string;

  /** Fourchette de repos conseillée, en secondes. */
  restSeconds: [number, number];
  /** Fourchette de répétitions (ou de secondes si metric = temps). */
  repRange?: [number, number];

  /** Multiplicateur d'XP propre au mouvement (1 = neutre). */
  xpFactor: number;
  /** MET (Metabolic Equivalent of Task) pour l'estimation calorique. */
  met?: number;

  /** Exercices plus difficiles vers lesquels progresser (ids). */
  progressions?: string[];
  /** Exercices plus faciles pour régresser (ids). */
  regressions?: string[];

  tags?: string[];
}

/** Entrée de la base avant enrichissement : les champs calculés sont dérivés. */
export type ExerciseSeed = Exercise;
