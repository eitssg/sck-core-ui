import { createSlice, type PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState } from '@/store';
import type { Application } from '@/store/types';
import { buildApiUrl, API_CONFIG, getAuthHeaders } from '@/lib/api-config';
import { apiFetch } from '@/lib/api-fetch';
import { parseApiEnvelope } from '@/store/api/envelope';
import { patchPortfolio, updatePortfolioAppCount } from './portfoliosSlice';

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
  async ({ client, portfolio, limit = 100, cursor }, { rejectWithValue, getState, dispatch }) => {
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

      // After fetching, sync portfolio app_count if mismatched
      try {
        const state = getState() as any;
        const portfolios = state?.portfolios?.items || [];
        const p = portfolios.find((pp: any) => pp?.portfolio === portfolio);
        const currentCount = typeof (p as any)?.app_count === 'number' ? (p as any).app_count : undefined;
        const nextCount = rows.length;
        if (currentCount === undefined || currentCount !== nextCount) {
          dispatch(updatePortfolioAppCount({ portfolioId: portfolio, count: nextCount }));
          await dispatch(patchPortfolio({ client, portfolio, portfolioData: { app_count: nextCount } as any }) as any);
        }
      } catch {
        // ignore
      }
      return { items: rows, client, portfolio };
    } catch (e: any) {
      return rejectWithValue(e?.message || 'Unknown error');
    }
  }
);

// Fetch a single application by slug
// Fetch a single application by slug
export const fetchApplicationDetail = createAsyncThunk<
  { item: Application; client: string; portfolio: string },
  { client: string; portfolio: string; app: string },
  { state: RootState }
>(
  'applications/fetchSingle',
  async ({ client, portfolio, app }, { rejectWithValue }) => {
    try {
      const base = `/api/v1/registry/clients/${encodeURIComponent(client)}/portfolios/${encodeURIComponent(portfolio)}/apps/${encodeURIComponent(app)}`;
      const res = await apiFetch(buildApiUrl(base), { cookieFirst: true, contextLabel: 'App:detail' });
      if (!res.ok) {
        const msg = `Failed to fetch application (HTTP ${res.status})`;
        throw new Error(msg);
      }
      const { data } = await parseApiEnvelope<Application | any>(res);
      const row: Application = data as Application;
      return { item: row, client, portfolio };
    } catch (e: any) {
      return rejectWithValue(e?.message || 'Unknown error');
    }
  }
);

// Create a new application via POST (backend generates the slug and returns it)
export const createApplication = createAsyncThunk<
  { item: Application; client: string; portfolio: string },
  { client: string; portfolio: string; payload: any },
  { state: RootState }
>(
  'applications/create',
  async ({ client, portfolio, payload }, { rejectWithValue }) => {
    try {
      const base = `/api/v1/registry/clients/${encodeURIComponent(client)}/portfolios/${encodeURIComponent(portfolio)}/apps`;
      const res = await apiFetch(buildApiUrl(base), { method: 'POST', body: JSON.stringify(payload), cookieFirst: true, contextLabel: 'App:create' });
      if (!res.ok) {
        const msg = `Failed to create application (HTTP ${res.status})`;
        throw new Error(msg);
      }
      const { data } = await parseApiEnvelope<Application | any>(res);
      const row: Application = data as Application;
      return { item: row, client, portfolio };
    } catch (e: any) {
      return rejectWithValue(e?.message || 'Unknown error');
    }
  }
);

// Update a single application via PUT
export const updateApplication = createAsyncThunk<
  { item: Application; client: string; portfolio: string },
  { client: string; portfolio: string; app: string; payload: any },
  { state: RootState }
>(
  'applications/update',
  async ({ client, portfolio, app, payload }, { rejectWithValue }) => {
    try {
      const base = `/api/v1/registry/clients/${encodeURIComponent(client)}/portfolios/${encodeURIComponent(portfolio)}/apps/${encodeURIComponent(app)}`;
      const res = await apiFetch(buildApiUrl(base), { method: 'PUT', body: JSON.stringify(payload), cookieFirst: true, contextLabel: 'App:update' });
      if (!res.ok) {
        const msg = `Failed to update application (HTTP ${res.status})`;
        throw new Error(msg);
      }
      const { data } = await parseApiEnvelope<Application | any>(res);
      const row: Application = data as Application;
      return { item: row, client, portfolio };
    } catch (e: any) {
      return rejectWithValue(e?.message || 'Unknown error');
    }
  }
);

// Delete a single application via DELETE
export const deleteApplication = createAsyncThunk<
  { app: string; portfolio: string },
  { client: string; portfolio: string; app: string },
  { state: RootState }
>(
  'applications/delete',
  async ({ client, portfolio, app }, { rejectWithValue }) => {
    try {
      const base = `/api/v1/registry/clients/${encodeURIComponent(client)}/portfolios/${encodeURIComponent(portfolio)}/apps/${encodeURIComponent(app)}`;
      const res = await apiFetch(buildApiUrl(base), { method: 'DELETE', cookieFirst: true, contextLabel: 'App:delete' });
      if (!res.ok) {
        const msg = `Failed to delete application (HTTP ${res.status})`;
        throw new Error(msg);
      }
      // Some APIs return data or nothing on delete; we don't require parsing
      try {
        await parseApiEnvelope<any>(res);
      } catch (_) {
        // ignore parse errors for empty bodies
      }
      return { app, portfolio };
    } catch (e: any) {
      return rejectWithValue(e?.message || 'Unknown error');
    }
  }
);

// Helper thunk: recompute and patch portfolio.app_count in backend from current applications list
export const patchPortfolioAppCount = createAsyncThunk<
  void,
  { client: string; portfolio: string },
  { state: RootState }
>(
  'applications/patchPortfolioAppCount',
  async ({ client, portfolio }, { getState, dispatch }) => {
    const state = getState() as RootState;
    const list = ((state as any).applications?.items || []) as Application[];
    const count = list.filter((a) => a.portfolio === portfolio).length;
    try {
      await dispatch(
        patchPortfolio({ client, portfolio, portfolioData: { app_count: count } as any }) as any
      );
    } catch {
      // Non-fatal; ignore patch failure
    }
  }
);

function mergeItem(items: Application[], next: Application): Application[] {
  const idx = items.findIndex((a) => a.portfolio === next.portfolio && (a as any).app === (next as any).app);
  if (idx >= 0) {
    const copy = items.slice();
    copy[idx] = { ...items[idx], ...next } as Application;
    return copy;
  }
  return [...items, next];
}

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
      })
      .addCase(fetchApplicationDetail.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchApplicationDetail.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = mergeItem(state.items, action.payload.item);
        state.error = null;
        state.lastFetched = Date.now();
      })
      .addCase(fetchApplicationDetail.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) || action.error.message || 'Failed to fetch application';
      })
      .addCase(updateApplication.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(updateApplication.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = mergeItem(state.items, action.payload.item);
        state.error = null;
        state.lastFetched = Date.now();
      })
      .addCase(updateApplication.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) || action.error.message || 'Failed to update application';
      })
      .addCase(deleteApplication.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(deleteApplication.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const { app, portfolio } = action.payload;
        state.items = (state.items || []).filter(
          (a) => !(a.portfolio === portfolio && (a as any).app === app)
        );
        state.error = null;
        state.lastFetched = Date.now();
      })
      .addCase(deleteApplication.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) || action.error.message || 'Failed to delete application';
      })
      .addCase(createApplication.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(createApplication.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = mergeItem(state.items, action.payload.item);
        state.error = null;
        state.lastFetched = Date.now();
      })
      .addCase(createApplication.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) || action.error.message || 'Failed to create application';
      });
  }
});

export const { clear, setItems } = applicationsSlice.actions;

// Selectors
export const selectApplications = (state: RootState) => (state as any).applications?.items as Application[];
export const selectApplicationsStatus = (state: RootState) => (state as any).applications?.status as Status;
export const selectApplicationByKey = (state: RootState, portfolio: string, app: string) => {
  const list = (state as any).applications?.items as Application[];
  return (list || []).find((a) => a.portfolio === portfolio && (a as any).app === app);
};

export default applicationsSlice.reducer;