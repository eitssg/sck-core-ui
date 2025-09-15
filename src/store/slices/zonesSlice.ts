import {
  createSlice,
  type PayloadAction,
  createAsyncThunk,
  createSelector,
} from '@reduxjs/toolkit';
import type { RootState } from '@/store';
import { apiFetch } from '@/lib/api-fetch';
import { parseApiEnvelope } from '@/store/api/envelope';
import type { Zone, AccountFacts, RegionFacts } from '@/store/types';

interface ZonesState {
  zones: Zone[];
  selectedKey: { client: string; zone: string } | null; // composite key selection
  searchKeywords: string;
  loading: boolean;
  error: string | null;
  // Cursor-based pagination metadata
  nextCursor: string | null;
  prevCursors: string[]; // stack to support simple backward navigation if needed
}

// Prefer env var, fallback to versioned base /api/v1 (all endpoints assume versioned root now)
const API_BASE = (import.meta as any)?.env?.VITE_API_BASE_URL || '/api/v1';

// Helper: normalized zone key for dedup (case/whitespace tolerant)
const zoneKey = (z: Partial<Zone>): string =>
  `${String(z.client ?? '').trim().toLowerCase()}||${String(z.zone ?? '').trim().toLowerCase()}`;

const upsertZone = (list: Zone[], z: Zone): Zone[] => {
  const key = zoneKey(z);
  const idx = list.findIndex((it) => zoneKey(it) === key);
  if (idx !== -1) {
    const next = list.slice();
    next[idx] = z;
    return next;
  }
  return [...list, z];
};

const dedupZones = (items: Zone[]): Zone[] => {
  const map = new Map<string, Zone>();
  for (const z of items) map.set(zoneKey(z), z);
  return Array.from(map.values());
};

// ---------- CRUD Thunks (adjust endpoints to match your backend) ----------
export const fetchZones = createAsyncThunk<
  Zone[],
  { client: string },
  { rejectValue: string }
>('zones/fetchZones', async (args, { rejectWithValue }) => {
  try {
    const client = args.client;
    const res = await apiFetch(`${API_BASE}/registry/clients/${encodeURIComponent(client)}/zones`, {
      cookieFirst: true,
      headers: { 'Content-Type': 'application/json' },
      contextLabel: 'Zones',
    });
    if (!res.ok) throw new Error(await res.text());
    const { data } = await parseApiEnvelope<Zone[]>(res);
    const items: Zone[] = Array.isArray(data) ? (data as Zone[]) : [];
    // Ensure client field is present on each item for UI filtering
    return items.map((z) => ({ ...(z as any), client: (z as any)?.client ?? client } as Zone));
  } catch (err: any) {
    return rejectWithValue(err.message ?? 'Failed to fetch zones');
  }
});

export const createZone = createAsyncThunk<Zone, Zone, { rejectValue: string }>(
  'zones/createZone',
  async (zone, { rejectWithValue }) => {
    try {
  const res = await apiFetch(`${API_BASE}/registry/clients/${encodeURIComponent(zone.client)}/zones`, {
        method: 'POST',
        cookieFirst: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(zone),
        contextLabel: 'Zones',
      });
      if (!res.ok) throw new Error(await res.text());
  const { data } = await parseApiEnvelope<Zone>(res);
  return data as Zone;
    } catch (err: any) {
      return rejectWithValue(err.message ?? 'Failed to create zone');
    }
  }
);

// Cursor-based page fetch. Expected backend response shape: { items: Zone[], cursor?: string | null }
export const fetchZonesPage = createAsyncThunk<
  { items: Zone[]; nextCursor: string | null; append: boolean },
  { client: string; limit?: number; cursor?: string | null; append?: boolean },
  { rejectValue: string }
>('zones/fetchZonesPage', async ({ client, limit = 50, cursor, append = false }, { rejectWithValue }) => {
  try {
    const params = new URLSearchParams();
    if (limit) params.set('limit', String(limit));
    if (cursor) params.set('cursor', cursor);
    const qs = params.toString();
    const res = await apiFetch(
    `${API_BASE}/registry/clients/${encodeURIComponent(client)}/zones${qs ? `?${qs}` : ''}`,
      {
        method: 'GET',
        cookieFirst: true,
        headers: { 'Content-Type': 'application/json' },
        contextLabel: 'ZonesPage',
      }
    );
  if (!res.ok) throw new Error(await res.text());
  const { data, cursor: nextCursor } = await parseApiEnvelope<Zone[]>(res);
  const rawItems: Zone[] = Array.isArray(data) ? (data as Zone[]) : [];
  // Some backends omit the client field in items scoped by path; inject client for UI filtering/dedup.
  const items: Zone[] = rawItems.map((z) => ({
    ...(z as any),
    client: (z as any)?.client ?? client,
  } as Zone));
  return { items, nextCursor: nextCursor ?? null, append };
  } catch (err: any) {
    return rejectWithValue(err.message ?? 'Failed to fetch zones page');
  }
});

export const updateZoneRemote = createAsyncThunk<Zone, Zone, { rejectValue: string }>(
  'zones/updateZoneRemote',
  async (zone, { rejectWithValue }) => {
    try {
      const res = await apiFetch(
  `${API_BASE}/registry/clients/${encodeURIComponent(zone.client)}/zones/${encodeURIComponent(zone.zone)}`,
        {
          method: 'PUT',
          cookieFirst: true,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(zone),
          contextLabel: 'Zones',
        }
      );
      if (!res.ok) throw new Error(await res.text());
  const { data } = await parseApiEnvelope<Zone>(res);
  return data as Zone;
    } catch (err: any) {
      return rejectWithValue(err.message ?? 'Failed to update zone');
    }
  }
);

// Fetch a single zone by client and zone key
export const fetchZoneByKey = createAsyncThunk<
  Zone,
  { client: string; zone: string },
  { rejectValue: string }
>(
  'zones/fetchZoneByKey',
  async ({ client, zone }, { rejectWithValue }) => {
    try {
      const res = await apiFetch(
        `${API_BASE}/registry/clients/${encodeURIComponent(client)}/zones/${encodeURIComponent(zone)}`,
        {
          method: 'GET',
          cookieFirst: true,
          headers: { 'Content-Type': 'application/json' },
          contextLabel: 'ZoneByKey',
        }
      );
      if (!res.ok) throw new Error(await res.text());
      const { data } = await parseApiEnvelope<Zone>(res);
      const z: Zone = { ...(data as Zone), client } as Zone;
      return z;
    } catch (err: any) {
      return rejectWithValue(err.message ?? 'Failed to fetch zone');
    }
  }
);

export const deleteZoneRemote = createAsyncThunk<
  { client: string; zone: string },
  { client: string; zone: string },
  { rejectValue: string }
>('zones/deleteZoneRemote', async ({ client, zone }, { rejectWithValue }) => {
  try {
    const res = await apiFetch(
  `${API_BASE}/registry/clients/${encodeURIComponent(client)}/zones/${encodeURIComponent(zone)}`,
      { method: 'DELETE', cookieFirst: true, contextLabel: 'Zones' }
    );
    if (!res.ok) throw new Error(await res.text());
    return { client, zone };
  } catch (err: any) {
    return rejectWithValue(err.message ?? 'Failed to delete zone');
  }
});

// ---------- State ----------
const initialState: ZonesState = {
  zones: [],
  selectedKey: null,
  searchKeywords: '',
  loading: false,
  error: null,
  nextCursor: null,
  prevCursors: [],
};

// ---------- Slice ----------
const zonesSlice = createSlice({
  name: 'zones',
  initialState,
  reducers: {
    setZones: (state, action: PayloadAction<Zone[]>) => {
  state.zones = dedupZones(action.payload);
    },
    resetZonesPaging: (state) => {
      state.zones = [];
      state.nextCursor = null;
      state.prevCursors = [];
    },
    addZone: (state, action: PayloadAction<Zone>) => {
      state.zones = upsertZone(state.zones, action.payload);
    },
    updateZone: (state, action: PayloadAction<Zone>) => {
      state.zones = upsertZone(state.zones, action.payload);
    },
    removeZone: (state, action: PayloadAction<{ client: string; zone: string }>) => {
      const { client, zone } = action.payload;
      state.zones = state.zones.filter((z) => !(z.client === client && z.zone === zone));
    },
    setSelectedZoneKey: (state, action: PayloadAction<{ client: string; zone: string } | null>) => {
      state.selectedKey = action.payload;
    },
    setSearchKeywords: (state, action: PayloadAction<string>) => {
      state.searchKeywords = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchZonesPage (cursor based)
      .addCase(fetchZonesPage.pending, (state, action) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchZonesPage.fulfilled, (state, action) => {
        state.loading = false;
        const { items, nextCursor, append } = action.payload;
        if (append) {
          // Deduplicate by normalized composite key
          const existing = new Map(state.zones.map((z) => [zoneKey(z), z] as const));
          for (const z of items) {
            existing.set(zoneKey(z), z);
          }
          state.zones = Array.from(existing.values());
        } else {
          state.zones = dedupZones(items);
        }
        // Push previous cursor onto stack if moving forward
        if (append && state.nextCursor && state.nextCursor !== nextCursor) {
          state.prevCursors.push(state.nextCursor);
        }
        state.nextCursor = nextCursor ?? null;
      })
      .addCase(fetchZonesPage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Failed to fetch zones page';
      })
      // fetchZones
      .addCase(fetchZones.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchZones.fulfilled, (state, action) => {
        state.loading = false;
  state.zones = dedupZones(action.payload);
      })
      .addCase(fetchZones.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Failed to fetch zones';
      })
      // createZone
      .addCase(createZone.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createZone.fulfilled, (state, action) => {
        state.loading = false;
  state.zones = upsertZone(state.zones, action.payload);
      })
      .addCase(createZone.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Failed to create zone';
      })
      // updateZoneRemote
      .addCase(updateZoneRemote.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateZoneRemote.fulfilled, (state, action) => {
        state.loading = false;
  state.zones = upsertZone(state.zones, action.payload);
      })
      .addCase(updateZoneRemote.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Failed to update zone';
      })
      // fetchZoneByKey
      .addCase(fetchZoneByKey.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchZoneByKey.fulfilled, (state, action) => {
        state.loading = false;
  state.zones = upsertZone(state.zones, action.payload);
      })
      .addCase(fetchZoneByKey.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Failed to fetch zone';
      })
      // deleteZoneRemote
      .addCase(deleteZoneRemote.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteZoneRemote.fulfilled, (state, action) => {
        state.loading = false;
        const { client, zone } = action.payload;
        state.zones = state.zones.filter((z) => !(z.client === client && z.zone === zone));
      })
      .addCase(deleteZoneRemote.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Failed to delete zone';
      });
  },
});

export const {
  setZones,
  resetZonesPaging,
  addZone,
  updateZone,
  removeZone,
  setSelectedZoneKey,
  setSearchKeywords,
  clearError,
} = zonesSlice.actions;

// ---------- Selectors ----------
export const selectZonesState = (state: RootState) => state.zones as ZonesState;
export const selectZones = (state: RootState) => selectZonesState(state).zones;
export const selectZonesLoading = (state: RootState) => selectZonesState(state).loading;
export const selectZonesError = (state: RootState) => selectZonesState(state).error;
export const selectSelectedZoneKey = (state: RootState) => selectZonesState(state).selectedKey;
export const selectSearchKeywords = (state: RootState) => selectZonesState(state).searchKeywords;
export const selectZonesNextCursor = (state: RootState) => selectZonesState(state).nextCursor;
export const selectZonesPrevCursors = (state: RootState) => selectZonesState(state).prevCursors;

const valueToStrings = (v: unknown): string[] => {
  if (v == null) return [];
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return [String(v)];
  if (Array.isArray(v)) return v.flatMap(valueToStrings);
  if (typeof v === 'object')
    return Object.entries(v as Record<string, unknown>).flatMap(([k, val]) => [k, ...valueToStrings(val)]);
  return [];
};

const zoneSearchCorpus = (z: Zone): string[] => {
  const corpus: string[] = [];
  corpus.push(z.client, z.zone);

  const af: AccountFacts | undefined = z.account_facts;
  if (af) {
    corpus.push(
      af.aws_account_id,
      af.account_name ?? '',
      af.environment ?? '',
      af.organizational_unit ?? '',
      af.resource_namespace ?? '',
      af.network_name ?? ''
    );
    corpus.push(...(af.vpc_aliases ?? []));
    corpus.push(...(af.subnet_aliases ?? []));
    corpus.push(...valueToStrings(af.tags));
    if (af.kms) {
      corpus.push(af.kms.aws_account_id, af.kms.kms_key ?? '', af.kms.kms_key_arn ?? '');
      corpus.push(...(af.kms.delegate_aws_account_ids ?? []));
    }
  }

  if (z.tags) corpus.push(...valueToStrings(z.tags));

  // Regions
  const rfacts: Record<string, RegionFacts> = z.region_facts || {};
  for (const [regionKey, rf] of Object.entries(rfacts)) {
    corpus.push(regionKey);
    corpus.push(rf.aws_region);
    if (rf.proxy_host) corpus.push(String(rf.proxy_host));
    if (rf.proxy_url) corpus.push(String(rf.proxy_url));
    if (rf.no_proxy) corpus.push(String(rf.no_proxy));
    if (rf.name_servers) corpus.push(...rf.name_servers.map(String));
    if (rf.security_group_aliases)
      corpus.push(...Object.keys(rf.security_group_aliases), ...Object.values(rf.security_group_aliases));
    if (rf.security_aliases) {
      for (const [k, list] of Object.entries(rf.security_aliases)) {
        corpus.push(k);
        corpus.push(...list.flatMap((a) => [a.type, a.value, a.description ?? '']));
      }
    }
    if (rf.image_aliases) corpus.push(...Object.keys(rf.image_aliases), ...Object.values(rf.image_aliases));
    if (rf.tags) corpus.push(...valueToStrings(rf.tags));
  }

  return corpus
    .filter(Boolean)
    .map((s) => String(s).toLowerCase());
};

const tokenMatch = (z: Zone, token: string): boolean => {
  const corpus = zoneSearchCorpus(z);
  return corpus.some((s) => s.includes(token));
};

// AND-match across all tokens in searchKeywords
export const selectFilteredZones = createSelector(
  [selectZones, selectSearchKeywords],
  (zones, keywords) => {
    const q = (keywords || '').trim().toLowerCase();
    if (!q) return zones;
    const tokens = q.split(/\s+/);
    return zones.filter((z) => tokens.every((t) => tokenMatch(z, t)));
  }
);

// Convenience selectors
export const makeSelectZonesByClient = (client: string) =>
  createSelector([selectFilteredZones], (zones) => zones.filter((z) => z.client === client));

export const makeSelectZoneByKey = (client: string, zone: string) =>
  createSelector([selectZones], (zones) => zones.find((z) => z.client === client && z.zone === zone) || null);

// Since the UI only holds data for the current client (server-scoped by JWT),
// a simple zone-by-slug lookup is sufficient.
export const makeSelectZoneBySlug = (zone: string) =>
  createSelector([selectZones], (zones) => zones.find((z) => z.zone === zone) || null);

export default zonesSlice.reducer;