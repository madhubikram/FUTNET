<template>
    <PageLayout>
      <div class="p-8">
        <!-- Header section -->
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-white mb-2">My Favorite Courts</h1>
          <p class="text-gray-400">Manage your favorite futsal courts here</p>
        </div>
  
        <!-- Loading state -->
        <div v-if="loading" class="flex justify-center items-center min-h-[400px]">
          <div class="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
        </div>
  
        <!-- Empty state -->
        <div v-else-if="!loading && favoriteCourts.length === 0" class="bg-gray-800 rounded-xl p-8 text-center">
          <HeartOffIcon class="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h2 class="text-xl font-semibold text-white mb-2">No Favorites Yet</h2>
          <p class="text-gray-400 mb-6">You haven't added any courts to your favorites</p>
          <router-link 
            to="/home" 
            class="px-6 py-3 bg-green-500 text-white rounded-lg inline-flex items-center gap-2 hover:bg-green-600 transition-colors"
          >
            <HomeIcon class="w-5 h-5" />
            Browse Courts
          </router-link>
        </div>
  
        <!-- Favorites grid -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FutsalCard
            v-for="futsal in favoriteCourts"
            :key="futsal.id"
            :futsal="futsal"
            @book="handleBooking"
            @toggle-favorite="toggleFavorite"
          />
        </div>
      </div>
    </PageLayout>
  </template>
  
  <script setup>
  import { ref, onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import PageLayout from '@/components/layout/PageLayout.vue'
  import FutsalCard from '@/components/features/FutsalCard.vue'
  import { HeartOffIcon, HomeIcon } from 'lucide-vue-next'
  import API_URL, { getAssetUrl } from '@/config/api'
  
  const router = useRouter()
  const loading = ref(true)
  const favoriteCourts = ref([])
  
  // Fetch favorite courts from local storage and backend
  const fetchFavoriteCourts = async () => {
    try {
      loading.value = true
      
      // First, get favorites IDs from localStorage
      const favorites = JSON.parse(localStorage.getItem('favoriteCourts')) || []
      
      if (favorites.length === 0) {
        favoriteCourts.value = []
        return
      }
      
      // Then fetch court details for each favorite
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/courts`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
  
      if (!response.ok) {
        throw new Error('Failed to fetch courts')
      }
  
      const courts = await response.json()
      
      console.log("Raw court data for favorites:");
      courts.forEach(court => {
        if (favorites.includes(court._id)) {
          console.log(`Court ${court.name} (${court._id}):`, {
            futsalId: court.futsalId,
            operatingHours: court.futsalId?.operatingHours,
            hasOperatingHours: !!court.futsalId?.operatingHours
          });
        }
      });
      
      // Filter and map courts to only include favorites
      favoriteCourts.value = courts
        .filter(court => favorites.includes(court._id))
        .map(court => {
          // Get current time to check if we're in peak/off-peak hours
          const now = new Date()
          const currentTime = now.toTimeString().slice(0, 5) // Format: HH:mm
  
          // Start with the base hourly price
          let currentRate = court.priceHourly
          
          // Check if current time is in peak hours
          if (court.hasPeakHours) {
            const isPeakHour = isTimeInRange(currentTime, court.peakHours?.start, court.peakHours?.end)
            if (isPeakHour) {
              currentRate = court.pricePeakHours
            }
          }
  
          // Check if current time is in off-peak hours
          if (court.hasOffPeakHours) {
            const isOffPeakHour = isTimeInRange(currentTime, court.offPeakHours?.start, court.offPeakHours?.end)
            if (isOffPeakHour) {
              currentRate = court.priceOffPeakHours
            }
          }
  
          // Extract full location and format it
          const fullLocation = court.futsalId?.location || ''
          const [area, city = 'Kathmandu'] = fullLocation.split(',').map(part => part.trim())
          const formattedLocation = `${area}, ${city}`
  
          // Get available slots for today
          let availableSlots = []
          
          // Use court operating hours to generate potential slots
          if (court.futsalId?.operatingHours) {
            const { opening, closing } = court.futsalId.operatingHours
            
            availableSlots = generateTimeSlots(opening, closing)
            
            console.log(`Court ${court.name || 'Unknown'} (${court._id}) availability:`, {
              operatingHours: court.futsalId?.operatingHours,
              availableSlots: availableSlots.length,
              currentTime: new Date().toLocaleTimeString()
            });
          }
  
          return {
            id: court._id,
            futsalName: court.futsalId?.name || 'Unknown Futsal',
            courtName: court.name,
            location: formattedLocation,
            rating: court.averageRating || 0,
            distance: '2.5', // This could be calculated if you have user location
            courtSide: court.courtSide,
            regularPrice: court.priceHourly,
            currentRate: currentRate,
            peakPrice: court.pricePeakHours || 0,
            offPeakPrice: court.priceOffPeakHours || 0,
            currentlyPeakHours: court.hasPeakHours && 
              isTimeInRange(currentTime, court.peakHours?.start, court.peakHours?.end),
            currentlyOffPeakHours: court.hasOffPeakHours && 
              isTimeInRange(currentTime, court.offPeakHours?.start, court.offPeakHours?.end),
            peakHours: court.hasPeakHours ? {
              start: court.peakHours?.start,
              end: court.peakHours?.end
            } : null,
            offPeakHours: court.hasOffPeakHours ? {
              start: court.offPeakHours?.start,
              end: court.offPeakHours?.end
            } : null,
            // Make sure to include the operating hours
            operatingHours: court.futsalId?.operatingHours || {
              opening: '09:00', // Default only if no operatingHours exists
              closing: '21:00'
            },
            isFavorite: true, // These are all favorites
            images: court.images?.map(img => getAssetUrl(img)) || [],
            prepaymentRequired: court.requirePrepayment || false,
            availableSlots: court.futsalId?.operatingHours ? 
              generateTimeSlots(court.futsalId.operatingHours.opening, court.futsalId.operatingHours.closing) :
              generateTimeSlots(court.peakHours?.start || '17:00', court.peakHours?.end || '20:00')
          }
        })
        
    } catch (error) {
      console.error('Error fetching favorite courts:', error)
    } finally {
      loading.value = false
    }
  }
  
  // Helper function to check if time is within range
  const isTimeInRange = (currentTime, start, end) => {
    if (!start || !end) return false
    
    const timeToMinutes = (time) => {
      const [hours, minutes] = time.split(':').map(Number)
      return hours * 60 + minutes
    }
  
    const current = timeToMinutes(currentTime)
    const startTime = timeToMinutes(start)
    const endTime = timeToMinutes(end)
    
    return current >= startTime && current <= endTime
  }
  
  // Helper function to generate time slots
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
      
      // Only add future slots for today
      if (currentMinutes > currentTotalMinutes) {
        slots.push(timeStr);
        console.log(`Added slot: ${timeStr}`);
      } else {
        console.log(`Skipped past slot: ${timeStr}`);
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
  
  // Handle booking
  const handleBooking = (futsal) => {
    router.push({
      name: 'playerCourtDetails',
      params: { id: futsal.id }
    })
  }
  
  // Toggle favorite (remove from favorites)
  const toggleFavorite = (futsal) => {
    // Get current favorites
    const favorites = JSON.parse(localStorage.getItem('favoriteCourts')) || []
    
    // Remove the court from favorites
    const updatedFavorites = favorites.filter(id => id !== futsal.id)
    
    // Update localStorage
    localStorage.setItem('favoriteCourts', JSON.stringify(updatedFavorites))
    
    // Update UI
    favoriteCourts.value = favoriteCourts.value.filter(court => court.id !== futsal.id)
  }
  
  onMounted(() => {
    fetchFavoriteCourts()
  })
  </script>