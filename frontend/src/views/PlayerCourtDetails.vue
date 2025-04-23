// src/views/PlayerCourtDetails.vue

<template>
  <PageLayout :hasPadding="false">
    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center min-h-screen">
      <div class="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
    </div>

      <!-- Error State -->
      <div v-else-if="error" class="flex justify-center items-center min-h-screen">
        <div class="text-red-400">{{ error }}</div>
      </div>

      <!-- Main Content -->
      <template v-else>
        <!-- Image Gallery Component -->
        <ImageGallery
          :images="courtImages"
          :court-name="court.courtName"
          :court-side="court.courtSide"
          :rating="court.averageRating"
          :location="shortLocation"
        />

        <!-- Navigation Tabs -->
        <div class="bg-gray-900">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex space-x-8 border-b border-gray-700">
              <button
                v-for="tab in tabs"
                :key="tab.id"
                @click="currentTab = tab.id"
                :class="[
                  'py-4 text-sm font-medium border-b-2 -mb-px transition-colors',
                  currentTab === tab.id
                    ? 'text-green-400 border-green-400'
                    : 'text-gray-400 border-transparent hover:text-gray-300'
                ]"
              >
                {{ tab.name }}
              </button>
            </div>
          </div>
        </div>

        <!-- Tab Content -->
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div v-if="currentTab === 'description'" class="space-y-8">
            <!-- Court Information Component -->
            <CourtInfo :court="court" />
            <section class="bg-gray-800 rounded-xl p-6">
              <h2 class="text-xl font-semibold text-white mb-4">Location</h2>
              <div class="h-80 rounded-lg overflow-hidden relative">
                <MapComponent 
                  :initial-location="courtLocation" 
                  :readonly="true"
                  :hide-search="true"
                />
                
                <!-- North Compass Symbol -->
                <div class="absolute top-4 right-4 z-10 bg-black/50 p-2 rounded-lg">
                  <div class="w-8 h-8 relative">
                    <div class="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-4 bg-red-500"></div>
                    <div class="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-4 bg-white"></div>
                    <div class="absolute top-1/2 -translate-y-1/2 left-0 h-1 w-4 bg-white"></div>
                    <div class="absolute top-1/2 -translate-y-1/2 right-0 h-1 w-4 bg-white"></div>
                    <div class="absolute top-1 left-1/2 -translate-x-1/2 text-xs font-bold text-red-500">N</div>
                  </div>
                </div>
              </div>
            </section>
            <div ref="reviewsSection">
            <!-- Review Section Component -->
            <ReviewSection
              :court="court"
              :current-user-id="currentUserId"
              @submit-review="handleSubmitReview"
              @update-review="handleUpdateReview"
              @delete-review="handleDeleteReview"
              @toggle-reaction="handleToggleReaction"
            />
          </div>
          </div>

          <div v-else-if="currentTab === 'timetable'" class="space-y-8">
            <!-- Booking Section Component -->
            <BookingSection
              ref="bookingSectionRef"
              v-if="court"
              :court="court"
              @proceed-booking="handleProceedBooking"
            />
          </div>
        </div>
      </template>

      <!-- Booking Confirmation Modal -->
      <BookingConfirmationModal
        v-if="showBookingModal"
        :booking-details="bookingDetails"
        :requires-prepayment="court?.requirePrepayment"
        :is-processing="isProcessingBooking"
        @close="closeBookingModal"
        @confirm-booking="handleConfirmBooking"
      />

  </PageLayout>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageLayout from '@/components/layout/PageLayout.vue'


// Import our new components
import MapComponent from '@/components/MapComponent.vue'
import ImageGallery from '@/components/court-details/ImageGallery.vue'
import CourtInfo from '@/components/court-details/CourtInfo.vue'
import ReviewSection from '@/components/court-details/ReviewSection.vue'
import BookingSection from '@/components/court-details/BookingSection.vue'
import BookingConfirmationModal from '@/components/court-details/BookingConfirmationModal.vue'
import { useApi } from '@/composables/useApi'
import { log } from '@/utils/logger'
import API_URL, { getAssetUrl } from '@/config/api'

const route = useRoute()
const router = useRouter()
const { fetchData, error: apiError } = useApi()

// State Management
const court = ref(null)
const loading = ref(true)
const reviewsSection = ref(null)
const error = ref(null)
const currentTab = ref('description')
const showBookingModal = ref(false)
const bookingDetails = ref(null)
const isProcessingBooking = ref(false)
const bookingSectionRef = ref(null)

// Constants and Computed Properties
const tabs = [
  { id: 'description', name: 'Description' },
  { id: 'timetable', name: 'Book Time Slot' }
]

const currentUserId = computed(() => {
  const userId = localStorage.getItem('userId') || '';
  if (!userId) {
    console.warn('No user ID found in localStorage - user might need to log in again');
  }
  return userId; 
});

const shortLocation = computed(() => {
  if (!court.value?.location) return ''
  const parts = court.value.location.split(',')
  return parts.slice(0, 2).map(part => part.trim()).join(', ')
})

const courtImages = computed(() => {
  if (!court.value?.images?.length) return ['/placeholder-court.jpg']
  return court.value.images.map(img => 
    img.startsWith('http') ? img : getAssetUrl(img)
  )
})

// computed properties
const courtLocation = computed(() => {
  if (!court.value?.futsalId?.coordinates) {
    return { lat: 27.7172, lng: 85.3240 }; // Default to Kathmandu
  }
  return {
    lat: court.value.futsalId.coordinates.lat,
    lng: court.value.futsalId.coordinates.lng
  };
});

// API Calls
const fetchCourtDetails = async () => {
  const context = 'FETCH_COURT_DETAILS';
  try {
    loading.value = true;
    error.value = null;
    log('INFO', context, `Fetching details for court ${route.params.id}`);

    const data = await fetchData(`/api/player/courts/${route.params.id}`);

    // Improve duplicate review filtering with more strict comparison
    const uniqueReviews = Array.from(new Map(
      data.reviews.map(review => [review._id, review])
    ).values());
    
    court.value = {
      ...data,
      reviews: uniqueReviews,
      futsalName: data.futsalId?.name || 'Unknown Futsal',
      courtName: data.name,
      location: data.futsalId?.location || 'Location not available'
    };
    log('INFO', context, `Successfully fetched details for court ${route.params.id}`);

  } catch (err) {
    log('ERROR', context, `Error fetching court ${route.params.id}`, { error: apiError.value || err.message });
    error.value = apiError.value || err.message;
  } finally {
    loading.value = false;
  }
};

// Event Handlers for Review Section
const handleSubmitReview = async (reviewData) => {
  try {
    const response = await fetch(
      `${API_URL}/api/player/courts/${route.params.id}/reviews`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reviewData)
      }
    )

    if (!response.ok) throw new Error('Failed to submit review')
    
    const updatedCourt = await response.json()
    // Update state directly instead of refetching
    court.value = {
      ...court.value,
      reviews: updatedCourt.reviews,
      averageRating: updatedCourt.averageRating
    }
  } catch (error) {
    console.error('Error submitting review:', error)
  }
}

const userReview = computed(() => {
  return court.value?.reviews?.find(review => 
    review.user._id?.toString() === currentUserId.value?.toString()
  )
})
const handleUpdateReview = async (reviewData) => {
  if (!userReview.value) return // Guard clause

  try {
    const response = await fetch(
      `${API_URL}/api/player/courts/${route.params.id}/reviews/${userReview.value._id}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reviewData)
      }
    )

    if (!response.ok) throw new Error('Failed to update review')
    
    await fetchCourtDetails()
  } catch (error) {
    console.error('Error updating review:', error)
  }
}

const handleDeleteReview = async () => {
  try {
    const response = await fetch(
      `${API_URL}/api/player/courts/${route.params.id}/reviews/${userReview.value._id}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || 'Failed to delete review')
    }

    // Instead of fetching entire court details, just update the reviews
    const updatedCourt = await response.json()
    court.value.reviews = updatedCourt.reviews || []
    
  } catch (error) {
    console.error('Error deleting review:', error)
    // Add user notification here
  }
}


const handleToggleReaction = async ({ reviewId, type }) => {
  try {
    const response = await fetch(
      `${API_URL}/api/player/courts/${route.params.id}/reviews/${reviewId}/reactions`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ type })
      }
    )

    if (!response.ok) throw new Error('Failed to toggle reaction')
    
    const updatedCourt = await response.json()
    court.value.reviews = updatedCourt.reviews
  } catch (error) {
    console.error('Error toggling reaction:', error)
  }
}

// Booking related handlers
const handleProceedBooking = (details) => {
  // Ensure the bookingDetails has the proper structure expected by the confirmation modal
  bookingDetails.value = {
    ...details,
    date: details.date,  // Keep the original date format from the form
    slots: details.slots || [],
    totalAmount: details.totalAmount || 0,
    duration: details.duration || (details.slots ? `${details.slots.length} hour(s)` : 'N/A')
  }
  showBookingModal.value = true
}

const handleConfirmBooking = async ({ paymentMethod, usingFreeSlots }) => {
  const context = 'FRONTEND_BOOKING_SUBMIT';
  try {
    isProcessingBooking.value = true;
    log('INFO', context, `Starting booking confirmation process with method: ${paymentMethod}`, { 
      bookingDetails: bookingDetails.value, 
      courtRequiresPrepayment: court.value?.requirePrepayment,
      usingFreeSlots
    });

    // Use the raw date string (YYYY-MM-DD) directly from bookingDetails
    const dateToSend = bookingDetails.value.date;
    if (!dateToSend || !/\d{4}-\d{2}-\d{2}/.test(dateToSend)) {
        log('ERROR', context, 'Invalid or missing date in bookingDetails.', { date: dateToSend });
        alert('Invalid date selected. Please try again.');
        isProcessingBooking.value = false;
        return;
    }

    // Check if slots are selected
    if (!bookingDetails.value.slots || bookingDetails.value.slots.length === 0) {
      log('WARN', context, 'No time slots selected.');
      alert('No time slots selected. Please select at least one time slot.');
      isProcessingBooking.value = false;
      return;
    }

    // Determine start and end times from the selected slots
    const sortedSlots = [...bookingDetails.value.slots].sort((a, b) => a.time.localeCompare(b.time));
    const firstSlot = sortedSlots[0];
    const lastSlot = sortedSlots[sortedSlots.length - 1];

    const calculateEndTime = (startTime) => {
      const [hours, minutes] = startTime.split(':').map(Number);
      const endMinutes = (hours * 60 + minutes + 60) % (24 * 60); // Add 60 minutes, wrap around midnight if needed
      return `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;    
    };

    const startTime = firstSlot?.time || null;
    const endTime = lastSlot?.time ? calculateEndTime(lastSlot.time) : null;

    if (!startTime || !endTime) {
      log('ERROR', context, 'Could not determine valid start/end time from selected slots.', { slots: bookingDetails.value.slots });
      alert('Could not determine booking time. Please try again or select different time slots.');
      isProcessingBooking.value = false;
      return;
    }

    const bookingData = {
      courtId: route.params.id,
      date: dateToSend,
      startTime: startTime,
      endTime: endTime,
      selectedSlotsDetail: bookingDetails.value.slots.map(s => ({ time: s.time, rate: s.rate })), 
      paymentMethod: paymentMethod,
      totalAmount: bookingDetails.value.totalAmount,
      totalPointsCost: bookingDetails.value.totalPointsCost,
      userDetails: {
        name: localStorage.getItem('username') || '',
        email: localStorage.getItem('email') || '',
        phone: localStorage.getItem('phone') || ''
      },
      // Add specific flag for free slot usage
      isSlotFree: paymentMethod === 'offline' && (usingFreeSlots || bookingDetails.value.usingFreeSlots),
      freeBookingsRemaining: bookingDetails.value.freeBookingsRemaining
    };

    log('INFO', context, 'Sending booking request to backend.', bookingData);

    // --- Call Backend Booking Endpoint using fetchData --- 
    try {
      // Use fetchData for the POST request
      const responseData = await fetchData('/api/bookings', {
          method: 'POST',
          body: JSON.stringify(bookingData)
          // Headers handled by useApi
      });

      log('INFO', context, 'Received response from backend /api/bookings.', responseData);
      
      // Add detailed debugging for Khalti payment flow
      if (paymentMethod === 'khalti') {
        log('DEBUG', context, 'Checking Khalti payment redirect conditions:', { 
          hasPaymentUrl: !!responseData.paymentUrl,
          paymentUrl: responseData.paymentUrl,
          isFreeBooking: bookingDetails.value.isFreeBooking,
          requiresPrepayment: court.value?.requirePrepayment
        });

        // If we're trying to pay with Khalti but didn't get a payment URL, log error
        if (!responseData.paymentUrl) {
          log('ERROR', context, 'Missing Khalti payment URL in response. Backend may not be properly initiating Khalti payment.', responseData);
          alert('Error: Missing payment URL for Khalti. Please try a different payment method or contact support.');
          isProcessingBooking.value = false;
          return; // Exit early to prevent unexpected behavior
        }
      }

      // --- Handle Backend Response --- 
      // Status check needs adjustment as fetchData throws on non-ok status
      // If code reaches here, the request was successful (status 2xx)
      
      if (paymentMethod === 'khalti' && responseData.paymentUrl) {
        // --- Payment Required: Redirect to Khalti --- 
        log('INFO', context, `Payment required. Redirecting to Khalti for BookingID: ${responseData.bookingId}, OrderID: ${responseData.purchaseOrderId}`);
        // Show alert with more info about the redirection
        alert(`Redirecting to Khalti payment gateway for ${bookingDetails.value.isFreeBooking ? 'optional prepayment' : 'required payment'}...`);
        
        // Add a small delay to ensure the alert is seen before redirect
        setTimeout(() => {
          console.log('[REDIRECT] Navigating to Khalti payment URL:', responseData.paymentUrl);
          window.location.href = responseData.paymentUrl;
        }, 500);
      } else if (paymentMethod === 'points') {
        // --- Points Payment Confirmed --- 
        log('INFO', context, `Booking confirmed and paid with points. BookingID: ${responseData.booking?._id || responseData._id}`);
        alert('Booking confirmed and paid with points!'); // Use toast
        showBookingModal.value = false;
        bookingDetails.value = null;
        bookingSectionRef.value?.refreshBookingData(); // Refresh slots
        router.push('/my-bookings'); // Navigate to bookings page
      } else if (paymentMethod === 'physical' || paymentMethod === 'free') {
        // --- Free Booking Confirmed Directly --- 
        const paymentInfo = paymentMethod === 'free' ? 'Free Slot' : 'Pay at Venue';
        log('INFO', context, `Booking confirmed directly by backend (${paymentInfo}). BookingID: ${responseData.booking?._id || responseData.bookingId || responseData._id}`);
        alert(`Booking confirmed successfully! (${paymentInfo})`); // Use toast
        showBookingModal.value = false;
        bookingDetails.value = null;
        bookingSectionRef.value?.refreshBookingData(); // Refresh slots
        router.push('/my-bookings'); // Navigate to bookings page
      } else {
        // --- Default Case for Unknown Payment Method --- 
        log('INFO', context, `Booking processed with unknown payment method: ${paymentMethod}. BookingID: ${responseData.booking?._id || responseData.bookingId || responseData._id}`);
        alert('Booking processed successfully!'); // Use toast
        showBookingModal.value = false;
        bookingDetails.value = null;
        
        // Ensure the booking section is fully refreshed
        bookingSectionRef.value?.refreshBookingData(); // Refresh slots
        
        router.push('/my-bookings'); // Navigate to bookings page
      }

    } catch (error) {
      // Error is caught by the outer try-catch, useApi sets apiError
      const errorMsg = apiError.value || error.message || 'Failed to create booking.';
      log('ERROR', context, 'Error creating booking via backend API.', { error: errorMsg });
      alert('Unable to complete booking: ' + errorMsg);
    } 
    // --- End Backend Call --- 

  } catch (error) {
    // Catch errors from date formatting, slot checking etc.
    log('ERROR', context, 'Error during booking confirmation process.', { message: error.message, stack: error.stack });
    alert('An error occurred during the booking process. Please try again.');
  } finally {
    isProcessingBooking.value = false; // Reset specific loading state
  }
}

const closeBookingModal = () => {
  showBookingModal.value = false
  bookingDetails.value = null
}

// Watch for payment success query parameter
watch(
  () => route.query.paymentSuccess,
  (newVal) => {
    if (newVal === 'true') {
      console.log('[PlayerCourtDetails] Detected paymentSuccess query param. Refreshing booking data...');
      // Call the refresh method on the child component
      bookingSectionRef.value?.refreshBookingData();
      
      // Remove the query parameter from the URL without reloading the page
      router.replace({ query: { ...route.query, paymentSuccess: undefined } });
      console.log('Booking confirmed! (Toast removed)'); // Add a console log instead
    }
  },
  { immediate: true } // Check immediately when component loads
)

// Initialize component
onMounted(() => {
  fetchCourtDetails()
})
</script>