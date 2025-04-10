// src/views/PlayerTournyDetails.vue
<template>
  <PageLayout>
    <div v-if="loading" class="flex justify-center items-center min-h-screen">
      <Loader2Icon class="w-8 h-8 text-green-400 animate-spin" />
      <span class="ml-2 text-gray-400">Loading tournament details...</span>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-12 text-red-400">
      {{ error }}
    </div>

    <!-- Content -->
    <div v-else>
      <!-- Navigation and Image Section -->
      <div class="relative min-h-[40vh] bg-gray-800">
        <!-- Back Button -->
        <button 
          @click="$router.push('/tournaments')" 
          class="absolute top-4 left-4 z-10 flex items-center gap-2 px-4 py-2 bg-gray-900/80 rounded-lg text-white hover:bg-gray-800 transition-colors"
        >
          <ChevronLeftIcon class="w-5 h-5" />
          Back
        </button>

        <!-- Tournament Image -->
        <div class="relative w-full h-[40vh]">
          <img 
            :src="tournament?.banner ? `http://localhost:5000${tournament.banner}` : '/placeholder-tournament.jpg'" 
            class="w-full h-full object-cover md:object-cover object-center" 
            :alt="tournament?.name"
          >
          <div class="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black"></div>
        </div>

        <!-- Tournament Title & Status -->
        <div class="absolute bottom-0 left-0 right-0 p-8 text-white">
          <span 
            class="inline-block px-3 py-1 rounded-full text-sm font-medium mb-4"
            :class="{
              'bg-green-500/20 text-green-400 border border-green-500/20': tournament?.status === 'Upcoming',
              'bg-blue-500/20 text-blue-400 border border-blue-500/20': tournament?.status === 'Ongoing',
              'bg-gray-500/20 text-gray-400 border border-gray-700/20': tournament?.status === 'Completed',
              'bg-orange-500/20 text-orange-400 border border-orange-500/20': tournament?.status === 'Cancelled (Low Teams)'
            }"
          >
            {{ tournament?.status }}
          </span>
          <h1 class="text-4xl font-bold mb-2">{{ tournament?.name }}</h1>
          <p class="text-gray-300">Organized by {{ tournament?.futsalId?.name }}</p>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="bg-gray-900 border-b border-gray-700">
        <div class="max-w-7xl mx-auto px-4">
          <div class="flex space-x-8">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              @click="currentTab = tab.id"
              :class="[
                'py-4 text-sm font-medium border-b-2 -mb-px transition-colors',
                currentTab === tab.id
                  ? 'text-green-400 border-green-400'
                  : 'text-gray-400 border-transparent hover:text-gray-300'
              ]"
            >
              {{ tab.name }}
            </button>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="max-w-7xl mx-auto px-4 py-8">
        <!-- Tab Content -->
        <div v-if="currentTab === 'details'" class="space-y-8">
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <!-- Left Column: Tournament Details -->
            <div class="lg:col-span-2 space-y-8">
              <!-- Tournament schedule card with improved date/time display -->
              <section class="bg-gray-800 rounded-xl overflow-hidden">
                <div class="p-6 border-b border-gray-700">
                  <h3 class="text-xl font-semibold text-white mb-4">Tournament Schedule</h3>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="space-y-4">
                      <div class="flex items-start gap-4">
                        <div class="rounded-full bg-green-500/10 p-3">
                          <CalendarIcon class="h-5 w-5 text-green-400" />
                        </div>
                        <div>
                          <h4 class="text-sm font-medium text-green-400">Tournament Dates</h4>
                          <p class="text-lg text-white mt-1">{{ formatDate(tournament?.startDate) }}</p>
                          <p v-if="tournament?.startDate !== tournament?.endDate" class="text-lg text-white">
                            to {{ formatDate(tournament?.endDate) }}
                          </p>
                          <p class="text-sm text-gray-400 mt-1">Starting at {{ formatTime(tournament?.startTime) }}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div class="space-y-4">
                      <div class="flex items-start gap-4">
                        <div class="rounded-full bg-amber-500/10 p-3">
                          <ClockIcon class="h-5 w-5 text-amber-400" />
                        </div>
                        <div>
                          <h4 class="text-sm font-medium text-amber-400">Registration Deadline</h4>
                          <p class="text-lg text-white mt-1">{{ formatDate(tournament?.registrationDeadline) }}</p>
                          <p class="text-sm text-gray-400 mt-1">Closes at {{ formatTime(tournament?.registrationDeadlineTime) }}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <!-- Team Registration Status -->
                <div class="p-6" v-if="tournament">
                  <!-- Existing team information content... -->
                </div>
              </section>

              <!-- Key Information -->
              <section class="bg-gray-800 rounded-xl p-6 space-y-4">
                <h2 class="text-xl font-semibold text-white">Tournament Details</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="flex items-center gap-3 text-gray-300">
                    <CalendarIcon class="w-5 h-5 text-gray-400" />
                    <div>
                      <p>Starts: {{ formatDate(tournament?.startDate) }}</p>
                      <p>Ends: {{ formatDate(tournament?.endDate) }}</p>
                    </div>
                  </div>
                  <div class="flex items-center gap-3 text-gray-300">
                    <ClockIcon class="w-5 h-5 text-gray-400" />
                    <span>{{ tournament?.startTime }} onwards</span>
                  </div>
                  <div class="flex items-center gap-3 text-gray-300">
                    <UsersIcon class="w-5 h-5 text-gray-400" />
                    <span>{{ tournament?.registeredTeams }}/{{ tournament?.maxTeams }} Teams</span>
                  </div>
                  <div class="flex items-center gap-3 text-gray-300">
                    <WalletIcon class="w-5 h-5 text-gray-400" />
                    <span>Entry Fee: Rs. {{ tournament?.registrationFee }}</span>
                  </div>
                </div>
                <!-- Tournament Description -->
                <div class="mt-4 pt-4 border-t border-gray-700">
                  <h3 class="text-sm font-medium text-gray-300 mb-2">Description</h3>
                  <p class="text-gray-300">{{ tournament?.description }}</p>
                </div>
              </section>

              <!-- Tournament Format -->
              <section class="bg-gray-800 rounded-xl p-6 space-y-4">
                <h2 class="text-xl font-semibold text-white">Format & Match Settings</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 class="text-sm font-medium text-gray-300 mb-2">Match Format</h3>
                    <ul class="space-y-2 text-gray-400">
                      <li>• {{ tournament?.teamSize }} players per side</li>
                      <li>• {{ tournament?.substitutes }} substitutes allowed</li>
                      <li>• {{ tournament?.halfDuration }} minutes per half</li>
                      <li>• {{ tournament?.breakDuration }} minutes break</li>
                    </ul>
                  </div>
                  <div>
                    <h3 class="text-sm font-medium text-gray-300 mb-2">Tournament Structure</h3>
                    <ul class="space-y-2 text-gray-400">
                      <li>• {{ tournament?.format === 'single' ? 'Single Elimination' : 'Double Elimination' }}</li>
                      <li>• Minimum {{ tournament?.minTeams }} teams</li>
                      <li>• Maximum {{ tournament?.maxTeams }} teams</li>
                    </ul>
                  </div>
                </div>
              </section>

              <!-- Location Section -->
              <section class="bg-gray-800 rounded-xl p-6 space-y-4">
                <h2 class="text-xl font-semibold text-white">Location</h2>
                <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <!-- Location Details -->
                  <div class="md:col-span-2 flex items-start gap-3 text-gray-300">
                    <MapPinIcon class="w-5 h-5 text-gray-400 mt-1" />
                    <div>
                      <p class="font-medium">{{ formatLocation(tournament?.futsalId?.location) }}</p>
                    </div>
                  </div>
                  
                  <!-- Embedded Map -->
                  <div class="md:col-span-3 h-[200px] md:h-[250px] bg-gray-700 rounded-lg overflow-hidden relative z-10">
                    <MapComponent
                      :initial-location="mapLocation"
                      :readonly="true"
                      :hide-search="true"
                      class="w-full h-full"
                    />
                  </div>
                </div>
              </section>
            </div>

            <!-- Right Column: Registration and Prize Info -->
            <div class="space-y-6">
              <!-- Registration Status Card -->
              <div class="bg-gray-800 rounded-xl p-6 sticky top-6">
                <div class="space-y-4">
                  <!-- Prize Info -->
                  <div class="text-center p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <h3 class="text-green-400 font-medium mb-1">Total Prize Pool</h3>
                    <p class="text-2xl font-bold text-white">Rs. {{ tournament?.prizePool }}</p>
                    
                    <!-- Prize Breakdown -->
                    <div v-if="tournament?.prizes && (tournament.prizes.first || tournament.prizes.second || tournament.prizes.third)" class="mt-3 pt-3 border-t border-green-500/20">
                      <div class="grid grid-cols-3 gap-2 text-sm">
                        <div v-if="tournament.prizes.first" class="text-center">
                          <span class="inline-block px-2 py-1 bg-yellow-400/20 text-yellow-300 rounded-full text-xs">1st Place</span>
                          <p class="text-white mt-1">Rs. {{ tournament.prizes.first }}</p>
                        </div>
                        <div v-if="tournament.prizes.second" class="text-center">
                          <span class="inline-block px-2 py-1 bg-gray-400/20 text-gray-300 rounded-full text-xs">2nd Place</span>
                          <p class="text-white mt-1">Rs. {{ tournament.prizes.second }}</p>
                        </div>
                        <div v-if="tournament.prizes.third" class="text-center">
                          <span class="inline-block px-2 py-1 bg-amber-600/20 text-amber-500 rounded-full text-xs">3rd Place</span>
                          <p class="text-white mt-1">Rs. {{ tournament.prizes.third }}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Registration Fee -->
                  <div class="flex justify-between text-gray-300 p-4 border-b border-gray-700">
                    <span>Registration Fee</span>
                    <span class="font-medium">Rs. {{ tournament?.registrationFee }}</span>
                  </div>

                  <!-- Registration Deadline -->
                  <div class="text-center p-4 bg-gray-700/50 rounded-lg">
                    <h4 class="text-gray-400 text-sm mb-1">Registration Deadline</h4>
                    <p class="text-white">{{ formatDate(tournament?.registrationDeadline) }}</p>
                    <p class="text-sm text-gray-400">{{ tournament?.registrationDeadlineTime }}</p>
                  </div>

                  <!-- Registration Button/Status -->
                  <div v-if="tournament?.status === 'Upcoming'">
                    <button
                      v-if="!tournament?.isRegistered"
                      @click="openRegistrationModal"
                      :disabled="tournament?.registeredTeams >= tournament?.maxTeams"
                      class="w-full px-6 py-3 bg-green-500 text-white rounded-lg 
                             hover:bg-green-600 transition-colors flex items-center 
                             justify-center gap-2 disabled:opacity-50"
                    >
                      <UserPlusIcon class="w-5 h-5" />
                      Register Team
                    </button>
                    <div 
                      v-else
                      class="text-center p-4 bg-green-500/10 border border-green-500/20 rounded-lg"
                    >
                      <CheckCircleIcon class="w-6 h-6 text-green-400 mx-auto mb-2" />
                      <p class="text-green-400 font-medium">You're Registered!</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="currentTab === 'rules'" class="space-y-6">
          <!-- Rules Section -->
          <section class="bg-gray-800 rounded-xl p-6 space-y-4">
            <h2 class="text-xl font-semibold text-white">Tournament Rules</h2>
            <div class="prose prose-invert max-w-none">
              <div class="text-gray-300 whitespace-pre-line">{{ tournament?.rules }}</div>
            </div>
          </section>
        </div>

        <div v-if="currentTab === 'bracket'" class="w-full overflow-hidden">
          <div v-if="bracketLoading" class="flex justify-center items-center p-16">
            <Loader2Icon class="animate-spin h-10 w-10 text-emerald-500" />
          </div>
          <div v-else-if="bracketError" class="p-6 bg-red-500/10 border border-red-500/30 rounded-lg text-center">
            <p class="text-red-400">{{ bracketError }}</p>
          </div>
          <div v-else-if="bracketData" class="w-full overflow-hidden bracket-tab">
            <ViewerTournamentBracket :tournament-data="bracketData" :tournament-name="tournament?.name || 'Tournament'" />
          </div>
          <div v-else class="p-6 bg-gray-800/50 border border-gray-700 rounded-lg text-center">
            <p class="text-gray-400">No bracket information available for this tournament.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Registration Modal -->
    <BaseModal v-if="showRegistrationModal" @close="showRegistrationModal = false">
    <template #header>
      <h3 class="text-xl font-semibold text-white">Team Registration</h3>
    </template>

    <template #body>
      <form @submit.prevent="handleRegistration" class="space-y-6">
        <!-- Team Information -->
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">Team Name</label>
          <input
            v-model="registrationForm.teamName"
            type="text"
            required
            class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          >
        </div>

        <!-- Player Information -->
        <div class="space-y-4">
  <h4 class="text-sm font-medium text-gray-300">Player Details</h4>
  
  <!-- Current User as Captain (uneditable username) -->
  <div class="space-y-3">
    <label class="block text-sm text-gray-400">Captain (You)</label>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div>
        <label class="block text-xs text-gray-500 mb-1">Username</label>
        <input
          v-model="registrationForm.captain.username"
          type="text"
          disabled
          class="w-full px-4 py-2 bg-gray-600 border border-gray-600 rounded-lg text-gray-400"
        >
      </div>
      <div>
        <label class="block text-xs text-gray-500 mb-1">Contact</label>
        <input
          v-model="registrationForm.captain.contact"
          type="tel"
          required
          placeholder="Contact number"
          class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
        >
      </div>
    </div>
    <div>
      <label class="block text-xs text-gray-500 mb-1">Full Legal Name</label>
      <input
        v-model="registrationForm.captain.fullName"
        type="text"
        required
        placeholder="Full legal name"
        class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
      >
    </div>
  </div>

  <!-- Required Players (based on tournament team size) - Only require contact and full name -->
  <div v-for="(player, index) in registrationForm.players" :key="`player-${index}`" class="space-y-3 pt-2 border-t border-gray-700">
    <label class="block text-sm text-gray-400">Player {{ index + 2 }}</label>
    <div>
      <label class="block text-xs text-gray-500 mb-1">Contact</label>
      <input
        v-model="player.contact"
        type="tel"
        required
        placeholder="Contact number"
        class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
      >
    </div>
    <div>
      <label class="block text-xs text-gray-500 mb-1">Full Legal Name</label>
      <input
        v-model="player.fullName"
        type="text"
        required
        placeholder="Full legal name"
        class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
      >
    </div>
  </div>

  <!-- Substitutes Section (optional based on tournament) - Only require contact and full name -->
  <div v-if="tournament?.substitutes > 0" class="pt-2 border-t border-gray-700">
    <div class="flex justify-between items-center mb-3">
      <h4 class="text-sm font-medium text-gray-300">Substitutes (Optional)</h4>
      <span class="text-xs text-gray-400">{{ registrationForm.substitutes.length }} of {{ tournament.substitutes }}</span>
    </div>
    
    <div v-for="(sub, index) in registrationForm.substitutes" :key="`sub-${index}`" class="space-y-3 mb-4 pb-3 border-b border-gray-700">
      <div class="flex justify-between items-center">
        <label class="block text-sm text-gray-400">Substitute {{ index + 1 }}</label>
        <button 
          @click="removeSubstitute(index)" 
          type="button"
          class="text-red-400 hover:text-red-300 p-1"
        >
          <XIcon class="w-4 h-4" />
        </button>
      </div>
      
      <div>
        <label class="block text-xs text-gray-500 mb-1">Contact</label>
        <input
          v-model="sub.contact"
          type="tel"
          required
          placeholder="Contact number"
          class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
        >
      </div>
      <div>
        <label class="block text-xs text-gray-500 mb-1">Full Legal Name</label>
        <input
          v-model="sub.fullName"
          type="text"
          required
          placeholder="Full legal name"
          class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
        >
      </div>
    </div>
    
    <!-- Add Substitute Button -->
    <button 
      v-if="canAddMoreSubstitutes"
      @click="addSubstitute" 
      type="button"
      class="w-full px-3 py-2 bg-gray-700 text-gray-300 rounded-lg border border-gray-600 
             hover:bg-gray-600 transition-colors flex items-center justify-center gap-2 mt-2"
    >
      <PlusIcon class="w-4 h-4" />
      Add Substitute
    </button>
  </div>
</div>

        <!-- Terms Acceptance -->
        <div class="flex items-start gap-2">
          <input
            v-model="registrationForm.acceptedTerms"
            type="checkbox"
            required
            class="mt-1 rounded bg-gray-700 border-gray-600 text-green-500"
          >
          <label class="text-sm text-gray-400">
            I have read and agree to the tournament rules and regulations
          </label>
        </div>
      </form>
    </template>

    <template #footer>
      <div class="flex justify-end gap-3">
        <button
          @click="showRegistrationModal = false"
          class="px-4 py-2 text-gray-400 hover:text-white"
        >
          Cancel
        </button>
        <button
          @click="handleRegistration"
          :disabled="!isFormValid || isSubmitting"
          class="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 
                 disabled:opacity-50 flex items-center gap-2"
        >
          <Loader2Icon v-if="isSubmitting" class="animate-spin w-4 h-4" />
          Register Team
        </button>
      </div>
    </template>
  </BaseModal>
  </PageLayout>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import MapComponent from '@/components/MapComponent.vue'
import { useRoute } from 'vue-router'
import PageLayout from '@/components/layout/PageLayout.vue'
import BaseModal from '@/components/BaseModal.vue'
import {
  ChevronLeftIcon,
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  UsersIcon,
  UserPlusIcon,
  CheckCircleIcon,
  Loader2Icon,
  WalletIcon,
  XIcon,    
  PlusIcon 
} from 'lucide-vue-next'
import ViewerTournamentBracket from '../components/tournaments/ViewerTournamentBracket.vue'

const route = useRoute()

const tabs = ref([
  { id: 'details', name: 'Details' },
  { id: 'rules', name: 'Rules' }
]);

// State
const tournament = ref(null)
const loading = ref(true)
const showRegistrationModal = ref(false)
const isSubmitting = ref(false)
const error = ref(null);
const currentTab = ref('details')
const bracketData = ref(null);
const bracketLoading = ref(false);
const bracketError = ref(null);

const initRegistrationForm = () => {
  const username = localStorage.getItem('username') || '';
  
  // Create empty player objects based on tournament team size (minus captain)
  const players = [];
  const teamSize = tournament.value?.teamSize || 5;
  for (let i = 0; i < teamSize - 1; i++) {
    players.push({
      contact: '',
      fullName: ''
    });
  }
  
  return {
    teamName: '',
    captain: {
      username: username,
      contact: '',
      fullName: ''
    },
    players: players,
    substitutes: [],
    acceptedTerms: false
  };
};

const registrationForm = ref({
  teamName: '',
  captain: {
    username: '',
    contact: '',
    fullName: ''
  },
  players: [],
  substitutes: [],
  acceptedTerms: false
});

watch(() => tournament.value, (newTournament) => {
  if (newTournament) {
    registrationForm.value = initRegistrationForm();
  }
}, { immediate: true });

// Computed
const canAddMoreSubstitutes = computed(() => {
  return registrationForm.value.substitutes.length < (tournament.value?.substitutes || 0);
});

const isFormValid = computed(() => {
  if (!registrationForm.value.teamName || 
      !registrationForm.value.captain.contact ||
      !registrationForm.value.captain.fullName ||
      !registrationForm.value.acceptedTerms) {
    return false;
  }
  
  // Check if all required players have contact and fullName
  const playersFilled = registrationForm.value.players.every(player => 
    player.contact && player.fullName
  );
  
  // Substitutes are optional, but if added must have contact and fullName
  const substitutesValid = registrationForm.value.substitutes.every(sub => 
    sub.contact && sub.fullName
  );
  
  return playersFilled && substitutesValid;
});

const mapLocation = computed(() => {
  if (!tournament.value?.futsalId?.coordinates) return {
    lat: 27.7172,
    lng: 85.3240
  };
  
  return {
    lat: tournament.value.futsalId.coordinates.lat,
    lng: tournament.value.futsalId.coordinates.lng
  };
});

// Methods
const addSubstitute = () => {
  if (canAddMoreSubstitutes.value) {
    registrationForm.value.substitutes.push({
      username: '',
      contact: '',
      fullName: ''
    });
  }
};

const removeSubstitute = (index) => {
  registrationForm.value.substitutes.splice(index, 1);
};

const fetchTournamentDetails = async () => {
  try {
    loading.value = true;
    error.value = null;
    
    const response = await fetch(`http://localhost:5000/api/player/tournaments/${route.params.id}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch tournament details');
    }

    tournament.value = await response.json();
    console.log('Fetched tournament:', tournament.value);

  } catch (err) {
    console.error('Error fetching tournament:', err);
    error.value = err.message;
  } finally {
    loading.value = false;
  }
};

const formatLocation = (location) => {
  if (!location) return '';
  const parts = location.split(',').map(part => part.trim());
  return parts.slice(0, 3).join(', ');
}

const openRegistrationModal = () => {
  registrationForm.value = initRegistrationForm();
  showRegistrationModal.value = true;
};

const handleRegistration = async () => {
  if (!isFormValid.value) {
    return;
  }

  try {
    isSubmitting.value = true;
    
    // Format the registration data to match what the backend expects
    const registrationData = {
      tournamentId: tournament.value._id,
      teamName: registrationForm.value.teamName,
      players: [
        {
          role: 'captain',
          username: registrationForm.value.captain.username,
          contact: registrationForm.value.captain.contact,
          fullName: registrationForm.value.captain.fullName
        },
        ...registrationForm.value.players.map(player => ({
          role: 'player',
          contact: player.contact,
          fullName: player.fullName
        })),
        ...registrationForm.value.substitutes.map(sub => ({
          role: 'substitute',
          contact: sub.contact,
          fullName: sub.fullName
        }))
      ]
    };
    
    const response = await fetch(`http://localhost:5000/api/player/tournaments/${tournament.value._id}/register`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(registrationData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to register team');
    }

    // Update UI after successful registration
    tournament.value.isRegistered = true;
    tournament.value.registeredTeams += 1;
    showRegistrationModal.value = false;
    
    // Show success message or notification here
    
  } catch (error) {
    console.error('Registration error:', error);
    // Show error notification
  } finally {
    isSubmitting.value = false;
  }
};

const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat('en-US', { 
    weekday: 'long',
    year: 'numeric', 
    month: 'long', 
    day: 'numeric'
  }).format(date);
};

const formatTime = (timeString) => {
  if (!timeString) return '-';
  return timeString;
};

// Function to update tabs based on tournament status or bracket availability
const updateTabs = () => {
  const baseTabs = [
    { id: 'details', name: 'Details' },
    { id: 'rules', name: 'Rules' }
  ];

  let newTabs = [...baseTabs]; // Start with the base tabs

  // Show bracket tab only if the bracket has been generated
  if (tournament.value?.bracket?.generated) {
    newTabs.push({ id: 'bracket', name: 'Bracket' });
  }

  tabs.value = newTabs; // Update the reactive tabs ref

  // If the current tab is no longer valid (e.g., bracket was removed), switch back to details
  if (!tabs.value.some(tab => tab.id === currentTab.value)) {
    currentTab.value = 'details';
  }
};

watch(tournament, (newTournament) => {
  if (newTournament) {
    registrationForm.value = initRegistrationForm();
    updateTabs(); // Update tabs when tournament data is loaded/changed
  }
}, { immediate: true, deep: true });

// Fetch Bracket Data
const fetchBracketData = async () => {
  try {
    bracketLoading.value = true;
    bracketError.value = null;
    
    const response = await fetch(`http://localhost:5000/api/player/tournaments/${route.params.id}/bracket`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch bracket data');
    }

    const data = await response.json();
    
    // Make sure we have tournament data before setting bracket data
    if (tournament.value && data) {
      // Pass both bracket data and tournament status to the component
      bracketData.value = {
        ...data,
        status: tournament.value.status
      };
    } else {
      throw new Error('Tournament or bracket data is missing');
    }
  } catch (err) {
    console.error('Error fetching bracket data:', err);
    bracketError.value = err.message;
  } finally {
    bracketLoading.value = false;
  }
};

// Watch for tab changes to fetch bracket data
watch(currentTab, (newTab) => {
  if (newTab === 'bracket' && tournament.value?._id && !bracketData.value) {
    fetchBracketData();
  }
});

// Also watch tournament ID in case it changes after component mount
watch(() => tournament.value?._id, (newId) => {
  if (newId && currentTab.value === 'bracket') {
     // Reset bracket state if tournament changes
     bracketData.value = null;
     bracketError.value = null;
    fetchBracketData();
  }
});

// Lifecycle Hooks
onMounted(() => {
  fetchTournamentDetails()
})
</script>

<style scoped>
/* Ensure bracket tab has proper width */
.bracket-tab {
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
}

@media (max-width: 768px) {
  .bracket-tab {
    padding: 0;
  }
}
</style>