// src/views/PlayerTourny.vue

<template>
  <PageLayout>
    <div class="px-4 md:px-8 py-4 md:py-6">
      <!-- Header Section -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h1 class="text-2xl font-bold text-white">Tournaments</h1>
        
        <!-- Search and Filter Section (Desktop) -->
        <div class="hidden md:flex items-center gap-4 w-full md:w-auto">
          <div class="relative flex-1 md:w-64">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search tournaments..."
              class="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400"
            >
          </div>
          
          <button
            @click="showFilters = true"
            class="px-4 py-2 bg-gray-800 text-white rounded-lg flex items-center gap-2 hover:bg-gray-700"
          >
            <FilterIcon class="w-4 h-4" />
            <span>Filters</span>
          </button>
        </div>

        <!-- Mobile Search Toggle -->
        <div class="flex md:hidden items-center gap-2 w-full">
          <button
            @click="showMobileSearch = !showMobileSearch"
            class="p-2 bg-gray-800 text-white rounded-lg"
          >
            <SearchIcon class="w-5 h-5" />
          </button>
          <button
            @click="showFilters = true"
            class="p-2 bg-gray-800 text-white rounded-lg"
          >
            <FilterIcon class="w-5 h-5" />
          </button>
        </div>
      </div>

      <!-- Mobile Search Bar -->
      <div
        v-if="showMobileSearch"
        class="mb-4 md:hidden"
      >
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search tournaments..."
          class="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400"
        >
      </div>

      <!-- Tabs Navigation -->
      <div class="border-b border-gray-700 mb-6">
        <nav class="flex overflow-x-auto">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="currentTab = tab.id"
            :class="[
              'px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px',
              currentTab === tab.id
                ? 'text-green-400 border-green-400'
                : 'text-gray-400 border-transparent hover:text-gray-300'
            ]"
          >
            {{ tab.name }}
            <span 
              v-if="tab.count !== undefined"
              class="ml-2 px-2 py-0.5 text-xs rounded-full"
              :class="currentTab === tab.id 
                ? 'bg-green-500/20 text-green-400' 
                : 'bg-gray-700 text-gray-400'"
            >
              {{ tab.count }}
            </span>
          </button>
        </nav>
      </div>

      <!-- Content Area -->
      <div class="space-y-6">
        <!-- Loading State -->
        <div v-if="loading" class="flex justify-center items-center py-12">
          <Loader2Icon class="w-8 h-8 text-green-400 animate-spin" />
          <span class="ml-2 text-gray-400">Loading tournaments...</span>
        </div>

        <div v-else-if="error" class="text-center py-12 text-red-400">
          {{ error }}
        </div>

        <!-- Empty State -->
        <div
          v-else-if="!loading && filteredTournaments.length === 0"
          class="text-center py-12"
        >
          <div class="flex flex-col items-center gap-4">
            <TrophyIcon class="w-12 h-12 text-gray-600" />
            <h3 class="text-lg font-medium text-white">No tournaments found</h3>
            <p class="text-gray-400">
              {{ getEmptyStateMessage }}
            </p>
          </div>
        </div>

        <!-- Tournament Grid -->
        <div
          v-else
          class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <TournamentCard
            v-for="tournament in filteredTournaments"
            :key="tournament.id"
            :tournament="tournament"
            @register="handleRegister"
            @view-details="viewTournamentDetails"
          />
        </div>
      </div>
    </div>

    <!-- Filter Modal -->
    <FilterModal
      v-if="showFilters"
      :filters="filters"
      @close="showFilters = false"
      @apply="applyFilters"
    />

    <!-- Registration Modal -->
    <RegisterModal
      v-if="showRegisterModal"
      :tournament="selectedTournament"
      @close="showRegisterModal = false"
      @confirm="confirmRegistration"
    />
  </PageLayout>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useTournamentStore } from '@/stores/useTournamentStore'
import PageLayout from '@/components/layout/PageLayout.vue'
import TournamentCard from '@/components/tournaments/TournamentCard.vue'
import FilterModal from '@/components/tournaments/modals/FilterModal.vue'
import RegisterModal from '@/components/tournaments/modals/RegisterModal.vue'
import { 
  FilterIcon, SearchIcon, TrophyIcon, Loader2Icon 
} from 'lucide-vue-next'

// Router
const router = useRouter()
const route = useRoute()
// Store
const tournamentStore = useTournamentStore()

// Local State
const currentTab = ref('upcoming')
const searchQuery = ref('')
const showMobileSearch = ref(false)
const showFilters = ref(false)
const showRegisterModal = ref(false)
const selectedTournament = ref(null)

// Computed
const loading = computed(() => tournamentStore.loading)
const error = computed(() => tournamentStore.error)

// Tabs Configuration
const tabs = computed(() => [
  { 
    id: 'upcoming', 
    name: 'Upcoming', 
    count: tournamentStore.upcomingTournaments.length 
  },
  { 
    id: 'my-tournaments', 
    name: 'My Tournaments', 
    count: tournamentStore.myTournaments.length 
  },
  { 
    id: 'ongoing', 
    name: 'Ongoing', 
    count: tournamentStore.ongoingTournaments.length 
  },
  { 
    id: 'history', 
    name: 'History', 
    count: tournamentStore.pastTournaments.length 
  }
])

// Filter State
const filters = ref({
  dateRange: {
    start: '',
    end: ''
  },
  location: '',
  format: ''
})

// No need for local tournaments ref since we're using the store

// Computed Properties
const baseFilteredTournaments = computed(() => {
  switch (currentTab.value) {
    case 'upcoming':
      return tournamentStore.upcomingTournaments;
    case 'my-tournaments':
      return tournamentStore.myTournaments;
    case 'ongoing':
      return tournamentStore.ongoingTournaments;
    case 'history':
      return tournamentStore.pastTournaments;
    default:
      return [];
  }
})

const filteredTournaments = computed(() => {
  console.log('Filtering tournaments:', {
    baseFiltered: baseFilteredTournaments.value,
    searchQuery: searchQuery.value,
    filters: filters.value
  });
  let filtered = [...baseFilteredTournaments.value]

  // Apply search
  if (searchQuery.value) {
  const query = searchQuery.value.toLowerCase();
  filtered = filtered.filter(tournament =>
    tournament.name.toLowerCase().includes(query) ||
    (tournament.futsalId?.location && 
     formatLocation(tournament.futsalId.location).toLowerCase().includes(query))
  );
}


  // Apply filters
  if (filters.value.location) {
    filtered = filtered.filter(tournament =>
      tournament.location.toLowerCase().includes(filters.value.location.toLowerCase())
    )
  }

  if (filters.value.format) {
    filtered = filtered.filter(tournament =>
      tournament.format === filters.value.format
    )
  }

  if (filters.value.dateRange.start) {
    filtered = filtered.filter(tournament =>
      new Date(tournament.startDate) >= new Date(filters.value.dateRange.start)
    )
  }

  if (filters.value.dateRange.end) {
    filtered = filtered.filter(tournament =>
      new Date(tournament.endDate) <= new Date(filters.value.dateRange.end)
    )
  }
  console.log('Final filtered tournaments:', filtered);
  return filtered
})

const getEmptyStateMessage = computed(() => {
  switch (currentTab.value) {
    case 'upcoming':
      return 'No upcoming tournaments available'
    case 'my-tournaments':
      return 'You haven\'t registered for any tournaments yet'
    case 'ongoing':
      return 'No tournaments are currently in progress'
    case 'past':
      return 'No past tournaments found'
    default:
      return 'No tournaments found'
  }
})

// Methods
const formatLocation = (location) => {
  if (!location) return '';
  const parts = location.split(',').map(part => part.trim());
  return parts.slice(0, 2).join(', ');
}
const handleRegister = (tournament) => {
  selectedTournament.value = tournament
  showRegisterModal.value = true
}

const confirmRegistration = async ({ tournament, teamInfo }) => {
  try {
    // 1. Register the user
    await tournamentStore.registerForTournament(tournament._id, teamInfo)
    
    // 2. Refetch ALL tournament data to ensure state consistency
    // This automatically includes fetching user registrations again internally
    await tournamentStore.fetchTournaments()
    
    // 3. Close the modal
    showRegisterModal.value = false
    
    // 4. Switch to the "My Tournaments" tab
    currentTab.value = 'my-tournaments'
    
  } catch (error) {
    console.error('Registration error:', error)
    // Optionally show an error toast to the user
  }
}

// Lifecycle Hooks
onMounted(async () => {
  console.log('Component mounted');
  const userRole = localStorage.getItem('userRole')
  if (userRole !== 'player') {
    router.push('/login')
    return
  }
  
  // Initial fetch - might not have the latest registration yet
  await tournamentStore.fetchTournaments();
  console.log('Initial Tournaments fetched on mount:', {
    all: tournamentStore.tournaments,
    upcoming: tournamentStore.upcomingTournaments,
    ongoing: tournamentStore.ongoingTournaments,
    past: tournamentStore.pastTournaments
  });

  // Set initial tab based on query AFTER initial fetch. Watcher will handle re-fetch if needed.
  if (route.query.tab && tabs.value.some(t => t.id === route.query.tab)) {
    console.log(`Setting initial tab to ${route.query.tab} based on query parameter`);
    currentTab.value = route.query.tab;
  }
});

// Watch for route query changes specifically for the tab parameter
watch(
  () => route.query,
  async (newQuery, oldQuery) => {
    // Check if we navigated specifically to the 'my-tournaments' tab via query
    if (newQuery.tab === 'my-tournaments' && oldQuery?.tab !== 'my-tournaments') {
      console.log('Detected navigation/update to my-tournaments tab via query param.');
      // Ensure the tab is visually selected
      currentTab.value = 'my-tournaments';
      
      // Force a refresh of the tournament data after a short delay
      console.log('Forcing tournament data refresh due to tab navigation.');
      await new Promise(resolve => setTimeout(resolve, 300)); // Small delay
      await tournamentStore.fetchTournaments(); // Re-fetch data
      console.log('Tournament data re-fetched.');
    } 
    // Handle setting tab if query changes for other reasons (e.g., browser back/forward)
    else if (newQuery.tab && newQuery.tab !== oldQuery?.tab && tabs.value.some(t => t.id === newQuery.tab)) {
         console.log(`Setting tab to ${newQuery.tab} based on query parameter change.`);
         currentTab.value = newQuery.tab;
         // Optionally re-fetch here too if needed for other tabs
    }
  },
  { deep: true } // Watch nested changes in query object if any
);

const viewTournamentDetails = (tournament) => {
  console.log('Attempting navigation:', {
    tournament,
    id: tournament._id,
    currentRoute: route.path
  });
  
  router.push({
    name: 'tournament-details',
    params: { id: tournament._id.toString() }
  }).then(() => {
    console.log('Navigation successful');
  }).catch(err => {
    console.error('Navigation failed:', err);
  });
};

const applyFilters = (newFilters) => {
  filters.value = newFilters
  showFilters.value = false
}
</script>