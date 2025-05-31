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

        <!-- Warning for no free slots -->
        <div v-if="!requiresPrepayment && bookingDetails.freeBookingsRemaining <= 0" class="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
          <p class="text-yellow-400 text-sm flex items-center">
            <span class="mr-2">⚠️</span>
            <span>You've used all your free booking slots for today. Please use Khalti or Points payment method.</span>
          </p>
        </div>

        <!-- Warning for exceeding free slots -->
        <div v-else-if="!requiresPrepayment && bookingDetails.freeBookingsRemaining > 0 && bookingDetails.slots.length > bookingDetails.freeBookingsRemaining" class="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
          <p class="text-yellow-400 text-sm flex items-center">
            <span class="mr-2">⚠️</span>
            <span>
              You've selected {{ bookingDetails.slots.length }} slots but only have {{ bookingDetails.freeBookingsRemaining }} free booking slots available.
              <br>To use "Pay at Venue" option, reduce your selection or use Khalti/Points for all slots.
            </span>
          </p>
        </div>

        <!-- Payment Required Info (No Prepayment Needed by Court) -->
         <div v-if="!requiresPrepayment" class="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <p class="text-blue-400 text-sm mb-2">
            This court does not require prepayment. You can:
          </p>
          <ul class="text-sm text-gray-300 list-disc pl-5 space-y-1">
            <li v-if="bookingDetails.freeBookingsRemaining > 0">Choose <span class="font-semibold">"Pay Physically at Venue"</span> to confirm now and pay later.</li>
            <li class="text-purple-300">Optionally prepay with Khalti to earn 15 bonus points!</li>
          </ul>
        </div>

        <!-- Prepayment Required Info -->
        <div v-if="requiresPrepayment" class="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
          <p class="text-yellow-400 text-sm mb-2">
            This court requires prepayment. Please choose a payment method below.
          </p>
          <ul class="text-sm text-gray-300 list-disc pl-5">
            <li class="text-purple-300">Prepayment earns you 15 bonus loyalty points!</li>
          </ul>
        </div>

      </div>
    </template>

    <template #footer>
      <div class="flex justify-end space-x-3">
        <template v-if="requiresPrepayment">
          <div class="payment-options">
            <button 
              @click="onConfirmBooking('khalti')" 
              :disabled="isProcessing"
              class="payment-option payment-option-khalti hover:opacity-90 transition-all">
              <span v-if="isProcessing" class="flex items-center justify-center gap-2">
                <Loader2Icon class="animate-spin w-4 h-4" />
                Processing...
              </span>
              <span v-else>
                Pay with<br/>Khalti
              </span>
            </button>
            
            <button 
              @click="onConfirmBooking('points')" 
              :disabled="isProcessing || bookingDetails.availablePoints < bookingDetails.totalPointsCost || bookingDetails.totalPointsCost <= 0"
              class="payment-option payment-option-points hover:opacity-90 transition-all">
              <span v-if="isProcessing" class="flex items-center justify-center gap-2">
                <Loader2Icon class="animate-spin w-4 h-4" />
                Processing...
              </span>
              <span v-else class="flex flex-col items-center">
                Pay with<br/>{{ bookingDetails.totalPointsCost }} Points
              </span>
            </button>
          </div>
        </template>
        
        <!-- 2. Court DOES NOT Require Prepayment -->
        <template v-else>
          <div class="payment-options">
            <button 
              @click="onConfirmBooking('khalti')" 
              :disabled="isProcessing"
              class="payment-option payment-option-khalti hover:opacity-90 transition-all">
              <span v-if="isProcessing" class="flex items-center justify-center gap-2">
                <Loader2Icon class="animate-spin w-4 h-4" />
                Processing...
              </span>
              <span v-else>
                Prepay with<br/>Khalti
              </span>
            </button>
            
            <button 
              @click="onConfirmBooking('points')" 
              :disabled="isProcessing || bookingDetails.availablePoints < bookingDetails.totalPointsCost || bookingDetails.totalPointsCost <= 0"
              class="payment-option payment-option-points hover:opacity-90 transition-all">
              <span v-if="isProcessing" class="flex items-center justify-center gap-2">
                <Loader2Icon class="animate-spin w-4 h-4" />
                Processing...
              </span>
              <span v-else class="flex flex-col items-center">
                Prepay with<br/>{{ bookingDetails.totalPointsCost }} Points
              </span>
            </button>
            
            <button 
              v-if="bookingDetails.freeBookingsRemaining > 0"
              @click="onConfirmBooking('offline')" 
              :disabled="isProcessing || bookingDetails.slots.length > bookingDetails.freeBookingsRemaining"
              class="payment-option payment-option-venue hover:opacity-90 transition-all"
              :class="{'opacity-50 cursor-not-allowed': bookingDetails.slots.length > bookingDetails.freeBookingsRemaining}"
            >
              <span class="payment-option-badge">Free Slot</span>
              <span v-if="isProcessing" class="flex items-center justify-center gap-2">
                <Loader2Icon class="animate-spin w-4 h-4" />
                Processing...
              </span>
              <span v-else-if="bookingDetails.slots.length > bookingDetails.freeBookingsRemaining" class="text-xs">
                Not enough free slots<br/>
                ({{ bookingDetails.freeBookingsRemaining }} remaining)
              </span>
              <span v-else>
                Pay Physically<br/>at Venue
              </span>
            </button>
          </div>
        </template>
      </div>
    </template>

  </BaseModal>
</template>

<script setup>
import BaseModal from '@/components/BaseModal.vue'
import { Loader2Icon } from 'lucide-vue-next'
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
  // Create payload with all necessary information
  const payload = { 
    paymentMethod,
    requiresPrepayment: props.requiresPrepayment,
    availablePoints: props.bookingDetails.availablePoints,
    totalPointsCost: props.bookingDetails.totalPointsCost,
    // Important: Send usingFreeSlots flag specifically for offline payments
    usingFreeSlots: paymentMethod === 'offline' ? true : false
  };
  
  console.log('[BookingConfirmationModal] Emitting confirm-booking with payload:', payload);
  emit('confirm-booking', payload);
}

</script>

<style scoped>
.payment-options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  width: 100%;
  margin-top: 0;
}

.payment-option {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem 0.75rem;
  border-radius: 0.5rem;
  transition: all 0.2s;
  font-size: 0.95rem;
  min-height: 80px;
  cursor: pointer;
  font-weight: 500;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.payment-option:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.payment-option:not(:disabled):hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

.payment-option:not(:disabled):active {
  transform: translateY(0);
}

.payment-option-khalti {
  background-color: #5C2D91;
  color: white;
}

.payment-option-points {
  background-color: #8B5CF6;
  color: white;
}

.payment-option-venue {
  background-color: #2563EB;
  color: white;
}

.payment-option-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  background-color: #10B981;
  color: white;
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 9999px;
  font-weight: 600;
}
</style>