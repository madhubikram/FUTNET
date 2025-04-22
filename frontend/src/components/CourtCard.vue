<template>
  <div class="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 transition-all duration-300 
              hover:shadow-[0_0_15px_rgba(34,197,94,0.3)] hover:border-green-500/50 group">
    <!-- Court Image Container with Better Aspect Ratio -->
    <div class="relative aspect-[16/9] overflow-hidden">
      <img 
        :src="court.images && court.images.length > 0 ? getAssetUrl(court.images[0]) : '/placeholder-court.jpg'" 
        :alt="court.name"
        class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      >
      <!-- Enhanced Gradient Overlay -->
      <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
      
      <!-- Status Badge with Enhanced Visibility -->
      <span :class="[
        'absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-semibold shadow-lg backdrop-blur-sm flex items-center gap-1 transition-transform duration-300 hover:scale-105',
        statusColorClass
      ]">
        <span class="w-2 h-2 rounded-full" :class="statusDotClass"></span>
        {{ court.status }}
      </span>

      <!-- Admin Actions - Always Visible -->
      <div v-if="showAdminControls" 
           class="absolute top-4 left-4 flex gap-2">
        <button 
          @click.stop="$emit('edit', court)"
          class="p-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg 
                 backdrop-blur-sm transition-all duration-200 hover:scale-105"
          title="Edit Court"
        >
          <EditIcon class="w-4 h-4" />
        </button>
        <button 
          @click.stop="$emit('delete', court._id)"
          class="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg 
                 backdrop-blur-sm transition-all duration-200 hover:scale-105"
          title="Delete Court"
        >
          <Trash2Icon class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Enhanced Court Details Section -->
    <div class="p-6">
      <h3 class="text-xl font-semibold text-white mb-4 group-hover:text-green-400 transition-colors duration-300">
        {{ court.name }}
        <span class="px-3 py-1 bg-indigo-500/20 text-indigo-400 text-xs rounded-full border border-indigo-500/20">
          {{ court.courtSide }} Side
        </span>
      </h3>
      
      <!-- New Section for Type and Dimensions -->
      <div class="flex justify-between items-center text-sm text-gray-400 mb-4">
        <div class="flex items-center gap-1.5">
           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-paint-roller"><path d="M16 5a2 2 0 0 0-2 2v10H6V7a2 2 0 0 0-2-2H2"/><path d="M18 9H6v11h12a2 2 0 0 0 2-2V11a2 2 0 0 0-2-2Z"/></svg> <!-- Simple Paint Roller Icon -->
          <span>{{ court.surfaceType }}</span>
        </div>
         <div class="flex items-center gap-1.5">
           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-maximize"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg> <!-- Maximize Icon -->
           <span>{{ court.dimensionLength }} x {{ court.dimensionWidth }} ft</span>
        </div>
      </div>

      <!-- Pricing Information with Enhanced Design -->
      <div class="space-y-3">
        <div class="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
          <span class="text-gray-300">Current Price</span>
          <span class="text-lg text-green-400 font-semibold">Rs {{ getCurrentPrice }}/hr</span>
        </div>

        <!-- Special Hours Pricing with Enhanced Styling -->
        <div v-if="court.hasPeakHours" 
             class="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
          <div class="flex justify-between items-center">
            <span class="text-blue-400">Peak Hours</span>
            <span class="font-semibold text-blue-300">Rs {{ court.pricePeakHours }}/hr</span>
          </div>
          <span class="text-blue-300/70 text-sm mt-1 block">
            {{ formatTime(court.peakHours.start) }} - {{ formatTime(court.peakHours.end) }}
          </span>
        </div>

        <div v-if="court.hasOffPeakHours" 
             class="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
          <div class="flex justify-between items-center">
            <span class="text-purple-400">Off-Peak Hours</span>
            <span class="font-semibold text-purple-300">Rs {{ court.priceOffPeakHours }}/hr</span>
          </div>
          <span class="text-purple-300/70 text-sm mt-1 block">
            {{ formatTime(court.offPeakHours.start) }} - {{ formatTime(court.offPeakHours.end) }}
          </span>
        </div>
      </div>

      <!-- Action Button -->
      <button 
        @click.stop="navigateToDetails"
        class="w-full mt-6 px-4 py-3 bg-green-500/10 text-green-400 rounded-lg 
               hover:bg-green-500/20 transition-all duration-300 flex items-center justify-center gap-2
               hover:scale-[1.02] active:scale-[0.98]"
      >
        <InfoIcon class="w-4 h-4" />
        View Details
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { InfoIcon, EditIcon, Trash2Icon } from 'lucide-vue-next'
import { getAssetUrl } from '@/config/api'

const router = useRouter()
const props = defineProps({
  court: {
    type: Object,
    required: true
  }
})

// Format time function
const formatTime = (time) => {
  if (!time) return ''
  try {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    })
  } catch (error) {
    console.error('Error formatting time:', error)
    return time
  }
}

// Helper function to check if time is within range
const isTimeInRange = (time, start, end) => {
  if (!start || !end) return false
  return time >= start && time <= end
}

// Determine current price type based on time
const getCurrentPriceType = computed(() => {
  const now = new Date()
  const currentTime = now.toTimeString().slice(0, 5) // HH:mm format

  if (props.court.hasPeakHours && 
      isTimeInRange(currentTime, props.court.peakHours.start, props.court.peakHours.end)) {
    return 'peak'
  }
  if (props.court.hasOffPeakHours && 
      isTimeInRange(currentTime, props.court.offPeakHours.start, props.court.offPeakHours.end)) {
    return 'offPeak'
  }
  return null
})

// Get current applicable price
const getCurrentPrice = computed(() => {
  switch (getCurrentPriceType.value) {
    case 'peak':
      return props.court.pricePeakHours
    case 'offPeak':
      return props.court.priceOffPeakHours
    default:
      return props.court.priceHourly
  }
})

// Updated status color classes for better visibility
const statusColorClass = computed(() => {
  return props.court.status === 'Active'
    ? 'bg-green-500 text-white'
    : props.court.status === 'Maintenance'
      ? 'bg-yellow-500 text-white'
      : props.court.status === 'Inactive'
        ? 'bg-red-500 text-white'
        : ''
})

const statusDotClass = computed(() => {
  return props.court.status === 'Active'
    ? 'bg-green-300'
    : props.court.status === 'Maintenance'
      ? 'bg-yellow-300'
      : props.court.status === 'Inactive'
        ? 'bg-red-300'
        : ''
})

// Show admin controls if the user role is futsalAdmin
const showAdminControls = computed(() => {
  const userRole = localStorage.getItem('userRole')
  return userRole === 'futsalAdmin'
})

// Navigation function
const navigateToDetails = () => {
  console.log('Navigating to court details:', props.court._id)
  router.push({
    name: 'courtDetails',
    params: { id: props.court._id.toString() }
  })
}
</script>
