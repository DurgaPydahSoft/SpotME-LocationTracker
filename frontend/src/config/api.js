// API configuration for both development and production
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Helper function to get the full API URL
export const getApiUrl = (endpoint) => {
  // In development, use relative path (Vite proxy)
  if (import.meta.env.DEV) {
    return endpoint;
  }
  
  // In production, use full backend URL
  return `${API_BASE_URL}${endpoint}`;
};

// Export the base URL for direct use if needed
export { API_BASE_URL };
