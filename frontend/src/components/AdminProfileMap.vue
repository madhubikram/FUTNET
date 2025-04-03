<template>
    <div class="relative w-full h-full">
      <LMap
        ref="mapRef" 
        v-model:zoom="zoom"
        :center="center"
        :use-global-leaflet="false"
        class="h-full w-full"
        @click="handleMapClick"
        @ready="onMapReady" 
      >
        <LTileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          :attribution="attribution"
        />
        <LMarker
          v-if="markerPosition"
          :lat-lng="markerPosition"
          :draggable="true"
          @dragend="handleMarkerDragend"
          ref="markerRef" 
        >
          <LPopup>
            <div class="popup-content">
              <p class="font-medium">Selected Location</p>
              <p class="text-sm mt-1">{{ selectedAddress }}</p>
            </div>
          </LPopup>
        </LMarker>
      </LMap>
    </div>
  </template>

<script setup>
import { ref, nextTick } from 'vue'; // Added nextTick
import { LMap, LTileLayer, LMarker, LPopup } from '@vue-leaflet/vue-leaflet';
import 'leaflet/dist/leaflet.css';


const emit = defineEmits(['location-selected', 'map-click']);
const props = defineProps({
    initialLocation: {
        type: Object,
        default: () => ({ lat: 27.7172, lng: 85.3240 })
    }
});

const mapRef = ref(null); // Ref for the map instance
const markerRef = ref(null); // Ref for the marker instance
const zoom = ref(15);
// Initialize center and marker based on initial props
const center = ref([props.initialLocation.lat, props.initialLocation.lng]);
const markerPosition = ref([props.initialLocation.lat, props.initialLocation.lng]);
const selectedAddress = ref('');
const attribution = '© OpenStreetMap contributors';

// --- Reverse Geocoding ---
const updateAddress = async (lat, lng) => {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
        const data = await response.json();
        selectedAddress.value = data.display_name || `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
        console.log("Updated Address:", selectedAddress.value);
        emit('location-selected', { lat, lng, address: selectedAddress.value });
    } catch (error) {
        console.error('Error reverse geocoding:', error);
        selectedAddress.value = `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
        emit('location-selected', { lat, lng, address: selectedAddress.value });
    }
};

// --- Map Event Handlers ---
const handleMapClick = (event) => {
    const { lat, lng } = event.latlng;
    console.log("Map Clicked:", { lat, lng });
    markerPosition.value = [lat, lng];
    // center.value = [lat, lng]; // Optional: Re-center on click
    updateAddress(lat, lng);
    emit('map-click', { lat, lng }); // Keep emitting map-click
};

const handleMarkerDragend = (event) => {
    const { lat, lng } = event.target.getLatLng();
    console.log("Marker Dragged:", { lat, lng });
    markerPosition.value = [lat, lng];
    updateAddress(lat, lng);
    // No need to emit map-click here, location-selected covers the update
};

// --- Lifecycle and Initialization ---

// Function to call when map is ready
const onMapReady = async () => {
    console.log("Map Ready. Initial Coords:", props.initialLocation);
    // Fetch initial address when map is ready and we have coordinates
    if (markerPosition.value) {
       await updateAddress(markerPosition.value[0], markerPosition.value[1]);
    }
    // Invalidate size after a short delay to ensure container is sized
    await nextTick();
    if (mapRef.value && mapRef.value.leafletObject) {
        mapRef.value.leafletObject.invalidateSize();
        console.log("Map size invalidated on ready.");
    }
};
</script>

  <style scoped>
  /* Scoped styles remain the same */
  .popup-content { font-family: sans-serif; }
  .leaflet-container { height: 100%; }
  </style>