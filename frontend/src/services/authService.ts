import axios from 'axios';
import { User } from '../store/authStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 10000, // 10 second timeout
});

// Add response interceptor for better error handling
api.interceptors.response.use(
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

export const authService = {
  async getCurrentUser(): Promise<User> {
    const response = await api.get('/auth/user');
    return response.data;
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },
};