<template>
  <PageLayout>
    <!-- Header -->
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
      <div>
        <h1 class="text-2xl font-bold text-white">Bookings Management</h1>
        <p class="text-gray-400">Manage all court bookings</p>
      </div>
      <div class="mt-4 md:mt-0 flex space-x-3">
        <button @click="refreshBookings" class="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center gap-2 transition-colors duration-200">
          <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': isLoading }" />
          <span>Refresh</span>
        </button>
      </div>
    </div>

    <!-- Filters Section -->
    <div class="bg-gray-800 rounded-xl p-4 mb-6 border border-gray-700">
      <div class="flex justify-between items-center">
        <h2 class="text-lg font-medium text-white">Filters</h2>
        <button 
          @click="toggleFilters" 
          class="px-3 py-1 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center"
        >
          <span class="mr-1">{{ showFilters ? 'Hide Filters' : 'Show Filters' }}</span>
          <ChevronDown v-if="!showFilters" class="w-4 h-4" />
          <ChevronUp v-else class="w-4 h-4" />
        </button>
      </div>

      <div v-if="showFilters" class="mt-4 grid grid-cols-1 md:grid-cols-5 gap-4">
        <!-- Status Filter -->
        <div>
          <label class="block text-sm font-medium text-gray-400 mb-1">Booking Status</label>
          <select v-model="filters.status" class="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent">
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <!-- Payment Status Filter -->
        <div>
          <label class="block text-sm font-medium text-gray-400 mb-1">Payment Status</label>
          <select v-model="filters.paymentStatus" class="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent">
            <option value="all">All Payment Statuses</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
            <option value="refunded">Refunded</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <!-- Court Filter -->
        <div>
          <label class="block text-sm font-medium text-gray-400 mb-1">Court</label>
          <select v-model="filters.courtId" class="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent">
            <option value="">All Courts</option>
            <option v-for="court in courts" :key="court._id" :value="court._id">
              {{ court.name }}
            </option>
          </select>
        </div>

        <!-- Date Range Filters -->
        <div>
          <label class="block text-sm font-medium text-gray-400 mb-1">Start Date</label>
          <input
            type="date"
            v-model="filters.startDate"
            class="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-400 mb-1">End Date</label>
          <input
            type="date"
            v-model="filters.endDate"
            class="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>

        <!-- Action Buttons -->
        <div class="flex flex-col md:flex-row items-stretch md:items-end gap-2 md:space-x-2">
          <button
            @click="applyFilters"
            class="w-full md:w-auto px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center gap-2 transition-colors duration-200"
          >
            <FilterX class="w-4 h-4" />
            Apply Filters
          </button>
          <button
            @click="resetFilters"
            class="w-full md:w-auto px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
          >
            <RefreshCcw class="w-4 h-4" />
            Reset
          </button>
        </div>
      </div>
    </div>

    <!-- Sort Options -->
    <div class="bg-gray-800 rounded-xl p-4 mb-6 border border-gray-700">
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center">
        <h2 class="text-lg font-medium text-white mb-2 md:mb-0">Sort Options</h2>
        <div class="flex flex-wrap gap-2">
          <button 
            @click="sortBookings('date', 'desc')" 
            class="px-6 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2"
            :class="sortBy === 'date' && sortOrder === 'desc' ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-gray-700 text-white hover:bg-gray-600'"
          >
            <ArrowDownAZ class="w-4 h-4" />
            Newest First
          </button>
          <button 
            @click="sortBookings('date', 'asc')" 
            class="px-6 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2"
            :class="sortBy === 'date' && sortOrder === 'asc' ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-gray-700 text-white hover:bg-gray-600'"
          >
            <ArrowUpAZ class="w-4 h-4" />
            Oldest First
          </button>
          <button 
            @click="sortBookings('paymentStatus', 'asc')" 
            class="px-6 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2"
            :class="sortBy === 'paymentStatus' && sortOrder === 'asc' ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-gray-700 text-white hover:bg-gray-600'"
          >
            <CreditCard class="w-4 h-4" />
            Payment Pending
          </button>
          <button 
            @click="sortBookings('status', 'asc')" 
            class="px-6 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2"
            :class="sortBy === 'status' && sortOrder === 'asc' ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-gray-700 text-white hover:bg-gray-600'"
          >
            <Clock class="w-4 h-4" />
            Status Pending
          </button>
        </div>
      </div>
    </div>

    <!-- Booking Table Section -->
    <div class="bg-gray-800 rounded-xl overflow-hidden border border-gray-700">
      <div v-if="isLoading" class="flex justify-center items-center py-20">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>

      <div v-else-if="bookings.length === 0" class="py-20 text-center">
        <h3 class="text-xl text-gray-400">No bookings found</h3>
        <p class="text-gray-500 mt-2">Try adjusting your filters</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-900">
            <tr>
              <th class="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Court</th>
              <th class="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Date & Time</th>
              <th class="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Player</th>
              <th class="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Contact</th>
              <th class="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Status</th>
              <th class="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Payment</th>
              <th class="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-700">
            <tr v-for="booking in bookings" :key="booking._id" class="hover:bg-gray-700 transition-colors">
              <td class="px-6 py-4">
                <div class="text-sm font-medium text-white">{{ booking.courtDetails?.name || booking.court?.name || 'N/A' }}</div>
              </td>
              <td class="px-6 py-4">
                <div class="text-sm font-medium text-white">{{ booking.date ? formatDate(booking.date) : 'N/A' }}</div>
                <div class="text-xs text-gray-400">{{ booking.startTime }} - {{ booking.endTime }}</div>
              </td>
              <td class="px-6 py-4">
                <div class="text-sm font-medium text-white">
                  {{ booking.userDetails?.name || booking.user?.name || booking.userName || 'N/A' }}
                </div>
                <div class="text-xs text-gray-400">
                  {{ booking.userDetails?.email || booking.user?.email || booking.userEmail || 'N/A' }}
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="text-sm text-white">
                  {{ booking.userDetails?.phone || booking.user?.phone || booking.userPhone || 'N/A' }}
                </div>
              </td>
              <td class="px-6 py-4">
                <span :class="{
                  'px-2 py-1 text-xs font-medium rounded-full': true,
                  'bg-yellow-500/20 text-yellow-400': booking.status === 'pending',
                  'bg-emerald-500/20 text-emerald-400': booking.status === 'confirmed',
                  'bg-blue-500/20 text-blue-400': booking.status === 'completed',
                  'bg-red-500/20 text-red-400': booking.status === 'cancelled'
                }">
                  {{ capitalizeFirstLetter(booking.status) }}
                </span>
              </td>
              <td class="px-6 py-4">
                <span :class="{
                  'px-2 py-1 text-xs font-medium rounded-full': true,
                  'bg-yellow-500/20 text-yellow-400': booking.paymentStatus === 'pending',
                  'bg-emerald-500/20 text-emerald-400': booking.paymentStatus === 'paid',
                  'bg-blue-500/20 text-blue-400': booking.paymentStatus === 'refunded',
                  'bg-gray-500/20 text-gray-400': booking.paymentStatus === 'unpaid',
                  'bg-red-500/20 text-red-400': booking.paymentStatus === 'failed'
                }">
                  {{ capitalizeFirstLetter(booking.paymentStatus) }}
                </span>
              </td>
              <td class="px-6 py-4">
                <div class="flex space-x-2">
                  <!-- Status Actions -->
                  <button 
                    v-if="booking.status === 'pending'" 
                    @click="updateBookingStatus(booking._id, 'confirmed')"
                    class="p-1 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/40 transition-colors"
                    title="Confirm Booking"
                  >
                    Confirm
                  </button>
                  
                  <!-- Payment Actions -->
                  <button 
                    v-if="booking.paymentStatus === 'pending' || booking.paymentStatus === 'unpaid'" 
                    @click="updatePaymentStatus(booking._id, 'paid')"
                    class="p-1 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/40 transition-colors"
                    title="Mark as Paid"
                  >
                    Mark Paid
                  </button>
                  
                  <!-- Reschedule and Cancel Buttons -->
                  <button 
                    v-if="['pending', 'confirmed'].includes(booking.status)"
                    @click="showRescheduleModal(booking)"
                    class="p-1 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/40 transition-colors"
                    title="Reschedule Booking"
                  >
                    Reschedule
                  </button>
                  
                  <button 
                    v-if="['pending', 'confirmed'].includes(booking.status)" 
                    @click="cancelBooking(booking._id)"
                    class="p-1 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/40 transition-colors"
                    title="Cancel Booking"
                  >
                    Cancel
                  </button>
                  
                  <!-- Delete Button -->
                  <button 
                    @click="deleteBooking(booking._id)"
                    class="p-1 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/40 transition-colors"
                    title="Delete Booking"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Cancel Booking Modal -->
    <div v-if="showModal && modalType === 'cancel'" class="fixed inset-0 flex items-center justify-center z-50">
      <div class="absolute inset-0 bg-black bg-opacity-50" @click="closeModal"></div>
      <div class="relative bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700 shadow-xl">
        <h3 class="text-xl font-bold text-white mb-4">Cancel Booking</h3>
        <p class="text-gray-300 mb-4">Are you sure you want to cancel this booking? This action cannot be undone.</p>
        
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-400 mb-1">Cancellation Reason</label>
          <textarea
            v-model="cancelReason"
            class="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            rows="3"
          ></textarea>
        </div>
        
        <div class="flex justify-end space-x-3">
          <button
            @click="closeModal"
            class="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            @click="confirmCancel"
            class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            :disabled="isSubmitting"
          >
            <span v-if="isSubmitting" class="flex items-center space-x-2">
              <span>Processing...</span>
            </span>
            <span v-else>Confirm Cancellation</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Reschedule Booking Modal -->
    <div v-if="showModal && modalType === 'reschedule'" class="fixed inset-0 flex items-center justify-center z-50">
      <div class="absolute inset-0 bg-black bg-opacity-50" @click="closeModal"></div>
      <div class="relative bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700 shadow-xl">
        <h3 class="text-xl font-bold text-white mb-4">Reschedule Booking</h3>
        <p class="text-gray-300 mb-4">Update the date and time for this booking.</p>
        
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-400 mb-1">Date</label>
          <input
            type="date"
            v-model="rescheduleData.date"
            class="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        
        <div class="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label class="block text-sm font-medium text-gray-400 mb-1">Start Time</label>
            <input
              type="time"
              v-model="rescheduleData.startTime"
              class="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-400 mb-1">End Time</label>
            <input
              type="time"
              v-model="rescheduleData.endTime"
              class="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>
        
        <div class="flex justify-end space-x-3">
          <button
            @click="closeModal"
            class="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            @click="confirmReschedule"
            class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            :disabled="isSubmitting"
          >
            <span v-if="isSubmitting" class="flex items-center space-x-2">
              <span>Processing...</span>
            </span>
            <span v-else>Confirm Reschedule</span>
          </button>
        </div>
      </div>
    </div>
  </PageLayout>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useToast } from 'vue-toastification';
import axios from 'axios';
import { 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  FilterX, 
  RefreshCcw, 
  ArrowDownAZ, 
  ArrowUpAZ, 
  Clock, 
  CreditCard
} from 'lucide-vue-next';
import PageLayout from '@/components/layout/PageLayout.vue';

// State
const bookings = ref([])
const courts = ref([])
const isLoading = ref(false)
const isSubmitting = ref(false)
const toast = useToast()
const showFilters = ref(false)
const sortBy = ref('date')
const sortOrder = ref('desc')

// Filters
const filters = reactive({
  status: 'all',
  paymentStatus: 'all',
  startDate: '',
  endDate: '',
  courtId: ''
})

// Modal state
const showModal = ref(false)
const modalType = ref(null)
const selectedBooking = ref(null)
const cancelReason = ref('')
const rescheduleData = reactive({
  date: '',
  startTime: '',
  endTime: ''
})

// Initialize
onMounted(async () => {
  await fetchCourts()
  fetchBookings() // Initial fetch without filters
})

// Methods
const fetchBookings = async () => {
  isLoading.value = true
  try {
    // Without filters, just fetch all bookings
    const response = await axios.get('/api/bookings/admin')
    bookings.value = response.data.map(booking => ({
      ...booking,
      showActions: false
    }))
  } catch (error) {
    console.error('Error fetching bookings:', error)
    toast.error('Failed to load bookings')
  } finally {
    isLoading.value = false
  }
}

const applyFilters = async () => {
  isLoading.value = true
  try {
    const queryParams = new URLSearchParams()
    
    if (filters.status !== 'all') {
      queryParams.append('status', filters.status)
    }
    
    if (filters.paymentStatus !== 'all') {
      queryParams.append('paymentStatus', filters.paymentStatus)
    }
    
    if (filters.startDate) {
      queryParams.append('startDate', filters.startDate)
    }
    
    if (filters.endDate) {
      queryParams.append('endDate', filters.endDate)
    }
    
    if (filters.courtId) {
      queryParams.append('courtId', filters.courtId)
    }
    
    const response = await axios.get(`/api/bookings/admin?${queryParams.toString()}`)
    bookings.value = response.data.map(booking => ({
      ...booking,
      showActions: false
    }))
  } catch (error) {
    console.error('Error applying filters:', error)
    toast.error('Failed to apply filters')
  } finally {
    isLoading.value = false
  }
}

const resetFilters = () => {
  filters.status = 'all'
  filters.paymentStatus = 'all'
  filters.startDate = ''
  filters.endDate = ''
  filters.courtId = ''
  fetchBookings()
}

const refreshBookings = () => {
  fetchBookings()
}

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

const capitalizeFirstLetter = (string) => {
  if (!string) return '';
  return string.charAt(0).toUpperCase() + string.slice(1);
}

const updatePaymentStatus = async (id, status) => {
  isSubmitting.value = true
  try {
    await axios.put(
      `/api/bookings/admin/${id}/payment-status`,
      { paymentStatus: status },
      { withCredentials: true }
    )
    toast.success(`Payment status updated to ${status}`)
    fetchBookings()
  } catch (error) {
    console.error('Error updating payment status:', error)
    toast.error('Failed to update payment status')
  } finally {
    isSubmitting.value = false
  }
}

const updateBookingStatus = async (id, status) => {
  isSubmitting.value = true
  try {
    await axios.put(
      `/api/bookings/admin/${id}/status`,
      { status },
      { withCredentials: true }
    )
    toast.success(`Booking status updated to ${status}`)
    fetchBookings()
  } catch (error) {
    console.error('Error updating booking status:', error)
    toast.error('Failed to update booking status')
  } finally {
    isSubmitting.value = false
  }
}

const deleteBooking = async (id) => {
  if (!confirm('Are you sure you want to delete this booking? This action cannot be undone.')) {
    return
  }
  
  isSubmitting.value = true
  try {
    await axios.delete(`/api/bookings/admin/${id}`, { withCredentials: true })
    toast.success('Booking deleted successfully')
    fetchBookings()
  } catch (error) {
    console.error('Error deleting booking:', error)
    toast.error('Failed to delete booking')
  } finally {
    isSubmitting.value = false
  }
}

const showRescheduleModal = (booking) => {
  selectedBooking.value = { ...booking }
  rescheduleData.date = booking.date.split('T')[0]
  rescheduleData.startTime = booking.startTime
  rescheduleData.endTime = booking.endTime
  modalType.value = 'reschedule'
  showModal.value = true
}

const confirmCancel = async () => {
  if (!selectedBooking.value) return
  
  isSubmitting.value = true
  try {
    await axios.put(
      `/api/bookings/admin/${selectedBooking.value._id}/cancel`,
      { reason: cancelReason.value },
      { withCredentials: true }
    )
    toast.success('Booking cancelled successfully')
    fetchBookings()
    closeModal()
  } catch (error) {
    console.error('Error cancelling booking:', error)
    toast.error('Failed to cancel booking')
  } finally {
    isSubmitting.value = false
  }
}

const confirmReschedule = async () => {
  if (!selectedBooking.value) return
  
  isSubmitting.value = true
  try {
    await axios.put(
      `/api/bookings/admin/${selectedBooking.value._id}/reschedule`,
      {
        date: rescheduleData.date,
        startTime: rescheduleData.startTime,
        endTime: rescheduleData.endTime
      },
      { withCredentials: true }
    )
    toast.success('Booking rescheduled successfully')
    fetchBookings()
    closeModal()
  } catch (error) {
    console.error('Error rescheduling booking:', error)
    toast.error('Failed to reschedule booking')
  } finally {
    isSubmitting.value = false
  }
}

const closeModal = () => {
  showModal.value = false
  selectedBooking.value = null
}

const cancelBooking = (id) => {
  selectedBooking.value = bookings.value.find(b => b._id === id);
  modalType.value = 'cancel';
  showModal.value = true;
}

const toggleFilters = () => {
  showFilters.value = !showFilters.value;
}

const sortBookings = (field, order) => {
  sortBy.value = field;
  sortOrder.value = order;
  
  bookings.value.sort((a, b) => {
    if (field === 'date') {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return order === 'asc' ? dateA - dateB : dateB - dateA;
    } else {
      const valueA = a[field] || '';
      const valueB = b[field] || '';
      
      if (order === 'asc') {
        return valueA.localeCompare(valueB);
      } else {
        return valueB.localeCompare(valueA);
      }
    }
  });
}

const fetchCourts = async () => {
  try {
    const response = await axios.get('/api/courts')
    courts.value = response.data
  } catch (error) {
    console.error('Error fetching courts:', error)
  }
}
</script>