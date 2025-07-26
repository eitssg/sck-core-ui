import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface Zone {
  id: string;
  clientId: string;
  organizationalUnit: string;
  orgId: string;
  awsAccountId: string;
  accountName: string;
  environment: string;
  namespace?: string;
  kmsKeys: string[];
  vpcAliases: string[];
  subnetAliases: string[];
  tags: Record<string, string>;
}

interface ZonesState {
  zones: Zone[];
  selectedZoneId: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: ZonesState = {
  zones: [],
  selectedZoneId: null,
  loading: false,
  error: null,
};

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
      const index = state.zones.findIndex(zone => zone.id === action.payload.id);
      if (index !== -1) {
        state.zones[index] = action.payload;
      }
    },
    removeZone: (state, action: PayloadAction<string>) => {
      state.zones = state.zones.filter(zone => zone.id !== action.payload);
    },
    setSelectedZone: (state, action: PayloadAction<string | null>) => {
      state.selectedZoneId = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  setZones,
  addZone,
  updateZone,
  removeZone,
  setSelectedZone,
  setLoading,
  setError,
} = zonesSlice.actions;

export default zonesSlice.reducer;