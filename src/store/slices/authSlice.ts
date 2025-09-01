import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { authAPI } from '@/lib/auth-api';
import { OAuthTokenResponse, UserProfile } from '@/lib/auth-types';

export type User = UserProfile;

export type AuthTokens = OAuthTokenResponse & {
  expires_at?: number;
};

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  lastActivity: number;
}

const initialState: AuthState = {
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  lastActivity: Date.now(),
};

// Async thunk for refreshing tokens
export const refreshAccessToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: AuthState };
      const refreshToken = state.auth.tokens?.refresh_token;
      
      if (!refreshToken) {
        return rejectWithValue('No refresh token available');
      }

      console.log('Refreshing access token...');
      const newTokens = await authAPI.refreshToken();
      
      if (!newTokens) {
        return rejectWithValue('Token refresh failed');
      }

      // Calculate expiration timestamp
      const expiresAt = Date.now() + (newTokens.expires_in * 1000);
      
      return {
        ...newTokens,
        expires_at: expiresAt,
      };
    } catch (error) {
      console.error('Token refresh error:', error);
      return rejectWithValue(error instanceof Error ? error.message : 'Token refresh failed');
    }
  }
);

// Async thunk for login
export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const result = await authAPI.login(email, password);
      
      if (result.error) {
        return rejectWithValue(result.error);
      }
      
      if (!result.user || !result.tokens) {
        return rejectWithValue('Login failed - incomplete response');
      }

      // Calculate expiration timestamp
      const expiresAt = Date.now() + (result.tokens.expires_in * 1000);
      
      return {
        user: result.user,
        tokens: {
          ...result.tokens,
          expires_at: expiresAt,
        },
      };
    } catch (error) {
      console.error('Login error:', error);
      return rejectWithValue(error instanceof Error ? error.message : 'Login failed');
    }
  }
);

// Async thunk for logout
export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { getState }) => {
    // Call logout API if needed
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout API error:', error);
      // Continue with local logout even if API fails
    }
    
    // Clear localStorage
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    sessionStorage.removeItem('oauth_session_token');
    sessionStorage.removeItem('oauth_token_type');
    
    return null;
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    
    updateActivity: (state) => {
      state.lastActivity = Date.now();
    },
    
    setTokens: (state, action: PayloadAction<AuthTokens>) => {
      state.tokens = action.payload;
      state.isAuthenticated = true;
      
      // Store in localStorage
      localStorage.setItem('access_token', action.payload.access_token);
      localStorage.setItem('refresh_token', action.payload.refresh_token);
    },
    
    initializeAuth: (state) => {
      const accessToken = localStorage.getItem('access_token');
      const refreshToken = localStorage.getItem('refresh_token');
      
      if (accessToken && refreshToken) {
        state.tokens = {
          access_token: accessToken,
          refresh_token: refreshToken,
          token_type: 'Bearer',
          expires_in: 1200, // 20 minutes conservative estimate
          expires_at: Date.now() + (20 * 60 * 1000),
        };
        state.isAuthenticated = true;
        state.lastActivity = Date.now();
      }
    },
  },
  extraReducers: (builder) => {
    // Login cases
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.tokens = action.payload.tokens;
        state.isAuthenticated = true;
        state.lastActivity = Date.now();
        state.error = null;
        
        // Store tokens in localStorage
        localStorage.setItem('access_token', action.payload.tokens.access_token);
        localStorage.setItem('refresh_token', action.payload.tokens.refresh_token);
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
        state.user = null;
        state.tokens = null;
      })
      
      // Refresh token cases
      .addCase(refreshAccessToken.pending, (state) => {
        state.error = null;
      })
      .addCase(refreshAccessToken.fulfilled, (state, action) => {
        if (state.tokens) {
          state.tokens = action.payload;
          state.lastActivity = Date.now();
          state.error = null;
          
          // Update localStorage
          localStorage.setItem('access_token', action.payload.access_token);
          localStorage.setItem('refresh_token', action.payload.refresh_token);
          
          console.log('Access token refreshed successfully');
        }
      })
      .addCase(refreshAccessToken.rejected, (state, action) => {
        console.error('Token refresh failed:', action.payload);
        state.error = action.payload as string;
        
        // If refresh fails, log out the user
        state.isAuthenticated = false;
        state.user = null;
        state.tokens = null;
        
        // Clear localStorage
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      })
      
      // Logout cases
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.tokens = null;
        state.isAuthenticated = false;
        state.isLoading = false;
        state.error = null;
        state.lastActivity = Date.now();
      });
  },
});

export const { clearError, updateActivity, setTokens, initializeAuth } = authSlice.actions;

// Selectors
export const selectAuth = (state: { auth: AuthState }) => state.auth;
export const selectUser = (state: { auth: AuthState }) => state.auth.user;
export const selectTokens = (state: { auth: AuthState }) => state.auth.tokens;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectIsLoading = (state: { auth: AuthState }) => state.auth.isLoading;
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error;

export default authSlice.reducer;
