import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 30000, // 30 second timeout for GitHub operations
});

// Add response interceptor for better error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
      throw new Error(`Cannot connect to backend server at ${API_BASE_URL}. Make sure the backend is running on port 5001.`);
    }
    if (error.response?.status === 404) {
      throw new Error('API endpoint not found. Check if the backend server is running the correct version.');
    }
    if (error.response?.status >= 500) {
      throw new Error('Backend server error. Check the server logs for details.');
    }
    throw error;
  }
);