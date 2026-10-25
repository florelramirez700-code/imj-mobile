// IMJ Mobile -- permet a l'application de s'ouvrir meme sans reseau.
//
// Strategie "reseau d'abord" : avec internet, on charge toujours la derniere
// version (les mises a jour arrivent normalement) et on en garde une copie ;
// sans internet, on sert la derniere copie gardee.
// Les appels a Supabase (autre adresse) ne sont JAMAIS touches ni gardes.
const CACHE = "imj-mobile-v2";
// pointage.html : la page du telephone de pointage du bureau, qui doit s'ouvrir meme pendant une coupure.
const FICHIERS = ["./", "index.html", "manifest.json", "logo.png", "pointage.html", "manifest-pointage.json"];

self.addEventListener("install", (evenement) => {
  evenement.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FICHIERS)));
  self.skipWaiting();
});

// Au changement de version, on n'efface que les anciennes copies de CETTE appli.
// Les applis de cours (ECM, HG, Francais) et les autres applis IMJ sont a la meme adresse
// (florelramirez700-code.github.io) et partagent le meme stockage : on n'y touche pas.
// "imj-mobile-v" et pas "imj-mobile-" : sinon on effacerait aussi les copies de l'appli test (imj-mobile-test-v...).
self.addEventListener("activate", (evenement) => {
  evenement.waitUntil(
    caches.keys().then((cles) => Promise.all(
      cles.filter((cle) => cle.startsWith("imj-mobile-v") && cle !== CACHE).map((cle) => caches.delete(cle))
    ))
  );
  self.clients.claim();
});

// Au bout de DELAI_RESEAU_MS sans reponse (reseau qui accroche), on sert la copie gardee ;
// la reponse du reseau, si elle arrive plus tard, met la copie a jour pour la prochaine fois.
const DELAI_RESEAU_MS = 4000;

self.addEventListener("fetch", (evenement) => {
  const requete = evenement.request;
  if (requete.method !== "GET" || new URL(requete.url).origin !== self.location.origin) return;

  const reseau = fetch(requete).then((reponse) => {
    if (reponse.ok) {
      const copie = reponse.clone();
      caches.open(CACHE).then((cache) => cache.put(requete, copie));
    }
    return reponse;
  });
  evenement.waitUntil(reseau.catch(() => {}));

  evenement.respondWith((async () => {
    try {
      return await Promise.race([
        reseau,
        new Promise((_, rejeter) => setTimeout(() => rejeter(new Error("delai")), DELAI_RESEAU_MS)),
      ]);
    } catch (erreur) {
      const enCache = await caches.match(requete, { ignoreSearch: true }) || await caches.match("index.html");
      if (enCache) return enCache;
      return reseau;
    }
  })());
});
