# src/components/BaseModal.vue
<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 overflow-y-auto" role="dialog">
      <!-- Backdrop -->
      <div class="fixed inset-0 bg-black bg-opacity-50 transition-opacity backdrop-blur-sm" @click="$emit('close')"></div>

      <!-- Modal -->
      <div class="flex min-h-screen items-center justify-center p-4">
        <div class="relative bg-gray-800 rounded-xl max-w-lg w-full shadow-xl">
          <!-- Header with close button -->
          <div class="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
            <div class="flex-1 pr-4">
              <slot name="header"></slot>
            </div>
            <button 
              @click="$emit('close')" 
              class="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-gray-700/50"
              aria-label="Close modal"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Body -->
          <div class="px-6 py-4">
            <slot name="body"></slot>
          </div>

          <!-- Footer -->
          <div class="px-6 py-4 border-t border-gray-700">
            <slot name="footer">
              <div class="flex justify-end">
                <button 
                  @click="$emit('close')" 
                  class="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Close
                </button>
              </div>
            </slot>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
defineEmits(['close'])
</script>

<style>
/* Payment option buttons styling */
.payment-options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-top: 1rem;
}

.payment-option {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem 0.5rem;
  border-radius: 0.5rem;
  transition: all 0.2s;
  border: 1px solid rgba(255, 255, 255, 0.1);
  text-align: center;
  height: 100%;
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