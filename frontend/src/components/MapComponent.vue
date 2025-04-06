<template>
  <div class="relative w-full h-full">
    <LMap
      v-model:zoom="zoom"
      :center="center"
      :use-global-leaflet="false"
      class="h-full w-full"
      @ready="onMapReady"
    >
      <LTileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        :attribution="attribution"
      />

      <div class="absolute top-4 right-4 z-[1001] w-64" v-if="!props.hideSearch">
        <div class="relative">
          <input
            type="text"
            v-model="searchQuery"
            @input="handleSearch"
            placeholder="Search location..."
            class="search-input"
          />
          <div 
            v-if="searchResults.length > 0" 
            class="search-results"
          >
            <div
              v-for="result in searchResults"
              :key="result.place_id"
              @click.stop="selectSearchResult(result)"
              class="search-result-item"
            >
              {{ result.display_name }}
            </div>
          </div>
        </div>
      </div>

      <!-- Regular location marker -->
      <LMarker
        v-if="markerPosition"
        :lat-lng="markerPosition"
        :draggable="!readonly"
        @dragend="!readonly && handleMarkerDragend"
      >
        <LIcon :icon-url="'/futsal-marker.svg'" :icon-size="[32, 32]" />
        <LPopup>
          <div class="popup-content">
            <p class="font-medium">{{ readonly ? 'Tournament Location' : 'Selected Location' }}</p>
            <p class="text-sm mt-1">{{ selectedLocation?.address || 'Location selected' }}</p>
          </div>
        </LPopup>
      </LMarker>
      
      <!-- Futsal Markers -->
      <LMarker
        v-for="futsal in props.futsals"
        :key="futsal.id"
        :lat-lng="[futsal.coordinates.lat, futsal.coordinates.lng]"
        @click="handleFutsalClick(futsal)"
      >
        <LIcon :icon-url="getFutsalIcon(futsal)" :icon-size="[32, 32]" />
        <LPopup>
          <div class="popup-content">
            <p class="font-medium">{{ futsal.futsalName }}</p>
            <p class="text-sm mt-1">{{ futsal.location }}</p>
            <div class="flex items-center mt-2">
              <StarIcon class="w-4 h-4 text-yellow-400" />
              <span class="text-xs ml-1">{{ futsal.rating }} · {{ futsal.courts.length }} courts</span>
            </div>
            <button 
              @click="$emit('futsal-selected', futsal)" 
              class="mt-2 px-3 py-1 bg-green-500 text-white text-sm rounded"
            >
              View Details
            </button>
          </div>
        </LPopup>
      </LMarker>
    </LMap>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, onUnmounted } from 'vue'
import { LMap, LTileLayer, LMarker, LPopup, LIcon } from "@vue-leaflet/vue-leaflet"
import "leaflet/dist/leaflet.css"
import debounce from 'lodash/debounce'
import { StarIcon } from 'lucide-vue-next'

const props = defineProps({
  initialLocation: {
    type: Object,
    default: () => ({ lat: 27.7172, lng: 85.3240 })
  },
  readonly: {
    type: Boolean,
    default: false
  },
  hideSearch: {
    type: Boolean,
    default: false
  },
  futsals: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['location-selected', 'futsal-selected'])

const leafletMapInstance = ref(null)
const zoom = ref(15)
const center = ref([props.initialLocation.lat, props.initialLocation.lng])
const markerPosition = ref(null)
const selectedLocation = ref(null)
const searchQuery = ref('')
const searchResults = ref([])
const attribution = '© OpenStreetMap contributors'

// Generate a custom icon URL for futsals based on their rating
const getFutsalIcon = (futsal) => {
  const rating = Math.round(futsal.rating);
  return `/futsal-marker-${rating || 3}.svg`; // Fallback to 3-star icon
};

const handleMapClick = (event) => {
  if (props.readonly) return
  const { lat, lng } = event.latlng
  console.log('Map clicked:', event.latlng)
  markerPosition.value = [lat, lng]
  center.value = [lat, lng]
  // Emit immediately with coordinates
  emit('location-selected', { lat, lng, address: 'Loading address...' })
  // Then update with address
  updateSelectedLocation(lat, lng)
}

const handleMarkerDragend = (event) => {
  if (props.readonly) return
  const { lat, lng } = event.target.getLatLng()
  markerPosition.value = [lat, lng]
  center.value = [lat, lng]
  updateSelectedLocation(lat, lng)
  emit('location-selected', { lat, lng, address: selectedLocation.value?.address })
}

const handleFutsalClick = (futsal) => {
  // This will be handled by the LPopup click event
  console.log('Futsal clicked:', futsal.futsalName);
};

const updateSelectedLocation = async (lat, lng) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
    )
    const data = await response.json()
    
    selectedLocation.value = {
      lat,
      lng,
      address: data.display_name || 'Address not found'
    }
    
    console.log('Emitting location-selected from updateSelectedLocation:', selectedLocation.value);
    emit('location-selected', selectedLocation.value)
  } catch (error) {
    console.error('Error getting address:', error)
    selectedLocation.value = { lat, lng, address: 'Could not fetch address' }
    console.log('Emitting location-selected after address error:', selectedLocation.value);
    emit('location-selected', selectedLocation.value)
  }
}

const handleSearch = debounce(async () => {
  if (!searchQuery.value) {
    searchResults.value = []
    return
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery.value)}`
    )
    searchResults.value = await response.json()
  } catch (error) {
    console.error('Error searching locations:', error)
  }
}, 300)

const selectSearchResult = (result) => {
  const lat = parseFloat(result.lat)
  const lng = parseFloat(result.lon)
  
  center.value = [lat, lng]
  markerPosition.value = [lat, lng]
  zoom.value = 17
  updateSelectedLocation(lat, lng)
  searchQuery.value = ''
  searchResults.value = []
}

watch(() => props.initialLocation, (newLocation) => {
  center.value = [newLocation.lat, newLocation.lng]
  markerPosition.value = [newLocation.lat, newLocation.lng]
}, { deep: true })

watch(() => props.futsals, (newFutsals) => {
  if (newFutsals.length > 0) {
    // Center map on the first futsal if available
    const firstFutsal = newFutsals[0];
    if (firstFutsal.coordinates) {
      center.value = [firstFutsal.coordinates.lat, firstFutsal.coordinates.lng];
    }
  }
}, { deep: true });

const onMapReady = (mapInstance) => {
  console.log('LMap ready event fired.');
  leafletMapInstance.value = mapInstance;
  if (leafletMapInstance.value) {
    leafletMapInstance.value.on('click', handleMapClick);
    console.log('Native Leaflet click listener attached via @ready.');

    if (markerPosition.value) {
        console.log('Initial marker position set, fetching address...');
        updateSelectedLocation(markerPosition.value[0], markerPosition.value[1]);
    }
  } else {
    console.error('mapInstance provided by @ready event is invalid.');
  }
};

onMounted(() => {
  if (props.initialLocation) {
    const { lat, lng } = props.initialLocation;
    markerPosition.value = [lat, lng];
    center.value = [lat, lng];
    console.log('MapComponent mounted, initial markerPosition set:', markerPosition.value);
  } else {
    console.log('MapComponent mounted without initialLocation.');
  }
});

onUnmounted(() => {
  if (leafletMapInstance.value) {
    leafletMapInstance.value.off('click', handleMapClick);
    console.log('Native Leaflet click listener removed.');
  }
});
</script>

<style>
.leaflet-container {
  background: #1a1a1a !important;
}

.leaflet-marker-pane {
  z-index: 1000 !important;
}

.leaflet-tile {
  filter: 
    brightness(0.6)
    contrast(1.2)
    saturate(1.3)
    hue-rotate(10deg);
}

.leaflet-marker-icon {
  filter: 
    drop-shadow(0 3px 5px rgba(0,0,0,0.7));
}

.leaflet-control-zoom a {
  background: rgba(0,0,0,0.7) !important;
  border: none !important;
  color: #10b981 !important;
  margin: 4px;
  border-radius: 2px;
}

.leaflet-control-zoom a:hover {
  background: rgba(0,0,0,0.9) !important;
}

.leaflet-popup-content-wrapper {
  background: rgba(0,0,0,0.85) !important;
  border: 1px solid #10b981 !important;
  color: #fff !important;
  box-shadow: 0 2px 6px rgba(0,0,0,0.3) !important;
}

.leaflet-popup-tip {
  background: #10b981 !important;
}

.leaflet-control-attribution {
  background: transparent !important;
  color: #666 !important;
  font-size: 9px !important;
  padding: 2px 4px !important;
  
  a {
    color: #10b981 !important;
  }
}

.search-input {
  @apply w-full px-3 py-2 bg-black/80 backdrop-blur-sm 
         border border-green-700/50 rounded-md
         text-sm text-green-200 placeholder-green-400/60
         focus:ring-1 focus:ring-green-500 focus:border-transparent
         transition-all;
}

.search-results {
  @apply absolute w-full mt-1 bg-black/90 backdrop-blur-sm 
         border border-green-800/30 rounded-md shadow-lg 
         overflow-y-auto max-h-48;
}

.search-result-item {
  @apply px-3 py-2 text-sm text-green-300 hover:bg-green-900/30 
         cursor-pointer transition-colors;
}

.popup-content {
  @apply text-green-100;
  p { @apply m-0 leading-tight; }
  .font-medium { @apply text-green-300; }
}

/* Enhanced map styling (continued) */
.map-container {
  @apply relative w-full h-full;
  box-shadow: 0 0 20px rgba(16, 185, 129, 0.2) inset;
}

/* Custom marker styling */
.custom-marker {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: radial-gradient(circle, rgba(16, 185, 129, 0.9) 0%, rgba(5, 150, 105, 0.8) 100%);
  border-radius: 50%;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.5);
  border: 2px solid #fff;
  color: white;
  font-weight: bold;
  transform-origin: bottom center;
  transition: all 0.3s ease;
}

.custom-marker:hover {
  transform: scale(1.1);
}

/* Satellite view toggle button */
.map-type-toggle {
  @apply absolute bottom-20 right-4 bg-black/70 backdrop-blur-sm text-white 
         px-3 py-2 rounded-lg border border-gray-700 shadow-lg
         flex items-center gap-2 text-sm z-[1000] hover:bg-black/90 transition-colors;
}
</style>