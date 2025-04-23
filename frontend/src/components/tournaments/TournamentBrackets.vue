<template>
  <div class="tournament-master flex flex-col min-h-screen w-full bg-gray-900 text-gray-100 p-4 gap-4 font-sans">
    <!-- Toast Notifications -->
    <div class="fixed top-4 right-4 z-50 flex flex-col gap-2">
      <transition-group name="toast">
        <div 
          v-for="(toast, index) in toasts" 
          :key="toast.id" 
          :class="[
            'px-4 py-3 rounded-lg shadow-lg backdrop-blur-sm transition-all transform max-w-md',
            toast.type === 'success' ? 'bg-emerald-500/90 text-white' : 'bg-red-500/90 text-white'
          ]"
        >
          <div class="flex items-center gap-2">
            <div v-if="toast.type === 'success'" class="flex-shrink-0">
              <CheckCircle class="h-5 w-5" />
            </div>
            <div v-else class="flex-shrink-0">
              <AlertTriangle class="h-5 w-5" />
            </div>
            <div class="flex-1">{{ toast.message }}</div>
            <button @click="removeToast(index)" class="flex-shrink-0 text-white/70 hover:text-white">
              <X class="h-4 w-4" />
            </button>
          </div>
        </div>
      </transition-group>
    </div>

    <!-- Header with Gradient and Logo -->
    <div class="flex items-center justify-between mb-2">
      <!-- Back Button -->
      <button
        @click="goBack"
        class="flex items-center gap-2 px-3 py-1.5 bg-gray-700/50 hover:bg-gray-700 text-sm text-gray-300 hover:text-white rounded-lg transition-colors"
      >
        <ArrowLeftIcon class="w-4 h-4" />
        Back
      </button>

      <h1 class="text-xl md:text-2xl font-bold bg-gradient-to-r from-green-400 via-emerald-500 to-teal-600 bg-clip-text text-transparent flex items-center">
        <Trophy class="h-6 w-6 mr-2 text-emerald-400" />
        {{ tournamentName || 'Tournament Master Pro' }}
      </h1>

      <div v-if="bracketGenerated && !loading" class="flex items-center gap-4">
        <div class="flex items-center bg-gray-800/70 rounded-lg p-1 backdrop-blur-sm shadow-md">
          <button
            @click="handleZoomOut"
            class="p-1.5 hover:text-emerald-400 transition-colors rounded-md hover:bg-gray-700/50"
            aria-label="Zoom out"
          >
            <ZoomOut size="16" />
          </button>
          <span class="px-2 text-sm font-medium">{{ zoomLevel }}%</span>
          <button
            @click="handleZoomIn"
            class="p-1.5 hover:text-emerald-400 transition-colors rounded-md hover:bg-gray-700/50"
            aria-label="Zoom in"
          >
            <ZoomIn size="16" />
          </button>
        </div>
      </div>
       <div v-else class="w-[100px]"></div> <!-- Placeholder to keep layout balanced -->
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center h-64">
      <Loader2Icon class="w-12 h-12 text-emerald-500 animate-spin" />
    </div>

    <!-- Tournament Setup Screen -->
    <div v-else-if="!route.params.id && !bracketGenerated" class="flex flex-col gap-6 max-w-lg mx-auto w-full animate-fadeIn">
      <div class="bg-gradient-to-b from-gray-800/80 to-gray-800/40 backdrop-blur-sm p-6 rounded-xl shadow-xl border border-gray-700/50">
        <div class="mb-5">
          <h2 class="text-xl font-semibold mb-2 bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">Tournament Setup</h2>
          <p class="text-sm text-gray-400">Create your tournament by adding teams below. The bracket will automatically handle byes for odd numbers.</p>
        </div>

        <div class="space-y-5">
          <div class="relative">
            <div class="flex gap-2">
              <div class="relative flex-1">
                <input
                  ref="teamInputRef"
                  type="text"
                  v-model="teamName"
                  @keydown="handleKeyDown"
                  class="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all shadow-sm placeholder-gray-500 text-gray-200"
                  placeholder="Enter team name"
                />
                <Shield class="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              </div>
              <button
                @click="addTeam"
                :disabled="!teamName.trim()"
                :class="[
                  'px-4 py-3 rounded-lg transition-all shadow-md flex items-center justify-center min-w-[100px] font-medium',
                  !teamName.trim()
                    ? 'bg-gray-700 cursor-not-allowed text-gray-500'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white hover:shadow-lg'
                ]"
              >
                Add Team
              </button>
            </div>
            <div v-if="teams.length > 0" class="text-xs text-gray-500 mt-1 ml-1">
              Press Enter to quickly add multiple teams
            </div>
          </div>

          <div v-if="teams.length > 0">
            <div class="flex items-center justify-between mb-3">
              <h3 class="font-medium text-sm text-emerald-400 flex items-center">
                <Shield class="h-4 w-4 mr-1.5" />
                Teams ({{ teams.length }})
              </h3>
              <span v-if="teams.length >= 2" class="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full">
                Ready to generate
              </span>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
              <div
                v-for="(team, idx) in teams"
                :key="team.id"
                class="flex items-center bg-gray-800/50 p-2.5 rounded-lg border border-gray-700/50 group hover:border-emerald-500/30 transition-all"
              >
                <div class="w-6 h-6 flex items-center justify-center rounded-full bg-gray-700/70 text-xs font-medium text-gray-300 mr-2">
                  {{ idx + 1 }}
                </div>
                <span class="truncate">{{ team.name }}</span>
              </div>
            </div>
          </div>

          <button
            @click="generateBracket"
            :disabled="teams.length < 2"
            :class="[
              'w-full py-3 rounded-lg transition-all font-medium text-base',
              teams.length < 2
                ? 'bg-gray-700 cursor-not-allowed text-gray-500'
                : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-md hover:shadow-lg'
            ]"
          >
            Generate Tournament Bracket
          </button>
        </div>
      </div>

      <!-- Visual representation of bracket -->
      <div v-if="teams.length >= 2" class="bg-gradient-to-b from-gray-800/80 to-gray-800/40 backdrop-blur-sm p-5 rounded-xl shadow-xl border border-gray-700/50">
        <h3 class="text-sm font-medium text-gray-400 mb-3">Preview Structure</h3>
        <div class="flex flex-col gap-2">
          <div class="flex items-center text-xs text-gray-500 flex-wrap">
            <div class="w-24 text-center font-semibold">Round 1</div>
            <ChevronRight size="14" class="opacity-50 mx-1" />
            <div class="w-24 text-center font-semibold">
              {{ getRoundNamePreview(2) }}
            </div>
            <template v-if="calculateRounds(teams.length) > 2">
              <ChevronRight size="14" class="opacity-50 mx-1" />
              <div class="w-24 text-center font-semibold">
                 {{ getRoundNamePreview(3) }}
              </div>
              <template v-if="calculateRounds(teams.length) > 3">
                <ChevronRight size="14" class="opacity-50 mx-1" />
                <div class="w-24 text-center font-semibold">
                    {{ getRoundNamePreview(4) }}
                </div>
                 <template v-if="calculateRounds(teams.length) > 4">
                    <span class="mx-1">...</span>
                    <ChevronRight size="14" class="opacity-50 mx-1" />
                    <div class="w-24 text-center font-semibold">Final</div>
                 </template>
              </template>
            </template>
          </div>
          <div class="flex gap-2 items-center flex-wrap">
             <div class="w-24 h-8 bg-gray-700/50 rounded-md border border-gray-600/30 flex items-center justify-center text-xs text-gray-400">
               {{ teams.length }} Teams
             </div>
             <template v-for="r in calculateRounds(teams.length)" :key="r">
                <ChevronRight size="14" class="text-gray-600 mx-1" />
                <div class="w-24 h-8 bg-gray-700/50 rounded-md border border-gray-600/30 flex items-center justify-center text-xs text-gray-400">
                  {{ Math.pow(2, calculateRounds(teams.length) - r) }} {{ Math.pow(2, calculateRounds(teams.length) - r) === 1 ? 'Match' : 'Matches' }}
                </div>
             </template>
          </div>
           <div class="text-xs text-gray-500 mt-2">
             Byes: {{ calculateByes(teams.length) }} (Automatically handled in Round 1)
           </div>
        </div>
      </div>
    </div>

    <!-- Tournament Content (Bracket + Stats) -->
    <div v-else-if="bracketGenerated && !loading" class="flex flex-col gap-5 animate-fadeIn">
      <!-- Tabs -->
      <div class="flex justify-between items-center">
        <div class="flex bg-gray-800/70 backdrop-blur-sm rounded-lg p-1">
          <button
            @click="activeTab = 'bracket'"
            :class="[
              'px-4 py-2 rounded-md text-sm font-medium transition-all',
              activeTab === 'bracket'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            ]"
          >
            Tournament Bracket
          </button>
          <button
            @click="activeTab = 'stats'"
            :class="[
              'px-4 py-2 rounded-md text-sm font-medium transition-all',
              activeTab === 'stats'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            ]"
          >
            Tournament Stats
          </button>
        </div>
        <div class="flex items-center gap-2">
          <button 
            @click="saveTournamentChanges" 
            class="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg transition-colors"
          >
            <Save class="h-4 w-4" />
            Save Changes
          </button>
          <button 
            @click="publishTournament" 
            class="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
          >
            <Send class="h-4 w-4" />
            Publish
          </button>
        </div>
      </div>

      <!-- Stats Panel -->
      <div v-if="activeTab === 'stats'" class="bg-gradient-to-b from-gray-800/90 to-gray-800/70 backdrop-blur-sm rounded-xl p-4 shadow-xl border border-gray-700/50 animate-fadeIn">
        <!-- ... Stats content remains the same ... -->
        <h2 class="text-xl font-semibold mb-3 bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent flex items-center">
          <Award class="h-5 w-5 mr-2 text-emerald-400" />
          Tournament Statistics
        </h2>

        <!-- Top Stats Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <!-- Top Scorer Card -->
          <div class="bg-gradient-to-b from-gray-700/70 to-gray-800/70 rounded-xl p-3 shadow-md border border-gray-700/30 group hover:border-emerald-500/30 transition-all">
            <h3 class="text-sm font-medium text-emerald-400 mb-2 flex items-center">
              <Star class="h-4 w-4 mr-1.5" />
              Tournament Top Scorer
            </h3>
            <div class="space-y-2">
              <div class="space-y-1">
                <label class="text-xs text-gray-400 block ml-1">Player Name</label>
                <input
                  type="text"
                  v-model="tournamentStats.topScorer.name"
                  @input="updateTopScorerName"
                  class="w-full px-3 py-1.5 bg-gray-900/50 border border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all text-sm"
                  placeholder="Enter player name"
                />
              </div>
              <div class="space-y-1">
                <label class="text-xs text-gray-400 block ml-1">Total Goals</label>
                <div class="flex items-center">
                  <input
                    type="number"
                    min="0"
                    v-model.number="tournamentStats.topScorer.goals"
                    @input="updateTopScorerGoals"
                    class="w-full px-3 py-1.5 bg-gray-900/50 border border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all text-sm"
                  />
                  <span class="ml-2 text-sm text-gray-400">goals</span>
                </div>
              </div>
            </div>
          </div>

          <!-- MVP Card -->
          <div class="bg-gradient-to-b from-gray-700/70 to-gray-800/70 rounded-xl p-3 shadow-md border border-gray-700/30 group hover:border-emerald-500/30 transition-all">
            <h3 class="text-sm font-medium text-emerald-400 mb-2 flex items-center">
              <User class="h-4 w-4 mr-1.5" />
              Most Valuable Player (MVP)
            </h3>
            <div class="space-y-1">
              <label class="text-xs text-gray-400 block ml-1">MVP Name</label>
              <input
                type="text"
                v-model="tournamentStats.mvp"
                class="w-full px-3 py-1.5 bg-gray-900/50 border border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all text-sm"
                placeholder="Enter MVP name"
              />
            </div>
          </div>

          <!-- Player of Tournament Card -->
          <div class="bg-gradient-to-b from-gray-700/70 to-gray-800/70 rounded-xl p-3 shadow-md border border-gray-700/30 group hover:border-emerald-500/30 transition-all">
            <h3 class="text-sm font-medium text-emerald-400 mb-2 flex items-center">
              <Trophy class="h-4 w-4 mr-1.5" />
              Player of the Tournament
            </h3>
            <div class="space-y-1">
              <label class="text-xs text-gray-400 block ml-1">Player Name</label>
              <input
                type="text"
                v-model="tournamentStats.playerOfTournament"
                class="w-full px-3 py-1.5 bg-gray-900/50 border border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all text-sm"
                placeholder="Enter player name"
              />
            </div>
          </div>
        </div>

        <!-- Tournament Summary -->
        <div class="mt-4 bg-gradient-to-b from-gray-700/70 to-gray-800/70 rounded-xl p-3 shadow-md border border-gray-700/30">
          <h3 class="text-sm font-medium text-emerald-400 mb-2">Tournament Summary</h3>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div class="bg-gray-800/70 rounded-lg p-2 border border-gray-700/50">
              <div class="text-xs text-gray-500">Teams</div>
              <div class="text-lg font-semibold mt-1">{{ teamGoalsDisplayData.length }}</div>
            </div>
            <div class="bg-gray-800/70 rounded-lg p-2 border border-gray-700/50">
              <div class="text-xs text-gray-500">Rounds</div>
              <div class="text-lg font-semibold mt-1">{{ rounds.length ? Math.max(...rounds.map(r => r.round)) : 0 }}</div>
            </div>
            <div class="bg-gray-800/70 rounded-lg p-2 border border-gray-700/50">
              <div class="text-xs text-gray-500">Matches</div>
              <div class="text-lg font-semibold mt-1">{{ getTotalMatches }}</div>
            </div>
            <div class="bg-gray-800/70 rounded-lg p-2 border border-gray-700/50">
              <div class="text-xs text-gray-500">Byes</div>
              <div class="text-lg font-semibold mt-1">{{ getByeCount }}</div>
            </div>
          </div>
        </div>

        <!-- Tournament Positions and Team Goals in a 2-column layout -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <!-- Tournament Positions -->
          <div class="bg-gradient-to-b from-gray-700/70 to-gray-800/70 rounded-xl p-3 shadow-md border border-gray-700/30 group hover:border-emerald-500/30 transition-all">
            <h3 class="text-sm font-medium text-emerald-400 mb-2 flex items-center">
            <Trophy class="h-4 w-4 mr-1.5" />
            Tournament Positions
          </h3>
            <div class="space-y-2">
            <!-- 1st Place -->
              <div class="bg-gray-800/70 rounded-lg p-2 border border-amber-500/30 flex items-center">
                <div class="w-7 h-7 flex items-center justify-center rounded-full bg-amber-500/20 text-amber-400 mr-2 font-bold text-sm">
                1
              </div>
                <div class="font-medium text-sm">{{ tournamentStats.firstPlace?.name || "TBD" }}</div>
            </div>
            
            <!-- 2nd Place -->
              <div class="bg-gray-800/70 rounded-lg p-2 border border-gray-400/30 flex items-center">
                <div class="w-7 h-7 flex items-center justify-center rounded-full bg-gray-400/20 text-gray-300 mr-2 font-bold text-sm">
                2
              </div>
                <div class="font-medium text-sm">{{ tournamentStats.secondPlace?.name || "TBD" }}</div>
            </div>
            
            <!-- 3rd Place -->
              <div class="bg-gray-800/70 rounded-lg p-2 border border-amber-700/30 flex items-center">
                <div class="w-7 h-7 flex items-center justify-center rounded-full bg-amber-700/20 text-amber-700 mr-2 font-bold text-sm">
                3
              </div>
                <div class="font-medium text-sm">{{ tournamentStats.thirdPlace?.name || "TBD" }}</div>
            </div>
          </div>
        </div>

        <!-- Team Goals -->
          <div class="bg-gradient-to-b from-gray-700/70 to-gray-800/70 rounded-xl p-3 shadow-md border border-gray-700/30 group hover:border-emerald-500/30 transition-all">
            <h3 class="text-sm font-medium text-emerald-400 mb-2 flex items-center">
            <Shield class="h-4 w-4 mr-1.5" />
            Team Goals
          </h3>
            <div class="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
            <div v-for="(team, index) in teamGoalsDisplayData" :key="team.id" class="bg-gray-800/70 rounded-lg p-2 border border-gray-700/30 flex items-center justify-between">
              <div class="flex items-center">
                  <div class="w-5 h-5 flex items-center justify-center rounded-full bg-gray-700/70 text-xs font-medium text-gray-300 mr-2">
                  {{ index + 1 }}
                </div>
                  <span class="truncate text-sm">{{ team.name }}</span>
              </div>
              <div class="bg-emerald-900/30 text-emerald-400 px-2 py-0.5 rounded text-xs font-medium">
                {{ team.goals }} goals
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tournament Bracket -->
      <div
        v-if="activeTab === 'bracket'"
        ref="bracketContainerRef"
        class="bg-gradient-to-b from-gray-800/90 to-gray-800/70 backdrop-blur-sm rounded-xl p-5 shadow-xl border border-gray-700/50 overflow-x-auto animate-fadeIn custom-scrollbar"
        style="max-height: calc(100vh - 160px); overflow-y: auto;"
      >
        <div
          class="flex gap-6 p-2 min-w-max"
          :style="{
            transform: `scale(${zoomLevel / 100})`,
            transformOrigin: 'top left',
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }"
        >
          <div
            v-for="(round, roundIndex) in rounds"
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
                  'w-full rounded-xl overflow-hidden shadow-lg border transition-all group hover:shadow-emerald-900/10',
                  getMatchCardBorder(match),
                  'bg-gradient-to-b',
                  getMatchCardColor(match)
                ]"
              >
                <div class="bg-gray-800/80 backdrop-blur-sm px-3 py-2 flex justify-between items-center border-b border-gray-700/50">
                  <span class="font-medium text-sm">{{ match.matchName || `Round ${match.round} Match ${matchIndex + 1}` }}</span>
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
                          <Trophy class="h-3 w-3 text-emerald-400" />
                        </div>
                        <span class="truncate">{{ match.team1 ? match.team1.name : 'TBD' }}</span>
                      </div>
                    </div>

                    <!-- Score inputs for team 1 -->
                    <div class="flex items-center gap-1">
                      <div class="flex flex-col items-center">
                        <div class="text-xs text-gray-400 mb-1">Score</div>
                        <input
                          type="number"
                          min="0"
                          max="9"
                          v-model.number="match.score1"
                          @input="updateMatch(roundIndex, matchIndex, 'score1')"
                          :class="[
                            'w-10 text-center rounded p-1 text-sm border transition-all focus:outline-none focus:ring-2',
                            match.winner === match.team1 ? 'bg-emerald-900/30 border-emerald-600/30 focus:ring-emerald-500/50' : 'bg-gray-800 border-gray-700',
                            (!match.team1 || match.hasBye) ? 'cursor-not-allowed opacity-50' : '' 
                          ]"
                          :disabled="!match.team1 || match.hasBye"
                        />
                      </div>
                      <div v-if="match.score1 === match.score2 && match.score1 !== null && match.score2 !== null && match.team1 && match.team2" class="flex items-center">
                        <span class="mx-1 text-xs text-gray-400"></span>
                        <div class="flex flex-col items-center">
                          <div class="text-xs text-gray-400 mb-1">PK</div>
                          <input
                            type="number"
                            min="0"
                            v-model.number="match.pk1"
                            @input="updateMatch(roundIndex, matchIndex, 'pk1')"
                            :class="[
                              'w-8 text-center rounded p-1 text-xs border transition-all focus:outline-none focus:ring-2',
                              match.winner === match.team1 && match.pk1 > match.pk2 ? 'bg-emerald-900/30 border-emerald-600/30 focus:ring-emerald-500/50' : 'bg-gray-800 border-gray-700',
                            ]"
                            :disabled="!match.team1 || !match.team2 || match.hasBye"
                          />
                        </div>
                      </div>
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
                          <Trophy class="h-3 w-3 text-emerald-400" />
                        </div>
                        <span class="truncate">{{ match.team2 ? match.team2.name : 'TBD' }}</span>
                      </div>
                    </div>

                    <!-- Score inputs for team 2 -->
                    <div class="flex items-center gap-1">
                      <div class="flex flex-col items-center">
                        <div class="text-xs text-gray-400 mb-1">Score</div>
                        <input
                          type="number"
                          min="0"
                          v-model.number="match.score2"
                          @input="updateMatch(roundIndex, matchIndex, 'score2')"
                          :class="[
                            'w-10 text-center rounded p-1 text-sm border transition-all focus:outline-none focus:ring-2',
                            match.winner === match.team2 ? 'bg-emerald-900/30 border-emerald-600/30 focus:ring-emerald-500/50' : 'bg-gray-800 border-gray-700',
                            (!match.team2 || match.hasBye) ? 'cursor-not-allowed opacity-50' : '' 
                          ]"
                          :disabled="!match.team2 || match.hasBye"
                        />
                      </div>
                      <div v-if="match.score1 === match.score2 && match.score1 !== null && match.score2 !== null && match.team1 && match.team2" class="flex items-center">
                        <span class="mx-1 text-xs text-gray-400"></span>
                        <div class="flex flex-col items-center">
                          <div class="text-xs text-gray-400 mb-1">PK</div>
                          <input
                            type="number"
                            min="0"
                            v-model.number="match.pk2"
                            @input="updateMatch(roundIndex, matchIndex, 'pk2')"
                            :class="[
                              'w-8 text-center rounded p-1 text-xs border transition-all focus:outline-none focus:ring-2',
                              match.winner === match.team2 && match.pk2 > match.pk1 ? 'bg-emerald-900/30 border-emerald-600/30 focus:ring-emerald-500/50' : 'bg-gray-800 border-gray-700',
                            ]"
                            :disabled="!match.team1 || !match.team2 || match.hasBye"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Match top scorer -->
                  <div v-if="!match.hasBye && match.team1 && match.team1.id !== 'BYE' && match.team2 && match.team2.id !== 'BYE'" class="pt-2 border-t border-gray-700/30 grid grid-cols-12 gap-1 items-center">
                    <div class="col-span-3 text-xs text-emerald-500/80 flex items-center">
                      <Star class="h-3 w-3 mr-1 flex-shrink-0" />
                      <span class="truncate">Top Scorer:</span>
                    </div>
                    <div class="col-span-6">
                      <input
                        type="text"
                        v-model="match.topScorer.name"
                        @input="updateMatch(roundIndex, matchIndex, 'name', $event.target.value)"
                        class="w-full bg-gray-800/70 border border-gray-700/30 rounded p-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                        placeholder="Player name"
                      />
                    </div>
                    <div class="col-span-3 flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        v-model.number="match.topScorer.goals"
                        @input="updateMatch(roundIndex, matchIndex, 'goals', $event.target.value)"
                        class="w-full text-center bg-gray-800/70 border border-gray-700/30 rounded p-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                      />
                      <span class="text-xs text-gray-400">g</span>
                    </div>
                  </div>

                  <!-- Date and Time -->
                  <div v-if="!match.hasBye" class="pt-2 border-t border-gray-700/30 grid grid-cols-12 gap-1 items-center">
                    <div class="col-span-2 text-xs text-emerald-500/80 flex items-center justify-center">
                      <Calendar class="h-3 w-3" />
                    </div>
                    <div class="col-span-4">
                      <input
                        type="date"
                        v-model="match.date"
                        @input="updateMatch(roundIndex, matchIndex, 'date', $event.target.value)"
                        class="w-full bg-gray-800/70 border border-gray-700/30 rounded p-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all appearance-none"
                      />
                    </div>
                    <div class="col-span-2 text-xs text-emerald-500/80 flex items-center justify-center">
                      <Clock class="h-3 w-3" />
                    </div>
                    <div class="col-span-4">
                      <input
                        type="time"
                        v-model="match.time"
                        @input="updateMatch(roundIndex, matchIndex, 'time', $event.target.value)"
                        class="w-full bg-gray-800/70 border border-gray-700/30 rounded p-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all appearance-none"
                      />
                    </div>
                  </div>

                  <!-- Finals placings -->
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
          
          <!-- Display 3rd place match in a separate column if it exists -->
          <div 
            v-if="getThirdPlaceMatch()"
            class="flex flex-col mt-12"
            style="min-width: 280px; max-width: 350px;"
          >
            <div class="mb-3 text-center">
              <h3 class="font-bold text-lg bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent flex items-center justify-center">
                <Trophy class="h-5 w-5 mr-2 text-amber-500" />
                3rd Place Match
              </h3>
            </div>
            
            <div class="flex flex-col justify-center h-full">
              <div
                v-if="getThirdPlaceMatch()"
                class="w-full rounded-xl overflow-hidden shadow-lg border border-amber-700/40 transition-all group hover:shadow-amber-900/20 bg-gradient-to-b from-amber-900/20 to-amber-950/20"
              >
                <div class="bg-amber-900/30 backdrop-blur-sm px-3 py-2 flex justify-between items-center border-b border-amber-700/50">
                  <span class="font-medium text-sm flex items-center">
                    <Trophy class="h-4 w-4 text-amber-700 mr-2" />
                    3rd Place Match
                  </span>
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
                          <Trophy class="h-3 w-3 text-amber-500" />
                        </div>
                        <span class="truncate">{{ getThirdPlaceMatch().team1 ? getThirdPlaceMatch().team1.name : 'Semifinal Loser 1' }}</span>
                      </div>
                    </div>

                    <div class="flex items-center gap-1">
                      <div class="flex flex-col items-center">
                        <div class="text-xs text-gray-400 mb-1">Score</div>
                        <input
                          type="number"
                          min="0"
                          v-model.number="getThirdPlaceMatch().score1"
                          @input="updateMatch(0, 0, 'score1', true)"
                          :class="[
                            'w-10 text-center rounded p-1 text-sm border transition-all focus:outline-none focus:ring-2',
                            getThirdPlaceMatch().winner === getThirdPlaceMatch().team1 ? 'bg-amber-950/30 border-amber-700/30 focus:ring-amber-500/50' : 'bg-gray-800 border-gray-700',
                            !getThirdPlaceMatch().team1 ? 'cursor-not-allowed opacity-50' : '' 
                          ]"
                          :disabled="!getThirdPlaceMatch().team1"
                        />
                      </div>
                      <div v-if="getThirdPlaceMatch().score1 === getThirdPlaceMatch().score2 && getThirdPlaceMatch().score1 !== null && getThirdPlaceMatch().score2 !== null && getThirdPlaceMatch().team1 && getThirdPlaceMatch().team2" class="flex items-center">
                        <span class="mx-1 text-xs text-gray-400"></span>
                        <div class="flex flex-col items-center">
                          <div class="text-xs text-gray-400 mb-1">PK</div>
                          <input
                            type="number"
                            min="0"
                            v-model.number="getThirdPlaceMatch().pk1"
                            @input="updateMatch(0, 0, 'pk1', true)"
                            :class="[
                              'w-8 text-center rounded p-1 text-xs border transition-all focus:outline-none focus:ring-2',
                              getThirdPlaceMatch().winner === getThirdPlaceMatch().team1 && getThirdPlaceMatch().pk1 > getThirdPlaceMatch().pk2 ? 'bg-amber-950/30 border-amber-700/30 focus:ring-amber-500/50' : 'bg-gray-800 border-gray-700',
                            ]"
                            :disabled="!getThirdPlaceMatch().team1 || !getThirdPlaceMatch().team2"
                          />
                        </div>
                      </div>
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
                          <Trophy class="h-3 w-3 text-amber-500" />
                        </div>
                        <span class="truncate">{{ getThirdPlaceMatch().team2 ? getThirdPlaceMatch().team2.name : 'Semifinal Loser 2' }}</span>
                      </div>
                    </div>

                    <div class="flex items-center gap-1">
                      <div class="flex flex-col items-center">
                        <div class="text-xs text-gray-400 mb-1">Score</div>
                        <input
                          type="number"
                          min="0"
                          v-model.number="getThirdPlaceMatch().score2"
                          @input="updateMatch(0, 0, 'score2', true)"
                          :class="[
                            'w-10 text-center rounded p-1 text-sm border transition-all focus:outline-none focus:ring-2',
                            getThirdPlaceMatch().winner === getThirdPlaceMatch().team2 ? 'bg-amber-950/30 border-amber-700/30 focus:ring-amber-500/50' : 'bg-gray-800 border-gray-700',
                            !getThirdPlaceMatch().team2 ? 'cursor-not-allowed opacity-50' : '' 
                          ]"
                          :disabled="!getThirdPlaceMatch().team2" 
                        />
                      </div>
                      <div v-if="getThirdPlaceMatch().score1 === getThirdPlaceMatch().score2 && getThirdPlaceMatch().score1 !== null && getThirdPlaceMatch().score2 !== null && getThirdPlaceMatch().team1 && getThirdPlaceMatch().team2" class="flex items-center">
                        <span class="mx-1 text-xs text-gray-400"></span>
                        <div class="flex flex-col items-center">
                          <div class="text-xs text-gray-400 mb-1">PK</div>
                          <input
                            type="number"
                            min="0"
                            v-model.number="getThirdPlaceMatch().pk2"
                            @input="updateMatch(0, 0, 'pk2', true)"
                            :class="[
                              'w-8 text-center rounded p-1 text-xs border transition-all focus:outline-none focus:ring-2',
                              getThirdPlaceMatch().winner === getThirdPlaceMatch().team2 && getThirdPlaceMatch().pk2 > getThirdPlaceMatch().pk1 ? 'bg-amber-950/30 border-amber-700/30 focus:ring-amber-500/50' : 'bg-gray-800 border-gray-700',
                            ]"
                            :disabled="!getThirdPlaceMatch().team1 || !getThirdPlaceMatch().team2"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Match top scorer -->
                  <div v-if="getThirdPlaceMatch().team1 && getThirdPlaceMatch().team2" class="pt-2 border-t border-amber-700/30 grid grid-cols-12 gap-1 items-center">
                    <div class="col-span-3 text-xs text-amber-700/80 flex items-center">
                      <Star class="h-3 w-3 mr-1 flex-shrink-0" />
                      <span class="truncate">Top Scorer:</span>
                    </div>
                    <div class="col-span-6">
                      <input
                        type="text"
                        v-model="getThirdPlaceMatch().topScorer.name"
                        @input="updateMatch(0, 0, 'name', true)"
                        class="w-full bg-gray-800/70 border border-amber-700/30 rounded p-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
                        placeholder="Player name"
                      />
                    </div>
                    <div class="col-span-3 flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        v-model.number="getThirdPlaceMatch().topScorer.goals"
                        @input="updateMatch(0, 0, 'goals', true)"
                        class="w-full text-center bg-gray-800/70 border border-amber-700/30 rounded p-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
                      />
                      <span class="text-xs text-gray-400">g</span>
                    </div>
                  </div>

                  <!-- Date and Time -->
                  <div class="pt-2 border-t border-amber-700/30 grid grid-cols-12 gap-1 items-center">
                    <div class="col-span-2 text-xs text-emerald-500/80 flex items-center justify-center">
                      <Calendar class="h-3 w-3" />
                    </div>
                    <div class="col-span-4">
                      <input
                        type="date"
                        v-model="getThirdPlaceMatch().date"
                        @input="updateMatch(0, 0, 'date', true)"
                        class="w-full bg-gray-800/70 border border-gray-700/30 rounded p-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all appearance-none"
                      />
                    </div>
                    <div class="col-span-2 text-xs text-emerald-500/80 flex items-center justify-center">
                      <Clock class="h-3 w-3" />
                    </div>
                    <div class="col-span-4">
                      <input
                        type="time"
                        v-model="getThirdPlaceMatch().time"
                        @input="updateMatch(0, 0, 'time', true)"
                        class="w-full bg-gray-800/70 border border-gray-700/30 rounded p-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all appearance-none"
                      />
                    </div>
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
    </div>
     <!-- Error Display -->
    <div v-if="error" class="fixed bottom-4 right-4 bg-red-600 text-white p-3 rounded-lg shadow-lg animate-fadeIn">
      Error: {{ error }}
    </div>
     <!-- Backend Data Warning -->
     <div v-if="backendDataWarning" class="fixed bottom-16 right-4 bg-yellow-500 text-black p-3 rounded-lg shadow-lg animate-fadeIn">
       Warning: {{ backendDataWarning }}
     </div>


    <!-- Tournament With No Bracket Yet -->
     <div v-else-if="route.params.id && !bracketGenerated && !loading" class="flex flex-col items-center justify-center gap-6 max-w-lg mx-auto w-full animate-fadeIn">
      <div class="bg-gradient-to-b from-gray-800/80 to-gray-800/40 backdrop-blur-sm p-6 rounded-xl shadow-xl border border-gray-700/50 text-center">
        <Trophy class="h-16 w-16 text-amber-500/60 mx-auto mb-4" />
        <h2 class="text-xl font-semibold mb-4 bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">
          {{ tournamentName || 'Tournament' }}
        </h2>

        <p class="text-gray-300 mb-6">
          {{ error || "This tournament's bracket has not been generated yet." }}
        </p>

        <div v-if="teams.length >= 2 && !error" class="mb-6">
          <h3 class="text-sm font-medium text-emerald-400 mb-3">Registered Teams ({{ teams.length }})</h3>
          <div class="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
            <div
              v-for="(team, idx) in teams"
              :key="team.id"
              class="flex items-center bg-gray-800/50 p-2.5 rounded-lg border border-gray-700/50 group hover:border-emerald-500/30 transition-all"
            >
              <div class="w-6 h-6 flex items-center justify-center rounded-full bg-gray-700/70 text-xs font-medium text-gray-300 mr-2">
                {{ idx + 1 }}
              </div>
              <span class="truncate">{{ team.name }}</span>
            </div>
          </div>

          <button
            @click="generateBracket"
            class="w-full py-3 mt-6 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-md hover:shadow-lg rounded-lg transition-all font-medium text-base"
          >
            Generate Tournament Bracket
          </button>
          <p class="text-xs text-center text-gray-500 mt-2">
            Generating the bracket will create match-ups for all registered teams.
          </p>
        </div>

        <div v-else class="text-center">
          <p class="text-amber-400 text-sm mb-4">
            {{ error || 'Not enough teams registered to generate a bracket.' }}
            <br>A minimum of 2 teams is required.
          </p>
          <button
            @click="goBack"
            class="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 transition-colors"
          >
            Return to Tournaments
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, reactive, onMounted, watch, nextTick } from 'vue';
import { Trophy, Calendar, Clock, Shield, ZoomIn, ZoomOut, Star, Award, User, ChevronRight, Loader2Icon, ArrowLeftIcon, Save, Send, CheckCircle, AlertTriangle, X } from 'lucide-vue-next';
import { useRoute, useRouter } from 'vue-router';
import { loadBracketAssets } from '@/utils/bracketSetup';
import API_URL from '@/config/api';

// --- Configuration ---
const ZOOM_STEP = 10;
const MIN_ZOOM = 50;
const MAX_ZOOM = 150;
const BYE_TEAM = { id: 'BYE', name: 'Bye' }; // Define a constant for Bye

export default {
  name: 'TournamentBrackets',
  components: {
    Trophy, Calendar, Clock, Shield, ZoomIn, ZoomOut, Star, Award, User, ChevronRight, Loader2Icon, ArrowLeftIcon, Save, Send, CheckCircle, AlertTriangle, X
  },
  setup() {
    const route = useRoute();
    const router = useRouter();

    // Refs for DOM elements
    const teamInputRef = ref(null);
    const bracketContainerRef = ref(null);

    // Component state
    const teams = ref([]);
    const teamName = ref('');
    const rounds = ref([]);
    const teamGoalsDisplayData = ref([]); // <-- New ref for team goals
    const bracketGenerated = ref(false);
    const zoomLevel = ref(100);
    const activeTab = ref('bracket');
    const loading = ref(false);
    const tournamentName = ref('');
    const error = ref(null);
    const backendDataWarning = ref(null); // Added for backend data issues

    // Tournament stats
    const tournamentStats = reactive({
      topScorer: { name: '', goals: 0 },
      mvp: '',
      playerOfTournament: '',
      firstPlace: null,
      secondPlace: null,
      thirdPlace: null
    });

    // --- Helper Functions ---

    const calculateRounds = (numTeams) => {
       if (numTeams < 2) return 0;
       return Math.ceil(Math.log2(numTeams));
    };

    const calculateByes = (numTeams) => {
        if (numTeams < 2) return 0;
        const numRounds = calculateRounds(numTeams);
        const totalSlots = Math.pow(2, numRounds);
        return totalSlots - numTeams;
    };

    const getRoundName = (roundNumber, matchCount) => {
      // Handle special rounds
      if (roundNumber === 1) return 'First Round';
      if (roundNumber === 2 && matchCount === 2) return 'Semifinals';
      if (roundNumber === 3 && matchCount === 1) return 'Final';
      
      // Default
      return `Round ${roundNumber}`;
    };


    const getRoundNamePreview = (roundNumber) => {
        const numTeams = teams.value.length;
        if (numTeams < 2) return `Round ${roundNumber}`;
        const totalRounds = calculateRounds(numTeams);

        if (roundNumber === totalRounds) return 'Final';
        if (roundNumber === totalRounds - 1) return 'Semi-Finals';
        if (roundNumber === totalRounds - 2) return 'Quarter-Finals';
        return `Round ${roundNumber}`;
    };

    // --- Core Logic: Team Management ---

    const addTeam = () => {
      const trimmedName = teamName.value.trim();
      if (trimmedName === '') return;
      if (teams.value.some(team => team.name.toLowerCase() === trimmedName.toLowerCase())) {
         alert(`Team "${trimmedName}" already exists.`);
         return;
      }
      if (bracketGenerated.value) {
         alert("Cannot add teams after bracket is generated. Please reset if needed.");
         return;
      }
      teams.value.push({ id: `team-${Date.now()}-${Math.random()}`, name: trimmedName });
      teamName.value = '';
      teamInputRef.value?.focus();
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addTeam();
      }
    };

    // --- Core Logic: Bracket Generation & Propagation (WITH DETAILED LOGGING & BYE WINNER FIX) ---

    const propagateWinners = (allRounds) => {
      console.log('--- propagateWinners START (v3 - Ignore BYE winner propagation) ---');
      backendDataWarning.value = null; // Clear previous warning
      if (!allRounds || allRounds.length === 0) {
        console.log('propagateWinners: No rounds to process');
        return;
      }

      // Find max round number
      const maxRound = Math.max(...allRounds.map(r => r.round));
      console.log(`propagateWinners: Max round number = ${maxRound}`);

      // Find third place match for loser propagation
      const thirdPlaceMatch = allRounds.flatMap(r => r.matches).find(m => m.isThirdPlace);
      if (thirdPlaceMatch) {
        console.log(`propagateWinners: Found 3rd place match: ${thirdPlaceMatch.id}, completed: ${thirdPlaceMatch.completed}, winner: ${thirdPlaceMatch.winner?.name || 'None'}`);
        
        // Preserve 3rd place match completion and winner if it was manually set
        if (thirdPlaceMatch.completed && thirdPlaceMatch.winner) {
          console.log(`propagateWinners: 3rd place match already has a winner: ${thirdPlaceMatch.winner.name}. Preserving state.`);
        }
      }

      // Process each round (except the last) to propagate winners/losers to next rounds
      for (let roundIndex = 0; roundIndex < allRounds.length; roundIndex++) {
        const currentRound = allRounds[roundIndex];
        console.log(`\npropagateWinners: Processing Round ${currentRound.round}`);

        // Find the next round structure (where winners will go)
        const nextRoundNum = currentRound.round + 1;
        const nextRound = allRounds.find(r => r.round === nextRoundNum);
        if (nextRound) {
          console.log(`propagateWinners: Found next round structure: Round ${nextRound.round}`);
        } else if (currentRound.round < maxRound) {
          console.log(`propagateWinners: WARNING: No structure found for Round ${nextRoundNum}, but expected one.`);
        } else {
          console.log(`propagateWinners: No next round found after Round ${currentRound.round}. Skipping propagation from this round.`);
          continue; // Skip if this is the final round
        }

        // Process each match in the current round
        for (let matchIndex = 0; matchIndex < currentRound.matches.length; matchIndex++) {
          const match = currentRound.matches[matchIndex];
          console.log(`\npropagateWinners:   Processing Match ${match.id} (Index ${matchIndex}) in Round ${currentRound.round}`);
          
          const matchInfo = {
            team1: match.team1?.name,
            team2: match.team2?.name,
            winner: match.winner?.name,
            completed: match.completed,
            hasBye: match.hasBye
          };
          console.log(`propagateWinners:     Match Data: ${JSON.stringify(matchInfo)}`);

          // If match has a winner, propagate to next round
          let winner = match.winner;
          const loser = match.completed && winner ? 
            (match.team1?.id === winner.id ? match.team2 : match.team1) : null;
          
          console.log(`propagateWinners:     Determined Winner: ${winner?.name}, Loser: ${loser?.name}`);

          // Check if there's a next round to propagate to, if not - this is the final match (or final round)
          if (nextRound && match.completed && winner) {
            // Calculate which match in the next round this winner should go to
            const nextMatchIndex = Math.floor(matchIndex / 2);
            console.log(`propagateWinners:     Calculating next match index for winner: ${nextMatchIndex}`);
            
            // Find the next match
            const nextMatch = nextRound.matches.find(m => !m.isThirdPlace && 
              nextRound.matches.filter(nm => !nm.isThirdPlace).indexOf(m) === nextMatchIndex);
            
            if (nextMatch) {
              console.log(`propagateWinners:       Propagating winner ${winner.name} to Next Match ${nextMatch.id} (Is First Feeder: ${matchIndex % 2 === 0})`);
              
              // Determine if this match feeds into the first team slot (team1) or second (team2)
              if (matchIndex % 2 === 0) { // Even match index goes to team1 of next match
                console.log(`propagateWinners:         Assigning ${winner.name} to ${nextMatch.id}.team1 (was ${nextMatch.team1?.name})`);
                nextMatch.team1 = winner;
              } else { // Odd match index goes to team2
                console.log(`propagateWinners:         Assigning ${winner.name} to ${nextMatch.id}.team2 (was ${nextMatch.team2?.name})`);
                nextMatch.team2 = winner;
              }
              
              // Decide the completion status of the next match
              // Only reset completion if both teams are now real teams (not BYE or null)
              const bothTeamsPresent = nextMatch.team1 && nextMatch.team2 && 
                nextMatch.team1.id !== 'BYE' && nextMatch.team2.id !== 'BYE';
              
              if (bothTeamsPresent) {
                // If both teams are present, reset the completion status
                // IMPORTANT FIX: Only reset completion status if it's not already completed
                if (!nextMatch.completed) {
                  console.log(`propagateWinners:         Both slots filled in ${nextMatch.id} with actual teams. Resetting completion status.`);
                  nextMatch.completed = false;
                  nextMatch.winner = null;
                        } else {
                  console.log(`propagateWinners:         Both slots filled in ${nextMatch.id} but match is already completed with winner ${nextMatch.winner?.name}. Maintaining status.`);
                }
              } else {
                console.log(`propagateWinners:         One slot in ${nextMatch.id} is still TBD or BYE. Keeping incomplete.`);
                if (nextMatch.hasBye && nextMatch.team1 && nextMatch.team1.id !== 'BYE') {
                  // If it's a bye match and team1 is present (not BYE), set winner to team1
                  nextMatch.winner = nextMatch.team1;
                  nextMatch.completed = true;
                }
              }
              
              // Log the next match state after propagation
              const nextMatchInfo = {
                team1: nextMatch.team1?.name,
                team2: nextMatch.team2?.name,
                completed: nextMatch.completed
              };
              console.log(`propagateWinners:       ${nextMatch.id} state after winner propagation: ${JSON.stringify(nextMatchInfo)}`);
            } else {
              console.log(`propagateWinners:       WARNING: Couldn't find next match at index ${nextMatchIndex} in round ${nextRoundNum}`);
            }
          } else if (match.completed && !winner) {
            console.log(`propagateWinners:     Match ${match.id} is marked completed but has no winner.`);
          } else if (!match.completed) {
            console.log(`propagateWinners:     No winner for match ${match.id}, cannot propagate winner.`);
          }
          
          // Handle loser propagation for 3rd place match if we're in the semifinal round
          const isSemifinalRound = currentRound.round === maxRound - 1;
          if (isSemifinalRound && loser && thirdPlaceMatch) {
            // Determine if this is first or second semifinal
            const isFirstSemifinal = matchIndex === 0;
            if (isFirstSemifinal) {
              console.log(`propagateWinners:       Propagating semifinal loser ${loser.name} to 3rd place match as team1`);
              thirdPlaceMatch.team1 = loser;
            } else {
              console.log(`propagateWinners:       Propagating semifinal loser ${loser.name} to 3rd place match as team2`);
              thirdPlaceMatch.team2 = loser;
            }
            
            // Reset 3rd place match completion if both teams are now assigned
            if (thirdPlaceMatch.team1 && thirdPlaceMatch.team2) {
              console.log(`propagateWinners:       Both slots filled in 3rd place match. Resetting completion status.`);
              thirdPlaceMatch.completed = false;
              thirdPlaceMatch.winner = null;
            }
          }
        }
      }
      
      // --- Process 3rd Place Match Specifically ---
    // This is a key addition to properly handle the 3rd place match 
    // Find third place match again to make sure we have the latest state
    const updatedThirdPlaceMatch = allRounds.flatMap(r => r.matches).find(m => m.isThirdPlace);
    if (updatedThirdPlaceMatch) {
      console.log(`propagateWinners: Final 3rd place match state: team1=${updatedThirdPlaceMatch.team1?.name}, team2=${updatedThirdPlaceMatch.team2?.name}, score1=${updatedThirdPlaceMatch.score1}, score2=${updatedThirdPlaceMatch.score2}, winner=${updatedThirdPlaceMatch.winner?.name}, completed=${updatedThirdPlaceMatch.completed}`);
      
      // Check if we need to auto-complete the 3rd place match based on scores
      if (!updatedThirdPlaceMatch.completed && updatedThirdPlaceMatch.team1 && updatedThirdPlaceMatch.team2) {
        if (updatedThirdPlaceMatch.score1 !== null && updatedThirdPlaceMatch.score2 !== null) {
          if (updatedThirdPlaceMatch.score1 > updatedThirdPlaceMatch.score2) {
            updatedThirdPlaceMatch.winner = updatedThirdPlaceMatch.team1;
            updatedThirdPlaceMatch.completed = true;
            console.log(`propagateWinners: Auto-completed 3rd place match with winner ${updatedThirdPlaceMatch.team1.name}`);
          } else if (updatedThirdPlaceMatch.score2 > updatedThirdPlaceMatch.score1) {
            updatedThirdPlaceMatch.winner = updatedThirdPlaceMatch.team2;
            updatedThirdPlaceMatch.completed = true;
            console.log(`propagateWinners: Auto-completed 3rd place match with winner ${updatedThirdPlaceMatch.team2.name}`);
          } else if (updatedThirdPlaceMatch.pk1 !== null && updatedThirdPlaceMatch.pk2 !== null) {
            // Handle penalties
            if (updatedThirdPlaceMatch.pk1 > updatedThirdPlaceMatch.pk2) {
              updatedThirdPlaceMatch.winner = updatedThirdPlaceMatch.team1;
              updatedThirdPlaceMatch.completed = true;
              console.log(`propagateWinners: Auto-completed 3rd place match with PK winner ${updatedThirdPlaceMatch.team1.name}`);
            } else if (updatedThirdPlaceMatch.pk2 > updatedThirdPlaceMatch.pk1) {
              updatedThirdPlaceMatch.winner = updatedThirdPlaceMatch.team2;
              updatedThirdPlaceMatch.completed = true;
              console.log(`propagateWinners: Auto-completed 3rd place match with PK winner ${updatedThirdPlaceMatch.team2.name}`);
            }
          }
        }
      }
      
      // Manually ensure tournament stats has the 3rd place winner
      if (updatedThirdPlaceMatch.winner && updatedThirdPlaceMatch.completed) {
        tournamentStats.thirdPlace = updatedThirdPlaceMatch.winner;
        console.log(`propagateWinners: Updated tournament stats thirdPlace to ${updatedThirdPlaceMatch.winner.name}`);
      }
    }
      
      console.log('--- propagateWinners END ---');
      updateTournamentPositions(); // Update positions after propagation
    };

    const generateBracket = () => {
      console.log("--- generateBracket START ---");
      if (teams.value.length < 2) {
        console.log("generateBracket: Not enough teams (< 2). Aborting.");
        alert('Please add at least 2 teams');
        console.log("--- generateBracket END ---");
        return;
      }

      const numTeams = teams.value.length;
      const numRounds = calculateRounds(numTeams);
      const totalSlots = Math.pow(2, numRounds);
      const numByes = totalSlots - numTeams;
      const numMatchesRound1 = totalSlots / 2;
      console.log(`generateBracket: Teams=${numTeams}, Rounds=${numRounds}, Slots=${totalSlots}, Byes=${numByes}, Round1Matches=${numMatchesRound1}`);
      const generatedRounds = [];

      // --- Create Round 1 with IMPROVED BYE PLACEMENT ---
      const firstRoundMatches = [];
      const teamsCopy = [...teams.value];
      console.log("generateBracket: Initial teams:", JSON.stringify(teamsCopy.map(t => t.name)));

      // Create initial seeding with proper bye distribution
      // This algorithm places byes in positions that lead to more fair matchups
      // Similar to the white-themed bracket in the reference image
      
      // Optimized bye placement using power-of-2 pairing
      // This ensures byes are evenly distributed across the bracket
      let byePositions = [];
      if (numByes > 0) {
          // Calculate positions that should get byes
          // Uses binary counting approach that ensures balanced distribution
          let numPositions = totalSlots;
          let increment = 1;
          
          while (byePositions.length < numByes && increment < numPositions) {
              for (let i = increment; i <= numPositions; i += (increment * 2)) {
                  byePositions.push(i);
                  if (byePositions.length >= numByes) break;
              }
              increment *= 2;
          }
          
          // Sort so higher positions get byes first (bottom to top)
          byePositions.sort((a, b) => b - a);
      }
      
      console.log(`generateBracket: Bye positions (1-based): ${byePositions.join(', ')}`);
      
      // Create matches
      for (let i = 0; i < numMatchesRound1; i++) {
          const matchId = `R1-M${i + 1}`;
          
          // 1-based positions for this match
          const position1 = i * 2 + 1;
          const position2 = i * 2 + 2;
          
          // Check if either position should get a bye
          const isBye1 = byePositions.includes(position1);
          const isBye2 = byePositions.includes(position2);
          
          // Assign teams based on bye positions
          let team1, team2, winner = null, completed = false;
          
          // Determine teams for this match
          if (isBye1 && !isBye2) {  // Position 1 gets bye
              team1 = BYE_TEAM;
              const teamIndex = position2 - byePositions.filter(p => p <= position2).length - 1;
              team2 = teamsCopy[teamIndex];
              winner = team2;
              completed = true;
          }
          else if (!isBye1 && isBye2) {  // Position 2 gets bye
              const teamIndex = position1 - byePositions.filter(p => p <= position1).length - 1;
              team1 = teamsCopy[teamIndex];
              team2 = BYE_TEAM;
              winner = team1;
              completed = true;
          }
          else if (isBye1 && isBye2) {  // Both get byes - should never happen
              console.error(`generateBracket: ERROR - Both positions ${position1} and ${position2} marked as byes. This is a logic error.`);
              continue;
          }
          else {  // No byes - regular match
              const teamIndex1 = position1 - byePositions.filter(p => p <= position1).length - 1;
              const teamIndex2 = position2 - byePositions.filter(p => p <= position2).length - 1;
              team1 = teamsCopy[teamIndex1];
              team2 = teamsCopy[teamIndex2];
          }
          
          // Create the match
          const hasBye = isBye1 || isBye2;
          let matchName = `Round 1 Match ${i + 1}`;
          if (hasBye) matchName += ' (Bye)';
          
          const matchData = {
          id: matchId,
              matchName: matchName,
          team1: team1,
              team2: team2,
              score1: completed ? 0 : null,
              score2: completed ? 0 : null,
              winner: winner,
              pk1: null, pk2: null, hasPK: false,
              date: '', time: '',
          topScorer: { name: '', goals: 0 },
          hasBye: hasBye,
              completed: completed
        };
          
          console.log(`generateBracket: Match ${i+1}: ${team1?.name || 'NULL'} vs ${team2?.name || 'NULL'} - Bye: ${hasBye}`);
          firstRoundMatches.push(matchData);
      }
      
      generatedRounds.push({ round: 1, matches: firstRoundMatches });

      // --- Create Subsequent Rounds (Structure Only) ---
      console.log("\ngenerateBracket: Creating subsequent round structures...");
      let currentRoundNum = 1;
      let matchesInPrevRound = firstRoundMatches.length;
      while (matchesInPrevRound > 1) {
          currentRoundNum++;
          const matchesInCurrentRound = matchesInPrevRound / 2;
        const roundMatches = [];
          console.log(`generateBracket:   Creating structure for Round ${currentRoundNum} (${matchesInCurrentRound} matches)`);
          for (let i = 0; i < matchesInCurrentRound; i++) {
              const matchId = `R${currentRoundNum}-M${i+1}`;
              let matchName = getRoundName(currentRoundNum, matchesInCurrentRound);
              if (!(currentRoundNum === numRounds && matchesInCurrentRound === 1)) {
                  matchName += ` Match ${i+1}`;
              }
              roundMatches.push({
                  id: matchId, matchName: matchName,
                  team1: null, team2: null,
                  score1: null, score2: null, winner: null,
            pk1: null, pk2: null, hasPK: false,
            date: '', time: '',
            topScorer: { name: '', goals: 0 },
                  hasBye: false, completed: false, isThirdPlace: false
              });
          }
          generatedRounds.push({ round: currentRoundNum, matches: roundMatches });
          matchesInPrevRound = matchesInCurrentRound;
      }
       console.log("generateBracket: Finished creating subsequent round structures.");

      // --- Add 3rd place match if applicable ---
      console.log("\ngenerateBracket: Checking for 3rd place match...");
      if (numRounds >= 2 && teams.value.length > 2) {
          const finalRoundNumber = generatedRounds.length; // Round number of the final
          let targetRoundFor3rdPlace = generatedRounds.find(r => r.round === finalRoundNumber);
          const thirdPlaceExists = generatedRounds.some(r => r.matches.some(m => m.isThirdPlace));

          if (targetRoundFor3rdPlace && !thirdPlaceExists) {
               console.log(`generateBracket:   Adding 3rd place match structure to Round ${finalRoundNumber}.`);
               targetRoundFor3rdPlace.matches.push({
                  id: `R${finalRoundNumber}-3rd`, matchName: `3rd Place Match`,
                  team1: null, team2: null,
                  score1: null, score2: null, winner: null,
                  pk1: null, pk2: null, hasPK: false,
                  date: '', time: '',
            topScorer: { name: '', goals: 0 },
                  hasBye: false, completed: false, isThirdPlace: true,
              });
          } else if (thirdPlaceExists) {
               console.log("generateBracket:   3rd place match structure already exists.");
          } else {
              console.error("generateBracket:   Could not find final round structure to add 3rd place match.");
          }
      } else {
           console.log("generateBracket:   Not enough rounds or teams for a 3rd place match.");
      }

      // --- Propagate Bye Winners Immediately ---
      console.log("\ngenerateBracket: Running initial propagation for byes...");
      propagateWinners(generatedRounds);

      // --- Final State Update ---
      rounds.value = generatedRounds;
      bracketGenerated.value = true;
      activeTab.value = 'bracket';
      // Log simplified structure for readability in console
      console.log("generateBracket: Bracket generation complete. Final structure:", JSON.stringify(rounds.value, (key, value) => {
          if (key === 'team1' || key === 'team2' || key === 'winner') {
              return value ? value.name : null; // Show only team names or null
          }
          return value;
      }, 2));
      console.log("--- generateBracket END ---");
    };


    // --- Core Logic: Match Updates ---
    const updateMatch = (roundIndex, matchIndex, field, isFromThirdPlace = false) => {
      let match;
      let actualRoundIndex = roundIndex;
      let actualMatchIndex = matchIndex;

      if (isFromThirdPlace) {
        console.log(`updateMatch: Called specifically for 3rd place match, field=${field}`);
        match = getThirdPlaceMatch();
        if (!match) {
            console.error("updateMatch: Could not find 3rd place match object.");
            return;
        }
        // Find the actual indices for logging and potential use later
        const roundInfo = getThirdPlaceMatchRound();
        actualRoundIndex = roundInfo.roundIndex;
        const foundRound = rounds.value[actualRoundIndex];
        actualMatchIndex = foundRound ? foundRound.matches.findIndex(m => m.id === match.id) : -1;
      } else {
        // Original logic for regular matches
        const round = rounds.value[roundIndex];
        if (!round) return;
        // Find the match within that round's matches array using the filtered index
        const matchId = round.matches.filter(m => !m.isThirdPlace)[matchIndex]?.id; 
        actualMatchIndex = round.matches.findIndex(m => m.id === matchId);
        if (actualMatchIndex === -1) { // Match not found
            console.error(`updateMatch: Could not find regular match with filtered index ${matchIndex} in round ${roundIndex}.`);
            return;
        }
        match = round.matches[actualMatchIndex];
      }

      console.log(`updateMatch: Processing ${match.id}, field=${field}, isThirdPlace=${match.isThirdPlace}`);

      // Ensure scores are numbers or null
      if (field === 'score1' || field === 'score2' || field === 'pk1' || field === 'pk2') {
         const value = match[field];
         match[field] = value === '' || value === null ? null : Math.max(0, parseInt(value || 0, 10));
      }

      // --- Determine Winner ---
      let newWinner = null;
      let isComplete = false;

      if (match.hasBye && match.team1 && match.team1.id !== 'BYE') {
          newWinner = match.team1;
          isComplete = true;
      }
      else if (match.team1 && match.team1.id !== 'BYE' && match.team2 && match.team2.id !== 'BYE') {
          if (match.score1 !== null && match.score2 !== null) {
              if (match.score1 > match.score2) {
                  newWinner = match.team1;
                  isComplete = true;
              } else if (match.score2 > match.score1) {
                  newWinner = match.team2;
                  isComplete = true;
              } else { // Draw requires PK
                  if (match.pk1 !== null && match.pk2 !== null) {
                      if (match.pk1 > match.pk2) {
                          newWinner = match.team1;
                          isComplete = true;
                      } else if (match.pk2 > match.pk1) {
                          newWinner = match.team2;
                          isComplete = true;
                      }
                  }
              }
          }
      }

      // --- Update Match State ---
      const winnerChanged = match.winner?.id !== newWinner?.id;
      const originalWinner = match.winner;
      const originalComplete = match.completed;
      
      match.winner = newWinner;
      match.completed = isComplete;
      
      console.log(`updateMatch: Updated ${match.id} - Winner: ${newWinner?.name}, Completed: ${isComplete}, Scores: ${match.score1}-${match.score2}, IsThirdPlace: ${match.isThirdPlace}`);

      // --- Handle 3rd Place Match Specifically ---
      // This logic remains, but now we are sure `match` is the correct object
      if (match.isThirdPlace && isComplete) {
          console.log("Updating 3rd place match winner STAT directly to:", newWinner?.name);
          if (newWinner) {
              tournamentStats.thirdPlace = newWinner;
          } else {
              // If match completed but somehow no winner (e.g., PK draw not handled yet)
              tournamentStats.thirdPlace = null; 
          }
      }

      // --- Propagate Winner/Loser ---
      if (winnerChanged || isComplete !== originalComplete) {
          console.log(`updateMatch: Winner changed or match completed for ${match.id}. Triggering propagation.`);
          console.log(`updateMatch: Previous state - Winner: ${originalWinner?.name}, Completed: ${originalComplete}`);
          console.log(`updateMatch: New state - Winner: ${match.winner?.name}, Completed: ${match.completed}`);
          propagateWinners(rounds.value); 
          // updateTournamentPositions(); // updateTournamentPositions is called within propagateWinners end
      }
      calculateAndSetTeamGoals(); // <-- Recalculate goals after match update
    };

    // --- Core Logic: Stats Management ---
    const updateTopScorerName = (e) => { tournamentStats.topScorer.name = e.target.value; };
    const updateTopScorerGoals = (e) => { tournamentStats.topScorer.goals = Math.max(0, parseInt(e.target.value || 0, 10)); };

    // --- Core Logic: Data Loading ---
    const fetchTournamentBracket = async (id) => {
      loading.value = true;
      error.value = null;
      backendDataWarning.value = null; // Clear warning on new fetch
      console.log(`Fetching bracket for tournament ID: ${id}`);
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Authentication is required. Please log in.');

        const response = await fetch(`${API_URL}/api/tournaments/${id}`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({ message: `HTTP error! Status: ${response.status}` }));
          throw new Error(errData.message || `Failed to fetch tournament data. Status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Fetched tournament data:', data);
        tournamentName.value = data.name || 'Tournament';

        // Process Registered Teams
        if (data.registeredTeamsDetails && data.registeredTeamsDetails.length > 0) {
            teams.value = data.registeredTeamsDetails.map(teamDetail => ({
                id: teamDetail._id || `team-${Math.random()}`,
                name: teamDetail.teamName || 'Unnamed Team'
            }));
            console.log("Processed teams:", teams.value);
        } else {
            teams.value = [];
            console.log("No registered teams found in data.");
        }

        // Process Bracket Data
        if (data.bracket && data.bracket.rounds) {
            console.log("Processing bracket data:", data.bracket);
            const processedRounds = [];
            let foundByeBye = false; // Flag to detect Bye vs Bye
            
            // Handle nested rounds structure - the API returns rounds as objects with 'round' property and 'matches' array
            if (Array.isArray(data.bracket.rounds)) {
                // Check if rounds is an array of round objects (each with round number and matches array)
                // This is how the data comes from the backend - we need to handle it properly
                for (const roundData of data.bracket.rounds) {
                    if (roundData && typeof roundData === 'object' && roundData.round && Array.isArray(roundData.matches)) {
                        // Create a round object with proper structure
                        const roundObj = {
                            round: roundData.round,
                            matches: []
                        };
                        
                        // Process each match in this round
                        for (const matchData of roundData.matches) {
                            // Improve the processing by preserving team and winner information from the API
                            // Make sure we keep the team information from the API response
                            const processTeamInfo = (matchTeam) => {
                                if (!matchTeam) return null;
                                
                                // Ensure we consistently use the MongoDB _id as the primary id
                                const teamId = typeof matchTeam === 'object' ? matchTeam._id || matchTeam.id : matchTeam;
                                const teamName = typeof matchTeam === 'object' ? matchTeam.teamName || matchTeam.name : null;

                                if (teamId === 'BYE') return BYE_TEAM;
                                if (!teamId) return null; // No valid ID found

                                // Prefer finding the full team object from teams.value if available
                                const existingTeam = teams.value.find(t => t.id === teamId);
                                if (existingTeam) return existingTeam;
                                
                                // Fallback: Construct team object from available info, prioritizing _id for consistency
                                return {
                                    id: teamId, // Use the resolved teamId (which should be the _id)
                                    name: teamName || `Team ${teamId.toString().slice(-4)}` // Use provided name or generate fallback
                                };
                            };
                            
                            const team1 = processTeamInfo(matchData.team1);
                            const team2 = processTeamInfo(matchData.team2);
                            const winner = matchData.winner ? processTeamInfo(matchData.winner) : null;
                            const hasBye = team1?.id === 'BYE' || team2?.id === 'BYE'; // Check if either team is BYE
                            
                            // Detect Bye vs Bye specifically
                            if (team1?.id === 'BYE' && team2?.id === 'BYE') {
                                console.error(`*** DETECTED INVALID Bye vs Bye match in loaded data: Round ${roundData.round}, Match ${matchData.match || matchData.id} ***`);
                                foundByeBye = true;
                            }
                            
                            // Create a proper match ID if not present
                            const matchId = matchData.id || `R${roundData.round}-M${matchData.match || roundObj.matches.length + 1}${matchData.isThirdPlace ? '-3rd' : ''}`;
                            let matchName = `Round ${roundData.round} Match ${matchData.match || roundObj.matches.length + 1}`;
                            
                            if (matchData.isThirdPlace) { matchName = '3rd Place Match'; }
                            if (hasBye && !(team1?.id === 'BYE' && team2?.id === 'BYE')) { matchName += ' (Bye)'; } // Add (Bye) only if one team is Bye
                            if (team1?.id === 'BYE' && team2?.id === 'BYE') { matchName += ' (INVALID Bye vs Bye)'; } // Mark invalid matches
                            
                            const matchObj = {
                                id: matchId,
                                matchName: matchName,
                                team1: team1,
                                team2: team2,
                                winner: winner,
                                hasBye: hasBye,
                                score1: matchData.score1 ?? null,
                                score2: matchData.score2 ?? null,
                                pk1: matchData.pk1 ?? null,
                                pk2: matchData.pk2 ?? null,
                                hasPK: matchData.hasPK ?? false,
                                completed: matchData.completed ?? hasBye ?? (!!winner),
                                topScorer: matchData.topScorer ? { 
                                    name: matchData.topScorer.name || '', 
                                    goals: matchData.topScorer.goals || 0 
                                } : { name: '', goals: 0 },
                                date: matchData.date ? (typeof matchData.date === 'string' ? matchData.date.split('T')[0] : '') : '',
                                time: matchData.time || '',
                                originalMatchNumber: matchData.match,
                                isThirdPlace: matchData.isThirdPlace || false,
                            };
                            
                            roundObj.matches.push(matchObj);
                        }
                        
                        processedRounds.push(roundObj);
                    } else {
                        console.error(`Invalid round data structure:`, roundData);
                    }
                }
                
                // Sort rounds by round number
                processedRounds.sort((a, b) => a.round - b.round);
                const totalRoundsLoaded = processedRounds.length > 0 ? Math.max(...processedRounds.map(r => r.round)) : 0;
                
                // Refine match names
                processedRounds.forEach(round => {
                    round.matches.forEach(match => {
                        if (!match.isThirdPlace && !(match.team1?.id === 'BYE' && match.team2?.id === 'BYE')) { // Don't rename invalid matches
                            match.matchName = getRoundName(round.round, round.matches.length);
                            if (round.round !== totalRoundsLoaded && round.matches.length > 1) {
                                match.matchName += ` Match ${match.originalMatchNumber || match.id.split('-M')[1]?.split('-')[0]}`;
                            }
                            if (match.hasBye) match.matchName += ' (Bye)';
                        } else if (match.isThirdPlace) {
                            match.matchName = '3rd Place Match';
                        }
                    });
                    
                    // Sort matches
                    round.matches.sort((a, b) => { 
                        if (a.isThirdPlace) return 1;
                        if (b.isThirdPlace) return -1;
                        const matchNumA = parseInt(a.matchName.match(/Match (\d+)/)?.[1] || '0');
                        const matchNumB = parseInt(b.matchName.match(/Match (\d+)/)?.[1] || '0');
                        return matchNumA - matchNumB;
                    });
                });
                
                rounds.value = processedRounds;
                // teams.value = // Make sure teams.value is set before this point // <-- This line looks incomplete, might need fixing if teams aren't set correctly earlier
                console.log("Loaded rounds structure:", JSON.stringify(processedRounds));
                
                // Set warning if Bye vs Bye was found
                if (foundByeBye) {
                    backendDataWarning.value = "Invalid 'Bye vs Bye' match found in loaded data. Bracket may not function correctly. Please check backend generation.";
                }
                
                if (processedRounds.length > 0) {
                    propagateWinners(processedRounds); // Run propagation with the fix for BYE winners
                    bracketGenerated.value = true;
                    console.log('Bracket loaded and propagated from fetched data.');
                    
                    // Load Stats if available
                    if (data.stats) {
                        if (data.stats.topScorer) tournamentStats.topScorer = data.stats.topScorer;
                        if (data.stats.mvp) tournamentStats.mvp = data.stats.mvp;
                        if (data.stats.playerOfTournament) tournamentStats.playerOfTournament = data.stats.playerOfTournament;
                    }
                    
                    // Update tournament positions & Calculate goals using nextTick
                    updateTournamentPositions();
                    nextTick(() => {
                        console.log('[fetchTournamentBracket] Calling calculateAndSetTeamGoals inside nextTick');
                        calculateAndSetTeamGoals(); 
                    });
                } else {
                    console.log('No valid rounds data found after processing');
                    if (teams.value.length >= 2) {
                        console.log('No valid bracket found, but enough teams. Generating new one.');
                        generateBracket();
                    } else {
                        bracketGenerated.value = false;
                        error.value = "Could not load bracket data and not enough teams registered.";
                    }
                }
            } else {
                console.error("Invalid bracket.rounds structure:", data.bracket.rounds);
                if (teams.value.length >= 2) {
                    console.log('Invalid bracket structure but enough teams. Generating new one.');
                    generateBracket();
                } else {
                    bracketGenerated.value = false;
                    error.value = "Invalid bracket data and not enough teams registered.";
                }
            }
        } else if (teams.value.length >= 2) {
            console.log('No existing bracket found, generating new one.');
            generateBracket(); // Use the corrected generateBracket
        } else {
            console.log('No bracket data and not enough teams.');
            bracketGenerated.value = false;
            error.value = "Not enough teams registered (minimum 2).";
        }

      } catch (err) {
          console.error('Error fetching/processing tournament:', err);
        error.value = err.message || 'An unexpected error occurred.';
        bracketGenerated.value = false;
        rounds.value = [];
      } finally {
        loading.value = false;
      }
    };

    // --- UI Controls ---
    const goBack = () => { router.back(); };
    const handleZoomIn = () => { zoomLevel.value = Math.min(zoomLevel.value + ZOOM_STEP, MAX_ZOOM); };
    const handleZoomOut = () => { zoomLevel.value = Math.max(zoomLevel.value - ZOOM_STEP, MIN_ZOOM); };
    const resetBracket = () => {
        if (confirm("Are you sure you want to reset? All teams and match data will be lost.")) {
             teams.value = []; teamName.value = ''; rounds.value = []; bracketGenerated.value = false;
             Object.assign(tournamentStats, { topScorer: { name: '', goals: 0 }, mvp: '', playerOfTournament: '', firstPlace: null, secondPlace: null, thirdPlace: null });
             activeTab.value = 'bracket'; zoomLevel.value = 100; error.value = null; backendDataWarning.value = null;
             if (route.params.id) { router.replace({ name: route.name, params: { id: undefined } }); }
             watch(bracketGenerated, (newVal) => { if (!newVal) { setTimeout(() => teamInputRef.value?.focus(), 0); } }, { immediate: true, flush: 'post' });
        }
    };
    const saveTournamentChanges = async () => {
      try {
        if (!route.params.id) {
          showToast('Cannot save changes: No tournament ID provided.', 'error');
          return;
        }
        
        loading.value = true;
        backendDataWarning.value = null;
        
        // Prepare data to send
        const bracketData = {
          bracket: {
            teams: teams.value,
            rounds: rounds.value,
            generated: true
          },
          stats: tournamentStats
        };
        
        console.log(`Saving tournament bracket changes for tournament: ${route.params.id}`);
        
        // Make API call to update bracket
        const response = await fetch(`${API_URL}/api/tournaments/${route.params.id}/update-bracket`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(bracketData)
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to save tournament changes');
        }
        
        const data = await response.json();
        console.log('Tournament bracket updated successfully:', data);
        
        // Show success message as toast
        showToast('Tournament changes saved successfully!', 'success');
      } catch (err) {
        console.error('Error saving tournament changes:', err);
        showToast(err.message || 'An error occurred while saving changes', 'error');
      } finally {
        loading.value = false;
      }
    };
    const publishTournament = async () => {
      try {
        if (!route.params.id) {
          showToast('Cannot publish: No tournament ID provided.', 'error');
          return;
        }
        
        loading.value = true;
        
        // Prepare data to send
        const bracketData = {
          bracket: {
            teams: teams.value,
            rounds: rounds.value,
            generated: true
          },
          stats: tournamentStats,
          isPublished: true
        };
        
        console.log(`Publishing tournament: ${route.params.id}`);
        
        // Make API call to publish tournament
        const response = await fetch(`${API_URL}/api/tournaments/${route.params.id}/publish`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(bracketData)
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to publish tournament');
        }
        
        const data = await response.json();
        console.log('Tournament published successfully:', data);
        
        // Show success message as toast
        showToast('Tournament published successfully!', 'success');
      } catch (err) {
        console.error('Error publishing tournament:', err);
        showToast(err.message || 'An error occurred while publishing the tournament', 'error');
      } finally {
        loading.value = false;
      }
    };

    // --- Computed Properties ---
    const getTotalMatches = computed(() => rounds.value.reduce((sum, round) => sum + round.matches.length, 0));
    const getByeCount = computed(() => rounds.value[0]?.matches.filter(m => m.hasBye && !(m.team1?.id === 'BYE' && m.team2?.id === 'BYE')).length || calculateByes(teams.value?.length ?? 0)); // Exclude Bye vs Bye from count

    // --- Style Helpers ---
    const getMatchCardColor = (match) => { return match.hasBye ? 'from-amber-800/20 to-amber-900/10' : match.winner ? 'from-emerald-800/20 to-emerald-900/10' : 'from-gray-700/50 to-gray-800/50'; };
    const getMatchCardBorder = (match) => { return match.hasBye ? 'border-amber-600/50' : match.winner ? 'border-emerald-600/50' : 'border-gray-700/50'; };

    // --- Update Tournament Positions ---
    const updateTournamentPositions = () => {
        console.log("Running updateTournamentPositions with rounds:", rounds.value);
        const numRoundsTotal = rounds.value.length > 0 ? Math.max(...rounds.value.map(r => r.round)) : 0;
        const finalRound = rounds.value.find(r => r.round === numRoundsTotal);
        
        console.log("Final round:", finalRound);
        const finalMatch = finalRound?.matches.find(m => !m.isThirdPlace);
        console.log("Final match:", finalMatch);
        
        const thirdPlaceMatch = rounds.value.flatMap(r => r.matches).find(m => m.isThirdPlace);
        console.log("Third place match:", thirdPlaceMatch);

        tournamentStats.firstPlace = null;
        tournamentStats.secondPlace = null;
        tournamentStats.thirdPlace = null;

        if (finalMatch?.winner && finalMatch.winner.id !== 'BYE') { // Ensure winner isn't BYE
            tournamentStats.firstPlace = finalMatch.winner;
            if (finalMatch.team1 && finalMatch.team1.id !== 'BYE' && finalMatch.team2 && finalMatch.team2.id !== 'BYE') {
                tournamentStats.secondPlace = finalMatch.winner.id === finalMatch.team1.id ? finalMatch.team2 : finalMatch.team1;
            }
        }

        // Ensure third place match winner is updated correctly
        if (thirdPlaceMatch?.winner && thirdPlaceMatch.winner.id !== 'BYE') {
            tournamentStats.thirdPlace = thirdPlaceMatch.winner;
            console.log('Updated 3rd place winner:', thirdPlaceMatch.winner.name);
        } else if (thirdPlaceMatch && thirdPlaceMatch.completed) {
            // If match is completed but no winner is set (shouldn't happen), determine winner from scores
            if (thirdPlaceMatch.score1 > thirdPlaceMatch.score2 && thirdPlaceMatch.team1) {
                tournamentStats.thirdPlace = thirdPlaceMatch.team1;
                console.log('Derived 3rd place winner from scores:', thirdPlaceMatch.team1.name);
                // Also update the match winner for consistency
                thirdPlaceMatch.winner = thirdPlaceMatch.team1;
            } else if (thirdPlaceMatch.score2 > thirdPlaceMatch.score1 && thirdPlaceMatch.team2) {
                tournamentStats.thirdPlace = thirdPlaceMatch.team2;
                console.log('Derived 3rd place winner from scores:', thirdPlaceMatch.team2.name);
                // Also update the match winner for consistency
                thirdPlaceMatch.winner = thirdPlaceMatch.team2;
            }
        }

        console.log('Tournament positions updated:', {
            firstPlace: tournamentStats.firstPlace?.name,
            secondPlace: tournamentStats.secondPlace?.name,
            thirdPlace: tournamentStats.thirdPlace?.name
        });
    };

    // --- Lifecycle Hooks & Watchers ---
    onMounted(async () => {
      // Load jquery-bracket assets first (CSS and JS)
      await loadBracketAssets();
      
      const tournamentId = route.params.id;
      if (tournamentId) { fetchTournamentBracket(tournamentId); }
      else { teamInputRef.value?.focus(); }
    });
    watch(() => route.params.id, (newId, oldId) => {
        if (newId && newId !== oldId) {
             console.log(`Route changed, fetching new tournament: ${newId}`);
             resetBracket();
             fetchTournamentBracket(newId);
        } else if (!newId && oldId) {
             console.log("Navigated back to creation mode.");
             resetBracket();
        }
     });
    watch(error, (newError) => { if (newError) { setTimeout(() => { error.value = null; }, 5000); } });
    watch(backendDataWarning, (newWarning) => { if (newWarning) { setTimeout(() => { backendDataWarning.value = null; }, 10000); } }); // Auto-hide warning
    watch(rounds, updateTournamentPositions, { deep: true });

    // Add helper functions to get the 3rd place match
    const getThirdPlaceMatch = () => {
      return rounds.value.flatMap(r => r.matches).find(m => m.isThirdPlace);
    };
    
    const getThirdPlaceMatchRound = () => {
      const roundIndex = rounds.value.findIndex(r => r.matches.some(m => m.isThirdPlace));
      if (roundIndex === -1) return { roundIndex: 0, round: null };
      return { roundIndex, round: rounds.value[roundIndex] };
    };
    
    const updateThirdPlaceMatch = (field) => {
      // Call updateMatch, passing true for the new isFromThirdPlace flag
      // Pass placeholder 0s for indices as they aren't used when flag is true
      updateMatch(0, 0, field, true);
    };
    
    const updateThirdPlaceTopScorer = (field, value) => {
      // This function needs to directly update the 3rd place match top scorer
      const match = getThirdPlaceMatch();
      if (!match) return;
      if (field === 'goals') {
           match.topScorer.goals = value === '' ? 0 : Math.max(0, parseInt(value || 0, 10));
      } else {
          match.topScorer.name = value;
      }
    };
    
    const updateThirdPlaceDateTime = (field, value) => {
      // This function needs to directly update the 3rd place match date/time
       const match = getThirdPlaceMatch();
       if (!match) return;
       match[field] = value;
    };

    // Toast notification system
    const toasts = ref([]);
    const showToast = (message, type = 'success') => {
      const id = Date.now();
      toasts.value.push({ id, message, type });
      
      // Auto-remove after 4 seconds
      setTimeout(() => {
        const index = toasts.value.findIndex(t => t.id === id);
        if (index >= 0) {
          toasts.value.splice(index, 1);
        }
      }, 4000);
    };
    
    const removeToast = (index) => {
      toasts.value.splice(index, 1);
    };

    // --- Function to Calculate Team Goals ---
    const calculateAndSetTeamGoals = () => {
      console.log('[calculateAndSetTeamGoals] Attempting calculation...');
      
      // We need rounds data at minimum to calculate goals
      if (!rounds.value || rounds.value.length === 0) {
        console.warn('[calculateAndSetTeamGoals] Rounds not ready. Cannot calculate goals.');
        teamGoalsDisplayData.value = [];
        return;
      }

      console.log('[calculateAndSetTeamGoals] Calculating goals with teams:', JSON.parse(JSON.stringify(teams.value)), 'and rounds:', JSON.parse(JSON.stringify(rounds.value)));
      
      const goalsByTeam = {};
      const teamSet = new Set(); // To track unique team IDs added

      // 1. Add teams from the primary teams.value list (if available)
      if (teams.value && teams.value.length > 0) {
          teams.value.forEach(t => {
              if (t && t.id && !teamSet.has(t.id)) { 
                  goalsByTeam[t.id] = { id: t.id, name: t.name || `Team ${t.id.slice(-4)}`, goals: 0 }; 
                  teamSet.add(t.id);
              } else if (t && !t.id) {
                  console.warn('[calculateAndSetTeamGoals] Invalid team object found in teams.value (missing id):', t);
              }
          });
      }

      // 2. Scan rounds to add any missing teams to the map
      rounds.value.forEach(round => {
          round.matches.forEach(match => {
              [match.team1, match.team2].forEach(team => {
                  if (team && team.id && team.id !== 'BYE' && !teamSet.has(team.id)) {
                      goalsByTeam[team.id] = { id: team.id, name: team.name || `Team ${team.id.slice(-4)}`, goals: 0 };
                      teamSet.add(team.id);
                      console.log(`[calculateAndSetTeamGoals] Added team ${team.name} (${team.id}) from match data.`);
                  }
              });
          });
      });
      
      console.log('[calculateAndSetTeamGoals] Initial map (after scanning rounds):', JSON.parse(JSON.stringify(goalsByTeam)));

      // 3. Accumulate goals
      rounds.value.forEach((round /* Removed rIdx */) => {
        // console.log(`[calculateAndSetTeamGoals] Accumulating goals for Round ${rIdx + 1}`); // Optional: less verbose log
        round.matches.forEach((match /* Removed mIdx */) => {
            // console.log(`[calculateAndSetTeamGoals]   Match ${mIdx + 1}: T1=${match.team1?.name}(${match.team1?.id}) S1=${match.score1} | T2=${match.team2?.name}(${match.team2?.id}) S2=${match.score2}`);
            if (match.team1 && match.team1.id && match.team1.id !== 'BYE' && match.score1 !== null) { 
                if (goalsByTeam[match.team1.id]) { 
                    goalsByTeam[match.team1.id].goals += match.score1; 
                    // console.log(`[calculateAndSetTeamGoals]     Added ${match.score1} to ${match.team1.name}. New total: ${goalsByTeam[match.team1.id].goals}`);
                } else {
                     // This warning should be less frequent now
                     console.warn(`[calculateAndSetTeamGoals]     Accumulation WARN: Team ID ${match.team1.id} (${match.team1.name}) not found in map.`);
                }
            }
            if (match.team2 && match.team2.id && match.team2.id !== 'BYE' && match.score2 !== null) { 
                if (goalsByTeam[match.team2.id]) { 
                    goalsByTeam[match.team2.id].goals += match.score2; 
                    // console.log(`[calculateAndSetTeamGoals]     Added ${match.score2} to ${match.team2.name}. New total: ${goalsByTeam[match.team2.id].goals}`);
                } else {
                    console.warn(`[calculateAndSetTeamGoals]     Accumulation WARN: Team ID ${match.team2.id} (${match.team2.name}) not found in map.`);
                }
            }
        });
      });
      
      // 4. Set the display data
      teamGoalsDisplayData.value = Object.values(goalsByTeam).sort((a, b) => b.goals - a.goals);
      console.log('[calculateAndSetTeamGoals] Calculation complete. Updated teamGoalsDisplayData:', JSON.parse(JSON.stringify(teamGoalsDisplayData.value)));
    };

    return {
      // ... returned properties and methods ...
      teams, rounds, teamName, bracketGenerated, error, loading, backendDataWarning, // Added warning ref
      zoomLevel, activeTab, teamInputRef, bracketContainerRef,
      tournamentName, tournamentStats, teamGoalsDisplayData, route, router,
      addTeam, generateBracket, handleKeyDown, updateMatch, 
      updateTopScorerName, updateTopScorerGoals,
      resetBracket, saveTournamentChanges, publishTournament,
      handleZoomIn, handleZoomOut, goBack, fetchTournamentBracket,
      calculateRounds, calculateByes, getRoundNamePreview,
      getTotalMatches, getByeCount,
      getMatchCardColor, getMatchCardBorder, getRoundName,
      getThirdPlaceMatch, getThirdPlaceMatchRound, updateThirdPlaceMatch, updateThirdPlaceTopScorer, updateThirdPlaceDateTime, // Make available to template
      toasts,
      showToast,
      removeToast
    };
  }
};
</script>

<style scoped>
/* ... Styles remain the same ... */
.tournament-master { --tournament-accent: #10b981; --tournament-gradient-start: #34d399; --tournament-gradient-end: #0d9488; }
.animate-fadeIn { animation: fadeIn 0.4s ease-in-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
.custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
.custom-scrollbar::-webkit-scrollbar-track { background: rgba(31, 41, 55, 0.3); border-radius: 10px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(16, 185, 129, 0.4); border-radius: 10px; border: 1px solid rgba(31, 41, 55, 0.5); }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(16, 185, 129, 0.6); }
.custom-scrollbar { scrollbar-width: thin; scrollbar-color: rgba(16, 185, 129, 0.5) rgba(31, 41, 55, 0.3); }
input:focus, button:focus, select:focus { outline: 2px solid var(--tournament-accent); outline-offset: 1px; box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.3); }
input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
input[type=number] { -moz-appearance: textfield; }
input[type="date"], input[type="time"] { position: relative; color-scheme: dark; }
input[type="date"]::-webkit-calendar-picker-indicator, input[type="time"]::-webkit-calendar-picker-indicator { opacity: 0.6; cursor: pointer; }
.transition-all { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
button:not(:disabled) { cursor: pointer; }
button:not(:disabled):hover { transform: translateY(-1px); filter: brightness(1.1); }
button:not(:disabled):active { transform: translateY(0px); filter: brightness(0.95); }
button:disabled { opacity: 0.6; }
@media (max-width: 640px) { .tournament-master { padding: 0.75rem; } h1 { font-size: 1.125rem; } .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); } }

/* Toast animations */
.toast-enter-active, .toast-leave-active {
  transition: all 0.5s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>