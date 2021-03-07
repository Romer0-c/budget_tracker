const FILES_TO_CACHE = [
  "/",
  "/manifest.webmanifest",
  "/public/images/icons/icon-192x192.png",
  "/public/images/icons/icon-512x512.png",
  "/public/images/icons/piggy-bank.svg"
];

const CACHE_NAME = "static-cache-v2";
const DATA_CACHE_NAME = "data-cache-v1";


// install
self.addEventListener("install", function(event) {

  console.log("install");

  const cacheResources = async () => {
    const resourceCache = await caches.open(CACHE_NAME);
    return resourceCache.addAll(FILES_TO_CACHE);
  }
  // More info: https://developer.mozilla.org/en-US/docs/Web/API/Cache/addAll

  self.skipWaiting(); // Any previous service worker running on this site. Override now!
  // More info: https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/skipWaiting

  event.waitUntil(cacheResources()); // Hey browser! Do not stop me. I am adding resources (such as pages and images) to the cache API.
  // More info: https://developer.mozilla.org/en-US/docs/Web/API/ExtendableEvent/waitUntil

  console.log("Your files were pre-cached successfully!");
});

// activate
self.addEventListener("activate", function(event) {

  console.log("activate");

  const removeOldCache = async () => {
    const cacheKeyArray = await caches.keys();
  
    const cacheResultPromiseArray = cacheKeyArray.map(key => {
      if (key !== CACHE_NAME && key !== DATA_CACHE_NAME) {
        console.log("Removing old cache data", key);
        return caches.delete(key);
      }
    });
    // More info: https://developer.mozilla.org/en-US/docs/Web/API/Cache/delete
  
    return Promise.all(cacheResultPromiseArray);
  }

  event.waitUntil(removeOldCache());  // Hey browser! Do not stop me. I am now deleting old caches from the cache API.
  // More info: https://developer.mozilla.org/en-US/docs/Web/API/ExtendableEvent/waitUntil


  self.clients.claim();
  // More info: https://developer.mozilla.org/en-US/docs/Web/API/Clients/claim
});

// fetch
self.addEventListener("fetch", function(event) {

  console.log("fetch", event.request.url);

  const handleAPIDataRequest = async (event) => {
    try {
      const response = await fetch(event.request);
      // If the response was good, clone it and store it in the cache.
      if (response.status === 200) {
        console.log(`Adding API request to cache now: ${event.request.url}`);

        const apiCache = await caches.open(DATA_CACHE_NAME);
        await apiCache.put(event.request.url, response.clone());

        return response;
      }
    } catch(error) {
      // Network request failed, try to get it from the cache.
      console.log(`Network error occurred with API request. Now retrieving it from the cache: ${event.request.url}`)
      return await caches.match(event.request);
    }
  }
  
  const handleResourceRequest = async (event) => {
    const matchedCache = await caches.match(event.request);
    return matchedCache ||  await fetch(event.request);
  }
  
  // cache successful requests to the API
  if (event.request.url.includes("/api/")) {
    event.respondWith(handleAPIDataRequest(event));
  } else {
    // if the request is not for the API, serve static assets using "offline-first" approach.
    // see https://developers.google.com/web/fundamentals/instant-and-offline/offline-cookbook#cache-falling-back-to-network
    event.respondWith(handleResourceRequest(event));
  }

});