const { blobServiceClient } = require('../config/azureStorage');
const path = require('path');
const { v4: uuidv4 } = require('uuid'); // Use the installed uuid package

const uploadToBlob = async (containerName, fileBuffer, originalname, blobPathPrefix = '') => {
    if (!blobServiceClient) {
        console.error("Azure Blob Service Client not initialized. Cannot upload.");
        throw new Error("Storage service not configured.");
    }
    if (!fileBuffer) {
        throw new Error("File buffer is missing.");
    }

    const containerClient = blobServiceClient.getContainerClient(containerName);

    // Create a unique blob name using UUID
    const uniqueSuffix = uuidv4(); 
    const extension = path.extname(originalname);
    // Ensure prefix ends with a slash if it exists and is not empty
    const prefix = blobPathPrefix && !blobPathPrefix.endsWith('/') ? blobPathPrefix + '/' : blobPathPrefix;
    const blobName = `${prefix}${uniqueSuffix}${extension}`; // e.g., court-images/uuid.jpg

    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    console.log(`Uploading ${blobName} to container ${containerName}...`);
    // Use uploadData for buffers
    await blockBlobClient.uploadData(fileBuffer, {
        blobHTTPHeaders: { blobContentType: fileBuffer.type } // Set Content-Type if available from multer
    });
    console.log(`Upload successful: ${blockBlobClient.url}`);

    return blockBlobClient.url; // Return the full public URL
};

const deleteBlob = async (containerName, blobUrl) => {
    if (!blobServiceClient) {
        console.error("Azure Blob Service Client not initialized. Cannot delete.");
        throw new Error("Storage service not configured.");
    }
    if (!blobUrl || typeof blobUrl !== 'string') {
        console.warn("Invalid blob URL provided for deletion:", blobUrl);
        return; // Cannot delete without a valid URL
    }

    try {
        // Extract blob name from URL (assuming standard Azure Blob URL format)
        const url = new URL(blobUrl);
        // Pathname usually starts with /containerName/blobName, so remove container part
        const blobName = url.pathname.substring(containerName.length + 2); // +2 for the slashes
        
        if (!blobName) {
            console.warn("Could not extract blob name from URL for deletion:", blobUrl);
            return;
        }

        const containerClient = blobServiceClient.getContainerClient(containerName);
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);

        console.log(`Deleting blob ${blobName} from container ${containerName}...`);
        await blockBlobClient.deleteIfExists();
        console.log(`Blob ${blobName} deleted (or did not exist).`);

    } catch (error) {
        console.error(`Error deleting blob from URL ${blobUrl}:`, error);
        // Optionally re-throw or handle specific errors (e.g., BlobNotFound is okay)
        if (error.statusCode !== 404) {
            throw error; // Re-throw unexpected errors
        }
    }
};

module.exports = { uploadToBlob, deleteBlob }; 