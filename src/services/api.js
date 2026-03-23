// api.js
import axios from 'axios';
import { notification } from 'antd';
import { getValidAccessToken } from './authService';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  withCredentials: true,
  headers: {
    "ngrok-skip-browser-warning": "69420",
  },
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

  // Add response interceptor for global error handling
  api.interceptors.response.use(
    (response) => {
      // Any status code that lies within the range of 2xx causes this function to trigger
      return response;
    },
    (error) => {
      // Any status codes that falls outside the range of 2xx causes this function to trigger
      const errorMessage = error.response?.data?.message || error.message || "An unexpected error occurred.";
      
      // Suppress noisy toasts for known client/server validation about invalid invoice id
      if (error.response?.data?.message && String(error.response.data.message).toLowerCase().includes('invalid invoice id')) {
        // do not show notification for this specific, non-actionable message
        return Promise.reject(error);
      }

      // Do not show toast for 401 Unauthorized globally since it might trigger auth flows or silent refreshes
      if (error.response?.status !== 401 && error.response?.status !== 403) {
        notification.error({
          message: 'Lỗi hệ thống',
          description: errorMessage,
          placement: 'topRight',
          duration: 4,
        });
      }
      
      return Promise.reject(error);
    }
  );
};

export default api;