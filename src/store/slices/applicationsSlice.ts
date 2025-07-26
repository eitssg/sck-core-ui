import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface Application {
  id: string;
  name: string;
  slug: string;
  code: string;
  description: string;
  portfolioId: string;
  zoneId: string;
  appSelector: string; // Regular expression to match app slug name
  status: 'running' | 'stopped' | 'error' | 'deploying';
  version: string;
  lastDeploy: string;
}

interface ApplicationsState {
  applications: Application[];
  selectedApplicationId: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: ApplicationsState = {
  applications: [],
  selectedApplicationId: null,
  loading: false,
  error: null,
};

const applicationsSlice = createSlice({
  name: 'applications',
  initialState,
  reducers: {
    setApplications: (state, action: PayloadAction<Application[]>) => {
      state.applications = action.payload;
    },
    addApplication: (state, action: PayloadAction<Application>) => {
      state.applications.push(action.payload);
    },
    updateApplication: (state, action: PayloadAction<Application>) => {
      const index = state.applications.findIndex(app => app.id === action.payload.id);
      if (index !== -1) {
        state.applications[index] = action.payload;
      }
    },
    removeApplication: (state, action: PayloadAction<string>) => {
      state.applications = state.applications.filter(app => app.id !== action.payload);
    },
    setSelectedApplication: (state, action: PayloadAction<string | null>) => {
      state.selectedApplicationId = action.payload;
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
  setApplications,
  addApplication,
  updateApplication,
  removeApplication,
  setSelectedApplication,
  setLoading,
  setError,
} = applicationsSlice.actions;

export default applicationsSlice.reducer;