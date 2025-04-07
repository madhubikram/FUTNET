<template>
  <PageLayout>
    <div class="px-4 md:px-8 py-4 md:py-6">
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
      <h1 class="text-2xl font-bold text-white">Tournament Management</h1>
      <button
        @click="openCreateTournamentModal()"
        class="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center gap-2 transition-colors duration-200"
      >
        <PlusIcon class="w-5 h-5" />
        Create Tournament
      </button>
    </div>

    <div class="overflow-x-hidden">
    <LoadingState v-if="loading" message="Loading tournaments..." />
    <EmptyState v-else-if="!loading && tournaments.length === 0" message="No tournaments created yet." />

    <div
      v-else
      class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6"
    >
    <BaseCard
      v-for="tournament in tournaments"
      :key="tournament.id"
      :item-type="'Tournament'"
      :image-src="tournament.banner
                  ? `http://localhost:5000${tournament.banner}`
                  : '/placeholder-tournament.jpg'"
      :image-alt="tournament.name"
      :status="tournament.status"
      :title="tournament.name"
      :show-admin-controls="true"
      :show-edit-button="tournament.status !== 'Completed'"
      :show-view-teams-button="true"
      :details-button-text="'View Details'"
      :status-color-class="statusColorClass(tournament.status)"
      :status-dot-class="statusDotClass(tournament.status)"
      @edit-item="editTournament(tournament)"
      @delete-item="deleteTournament(tournament)"
      @view-details="viewTournament(tournament)"
      @view-bracket="navigateToBracket(tournament)"
      @view-teams="navigateToTeams(tournament)"
    >
        <template #tournament-details>
          <div class="space-y-3">
            <p class="text-gray-400 text-sm mb-4">{{ tournament.description }}</p>
            <div class="flex items-center text-gray-400 justify-between">
              <div class="flex items-center">
                <CalendarIcon class="w-4 h-4 mr-2" />
                <span class="text-sm">Start Date:</span>
              </div>
              <span class="text-sm">{{ new Date(tournament.startDate).toLocaleDateString() }}</span>
            </div>
            <div class="flex items-center text-gray-400 justify-between">
              <div class="flex items-center">
                <CalendarIcon class="w-4 h-4 mr-2" />
                <span class="text-sm">Reg. Deadline:</span>
              </div>
              <span class="text-sm">
                {{ new Date(tournament.registrationDeadline).toLocaleDateString() }}
                {{ tournament.registrationDeadlineTime ? ` ${tournament.registrationDeadlineTime}` : '' }}
              </span>
            </div>
            <div class="flex items-center text-gray-400 justify-between">
              <div class="flex items-center">
                <UsersIcon class="w-4 h-4 mr-2" />
                <span class="text-sm">Teams:</span>
              </div>
              <span class="text-sm">{{ tournament.registeredTeams }} / {{ tournament.maxTeams }}</span>
            </div>
            <div class="flex items-center text-gray-400 justify-between">
              <div class="flex items-center">
                <TrophyIcon class="w-4 h-4 mr-2" />
                <span class="text-sm">Prize Pool:</span>
              </div>
              <span class="text-sm">Rs. {{ tournament.prizePool }}</span>
            </div>
          </div>
        </template>
      </BaseCard>
    </div>
  </div>
  </div>

  <BaseModal v-if="showCreateTournamentModal" @close="closeCreateTournamentModal">
    <template #header>
      <h3 class="text-xl font-semibold text-white">
        {{ editingTournamentId ? 'Edit Tournament' : 'Create New Tournament' }}
      </h3>
    </template>

    <template #body>
      <form @submit.prevent="handleCreateTournament" class="space-y-8">
        <div class="space-y-4">
          <h4 class="text-sm font-semibold text-gray-300">Basic Information</h4>
          <div>
            <label class="block text-sm font-medium text-gray-400 mb-1">Tournament Name</label>
            <input
              v-model="tournamentForm.name"
              type="text"
              class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-green-500 focus:border-green-500"
              required
            />
            <p v-if="errors.name" class="text-xs text-red-400 mt-1">{{ errors.name }}</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-400 mb-1">Description</label>
            <textarea
              v-model="tournamentForm.description"
              rows="3"
              class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-green-500 focus:border-green-500"
              required
            ></textarea>
            <p v-if="errors.description" class="text-xs text-red-400 mt-1">{{ errors.description }}</p>
          </div>
        </div>

        <div class="space-y-4">
          <h4 class="text-sm font-semibold text-gray-300">Schedule</h4>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1">Start Date</label>
              <input
                v-model="tournamentForm.startDate"
                type="date"
                class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-green-500 focus:border-green-500"
                :min="minDate"
                required
              />
              <p v-if="errors.startDate" class="text-xs text-red-400 mt-1">{{ errors.startDate }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1">Start Time</label>
              <input
                v-model="tournamentForm.startTime"
                type="time"
                class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-green-500 focus:border-green-500"
                required
              />
              <p v-if="errors.startTime" class="text-xs text-red-400 mt-1">{{ errors.startTime }}</p>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-400 mb-1">End Date</label>
            <input
              v-model="tournamentForm.endDate"
              type="date"
              class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-green-500 focus:border-green-500"
              :min="tournamentForm.startDate || minDate"
              required
            />
            <p v-if="errors.endDate" class="text-xs text-red-400 mt-1">{{ errors.endDate }}</p>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1">Registration Deadline Date</label>
              <input
                v-model="tournamentForm.registrationDeadline"
                type="date"
                class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-green-500 focus:border-green-500"
                :min="minDate"
                :max="tournamentForm.startDate"
                required
              />
              <p v-if="errors.registrationDeadline" class="text-xs text-red-400 mt-1">{{ errors.registrationDeadline }}</p>
            </div>
             <div>
              <label class="block text-sm font-medium text-gray-400 mb-1">Registration Deadline Time</label>
              <input
                v-model="tournamentForm.registrationDeadlineTime"
                type="time"
                class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-green-500 focus:border-green-500"
                required
              />
              <p v-if="errors.registrationDeadlineTime" class="text-xs text-red-400 mt-1">{{ errors.registrationDeadlineTime }}</p>
            </div>
          </div>
        </div>

        <div class="space-y-4">
          <h4 class="text-sm font-semibold text-gray-300">Match Settings</h4>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1">Half Duration</label>
              <div class="flex items-center gap-2">
                <input
                  v-model="tournamentForm.halfDuration"
                  type="number"
                  min="10"
                  max="45"
                  class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-green-500 focus:border-green-500"
                  required
                />
                <span class="text-gray-400 whitespace-nowrap">minutes</span>
              </div>
              <p v-if="errors.halfDuration" class="text-xs text-red-400 mt-1">{{ errors.halfDuration }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1">Break Time</label>
              <div class="flex items-center gap-2">
                <input
                  v-model="tournamentForm.breakDuration"
                  type="number"
                  min="5"
                  max="15"
                  class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-green-500 focus:border-green-500"
                  required
                />
                <span class="text-gray-400 whitespace-nowrap">minutes</span>
              </div>
              <p v-if="errors.breakDuration" class="text-xs text-red-400 mt-1">{{ errors.breakDuration }}</p>
            </div>
          </div>
        </div>

        <div class="space-y-4">
          <h4 class="text-sm font-semibold text-gray-300">Tournament Format</h4>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1">Format Type</label>
              <select
                v-model="tournamentForm.format"
                class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-green-500 focus:border-green-500"
                required
              >
                <option value="single">Single Elimination</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1">Minimum Teams</label>
              <select
                v-model.number="tournamentForm.minTeams"
                class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-green-500 focus:border-green-500"
                required
              >
                <option v-for="n in 12" :key="`min-teams-${n}`" :value="n + 3">{{ n + 3 }} Teams</option>
              </select>
              <p v-if="errors.minTeams" class="text-xs text-red-400 mt-1">{{ errors.minTeams }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1">Maximum Teams</label>
              <select
                v-model="tournamentForm.maxTeams"
                class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-green-500 focus:border-green-500"
                required
              >
                <option value="8">8 Teams</option>
                <option value="16">16 Teams</option>
                <option value="32">32 Teams</option>
              </select>
              <p v-if="errors.maxTeams" class="text-xs text-red-400 mt-1">{{ errors.maxTeams }}</p>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-400 mb-2">Team Size</label>
            <div class="grid grid-cols-3 gap-4">
              <div class="col-span-2">
                <label class="block text-xs text-gray-500 mb-1">Players Per Team</label>
                <select
                  v-model="tournamentForm.teamSize"
                  class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-green-500 focus:border-green-500"
                  required
                >
                  <option value="5">5 Players</option>
                  <option value="6">6 Players</option>
                  <option value="7">7 Players</option>
                </select>
              </div>
              <div>
                <label class="block text-xs text-gray-500 mb-1">Substitutes</label>
                <select
                  v-model="tournamentForm.substitutes"
                  class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-green-500 focus:border-green-500"
                  required
                >
                  <option value="2">2 Subs</option>
                  <option value="3">3 Subs</option>
                  <option value="4">4 Subs</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-4">
          <h4 class="text-sm font-semibold text-gray-300">Financial Details</h4>
          <div class="grid grid-cols-1 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1">Registration Fee</label>
              <div class="flex items-center gap-2">
                <span class="text-gray-400">Rs.</span>
                <input
                  v-model.number="tournamentForm.registrationFee"
                  type="number"
                  min="0"
                  class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-green-500 focus:border-green-500"
                  required
                />
              </div>
              <p v-if="errors.registrationFee" class="text-xs text-red-400 mt-1">{{ errors.registrationFee }}</p>
            </div>
          </div>
          
          <div class="mt-4">
            <label class="block text-sm font-medium text-gray-400 mb-2">Prize Breakdown</label>
            <div class="grid grid-cols-3 gap-4">
              <div>
                <label class="block text-xs text-gray-500 mb-1">1st Place Prize (Required)</label>
                <div class="flex items-center gap-2">
                  <span class="text-gray-400">Rs.</span>
                  <input
                    v-model.number="tournamentForm.prizes.first"
                    type="number"
                    min="0"
                    class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-green-500 focus:border-green-500"
                    required
                  />
                </div>
                <p v-if="errors.prizeFirst" class="text-xs text-red-400 mt-1">{{ errors.prizeFirst }}</p>
              </div>
              <div>
                <label class="block text-xs text-gray-500 mb-1">2nd Place Prize (Optional)</label>
                <div class="flex items-center gap-2">
                  <span class="text-gray-400">Rs.</span>
                  <input
                    v-model.number="tournamentForm.prizes.second"
                    type="number"
                    min="0"
                    class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <p v-if="errors.prizeSecond" class="text-xs text-red-400 mt-1">{{ errors.prizeSecond }}</p>
              </div>
              <div>
                <label class="block text-xs text-gray-500 mb-1">3rd Place Prize (Optional)</label>
                <div class="flex items-center gap-2">
                  <span class="text-gray-400">Rs.</span>
                  <input
                    v-model.number="tournamentForm.prizes.third"
                    type="number"
                    min="0"
                    class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <p v-if="errors.prizeThird" class="text-xs text-red-400 mt-1">{{ errors.prizeThird }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-4">
          <h4 class="text-sm font-semibold text-gray-300">Tournament Rules</h4>
          <div>
            <textarea
              v-model="tournamentForm.rules"
              rows="4"
              class="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-green-500 focus:border-green-500"
              placeholder="Enter tournament rules and regulations..."
              required
            ></textarea>
            <p v-if="errors.rules" class="text-xs text-red-400 mt-1">{{ errors.rules }}</p>
          </div>
        </div>

        <div class="space-y-4">
          <h4 class="text-sm font-semibold text-gray-300">Tournament Banner</h4>
          <ImageUpload
            v-model="tournamentImages"
            :multiple="false"
            :max-files="1"
            label="Tournament Banner"
            placeholder="Upload a banner image for your tournament"
            @error="handleImageError"
          />
          <p v-if="errors.image" class="text-xs text-red-400 mt-1">{{ errors.image }}</p>
        </div>
      </form>
    </template>

    <template #footer>
  <div class="flex justify-end space-x-3">
    <button
      @click="closeCreateTournamentModal"
      class="px-4 py-2 text-gray-400 hover:text-white rounded-lg transition-colors duration-200"
    >
      Cancel
    </button>
    <button
      type="submit" 
      @click.prevent="handleCreateTournament"
      :disabled="isSubmitting"
      class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors duration-200"
    >
      <Loader2Icon v-if="isSubmitting" class="animate-spin w-4 h-4" />
      {{ editingTournamentId ? 'Save Changes' : 'Create Tournament' }}
    </button>
  </div>
</template>
  </BaseModal>

  <BaseModal v-if="showViewModal" @close="showViewModal = false">
    <template #header>
      <h3 class="text-xl font-semibold text-white">Tournament Details</h3>
    </template>

    <template #body>
      <div v-if="selectedTournament" class="space-y-8">
        <div v-if="selectedTournament.banner" class="aspect-video rounded-lg overflow-hidden">
          <img
            :src="`http://localhost:5000${selectedTournament.banner}`"
            class="w-full h-full object-cover"
            :alt="selectedTournament.name"
          />
        </div>

        <div class="space-y-4">
          <h4 class="text-sm font-semibold text-gray-300">Basic Information</h4>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs text-gray-500">Tournament Name</label>
              <p class="text-white">{{ selectedTournament.name }}</p>
            </div>
            <div>
              <label class="block text-xs text-gray-500">Status</label>
              <span
                :class="{
                  'px-2 py-1 rounded-full text-xs font-medium inline-block': true,
                  'bg-green-500/10 text-green-400': selectedTournament.status === 'Upcoming',
                  'bg-blue-500/10 text-blue-400': selectedTournament.status === 'Ongoing',
                  'bg-gray-500/10 text-gray-400': selectedTournament.status === 'Completed',
                }"
              >
                {{ selectedTournament.status }}
              </span>
            </div>
          </div>
          <div>
            <label class="block text-xs text-gray-500">Description</label>
            <p class="text-white">{{ selectedTournament.description }}</p>
          </div>
        </div>

        <div class="space-y-4">
          <h4 class="text-sm font-semibold text-gray-300">Schedule</h4>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs text-gray-500">Start Date</label>
              <p class="text-white">{{ new Date(selectedTournament.startDate).toLocaleDateString() }}</p>
            </div>
            <div>
              <label class="block text-xs text-gray-500">Start Time</label>
              <p class="text-white">{{ selectedTournament.startTime }}</p>
            </div>
          </div>
          <div>
            <label class="block text-xs text-gray-500">Registration Deadline</label>
            <p class="text-white">
              {{ new Date(selectedTournament.registrationDeadline).toLocaleDateString() }}
              {{ selectedTournament.registrationDeadlineTime ? ` at ${selectedTournament.registrationDeadlineTime}` : '' }}
            </p>
          </div>
          <div>
            <label class="block text-xs text-gray-500">End Date</label>
            <p class="text-white">{{ selectedTournament.endDate ? new Date(selectedTournament.endDate).toLocaleDateString() : 'N/A' }}</p>
          </div>
        </div>

        <div class="space-y-4">
          <h4 class="text-sm font-semibold text-gray-300">Match Settings</h4>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs text-gray-500">Match Duration</label>
              <p class="text-white">{{ selectedTournament.halfDuration * 2 + selectedTournament.breakDuration }} minutes ({{ selectedTournament.halfDuration }}' + {{ selectedTournament.breakDuration }}' + {{ selectedTournament.halfDuration }}')</p>
            </div>
            <div>
              <label class="block text-xs text-gray-500">Format</label>
              <p class="text-white">{{ selectedTournament.format === 'single' ? 'Single Elimination' : 'Double Elimination' }}</p>
            </div>
          </div>
        </div>

        <div class="space-y-4">
          <h4 class="text-sm font-semibold text-gray-300">Team Information</h4>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs text-gray-500">Minimum Teams</label>
              <p class="text-white">{{ selectedTournament.minTeams }} Teams</p>
            </div>
            <div>
              <label class="block text-xs text-gray-500">Maximum Teams</label>
              <p class="text-white">{{ selectedTournament.maxTeams }} Teams</p>
            </div>
            <div>
              <label class="block text-xs text-gray-500">Team Size</label>
              <p class="text-white">{{ selectedTournament.teamSize }} Players + {{ selectedTournament.substitutes }} Substitutes</p>
            </div>
          </div>
        </div>

        <div class="space-y-4">
          <h4 class="text-sm font-semibold text-gray-300">Financial Details</h4>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs text-gray-500">Registration Fee</label>
              <p class="text-white">Rs. {{ selectedTournament.registrationFee }}</p>
            </div>
            <div>
              <label class="block text-xs text-gray-500">Total Prize Pool</label>
              <p class="text-white">Rs. {{ selectedTournament.prizePool }}</p>
            </div>
          </div>
          
          <div v-if="selectedTournament.prizes && (selectedTournament.prizes.first || selectedTournament.prizes.second || selectedTournament.prizes.third)" class="mt-3">
            <label class="block text-xs text-gray-500 mb-2">Prize Breakdown</label>
            <div class="grid grid-cols-3 gap-4">
              <div v-if="selectedTournament.prizes.first">
                <span class="inline-block px-2 py-1 bg-yellow-400/20 text-yellow-300 rounded-full text-xs mb-1">1st Place</span>
                <p class="text-white">Rs. {{ selectedTournament.prizes.first }}</p>
              </div>
              <div v-if="selectedTournament.prizes.second">
                <span class="inline-block px-2 py-1 bg-gray-400/20 text-gray-300 rounded-full text-xs mb-1">2nd Place</span>
                <p class="text-white">Rs. {{ selectedTournament.prizes.second }}</p>
              </div>
              <div v-if="selectedTournament.prizes.third">
                <span class="inline-block px-2 py-1 bg-amber-600/20 text-amber-500 rounded-full text-xs mb-1">3rd Place</span>
                <p class="text-white">Rs. {{ selectedTournament.prizes.third }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-4">
          <h4 class="text-sm font-semibold text-gray-300">Tournament Rules</h4>
          <p class="text-white whitespace-pre-line">{{ selectedTournament.rules }}</p>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end">
        <button
          @click="showViewModal = false"
          class="px-4 py-2 text-gray-400 hover:text-white rounded-lg transition-colors duration-200"
        >
          Close
        </button>
      </div>
    </template>
  </BaseModal>
</PageLayout>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import BaseModal from '@/components/BaseModal.vue'
import BaseCard from '@/components/base/BaseCard.vue' // Import BaseCard
import ImageUpload from '@/components/ImageUpload.vue'
import LoadingState from '@/components/states/LoadingState.vue'
import EmptyState from '@/components/states/EmptyState.vue'
import PageLayout from '@/components/layout/PageLayout.vue'
import { useToast } from 'vue-toastification' // Import useToast
import {
  PlusIcon, CalendarIcon, UsersIcon, TrophyIcon,
  Loader2Icon,
} from 'lucide-vue-next'
import { useRouter } from 'vue-router';

const toast = useToast() // Initialize toast
const router = useRouter();
const API_URL = 'http://localhost:5000/api';
// State Management
const showCreateTournamentModal = ref(false)
const showViewModal = ref(false)
const isSubmitting = ref(false)
const tournaments = ref([])
const loading = ref(false)
const tournamentImages = ref([])
const errors = ref({})
const selectedTournament = ref(null)
const editingTournamentId = ref(null)

// Computed Properties
const minDate = computed(() => {
  const today = new Date()
  return today.toISOString().split('T')[0]
})

// Form State
const tournamentForm = ref({
  name: '',
  description: '',
  startDate: '',
  registrationDeadline: '',
  registrationDeadlineTime: '',
  startTime: '',
  endDate: '',
  halfDuration: 20,
  breakDuration: 5,
  format: 'single',
  minTeams: 4,
  maxTeams: 8,
  teamSize: 5,
  substitutes: 2,
  registrationFee: 0,
  rules: '',
  prizes: {
    first: null,
    second: null,
    third: null
  }
})

// Status Color Classes for Tournament - ADDED FUNCTIONS HERE!
const statusColorClass = (status) => {
  return status === 'Upcoming'
    ? 'bg-green-500 text-white'
    : status === 'Ongoing'
      ? 'bg-blue-500 text-white'
      : status === 'Completed'
        ? 'bg-gray-500 text-white'
        : status === 'Cancelled (Low Teams)'
          ? 'bg-orange-500 text-white'
        : ''
}

const statusDotClass = (status) => {
  return status === 'Upcoming'
    ? 'bg-green-300'
    : status === 'Ongoing'
      ? 'bg-blue-300'
      : status === 'Completed'
        ? 'bg-gray-300'
        : status === 'Cancelled (Low Teams)'
          ? 'bg-orange-300'
        : ''
}


// Methods
const resetForm = () => {
  editingTournamentId.value = null;
  selectedTournament.value = null;
  tournamentForm.value = {
    name: '',
    description: '',
    startDate: '',
    registrationDeadline: '',
    registrationDeadlineTime: '',
    startTime: '',
    endDate: '',
    halfDuration: 20,
    breakDuration: 5,
    format: 'single',
    minTeams: 4,
    maxTeams: 8,
    teamSize: 5,
    substitutes: 2,
    registrationFee: 0,
    rules: '',
    prizes: {
      first: null,
      second: null,
      third: null
    }
  };
  tournamentImages.value = [];
  errors.value = {};
};

const handleImageError = (error) => {
  console.error('Image upload error:', error)
  errors.value.image = error
}

const openCreateTournamentModal = () => {
  resetForm(); // Reset form first
  showCreateTournamentModal.value = true;
};

const closeCreateTournamentModal = () => {
  showCreateTournamentModal.value = false;
  resetForm();
};

const fetchTournaments = async () => {
  try {
    loading.value = true;
    const token = localStorage.getItem('token');
    console.log('Fetching with token:', token);

    const response = await fetch(`${API_URL}/tournaments`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('Response status:', response.status);

    const data = await response.text(); // Use text() instead of json() initially
    console.log('Raw response:', data);

    // Try to parse as JSON
    try {
      const jsonData = JSON.parse(data);
      tournaments.value = jsonData;
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      throw new Error('Invalid response format');
    }
  } catch (error) {
    console.error('Error fetching tournaments:', error);
    if (error.message.includes('Invalid token')) {
      // Handle invalid token
      localStorage.removeItem('token');
      router.push('/login');
    }
  } finally {
    loading.value = false;
  }
};
// Form Validation
const validateForm = () => {
  errors.value = {}
  let isValid = true

  if (!tournamentForm.value.name?.trim()) {
    errors.value.name = 'Tournament name is required'
    isValid = false
  }

  if (!tournamentForm.value.startDate) {
    errors.value.startDate = 'Start date is required'
    isValid = false
  }
  if (!tournamentForm.value.endDate) {
    errors.value.endDate = 'End date is required'
    isValid = false
  }

  if (!tournamentForm.value.registrationDeadline) {
    errors.value.registrationDeadline = 'Registration deadline date is required'
    isValid = false
  }

  if (!tournamentForm.value.registrationDeadlineTime) {
    errors.value.registrationDeadlineTime = 'Registration deadline time is required'
    isValid = false
  }

  if (tournamentForm.value.startDate && tournamentForm.value.startTime && 
      tournamentForm.value.registrationDeadline && tournamentForm.value.registrationDeadlineTime) {
    try {
      const deadlineDateTime = new Date(`${tournamentForm.value.registrationDeadline}T${tournamentForm.value.registrationDeadlineTime}`);
      const startDateTime = new Date(`${tournamentForm.value.startDate}T${tournamentForm.value.startTime}`);
      
      if (isNaN(deadlineDateTime.getTime()) || isNaN(startDateTime.getTime())) {
        errors.value.registrationDeadline = errors.value.registrationDeadline || 'Invalid deadline date/time format';
        errors.value.startTime = errors.value.startTime || 'Invalid start date/time format';
        isValid = false;
      } else if (deadlineDateTime >= startDateTime) {
        errors.value.registrationDeadlineTime = 'Registration deadline must be strictly before the tournament start time';
        isValid = false;
      }
    } catch (e) {
       console.error("Date parsing error:", e);
       errors.value.registrationDeadline = errors.value.registrationDeadline || 'Invalid deadline date/time format';
       isValid = false; 
    }
  }

  if (tournamentForm.value.halfDuration < 10 || tournamentForm.value.halfDuration > 45) {
    errors.value.halfDuration = 'Half duration must be between 10 and 45 minutes'
    isValid = false
  }

  if (tournamentForm.value.breakDuration < 5 || tournamentForm.value.breakDuration > 15) {
    errors.value.breakDuration = 'Break duration must be between 5 and 15 minutes'
    isValid = false
  }

  if (tournamentForm.value.registrationFee === null || tournamentForm.value.registrationFee === undefined || tournamentForm.value.registrationFee < 0) {
    errors.value.registrationFee = 'Valid registration fee is required'
    isValid = false
  }

  // Prize Validation
  if (tournamentForm.value.prizes.first === null || tournamentForm.value.prizes.first === undefined || tournamentForm.value.prizes.first < 0) { // 1st prize is required
    errors.value.prizeFirst = '1st Place Prize is required and cannot be negative'
    isValid = false
  }
  if (tournamentForm.value.prizes?.second !== null && tournamentForm.value.prizes?.second < 0) { // 2nd is optional, but validate if present
    errors.value.prizeSecond = '2nd prize cannot be negative'
    isValid = false
  }
  if (tournamentForm.value.prizes?.third !== null && tournamentForm.value.prizes?.third < 0) { // 3rd is optional, but validate if present
    errors.value.prizeThird = '3rd prize cannot be negative'
    isValid = false
  }

  if (!tournamentForm.value.rules?.trim()) { // Rules are required
    errors.value.rules = 'Tournament rules are required'
    isValid = false
  }

  if (tournamentImages.value.length === 0) {
    errors.value.image = 'Tournament banner is required'
    isValid = false
  }

  return isValid
}

const handleCreateTournament = async () => {
  try {
    console.log('Starting tournament creation/update...');
    
    // Explicitly call validateForm and check return value
    if (!validateForm()) {
      console.log('Form validation failed:', errors.value);
      toast.error('Please fix the errors in the form.'); // Add toast notification
      return; 
    }

    isSubmitting.value = true;
    const formData = new FormData();

    // Add form fields to FormData
    Object.entries(tournamentForm.value).forEach(([key, value]) => {
      // Skip the prizes object itself, handle its fields individually
      if (key !== 'prizes' && value !== null && value !== undefined) {
        formData.append(key, value);
      }
    });

    // Append prizes fields explicitly 
    formData.append('prizes.first', tournamentForm.value.prizes.first ?? 0); 
    formData.append('prizes.second', tournamentForm.value.prizes.second ?? 0);
    formData.append('prizes.third', tournamentForm.value.prizes.third ?? 0);

    // Add banner only if it's a File object
    if (tournamentImages.value.length > 0) {
      const banner = tournamentImages.value[0];
      if (banner instanceof File) {
        formData.append('banner', banner);
      }
    }

    const url = editingTournamentId.value
      ? `${API_URL}/tournaments/${editingTournamentId.value}`
      : `${API_URL}/tournaments`;

    const method = editingTournamentId.value ? 'PUT' : 'POST';

    console.log('Sending request:', {
      url,
      method,
      editingId: editingTournamentId.value
    });

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to save tournament');
    }

    const result = await response.json();
    console.log('Tournament saved successfully:', result);

    await fetchTournaments();
    closeCreateTournamentModal();
  } catch (error) {
    console.error('Error saving tournament:', error);
    errors.value.submit = error.message;
  } finally {
    isSubmitting.value = false;
  }
};

const viewTournament = (tournament) => {
  selectedTournament.value = tournament
  showViewModal.value = true
}

const editTournament = (tournament) => {
  editingTournamentId.value = tournament._id;
  selectedTournament.value = tournament;
  
  tournamentForm.value = {
    name: tournament.name,
    description: tournament.description,
    startDate: tournament.startDate.split('T')[0], 
    endDate: tournament.endDate.split('T')[0],
    startTime: tournament.startTime,
    registrationDeadline: tournament.registrationDeadline.split('T')[0],
    registrationDeadlineTime: tournament.registrationDeadlineTime || '',
    halfDuration: tournament.halfDuration,
    breakDuration: tournament.breakDuration,
    format: tournament.format,
    minTeams: tournament.minTeams,
    maxTeams: tournament.maxTeams,
    teamSize: tournament.teamSize,
    substitutes: tournament.substitutes,
    registrationFee: tournament.registrationFee,
    rules: tournament.rules,
    prizes: {
      first: tournament.prizes?.first ?? null,
      second: tournament.prizes?.second ?? null,
      third: tournament.prizes?.third ?? null
    }
  };

  tournamentImages.value = tournament.banner ? [tournament.banner] : [];
  showCreateTournamentModal.value = true;
};

const deleteTournament = async (tournamentToDelete) => {
  if (!window.confirm(`Are you sure you want to delete the tournament "${tournamentToDelete.name}"? This action cannot be undone.`)) {
    return;
  }

  try {
    const response = await fetch(`${API_URL}/tournaments/${tournamentToDelete._id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to delete tournament');
    }

    await fetchTournaments();
  } catch (error) {
    console.error('Error deleting tournament:', error);
  }
};

const navigateToBracket = (tournament) => {
  if (!tournament || !tournament._id) {
    console.error('Cannot navigate to bracket: Invalid tournament data provided.', tournament);
    toast.error('Could not open bracket view for this tournament.');
    return;
  }

  // 1. Check if bracket is generated in the data we have
  if (tournament.bracket?.generated) {
    console.log('Bracket is generated, navigating...');
    router.push({ name: 'adminTournamentBracket', params: { id: tournament._id } });
    return;
  }

  // 2. If not generated, inform the user about the process.
  // The actual generation happens on the backend when viewing details after the deadline.
  toast.info('Bracket is not generated yet. Please view tournament details after the registration deadline passes to trigger generation (if minimum teams are met).');

};

const navigateToTeams = (tournament) => {
  if (tournament && tournament._id) {
    router.push({ name: 'AdminTournamentTeams', params: { id: tournament._id } });
  } else {
    console.error('Cannot navigate to teams view: Invalid tournament data.');
    toast.error('Could not open the teams view for this tournament.');
  }
};

onMounted(async () => {
  await fetchTournaments();
});

onUnmounted(() => {
  // Clear any potential leftover intervals if needed in the future
});
</script>