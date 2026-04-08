// api.js
import axios from 'axios';
import { notification } from 'antd';
import { getValidAccessToken } from './authService';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  withCredentials: true,
  timeout: 15000, // 15 seconds timeout
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
  '/orders/validate',
  '/public/estimate-price',
  '/public/best-moving-time',
  '/csrf-token',
];
let csrfToken = null;

export const initCsrfToken = async () => {
  try {
    const res = await api.get('/csrf-token', {
  withCredentials: true,
});
    csrfToken = res.data.csrfToken;
    console.log('✅ CSRF token loaded',csrfToken);
  } catch (err) {
    console.error('❌ Failed to load CSRF token', err);
  }
};

// Hàm gắn interceptor
export const setupInterceptors = (contextLogout) => {
  api.interceptors.request.use(
    async (config) => {
      if (['post', 'put', 'patch', 'delete'].includes(config.method)) {
      if (!csrfToken) {
        await initCsrfToken();
      }
      config.headers['X-CSRF-Token'] = csrfToken;
      console.log("CSRF HEADER:", csrfToken);
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
        if (!config._retryNotificationShown) {
          notification.error({
            message: 'Mất kết nối mạng hoặc server không phản hồi',
            description: 'Đang thử kết nối lại để không gián đoạn trải nghiệm...',
            placement: 'topRight',
            duration: 5,
          });
          config._retryNotificationShown = true;
        }

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
      const errorMessage = error.response?.data?.message || error.message || "An unexpected error occurred.";
      
      // Suppress noisy toasts for known client/server validation about invalid invoice id
      if (error.response?.data?.message && String(error.response.data.message).toLowerCase().includes('invalid invoice id')) {
        // do not show notification for this specific, non-actionable message
        return Promise.reject(error);
      }

      // Handle 403 Forbidden (likely CSRF)
      if (error.response?.status === 403) {
        console.warn("⚠️ CSRF Forbidden Error detected. Clearing local token cache...");
        csrfToken = null; // Force re-init on next request
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