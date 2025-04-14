<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-4">
    <div class="bg-gray-800 p-8 rounded-lg shadow-xl text-center max-w-md w-full">
      <template v-if="isLoading">
        <Loader2Icon class="w-16 h-16 text-blue-500 mx-auto animate-spin mb-6" />
        <h2 class="text-2xl font-semibold mb-2">Verifying Payment...</h2>
        <p class="text-gray-400">Please wait while we confirm your transaction with Khalti.</p>
      </template>
      <template v-else-if="isSuccess">
        <CheckCircleIcon class="w-16 h-16 text-green-500 mx-auto mb-6" />
        <h2 class="text-2xl font-semibold mb-2">Payment Successful!</h2>
        <p class="text-gray-300 mb-6">Your payment has been verified and your item is confirmed.</p>
        <button @click="navigateToTarget" class="px-6 py-2 bg-green-600 rounded-lg hover:bg-green-700 transition-colors">
          Go to My {{ itemType === 'booking' ? 'Bookings' : 'Tournaments' }}
        </button>
      </template>
      <template v-else>
        <XCircleIcon class="w-16 h-16 text-red-500 mx-auto mb-6" />
        <h2 class="text-2xl font-semibold mb-2">Payment Verification Failed</h2>
        <p class="text-gray-300 mb-6">{{ verificationMessage || 'We could not verify your payment. Please check your transaction status or contact support.' }}</p>
        <button @click="navigateToTarget" class="px-6 py-2 bg-gray-600 rounded-lg hover:bg-gray-700 transition-colors">
          Return
        </button>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { useApi } from '@/composables/useApi';
import { Loader2Icon, CheckCircleIcon, XCircleIcon } from 'lucide-vue-next';

// Utility for logging
const log = (level, context, message, data = null) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] [${context}] ${message}`, data ? JSON.stringify(data) : '');
};

const route = useRoute();
const router = useRouter();
const toast = useToast();
const { fetchData, error: apiError } = useApi();

const isLoading = ref(true);
const isSuccess = ref(false);
const verificationMessage = ref('');
const itemType = ref('booking'); // Default
const targetItemId = ref(null); // Store Booking ID or Tournament Reg ID

onMounted(async () => {
  const queryParams = route.query;
  const context = 'FRONTEND_CALLBACK';
  log('INFO', context, 'Received callback from Khalti.', queryParams);

  const pidx = queryParams.pidx;
  const purchaseOrderId = queryParams.purchase_order_id; 

  // --- Determine item type and extract IDs --- 
  if (purchaseOrderId) {
      const parts = purchaseOrderId.split('-'); // e.g., BOOKING-67fbf...-dc11d...
      if (parts[0] === 'BOOKING' && parts[1]) {
          itemType.value = 'booking';
          targetItemId.value = parts[1]; 
          log('INFO', context, `Determined type: booking, ID: ${targetItemId.value}`);
          // // Fetch the booking to get the court ID -- REMOVED as endpoint doesn't exist and data not used here
          // try {
          //     const bookingData = await fetchData(`/bookings/${targetItemId.value}`);
          //     if (bookingData?.court) {
          //         targetCourtId.value = typeof bookingData.court === 'object' 
          //                             ? bookingData.court._id 
          //                             : bookingData.court;
          //         log('INFO', context, `Fetched court ID: ${targetCourtId.value} for booking.`);
          //     }
          // } catch(fetchError) {
          //     log('ERROR', context, `Failed to fetch booking details to get court ID for ${targetItemId.value}`, fetchError);
          // }

      } else if (parts[0] === 'TOURNAMENT' && parts[1]) {
          itemType.value = 'tournament';
          targetItemId.value = parts[1]; // Tournament Registration ID
          log('INFO', context, `Determined type: tournament, Reg ID: ${targetItemId.value}`);
          // Could fetch tournament details if needed for redirection later
      }
  }
  // --- End ID extraction ---

  if (!pidx) {
    log('ERROR', context, 'PIDX missing in callback query parameters.');
    verificationMessage.value = 'Payment identifier (pidx) missing in the callback URL.';
    isLoading.value = false;
    isSuccess.value = false;
    toast.error('Payment verification failed: Missing identifier.');
    return;
  }

  // Call backend verification endpoint using fetchData
  const verifyContext = 'FRONTEND_VERIFY';
  log('INFO', verifyContext, `Sending verification request to backend for PIDX: ${pidx}`);

  try {
    // Use fetchData for the POST request
    const responseData = await fetchData('/payments/khalti/verify', {
        method: 'POST',
        body: JSON.stringify({ pidx })
        // Headers (Auth, Content-Type) are handled by useApi
    });

    log('INFO', verifyContext, 'Received verification response from backend.', responseData);

    if (responseData && responseData.success) {
      isSuccess.value = true;
      verificationMessage.value = responseData.message || 'Payment verified successfully.';
      toast.success('Payment Successful! Your item is confirmed.');
      log('INFO', verifyContext, `Payment verified successfully by backend for PIDX: ${pidx}`);
    } else {
      isSuccess.value = false;
      verificationMessage.value = responseData.message || 'Backend verification failed.';
      toast.error(verificationMessage.value);
      log('ERROR', verifyContext, `Payment verification failed on backend for PIDX: ${pidx}`, responseData);
    }
  } catch (error) {
    // Error handling in useApi already logs details
    const errorMsg = apiError.value || error.message || 'An error occurred during verification.';
    log('ERROR', verifyContext, `Error calling backend verification API for PIDX: ${pidx}`, { error: errorMsg });
    isSuccess.value = false;
    verificationMessage.value = errorMsg;
    toast.error('Verification Error: ' + verificationMessage.value);
  } finally {
    isLoading.value = false;
  }
});

const navigateToTarget = () => {
  if (isSuccess.value) {
    if (itemType.value === 'booking') {
      // Always redirect to my-bookings to ensure the user sees their booking
      log('INFO', 'PAYMENT_CALLBACK', 'Payment successful - redirecting to My Bookings page');
      router.push('/my-bookings');
      
      // Also update the local storage flag to indicate successful payment
      // This can be used by other components to refresh their data
      localStorage.setItem('paymentSuccessful', 'true');
      localStorage.setItem('lastPaymentTimestamp', Date.now().toString());
    } else if (itemType.value === 'tournament') {
      log('INFO', 'PAYMENT_CALLBACK', 'Payment successful - redirecting to My Tournaments tab');
      router.push({ path: '/tournaments', query: { tab: 'my-tournaments' } });
    }
  } else {
    // On failure, redirect back to where they likely started
    if (itemType.value === 'booking') {
      router.push('/my-bookings'); // Show them existing bookings including failed ones
    } else if (itemType.value === 'tournament') {
      router.push('/tournaments');
    } else {
      router.push('/');
    }
  }
};
</script>

<style scoped>
/* Add any specific styles if needed */
</style> 