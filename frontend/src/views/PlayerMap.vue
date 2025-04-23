<template>
    <PageLayout :hasPadding="false">
      <div class="h-screen w-full relative">
        <!-- Map Header Overlay -->
        <div class="absolute top-0 left-0 right-0 z-10 bg-gray-900/80 backdrop-blur-sm p-4">
          <div class="flex justify-between items-center">
            <button 
              @click="router.back()" 
              class="bg-gray-800 p-2 rounded-full text-white hover:bg-gray-700 transition-colors"
            >
              <ArrowLeftIcon class="w-5 h-5" />
            </button>
            <h1 class="text-xl font-bold text-white">Futsal Map</h1>
            <div class="w-9"></div> <!-- For alignment -->
          </div>
        </div>
        
        <!-- The Map -->
        <div class="h-full w-full">
            <!-- Loading State -->
            <div v-if="loading" class="h-full w-full flex items-center justify-center bg-gray-900">
              <div class="text-center">
                <div class="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent mb-4"></div>
                <p class="text-white">Loading futsal locations...</p>
              </div>
            </div>
            
            <!-- Empty State -->
            <div v-else-if="validFutsals.length === 0" class="h-full w-full flex items-center justify-center bg-gray-900">
              <div class="text-center p-8 bg-gray-800 rounded-xl shadow-lg max-w-md">
                <h3 class="text-xl font-semibold text-white mb-3">No Futsals Available</h3>
                <p class="text-gray-400 mb-6">We couldn't find any futsal courts with location data on the map.</p>
                <button 
                  @click="router.push('/home')" 
                  class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  Browse Courts List
                </button>
              </div>
            </div>
            
            <!-- Map with Markers -->
            <LMap
                v-else
                ref="map"
                :zoom="13"
                :center="mapCenter"
                :use-global-leaflet="false"
                class="h-full w-full z-0"
                >
                <LTileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    :attribution="attribution"
                />

                  <!-- User location marker -->
                  <LMarker
                    v-if="userLocation"
                    :lat-lng="[userLocation.lat, userLocation.lng]"
                    :icon="userLocationIcon"
                >
                    <LPopup>
                        <div class="popup-content">
                            <h3 class="font-medium">Your Location</h3>
                        </div>
                    </LPopup>
                </LMarker>

                <!-- Add markers for each futsal -->
                <LMarker
                    v-for="futsal in validFutsals"
                    :key="futsal.id"
                    :lat-lng="[futsal.coordinates.lat, futsal.coordinates.lng]"
                    @click="handleFutsalClick(futsal)"
                    :icon="futsalIcon"
                  >
                    <LTooltip :options="{ permanent: true, direction: 'top', offset: [0, -45], className: 'custom-tooltip' }">
                      {{ futsal.futsalName }}
                    </LTooltip>
                    <LPopup :options="{ offset: [0, -25] }">
                        <div class="popup-content">
                            <h3 class="font-medium">{{ futsal.futsalName }}</h3>
                            <p class="text-sm mt-1">{{ futsal.location }}</p>
                            <div class="mt-2 p-2 bg-green-500/10 rounded">
                                <p class="text-sm font-bold text-green-500">Starts from Rs. {{ futsal.lowestPrice }}</p>
                                <p class="text-xs text-gray-600">{{ futsal.courts.length }} courts available</p>
                            </div>
                            <button 
                                @click="handleFutsalSelected(futsal)" 
                                class="mt-3 px-3 py-1 bg-green-500 text-white text-sm rounded w-full"
                            >
                                View Details
                            </button>
                        </div>
                    </LPopup>
                </LMarker>
            </LMap>
        </div>
      </div>
    </PageLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import PageLayout from '@/components/layout/PageLayout.vue';
import { Icon } from 'leaflet';
import { LMap, LTileLayer, LMarker, LPopup, LTooltip } from "@vue-leaflet/vue-leaflet";
import "leaflet/dist/leaflet.css";
import { ArrowLeftIcon } from 'lucide-vue-next';
import API_URL, { getAssetUrl } from '@/config/api';


const router = useRouter();
const map = ref(null);
const futsals = ref([]);
const loading = ref(true);
const locationError = ref(null);
const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// Futsal marker icon
const futsalIcon = new Icon({
  iconUrl: `data:image/svg+xml;base64,${btoa('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40" fill="none"><path d="M16 0C7.164 0 0 7.164 0 16C0 25.886 13.486 38.704 14.056 39.246C14.694 39.734 15.347 40 16 40C16.653 40 17.306 39.734 17.944 39.246C18.514 38.704 32 25.886 32 16C32 7.164 24.836 0 16 0ZM16 24C11.582 24 8 20.418 8 16C8 11.582 11.582 8 16 8C20.418 8 24 11.582 24 16C24 20.418 20.418 24 16 24Z" fill="#10B981"/><path d="M16 10C12.686 10 10 12.686 10 16C10 19.314 12.686 22 16 22C19.314 22 22 19.314 22 16C22 12.686 19.314 10 16 10ZM16 20C13.794 20 12 18.206 12 16C12 13.794 13.794 12 16 12C18.206 12 20 13.794 20 16C20 18.206 18.206 20 16 20Z" fill="white"/></svg>')}`,
  iconSize: [32, 40],
  iconAnchor: [16, 40], // Anchor at the bottom center of the pin
  popupAnchor: [0, -25] // Popup appears above the pin
});

// User location handling
const userLocation = ref(null);
const userLocationIcon = new Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDMyIDMyIj48ZyBmaWxsPSJub25lIj48cGF0aCBmaWxsPSIjMzA4NWQ2IiBkPSJNMTYgMkM4LjI3IDIgMiA4LjI3IDIgMTZzMTQgMTQgMTQgMTQgMTQtNi4yNyAxNC0xNFMyMy43MyAyIDE2IDJ6Ii8+PHBhdGggZmlsbD0iI2ZmZiIgc3R5bGU9Im9wYWNpdHk6MC43IiBkPSJNMTYgMjJhNiA2IDAgMSAwIDAtMTIgNiA2IDAgMCAwIDAgMTJ6Ii8+PC9nPjwvc3ZnPg==',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

// Add a computed property to filter valid futsals
const validFutsals = computed(() => {
  return futsals.value.filter(futsal => 
    futsal.coordinates && 
    isValidCoordinate(futsal.coordinates.lat, futsal.coordinates.lng)
  );
});

// Map center (dynamically calculated)
const mapCenter = computed(() => {
  // If user location is available, use it
  if (userLocation.value) {
    return [userLocation.value.lat, userLocation.value.lng];
  }
  
  // Default center in Kathmandu
  return [27.7172, 85.3240];
});

const getUserLocation = () => {
  if (navigator.geolocation) {
    // Show loading state indicator (optional)
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        userLocation.value = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        locationError.value = null; // Clear any previous error
        console.log('Got user location (reactive value may update async): ', userLocation.value); // Log the ref
        console.log('Actual position object received from browser:', position); // Log the raw position object
        
        // If map is available, pan to the user's location
        if (map.value) {
          map.value.leafletObject.setView(
            [userLocation.value.lat, userLocation.value.lng], 
            14  // Slightly zoomed in
          );
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Could not access your location. Please check your browser permissions.');
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  } else {
    alert('Geolocation is not supported by this browser.');
  }
};


// Add the missing function
const handleFutsalClick = (futsal) => {
  console.log('Futsal clicked:', futsal.futsalName);
};

// Rest of the functions remain the same
const fetchFutsals = async () => {
  try {
    loading.value = true;
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_URL}/api/courts`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch courts');
    }

    const courts = await response.json();
    console.log('Fetched courts:', courts.length);
    
    // Group courts by futsal
    const futsalMap = new Map();
    
    courts.forEach(court => {
      const futsalId = court.futsalId?._id;
      if (!futsalId) {
        console.log('Court without futsalId:', court);
        return;
      }
      
      if (!futsalMap.has(futsalId)) {
        // Extract coordinates properly from the futsal model
        let coordinates = { lat: 27.7172, lng: 85.3240 }; // Default to Kathmandu
        
        if (court.futsalId?.coordinates) {
          // Make sure to access coordinates correctly and convert to numbers if needed
          let lat = Number(court.futsalId.coordinates.lat);
          let lng = Number(court.futsalId.coordinates.lng);
          
          // Validate coordinates are actual valid numbers
          if (!isNaN(lat) && !isNaN(lng)) {
            coordinates = {
              lat: lat,
              lng: lng
            };
            console.log(`Found valid coordinates for ${court.futsalId.name}: ${lat}, ${lng}`);
          } else {
            console.warn(`Invalid coordinates for ${court.futsalId.name}: ${court.futsalId.coordinates.lat}, ${court.futsalId.coordinates.lng}`);
          }
        } else {
          console.warn(`No coordinates found for ${court.futsalId?.name || 'Unknown Futsal'}, using default`);
        }
        
        futsalMap.set(futsalId, {
          id: futsalId,
          futsalName: court.futsalId?.name || 'Unknown Futsal',
          location: court.futsalId?.location || 'Unknown Location',
          coordinates: coordinates,
          operatingHours: {
            opening: court.futsalId?.operatingHours?.opening || '09:00',
            closing: court.futsalId?.operatingHours?.closing || '21:00'
          },
          rating: 0,
          distance: '2.5',
          lowestPrice: court.priceHourly || 1300,
          courts: []
        });
      }
      
      // Add this court to the futsal
      const futsal = futsalMap.get(futsalId);
      
      // Track lowest price
      if (court.priceHourly && court.priceHourly < futsal.lowestPrice) {
        futsal.lowestPrice = court.priceHourly;
      }
      
      // Calculate average rating
      const totalRating = futsal.rating * futsal.courts.length + (court.averageRating || 0);
      const newCount = futsal.courts.length + 1;
      futsal.rating = Math.round((totalRating / newCount) * 10) / 10;
      
      // Add the court info
      futsal.courts.push({
        id: court._id,
        name: court.name,
        courtSide: court.courtSide,
        regularPrice: court.priceHourly,
        peakPrice: court.pricePeakHours,
        offPeakPrice: court.priceOffPeakHours,
        peakHours: court.hasPeakHours ? court.peakHours : null,
        offPeakHours: court.hasOffPeakHours ? court.offPeakHours : null,
        availableSlots: generateTimeSlots(
          court.futsalId?.operatingHours?.opening, 
          court.futsalId?.operatingHours?.closing
        ),
        images: court.images?.map(img => getAssetUrl(img)) || []
      });
    });
    
    // Check for duplicate coordinates and offset them slightly for visibility
    const seenCoordinates = new Map();
    futsalMap.forEach((futsal) => {
      const coordKey = `${futsal.coordinates.lat},${futsal.coordinates.lng}`;
      
      if (seenCoordinates.has(coordKey)) {
        // Offset this marker slightly (about 50 meters)
        futsal.coordinates.lat += 0.0005;
        futsal.coordinates.lng += 0.0005;
        console.log(`Offset duplicate coordinates for ${futsal.futsalName}`);
      } else {
        seenCoordinates.set(coordKey, true);
      }
    });
    
    // Convert the Map values to an array
    futsals.value = Array.from(futsalMap.values());
    console.log('Processed futsals:', futsals.value.length);
    
  } catch (error) {
    console.error('Error fetching futsals for map:', error);
  } finally {
    loading.value = false;
  }
};

const generateTimeSlots = (opening, closing) => {
  if (!opening || !closing) {
    console.warn('Missing opening or closing time for slot generation');
    return [];
  }
  
  // Rest of the function remains the same
  const openingMinutes = timeToMinutes(opening);
  const closingMinutes = timeToMinutes(closing);
  
  if (isNaN(openingMinutes) || isNaN(closingMinutes)) {
    console.error('Invalid time format', { opening, closing });
    return [];
  }
  
  const slots = [];
  let currentMinutes = openingMinutes;
  
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTotalMinutes = currentHour * 60 + currentMinute;
  
  while (currentMinutes < closingMinutes) {
    const hours = Math.floor(currentMinutes / 60);
    const minutes = currentMinutes % 60;
    const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    
    if (currentMinutes > currentTotalMinutes) {
      slots.push(timeStr);
    }
    
    currentMinutes += 60;
  }
  
  return slots;
};

const timeToMinutes = (time) => {
  if (!time) return NaN;
  
  const [hours, minutes] = time.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return NaN;
  
  return hours * 60 + minutes;
};

const handleFutsalSelected = (futsal) => {
  if (futsal.courts && futsal.courts.length > 0) {
    const firstCourt = futsal.courts[0];
    router.push({
      name: 'playerCourtDetails',
      params: { id: firstCourt.id }
    });
  } else {
    console.error('No courts available for this futsal');
  }
};

const isValidCoordinate = (lat, lng) => {
  return typeof lat === 'number' && 
         typeof lng === 'number' && 
         !isNaN(lat) && 
         !isNaN(lng) &&
         lat >= -90 && lat <= 90 && 
         lng >= -180 && lng <= 180;
};

onMounted(() => {
  console.log('MapView mounted');
  fetchFutsals();

  setTimeout(() => {
    if (confirm('Allow Futnet to access your location?')) {
      getUserLocation();
    }
  }, 1000);
});
</script>

<style>
/* Map container styles */
@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.5);
    opacity: 0.5;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.user-location-pulse {
  animation: pulse 2s infinite;
}

.leaflet-container {
  z-index: 0 !important;
}

/* Style the map to ensure visibility */
.leaflet-tile-container {
  filter: brightness(0.8) contrast(1.2);
}

/* Fix zoom controls position to be above the header */
.leaflet-control-zoom {
  z-index: 20 !important;
  margin-top: 70px !important; /* Add margin to move controls below header */
}

.leaflet-control-zoom a {
  background-color: #10b981 !important;
  color: white !important;
  border: none !important;
}

.leaflet-control-zoom a:hover {
  background-color: #059669 !important;
}

.leaflet-popup {
  z-index: 1000 !important;
  margin-bottom: 40px !important; /* Increase bottom margin for popup */
}


.leaflet-popup-content-wrapper {
  border-radius: 8px !important;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2) !important;
  max-width: 250px;
  overflow: hidden;
}

.leaflet-popup-tip {
  background: #10b981 !important;
}

.user-location-pulse {
  animation: pulse 2s infinite;
}

/* Popup content styling */
.popup-content {
  text-align: center;
}

.popup-content h3 {
  margin: 0;
  color: #10b981;
  font-weight: bold;
}

.popup-content p {
  margin: 5px 0;
}

.popup-content button {
  background: #10b981;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 5px;
  cursor: pointer;
  margin-top: 5px;
  width: 100%;
}

.popup-content button:hover {
  background: #059669;
}

/* Remove marker-tooltip styles */
/*
.marker-tooltip {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(16, 185, 129, 0.9);
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  white-space: nowrap;
  font-weight: bold;
  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  pointer-events: none;
  z-index: 1000 !important;
}

.marker-tooltip:after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  margin-left: -5px;
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 5px solid rgba(16, 185, 129, 0.9);
}
*/

/* Additional styling for the popup */
.leaflet-popup-content-wrapper {
  border-radius: 8px !important;
  border-top: 3px solid #10b981 !important;
}

.popup-content button {
  text-transform: uppercase !important;
  font-weight: bold !important;
  letter-spacing: 0.5px !important;
}

/* Style the map zoom controls to match theme better */
.leaflet-control-zoom a {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2) !important;
}

/* Restore Custom Tooltip Styling */
.custom-tooltip {
  background-color: rgba(16, 185, 129, 0.9) !important;
  border: none !important;
  border-radius: 4px !important;
  color: white !important;
  font-weight: bold !important;
  padding: 3px 8px !important;
  font-size: 11px !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2) !important;
  text-align: center !important;
  white-space: nowrap !important;
  pointer-events: none !important;
  z-index: 1001 !important; /* Ensure it's above the marker */
}

.custom-tooltip::before {
  content: '';
  position: absolute;
  bottom: -5px; /* Position arrow correctly */
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 5px solid rgba(16, 185, 129, 0.9);
}
</style>