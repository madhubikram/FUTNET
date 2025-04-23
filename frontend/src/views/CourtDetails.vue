<template>
    <div class="min-h-screen bg-gray-900 p-8">
      <div class="max-w-4xl mx-auto">
        <!-- Back Button -->
         <button 
            @click="router.back()" 
            class="mb-6 inline-flex items-center gap-2 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors text-sm"
          >
            <ArrowLeftIcon class="w-4 h-4" />
            Back
          </button>
          
        <!-- Loading State -->
        <div v-if="loading" class="flex justify-center items-center h-64">
          <div class="text-white">Loading court details...</div>
        </div>
  
        <!-- Error State -->
        <div v-else-if="error" class="bg-red-500/10 text-red-400 p-6 rounded-xl">
          {{ error }}
        </div>
  
        <!-- Court Content -->
        <template v-else-if="court">
          <!-- Court Header -->
          <div class="bg-gray-800 rounded-xl overflow-hidden mb-6">
            <!-- Image Gallery -->
            <div class="relative h-80">
              <img 
                :src="court.images && court.images.length > 0 ? getAssetUrl(court.images[0]) : '/placeholder-court.jpg'"
                :alt="court.name"
                class="w-full h-full object-cover"
              >
            </div>
  
            <!-- Court Information -->
            <div class="p-6">
              <h1 class="text-2xl font-bold text-white mb-4">{{ court.name }}</h1>
              
              <div class="grid grid-cols-2 gap-6">
                <!-- Details -->
                <div class="space-y-4">
                  <div>
                    <h3 class="text-gray-400 text-sm">Dimensions</h3>
                    <p class="text-white">{{ court.dimensionLength }} x {{ court.dimensionWidth }} ft</p>
                  </div>
                  <div>
                    <h3 class="text-gray-400 text-sm">Surface Type</h3>
                    <p class="text-white">{{ court.surfaceType }}</p>
                  </div>
                  <div>
                    <h3 class="text-gray-400 text-sm">Type</h3>
                    <p class="text-white">{{ court.courtType }}</p>
                  </div>
                </div>
  
                <!-- Facilities -->
                <div>
                  <h3 class="text-gray-400 text-sm mb-3">Facilities</h3>
                  <div class="grid grid-cols-2 gap-2">
                    <div 
                      v-for="facility in activeFacilities" 
                      :key="facility.key"
                      class="flex items-center gap-2 text-white"
                    >
                      <CheckIcon class="w-4 h-4 text-green-400" />
                      {{ facility.name }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
  
          <!-- Ratings and Reviews -->
          <RatingsAndReviews 
            :reviews="court.reviews || []"
            :current-user-id="currentUserId"
            :can-add-review="canAddReview"
            @review-submitted="handleReviewSubmit"
            @reply-to-review="handleReplyToReview"
            @submit-reply="handleSubmitReply"
            @update-reply="handleUpdateReply"
            @delete-reply="handleDeleteReply"
          />
        </template>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted, computed } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { CheckIcon, ArrowLeftIcon } from 'lucide-vue-next'
  import RatingsAndReviews from '@/components/RatingsAndReviews.vue'
  import API_URL, { getAssetUrl } from '@/config/api'
  // NOTE: Using a proper JWT decoding library (like jwt-decode) is recommended.

  const route = useRoute()
  const router = useRouter()
  const court = ref(null)
  const loading = ref(true)
  const error = ref(null)
  const canAddReview = ref(false)

  // Get current user ID from token
  const currentUserId = computed(() => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
      // Basic JWT payload decoding (use a library like jwt-decode in production!)
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      const decoded = JSON.parse(jsonPayload);
      // *** IMPORTANT: Ensure 'userId' is the correct key in YOUR JWT payload ***
      return decoded.userId; 

    } catch (e) {
      console.error("Error decoding JWT:", e);
      return null;
    }
  });
  
  // Fetch court details and determine if user can review
  onMounted(async () => {
    try {
        loading.value = true;
        error.value = null;
        const courtId = route.params.id;
        
        const response = await fetch(`${API_URL}/api/courts/${courtId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to fetch court details');
        }

        court.value = await response.json();
        
    } catch (err) {
        console.error('Error fetching court:', err);
        error.value = err.message;
    } finally {
        loading.value = false;
    }
});

const loadCourtDetails = async () => {
    try {
        loading.value = true;
        error.value = null;
        const courtId = route.params.id;
        
        console.log('Attempting to fetch court:', courtId);
        
        const response = await fetch(`${API_URL}/api/courts/${courtId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Accept': 'application/json'
            }
        });

        console.log('Response status:', response.status);
        
        // Get the response data
        const data = await response.json();
        
        // Check if response was not successful
        if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch court details');
        }

        // If we get here, data contains our court information
        court.value = data;
        console.log('Successfully loaded court:', court.value);

    } catch (err) {
        console.error('Error fetching court:', err);
        error.value = err.message || 'Failed to load court details';
    } finally {
        loading.value = false;
    }
};

// Call the function on component mount
onMounted(() => {
    loadCourtDetails();
});
  
  const activeFacilities = computed(() => {
    if (!court.value?.facilities) return []
    
    return Object.entries(court.value.facilities)
      .filter(([, value]) => value)
      .map(([key]) => ({
        key,
        name: formatFacilityName(key)
      }))
  })
  
  const formatFacilityName = (key) => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .toLowerCase()
      .replace(/^./, str => str.toUpperCase())
  }
  
  const handleReviewSubmit = async (review) => {
    try {
      const response = await fetch(`${API_URL}/api/courts/${route.params.id}/reviews`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(review)
      })
      
      if (!response.ok) {
        throw new Error('Failed to submit review')
      }
  
      // Refresh court data to show new review
      const updatedCourt = await response.json()
      court.value = updatedCourt
    } catch (error) {
      console.error('Error submitting review:', error)
    }
  }
  
  const handleReplyToReview = (reviewId) => {
    console.log('Reply clicked for review:', reviewId);
    // This function might now just toggle the UI state managed within RatingsAndReviews
    // Or it could be removed if RatingsAndReviews handles its own toggle state.
  };

  // Handler for submitting the reply
  const handleSubmitReply = async ({ reviewId, text }) => {
    console.log(`Submitting reply for review ${reviewId}:`, text);
    try {
       const response = await fetch(`${API_URL}/api/courts/${route.params.id}/reviews/${reviewId}/replies`, {
          method: 'POST',
          headers: {
             'Authorization': `Bearer ${localStorage.getItem('token')}`,
             'Content-Type': 'application/json'
          },
          body: JSON.stringify({ text })
       });

       if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to submit reply');
       }

       // Refresh court data to show the new reply
       // Assuming the API returns the updated court data
       const updatedCourt = await response.json();
       court.value = updatedCourt; 
       
       // TODO: Potentially close the reply input in RatingsAndReviews
       // This might require adding a method to RatingsAndReviews and calling it via a ref,
       // or having RatingsAndReviews close itself upon successful submission.
       console.log('Reply submitted successfully');
       // Optionally show a success toast

    } catch (error) {
       console.error('Error submitting reply:', error);
       // Optionally show an error toast
    }
  };

  // Handler for updating a reply
  const handleUpdateReply = async ({ reviewId, replyId, text }) => {
    console.log(`Updating reply ${replyId} for review ${reviewId}:`, text);
    try {
      const response = await fetch(`${API_URL}/api/courts/${route.params.id}/reviews/${reviewId}/replies/${replyId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update reply');
      }
      // Refresh court data using the consistent loadCourtDetails function
      console.log('Reply updated successfully, refreshing court details...');
      await loadCourtDetails(); 
      // Optionally show success toast

    } catch (error) {
      console.error('Error updating reply:', error);
      // Optionally show error toast
    }
  };

  // Handler for deleting a reply
  const handleDeleteReply = async ({ reviewId, replyId }) => {
    console.log(`[Frontend handleDeleteReply] Initiating delete for review ${reviewId}, reply ${replyId}`);
    try {
      const response = await fetch(`${API_URL}/api/courts/${route.params.id}/reviews/${reviewId}/replies/${replyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      console.log('[Frontend handleDeleteReply] Received response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response' }));
        console.error('[Frontend handleDeleteReply] Delete failed with status:', response.status, 'Data:', errorData);
        throw new Error(errorData.message || 'Failed to delete reply');
      }
      
      // Optional: Log the success response data if backend sends it
      try {
          const successData = await response.json();
          console.log('[Frontend handleDeleteReply] Delete successful. Response data:', successData);
      } catch /* (e) */ {
          console.log('[Frontend handleDeleteReply] Delete successful. No JSON body in response.');
      }

      // Refresh court data to show the updated replies list
      console.log('[Frontend handleDeleteReply] Reply deleted successfully via API, refreshing court details...');
      await loadCourtDetails();

    } catch (error) {
      console.error('Error deleting reply:', error);
      // Optionally: show an error message to the user
      // error.value = `Error deleting reply: ${error.message}`;
    }
  };
  </script>