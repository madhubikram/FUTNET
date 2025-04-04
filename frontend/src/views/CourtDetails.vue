<template>
    <div class="min-h-screen bg-gray-900 p-8">
      <div class="max-w-4xl mx-auto">
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
                :src="court.images && court.images.length > 0 
                  ? `http://localhost:5000${court.images[0]}` 
                  : '/placeholder-court.jpg'"
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
            :can-add-review="canAddReview"
            @review-submitted="handleReviewSubmit"
          />
        </template>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted, computed } from 'vue'
  import { useRoute } from 'vue-router'
  import { CheckIcon } from 'lucide-vue-next'
  import RatingsAndReviews from '@/components/RatingsAndReviews.vue'
  
  const route = useRoute()
  const court = ref(null)
  const loading = ref(true)
  const error = ref(null)
  const canAddReview = ref(false)
  
  // Fetch court details and determine if user can review
  onMounted(async () => {
    try {
        loading.value = true;
        error.value = null;
        const courtId = route.params.id;
        
        const response = await fetch(`http://localhost:5000/api/courts/${courtId}`, {
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
        
        const response = await fetch(`http://localhost:5000/api/courts/${courtId}`, {
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
      const response = await fetch(`http://localhost:5000/api/courts/${route.params.id}/reviews`, {
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
  </script>