<template>
  <PageLayout>
    <div class="p-4 md:p-8">
      <div class="mb-6">
        <h1 class="text-2xl font-bold bg-gradient-to-r from-green-300 to-emerald-400 bg-clip-text text-transparent mb-2">
          My Bookings
        </h1>
        <p class="text-gray-400">View and manage your court bookings</p>
      </div>
      
      <!-- Booking Sections Tabs -->
      <div class="flex space-x-2 md:space-x-4 mb-6 overflow-x-auto">
        <button 
          @click="activeSection = 'ongoing'"
          :class="[
            'px-3 md:px-5 py-2 md:py-2.5 rounded-lg font-medium transition-all duration-200 whitespace-nowrap',
            activeSection === 'ongoing' 
              ? 'bg-green-500/20 text-green-400 border-l-4 border-green-500'
              : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-300'
          ]"
        >
          <div class="flex items-center gap-2">
            <CalendarCheckIcon class="w-4 h-4 md:w-5 md:h-5" />
            Ongoing Bookings
          </div>
        </button>
        
        <button 
          @click="activeSection = 'history'"
          :class="[
            'px-3 md:px-5 py-2 md:py-2.5 rounded-lg font-medium transition-all duration-200 whitespace-nowrap',
            activeSection === 'history' 
              ? 'bg-green-500/20 text-green-400 border-l-4 border-green-500'
              : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-300'
          ]"
        >
          <div class="flex items-center gap-2">
            <HistoryIcon class="w-4 h-4 md:w-5 md:h-5" />
            Booking History
          </div>
        </button>
      </div>
      
      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center items-center min-h-[400px]">
        <div class="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
      </div>
      
      <!-- Empty State - Ongoing -->
      <div v-else-if="activeSection === 'ongoing' && ongoingBookings.length === 0" 
           class="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 text-center">
        <div class="mb-5">
          <CalendarPlusIcon class="w-12 h-12 md:w-16 md:h-16 text-gray-600 mx-auto mb-3" />
          <h3 class="text-xl font-medium text-white mb-2">No Active Bookings</h3>
          <p class="text-gray-400 mb-6 max-w-md mx-auto">You don't have any upcoming or ongoing bookings. Book a court to see your reservations here.</p>
          <router-link 
            to="/home" 
            class="px-4 py-2 md:px-6 md:py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg 
                  hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg 
                  hover:shadow-green-500/20 inline-flex items-center gap-2"
          >
            <SearchIcon class="w-4 h-4 md:w-5 md:h-5" />
            Find Courts
          </router-link>
        </div>
      </div>
      
      <!-- Empty State - History -->
      <div v-else-if="activeSection === 'history' && pastBookings.length === 0" 
           class="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 text-center">
        <div class="mb-5">
          <ClockIcon class="w-12 h-12 md:w-16 md:h-16 text-gray-600 mx-auto mb-3" />
          <h3 class="text-xl font-medium text-white mb-2">No Booking History</h3>
          <p class="text-gray-400 mb-6 max-w-md mx-auto">Your completed bookings will appear here. You haven't completed any bookings yet.</p>
        </div>
      </div>
      
      <!-- Ongoing Bookings List -->
      <div v-else-if="activeSection === 'ongoing'" class="space-y-4 md:space-y-6">
        <div v-for="booking in ongoingBookings" :key="booking._id" 
             class="bg-gray-800/90 rounded-xl overflow-hidden border border-gray-700 hover:border-green-500/30 
                    transition-all duration-300 hover:shadow-lg hover:shadow-green-500/10 group">
          
          <div class="flex flex-col md:flex-row">
            <!-- Court Image -->
            <div class="md:w-1/3 lg:w-1/4 h-48 md:h-auto relative">
              <img 
                :src="booking.courtImage || '/placeholder-court.jpg'" 
                :alt="booking.courtName || 'Court'" 
                class="w-full h-full object-cover transition-transform group-hover:scale-105 duration-700"
              >
              <div class="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent md:bg-gradient-to-t"></div>
              <div class="absolute top-2 left-2 md:top-3 md:left-3">
                <span :class="[
                  'px-2 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1',
                  getStatusColor(booking.status)
                ]">
                  <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
                  {{ booking.status.charAt(0).toUpperCase() + booking.status.slice(1) }}
                </span>
              </div>
            </div>
            
            <!-- Booking Details -->
            <div class="p-4 md:p-5 md:flex-1">
              <div class="flex flex-col md:flex-row justify-between md:items-start gap-2 md:gap-0 mb-3 md:mb-4">
                <div>
                  <h3 class="text-lg md:text-xl font-medium text-white group-hover:text-green-400 transition-colors">
                    {{ booking.courtName || 'Court' }}
                  </h3>
                  <p class="text-sm text-gray-400">
                    {{ booking.futsalName || 'Futsal' }}
                  </p>
                </div>
                <div class="md:text-right">
                  <p class="text-lg md:text-xl font-semibold text-green-400">Rs. {{ booking.price }}</p>
                  <p class="text-xs capitalize" :class="getPaymentStatusColor(booking.paymentStatus)">
                     Payment: {{ getPaymentStatusText(booking.paymentStatus) }}
                  </p>
                </div>
              </div>
              
              <div class="grid grid-cols-2 gap-x-4 gap-y-3 mb-4">
                <div>
                  <p class="text-xs text-gray-400 mb-1">Date</p>
                  <p class="text-sm text-white">{{ formatDate(booking.date) }}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-400 mb-1">Time</p>
                  <p class="text-sm text-white">{{ formatTime(booking.startTime) }} - {{ formatTime(booking.endTime) }}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-400 mb-1">Booking ID</p>
                  <p class="text-sm text-gray-300">{{ booking._id.substring(0, 8) }}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-400 mb-1">Booked On</p>
                  <p class="text-sm text-gray-300">{{ formatDate(booking.createdAt) }}</p>
                </div>
              </div>
              
              <div class="flex justify-end gap-2 md:gap-3">
                <button 
                  v-if="canCancelBooking(booking)" 
                  @click.stop="cancelBooking(booking._id)"
                  class="px-3 py-1.5 md:px-4 md:py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors flex items-center gap-1.5 text-sm"
                >
                  <XCircleIcon class="w-3.5 h-3.5 md:w-4 md:h-4" />
                  Cancel
                </button>
                <button 
                  v-else-if="['pending', 'confirmed'].includes(booking.status)" 
                  disabled
                  class="px-3 py-1.5 md:px-4 md:py-2 bg-gray-600/20 text-gray-500 rounded-lg flex items-center gap-1.5 text-sm cursor-not-allowed"
                  title="Cannot cancel past bookings"
                >
                  <XCircleIcon class="w-3.5 h-3.5 md:w-4 md:h-4" />
                  Cancel
                </button>
                <button 
                  @click="showBookingDetails(booking)"
                  class="px-3 py-1.5 md:px-4 md:py-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors flex items-center gap-1.5 text-sm"
                >
                  <ClipboardIcon class="w-3.5 h-3.5 md:w-4 md:h-4" />
                  Details
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Past Bookings List -->
      <div v-else-if="activeSection === 'history'" class="space-y-4 md:space-y-6">
        <div v-for="booking in pastBookings" :key="booking._id" 
             class="bg-gray-800/70 rounded-xl overflow-hidden border border-gray-700/50 
                    transition-all duration-300 hover:border-gray-600 group">
          
          <div class="flex flex-col md:flex-row">
            <!-- Court Image -->
            <div class="md:w-1/3 lg:w-1/4 h-48 md:h-auto relative">
              <img 
                :src="booking.courtImage || '/placeholder-court.jpg'" 
                :alt="booking.courtName || 'Court'" 
                class="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
              >
              <div class="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent md:bg-gradient-to-t"></div>
              <div class="absolute bottom-2 left-2 md:top-3 md:left-3">
                <span v-if="booking.status === 'cancelled'" class="px-2 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 bg-red-600/80 text-red-200">
                  <XCircleIcon class="w-3 h-3" />
                  Cancelled
                </span>
                <span v-else class="px-2 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 bg-gray-600/80 text-gray-300">
                  <CheckCircleIcon class="w-3 h-3" />
                  {{ booking.status === 'completed' ? 'Completed' : 'Past' }}
                </span>
              </div>
            </div>
            
            <!-- Booking Details -->
            <div class="p-4 md:p-5 md:flex-1">
              <div class="flex flex-col md:flex-row justify-between md:items-start gap-2 md:gap-0 mb-3 md:mb-4">
                <div>
                  <h3 class="text-lg font-medium text-gray-300 group-hover:text-white transition-colors">
                    {{ booking.courtName || 'Court' }}
                  </h3>
                  <p class="text-sm text-gray-500">
                    {{ booking.futsalName || 'Futsal' }}
                  </p>
                </div>
                <div class="md:text-right">
                  <p class="text-lg font-semibold text-gray-300">Rs. {{ booking.price }}</p>
                  <p class="text-xs text-gray-500">
                    {{ booking.paymentMethod === 'free' ? 'Free Booking' : (booking.paymentStatus || 'N/A') }}
                  </p>
                </div>
              </div>
              
              <div class="grid grid-cols-2 gap-x-4 gap-y-3">
                <div>
                  <p class="text-xs text-gray-500 mb-1">Date</p>
                  <p class="text-sm text-gray-300">{{ formatDate(booking.date) }}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-500 mb-1">Time</p>
                  <p class="text-sm text-gray-300">{{ formatTime(booking.startTime) }} - {{ formatTime(booking.endTime) }}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-500 mb-1">Booking ID</p>
                  <p class="text-sm text-gray-400">{{ booking._id.substring(0, 8) }}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-500 mb-1">Completed/Cancelled On</p>
                  <p class="text-sm text-gray-400">{{ formatDate(booking.updatedAt) }}</p>
                </div>
              </div>
              
              <div class="mt-4 flex justify-end gap-2 md:gap-3">
                <button 
                  @click="showBookingDetails(booking)"
                  class="px-3 py-1.5 md:px-4 md:py-2 bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-gray-300 rounded-lg transition-colors flex items-center gap-1.5 text-sm"
                >
                  <ClipboardIcon class="w-3.5 h-3.5 md:w-4 md:h-4" />
                  Details
                </button>
                <button 
                  v-if="booking.status === 'completed'" 
                  @click="bookAgain(booking)"
                  class="px-3 py-1.5 md:px-4 md:py-2 bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded-lg transition-colors flex items-center gap-1.5 text-sm"
                >
                  <CalendarPlusIcon class="w-3.5 h-3.5 md:w-4 md:h-4" />
                  Book Again
                </button>
                <button 
                  v-if="booking.status === 'completed'" 
                  @click="openReviewModal(booking)"
                  class="px-3 py-1.5 md:px-4 md:py-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors flex items-center gap-1.5 text-sm"
                >
                  <StarIcon class="w-3.5 h-3.5 md:w-4 md:h-4" />
                  Add Review
                </button>
                <button 
                  v-if="booking.status === 'completed' || booking.status === 'cancelled'" 
                  @click="deleteBookingHistory(booking._id)"
                  class="px-3 py-1.5 md:px-4 md:py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors flex items-center gap-1.5 text-sm"
                >
                  <TrashIcon class="w-3.5 h-3.5 md:w-4 md:h-4" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Booking Details Modal -->
    <BaseModal v-if="showModal" @update:model-value="showModal = false" :model-value="showModal">
      <template #header>
        <h3 class="text-xl font-semibold text-white">Booking Details</h3>
      </template>
      
      <template v-if="selectedBooking">
        <div class="space-y-6 p-2">
          <!-- Court Image -->
          <div class="h-48 md:h-56 w-full rounded-lg overflow-hidden relative">
            <img 
              :src="selectedBooking.courtImage || '/placeholder-court.jpg'" 
              :alt="selectedBooking.courtName" 
              class="w-full h-full object-cover"
            >
            <div class="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
            <div class="absolute bottom-3 left-3 right-3">
              <p class="text-xl font-bold text-white">{{ selectedBooking.courtName }}</p>
              <p class="text-sm text-gray-300">{{ selectedBooking.futsalName }}</p>
            </div>
          </div>
        
          <!-- Status Banner -->
          <div :class="[
            'py-2 px-4 rounded-lg flex items-center justify-between',
            getStatusBgColor(selectedBooking.status)
          ]">
            <div class="flex items-center gap-2">
              <CheckCircleIcon v-if="selectedBooking.status === 'confirmed'" class="w-5 h-5" />
              <ClockIcon v-if="selectedBooking.status === 'pending'" class="w-5 h-5" />
              <XCircleIcon v-if="selectedBooking.status === 'cancelled'" class="w-5 h-5" />
              <span class="font-medium">{{ selectedBooking.status.charAt(0).toUpperCase() + selectedBooking.status.slice(1) }}</span>
            </div>
            <div>
              <span :class="[
                'text-lg font-bold',
                selectedBooking.paymentStatus === 'unpaid' || selectedBooking.paymentMethod === 'free' ? 'text-blue-400' : 'text-green-400'
              ]">
                Rs. {{ selectedBooking.price }}
              </span>
              <span class="text-xs ml-1 capitalize">
                 {{ getPaymentStatusText(selectedBooking.paymentStatus) }}
              </span>
            </div>
          </div>

          <!-- Court Info -->
          <div class="bg-gray-700/30 rounded-lg p-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-xs text-gray-400 mb-1">Surface Type</p>
                <p class="text-sm text-white">{{ selectedBooking.surfaceType || 'Standard' }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-400 mb-1">Court Type</p>
                <p class="text-sm text-white">{{ selectedBooking.courtType || 'Indoor' }}</p>
              </div>
            </div>
          </div>
          
          <!-- Booking Info -->
          <div class="bg-gray-700/30 rounded-lg p-4">
            <h4 class="font-medium text-white mb-3">Booking Information</h4>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-xs text-gray-400 mb-1">Date</p>
                <p class="text-sm text-white">{{ formatDate(selectedBooking.date) }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-400 mb-1">Time</p>
                <p class="text-sm text-white">{{ formatTime(selectedBooking.startTime) }} - {{ formatTime(selectedBooking.endTime) }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-400 mb-1">Booking ID</p>
                <p class="text-sm text-white">{{ selectedBooking._id }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-400 mb-1">Price Type</p>
                <p class="text-sm text-white capitalize">{{ selectedBooking.priceType || 'Regular' }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-400 mb-1">Booked On</p>
                <p class="text-sm text-white">{{ formatDate(selectedBooking.createdAt) }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-400 mb-1">Payment Method</p>
                <p class="text-sm text-white capitalize">
                  {{ selectedBooking.paymentStatus === 'unpaid' ? 'Not Required (Free)' : 
                     selectedBooking.paymentMethod === 'free' ? 'Free Booking' : 
                     selectedBooking.paymentMethod || 'N/A' }}
                </p>
              </div>
            </div>
          </div>
          
          <!-- Actions -->
          <div class="flex justify-end gap-3">
            <button 
                v-if="canCancelBooking(selectedBooking)" 
                @click="cancelBooking(selectedBooking._id)"
                class="px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
              >
                Cancel Booking
              </button>
              <button
                v-if="selectedBooking.status === 'completed'"
                @click="openReviewModal(selectedBooking)"
                class="px-4 py-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
              >
                Add Review
              </button>
              <button 
                v-if="selectedBooking.status === 'completed' || selectedBooking.status === 'cancelled'" 
                @click="deleteBookingHistory(selectedBooking._id)"
                class="px-4 py-2 bg-gray-600/20 text-gray-400 hover:bg-gray-600 rounded-lg transition-colors"
               >
                Delete from History
              </button>
          </div>
        </div>
        <ReviewModal
          v-model="showReviewModal"
          :booking="bookingToReview"
          :court="bookingToReview?.courtDetails || {}"
          @review-submitted="handleReviewSubmit"
        />
      </template>
      
      <template #footer>
        <div class="flex justify-end">
          <button
            @click="showModal = false"
            class="px-4 py-2 bg-gray-700 text-white hover:bg-gray-600 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </template>
    </BaseModal>
  </PageLayout>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { 
  CalendarCheckIcon, HistoryIcon, SearchIcon, 
  ClockIcon, XCircleIcon, ClipboardIcon,
  CheckCircleIcon, StarIcon, CalendarPlusIcon,
  TrashIcon
} from 'lucide-vue-next';
import PageLayout from '@/components/layout/PageLayout.vue';
import ReviewModal from '@/components/ReviewModal.vue';
import { useTimeFormatting } from '@/composables/useTimeFormatting';
import BaseModal from '@/components/base/BaseModal.vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { log } from '@/utils/logger';
import API_URL from '@/config/api';
import { getAssetUrl } from '@/config/api';
import { useApi } from '@/composables/useApi';

const { fetchData } = useApi();
const router = useRouter();
const toast = useToast();

const { formatDate, formatTime } = useTimeFormatting();

// State management
const activeSection = ref('ongoing');
const loading = ref(false);
const bookings = ref([]);
const showModal = ref(false);
const selectedBooking = ref(null);
const showReviewModal = ref(false);
const bookingToReview = ref(null);

// Computed properties
const ongoingBookings = computed(() => {
  const now = new Date();
  return bookings.value.filter(booking => {
    // Must be pending or confirmed
    if (!['pending', 'confirmed'].includes(booking.status)) {
      return false;
    }
    // Check if end time is in the future
    try {
      const endDateTimeStr = `${booking.date.split('T')[0]}T${booking.endTime}:00`;
      const endDateTime = new Date(endDateTimeStr);
      // Add a small buffer (e.g., 1 minute) to keep it ongoing until just after the hour
      endDateTime.setMinutes(endDateTime.getMinutes() + 1);
      return endDateTime >= now;
    } catch (e) {
      console.error("Error parsing booking end time:", booking._id, e);
      return false; // Treat as past if error occurs
    }
  });
});

const pastBookings = computed(() => {
  const now = new Date();
  return bookings.value
    .filter(booking => {
      // Include completed or cancelled bookings
      if (['completed', 'cancelled'].includes(booking.status)) {
        return true;
      }
      // Include pending/confirmed bookings whose end time has passed
      if (['pending', 'confirmed'].includes(booking.status)) {
         try {
          const endDateTimeStr = `${booking.date.split('T')[0]}T${booking.endTime}:00`;
          const endDateTime = new Date(endDateTimeStr);
          // Use the same buffer as ongoing check
          endDateTime.setMinutes(endDateTime.getMinutes() + 1);
          return endDateTime < now;
        } catch (e) {
          console.error("Error parsing booking end time for history:", booking._id, e);
          return true; // Treat as past if error occurs
        }
      }
      return false; // Should not happen unless status is unexpected
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort history newest first
});

// Helper function to check if cancellation is allowed
const canCancelBooking = (booking) => {
  if (!['pending', 'confirmed'].includes(booking.status)) {
    return false; // Can only cancel pending or confirmed
  }
  // Check if end time is in the future (same logic as ongoingBookings)
   try {
    const now = new Date();
    const endDateTimeStr = `${booking.date.split('T')[0]}T${booking.endTime}:00`;
    const endDateTime = new Date(endDateTimeStr);
    // Add a small buffer (e.g., 1 minute)
    endDateTime.setMinutes(endDateTime.getMinutes() + 1); 
    return endDateTime >= now;
  } catch (e) {
    console.error("Error checking cancellability:", booking._id, e);
    return false; // Cannot cancel if time check fails
  }
};

// Methods

const handleReviewSubmit = async (reviewData) => {
  try {
    if (!bookingToReview.value || !bookingToReview.value.court) {
      throw new Error('No booking selected for review');
    }
    
    await fetchData(`/player/courts/${bookingToReview.value.court}/reviews`, {
      method: 'POST',
      body: JSON.stringify(reviewData)
    });
    
    // Show success message
    toast.success('Review submitted successfully!');
    showReviewModal.value = false;
  } catch (error) {
    console.error('Error submitting review:', error);
    toast.error('Failed to submit review. Please try again.');
  }
};

const openReviewModal = (booking) => {
  bookingToReview.value = booking;
  showReviewModal.value = true;
};

const bookAgain = (booking) => {
  // Navigate to the court details page with the court ID
  router.push({
    name: 'playerCourtDetails',
    params: { id: booking.court }
  });
};

const cancelBooking = async (bookingId) => {
  if (!confirm("Are you sure you want to cancel this booking?")) return;

  try {
    loading.value = true; // Indicate loading state
    const response = await fetch(`${API_URL}/api/bookings/${bookingId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (response.ok) {
      log('INFO', 'BOOKING', `Booking ${bookingId} cancelled successfully`);
      // Find and update the booking in our list
      const index = bookings.value.findIndex(b => b._id === bookingId);
      if (index !== -1) {
        bookings.value[index].status = 'cancelled';
        // Close modal if the cancelled booking was being viewed
        if (selectedBooking.value && selectedBooking.value._id === bookingId) {
          showModal.value = false;
        }
      }
      // Show success message
      toast.success('Booking cancelled successfully');
    } else {
      console.error('Error cancelling booking:', response.statusText);
      toast.error('Failed to cancel booking. Please try again.');
    }
  } catch (error) {
    console.error('Error cancelling booking:', error);
    toast.error('Failed to cancel booking. Please try again.');
  } finally {
    loading.value = false;
  }
};

const deleteBookingHistory = async (bookingId) => {
  try {
    if (!confirm('Are you sure you want to delete this booking from your history?')) {
      return;
    }
    
    await fetchData(`/bookings/${bookingId}/delete`, {
      method: 'POST'
    });
    
    log('INFO', 'BOOKING', `Booking ${bookingId} deleted from history successfully`);
    
    // Find and update the booking in our list
    const index = bookings.value.findIndex(b => b._id === bookingId);
    if (index !== -1) {
      bookings.value.splice(index, 1);
      // Close modal if the deleted booking was being viewed
      if (selectedBooking.value && selectedBooking.value._id === bookingId) {
        showModal.value = false;
      }
    }
    
    // Show success message
    toast.success('Booking deleted successfully');
    
  } catch (error) {
    console.error('Error deleting booking:', error);
    toast.error('Failed to delete booking. Please try again.');
  }
};

// Helper functions

const getStatusColor = (status) => {
  switch (status) {
    case 'pending':
      return 'bg-yellow-500/20 text-yellow-400';
    case 'confirmed':
      return 'bg-green-500/20 text-green-400';
    case 'cancelled':
      return 'bg-red-500/20 text-red-400';
    case 'completed':
      return 'bg-blue-500/20 text-blue-400';
    default:
      return 'bg-gray-500/20 text-gray-400';
  }
};

const getStatusBgColor = (status) => {
  switch (status) {
    case 'pending':
      return 'bg-yellow-500/10 text-yellow-400';
    case 'confirmed':
      return 'bg-green-500/10 text-green-400';
    case 'cancelled':
      return 'bg-red-500/10 text-red-400';
    case 'completed':
      return 'bg-blue-500/10 text-blue-400';
    default:
      return 'bg-gray-500/10 text-gray-400';
  }
};

const getPaymentStatusColor = (status) => {
  switch (status) {
    case 'unpaid':
      return 'text-yellow-400';
    case 'pending':
      return 'text-yellow-400';
    case 'paid':
      return 'text-green-400';
    case 'completed':
      return 'text-green-400';
    default:
      return 'text-gray-400';
  }
};

const getPaymentStatusText = (status) => {
  switch (status) {
    case 'paid': return '(Paid)';
    case 'unpaid': return '(No Prepayment)';
    case 'pending': return '(Pending)';
    case 'failed': return '(Failed)';
    case 'refunded': return '(Refunded)';
    default: return '(N/A)';
  }
};

const showBookingDetails = (booking) => {
  // Add debug logging to inspect booking payment data
  console.log('Showing details for booking:', {
    id: booking._id,
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    paymentMethod: booking.paymentMethod,
    price: booking.price,
    requirePrepayment: booking.requirePrepayment
  });
  selectedBooking.value = booking;
  showModal.value = true;
};

// API Calls
const fetchBookings = async () => {
  try {
    loading.value = true;
    log('INFO', 'BOOKINGS', 'Starting to fetch bookings...');
    
    const data = await fetchData('/api/bookings');
    log('INFO', 'BOOKINGS', `Fetched ${data?.length || 0} bookings from API`);
    
    if (data && data.length > 0) {
      // Log the most recent booking for debugging
      const latestBooking = data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
      log('DEBUG', 'BOOKINGS', `Most recent booking: ID=${latestBooking._id}, Status=${latestBooking.status}, Payment=${latestBooking.paymentStatus}, Date=${latestBooking.date}, Created=${latestBooking.createdAt}`);
      
      // Log all bookings for today or tomorrow to debug visibility issues
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const todayBookings = data.filter(b => b.date.startsWith(today) || b.date.startsWith(tomorrow));
      log('DEBUG', 'BOOKINGS', `Found ${todayBookings.length} bookings for today/tomorrow: ${todayBookings.map(b => b._id).join(', ')}`);
      
      // Additional debug logging for payment status
      data.forEach(booking => {
        console.log(`Booking ${booking._id} payment details:`, {
          price: booking.price,
          paymentStatus: booking.paymentStatus,
          paymentDetails: booking.paymentDetails,
          requirePrepayment: booking.requirePrepayment
        });
      });
    }
    
    bookings.value = data.map(booking => ({
      ...booking,
      courtName: booking.courtDetails?.name || 'Unknown Court',
      futsalName: booking.courtDetails?.futsalName || 'Unknown Futsal',
      surfaceType: booking.courtDetails?.surfaceType || 'Unknown',
      courtType: booking.courtDetails?.courtType || 'Unknown',
      // Fix image URL construction with proper checks
      courtImage: (() => {
        // Check if courtDetails and images exist
        if (!booking.courtDetails?.images || !booking.courtDetails.images.length) {
          return '/placeholder-court.jpg';
        }
        
        // Get the first image
        const img = booking.courtDetails.images[0];
        
        // Check if it's already a complete URL
        if (img.startsWith('http')) {
          return img;
        }
        
        // Otherwise, prefix with the API base URL
        return getAssetUrl(img);
      })(),
      // Set payment method to 'free' if it was a free booking or not requiring prepayment
      paymentMethod: booking.paymentDetails?.method || 
                    (booking.price === 0 ? 'free' : 
                     booking.paymentStatus === 'unpaid' ? 'no-prepayment' : 'standard')
    }));
    
    log('INFO', 'BOOKINGS', `Successfully processed ${bookings.value.length} bookings`);
    
  } catch (error) {
    console.error('Error fetching bookings:', error);
    log('ERROR', 'BOOKINGS', `Failed to fetch bookings: ${error.message}`);
    bookings.value = [];
  } finally {
    loading.value = false;
  }
};

// Payment success check
const checkPaymentStatus = () => {
  const paymentSuccessful = localStorage.getItem('paymentSuccessful');
  
  if (paymentSuccessful === 'true') {
    log('INFO', 'MY_BOOKINGS', 'Payment successful flag detected, refreshing bookings');
    fetchBookings();
    // Clear the flag after processing
    localStorage.removeItem('paymentSuccessful');
    localStorage.removeItem('lastPaymentTimestamp');
    toast.success('Bookings updated with your recent payment');
  }
};

// In the onMounted function, after any existing code
onMounted(() => {
  fetchBookings();
  checkPaymentStatus();
  
  // Check if user is coming from a payment flow by watching URL
  window.addEventListener('storage', checkPaymentStatus);
});

// Add onBeforeUnmount to clean up event listener
onBeforeUnmount(() => {
  window.removeEventListener('storage', checkPaymentStatus);
});
</script>