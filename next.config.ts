import type { NextConfig } from "next";

/**
 * Deux modes de build :
 *
 * - par défaut, un build Next classique (serveur), utilisé en développement et
 *   sur une plateforme comme Vercel ;
 * - avec `NEXT_OUTPUT=export`, un export entièrement statique dans `out/`,
 *   qui permet d'héberger le site sur n'importe quel serveur de fichiers
 *   (GitHub Pages, Netlify, un simple bucket S3…).
 *
 * L'application est conçue pour que l'export statique soit toujours possible :
 * aucune route ne dépend du serveur, toutes les données utilisateur vivent
 * dans le navigateur.
 */
const isExport = process.env.NEXT_OUTPUT === "export";

/** Sous-chemin d'hébergement, ex. « /webworkout » sur GitHub Pages. */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(isExport ? { output: "export" as const } : {}),
  basePath: basePath || undefined,
  // Chaque page devient `dossier/index.html` : les URL fonctionnent à
  // l'identique sur tous les hébergeurs statiques.
  trailingSlash: isExport,
  images: {
    formats: ["image/avif", "image/webp"],
    // L'optimiseur d'images de Next nécessite un serveur : inutile ici, les
    // seules images du site sont des SVG et des PNG d'icône.
    unoptimized: isExport,
  },
};

export default nextConfig;
