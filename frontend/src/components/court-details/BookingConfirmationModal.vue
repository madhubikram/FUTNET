// src/components/court-details/BookingConfirmationModal.vue

<template>
  <BaseModal @close="onClose">
    <template #header>
      <h3 class="text-xl font-semibold text-white">Confirm Booking</h3>
    </template>

    <template #body>
      <div class="space-y-6">
        <!-- Booking Details Summary -->
        <div class="bg-gray-700/50 rounded-lg p-4">
          <h4 class="font-medium text-white mb-2">Booking Details</h4>
          <div class="space-y-2 text-gray-300">
            <div class="flex justify-between">
              <span>Booking ID</span>
              <span>{{ bookingDetails.bookingId || 'N/A' }}</span>
            </div>
            <div class="flex justify-between">
              <span>Date</span>
              <span>{{ safeFormatDate(bookingDetails.date) }}</span>
            </div>
            <div class="flex justify-between">
              <span>Duration</span>
              <span>{{ bookingDetails.duration || (bookingDetails.slots?.length ? `${bookingDetails.slots.length} hour(s)` : 'N/A') }}</span>
            </div>
            <div class="mt-2 space-y-1">
              <div class="text-sm font-medium text-gray-400">Time Slots:</div>
              <div v-if="bookingDetails.slots && bookingDetails.slots.length > 0" class="space-y-1">
                <div 
                  v-for="slot in bookingDetails.slots" 
                  :key="slot.time"
                  class="flex justify-between text-sm"
                >
                  <span>{{ formatTime(slot.time) }}</span>
                  <span>Rs. {{ slot.rate }}</span>
                </div>
              </div>
              <div v-else class="text-sm text-gray-400">No time slots selected</div>
            </div>
            <div class="mt-3 pt-3 border-t border-gray-600 flex justify-between font-semibold">
              <span>Total Amount</span>
              <span class="text-green-400">Rs. {{ bookingDetails.totalAmount || 0 }}</span>
            </div>
          </div>
        </div>

        <div v-if="!requiresPrepayment && !bookingDetails.requiresPayment" class="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mt-4">
          <div class="flex items-center gap-2">
            <CheckCircleIcon class="w-5 h-5 text-green-400" />
            <p class="text-green-400">You're using your free booking slots. Your booking will be confirmed immediately.</p>
          </div>
        </div>

        <!-- Payment required message -->
        <div v-if="!requiresPrepayment && bookingDetails.requiresPayment" class="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mt-4">
          <p class="text-yellow-400 text-sm mb-2">
            <strong>Note:</strong> This is currently a demonstration. In the production version, payment would be required for bookings beyond your free slots.
          </p>
          <p class="text-gray-300">
            For demonstration purposes, all bookings will be processed as free.
          </p>
        </div>

        <!-- Free Slots Usage Info -->
        <div v-if="!requiresPrepayment && !bookingDetails.requiresPayment" class="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <p class="text-blue-400 text-sm">
            You're using your free booking slots. No payment required.
          </p>
        </div>

         <!-- Payment Required Info -->
         <div v-if="!requiresPrepayment && bookingDetails.requiresPayment" class="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
          <p class="text-yellow-400 text-sm">
            You've used all your free slots. Payment is required for this booking.
          </p>
          <div class="mt-4">
            <h4 class="font-medium text-white mb-2">Payment Options</h4>
            <div class="grid grid-cols-2 gap-4">
              <button 
                class="p-3 border border-blue-500/30 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
              >
                Pay with eSewa
              </button>
              <button 
                class="p-3 border border-purple-500/30 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500/20"
              >
                Pay with Khalti
              </button>
            </div>
          </div>
        </div>

        <!-- Prepayment Info -->
        <div v-if="requiresPrepayment" class="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
          <p class="text-yellow-400 text-sm">
            This court requires prepayment. Payment options will be available soon.
          </p>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end space-x-3">
        <button
          @click="onClose"
          class="px-4 py-2 text-gray-400 hover:text-white"
        >
          Cancel
        </button>
        
        <!-- Different buttons based on prepayment requirement -->
        <button
          v-if="requiresPrepayment"
          disabled
          class="px-6 py-2 bg-gray-600 text-white rounded-lg opacity-50 cursor-not-allowed"
        >
          Payment Required (Coming Soon)
        </button>
        <button
          v-else-if="bookingDetails.requiresPayment"
          disabled
          class="px-6 py-2 bg-gray-600 text-white rounded-lg opacity-50 cursor-not-allowed"
        >
          Please Select Payment Method
        </button>
        <button
          v-else
          @click="onConfirmBooking"
          :disabled="isProcessing"
          class="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 
                disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Loader2Icon v-if="isProcessing" class="animate-spin w-4 h-4" />
          Confirm Booking
        </button>
      </div>
    </template>
  </BaseModal>
</template>

<script setup>
import BaseModal from '@/components/BaseModal.vue'
import { Loader2Icon, CheckCircleIcon  } from 'lucide-vue-next'
import { useTimeFormatting } from '@/composables/useTimeFormatting'
const { formatTime, formatDate } = useTimeFormatting()

// Safe date formatter that handles invalid dates
const safeFormatDate = (dateValue) => {
  try {
    if (!dateValue) return 'N/A';
    
    // Handle string dates
    if (typeof dateValue === 'string') {
      // Check if it's a valid date string
      const parsedDate = new Date(dateValue);
      if (isNaN(parsedDate.getTime())) return 'N/A';
      return formatDate(dateValue);
    }
    
    // Handle Date objects
    if (dateValue instanceof Date) {
      if (isNaN(dateValue.getTime())) return 'N/A';
      return formatDate(dateValue.toISOString().split('T')[0]);
    }
    
    return 'N/A';
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'N/A';
  }
};

defineProps({
  bookingDetails: {
    type: Object,
    required: true
  },
  requiresPrepayment: {
    type: Boolean,
    default: false
  },
  isProcessing: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'confirm-booking'])

// Event handlers
const onClose = () => emit('close')
const onConfirmBooking = () => emit('confirm-booking')

</script>