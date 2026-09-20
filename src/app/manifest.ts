import type { MetadataRoute } from "next";
import { asset } from "@/lib/base-path";
import { EXERCISES } from "@/data/exercises";

// Le manifeste ne dépend d'aucune donnée de requête : on le fige pour qu'il
// soit émis comme un simple fichier, y compris en export statique.
export const dynamic = "force-static";

/**
 * Manifeste de la PWA, généré plutôt qu'écrit en dur : les chemins doivent
 * inclure le sous-dossier d'hébergement quand il y en a un.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "IronQuest — la musculation qui se joue",
    short_name: "IronQuest",
    description:
      `${EXERCISES.length} exercices détaillés, suivi de records, séances chronométrées, XP, badges et défis entre amis.`,
    start_url: asset("/"),
    scope: asset("/"),
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#08070f",
    theme_color: "#08070f",
    lang: "fr",
    dir: "ltr",
    categories: ["health", "fitness", "sports"],
    icons: [
      { src: asset("/icon-192.png"), sizes: "192x192", type: "image/png", purpose: "any" },
      { src: asset("/icon-512.png"), sizes: "512x512", type: "image/png", purpose: "any" },
      { src: asset("/icon-maskable-512.png"), sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Démarrer une séance", short_name: "Séance", url: asset("/entrainement"), description: "Lancer une séance chronométrée" },
      { name: "Base d'exercices", short_name: "Exercices", url: asset("/exercices"), description: `Parcourir les ${EXERCISES.length} fiches` },
      { name: "Ma progression", short_name: "Progression", url: asset("/progression"), description: "Courbes et records" },
    ],
  };
}
