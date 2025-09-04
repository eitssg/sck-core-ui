import {
  createSlice,
  type PayloadAction,
  createAsyncThunk,
  createSelector,
} from '@reduxjs/toolkit';
import type { RootState } from '@/store';
import type { Zone, AccountFacts, RegionFacts } from '@/store/types';

interface ZonesState {
  zones: Zone[];
  selectedKey: { client: string; zone: string } | null; // composite key selection
  searchKeywords: string;
  loading: boolean;
  error: string | null;
}

// Prefer env var, fallback to /api
const API_BASE = (import.meta as any)?.env?.VITE_API_BASE_URL || '/api';

// ---------- CRUD Thunks (adjust endpoints to match your backend) ----------
export const fetchZones = createAsyncThunk<
  Zone[],
  { client?: string } | void,
  { rejectValue: string }
>('zones/fetchZones', async (args, { rejectWithValue }) => {
  try {
    const q = args && args.client ? `?client=${encodeURIComponent(args.client)}` : '';
    const res = await fetch(`${API_BASE}/zones${q}`, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    if (!res.ok) throw new Error(await res.text());
    return (await res.json()) as Zone[];
  } catch (err: any) {
    return rejectWithValue(err.message ?? 'Failed to fetch zones');
  }
});

export const createZone = createAsyncThunk<Zone, Zone, { rejectValue: string }>(
  'zones/createZone',
  async (zone, { rejectWithValue }) => {
    try {
      const res = await fetch(`${API_BASE}/zones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(zone),
      });
      if (!res.ok) throw new Error(await res.text());
      return (await res.json()) as Zone;
    } catch (err: any) {
      return rejectWithValue(err.message ?? 'Failed to create zone');
    }
  }
);

export const updateZoneRemote = createAsyncThunk<Zone, Zone, { rejectValue: string }>(
  'zones/updateZoneRemote',
  async (zone, { rejectWithValue }) => {
    try {
      const res = await fetch(
        `${API_BASE}/zones/${encodeURIComponent(zone.client)}/${encodeURIComponent(zone.zone)}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(zone),
        }
      );
      if (!res.ok) throw new Error(await res.text());
      return (await res.json()) as Zone;
    } catch (err: any) {
      return rejectWithValue(err.message ?? 'Failed to update zone');
    }
  }
);

export const deleteZoneRemote = createAsyncThunk<
  { client: string; zone: string },
  { client: string; zone: string },
  { rejectValue: string }
>('zones/deleteZoneRemote', async ({ client, zone }, { rejectWithValue }) => {
  try {
    const res = await fetch(
      `${API_BASE}/zones/${encodeURIComponent(client)}/${encodeURIComponent(zone)}`,
      { method: 'DELETE', credentials: 'include' }
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
};

// ---------- Slice ----------
const zonesSlice = createSlice({
  name: 'zones',
  initialState,
  reducers: {
    setZones: (state, action: PayloadAction<Zone[]>) => {
      state.zones = action.payload;
    },
    addZone: (state, action: PayloadAction<Zone>) => {
      state.zones.push(action.payload);
    },
    updateZone: (state, action: PayloadAction<Zone>) => {
      const z = action.payload;
      const idx = state.zones.findIndex(
        (zone) => zone.client === z.client && zone.zone === z.zone
      );
      if (idx !== -1) state.zones[idx] = z;
      else state.zones.push(z);
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
      // fetchZones
      .addCase(fetchZones.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchZones.fulfilled, (state, action) => {
        state.loading = false;
        state.zones = action.payload;
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
        state.zones.push(action.payload);
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
        const z = action.payload;
        const idx = state.zones.findIndex(
          (zone) => zone.client === z.client && zone.zone === z.zone
        );
        if (idx !== -1) state.zones[idx] = z;
        else state.zones.push(z);
      })
      .addCase(updateZoneRemote.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Failed to update zone';
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

export default zonesSlice.reducer;