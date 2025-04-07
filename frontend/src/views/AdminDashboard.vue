<template>
  <PageLayout>
    <!-- Header -->
    <div class="flex justify-between items-center mb-8">
      <div>
        <h1 class="text-2xl font-bold text-white">Dashboard</h1>
        <p class="text-gray-400">{{ futsalName }}</p>
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <!-- Today's Bookings -->
      <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div class="flex justify-between items-start mb-4">
          <div class="p-2 bg-blue-500/10 rounded-lg">
            <CalendarDaysIcon class="w-6 h-6 text-blue-500" />
          </div>
          <span class="text-sm text-gray-400">Today</span>
        </div>
        <h3 class="text-2xl font-bold text-white mb-1">12</h3>
        <p class="text-gray-400 text-sm">Bookings Today</p>
      </div>

      <!-- Revenue -->
      <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div class="flex justify-between items-start mb-4">
          <div class="p-2 bg-green-500/10 rounded-lg">
            <DollarSignIcon class="w-6 h-6 text-green-500" />
          </div>
          <span class="text-sm text-gray-400">This Month</span>
        </div>
        <h3 class="text-2xl font-bold text-white mb-1">Rs.45,850</h3>
        <p class="text-gray-400 text-sm">Total Revenue</p>
      </div>

      <!-- Total Courts -->
      <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div class="flex justify-between items-start mb-4">
          <div class="p-2 bg-purple-500/10 rounded-lg">
            <LayoutIcon class="w-6 h-6 text-purple-500" />
          </div>
          <span class="text-sm text-gray-400">Active</span>
        </div>
        <h3 class="text-2xl font-bold text-white mb-1">3</h3>
        <p class="text-gray-400 text-sm">Total Courts</p>
      </div>

      <!-- Reviews -->
      <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div class="flex justify-between items-start mb-4">
          <div class="p-2 bg-yellow-500/10 rounded-lg">
            <StarIcon class="w-6 h-6 text-yellow-500" />
          </div>
          <span class="text-sm text-gray-400">Rating</span>
        </div>
        <h3 class="text-2xl font-bold text-white mb-1">4.8</h3>
        <p class="text-gray-400 text-sm">Average Rating</p>
      </div>
    </div>

    <!-- Bookings Section -->
    <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <!-- Today's Schedule -->
      <div class="xl:col-span-2 bg-gray-800 rounded-xl p-6">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-xl font-semibold text-white">Today's Schedule</h2>
          <button class="text-gray-400 hover:text-white">
            <MoreVerticalIcon class="w-5 h-5" />
          </button>
        </div>

        <!-- Schedule Timeline -->
        <div class="space-y-4">
          <div v-for="booking in todayBookings" :key="booking.id" 
               class="flex items-center p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors">
            <div class="flex-shrink-0 w-16 text-center">
              <span class="text-gray-400 text-sm">{{ booking.time }}</span>
            </div>
            <div class="ml-4 flex-grow">
              <h4 class="text-white font-medium">{{ booking.customerName }}</h4>
              <p class="text-gray-400 text-sm">Court {{ booking.court }}</p>
            </div>
            <div class="flex-shrink-0">
              <span :class="{
                'px-3 py-1 rounded-full text-xs font-medium': true,
                'bg-green-500/10 text-green-500': booking.status === 'Confirmed',
                'bg-yellow-500/10 text-yellow-500': booking.status === 'Pending',
                'bg-purple-500/10 text-purple-500': booking.status === 'In Progress'
              }">
                {{ booking.status }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="bg-gray-800 rounded-xl p-6">
        <h2 class="text-xl font-semibold text-white mb-6">Recent Activity</h2>
        <div class="space-y-4">
          <div v-for="activity in recentActivities" :key="activity.id" 
               class="flex items-start space-x-4">
            <div :class="`p-2 rounded-lg ${activity.iconBg}`">
              <component :is="activity.icon" class="w-5 h-5" :class="activity.iconColor" />
            </div>
            <div class="flex-grow">
              <p class="text-white">{{ activity.message }}</p>
              <span class="text-sm text-gray-400">{{ activity.time }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </PageLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import PageLayout from '@/components/layout/PageLayout.vue'
import { 
  CalendarDaysIcon, DollarSignIcon, LayoutIcon, StarIcon,
  MoreVerticalIcon, CheckCircleIcon, ClockIcon
} from 'lucide-vue-next'

const futsalName = ref('Futsal Dashboard') // Placeholder

// Function to fetch admin details (including futsal name)
const fetchAdminDetails = async () => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    console.log('No token found, cannot fetch admin details.');
    return; // Keep placeholder
  }

  try {
    const response = await fetch('http://localhost:5000/api/profile', { 
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      console.error('Failed to fetch admin profile:', response.status, response.statusText);
      return; // Keep placeholder on error
    }

    const userData = await response.json();
    
    // Access nested user, then futsal, then name
    if (userData && userData.user && userData.user.futsal && userData.user.futsal.name) {
       futsalName.value = userData.user.futsal.name;
    } else {
       console.log('Futsal name not found in API response.');
       // Keep placeholder or set a different default if needed
    }
    
  } catch (err) {
    console.error('Error fetching admin profile:', err);
    // Keep placeholder on error
  }
};

onMounted(() => {
  // Fetch admin details on mount
  fetchAdminDetails();
});

// Mock data for today's bookings
const todayBookings = ref([
  {
    id: 1,
    time: '10:00 AM',
    customerName: 'John Team',
    court: 'A',
    status: 'Confirmed'
  },
  {
    id: 2,
    time: '11:30 AM',
    customerName: 'Mike Team',
    court: 'B',
    status: 'In Progress'
  },
  {
    id: 3,
    time: '1:00 PM',
    customerName: 'Sarah Team',
    court: 'A',
    status: 'Pending'
  },
  {
    id: 4,
    time: '2:30 PM',
    customerName: 'David Team',
    court: 'C',
    status: 'Confirmed'
  }
])

// Mock data for recent activities
const recentActivities = ref([
  {
    id: 1,
    message: 'New booking confirmed for Court A',
    time: '2 minutes ago',
    icon: CheckCircleIcon,
    iconBg: 'bg-green-500/10',
    iconColor: 'text-green-500'
  },
  {
    id: 2,
    message: 'Payment received from Team Eagles',
    time: '15 minutes ago',
    icon: DollarSignIcon,
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-500'
  },
  {
    id: 3,
    message: 'Court B maintenance scheduled',
    time: '1 hour ago',
    icon: ClockIcon,
    iconBg: 'bg-yellow-500/10',
    iconColor: 'text-yellow-500'
  },
  {
    id: 4,
    message: 'New review received - 5 stars',
    time: '2 hours ago',
    icon: StarIcon,
    iconBg: 'bg-purple-500/10',
    iconColor: 'text-purple-500'
  }
])
</script>