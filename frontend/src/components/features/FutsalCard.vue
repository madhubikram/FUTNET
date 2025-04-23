<template>
  <div
    class="relative bg-gray-800/80 backdrop-blur-sm rounded-xl overflow-hidden border border-gray-700 transition-all duration-300 hover:shadow-[0_0_25px_rgba(34,197,94,0.2)] hover:border-green-500/30 group cursor-pointer flex flex-col"
    @click="navigateToDetails"
  >
    <!-- IMAGE SECTION -->
    <div class="relative h-[200px] overflow-hidden">
      <img
        :src="futsal.images?.[0] || '/placeholder-futsal.jpg'"
        :alt="futsal.futsalName + ' / ' + futsal.courtName"
        class="w-full h-full object-cover transition-all duration-700 group-hover:scale-105 group-hover:filter group-hover:brightness-110"
      >
      <div class="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/10 to-transparent"></div>

      <!-- RATING & DISTANCE BADGES -->
 <!-- Minimal Yet Elegant Badges Section -->
<div
  class="absolute top-2.5 right-2.5 flex gap-1.5 transform group-hover:translate-y-0 transition-all duration-200"
>
  <!-- Star / Rating Badge - Minimal -->
  <div class="relative">
    <!-- Subtle glow effect -->
    <span
      class="absolute inset-0 bg-amber-400/20 rounded-full blur-sm group-hover:blur-md group-hover:bg-amber-400/30 transition-all duration-200"
    ></span>
    <!-- Badge content -->
    <span
      class="relative px-1.5 py-0.5 bg-black/70 rounded-full text-xs font-medium shadow-sm backdrop-blur-sm flex items-center gap-0.5 border border-amber-300/20 group-hover:bg-black/80 transition-all duration-200"
    >
      <StarIcon class="w-3 h-3 text-amber-400" />
      <span class="text-amber-100">{{ futsal.rating }}</span>
    </span>
  </div>

  <!-- Distance Badge - Minimal -->
  <div class="relative">
    <!-- Subtle glow effect -->
    <span
      class="absolute inset-0 bg-sky-400/20 rounded-full blur-sm group-hover:blur-md transition-all duration-200"
    ></span>
    <!-- Badge content -->
    <span
      class="relative px-1.5 py-0.5 bg-black/70 rounded-full text-xs font-medium shadow-sm backdrop-blur-sm flex items-center gap-0.5 border border-sky-300/20 group-hover:bg-black/80 transition-all duration-200"
    >
      <MapPinIcon class="w-3 h-3 text-emerald-400" />
      <span class="text-gray-100">{{ formattedDistance }}</span>
    </span>
  </div>
</div>

      <!-- TITLE & FAVORITE ICON -->
      <div class="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-gray-900 to-transparent">
        <div class="flex justify-between items-center">
          <div>
            <!-- DYNAMIC FUTSAL/COURT NAME -->
            <h3
              class="text-base font-semibold text-white group-hover:text-green-400 transition-colors duration-300"
            >
              {{ futsal.futsalName }} / {{ futsal.courtName }}
            </h3>
            <span class="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 text-xs rounded-full border border-indigo-500/20">
              {{ futsal.courtSide }} Side
            </span>
            <!-- LOCATION -->
            <p class="text-xs text-gray-400 flex items-center gap-0.5">
              <MapPinIcon class="w-2 h-2" />
              {{ futsal.location }}
            </p>
          </div>

          <!-- FAVORITE BUTTON -->
          <button
            @click.stop="toggleFavorite"
            class="relative p-1.5 text-gray-400 hover:text-red-400 transition-colors"
          >
            <span
              class="absolute inset-0 bg-red-500/20 rounded-full scale-0 group-hover:scale-100 transition-transform duration-300"
            ></span>
            <HeartIcon
              class="w-4 h-4 relative"
              :class="{ 'fill-red-400 text-red-400': futsal.isFavorite }"
            />
          </button>
        </div>
      </div>
    </div>
    <!-- PREPAYMENT LABEL -->
    <div
      class="px-3 py-1 text-xs font-medium"
      :class="futsal.prepaymentRequired ? 'text-yellow-400' : 'text-gray-400'"
    >
      <span v-if="futsal.prepaymentRequired">Prepayment Required</span>
      <span v-else>No Prepayment Required</span>
    </div>

    <!-- PRICING & BOOKING SECTION -->
    <div class="p-2 bg-gray-800/95">
      <div class="grid grid-cols-2 gap-2">
        <!-- CURRENT RATE -->
        <div v-if="isWithinOperatingHours"
          class="price-box-sm bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-400/30"
        >
          <div class="flex justify-between items-start mb-0.5">
            <span class="text-[0.6rem] text-green-300">Current Rate</span>
            <span
              class="text-[0.5rem] px-1 bg-green-400/20 text-green-300 rounded-sm"
            >
              LIVE
            </span>
          </div>
          <div class="text-base font-bold text-green-400">
            Rs. {{ getCurrentPrice }}
          </div>
        </div>
        <div v-else
          class="price-box-sm bg-gray-700/50 border border-gray-600/20"
        >
          <div class="flex justify-between items-start mb-0.5">
            <span class="text-[0.6rem] text-gray-400">No Current Rate</span>
          </div>
          <div v-if="futsal.operatingHours?.opening" class="text-xs text-gray-400">
            Opens at {{ formatTimeForDisplay(futsal.operatingHours?.opening) }}
          </div>
          <div v-else class="text-xs text-gray-400">
            Operating hours unavailable
          </div>
        </div>

        <!-- PEAK HOURS -->
        <div
          class="price-box-sm bg-blue-500/10 border border-blue-400/20"
        >
          <div class="flex justify-between items-start mb-0.5">
            <span class="text-[0.6rem] text-blue-300">Peak Hours</span>
            <span v-if="futsal.peakHours?.start && futsal.peakHours?.end" class="text-[0.5rem] text-blue-300">
              {{ formatTimeRange(futsal.peakHours?.start, futsal.peakHours?.end) }}
            </span>
            <span v-else class="text-[0.5rem] text-blue-300">
              Not set
            </span>
          </div>
          <div class="text-xs font-semibold text-blue-300">
            Rs. {{ futsal.peakPrice || futsal.regularPrice || 'N/A' }}
          </div>
        </div>

        <!-- NORMAL HOURS -->
        <div
          class="price-box-sm bg-gray-700/30 border border-gray-600/20"
        >
          <div class="flex justify-between items-start mb-0.5">
            <span class="text-[0.6rem] text-gray-300">Normal Hours</span>
          </div>
          <div class="text-xs font-semibold text-gray-300">
            Rs. {{ futsal.regularPrice || 'N/A' }}
          </div>
        </div>

        <!-- OFF-PEAK HOURS -->
        <div
          class="price-box-sm bg-purple-500/10 border border-purple-400/20"
        >
          <div class="flex justify-between items-start mb-0.5">
            <span class="text-[0.6rem] text-purple-300">Off-Peak</span>
            <span v-if="futsal.offPeakHours?.start && futsal.offPeakHours?.end" class="text-[0.5rem] text-purple-300">
              {{ formatTimeRange(futsal.offPeakHours?.start, futsal.offPeakHours?.end) }}
            </span>
            <span v-else class="text-[0.5rem] text-purple-300">
              Not set
            </span>
          </div>
          <div class="text-xs font-semibold text-purple-300">
            Rs. {{ futsal.offPeakPrice || futsal.regularPrice || 'N/A' }}
          </div>
        </div>
      </div>
      
      <!-- AVAILABILITY SECTION - FIXED VERSION -->
      <div class="mt-2 px-2 pb-2">
        <div class="flex justify-between items-center">
          <span class="text-xs text-gray-400">Availability Today:</span>
          <span 
            v-if="futsal.availableSlots && Array.isArray(futsal.availableSlots) && futsal.availableSlots.length > 0" 
            class="text-xs text-green-400"
          >
            {{ futsal.availableSlots.length }} slot{{ futsal.availableSlots.length !== 1 ? 's' : '' }} available
          </span>
          <span v-else class="text-xs text-yellow-400">
            No slots available
          </span>
        </div>
      </div>

      <!-- BOOK NOW BUTTON -->
      <button
        @click.stop="handleBooking"
        class="w-full mt-2 px-3 py-1.5 bg-gradient-to-r from-green-500 to-green-600 text-sm font-semibold text-black rounded-lg shadow-sm transition-all duration-300 flex items-center justify-center gap-1.5 hover:shadow-md hover:shadow-green-500/30 hover:-translate-y-0.5 active:scale-95"
      >
        <CalendarIcon class="w-3 h-3 transition-transform group-hover:scale-110" />
        <span class="drop-shadow-sm text-xs">Book Now</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { StarIcon, MapPinIcon, HeartIcon, CalendarIcon } from 'lucide-vue-next'

const router = useRouter()

const props = defineProps({
  futsal: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['book', 'toggleFavorite'])

// Format Distance
const formattedDistance = computed(() => {
  const dist = props.futsal.distance; // Get the calculated distance (or null)
  if (dist !== null && dist !== undefined && !isNaN(dist)) {
    // If distance is a valid number, format it
    return `${dist.toFixed(1)} km`;
  }
  // If distance is null/undefined/NaN, check if coordinates were available
  if (props.futsal.coordinates) {
     // Coordinates exist, but calculation failed or user location missing
     return 'N/A';
  }
  // No coordinates provided for the futsal
  return 'Unknown';
});

// Log availability information for debugging
onMounted(() => {
  if (props.futsal) {
    console.log(`[${props.futsal.futsalName} / ${props.futsal.courtName}] Availability & Location Debug:`, {
      distanceProp: props.futsal.distance,
      coordinatesProp: props.futsal.coordinates,
      hasAvailableSlots: props.futsal.availableSlots && Array.isArray(props.futsal.availableSlots),
      totalSlots: props.futsal.availableSlots ? props.futsal.availableSlots.length : 0,
      operatingHours: {
        opening: props.futsal.operatingHours?.opening || 'undefined',
        closing: props.futsal.operatingHours?.closing || 'undefined'
      },
      peakHours: props.futsal.peakHours || 'none',
      offPeakHours: props.futsal.offPeakHours || 'none'
    });
  }
});

// Format time range (Peak / Off-Peak Hours)
const formatTimeRange = (startTime, endTime) => {
  if (!startTime || !endTime) return ''

  const formattedStartTime = new Date(`2000-01-01T${startTime}`).toLocaleTimeString('en-US', {
    hour: 'numeric',
    hour12: true,
    hourCycle: 'h12'
  }).replace(' ', '')

  const formattedEndTime = new Date(`2000-01-01T${endTime}`).toLocaleTimeString('en-US', {
    hour: 'numeric',
    hour12: true,
    hourCycle: 'h12'
  }).replace(' ', '')

  return `${formattedStartTime} - ${formattedEndTime}`
}

// Format time for display (e.g., Opens at 9AM)
const formatTimeForDisplay = (timeString) => {
  if (!timeString) return 'N/A';
  return new Date(`1970-01-01T${timeString}`).toLocaleTimeString('en-US', {
    hour: 'numeric',
    // minute: '2-digit',
    hour12: true
  }).replace(' ', ''); // Remove space before AM/PM
};


const isWithinOperatingHours = computed(() => {
  if (!props.futsal.operatingHours?.opening || !props.futsal.operatingHours?.closing) {
    console.log(`[${props.futsal.futsalName}] Missing operating hours, cannot check if open.`);
    return false; // Can't determine if missing
  }
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  const openingTime = timeToMinutes(props.futsal.operatingHours.opening);
  const closingTime = timeToMinutes(props.futsal.operatingHours.closing);

  if (isNaN(openingTime) || isNaN(closingTime)) {
      console.error(`[${props.futsal.futsalName}] Invalid time format in operating hours`, props.futsal.operatingHours);
      return false;
  }

  let isOpen = false;
  if (openingTime <= closingTime) {
    // Normal day range (e.g., 9 AM to 9 PM)
    isOpen = currentTime >= openingTime && currentTime < closingTime;
  } else {
    // Overnight range (e.g., 8 PM to 6 AM)
    isOpen = currentTime >= openingTime || currentTime < closingTime;
  }

  console.log(`[${props.futsal.futsalName}] Time Check: Now=${currentTime}, Open=${openingTime}, Close=${closingTime}, IsOpen=${isOpen}`);
  return isOpen;
});

// Helper to convert HH:MM to minutes
const timeToMinutes = (timeString) => {
    if (!timeString || typeof timeString !== 'string') return NaN;
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
};


const getCurrentPrice = computed(() => {
  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 5); // HH:mm format

  if (props.futsal.peakHours?.start && props.futsal.peakHours?.end && 
      isTimeInRange(currentTime, props.futsal.peakHours.start, props.futsal.peakHours.end)) {
    return props.futsal.peakPrice || props.futsal.regularPrice || 'N/A';
  }
  
  if (props.futsal.offPeakHours?.start && props.futsal.offPeakHours?.end && 
      isTimeInRange(currentTime, props.futsal.offPeakHours.start, props.futsal.offPeakHours.end)) {
    return props.futsal.offPeakPrice || props.futsal.regularPrice || 'N/A';
  }
  
  return props.futsal.regularPrice || 'N/A';
});

// Helper function used by getCurrentPrice
const isTimeInRange = (currentTime, startTime, endTime) => {
    if (!startTime || !endTime) return false;
    const currentMinutes = timeToMinutes(currentTime);
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);

    if (startMinutes <= endMinutes) { // Normal range
        return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    } else { // Overnight range
        return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
};


// Navigate to futsal details page
const navigateToDetails = () => {
  router.push({ name: 'playerCourtDetails', params: { id: props.futsal.id } })
}

// Emit booking event
const handleBooking = () => {
  emit('book', props.futsal)
}

// Emit toggle favorite event
const toggleFavorite = () => {
  emit('toggleFavorite', props.futsal)
}
</script>

<style scoped>
/* Consistent price box styling - small variant */
.price-box-sm {
  @apply p-2 rounded-lg;
  height: 3rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

/* Smooth transitions */
.transition-all {
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
