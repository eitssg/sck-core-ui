import { createSlice, type PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { buildApiUrl, getAuthHeaders } from '@/lib/api-config';
import type { AppDeploymentBuild } from '@/store/types';

type ApiResponse<T> = {
  data: T | T[];
  metadata?: { total?: number; cursor?: string | null };
  message?: string;
  status?: string;
};

function toArray<T>(v: T | T[] | null | undefined): T[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

export interface DeploymentEvent {
  id: string;
  deploymentId: string;
  type: 'deploy' | 'test' | 'release' | 'rollback' | 'error';
  message: string;
  timestamp: string;
  status: 'success' | 'failed' | 'pending';
}

export interface Deployment {
  id: string;
  prn: string;
  clientId: string;
  portfolioId: string;
  applicationId: string;
  description: string;
  branch: string;
  build: string;
  environment: string;
  tag: string;
  region: string;
  status: 'released' | 'not-released' | 'release-in-progress' | 'teardown-in-progress' | 'failed';
  deployedAt: string;
  deployedBy: string;
  lastActivity: string;
}

interface DeploymentsState {
  deployments: Deployment[];
  events: DeploymentEvent[];
  selectedDeploymentId: string | null;
  loading: boolean;
  error: string | null;
  // new: builds fetched from /api/v1/item/builds (scoped by current client server-side)
  builds: AppDeploymentBuild[];
  lastFetched: number | null;
  cachedForClient: string | null;
}

const initialState: DeploymentsState = {
  deployments: [],
  events: [],
  selectedDeploymentId: null,
  loading: false,
  error: null,
  builds: [],
  lastFetched: null,
  cachedForClient: null,
};

// Fetch latest builds for the current client (server derives client from token)
export const fetchBuilds = createAsyncThunk<
  { builds: AppDeploymentBuild[]; when: number },
  { limit?: number } | undefined,
  { state: any }
>(
  'deployments/fetchBuilds',
  async (args, { getState }) => {
    const limit = args?.limit ?? 10;
    const url = new URL(buildApiUrl('/api/v1/item/builds'));
    url.searchParams.set('limit', String(limit));
    // optional: order desc by created_at if backend supports; otherwise comment out
    // url.searchParams.set('order', 'desc');

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      let msg = `Failed to load builds (HTTP ${res.status})`;
      try {
        const j = await res.json();
        msg = j?.message || msg;
      } catch {
        // ignore
      }
      throw new Error(msg);
    }
    const json = (await res.json()) as ApiResponse<AppDeploymentBuild>;
    const builds = toArray(json.data);
    return { builds, when: Date.now() };
  },
  {
    condition: (args, { getState }) => {
      const state = getState();
      const slice: DeploymentsState | undefined = state?.deployments;
      if (!slice) return true;
      if (slice.loading) return false;
      // Simple TTL cache (60s)
      const ttlMs = 60_000;
      if (slice.lastFetched && Date.now() - slice.lastFetched < ttlMs) return false;
      return true;
    },
  }
);

const deploymentsSlice = createSlice({
  name: 'deployments',
  initialState,
  reducers: {
    setDeployments: (state, action: PayloadAction<Deployment[]>) => {
      state.deployments = action.payload;
    },
    setEvents: (state, action: PayloadAction<DeploymentEvent[]>) => {
      state.events = action.payload;
    },
    addDeployment: (state, action: PayloadAction<Deployment>) => {
      state.deployments.push(action.payload);
    },
    addEvent: (state, action: PayloadAction<DeploymentEvent>) => {
      state.events.push(action.payload);
    },
    updateDeployment: (state, action: PayloadAction<Deployment>) => {
      const index = state.deployments.findIndex(dep => dep.id === action.payload.id);
      if (index !== -1) {
        state.deployments[index] = action.payload;
      }
    },
    removeDeployment: (state, action: PayloadAction<string>) => {
      state.deployments = state.deployments.filter(dep => dep.id !== action.payload);
      state.events = state.events.filter(event => event.deploymentId !== action.payload);
    },
    setSelectedDeployment: (state, action: PayloadAction<string | null>) => {
      state.selectedDeploymentId = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clear(state) {
      state.deployments = [];
      state.events = [];
      state.selectedDeploymentId = null;
      state.loading = false;
      state.error = null;
      state.builds = [];
      state.lastFetched = null;
      state.cachedForClient = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBuilds.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBuilds.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        state.builds = action.payload.builds;
        state.lastFetched = action.payload.when;
        // Mark which client this cache is for by peeking at clients slice
        // (action meta has state; simpler to rely on clients slice action below)
      })
      .addCase(fetchBuilds.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to load builds';
      })
      // When client changes, clear cached builds so next dashboard view refetches
      .addCase('clients/setSelectedClient' as any, (state, action: PayloadAction<string | null>) => {
        state.builds = [];
        state.lastFetched = null;
        state.cachedForClient = action.payload ?? null;
      });
  },
});

export const {
  setDeployments,
  setEvents,
  addDeployment,
  addEvent,
  updateDeployment,
  removeDeployment,
  setSelectedDeployment,
  setLoading,
  setError,
  clear,
} = deploymentsSlice.actions;

export default deploymentsSlice.reducer;