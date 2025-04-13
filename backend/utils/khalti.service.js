const axios = require('axios');

// Utility for consistent logging
const log = (level, context, message, data = null) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level}] [${context}] ${message}`, data ? JSON.stringify(data) : '');
};

// --- Khalti Configuration ---
const KHALTI_SECRET_KEY = process.env.KHALTI_SECRET_KEY;
const KHALTI_API_URL = process.env.KHALTI_API_URL;
const FRONTEND_URL = process.env.FRONTEND_URL;
const FRONTEND_CALLBACK_PATH = process.env.FRONTEND_CALLBACK_PATH;

if (!KHALTI_SECRET_KEY || !KHALTI_API_URL || !FRONTEND_URL || !FRONTEND_CALLBACK_PATH) {
    log('ERROR', 'KHALTI_SERVICE', 'Missing required Khalti environment variables (KHALTI_SECRET_KEY, KHALTI_API_URL, FRONTEND_URL, FRONTEND_CALLBACK_PATH).');
    // Optionally throw an error to prevent startup
    // throw new Error('Missing Khalti configuration.');
}

/**
 * Initiates a payment request with Khalti.
 *
 * @param {object} initiationData - Data for initiating payment.
 * @param {string} initiationData.purchase_order_id - Your unique identifier for the order.
 * @param {string} initiationData.purchase_order_name - A descriptive name for the order.
 * @param {number} initiationData.amount - The amount in PAISA.
 * @param {string} initiationData.website_url - Your website's base URL.
 * @param {object} [initiationData.customer_info] - Optional customer details (name, email, phone).
 * @param {Array} [initiationData.amount_breakdown] - Optional amount breakdown.
 * @param {Array} [initiationData.product_details] - Optional product details.
 * @returns {Promise<{success: boolean, pidx?: string, payment_url?: string, error?: string, purchase_order_id: string}>} - Result object.
 */
const initiateKhaltiPayment = async (initiationData) => {
    const { purchase_order_id, purchase_order_name, amount, website_url, customer_info, amount_breakdown, product_details } = initiationData;
    const context = 'KHALTI_INITIATE';

    log('INFO', context, `Starting Khalti payment initiation. OrderID: ${purchase_order_id}, Amount: ${amount}`);

    if (!purchase_order_id || !purchase_order_name || !amount || !website_url) {
        log('ERROR', context, 'Missing required initiation parameters.', { purchase_order_id, purchase_order_name, amount, website_url });
        return { success: false, error: 'Missing required initiation parameters.', purchase_order_id };
    }

    const return_url = `${FRONTEND_URL}${FRONTEND_CALLBACK_PATH}`; // Construct the callback URL

    const payload = {
        return_url,
        website_url,
        amount,
        purchase_order_id,
        purchase_order_name,
        ...(customer_info && { customer_info }),
        ...(amount_breakdown && { amount_breakdown }),
        ...(product_details && { product_details }),
        // Add merchant_username or merchant_extra if needed
    };

    const headers = {
        'Authorization': `Key ${KHALTI_SECRET_KEY}`,
        'Content-Type': 'application/json'
    };

    const url = `${KHALTI_API_URL}/epayment/initiate/`;

    log('INFO', context, `Sending API call to Khalti Initiate. OrderID: ${purchase_order_id}`, { url, payload: { ...payload, return_url } }); // Log payload without sensitive headers

    try {
        const response = await axios.post(url, payload, { headers });

        if (response.data && response.data.pidx && response.data.payment_url) {
            log('INFO', context, `Khalti Initiate Success. OrderID: ${purchase_order_id}, PIDX: ${response.data.pidx}`, { responseData: response.data });
            return {
                success: true,
                pidx: response.data.pidx,
                payment_url: response.data.payment_url,
                purchase_order_id
            };
        } else {
            log('ERROR', context, `Khalti Initiate Failed - Unexpected response format. OrderID: ${purchase_order_id}`, { responseData: response.data });
            return {
                success: false,
                error: 'Unexpected response format from Khalti Initiate API.',
                purchase_order_id
            };
        }
    } catch (error) {
        const errorDetails = error.response ? { status: error.response.status, data: error.response.data } : { message: error.message };
        log('ERROR', context, `Khalti Initiate API Call Failed. OrderID: ${purchase_order_id}`, errorDetails);
        return {
            success: false,
            error: error.response ? error.response.data?.detail || JSON.stringify(error.response.data) : error.message,
            purchase_order_id
        };
    }
};

/**
 * Verifies a Khalti payment transaction using the pidx.
 *
 * @param {string} pidx - The payment identifier (pidx) received from Khalti.
 * @returns {Promise<{success: boolean, status?: string, transaction_id?: string, total_amount?: number, fee?: number, refunded?: boolean, data?: object, error?: string}>} - Result object containing verification details.
 */
const verifyKhaltiPayment = async (pidx) => {
    const context = 'KHALTI_VERIFY';
    log('INFO', context, `Starting Khalti payment verification. PIDX: ${pidx}`);

    if (!pidx) {
        log('ERROR', context, 'Missing required verification parameter: pidx.');
        return { success: false, error: 'Missing pidx for verification.' };
    }

    const payload = { pidx };
    const headers = {
        'Authorization': `Key ${KHALTI_SECRET_KEY}`,
        'Content-Type': 'application/json'
    };
    const url = `${KHALTI_API_URL}/epayment/lookup/`;

    log('INFO', context, `Sending API call to Khalti Lookup. PIDX: ${pidx}`, { url, payload });

    try {
        const response = await axios.post(url, payload, { headers });

        if (response.data && response.data.pidx && response.data.status) {
            log('INFO', context, `Khalti Lookup Success. PIDX: ${pidx}, Status: ${response.data.status}`, { responseData: response.data });
            // Return relevant details
            return {
                success: true,
                status: response.data.status,
                transaction_id: response.data.transaction_id,
                total_amount: response.data.total_amount, // Amount in Paisa
                fee: response.data.fee,
                refunded: response.data.refunded,
                data: response.data // Include full response data if needed elsewhere
            };
        } else {
            log('ERROR', context, `Khalti Lookup Failed - Unexpected response format. PIDX: ${pidx}`, { responseData: response.data });
            return {
                success: false,
                error: 'Unexpected response format from Khalti Lookup API.'
            };
        }
    } catch (error) {
        const errorDetails = error.response ? { status: error.response.status, data: error.response.data } : { message: error.message };
        log('ERROR', context, `Khalti Lookup API Call Failed. PIDX: ${pidx}`, errorDetails);
        return {
            success: false,
            error: error.response ? error.response.data?.detail || JSON.stringify(error.response.data) : error.message
        };
    }
};

module.exports = {
    initiateKhaltiPayment,
    verifyKhaltiPayment,
    log // Export log function if needed elsewhere
}; 