
const CACHE_PREFIX = "korean-study-";
const CACHE_NAME = CACHE_PREFIX + "v0.3";

const FILES = [
    "./",
    "./index.html",
    "./style.css",
    "./app.js",
    "./storage.js",
    "./training.js",
    "./training.css",
    "./manifest.json",
    "./icons/icon-192.png",
    "./icons/icon-512.png"
];

// Сохранение файлов приложения

self.addEventListener("install", event => {

    event.waitUntil(

        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(FILES))
            .then(() => self.skipWaiting())

    );
});

// Удаление устаревшего кэша

self.addEventListener("activate", event => {

    event.waitUntil(

        caches.keys()
            .then(keys => Promise.all(

                keys
                    .filter(key =>
                        key.startsWith(CACHE_PREFIX) &&
                        key !== CACHE_NAME
                    )
                    .map(key => caches.delete(key))

            ))
            .then(() => self.clients.claim())

    );
});

// Загрузка файлов из интернета
// или из локального кэша

self.addEventListener("fetch", event => {

    const request = event.request;

    if (request.method !== "GET") {
        return;
    }

    if (!request.url.startsWith(
        self.registration.scope
    )) {
        return;
    }

    event.respondWith(

        fetch(request)

            .then(async response => {

                if (response.ok) {

                    const cache =
                        await caches.open(CACHE_NAME);

                    await cache.put(
                        request,
                        response.clone()
                    );
                }

                return response;

            })

            .catch(async () => {

                const cache =
                    await caches.open(CACHE_NAME);

                const saved = await cache.match(request);

                if (saved) {
                    return saved;
                }

                if (request.mode === "navigate") {
                    return cache.match("./index.html");
                }

                return Response.error();

            })

    );
});
