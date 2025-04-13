<template>
  <div class="relative">
    <!-- Bell Icon Button -->
    <button 
      @click.stop="toggleDropdown"
      class="relative p-2 rounded-full text-emerald-300 hover:text-emerald-100 hover:bg-emerald-800/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-emerald-500 transition-colors duration-200"
      aria-label="Notifications"
    >
      <BellIcon class="h-6 w-6" />
      <!-- Unread Count Badge -->
      <span 
        v-if="unreadCount > 0"
        class="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full"
      >
        {{ unreadCount > 9 ? '9+' : unreadCount }}
      </span>
    </button>

    <!-- Notifications Dropdown -->
    <transition 
      enter-active-class="transition ease-out duration-100"
      enter-from-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <div 
        v-if="isOpen"
        v-click-outside="closeDropdown" 
        class="origin-top-right absolute right-0 mt-2 w-80 md:w-96 rounded-md shadow-lg py-1 bg-gray-800 border border-gray-700 ring-1 ring-black ring-opacity-5 z-30 overflow-hidden"
      >
        <div class="px-4 py-3 border-b border-gray-700 flex justify-between items-center">
          <h3 class="text-lg font-semibold text-white">Notifications</h3>
          <button 
            v-if="notifications.length > 0 && unreadCount > 0"
            @click="markAllAsRead"
            class="text-xs text-emerald-400 hover:text-emerald-300"
            :disabled="loading"
          >
            Mark all as read
          </button>
        </div>

        <!-- Notification List -->
        <div class="max-h-96 overflow-y-auto">
          <div v-if="loading" class="flex justify-center items-center p-6">
            <Loader2Icon class="w-6 h-6 text-gray-400 animate-spin"/>
          </div>
          
          <div v-else-if="error" class="p-4 text-center text-red-400">
            {{ error }}
          </div>
          
          <div v-else-if="notifications.length === 0" class="p-6 text-center text-gray-500">
            No new notifications.
          </div>
          
          <ul v-else class="divide-y divide-gray-700">
            <li 
              v-for="notification in notifications" 
              :key="notification._id"
              @click="handleNotificationClick(notification)"
              :class="[
                'block px-4 py-3 hover:bg-gray-700/80 cursor-pointer transition-colors duration-150',
                { 'bg-gray-700/40': !notification.read }
              ]"
            >
              <div class="flex items-start space-x-3">
                <!-- Icon based on type could go here -->
                <div class="flex-shrink-0 pt-0.5">
                    <component :is="getIconForType(notification.type)" :class="['w-5 h-5', getIconColorForType(notification.type)]" />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-white truncate">{{ notification.title }}</p>
                  <p class="text-sm text-gray-400">{{ notification.message }}</p>
                  <p class="text-xs text-gray-500 mt-1">{{ formatRelativeTime(notification.createdAt) }}</p>
                </div>
                <div v-if="!notification.read" class="flex-shrink-0 self-center">
                  <span class="w-2.5 h-2.5 bg-blue-500 rounded-full inline-block" title="Unread"></span>
                </div>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';
import { useToast } from 'vue-toastification';
import { 
    BellIcon, Loader2Icon, CheckCircle, Info, Gift, Trophy, CalendarCheck, 
    AlertTriangle, XCircle, /* MessageSquare, */ Star, /*, Users */ // Removed unused Coins import
    Coins
} from 'lucide-vue-next';
import { formatDistanceToNow } from 'date-fns';

// Click outside directive (basic implementation)
// In a real app, consider a more robust library or VueUse's onClickOutside
const vClickOutside = {
  mounted(el, binding) {
    el.__ClickOutsideHandler__ = event => {
      if (!(el === event.target || el.contains(event.target))) {
        binding.value(event);
      }
    };
    document.body.addEventListener('click', el.__ClickOutsideHandler__);
  },
  unmounted(el) {
    document.body.removeEventListener('click', el.__ClickOutsideHandler__);
  },
};

const router = useRouter();
const toast = useToast();

const isOpen = ref(false);
const notifications = ref([]);
const unreadCount = ref(0);
const loading = ref(false);
const error = ref(null);
let intervalId = null;

const fetchNotifications = async () => {
  loading.value = true;
  error.value = null;
  try {
    const response = await axios.get('/api/notifications', {
      params: { limit: 20 } // Fetch latest 20
    });
    notifications.value = response.data.notifications || [];
    unreadCount.value = response.data.unreadCount || 0;
  } catch (err) {
    console.error("Failed to fetch notifications:", err);
    error.value = "Couldn't load notifications.";
    // Don't clear existing notifications on error, maybe show stale data
    // notifications.value = []; 
    // unreadCount.value = 0;
  } finally {
    loading.value = false;
  }
};

const markAsRead = async (notificationId) => {
  try {
    // Optimistic UI update
    const notification = notifications.value.find(n => n._id === notificationId);
    if (notification && !notification.read) {
      notification.read = true;
      unreadCount.value = Math.max(0, unreadCount.value - 1); 
    }
    
    await axios.patch(`/api/notifications/${notificationId}/read`);
    // No need to refetch, UI is already updated
  } catch (err) {
    console.error("Failed to mark notification as read:", err);
    toast.error("Failed to update notification status.");
    // Revert optimistic update on error
    const notification = notifications.value.find(n => n._id === notificationId);
    if (notification && notification.read) { // Check if it was the one we changed
      notification.read = false;
      unreadCount.value++;
    }
  }
};

const markAllAsRead = async () => {
  const currentUnreadCount = unreadCount.value;
  if (currentUnreadCount === 0) return;

  // Optimistic UI update
  notifications.value.forEach(n => n.read = true);
  unreadCount.value = 0;

  try {
    await axios.patch('/api/notifications/read-all');
    toast.success("All notifications marked as read.");
  } catch (err) {
    console.error("Failed to mark all notifications as read:", err);
    toast.error("Failed to mark all notifications as read.");
    // Revert optimistic update on error (more complex, might need refetch)
    await fetchNotifications(); // Refetch to get accurate state
  }
};

const handleNotificationClick = async (notification) => {
  // Mark as read first (if unread)
  if (!notification.read) {
    await markAsRead(notification._id);
  }
  
  // Navigate if a link exists
  if (notification.link) {
    try {
       // Attempt to navigate using Vue Router
       await router.push(notification.link); 
    } catch (navigationError) {
       console.warn(`Vue Router couldn't navigate to ${notification.link}. Attempting window.location.`, navigationError);
       // Fallback for external links or non-router paths
       window.location.href = notification.link; 
    }
  }
  
  closeDropdown(); // Close dropdown after interaction
};

const toggleDropdown = () => {
  isOpen.value = !isOpen.value;
  // Fetch fresh notifications when opening, unless already loading
  if (isOpen.value && !loading.value) {
    fetchNotifications();
  }
};

const closeDropdown = () => {
  isOpen.value = false;
};

// Helper to format relative time
const formatRelativeTime = (timestamp) => {
  if (!timestamp) return '';
  try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  } catch (e) {
      console.error("Error formatting date:", e);
      return 'Invalid date';
  }
};

// --- Icon Mapping --- 
const iconMap = {
    // Client side
    booking_confirmation: CheckCircle,
    booking_reminder: CalendarCheck,
    booking_status_change: Info,
    payment_confirmation: CheckCircle,
    tournament_bracket: Trophy,
    tournament_start: Trophy,
    tournament_end: Trophy,
    tournament_cancel: XCircle,
    loyalty_points_received: Coins,
    loyalty_points: Gift,
    system_alert: AlertTriangle,
    // Admin side
    new_booking_admin: BellIcon, // Default bell for new bookings
    booking_cancel_admin: XCircle,
    payment_received_admin: CheckCircle,
    new_review_admin: Star,
    tournament_fixture_reminder: CalendarCheck,
    tournament_start_admin: Trophy,
    tournament_end_admin: Trophy,
    tournament_cancel_admin: XCircle,
    // Default
    default: Info,
};

const iconColorMap = {
    // Map types to Tailwind text colors
    booking_confirmation: 'text-green-400',
    booking_reminder: 'text-blue-400',
    booking_status_change: 'text-yellow-400',
    payment_confirmation: 'text-green-400',
    tournament_bracket: 'text-purple-400',
    tournament_start: 'text-purple-400',
    tournament_end: 'text-gray-400',
    tournament_cancel: 'text-red-400',
    loyalty_points_received: 'text-yellow-400',
    loyalty_points: 'text-pink-400',
    system_alert: 'text-red-500',
    new_booking_admin: 'text-blue-400',
    booking_cancel_admin: 'text-red-400',
    payment_received_admin: 'text-green-400',
    new_review_admin: 'text-yellow-400',
    tournament_fixture_reminder: 'text-blue-400',
    tournament_start_admin: 'text-purple-400',
    tournament_end_admin: 'text-gray-400',
    tournament_cancel_admin: 'text-red-400',
    default: 'text-gray-400',
};

const getIconForType = (type) => {
    return iconMap[type] || iconMap.default;
};

const getIconColorForType = (type) => {
    return iconColorMap[type] || iconColorMap.default;
};


// --- Lifecycle Hooks ---
onMounted(() => {
  fetchNotifications(); // Initial fetch
  // Poll for new notifications every 60 seconds (adjust interval as needed)
  intervalId = setInterval(fetchNotifications, 60000);
});

onUnmounted(() => {
  // Clear interval when component is destroyed
  if (intervalId) {
    clearInterval(intervalId);
  }
});

</script>

<style scoped>
/* Scoped styles if needed */
</style> 