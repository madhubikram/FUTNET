<template>
  <div class="tournament-viewer flex flex-col w-full bg-transparent text-gray-100 gap-4 font-sans">
    <div ref="bracketContainerRef" class="bg-gradient-to-b from-gray-800/90 to-gray-800/70 backdrop-blur-sm rounded-xl p-5 shadow-xl border border-gray-700/50 overflow-x-auto">
      <div
        class="flex gap-6 p-2 min-w-max"
        :style="{
          transform: `scale(${zoomLevel / 100})`,
          transformOrigin: 'top left',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }"
      >
        <!-- Render rounds and matches -->
        <div
          v-for="round in rounds"
          :key="`round-${round.round}`"
          class="flex flex-col"
          :style="{
            minWidth: '280px',
            maxWidth: '350px',
            justifyContent: 'center'
          }"
        >
          <div class="mb-3 text-center">
            <h3 class="font-bold text-lg bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">
              {{ getRoundName(round.round, round.matches.filter(m => !m.isThirdPlace).length) }}
            </h3>
          </div>

          <div class="flex flex-col justify-around h-full gap-5">
            <!-- Display only regular matches (not 3rd place match) -->
            <div
              v-for="(match, matchIndex) in round.matches.filter(m => !m.isThirdPlace)"
              :key="match.id"
              :class="[
                'w-full rounded-xl overflow-hidden shadow-lg border transition-all',
                getMatchCardBorder(match),
                'bg-gradient-to-b',
                getMatchCardColor(match)
              ]"
            >
              <div class="bg-gray-800/80 backdrop-blur-sm px-3 py-2 flex justify-between items-center border-b border-gray-700/50">
                <span class="font-medium text-sm">{{ match.matchName || `Round ${match.round} Match ${matchIndex + 1}` }}</span>
                <!-- Match date and time if available -->
                <div v-if="match.date && match.time" class="text-xs text-gray-400 flex items-center gap-1">
                  <CalendarIcon class="h-3 w-3" /> 
                  {{ formatDate(match.date) }} 
                  <span class="mx-1">|</span>
                  <ClockIcon class="h-3 w-3" /> 
                  {{ match.time }}
                </div>
              </div>

              <!-- Match content for regular matches -->
              <div class="p-3 flex flex-col gap-3">
                <!-- Team 1 row -->
                <div :class="['flex items-center gap-2', match.winner === match.team1 ? 'opacity-100' : 'opacity-90']">
                  <div :class="[
                    'flex-1 p-2 rounded-lg bg-gray-800/50 border transition-all',
                    match.winner === match.team1 ? 'border-emerald-500/30' : 'border-gray-700/30'
                  ]">
                    <div class="font-medium text-sm truncate flex items-center">
                      <div v-if="match.winner === match.team1" class="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center mr-1.5 flex-shrink-0">
                        <TrophyIcon class="h-3 w-3 text-emerald-400" />
                      </div>
                      <span class="truncate">{{ match.team1 ? match.team1.name : 'TBD' }}</span>
                    </div>
                  </div>

                  <!-- Score display for team 1 -->
                  <div class="flex items-center justify-center w-10 h-10 bg-gray-800/70 rounded-lg border border-gray-700/50">
                    <span :class="['text-center font-medium', match.winner === match.team1 ? 'text-emerald-400' : 'text-gray-300']">
                      {{ match.score1 !== null ? match.score1 : '-' }}
                    </span>
                  </div>
                </div>

                <!-- Team 2 row -->
                <div :class="['flex items-center gap-2', match.winner === match.team2 ? 'opacity-100' : 'opacity-90']">
                  <div :class="[
                    'flex-1 p-2 rounded-lg bg-gray-800/50 border transition-all',
                    match.winner === match.team2 ? 'border-emerald-500/30' : 'border-gray-700/30'
                  ]">
                    <div class="font-medium text-sm truncate flex items-center">
                      <div v-if="match.winner === match.team2" class="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center mr-1.5 flex-shrink-0">
                        <TrophyIcon class="h-3 w-3 text-emerald-400" />
                      </div>
                      <span class="truncate">{{ match.team2 ? match.team2.name : 'TBD' }}</span>
                    </div>
                  </div>

                  <!-- Score display for team 2 -->
                  <div class="flex items-center justify-center w-10 h-10 bg-gray-800/70 rounded-lg border border-gray-700/50">
                    <span :class="['text-center font-medium', match.winner === match.team2 ? 'text-emerald-400' : 'text-gray-300']">
                      {{ match.score2 !== null ? match.score2 : '-' }}
                    </span>
                  </div>
                </div>

                <!-- PK display if applicable -->
                <div v-if="match.pk1 !== null && match.pk2 !== null" class="text-center text-xs text-gray-400 pt-2 border-t border-gray-700/30">
                  <span>Penalties: {{ match.pk1 }} - {{ match.pk2 }}</span>
                </div>

                <!-- Top scorer info if available -->
                <div v-if="match.topScorer && match.topScorer.name && match.topScorer.goals > 0" class="pt-2 border-t border-gray-700/30 flex items-center gap-2">
                  <StarIcon class="h-3 w-3 text-amber-400" />
                  <span class="text-xs text-gray-300">{{ match.topScorer.name }} ({{ match.topScorer.goals }})</span>
                </div>

                <!-- Finals placings for final match -->
                <div
                  v-if="!match.isThirdPlace && round.round === Math.max(...rounds.map(r => r.round)) && match.winner"
                  class="mt-1 pt-2 border-t border-gray-700/30"
                >
                  <div class="flex flex-col gap-1.5">
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-medium text-emerald-400">1st Place</span>
                      <span class="text-sm font-semibold truncate">{{ match.winner.name }}</span>
                    </div>
                    <div
                      v-if="match.team1 && match.team1.id !== 'BYE' && match.team2 && match.team2.id !== 'BYE'"
                      class="flex items-center justify-between"
                    >
                      <span class="text-xs font-medium text-amber-400">2nd Place</span>
                      <span class="text-sm font-semibold truncate">
                        {{ match.winner.id === match.team1.id ? match.team2.name : match.team1.name }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Display 3rd place match in a separate column -->
        <div 
          v-if="getThirdPlaceMatch()"
          class="flex flex-col mt-12"
          style="min-width: 280px; max-width: 350px;"
        >
          <div class="mb-3 text-center">
            <h3 class="font-bold text-lg bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent flex items-center justify-center">
              <TrophyIcon class="h-5 w-5 mr-2 text-amber-500" />
              3rd Place Match
            </h3>
          </div>
          
          <div class="flex flex-col justify-center h-full">
            <div
              v-if="getThirdPlaceMatch()"
              class="w-full rounded-xl overflow-hidden shadow-lg border border-amber-700/40 transition-all bg-gradient-to-b from-amber-900/20 to-amber-950/20"
            >
              <div class="bg-amber-900/30 backdrop-blur-sm px-3 py-2 flex justify-between items-center border-b border-amber-700/50">
                <span class="font-medium text-sm flex items-center">
                  <TrophyIcon class="h-4 w-4 text-amber-700 mr-2" />
                  3rd Place Match
                </span>
                <!-- Match date and time if available -->
                <div v-if="getThirdPlaceMatch().date && getThirdPlaceMatch().time" class="text-xs text-gray-400 flex items-center gap-1">
                  <CalendarIcon class="h-3 w-3" /> 
                  {{ formatDate(getThirdPlaceMatch().date) }} 
                  <span class="mx-1">|</span>
                  <ClockIcon class="h-3 w-3" /> 
                  {{ getThirdPlaceMatch().time }}
                </div>
              </div>
              
              <div class="p-3 flex flex-col gap-3">
                <!-- Team 1 row -->
                <div :class="['flex items-center gap-2', getThirdPlaceMatch().winner === getThirdPlaceMatch().team1 ? 'opacity-100' : 'opacity-90']">
                  <div :class="[
                    'flex-1 p-2 rounded-lg bg-gray-800/50 border transition-all',
                    getThirdPlaceMatch().winner === getThirdPlaceMatch().team1 ? 'border-amber-600/50' : 'border-gray-700/30'
                  ]">
                    <div class="font-medium text-sm truncate flex items-center">
                      <div v-if="getThirdPlaceMatch().winner === getThirdPlaceMatch().team1" class="w-5 h-5 rounded-full bg-amber-700/30 flex items-center justify-center mr-1.5 flex-shrink-0">
                        <TrophyIcon class="h-3 w-3 text-amber-500" />
                      </div>
                      <span class="truncate">{{ getThirdPlaceMatch().team1 ? getThirdPlaceMatch().team1.name : 'Semifinal Loser 1' }}</span>
                    </div>
                  </div>

                  <!-- Score display for team 1 -->
                  <div class="flex items-center justify-center w-10 h-10 bg-gray-800/70 rounded-lg border border-gray-700/50">
                    <span :class="['text-center font-medium', getThirdPlaceMatch().winner === getThirdPlaceMatch().team1 ? 'text-amber-400' : 'text-gray-300']">
                      {{ getThirdPlaceMatch().score1 !== null ? getThirdPlaceMatch().score1 : '-' }}
                    </span>
                  </div>
                </div>

                <!-- Team 2 row -->
                <div :class="['flex items-center gap-2', getThirdPlaceMatch().winner === getThirdPlaceMatch().team2 ? 'opacity-100' : 'opacity-90']">
                  <div :class="[
                    'flex-1 p-2 rounded-lg bg-gray-800/50 border transition-all',
                    getThirdPlaceMatch().winner === getThirdPlaceMatch().team2 ? 'border-amber-600/50' : 'border-gray-700/30'
                  ]">
                    <div class="font-medium text-sm truncate flex items-center">
                      <div v-if="getThirdPlaceMatch().winner === getThirdPlaceMatch().team2" class="w-5 h-5 rounded-full bg-amber-700/30 flex items-center justify-center mr-1.5 flex-shrink-0">
                        <TrophyIcon class="h-3 w-3 text-amber-500" />
                      </div>
                      <span class="truncate">{{ getThirdPlaceMatch().team2 ? getThirdPlaceMatch().team2.name : 'Semifinal Loser 2' }}</span>
                    </div>
                  </div>

                  <!-- Score display for team 2 -->
                  <div class="flex items-center justify-center w-10 h-10 bg-gray-800/70 rounded-lg border border-gray-700/50">
                    <span :class="['text-center font-medium', getThirdPlaceMatch().winner === getThirdPlaceMatch().team2 ? 'text-amber-400' : 'text-gray-300']">
                      {{ getThirdPlaceMatch().score2 !== null ? getThirdPlaceMatch().score2 : '-' }}
                    </span>
                  </div>
                </div>

                <!-- PK display if applicable -->
                <div v-if="getThirdPlaceMatch().pk1 !== null && getThirdPlaceMatch().pk2 !== null" class="text-center text-xs text-gray-400 pt-2 border-t border-gray-700/30">
                  <span>Penalties: {{ getThirdPlaceMatch().pk1 }} - {{ getThirdPlaceMatch().pk2 }}</span>
                </div>

                <!-- Top scorer info if available -->
                <div v-if="getThirdPlaceMatch().topScorer && getThirdPlaceMatch().topScorer.name && getThirdPlaceMatch().topScorer.goals > 0" class="pt-2 border-t border-amber-700/30 flex items-center gap-2">
                  <StarIcon class="h-3 w-3 text-amber-400" />
                  <span class="text-xs text-gray-300">{{ getThirdPlaceMatch().topScorer.name }} ({{ getThirdPlaceMatch().topScorer.goals }})</span>
                </div>

                <!-- 3rd Place winner -->
                <div
                  v-if="getThirdPlaceMatch().winner"
                  class="mt-1 pt-2 border-t border-amber-700/30"
                >
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-medium text-amber-700">3rd Place Winner</span>
                    <span class="text-sm font-semibold truncate">{{ getThirdPlaceMatch().winner.name }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tournament Results Summary -->
    <div v-if="hasTournamentResults" class="bg-gradient-to-b from-gray-800/90 to-gray-800/70 backdrop-blur-sm rounded-xl p-5 shadow-xl border border-gray-700/50">
      <h3 class="text-lg font-semibold mb-4 text-white">Tournament Results</h3>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- First Place -->
        <div v-if="tournamentStats.firstPlace" class="bg-gradient-to-b from-yellow-900/20 to-yellow-950/20 border border-yellow-700/30 rounded-lg p-4">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <TrophyIcon class="h-6 w-6 text-yellow-500" />
            </div>
            <div>
              <span class="text-xs text-yellow-400 font-medium">1st Place</span>
              <h4 class="font-semibold text-lg">{{ tournamentStats.firstPlace.name }}</h4>
            </div>
          </div>
        </div>

        <!-- Second Place -->
        <div v-if="tournamentStats.secondPlace" class="bg-gradient-to-b from-gray-700/30 to-gray-800/30 border border-gray-600/30 rounded-lg p-4">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-full bg-gray-500/20 flex items-center justify-center">
              <TrophyIcon class="h-6 w-6 text-gray-400" />
            </div>
            <div>
              <span class="text-xs text-gray-400 font-medium">2nd Place</span>
              <h4 class="font-semibold text-lg">{{ tournamentStats.secondPlace.name }}</h4>
            </div>
          </div>
        </div>

        <!-- Third Place -->
        <div v-if="tournamentStats.thirdPlace" class="bg-gradient-to-b from-amber-900/20 to-amber-950/20 border border-amber-700/30 rounded-lg p-4">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-full bg-amber-700/20 flex items-center justify-center">
              <TrophyIcon class="h-6 w-6 text-amber-700" />
            </div>
            <div>
              <span class="text-xs text-amber-700 font-medium">3rd Place</span>
              <h4 class="font-semibold text-lg">{{ tournamentStats.thirdPlace.name }}</h4>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Zoom Controls for Bracket -->
    <div class="flex justify-end">
      <div class="flex items-center bg-gray-800/70 rounded-lg p-1 backdrop-blur-sm shadow-md">
        <button
          @click="handleZoomOut"
          class="p-1.5 hover:text-emerald-400 transition-colors rounded-md hover:bg-gray-700/50"
          aria-label="Zoom out"
        >
          <ZoomOutIcon size="16" />
        </button>
        <span class="px-2 text-sm font-medium">{{ zoomLevel }}%</span>
        <button
          @click="handleZoomIn"
          class="p-1.5 hover:text-emerald-400 transition-colors rounded-md hover:bg-gray-700/50"
          aria-label="Zoom in"
        >
          <ZoomInIcon size="16" />
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { TrophyIcon, StarIcon, CalendarIcon, ClockIcon, ZoomInIcon, ZoomOutIcon } from 'lucide-vue-next';

export default {
  name: 'ViewerTournamentBracket',
  components: {
    TrophyIcon,
    StarIcon,
    CalendarIcon,
    ClockIcon,
    ZoomInIcon,
    ZoomOutIcon
  },
  props: {
    tournamentData: {
      type: Object,
      required: true
    },
    tournamentName: {
      type: String,
      default: 'Tournament'
    }
  },
  setup(props) {
    // Reactive data
    const zoomLevel = ref(100);
    const rounds = ref([]);
    const tournamentStats = ref({
      firstPlace: null,
      secondPlace: null,
      thirdPlace: null,
      topScorer: { name: '', goals: 0 },
      mvp: '',
      playerOfTournament: ''
    });

    // Constants for zoom
    const ZOOM_STEP = 10;
    const MIN_ZOOM = 70;
    const MAX_ZOOM = 150;

    // Process the tournament data on mount and when it changes
    onMounted(() => {
      processData();
    });

    const processData = () => {
      if (props.tournamentData?.bracket?.rounds) {
        rounds.value = props.tournamentData.bracket.rounds;
        
        // Process stats if available
        if (props.tournamentData.stats) {
          tournamentStats.value = { ...tournamentStats.value, ...props.tournamentData.stats };
        } else {
          // Try to infer stats from rounds data
          updateTournamentPositions();
        }
      }
    };

    // Computed properties
    const hasTournamentResults = computed(() => {
      return tournamentStats.value.firstPlace || tournamentStats.value.secondPlace || tournamentStats.value.thirdPlace;
    });

    // Helper methods
    const getRoundName = (roundNumber, matchCount) => {
      // Handle special rounds
      if (roundNumber === 1) return 'First Round';
      if (roundNumber === 2 && matchCount === 2) return 'Semifinals';
      if (roundNumber === 3 && matchCount === 1) return 'Final';
      
      // Default
      return `Round ${roundNumber}`;
    };

    const getThirdPlaceMatch = () => {
      return rounds.value.flatMap(r => r.matches).find(m => m.isThirdPlace);
    };

    const getMatchCardColor = (match) => { 
      return match.hasBye ? 'from-amber-800/20 to-amber-900/10' : match.winner ? 'from-emerald-800/20 to-emerald-900/10' : 'from-gray-700/50 to-gray-800/50'; 
    };
    
    const getMatchCardBorder = (match) => { 
      return match.hasBye ? 'border-amber-600/50' : match.winner ? 'border-emerald-600/50' : 'border-gray-700/50'; 
    };

    const formatDate = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString; // Return as is if not a valid date
      return date.toLocaleDateString();
    };

    const updateTournamentPositions = () => {
      const numRoundsTotal = rounds.value.length > 0 ? Math.max(...rounds.value.map(r => r.round)) : 0;
      const finalRound = rounds.value.find(r => r.round === numRoundsTotal);
      
      const finalMatch = finalRound?.matches.find(m => !m.isThirdPlace);
      const thirdPlaceMatch = rounds.value.flatMap(r => r.matches).find(m => m.isThirdPlace);

      // Reset positions
      tournamentStats.value.firstPlace = null;
      tournamentStats.value.secondPlace = null;
      tournamentStats.value.thirdPlace = null;

      // Set positions based on match winners
      if (finalMatch?.winner && finalMatch.winner.id !== 'BYE') {
        tournamentStats.value.firstPlace = finalMatch.winner;
        if (finalMatch.team1 && finalMatch.team1.id !== 'BYE' && finalMatch.team2 && finalMatch.team2.id !== 'BYE') {
          tournamentStats.value.secondPlace = finalMatch.winner.id === finalMatch.team1.id ? finalMatch.team2 : finalMatch.team1;
        }
      }

      if (thirdPlaceMatch?.winner && thirdPlaceMatch.winner.id !== 'BYE') {
        tournamentStats.value.thirdPlace = thirdPlaceMatch.winner;
      }
    };

    // Zoom functions
    const handleZoomIn = () => { 
      zoomLevel.value = Math.min(zoomLevel.value + ZOOM_STEP, MAX_ZOOM); 
    };
    
    const handleZoomOut = () => { 
      zoomLevel.value = Math.max(zoomLevel.value - ZOOM_STEP, MIN_ZOOM); 
    };

    return {
      zoomLevel,
      rounds,
      tournamentStats,
      hasTournamentResults,
      getRoundName,
      getThirdPlaceMatch,
      getMatchCardColor,
      getMatchCardBorder,
      formatDate,
      handleZoomIn,
      handleZoomOut
    };
  }
};
</script>

<style scoped>
.tournament-viewer {
  font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
}

/* Custom scrollbar styles */
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(30, 41, 59, 0.2);
  border-radius: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(15, 118, 110, 0.3);
  border-radius: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(15, 118, 110, 0.5);
}
</style> 