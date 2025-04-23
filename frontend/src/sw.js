/* eslint-env serviceworker */
/* global clients */ // Declare clients as a global for ESLint
/* eslint-disable no-restricted-globals */

import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

console.log('[Service Worker] Hello from custom service worker!');

// Inject precache manifest (files to cache immediately)
// The self.__WB_MANIFEST variable will be injected by vite-plugin-pwa
precacheAndRoute(self.__WB_MANIFEST || []);

// Cache images specifically from the /uploads path
registerRoute(
  ({ request, url }) => 
    request.destination === 'image' && 
    url.pathname.startsWith('/uploads'), // Only match /uploads/... paths
  new CacheFirst({
    cacheName: 'images-uploads', // Use a specific cache name
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100, // Increase entries if needed
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
      }),
    ],
  })
);

registerRoute(
  // Adjust URL pattern as needed for your API
  ({ url }) => url.pathname.startsWith('/api'), 
  new NetworkFirst({
    cacheName: 'api-cache-custom',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 5 * 60, // 5 minutes
      }),
    ],
    networkTimeoutSeconds: 10, // Try network for 10 seconds before falling back to cache
  })
);

// --- Push Notification Handling --- 

self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push Received.');
  console.log(`[Service Worker] Push had this data: "${event.data.text()}"`);

  let notificationData = { title: 'Notification', options: { body: 'Something happened!' } };
  try {
    notificationData = event.data.json(); // Expecting { title: '...', options: { ... } } from backend
  } catch (e) {
    console.error('[Service Worker] Failed to parse push data:', e);
    // Use default data or the raw text
    notificationData.options.body = event.data.text();
  }

  const title = notificationData.title;
  const options = {
    body: notificationData.options.body || 'No body specified',
    icon: notificationData.options.icon || '/icons/icon-192x192.png', // Use default icon if needed
    badge: notificationData.options.badge || '/icons/badge-72x72.png', // Use default badge if needed
    tag: notificationData.options.tag || 'default-tag', // Tag for grouping/replacing
    data: notificationData.options.data || {} // Store extra data like URL
    // You can add other options like 'actions', 'image', 'vibrate', etc.
  };

  // waitUntil ensures the SW doesn't terminate until the notification is shown
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification click Received.');

  event.notification.close(); // Close the notification

  // Get the URL from the notification data (if provided by backend)
  const urlToOpen = event.notification.data?.url || '/'; // Default to root

  // waitUntil ensures the SW doesn't terminate until the window/tab is focused/opened
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if a window/tab with the target URL is already open
      for (const client of clientList) {
        // Use endsWith or includes if the client URL might have query params/hash
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If not found, open a new window/tab
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Optional: Handle Push Subscription Change (useful if server sends updates)
self.addEventListener('pushsubscriptionchange', (event) => { // eslint-disable-line no-unused-vars
  console.log('[Service Worker] Push Subscription Change detected.');
  // TODO: Re-subscribe and send the new subscription to the backend
  // event.waitUntil(subscribeUserAndSendToServer()); 
});

// Optional: Activate event to claim clients immediately
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activate event');
  event.waitUntil(clients.claim());
});

// Optional: Message event listener (for communication from main app thread)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[Service Worker] Skip waiting message received');
    self.skipWaiting();
  }
}); 