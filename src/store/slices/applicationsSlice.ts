import { createSlice, type PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState } from '@/store';
import type { Application } from '@/store/types';
import { buildApiUrl, API_CONFIG, getAuthHeaders } from '@/lib/api-config';
import { apiFetch } from '@/lib/api-fetch';
import { parseApiEnvelope } from '@/store/api/envelope';

type Status = 'idle' | 'loading' | 'succeeded' | 'failed';

interface ApplicationsState {
  items: Application[];
  status: Status;
  error: string | null;
  lastFetched: number | null;
  currentClient: string | null;
}

const initialState: ApplicationsState = {
  items: [],
  status: 'idle',
  error: null,
  lastFetched: null,
  currentClient: null,
};

// Fetch applications list, optionally filtered by portfolio
export const fetchApplications = createAsyncThunk<
  { items: Application[]; client: string; portfolio: string },
  { client: string; portfolio: string; limit?: number; cursor?: string | null },
  { state: RootState }
>(
  'applications/fetchList',
  async ({ client, portfolio, limit = 100, cursor }, { rejectWithValue }) => {
    try {
      const base = `/api/v1/registry/clients/${encodeURIComponent(client)}/portfolios/${encodeURIComponent(portfolio)}/apps`;
      const url = new URL(buildApiUrl(base));
      if (limit) url.searchParams.set('limit', String(limit));
      if (cursor) url.searchParams.set('cursor', cursor);

      const res = await apiFetch(url.toString(), { cookieFirst: true, contextLabel: 'Apps' });
      if (!res.ok) {
        const msg = `Failed to fetch applications (HTTP ${res.status})`;
        throw new Error(msg);
      }
      const { data } = await parseApiEnvelope<Application[] | any>(res);
      const rows: Application[] = Array.isArray(data) ? data as Application[] : [];
      return { items: rows, client, portfolio };
    } catch (e: any) {
      return rejectWithValue(e?.message || 'Unknown error');
    }
  }
);

const applicationsSlice = createSlice({
  name: 'applications',
  initialState,
  reducers: {
    clear(state) {
      state.items = [];
      state.status = 'idle';
      state.error = null;
      state.lastFetched = null;
    },
    setItems(state, action: PayloadAction<Application[]>) {
      state.items = action.payload || [];
      state.status = 'succeeded';
      state.error = null;
      state.lastFetched = Date.now();
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchApplications.pending, (state, action) => {
        state.status = 'loading';
        state.error = null;
        state.currentClient = action.meta.arg.client;
      })
      .addCase(fetchApplications.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload.items;
        state.error = null;
        state.lastFetched = Date.now();
        state.currentClient = action.payload.client;
      })
      .addCase(fetchApplications.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) || action.error.message || 'Failed to fetch applications';
      });
  }
});

export const { clear, setItems } = applicationsSlice.actions;

// Selectors
export const selectApplications = (state: RootState) => (state as any).applications?.items as Application[];
export const selectApplicationsStatus = (state: RootState) => (state as any).applications?.status as Status;

export default applicationsSlice.reducer;