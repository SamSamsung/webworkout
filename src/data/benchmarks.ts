/**
 * Défis chronométrés : la règle du jeu et les paliers.
 *
 * Un défi pointe vers un exercice de la base (donc records, courbes et XP
 * fonctionnent sans code supplémentaire) et y ajoute ce qui lui est propre :
 * les consignes, la musique éventuelle et des paliers à atteindre.
 */

/** Palier à atteindre, du plus accessible au plus difficile. */
export interface BenchmarkTier {
  label: string;
  /** Durée à tenir, en secondes. */
  seconds: number;
  icon: string;
  color: string;
}

export interface Benchmark {
  id: string;
  name: string;
  /** Exercice correspondant dans la base : porte le record et la fiche technique. */
  exerciseId: string;
  icon: string;
  /** Phrase d'accroche affichée sur la carte. */
  tagline: string;
  /** Règle du jeu, en quelques points. */
  rules: string[];
  tiers: BenchmarkTier[];
  /** Morceau qui rythme le défi, quand il y en a un. */
  music?: { title: string; artist: string; seconds: number };
}

const TIER_COLORS = {
  bronze: "#d08b52",
  argent: "#c3ccdd",
  or: "#fbbf24",
  legende: "#a855f7",
} as const;

/** Paliers standards d'un défi « Bring Sally Up », calés sur la durée du morceau. */
function sallyTiers(bronze: number, argent: number, or: number): BenchmarkTier[] {
  return [
    { label: "Bronze", seconds: bronze, icon: "🥉", color: TIER_COLORS.bronze },
    { label: "Argent", seconds: argent, icon: "🥈", color: TIER_COLORS.argent },
    { label: "Or", seconds: or, icon: "🥇", color: TIER_COLORS.or },
    { label: "Morceau complet", seconds: 205, icon: "🏆", color: TIER_COLORS.legende },
  ];
}

const FLOWER = { title: "Flower", artist: "Moby", seconds: 205 };

export const BENCHMARKS: Benchmark[] = [
  {
    id: "sally-pompes",
    name: "Bring Sally Up — pompes",
    exerciseId: "bring-sally-up-pompes",
    icon: "🎵",
    tagline: "Le défi culte. Trois minutes vingt-cinq. Presque personne ne finit du premier coup.",
    rules: [
      "Lance « Flower » de Moby et pars en position haute de pompe.",
      "À « bring Sally down », tu descends et tu TIENS la position basse.",
      "À « bring Sally up », tu remontes en extension complète.",
      "Le chrono s'arrête à la première répétition incomplète ou dès que tu poses les genoux.",
    ],
    tiers: sallyTiers(45, 90, 150),
    music: FLOWER,
  },
  {
    id: "sally-squats",
    name: "Bring Sally Up — squats",
    exerciseId: "bring-sally-up-squats",
    icon: "🦵",
    tagline: "Même musique, mêmes règles, mais c'est le quadriceps qui brûle.",
    rules: [
      "Lance « Flower » de Moby, pieds à largeur d'épaules.",
      "À « down », cuisses parallèles au sol, et tu tiens.",
      "À « up », extension complète sans verrouiller sèchement.",
      "Le chrono s'arrête si tu sors du rythme ou si la profondeur n'y est plus.",
    ],
    tiers: sallyTiers(60, 120, 180),
    music: FLOWER,
  },
  {
    id: "sally-tractions",
    name: "Bring Sally Up — tractions",
    exerciseId: "bring-sally-up-tractions",
    icon: "🦅",
    tagline: "La version brutale. Tenir une minute est déjà un très bon résultat.",
    rules: [
      "Suspends-toi en pronation, épaules basses et engagées.",
      "À « up », menton au-dessus de la barre, et tu maintiens.",
      "À « down », bras tendus, sans te laisser tomber.",
      "Le chrono s'arrête quand tu lâches la barre.",
    ],
    tiers: [
      { label: "Bronze", seconds: 20, icon: "🥉", color: TIER_COLORS.bronze },
      { label: "Argent", seconds: 45, icon: "🥈", color: TIER_COLORS.argent },
      { label: "Or", seconds: 90, icon: "🥇", color: TIER_COLORS.or },
      { label: "Morceau complet", seconds: 205, icon: "🏆", color: TIER_COLORS.legende },
    ],
    music: FLOWER,
  },
  {
    id: "gainage-max",
    name: "Gainage maximal",
    exerciseId: "planche-avant-bras",
    icon: "🧱",
    tagline: "Le test d'endurance du tronc le plus universel.",
    rules: [
      "Appui sur les avant-bras, coudes sous les épaules.",
      "Ligne tête-bassin-talons, côtes rentrées, fessiers serrés.",
      "Respire normalement : bloquer la respiration ne prolonge rien.",
      "Le chrono s'arrête dès que le bassin s'affaisse.",
    ],
    tiers: [
      { label: "Bronze", seconds: 60, icon: "🥉", color: TIER_COLORS.bronze },
      { label: "Argent", seconds: 120, icon: "🥈", color: TIER_COLORS.argent },
      { label: "Or", seconds: 180, icon: "🥇", color: TIER_COLORS.or },
      { label: "Statue de marbre", seconds: 300, icon: "🗿", color: TIER_COLORS.legende },
    ],
  },
  {
    id: "suspension-max",
    name: "Suspension maximale",
    exerciseId: "traction-suspension-passive",
    icon: "🪢",
    tagline: "Rester pendu. Simple sur le papier, brutal pour les avant-bras.",
    rules: [
      "Prise en pronation, largeur d'épaules, épaules actives.",
      "Corps relâché, respiration calme.",
      "Le chrono s'arrête quand la prise lâche.",
      "Descends ou pose les pieds : ne saute pas de la barre.",
    ],
    tiers: [
      { label: "Bronze", seconds: 30, icon: "🥉", color: TIER_COLORS.bronze },
      { label: "Argent", seconds: 60, icon: "🥈", color: TIER_COLORS.argent },
      { label: "Or", seconds: 120, icon: "🥇", color: TIER_COLORS.or },
      { label: "Poigne d'acier", seconds: 180, icon: "✊", color: TIER_COLORS.legende },
    ],
  },
  {
    id: "chaise-max",
    name: "Chaise au mur maximale",
    exerciseId: "chaise-au-mur",
    icon: "🪑",
    tagline: "Le test des skieurs. Les cuisses parlent avant la tête.",
    rules: [
      "Dos plaqué au mur, cuisses parallèles au sol.",
      "Genoux à la verticale des chevilles, mains libres.",
      "Le chrono s'arrête dès que tu remontes ou que tu poses les mains sur les cuisses.",
    ],
    tiers: [
      { label: "Bronze", seconds: 60, icon: "🥉", color: TIER_COLORS.bronze },
      { label: "Argent", seconds: 120, icon: "🥈", color: TIER_COLORS.argent },
      { label: "Or", seconds: 180, icon: "🥇", color: TIER_COLORS.or },
      { label: "Jambes de fonte", seconds: 300, icon: "🦿", color: TIER_COLORS.legende },
    ],
  },
  {
    id: "l-sit-max",
    name: "L-sit maximal",
    exerciseId: "l-sit",
    icon: "📐",
    tagline: "Gainage, force de poussée et souplesse d'ischios dans une seule position.",
    rules: [
      "Épaules poussées vers le bas, coudes verrouillés.",
      "Jambes tendues à l'horizontale, pointes tendues.",
      "Le chrono s'arrête si les genoux se plient ou si les pieds descendent.",
    ],
    tiers: [
      { label: "Bronze", seconds: 10, icon: "🥉", color: TIER_COLORS.bronze },
      { label: "Argent", seconds: 20, icon: "🥈", color: TIER_COLORS.argent },
      { label: "Or", seconds: 45, icon: "🥇", color: TIER_COLORS.or },
      { label: "Gymnaste", seconds: 60, icon: "🤸", color: TIER_COLORS.legende },
    ],
  },
];

export const BENCHMARKS_BY_ID = new Map(BENCHMARKS.map((b) => [b.id, b]));

/** Palier atteint pour une durée donnée, ou `null` si aucun. */
export function tierFor(benchmark: Benchmark, seconds: number): BenchmarkTier | null {
  return [...benchmark.tiers].reverse().find((t) => seconds >= t.seconds) ?? null;
}

/** Palier suivant à viser, ou `null` si tout est déjà décroché. */
export function nextTier(benchmark: Benchmark, seconds: number): BenchmarkTier | null {
  return benchmark.tiers.find((t) => seconds < t.seconds) ?? null;
}
