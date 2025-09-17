import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { buildApiUrl } from '@/lib/api-config';
import { apiFetch } from '@/lib/api-fetch';
import type { RootState } from '@/store';

export type Passkey = {
  user_id: string;
  key_id: string;
  name?: string | null;
  device_type?: string | null;
  aaguid?: string | null;
  transports?: string[] | null;
  last_used_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type PasskeysState = {
  items: Passkey[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  lastFetched: number | null;
};

const initialState: PasskeysState = {
  items: [],
  status: 'idle',
  error: null,
  lastFetched: null,
};

export const fetchPasskeys = createAsyncThunk<Passkey[], void, { state: RootState }>(
  'passkeys/fetchPasskeys',
  async () => {
    const resp = await apiFetch(buildApiUrl('/auth/v1/passkeys'), { contextLabel: 'Passkeys' });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to fetch passkeys');
    }
    const json = await resp.json();
    // Endpoint returns envelope or raw? Current backend returns Response from core_db -> SuccessResponse(data=[...])
    const data = (json?.data && Array.isArray(json.data)) ? json.data : (Array.isArray(json) ? json : []);
    return data as Passkey[];
  },
  {
    condition: (_, { getState }) => {
      const state = getState() as RootState;
      const ts = state.passkeys?.lastFetched;
      if (!ts) return true;
      const fresh = Date.now() - ts < 5 * 60 * 1000; // 5m TTL
      return !fresh;
    },
  }
);

export const renamePasskey = createAsyncThunk<Passkey, { key_id: string; name: string }>(
  'passkeys/renamePasskey',
  async ({ key_id, name }) => {
    const resp = await apiFetch(buildApiUrl(`/auth/v1/passkey/${encodeURIComponent(key_id)}`), {
      method: 'PATCH',
      body: JSON.stringify({ name }),
      contextLabel: 'PasskeyRename',
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to rename passkey');
    }
    const json = await resp.json();
    const data = json?.data || json;
    return data as Passkey;
  }
);

export const deletePasskeyAction = createAsyncThunk<string, { key_id: string }>(
  'passkeys/deletePasskey',
  async ({ key_id }) => {
    const resp = await apiFetch(buildApiUrl(`/auth/v1/passkey/${encodeURIComponent(key_id)}`), {
      method: 'DELETE',
      contextLabel: 'PasskeyDelete',
    });
    if (!resp.ok && resp.status !== 204) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to delete passkey');
    }
    return key_id;
  }
);

const passkeysSlice = createSlice({
  name: 'passkeys',
  initialState,
  reducers: {
    upsertPasskey(state, action: PayloadAction<Passkey>) {
      const idx = state.items.findIndex(p => p.key_id === action.payload.key_id);
      if (idx >= 0) state.items[idx] = action.payload; else state.items.push(action.payload);
    },
    clearPasskeys(state) {
      state.items = [];
      state.lastFetched = null;
      state.status = 'idle';
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPasskeys.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchPasskeys.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload || [];
        state.lastFetched = Date.now();
      })
      .addCase(fetchPasskeys.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.error && action.error.message) || 'Failed to fetch passkeys';
      })
      .addCase(renamePasskey.fulfilled, (state, action) => {
        const idx = state.items.findIndex(p => p.key_id === action.payload.key_id);
        if (idx >= 0) state.items[idx] = { ...state.items[idx], ...action.payload };
      })
      .addCase(deletePasskeyAction.fulfilled, (state, action) => {
        state.items = state.items.filter(p => p.key_id !== action.payload);
      });
  }
});

export const { upsertPasskey, clearPasskeys } = passkeysSlice.actions;

export const selectPasskeys = (state: RootState) => state.passkeys.items;
export const selectPasskeysStatus = (state: RootState) => state.passkeys.status;

export default passkeysSlice.reducer;
