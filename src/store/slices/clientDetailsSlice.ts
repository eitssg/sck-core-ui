import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState, AppDispatch } from '../store';
import type { ApiResponse, ApiError } from '../shared';

export interface ClientDetailsModel {
  Client: string;
  ClientId?: string;
  ClientType?: string;
  ClientStatus?: string;
  ClientDescription?: string;
  ClientName?: string;
  OrganizationId?: string;
  OrganizationName?: string;
  OrganizationAccount?: string;
  OrganizationEmail?: string;
  Domain?: string;
  IamAccount?: string;
  AuditAccount?: string;
  AutomationAccount?: string;
  SecurityAccount?: string;
  NetworkAccount?: string;
  MasterRegion?: string;
  ClientRegion?: string;
  BucketRegion?: string;
  BucketName?: string;
  DocsBucketName?: string;
  ArtefactBucketName?: string;
  UiBucketName?: string;
  Scope?: string;
  CreatedAt?: string;
  UpdatedAt?: string;
}

type Status = 'idle' | 'loading' | 'succeeded' | 'failed';
type SaveStatus = 'idle' | 'saving' | 'succeeded' | 'failed';
type DeleteStatus = 'idle' | 'deleting' | 'succeeded' | 'failed';

interface ClientDetailsState {
  byId: Record<string, ClientDetailsModel | undefined>;
  status: Record<string, Status>;
  error: Record<string, string | null | undefined>;
  lastFetched: Record<string, number | undefined>;
  saveStatus: Record<string, SaveStatus>;
  saveError: Record<string, string | null | undefined>;
  lastSavedAt: Record<string, number | undefined>;
  deleteStatus: Record<string, DeleteStatus>;
  deleteError: Record<string, string | null | undefined>;
  lastDeletedAt: Record<string, number | undefined>;
  selected?: string | null;
}

const initialState: ClientDetailsState = {
  byId: {},
  status: {},
  error: {},
  lastFetched: {},
  saveStatus: {},
  saveError: {},
  lastSavedAt: {},
  deleteStatus: {},
  deleteError: {},
  lastDeletedAt: {},
  selected: null,
};

export const fetchClientDetails = createAsyncThunk<
  ApiResponse<ClientDetailsModel>,
  { client: string; force?: boolean } | undefined,
  { state: RootState }
>(
  'clientDetailsSlice/fetchOne',
  async (args) => {
    if (!args?.client) throw new Error('client is required');

    const url = new URL(
      `/api/v1/registry/client/${encodeURIComponent(args.client)}`,
      window.location.origin
    );
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = (await res.json()) as unknown as ApiResponse<ClientDetailsModel>;
    return json;
  },
  {
    condition: (args, { getState }) => {
      if (!args?.client) return false;
      const state = getState() as RootState;
      const slice = state.clientDetails as ClientDetailsState | undefined;
      if (!slice) return true;

      const { client, force } = args;
      if (force) return true;
      if (slice.status[client] === 'loading') return false;

      const ttlMs = 5 * 60 * 1000;
      const last = slice.lastFetched[client];
      const fresh = !!last && Date.now() - last < ttlMs;
      return !fresh;
    },
  }
);

export const refreshClientDetails =
  (client: string) => (dispatch: AppDispatch) =>
    dispatch(fetchClientDetails({ client, force: true }));

export const saveClientDetails = createAsyncThunk<
  ApiResponse<ClientDetailsModel>,
  { data: ClientDetailsModel; isNew?: boolean },
  { state: RootState; rejectValue: ApiError }
>(
  'clientDetailsSlice/save',
  async ({ data, isNew }, thunkApi) => {
    const hasId = !!data?.Client && data.Client.trim().length > 0;
    const method = isNew ? 'POST' : 'PUT';
    const url = isNew
      ? new URL('/api/v1/registry/clients', window.location.origin)
      : new URL(
          `/api/v1/registry/client/${encodeURIComponent(data.Client)}`,
          window.location.origin
        );

    if (!isNew && !hasId) {
      return thunkApi.rejectWithValue({
        status: 400,
        message: 'Client slug (Client) is required for update',
      });
    }

    try {
      const res = await fetch(url.toString(), {
        method,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      const contentType = res.headers.get('content-type') ?? '';
      const isJson = contentType.includes('application/json');

      if (!res.ok) {
        const body = isJson
          ? await res.json().catch(() => undefined)
          : await res.text().catch(() => undefined);
        const message =
          (isJson && (body?.message as string | undefined)) ||
          (typeof body === 'string' ? body : undefined) ||
          `HTTP ${res.status}`;
        return thunkApi.rejectWithValue({ status: res.status, message, data: body });
      }

      const json = (isJson ? await res.json() : { data }) as ApiResponse<ClientDetailsModel>;
      return json;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Network error';
      return thunkApi.rejectWithValue({ status: 0, message });
    }
  },
  {
    condition: ({ data }, { getState }) => {
      const state = getState() as RootState;
      const slice = state.clientDetails as ClientDetailsState | undefined;
      const key = data?.Client ?? '_new';
      if (!slice) return true;
      return slice.saveStatus[key] !== 'saving';
    },
  }
);

export const deleteClient = createAsyncThunk<
  { client: string },
  { client: string },
  { state: RootState; rejectValue: ApiError }
>(
  'clientDetailsSlice/delete',
  async ({ client }, thunkApi) => {
    if (!client || !client.trim()) {
      return thunkApi.rejectWithValue({
        status: 400,
        message: 'client is required',
      });
    }

    try {
      const url = new URL(
        `/api/v1/registry/client/${encodeURIComponent(client)}`,
        window.location.origin
      );
      const res = await fetch(url.toString(), {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
        credentials: 'include',
      });

      const contentType = res.headers.get('content-type') ?? '';
      const isJson = contentType.includes('application/json');

      if (!res.ok) {
        const body = isJson
          ? await res.json().catch(() => undefined)
          : await res.text().catch(() => undefined);
        const message =
          (isJson && (body?.message as string | undefined)) ||
          (typeof body === 'string' ? body : undefined) ||
          `HTTP ${res.status}`;
        return thunkApi.rejectWithValue({ status: res.status, message, data: body });
      }

      return { client };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Network error';
      return thunkApi.rejectWithValue({ status: 0, message });
    }
  },
  {
    condition: ({ client }, { getState }) => {
      const state = getState() as RootState;
      const slice = state.clientDetails as ClientDetailsState | undefined;
      if (!slice) return true;
      return slice.deleteStatus[client] !== 'deleting';
    },
  }
);

const clientDetailsSlice = createSlice({
  name: 'clientDetailsSlice',
  initialState,
  reducers: {
    selectClient(state, action: PayloadAction<string | null>) {
      state.selected = action.payload;
    },
    invalidate(state, action: PayloadAction<string>) {
      const id = action.payload;
      delete state.byId[id];
      delete state.lastFetched[id];
      state.status[id] = 'idle';
      state.error[id] = null;
      state.saveStatus[id] = 'idle';
      state.saveError[id] = null;
      delete state.lastSavedAt[id];
      state.deleteStatus[id] = 'idle';
      state.deleteError[id] = null;
      delete state.lastDeletedAt[id];
    },
    invalidateAll(state) {
      state.byId = {};
      state.lastFetched = {};
      state.status = {};
      state.error = {};
      state.saveStatus = {};
      state.saveError = {};
      state.lastSavedAt = {};
      state.deleteStatus = {};
      state.deleteError = {};
      state.lastDeletedAt = {};
      state.selected = null;
    },
    clearSaveState(state, action: PayloadAction<string>) {
      const id = action.payload;
      state.saveStatus[id] = 'idle';
      state.saveError[id] = null;
      delete state.lastSavedAt[id];
    },
    clearDeleteState(state, action: PayloadAction<string>) {
      const id = action.payload;
      state.deleteStatus[id] = 'idle';
      state.deleteError[id] = null;
      delete state.lastDeletedAt[id];
    },
  },
  extraReducers: (builder) => {
    builder
      // fetch
      .addCase(fetchClientDetails.pending, (state, action) => {
        const client = action.meta.arg?.client;
        if (client) {
          state.status[client] = 'loading';
          state.error[client] = null;
        }
      })
      .addCase(
        fetchClientDetails.fulfilled,
        (state, action: PayloadAction<ApiResponse<ClientDetailsModel>>) => {
          const data = action.payload.data as ClientDetailsModel;
          const id = data.Client;
          state.byId[id] = data;
          state.status[id] = 'succeeded';
          state.error[id] = null;
          state.lastFetched[id] = Date.now();
        }
      )
      .addCase(fetchClientDetails.rejected, (state, action) => {
        const client = action.meta.arg?.client ?? '_unknown';
        state.status[client] = 'failed';
        state.error[client] =
          action.error.message ?? 'Failed to load client details';
      })
      // save
      .addCase(saveClientDetails.pending, (state, action) => {
        const id = action.meta.arg.data.Client ?? '_new';
        state.saveStatus[id] = 'saving';
        state.saveError[id] = null;
      })
      .addCase(
        saveClientDetails.fulfilled,
        (state, action: PayloadAction<ApiResponse<ClientDetailsModel>>) => {
          const data = action.payload.data as ClientDetailsModel;
          const id = data.Client;
          state.byId[id] = data;
          state.lastFetched[id] = Date.now();
          state.saveStatus[id] = 'succeeded';
          state.saveError[id] = null;
          state.lastSavedAt[id] = Date.now();
          state.status[id] = 'succeeded';
          state.error[id] = null;
        }
      )
      .addCase(saveClientDetails.rejected, (state, action) => {
        const id = action.meta.arg.data.Client ?? '_new';
        state.saveStatus[id] = 'failed';
        const payload = action.payload as ApiError | undefined;
        state.saveError[id] =
          payload?.message ??
          action.error.message ??
          'Failed to save client details';
      })
      // delete
      .addCase(deleteClient.pending, (state, action) => {
        const id = action.meta.arg.client;
        state.deleteStatus[id] = 'deleting';
        state.deleteError[id] = null;
      })
      .addCase(deleteClient.fulfilled, (state, action) => {
        const id = action.payload.client;
        delete state.byId[id];
        delete state.lastFetched[id];
        state.status[id] = 'idle';
        state.error[id] = null;
        state.saveStatus[id] = 'idle';
        state.saveError[id] = null;
        delete state.lastSavedAt[id];
        state.deleteStatus[id] = 'succeeded';
        state.deleteError[id] = null;
        state.lastDeletedAt[id] = Date.now();
        if (state.selected === id) {
          state.selected = null;
        }
      })
      .addCase(deleteClient.rejected, (state, action) => {
        const id = action.meta.arg.client;
        state.deleteStatus[id] = 'failed';
        const payload = action.payload as ApiError | undefined;
        state.deleteError[id] =
          payload?.message ?? action.error.message ?? 'Failed to delete client';
      });
  },
});

export const {
  selectClient,
  invalidate,
  invalidateAll,
  clearSaveState,
  clearDeleteState,
} = clientDetailsSlice.actions;

// Selectors
export const selectClientDetailsById = (state: RootState, client: string) =>
  state.clientDetails.byId[client];

export const selectClientDetailsStatus = (
  state: RootState,
  client: string
): Status => state.clientDetails.status[client] ?? 'idle';

export const selectClientDetailsError = (state: RootState, client: string) =>
  state.clientDetails.error[client] ?? null;

export const selectClientSaveStatus = (
  state: RootState,
  client: string
): SaveStatus => state.clientDetails.saveStatus[client] ?? 'idle';

export const selectClientSaveError = (state: RootState, client: string) =>
  state.clientDetails.saveError[client] ?? null;

export const selectClientDeleteStatus = (
  state: RootState,
  client: string
): DeleteStatus => state.clientDetails.deleteStatus[client] ?? 'idle';

export const selectClientDeleteError = (state: RootState, client: string) =>
  state.clientDetails.deleteError[client] ?? null;

export const selectSelectedClient = (state: RootState) =>
  state.clientDetails.selected ?? null;

export  default clientDetailsSlice.reducer;