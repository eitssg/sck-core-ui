import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { API_CONFIG, buildApiUrl, getAuthHeaders } from '@/lib/api-config'
import type { RootState } from '@/store'

/**
 * PROFILE CACHING STRATEGY:
 * 
 * User profiles change rarely - they represent user settings/preferences
 * - Extended TTL of 15 minutes for profile lists
 * - Individual profile caching for 20 minutes
 * - Cache-first approach - only fetch if not in store or expired
 * - Client/Portfolio context caching to avoid redundant fetches
 * - Minimal server calls to reduce costs
 * - Multiple profiles per user fully supported with cross-context caching
 */

// Update the UserProfile interface to match your model
export interface UserProfile {
  user_id: string
  profile_name: string
  credentials?: Record<string, any>
  identity?: Record<string, any>
  email?: string
  display_name?: string
  first_name?: string
  last_name?: string
  avatar_url?: string
  profile_description?: string
  timezone?: string
  language?: string
  theme?: string
  notifications_enabled?: boolean
  last_login?: string
  created_at?: string
  updated_at?: string
  aws_account_id?: string
  aws_user_arn?: string
  access_key_prefix?: string
  preferred_region?: string
  permissions?: Record<string, any>
  preferences?: Record<string, any>
  session_count?: number
  is_active?: boolean
  
  // Cache metadata
  _cacheKey?: string // client/portfolio context
  _lastFetched?: number // individual profile cache timestamp
}

export interface ProfileState {
  user: UserProfile | null
  userProfiles: UserProfile[]  // List of all user profiles with cache metadata
  currentProfile: string | null  // Currently selected profile
  isLoading: boolean
  error: string | null
  
  // Enhanced caching state
  lastFetched: number | null // Last time profiles list was fetched
  currentContext: string | null // Current client/portfolio context
  individualProfileCache: Record<string, number> // profileName -> timestamp
  contextCache: Record<string, number> // client/portfolio -> timestamp
}

const initialState: ProfileState = {
  user: null,
  userProfiles: [],
  currentProfile: null,
  isLoading: false,
  error: null,
  lastFetched: null,
  currentContext: null,
  individualProfileCache: {},
  contextCache: {},
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

// Enhanced helper to find cached profile across all contexts
const findCachedProfile = (profileState: ProfileState, profileName: string, context?: string): UserProfile | null => {
  // First try to find in specific context if provided
  if (context) {
    const contextProfile = profileState.userProfiles.find(p => 
      p.profile_name === profileName && p._cacheKey === context
    );
    if (contextProfile) return contextProfile;
  }
  
  // If not found in specific context, look across all contexts
  // This allows reusing profiles across different client/portfolio combinations
  return profileState.userProfiles.find(p => p.profile_name === profileName) || null;
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
      const response = await fetch(buildProfileApiUrl(client, portfolio), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(profileData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create profile');
      }
      
      const result = await response.json();
      const profile = result.data || result;
      
      return {
        profile: {
          ...profile,
          _cacheKey: generateContextKey(client, portfolio),
          _lastFetched: Date.now()
        },
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
        
      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }
      
      const result = await response.json();
      const profile = result.data || result;
      
      return {
        profile: {
          ...profile,
          _cacheKey: context,
          _lastFetched: Date.now()
        },
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
        // Check if we have current user cached for this context
        if (state.profile.user && state.profile.user._cacheKey === context) {
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
      
      const response = await fetch(buildProfileApiUrl(client, portfolio, 'apps'), {
        headers: getAuthHeaders(),
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch profiles');
      }
      
      const result = await response.json();
      const profiles = (result.data || result || []).map((profile: UserProfile) => ({
        ...profile,
        _cacheKey: context,
        _lastFetched: Date.now()
      }));
      
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
      const response = await fetch(buildProfileApiUrl(client, portfolio), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(profileData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update profile');
      }
      
      const result = await response.json();
      const profile = result.data || result;
      
      return {
        profile: {
          ...profile,
          _cacheKey: generateContextKey(client, portfolio),
          _lastFetched: Date.now()
        },
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
      const response = await fetch(buildProfileApiUrl(client, portfolio), {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(profileData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to patch profile');
      }
      
      const result = await response.json();
      const profile = result.data || result;
      
      return {
        profile: {
          ...profile,
          _cacheKey: generateContextKey(client, portfolio),
          _lastFetched: Date.now()
        },
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
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: getAuthHeaders(),
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
  async ({ theme, client, portfolio }) => {
    try {
      const url = client && portfolio 
        ? buildProfileApiUrl(client, portfolio)
        : buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.ME);
        
      const response = await fetch(url, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ theme }),
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
      if (state.profile?.user?.theme === theme) {
        return false;
      }
      
      return true;
    },
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
    },
    clearProfileCache: (state, action: PayloadAction<string>) => {
      // Clear specific profile cache
      delete state.individualProfileCache[action.payload];
    },
    clearContextCache: (state, action: PayloadAction<string>) => {
      // Clear specific context cache
      delete state.contextCache[action.payload];
      // Remove profiles for this context
      state.userProfiles = state.userProfiles.filter(p => p._cacheKey !== action.payload);
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
      const profile = {
        ...action.payload,
        _cacheKey: 'auth',
        _lastFetched: Date.now()
      };
      
      state.user = profile
      state.currentProfile = profile.profile_name
      
      // Add to profiles list if not already there
      const existingIndex = state.userProfiles.findIndex(p => 
        p.profile_name === profile.profile_name && p._cacheKey === 'auth'
      );
      if (existingIndex >= 0) {
        state.userProfiles[existingIndex] = profile;
      } else {
        state.userProfiles.push(profile);
      }
      
      // Update cache timestamps
      state.individualProfileCache[profile.profile_name] = Date.now();
      state.contextCache['auth'] = Date.now();
    },
    setLocalTheme: (state, action: PayloadAction<string>) => {
      if (state.user) {
        state.user.theme = action.payload
        // Update in profiles list as well
        const existingIndex = state.userProfiles.findIndex(p => 
          p.profile_name === state.user!.profile_name
        );
        if (existingIndex >= 0) {
          state.userProfiles[existingIndex].theme = action.payload;
        }
      }
    },
    // Enhanced multi-profile actions
    bulkLoadProfiles: (state, action: PayloadAction<{ profiles: UserProfile[]; context: string }>) => {
      const { profiles, context } = action.payload;
      const timestamp = Date.now();
      
      profiles.forEach(profile => {
        const enhancedProfile = {
          ...profile,
          _cacheKey: context,
          _lastFetched: timestamp
        };
        
        // Update or add profile
        const existingIndex = state.userProfiles.findIndex(p => 
          p.profile_name === profile.profile_name && p._cacheKey === context
        );
        
        if (existingIndex >= 0) {
          state.userProfiles[existingIndex] = enhancedProfile;
        } else {
          state.userProfiles.push(enhancedProfile);
        }
        
        // Update cache timestamp
        state.individualProfileCache[profile.profile_name] = timestamp;
      });
      
      state.contextCache[context] = timestamp;
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
      const timestamp = Date.now();
      
      // Update all instances of this profile across different contexts
      state.userProfiles = state.userProfiles.map(profile => {
        if (profile.profile_name === profile_name) {
          return {
            ...profile,
            ...updates,
            _lastFetched: timestamp
          };
        }
        return profile;
      });
      
      // Update current user if it's the same profile
      if (state.user && state.user.profile_name === profile_name) {
        state.user = {
          ...state.user,
          ...updates,
          _lastFetched: timestamp
        };
      }
      
      // Update cache timestamp
      state.individualProfileCache[profile_name] = timestamp;
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
        state.userProfiles.push(action.payload.profile)
        state.currentContext = action.payload.context
        
        // Set as current if first profile
        if (!state.user) {
          state.user = action.payload.profile
          state.currentProfile = action.payload.profile.profile_name
        }
        
        // Update cache timestamps
        state.individualProfileCache[action.payload.profile.profile_name] = Date.now();
        state.contextCache[action.payload.context] = Date.now();
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
        const existingIndex = state.userProfiles.findIndex(p => 
          p.profile_name === action.payload.profile.profile_name && 
          p._cacheKey === action.payload.context
        );
        if (existingIndex >= 0) {
          state.userProfiles[existingIndex] = action.payload.profile;
        } else {
          state.userProfiles.push(action.payload.profile);
        }
        
        // Update cache timestamps
        state.individualProfileCache[action.payload.profile.profile_name] = Date.now();
        state.contextCache[action.payload.context] = Date.now();
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
        
        // Remove old profiles for this context and add new ones
        state.userProfiles = state.userProfiles.filter(p => p._cacheKey !== action.payload.context);
        state.userProfiles.push(...action.payload.profiles);
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
        const index = state.userProfiles.findIndex(p => 
          p.profile_name === action.payload.profile.profile_name &&
          p._cacheKey === action.payload.context
        );
        if (index >= 0) {
          state.userProfiles[index] = action.payload.profile;
        }
        
        // Update cache timestamps
        state.individualProfileCache[action.payload.profile.profile_name] = Date.now();
        state.contextCache[action.payload.context] = Date.now();
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
        const index = state.userProfiles.findIndex(p => 
          p.profile_name === action.payload.profile.profile_name &&
          p._cacheKey === action.payload.context
        );
        if (index >= 0) {
          state.userProfiles[index] = action.payload.profile;
        }
        
        // Update cache timestamps
        state.individualProfileCache[action.payload.profile.profile_name] = Date.now();
        state.contextCache[action.payload.context] = Date.now();
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
        state.userProfiles = state.userProfiles.filter(p => 
          !(p.profile_name === action.payload.profileName && p._cacheKey === action.payload.context)
        );
        
        // Clear current user if it was the deleted profile
        if (state.user?.profile_name === action.payload.profileName) {
          state.user = state.userProfiles.length > 0 ? state.userProfiles[0] : null;
          state.currentProfile = state.user?.profile_name || null;
        }
        
        // Clear cache entries
        delete state.individualProfileCache[action.payload.profileName || ''];
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
          const existingIndex = state.userProfiles.findIndex(p => 
            p.profile_name === state.user!.profile_name
          );
          if (existingIndex >= 0) {
            state.userProfiles[existingIndex].theme = action.payload;
          }
        }
      })
      .addCase(updateUserTheme.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.error.message || 'Failed to update theme'
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
export const selectUserTheme = (state: { profile: ProfileState }) => state.profile.user?.theme || 'system'
export const selectProfileLoading = (state: { profile: ProfileState }) => state.profile.isLoading
export const selectProfileError = (state: { profile: ProfileState }) => state.profile.error

// Cache-aware selectors
export const selectProfilesForContext = (state: { profile: ProfileState }, context: string) => 
  state.profile.userProfiles.filter(p => p._cacheKey === context)

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
