import { ref } from 'vue';
import axios from 'axios';
import { useAuthStore } from './useAuthStore'; // Assuming you have an auth store

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function useNotifications() {
  const isSubscribed = ref(false);
  const subscriptionError = ref(null);
  const { isAuthenticated } = useAuthStore(); // Get user auth state

  const vapidPublicKey = import.meta.env.VITE_APP_VAPID_PUBLIC_KEY;

  // Function to check if push is supported and user is subscribed
  const checkSubscription = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('Push messaging is not supported');
        subscriptionError.value = 'Push messaging is not supported by this browser.';
        return false;
    }
    try {
        const registration = await navigator.serviceWorker.ready; // Wait for SW to be active
        const currentSubscription = await registration.pushManager.getSubscription();
        isSubscribed.value = currentSubscription !== null;
        console.log('[useNotifications] User is currently subscribed:', isSubscribed.value);
        return isSubscribed.value;
    } catch (error) {
        console.error('[useNotifications] Error checking subscription:', error);
        subscriptionError.value = 'Error checking push subscription status.';
        return false;
    }
  };

  // Function to subscribe the user
  const subscribeUser = async () => {
    if (!vapidPublicKey) {
        console.error('[useNotifications] VAPID Public Key is missing.');
        subscriptionError.value = 'Application configuration error (missing VAPID key).';
        return;
    }
    if (!isAuthenticated.value) {
        console.log('[useNotifications] User not authenticated, skipping subscription.');
        return; // Don't subscribe if user isn't logged in
    }

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('Push messaging is not supported');
        subscriptionError.value = 'Push messaging is not supported by this browser.';
        return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      let currentSubscription = await registration.pushManager.getSubscription();
      
      if (currentSubscription) {
          console.log('[useNotifications] User is already subscribed.');
          isSubscribed.value = true;
          // Optionally send subscription to backend again to ensure it's up-to-date
          // await sendSubscriptionToBackend(currentSubscription);
          return;
      }

      // Ask for permission
      const permission = await window.Notification.requestPermission();
      if (permission !== 'granted') {
        console.log('[useNotifications] Permission for notifications was denied.');
        subscriptionError.value = 'Permission for notifications was denied.';
        return;
      }

      console.log('[useNotifications] Subscribing user...');
      const newSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      console.log('[useNotifications] User subscribed successfully:', newSubscription);
      await sendSubscriptionToBackend(newSubscription);
      isSubscribed.value = true;
      subscriptionError.value = null;

    } catch (error) {
      console.error('[useNotifications] Failed to subscribe the user:', error);
      isSubscribed.value = false;
       if (Notification.permission === 'denied') {
           subscriptionError.value = 'Notification permission was denied. Please enable it in browser settings.';
       } else {
           subscriptionError.value = 'Failed to subscribe to push notifications.';
       }
    }
  };

  // Function to send subscription to backend
  const sendSubscriptionToBackend = async (subscription) => {
    if (!isAuthenticated.value) return;
    try {
      const response = await axios.post('/api/notifications/subscribe', { subscription });
      console.log('[useNotifications] Subscription sent to backend successfully:', response.data);
    } catch (error) {
      console.error('[useNotifications] Failed to send subscription to backend:', error);
      // Handle error appropriately (e.g., show message to user)
      subscriptionError.value = 'Failed to register device for notifications.';
    }
  };

  return {
    isSubscribed,
    subscriptionError,
    checkSubscription,
    subscribeUser
  };
} 