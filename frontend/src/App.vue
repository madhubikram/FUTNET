<template>
  <RouterView />
  <PWAUpdatePopup />

  <!-- Example Button to Trigger Subscription (for testing/user action) -->
  <div v-if="isAuthenticated && !isSubscribed && showSubscribeButton" class="subscribe-prompt">
    <button @click="dismissPrompt" class="close-button" aria-label="Close">&times;</button>
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

// Function to dismiss the prompt
const dismissPrompt = () => {
  showSubscribeButton.value = false;
};

</script>

<style scoped>
/* Add some basic styling for the prompt */
.subscribe-prompt {
  position: fixed;
  bottom: 20px;
  left: 20px;
  background-color: #2c3e50; /* Darker background */
  color: #ecf0f1; /* Lighter text */
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.3);
  z-index: 1000;
  max-width: 300px;
  display: flex;
  flex-direction: column;
  gap: 10px; /* Add gap between elements */
}

.subscribe-prompt .close-button {
  position: absolute;
  top: 5px;
  right: 8px;
  background: none;
  border: none;
  color: #bdc3c7; /* Lighter gray for close button */
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  padding: 0;
}

.subscribe-prompt .close-button:hover {
  color: #ecf0f1; /* White on hover */
}

.subscribe-prompt p {
  margin: 0;
  font-size: 0.95em;
}

.subscribe-prompt button:not(.close-button) { /* Target only the main button */
  padding: 8px 15px;
  background-color: #27ae60; /* Greener */
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.subscribe-prompt button:not(.close-button):hover {
  background-color: #2ecc71;
}

.subscribe-prompt button:disabled:not(.close-button) {
    background-color: #7f8c8d; /* Gray when disabled */
    cursor: not-allowed;
}

.subscribe-prompt .error {
  color: #e74c3c; /* Red for errors */
  font-size: 0.9em;
  margin-top: 5px; /* Adjust margin */
}
</style>