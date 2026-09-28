// IMJ Mobile -- permet a l'application de s'ouvrir meme sans reseau.
//
// Strategie "reseau d'abord" : avec internet, on charge toujours la derniere
// version (les mises a jour arrivent normalement) et on en garde une copie ;
// sans internet, on sert la derniere copie gardee.
// Les appels a Supabase (autre adresse) ne sont JAMAIS touches ni gardes.
const CACHE = "imj-mobile-v1";
const FICHIERS = ["./", "index.html", "manifest.json", "logo.png"];

self.addEventListener("install", (evenement) => {
  evenement.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FICHIERS)));
  self.skipWaiting();
});

self.addEventListener("activate", (evenement) => {
  evenement.waitUntil(
    caches.keys().then((cles) => Promise.all(cles.filter((cle) => cle !== CACHE).map((cle) => caches.delete(cle))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (evenement) => {
  const requete = evenement.request;
  if (requete.method !== "GET" || new URL(requete.url).origin !== self.location.origin) return;

  evenement.respondWith(
    fetch(requete)
      .then((reponse) => {
        if (reponse.ok) {
          const copie = reponse.clone();
          caches.open(CACHE).then((cache) => cache.put(requete, copie));
        }
        return reponse;
      })
      .catch(() =>
        caches.match(requete, { ignoreSearch: true }).then((enCache) => enCache || caches.match("index.html"))
      )
  );
});
