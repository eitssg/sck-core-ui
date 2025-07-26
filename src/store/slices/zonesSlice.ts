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
    // Acme Corporation zones
    {
      id: 'zone-1',
      clientId: 'client-1',
      name: 'Acme Production',
      organizationalUnit: 'Engineering',
      orgId: 'org-12345',
      awsAccountId: '123456789012',
      accountName: 'acme-production',
      environment: 'production',
      namespace: 'acme-prod',
      kmsKeys: ['arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012'],
      vpcAliases: ['prod-vpc', 'backup-vpc'],
      subnetAliases: ['prod-private-1a', 'prod-private-1b', 'prod-public-1a'],
      tags: { 'Environment': 'production', 'Team': 'platform', 'Client': 'acme' },
    },
    {
      id: 'zone-2',
      clientId: 'client-1',
      name: 'Acme Testing',
      organizationalUnit: 'Engineering',
      orgId: 'org-12345',
      awsAccountId: '123456789013',
      accountName: 'acme-testing',
      environment: 'testing',
      namespace: 'acme-test',
      kmsKeys: ['arn:aws:kms:us-east-1:123456789013:key/87654321-4321-4321-4321-210987654321'],
      vpcAliases: ['test-vpc'],
      subnetAliases: ['test-private-1a', 'test-private-1b'],
      tags: { 'Environment': 'testing', 'Team': 'platform', 'Client': 'acme' },
    },
    {
      id: 'zone-3',
      clientId: 'client-1',
      name: 'Acme Development',
      organizationalUnit: 'Engineering',
      orgId: 'org-12345',
      awsAccountId: '123456789014',
      accountName: 'acme-development',
      environment: 'development',
      namespace: 'acme-dev',
      kmsKeys: ['arn:aws:kms:us-east-1:123456789014:key/11111111-1111-1111-1111-111111111111'],
      vpcAliases: ['dev-vpc'],
      subnetAliases: ['dev-private-1a', 'dev-public-1a'],
      tags: { 'Environment': 'development', 'Team': 'platform', 'Client': 'acme' },
    },
    // Global Tech Solutions zones
    {
      id: 'zone-4',
      clientId: 'client-2',
      name: 'GlobalTech Production',
      organizationalUnit: 'Operations',
      orgId: 'org-67890',
      awsAccountId: '234567890123',
      accountName: 'globaltech-production',
      environment: 'production',
      namespace: 'gt-prod',
      kmsKeys: ['arn:aws:kms:us-west-2:234567890123:key/abcdefgh-abcd-abcd-abcd-abcdefghijkl'],
      vpcAliases: ['gt-prod-vpc'],
      subnetAliases: ['gt-prod-private-2a', 'gt-prod-private-2b', 'gt-prod-public-2a'],
      tags: { 'Environment': 'production', 'Team': 'ops', 'Client': 'globaltech' },
    },
    {
      id: 'zone-5',
      clientId: 'client-2',
      name: 'GlobalTech Testing',
      organizationalUnit: 'Operations',
      orgId: 'org-67890',
      awsAccountId: '234567890124',
      accountName: 'globaltech-testing',
      environment: 'testing',
      namespace: 'gt-test',
      kmsKeys: ['arn:aws:kms:us-west-2:234567890124:key/22222222-2222-2222-2222-222222222222'],
      vpcAliases: ['gt-test-vpc'],
      subnetAliases: ['gt-test-private-2a', 'gt-test-private-2b'],
      tags: { 'Environment': 'testing', 'Team': 'ops', 'Client': 'globaltech' },
    },
    {
      id: 'zone-6',
      clientId: 'client-2',
      name: 'GlobalTech Development',
      organizationalUnit: 'Operations',
      orgId: 'org-67890',
      awsAccountId: '234567890125',
      accountName: 'globaltech-development',
      environment: 'development',
      namespace: 'gt-dev',
      kmsKeys: ['arn:aws:kms:us-west-2:234567890125:key/33333333-3333-3333-3333-333333333333'],
      vpcAliases: ['gt-dev-vpc'],
      subnetAliases: ['gt-dev-private-2a'],
      tags: { 'Environment': 'development', 'Team': 'ops', 'Client': 'globaltech' },
    },
    // Innovation Labs zones
    {
      id: 'zone-7',
      clientId: 'client-3',
      name: 'InnovationLabs Production',
      organizationalUnit: 'Research',
      orgId: 'org-11111',
      awsAccountId: '345678901234',
      accountName: 'innovationlabs-production',
      environment: 'production',
      namespace: 'il-prod',
      kmsKeys: ['arn:aws:kms:eu-west-1:345678901234:key/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'],
      vpcAliases: ['il-prod-vpc'],
      subnetAliases: ['il-prod-private-1a', 'il-prod-private-1b', 'il-prod-public-1a'],
      tags: { 'Environment': 'production', 'Team': 'research', 'Client': 'innovationlabs' },
    },
    {
      id: 'zone-8',
      clientId: 'client-3',
      name: 'InnovationLabs Testing',
      organizationalUnit: 'Research',
      orgId: 'org-11111',
      awsAccountId: '345678901235',
      accountName: 'innovationlabs-testing',
      environment: 'testing',
      namespace: 'il-test',
      kmsKeys: ['arn:aws:kms:eu-west-1:345678901235:key/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'],
      vpcAliases: ['il-test-vpc'],
      subnetAliases: ['il-test-private-1a', 'il-test-private-1b'],
      tags: { 'Environment': 'testing', 'Team': 'research', 'Client': 'innovationlabs' },
    },
    {
      id: 'zone-9',
      clientId: 'client-3',
      name: 'InnovationLabs Development',
      organizationalUnit: 'Research',
      orgId: 'org-11111',
      awsAccountId: '345678901236',
      accountName: 'innovationlabs-development',
      environment: 'development',
      namespace: 'il-dev',
      kmsKeys: ['arn:aws:kms:eu-west-1:345678901236:key/cccccccc-cccc-cccc-cccc-cccccccccccc'],
      vpcAliases: ['il-dev-vpc'],
      subnetAliases: ['il-dev-private-1a'],
      tags: { 'Environment': 'development', 'Team': 'research', 'Client': 'innovationlabs' },
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