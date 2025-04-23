<template>
  <PageLayout>
    <div class="p-4 md:p-8">
      <button
        @click="goBack"
        class="mb-6 inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeftIcon class="w-4 h-4" />
        Back to Tournaments
      </button>

      <h1 class="text-2xl font-bold text-white mb-2">
        Registered Teams for {{ tournamentDetails?.name || 'Tournament' }}
      </h1>
      <p class="text-gray-400 mb-6">
        Total Registered Teams: {{ registrationDetails.length }} / {{ tournamentDetails?.maxTeams || 'N/A' }}
      </p>

      <div v-if="loading" class="text-center py-10">
        <Loader2Icon class="w-8 h-8 text-green-400 animate-spin inline-block" />
        <p class="text-gray-400 mt-2">Loading teams...</p>
      </div>

      <div v-else-if="error" class="text-center py-10 text-red-400">
        <p>Error loading teams: {{ error }}</p>
      </div>

      <div v-else-if="registrationDetails.length === 0" class="text-center py-10">
        <p class="text-gray-500">No teams have registered for this tournament yet.</p>
      </div>

      <!-- Teams Table -->
      <div v-else class="bg-gray-800 rounded-lg overflow-hidden shadow">
        <table class="min-w-full divide-y divide-gray-700">
          <thead class="bg-gray-700/50">
            <tr>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Team ID
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Team Name
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Captain Username
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Captain Email
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Registered On
              </th>
              <th scope="col" class="relative px-6 py-3">
                <span class="sr-only">View Members</span>
              </th>
            </tr>
          </thead>
          <tbody class="bg-gray-800 divide-y divide-gray-700">
            <template v-for="(registration, index) in registrationDetails" :key="registration._id">
              <tr class="hover:bg-gray-700/30 transition-colors">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-400">
                  {{ registration.teamId || 'N/A' }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                  {{ registration.teamName }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  {{ registration.user?.username || 'N/A' }} 
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-blue-400">
                  {{ registration.user?.email || '(No Email)' }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                  {{ formatDate(registration.createdAt) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    @click="toggleExpand(index)"
                    class="text-blue-400 hover:text-blue-300 transition-colors p-1 rounded"
                    :title="expandedRowIndex === index ? 'Hide Members' : 'View Members'"
                  >
                    <ChevronDownIcon v-if="expandedRowIndex === index" class="w-5 h-5" />
                    <ChevronRightIcon v-else class="w-5 h-5" />
                  </button>
                </td>
              </tr>
              <!-- Expanded Row for Members -->
              <tr v-if="expandedRowIndex === index">
                <td colspan="6" class="px-6 py-4 bg-gray-700/50">
                  <h4 class="text-sm font-medium text-gray-300 mb-2">Team Members:</h4>
                  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div v-for="player in registration.players" :key="player._id" 
                      class="bg-gray-800 p-3 rounded border border-gray-700">
                      <div class="flex-grow">
                        <!-- Role badge at top -->
                        <div class="flex items-center justify-between mb-2">
                          <span class="bg-gray-700 text-xs text-white font-medium px-2 py-1 rounded capitalize">
                            {{ player.role }}
                          </span>
                          <span v-if="player.role === 'captain'" class="text-xs text-green-400 font-medium">Team Captain</span>
                        </div>
                        
                        <!-- Inline info rows -->
                        <div class="text-sm mb-1 flex items-center">
                          <span class="text-gray-500 w-20">Name:</span>
                          <span class="text-white">{{ player.fullName }}</span>
                        </div>
                        
                        <div class="text-sm mb-1 flex items-center">
                          <span class="text-gray-500 w-20">Contact:</span>
                          <span class="text-yellow-400">{{ player.contact }}</span>
                        </div>
                        
                        <div v-if="player.username" class="text-sm flex items-center">
                          <span class="text-gray-500 w-20">Username:</span>
                          <span class="text-blue-400">{{ player.username }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>
  </PageLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import PageLayout from '@/components/layout/PageLayout.vue';
import { ArrowLeftIcon, Loader2Icon, ChevronRightIcon, ChevronDownIcon } from 'lucide-vue-next';
import API_URL from '@/config/api';

const props = defineProps({
  id: { // Tournament ID passed as prop from router
    type: String,
    required: true,
  },
});

const router = useRouter();
const tournamentDetails = ref(null);
const registrationDetails = ref([]);
const loading = ref(true);
const error = ref(null);
const expandedRowIndex = ref(null); // Track which row is expanded

const fetchTournamentAndTeams = async () => {
  loading.value = true;
  error.value = null;
  try {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Authentication token not found.');

    console.log(`Fetching details for tournament: ${props.id}`);
    
    // Fetch tournament details (which includes bracket generation check on backend)
    const tournamentResponse = await fetch(`${API_URL}/api/tournaments/${props.id}`, {
       headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!tournamentResponse.ok) {
      const errData = await tournamentResponse.json().catch(() => ({}));
      throw new Error(errData.message || `Failed to fetch tournament details. Status: ${tournamentResponse.status}`);
    }
    
    const tournamentData = await tournamentResponse.json();
    // ** FIX: Access the tournament object nested in the response **
    tournamentDetails.value = tournamentData.tournament; 
    console.log('Tournament details received:', tournamentDetails.value?.name);
    // We don't need the registeredTeamsDetails from this response here, as we fetch separately.

    // Fetch registered teams details
    console.log(`Attempting to fetch registrations for tournament ${props.id}`);
    const teamsResponse = await fetch(`${API_URL}/api/tournaments/${props.id}/registrations`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    
    console.log(`Registration fetch status: ${teamsResponse.status}`);
    
    if (teamsResponse.ok) {
      const data = await teamsResponse.json();
      console.log(`Received ${data.length} team registrations:`, data);
      registrationDetails.value = data;
    } else {
      const errData = await teamsResponse.json().catch(() => ({}));
      // Don't throw error for teams fetch, just log and show empty list
      console.error(`Failed to fetch registered teams. Status: ${teamsResponse.status}, Message: ${errData.message}`);
      registrationDetails.value = []; 
    }

  } catch (err) {
    console.error('Error loading tournament teams page:', err);
    error.value = err.message;
    // Ensure lists are empty on error
    tournamentDetails.value = null;
    registrationDetails.value = [];
  } finally {
    loading.value = false;
    console.log('Final registrationDetails:', registrationDetails.value);
  }
};

const goBack = () => {
  router.push({ name: 'adminTournaments' }); // Or use router.go(-1)
};

const toggleExpand = (index) => {
  expandedRowIndex.value = expandedRowIndex.value === index ? null : index;
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString();
};

onMounted(fetchTournamentAndTeams);
</script> 