import { ref, computed } from 'vue'
import { useApi } from './useApi'

export function useLoyaltyPoints() {
    const api = useApi()
    const points = ref(0)
    const history = ref([])
    const loading = ref(false)
    const error = ref(null)

    const formattedPoints = computed(() => points.value.toLocaleString())

    const fetchPoints = async () => {
        try {
          loading.value = true;
          const response = await api.fetchData('/api/loyalty/points');
          points.value = response.points || 0;
          return response;
        } catch (err) {
          console.error('Error fetching points:', err);
          error.value = err.message;
        } finally {
          loading.value = false;
        }
      };
    
    
      const fetchHistory = async () => {
        try {
          loading.value = true;
          const response = await api.fetchData('/api/loyalty/history');
          history.value = response || [];
          return response;
        } catch (err) {
          console.error('Error fetching history:', err);
          error.value = err.message;
        } finally {
          loading.value = false;
        }
      };
    
    const calculatePoints = async (amount) => {
        try {
            const response = await api.fetchData('/api/loyalty/calculate', {
                method: 'POST',
                body: JSON.stringify({ amount })
            })
            return response.points
        } catch (err) {
            error.value = err.message
            console.error('Error calculating points:', err)
        }
    }
    
    const checkRedemption = async (points) => {
        try {
            const response = await api.fetchData('/api/loyalty/check-redemption', {
                method: 'POST',
                body: JSON.stringify({ points })
            })
            return response
        } catch (err) {
            error.value = err.message
            console.error('Error checking redemption:', err)
            return { canRedeem: false }
        }
    }

    return {
        points,
        formattedPoints,
        history,
        loading,
        error,
        fetchPoints,
        fetchHistory,
        calculatePoints,
        checkRedemption
    }
}