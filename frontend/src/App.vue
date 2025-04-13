<template>
  <RouterView />
  <PWAUpdatePopup />

  <!-- Example Button to Trigger Subscription (for testing/user action) -->
  <div v-if="isAuthenticated && !isSubscribed && showSubscribeButton" class="subscribe-prompt">
    <p>Enable notifications to stay updated!</p>
    <button @click="handleSubscribe" :disabled="!canSubscribe">Enable Notifications</button>
    <p v-if="subscriptionError" class="error">{{ subscriptionError }}</p>
  </div>
</template>

<script setup>
import { RouterView } from 'vue-router'
import PWAUpdatePopup from '@/components/features/PWAUpdatePopup.vue'
import { onMounted, watch, ref } from 'vue'
import { useAuthStore } from '@/composables/useAuthStore'
import { useNotifications } from '@/composables/useNotifications'

const { initializeAuth, isAuthenticated } = useAuthStore()
const { 
  isSubscribed, 
  subscriptionError, 
  checkSubscription, 
  subscribeUser 
} = useNotifications()

const showSubscribeButton = ref(false);
const canSubscribe = ref(false);

const checkAndPrepareSubscription = async () => {
  if (isAuthenticated.value) {
    console.log('[App.vue] User is authenticated, checking notification subscription...');
    await checkSubscription();
    // Show button only if supported, permission not denied, and not already subscribed
    canSubscribe.value = ('serviceWorker' in navigator) && ('PushManager' in window) && (Notification.permission !== 'denied');
    showSubscribeButton.value = canSubscribe.value && !isSubscribed.value;
  } else {
    console.log('[App.vue] User not authenticated, skipping notification check.');
    showSubscribeButton.value = false; // Hide if logged out
  }
};

// Run on mount
onMounted(() => {
  initializeAuth();
  checkAndPrepareSubscription();
});

// Watch for changes in authentication status
watch(isAuthenticated, (newValue, oldValue) => {
  if (newValue && !oldValue) { // User just logged in
    console.log('[App.vue] Authentication detected, checking subscription status.');
    checkAndPrepareSubscription();
  } else if (!newValue && oldValue) { // User just logged out
     isSubscribed.value = false; // Reset subscription status on logout
     showSubscribeButton.value = false;
     subscriptionError.value = null;
  }
});

const handleSubscribe = async () => {
  await subscribeUser();
  // Optionally hide button after attempt, or rely on isSubscribed state change
  showSubscribeButton.value = !isSubscribed.value; 
};

</script>

<style scoped>
/* Add some basic styling for the prompt */
.subscribe-prompt {
  position: fixed;
  bottom: 20px;
  left: 20px;
  background-color: #f0f0f0;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  z-index: 1000;
  max-width: 300px;
}
.subscribe-prompt p {
  margin: 0 0 10px 0;
}
.subscribe-prompt button {
  padding: 8px 15px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.subscribe-prompt button:disabled {
    background-color: #ccc;
    cursor: not-allowed;
}
.subscribe-prompt .error {
  color: red;
  font-size: 0.9em;
  margin-top: 10px;
}
</style>