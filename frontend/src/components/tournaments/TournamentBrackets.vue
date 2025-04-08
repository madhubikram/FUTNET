<template>
  <div class="tournament-master flex flex-col min-h-screen w-full bg-gray-900 text-gray-100 p-4 gap-4 font-sans">
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
    <div v-else-if="(bracketGenerated || route.params.id) && !loading" class="flex flex-col gap-5 animate-fadeIn">
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
      <div v-if="activeTab === 'stats'" class="bg-gradient-to-b from-gray-800/90 to-gray-800/70 backdrop-blur-sm rounded-xl p-6 shadow-xl border border-gray-700/50 animate-fadeIn">
        <h2 class="text-xl font-semibold mb-4 bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent flex items-center">
          <Award class="h-5 w-5 mr-2 text-emerald-400" />
          Tournament Statistics
        </h2>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="bg-gradient-to-b from-gray-700/70 to-gray-800/70 rounded-xl p-4 shadow-md border border-gray-700/30 group hover:border-emerald-500/30 transition-all">
            <h3 class="text-sm font-medium text-emerald-400 mb-3 flex items-center">
              <Star class="h-4 w-4 mr-1.5" />
              Tournament Top Scorer
            </h3>
            <div class="space-y-3">
              <div class="space-y-1.5">
                <label class="text-xs text-gray-400 block ml-1">Player Name</label>
                <input
                  type="text"
                  v-model="tournamentStats.topScorer.name"
                  @input="updateTopScorerName"
                  class="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all text-sm"
                  placeholder="Enter player name"
                />
              </div>
              <div class="space-y-1.5">
                <label class="text-xs text-gray-400 block ml-1">Total Goals</label>
                <div class="flex items-center">
                  <input
                    type="number"
                    min="0"
                    v-model.number="tournamentStats.topScorer.goals"
                    @input="updateTopScorerGoals"
                    class="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all text-sm"
                  />
                  <span class="ml-2 text-sm text-gray-400">goals</span>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-gradient-to-b from-gray-700/70 to-gray-800/70 rounded-xl p-4 shadow-md border border-gray-700/30 group hover:border-emerald-500/30 transition-all">
            <h3 class="text-sm font-medium text-emerald-400 mb-3 flex items-center">
              <User class="h-4 w-4 mr-1.5" />
              Most Valuable Player (MVP)
            </h3>
            <div class="space-y-1.5">
              <label class="text-xs text-gray-400 block ml-1">MVP Name</label>
              <input
                type="text"
                v-model="tournamentStats.mvp"
                class="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all text-sm"
                placeholder="Enter MVP name"
              />
            </div>
          </div>

          <div class="bg-gradient-to-b from-gray-700/70 to-gray-800/70 rounded-xl p-4 shadow-md border border-gray-700/30 group hover:border-emerald-500/30 transition-all">
            <h3 class="text-sm font-medium text-emerald-400 mb-3 flex items-center">
              <Trophy class="h-4 w-4 mr-1.5" />
              Player of the Tournament
            </h3>
            <div class="space-y-1.5">
              <label class="text-xs text-gray-400 block ml-1">Player Name</label>
              <input
                type="text"
                v-model="tournamentStats.playerOfTournament"
                class="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all text-sm"
                placeholder="Enter player name"
              />
            </div>
          </div>
        </div>

        <!-- Team Stats Summary -->
        <div class="mt-6 bg-gradient-to-b from-gray-700/70 to-gray-800/70 rounded-xl p-4 shadow-md border border-gray-700/30">
          <h3 class="text-sm font-medium text-emerald-400 mb-3">Tournament Summary</h3>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div class="bg-gray-800/70 rounded-lg p-3 border border-gray-700/50">
              <div class="text-xs text-gray-500">Teams</div>
              <div class="text-xl font-semibold mt-1">{{ teams.length }}</div>
            </div>
            <div class="bg-gray-800/70 rounded-lg p-3 border border-gray-700/50">
              <div class="text-xs text-gray-500">Rounds</div>
              <div class="text-xl font-semibold mt-1">{{ rounds.length }}</div>
            </div>
            <div class="bg-gray-800/70 rounded-lg p-3 border border-gray-700/50">
              <div class="text-xs text-gray-500">Matches</div>
              <div class="text-xl font-semibold mt-1">{{ getTotalMatches }}</div>
            </div>
            <div class="bg-gray-800/70 rounded-lg p-3 border border-gray-700/50">
              <div class="text-xs text-gray-500">Byes</div>
              <div class="text-xl font-semibold mt-1">
                {{ getByeCount }}
              </div>
            </div>
          </div>
        </div>

        <!-- Tournament Positions -->
        <div class="bg-gradient-to-b from-gray-700/70 to-gray-800/70 rounded-xl p-4 shadow-md border border-gray-700/30 group hover:border-emerald-500/30 transition-all">
          <h3 class="text-sm font-medium text-emerald-400 mb-3 flex items-center">
            <Trophy class="h-4 w-4 mr-1.5" />
            Tournament Positions
          </h3>
          <div class="space-y-3">
            <!-- 1st Place -->
            <div class="bg-gray-800/70 rounded-lg p-3 border border-amber-500/30 flex items-center">
              <div class="w-8 h-8 flex items-center justify-center rounded-full bg-amber-500/20 text-amber-400 mr-3 font-bold">
                1
              </div>
              <div class="font-medium">{{ tournamentStats.firstPlace?.name || "TBD" }}</div>
            </div>
            
            <!-- 2nd Place -->
            <div class="bg-gray-800/70 rounded-lg p-3 border border-gray-400/30 flex items-center">
              <div class="w-8 h-8 flex items-center justify-center rounded-full bg-gray-400/20 text-gray-300 mr-3 font-bold">
                2
              </div>
              <div class="font-medium">{{ tournamentStats.secondPlace?.name || "TBD" }}</div>
            </div>
            
            <!-- 3rd Place -->
            <div class="bg-gray-800/70 rounded-lg p-3 border border-amber-700/30 flex items-center">
              <div class="w-8 h-8 flex items-center justify-center rounded-full bg-amber-700/20 text-amber-700 mr-3 font-bold">
                3
              </div>
              <div class="font-medium">{{ tournamentStats.thirdPlace?.name || "TBD" }}</div>
            </div>
          </div>
        </div>

        <!-- Team Goals -->
        <div class="bg-gradient-to-b from-gray-700/70 to-gray-800/70 rounded-xl p-4 shadow-md border border-gray-700/30 group hover:border-emerald-500/30 transition-all">
          <h3 class="text-sm font-medium text-emerald-400 mb-3 flex items-center">
            <Shield class="h-4 w-4 mr-1.5" />
            Team Goals
          </h3>
          <div class="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
            <div v-for="(team, index) in teamGoals" :key="team.id" class="bg-gray-800/70 rounded-lg p-2 border border-gray-700/30 flex items-center justify-between">
              <div class="flex items-center">
                <div class="w-6 h-6 flex items-center justify-center rounded-full bg-gray-700/70 text-xs font-medium text-gray-300 mr-2">
                  {{ index + 1 }}
                </div>
                <span class="truncate">{{ team.name }}</span>
              </div>
              <div class="bg-emerald-900/30 text-emerald-400 px-2 py-0.5 rounded text-xs font-medium">
                {{ team.goals }} goals
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
              justifyContent: round.matches.length === 1 ? 'center' : 'space-around'
            }"
          >
            <div class="mb-3 text-center">
              <h3 class="font-bold text-lg bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">
                {{ getRoundName(round.round, round.matches.length) }}
              </h3>
            </div>

            <div class="flex flex-col justify-around h-full gap-5">
              <div
                v-for="(match, matchIndex) in round.matches"
                :key="match.id"
                :class="[
                  'w-full rounded-xl overflow-hidden shadow-lg border transition-all group hover:shadow-emerald-900/10',
                  getMatchCardBorder(match),
                  'bg-gradient-to-b',
                  getMatchCardColor(match)
                ]"
              >
                <div class="bg-gray-800/80 backdrop-blur-sm px-3 py-2 flex justify-between items-center border-b border-gray-700/50">
                  <span class="font-medium text-sm">{{ match.matchName }}</span>
                </div>

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

                    <div class="flex items-center gap-1">
                      <div class="flex flex-col items-center">
                        <div class="text-xs text-gray-400 mb-1">Score</div>
                        <input
                          type="number"
                          min="0"
                          v-model.number="match.score1"
                          @input="updateMatch(roundIndex, matchIndex, 'score1')"
                          :class="[
                            'w-10 text-center rounded p-1 text-sm border transition-all focus:outline-none focus:ring-2',
                            match.winner === match.team1 ? 'bg-emerald-950/30 border-emerald-700/30 focus:ring-emerald-500/50' : 'bg-gray-800 border-gray-700',
                            !match.team1 || match.hasBye ? 'cursor-not-allowed opacity-50' : ''
                          ]"
                          :disabled="!match.team1 || match.hasBye"
                        />
                      </div>
                      <div v-if="match.score1 === match.score2 && match.score1 !== null && match.score2 !== null && match.team1 && match.team2 && !match.hasBye && !(match.score1 === 0 && match.score2 === 0)" class="flex items-center">
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
                              match.winner === match.team1 && match.pk1 > match.pk2 ? 'bg-emerald-950/30 border-emerald-700/30 focus:ring-emerald-500/50' : 'bg-gray-800 border-gray-700',
                              !match.team1 || match.hasBye ? 'cursor-not-allowed opacity-50' : ''
                            ]"
                            :disabled="!match.team1 || match.hasBye"
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
                        <span class="truncate">{{ match.team2 ? match.team2.name : match.hasBye ? 'Bye' : 'TBD' }}</span>
                      </div>
                    </div>

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
                            match.winner === match.team2 ? 'bg-emerald-950/30 border-emerald-700/30 focus:ring-emerald-500/50' : 'bg-gray-800 border-gray-700',
                            !match.team2 || match.hasBye ? 'cursor-not-allowed opacity-50' : ''
                          ]"
                          :disabled="!match.team2 || match.hasBye"
                        />
                      </div>
                      <div v-if="match.score1 === match.score2 && match.score1 !== null && match.score2 !== null && match.team1 && match.team2 && !match.hasBye && !(match.score1 === 0 && match.score2 === 0)" class="flex items-center">
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
                              match.winner === match.team2 && match.pk2 > match.pk1 ? 'bg-emerald-950/30 border-emerald-700/30 focus:ring-emerald-500/50' : 'bg-gray-800 border-gray-700',
                              !match.team2 || match.hasBye ? 'cursor-not-allowed opacity-50' : ''
                            ]"
                            :disabled="!match.team2 || match.hasBye"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Match top scorer -->
                  <div v-if="!match.hasBye && match.team1 && match.team2" class="pt-2 border-t border-gray-700/30 grid grid-cols-12 gap-1 items-center">
                    <div class="col-span-3 text-xs text-gray-400 flex items-center">
                      <Star class="h-3 w-3 mr-1 flex-shrink-0" />
                      <span class="truncate">Top Scorer:</span>
                    </div>
                    <div class="col-span-6">
                      <input
                        type="text"
                        v-model="match.topScorer.name"
                        @input="updateMatchTopScorer(roundIndex, matchIndex, 'name', $event.target.value)"
                        class="w-full bg-gray-800/70 border border-gray-700/50 rounded p-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                        placeholder="Player name"
                        :disabled="match.hasBye"
                      />
                    </div>
                    <div class="col-span-3 flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        v-model.number="match.topScorer.goals"
                        @input="updateMatchTopScorer(roundIndex, matchIndex, 'goals', $event.target.value)"
                        class="w-full text-center bg-gray-800/70 border border-gray-700/50 rounded p-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                        :disabled="match.hasBye"
                      />
                      <span class="text-xs text-gray-400">g</span>
                    </div>
                  </div>

                  <!-- Date and Time -->
                  <div v-if="!match.hasBye" class="pt-2 border-t border-gray-700/30 grid grid-cols-12 gap-1 items-center">
                     <div class="col-span-2 text-xs text-gray-400 flex items-center justify-center">
                        <Calendar class="h-3 w-3" />
                     </div>
                     <div class="col-span-4">
                       <input
                         type="date"
                         v-model="match.date"
                         @input="updateDateTime(roundIndex, matchIndex, 'date', $event.target.value)"
                         class="w-full bg-gray-800/70 border border-gray-700/50 rounded p-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all appearance-none"
                         :disabled="match.hasBye"
                       />
                     </div>
                     <div class="col-span-2 text-xs text-gray-400 flex items-center justify-center">
                       <Clock class="h-3 w-3" />
                     </div>
                     <div class="col-span-4">
                       <input
                         type="time"
                         v-model="match.time"
                         @input="updateDateTime(roundIndex, matchIndex, 'time', $event.target.value)"
                         class="w-full bg-gray-800/70 border border-gray-700/50 rounded p-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all appearance-none"
                         :disabled="match.hasBye"
                       />
                     </div>
                  </div>

                  <!-- Finals placings -->
                  <div
                    v-if="roundIndex === rounds.length - 1 && match.winner"
                    class="mt-1 pt-2 border-t border-gray-700/30"
                  >
                    <div class="flex flex-col gap-1.5">
                      <div class="flex items-center justify-between">
                        <span class="text-xs font-medium text-emerald-400">1st Place</span>
                        <span class="text-sm font-semibold truncate">{{ match.winner.name }}</span>
                      </div>
                      <div
                        v-if="match.team1 && match.team2"
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
        </div>
      </div>
    </div>
     <!-- Error Display -->
    <div v-if="error" class="fixed bottom-4 right-4 bg-red-600 text-white p-3 rounded-lg shadow-lg animate-fadeIn">
      Error: {{ error }}
    </div>
  </div>
</template>

<script>
import { ref, computed, reactive, onMounted, watch } from 'vue';
import { Trophy, Calendar, Clock, Shield, ZoomIn, ZoomOut, Star, Award, User, ChevronRight, Loader2Icon, ArrowLeftIcon, Save, Send } from 'lucide-vue-next';
import { useRoute, useRouter } from 'vue-router';

// --- Configuration ---
// IMPORTANT: Replace with your actual backend API URL if deploying
const API_URL = 'http://localhost:5000/api';
const ZOOM_STEP = 10;
const MIN_ZOOM = 50;
const MAX_ZOOM = 150;

export default {
  name: 'TournamentBrackets',
  components: {
    Trophy, Calendar, Clock, Shield, ZoomIn, ZoomOut, Star, Award, User, ChevronRight, Loader2Icon, ArrowLeftIcon, Save, Send
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
    const bracketGenerated = ref(false);
    const zoomLevel = ref(100);
    const activeTab = ref('bracket'); // Default to bracket view
    const loading = ref(false);
    const tournamentName = ref('');
    const error = ref(null); // For displaying errors

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

    // Calculate the number of rounds needed (power of 2)
    const calculateRounds = (numTeams) => {
       if (numTeams < 2) return 0;
       return Math.ceil(Math.log2(numTeams));
    };

    // Calculate number of byes needed
    const calculateByes = (numTeams) => {
        if (numTeams < 2) return 0;
        const numRounds = calculateRounds(numTeams);
        const totalSlots = Math.pow(2, numRounds);
        return totalSlots - numTeams;
    };

    // Get round name for display (handles Finals, Semis, Quarters)
    const getRoundName = (roundNumber, numMatchesInRound) => {
      const totalRounds = rounds.value.length;
      if (roundNumber === totalRounds) return 'Championship Final';
      // If only one match in the second to last round, it's the only Semi-Final
      if (roundNumber === totalRounds - 1 && numMatchesInRound === 1) return 'Semi-Final';
      if (roundNumber === totalRounds - 1) return 'Semi-Finals';
      if (roundNumber === totalRounds - 2) return 'Quarter-Finals';
      return `Round ${roundNumber}`;
    };

     // Get round name for the preview structure
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
      // Prevent adding duplicate names (case-insensitive check)
      if (teams.value.some(team => team.name.toLowerCase() === trimmedName.toLowerCase())) {
         alert(`Team "${trimmedName}" already exists.`);
         return;
      }
      if (bracketGenerated.value) {
        // Optional: Decide if adding teams should reset the bracket
        // For now, let's prevent adding teams after generation without explicit reset
         alert("Cannot add teams after bracket is generated. Please reset if needed.");
         return;
        // Or reset:
        // resetBracket(); // Reset everything
        // teams.value = []; // Clear teams too if needed
      }
      teams.value.push({ id: `team-${Date.now()}-${Math.random()}`, name: trimmedName }); // Use a more unique temporary ID
      teamName.value = '';

      // Focus back on the input
      teamInputRef.value?.focus();
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault(); // Prevent form submission if inside one
        addTeam();
      }
    };

    // --- Core Logic: Bracket Generation & Propagation ---

    /**
     * Propagates winners from a completed round to the next round's matches.
     * This is used both after initial generation (for byes) and after loading data.
     * @param {Array} targetRounds - The rounds array to process.
     */
    const propagateWinners = (targetRounds) => {
        console.log("Running propagation...");
        if (!targetRounds || targetRounds.length < 2) return; // Nothing to propagate

        // For each round except the last one
        for (let i = 0; i < targetRounds.length - 1; i++) {
            const currentRound = targetRounds[i];
            const nextRound = targetRounds[i + 1];
            
            // Skip the 3rd place match when propagating winners
            const nextRoundMatches = nextRound.matches.filter(match => !match.isThirdPlace);
            
            // For each match in current round
            currentRound.matches.forEach((match, matchIndex) => {
                if (match.winner) {
                    // Calculate the index in the next round
                    const nextRoundMatchIndex = Math.floor(matchIndex / 2);
                    
                    // Ensure we're not exceeding the nextRoundMatches array
                    if (nextRoundMatchIndex < nextRoundMatches.length) {
                        // Determine if this match feeds into team1 or team2 spot
                        if (matchIndex % 2 === 0) {
                            nextRoundMatches[nextRoundMatchIndex].team1 = match.winner;
                            // Check if we just created a bye match in the next round
                            if (nextRoundMatches[nextRoundMatchIndex].team1 && 
                                (!nextRoundMatches[nextRoundMatchIndex].team2 || 
                                 (nextRoundMatches[nextRoundMatchIndex].team2 && 
                                 nextRoundMatches[nextRoundMatchIndex].team2.id === 'BYE'))) {
                                nextRoundMatches[nextRoundMatchIndex].hasBye = true;
                                nextRoundMatches[nextRoundMatchIndex].winner = nextRoundMatches[nextRoundMatchIndex].team1;
                                nextRoundMatches[nextRoundMatchIndex].completed = true;
                                nextRoundMatches[nextRoundMatchIndex].score1 = 0;
                                nextRoundMatches[nextRoundMatchIndex].score2 = 0;
                            }
                        } else {
                            nextRoundMatches[nextRoundMatchIndex].team2 = match.winner;
                            // Check if we just created a bye match in the next round
                            if (nextRoundMatches[nextRoundMatchIndex].team2 && 
                                nextRoundMatches[nextRoundMatchIndex].team1 && 
                                nextRoundMatches[nextRoundMatchIndex].team2.id === 'BYE') {
                                nextRoundMatches[nextRoundMatchIndex].hasBye = true;
                                nextRoundMatches[nextRoundMatchIndex].winner = nextRoundMatches[nextRoundMatchIndex].team1;
                                nextRoundMatches[nextRoundMatchIndex].completed = true;
                                nextRoundMatches[nextRoundMatchIndex].score1 = 0;
                                nextRoundMatches[nextRoundMatchIndex].score2 = 0;
                            }
                        }
                    }
                }
            });
        }
        console.log("Propagation finished.");
        // Update tournament positions after propagation is complete
        updateTournamentPositions();
    };

    const generateBracket = () => {
      if (teams.value.length < 2) {
        alert('Please add at least 2 teams');
        return;
      }

      console.log("Generating bracket for teams:", teams.value);
      const numTeams = teams.value.length;
      const numRounds = calculateRounds(numTeams);
      const totalSlots = Math.pow(2, numRounds);
      const generatedRounds = [];

      // --- Create Round 1 (Handles Byes) ---
      const firstRoundMatches = [];
      const teamsCopy = [...teams.value]; // Use a copy

      for (let i = 0; i < totalSlots / 2; i++) {
        const matchId = `R1-M${i+1}`;
        const team1Index = i;
        const team2Index = totalSlots - 1 - i; // Standard seeding pair (top vs bottom)

        const team1 = team1Index < teamsCopy.length ? teamsCopy[team1Index] : null;
        const team2 = team2Index < teamsCopy.length ? teamsCopy[team2Index] : null;

        const hasBye = team1 !== null && team2 === null;

        const match = {
          id: matchId,
          matchName: `Round 1      Match ${i+1}${hasBye ? ' (Bye)' : ''}`,
          team1: team1,
          team2: team2, // Null if bye
          score1: 0,
          score2: 0,
          winner: hasBye ? team1 : null, // Set winner for bye immediately
          pk1: null,
          pk2: null,
          hasPK: false,
          date: '',
          time: '',
          topScorer: { name: '', goals: 0 },
          hasBye: hasBye,
          completed: hasBye // Mark bye as completed
        };
        firstRoundMatches.push(match);
      }
      generatedRounds.push({ round: 1, matches: firstRoundMatches });

      // --- Create Subsequent Rounds (Structure Only) ---
      for (let r = 2; r <= numRounds; r++) {
        const roundMatches = [];
        const prevRoundMatchCount = generatedRounds[r - 2].matches.length;
        const currentRoundMatchCount = prevRoundMatchCount / 2;

        for (let i = 0; i < currentRoundMatchCount; i++) {
          // Determine match name based on round
           let matchName = getRoundName(r, currentRoundMatchCount)
           if (r !== numRounds && currentRoundMatchCount > 1) {
               matchName += `      Match ${i+1}`; // Add index if not final and multiple matches
           }

          const match = {
            id: `R${r}-M${i+1}`,
            matchName: matchName,
            team1: null, team2: null, // Start empty
            score1: 0, score2: 0, winner: null,
            pk1: null, pk2: null, hasPK: false,
            date: '', time: '',
            topScorer: { name: '', goals: 0 },
            hasBye: false, // Only round 1 has byes
            completed: false
          };
          roundMatches.push(match);
        }
        generatedRounds.push({ round: r, matches: roundMatches });
      }

      // --- Add 3rd place match if we have semifinal round ---
      if (numRounds >= 3) {
        // Create a special round for 3rd place match
        const thirdPlaceRound = {
          round: numRounds, // Same round number as final for display purposes
          matches: [{
            id: `R${numRounds}-3rd`,
            matchName: `3rd Place Match`,
            team1: null, // Will be filled with semifinal losers
            team2: null, // Will be filled with semifinal losers
            score1: 0,
            score2: 0,
            pk1: null,
            pk2: null,
            hasPK: false,
            winner: null,
            completed: false,
            hasBye: false,
            isThirdPlace: true, // Mark as third place match
            topScorer: { name: '', goals: 0 },
            date: '',
            time: '',
            match: 'third'
          }]
        };
        generatedRounds.push(thirdPlaceRound);
      }

      // --- Propagate Bye Winners Immediately ---
      propagateWinners(generatedRounds); // Pass the newly created structure

      // --- Final State Update ---
      rounds.value = generatedRounds;
      bracketGenerated.value = true;
      activeTab.value = 'bracket'; // Switch to bracket view
      console.log("Bracket generation complete. Final structure:", JSON.parse(JSON.stringify(rounds.value)));
    };

    // --- Core Logic: Match Updates ---

    const updateMatch = (roundIndex, matchIndex, field) => {
      const match = rounds.value[roundIndex].matches[matchIndex];

      // Ensure scores are numbers
      if (field === 'score1' || field === 'score2') {
         match[field] = Math.max(0, parseInt(match[field] || 0, 10));
      }
      if (field === 'pk1' || field === 'pk2') {
         match[field] = match[field] === null ? null : Math.max(0, parseInt(match[field] || 0, 10));
      }

      // --- Determine Winner ---
      let newWinner = null;
      let isComplete = false;

      if (match.hasBye && match.team1) {
        match.winner = match.team1;
        match.completed = true;
        match.score1 = 0;
        match.score2 = 0;
      } else if (match.team1 && match.team2) {
        if (match.score1 > match.score2) {
          newWinner = match.team1;
          isComplete = true;
        } else if (match.score2 > match.score1) {
          newWinner = match.team2;
          isComplete = true;
        } else if (match.score1 === match.score2 && !match.score1 === 0 && !match.score2 === 0) {
          // If scores are equal (and not 0-0), check PK
          if (match.pk1 !== null && match.pk2 !== null) {
            if (match.pk1 > match.pk2) {
              newWinner = match.team1;
              isComplete = true;
            } else if (match.pk2 > match.pk1) {
              newWinner = match.team2;
              isComplete = true;
            } else {
              newWinner = null;
              isComplete = false;
            }
          } else {
            newWinner = null;
            isComplete = false;
          }
        } else {
          newWinner = null;
          isComplete = false;
        }
      } else {
        newWinner = null;
        isComplete = false;
      }

      // --- Update Match State ---
      const winnerChanged = match.winner?.id !== newWinner?.id;
      match.winner = newWinner;
      match.completed = isComplete;

      // --- Propagate Winner to Next Round if Changed ---
      if (winnerChanged || (isComplete && newWinner)) { // Propagate if winner changes OR if newly completed with a winner
          if (roundIndex < rounds.value.length - 1) {
              const nextRoundIndex = roundIndex + 1;
              const nextMatchIndex = Math.floor(matchIndex / 2);
              const nextMatch = rounds.value[nextRoundIndex].matches[nextMatchIndex];
              const isFirstFeeder = matchIndex % 2 === 0;

              if (isFirstFeeder) {
                  nextMatch.team1 = newWinner; // Assign winner (or null if undecided)
              } else {
                  nextMatch.team2 = newWinner; // Assign winner (or null if undecided)
              }

              // If a team is removed (e.g., score changed back to draw), reset the next match's scores/winner too
              if (!newWinner || winnerChanged) {
                 nextMatch.score1 = 0;
                 nextMatch.score2 = 0;
                 nextMatch.winner = null;
                 nextMatch.pk1 = null;
                 nextMatch.pk2 = null;
                 nextMatch.hasPK = false;
                 nextMatch.completed = false;
                 // Recursively clear further rounds if needed (optional, can get complex)
              }
          }
      }
      // Trigger reactivity (though direct mutation should work with Vue 3 Proxy)
      // rounds.value = [...rounds.value];
    };

    const updateDateTime = (roundIndex, matchIndex, field, value) => {
       // Basic assignment, could add validation later
       rounds.value[roundIndex].matches[matchIndex][field] = value;
    };

    const updateMatchTopScorer = (roundIndex, matchIndex, field, value) => {
        const match = rounds.value[roundIndex].matches[matchIndex];
        if (field === 'goals') {
             match.topScorer.goals = Math.max(0, parseInt(value || 0, 10));
        } else {
            match.topScorer.name = value;
        }
        // Optional: Automatically update overall tournament top scorer here
        // updateTournamentTopScorer();
    };

    // --- Core Logic: Stats Management ---

    // Update tournament's overall top scorer based on current stats inputs
    // Note: This version relies on manual input in the stats tab.
    // To make it automatic based on *match* top scorers, you'd need a different function.
    const updateTopScorerName = (e) => {
      tournamentStats.topScorer.name = e.target.value;
    };

    const updateTopScorerGoals = (e) => {
      tournamentStats.topScorer.goals = Math.max(0, parseInt(e.target.value || 0, 10));
    };

    // --- Core Logic: Data Loading ---

    const fetchTournamentBracket = async (id) => {
      loading.value = true;
      error.value = null; // Reset error before fetch
      console.log(`Fetching bracket for tournament ID: ${id}`);
      try {
        const token = localStorage.getItem('token'); // Assuming token auth
        if (!token) {
          throw new Error('Authentication token not found. Please log in.');
        }
        const response = await fetch(`${API_URL}/tournaments/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json' // Good practice
          }
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({ message: `HTTP error! Status: ${response.status}` })); // Graceful error handling
          throw new Error(errData.message || `Failed to fetch tournament data. Status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Fetched tournament data:', data);

        tournamentName.value = data.name || 'Tournament'; // Default name

        // --- Process Registered Teams ---
        // Use registeredTeamsDetails which should be populated by the backend
        if (data.registeredTeamsDetails && data.registeredTeamsDetails.length > 0) {
            teams.value = data.registeredTeamsDetails.map(teamDetail => ({
                // Ensure mapping is correct based on backend structure
                id: teamDetail._id, // Use Registration _id or Team _id if available
                name: teamDetail.teamName || 'Unnamed Team'
            }));
            console.log("Processed teams:", teams.value);
        } else {
            teams.value = []; // No teams registered or provided
            console.log("No registered teams found in data.");
        }

        // --- Process Bracket Data ---
        if (data.bracket && data.bracket.rounds && data.bracket.rounds.length > 0) {
            const rawRounds = data.bracket.rounds;
            const processedRounds = rawRounds.map((roundMatches, roundIndex) => {
                const currentRoundMatchCount = roundMatches.length;
                return {
                    round: roundIndex + 1,
                    matches: roundMatches.map((matchData, matchIndex) => {
                        // Lookup team details using the populated teams.value
                        // Handles potential string IDs or object refs from backend
                        const findTeam = (teamRef) => {
                             if (!teamRef) return null;
                             const teamId = typeof teamRef === 'object' ? teamRef._id : teamRef;
                             if (teamId === 'BYE') return { id: 'BYE', name: 'Bye' }; // Handle BYE explicitly
                             return teams.value.find(t => t.id === teamId);
                        };

                        const team1 = findTeam(matchData.team1);
                        const team2 = findTeam(matchData.team2);
                        const winner = findTeam(matchData.winner); // Winner is likely just an ID string

                        // Generate a unique ID for Vue key
                        const vueMatchId = `R${roundIndex + 1}-M${matchData.match || (matchIndex + 1)}`;
                        const hasBye = team2?.id === 'BYE';

                        // Determine match name
                        let matchName = getRoundName(roundIndex + 1, currentRoundMatchCount);
                        if ((roundIndex + 1) !== calculateRounds(teams.value.length) && currentRoundMatchCount > 1) {
                             matchName += `      Match ${matchData.match || (matchIndex + 1)}`;
                        }
                        if (hasBye) matchName += ' (Bye)';

                        return {
                            id: vueMatchId,
                            matchName: matchName,
                            team1: team1, // Populated team object or null
                            team2: team2, // Populated team object, 'Bye' object, or null
                            winner: winner, // Populated team object or null
                            hasBye: hasBye,
                            // --- Scores & Details (provide defaults) ---
                            score1: matchData.score1 ?? 0,
                            score2: matchData.score2 ?? 0,
                            pk1: matchData.pk1 ?? null,
                            pk2: matchData.pk2 ?? null,
                            hasPK: matchData.hasPK ?? false,
                            completed: matchData.completed ?? hasBye ?? (!!winner), // Mark complete if winner exists or it's a bye
                            topScorer: matchData.topScorer ? { // Ensure object structure
                                 name: matchData.topScorer.name || '',
                                 goals: matchData.topScorer.goals || 0
                             } : { name: '', goals: 0 },
                            date: matchData.date ? matchData.date.split('T')[0] : '', // Format date if needed
                            time: matchData.time || '',
                            // Include original match number if provided
                            originalMatchNumber: matchData.match
                        };
                    })
                };
            });

            // --- Assign Processed Rounds & Propagate ---
            rounds.value = processedRounds;
            propagateWinners(rounds.value); // Ensure teams are placed correctly based on loaded winners
            bracketGenerated.value = true;
            console.log('Bracket loaded and propagated from fetched data.');

            // --- Load Stats ---
            if (data.stats) {
                tournamentStats.topScorer = data.stats.topScorer ? {
                    name: data.stats.topScorer.name || '',
                    goals: data.stats.topScorer.goals || 0
                } : { name: '', goals: 0 };
                tournamentStats.mvp = data.stats.mvp || '';
                tournamentStats.playerOfTournament = data.stats.playerOfTournament || '';
            } else {
                // Reset stats if not provided
                 Object.assign(tournamentStats, { topScorer: { name: '', goals: 0 }, mvp: '', playerOfTournament: '' });
            }

        } else if (teams.value.length >= 2) {
           console.log('No existing bracket found in data, generating new one based on registered teams.');
           generateBracket(); // Generate fresh if no data but teams exist
        } else {
           console.log('No bracket data found and not enough registered teams.');
           bracketGenerated.value = false; // Stay on setup screen
        }

      } catch (err) {
        console.error('Error fetching or processing tournament bracket:', err);
        error.value = err.message || 'An unexpected error occurred.';
        // Potentially reset state or guide user
        bracketGenerated.value = false;
        rounds.value = [];
        teams.value = []; // Clear teams on major fetch error? Maybe not.
      } finally {
        loading.value = false;
      }
    };

    // --- UI Controls ---

    const goBack = () => {
      // Check if changes were made? (More complex state management needed)
      router.back(); // Simple back navigation
    };

    const handleZoomIn = () => {
      zoomLevel.value = Math.min(zoomLevel.value + ZOOM_STEP, MAX_ZOOM);
    };

    const handleZoomOut = () => {
      zoomLevel.value = Math.max(zoomLevel.value - ZOOM_STEP, MIN_ZOOM);
    };

    const resetBracket = () => {
        if (confirm("Are you sure you want to reset the bracket? All match data will be lost.")) {
             teams.value = []; // Clear teams as well for a full reset
             teamName.value = '';
             rounds.value = [];
             bracketGenerated.value = false;
             Object.assign(tournamentStats, { topScorer: { name: '', goals: 0 }, mvp: '', playerOfTournament: '', firstPlace: null, secondPlace: null, thirdPlace: null });
             activeTab.value = 'bracket';
             zoomLevel.value = 100;
             error.value = null;
             // If it was a loaded tournament, redirect or clear ID?
             if (route.params.id) {
                  router.replace({ name: route.name, params: { id: undefined } }); // Go back to create mode URL
             }
             // Focus input after reset allows it
             watch(bracketGenerated, (newVal, oldVal) => {
                 if (!newVal && oldVal && teamInputRef.value) {
                     setTimeout(() => teamInputRef.value?.focus(), 0);
                 }
             }, { immediate: true, flush: 'post' }); // Ensure focus happens after DOM update
        }
    };

    const saveTournamentChanges = () => {
      // Implement save functionality
      console.log("Saving tournament changes...");
      // If there's an existing tournament ID
      if (route.params.id) {
        // Call an API to update the tournament
        try {
          // Display success message (could use a toast notification here)
          alert("Tournament changes saved successfully!");
        } catch (error) {
          console.error("Error saving tournament:", error);
          alert("Failed to save tournament changes. Please try again.");
        }
      } else {
        // If it's a new tournament, we could save it to the database
        alert("Tournament saved successfully!");
      }
    };

    const publishTournament = () => {
      // Implement publish functionality
      console.log("Publishing tournament...");
      if (confirm("Are you sure you want to publish this tournament? Once published, it will be visible to all users.")) {
        try {
          // Add code to publish the tournament (e.g., setting a published flag)
          alert("Tournament published successfully!");
        } catch (error) {
          console.error("Error publishing tournament:", error);
          alert("Failed to publish tournament. Please try again.");
        }
      }
    };

    // --- Computed Properties ---

    const getTotalMatches = computed(() => {
      return rounds.value.reduce((sum, round) => sum + round.matches.length, 0);
    });

    const getByeCount = computed(() => {
       // Calculate based on the first round if available
       return rounds.value[0]?.matches.filter(m => m.hasBye).length || calculateByes(teams.value.length);
    });

    // --- Style Helpers ---
    const getMatchCardColor = (match) => {
      if (match.hasBye) return 'from-amber-800/20 to-amber-900/10'; // Darker amber
      if (match.winner) return 'from-emerald-800/20 to-emerald-900/10'; // Darker emerald
      return 'from-gray-700/50 to-gray-800/50';
    };

    const getMatchCardBorder = (match) => {
      if (match.hasBye) return 'border-amber-600/50';
      if (match.winner) return 'border-emerald-600/50';
      return 'border-gray-700/50';
    };

    // --- Team Goals Computed Property ---
    const teamGoals = computed(() => {
      // Calculate goals for each team
      const goalsByTeam = {};
      
      // Go through all matches and count goals
      rounds.value.forEach(round => {
        round.matches.forEach(match => {
          if (match.team1 && match.score1 !== null) {
            if (!goalsByTeam[match.team1.id]) {
              goalsByTeam[match.team1.id] = { id: match.team1.id, name: match.team1.name, goals: 0 };
            }
            goalsByTeam[match.team1.id].goals += parseInt(match.score1 || 0);
          }
          
          if (match.team2 && match.score2 !== null && match.team2.id !== 'BYE') {
            if (!goalsByTeam[match.team2.id]) {
              goalsByTeam[match.team2.id] = { id: match.team2.id, name: match.team2.name, goals: 0 };
            }
            goalsByTeam[match.team2.id].goals += parseInt(match.score2 || 0);
          }
        });
      });
      
      // Convert to array and sort by goals (descending)
      return Object.values(goalsByTeam).sort((a, b) => b.goals - a.goals);
    });

    // --- Update Tournament Positions ---
    const updateTournamentPositions = () => {
      const numRounds = calculateRounds(teams.value.length);
      
      // Find the final match
      const finalRound = rounds.value.find(r => r.round === numRounds && !r.matches[0]?.isThirdPlace);
      if (finalRound && finalRound.matches[0]) {
        const finalMatch = finalRound.matches[0];
        
        // Set 1st and 2nd place based on final match
        if (finalMatch.winner) {
          tournamentStats.firstPlace = finalMatch.winner;
          tournamentStats.secondPlace = finalMatch.team1.id === finalMatch.winner.id ? finalMatch.team2 : finalMatch.team1;
        } else {
          tournamentStats.firstPlace = null;
          tournamentStats.secondPlace = null;
        }
      }
      
      // Find the 3rd place match
      const thirdPlaceMatch = rounds.value.find(r => r.matches.some(m => m.isThirdPlace))?.matches.find(m => m.isThirdPlace);
      if (thirdPlaceMatch) {
        tournamentStats.thirdPlace = thirdPlaceMatch.winner;
      } else {
        tournamentStats.thirdPlace = null;
      }
    };

    // --- Lifecycle Hooks & Watchers ---

    onMounted(() => {
      const tournamentId = route.params.id;
      if (tournamentId) {
        fetchTournamentBracket(tournamentId);
      } else {
        // Focus the team input if creating a new tournament
        teamInputRef.value?.focus();
      }
      
      // Initial check for bye matches
      setTimeout(() => {
        // Handle byes just once after mounting
        checkAndHandleByes();
        // Then manually propagate winners through all rounds
        if (rounds.value && rounds.value.length > 0) {
          console.log("Running initial propagation after mount");
          const initialRounds = [...rounds.value];
          propagateWinners(initialRounds);
        }
      }, 500);
    });

    // Watch route changes if needed (e.g., navigating between different tournaments)
    watch(() => route.params.id, (newId, oldId) => {
        if (newId && newId !== oldId) {
             console.log(`Route changed, fetching new tournament: ${newId}`);
             // Reset state before fetching new tournament
             resetBracket(); // Consider if full reset is desired or just fetch
             fetchTournamentBracket(newId);
        } else if (!newId && oldId) {
             // Navigated away from a specific tournament back to creation mode
             console.log("Navigated back to creation mode.");
             resetBracket(); // Reset to clean slate
        }
    });

    // Watch for error changes to potentially auto-hide it after a delay
     watch(error, (newError) => {
         if (newError) {
             setTimeout(() => {
                 error.value = null; // Clear error after 5 seconds
             }, 5000);
         }
     });

    // Watch for changes in match data to update tournament positions
    watch(rounds, () => {
      updateTournamentPositions();
    }, { deep: true });

    // Check for and handle bye matches whenever the bracket structure changes  
    const checkAndHandleByes = () => {
      // Flag to prevent recursive updates
      let isHandlingByes = false;
      if (isHandlingByes) return;
      
      try {
        isHandlingByes = true;
        // Check each match in each round
        rounds.value.forEach((round, roundIndex) => {
          round.matches.forEach((match, matchIndex) => {
            // If the match has team1 but team2 is BYE, automatically set team1 as winner
            if (match.team1 && (!match.team2 || (match.team2 && match.team2.id === 'BYE'))) {
              match.hasBye = true;
              match.winner = match.team1;
              match.completed = true;
              match.score1 = 0;
              match.score2 = 0;
              // Instead of calling updateMatch (which triggers reactivity),
              // directly update the nextMatch if there is one
              if (roundIndex < rounds.value.length - 1) {
                const nextRoundIndex = roundIndex + 1;
                const nextMatchIndex = Math.floor(matchIndex / 2);
                if (nextRoundIndex < rounds.value.length && 
                    nextMatchIndex < rounds.value[nextRoundIndex].matches.length) {
                  const nextMatch = rounds.value[nextRoundIndex].matches[nextMatchIndex];
                  const isFirstFeeder = matchIndex % 2 === 0;
                  if (isFirstFeeder) {
                    nextMatch.team1 = match.winner;
                  } else {
                    nextMatch.team2 = match.winner;
                  }
                }
              }
            }
          });
        });
      } finally {
        isHandlingByes = false;
      }
    };

    return {
      // State & Data
      teams, rounds, teamName, bracketGenerated, error, loading,
      zoomLevel, activeTab, teamInputRef, bracketContainerRef,
      tournamentName, tournamentStats, teamGoals,
      route, router, // Add Vue Router objects
      
      // Methods
      addTeam, generateBracket, handleKeyDown, updateMatch, updateDateTime,
      updateMatchTopScorer, updateTopScorerName, updateTopScorerGoals,
      resetBracket, saveTournamentChanges, publishTournament,
      handleZoomIn, handleZoomOut, goBack, fetchTournamentBracket,
      calculateRounds, calculateByes, getRoundNamePreview, checkAndHandleByes,
      
      // Computed
      getTotalMatches, getByeCount,
      
      // Style Helpers
      getMatchCardColor, getMatchCardBorder, getRoundName
    };
  }
};
</script>

<style scoped>
.tournament-master {
  --tournament-accent: #10b981; /* Emerald 500 */
  --tournament-gradient-start: #34d399; /* Emerald 400 */
  --tournament-gradient-end: #0d9488; /* Teal 600 */
}

/* Animations */
.animate-fadeIn {
  animation: fadeIn 0.4s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Custom Scrollbar */
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(31, 41, 55, 0.3); /* gray-800 with transparency */
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(16, 185, 129, 0.4); /* emerald-500 with transparency */
  border-radius: 10px;
  border: 1px solid rgba(31, 41, 55, 0.5);
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(16, 185, 129, 0.6);
}
/* Firefox Scrollbar */
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: rgba(16, 185, 129, 0.5) rgba(31, 41, 55, 0.3);
}


/* Enhanced focus styles */
input:focus, button:focus, select:focus {
  outline: 2px solid var(--tournament-accent);
  outline-offset: 1px;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.3); /* Optional subtle glow */
}
/* Remove default number input arrows */
input[type=number]::-webkit-inner-spin-button,
input[type=number]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type=number] {
  -moz-appearance: textfield; /* Firefox */
}

/* Date/Time input styling */
input[type="date"], input[type="time"] {
  position: relative;
  color-scheme: dark; /* Helps with native picker theme */
}
/* Basic icon replacement for date/time (optional, browser support varies) */
input[type="date"]::-webkit-calendar-picker-indicator {
    /* background: url('data:image/svg+xml;...') center center no-repeat; */
    /* filter: invert(0.8); */
    opacity: 0.6;
    cursor: pointer;
}
input[type="time"]::-webkit-calendar-picker-indicator {
     opacity: 0.6;
     cursor: pointer;
}


/* UI Improvements */
.transition-all {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

button:not(:disabled) {
   cursor: pointer;
}
button:not(:disabled):hover {
  transform: translateY(-1px);
  filter: brightness(1.1);
}
button:not(:disabled):active {
  transform: translateY(0px);
   filter: brightness(0.95);
}
button:disabled {
   opacity: 0.6;
}

/* Responsive */
@media (max-width: 640px) {
  .tournament-master {
    padding: 0.75rem; /* 12px */
  }
  h1 {
     font-size: 1.125rem; /* text-lg */
  }
  /* Adjust grid/flex layouts on smaller screens if needed */
   .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); } /* Ensure team list stays reasonable */
}
</style>