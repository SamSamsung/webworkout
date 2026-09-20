/**
 * Sous-chemin d'hébergement de l'application.
 *
 * Vide en local et sur un domaine dédié ; vaut « /webworkout » quand le site
 * est servi depuis un sous-dossier, comme sur GitHub Pages. `next/link` et le
 * routeur préfixent automatiquement leurs URL, mais tout ce qui est écrit à la
 * main (service worker, manifeste, ressources de `public/`) doit passer par
 * cette constante.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Préfixe un chemin absolu de `public/` avec le sous-chemin d'hébergement. */
export function asset(path: string): string {
  return `${BASE_PATH}${path.startsWith("/") ? path : `/${path}`}`;
}
