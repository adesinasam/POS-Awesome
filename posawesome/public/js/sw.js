const CACHE_NAME = "posawesome-cache-v1";

self.addEventListener("install", (event) => {
	self.skipWaiting();
	event.waitUntil(
		(async () => {
			const cache = await caches.open(CACHE_NAME);

			const resources = [
				"/assets/posawesome/js/posawesome.bundle.js",
				"/assets/posawesome/js/offline/index.js",
				"/manifest.json",
				"/offline.html",
			];

			await Promise.all(
				resources.map(async (url) => {
					try {
						const resp = await fetch(url);
						if (resp && resp.ok) {
							await cache.put(url, resp.clone());
						}
					} catch (err) {
						console.warn("SW install failed to fetch", url, err);
					}
				})
			);
		})()
	);
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		(async () => {
			const keys = await caches.keys();
			await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
			await self.clients.claim();
		})()
	);
});

self.addEventListener("fetch", (event) => {
	if (event.request.method !== "GET") return;

	const url = new URL(event.request.url);
	if (url.protocol !== "http:" && url.protocol !== "https:") return;

	if (event.request.url.includes("socket.io")) return;

        event.respondWith(
                (async () => {
                        try {
                                const cached = await caches.match(event.request);
                                if (cached) {
                                        return cached;
                                }
                                const resp = await fetch(event.request);
                                if (resp && resp.ok && resp.status === 200) {
                                        try {
                                                const respClone = resp.clone();
                                                const cache = await caches.open(CACHE_NAME);
                                                await cache.put(event.request, respClone);
                                        } catch (e) {
                                                console.warn('SW cache put failed', e);
                                        }
                                }
                                return resp;
                        } catch (err) {
                                try {
                                        const fallback = await caches.match(event.request);
                                        return fallback || (await caches.match('/offline.html')) || Response.error();
                                } catch (e) {
                                        return Response.error();
                                }
                        }
                })()
        );
});
