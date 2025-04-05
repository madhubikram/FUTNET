<template>
  <PageLayout class="bg-gradient-to-br from-gray-900 to-gray-950 min-h-screen">
    <!-- ========== Header Section ========== -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 px-1"> <!-- Added padding -->
      <div>
        <!-- Enhanced Title -->
        <h1 class="text-4xl font-bold tracking-tight mb-1">
           <span class="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
             Bookings Dashboard
           </span>
        </h1>
        <p class="text-lg text-gray-400">Oversee and manage all court reservations.</p>
      </div>
      <!-- Header Actions - Enhanced styling -->
      <div class="mt-5 sm:mt-0 flex items-center space-x-3">
         <Transition
            enter-active-class="transition ease-out duration-300"
            enter-from-class="opacity-0 scale-90"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="transition ease-in duration-200"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-90"
          >
           <div v-if="hasActiveFilters" class="flex items-center text-sm text-emerald-300 bg-emerald-900/60 px-3.5 py-1.5 rounded-lg border border-emerald-700/50 shadow-sm">
             <Filter class="w-4 h-4 mr-2 text-emerald-400" />
             <span>{{ activeFilterCount }} Active Filter{{ activeFilterCount > 1 ? 's' : '' }}</span>
             <button @click="resetFiltersAndClosePanel" class="ml-2.5 -mr-1 p-1 text-emerald-400 hover:text-white hover:bg-emerald-600/50 rounded-full transition-all" title="Reset Filters">
                <X class="w-4 h-4" />
             </button>
           </div>
         </Transition>

       
<!-- Filter & Sort Button -->
<button
  @click="toggleFilterPanel"
  class="action-button relative flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-400 rounded-full shadow-lg transition-transform duration-300 transform hover:scale-105 overflow-hidden"
>
  <SlidersHorizontal class="w-6 h-6 text-white" />
  <span class="text-white font-semibold relative z-10">Filter & Sort</span>
  <!-- Ripple Glow Effect -->
  <span class="absolute inset-0 rounded-full bg-white opacity-0 hover:opacity-15 transition-opacity duration-300"></span>
</button>

<!-- Refresh Bookings Button -->
<button
  @click="refreshBookings"
  class="action-button relative flex items-center justify-center px-6 py-3 bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-400 rounded-full shadow-lg transition-transform duration-300 transform hover:scale-105 overflow-hidden"
  title="Refresh Bookings"
>
  <RefreshCw class="w-6 h-6 text-white relative z-10" :class="{ 'animate-spin': isLoading }" />
  <span class="sr-only">Refresh</span>
  <!-- Ripple Glow Effect -->
  <span class="absolute inset-0 rounded-full bg-white opacity-0 hover:opacity-15 transition-opacity duration-300"></span>
</button>

      </div>
    </div>

    <!-- ========== Filter Panel (Slide-out Drawer with Glassmorphism) ========== -->
    <Transition name="slide-fade">
        <div v-if="showFilterPanel" class="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="filter-panel-title">
            <!-- Overlay -->
            <div class="fixed inset-0 bg-black/70 backdrop-blur-md transition-opacity duration-300" @click="closeFilterPanel" aria-hidden="true"></div>

            <!-- Panel Content - Glass Effect -->
            <div class="relative flex flex-col w-full max-w-lg h-full bg-gray-800/80 backdrop-blur-xl shadow-2xl border-l border-gray-700/50">
                <!-- Panel Header -->
                <div class="flex items-center justify-between px-6 py-5 border-b border-gray-700/50 shrink-0"> <!-- Added shrink-0 -->
                    <h2 id="filter-panel-title" class="text-xl font-semibold text-white flex items-center gap-2.5">
                        <SlidersHorizontal class="w-5 h-5 text-emerald-400" />
                        Filter & Sort
                    </h2>
                    <button @click="closeFilterPanel" class="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-all">
                        <X class="w-6 h-6"/>
                        <span class="sr-only">Close</span>
                    </button>
                </div>

                <!-- Panel Body -->
                <div class="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar"> <!-- Increased spacing -->
                    <!-- Sorting -->
                    <div>
                        <label for="sort-by" class="filter-label">Sort By</label>
                        <select id="sort-by" v-model="selectedSort" class="filter-select">
                            <option value="date_desc">Newest First</option>
                            <option value="date_asc">Oldest First</option>
                            <option value="status_pending">Pending Status First</option>
                            <option value="paymentStatus_pending">Pending Payment First</option>
                            <option value="userName_asc">Player Name (A-Z)</option>
                            <option value="courtName_asc">Court Name (A-Z)</option>
                        </select>
                    </div>
                    <!-- Status Filter -->
                    <div>
                        <label for="filter-status" class="filter-label">Booking Status</label>
                        <select id="filter-status" v-model="filters.status" class="filter-select">
                            <option value="all">All Statuses</option> <option value="pending">Pending</option> <option value="confirmed">Confirmed</option>
                            <option value="completed">Completed</option> <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                    <!-- Payment Status Filter -->
                    <div>
                        <label for="filter-payment" class="filter-label">Payment Status</label>
                        <select id="filter-payment" v-model="filters.paymentStatus" class="filter-select">
                            <option value="all">All Payments</option> <option value="pending">Pending</option> <option value="paid">Paid</option>
                            <option value="unpaid">Unpaid</option> <option value="refunded">Refunded</option> <option value="failed">Failed</option>
                        </select>
                    </div>
                    <!-- Court Filter -->
                    <div>
                        <label for="filter-court" class="filter-label">Court</label>
                        <select id="filter-court" v-model="filters.courtId" class="filter-select">
                            <option value="">All Courts</option>
                            <option v-for="court in courts" :key="court._id" :value="court._id">{{ court.name }}</option>
                        </select>
                    </div>
                    <!-- Date Range Filters -->
                    <div>
                        <label class="filter-label">Date Range</label>
                        <div class="grid grid-cols-2 gap-4"> <!-- Increased gap -->
                            <input id="filter-start-date" type="date" v-model="filters.startDate" class="filter-input" aria-label="Start Date" :max="filters.endDate || undefined"/>
                            <input id="filter-end-date" type="date" v-model="filters.endDate" class="filter-input" aria-label="End Date" :min="filters.startDate || undefined"/>
                        </div>
                    </div>
                </div>

                <!-- Panel Footer -->
                <div class="px-6 py-5 border-t border-gray-700/50 bg-gray-800/80 shrink-0"> <!-- Added shrink-0 -->
                     <div class="flex items-stretch gap-4"> <!-- Increased gap -->
                        <button @click="applyFiltersAndClosePanel" class="flex-1 action-button primary">
                            <Filter class="w-4 h-4" /> Apply Filters
                        </button>
                        <button @click="resetFiltersAndClosePanel" class="action-button secondary">
                            <RotateCcw class="w-4 h-4" /> Reset
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </Transition>

    <!-- ========== Bulk Actions Bar (New) ========== -->
    <Transition
        enter-active-class="transition ease-out duration-200"
        enter-from-class="opacity-0 -translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition ease-in duration-150"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-2"
      >
       <div v-if="selectedCount > 0" class="mb-6 px-1 flex items-center justify-between bg-gray-700/60 border border-gray-600/80 rounded-lg p-3 shadow-md">
         <span class="text-sm text-gray-300 font-medium">{{ selectedCount }} booking{{ selectedCount > 1 ? 's' : '' }} selected</span>
         <div class="flex items-center space-x-3">
            <!-- Placeholder Bulk Action Buttons -->
            <button @click="handleBulkMarkPaid" class="action-button text-xs !px-3 !py-1.5 bg-yellow-600 hover:bg-yellow-500 text-white focus-visible:ring-yellow-400">
              <CreditCard class="w-3.5 h-3.5"/> Mark Paid
            </button>
             <button @click="handleBulkCancel" class="action-button text-xs !px-3 !py-1.5 bg-orange-600 hover:bg-orange-500 text-white focus-visible:ring-orange-400">
              <XCircle class="w-3.5 h-3.5"/> Cancel Selected
            </button>
             <button @click="handleBulkDelete" class="action-button text-xs !px-3 !py-1.5 bg-red-700 hover:bg-red-600 text-white focus-visible:ring-red-500">
              <Trash2 class="w-3.5 h-3.5"/> Delete Selected
            </button>
         </div>
       </div>
      </Transition>

    <!-- ========== Booking Table Section - Enhanced ========== -->
    <div class="bg-gray-800/70 backdrop-blur-sm rounded-xl border border-gray-700/50 shadow-lg overflow-hidden">
       <div v-if="isLoading" class="flex flex-col justify-center items-center h-96 text-center"> <!-- Increased height -->
         <!-- Enhanced Spinner -->
         <svg class="animate-spin h-12 w-12 text-emerald-500 mb-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
         </svg>
        <p class="text-xl text-gray-300 font-medium">Loading bookings...</p>
      </div>

      <div v-else-if="bookings.length === 0 && !isLoading" class="flex flex-col justify-center items-center h-96 text-center px-6"> <!-- Increased height -->
        <Inbox class="w-20 h-20 text-gray-600 mb-6" />
        <h3 class="text-2xl font-semibold text-gray-300">No Bookings Found</h3>
        <p class="text-gray-400 mt-2 max-w-sm">
            {{ hasActiveFilters ? 'Try adjusting your filters or use the reset button to see all bookings.' : 'There are currently no bookings recorded in the system.' }}
        </p>
        <button v-if="hasActiveFilters" @click="resetFiltersAndClosePanel" class="mt-6 action-button primary">
          <RotateCcw class="w-4 h-4" />
          Reset Filters
        </button>
      </div>

      <div v-else class="overflow-x-auto relative custom-scrollbar">
        <table class="w-full min-w-[1000px]"> <!-- Adjust min-width if needed -->
          <thead class="bg-gray-900/60 border-b-2 border-gray-700">
            <tr>
              <!-- SELECT ALL CHECKBOX -->
              <th class="table-th pl-4 pr-2 w-12">
                 <input
                    type="checkbox"
                    :checked="isAllSelected"
                    @change="toggleSelectAll"
                    class="h-4 w-4 rounded border-gray-600 text-emerald-500 bg-gray-700 focus:ring-emerald-500 focus:ring-offset-gray-900"
                    title="Select/Deselect All Visible"
                  />
              </th>
              <!-- END SELECT ALL CHECKBOX -->
              <th class="table-th">Court</th>
              <th class="table-th hidden md:table-cell">Date & Time</th> <!-- Hide on small screens -->
              <th class="table-th">Player</th>
              <th class="table-th">Booking</th> <!-- Removed hidden class -->
              <th class="table-th">Payment</th> <!-- Removed hidden class -->
              <th class="table-th text-center">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-700/50">
            <tr v-for="booking in bookings" :key="booking._id" class="table-row group" :class="{'bg-emerald-900/30 hover:bg-emerald-800/40': isSelected(booking._id)}">
              <!-- ROW CHECKBOX -->
               <td class="table-td pl-4 pr-2">
                  <input
                    type="checkbox"
                    :checked="isSelected(booking._id)"
                    @change="() => handleRowSelection(booking._id)"
                    class="h-4 w-4 rounded border-gray-600 text-emerald-500 bg-gray-700 focus:ring-emerald-500 focus:ring-offset-gray-900"
                  />
               </td>
               <!-- END ROW CHECKBOX -->
              <td class="table-td">
                <div class="font-semibold text-white">{{ booking.courtDetails?.name || booking.court?.name || 'N/A' }}</div>
              </td>
              <td class="table-td hidden md:table-cell"> <!-- Hide on small screens -->
                <div class="font-medium text-white">{{ booking.date ? formatFullDate(booking.date) : 'N/A' }}</div>
                <div class="text-xs text-gray-400 font-mono">{{ booking.startTime }} - {{ booking.endTime }} ({{ calculateDuration(booking.startTime, booking.endTime) }})</div>
              </td>
              <td class="table-td">
                 <div class="flex items-center gap-3">
                    <div class="avatar-placeholder">
                      {{ getInitials(booking.userInfo?.name) }}
                    </div>
                    <div class="min-w-0">
                      <div class="text-sm font-medium text-white truncate" :title="booking.userInfo?.name">{{ booking.userInfo?.name || 'Guest User' }}</div>
                      <!-- Hide contact details on smaller screens -->
                      <div class="text-xs text-cyan-400 hover:text-cyan-300 transition-colors truncate hidden lg:block">
                        <a :href="'mailto:'+booking.userInfo?.email" :title="booking.userInfo?.email">{{ booking.userInfo?.email || 'No Email' }}</a>
                      </div>
                      <div class="text-xs text-gray-500 mt-0.5 truncate hidden lg:block" :title="booking.userInfo?.phone">
                          {{ booking.userInfo?.phone || 'No Phone' }}
                      </div>
                      <!-- Show minimal info on smaller screens -->
                       <div class="text-xs text-gray-400 font-mono mt-1 md:hidden">{{ booking.date ? formatFullDate(booking.date) : 'N/A' }}</div>
                       <div class="text-xs text-gray-400 font-mono md:hidden">{{ booking.startTime }} - {{ booking.endTime }}</div>
                       <!-- Show statuses on small screens below player name -->
                        <div class="flex items-center gap-2 mt-1 sm:hidden">
                          <BookingStatusBadge :status="booking.status" class="!text-[10px] !px-1.5 !py-0.5" />
                          <PaymentStatusBadge :status="booking.paymentStatus" class="!text-[10px] !px-1.5 !py-0.5"/>
                      </div>
                    </div>
                 </div>
              </td>
              <td class="table-td"><BookingStatusBadge :status="booking.status" class="enhanced-badge hidden sm:inline-flex" /></td> <!-- Keep hidden on xs -->
              <td class="table-td"><PaymentStatusBadge :status="booking.paymentStatus" class="enhanced-badge hidden sm:inline-flex"/></td> <!-- Keep hidden on xs -->
              <td class="table-td text-center relative">
                  <!-- Action button styling remains similar, focus adjusted in CSS -->
                 <button @click="toggleActionMenu(booking._id)" class="p-1.5 text-gray-400 hover:text-white rounded-md hover:bg-white/10 transition-all" :aria-expanded="activeActionMenu===booking._id" :aria-controls="'action-menu-'+booking._id">
                    <MoreVertical class="w-5 h-5" /><span class="sr-only">Actions</span>
                 </button>
                  <!-- Action Menu - Adjusted position for better screen edge handling -->
                  <transition enter-active-class="transition ease-out duration-150" enter-from-class="transform opacity-0 scale-90" enter-to-class="transform opacity-100 scale-100" leave-active-class="transition ease-in duration-100" leave-from-class="transform opacity-100 scale-100" leave-to-class="transform opacity-0 scale-90">
                    <div v-if="activeActionMenu===booking._id" :id="'action-menu-'+booking._id" class="absolute right-8 lg:right-full lg:left-auto top-full lg:top-1/2 lg:-translate-y-1/2 mt-2 lg:mt-0 lg:mr-3 w-52 origin-top-right lg:origin-right bg-gray-700/90 backdrop-blur-md rounded-lg shadow-xl ring-1 ring-black/10 focus:outline-none z-10 border border-gray-600/50" role="menu" aria-orientation="vertical" @click.stop>
                      <div class="py-1.5" role="none"> <!-- Increased padding -->
                        <!-- Action items styling defined in CSS -->
                        <template v-if="booking.status==='pending' && !booking.isSlotFree"><button @click="updateBookingStatus(booking._id, 'confirmed')" class="action-menu-item"><CheckCircle class="action-menu-icon text-green-400"/>Confirm</button></template>
                        <template v-if="booking.paymentStatus==='pending'||booking.paymentStatus==='unpaid'"><button @click="updatePaymentStatus(booking._id, 'paid')" class="action-menu-item"><CreditCard class="action-menu-icon text-yellow-400"/>Mark Paid</button></template>
                        <template v-if="['pending', 'confirmed'].includes(booking.status)"><button @click="showRescheduleModal(booking)" class="action-menu-item"><Calendar class="action-menu-icon text-blue-400"/>Reschedule</button><button @click="cancelBooking(booking._id)" class="action-menu-item"><XCircle class="action-menu-icon text-orange-400"/>Cancel</button></template>
                        <div class="my-1.5 border-t border-gray-600/60" v-if="(['pending','confirmed'].includes(booking.status)||booking.paymentStatus==='pending'||booking.paymentStatus==='unpaid')"></div>
                        <button @click="deleteBooking(booking._id)" class="action-menu-item text-red-400 hover:!bg-red-500/20 hover:!text-red-300"><Trash2 class="action-menu-icon"/>Delete</button>
                      </div>
                    </div>
                 </transition>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modals (Enhanced Glassmorphism & Styling) -->
     <Transition name="modal-fade">
       <div v-if="showModal" class="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4" :aria-labelledby="'modal-title-'+modalType" role="dialog" aria-modal="true">
         <div class="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity duration-300" aria-hidden="true" @click="closeModal"></div>
         <!-- Shared Modal Structure -->
         <div class="relative bg-gray-800/80 backdrop-blur-lg rounded-xl w-full max-w-lg border border-gray-700/50 shadow-xl transform transition-all duration-300">
           <!-- Modal Header -->
           <div class="px-6 py-5 flex justify-between items-center border-b border-gray-700/50">
              <h3 :id="'modal-title-'+modalType" class="text-xl font-semibold text-white">
                {{ modalType === 'cancel' ? 'Cancel Booking' : 'Reschedule Booking' }}
              </h3>
              <button @click="closeModal" class="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-all"><X class="w-6 h-6"/></button>
           </div>
           <!-- Modal Body (Specific Content) -->
           <div class="p-6">
             <!-- Cancel Content -->
             <template v-if="modalType === 'cancel'">
               <p class="text-gray-300 mb-6">Are you sure? Reason optional. This cannot be undone.</p>
               <div class="mb-6"><label for="cancel-reason" class="filter-label mb-2">Reason (Optional)</label><textarea id="cancel-reason" v-model="cancelReason" class="filter-input" rows="3" placeholder="e.g., Court maintenance..."></textarea></div>
               <div class="flex justify-end space-x-4">
                 <button @click="closeModal" type="button" class="action-button secondary">Keep Booking</button>
                 <button @click="confirmCancel" type="button" class="action-button danger" :disabled="isSubmitting">
                   <span v-if="isSubmitting" class="flex items-center gap-2"><div class="spinner-xs"></div>Processing...</span><span v-else>Confirm Cancel</span>
                 </button>
               </div>
             </template>
             <!-- Reschedule Content -->
             <template v-if="modalType === 'reschedule'">
                <p class="text-gray-300 mb-6">Select a new date and time for this booking.</p>
                <div class="mb-5"><label for="reschedule-date" class="filter-label mb-2">Date</label><input id="reschedule-date" type="date" v-model="rescheduleData.date" class="filter-input" :min="todayDate"/></div>
                <div class="grid grid-cols-2 gap-4 mb-6">
                 <div><label for="reschedule-start-time" class="filter-label mb-2">Start Time</label><input id="reschedule-start-time" type="time" v-model="rescheduleData.startTime" class="filter-input" step="1800"/></div>
                 <div><label for="reschedule-end-time" class="filter-label mb-2">End Time</label><input id="reschedule-end-time" type="time" v-model="rescheduleData.endTime" class="filter-input" step="1800"/></div>
                </div>
               <div class="flex justify-end space-x-4">
                 <button @click="closeModal" type="button" class="action-button secondary">Cancel</button>
                 <button @click="confirmReschedule" type="button" class="action-button primary" :disabled="isSubmitting">
                   <span v-if="isSubmitting" class="flex items-center gap-2"><div class="spinner-xs"></div>Processing...</span><span v-else>Confirm Reschedule</span>
                 </button>
               </div>
             </template>
           </div>
         </div>
       </div>
      </Transition>

  </PageLayout>
</template>

<script setup>
// Script content remains the same as the previous fixed version
import { ref, reactive, onMounted, computed, onBeforeUnmount } from 'vue';
import { useToast } from 'vue-toastification';
import axios from 'axios';
import {
  RefreshCw, Filter, RotateCcw, CreditCard,
  MoreVertical, CheckCircle, XCircle, Trash2, Calendar,
  Inbox, X, SlidersHorizontal
} from 'lucide-vue-next';
import PageLayout from '@/components/layout/PageLayout.vue';
import BookingStatusBadge from '@/components/icons/BookingStatusBadge.vue';
import PaymentStatusBadge from '@/components/icons/PaymentStatusBadge.vue';

const toast = useToast();

const bookings = ref([]);
const courts = ref([]);
const isLoading = ref(false);
const isSubmitting = ref(false);
const showFilterPanel = ref(false);
const activeActionMenu = ref(null);
const selectedSort = ref('date_desc');
const initialFilters = { status: 'all', paymentStatus: 'all', startDate: '', endDate: '', courtId: '', };
const filters = reactive({ ...initialFilters });
const showModal = ref(false);
const modalType = ref(null);
const selectedBooking = ref(null);
const cancelReason = ref('');
const rescheduleData = reactive({ date: '', startTime: '', endTime: '', });
const selectedBookingIds = ref(new Set());
const isProcessingBulkAction = ref(false);

const todayDate = computed(() => new Date().toISOString().split('T')[0]);
const activeFilterCount = computed(() => {
    let count = 0;
    if (filters.status !== 'all') count++;
    if (filters.paymentStatus !== 'all') count++;
    if (filters.startDate) count++;
    if (filters.endDate) count++;
    if (filters.courtId) count++;
    return count;
});
const hasActiveFilters = computed(() => activeFilterCount.value > 0);
const currentSort = computed(() => {
    const [field, order] = selectedSort.value.split('_');
    if ((field === 'status' || field === 'paymentStatus') && order === 'pending') return { sortBy: field, sortOrder: 'pending' };
    if (field === 'userName') return { sortBy: 'user.name', sortOrder: order };
    if (field === 'courtName') return { sortBy: 'court.name', sortOrder: order };
    return { sortBy: field, sortOrder: order };
});

// Computed properties for selection
const selectedCount = computed(() => selectedBookingIds.value.size);

const isAllSelected = computed(() => {
  if (bookings.value.length === 0) return false;
  // Check if all *currently visible* bookings are selected
  return bookings.value.every(b => selectedBookingIds.value.has(b._id));
});

// Methods for selection
const isSelected = (bookingId) => {
  return selectedBookingIds.value.has(bookingId);
};

const handleRowSelection = (bookingId) => {
  if (selectedBookingIds.value.has(bookingId)) {
    selectedBookingIds.value.delete(bookingId);
  } else {
    selectedBookingIds.value.add(bookingId);
  }
};

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    // Deselect all visible
    selectedBookingIds.value.clear();
  } else {
    // Select all visible
    bookings.value.forEach(b => selectedBookingIds.value.add(b._id));
  }
};

// Updated Bulk Action Handlers
const handleBulkMarkPaid = async () => {
  if (selectedCount.value === 0 || isProcessingBulkAction.value) return;
  const ids = Array.from(selectedBookingIds.value);
  console.log('Bulk Mark Paid:', ids);
  isProcessingBulkAction.value = true;
  try {
    const response = await axios.patch('/api/bookings/admin/bulk-status', 
      { 
        ids: ids, 
        paymentStatus: 'paid' 
      },
      { withCredentials: true }
    );
    toast.success(`${response.data.updatedCount || 0} booking(s) marked as paid.`);
    await fetchData(); // Refresh data
    selectedBookingIds.value.clear(); // Clear selection
  } catch (error) {
    console.error('Bulk Mark Paid Error:', error);
    toast.error(error.response?.data?.message || 'Failed to mark bookings as paid.');
  } finally {
    isProcessingBulkAction.value = false;
  }
};

const handleBulkCancel = async () => {
  if (selectedCount.value === 0 || isProcessingBulkAction.value) return;
  const ids = Array.from(selectedBookingIds.value);
  console.log('Bulk Cancel:', ids);
  if (confirm(`Are you sure you want to cancel ${ids.length} selected booking(s)?`)) {
    isProcessingBulkAction.value = true;
    try {
        const response = await axios.patch('/api/bookings/admin/bulk-cancel', 
          { ids: ids }, 
          { withCredentials: true }
        );
        toast.success(`${response.data.updatedCount || 0} booking(s) cancelled.`);
        await fetchData(); // Refresh data
        selectedBookingIds.value.clear(); // Clear selection
    } catch (error) {
        console.error('Bulk Cancel Error:', error);
        toast.error(error.response?.data?.message || 'Failed to cancel bookings.');
    } finally {
      isProcessingBulkAction.value = false;
    }
  }
};

const handleBulkDelete = async () => {
  if (selectedCount.value === 0 || isProcessingBulkAction.value) return;
  const ids = Array.from(selectedBookingIds.value);
  console.log('Bulk Delete:', ids);
  if (confirm(`Are you sure you want to permanently delete ${ids.length} selected booking(s)? This also deletes associated timeslots and cannot be undone.`)) {
    isProcessingBulkAction.value = true;
    try {
        // Using POST for bulk delete to avoid URL length issues with many IDs
        const response = await axios.post('/api/bookings/admin/bulk-delete', 
          { ids: ids }, 
          { withCredentials: true }
        );
        toast.success(`${response.data.deletedCount || 0} booking(s) deleted.`);
        await fetchData(); // Refresh data
        selectedBookingIds.value.clear(); // Clear selection
    } catch (error) {
        console.error('Bulk Delete Error:', error);
        toast.error(error.response?.data?.message || 'Failed to delete bookings.');
    } finally {
      isProcessingBulkAction.value = false;
    }
  }
};

onMounted(async () => { document.addEventListener('click', handleOutsideClick); document.addEventListener('keydown', handleKeydown); await fetchCourts(); await fetchData(); });
onBeforeUnmount(() => { document.removeEventListener('click', handleOutsideClick); document.removeEventListener('keydown', handleKeydown); });

const fetchData = async () => {
  if (isLoading.value) return; isLoading.value = true; activeActionMenu.value = null;
  try {
      const queryParams = new URLSearchParams();
      if (filters.status !== 'all') queryParams.append('status', filters.status);
      if (filters.paymentStatus !== 'all') queryParams.append('paymentStatus', filters.paymentStatus);
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      if (filters.courtId) queryParams.append('courtId', filters.courtId);
      const { sortBy, sortOrder } = currentSort.value;
      queryParams.append('sortBy', sortBy); queryParams.append('sortOrder', sortOrder);
      const response = await axios.get(`/api/bookings/admin?${queryParams.toString()}`);
      bookings.value = response.data;
  } catch (error) { console.error('Fetch Error:', error); toast.error(error.response?.data?.message || 'Failed to load.'); }
  finally { isLoading.value = false; }
};
const refreshBookings = async () => { toast.info('Refreshing...'); await fetchData(); };
const fetchCourts = async () => { try { const r = await axios.get('/api/courts'); courts.value = r.data; } catch (error) { console.error('Court Fetch Error:', error); toast.warning('Could not load courts.'); } };
const closeFilterPanel = () => { showFilterPanel.value = false; };
const toggleFilterPanel = () => { showFilterPanel.value = !showFilterPanel.value; };
const applyFiltersAndClosePanel = async () => {
  selectedBookingIds.value.clear(); // Clear selection before applying filters
  await fetchData(); 
  closeFilterPanel(); 
};
const resetFiltersAndClosePanel = async () => {
  Object.assign(filters, initialFilters); 
  selectedSort.value = 'date_desc'; 
  selectedBookingIds.value.clear(); // Clear selection before fetching reset data
  await fetchData(); 
  closeFilterPanel(); 
};
const handleKeydown = (event) => { if (event.key === 'Escape') { if (showModal.value) closeModal(); else if (showFilterPanel.value) closeFilterPanel(); else if (activeActionMenu.value) closeActionMenu(); }};
const handleOutsideClick = (event) => { if (activeActionMenu.value) { const button = document.querySelector(`button[aria-controls='action-menu-${activeActionMenu.value}']`); const menu = document.getElementById(`action-menu-${activeActionMenu.value}`); if (button && !button.contains(event.target) && menu && !menu.contains(event.target)) closeActionMenu(); }};
const toggleActionMenu = (bookingId) => { activeActionMenu.value = activeActionMenu.value === bookingId ? null : bookingId; };
const closeActionMenu = () => { activeActionMenu.value = null; };

const updateBookingStatus = async (id, status) => {
  isSubmitting.value = true; closeActionMenu();
  try { await axios.patch(`/api/bookings/admin/${id}/status`, { status }, { withCredentials: true }); toast.success(`Booking confirmed`); await fetchData(); }
  catch (error) { console.error('Status Update Error:', error); toast.error(error.response?.data?.message || 'Failed update.'); } finally { isSubmitting.value = false; }
};
const updatePaymentStatus = async (id, status) => {
    isSubmitting.value = true; closeActionMenu();
    try { await axios.patch(`/api/bookings/admin/${id}/payment-status`, { paymentStatus: status }, { withCredentials: true }); toast.success(`Payment marked as ${status}`); await fetchData(); }
    catch (error) { console.error('Payment Update Error:', error); toast.error(error.response?.data?.message || 'Failed update.'); } finally { isSubmitting.value = false; }
};
const deleteBooking = async (id) => {
  closeActionMenu(); if (window.confirm('Delete booking?')) { isSubmitting.value = true; console.log(`Delete: ${id}`);
    try { await axios.delete(`/api/bookings/admin/${id}`, { withCredentials: true }); toast.success('Booking deleted'); await fetchData(); }
    catch (error) { console.error('Delete Error:', error); toast.error(error.response?.data?.message || 'Failed delete.'); } finally { isSubmitting.value = false; }
  } else { console.log('Delete cancelled.'); }
};
const showRescheduleModal = (booking) => {
  if (!booking || !booking._id) { console.error("Invalid data"); toast.error("Cannot reschedule."); return; }
  selectedBooking.value = { ...booking };
  try { const d = new Date(booking.date); rescheduleData.date = d.toISOString().split('T')[0]; } catch { rescheduleData.date = ''; }
  rescheduleData.startTime = booking.startTime; rescheduleData.endTime = booking.endTime;
  modalType.value = 'reschedule'; showModal.value = true; closeActionMenu();
};
const cancelBooking = async (id) => {
  if (!id) { console.error("Invalid ID"); toast.error("Cannot cancel."); return; }
  selectedBooking.value = bookings.value.find(b => b._id === id);
  if (!selectedBooking.value) { console.error(`Booking ${id} not found`); toast.error("Not found."); return; }
  cancelReason.value = ''; modalType.value = 'cancel'; showModal.value = true; closeActionMenu();
};
const confirmCancel = async () => {
  if (!selectedBooking.value) return; 
  isSubmitting.value = true;
  try { 
    // Use the correct admin status update endpoint
    await axios.patch(
      `/api/bookings/admin/${selectedBooking.value._id}/status`,
      { 
        status: 'cancelled', 
        reason: cancelReason.value || 'Cancelled by Admin' // Send reason in body
      }, 
      { withCredentials: true }
    );
    toast.success('Booking cancelled successfully'); 
    await fetchData(); 
    closeModal(); 
  } catch (error) { 
    console.error('Cancel Error:', error);
    // Use a more specific error message if possible
    const errorMessage = error.response?.data?.message || 'Failed to cancel booking.'; 
    toast.error(errorMessage); 
  } finally { 
    isSubmitting.value = false; 
  }
};
const confirmReschedule = async () => {
  if (!selectedBooking.value || !rescheduleData.date || !rescheduleData.startTime || !rescheduleData.endTime) { toast.warning('Select date/time.'); return; } isSubmitting.value = true;
  try { const fmtDate = new Date(rescheduleData.date).toISOString().split('T')[0]; await axios.patch(`/api/bookings/admin/${selectedBooking.value._id}/reschedule`, { date: fmtDate, startTime: rescheduleData.startTime, endTime: rescheduleData.endTime }, { withCredentials: true }); toast.success('Rescheduled'); await fetchData(); closeModal(); }
  catch (error) { console.error('Reschedule Error:', error); toast.error(error.response?.data?.message || 'Reschedule failed.'); } finally { isSubmitting.value = false; }
};
const closeModal = () => { showModal.value = false; setTimeout(() => { selectedBooking.value = null; modalType.value = null; cancelReason.value = ''; Object.assign(rescheduleData,{date:'',startTime:'',endTime:''}); }, 300); };
const formatFullDate=(dStr)=>{try{return new Date(dStr).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric',timeZone:'UTC'})||'N/A'}catch{return 'Invalid'}};
const calculateDuration=(s,e)=>{try{const sd=new Date(`1970-01-01T${s}:00Z`),ed=new Date(`1970-01-01T${e}:00Z`);let d=(ed-sd)/(1e3*60);if(d<0)d+=1440;const h=Math.floor(d/60),m=d%60;return `${h>0?h+'h ':''}${m>0?m+'m':''}`.trim()||'0m'}catch{return 'N/A'}};
const getInitials=(n)=>{
    // Explicitly check for null/undefined/non-string
    if (!n || typeof n !== 'string' || n.trim() === '') return '?';
    try{
        const N=n.trim().split(' ').filter(Boolean);
        // Handle cases where split might result in empty array or single initial
        if (N.length === 0) return '?';
        if (N.length === 1) return N[0][0].toUpperCase();
        return (N[0][0]+N[N.length-1][0]).toUpperCase();
    } catch {
        // Catch any unexpected errors during string manipulation
        return '?';
    }
};
</script>

<style scoped>
/* Styles remain the same as the previous fixed version */
.action-button { @apply px-5 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 ease-in-out shadow-md hover:shadow-lg focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 outline-none font-medium text-sm disabled:opacity-60 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0 active:shadow-inner; }
.action-button.primary { @apply bg-emerald-600 hover:bg-emerald-500 text-white focus-visible:ring-emerald-400; }
.action-button.secondary { @apply bg-gray-600 hover:bg-gray-500 text-white focus-visible:ring-gray-400; }
.action-button.danger { @apply bg-red-600 hover:bg-red-500 text-white focus-visible:ring-red-400; }
.filter-label { @apply block text-sm font-medium text-gray-300 mb-1.5; }
.filter-select, .filter-input { @apply w-full bg-gray-700/70 text-white border border-gray-600/80 rounded-lg px-3.5 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors; }
.filter-select { appearance: none; background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23a0aec0' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e"); background-position: right 0.7rem center; background-repeat: no-repeat; background-size: 1.25em 1.25em; padding-right: 2.75rem; }
input[type="date"]::-webkit-calendar-picker-indicator { @apply opacity-60 cursor-pointer filter invert-[.8] hover:opacity-80 transition-opacity; }
.table-th { @apply text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-4 whitespace-nowrap; }
.table-td { @apply px-6 py-5 whitespace-nowrap; }
.table-row { @apply transition-all duration-150 ease-out; }
.table-row:nth-child(even) { @apply bg-white/5; }
.table-row:hover { @apply bg-gray-700/70 scale-[1.005] shadow-md z-10 relative; }
.avatar-placeholder { @apply w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow; }
.enhanced-badge { @apply inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide shadow-sm; }
:deep(.enhanced-badge svg) { @apply w-3.5 h-3.5; }
.action-menu-item { @apply flex items-center w-full px-4 py-2.5 text-sm text-gray-200 hover:bg-emerald-600/50 hover:text-white transition-all duration-150 cursor-pointer rounded mx-1; }
.action-menu-item:disabled { @apply opacity-50 cursor-not-allowed; }
.action-menu-icon { @apply mr-3 h-5 w-5 shrink-0 opacity-80; }
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.modal-fade-enter-active .relative, .modal-fade-leave-active .relative { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
.modal-fade-enter-from .relative, .modal-fade-leave-to .relative { transform: scale(0.95) translateY(10px); opacity: 0; }
.modal-fade-enter-to .relative, .modal-fade-leave-from .relative { transform: scale(1) translateY(0); opacity: 1; }
.slide-fade-enter-active { transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.slide-fade-leave-active { transition: opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1); }
.slide-fade-enter-active .relative { transition: transform 0.35s cubic-bezier(0.1, 0.9, 0.2, 1); }
.slide-fade-leave-active .relative { transition: transform 0.3s cubic-bezier(0.8, 0, 0.6, 1); }
.slide-fade-enter-from, .slide-fade-leave-to { opacity: 0; }
.slide-fade-enter-from .relative, .slide-fade-leave-to .relative { transform: translateX(100%); }
.slide-fade-enter-to .relative, .slide-fade-leave-from .relative { transform: translateX(0); }
.custom-scrollbar::-webkit-scrollbar { @apply w-1.5 h-1.5; }
.custom-scrollbar::-webkit-scrollbar-track { @apply bg-transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { @apply bg-gray-600 rounded; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { @apply bg-gray-500; }
*:focus-visible { @apply outline-none ring-2 ring-offset-2 ring-offset-gray-900 ring-emerald-400 rounded-md; }
.filter-select:focus, .filter-input:focus { @apply ring-2 ring-emerald-500 border-emerald-500; }
.spinner-xs { @apply inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-current; }

/* Add styles for selected row if needed */
.table-row.selected {
  /* Example: Slightly different background */
  /* @apply bg-emerald-900/30 hover:bg-emerald-800/40; */
}

/* Style for checkboxes (optional, Tailwind plugin handles focus well) */
input[type="checkbox"] {
  /* Add custom styles if desired */
}
</style>