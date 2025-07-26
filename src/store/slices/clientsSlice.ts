import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface Client {
  id: string;
  name: string;
  description: string;
  homepage: string;
  contactName: string;
  contactEmail: string;
  primaryAwsRegion: string;
  memberCount: number;
  portfolioCount: number;
}

interface ClientsState {
  clients: Client[];
  selectedClientId: string | null;
  defaultClientId: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: ClientsState = {
  clients: [
    {
      id: 'client-1',
      name: 'Acme Corporation',
      description: 'Leading technology company specializing in cloud solutions and digital transformation.',
      homepage: 'https://acme.com',
      contactName: 'John Smith',
      contactEmail: 'john.smith@acme.com',
      primaryAwsRegion: 'us-east-1',
      memberCount: 45,
      portfolioCount: 8,
    },
    {
      id: 'client-2',
      name: 'Global Tech Solutions',
      description: 'Enterprise software development and consulting services.',
      homepage: 'https://globaltech.com',
      contactName: 'Sarah Johnson',
      contactEmail: 'sarah.johnson@globaltech.com',
      primaryAwsRegion: 'us-west-2',
      memberCount: 32,
      portfolioCount: 5,
    },
    {
      id: 'client-3',
      name: 'Innovation Labs',
      description: 'R&D focused company building next-generation platforms.',
      homepage: 'https://innovationlabs.com',
      contactName: 'Mike Chen',
      contactEmail: 'mike.chen@innovationlabs.com',
      primaryAwsRegion: 'eu-west-1',
      memberCount: 28,
      portfolioCount: 12,
    },
  ],
  selectedClientId: null,
  defaultClientId: 'client-1',
  loading: false,
  error: null,
};

const clientsSlice = createSlice({
  name: 'clients',
  initialState,
  reducers: {
    setClients: (state, action: PayloadAction<Client[]>) => {
      state.clients = action.payload;
    },
    addClient: (state, action: PayloadAction<Client>) => {
      state.clients.push(action.payload);
    },
    updateClient: (state, action: PayloadAction<Client>) => {
      const index = state.clients.findIndex(client => client.id === action.payload.id);
      if (index !== -1) {
        state.clients[index] = action.payload;
      }
    },
    removeClient: (state, action: PayloadAction<string>) => {
      state.clients = state.clients.filter(client => client.id !== action.payload);
    },
    setSelectedClient: (state, action: PayloadAction<string | null>) => {
      state.selectedClientId = action.payload;
    },
    setDefaultClient: (state, action: PayloadAction<string | null>) => {
      state.defaultClientId = action.payload;
      // If no client is currently selected, use the default
      if (!state.selectedClientId && action.payload) {
        state.selectedClientId = action.payload;
      }
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
  setClients,
  addClient,
  updateClient,
  removeClient,
  setSelectedClient,
  setDefaultClient,
  setLoading,
  setError,
} = clientsSlice.actions;

export default clientsSlice.reducer;