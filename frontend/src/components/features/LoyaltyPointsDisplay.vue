<template>
    <div class="relative group">
      <div class="flex items-center space-x-2 cursor-pointer"
           @click="showDetails = !showDetails">
        <div class="relative">
          <MedalIcon class="w-6 h-6 text-purple-400" />
          <span class="absolute -top-2 -right-2 bg-purple-500 text-xs text-white rounded-full px-1.5 py-0.5">
            {{ formattedPoints }}
          </span>
        </div>
        <span class="text-sm text-gray-300">Points</span>
      </div>
  
      <!-- Detailed Points Panel -->
      <div v-if="showDetails"
           class="absolute right-0 mt-2 w-64 bg-gray-800 rounded-lg shadow-xl p-4 z-50">
        <div class="space-y-4">
          <div class="flex justify-between items-center">
            <h3 class="text-white font-medium">Your Points</h3>
            <button @click="showDetails = false" class="text-gray-400 hover:text-white">
              <XIcon class="w-4 h-4" />
            </button>
          </div>
  
          <div class="bg-purple-500/10 rounded-lg p-3 border border-purple-500/20">
            <div class="text-center">
              <p class="text-2xl font-bold text-purple-400">{{ formattedPoints }}</p>
              <p class="text-sm text-purple-300">Available Points</p>
            </div>
          </div>
  
          <div class="space-y-2">
            <p class="text-sm text-gray-400">Recent Activity</p>
            <div v-if="loading" class="text-center py-2">
              <Loader2Icon class="w-5 h-5 text-purple-400 animate-spin mx-auto" />
            </div>
            <div v-else-if="history.length === 0" class="text-center py-2">
              <p class="text-sm text-gray-500">No recent activity</p>
            </div>
            <div v-else class="space-y-2">
              <div v-for="transaction in recentHistory" 
                   :key="transaction._id"
                   class="flex justify-between items-center text-sm">
                <div>
                  <p class="text-gray-300">{{ transaction.description }}</p>
                  <p class="text-xs text-gray-500">
                    {{ formatDate(transaction.date) }}
                  </p>
                </div>
                <span :class="[
                  'font-medium',
                  transaction.type === 'earn' ? 'text-green-400' : 'text-red-400'
                ]">
                  {{ transaction.type === 'earn' ? '+' : '-' }}{{ transaction.points }}
                </span>
              </div>
            </div>
          </div>
  
          <button 
            @click="viewAllHistory"
            class="w-full px-3 py-2 bg-purple-500/10 text-purple-400 rounded-lg 
                   hover:bg-purple-500/20 transition-colors text-sm">
            View All History
          </button>
        </div>
      </div>
    </div>

    <!-- Full History Modal -->
    <div v-if="showHistoryModal" 
         class="fixed inset-0 z-50 overflow-y-auto" 
         role="dialog"
         @click.self="showHistoryModal = false">
      <!-- Backdrop -->
      <div class="fixed inset-0 bg-black bg-opacity-50 transition-opacity"></div>

      <!-- Modal -->
      <div class="flex min-h-screen items-center justify-center p-4">
        <div class="relative bg-gray-800 rounded-xl max-w-xl w-full shadow-xl p-4">
          <!-- Header -->
          <div class="flex items-center justify-between border-b border-gray-700 pb-4 mb-4">
            <h2 class="text-lg font-bold text-white">Loyalty Points History</h2>
            <button @click="showHistoryModal = false" class="text-gray-400 hover:text-white">
              <XIcon class="w-5 h-5" />
            </button>
          </div>

          <!-- Body -->
          <div class="max-h-[60vh] overflow-y-auto">
            <div v-if="loading" class="text-center py-10">
              <Loader2Icon class="w-8 h-8 text-purple-400 animate-spin mx-auto" />
              <p class="mt-2 text-gray-400">Loading your points history...</p>
            </div>
            <div v-else-if="history.length === 0" class="text-center py-10">
              <p class="text-gray-400">No transaction history found</p>
            </div>
            <div v-else class="space-y-3">
              <div v-for="transaction in paginatedHistory" 
                   :key="transaction._id"
                   class="bg-gray-700/50 rounded-lg p-3 flex justify-between items-center">
                <div>
                  <p class="text-white font-medium">{{ transaction.description }}</p>
                  <p class="text-xs text-gray-400 mt-1">
                    {{ formatDate(transaction.date) }}
                  </p>
                </div>
                <span :class="[
                  'font-bold text-lg',
                  transaction.type === 'earn' || transaction.type === 'credit' ? 'text-green-400' : 'text-red-400'
                ]">
                  {{ transaction.type === 'earn' || transaction.type === 'credit' ? '+' : '-' }}{{ transaction.points }}
                </span>
              </div>
            </div>
          </div>

          <!-- Pagination -->
          <div class="flex justify-center space-x-2 mt-4 pt-4 border-t border-gray-700">
            <button 
              @click="currentPage = Math.max(1, currentPage - 1)" 
              :disabled="currentPage === 1"
              :class="[
                'px-3 py-1 rounded',
                currentPage === 1 ? 'bg-gray-700 text-gray-500' : 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
              ]"
            >
              Previous
            </button>
            <span class="px-3 py-1 bg-gray-700 rounded text-white">
              {{ currentPage }} / {{ totalPages }}
            </span>
            <button 
              @click="currentPage = Math.min(totalPages, currentPage + 1)" 
              :disabled="currentPage === totalPages"
              :class="[
                'px-3 py-1 rounded',
                currentPage === totalPages ? 'bg-gray-700 text-gray-500' : 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
              ]"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted, computed } from 'vue'
  import { MedalIcon, XIcon, Loader2Icon } from 'lucide-vue-next'
  import { useLoyaltyPoints } from '@/composables/useLoyaltyPoints'
  import { useTimeFormatting } from '@/composables/useTimeFormatting'
  
  const {formattedPoints, history, loading, fetchPoints, fetchHistory } = useLoyaltyPoints()
  const { formatDate } = useTimeFormatting()
  const showDetails = ref(false)
  const showHistoryModal = ref(false)
  
  // Pagination
  const currentPage = ref(1)
  const itemsPerPage = 10
  
  const totalPages = computed(() => {
    return Math.max(1, Math.ceil(history.value.length / itemsPerPage))
  })
  
  const paginatedHistory = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage
    const end = start + itemsPerPage
    return history.value.slice(start, end)
  })
  
  const recentHistory = computed(() => {
    return history.value.slice(0, 5)
  })
  
  const viewAllHistory = () => {
    // Show modal with full history instead of navigating
    showHistoryModal.value = true
    showDetails.value = false
  }
  
  onMounted(async () => {
    await fetchPoints()
    await fetchHistory()
  })
  </script>