import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface DeploymentEvent {
  id: string;
  deploymentId: string;
  type: 'deploy' | 'test' | 'release' | 'rollback' | 'error';
  message: string;
  timestamp: string;
  status: 'success' | 'failed' | 'pending';
}

export interface Deployment {
  id: string;
  prn: string;
  clientId: string;
  portfolioId: string;
  applicationId: string;
  description: string;
  branch: string;
  build: string;
  environment: string;
  tag: string;
  region: string;
  status: 'released' | 'not-released' | 'release-in-progress' | 'teardown-in-progress' | 'failed';
  deployedAt: string;
  deployedBy: string;
  lastActivity: string;
}

interface DeploymentsState {
  deployments: Deployment[];
  events: DeploymentEvent[];
  selectedDeploymentId: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: DeploymentsState = {
  deployments: [],
  events: [],
  selectedDeploymentId: null,
  loading: false,
  error: null,
};

const deploymentsSlice = createSlice({
  name: 'deployments',
  initialState,
  reducers: {
    setDeployments: (state, action: PayloadAction<Deployment[]>) => {
      state.deployments = action.payload;
    },
    setEvents: (state, action: PayloadAction<DeploymentEvent[]>) => {
      state.events = action.payload;
    },
    addDeployment: (state, action: PayloadAction<Deployment>) => {
      state.deployments.push(action.payload);
    },
    addEvent: (state, action: PayloadAction<DeploymentEvent>) => {
      state.events.push(action.payload);
    },
    updateDeployment: (state, action: PayloadAction<Deployment>) => {
      const index = state.deployments.findIndex(dep => dep.id === action.payload.id);
      if (index !== -1) {
        state.deployments[index] = action.payload;
      }
    },
    removeDeployment: (state, action: PayloadAction<string>) => {
      state.deployments = state.deployments.filter(dep => dep.id !== action.payload);
      state.events = state.events.filter(event => event.deploymentId !== action.payload);
    },
    setSelectedDeployment: (state, action: PayloadAction<string | null>) => {
      state.selectedDeploymentId = action.payload;
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
  setDeployments,
  setEvents,
  addDeployment,
  addEvent,
  updateDeployment,
  removeDeployment,
  setSelectedDeployment,
  setLoading,
  setError,
} = deploymentsSlice.actions;

export default deploymentsSlice.reducer;