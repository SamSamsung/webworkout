/**
 * Service worker d'IronQuest.
 *
 * Stratégie :
 * - navigations : réseau d'abord, repli sur le cache puis sur la page hors
 *   ligne — on veut toujours la version fraîche quand la connexion le permet ;
 * - ressources statiques (_next/static, icônes, manifeste) : cache d'abord,
 *   car elles sont versionnées par leur nom de fichier ;
 * - tout le reste : réseau, avec mise en cache opportuniste.
 *
 * Les données du joueur vivent dans le localStorage : l'application reste donc
 * pleinement utilisable hors ligne une fois les pages visitées.
 *
 * Le sous-dossier d'hébergement est déduit de la portée d'enregistrement, ce
 * qui permet au même fichier de fonctionner à la racine d'un domaine comme
 * dans un sous-dossier (GitHub Pages).
 */
const VERSION = "ironquest-v4";

/** Racine de l'application, terminée par « / ». */
const BASE = new URL(self.registration.scope).pathname;

/** Construit une URL absolue relative à la racine de l'application. */
const at = (path) => BASE + path.replace(/^\//, "");

/**
 * Les URL des pages diffèrent selon le mode de build : « /exercices » en
 * rendu serveur, « /exercices/ » en export statique. On enregistre les deux
 * formes ; celle qui n'existe pas est simplement ignorée (voir `allSettled`).
 */
const PAGES = ["", "exercices", "seances", "progression", "outils", "profil", "social"];

const PRECACHE = [
  ...PAGES.flatMap((page) => (page === "" ? [at("")] : [at(page), at(`${page}/`)])),
  at("manifest.webmanifest"),
  at("icon-192.png"),
  at("icon-512.png"),
];

/**
 * Page de repli servie lors d'une navigation hors ligne vers une page jamais
 * visitée.
 *
 * C'est volontairement du HTML autonome, et non une page de l'application :
 * servir une page Next sous une autre URL fonctionne, mais le routeur client
 * reprend la main à l'hydratation et affiche « Page introuvable » — un
 * message faux, puisque la page existe, elle est seulement hors d'atteinte.
 */
function offlineFallback() {
  return new Response(
    `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Hors ligne · IronQuest</title>
<style>
  body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#08070f;color:#e9e6f5;
       font-family:system-ui,sans-serif;text-align:center;padding:24px}
  p{color:#9a93b8;max-width:32ch;line-height:1.6}
  a{color:#22d3ee}
</style></head><body><div>
  <div style="font-size:48px" aria-hidden="true">📡</div>
  <h1>Pas de connexion</h1>
  <p>Cette page n'a pas encore été enregistrée pour une consultation hors ligne.
     Reviens à <a href="${BASE}">l'accueil</a> : tes séances, tes records et les
     pages déjà visitées restent accessibles.</p>
</div></body></html>`,
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

/**
 * Met une URL en cache uniquement si le serveur répond correctement.
 * `cache.add()` stockerait aussi les 404 : selon le mode de build, une des
 * deux écritures d'URL (« /page » ou « /page/ ») n'existe pas, et on ne veut
 * surtout pas conserver sa page d'erreur.
 */
async function cacheIfOk(cache, url) {
  try {
    const response = await fetch(url, { cache: "no-cache" });
    if (response.ok) await cache.put(url, response);
  } catch {
    // Ressource injoignable à l'installation : tant pis, elle sera mise en
    // cache à la première visite.
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => Promise.all(PRECACHE.map((url) => cacheIfOk(cache, url))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigation : réseau d'abord.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            void caches.open(VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached?.ok ? cached : offlineFallback();
        }),
    );
    return;
  }

  // Ressources versionnées : cache d'abord.
  const isStatic =
    url.pathname.includes("/_next/static/") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".webmanifest");

  if (isStatic) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            const copy = response.clone();
            void caches.open(VERSION).then((cache) => cache.put(request, copy));
            return response;
          }),
      ),
    );
    return;
  }

  event.respondWith(fetch(request).catch(() => caches.match(request)));
});
