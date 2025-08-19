import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { RootState, AppDispatch } from '../store';
import type { ApiResponse } from '../shared';
import { toArray } from '../shared';

export interface ClientSummary {
  Name: string;
  Client: string; // slug
}

interface ClientsState {
  items: ClientSummary[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error?: string | null;
  cursor: string | null;
  lastFetched: number | null;
  // compatibility with hooks/useReduxData.ts
  selectedClient: string | null;
  defaultClient: string | null;
}

const initialState: ClientsState = {
  items: [],
  status: 'idle',
  error: null,
  cursor: null,
  lastFetched: null,
  selectedClient: null,
  defaultClient: null,
};

export const fetchClients = createAsyncThunk<
  ApiResponse<ClientSummary>,
  { limit?: number; cursor?: string | null; force?: boolean } | undefined,
  { state: RootState }
>(
  'clients/fetch',
  async (args) => {
    const limit = args?.limit ?? 100;
    const cursor = args?.cursor ?? null;

    const url = new URL('/api/v1/registry/clients', window.location.origin);
    url.searchParams.set('limit', String(limit));
    if (cursor) url.searchParams.set('cursor', cursor);

    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = (await res.json()) as unknown as ApiResponse<ClientSummary>;
    return json;
  },
  {
    condition: (args, { getState }) => {
      const state = getState() as RootState;
      const force = args?.force === true;
      if (force) return true;

      const slice = state.clients as ClientsState | undefined;
      if (!slice) return true;
      if (slice.status === 'loading') return false;

      const ttlMs = 2 * 60 * 1000;
      const fresh = !!slice.lastFetched && Date.now() - slice.lastFetched < ttlMs;
      const sameCursor = (args?.cursor ?? null) === (slice.cursor ?? null);
      return !(fresh && sameCursor);
    },
  }
);

export const refreshClients =
  () => (dispatch: AppDispatch) => {
    dispatch(clientsSlice.actions.clear());
    return dispatch(fetchClients({ limit: 100, cursor: null, force: true }));
  };

const clientsSlice = createSlice({
  name: 'clients',
  initialState,
  reducers: {
    clear(state) {
      state.items = [];
      state.cursor = null;
      state.lastFetched = null;
      state.status = 'idle';
      state.error = null;
      state.selectedClient = null;
      state.defaultClient = null;
    },
    // compatibility setters expected by useReduxData.ts
    setClients(state, action: PayloadAction<ClientSummary[]>) {
      state.items = action.payload ?? [];
      state.lastFetched = Date.now();
      state.status = 'succeeded';
      state.error = null;
    },
    setSelectedClient(state, action: PayloadAction<string | null>) {
      state.selectedClient = action.payload ?? null;
    },
    setDefaultClient(state, action: PayloadAction<string | null>) {
      state.defaultClient = action.payload ?? null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchClients.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(
        fetchClients.fulfilled,
        (state, action: PayloadAction<ApiResponse<ClientSummary>>) => {
          state.items = toArray<ClientSummary>(action.payload.data);
          state.cursor = action.payload.metadata?.cursor ?? null;
          state.status = 'succeeded';
          state.lastFetched = Date.now();
          state.error = null;
        }
      )
      .addCase(fetchClients.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message ?? 'Failed to load clients';
      });
  },
});

export const { clear, setClients, setSelectedClient, setDefaultClient } = clientsSlice.actions;

// Selectors
export const selectClients = (state: RootState) => state.clients.items;
export const selectClientsStatus = (state: RootState) => state.clients.status;
export const selectClientsError = (state: RootState) => state.clients.error;
export const selectClientsCursor = (state: RootState) => state.clients.cursor;
export const selectClientsLastFetched = (state: RootState) => state.clients.lastFetched;
export const selectSelectedClient = (state: RootState) => state.clients.selectedClient;
export const selectDefaultClient = (state: RootState) => state.clients.defaultClient;

export default clientsSlice.reducer;