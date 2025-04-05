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
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter  } from 'vue-router'
import PageLayout from '@/components/layout/PageLayout.vue'


// Import our new components
import MapComponent from '@/components/MapComponent.vue'
import ImageGallery from '@/components/court-details/ImageGallery.vue'
import CourtInfo from '@/components/court-details/CourtInfo.vue'
import ReviewSection from '@/components/court-details/ReviewSection.vue'
import BookingSection from '@/components/court-details/BookingSection.vue'
import BookingConfirmationModal from '@/components/court-details/BookingConfirmationModal.vue'

const route = useRoute()
const router = useRouter()

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
    img.startsWith('http') ? img : `http://localhost:5000${img}`
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
  try {
    loading.value = true
    error.value = null
    
    const response = await fetch(
      `http://localhost:5000/api/player/courts/${route.params.id}`,
      {
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        }
      }
    )
    
    if (!response.ok) {
      throw new Error('Failed to fetch court details')
    }
    
    const data = await response.json()
    
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
    }

  } catch (err) {
    console.error('Error fetching court:', err)
    error.value = err.message
  } finally {
    loading.value = false
  }
}

// Event Handlers for Review Section
const handleSubmitReview = async (reviewData) => {
  try {
    const response = await fetch(
      `http://localhost:5000/api/player/courts/${route.params.id}/reviews`,
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
      `http://localhost:5000/api/player/courts/${route.params.id}/reviews/${userReview.value._id}`,
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
      `http://localhost:5000/api/player/courts/${route.params.id}/reviews/${userReview.value._id}`,
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
      `http://localhost:5000/api/player/courts/${route.params.id}/reviews/${reviewId}/reactions`,
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

const handleConfirmBooking = async () => {
  try {
    isProcessingBooking.value = true;
    
    if (!court.value.requirePrepayment) {
      // Format the date to ISO format (YYYY-MM-DD)
      let formattedDate;
      try {
        if (typeof bookingDetails.value.date === 'string') {
          // Try to ensure it's a valid date string in YYYY-MM-DD format
          const parts = bookingDetails.value.date.split('-');
          if (parts.length === 3) {
            formattedDate = bookingDetails.value.date;
          } else {
            const date = new Date(bookingDetails.value.date);
            formattedDate = date.toISOString().split('T')[0];
          }
        } else if (bookingDetails.value.date instanceof Date) {
          formattedDate = bookingDetails.value.date.toISOString().split('T')[0];
        } else {
          // Fallback to today's date if we can't determine the date
          formattedDate = new Date().toISOString().split('T')[0];
        }
      } catch (dateError) {
        console.error('Error formatting date:', dateError);
        formattedDate = new Date().toISOString().split('T')[0]; // Use today as fallback
      }
      
      // Debug info to see the full structure of bookingDetails
      console.log('Full booking details:', JSON.stringify(bookingDetails.value, null, 2));
      
      // Check if at least one slot is selected
      if (!bookingDetails.value.slots || bookingDetails.value.slots.length === 0) {
        alert('No time slots selected. Please select at least one time slot.');
        isProcessingBooking.value = false;
        return;
      }
      
      // Get the first and last selected time slot
      const firstSlot = bookingDetails.value.slots[0];
      const lastSlot = bookingDetails.value.slots[bookingDetails.value.slots.length - 1];
      
      // Calculate end time (assuming 1-hour slots)
      const calculateEndTime = (startTime) => {
        const [hours, minutes] = startTime.split(':').map(Number);
        const totalMinutes = hours * 60 + minutes + 60; // Add 1 hour (60 minutes)
        const newHours = Math.floor(totalMinutes / 60);
        const newMinutes = totalMinutes % 60;
        return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
      };
      
      // If time slot doesn't have startTime/endTime properties, use the time property
      const startTime = firstSlot.startTime || firstSlot.time || null;
      let endTime;
      
      if (lastSlot.endTime) {
        endTime = lastSlot.endTime;
      } else if (lastSlot.time) {
        endTime = calculateEndTime(lastSlot.time);
      } else {
        endTime = null;
      }
      
      // Check if we have valid times
      if (!startTime || !endTime) {
        console.error('Invalid time slots:', bookingDetails.value.slots);
        alert('Could not determine booking time. Please try again or select different time slots.');
        isProcessingBooking.value = false;
        return;
      }
      
      const bookingData = {
        courtId: route.params.id,
        date: formattedDate,
        // Just send time strings as HH:MM - the backend will handle the conversion
        startTime: startTime,
        endTime: endTime,
        totalAmount: bookingDetails.value.totalAmount,
        requiresPayment: bookingDetails.value.requiresPayment,
        isSlotFree: !bookingDetails.value.requiresPayment,
        userDetails: {
          name: localStorage.getItem('username') || '',
          email: localStorage.getItem('email') || '',
          phone: localStorage.getItem('phone') || ''
        }
      };

      console.log('Sending booking data:', bookingData);

      try {
        const response = await fetch(
          'http://localhost:5000/api/bookings',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(bookingData)
          }
        );

        const responseText = await response.text();
        console.log('Response from booking API:', response.status, responseText);
        
        if (!response.ok) {
          let errorData = { message: 'Failed to create booking' };
          try {
            errorData = JSON.parse(responseText);
          } catch {
            // If not JSON, use the text as is
          }
          throw new Error(errorData.message || 'Failed to create booking');
        }
        
        const data = JSON.parse(responseText);
        console.log('Booking created successfully:', data);
        
        showBookingModal.value = false;
        bookingDetails.value = null;
        
        bookingSectionRef.value?.refreshBookingData();
        
        alert('Booking confirmed successfully! You can view your bookings in the Bookings section.');
        router.push('/bookings');
      } catch (error) {
        console.error('Error creating booking:', error);
        alert('Unable to complete booking: ' + error.message);
      }
    } else {
      console.log('Prepayment required - implementation pending');
      alert('For demo purposes: Prepayment will be required in the production version.');
    }
    
  } catch (error) {
    console.error('Error in booking process:', error);
    alert('An error occurred during the booking process. Please try again.');
  } finally {
    isProcessingBooking.value = false;
  }
}

const closeBookingModal = () => {
  showBookingModal.value = false
  bookingDetails.value = null
}

// Initialize component
onMounted(fetchCourtDetails)
</script>