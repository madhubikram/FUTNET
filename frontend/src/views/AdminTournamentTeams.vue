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
                Captain
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
                  {{ getCaptainName(registration) }}
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
                <td colspan="5" class="px-6 py-4 bg-gray-700/50">
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
const captainEmails = ref({}); // Store captain emails by registration ID

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const fetchTournamentAndTeams = async () => {
  loading.value = true;
  error.value = null;
  try {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Authentication token not found.');

    console.log(`Fetching details for tournament: ${props.id}`);
    
    // Fetch basic tournament details (like name, maxTeams)
    const tournamentResponse = await fetch(`${API_URL}/tournaments/${props.id}`, {
       headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!tournamentResponse.ok) throw new Error('Failed to fetch tournament details.');
    tournamentDetails.value = await tournamentResponse.json();
    console.log('Tournament details received:', tournamentDetails.value?.name);

    // Fetch registered teams details
    console.log(`Attempting to fetch registrations for tournament ${props.id}`);
    try {
      const teamsResponse = await fetch(`${API_URL}/tournaments/${props.id}/registrations`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      console.log(`Registration fetch status: ${teamsResponse.status}`);
      
      if (teamsResponse.ok) {
        const data = await teamsResponse.json();
        console.log(`Received ${data.length} team registrations:`, data);
        registrationDetails.value = data;
        
        // After getting registrations, fetch captain details
        await fetchCaptainDetails(data);
      } else if (teamsResponse.status === 403) {
        // If 403 Forbidden, treat it as "no teams yet" rather than an error
        console.log('Tournament exists but no access to registrations (403 error).');
        registrationDetails.value = [];
      } else {
        console.error(`Teams fetch failed with status: ${teamsResponse.status}`);
        throw new Error(`Failed to fetch registered teams. Status: ${teamsResponse.status}`);
      }
    } catch (teamsError) {
      console.error('Error fetching teams:', teamsError);
      // Don't set error.value here, just log it and continue with empty registrations
      registrationDetails.value = [];
    }

  } catch (err) {
    console.error('Error in tournament teams page:', err);
    error.value = err.message;
  } finally {
    loading.value = false;
    console.log('Final registrationDetails:', registrationDetails.value);
  }
};

// Fetch email addresses for team captains
const fetchCaptainDetails = async (registrations) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    // Process each registration to get captain emails
    for (const registration of registrations) {
      // Find the captain in the players array
      const captain = registration.players.find(p => p.role === 'captain');
      
      if (captain && captain.username) {
        try {
          // Fetch user details by username to get email
          const response = await fetch(`${API_URL}/users/profile/${captain.username}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (response.ok) {
            const userData = await response.json();
            if (userData && userData.email) {
              // Store the email keyed by registration ID
              captainEmails.value[registration._id] = userData.email;
            }
          }
        } catch (error) {
          console.error(`Error fetching details for captain ${captain.username}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('Error fetching captain details:', error);
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

const getCaptainName = (registration) => {
  if (!registration.players || !Array.isArray(registration.players) || registration.players.length === 0) {
    return 'N/A';
  }
  
  // Find captain (should be first player or player with role='captain')
  const captain = registration.players.find(p => p.role === 'captain') || registration.players[0];
  return captain?.fullName || 'N/A';
};

onMounted(fetchTournamentAndTeams);
</script> 