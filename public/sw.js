// Service worker : l'application fonctionne hors connexion.
// - page : réseau d'abord (pour recevoir les mises à jour), sinon version en cache
// - fichiers de l'application : cache d'abord (leurs noms changent à chaque version)
// - Supabase (autre domaine) : jamais mis en cache, la synchronisation gère le hors-ligne
const CACHE = 'repas-v1';
const COQUILLE = ['./', './manifest.webmanifest', './icone.svg', './icone-192.png', './icone-512.png'];

async function mettreEnCacheLaCoquille() {
  const cache = await caches.open(CACHE);
  await cache.addAll(COQUILLE);
  // ajoute les scripts et styles référencés par la page
  const page = await (await fetch('./', { cache: 'no-store' })).text();
  const fichiers = [...page.matchAll(/(?:src|href)="([^"]*assets\/[^"]+)"/g)].map((m) => m[1]);
  await cache.addAll(fichiers);
}

self.addEventListener('install', (e) => {
  e.waitUntil(mettreEnCacheLaCoquille().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((cles) => Promise.all(cles.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((rep) => {
          const copie = rep.clone();
          caches.open(CACHE).then((c) => c.put('./', copie));
          return rep;
        })
        .catch(() => caches.match('./')),
    );
    return;
  }

  e.respondWith(
    caches.match(req).then((enCache) => enCache || fetch(req).then((rep) => {
      if (rep.ok) {
        const copie = rep.clone();
        caches.open(CACHE).then((c) => c.put(req, copie));
      }
      return rep;
    })),
  );
});
