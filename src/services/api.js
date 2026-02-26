// api.js
import axios from 'axios';
import { getValidAccessToken } from './authService';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  withCredentials: true,
});
const PUBLIC_ENDPOINTS = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/logout',
  '/forgot-password',
  '/verify-otp',
  '/send-registration-otp',
  '/verify-registration-otp',
  '/reset-password',
  '/ai/chat',
  '/auth/google-login',
  '/orders/validate'
];
// Hàm gắn interceptor
export const setupInterceptors = (contextLogout) => {
  api.interceptors.request.use(
    async (config) => {
      const isPublicPage = PUBLIC_ENDPOINTS.some(endpoint => config.url.endsWith(endpoint));
      if (isPublicPage) {
        return config;
      }
      try {
        const token = await getValidAccessToken();
        if (!token) {
          console.warn("⚠️ No valid token found, logging out...");
          contextLogout();
          return Promise.reject(new Error("Token không hợp lệ hoặc đã hết hạn"));
        }
        config.headers.Authorization = `Bearer ${token}`;
        return config;
      } catch (error) {
        contextLogout();
        return Promise.reject(error);
      }
    },
    (error) => Promise.reject(error)
  );
};

export default api;