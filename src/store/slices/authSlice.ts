import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { authAPI } from '@/lib/auth-api';
import { OAuthTokenResponse, UserProfile } from '@/store/types';

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
  async (stateParam: string | undefined, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: AuthState };
      const refreshTokenFromState = state.auth.tokens?.refresh_token || null;
  const refreshTokenFromStorage = (() => { try { return sessionStorage.getItem('refresh_token'); } catch { return null; } })();
      const refreshToken = refreshTokenFromState || refreshTokenFromStorage;
      if (!refreshToken) return rejectWithValue('No refresh token available');

      console.log('Refreshing access token...');
  const newTokens = await authAPI.refreshToken(stateParam);
      
      if (!newTokens) {
        return rejectWithValue('Token refresh failed');
      }

      // Calculate expiration timestamp
  const expiresAt = Date.now() + (newTokens.expires_in * 1000);
      // Preserve existing refresh_token if server didn’t return a new one
      const finalTokens: AuthTokens = {
        ...newTokens,
        refresh_token: newTokens.refresh_token || refreshToken,
        expires_at: expiresAt,
      };
      return finalTokens;
    } catch (error) {
      console.error('Token refresh error:', error);
      return rejectWithValue(error instanceof Error ? error.message : 'Token refresh failed');
    }
  }
);

// Async thunk for login
export const loginUser = createAsyncThunk<any, { email: string; password: string }>(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const result = await authAPI.login(email, password);
      if ('error' in result) {
        return rejectWithValue(result.error_description || result.error);
      }
      // In this app, login initiates the OAuth redirect flow; success here only means
      // the session credential was set. We do not fulfill tokens/user from this thunk.
      return rejectWithValue('Redirecting to authorize...');
    } catch (error) {
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
    
    // Clear all local and session storage (no multi-session caching in app)
  try { localStorage.clear(); } catch { /* ignore */ }
  try { sessionStorage.clear(); } catch { /* ignore */ }
    
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
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload ?? null;
    },
    
    updateActivity: (state) => {
      state.lastActivity = Date.now();
    },
    
    setTokens: (state, action: PayloadAction<AuthTokens>) => {
      state.tokens = action.payload;
      state.isAuthenticated = true;
  // Option B: Do not persist access token. Persist refresh token to sessionStorage only.
  try { if (action.payload.refresh_token) sessionStorage.setItem('refresh_token', action.payload.refresh_token); } catch { /* ignore */ }
      // Broadcast token update to other tabs
      try { new BroadcastChannel('sck-auth-sync').postMessage({ type: 'auth:token' }); } catch { /* no-op */ }
    },
    
    initializeAuth: (state) => {
  // Option B: Do not bootstrap from storage; refresh will occur in useAuth using sessionStorage refresh_token and cookie.
  state.tokens = null;
  state.isAuthenticated = false;
  state.lastActivity = Date.now();
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
  // For this app, email/password login only establishes a session cookie
  // and then redirects to /authorize. We DO NOT consider the user logged in
  // until we have exchanged the code at /auth/v1/token and obtained an access_token.
  // Therefore, do not set tokens or isAuthenticated here.
  state.isLoading = false;
  state.error = null;
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
        // Always accept refreshed tokens (first tokens after reload included)
        state.tokens = action.payload;
        state.isAuthenticated = true;
        state.lastActivity = Date.now();
        state.error = null;
        try { if (action.payload.refresh_token) sessionStorage.setItem('refresh_token', action.payload.refresh_token); } catch { /* ignore */ }
        console.log('Access token refreshed successfully');
      })
      .addCase(refreshAccessToken.rejected, (state, action) => {
        console.error('Token refresh failed:', action.payload);
        state.error = action.payload as string;
  // Do not auto-logout or clear storage on 401; leave state intact.
      })
      
      // Logout cases
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.tokens = null;
        state.isAuthenticated = false;
        state.isLoading = false;
        state.error = null;
        state.lastActivity = Date.now();
  try { sessionStorage.removeItem('auth_session_active'); } catch { /* ignore */ }
      });
  },
});

export const { clearError, setError, updateActivity, setTokens, initializeAuth } = authSlice.actions;

// Selectors
export const selectAuth = (state: { auth: AuthState }) => state.auth;
export const selectUser = (state: { auth: AuthState }) => state.auth.user;
export const selectTokens = (state: { auth: AuthState }) => state.auth.tokens;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectIsLoading = (state: { auth: AuthState }) => state.auth.isLoading;
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error;

export default authSlice.reducer;
