const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'; // Default for local dev if VITE_API_URL is not set

// It's often better to separate the base URL for assets if they might differ
// For now, assuming API_URL works for both API calls and backend-served assets.
// If your assets are served from a different path or CDN, create a separate variable.
// e.g., export const ASSET_BASE_URL = import.meta.env.VITE_ASSET_URL || API_URL.replace('/api', ''); 

export default API_URL; // Export the API base URL (e.g., http://localhost:5000/api or https://yourdomain.com/api)

// Function to construct full asset URLs
export const getAssetUrl = (path) => {
  if (!path) return ''; // Handle null or empty paths
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('/placeholder-')) {
    // Assume absolute URLs or placeholder paths are already correct
    return path;
  }
  // Remove '/api' suffix from API_URL if present to get the base domain for assets
  const baseUrl = API_URL.endsWith('/api') ? API_URL.slice(0, -4) : API_URL;
  // Ensure the path starts with a slash
  const assetPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${assetPath}`;
};