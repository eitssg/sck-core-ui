import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { API_CONFIG, buildApiUrl } from '@/lib/api-config';
import { apiFetch } from '@/lib/api-fetch';
import type { OAuthTokenRequest, OAuthTokenResponse } from '@/store/types';
import type { RootState, AppDispatch } from '@/store';
import type { ApiResponse } from '../shared';
import { toArray } from '../shared';
import type { Client } from '@/store/types'; // use shared type
import { authAPI } from '@/lib/auth-api';

// Summary interface for list operations (matches ClientSummary from your API)
export interface ClientSummary {
  Name: string;
  Client: string;
}

interface ClientsState {
  items: Client[];
  // Normalized structures for O(1) lookups
  byId: Record<string, Client>;
  ids: string[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error?: string | null;
  cursor: string | null;
  lastFetched: number | null;
  selectedClient: string | null;
  defaultClient: string | null;
  // Enhanced caching
  individualClientCache: Record<string, number>; // clientSlug -> timestamp
  fullClientDataCache: Record<string, boolean>; // Track which clients have full data vs summary

  // NEW: Client switching state
  currentActiveClient: string | null; // The client context from JWT token
  switchingToClient: string | null; // Client currently being switched to
  switchError: string | null; // Error during client switching
}

const initialState: ClientsState = {
  items: [],
  byId: {},
  ids: [],
  status: 'idle',
  error: null,
  cursor: null,
  lastFetched: null,
  selectedClient: null,
  defaultClient: null,
  individualClientCache: {},
  fullClientDataCache: {},
  currentActiveClient: null,
  switchingToClient: null,
  switchError: null,
};

// No UI-only fields; keep data aligned with types.ts
const normalizeClient = (client: Client): Client => ({ ...client });

// CREATE - Create new client (POST /api/v1/registry/clients)
export const createClient = createAsyncThunk(
  'clients/create',
  async (clientData: Partial<Client>, thunkAPI) => {
    try {
  const response = await apiFetch(buildApiUrl('/api/v1/registry/clients'), {
        method: 'POST',
        body: JSON.stringify(clientData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create client');
      }

      const result = await response.json();
      return normalizeClient(result.data as Client);
    } catch (error) {
      return thunkAPI.rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// READ - List all clients (GET /api/v1/registry/clients) - HEAVILY CACHED
export const fetchClients = createAsyncThunk<
  ApiResponse<Client>,
  { limit?: number; cursor?: string | null; force?: boolean } | undefined,
  { state: RootState }
>(
  'clients/fetchList',
  async (args) => {
    const limit = args?.limit ?? 100;
    const cursor = args?.cursor ?? null;

    const url = new URL(buildApiUrl('/api/v1/registry/clients'));
    url.searchParams.set('limit', String(limit));
    if (cursor) url.searchParams.set('cursor', cursor);

    // Prefer cookie-based auth (no Authorization header) to avoid CORS preflight;
    // then gracefully fall back to Bearer if the server rejects (401).
  const response = await apiFetch(url.toString(), { cookieFirst: true, dedupeKey: 'clients-401', contextLabel: 'Clients' });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

  const json = await response.json() as ApiResponse<Client>;
    return json;
  },
  {
    condition: (args, { getState }) => {
      const state = getState();
      const force = args?.force === true;
      if (force) return true;

      // Check if clients slice exists
      if (!state.clients) return true;

      const slice = state.clients;
      if (slice.status === 'loading') return false;

      // Clients change VERY rarely - extended TTL of 30 minutes
      const ttlMs = 30 * 60 * 1000; // Increased from 10 to 30 minutes
      const fresh = !!slice.lastFetched && Date.now() - slice.lastFetched < ttlMs;
      const sameCursor = (args?.cursor ?? null) === (slice.cursor ?? null);

      // Only fetch if not fresh or cursor changed
      return !(fresh && sameCursor);
    },
  }
);

// READ - Get single client (GET /api/v1/registry/clients/{client}) - CACHE INDIVIDUAL CLIENTS (plural canonical)
export const fetchClient = createAsyncThunk<
  Client,
  { clientSlug: string; force?: boolean },
  { state: RootState }
>(
  'clients/fetchSingle',
  async ({ clientSlug }) => {
    // Same CORS-friendly approach for single-client fetch.
  const response = await apiFetch(buildApiUrl(`/api/v1/registry/clients/${clientSlug}`), { cookieFirst: true, dedupeKey: `client-${clientSlug}-401`, contextLabel: 'Clients' });

    if (!response.ok) {
      throw new Error('Failed to fetch client');
    }

    const result = await response.json();
    return normalizeClient(result.data as Client);
  },
  {
    condition: ({ clientSlug, force }, { getState }) => {
      if (force) return true;

      const state = getState();
      if (!state.clients) return true;

      // Check if we already have this client in the main list
      const existingClient = state.clients.items.find(c => c.client === clientSlug);
      if (existingClient) {
        // Check if we have full client data or just summary
        const hasFullData = state.clients.fullClientDataCache[clientSlug];
        const lastFetched = state.clients.individualClientCache[clientSlug];

        if (lastFetched) {
          const ttlMs = 60 * 60 * 1000; // Increased to 60 minutes for individual clients
          const fresh = Date.now() - lastFetched < ttlMs;

          // If we have full data and it's fresh, don't fetch
          if (hasFullData && fresh) return false;

          // If we only have summary data but it's very recent (5 min), don't fetch
          if (!hasFullData && fresh && (Date.now() - lastFetched < 5 * 60 * 1000)) {
            return false;
          }
        }
      }

      return true; // Fetch if not in cache or cache expired
    },
  }
);

// UPDATE - Full update client (PUT /api/v1/registry/clients/{client})
export const updateClient = createAsyncThunk(
  'clients/update',
  async ({ clientSlug, clientData }: { clientSlug: string; clientData: Client }, thunkAPI) => {
    try {
  const response = await apiFetch(buildApiUrl(`/api/v1/registry/clients/${clientSlug}`), {
        method: 'PUT',
        body: JSON.stringify(clientData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update client');
      }

      const result = await response.json();
      return { clientSlug, client: normalizeClient(result.data as Client) };
    } catch (error) {
      return thunkAPI.rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// PATCH - Partial update client (PATCH /api/v1/registry/clients/{client})
export const patchClient = createAsyncThunk(
  'clients/patch',
  async ({ clientSlug, clientData }: { clientSlug: string; clientData: Partial<Client> }, thunkAPI) => {
    try {
  const response = await apiFetch(buildApiUrl(`/api/v1/registry/clients/${clientSlug}`), {
        method: 'PATCH',
        body: JSON.stringify(clientData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to patch client');
      }

      const result = await response.json();
      return { clientSlug, client: normalizeClient(result.data as Client) };
    } catch (error) {
      return thunkAPI.rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// DELETE - Delete client (DELETE /api/v1/registry/clients/{client})
export const deleteClient = createAsyncThunk(
  'clients/delete',
  async (clientSlug: string, thunkAPI) => {
    try {
  const response = await apiFetch(buildApiUrl(`/api/v1/registry/clients/${clientSlug}`), {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete client');
      }

      return clientSlug;
    } catch (error) {
      return thunkAPI.rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// Refresh action for force reload
export const refreshClients = () => (dispatch: AppDispatch) => {
  dispatch(clientsSlice.actions.clear());
  return dispatch(fetchClients({ limit: 100, cursor: null, force: true }));
};

// Force refresh individual client
export const refreshClient = (clientSlug: string) => (dispatch: AppDispatch) => {
  dispatch(clientsSlice.actions.clearClientCache(clientSlug));
  return dispatch(fetchClient({ clientSlug, force: true }));
};

// CLIENT SWITCHING - Switch active client context using refresh token
export const switchToClient = createAsyncThunk<
  { user: any; tokens: any; clientSlug: string },
  string,
  { state: RootState }
>(
  'clients/switchToClient',
  async (clientSlug: string, thunkAPI) => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        throw new Error('No refresh token available - please login again');
      }

      const tokenRequest: OAuthTokenRequest = {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: API_CONFIG.OAUTH.CLIENT_ID,
        state: `client=${clientSlug}`
      };

      const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.OAUTH.TOKEN), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tokenRequest),
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Only treat 401 as session expiry
        if (response.status === 401) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          throw new Error('Session expired. Please login again.');
        }

        throw new Error(errorData.error_description || `Failed to switch to client: ${clientSlug}`);
      }

      const tokens: OAuthTokenResponse = await response.json();

      // Store new tokens (now scoped to new client)
      localStorage.setItem('access_token', tokens.access_token);
      if (tokens.refresh_token) {
        localStorage.setItem('refresh_token', tokens.refresh_token);
      }

      // Fetch user profile from new client context (cached)
      const user = await authAPI.fetchUserProfile();
      if ((user as any)?.error) {
        throw new Error('Failed to fetch user profile for new client context');
      }

      return { user, tokens, clientSlug };
    } catch (error) {
      return thunkAPI.rejectWithValue(error instanceof Error ? error.message : 'Client switch failed');
    }
  });

// Helper thunk to get current client from JWT token
export const getCurrentClientFromJWT = createAsyncThunk(
  'clients/getCurrentClientFromJWT',
  async (_, thunkAPI) => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return null;

      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.client || 'core';
    } catch (error) {
      console.error('Failed to decode JWT:', error);
      return 'core';
    }
  }
);

const clientsSlice = createSlice({
  name: 'clients',
  initialState,
  reducers: {
    clear(state) {
      state.items = [];
  state.byId = {};
  state.ids = [];
      state.cursor = null;
      state.lastFetched = null;
      state.status = 'idle';
      state.error = null;
      state.selectedClient = null;
      state.defaultClient = null;
      state.individualClientCache = {};
      state.fullClientDataCache = {};
      state.currentActiveClient = null;
    },
    clearClientCache(state, action: PayloadAction<string>) {
      // Clear individual client cache
      delete state.individualClientCache[action.payload];
      delete state.fullClientDataCache[action.payload];
    },
    setClients(state, action: PayloadAction<Client[]>) {
      state.items = action.payload ?? [];
      state.byId = {};
      state.ids = [];
      (action.payload || []).forEach(c => {
        state.byId[c.client] = c;
        state.ids.push(c.client);
      });
      state.lastFetched = Date.now();
      state.status = 'succeeded';
      state.error = null;
      action.payload?.forEach(client => {
        state.individualClientCache[client.client] = Date.now();
        state.fullClientDataCache[client.client] = false;
      });
    },
    setSelectedClient(state, action: PayloadAction<string | null>) {
      state.selectedClient = action.payload ?? null;
    },
    setDefaultClient(state, action: PayloadAction<string | null>) {
      state.defaultClient = action.payload ?? null;
    },
    syncFromAPI(state, action: PayloadAction<Client>) {
      const client = normalizeClient(action.payload);
      const existingIndex = state.items.findIndex(c => c.client === client.client);
      if (existingIndex >= 0) state.items[existingIndex] = client;
      else state.items.push(client);
  state.byId[client.client] = client;
  if (!state.ids.includes(client.client)) state.ids.push(client.client);
      state.individualClientCache[client.client] = Date.now();
      state.fullClientDataCache[client.client] = true;
    },
    // NEW: Bulk update from other API responses
    bulkUpdateClients(state, action: PayloadAction<Client[]>) {
      const timestamp = Date.now();
      action.payload.forEach(c => {
        const client = normalizeClient(c);
        const existingIndex = state.items.findIndex(x => x.client === client.client);
        if (existingIndex >= 0) {
          const existing = state.items[existingIndex];
          const hasMoreData = Object.keys(client).length > Object.keys(existing).length;
          if (hasMoreData || !state.individualClientCache[client.client]) {
            state.items[existingIndex] = client;
            state.individualClientCache[client.client] = timestamp;
            state.fullClientDataCache[client.client] = true;
          }
        } else {
          state.items.push(client);
          state.individualClientCache[client.client] = timestamp;
          state.fullClientDataCache[client.client] = true;
          state.ids.push(client.client);
        }
        state.byId[client.client] = state.items.find(x => x.client === client.client) || client;
      });
    },
    // NEW: Optimize cache by removing very old entries
    optimizeClientCache(state) {
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours max age

      // Remove clients older than 24 hours
      state.items = state.items.filter(client => {
        const timestamp = state.individualClientCache[client.client];
        return timestamp && (now - timestamp) < maxAge;
      });

      // Clean up cache timestamps
      Object.keys(state.individualClientCache).forEach(slug => {
        const timestamp = state.individualClientCache[slug];
        if (!timestamp || (now - timestamp) > maxAge) {
          delete state.individualClientCache[slug];
          delete state.fullClientDataCache[slug];
        }
      });
    },

    // NEW: Client switching reducers
    setCurrentActiveClient(state, action: PayloadAction<string | null>) {
      state.currentActiveClient = action.payload;
      state.switchError = null;
    },
    clearSwitchError(state) {
      state.switchError = null;
    },
    // Clear all caches when switching clients (important for multi-tenant data isolation)
    clearAllCachesForClientSwitch(state) {
      state.items = [];
  state.byId = {};
  state.ids = [];
      state.cursor = null;
      state.lastFetched = null;
      state.individualClientCache = {};
      state.fullClientDataCache = {};
      state.status = 'idle';
      state.error = null;
    },
  // Removed retainOnlyClient (was deprecated); full list is always retained.
  },
  extraReducers: (builder) => {
    builder
      // CREATE Client
      .addCase(createClient.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(createClient.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items.push(action.payload);
        state.lastFetched = Date.now();
        // Cache the new client
        state.individualClientCache[action.payload.client] = Date.now();
      })
      .addCase(createClient.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })

      // READ Clients List
      .addCase(fetchClients.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchClients.fulfilled, (state, action: PayloadAction<ApiResponse<Client>>) => {
            const data = toArray<Client>(action.payload.data);
            const now = Date.now();

            state.items = data.map((c) => {
              const slug = (c as any).client || (c as any).Client || '';
              // Keep full data for the current active client; otherwise store minimal fields
              if (slug && slug === state.currentActiveClient) {
                state.fullClientDataCache[slug] = true;
                state.individualClientCache[slug] = now;
                return normalizeClient({ ...(c as Client), client: slug });
              }
              const minimal: Client = {
                client: slug,
                client_status: (c as any).client_status,
                client_name: (c as any).client_name || (c as any).Name,
                client_description: (c as any).client_description,
                organization_name: (c as any).organization_name,
                organization_account: (c as any).organization_account,
                created_at: (c as any).created_at,
              };
              state.fullClientDataCache[slug] = false;
              state.individualClientCache[slug] = now;
              return minimal;
            });
            // Rebuild maps
            state.byId = {};
            state.ids = [];
            state.items.forEach(c => { state.byId[c.client] = c; state.ids.push(c.client); });

            state.cursor = action.payload.metadata?.cursor ?? null;
            state.status = 'succeeded';
            state.lastFetched = now;
            state.error = null;
          })
      .addCase(fetchClients.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message ?? 'Failed to load clients';
      })

      // READ Single Client
      .addCase(fetchClient.pending, (state) => {
        // Don't set global loading for individual client fetch
        state.error = null;
      })
      .addCase(fetchClient.fulfilled, (state, action) => {
        state.status = 'succeeded';

        // Update or add the client in the list
        const existingIndex = state.items.findIndex(c => c.client === action.payload.client);
        if (existingIndex >= 0) {
          state.items[existingIndex] = action.payload;
        } else {
          state.items.push(action.payload);
          state.ids.push(action.payload.client);
        }
        state.byId[action.payload.client] = action.payload;

        // Update individual cache timestamp and mark as full data
        state.individualClientCache[action.payload.client] = Date.now();
        state.fullClientDataCache[action.payload.client] = true; // Mark as full data
        state.lastFetched = Date.now();
      })
      .addCase(fetchClient.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message ?? 'Failed to fetch client';
      })

      // UPDATE Client (PUT)
      .addCase(updateClient.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(updateClient.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const slug = action.payload.client.client;
        const index = state.items.findIndex(c => c.client === slug);
        if (index >= 0) state.items[index] = action.payload.client;
  state.byId[slug] = action.payload.client;
        state.individualClientCache[slug] = Date.now();
        state.lastFetched = Date.now();
      })
      .addCase(updateClient.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })

      // PATCH Client (PATCH)
      .addCase(patchClient.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(patchClient.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const slug = action.payload.client.client;
        const index = state.items.findIndex(c => c.client === slug);
        if (index >= 0) state.items[index] = action.payload.client;
  state.byId[slug] = action.payload.client;
        state.individualClientCache[slug] = Date.now();
        state.lastFetched = Date.now();
      })
      .addCase(patchClient.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })

      // DELETE Client
      .addCase(deleteClient.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(deleteClient.fulfilled, (state, action) => {
        state.status = 'succeeded';

        // Remove the client from the list
        state.items = state.items.filter(c => c.client !== action.payload);
  state.ids = state.ids.filter(id => id !== action.payload);
  delete state.byId[action.payload];

        // Clear selection if deleted client was selected
        if (state.selectedClient === action.payload) {
          state.selectedClient = null;
        }
        if (state.defaultClient === action.payload) {
          state.defaultClient = null;
        }

        // Remove from individual cache
        delete state.individualClientCache[action.payload];

        state.lastFetched = Date.now();
      })
      .addCase(deleteClient.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })

      // Client switching cases
      .addCase(switchToClient.pending, (state, action) => {
        state.switchingToClient = action.meta.arg; // The clientSlug being switched to
        state.switchError = null;
      })
      .addCase(switchToClient.fulfilled, (state, action) => {
        const { clientSlug } = action.payload;

        // Update current active client
        state.currentActiveClient = clientSlug;
        state.switchingToClient = null;
        state.switchError = null;

        // Set as selected client too
        state.selectedClient = clientSlug;

        // Clear all caches since we're in new client context
        state.items = [];
  state.byId = {};
  state.ids = [];
        state.cursor = null;
        state.lastFetched = null;
        state.individualClientCache = {};
        state.fullClientDataCache = {};
        state.status = 'idle';
      })
      .addCase(switchToClient.rejected, (state, action) => {
        state.switchingToClient = null;
        state.switchError = action.payload as string;

        // If session expired, clear current client
        const errorMessage = String(action.payload || '');
        if (errorMessage.includes('login again')) {
          state.currentActiveClient = null;
        }
      })

      // Get current client from JWT
      .addCase(getCurrentClientFromJWT.fulfilled, (state, action) => {
        if (action.payload) {
          state.currentActiveClient = action.payload;
          if (!state.selectedClient) {
            state.selectedClient = action.payload;
          }
        }
      });
  },
});

// Enhanced selectors
export const selectIsClientCachedWithFullData = (state: RootState, clientSlug: string) => {
  const timestamp = state.clients.individualClientCache[clientSlug];
  const hasFullData = state.clients.fullClientDataCache[clientSlug];
  if (!timestamp) return false;
  const ttlMs = 60 * 60 * 1000; // 60 minutes
  return hasFullData && (Date.now() - timestamp < ttlMs);
};

export const selectClientCacheStats = (state: RootState) => {
  const now = Date.now();
  const totalClients = state.clients.items.length;
  const cachedClients = Object.keys(state.clients.individualClientCache).length;
  const fullDataClients = Object.values(state.clients.fullClientDataCache).filter(Boolean).length;
  const freshClients = Object.values(state.clients.individualClientCache)
    .filter(timestamp => (now - timestamp) < 60 * 60 * 1000).length;

  return {
    totalClients,
    cachedClients,
    fullDataClients,
    freshClients,
    cacheHitRate: cachedClients > 0 ? (freshClients / cachedClients * 100).toFixed(1) + '%' : '0%'
  };
};

// Export enhanced actions
export const {
  clear,
  clearClientCache,
  setClients,
  setSelectedClient,
  setDefaultClient,
  syncFromAPI,
  bulkUpdateClients,
  optimizeClientCache,
  // NEW exports
  setCurrentActiveClient,
  clearSwitchError,
  clearAllCachesForClientSwitch,
} = clientsSlice.actions;

// Selectors
export const selectClients = (state: RootState) => state.clients.items;
export const selectClientsStatus = (state: RootState) => state.clients.status;
export const selectClientsError = (state: RootState) => state.clients.error;
export const selectClientsCursor = (state: RootState) => state.clients.cursor;
export const selectClientsLastFetched = (state: RootState) => state.clients.lastFetched;
export const selectSelectedClient = (state: RootState) => state.clients.selectedClient;
export const selectDefaultClient = (state: RootState) => state.clients.defaultClient;
export const selectClientBySlug = (state: RootState, clientSlug: string) =>
  state.clients.byId[clientSlug];
export const selectClientsLoading = (state: RootState) => state.clients.status === 'loading';

// Enhanced selectors for cache optimization
export const selectClientCacheTimestamp = (state: RootState, clientSlug: string) =>
  state.clients.individualClientCache[clientSlug];
export const selectIsClientCached = (state: RootState, clientSlug: string) => {
  const timestamp = state.clients.individualClientCache[clientSlug];
  if (!timestamp) return false;
  const ttlMs = 15 * 60 * 1000; // 15 minutes
  return Date.now() - timestamp < ttlMs;
};

// NEW: Client switching selectors
export const selectCurrentActiveClient = (state: RootState) => state.clients.currentActiveClient;
export const selectSwitchingToClient = (state: RootState) => state.clients.switchingToClient;
export const selectSwitchError = (state: RootState) => state.clients.switchError;
export const selectIsClientSwitching = (state: RootState) => !!state.clients.switchingToClient;
export const selectCanSwitchToClient = (state: RootState, clientSlug: string) => {
  return state.clients.items.some(c => c.client === clientSlug);
};
export const selectAvailableClientsForSwitching = (state: RootState) => {
  const currentClient = state.clients.currentActiveClient;
  return state.clients.items.filter(c => c.client !== currentClient);
};

// Convenience selectors for the currently selected client
export const selectSelectedClientObject = (state: RootState) => {
  const slug = state.clients.selectedClient;
  if (!slug) return undefined;
  return state.clients.items.find((c) => c.client === slug);
};

export const selectSelectedClientName = (state: RootState) => {
  const obj = selectSelectedClientObject(state);
  return obj?.client_name || obj?.client || 'Core';
};

export default clientsSlice.reducer;