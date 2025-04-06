<template>
  <div class="min-h-screen bg-gray-900 flex items-center justify-center p-4">
    <div class="w-full max-w-7xl bg-gray-800 rounded-xl shadow-xl overflow-hidden">
      <div class="bg-gray-800 border-b border-gray-700 px-6 py-4">  <h1 class="text-2xl font-bold text-white text-left">       Complete Your Futsal Profile
        </h1>
        <p class="text-gray-400 text-sm mt-1">                  You can change these settings later in your profile section.
        </p>
      </div>
      <form @submit.prevent="handleSubmit" class="p-6 space-y-6">
        <div>
          <label class="block text-sm font-medium text-gray-200 mb-2">
            Futsal Description
          </label>
          <textarea
            v-model="formData.description"
            rows="3"
            class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
            placeholder="Describe your futsal facility, amenities, and any special features..."
          ></textarea>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label class="block text-sm font-medium text-gray-200 mb-2">Opening Time</label>
            <input
              type="time"
              v-model="formData.openingTime"
              class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:outline-none transition-colors duration-300"
              required
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-200 mb-2">Closing Time</label>
            <input
              type="time"
              v-model="formData.closingTime"
              class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:outline-none transition-colors duration-300"
              required
            />
          </div>
        </div>
        <p v-if="timeErrorMessage" class="text-sm text-red-400">{{ timeErrorMessage }}</p>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="h-48 lg:h-56 bg-gray-700 rounded-lg overflow-hidden">
            <MapComponent
              :initial-location="initialLocation"
              @location-selected="handleLocationSelected"
            />
          </div>
          <div class="bg-gray-700 p-4 rounded-lg">
            <h3 class="text-white font-medium mb-2">Selected Location Details</h3>
            <div v-if="selectedLocation" class="space-y-2">
              <div>
                <p class="text-gray-300 text-sm font-medium">Address:</p>
                <p class="text-gray-400 text-sm">{{ selectedLocation.address }}</p>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <p class="text-gray-300 text-sm font-medium">Latitude:</p>
                  <p class="text-gray-400 text-sm">{{ selectedLocation.lat.toFixed(6) }}</p>
                </div>
                <div>
                  <p class="text-gray-300 text-sm font-medium">Longitude:</p>
                  <p class="text-gray-400 text-sm">{{ selectedLocation.lng.toFixed(6) }}</p>
                </div>
              </div>
            </div>
            <div v-else class="text-gray-400 text-sm">
              Click on the map or search for a location to select your futsal's position.
            </div>
          </div>
        </div>

        <div class="flex justify-end">
          <BaseButton
            type="submit"
            :loading="isSubmitting"
            :disabled="!selectedLocation || !isValidTimes"
            variant="primary"
          >
            Complete Profile
          </BaseButton>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useNotification } from '@/composables/useNotification'
import { BaseButton } from '@/components/base'
import MapComponent from '@/components/MapComponent.vue'

const router = useRouter()
const { addNotification } = useNotification()

// Form State
const formData = ref({
  description: '',
  location: null,
  openingTime: '',
  closingTime: ''
})
const isSubmitting = ref(false)
const selectedLocation = ref(null)
const initialLocation = { lat: 27.7172, lng: 85.3240 }
// **Removed `timeError` ref - no longer needed**

// Validate Operating Hours (Returns boolean only - NO side effects)
const isValidTimes = computed(() => {
  if (!formData.value.openingTime || !formData.value.closingTime) {
    return false
  }
  const openTime = new Date(`2000-01-01T${formData.value.openingTime}`)
  const closeTime = new Date(`2000-01-01T${formData.value.closingTime}`)
  return closeTime > openTime; // **Returns boolean only**
})

// Computed property for the time error message (NO side effects)
const timeErrorMessage = computed(() => {
  if (!formData.value.openingTime || !formData.value.closingTime) {
    return ''; // No error message if times are not set
  }
  const openTime = new Date(`2000-01-01T${formData.value.openingTime}`)
  const closeTime = new Date(`2000-01-01T${formData.value.closingTime}`)
  if (closeTime <= openTime) {
    return 'Closing time must be after opening time'; // Returns error message string
  }
  return ''; // No error message
});

// Handle location selection from map
const handleLocationSelected = (location) => {
  console.log('Received location-selected event in ProfileCompletion:', location);
  selectedLocation.value = location
  formData.value.location = {
    address: location.address,
    lat: location.lat,
    lng: location.lng
  }
}

// Validate form before submission
const validateForm = () => {
  if (!formData.value.location) {
    addNotification('Please select a location on the map', 'error')
    return false
  }
  if (!formData.value.description.trim()) {
    addNotification('Please provide a description', 'error')
    return false
  }
  if (!isValidTimes.value) {
    addNotification(timeErrorMessage.value, 'error') // Use timeErrorMessage.value to show the message
    return false
  }
  return true
}

// Handle form submission
const handleSubmit = async () => {
  if (!validateForm()) return

  isSubmitting.value = true
  try {
    const response = await fetch('http://localhost:5000/api/futsal/profile', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        description: formData.value.description,
        location: formData.value.location,
        operatingHours: {
          opening: formData.value.openingTime,
          closing: formData.value.closingTime
        }
      })
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.message || 'Failed to save profile')
    }

    localStorage.setItem('profileCompleted', 'true')
    addNotification('Profile completed successfully', 'success')
    router.push('/admin-dashboard')
  } catch (error) {
    console.error('Error saving profile:', error)
    addNotification(error.message || 'Failed to save profile', 'error')
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => {
  // Commented out: Initial location setup is now handled by MapComponent's onMounted
  /* 
  selectedLocation.value = {
    lat: initialLocation.lat,
    lng: initialLocation.lng,
    address: "Loading address..."
  }
  formData.value.location = {
    lat: initialLocation.lat,
    lng: initialLocation.lng,
    address: "Loading address..."
  }
  */
})
</script>
<style scoped>
/* You can add additional custom styles here if needed */
</style>