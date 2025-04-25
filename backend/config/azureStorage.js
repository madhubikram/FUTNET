const { BlobServiceClient } = require('@azure/storage-blob');
require('dotenv').config(); // Ensure environment variables are loaded

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
if (!connectionString) {
    console.warn('WARNING: AZURE_STORAGE_CONNECTION_STRING not set. Blob storage uploads will fail.');
    // You might throw an error here if uploads are critical
    // throw new Error('Azure Storage Connection String not configured.');
}

// Only create client if connection string exists
const blobServiceClient = connectionString
    ? BlobServiceClient.fromConnectionString(connectionString)
    : null;

module.exports = { blobServiceClient }; 