import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface Zone {
  id: string;
  clientId: string;
  name: string;
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
  zones: [
    {
      id: 'zone-1',
      clientId: 'client-1',
      name: 'Production East',
      organizationalUnit: 'Engineering',
      orgId: 'org-12345',
      awsAccountId: '123456789012',
      accountName: 'acme-prod-east',
      environment: 'production',
      namespace: 'prod-east',
      kmsKeys: ['arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012'],
      vpcAliases: ['main-vpc', 'backup-vpc'],
      subnetAliases: ['private-subnet-1a', 'private-subnet-1b', 'public-subnet-1a'],
      tags: { 'Environment': 'production', 'Team': 'platform', 'CostCenter': 'engineering' },
    },
    {
      id: 'zone-2',
      clientId: 'client-1',
      name: 'Staging West',
      organizationalUnit: 'Engineering',
      orgId: 'org-12345',
      awsAccountId: '123456789013',
      accountName: 'acme-staging-west',
      environment: 'staging',
      namespace: 'staging-west',
      kmsKeys: ['arn:aws:kms:us-west-2:123456789013:key/87654321-4321-4321-4321-210987654321'],
      vpcAliases: ['staging-vpc'],
      subnetAliases: ['staging-subnet-2a', 'staging-subnet-2b'],
      tags: { 'Environment': 'staging', 'Team': 'platform', 'CostCenter': 'engineering' },
    },
    {
      id: 'zone-3',
      clientId: 'client-2',
      name: 'Production EU',
      organizationalUnit: 'Operations',
      orgId: 'org-67890',
      awsAccountId: '234567890123',
      accountName: 'globaltech-prod-eu',
      environment: 'production',
      namespace: 'prod-eu',
      kmsKeys: ['arn:aws:kms:eu-west-1:234567890123:key/abcdefgh-abcd-abcd-abcd-abcdefghijkl'],
      vpcAliases: ['eu-main-vpc'],
      subnetAliases: ['eu-private-1a', 'eu-private-1b', 'eu-public-1a'],
      tags: { 'Environment': 'production', 'Team': 'ops', 'Region': 'europe' },
    },
  ],
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