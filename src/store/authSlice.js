import { createSlice } from '@reduxjs/toolkit';
import { clearAccessToken } from '../services/authService';
import { resetCsrfToken } from '../services/api';

const initialState = {
  user: null,
  isAuthenticated: false,
  loading: true, 
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
  
    setCredentials: (state, action) => {
      state.user = action.payload.user;
      state.isAuthenticated = true;
      state.loading = false;
    },

    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    
    logoutStore: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.loading = false;
      clearAccessToken();
      resetCsrfToken();
      localStorage.removeItem("hasSession");
    },
  },
});

export const { setCredentials, setLoading, logoutStore } = authSlice.actions;
export default authSlice.reducer;