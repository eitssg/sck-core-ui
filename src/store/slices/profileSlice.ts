import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { API_CONFIG, buildApiUrl } from '@/lib/api-config'
import { apiFetch } from '@/lib/api-fetch'
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
 */

export interface ProfileState {
  user: UserProfile | null
  userProfiles: UserProfile[]
  currentProfile: string | null
  isLoading: boolean
  error: string | null
  lastFetched: number | null
  currentContext: string | null
  individualProfileCache: Record<string, number>
  contextCache: Record<string, number>
  contextIndex: Record<string, string[]>
}

const PERSIST_KEY = 'profile_cache_v1';
const PERSIST_TTL_MS = 10 * 60 * 1000; // 10 minutes across reloads

function hydrateInitialState(): ProfileState | null {
  try {
    const raw = sessionStorage.getItem(PERSIST_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (!cached?.ts || (Date.now() - cached.ts) > PERSIST_TTL_MS) return null;
    const state: ProfileState = {
      user: cached.user ?? null,
      userProfiles: cached.userProfiles ?? [],
      currentProfile: cached.currentProfile ?? null,
      isLoading: false,
      error: null,
      lastFetched: cached.lastFetched ?? null,
      currentContext: cached.currentContext ?? null,
  individualProfileCache: cached.individualProfileCache ?? {},
  contextCache: cached.contextCache ?? {},
  contextIndex: cached.contextIndex ?? {},
    };
    return state;
  } catch {
    return null;
  }
}

function persistState(state: ProfileState) {
  try {
    const payload = {
      ts: Date.now(),
      user: state.user,
      userProfiles: state.userProfiles,
      currentProfile: state.currentProfile,
      lastFetched: state.lastFetched,
      currentContext: state.currentContext,
  individualProfileCache: state.individualProfileCache,
  contextCache: state.contextCache,
  contextIndex: state.contextIndex,
    };
    sessionStorage.setItem(PERSIST_KEY, JSON.stringify(payload));
  } catch {
    // ignore storage errors
  }
}

const initialState: ProfileState = hydrateInitialState() ?? {
  user: null,
  userProfiles: [],
  currentProfile: null,
  isLoading: false,
  error: null,
  lastFetched: null,
  currentContext: null,
  individualProfileCache: {},
  contextCache: {},
  contextIndex: {},
}

// Normalize server payload to strict snake_case UserProfile
export function normalizeUserProfile(raw: any): UserProfile {
  const src = raw?.data ?? raw ?? {};
  const profile: UserProfile = {
    user_id: src.user_id ?? src.UserId ?? '',
    profile_name: src.profile_name ?? src.ProfileName ?? 'default',
    credentials: src.credentials ?? src.Credentials,
    identity: src.identity ?? src.Identity,
    email: src.email ?? src.Email,
    display_name: src.display_name ?? src.DisplayName,
    first_name: src.first_name ?? src.FirstName,
    last_name: src.last_name ?? src.LastName,
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
      
      const result = await response.json();
      const profile = normalizeUserProfile(result);
      
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
      
      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }
      
      const result = await response.json();
      const profile = normalizeUserProfile(result);
      
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
      
  const result = await response.json();
  const rawList = result.data || result || [];
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
      
      const result = await response.json();
      const profile = normalizeUserProfile(result);
      
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
      
      const result = await response.json();
      const profile = normalizeUserProfile(result);
      
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
        
      // When patching /auth/v1/me, include profile_name so backend knows which profile to update
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
    },
    syncFromAuth: (state, action: PayloadAction<UserProfile>) => {
      const profile = action.payload;
      state.user = profile;
      state.currentProfile = profile.profile_name;
      upsertProfile(state, profile);
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
        state.user = action.payload.profile
  state.currentProfile = action.payload.profile.profile_name
        state.currentContext = action.payload.context
        
  // Update in profiles list
  upsertProfile(state, action.payload.profile)
        
        // Update cache timestamps
  state.individualProfileCache[action.payload.profile.profile_name] = Date.now();
        state.contextCache[action.payload.context] = Date.now();
  setContextProfiles(state, action.payload.context, [action.payload.profile]);
  persistState(state);
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
  persistState(state);
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
  persistState(state);
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
  persistState(state);
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
  persistState(state);
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
        persistState(state)
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
        persistState(state)
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
