import axios from 'axios';

export const getDashboardCounts = async () => {
    try {
        const response = await axios.get('/api/dashboard/counts');
        return response.data;
    } catch (error) {
        console.error('Error fetching dashboard counts:', error.response?.data || error.message);
        throw error;
    }
};

export const getBookingTrends = async () => {
    try {
        const response = await axios.get('/api/dashboard/trends/bookings');
        return response.data;
    } catch (error) {
        console.error('Error fetching booking trends:', error.response?.data || error.message);
        throw error;
    }
};

export const getRevenueTrends = async () => {
    try {
        const response = await axios.get('/api/dashboard/trends/revenue');
        return response.data;
    } catch (error) {
        console.error('Error fetching revenue trends:', error.response?.data || error.message);
        throw error;
    }
};

export const getBookingStatusDistribution = async () => {
    try {
        const response = await axios.get('/api/dashboard/distribution/booking-status');
        return response.data;
    } catch (error) {
        console.error('Error fetching booking status distribution:', error.response?.data || error.message);
        throw error;
    }
};

export const getPaymentMethodsDistribution = async () => {
    try {
        const response = await axios.get('/api/dashboard/distribution/payment-methods');
        return response.data;
    } catch (error) {
        console.error('Error fetching payment methods distribution:', error.response?.data || error.message);
        throw error;
    }
};

export const getUpcomingTournamentsList = async () => {
    try {
        const response = await axios.get('/api/dashboard/tournaments/upcoming-list');
        return response.data;
    } catch (error) {
        console.error('Error fetching upcoming tournaments list:', error.response?.data || error.message);
        throw error; // Re-throw the error to be caught in the component
    }
};

// Add more functions to fetch other dashboard data 