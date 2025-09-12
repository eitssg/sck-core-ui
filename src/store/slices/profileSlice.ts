import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { logoutUser } from '@/store/slices/authSlice'
import { API_CONFIG, buildApiUrl } from '@/lib/api-config'
import { apiFetch } from '@/lib/api-fetch'
import { parseApiEnvelope } from '@/store/api/envelope'
import type { RootState } from '@/store'
import type { UserProfile } from '@/store/types'

/**
 * PROFILE CACHING STRATEGY:
 * - Extended TTL of 15 minutes for profile lists
 * - Individual profile caching for 20 minutes
 * - Cache-first approach - only fetch if not in store or expired
 * - Client/Portfolio context caching to avoid redundant fetches
 * - Minimal server calls to reduce costs
 * - Multiple profiles per user fully supported with cross-context caching
 * - Added lastAuthMeFetched (5s debounce) to suppress duplicate /auth/v1/me calls during rapid bootstrap effects
 */

export interface ProfileState {
  user: UserProfile | null
  userProfiles: UserProfile[]
  currentProfile: string | null
  isLoading: boolean
  error: string | null
  lastFetched: number | null
  lastAuthMeFetched?: number | null
  currentContext: string | null
  individualProfileCache: Record<string, number>
  contextCache: Record<string, number>
  contextIndex: Record<string, string[]>
}

const initialState: ProfileState = {
  user: null,
  userProfiles: [],
  currentProfile: null,
  isLoading: false,
  error: null,
  lastFetched: null,
  lastAuthMeFetched: null,
  currentContext: null,
  individualProfileCache: {},
  contextCache: {},
  contextIndex: {},
}

// Normalize server payload to strict snake_case UserProfile
export function normalizeUserProfile(raw: any): UserProfile {
  // Accept common envelope shapes: {data: {...}}, {user: {...}}, {profile: {...}}, {data: {user: {...}}}
  const src = (raw && (raw.data?.user || raw.user || raw.profile || raw.data || raw)) || {};
  const profile: UserProfile = {
    user_id: src.user_id ?? src.UserId ?? '',
    profile_name: src.profile_name ?? src.ProfileName ?? 'default',
    credentials: src.credentials ?? src.Credentials,
    identity: src.identity ?? src.Identity,
    email: src.email ?? src.Email,
    display_name: src.display_name ?? src.DisplayName,
    first_name: src.first_name ?? src.FirstName,
  // Accept server-side typo 'last_naem' for backward compatibility
  last_name: src.last_name ?? src.LastName ?? src.last_naem,
    avatar_url: src.avatar_url ?? src.AvatarUrl,
    profile_description: src.profile_description ?? src.ProfileDescription,
    timezone: src.timezone ?? src.Timezone,
    language: src.language ?? src.Language,
    theme: src.theme ?? src.Theme,
    notifications_enabled: src.notifications_enabled ?? src.NotificationsEnabled,
    last_login: src.last_login ?? src.LastLogin,
    created_at: src.created_at ?? src.CreatedAt,
    updated_at: src.updated_at ?? src.UpdatedAt,
    aws_account_id: src.aws_account_id ?? src.AwsAccountId,
    aws_user_arn: src.aws_user_arn ?? src.AwsUserArn,
    access_key_prefix: src.access_key_prefix ?? src.AccessKeyPrefix,
    preferred_region: src.preferred_region ?? src.PreferredRegion,
    permissions: src.permissions ?? src.Permissions,
    preferences: src.preferences ?? src.Preferences,
    session_count: src.session_count ?? src.SessionCount,
    is_active: src.is_active ?? src.IsActive,
  // MFA fields (ensure we preserve server state)
  mfa_enabled: src.mfa_enabled ?? src.MfaEnabled,
  mfa_methods: src.mfa_methods ?? src.MfaMethods,
  // Secret and recovery codes are usually not sent by /auth/me, but map if present for completeness
  totp_secret: src.totp_secret ?? src.TotpSecret,
  recovery_codes: src.recovery_codes ?? src.RecoveryCodes,
  };
  return profile;
}

// Helper function to build profile API URL
const buildProfileApiUrl = (client: string, portfolio: string, action: 'apps' | 'app' = 'app') => {
  return buildApiUrl(`/api/v1/profiles/${client}/${portfolio}/${action}`);
};

// Helper to generate cache key for context
const generateContextKey = (client?: string, portfolio?: string) => {
  if (client && portfolio) return `${client}/${portfolio}`;
  return 'auth'; // For auth endpoint
};

// Enhanced helper to find cached profile across contexts using contextIndex membership
const findCachedProfile = (profileState: ProfileState, profileName: string, context?: string): UserProfile | null => {
  if (context) {
    const members = profileState.contextIndex[context] || [];
    if (members.includes(profileName)) {
      return profileState.userProfiles.find(p => p.profile_name === profileName) || null;
    }
  }
  return profileState.userProfiles.find(p => p.profile_name === profileName) || null;
};

// Helper to upsert a profile by profile_name (no per-context duplicates)
const upsertProfile = (state: ProfileState, profile: UserProfile) => {
  const idx = state.userProfiles.findIndex(p => p.profile_name === profile.profile_name);
  if (idx >= 0) state.userProfiles[idx] = profile; else state.userProfiles.push(profile);
};

// Helper to replace context membership list
const setContextProfiles = (state: ProfileState, context: string, profiles: UserProfile[]) => {
  state.contextIndex[context] = Array.from(new Set(profiles.map(p => p.profile_name)));
};

// CRUD Operations with Aggressive Caching

// CREATE - Create new profile (POST)
export const createUserProfile = createAsyncThunk(
  'profile/createProfile',
  async ({ client, portfolio, profileData }: { 
    client: string, 
    portfolio: string, 
    profileData: Partial<UserProfile> 
  }, thunkAPI) => {
    try {
  const response = await apiFetch(buildProfileApiUrl(client, portfolio), {
        method: 'POST',
        body: JSON.stringify(profileData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create profile');
      }
      
  const { data } = await parseApiEnvelope<any>(response);
  const profile = normalizeUserProfile(data);
      
      return {
        profile,
        context: generateContextKey(client, portfolio)
      };
    } catch (error) {
      return thunkAPI.rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// READ - Get profile (GET single) - HEAVILY CACHED
export const fetchUserProfile = createAsyncThunk<
  { profile: UserProfile; context: string },
  { client?: string, portfolio?: string, profileName?: string, force?: boolean },
  { state: RootState }
>(
  'profile/fetchProfile',
  async ({ client, portfolio, profileName }) => {
    try {
      let url: string;
      const context = generateContextKey(client, portfolio);
      
      if (client && portfolio) {
        // API endpoint for specific client/portfolio
        url = buildProfileApiUrl(client, portfolio);
        if (profileName) {
          url += `?profile_name=${encodeURIComponent(profileName)}`;
        }
      } else {
        // Auth endpoint for current user
        url = profileName 
          ? `${buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.ME)}?profile=${encodeURIComponent(profileName)}`
          : buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.ME);
      }
        
  const response = await apiFetch(url, { contextLabel: 'Profile' });
      if (response.status === 401) {
        try { console.log('[profile] 401 on /auth/v1/me (legacy) -> forcing logout'); } catch { /* ignore */ }
        queueMicrotask(() => { try { (window as any).store?.dispatch?.(logoutUser() as any); } catch { /* ignore */ } });
        throw new Error('unauthorized');
      }
      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }
      
      // Use envelope only for /api context; /auth/me stays tolerant
      let profileJson: any;
      if (client && portfolio) {
        const { data } = await parseApiEnvelope<any>(response);
        profileJson = data;
      } else {
        profileJson = await response.json();
      }
      const profile = normalizeUserProfile(profileJson);
      
      return {
        profile,
        context
      };
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Unknown error');
    }
  },
  {
    condition: ({ client, portfolio, profileName, force }, { getState }) => {
      if (force) return true;
      
      const state = getState();
      if (!state.profile) return true;
      
      const context = generateContextKey(client, portfolio);
  // Prevent multiple rapid /auth/v1/me calls during bootstrap: if using auth context and fetched within 5s, skip
      if (!client && !portfolio && !profileName) {
        const last = (state.profile as any).lastAuthMeFetched;
        if (last && Date.now() - last < 5000) {
          return false;
        }
      }
      // If using auth endpoint and essential identity fields are missing, force a refetch
      if (!client && !portfolio) {
        const u = state.profile.user as any;
        if (u && (u.first_name == null || u.last_name == null || u.first_name === '' || u.last_name === '')) {
          return true;
        }
      }
      
      // Check if we have this specific profile cached (any context)
      if (profileName) {
        const cachedProfile = findCachedProfile(state.profile, profileName, context);
        if (cachedProfile) {
          const timestamp = state.profile.individualProfileCache[profileName];
          if (timestamp) {
            const ttlMs = 30 * 60 * 1000; // 30 minutes for individual profiles
            const fresh = Date.now() - timestamp < ttlMs;
            if (fresh) return false; // Don't fetch - use cached version from any context
          }
        }
      } else {
        // Check if we have current user cached recently and current context matches
        if (state.profile.user && state.profile.currentContext === context) {
          const timestamp = state.profile.individualProfileCache[state.profile.user.profile_name];
          if (timestamp) {
            const ttlMs = 30 * 60 * 1000; // 30 minutes
            const fresh = Date.now() - timestamp < ttlMs;
            if (fresh) return false;
          }
        }
      }
      
      return true; // Fetch if not cached or expired
    },
  }
);

// READ - List all profiles (GET list) - CONTEXT AWARE CACHING
export const fetchUserProfiles = createAsyncThunk<
  { profiles: UserProfile[]; context: string },
  { client: string, portfolio: string, force?: boolean },
  { state: RootState }
>(
  'profile/fetchProfiles',
  async ({ client, portfolio }) => {
    try {
      const context = generateContextKey(client, portfolio);
      
  const response = await apiFetch(buildProfileApiUrl(client, portfolio, 'apps'), { contextLabel: 'Profile' });
      
      if (!response.ok) {
        throw new Error('Failed to fetch profiles');
      }
      
  const { data } = await parseApiEnvelope<any>(response);
  const rawList = Array.isArray(data) ? data : (data || []);
  const profiles: UserProfile[] = rawList.map((p: any) => normalizeUserProfile(p));
      
      return { profiles, context };
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Unknown error');
    }
  },
  {
    condition: ({ client, portfolio, force }, { getState }) => {
      if (force) return true;
      
      const state = getState();
      if (!state.profile) return true;
      
      const context = generateContextKey(client, portfolio);
      
      // Check if we have fresh profiles for this context
      const contextTimestamp = state.profile.contextCache[context];
      if (contextTimestamp) {
        const ttlMs = 15 * 60 * 1000; // 15 minutes for profile lists
        const fresh = Date.now() - contextTimestamp < ttlMs;
        if (fresh && state.profile.currentContext === context) {
          return false; // Don't fetch - use cached profiles
        }
      }
      
      return true; // Fetch if not cached or expired
    },
  }
);

// UPDATE - Full update profile (PUT) - replaces entire record
export const updateUserProfile = createAsyncThunk(
  'profile/updateProfile',
  async ({ client, portfolio, profileData }: { 
    client: string, 
    portfolio: string, 
    profileData: UserProfile 
  }, thunkAPI) => {
    try {
  const response = await apiFetch(buildProfileApiUrl(client, portfolio), {
        method: 'PUT',
        body: JSON.stringify(profileData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update profile');
      }
      
  const { data } = await parseApiEnvelope<any>(response);
  const profile = normalizeUserProfile(data);
      
      return {
        profile,
        context: generateContextKey(client, portfolio)
      };
    } catch (error) {
      return thunkAPI.rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// PATCH - Partial update profile (PATCH) - updates only provided fields
export const patchUserProfile = createAsyncThunk(
  'profile/patchProfile',
  async ({ client, portfolio, profileData }: { 
    client: string, 
    portfolio: string, 
    profileData: Partial<UserProfile> 
  }, thunkAPI) => {
    try {
  const response = await apiFetch(buildProfileApiUrl(client, portfolio), {
        method: 'PATCH',
        body: JSON.stringify(profileData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to patch profile');
      }
      
  const { data } = await parseApiEnvelope<any>(response);
  const profile = normalizeUserProfile(data);
      
      return {
        profile,
        context: generateContextKey(client, portfolio)
      };
    } catch (error) {
      return thunkAPI.rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// DELETE - Delete profile (DELETE)
export const deleteUserProfile = createAsyncThunk(
  'profile/deleteProfile',
  async ({ client, portfolio, profileName }: { 
    client: string, 
    portfolio: string, 
    profileName?: string 
  }, thunkAPI) => {
    try {
      let url = buildProfileApiUrl(client, portfolio);
      if (profileName) {
        url += `?profile_name=${encodeURIComponent(profileName)}`;
      }
      
  const response = await apiFetch(url, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete profile');
      }
      
      return { 
        profileName, 
        client, 
        portfolio,
        context: generateContextKey(client, portfolio)
      };
    } catch (error) {
      return thunkAPI.rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// Legacy theme update for backwards compatibility - OPTIMIZED
export const updateUserTheme = createAsyncThunk<
  string,
  { theme: string, client?: string, portfolio?: string, force?: boolean },
  { state: RootState }
>(
  'profile/updateTheme',
  async ({ theme, client, portfolio }, thunkAPI) => {
    try {
      const url = client && portfolio 
        ? buildProfileApiUrl(client, portfolio)
        : buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.ME);
        
  // DEPRECATED: legacy /auth/v1/me patch path. Now using /auth/v1/profiles/{profile_name}. Retain for backward compatibility until backend removal.
      const isAuthMe = !(client && portfolio);
      const state = thunkAPI.getState();
      const profileName = state.profile?.user?.profile_name || state.profile?.currentProfile || 'default';

  const response = await apiFetch(url, {
        method: 'PATCH',
        body: JSON.stringify(isAuthMe ? { theme, profile_name: profileName } : { theme }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update theme');
      }
      
      return theme;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Unknown error');
    }
  },
  {
    condition: ({ theme, force }, { getState }) => {
      if (force) return true;
      
      const state = getState();
      // Don't make server call if theme is already set to this value
  if ((state.profile?.user as any)?.theme === theme) {
        return false;
      }
      
      return true;
    },
  }
);

// AUTH.ME - Full update (PUT) for the current user's profile
export const putCurrentUserProfile = createAsyncThunk(
  'profile/putCurrentUserProfile',
  async (profileData: Partial<UserProfile> & { profile_name: string }, thunkAPI) => {
    try {
      const url = buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.ME);
  const response = await apiFetch(url, {
        method: 'PUT',
        body: JSON.stringify(profileData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'Failed to update profile');
      }

      const result = await response.json();
      const profile = normalizeUserProfile(result);
      return { profile, context: 'auth' };
    } catch (error) {
      return thunkAPI.rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// AUTH.ME - Partial update (PATCH) for the current user's profile
export const patchCurrentUserProfile = createAsyncThunk(
  'profile/patchCurrentUserProfile',
  async (profileData: Partial<UserProfile> & { profile_name: string }, thunkAPI) => {
    try {
      const url = buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.ME);
  const response = await apiFetch(url, {
        method: 'PATCH',
        body: JSON.stringify(profileData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'Failed to patch profile');
      }

      const result = await response.json();
      const profile = normalizeUserProfile(result);
      return { profile, context: 'auth' };
    } catch (error) {
      return thunkAPI.rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

/**
 * NEW AUTH PROFILE ENDPOINTS (/auth/v1/profiles)
 * These replace legacy /auth/v1/me usage for multi-profile operations.
 * Legacy thunks above remain temporarily for backward compatibility and are DEPRECATED.
 */

// List all profiles for authenticated user (no client/portfolio scoping)
export const fetchAuthProfiles = createAsyncThunk<
  { profiles: UserProfile[]; context: string },
  { force?: boolean },
  { state: RootState }
>(
  'profile/fetchAuthProfiles',
  async () => {
    const resp = await apiFetch(buildApiUrl('/auth/v1/profiles'), { contextLabel: 'ProfileList' });
    if (resp.status === 401) {
      try { console.log('[profile] 401 on /auth/v1/profiles -> forcing logout'); } catch { /* ignore */ }
      // Dispatch logout side-effect in a fire-and-forget manner (no state passed here)
      // Using a microtask to avoid interfering with current reducer queue
      queueMicrotask(() => { try { (window as any).store?.dispatch?.(logoutUser() as any); } catch { /* ignore */ } });
      throw new Error('unauthorized');
    }
    if (!resp.ok) throw new Error('Failed to list profiles');
    const json = await resp.json();
  // Accept multiple shapes:
  // 1. { profiles: [...] }
  // 2. [ ... ]
  // 3. { data: { profiles: [...] } }
  // 4. { data: [ ... ] }
  let arr: any[] = [];
  if (Array.isArray((json as any)?.profiles)) arr = (json as any).profiles;
  else if (Array.isArray((json as any)?.data?.profiles)) arr = (json as any).data.profiles;
  else if (Array.isArray((json as any)?.data)) arr = (json as any).data;
  else if (Array.isArray(json)) arr = json as any[];
    const profiles: UserProfile[] = arr.map((p: any) => normalizeUserProfile(p));
    // Guarantee presence of default profile even if backend omits it
    if (!profiles.find(p => p.profile_name === 'default')) {
      profiles.unshift(normalizeUserProfile({ profile_name: 'default' } as any));
    }
    return { profiles, context: 'auth' };
  },
  {
    condition: ({ force }, { getState }) => {
      if (force) return true;
      const state = getState() as any;
      const ts = state.profile?.contextCache?.['auth'];
      if (!ts) return true;
      const fresh = Date.now() - ts < 15 * 60 * 1000; // 15m TTL
      return !fresh;
    },
  }
);

// Get a single profile by name
export const fetchAuthProfile = createAsyncThunk<
  { profile: UserProfile; context: string },
  { profileName: string; force?: boolean },
  { state: RootState }
>(
  'profile/fetchAuthProfile',
  async ({ profileName }) => {
    const resp = await apiFetch(buildApiUrl(`/auth/v1/profiles/${encodeURIComponent(profileName)}`), { contextLabel: 'Profile' });
    if (resp.status === 401) {
      try { console.log('[profile] 401 on /auth/v1/profiles/:name -> forcing logout'); } catch { /* ignore */ }
      queueMicrotask(() => { try { (window as any).store?.dispatch?.(logoutUser() as any); } catch { /* ignore */ } });
      throw new Error('unauthorized');
    }
    if (!resp.ok) throw new Error('Failed to fetch profile');
    const json = await resp.json();
    const profile = normalizeUserProfile(json);
    return { profile, context: 'auth' };
  },
  {
    condition: ({ profileName, force }, { getState }) => {
      if (force) return true;
      const state = getState() as any;
      const ts = state.profile?.individualProfileCache?.[profileName];
      if (!ts) return true;
      const fresh = Date.now() - ts < 30 * 60 * 1000; // 30m
      return !fresh;
    },
  }
);

// Create a new profile
export const createAuthProfile = createAsyncThunk(
  'profile/createAuthProfile',
  async ({ profileData }: { profileData: Partial<UserProfile> }) => {
    const resp = await apiFetch(buildApiUrl('/auth/v1/profiles'), {
      method: 'POST',
      body: JSON.stringify(profileData),
      contextLabel: 'ProfileCreate'
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to create profile');
    }
    const json = await resp.json();
    const profile = normalizeUserProfile(json);
    return { profile, context: 'auth' };
  }
);

// Patch a profile
export const patchAuthProfile = createAsyncThunk(
  'profile/patchAuthProfile',
  async ({ profileName, profileData }: { profileName: string; profileData: Partial<UserProfile> }) => {
    const resp = await apiFetch(buildApiUrl(`/auth/v1/profiles/${encodeURIComponent(profileName)}`), {
      method: 'PATCH',
      body: JSON.stringify(profileData),
      contextLabel: 'ProfilePatch'
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to patch profile');
    }
    const json = await resp.json();
    const profile = normalizeUserProfile(json);
    return { profile, context: 'auth' };
  }
);

// Delete a profile
export const deleteAuthProfile = createAsyncThunk(
  'profile/deleteAuthProfile',
  async ({ profileName }: { profileName: string }) => {
    const resp = await apiFetch(buildApiUrl(`/auth/v1/profiles/${encodeURIComponent(profileName)}`), {
      method: 'DELETE',
      contextLabel: 'ProfileDelete'
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to delete profile');
    }
    return { profileName };
  }
);

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    clearProfile: (state) => {
      state.user = null
      state.userProfiles = []
      state.currentProfile = null
      state.error = null
      state.isLoading = false
      state.lastFetched = null
      state.currentContext = null
      state.individualProfileCache = {}
      state.contextCache = {}
  state.contextIndex = {}
    },
    clearProfileCache: (state, action: PayloadAction<string>) => {
      // Clear specific profile cache
      delete state.individualProfileCache[action.payload];
    },
    clearContextCache: (state, action: PayloadAction<string>) => {
      // Clear specific context cache and membership
      delete state.contextCache[action.payload];
      delete state.contextIndex[action.payload];
    },
    setCurrentProfile: (state, action: PayloadAction<string>) => {
      state.currentProfile = action.payload
      // Update current user if profile exists in list
  const profile = state.userProfiles.find(p => p.profile_name === action.payload);
      if (profile) {
        state.user = profile;
      }
  try { localStorage.setItem('sck.profileName', action.payload); } catch { /* ignore */ }
    },
    syncFromAuth: (state, action: PayloadAction<UserProfile>) => {
      const profile = action.payload;
      state.user = profile;
      state.currentProfile = profile.profile_name;
      upsertProfile(state, profile);
  try { localStorage.setItem('sck.profileName', profile.profile_name); } catch { /* ignore */ }
      // Update caches and membership
      state.individualProfileCache[profile.profile_name] = Date.now();
      state.contextCache['auth'] = Date.now();
      const existing = new Set(state.contextIndex['auth'] || []);
      existing.add(profile.profile_name);
      state.contextIndex['auth'] = Array.from(existing);
    },
    setLocalTheme: (state, action: PayloadAction<string>) => {
      if (state.user) {
        (state.user as any).theme = action.payload
        // Update in profiles list as well
        const existingIndex = state.userProfiles.findIndex(p => 
          p.profile_name === state.user!.profile_name
        );
        if (existingIndex >= 0) {
          (state.userProfiles[existingIndex] as any).theme = action.payload;
        }
      }
    },
    // Enhanced multi-profile actions
    bulkLoadProfiles: (state, action: PayloadAction<{ profiles: UserProfile[]; context: string }>) => {
      const { profiles, context } = action.payload;
      const timestamp = Date.now();
      profiles.forEach(profile => {
        upsertProfile(state, profile);
        state.individualProfileCache[profile.profile_name] = timestamp;
      });
      state.contextCache[context] = timestamp;
      setContextProfiles(state, context, profiles);
    },
    switchToProfile: (state, action: PayloadAction<{ profileName: string; context?: string }>) => {
      const { profileName, context } = action.payload;
      
      // Find profile in cache (prefer specific context, fallback to any context)
      const profile = findCachedProfile(state, profileName, context);
      
      if (profile) {
        state.user = profile;
        state.currentProfile = profileName;
  try { localStorage.setItem('sck.profileName', profileName); } catch { /* ignore */ }
        if (context) {
          state.currentContext = context;
        }
      }
    },
    updateProfileGlobally: (state, action: PayloadAction<Partial<UserProfile> & { profile_name: string }>) => {
      const { profile_name, ...updates } = action.payload;
      // Update profile in list
      const idx = state.userProfiles.findIndex(p => p.profile_name === profile_name);
      if (idx >= 0) state.userProfiles[idx] = { ...state.userProfiles[idx], ...updates } as UserProfile;
      // Update current user if it's the same profile
      if (state.user && state.user.profile_name === profile_name) {
        state.user = { ...state.user, ...updates } as UserProfile;
      }
      // Touch cache timestamp
      state.individualProfileCache[profile_name] = Date.now();
    },
    optimizeCache: (state) => {
      const now = Date.now();
      const maxAge = 60 * 60 * 1000; // 1 hour max age for profiles
      
      // Remove profiles older than max age
      state.userProfiles = state.userProfiles.filter(profile => {
  const timestamp = state.individualProfileCache[profile.profile_name];
        return timestamp && (now - timestamp) < maxAge;
      });
      
      // Clean up cache timestamps for removed profiles
      Object.keys(state.individualProfileCache).forEach(profileName => {
        const timestamp = state.individualProfileCache[profileName];
        if (!timestamp || (now - timestamp) > maxAge) {
          delete state.individualProfileCache[profileName];
        }
      });
      
      // Clean up old context cache
      Object.keys(state.contextCache).forEach(context => {
        const timestamp = state.contextCache[context];
        if (!timestamp || (now - timestamp) > maxAge) {
          delete state.contextCache[context];
        }
      });
    }
  },
  extraReducers: (builder) => {
    builder
      // NEW /auth/v1/profiles list
      .addCase(fetchAuthProfiles.pending, (state) => {
        state.isLoading = true; state.error = null;
      })
      .addCase(fetchAuthProfiles.fulfilled, (state, action) => {
        state.isLoading = false;
        const { profiles, context } = action.payload;
        const ts = Date.now();
        profiles.forEach(p => { upsertProfile(state, p); state.individualProfileCache[p.profile_name] = ts; });
        state.contextCache[context] = ts;
        setContextProfiles(state, context, profiles);
        if (!state.user && profiles.length) {
          state.user = profiles.find(p => p.profile_name === 'default') || profiles[0];
          state.currentProfile = state.user.profile_name;
        }
      })
      .addCase(fetchAuthProfiles.rejected, (state, action) => {
        state.isLoading = false; state.error = action.error.message || 'Failed to list profiles';
        // Fallback: ensure at least a synthetic default profile exists for UI
        if (!state.userProfiles.find(p => p.profile_name === 'default')) {
          const synthetic: UserProfile = { profile_name: 'default' } as any;
          upsertProfile(state, synthetic);
          state.individualProfileCache['default'] = Date.now();
          const ctxSet = new Set(state.contextIndex['auth'] || []); ctxSet.add('default');
          state.contextIndex['auth'] = Array.from(ctxSet);
        }
        if (!state.user) {
          state.user = state.userProfiles.find(p => p.profile_name === 'default') || null;
          state.currentProfile = state.user ? state.user.profile_name : null;
        }
      })
      // NEW fetch single profile
      .addCase(fetchAuthProfile.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(fetchAuthProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        const { profile, context } = action.payload; const ts = Date.now();
        upsertProfile(state, profile);
        state.user = profile; state.currentProfile = profile.profile_name; state.currentContext = context;
        state.individualProfileCache[profile.profile_name] = ts; state.contextCache[context] = ts;
        const existing = new Set(state.contextIndex[context] || []); existing.add(profile.profile_name); state.contextIndex[context] = Array.from(existing);
      })
      .addCase(fetchAuthProfile.rejected, (state, action) => { state.isLoading = false; state.error = action.error.message || 'Failed to fetch profile'; })
      // NEW create profile
      .addCase(createAuthProfile.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(createAuthProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        const { profile, context } = action.payload; const ts = Date.now();
        upsertProfile(state, profile);
        if (!state.userProfiles.length) { state.user = profile; state.currentProfile = profile.profile_name; }
        state.individualProfileCache[profile.profile_name] = ts; state.contextCache[context] = ts;
        const existing = new Set(state.contextIndex[context] || []); existing.add(profile.profile_name); state.contextIndex[context] = Array.from(existing);
      })
      .addCase(createAuthProfile.rejected, (state, action) => { state.isLoading = false; state.error = action.error.message || 'Failed to create profile'; })
      // NEW patch profile
      .addCase(patchAuthProfile.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(patchAuthProfile.fulfilled, (state, action) => {
        state.isLoading = false; const { profile, context } = action.payload; const ts = Date.now();
        upsertProfile(state, profile); if (state.user?.profile_name === profile.profile_name) state.user = profile;
        state.individualProfileCache[profile.profile_name] = ts; state.contextCache[context] = ts;
        const existing = new Set(state.contextIndex[context] || []); existing.add(profile.profile_name); state.contextIndex[context] = Array.from(existing);
      })
      .addCase(patchAuthProfile.rejected, (state, action) => { state.isLoading = false; state.error = action.error.message || 'Failed to patch profile'; })
      // NEW delete profile
      .addCase(deleteAuthProfile.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(deleteAuthProfile.fulfilled, (state, action) => {
        state.isLoading = false; const { profileName } = action.payload;
        state.userProfiles = state.userProfiles.filter(p => p.profile_name !== profileName);
        Object.keys(state.contextIndex).forEach(ctx => { state.contextIndex[ctx] = (state.contextIndex[ctx]||[]).filter(n => n !== profileName); });
        delete state.individualProfileCache[profileName];
        if (state.user?.profile_name === profileName) {
          const fallback = state.userProfiles.find(p => p.profile_name === 'default') || state.userProfiles[0] || null;
          state.user = fallback; state.currentProfile = fallback ? fallback.profile_name : null;
        }
      })
      .addCase(deleteAuthProfile.rejected, (state, action) => { state.isLoading = false; state.error = action.error.message || 'Failed to delete profile'; })
      // LEGACY (DEPRECATED) SECTION BELOW
      // CREATE Profile
      .addCase(createUserProfile.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(createUserProfile.fulfilled, (state, action) => {
        state.isLoading = false
        upsertProfile(state, action.payload.profile)
        state.currentContext = action.payload.context
        
        // Set as current if first profile
        if (!state.user) {
          state.user = action.payload.profile
          state.currentProfile = action.payload.profile.profile_name
        }
        
  // Update cache timestamps and membership
  state.individualProfileCache[action.payload.profile.profile_name] = Date.now();
  state.contextCache[action.payload.context] = Date.now();
  const addSet1 = new Set(state.contextIndex[action.payload.context] || []);
  addSet1.add(action.payload.profile.profile_name);
  state.contextIndex[action.payload.context] = Array.from(addSet1);
      })
      .addCase(createUserProfile.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      
      // READ Profile (single)
      .addCase(fetchUserProfile.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.isLoading = false
  try { if ((import.meta as any)?.env?.VITE_DEBUG) console.log('[profile] fetched /auth/me', action.payload); } catch (e) { /* no-op */ }
        state.user = action.payload.profile
  state.currentProfile = action.payload.profile.profile_name
        state.currentContext = action.payload.context
  state.lastAuthMeFetched = Date.now()
        
  // Update in profiles list
  upsertProfile(state, action.payload.profile)
        
        // Update cache timestamps
  state.individualProfileCache[action.payload.profile.profile_name] = Date.now();
        state.contextCache[action.payload.context] = Date.now();
  setContextProfiles(state, action.payload.context, [action.payload.profile]);
  // no storage persistence
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message || 'Failed to fetch profile'
      })
      
      // READ Profiles (list)
      .addCase(fetchUserProfiles.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchUserProfiles.fulfilled, (state, action) => {
        state.isLoading = false
        
  // Upsert profiles and update context membership (replace for list fetch)
  action.payload.profiles.forEach(p => upsertProfile(state, p));
  setContextProfiles(state, action.payload.context, action.payload.profiles);
        state.currentContext = action.payload.context;
        
        // Set current user to first profile if none selected
        if (!state.user && action.payload.profiles.length > 0) {
          state.user = action.payload.profiles[0]
          state.currentProfile = action.payload.profiles[0].profile_name
        }
        
        // Update cache timestamps
        action.payload.profiles.forEach(profile => {
          state.individualProfileCache[profile.profile_name] = Date.now();
        });
        state.contextCache[action.payload.context] = Date.now();
        state.lastFetched = Date.now();
  // no storage persistence
      })
      .addCase(fetchUserProfiles.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message || 'Failed to fetch profiles'
      })
      
      // UPDATE Profile (PUT)
      .addCase(updateUserProfile.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.isLoading = false
        
        // Update current user if it's the same profile
  if (state.user?.profile_name === action.payload.profile.profile_name) {
          state.user = action.payload.profile
        }
        
        // Update in profiles list
  upsertProfile(state, action.payload.profile)
        
  // Update cache timestamps and membership
  state.individualProfileCache[action.payload.profile.profile_name] = Date.now();
  state.contextCache[action.payload.context] = Date.now();
  const addSet2 = new Set(state.contextIndex[action.payload.context] || []);
  addSet2.add(action.payload.profile.profile_name);
  state.contextIndex[action.payload.context] = Array.from(addSet2);
  // no storage persistence
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      
      // PATCH Profile (PATCH)
      .addCase(patchUserProfile.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(patchUserProfile.fulfilled, (state, action) => {
        state.isLoading = false
        
        // Update current user if it's the same profile
  if (state.user?.profile_name === action.payload.profile.profile_name) {
          state.user = action.payload.profile
        }
        
        // Update in profiles list
  upsertProfile(state, action.payload.profile)
        
  // Update cache timestamps and membership
  state.individualProfileCache[action.payload.profile.profile_name] = Date.now();
  state.contextCache[action.payload.context] = Date.now();
  const addSet3 = new Set(state.contextIndex[action.payload.context] || []);
  addSet3.add(action.payload.profile.profile_name);
  state.contextIndex[action.payload.context] = Array.from(addSet3);
  // no storage persistence
      })
      .addCase(patchUserProfile.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      
      // DELETE Profile
      .addCase(deleteUserProfile.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(deleteUserProfile.fulfilled, (state, action) => {
        state.isLoading = false
        
        // Remove from profiles list
        state.userProfiles = state.userProfiles.filter(p => p.profile_name !== action.payload.profileName);
        // Remove from all context memberships
        Object.keys(state.contextIndex).forEach(ctx => {
          state.contextIndex[ctx] = (state.contextIndex[ctx] || []).filter(n => n !== action.payload.profileName);
        });
        
        // Clear current user if it was the deleted profile
        if (state.user?.profile_name === action.payload.profileName) {
          state.user = state.userProfiles.length > 0 ? state.userProfiles[0] : null;
          state.currentProfile = (state.user as any)?.profile_name || null;
        }
        
        // Clear cache entries
        delete state.individualProfileCache[action.payload.profileName || ''];
  // no storage persistence
      })
      .addCase(deleteUserProfile.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      
      // Legacy theme update
      .addCase(updateUserTheme.pending, (state) => {
        state.isLoading = true
      })
      .addCase(updateUserTheme.fulfilled, (state, action) => {
        state.isLoading = false
        if (state.user) {
          state.user.theme = action.payload
          // Update in profiles list as well
          const existingIndex = state.userProfiles.findIndex(p => p.profile_name === state.user!.profile_name);
          if (existingIndex >= 0) state.userProfiles[existingIndex].theme = action.payload;
        }
      })
      .addCase(updateUserTheme.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message || 'Failed to update theme'
      })

      // AUTH.ME full update
      .addCase(putCurrentUserProfile.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(putCurrentUserProfile.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload.profile
        state.currentProfile = action.payload.profile.profile_name
        upsertProfile(state, action.payload.profile)
        // Cache + context updates
        state.individualProfileCache[action.payload.profile.profile_name] = Date.now()
        state.contextCache[action.payload.context] = Date.now()
        const addSet = new Set(state.contextIndex[action.payload.context] || [])
        addSet.add(action.payload.profile.profile_name)
        state.contextIndex[action.payload.context] = Array.from(addSet)
  state.lastAuthMeFetched = Date.now()
  // no storage persistence
      })
      .addCase(putCurrentUserProfile.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })

      // AUTH.ME partial update
      .addCase(patchCurrentUserProfile.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(patchCurrentUserProfile.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload.profile
        state.currentProfile = action.payload.profile.profile_name
        upsertProfile(state, action.payload.profile)
        // Cache + context updates
        state.individualProfileCache[action.payload.profile.profile_name] = Date.now()
        state.contextCache[action.payload.context] = Date.now()
        const addSet = new Set(state.contextIndex[action.payload.context] || [])
        addSet.add(action.payload.profile.profile_name)
        state.contextIndex[action.payload.context] = Array.from(addSet)
  state.lastAuthMeFetched = Date.now()
  // no storage persistence
      })
      .addCase(patchCurrentUserProfile.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
  },
})

export const { 
  clearProfile, 
  clearProfileCache, 
  clearContextCache, 
  setCurrentProfile, 
  syncFromAuth, 
  setLocalTheme,
  bulkLoadProfiles,
  switchToProfile,
  updateProfileGlobally,
  optimizeCache
} = profileSlice.actions

export default profileSlice.reducer

// Enhanced selectors with cache awareness
export const selectUser = (state: { profile: ProfileState }) => state.profile.user
export const selectUserProfiles = (state: { profile: ProfileState }) => state.profile.userProfiles
export const selectCurrentProfile = (state: { profile: ProfileState }) => state.profile.currentProfile
export const selectUserTheme = (state: { profile: ProfileState }) => (state.profile.user as any)?.theme || 'system'
export const selectProfileLoading = (state: { profile: ProfileState }) => state.profile.isLoading
export const selectProfileError = (state: { profile: ProfileState }) => state.profile.error

// Cache-aware selectors
export const selectProfilesForContext = (state: { profile: ProfileState }, context: string) => {
  const names = state.profile.contextIndex[context] || [];
  const nameSet = new Set(names);
  return state.profile.userProfiles.filter(p => nameSet.has(p.profile_name));
}

export const selectIsProfileCached = (state: { profile: ProfileState }, profileName: string) => {
  const timestamp = state.profile.individualProfileCache[profileName];
  if (!timestamp) return false;
  const ttlMs = 30 * 60 * 1000; // 30 minutes
  return Date.now() - timestamp < ttlMs;
}

export const selectIsContextCached = (state: { profile: ProfileState }, context: string) => {
  const timestamp = state.profile.contextCache[context];
  if (!timestamp) return false;
  const ttlMs = 15 * 60 * 1000; // 15 minutes
  return Date.now() - timestamp < ttlMs;
}

// Enhanced selectors for multi-profile management
export const selectAllUserProfiles = (state: { profile: ProfileState }, userId?: string) => {
  if (userId) {
    return state.profile.userProfiles.filter(p => p.user_id === userId);
  }
  return state.profile.userProfiles;
}

export const selectProfileByName = (state: { profile: ProfileState }, profileName: string) => {
  return state.profile.userProfiles.find(p => p.profile_name === profileName);
}

export const selectIsProfileAnyCached = (state: { profile: ProfileState }, profileName: string) => {
  const profile = state.profile.userProfiles.find(p => p.profile_name === profileName);
  if (!profile) return false;
  
  const timestamp = state.profile.individualProfileCache[profileName];
  if (!timestamp) return false;
  
  const ttlMs = 30 * 60 * 1000; // 30 minutes
  return Date.now() - timestamp < ttlMs;
}

export const selectCacheStats = (state: { profile: ProfileState }) => {
  const now = Date.now();
  const totalProfiles = state.profile.userProfiles.length;
  const uniqueProfiles = new Set(state.profile.userProfiles.map(p => p.profile_name)).size;
  const contexts = Object.keys(state.profile.contextCache).length;
  const freshProfiles = Object.values(state.profile.individualProfileCache)
    .filter(timestamp => (now - timestamp) < 30 * 60 * 1000).length;
  
  return {
    totalProfiles,
    uniqueProfiles,
    contexts,
    freshProfiles,
    cacheHitRate: totalProfiles > 0 ? (freshProfiles / totalProfiles * 100).toFixed(1) + '%' : '0%'
  };
}
