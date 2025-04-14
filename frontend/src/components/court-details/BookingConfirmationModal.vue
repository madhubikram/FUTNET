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
                  <span class="flex items-center gap-1">
                    <span>Rs. {{ slot.rate }}</span>
                    <span v-if="slot.pointsCost > 0" class="text-xs text-purple-300">/ {{ slot.pointsCost }} pts</span>
                  </span>
                </div>
              </div>
              <div v-else class="text-sm text-gray-400">No time slots selected</div>
            </div>
            <div class="mt-3 pt-3 border-t border-gray-600 flex justify-between font-semibold">
              <span>Total Amount</span>
              <span class="text-green-400 flex items-center gap-1">
                 <span>Rs. {{ bookingDetails.totalAmount || 0 }}</span>
                 <span v-if="bookingDetails.totalPointsCost > 0" class="text-base font-medium text-purple-300">/ {{ bookingDetails.totalPointsCost }} pts</span>
              </span>
            </div>
          </div>
        </div>

        <!-- Free Booking Info -->
        <div v-if="bookingDetails.isFreeBooking" class="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mt-4">
          <div class="flex items-center gap-2">
            <CheckCircleIcon class="w-5 h-5 text-green-400" />
            <p class="text-green-400">This booking qualifies for a free slot! You can either confirm it as free or choose to prepay and earn loyalty points.</p>
          </div>
          <div class="mt-2 text-xs text-purple-300">
            <span class="font-medium">💰 Bonus:</span> Prepaying even for free slots earns you 15 loyalty points!
          </div>
        </div>

        <!-- Payment Required Info (No Prepayment Needed by Court) -->
         <div v-if="!requiresPrepayment && bookingDetails.requiresPayment" class="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
          <p class="text-yellow-400 text-sm mb-2">
            Payment required. You can choose to:
          </p>
          <ul class="text-sm text-gray-300 list-disc pl-5 space-y-1">
            <li>Pay physically at the venue (no bonus points)</li>
            <li class="text-purple-300">Prepay with Khalti or loyalty points and earn 15 bonus points!</li>
          </ul>
        </div>

        <!-- Prepayment Required Info -->
        <div v-if="requiresPrepayment" class="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
          <p class="text-yellow-400 text-sm mb-2">
            This court requires prepayment. Please choose a payment method below:
          </p>
          <ul class="text-sm text-gray-300 list-disc pl-5">
            <li class="text-purple-300">Prepayment earns you 15 bonus loyalty points!</li>
          </ul>
        </div>

        <!-- REMOVE Old Payment Buttons -->
        <!-- 
         <div v-if="!requiresPrepayment && bookingDetails.requiresPayment" class="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
            ...
              <button>Pay with eSewa</button>
              <button>Pay with Khalti</button>
            ...
         </div>
        -->
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end space-x-3">
        <button
          @click="onClose"
          class="px-4 py-2 text-gray-400 hover:text-white"
          :disabled="isProcessing"
        >
          Cancel
        </button>
        
        <!-- Conditional Buttons Based on Booking State -->

        <!-- 1. Free Booking -->
<!-- Free Booking Button -->
    <button
      v-if="bookingDetails.isFreeBooking"
      @click="onConfirmBooking('free')" 
      :disabled="isProcessing"
      class="px-4 py-1.5 bg-green-500 text-white text-sm font-medium rounded-md hover:bg-green-600 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shadow-sm"
    >
      <Loader2Icon v-if="isProcessing" class="animate-spin w-3.5 h-3.5" />
      <span>Confirm Booking</span>
    </button>

    <!-- Optional Prepayment Buttons for Free Bookings -->
    <template v-if="bookingDetails.isFreeBooking">
      <button 
        @click="onConfirmBooking('khalti')" 
        :disabled="isProcessing"
        class="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shadow-sm"
      >
        <Loader2Icon v-if="isProcessing" class="animate-spin w-3.5 h-3.5" />
        <span>Pay with Khalti</span>
      </button>
      
      <button 
        @click="onConfirmBooking('points')" 
        :disabled="isProcessing || bookingDetails.availablePoints < bookingDetails.totalPointsCost || bookingDetails.totalPointsCost <= 0"
        class="px-4 py-1.5 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shadow-sm"
      >
        <Loader2Icon v-if="isProcessing" class="animate-spin w-3.5 h-3.5" />
        <span>Pay with Points</span>
      </button>
    </template>

        <!-- 2. Court Requires Prepayment -->
        <template v-if="requiresPrepayment">
          <button 
            @click="onConfirmBooking('khalti')" 
            :disabled="isProcessing"
            class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Loader2Icon v-if="isProcessing" class="animate-spin w-4 h-4" />
            Pay with Khalti
          </button>
          <button 
            @click="onConfirmBooking('points')" 
            :disabled="isProcessing || bookingDetails.availablePoints < bookingDetails.totalPointsCost || bookingDetails.totalPointsCost <= 0"
            class="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Loader2Icon v-if="isProcessing" class="animate-spin w-4 h-4" />
            <BadgeCentIcon class="w-4 h-4 mr-1" />
            Pay with {{ bookingDetails.totalPointsCost }} Points
          </button>
        </template>
        
        <!-- 3. Court DOES NOT Require Prepayment, BUT Payment IS Required (Used Free Slots) -->
        <template v-if="!requiresPrepayment && bookingDetails.requiresPayment">
           <button 
            @click="onConfirmBooking('khalti')" 
            :disabled="isProcessing"
            class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Loader2Icon v-if="isProcessing" class="animate-spin w-4 h-4" />
            Pay with Khalti (Prepay)
          </button>
          <button 
            @click="onConfirmBooking('points')" 
            :disabled="isProcessing || bookingDetails.availablePoints < bookingDetails.totalPointsCost || bookingDetails.totalPointsCost <= 0"
            class="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Loader2Icon v-if="isProcessing" class="animate-spin w-4 h-4" />
             <BadgeCentIcon class="w-4 h-4 mr-1" />
            Pay with {{ bookingDetails.totalPointsCost }} Points (Prepay)
          </button>
           <button 
            @click="onConfirmBooking('physical')" 
            :disabled="isProcessing"
            class="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Loader2Icon v-if="isProcessing" class="animate-spin w-4 h-4" />
            Pay Physically at Venue
          </button>
        </template>

        <!-- REMOVE OLD Buttons -->
        <!-- 
        <button
          v-if="requiresPrepayment || bookingDetails.requiresPayment" 
          @click="onConfirmBooking" 
          ...
        >
          Pay with Khalti
        </button>
        <button
          v-else 
          @click="onConfirmBooking" 
          ...
        >
          Confirm Booking (Free)
        </button> 
        -->
      </div>
    </template>
  </BaseModal>
</template>

<script setup>
import BaseModal from '@/components/BaseModal.vue'
import { Loader2Icon, CheckCircleIcon, BadgeCentIcon } from 'lucide-vue-next'
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

const props = defineProps({
  bookingDetails: {
    type: Object,
    required: true,
    default: () => ({ 
      bookingId: null, 
      date: null, 
      duration: null, 
      slots: [], 
      totalAmount: 0, 
      totalPointsCost: 0,
      isFreeBooking: false,
      requiresPayment: false,
      availablePoints: 0
    })
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
const onConfirmBooking = (paymentMethod) => {
  // Enhanced logging for debugging the payment flow
  console.log('[BookingConfirmationModal] Emitting confirm-booking with payload:', { 
    paymentMethod,
    isFreeBooking: props.bookingDetails.isFreeBooking,
    requiresPayment: props.bookingDetails.requiresPayment,
    requiresPrepayment: props.requiresPrepayment,
    availablePoints: props.bookingDetails.availablePoints,
    totalPointsCost: props.bookingDetails.totalPointsCost
  });
  emit('confirm-booking', { paymentMethod });
}

</script>