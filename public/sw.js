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
const VERSION = "ironquest-v2";

/** Racine de l'application, terminée par « / ». */
const BASE = new URL(self.registration.scope).pathname;

/** Construit une URL absolue relative à la racine de l'application. */
const at = (path) => BASE + path.replace(/^\//, "");

const PRECACHE = [
  "",
  "exercices/",
  "seances/",
  "progression/",
  "outils/",
  "profil/",
  "social/",
  "hors-ligne/",
  "manifest.webmanifest",
  "icon-192.png",
  "icon-512.png",
].map(at);

const OFFLINE_URL = at("hors-ligne/");

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      // `addAll` échoue en bloc si une seule requête échoue : on tolère les
      // absences pour ne jamais empêcher l'installation.
      .then((cache) => Promise.allSettled(PRECACHE.map((url) => cache.add(url))))
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
          const copy = response.clone();
          void caches.open(VERSION).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached ?? caches.match(OFFLINE_URL))),
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
