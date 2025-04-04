// src/components/court-details/CourtInfo.vue

<template>
  <div class="space-y-8">
    <!-- Basic Court Information -->
    <section class="bg-gray-800 rounded-xl p-6">
      <h2 class="text-xl font-semibold text-white mb-4">Court Details</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div 
          v-for="detail in courtDetails" 
          :key="detail.label" 
          class="flex items-center gap-3 text-gray-300"
        >
          <component 
            :is="detail.icon" 
            class="w-5 h-5 text-green-400" 
            stroke="currentColor" 
            fill="none" 
          />
          <span>
            {{ detail.label }}: 
            <span class="text-white">{{ detail.value }}</span>
          </span>
        </div>
      </div>
    </section>

    <!-- Facilities Section -->
    <section class="bg-gray-800 rounded-xl p-6">
      <h2 class="text-xl font-semibold text-white mb-4">Facilities</h2>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div 
          v-for="facility in facilitiesList" 
          :key="facility.name"
          class="flex items-center gap-2 text-gray-300"
        >
          <component 
            :is="facility.available ? CheckCircleIcon : XCircleIcon"
            :class="facility.available ? 'text-green-400' : 'text-gray-500'"
            class="w-5 h-5" 
            stroke="currentColor" 
            fill="none" 
          />
          {{ facility.name }}
        </div>
      </div>
    </section>

    <!-- Pricing Information -->
    <section class="bg-gray-800 rounded-xl p-6">
      <h2 class="text-xl font-semibold text-white mb-4">Pricing</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Regular Hours -->
        <div class="p-4 bg-gray-700/50 rounded-lg">
          <h3 class="text-gray-300 mb-2">Regular Hours</h3>
          <p class="text-2xl font-bold text-white">
            Rs. {{ props.court.priceHourly }}/hr
          </p>
        </div>

        <!-- Peak Hours -->
        <div 
          v-if="props.court.hasPeakHours" 
          class="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20"
        >
          <h3 class="text-blue-300 mb-2">Peak Hours</h3>
          <p class="text-2xl font-bold text-white">
            Rs. {{ props.court.pricePeakHours }}/hr
          </p>
          <p class="text-sm text-blue-300 mt-1">
            {{ formatTimeRange(props.court.peakHours) }}
          </p>
        </div>

        <!-- Off-Peak Hours -->
        <div 
          v-if="props.court.hasOffPeakHours" 
          class="p-4 bg-purple-500/10 rounded-lg border border-purple-500/20"
        >
          <h3 class="text-purple-300 mb-2">Off-Peak Hours</h3>
          <p class="text-2xl font-bold text-white">
            Rs. {{ props.court.priceOffPeakHours }}/hr
          </p>
          <p class="text-sm text-purple-300 mt-1">
            {{ formatTimeRange(props.court.offPeakHours) }}
          </p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useTimeFormatting } from '@/composables/useTimeFormatting'
const { formatTimeRange } = useTimeFormatting()
import { 
  RulerIcon, UsersIcon, ClockIcon,
  CheckCircleIcon, XCircleIcon, LayersIcon, HomeIcon 
} from 'lucide-vue-next'

const props = defineProps({
  court: {
    type: Object,
    required: true
  }
})

// Computed property for court details
const courtDetails = computed(() => [
  {
    label: 'Dimensions',
    value: props.court.dimensionLength && props.court.dimensionWidth 
           ? `${props.court.dimensionLength} x ${props.court.dimensionWidth} ft`
           : props.court.dimensions || 'Not specified',
    icon: RulerIcon
  },
  {
    label: 'Surface Type',
    value: props.court.surfaceType || 'Not specified',
    icon: LayersIcon  // Add this import
  },
  {
    label: 'Court Type',
    value: props.court.courtType || 'Not specified',
    icon: HomeIcon  // Add this import
  },
  {
    label: 'Player Side',
    value: `${props.court.courtSide} Side`,
    icon: UsersIcon
  },
  {
    label: 'Operating Hours',
    value: formatTimeRange({
      start: props.court.futsalId?.operatingHours?.opening,
      end: props.court.futsalId?.operatingHours?.closing
    }),
    icon: ClockIcon
  }
])

// Computed property for facilities
const facilitiesList = computed(() => [
  {
    name: 'Changing Rooms',
    available: props.court.facilities?.changingRooms
  },
  {
    name: 'Lighting',
    available: props.court.facilities?.lighting
  },
  {
    name: 'Parking',
    available: props.court.facilities?.parking
  },
  {
    name: 'Shower',
    available: props.court.facilities?.shower
  }
])
</script>