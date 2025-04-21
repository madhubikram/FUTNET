<template>
  <PageLayout>
    <!-- Enhanced Header with gradient background -->
    <div class="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 rounded-xl p-6 mb-8 shadow-lg">
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-3xl font-bold bg-gradient-to-r from-green-300 to-blue-400 bg-clip-text text-transparent">
            Dashboard Overview
          </h1>
          <p v-if="futsalName" class="text-gray-300 mt-1">
            {{ futsalName }} <span class="text-gray-500">• Today's insights</span>
          </p>
        </div>
        <div class="flex items-center gap-4">
          <span class="text-sm text-gray-400">
            {{ new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) }}
          </span>
          <NotificationBell />
        </div>
      </div>
    </div>

    <!-- Loading State with spinner -->
    <div v-if="loading" class="flex justify-center items-center text-gray-400 py-20">
      <svg class="animate-spin h-10 w-10 text-emerald-500 mr-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <p class="text-lg">Loading dashboard data...</p>
    </div>

    <!-- Enhanced Error State -->
    <div v-else-if="error" class="text-center text-red-400 bg-red-900/20 border border-red-900/50 p-6 rounded-xl shadow-lg">
      <p class="font-semibold text-lg mb-2">Error loading dashboard data</p>
      <p>{{ error }}</p>
      <button @click="retryFetchData" class="mt-4 px-4 py-2 bg-red-500/30 hover:bg-red-500/50 text-red-200 rounded-lg transition-colors">
        Retry
      </button>
    </div>

    <!-- Dashboard Content -->
    <div v-else>
      <!-- Enhanced KPI Cards Row with icons and improved styling -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div class="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl shadow-lg border border-gray-700/50 hover:border-green-500/30 transition-all duration-300 hover:-translate-y-1">
          <div class="flex justify-between items-start">
            <div>
              <h3 class="text-sm font-medium text-gray-400">Revenue Today</h3>
              <p class="mt-2 text-3xl font-bold bg-gradient-to-r from-green-300 to-green-400 bg-clip-text text-transparent">
                {{ formatCurrency(dashboardCounts.totalRevenueToday) }}
              </p>
            </div>
            <div class="p-3 bg-green-500/10 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <!-- Cash/Banknote icon -->
                <rect x="2" y="6" width="20" height="12" rx="2" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <line x1="12" y1="6" x2="12" y2="18" />
                <circle cx="12" cy="12" r="4" />
              </svg>
            </div>
          </div>
        </div>

        <div class="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl shadow-lg border border-gray-700/50 hover:border-blue-500/30 transition-all duration-300 hover:-translate-y-1">
          <div class="flex justify-between items-start">
            <div>
              <h3 class="text-sm font-medium text-gray-400">Bookings Today</h3>
              <p class="mt-2 text-3xl font-bold bg-gradient-to-r from-blue-300 to-blue-400 bg-clip-text text-transparent">
                {{ dashboardCounts.totalBookingsToday }}
              </p>
            </div>
            <div class="p-3 bg-blue-500/10 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div class="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl shadow-lg border border-gray-700/50 hover:border-purple-500/30 transition-all duration-300 hover:-translate-y-1">
          <div class="flex justify-between items-start">
            <div>
              <h3 class="text-sm font-medium text-gray-400">Upcoming Bookings</h3>
              <p class="mt-2 text-3xl font-bold bg-gradient-to-r from-purple-300 to-purple-400 bg-clip-text text-transparent">
                {{ dashboardCounts.upcomingBookingsCount }}
              </p>
            </div>
            <div class="p-3 bg-purple-500/10 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div class="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl shadow-lg border border-gray-700/50 hover:border-yellow-500/30 transition-all duration-300 hover:-translate-y-1">
          <div class="flex justify-between items-start">
            <div>
              <h3 class="text-sm font-medium text-gray-400">Active Tournaments</h3>
              <p class="mt-2 text-3xl font-bold bg-gradient-to-r from-yellow-300 to-yellow-400 bg-clip-text text-transparent">
                {{ dashboardCounts.activeTournamentsCount }}
              </p>
            </div>
            <div class="p-3 bg-yellow-500/10 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          </div>
        </div>

        <div class="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl shadow-lg border border-gray-700/50 hover:border-indigo-500/30 transition-all duration-300 hover:-translate-y-1">
          <div class="flex justify-between items-start">
            <div>
              <h3 class="text-sm font-medium text-gray-400">Upcoming Tournaments</h3>
              <p class="mt-2 text-3xl font-bold bg-gradient-to-r from-indigo-300 to-indigo-400 bg-clip-text text-transparent">
                {{ dashboardCounts.upcomingTournamentsCount }}
              </p>
            </div>
            <div class="p-3 bg-indigo-500/10 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          </div>
        </div>

        <div class="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl shadow-lg border border-gray-700/50 hover:border-cyan-500/30 transition-all duration-300 hover:-translate-y-1">
          <div class="flex justify-between items-start">
            <div>
              <h3 class="text-sm font-medium text-gray-400">Active Courts</h3>
              <p class="mt-2 text-3xl font-bold bg-gradient-to-r from-cyan-300 to-cyan-400 bg-clip-text text-transparent">
                {{ dashboardCounts.totalCourtsActive }}
              </p>
            </div>
            <div class="p-3 bg-cyan-500/10 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Charts Row 1 (Trends) - Enhanced styling -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <!-- Booking Trends Chart -->
        <div class="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl shadow-lg border border-gray-700/50">
          <h3 class="text-lg font-medium text-white mb-4 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
            Booking Trends (Last 7 Days)
          </h3>
          <div v-if="bookingTrendData.series && bookingTrendData.options" class="min-h-[350px]">
            <apexchart type="line" height="350" :options="bookingTrendData.options" :series="bookingTrendData.series"></apexchart>
          </div>
          <div v-else class="flex justify-center items-center min-h-[350px] text-gray-500">
            <svg class="animate-spin h-8 w-8 text-gray-400 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Loading chart data...</span>
          </div>
        </div>

        <!-- Revenue Trends Chart -->
        <div class="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl shadow-lg border border-gray-700/50">
          <h3 class="text-lg font-medium text-white mb-4 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <!-- Cash/Banknote icon -->
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <line x1="12" y1="6" x2="12" y2="18" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Revenue Trends (Last 7 Days)
          </h3>
          <div v-if="revenueTrendData.series && revenueTrendData.options" class="min-h-[350px]">
            <apexchart type="area" height="350" :options="revenueTrendData.options" :series="revenueTrendData.series"></apexchart>
          </div>
          <div v-else class="flex justify-center items-center min-h-[350px] text-gray-500">
            <svg class="animate-spin h-8 w-8 text-gray-400 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Loading chart data...</span>
          </div>
        </div>
      </div>

      <!-- Row 3 (Distributions & Tournament List) - Enhanced styling -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <!-- Booking Status Distribution Chart -->
        <div class="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl shadow-lg border border-gray-700/50">
          <h3 class="text-lg font-medium text-white mb-4 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
            Booking Status (Last 30 Days)
          </h3>
          <div v-if="bookingStatusData.series && bookingStatusData.options" class="min-h-[350px]">
            <apexchart type="donut" height="350" :options="bookingStatusData.options" :series="bookingStatusData.series"></apexchart>
          </div>
          <div v-else class="flex justify-center items-center min-h-[350px] text-gray-500">
            <svg class="animate-spin h-8 w-8 text-gray-400 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Loading chart data...</span>
          </div>
        </div>

        <!-- Payment Methods Distribution Chart -->
        <div class="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl shadow-lg border border-gray-700/50">
          <h3 class="text-lg font-medium text-white mb-4 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            Payment Methods (Last 30 Days)
          </h3>
          <div v-if="paymentMethodsData.series && paymentMethodsData.options" class="min-h-[350px]">
            <apexchart type="donut" height="350" :options="paymentMethodsData.options" :series="paymentMethodsData.series"></apexchart>
          </div>
          <div v-else class="flex justify-center items-center min-h-[350px] text-gray-500">
            <svg class="animate-spin h-8 w-8 text-gray-400 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Loading chart data...</span>
          </div>
        </div>

        <!-- Upcoming Tournaments List -->
        <div class="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl shadow-lg border border-gray-700/50">
          <h3 class="text-lg font-medium text-white mb-4 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Upcoming Tournaments
          </h3>
          <div v-if="upcomingTournamentsList.length > 0" class="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
            <div v-for="tournament in upcomingTournamentsList" :key="tournament._id" 
              class="bg-gray-700/50 p-4 rounded-lg border border-gray-600/50 hover:border-green-500/30 transition-all duration-300 hover:translate-x-1">
              <p class="font-semibold text-white text-base">{{ tournament.name }}</p>
              <div class="flex justify-between items-center mt-2">
                <p class="text-gray-300 text-sm flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {{ formatDate(tournament.startDate) }}
                </p>
                <p class="text-gray-400 text-sm bg-gray-800/50 px-2 py-1 rounded-full">
                  {{ tournament.registeredTeams || 0 }} / {{ tournament.maxTeams }} teams
                </p>
              </div>
              <p class="mt-2 text-xs text-gray-400 truncate">{{ tournament.description || 'No description available' }}</p>
            </div>
          </div>
          <div v-else class="flex flex-col justify-center items-center min-h-[250px] text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mb-3 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p>No upcoming tournaments scheduled</p>
            <button class="mt-4 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-sm transition-colors">
              Create Tournament
            </button>
          </div>
        </div>
      </div>
    </div>

  </PageLayout>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import PageLayout from '@/components/layout/PageLayout.vue'
import NotificationBell from '@/components/features/NotificationBell.vue'
import { format } from 'date-fns'; // Import date-fns format function
import {
  getDashboardCounts,
  getBookingTrends,
  getRevenueTrends,
  getBookingStatusDistribution,
  getPaymentMethodsDistribution,
  getUpcomingTournamentsList // Import new service function
} from '@/services/dashboard.service.js'
import { useAuthStore } from '@/composables/useAuthStore'

const authStore = useAuthStore();
const dashboardCounts = ref({});
const bookingTrendsRaw = ref([]);
const revenueTrendsRaw = ref([]);
const bookingStatusRaw = ref([]);
const paymentMethodsRaw = ref([]);
const upcomingTournamentsList = ref([]); // State for tournament list
const loading = ref(true);
const error = ref(null);

const futsalName = computed(() => authStore.user?.futsalName || null);

// Helper for common chart options
const baseChartOptions = (title, categories = []) => ({
  chart: {
    height: 350,
    zoom: { enabled: false },
    toolbar: { show: false },
    foreColor: '#9CA3AF' // text-gray-400
  },
  dataLabels: {
    enabled: false
  },
  stroke: {
    curve: 'smooth',
    width: 2
  },
  title: {
    text: title,
    align: 'left',
    style: { color: '#FFFFFF' } // text-white
  },
  grid: {
    borderColor: '#374151', // text-gray-700
    row: { colors: ['transparent', 'transparent'], opacity: 0.5 },
  },
  xaxis: {
    categories: categories,
    labels: { style: { colors: '#9CA3AF' } }
  },
  yaxis: {
    labels: { style: { colors: '#9CA3AF' } }
  },
  tooltip: {
    theme: 'dark'
  }
});

// Helper for common Pie/Donut options
const basePieOptions = (title, labels = []) => ({
  chart: {
    height: 350,
    foreColor: '#9CA3AF' // text-gray-400
  },
  labels: labels,
  title: {
    text: title,
    align: 'left',
    style: { color: '#FFFFFF' } // text-white
  },
  tooltip: {
    theme: 'dark'
  },
  legend: {
    position: 'bottom'
  },
  // Optional: Define a consistent color palette
  // colors: ['#34D399', '#60A5FA', '#FBBF24', '#F87171', '#A78BFA', '#FB923C']
});

// Booking Trend Chart
const bookingTrendData = computed(() => {
  if (!bookingTrendsRaw.value || bookingTrendsRaw.value.length === 0) return { options: null, series: null };
  return {
    series: [{
      name: 'Bookings',
      data: bookingTrendsRaw.value.map(item => item.count)
    }],
    options: {
      ...baseChartOptions('Daily Bookings', bookingTrendsRaw.value.map(item => item.date)),
      chart: { ...baseChartOptions().chart, type: 'line' },
      colors: ['#34D399'] // Emerald-400
    }
  }
});

// Revenue Trend Chart
const revenueTrendData = computed(() => {
  if (!revenueTrendsRaw.value || revenueTrendsRaw.value.length === 0) return { options: null, series: null };
  return {
    series: [{
      name: 'Revenue (NPR)',
      data: revenueTrendsRaw.value.map(item => item.revenue)
    }],
    options: {
      ...baseChartOptions('Daily Revenue (Paid Bookings)', revenueTrendsRaw.value.map(item => item.date)),
      chart: { ...baseChartOptions().chart, type: 'area' }, // Use area type
      colors: ['#60A5FA'], // Blue-400
      yaxis: { // Customize y-axis for currency
        labels: {
          style: { colors: '#9CA3AF' },
          formatter: (value) => { return `रू ${value}` }
        }
      },
       tooltip: {
        theme: 'dark',
        y: { formatter: (value) => `रू ${value}` }
      }
    }
  }
});

// Booking Status Distribution Chart
const bookingStatusData = computed(() => {
  if (!bookingStatusRaw.value || bookingStatusRaw.value.length === 0) return { options: null, series: null };
  const labels = bookingStatusRaw.value.map(item => item.status);
  const series = bookingStatusRaw.value.map(item => item.count);
  return {
    series: series,
    options: {
      ...basePieOptions('Booking Statuses (Last 30 Days)', labels),
      chart: { ...basePieOptions().chart, type: 'donut' },
       plotOptions: {
        pie: {
          donut: {
             labels: {
              show: true,
              total: {
                showAlways: true,
                show: true,
                label: 'Total Bookings'
              }
            }
          }
        }
      },
      tooltip: { y: { formatter: (value) => `${value} bookings` } }
    }
  }
});

// Payment Methods Distribution Chart
const paymentMethodsData = computed(() => {
  if (!paymentMethodsRaw.value || paymentMethodsRaw.value.length === 0) return { options: null, series: null };
  const labels = paymentMethodsRaw.value.map(item => item.method);
  const series = paymentMethodsRaw.value.map(item => item.count);
  return {
    series: series,
    options: {
      ...basePieOptions('Payment Methods (Paid Bookings - Last 30 Days)', labels),
      chart: { ...basePieOptions().chart, type: 'donut' },
      plotOptions: {
        pie: {
          donut: {
             labels: {
              show: true,
              total: {
                showAlways: true,
                show: true,
                label: 'Total Payments'
              }
            }
          }
        }
      },
      tooltip: { y: { formatter: (value) => `${value} payments` } }
    }
  }
});

// Helper function for currency formatting
const formatCurrency = (value) => {
  // Use simple Rs format instead of Intl.NumberFormat
  return `रू ${(value || 0).toLocaleString('ne-NP')}`;
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    return format(new Date(dateString), 'MMM d, yyyy'); // e.g., Apr 20, 2025
  } catch (error) {
    console.error("Error formatting date:", dateString, error);
    return dateString; // Fallback to original string
  }
};

// Add the retry function right after formatDate
const retryFetchData = () => {
  loading.value = true;
  error.value = null;
  fetchDashboardData();
};

// Create a dedicated function for fetching dashboard data
const fetchDashboardData = async () => {
  try {
    // Fetch all data in parallel
    const [counts, trends, revenue, statusDist, paymentsDist, tournamentsList] = await Promise.all([
      getDashboardCounts(),
      getBookingTrends(),
      getRevenueTrends(),
      getBookingStatusDistribution(),
      getPaymentMethodsDistribution(),
      getUpcomingTournamentsList() // Fetch tournament list
    ]);
    dashboardCounts.value = counts;
    bookingTrendsRaw.value = trends;
    revenueTrendsRaw.value = revenue;
    bookingStatusRaw.value = statusDist;
    paymentMethodsRaw.value = paymentsDist;
    upcomingTournamentsList.value = tournamentsList; // Store tournament list

    console.log("Dashboard Counts:", counts);
    console.log("Booking Trends:", trends);
    console.log("Revenue Trends:", revenue);
    console.log("Booking Status Distribution:", statusDist);
    console.log("Payment Methods Distribution:", paymentsDist);
    console.log("Upcoming Tournaments List:", tournamentsList);

  } catch (err) {
    error.value = err.response?.data?.message || err.message || 'Failed to load some dashboard data';
    console.error("Dashboard Load Error:", err);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchDashboardData();
});

</script>

<style scoped>
/* Enhanced styles */
.min-h-\[350px\] {
  min-height: 350px;
}

.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: rgba(75, 85, 99, 0.5) rgba(31, 41, 55, 0.7);
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(31, 41, 55, 0.7);
  border-radius: 10px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(75, 85, 99, 0.5);
  border-radius: 10px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: rgba(99, 102, 241, 0.5);
}
</style>