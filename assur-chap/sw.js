/* Assur Chap — Service Worker (PWA, offline shell) */
var CACHE = "assurchap-v1";
var ASSETS = [
  "index.html", "app.html", "verify.html", "admin.html",
  "css/theme.css", "css/components.css", "css/landing.css", "css/app.css",
  "js/i18n.js", "js/ui.js", "js/pricing.js", "js/store.js", "js/qr.js",
  "js/landing.js", "js/app.js", "js/verify.js", "js/admin.js",
  "assets/favicon.svg", "assets/icon-512.svg", "manifest.webmanifest"
];

self.addEventListener("install", function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(ASSETS.map(function (a) { return c.add(a).catch(function () {}); }));
  }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.map(function (k) { if (k !== CACHE) return caches.delete(k); }));
  }));
  self.clients.claim();
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return; // ne pas intercepter QR/fonts externes
  e.respondWith(
    caches.match(req).then(function (cached) {
      var net = fetch(req).then(function (res) {
        if (res && res.status === 200) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
        return res;
      }).catch(function () { return cached; });
      return cached || net;
    })
  );
});
