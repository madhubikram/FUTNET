<template>
    <BaseModal @close="$emit('close')">
      <template #header>
        <h3 class="text-xl font-semibold text-white">Redeem Points</h3>
      </template>
  
      <template #body>
        <div class="space-y-6">
          <!-- Current Points Info -->
          <div class="bg-purple-500/10 rounded-lg p-4 border border-purple-500/20">
            <div class="flex justify-between items-center">
              <div>
                <p class="text-sm text-purple-300">Available Points</p>
                <p class="text-2xl font-bold text-purple-400">{{ formattedAvailablePoints }}</p>
              </div>
              <MedalIcon class="w-10 h-10 text-purple-400" />
            </div>
          </div>
  
          <!-- Booking Details -->
          <div class="bg-gray-700/50 rounded-lg p-4">
            <h4 class="font-medium text-white mb-2">Booking Details</h4>
            <div class="space-y-2 text-gray-300">
              <div class="flex justify-between">
                <span>Booking Total</span>
                <span>Rs. {{ bookingAmount }}</span>
              </div>
              <div class="flex justify-between">
                <span>Points Required</span>
                <span>{{ props.pointsRequired }} points</span>
              </div>
            </div>
          </div>
  
          <!-- Points Selection - REMOVED INPUT -->
          <div class="space-y-2">
            <!-- <label class="block">
              <span class="text-sm text-gray-300">Points to Redeem</span>
              <input
                v-model="pointsToRedeem"
                type="number"
                :max="Math.min(props.availablePoints, props.pointsRequired)"
                min="0"
                step="1"
                class="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white disabled:opacity-60"
                :disabled="!canRedeem"
              >
            </label> -->
            
            <!-- Display Fixed Saving Info -->
            <div v-if="canRedeem" class="text-sm text-gray-300 bg-gray-700/30 p-3 rounded-md">
              <p>Redeeming <span class="font-semibold text-purple-300">{{ props.pointsRequired }} points</span> will cover the full cost.</p>
              <p>You will save: <span class="font-semibold text-white">Rs. {{ savedAmount }}</span></p>
              <p>Remaining to pay: <span class="font-semibold text-white">Rs. {{ remainingAmount }}</span></p>
            </div>
          </div>
  
          <!-- Warning or Info Messages -->
          <div v-if="!canRedeem" class="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
            <p class="text-yellow-400 text-sm">
              You need {{ pointsShortfall }} more points to redeem for this booking.
            </p>
          </div>
        </div>
      </template>
  
      <template #footer>
        <div class="flex justify-end space-x-3">
          <button
            @click="$emit('close')"
            class="px-4 py-2 text-gray-400 hover:text-white"
          >
            Cancel
          </button>
          
          <button
            @click="confirmRedemption"
            :disabled="!canRedeem"
            class="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 
                  disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Redeem Points
          </button>
        </div>
      </template>
    </BaseModal>
  </template>
  
  <script setup>
  import { computed } from 'vue'
  import { MedalIcon } from 'lucide-vue-next'
  import BaseModal from '@/components/BaseModal.vue'
  
  const props = defineProps({
    bookingAmount: {
      type: Number,
      required: true
    },
    pointsRequired: {
      type: Number,
      required: true
    },
    availablePoints: {
      type: Number,
      required: true
    }
  })
  
  // --- Log received props ---
  console.log('[PointsRedemptionModal] Received props:', {
    availablePoints: props.availablePoints,
    pointsRequired: props.pointsRequired,
    bookingAmount: props.bookingAmount
  });
  
  const emit = defineEmits(['close', 'redeem'])
  
  const formattedAvailablePoints = computed(() => 
    new Intl.NumberFormat().format(props.availablePoints)
  );
  
  const canRedeem = computed(() => props.availablePoints >= props.pointsRequired)
  const pointsShortfall = computed(() => Math.max(0, props.pointsRequired - props.availablePoints))
  
  const POINT_VALUE = 5;
  const savedAmount = computed(() => {
      // If they can redeem, the saving covers the points required * value, capped by booking amount
      return canRedeem.value ? Math.min(props.bookingAmount, Math.round(props.pointsRequired * POINT_VALUE)) : 0;
  });
  
  const remainingAmount = computed(() => 
      // If they can redeem, remaining is booking amount - saved amount
      canRedeem.value ? Math.max(0, props.bookingAmount - savedAmount.value) : props.bookingAmount
  );
  
  const confirmRedemption = () => {
      // Only emit if redemption is possible
      if (!canRedeem.value) return;

      emit('redeem', {
          // Emit the fixed required points amount
          points: props.pointsRequired,
      })
  }
  </script>