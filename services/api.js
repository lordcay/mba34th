import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';


const API_BASE_URL = 'http://192.168.0.169:4000'; // <- replace with your actual base URL

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Optional: Add a request interceptor to attach token if needed
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

export default api;
