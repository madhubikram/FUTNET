<template>
  <div class="tournament-master flex flex-col h-full w-full bg-gray-900 text-gray-100 p-4 gap-4 font-sans">
    <!-- Header with Gradient and Logo -->
    <div class="flex items-center justify-between mb-2">
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
        
        <button 
          @click="resetBracket"
          :disabled="!!route.params.id"
          class="px-3 py-1.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-md transition-all shadow-md hover:shadow-lg text-sm font-medium flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Reset Bracket
        </button>
      </div>
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
          <div class="flex items-center text-xs text-gray-500">
            <div class="w-24 text-center">Round 1</div>
            <ChevronRight size="14" class="opacity-50" />
            <div class="w-24 text-center">
              {{ teams.length <= 4 ? 'Final' : 'Quarterfinals' }}
            </div>
            <template v-if="teams.length > 4">
              <ChevronRight size="14" class="opacity-50" />
              <div class="w-24 text-center">
                {{ teams.length <= 8 ? 'Final' : 'Semifinals' }}
              </div>
              <template v-if="teams.length > 8">
                <ChevronRight size="14" class="opacity-50" />
                <div class="w-24 text-center">Final</div>
              </template>
            </template>
          </div>
          <div class="flex gap-2 items-center">
            <div class="w-24 h-8 bg-gray-700/50 rounded-md border border-gray-600/30 flex items-center justify-center text-xs text-gray-400">
              {{ teams.length }} Teams
            </div>
            <ChevronRight size="14" class="text-gray-600" />
            <div class="w-24 h-8 bg-gray-700/50 rounded-md border border-gray-600/30 flex items-center justify-center text-xs text-gray-400">
              {{ Math.ceil(teams.length/2) }} Matches
            </div>
            <template v-if="teams.length > 4">
              <ChevronRight size="14" class="text-gray-600" />
              <div class="w-24 h-8 bg-gray-700/50 rounded-md border border-gray-600/30 flex items-center justify-center text-xs text-gray-400">
                {{ Math.ceil(teams.length/4) }} Matches
              </div>
              <template v-if="teams.length > 8">
                <ChevronRight size="14" class="text-gray-600" />
                <div class="w-24 h-8 bg-gray-700/50 rounded-md border border-gray-600/30 flex items-center justify-center text-xs text-gray-400">
                  1 Match
                </div>
              </template>
            </template>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Tournament Content (Bracket + Stats) -->
    <div v-else-if="(bracketGenerated || route.params.id) && !loading" class="flex flex-col gap-5 animate-fadeIn">
      <!-- Tabs -->
      <div class="flex bg-gray-800/70 backdrop-blur-sm rounded-lg p-1 w-fit">
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
      </div>
      
      <!-- Tournament Bracket -->
      <div 
        v-if="activeTab === 'bracket'"
        ref="bracketContainerRef"
        class="bg-gradient-to-b from-gray-800/90 to-gray-800/70 backdrop-blur-sm rounded-xl p-5 shadow-xl border border-gray-700/50 overflow-x-auto animate-fadeIn"
        style="max-height: calc(100vh - 150px); overflow-y: auto"
      >
        <div 
          class="flex gap-6 p-2"
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
              height: `${round.matches.length * 170 + (round.matches.length - 1) * 20}px`,
              justifyContent: round.matches.length === 1 ? 'center' : 'space-around'
            }"
          >
            <div class="mb-3 text-center">
              <h3 class="font-bold text-lg bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">
                {{ getRoundName(round.round) }}
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
                  <button 
                    v-if="!match.hasBye"
                    @click="togglePK(roundIndex, matchIndex)"
                    :class="[
                      'px-2 py-0.5 rounded text-xs transition-all',
                      match.hasPK 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    ]"
                  >
                    Penalties
                  </button>
                </div>
                
                <div class="p-3 flex flex-col gap-3">
                  <!-- Team 1 row -->
                  <div :class="['flex items-center gap-2', match.winner === match.team1 ? 'opacity-100' : 'opacity-90']">
                    <div :class="[
                      'flex-1 p-2 rounded-lg bg-gray-800/50 border transition-all', 
                      match.winner === match.team1 ? 'border-emerald-500/30' : 'border-gray-700/30'
                    ]">
                      <div class="font-medium text-sm truncate flex items-center">
                        <div v-if="match.winner === match.team1" class="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center mr-1.5">
                          <Trophy class="h-3 w-3 text-emerald-400" />
                        </div>
                        {{ match.team1 ? match.team1.name : 'TBD' }}
                      </div>
                    </div>
                    
                    <div class="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        v-model.number="match.score1"
                        @input="updateMatch(roundIndex, matchIndex, 'score1')"
                        :class="[
                          'w-10 text-center rounded p-1 text-sm border transition-all focus:outline-none focus:ring-2',
                          match.winner === match.team1 ? 'bg-emerald-950/30 border-emerald-700/30 focus:ring-emerald-500/50' : 'bg-gray-800 border-gray-700'
                        ]"
                        :disabled="!match.team1 || match.hasBye"
                      />
                      <div v-if="match.hasPK" class="flex items-center">
                        <span class="mx-1 text-xs text-gray-400">pk</span>
                        <input
                          type="number"
                          min="0"
                          v-model.number="match.pk1"
                          @input="updateMatch(roundIndex, matchIndex, 'pk1')"
                          :class="[
                            'w-8 text-center rounded p-1 text-xs border transition-all focus:outline-none focus:ring-2',
                            match.winner === match.team1 && match.pk1 > match.pk2 ? 'bg-emerald-950/30 border-emerald-700/30 focus:ring-emerald-500/50' : 'bg-gray-800 border-gray-700'
                          ]"
                          :disabled="!match.team1"
                        />
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
                        <div v-if="match.winner === match.team2" class="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center mr-1.5">
                          <Trophy class="h-3 w-3 text-emerald-400" />
                        </div>
                        {{ match.team2 ? match.team2.name : match.hasBye ? 'Bye' : 'TBD' }}
                      </div>
                    </div>
                    
                    <div class="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        v-model.number="match.score2"
                        @input="updateMatch(roundIndex, matchIndex, 'score2')"
                        :class="[
                          'w-10 text-center rounded p-1 text-sm border transition-all focus:outline-none focus:ring-2',
                          match.winner === match.team2 ? 'bg-emerald-950/30 border-emerald-700/30 focus:ring-emerald-500/50' : 'bg-gray-800 border-gray-700'
                        ]"
                        :disabled="!match.team2 || match.hasBye"
                      />
                      <div v-if="match.hasPK" class="flex items-center">
                        <span class="mx-1 text-xs text-gray-400">pk</span>
                        <input
                          type="number"
                          min="0"
                          v-model.number="match.pk2"
                          @input="updateMatch(roundIndex, matchIndex, 'pk2')"
                          :class="[
                            'w-8 text-center rounded p-1 text-xs border transition-all focus:outline-none focus:ring-2',
                            match.winner === match.team2 && match.pk2 > match.pk1 ? 'bg-emerald-950/30 border-emerald-700/30 focus:ring-emerald-500/50' : 'bg-gray-800 border-gray-700'
                          ]"
                          :disabled="!match.team2"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <!-- Match top scorer -->
                  <div v-if="!match.hasBye" class="pt-2 border-t border-gray-700/30 grid grid-cols-12 gap-1 items-center">
                    <div class="col-span-3 text-xs text-gray-400 flex items-center">
                      <Star class="h-3 w-3 mr-1" />
                      <span>Top Scorer:</span>
                    </div>
                    <div class="col-span-6">
                      <input
                        type="text"
                        v-model="match.topScorer.name"
                        @input="updateMatchTopScorer(roundIndex, matchIndex, 'name', match.topScorer.name)"
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
                        @input="updateMatchTopScorer(roundIndex, matchIndex, 'goals', match.topScorer.goals)"
                        class="w-full text-center bg-gray-800/70 border border-gray-700/50 rounded p-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                        :disabled="match.hasBye"
                      />
                      <span class="text-xs text-gray-400">g</span>
                    </div>
                  </div>
                  
                  <!-- Date and Time -->
                  <div class="pt-2 border-t border-gray-700/30 grid grid-cols-12 gap-1 items-center">
                    <div class="col-span-2 text-xs text-gray-400">
                      <Calendar class="h-3 w-3" />
                    </div>
                    <div class="col-span-4">
                      <input
                        type="date"
                        v-model="match.date"
                        @input="updateDateTime(roundIndex, matchIndex, 'date', match.date)"
                        class="w-full bg-gray-800/70 border border-gray-700/50 rounded p-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                        :disabled="match.hasBye"
                      />
                    </div>
                    <div class="col-span-2 text-xs text-gray-400">
                      <Clock class="h-3 w-3" />
                    </div>
                    <div class="col-span-4">
                      <input
                        type="time"
                        v-model="match.time"
                        @input="updateDateTime(roundIndex, matchIndex, 'time', match.time)"
                        class="w-full bg-gray-800/70 border border-gray-700/50 rounded p-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
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
                        <span class="text-sm font-semibold">{{ match.winner.name }}</span>
                      </div>
                      <div 
                        v-if="match.team1 && match.team2"
                        class="flex items-center justify-between"
                      >
                        <span class="text-xs font-medium text-amber-400">2nd Place</span>
                        <span class="text-sm font-semibold">
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
  </div>
</template>

<script>
import { ref, computed, reactive, onMounted, watch } from 'vue';
import { Trophy, Calendar, Clock, Shield, ZoomIn, ZoomOut, Star, Award, User, ChevronRight, Loader2Icon } from 'lucide-vue-next';
import { useRoute } from 'vue-router';

const API_URL = 'http://localhost:5000/api';

export default {
  name: 'TournamentBrackets',
  components: {
    Trophy, Calendar, Clock, Shield, ZoomIn, ZoomOut, Star, Award, User, ChevronRight, Loader2Icon
  },
  setup() {
    const route = useRoute();
    // Refs for DOM elements
    const teamInputRef = ref(null);
    const bracketContainerRef = ref(null);

    // Component state
    const teams = ref([]);
    const teamName = ref('');
    const rounds = ref([]);
    const bracketGenerated = ref(false);
    const zoomLevel = ref(100);
    const activeTab = ref('bracket');
    const loading = ref(false);
    const tournamentName = ref('');
    const error = ref(null);
    
    // Tournament stats
    const tournamentStats = reactive({
      topScorer: { name: '', goals: 0 },
      mvp: '',
      playerOfTournament: ''
    });

    // Calculate the number of rounds needed based on number of teams
    const calculateRounds = (numTeams) => {
      return Math.ceil(Math.log2(numTeams));
    };

    // Add a team to the tournament
    const addTeam = () => {
      if (teamName.value.trim() === '') return;
      if (bracketGenerated.value) {
        // Reset bracket if already generated
        rounds.value = [];
        bracketGenerated.value = false;
      }
      teams.value.push({ id: Date.now().toString(), name: teamName.value });
      teamName.value = '';
      
      // Focus back on the input
      if (teamInputRef.value) {
        teamInputRef.value.focus();
      }
    };

    // Handle keyboard shortcut for adding teams
    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        addTeam();
      }
    };

    // Generate the initial bracket structure with proper bye handling
    const generateBracket = () => {
      if (teams.value.length < 2) {
        alert('Please add at least 2 teams');
        return;
      }
      
      const numRounds = calculateRounds(teams.value.length);
      const newRounds = [];
      
      // Calculate total slots needed (power of 2)
      const totalSlots = Math.pow(2, numRounds);
      
      // Create a copy of teams and distribute byes
      let teamsCopy = [...teams.value];
      let matchups = [];
      
      // Create all possible matchups with proper bye distribution
      for (let i = 0; i < totalSlots / 2; i++) {
        // For optimal bye distribution, we place byes in specific positions
        const team1Index = i;
        const team2Index = totalSlots - 1 - i;
        
        const team1 = team1Index < teamsCopy.length ? teamsCopy[team1Index] : null;
        const team2 = team2Index < teamsCopy.length ? teamsCopy[team2Index] : null;
        
        if (team1 && team2) {
          // Normal match between two teams
          matchups.push({
            id: `R1-M${i+1}`,
            matchName: `Round 1 - Match ${i+1}`,
            team1: team1,
            team2: team2,
            score1: 0,
            score2: 0,
            winner: null,
            pk1: null,
            pk2: null,
            hasPK: false,
            date: '',
            time: '',
            topScorer: { name: '', goals: 0 },
            hasBye: false
          });
        } else if (team1) {
          // Team 1 gets a bye
          matchups.push({
            id: `R1-M${i+1}`,
            matchName: `Round 1 - Match ${i+1} (Bye)`,
            team1: team1,
            team2: null,
            score1: 1,
            score2: 0,
            winner: team1,
            pk1: null,
            pk2: null,
            hasPK: false,
            date: 'Bye',
            time: '',
            topScorer: { name: '', goals: 0 },
            hasBye: true
          });
        } else if (team2) {
          // Team 2 gets a bye
          matchups.push({
            id: `R1-M${i+1}`,
            matchName: `Round 1 - Match ${i+1} (Bye)`,
            team1: team2,  // We place team2 in team1 slot for consistency
            team2: null,
            score1: 1,
            score2: 0,
            winner: team2,
            pk1: null,
            pk2: null,
            hasPK: false,
            date: 'Bye',
            time: '',
            topScorer: { name: '', goals: 0 },
            hasBye: true
          });
        }
      }
      
      // Keep only the valid matchups
      matchups = matchups.filter(match => match.team1);
      
      // Add first round
      newRounds.push({ round: 1, matches: matchups });
      
      // Create empty subsequent rounds
      for (let r = 2; r <= numRounds; r++) {
        const roundMatches = [];
        const prevRoundMatchCount = newRounds[r-2].matches.length;
        const currentRoundMatchCount = Math.ceil(prevRoundMatchCount / 2);
        
        for (let i = 0; i < currentRoundMatchCount; i++) {
          // Determine match name based on round
          let matchName;
          if (r === numRounds) {
            matchName = 'Championship Final';
          } else if (r === numRounds - 1) {
            if (currentRoundMatchCount === 1) {
              matchName = 'Semi-Final';
            } else {
              matchName = `Semi-Final ${i+1}`;
            }
          } else if (r === numRounds - 2) {
            matchName = `Quarter-Final ${i+1}`;
          } else {
            matchName = `Round ${r} - Match ${i+1}`;
          }
          
          // Create the match
          roundMatches.push({
            id: `R${r}-M${i+1}`,
            matchName: matchName,
            team1: null,
            team2: null,
            score1: 0,
            score2: 0,
            winner: null,
            pk1: null,
            pk2: null,
            hasPK: false,
            date: '',
            time: '',
            topScorer: { name: '', goals: 0 },
            hasBye: false
          });
        }
        
        newRounds.push({ round: r, matches: roundMatches });
      }
      
      // Propagate teams with byes to the next round
      const updatedRounds = [...newRounds];
      const firstRound = updatedRounds[0].matches;
      
      firstRound.forEach((match, matchIndex) => {
        if (match.hasBye && match.winner) {
          const nextRoundIndex = 1;
          const nextMatchIndex = Math.floor(matchIndex / 2);
          
          if (nextRoundIndex < updatedRounds.length) {
            const nextMatch = updatedRounds[nextRoundIndex].matches[nextMatchIndex];
            
            if (matchIndex % 2 === 0) {
              // Even index goes to team1 slot
              nextMatch.team1 = match.winner;
            } else {
              // Odd index goes to team2 slot
              nextMatch.team2 = match.winner;
            }
          }
        }
      });
      
      rounds.value = updatedRounds;
      bracketGenerated.value = true;
    };

    // Handle match score update
    const updateMatch = (roundIndex, matchIndex, field) => {
      const updatedRounds = [...rounds.value];
      const match = updatedRounds[roundIndex].matches[matchIndex];
      
      // Calculate winner if both scores are set
      if (field === 'score1' || field === 'score2' || field === 'pk1' || field === 'pk2') {
        // If regular scores are equal
        if (match.score1 === match.score2) {
          if (match.hasPK && match.pk1 !== null && match.pk2 !== null) {
            // Decide winner based on penalty kicks
            if (match.pk1 > match.pk2) {
              match.winner = match.team1;
            } else if (match.pk2 > match.pk1) {
              match.winner = match.team2;
            } else {
              match.winner = null; // Tied PK (shouldn't happen)
            }
          } else {
            match.winner = null; // Tied score, no PK yet
          }
        } else {
          // Decide winner based on regular score
          if (match.score1 > match.score2) {
            match.winner = match.team1;
          } else {
            match.winner = match.team2;
          }
        }
        
        // Update next round match if there is one
        if (roundIndex < rounds.value.length - 1) {
          const nextRoundIndex = roundIndex + 1;
          const nextMatchIndex = Math.floor(matchIndex / 2);
          const nextMatch = updatedRounds[nextRoundIndex].matches[nextMatchIndex];
          const isFirstTeam = matchIndex % 2 === 0;
          
          if (match.winner) {
            if (isFirstTeam) {
              nextMatch.team1 = match.winner;
            } else {
              nextMatch.team2 = match.winner;
            }
          } else {
            // Reset next round slot if no winner
            if (isFirstTeam) {
              nextMatch.team1 = null;
            } else {
              nextMatch.team2 = null;
            }
          }
        }
      }
      
      rounds.value = updatedRounds;
    };

    // Toggle penalty kicks for a match
    const togglePK = (roundIndex, matchIndex) => {
      const match = rounds.value[roundIndex].matches[matchIndex];
      match.hasPK = !match.hasPK;
      
      // Reset PK scores when toggling off
      if (!match.hasPK) {
        match.pk1 = null;
        match.pk2 = null;
        
        // Recalculate winner based on regular scores
        if (match.score1 > match.score2) {
          match.winner = match.team1;
        } else if (match.score2 > match.score1) {
          match.winner = match.team2;
        } else {
          match.winner = null;
        }
      }
    };

    // Update date and time for a match
    const updateDateTime = (roundIndex, matchIndex, field, value) => {
      rounds.value[roundIndex].matches[matchIndex][field] = value;
    };

    // Update match top scorer
    const updateMatchTopScorer = (roundIndex, matchIndex, field, value) => {
      rounds.value[roundIndex].matches[matchIndex].topScorer[field] = value;
      
      // Update tournament top scorer if needed
      updateTopScorer();
    };
    
    // Update tournament's top scorer based on all matches
    const updateTopScorer = () => {
      const allMatches = rounds.value.flatMap(round => round.matches);
      const topScorerMatch = allMatches.reduce((max, match) => 
        (match.topScorer.goals > max.topScorer.goals) ? match : max, 
        { topScorer: { name: '', goals: 0 } }
      );
      
      if (topScorerMatch.topScorer.goals > tournamentStats.topScorer.goals) {
        tournamentStats.topScorer.name = topScorerMatch.topScorer.name;
        tournamentStats.topScorer.goals = topScorerMatch.topScorer.goals;
      }
    };
    
    // Handle top scorer name update
    const updateTopScorerName = (e) => {
      tournamentStats.topScorer.name = e.target.value;
    };
    
    // Handle top scorer goals update
    const updateTopScorerGoals = (e) => {
      tournamentStats.topScorer.goals = parseInt(e.target.value) || 0;
    };

    // Reset the tournament
    const resetBracket = () => {
      rounds.value = [];
      bracketGenerated.value = false;
      Object.assign(tournamentStats, {
        topScorer: { name: '', goals: 0 },
        mvp: '',
        playerOfTournament: ''
      });
      activeTab.value = 'bracket';
    };
    
    // Get color for match card based on state
    const getMatchCardColor = (match) => {
      if (match.hasBye) return 'from-amber-500/20 to-amber-600/10';
      if (match.winner) return 'from-emerald-500/20 to-emerald-600/10';
      return 'from-gray-700/50 to-gray-800/50';
    };
    
    // Get border color for match card
    const getMatchCardBorder = (match) => {
      if (match.hasBye) return 'border-amber-500/50';
      if (match.winner) return 'border-emerald-500/50';
      return 'border-gray-700/50';
    };
    
    // Get round name based on round number
    const getRoundName = (round) => {
      if (round === rounds.value.length) return 'Championship';
      if (round === rounds.value.length - 1) return 'Semi-Finals';
      if (round === rounds.value.length - 2) return 'Quarter-Finals';
      return `Round ${round}`;
    };
    
    // Zoom controls
    const handleZoomIn = () => {
      zoomLevel.value = Math.min(zoomLevel.value + 10, 150);
    };
    
    const handleZoomOut = () => {
      zoomLevel.value = Math.max(zoomLevel.value - 10, 50);
    };
    
    // Computed properties
    const getTotalMatches = computed(() => {
      return rounds.value.reduce((sum, round) => sum + round.matches.length, 0);
    });
    
    const getByeCount = computed(() => {
      return rounds.value[0]?.matches.filter(m => m.hasBye).length || 0;
    });
    
    // Fetch Tournament Bracket Data
    const fetchTournamentBracket = async (id) => {
      loading.value = true;
      error.value = null;
      console.log(`Fetching bracket for tournament ID: ${id}`);
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Authentication token not found.');
        }
        const response = await fetch(`${API_URL}/tournaments/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.message || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Fetched tournament data:', data);

        tournamentName.value = data.name;
        
        // Assuming the API returns registered teams in 'registeredTeamsDetails' or similar
        // and bracket structure in 'bracket' (which should match the 'rounds' structure)
        if (data.registeredTeamsDetails && data.registeredTeamsDetails.length > 0) {
            // Map fetched team details to the format expected by the bracket generation/display
             teams.value = data.registeredTeamsDetails.map(teamDetail => ({
                id: teamDetail._id, // Use actual team ID
                name: teamDetail.teamName 
            }));
        } else {
            teams.value = []; // Set teams to empty if none registered
        }


        if (data.bracket && data.bracket.rounds && data.bracket.rounds.length > 0) {
          // Ensure team objects within the bracket data have id and name
          const processedRounds = data.bracket.rounds.map(round => ({
              ...round,
              matches: round.matches.map(match => ({
                  ...match,
                  // Ensure team objects are correctly structured or look them up in teams.value
                  team1: match.team1 ? teams.value.find(t => t.id === match.team1) || { id: match.team1, name: 'Unknown Team' } : null,
                  team2: match.team2 ? teams.value.find(t => t.id === match.team2) || { id: match.team2, name: 'Unknown Team' } : null,
                  winner: match.winner ? teams.value.find(t => t.id === match.winner) || { id: match.winner, name: 'Unknown Team' } : null,
                  // Ensure topScorer has default values if missing
                  topScorer: match.topScorer || { name: '', goals: 0 },
                  // Set default date/time if missing
                  date: match.date || '',
                  time: match.time || '',
                  score1: match.score1 ?? 0,
                  score2: match.score2 ?? 0,
                  pk1: match.pk1 ?? null,
                  pk2: match.pk2 ?? null,
              }))
          }));

          rounds.value = processedRounds;
          bracketGenerated.value = true;
          console.log('Bracket loaded from fetched data.');

          // Load stats if available
          if (data.stats) {
             Object.assign(tournamentStats, data.stats);
             // Ensure nested objects are handled correctly
             if (!tournamentStats.topScorer) tournamentStats.topScorer = { name: '', goals: 0 };
             if (!tournamentStats.mvp) tournamentStats.mvp = '';
             if (!tournamentStats.playerOfTournament) tournamentStats.playerOfTournament = '';
          } else {
             // Reset stats if not provided
             Object.assign(tournamentStats, {
                topScorer: { name: '', goals: 0 },
                mvp: '',
                playerOfTournament: ''
             });
          }


        } else if (teams.value.length >= 2) {
           console.log('No existing bracket found in data, generating new one based on registered teams.');
           // If no bracket exists but teams are registered, generate a fresh bracket
           generateBracket(); // This function uses the populated teams.value
        } else {
           console.log('No bracket data found and not enough teams to generate.');
           // Handle case where there's no bracket and not enough teams (e.g., show a message)
           bracketGenerated.value = false; // Ensure setup screen isn't skipped
           // Optionally, set an error or status message here
        }

      } catch (err) {
        console.error('Error fetching tournament bracket:', err);
        error.value = err.message;
        // Handle error display to the user if needed
      } finally {
        loading.value = false;
      }
    };

    // Lifecycle hooks
    onMounted(() => {
      const tournamentId = route.params.id;
      if (tournamentId) {
        fetchTournamentBracket(tournamentId);
      } else {
         // Focus the team input field when the component mounts (only if creating new)
         if (teamInputRef.value && !bracketGenerated.value) {
           teamInputRef.value.focus();
         }
      }
    });
    
    watch(bracketGenerated, (newVal) => {
      if (!newVal && teamInputRef.value) {
        // Focus the team input when returning to team setup
        setTimeout(() => {
          teamInputRef.value.focus();
        }, 0);
      }
    });

    return {
      // State
      teams,
      teamName,
      rounds,
      bracketGenerated,
      zoomLevel,
      activeTab,
      tournamentStats,
      loading,
      tournamentName,
      error,
      route,
      
      // Refs
      teamInputRef,
      bracketContainerRef,
      
      // Methods
      addTeam,
      generateBracket,
      handleKeyDown,
      updateMatch,
      togglePK,
      updateDateTime,
      updateMatchTopScorer,
      updateTopScorerName,
      updateTopScorerGoals,
      resetBracket,
      getMatchCardColor,
      getMatchCardBorder,
      getRoundName,
      handleZoomIn,
      handleZoomOut,
      
      // Computed
      getTotalMatches,
      getByeCount
    };
  }
};
</script>

<style scoped>
.tournament-master {
  --tournament-accent: #10b981;
  --tournament-gradient-start: #34d399;
  --tournament-gradient-end: #0d9488;
}

/* Animations */
.animate-fadeIn {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Custom Scrollbar */
:deep(.custom-scrollbar::-webkit-scrollbar) {
  width: 6px;
  height: 6px;
}

:deep(.custom-scrollbar::-webkit-scrollbar-track) {
  background: rgba(31, 41, 55, 0.5);
  border-radius: 10px;
}

:deep(.custom-scrollbar::-webkit-scrollbar-thumb) {
  background: rgba(16, 185, 129, 0.5);
  border-radius: 10px;
}

:deep(.custom-scrollbar::-webkit-scrollbar-thumb:hover) {
  background: rgba(16, 185, 129, 0.7);
}

/* Enhanced focus styles for better accessibility */
:deep(input:focus), :deep(button:focus), :deep(select:focus) {
  outline: 2px solid var(--tournament-accent);
  outline-offset: 1px;
}

/* UI Improvements: transitions */
.transition-all {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Make sure buttons have hover and active states */
button:not(:disabled):hover {
  transform: translateY(-1px);
}

button:not(:disabled):active {
  transform: translateY(1px);
}

/* Responsive layout improvements */
@media (max-width: 640px) {
  .tournament-master {
    padding: 0.75rem;
  }
}

/* Print styles */
@media print {
  .tournament-master {
    background: white;
    color: black;
  }
  
  button {
    display: none;
  }
}
</style>