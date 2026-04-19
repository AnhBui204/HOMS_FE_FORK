// api.js
import axios from 'axios';
import { notification } from 'antd';
import { getValidAccessToken } from './authService';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  withCredentials: true,
  timeout: 45000,
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
  '/auth/facebook-login',
  '/auth/magic',
  '/orders/validate',
  '/public/estimate-price',
  '/public/best-moving-time',
  '/csrf-token',
];
let csrfToken = null;
let csrfTokenPromise = null;

export const initCsrfToken = async () => {
  if (csrfToken) return;
  if (!csrfTokenPromise) {
    csrfTokenPromise = api.get('/csrf-token', {
      withCredentials: true,
    }).then(res => {
      csrfToken = res.data.csrfToken;
      console.log('✅ CSRF token loaded', csrfToken);
    }).catch(err => {
      console.error('❌ Failed to load CSRF token', err);
    }).finally(() => {
      csrfTokenPromise = null;
    });
  }
  await csrfTokenPromise;
};

export const resetCsrfToken = () => {
  csrfToken = null;
  csrfTokenPromise = null;
  console.log('🔄 CSRF token reset (will re-fetch on next request)');
};

// Hàm gắn interceptor
export const setupInterceptors = (contextLogout) => {
  api.interceptors.request.use(
    async (config) => {
      if (['post', 'put', 'patch', 'delete'].includes(config.method)) {
        // CSRF no longer mandatory for Bearer-protected API routes
        if (csrfToken) {
          config.headers['X-CSRF-Token'] = csrfToken;
        }
      }
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
    async (error) => {
      const config = error.config;

      // Mất kết nối mạng / Timeout handling
      if (!error.response || error.code === 'ECONNABORTED' || error.message === 'Network Error') {
        // Global network error notifications have been removed per user request.
        
        // Auto-retry for GET requests up to 2 times
        if (config && config.method === 'get') {
          config._retryCount = config._retryCount || 0;
          if (config._retryCount < 2) {
            config._retryCount += 1;
            await new Promise(resolve => setTimeout(resolve, 2000));
            return api(config);
          }
        }
      }

      // Any status codes that falls outside the range of 2xx causes this function to trigger
      
      // Suppress noisy toasts for known client/server validation about invalid invoice id
      if (error.response?.data?.message && String(error.response.data.message).toLowerCase().includes('invalid invoice id')) {
        return Promise.reject(error);
      }

      // Handle 403 Forbidden
      if (error.response?.status === 403) {
        console.warn("⚠️ 403 Forbidden detected. Check permissions or session.");
      }

      // Global error notifications have been removed per user request. 
      // Individual components are now responsible for handling their own error UI.

      return Promise.reject(error);
    }
  );
};

export default api;