// Service worker de Suncast.
//
// À chaque mise en ligne, changer CACHE_NAME : c'est ce qui fait installer le
// nouveau service worker sur les téléphones et supprimer les anciens caches.
const CACHE_NAME = 'suncast-v4';

// Le code de l'app (tout est dans index.html). Réseau d'abord, pour qu'une mise
// en ligne arrive au prochain lancement, avec repli sur le cache hors ligne.
const SHELL = [
  './',
  './index.html',
  './manifest.json',
];

// Fichiers qui ne changent jamais (la version est dans le nom) : cache d'abord.
const STATIC = [
  './vendor/react-18.2.0.production.min.js',
  './vendor/react-dom-18.2.0.production.min.js',
  './vendor/htm-3.1.1.umd.js',
  './images/favicon.svg',
  './images/favicon-16x16.png',
  './images/favicon-32x32.png',
  './images/apple-touch-icon.png',
  './images/android-chrome-192x192.png',
  './images/android-chrome-512x512.png',
  './images/logo-nuxo.svg',
];

// Données en direct : jamais servies par le cache du service worker. Une
// prévision d'hier affichée comme fraîche serait pire qu'un message
// « hors ligne ». L'app garde elle-même la dernière prévision, avec son heure.
const NETWORK_ONLY_HOSTS = [
  'api.open-meteo.com',
  'nominatim.openstreetmap.org',
  'www.openstreetmap.org',
  'tile.openstreetmap.org',
];

// Polices Google : changent rarement, cache d'abord une fois téléchargées.
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

const NETWORK_TIMEOUT_MS = 4000;

self.addEventListener('install', event => {
  // cache: 'reload' contourne le cache HTTP du navigateur : GitHub Pages sert
  // avec max-age=600, on risquerait sinon de précharger une ancienne version.
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL.concat(STATIC).map(url => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isCacheable(response) {
  return response && response.status === 200 && (response.type === 'basic' || response.type === 'cors');
}

function putInCache(key, response) {
  if (!isCacheable(response)) return;
  const copy = response.clone();
  caches.open(CACHE_NAME).then(cache => cache.put(key, copy)).catch(() => {});
}

// Réseau d'abord avec délai maximum : sur un réseau qui traîne (wifi captif,
// 4G faible), on sert la copie en cache au bout de 4 s plutôt que d'attendre.
function networkFirst(request, isNavigation) {
  // Sans query string, pour qu'un lien partagé avec ?utm=… marche hors ligne.
  const key = isNavigation ? new URL('./', self.registration.scope).href : request;
  const fromNetwork = fetch(isNavigation ? request.url.split('?')[0] : request, { cache: 'no-cache' })
    .then(response => { putInCache(key, response); return response; });

  const fromCache = () => caches.match(key, { ignoreSearch: true })
    .then(hit => hit || (isNavigation ? caches.match('./index.html') : undefined));

  return new Promise(resolve => {
    let done = false;
    const finish = response => { if (!done && response) { done = true; resolve(response); } };

    const timer = setTimeout(() => fromCache().then(finish), NETWORK_TIMEOUT_MS);

    fromNetwork
      .then(response => { clearTimeout(timer); finish(response); })
      .catch(() => {
        clearTimeout(timer);
        fromCache().then(hit => {
          if (hit) finish(hit);
          else if (!done) { done = true; resolve(Response.error()); }
        });
      });
  });
}

function cacheFirst(request) {
  return caches.match(request).then(hit => hit || fetch(request).then(response => {
    putInCache(request, response);
    return response;
  }));
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  let url;
  try { url = new URL(request.url); } catch (e) { return; }

  if (NETWORK_ONLY_HOSTS.includes(url.hostname)) return;

  if (FONT_HOSTS.includes(url.hostname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Tout autre domaine tiers : le navigateur s'en charge, sans cache du SW.
  if (url.origin !== self.location.origin) return;

  const path = url.pathname;
  const isNavigation = request.mode === 'navigate';
  const isVendor = path.includes('/vendor/');
  const isShell = isNavigation || path.endsWith('/') || (!isVendor && /\.(html|js|json|css)$/.test(path));

  event.respondWith(isShell ? networkFirst(request, isNavigation) : cacheFirst(request));
});
