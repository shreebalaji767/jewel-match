'use strict';

const CACHE_NAME = 'jewel-match-v37';
const APP_SHELL = [
  './',
  './index.html',
  './css/style.css',
  './js/game.js',
  './favicon.svg',
  './manifest.webmanifest'
];

function isCompleteResponse(response) {
  return Boolean(
    response &&
    response.status === 200 &&
    !response.headers.has('Content-Range')
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('jewel-match-') && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  // Let the browser handle media byte-range requests directly. A 206 response
  // is only one segment of a file and cannot be stored in the Cache API.
  if (request.headers.has('Range')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then((response) => {
        if (isCompleteResponse(response)) {
          const copy = response.clone();
          event.waitUntil(
            caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', copy))
          );
        }
        return response;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (isCompleteResponse(response)) {
          const copy = response.clone();
          event.waitUntil(
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
          );
        }
        return response;
      });
    })
  );
});
