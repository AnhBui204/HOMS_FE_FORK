import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { clearAccessToken, logoutApi } from '../services/authService';
import { resetCsrfToken } from '../services/api';
import { getUserInfo } from '../services/userService';

// THUNK 1: Đăng xuất
export const logoutUserThunk = createAsyncThunk(
  'auth/logoutUser',
  async (_, { dispatch }) => {
    console.log("👋 [Redux Thunk] Logging out - calling server");
    try {
      await logoutApi();
    } catch (error) {
      console.warn("Logout API failed:", error);
    }
    dispatch(logoutStore());
  }
);

// THUNK 2: Khởi tạo User khi App mount
export const initializeUserThunk = createAsyncThunk(
  'auth/initializeUser',
  async (_, { dispatch }) => {
    const hasSession = localStorage.getItem("hasSession") === "true";
    if (!hasSession) {
      return null;
    }

    try {
      const userData = await getUserInfo();
      return userData;
    } catch (error) {
      console.error('Error initializing user:', error);
      dispatch(logoutStore()); 
      throw error;
    }
  }
);

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
    updateUser: (state, action) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      } else {
        state.user = action.payload;
      }
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
  extraReducers: (builder) => {
    builder

      .addCase(initializeUserThunk.pending, (state) => {
        state.loading = true;
      })
      .addCase(initializeUserThunk.fulfilled, (state, action) => {
        if (action.payload) {
          state.user = action.payload;
          state.isAuthenticated = true;
        }
        state.loading = false;
      })
      .addCase(initializeUserThunk.rejected, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.loading = false;
      });
  },
});

export const { setCredentials, updateUser, setLoading, logoutStore } = authSlice.actions;
export default authSlice.reducer;