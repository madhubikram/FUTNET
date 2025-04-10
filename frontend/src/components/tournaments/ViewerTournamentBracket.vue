<template>
  <div class="tournament-viewer flex flex-col w-full bg-transparent text-gray-100 gap-4 font-sans">
    <div
      v-if="rounds.length > 2"
      class="text-center text-xs text-gray-400 mt-1 md:hidden"
    >
      <span class="flex items-center justify-center gap-1">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-left-right">
          <path d="M8 3 4 7l4 4"/>
          <path d="M4 7h16"/>
          <path d="m16 21 4-4-4-4"/>
          <path d="M20 17H4"/>
        </svg>
        Scroll horizontally to view all rounds
      </span>
    </div>
    <div ref="bracketContainerRef" class="relative bg-gradient-to-b from-gray-800/90 to-gray-800/70 backdrop-blur-sm rounded-xl p-5 shadow-xl border border-gray-700/50 overflow-x-auto max-w-full">
      <div class="absolute top-4 right-4 z-10">
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

      <div class="flex justify-center mb-4">
        <span
          class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium"
          :class="{
            'bg-green-500/20 text-green-400 border border-green-500/20': tournamentData.status === 'Upcoming',
            'bg-blue-500/20 text-blue-400 border border-blue-500/20': tournamentData.status === 'Ongoing',
            'bg-gray-500/20 text-gray-400 border border-gray-700/20': tournamentData.status === 'Completed',
            'bg-orange-500/20 text-orange-400 border border-orange-500/20': tournamentData.status === 'Cancelled (Low Teams)'
          }"
        >
          <span class="w-2 h-2 rounded-full"
            :class="{
              'bg-green-400': tournamentData.status === 'Upcoming',
              'bg-blue-400': tournamentData.status === 'Ongoing',
              'bg-gray-400': tournamentData.status === 'Completed',
              'bg-orange-400': tournamentData.status === 'Cancelled (Low Teams)'
            }"
          ></span>
          {{ tournamentData.status || 'Upcoming' }}
        </span>
      </div>

      <div
        class="flex flex-nowrap gap-4 min-w-fit justify-start overflow-visible bracket-container"
        :style="{
          transform: `scale(${zoomLevel / 100})`,
          transformOrigin: 'top left',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }"
      >
        <div
          v-for="round in rounds"
          :key="`round-${round.round}`"
          class="flex flex-col"
          :style="{
            width: '260px',
            flexShrink: 0
          }"
        >
          <div class="mb-3 text-center">
            <h3 class="font-bold text-lg bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">
              {{ getRoundName(round.round, round.matches.filter(m => !m.isThirdPlace).length) }}
            </h3>
          </div>

          <div class="flex flex-col justify-around h-full gap-6">
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
                <div v-if="match.date && match.time" class="flex items-center gap-1 py-1 px-2 bg-gray-700/50 rounded-md">
                  <CalendarIcon class="h-3 w-3 text-emerald-400" />
                  <span class="text-xs text-gray-200">{{ formatDate(match.date) }}</span>
                  <span class="mx-1 text-gray-500">|</span>
                  <ClockIcon class="h-3 w-3 text-emerald-400" />
                  <span class="text-xs text-gray-200">{{ match.time }}</span>
                </div>
              </div>

              <div class="p-3 flex flex-col gap-3">
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

                  <div class="flex items-center justify-center w-10 h-10 bg-gray-800/70 rounded-lg border border-gray-700/50">
                    <span :class="['text-center font-medium', match.winner === match.team1 ? 'text-emerald-400' : 'text-gray-300']">
                      {{ match.score1 !== null ? match.score1 : '-' }}
                    </span>
                  </div>
                </div>

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

                  <div class="flex items-center justify-center w-10 h-10 bg-gray-800/70 rounded-lg border border-gray-700/50">
                    <span :class="['text-center font-medium', match.winner === match.team2 ? 'text-emerald-400' : 'text-gray-300']">
                      {{ match.score2 !== null ? match.score2 : '-' }}
                    </span>
                  </div>
                </div>

                <div v-if="match.pk1 !== null && match.pk2 !== null" class="text-center text-xs text-gray-400 pt-2 border-t border-gray-700/30">
                  <span>Penalties: {{ match.pk1 }} - {{ match.pk2 }}</span>
                </div>

                <div v-if="match.topScorer && match.topScorer.name && match.topScorer.goals > 0" class="pt-2 border-t border-gray-700/30 flex items-center gap-2">
                  <StarIcon class="h-3 w-3 text-amber-400" />
                  <span class="text-xs text-gray-300">{{ match.topScorer.name }} ({{ match.topScorer.goals }})</span>
                </div>

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

        <div
          v-if="getThirdPlaceMatch()"
          class="flex flex-col mt-2 md:mt-12"
          style="width: 260px; flex-shrink: 0;"
        >
          <div class="mb-3 text-center">
            <h3 class="font-bold text-lg bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent flex items-center justify-center">
              <TrophyIcon class="h-5 w-5 mr-2 text-amber-500" />
              3rd Place
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
                <div v-if="getThirdPlaceMatch().date && getThirdPlaceMatch().time" class="text-xs text-gray-400 flex items-center gap-1">
                  <CalendarIcon class="h-3 w-3" />
                  {{ formatDate(getThirdPlaceMatch().date) }}
                  <span class="mx-1">|</span>
                  <ClockIcon class="h-3 w-3" />
                  {{ getThirdPlaceMatch().time }}
                </div>
              </div>

              <div class="p-3 flex flex-col gap-3">
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

                  <div class="flex items-center justify-center w-10 h-10 bg-gray-800/70 rounded-lg border border-gray-700/50">
                    <span :class="['text-center font-medium', getThirdPlaceMatch().winner === getThirdPlaceMatch().team1 ? 'text-amber-400' : 'text-gray-300']">
                      {{ getThirdPlaceMatch().score1 !== null ? getThirdPlaceMatch().score1 : '-' }}
                    </span>
                  </div>
                </div>

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

                  <div class="flex items-center justify-center w-10 h-10 bg-gray-800/70 rounded-lg border border-gray-700/50">
                    <span :class="['text-center font-medium', getThirdPlaceMatch().winner === getThirdPlaceMatch().team2 ? 'text-amber-400' : 'text-gray-300']">
                      {{ getThirdPlaceMatch().score2 !== null ? getThirdPlaceMatch().score2 : '-' }}
                    </span>
                  </div>
                </div>

                <div v-if="getThirdPlaceMatch().pk1 !== null && getThirdPlaceMatch().pk2 !== null" class="text-center text-xs text-gray-400 pt-2 border-t border-gray-700/30">
                  <span>Penalties: {{ getThirdPlaceMatch().pk1 }} - {{ getThirdPlaceMatch().pk2 }}</span>
                </div>

                <div v-if="getThirdPlaceMatch().topScorer && getThirdPlaceMatch().topScorer.name && getThirdPlaceMatch().topScorer.goals > 0" class="pt-2 border-t border-amber-700/30 flex items-center gap-2">
                  <StarIcon class="h-3 w-3 text-amber-400" />
                  <span class="text-xs text-gray-300">{{ getThirdPlaceMatch().topScorer.name }} ({{ getThirdPlaceMatch().topScorer.goals }})</span>
                </div>

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

    <div class="bg-gradient-to-b from-gray-800/90 to-gray-800/70 backdrop-blur-sm rounded-xl p-5 shadow-xl border border-gray-700/50 mt-8">
      <div class="flex flex-col md:flex-row justify-between items-center mb-6">
        <h3 class="text-lg font-semibold text-white flex items-center gap-2">
          <ChartBarIcon class="h-5 w-5 text-emerald-400" />
          Tournament Statistics
        </h3>

        <div class="flex mt-3 md:mt-0 bg-gray-900/50 rounded-lg p-1">
          <button
            v-for="tab in ['Summary', 'Teams', 'Players', 'Matches']"
            :key="tab"
            @click="activeStatsTab = tab"
            :class="[
              'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
              activeStatsTab === tab
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
            ]"
          >
            {{ tab }}
          </button>
        </div>
      </div>

      <div v-if="activeStatsTab === 'Summary'" class="animate-fadeIn">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div class="bg-gray-800/70 rounded-lg p-3 border border-gray-700/50 flex flex-col">
            <span class="text-xs text-gray-400 mb-1">Total Teams</span>
            <span class="text-xl font-bold">{{ getTeamCount }}</span>
          </div>
          <div class="bg-gray-800/70 rounded-lg p-3 border border-gray-700/50 flex flex-col">
            <span class="text-xs text-gray-400 mb-1">Total Rounds</span>
            <span class="text-xl font-bold">{{ rounds.length }}</span>
          </div>
          <div class="bg-gray-800/70 rounded-lg p-3 border border-gray-700/50 flex flex-col">
            <span class="text-xs text-gray-400 mb-1">Total Matches</span>
            <span class="text-xl font-bold">{{ getTotalMatches }}</span>
          </div>
          <div class="bg-gray-800/70 rounded-lg p-3 border border-gray-700/50 flex flex-col">
            <span class="text-xs text-gray-400 mb-1">Total Goals</span>
            <span class="text-xl font-bold">{{ getTotalGoals }}</span>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div v-if="tournamentStats.topScorer?.name" class="bg-gradient-to-b from-blue-900/20 to-blue-950/20 border border-blue-700/30 rounded-lg p-4">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <VolleyballIcon class="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <span class="text-xs text-blue-400 font-medium">Top Scorer</span>
                <h4 class="font-semibold text-lg flex items-center gap-2">
                  {{ tournamentStats.topScorer.name }}
                  <span class="text-sm font-normal text-blue-300">({{ tournamentStats.topScorer.goals }} goals)</span>
                </h4>
              </div>
            </div>
          </div>

          <div v-if="tournamentStats.mvp" class="bg-gradient-to-b from-purple-900/20 to-purple-950/20 border border-purple-700/30 rounded-lg p-4">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                <StarIcon class="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <span class="text-xs text-purple-400 font-medium">Most Valuable Player</span>
                <h4 class="font-semibold text-lg">{{ tournamentStats.mvp }}</h4>
              </div>
            </div>
          </div>

          <div v-if="tournamentStats.playerOfTournament" class="bg-gradient-to-b from-emerald-900/20 to-emerald-950/20 border border-emerald-700/30 rounded-lg p-4">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <AwardIcon class="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <span class="text-xs text-emerald-400 font-medium">Player of the Tournament</span>
                <h4 class="font-semibold text-lg">{{ tournamentStats.playerOfTournament }}</h4>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="activeStatsTab === 'Teams'" class="animate-fadeIn">
        <div class="overflow-hidden rounded-lg border border-gray-700/50">
          <table class="w-full text-sm text-left">
            <thead class="bg-gray-800/70 text-gray-300 text-xs uppercase">
              <tr>
                <th class="px-4 py-3">Rank</th>
                <th class="px-4 py-3">Team</th>
                <th class="px-4 py-3 text-center">Matches</th>
                <th class="px-4 py-3 text-center">Wins</th>
                <th class="px-4 py-3 text-center">Goals</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(team, index) in teamStats" :key="team.id"
                  class="border-b border-gray-700/30 bg-gray-800/30 hover:bg-gray-700/30">
                <td class="px-4 py-3 font-medium">{{ index + 1 }}</td>
                <td class="px-4 py-3 font-medium">
                  <div class="flex items-center gap-2">
                    <div v-if="index < 3"
                         :class="[
                           'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0',
                           index === 0 ? 'bg-yellow-500/20' :
                           index === 1 ? 'bg-gray-500/20' :
                           'bg-amber-700/20'
                         ]">
                      <TrophyIcon class="h-3 w-3"
                                 :class="[
                                   index === 0 ? 'text-yellow-500' :
                                   index === 1 ? 'text-gray-400' :
                                   'text-amber-700'
                                 ]" />
                    </div>
                    {{ team.name }}
                  </div>
                </td>
                <td class="px-4 py-3 text-center">{{ team.matches }}</td>
                <td class="px-4 py-3 text-center">{{ team.wins }}</td>
                <td class="px-4 py-3 text-center">{{ team.goals }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-if="activeStatsTab === 'Players'" class="animate-fadeIn">
        <div v-if="tournamentStats.topScorer?.name || tournamentStats.mvp || tournamentStats.playerOfTournament">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div v-if="tournamentStats.topScorer?.name" class="bg-gradient-to-b from-blue-900/20 to-blue-950/20 border border-blue-700/30 rounded-lg p-4">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <VolleyballIcon class="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <span class="text-xs text-blue-400 font-medium">Top Scorer</span>
                  <h4 class="font-semibold text-lg flex items-center gap-2">
                    {{ tournamentStats.topScorer.name }}
                    <span class="text-sm font-normal text-blue-300">({{ tournamentStats.topScorer.goals }} goals)</span>
                  </h4>
                </div>
              </div>
            </div>

            <div v-if="tournamentStats.mvp" class="bg-gradient-to-b from-purple-900/20 to-purple-950/20 border border-purple-700/30 rounded-lg p-4">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <StarIcon class="h-6 w-6 text-purple-400" />
                </div>
                <div>
                  <span class="text-xs text-purple-400 font-medium">Most Valuable Player</span>
                  <h4 class="font-semibold text-lg">{{ tournamentStats.mvp }}</h4>
                </div>
              </div>
            </div>

            <div v-if="tournamentStats.playerOfTournament" class="bg-gradient-to-b from-emerald-900/20 to-emerald-950/20 border border-emerald-700/30 rounded-lg p-4">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <AwardIcon class="h-6 w-6 text-emerald-400" />
                </div>
                <div>
                  <span class="text-xs text-emerald-400 font-medium">Player of the Tournament</span>
                  <h4 class="font-semibold text-lg">{{ tournamentStats.playerOfTournament }}</h4>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="p-4 bg-gray-800/50 rounded-lg border border-gray-700/30">
          <h3 class="text-sm font-semibold mb-3 text-blue-400 flex items-center gap-2">
            <VolleyballIcon class="h-4 w-4" />
            Match Top Scorers
          </h3>
          <div class="overflow-hidden rounded-lg border border-gray-700/50">
            <table class="w-full text-sm text-left">
              <thead class="bg-gray-800/70 text-gray-300 text-xs uppercase">
                <tr>
                  <th class="px-4 py-3">#</th>
                  <th class="px-4 py-3">Player</th>
                  <th class="px-4 py-3">Match</th>
                  <th class="px-4 py-3 text-center">Goals</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(scorer, index) in matchTopScorers" :key="`${scorer.name}-${index}`"
                    class="border-b border-gray-700/30 bg-gray-800/30 hover:bg-gray-700/30">
                  <td class="px-4 py-3 font-medium">{{ index + 1 }}</td>
                  <td class="px-4 py-3 font-medium">{{ scorer.name }}</td>
                  <td class="px-4 py-3 text-gray-400 text-xs">{{ scorer.matchName }}</td>
                  <td class="px-4 py-3 text-center">{{ scorer.goals }}</td>
                </tr>
                <tr v-if="matchTopScorers.length === 0" class="border-b border-gray-700/30 bg-gray-800/30">
                  <td colspan="4" class="px-4 py-3 text-center text-gray-500">No scorer data available</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div v-if="activeStatsTab === 'Matches'" class="animate-fadeIn">
        <div class="overflow-hidden rounded-lg border border-gray-700/50">
          <table class="w-full text-sm text-left">
            <thead class="bg-gray-800/70 text-gray-300 text-xs uppercase">
              <tr>
                <th class="px-4 py-3">Match</th>
                <th class="px-4 py-3">Teams</th>
                <th class="px-4 py-3 text-center">Score</th>
                <th class="px-4 py-3 text-center">Date</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="match in allMatches" :key="match.id"
                  class="border-b border-gray-700/30 bg-gray-800/30 hover:bg-gray-700/30">
                <td class="px-4 py-3 font-medium">
                  <span class="text-xs font-normal text-gray-500">{{ match.roundName }}</span><br />
                  {{ match.matchName || `Match ${match.id}` }}
                </td>
                <td class="px-4 py-3">
                  <div class="flex flex-col">
                    <span :class="match.winner === match.team1 ? 'text-emerald-400' : ''">
                      {{ match.team1 ? match.team1.name : 'TBD' }}
                    </span>
                    <span :class="match.winner === match.team2 ? 'text-emerald-400' : ''">
                      {{ match.team2 ? match.team2.name : 'TBD' }}
                    </span>
                  </div>
                </td>
                <td class="px-4 py-3 text-center">
                  <div v-if="match.score1 !== null && match.score2 !== null" class="font-medium">
                    {{ match.score1 }} - {{ match.score2 }}
                    <div v-if="match.pk1 !== null && match.pk2 !== null" class="text-xs text-gray-500">
                      (PK: {{ match.pk1 }} - {{ match.pk2 }})
                    </div>
                  </div>
                  <div v-else>-</div>
                </td>
                <td class="px-4 py-3 text-center">
                  <div v-if="match.date" class="text-xs">
                    {{ formatDate(match.date) }}<br />
                    <span v-if="match.time" class="text-gray-500">{{ match.time }}</span>
                  </div>
                  <div v-else>-</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>



  </div>
</template>

<script>
import { ref, computed, onMounted, watch, onUnmounted } from 'vue';
import { TrophyIcon, StarIcon, CalendarIcon, ClockIcon, ZoomInIcon, ZoomOutIcon, ChartBarIcon, VolleyballIcon, AwardIcon } from 'lucide-vue-next';

export default {
  name: 'ViewerTournamentBracket',
  components: {
    TrophyIcon,
    StarIcon,
    CalendarIcon,
    ClockIcon,
    ZoomInIcon,
    ZoomOutIcon,
    ChartBarIcon,
    VolleyballIcon,
    AwardIcon
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
    const bracketContainerRef = ref(null);
    const zoomLevel = ref(78);
    const rounds = ref([]);
    const tournamentStats = ref({
      firstPlace: null,
      secondPlace: null,
      thirdPlace: null,
      topScorer: { name: '', goals: 0 },
      mvp: '',
      playerOfTournament: ''
    });
    const activeStatsTab = ref('Summary');

    const ZOOM_STEP = 10;
    const MIN_ZOOM = 70;
    const MAX_ZOOM = 150;

    const adjustZoom = () => {
      if (!bracketContainerRef.value || rounds.value.length === 0) return;

      const containerWidth = bracketContainerRef.value.clientWidth;
      const hasThirdPlaceMatch = getThirdPlaceMatch() != null;
      const roundWidth = 260;
      const gapWidth = 16;
      const requiredWidth = (rounds.value.length * (roundWidth + gapWidth)) + (hasThirdPlaceMatch ? (roundWidth + gapWidth) : 0);

      if (requiredWidth > containerWidth) {
        const idealZoom = Math.floor((containerWidth / requiredWidth) * 100);
        console.log(`Adjusting zoom: container=${containerWidth}px, required=${requiredWidth}px, ideal=${idealZoom}%`);
        zoomLevel.value = Math.max(MIN_ZOOM, Math.min(idealZoom - 5, 90));
      }
    };

    onMounted(() => {
      processData();
      setTimeout(adjustZoom, 200);
      window.addEventListener('resize', adjustZoom);
    });

    onUnmounted(() => {
      window.removeEventListener('resize', adjustZoom);
    });

    watch(() => props.tournamentData, () => {
      processData();
      setTimeout(adjustZoom, 200);
    }, { deep: true });

    const processData = () => {
      if (props.tournamentData?.bracket?.rounds) {
        rounds.value = props.tournamentData.bracket.rounds;

        if (props.tournamentData.stats) {
          tournamentStats.value = { ...tournamentStats.value, ...props.tournamentData.stats };
        } else {
          updateTournamentPositions();
        }
      }
    };

    const hasTournamentResults = computed(() => {
      return tournamentStats.value.firstPlace || tournamentStats.value.secondPlace || tournamentStats.value.thirdPlace;
    });

    const teamStats = computed(() => {
      const stats = {};

      rounds.value.forEach(round => {
        round.matches.forEach(match => {
          if (match.team1 && match.team1.id !== 'BYE') {
            if (!stats[match.team1.id]) {
              stats[match.team1.id] = {
                id: match.team1.id,
                name: match.team1.name,
                matches: 0,
                wins: 0,
                goals: 0
              };
            }
          }
          if (match.team2 && match.team2.id !== 'BYE') {
            if (!stats[match.team2.id]) {
              stats[match.team2.id] = {
                id: match.team2.id,
                name: match.team2.name,
                matches: 0,
                wins: 0,
                goals: 0
              };
            }
          }
        });
      });

      rounds.value.forEach(round => {
        round.matches.forEach(match => {
          if (match.completed && match.score1 !== null && match.score2 !== null) {
            if (match.team1 && match.team1.id !== 'BYE' && stats[match.team1.id]) {
              stats[match.team1.id].matches++;
              stats[match.team1.id].goals += match.score1;
              if (match.winner && match.winner.id === match.team1.id) {
                stats[match.team1.id].wins++;
              }
            }

            if (match.team2 && match.team2.id !== 'BYE' && stats[match.team2.id]) {
              stats[match.team2.id].matches++;
              stats[match.team2.id].goals += match.score2;
              if (match.winner && match.winner.id === match.team2.id) {
                stats[match.team2.id].wins++;
              }
            }
          }
        });
      });

      return Object.values(stats).sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (b.goals !== a.goals) return b.goals - a.goals;
        return a.name.localeCompare(b.name);
      });
    });

    const matchTopScorers = computed(() => {
      const scorers = [];

      rounds.value.forEach(round => {
        const roundName = getRoundName(round.round, round.matches.filter(m => !m.isThirdPlace).length);

        round.matches.forEach((match, index) => {
          if (match.topScorer && match.topScorer.name && match.topScorer.goals > 0) {
            scorers.push({
              name: match.topScorer.name,
              goals: match.topScorer.goals,
              matchName: match.matchName || `${roundName} Match ${index + 1}`,
              round: round.round,
              matchId: match.id
            });
          }
        });
      });

      return scorers.sort((a, b) => b.goals - a.goals);
    });

    const getTotalMatches = computed(() => {
      return rounds.value.reduce((total, round) => total + round.matches.length, 0);
    });

    const getTotalGoals = computed(() => {
      let totalGoals = 0;

      rounds.value.forEach(round => {
        round.matches.forEach(match => {
          if (match.score1 !== null) totalGoals += match.score1;
          if (match.score2 !== null) totalGoals += match.score2;
        });
      });

      return totalGoals;
    });

    const getTeamCount = computed(() => {
      const teamIds = new Set();

      rounds.value.forEach(round => {
        round.matches.forEach(match => {
          if (match.team1 && match.team1.id !== 'BYE') teamIds.add(match.team1.id);
          if (match.team2 && match.team2.id !== 'BYE') teamIds.add(match.team2.id);
        });
      });

      return teamIds.size;
    });

    const allMatches = computed(() => {
      const matches = [];

      rounds.value.forEach(round => {
        const roundName = getRoundName(round.round, round.matches.filter(m => !m.isThirdPlace).length);

        round.matches.forEach(match => {
          matches.push({
            ...match,
            roundName
          });
        });
      });

      return matches.sort((a, b) => {
        if (a.round !== b.round) return a.round - b.round;
        if (a.isThirdPlace) return 1;
        if (b.isThirdPlace) return -1;
        return a.id.localeCompare(b.id);
      });
    });

    const getRoundName = (roundNumber, matchCount) => {
      if (roundNumber === 1) return 'First Round';
      if (roundNumber === 2 && matchCount === 2) return 'Semifinals';
      if (roundNumber === 3 && matchCount === 1) return 'Final';
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
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString();
    };

    const updateTournamentPositions = () => {
      const numRoundsTotal = rounds.value.length > 0 ? Math.max(...rounds.value.map(r => r.round)) : 0;
      const finalRound = rounds.value.find(r => r.round === numRoundsTotal);

      const finalMatch = finalRound?.matches.find(m => !m.isThirdPlace);
      const thirdPlaceMatch = rounds.value.flatMap(r => r.matches).find(m => m.isThirdPlace);

      tournamentStats.value.firstPlace = null;
      tournamentStats.value.secondPlace = null;
      tournamentStats.value.thirdPlace = null;

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
      handleZoomOut,
      teamStats,
      matchTopScorers,
      getTotalMatches,
      getTotalGoals,
      getTeamCount,
      allMatches,
      activeStatsTab,
      bracketContainerRef
    };
  }
};
</script>

<style scoped>
.tournament-viewer {
  font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
}

@media (max-width: 768px) {
  .bracket-container {
    padding-bottom: 16px;
  }
}

@media (max-width: 1024px) {
  :deep(.bracket-container) {
    justify-content: flex-start !important;
  }
}

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: rgba(30, 41, 59, 0.2);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: rgba(15, 118, 110, 0.3);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(15, 118, 110, 0.5);
}

* {
  scrollbar-width: thin;
  scrollbar-color: rgba(15, 118, 110, 0.3) rgba(30, 41, 59, 0.2);
}

.animate-fadeIn {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>