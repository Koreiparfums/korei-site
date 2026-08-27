/**
 * Korei — Service worker (KOR-A7)
 *
 * Role volontairement modeste : rendre le site installable et utilisable hors
 * connexion pour ce qui a deja ete vu. On ne met JAMAIS en cache les appels
 * a l'API (prix, stock, panier) : ces donnees doivent rester fraiches.
 */
const VERSION = "korei-v1";
const SHELL = [
  "/",
  "/index.html",
  "/offline.html",
  "/assets/css/styles.css",
  "/assets/js/site.js",
  "/assets/js/main.js",
  "/assets/js/tabbar.js",
  "/assets/images/favicon.svg",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      // addAll echoue en bloc si une seule URL manque : on tolere les absents.
      .then((cache) => Promise.allSettled(SHELL.map((url) => cache.add(url))))
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
  // Prix, stock, panier : toujours le reseau, jamais le cache.
  if (url.pathname.startsWith("/api/")) return;

  // Pages : reseau d'abord, cache en secours, page hors ligne en dernier.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match("/offline.html"))),
    );
    return;
  }

  // Ressources statiques : on rend tout de suite la version en cache, et on
  // rafraichit en arriere-plan. Le cache seul serait un piege : apres une mise
  // en ligne, un visiteur deja venu garderait l'ancien CSS pour toujours.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => {
          if (res.ok && res.type === "basic") {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
