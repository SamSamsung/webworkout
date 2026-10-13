/**
 * Défis chronométrés et protocoles nommés.
 *
 * Ce ne sont pas des mouvements nouveaux mais des *protocoles* : une façon
 * précise d'exécuter un mouvement connu, avec une règle du jeu et un score.
 * Ils vivent quand même dans la base d'exercices, ce qui leur donne
 * gratuitement les records, les courbes de progression, l'XP et les badges.
 */
import type { Exercise } from "@/types/exercise";
import { family } from "../_helpers";

const defi = family({
  family: "benchmarks",
  category: "poids-du-corps",
  mechanic: "polyarticulaire",
  force: "isometrie",
  group: "corps-entier",
  metric: "temps",
  equipment: ["aucun"],
  locations: ["maison", "salle", "exterieur"],
  difficulty: 4,
  restSeconds: [300, 600],
  repRange: [60, 205],
  xpFactor: 1.6,
  met: 8,
  tempo: "imposé par la musique",
  breathing: "Souffle en remontant, respire dans le maintien bas sans bloquer.",
  commonMistakes: [
    "Partir trop vite sur les premières répétitions : le protocole se joue sur les maintiens, pas sur la vitesse.",
    "Écourter l'amplitude quand la fatigue monte, au lieu d'arrêter le défi proprement.",
    "Bloquer sa respiration pendant les maintiens longs.",
  ],
  safetyTips: [
    "Arrête-toi dès que la technique se dégrade : le score n'a de valeur que si les répétitions sont propres.",
    "Échauffe-toi comme pour une vraie séance : ces protocoles sont très exigeants dès les premières minutes.",
  ],
});

export const DEFIS: Exercise[] = [
  defi({
    id: "bring-sally-up-pompes",
    name: "Bring Sally Up — pompes",
    nameEn: "Bring Sally Up push-up challenge",
    aliases: ["bring sally up", "sally up pompes", "défi sally"],
    group: "pectoraux",
    primaryMuscles: ["grand-pectoral-sternal", "grand-pectoral-claviculaire"],
    secondaryMuscles: ["triceps-longue-portion", "deltoide-anterieur", "grand-droit-abdomen", "transverse"],
    difficulty: 4,
    xpFactor: 1.7,
    description:
      "Le défi culte : des pompes rythmées par « Flower » de Moby. À « bring Sally down » on descend et on tient la position basse, à « bring Sally up » on remonte. Les maintiens s'allongent, et presque personne ne finit les 3 min 25 du morceau la première fois.",
    steps: [
      "Lance « Flower » de Moby et place-toi en position haute de pompe.",
      "À chaque « down », descends et maintiens la position basse, poitrine à un poing du sol.",
      "À chaque « up », remonte en extension complète, sans te reposer en haut.",
      "Le chrono s'arrête dès que tu poses les genoux ou que l'amplitude n'est plus complète.",
    ],
    addTips: ["Les poignets encaissent beaucoup de maintien : échauffe-les, ou passe sur poignées de pompes."],
    tags: ["defi", "benchmark", "culte", "isometrie"],
  }),
  defi({
    id: "bring-sally-up-squats",
    name: "Bring Sally Up — squats",
    nameEn: "Bring Sally Up squat challenge",
    aliases: ["sally up squats"],
    group: "quadriceps",
    force: "squat",
    primaryMuscles: ["quadriceps-vastes", "grand-fessier"],
    secondaryMuscles: ["ischio-jambiers", "adducteurs", "soleaire", "transverse"],
    difficulty: 3,
    xpFactor: 1.5,
    met: 7,
    description:
      "Même protocole, en squats au poids du corps. Les maintiens en position basse transforment un mouvement facile en brûlure continue des quadriceps : plus accessible que la version pompes, mais tout aussi redoutable.",
    steps: [
      "Lance « Flower » de Moby, pieds à largeur d'épaules.",
      "À « down », descends cuisses parallèles au sol et tiens la position.",
      "À « up », remonte en extension complète sans verrouiller sèchement les genoux.",
      "Le chrono s'arrête dès que tu te redresses hors rythme ou que la profondeur n'y est plus.",
    ],
    addTips: ["Garde les talons au sol : si tu bascules sur les pointes, réduis la profondeur plutôt que de compenser."],
    tags: ["defi", "benchmark", "culte", "jambes"],
  }),
  defi({
    id: "bring-sally-up-abdos",
    name: "Bring Sally Up — abdos",
    nameEn: "Bring Sally Up leg raise challenge",
    aliases: ["sally up abdos", "sally abdos", "bring sally up relevés de jambes"],
    group: "abdominaux",
    force: "flexion-de-hanche",
    category: "isométrie",
    primaryMuscles: ["grand-droit-abdomen", "psoas-iliaque"],
    secondaryMuscles: ["transverse", "obliques-externes", "quadriceps-droit-femoral"],
    difficulty: 4,
    xpFactor: 1.7,
    met: 7,
    description:
      "Le protocole appliqué aux relevés de jambes, allongé sur le dos. Tout le défi est dans le « down » : les jambes redescendent à quelques centimètres du sol et y restent, sans jamais toucher. C'est la position la plus dure, et c'est celle où le morceau laisse le plus longtemps — les lombaires et le psoas tirent bien avant les abdominaux.",
    steps: [
      "Allonge-toi sur le dos, mains à plat sous les fessiers ou le long du corps, bas du dos plaqué au sol.",
      "À « up », monte les jambes tendues à la verticale, sans décoller le bassin d'un coup.",
      "À « down », redescends les jambes jusqu'à quelques centimètres du sol et TIENS : talons en l'air, lombaires toujours collées.",
      "Le chrono s'arrête dès que les talons touchent le sol ou que le bas du dos se creuse.",
    ],
    addMistakes: [
      "Laisser le bas du dos se décoller dans le maintien bas : c'est le psoas qui travaille, et les lombaires qui paient.",
      "Descendre trop bas dès le début : garde une marge, la position se durcit minute après minute.",
    ],
    addTips: [
      "Si les lombaires se creusent, remonte les jambes de quelques centimètres plutôt que d'abandonner la position : le défi reste valable, le dos est préservé.",
      "Genoux légèrement fléchis en cas d'ischios raides : la contrainte lombaire baisse nettement.",
    ],
    tags: ["defi", "benchmark", "culte", "abdominaux", "isometrie"],
  }),
  defi({
    id: "bring-sally-up-tractions",
    name: "Bring Sally Up — tractions",
    nameEn: "Bring Sally Up pull-up challenge",
    group: "dos",
    force: "tirage-vertical",
    equipment: ["barre-de-traction"],
    locations: ["salle", "exterieur", "maison"],
    primaryMuscles: ["grand-dorsal", "grand-rond"],
    secondaryMuscles: ["biceps-brachial", "brachial-anterieur", "rhomboides", "flechisseurs-avant-bras"],
    difficulty: 5,
    xpFactor: 2.2,
    repRange: [20, 205],
    description:
      "La version la plus brutale du protocole. Comme partout, le maintien se fait sur le « down » : on redescend et on reste suspendu, bras tendus, épaules engagées — et c'est bien là que ça se joue, parce que le morceau passe beaucoup plus de temps en bas qu'en haut. La poigne et les dorsaux encaissent en continu. Tenir une minute est déjà un excellent résultat.",
    steps: [
      "Suspends-toi en pronation, épaules basses et engagées.",
      "À « up », monte le menton au-dessus de la barre sans t'y attarder.",
      "À « down », redescends bras tendus et TIENS la suspension active : épaules verrouillées, surtout pas relâchées dans les articulations.",
      "Le chrono s'arrête quand tu lâches la barre.",
    ],
    addTips: [
      "La prise lâche souvent avant le dos : prévois de la magnésie et une réception dégagée.",
      "La suspension entre deux répétitions est le vrai coût du protocole : garde les épaules actives, ne te laisse jamais pendre passivement sur les articulations.",
    ],
    tags: ["defi", "benchmark", "elite", "street-workout"],
  }),
];
