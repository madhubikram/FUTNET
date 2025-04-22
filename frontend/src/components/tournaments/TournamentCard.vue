// src/components/tournaments/TournamentCard.vue

<template>
  <div
  @click="$emit('view-details', tournament)"
    class="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 transition-all duration-300
           hover:shadow-[0_0_15px_rgba(34,197,94,0.3)] hover:border-green-500/50 group cursor-pointer">
    <!-- Image Section -->
    <div class="relative aspect-[16/9] overflow-hidden">
      <img 
        :src="tournament.banner ? getAssetUrl(tournament.banner) : '/placeholder-tournament.jpg'"
        :alt="tournament.name"
        class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      >
      <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>

      <!-- Status Badge -->
      <div class="absolute top-4 left-4">
        <span 
          class="px-3 py-1 text-xs font-semibold rounded-full flex items-center gap-1.5 shadow-lg backdrop-blur-sm"
          :class="{
            'bg-green-500/20 text-green-400 border border-green-500/20': tournament.status === 'Upcoming',
            'bg-blue-500/20 text-blue-400 border border-blue-500/20': tournament.status === 'Ongoing',
            'bg-gray-500/20 text-gray-400 border border-gray-700/20': tournament.status === 'Completed',
            'bg-orange-500/20 text-orange-400 border border-orange-500/20': tournament.status === 'Cancelled (Low Teams)'
          }"
        >
          {{ tournament.status }}
        </span>
      </div>

      <!-- Registration Status -->
      <div class="absolute top-4 right-4">
        <span v-if="tournament.isRegistered" 
              class="px-3 py-1 bg-green-500/90 text-white text-xs font-semibold rounded-full">
          Registered
        </span>
        <span v-else-if="tournament.registeredTeams >= tournament.maxTeams"
              class="px-3 py-1 bg-red-500/90 text-white text-xs font-semibold rounded-full">
          Full
        </span>
      </div>
    </div>

    <!-- Content Section -->
    <div class="p-6">
      <h3 class="text-xl font-semibold text-white mb-4 group-hover:text-green-400 transition-colors duration-300">
        {{ tournament.name }}
      </h3>

      <!-- Tournament Details -->
      <div class="space-y-3 mb-6">
        <!-- Organized By -->
        <div class="flex items-center gap-3 text-gray-300">
          <BuildingIcon class="w-5 h-5 text-gray-400" />
          <span>Organized by: {{ tournament.futsalId?.name || 'Unknown Futsal' }}</span>
        </div>

        <div class="flex items-start gap-3 text-gray-300">
          <CalendarIcon class="w-5 h-5 text-gray-400 shrink-0" />
          <div>
            <p>{{ formatDate(tournament.startDate) }}</p>
            <p class="text-sm text-gray-400"></p>
          </div>
        </div>

        <div class="flex items-center gap-3 text-gray-300">
          <MapPinIcon class="w-5 h-5 text-gray-400" />
          <span>{{ formatLocation(tournament.futsalId?.location) }}</span>
        </div>
        <div class="flex items-center gap-3 text-gray-300">
          <UsersIcon class="w-5 h-5 text-gray-400" />
          <span>{{ tournament.registeredTeams }}/{{ tournament.maxTeams }} Teams</span>
        </div>

        <div class="flex items-center gap-3 text-gray-300">
          <WalletIcon class="w-5 h-5 text-gray-400" />
          <span>Entry Fee: Rs. {{ tournament.registrationFee }}</span>
        </div>
      </div>

      <!-- Register Button -->
      <button
      v-if="showRegisterButton"
      @click.stop="$emit('view-details', tournament)"
      class="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 
             transition-colors duration-200 flex items-center justify-center gap-2"
      :disabled="tournament.registeredTeams >= tournament.maxTeams"
    >
        <UserPlusIcon class="w-4 h-4" />
        Register Now
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { 
  CalendarIcon, MapPinIcon, UsersIcon, WalletIcon, 
  UserPlusIcon, BuildingIcon 
} from 'lucide-vue-next'

const props = defineProps({
  tournament: {
    type: Object,
    required: true
  }
})
const formatLocation = (location) => {
  if (!location) return '';
  const parts = location.split(',').map(part => part.trim());
  // Take first 3 parts of the address
  return parts.slice(0, 3).join(', ');
}
// Show register button only for upcoming tournaments that user hasn't registered for
const showRegisterButton = computed(() => {
  return props.tournament.status === 'Upcoming' && 
         !props.tournament.isRegistered &&
         props.tournament.registeredTeams < props.tournament.maxTeams
})

const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

</script>