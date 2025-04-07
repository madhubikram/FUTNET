<template>
  <PageLayout :hasPadding="false">
        <div class="sticky top-0 z-10 bg-gray-900/95">
      <div class="relative bg-gray-900 py-6 px-8">
        <div class="absolute inset-x-0 -bottom-7 h-8 bg-gradient-to-b from-gray-900 to-transparent"></div>

        <div class="flex justify-between items-center mb-4">
          <div class="group">
            <h1 class="text-xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              Hello,
            </h1>
            <p class="text-sm text-gray-400 group-hover:text-emerald-400 transition-colors duration-300">
              {{ displayName }}
            </p>
          </div>

          <div class="flex items-center space-x-8">
            <LoyaltyPointsDisplay />
            <BellIcon class="w-6 h-6 text-gray-200 cursor-pointer hover:text-green-400 transition-colors duration-300" />
          </div>
        </div>

                <div class="flex items-center gap-2 mb-2">
                    <div class="relative flex-1">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search futsals.."
              class="w-full h-8 px-3 bg-gray-800/80 border border-gray-700 rounded-lg text-sm text-white"
            >
          </div>

                    <div class="relative">
            <button
              @click="isShowingSortOptions = !isShowingSortOptions"
              class="h-8 px-3 bg-gray-800 text-white text-sm rounded-lg flex items-center gap-1 hover:bg-gray-700"
            >
              <ArrowUpDownIcon class="w-3 h-4" />
              <span class="text-sm md:text-base">Sort</span>
            </button>

            <div
              v-if="isShowingSortOptions"
              class="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg py-2 z-20"
            >
              <button
                @click="sortBy('name')"
                class="w-full px-4 py-2 text-left text-white hover:bg-gray-700 rounded-t-lg"
              >
                Sort by Name
              </button>
              <button
                @click="sortBy('price')"
                class="w-full px-4 py-2 text-left text-white hover:bg-gray-700 rounded-b-lg"
              >
                Sort by Price
              </button>
            </div>
          </div>

                    <button 
            @click="openFilterModal"
            class="h-8 px-3 bg-gray-800 text-white text-sm rounded-lg flex items-center gap-1 hover:bg-gray-700"
          >
            <FilterIcon class="w-3 h-4" />
            <span class="text-sm md:text-base">Filter</span>
          </button>

          <button 
            @click="navigateToMapView"
            class="hidden md:flex h-8 px-2 py-1 md:px-4 md:py-2 bg-gray-800 text-white rounded-lg items-center space-x-2 hover:bg-gray-700"
          >
            <MapIcon class="w-4 h-4" />
            <span class="text-sm md:text-base">Maps</span>
          </button>

        </div>
      </div>
    </div>

        <div class="p-8 pt-4">
       <!-- Loading State -->
       <div v-if="loading" class="flex justify-center items-center min-h-[400px]">
        <div class="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="flex justify-center items-center min-h-[400px]">
        <div class="text-red-400">{{ error }}</div>
      </div>

      <!-- Courts Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <FutsalCard
          v-for="futsal in paginatedFutsals"
          :key="futsal.id"
          :futsal="futsal"
          @book="handleBooking"
          @toggle-favorite="toggleFavorite"
        />
      </div>


            <div v-if="totalPages > 1" class="flex justify-center space-x-4 pb-8">
        <button
          @click="currentPage--"
          :disabled="currentPage === 1"
          class="px-4 py-2 bg-gray-800 text-white rounded-md disabled:opacity-50 hover:bg-gray-700"
        >
          <span class="sr-only">Previous</span>
          <svg class="w-5 h-5 rtl:rotate-180" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd"></path>
          </svg>
        </button>
        <span class="px-4 py-2 text-white rounded-md bg-gray-700 flex items-center justify-center">
          Page {{ currentPage }} of {{ totalPages }}
        </span>
        <button
          @click="currentPage++"
          :disabled="currentPage === totalPages"
          class="px-4 py-2 bg-gray-800 text-white rounded-md disabled:opacity-50 hover:bg-gray-700"
        >
          <span class="sr-only">Next</span>
          <svg class="w-5 h-5 rtl:rotate-180" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
          </svg>
        </button>
      </div>
    </div>

    <button
        @click="navigateToMapView"
      class="fixed bottom-16 inset-x-0 mx-auto bg-green-500 text-white p-4 rounded-full shadow-lg animate-heartbeat md:hidden w-14 h-14 flex items-center justify-center"
    >
      <MapIcon class="w-6 h-6" />
    </button>
  </PageLayout>

  <!-- Filter Modal -->
  <div v-if="showFilterModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
    <div class="bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
      <!-- Modal Header -->
      <div class="flex justify-between items-center p-4 border-b border-gray-700">
        <h3 class="text-lg font-semibold text-white">Filters</h3>
        <button @click="closeFilterModal" class="text-gray-400 hover:text-white">
          <XIcon class="w-5 h-5" />
        </button>
      </div>

      <!-- Modal Body -->
      <div class="p-6 space-y-6">
        <!-- Price Range Filter -->
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">Price Range (Hourly Rate)</label>
          <div class="flex items-center space-x-3">
            <input 
              v-model.number="tempPriceRange.min" 
              type="number" 
              placeholder="Min" 
              min="0"
              class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm focus:ring-green-500 focus:border-green-500"
            >
            <span class="text-gray-400">-</span>
            <input 
              v-model.number="tempPriceRange.max" 
              type="number" 
              placeholder="Max" 
              min="0"
              class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm focus:ring-green-500 focus:border-green-500"
            >
          </div>
        </div>

        <!-- Minimum Rating Filter -->
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">Minimum Rating</label>
          <select 
            v-model.number="tempMinRating"
            class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm focus:ring-green-500 focus:border-green-500"
          >
            <option value="0">Any Rating</option>
            <option value="1">★☆☆☆☆ & Up</option>
            <option value="2">★★☆☆☆ & Up</option>
            <option value="3">★★★☆☆ & Up</option>
            <option value="4">★★★★☆ & Up</option>
            <option value="5">★★★★★</option>
          </select>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="flex justify-between items-center p-4 bg-gray-800/50 border-t border-gray-700 rounded-b-lg">
         <button 
          @click="clearFilters" 
          class="px-4 py-2 text-sm text-gray-400 hover:text-red-400 rounded-md flex items-center gap-1 transition-colors duration-200"
          title="Clear all filters"
        >
          <SearchXIcon class="w-4 h-4"/>
          Clear Filters
        </button>
        <button 
          @click="applyFilters" 
          class="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors duration-200"
        >
          Apply Filters
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import PageLayout from '@/components/layout/PageLayout.vue'
import FutsalCard from '@/components/features/FutsalCard.vue'
import {BellIcon, FilterIcon, MapIcon, ArrowUpDownIcon, XIcon, SearchXIcon } from 'lucide-vue-next'
import LoyaltyPointsDisplay from '@/components/features/LoyaltyPointsDisplay.vue'

const error = ref(null);
const router = useRouter();

const displayName = ref('Player')

const fetchUserDetails = async () => {
  const token = localStorage.getItem('token');
  const storedUsername = localStorage.getItem('username');

  if (!token) {
    console.log('No token found, cannot fetch user details.');
    displayName.value = storedUsername || 'Player';
    return;
  }

  try {
    // Corrected Endpoint
    const response = await fetch('http://localhost:5000/api/profile', { 
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      console.error('Failed to fetch user details:', response.status, response.statusText);
      displayName.value = storedUsername || 'Player';
      return;
    }

    const userData = await response.json();
    
    // Access nested user object and then firstName
    if (userData && userData.user && userData.user.firstName) {
       displayName.value = userData.user.firstName;
    } else {
       // Fallback if firstName is not in the response
       displayName.value = storedUsername || 'Player'; 
       console.log('firstName not found in API response, using fallback.');
    }
    
  } catch (err) {
    console.error('Error fetching user details:', err);
    displayName.value = storedUsername || 'Player';
  }
};

onMounted(() => {
  fetchUserDetails();
  fetchCourts();
});

// Search and Filtering
const searchQuery = ref('')
const isShowingSortOptions = ref(false)
const sortOption = ref({ field: 'name', direction: 'asc' })
const showFilterModal = ref(false)
const priceRangeFilter = ref({ min: null, max: null })
const minRatingFilter = ref(0)
// Temporary refs for filter modal inputs
const tempPriceRange = ref({ min: null, max: null })
const tempMinRating = ref(0)

// Pagination
const currentPage = ref(1)
const itemsPerPage = 9

// Mock data for futsals
const futsals = ref([])
const loading = ref(true)


// Sorting function
const sortBy = (field) => {
  if (sortOption.value.field === field) {
    // Reverse direction if sorting by the same field again
    sortOption.value.direction = sortOption.value.direction === 'asc' ? 'desc' : 'asc'
  } else {
    // Set new sort field and default to ascending direction
    sortOption.value = { field, direction: 'asc' }
  }
  isShowingSortOptions.value = false // Close sort options after selection
}

// Filter functions
const openFilterModal = () => {
  // Load current filters into temp refs when opening
  tempPriceRange.value = { ...priceRangeFilter.value };
  tempMinRating.value = minRatingFilter.value;
  showFilterModal.value = true;
};

const closeFilterModal = () => {
  showFilterModal.value = false;
};

const applyFilters = () => {
  priceRangeFilter.value = { ...tempPriceRange.value };
  minRatingFilter.value = tempMinRating.value;
  currentPage.value = 1; // Reset to first page after applying filters
  closeFilterModal();
};

const clearFilters = () => {
  priceRangeFilter.value = { min: null, max: null };
  minRatingFilter.value = 0;
  tempPriceRange.value = { min: null, max: null }; // Clear temps too
  tempMinRating.value = 0;
  currentPage.value = 1; // Reset to first page
  // Optionally close modal after clearing, or keep it open
  // closeFilterModal(); 
};

const handleBooking = (futsal) => {
  console.log('Booking futsal:', futsal.name)
  router.push({
    name: 'playerCourtDetails',
    params: { id: futsal.id.toString() }
  });
}

// Favorite toggle handler
const toggleFavorite = (futsal) => {
  // Toggle the isFavorite property in the UI
  const foundFutsal = futsals.value.find(f => f.id === futsal.id)
  if (foundFutsal) {
    foundFutsal.isFavorite = !foundFutsal.isFavorite
    
    // Get current favorites from localStorage
    const favorites = JSON.parse(localStorage.getItem('favoriteCourts')) || []
    
    if (foundFutsal.isFavorite) {
      // Add to favorites if not already present
      if (!favorites.includes(futsal.id)) {
        favorites.push(futsal.id)
      }
    } else {
      // Remove from favorites
      const index = favorites.indexOf(futsal.id)
      if (index > -1) {
        favorites.splice(index, 1)
      }
    }
    
    // Update localStorage
    localStorage.setItem('favoriteCourts', JSON.stringify(favorites))
  }
}

// Computed properties for filtering, sorting, and pagination
const filteredFutsals = computed(() => {
  let result = [...futsals.value]; // Start with a copy of all futsals

  // Apply search filter
  if (searchQuery.value) {
    const lowerCaseQuery = searchQuery.value.toLowerCase();
    result = result.filter(futsal =>
      futsal.futsalName.toLowerCase().includes(lowerCaseQuery) || // Search futsal name
      futsal.courtName.toLowerCase().includes(lowerCaseQuery) ||  // Search court name
      futsal.location.toLowerCase().includes(lowerCaseQuery)     // Search location
    );
  }

  // Apply price range filter
  if (priceRangeFilter.value.min !== null && priceRangeFilter.value.min >= 0) {
    result = result.filter(futsal => futsal.regularPrice >= priceRangeFilter.value.min);
  }
  if (priceRangeFilter.value.max !== null && priceRangeFilter.value.max >= 0) {
    // Make sure max is >= min if both are set
    if (priceRangeFilter.value.min === null || priceRangeFilter.value.max >= priceRangeFilter.value.min) {
       result = result.filter(futsal => futsal.regularPrice <= priceRangeFilter.value.max);
    }
  }

  // Apply minimum rating filter
  if (minRatingFilter.value > 0) {
    result = result.filter(futsal => futsal.rating >= minRatingFilter.value);
  }

  // Apply sorting
  result.sort((a, b) => {
  const modifier = sortOption.value.direction === 'asc' ? 1 : -1;
  if (sortOption.value.field === 'name') {
    // Access the correct property name and handle undefined values
    const nameA = a.futsalName || a.courtName || '';
    const nameB = b.futsalName || b.courtName || '';
    return modifier * nameA.localeCompare(nameB);
  } else {
    // Ensure these values exist with fallbacks to 0
    const priceA = a.regularPrice || 0;
    const priceB = b.regularPrice || 0;
    return modifier * (priceA - priceB);
  }
});

  return result;
})

const navigateToMapView = () => {
  router.push('/map');
};

const fetchCourts = async () => {
  try {
    loading.value = true;
    error.value = null;
    
    const favorites = JSON.parse(localStorage.getItem('favoriteCourts')) || []

    const token = localStorage.getItem('token');
    const response = await fetch('http://localhost:5000/api/courts', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch courts');
    }

    const courts = await response.json();
    
    console.log("Raw court data from server:");
    courts.forEach(court => {
      console.log(`Court ${court.name} (${court._id}):`, {
        futsalId: court.futsalId,
        operatingHours: court.futsalId?.operatingHours,
        hasOperatingHours: !!court.futsalId?.operatingHours
      });
    });
    
    futsals.value = courts.map(court => {
      // Get current time to check if we're in peak/off-peak hours
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5); // Format: HH:mm
      
      // Start with the base hourly price set by admin
      let currentRate = court.priceHourly;
      
      // Check if current time is in peak hours
      if (court.hasPeakHours) {
        const isPeakHour = isTimeInRange(currentTime, court.peakHours.start, court.peakHours.end);
        if (isPeakHour) {
          currentRate = court.pricePeakHours;
        }
      }

      if (court.hasOffPeakHours) {
        const isOffPeakHour = isTimeInRange(currentTime, court.offPeakHours.start, court.offPeakHours.end);
        if (isOffPeakHour) {
          currentRate = court.priceOffPeakHours;
        }
      }

      // Extract full location and format it
      const fullLocation = court.futsalId?.location || '';
      const [area, city = 'Kathmandu'] = fullLocation.split(',').map(part => part.trim());
      const formattedLocation = `${area}, ${city}`;

      // Get available slots for today
      let availableSlots = [];
      
      // Use court operating hours to generate potential slots
      if (court.futsalId?.operatingHours) {
        const { opening, closing } = court.futsalId.operatingHours;
        
        availableSlots = generateTimeSlots(opening, closing);
        
        console.log(`Court ${court.name || 'Unknown'} (${court._id}) availability:`, {
          operatingHours: court.futsalId?.operatingHours,
          availableSlots: availableSlots.length,
          currentTime: new Date().toLocaleTimeString()
        });
      }


      console.log(`Court ${court.name || 'Unknown'} (${court._id}) availability:`, {
        operatingHours: court.futsalId?.operatingHours,
        totalGeneratedSlots: availableSlots.length, // Changed from allSlots.length
        availableSlots: availableSlots.length,
        currentTime: new Date().toLocaleTimeString(),
        currentHour: new Date().getHours(),
        currentMinute: new Date().getMinutes()
      });

      if (availableSlots.length === 0) {
        console.log("All slots are in the past or already booked.");
      }
      
      return {
        id: court._id,
        futsalName: court.futsalId?.name || 'Unknown Futsal',
        courtName: court.name,
        location: formattedLocation,
        rating: court.averageRating || 0,
        distance: '2.5',
        courtSide: court.courtSide,
        regularPrice: court.priceHourly,
        currentRate: currentRate,
        peakPrice: court.pricePeakHours || 0,
        offPeakPrice: court.priceOffPeakHours || 0,
        currentlyPeakHours: court.hasPeakHours && 
          isTimeInRange(currentTime, court.peakHours.start, court.peakHours.end),
        currentlyOffPeakHours: court.hasOffPeakHours && 
          isTimeInRange(currentTime, court.offPeakHours.start, court.offPeakHours.end),
        peakHours: court.hasPeakHours ? {
          start: court.peakHours.start,
          end: court.peakHours.end
        } : null,
        offPeakHours: court.hasOffPeakHours ? {
          start: court.offPeakHours.start,
          end: court.offPeakHours.end
        } : null,
        // Make sure to include the operating hours
        operatingHours: court.futsalId?.operatingHours || {
          opening: '09:00', // Default only if no operatingHours exists
          closing: '21:00'
        },
        isFavorite: favorites.includes(court._id),
        images: court.images?.map(img => `http://localhost:5000${img}`) || [],
        prepaymentRequired: court.requirePrepayment || false,
        availableSlots: court.futsalId?.operatingHours ? 
    generateTimeSlots(court.futsalId.operatingHours.opening, court.futsalId.operatingHours.closing) :
    generateTimeSlots(court.peakHours?.start || '17:00', court.peakHours?.end || '20:00')
        
      };
    });
  } catch (error) {
    console.error('Error fetching courts:', error);
    error.value = 'Failed to load courts';
  } finally {
    loading.value = false;
  }
};

// Helper function to generate time slots
// In the fetchCourts function in HomePage.vue, update the generateTimeSlots function:
const generateTimeSlots = (opening, closing) => {
  if (!opening || !closing) {
    console.warn('Missing opening or closing time for slot generation');
    return [];
  }
  
  // Parse opening and closing times to minutes since midnight
  const openingMinutes = timeToMinutes(opening);
  const closingMinutes = timeToMinutes(closing);
  
  if (isNaN(openingMinutes) || isNaN(closingMinutes)) {
    console.error('Invalid time format', { opening, closing });
    return [];
  }
  
  console.log(`Generating slots from ${opening} (${openingMinutes} mins) to ${closing} (${closingMinutes} mins)`);
  
  const slots = [];
  let currentMinutes = openingMinutes;
  
  // Get current time to filter out past slots
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTotalMinutes = currentHour * 60 + currentMinute;
  
  // Generate slots every hour (60 minutes)
  while (currentMinutes < closingMinutes) {
    // Convert minutes back to HH:MM format
    const hours = Math.floor(currentMinutes / 60);
    const minutes = currentMinutes % 60;
    const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    
    // Only add future slots for today (This condition was correct)
    if (currentMinutes > currentTotalMinutes) {
      slots.push(timeStr); // Just push the time string
      // console.log(`Added slot: ${timeStr}`); // Keep console log commented or remove
    } else {
      // console.log(`Skipped past slot: ${timeStr}`); // Keep console log commented or remove
    }
    
    // Move forward 60 minutes
    currentMinutes += 60;
  }
  
  console.log(`Generated ${slots.length} slots for ${opening} to ${closing}`);
  return slots;
};

const timeToMinutes = (time) => {
  if (!time) return NaN;
  
  const [hours, minutes] = time.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return NaN;
  
  return hours * 60 + minutes;
};


// Call fetchCourts when component mounts
// Removed onMounted(fetchCourts) call from the end if it exists

const isTimeInRange = (currentTime, start, end) => {
  if (!start || !end) {
    console.log('Missing start or end time');
    return false;
  }
  
  const timeToMinutes = (time) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const current = timeToMinutes(currentTime);
  const startTime = timeToMinutes(start);
  const endTime = timeToMinutes(end);

  // Handle cases where operating hours span midnight
  if (startTime > endTime) {
    // e.g., 22:00 to 02:00 - check if current time is after start OR before end
    return current >= startTime || current <= endTime;
  } else {
    // Normal case - check if current time is between start and end
    return current >= startTime && current <= endTime;
  }
};

const totalPages = computed(() => {
  const total = Math.ceil(filteredFutsals.value.length / itemsPerPage);
  return total < 2 ? 1 : total; // Ensure at least one page if there are items
})

const paginatedFutsals = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return filteredFutsals.value.slice(start, end); // Extract futsals for the current page
})

// Watch for search query changes to reset to first page
watch(searchQuery, () => {
  currentPage.value = 1;
})
</script>

<style scoped>
@keyframes heartbeat {
  0%, 100% {
    transform: translateY(0);
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
  }
  50% {
    transform: translateY(-5px);
    box-shadow: 0 0 10px 2px rgba(16, 185, 129, 0.7);
  }
}

.animate-heartbeat {
  animation: heartbeat 3s infinite;
}
</style>