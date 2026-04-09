import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { navigationRef } from '../navigation/RootNavigation';


// Production URL
const API_BASE_URL = "http://192.168.100.28:4000";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

let logoutHandler = null;
export const registerAuthLogoutHandler = (handler) => {
  logoutHandler = handler;
};

// Request interceptor to attach token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle 401 (expired token) errors globally
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    
    // If 401 Unauthorized (token expired or invalid), auto-logout
    if (status === 401) {
      console.log('🔒 Token expired or invalid - logging out...');

      if (logoutHandler) {
        await logoutHandler();
      } else {
        try {
          await AsyncStorage.multiRemove(['token', 'userId', 'user']);
        } catch (e) {
          console.error('Error clearing storage:', e);
        }

        if (navigationRef.isReady()) {
          navigationRef.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
        }
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
