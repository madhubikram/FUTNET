<template>
  <div class="space-y-8">
    <!-- Pricing Information Summary -->
    <div class="bg-gray-800 rounded-lg p-4">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <!-- Regular Rate Display -->
        <div class="bg-gray-700/50 rounded p-2">
          <p class="text-xs text-gray-400">Regular Rate</p>
          <p class="text-sm font-semibold text-white">
            Rs. {{ props.court.priceHourly }}/hr
          </p>
        </div>

        <!-- Peak Hours Rate -->
        <div 
          v-if="props.court.hasPeakHours"
          class="bg-blue-500/10 border border-blue-500/20 rounded p-2"
        >
          <div class="flex flex-col">
            <p class="text-xs text-blue-300">
              Peak: Rs. {{ props.court.pricePeakHours }}/hr
            </p>
            <p class="text-xs text-blue-300/70">
              {{ formatTimeRange(props.court.peakHours) }}
            </p>
          </div>
        </div>

        <!-- Off-Peak Hours Rate -->
        <div 
          v-if="props.court.hasOffPeakHours"
          class="bg-purple-500/10 border border-purple-500/20 rounded p-2"
        >
          <div class="flex flex-col">
            <p class="text-xs text-purple-300">
              Off-Peak: Rs. {{ props.court.priceOffPeakHours }}/hr
            </p>
            <p class="text-xs text-purple-300/70">
              {{ formatTimeRange(props.court.offPeakHours) }}
            </p>
          </div>
        </div>

        <!-- Current Rate Indicator -->
        <div class="bg-green-500/10 border border-green-500/20 rounded p-2">
          <p class="text-xs text-green-400">Current Rate</p>
          <p class="text-sm font-semibold text-green-400">
            Rs. {{ currentRate }}/hr
            <span class="text-xs text-purple-300"> / {{ calculatePointsCost(currentRate) }} pts</span>
          </p>
        </div>
      </div>
    </div>

    <!-- Date Selection -->
    <div class="flex items-center gap-4">
      <input
        type="date"
        v-model="selectedDate"
        :min="today"
        class="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
      >
    </div>

    <!-- Time Slots Grid -->
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      <button
        v-for="slot in availableTimeSlots"
        :key="slot.time"
        @click="toggleTimeSlot(slot)"
        :class="[
          'p-4 rounded-lg text-center transition-all',
          {
            'bg-gray-800/50 text-gray-500 cursor-not-allowed': !slot.available,
            'bg-red-500/20 border border-red-500 text-gray-400 cursor-not-allowed': slot.booked && !slot.yourBooking,
            'bg-blue-500/20 border border-blue-500 text-white': slot.yourBooking,
            'bg-yellow-500/20 border border-yellow-500 text-white': slot.isPending,
            'bg-green-500/20 border-2 border-green-500 text-white': isSlotSelected(slot) && slot.available,
            'bg-gray-800 hover:bg-gray-700 text-white': slot.available && !isSlotSelected(slot) && !slot.booked && !slot.isPending
          }
        ]"
        :disabled="!slot.available || slot.booked || slot.isPending"
      >
        <div class="text-sm">{{ formatTime(slot.time) }}</div>
        <div class="text-xs mt-1">
          <span class="text-gray-300">Rs. {{ slot.rate }}</span>
          <span class="text-purple-300/80"> / {{ calculatePointsCost(slot.rate) }} pts</span>
        </div>
        <div v-if="slot.yourBooking" class="mt-1 text-xs text-blue-300">Your booking</div>
        <div v-if="slot.isPending" class="mt-1 text-xs text-yellow-300">Pending</div>
      </button>
    </div>

    <!-- Legend -->
    <div class="flex flex-wrap gap-4 mt-4 mb-6">
      <div class="flex items-center gap-2">
        <div class="w-4 h-4 bg-gray-800 border border-gray-700 rounded"></div>
        <span class="text-sm text-gray-400">Available</span>
      </div>
      <div class="flex items-center gap-2">
        <div class="w-4 h-4 bg-green-500/20 border border-green-500 rounded"></div>
        <span class="text-sm text-gray-400">Selected</span>
      </div>
      <div class="flex items-center gap-2">
        <div class="w-4 h-4 bg-red-500/20 border border-red-500 rounded"></div>
        <span class="text-sm text-gray-400">Booked</span>
      </div>
      <div class="flex items-center gap-2">
        <div class="w-4 h-4 bg-blue-500/20 border border-blue-500 rounded"></div>
        <span class="text-sm text-gray-400">Your Booking</span>
      </div>
    </div>

    <div v-if="!props.court.requirePrepayment" class="mt-4 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
      <div class="flex items-center justify-between">
        <div>
          <h4 class="text-sm font-medium text-blue-400">Free Booking Slots</h4>
          <p class="text-xs text-gray-400 mt-1">You get 2 free booking slots for courts without prepayment.</p>
        </div>
        <div class="text-right">
          <p class="text-lg font-semibold text-blue-400">{{ freeBookingsRemaining }}/2</p>
          <p class="text-xs text-gray-400">remaining free slots</p>
        </div>
      </div>
      <div v-if="freeBookingsRemaining === 0" class="mt-4 text-sm text-yellow-400">
        <AlertTriangleIcon class="inline-block w-4 h-4 mr-1" />
        You've used all your free slots. Payment will be required for additional bookings.
      </div>
    </div>

    <!-- Selected Slots Summary -->
    <div v-if="selectedTimeSlots.length > 0" class="mt-8">
      <div class="bg-gray-800 rounded-xl p-6">
        <h3 class="text-lg font-medium text-white mb-4">Selected Time Slots</h3>

        <!-- Booking Summary -->
        <div class="space-y-4">
          <div class="bg-gray-700/50 rounded-lg p-4">
            <div class="space-y-2">
              <div class="flex justify-between text-gray-300">
                <span>Date</span>
                <span>{{ formatDate(selectedDate) }}</span>
              </div>
              <div class="flex justify-between text-gray-300">
                <span>Duration</span>
                <span>{{ selectedTimeSlots.length }} hour(s)</span>
              </div>
              <div class="flex justify-between text-gray-300">
                <span>Booking ID</span>
                <span>{{ bookingId }}</span>
              </div>
            </div>
          </div>

          <!-- Selected Slots List -->
          <div class="space-y-2">
            <div 
              v-for="slot in selectedTimeSlots" 
              :key="slot.time"
              class="flex justify-between items-center p-3 bg-gray-700/30 rounded-lg"
            >
              <span class="text-gray-300">{{ formatTime(slot.time) }}</span>
              <div class="flex items-center gap-4">
                <span class="text-white">
                  Rs. {{ slot.rate }}
                  <span class="text-xs text-purple-300"> / {{ calculatePointsCost(slot.rate) }} pts</span>
                </span>
                <button 
                  @click="toggleTimeSlot(slot)" 
                  class="text-red-400 hover:text-red-300"
                >
                  <XCircleIcon class="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          <!-- Total Amount -->
          <div class="flex justify-between items-center p-4 bg-green-500/10 rounded-lg border border-green-500/20">
            <span class="text-green-400 font-medium">Total Amount</span>
            <span class="text-xl font-bold text-white">
              Rs. {{ totalAmount }}
              <span class="text-base font-medium text-purple-300"> / {{ totalPointsCost }} pts</span>
            </span>
          </div>

          <div v-if="!props.court.requirePrepayment && freeBookingsRemaining > 0" class="mt-4 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <div class="flex justify-between items-center">
              <div>
                <p class="text-sm text-blue-300">Free Slots Available</p>
                <p class="text-lg font-semibold text-blue-400">{{ freeBookingsRemaining }}</p>
                <p class="text-xs text-blue-200 mt-1">Free slots are automatically confirmed!</p>
              </div>
            </div>
          </div>

          <!-- Proceed Button -->
          <div>
             <button
              @click="proceedToBooking"
              class="w-full px-6 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
              :disabled="selectedTimeSlots.length === 0"
            >
              Proceed to Booking
            </button>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, defineExpose } from 'vue'
import { XCircleIcon, AlertTriangleIcon  } from 'lucide-vue-next'
import { useTimeFormatting } from '@/composables/useTimeFormatting'
import { usePriceCalculation } from '@/composables/usePriceCalculation'
import { useBooking } from '@/composables/useBooking'
import { useLoyaltyPoints } from '@/composables/useLoyaltyPoints'

const { formatTime, formatTimeRange, formatDate } = useTimeFormatting()
const { isTimeInRange, determineRate } = usePriceCalculation()
const { generateBookingId } = useBooking()
const { points: loyaltyPoints, fetchPoints } = useLoyaltyPoints()

const freeBookingsRemaining = ref(2);

const props = defineProps({
  court: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['proceed-booking'])

// --- Create the refresh method ---
const refreshBookingData = async () => {
  console.log("[BookingSection] Refreshing booking data...");
  await fetchFreeSlots();
  await generateTimeSlots();
  // Reset selected slots after refresh
  selectedTimeSlots.value = [];
}
// --- Expose the refresh method ---
defineExpose({ refreshBookingData })

onMounted(async () => {
  await fetchPoints(); // Fetch points on mount
  await refreshBookingData(); // Call the new refresh method
});

const bookingId = computed(() => generateBookingId())

// State management
const selectedDate = ref(new Date().toISOString().split('T')[0])
const selectedTimeSlots = ref([])
const availableTimeSlots = ref([])

// Computed properties
const today = computed(() => new Date().toISOString().split('T')[0])

const currentRate = computed(() => {
  const now = new Date()
  const currentTime = now.toTimeString().slice(0, 5)
  
  if (props.court.hasPeakHours && 
      isTimeInRange(currentTime, props.court.peakHours?.start, props.court.peakHours?.end)) {
    return props.court.pricePeakHours
  }
  
  if (props.court.hasOffPeakHours && 
      isTimeInRange(currentTime, props.court.offPeakHours?.start, props.court.offPeakHours?.end)) {
    return props.court.priceOffPeakHours
  }
  
  return props.court.priceHourly
})

const totalAmount = computed(() => 
  selectedTimeSlots.value.reduce((sum, slot) => sum + slot.rate, 0)
)

const totalPointsCost = computed(() => 
  calculatePointsCost(totalAmount.value)
);

const proceedToBooking = () => {
  const context = 'PROCEED_BOOKING_EMIT'; // Context for logging
  if (selectedTimeSlots.value.length === 0) {
    alert('Please select at least one time slot');
    return;
  }

  // Recalculate necessary flags just before emitting
  const numberOfSelectedSlots = selectedTimeSlots.value.length;
  const courtRequiresPrepayment = props.court?.requirePrepayment ?? false;
  const freeSlotsRemaining = freeBookingsRemaining.value;
  const slotsExceedFreeLimit = numberOfSelectedSlots > freeSlotsRemaining;
  
  // Payment is required if court mandates it OR if free slots are exceeded (when no prepayment needed)
  const requiresPayment = courtRequiresPrepayment || (!courtRequiresPrepayment && slotsExceedFreeLimit);
  // It's a free booking if no prepayment needed AND slots are within limit
  const isFreeBooking = !courtRequiresPrepayment && !slotsExceedFreeLimit;
  
  console.log(`[${context}] Debug Values Before Emit: `,
    `Court Requires Prepayment: ${courtRequiresPrepayment}`,
    `Selected Slots: ${numberOfSelectedSlots}`,
    `Free Slots Remaining: ${freeSlotsRemaining}`,
    `Total Amount: ${totalAmount.value}`,
    `Total Points Cost: ${totalPointsCost.value}`
  );

  console.log(`[${context}] Calculated Flags Before Emit: `,
    `Requires Payment: ${requiresPayment}`,
    `Is Free Booking: ${isFreeBooking}`
  );
  
  const detailsToEmit = {
    bookingId: generateBookingId(),
    date: selectedDate.value,
    slots: selectedTimeSlots.value.map(slot => ({
      time: slot.time,
      rate: slot.rate,
      pointsCost: calculatePointsCost(slot.rate)
    })),
    totalAmount: totalAmount.value,
    totalPointsCost: totalPointsCost.value,
    duration: `${numberOfSelectedSlots} hour(s)`,
    
    // --- Payment Related Flags (Modal will decide method) ---
    requiresPayment: requiresPayment, 
    isFreeBooking: isFreeBooking,
    
    // Pass available points for modal logic
    availablePoints: loyaltyPoints.value
    
    // REMOVE fields related to specific method selection
    // paymentMethod: method, 
    // redeemedPoints: pointsToRedeem,
    // pointsDiscount: pointsDiscountValue, 
    // remainingAmount: finalAmountToPay, 
  };

  console.log(`[${context}] Emitting proceed-booking with details:`, JSON.stringify(detailsToEmit, null, 2));

  emit('proceed-booking', detailsToEmit);
  // REMOVE hiding payment options
  // paymentMethodSelectionActive.value = false; 
};

// Helper function for points calculation
const calculatePointsCost = (price) => {
  if (price === null || price === undefined || isNaN(Number(price))) {
    return 0;
  }
  return Math.round(Number(price) / 5);
};

const fetchFreeSlots = async () => {
  try {
    const token = localStorage.getItem('token');
    // Add courtId to the query parameters
    const courtIdParam = props.court?._id ? `&courtId=${props.court._id}` : ''; 
    if (!courtIdParam) {
        console.warn('[BookingSection] Court ID is missing, cannot fetch free slots for this specific futsal.');
        freeBookingsRemaining.value = 0; // Default if no court ID
        return;
    }
    const dateQueryParam = `?date=${selectedDate.value}${courtIdParam}`; // Combine query params
    
    console.log(`[BookingSection] Fetching free slots for date: ${selectedDate.value} and court: ${props.court?._id}`); // Log the date and court being fetched
    
    const response = await fetch(
      `http://localhost:5000/api/bookings/free-slots${dateQueryParam}`, // Use combined query
      {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        }
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      // Use the date-specific remaining count from the response
      freeBookingsRemaining.value = data.freeBookingsRemainingToday ?? 0; 
      console.log(`[BookingSection] Fetched free slots remaining for ${selectedDate.value}:`, freeBookingsRemaining.value);
    } else {
      console.warn(`[BookingSection] Failed to fetch free slots: ${response.status} ${response.statusText}`);
      const errorData = await response.json().catch(() => ({})); 
      console.warn("[BookingSection] Error details:", errorData);
      freeBookingsRemaining.value = 0; // Default to 0 on error
    }
  } catch (error) {
    console.error('[BookingSection] Error fetching free slots:', error);
    freeBookingsRemaining.value = 0; // Default to 0 on network/other errors
  }
};

const generateTimeSlots = async () => {
  console.log(`[BookingSection] generateTimeSlots called for date: ${selectedDate.value}`); // Log start
  const { opening, closing } = props.court.futsalId?.operatingHours || {};
  if (!opening || !closing) {
    console.warn('[BookingSection] Operating hours not found, cannot generate slots.');
    availableTimeSlots.value = [];
    return;
  }

  const slots = [];
  let currentTime = opening;
  
  // Get current date and time
  const now = new Date();
  const todayString = now.toISOString().split('T')[0];
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();
  const isToday = selectedDate.value === todayString;
  
  // Fetch existing bookings for this court on this date
  const token = localStorage.getItem('token');
  const userId = localStorage.getItem('userId'); // Get userId for comparison
  let existingBookings = [];
  
  try {
    console.log(`[BookingSection] Fetching bookings for court ${props.court._id} on ${selectedDate.value}...`);
    const response = await fetch(
      `http://localhost:5000/api/courts/${props.court._id}/bookings?date=${selectedDate.value}`,
      {
        headers: { 
          'Authorization': `Bearer ${token}`
         }
      }
    );
    
    if (response.ok) {
      existingBookings = await response.json();
      console.log('[BookingSection] Fetched existing bookings for date:', selectedDate.value, JSON.parse(JSON.stringify(existingBookings))); // Log fetched bookings
    } else {
       console.error('[BookingSection] Failed to fetch existing bookings:', response.status, await response.text()); // Log error response
    }
  } catch (error) {
    console.error('[BookingSection] Error fetching existing bookings:', error);
  }

  while (currentTime < closing) {
    try {
      // Find booking that OVERLAPS with the current slot time
      const bookingForSlot = existingBookings.find(booking => 
        booking.status !== 'cancelled' &&
        booking.startTime <= currentTime && // Booking starts at or before this slot
        booking.endTime > currentTime      // Booking ends after this slot starts
      );

      // Log details for each slot check
      // console.log(`[BookingSection] Checking slot ${currentTime}: Found overlapping booking?`, bookingForSlot ? JSON.parse(JSON.stringify(bookingForSlot)) : 'No'); 

      const isBooked = !!bookingForSlot;
      const isPending = isBooked && bookingForSlot.status === 'pending';
      // Comparison logic for yourBooking remains the same
      const isYourBooking = isBooked && bookingForSlot.user?._id?.toString() === userId?.toString(); 

      if (isBooked) { 
        console.log(`[BookingSection] Slot ${currentTime}: isBooked=${isBooked}, isYourBooking=${isYourBooking}, currentUserId=${userId}, bookingUserId=${bookingForSlot?.user?._id?.toString()}`);
      }

      // Check if this time is in the past (for today only)
      const [hours, minutes] = currentTime.split(':').map(Number);
      const isPastTime = isToday && (hours < currentHour || (hours === currentHour && minutes < currentMinutes));
      
      const rate = determineRate(props.court, currentTime);

      slots.push({
        time: currentTime,
        // Slot is available only if it's not booked (by anyone), not pending (by anyone), and not in the past
        available: !isBooked && !isPastTime,
        // Only show booked/pending/your status if the slot is NOT in the past
        booked: !isPastTime && isBooked && !isYourBooking, 
        isPending: !isPastTime && isPending && !isYourBooking, 
        yourBooking: !isPastTime && isYourBooking, 
        isPastTime: isPastTime, // Keep this flag internally, might be useful later
        rate: Number(rate)
      });
    } catch (error) {
      console.error('[BookingSection] Error processing slot:', currentTime, error);
    }

    // Increment time by 1 hour
    const [hours, minutes] = currentTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + 60;
    const newHours = Math.floor(totalMinutes / 60);
    const newMinutes = totalMinutes % 60;
    currentTime = `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
  }

  availableTimeSlots.value = slots;
  console.log('[BookingSection] Updated availableTimeSlots state:', JSON.parse(JSON.stringify(availableTimeSlots.value))); // Log final state
};

const toggleTimeSlot = (slot) => {
  if (!slot.available) return
  
  const index = selectedTimeSlots.value.findIndex(s => s.time === slot.time)
  if (index > -1) {
    selectedTimeSlots.value.splice(index, 1)
  } else {
    selectedTimeSlots.value.push(slot)
  }
}

const isSlotSelected = (slot) => {
  return selectedTimeSlots.value.some(s => s.time === slot.time)
}

// Watch for date changes to regenerate time slots
watch(selectedDate, refreshBookingData) // Use refreshBookingData here too

watch(selectedTimeSlots, () => {
  console.log(`[BookingSection] Selected slots changed: ${selectedTimeSlots.value.length}, Free remaining: ${freeBookingsRemaining.value}`);
}, { deep: true });

// Initialize time slots when component mounts
// No need to call generateTimeSlots() here anymore, onMounted calls refreshBookingData
</script>
