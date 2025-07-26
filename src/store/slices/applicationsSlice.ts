import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface Application {
  id: string;
  clientPortfolio: string; // Key string
  appRegex: string; // UnicodeAttribute - App Selector regex
  name: string; // UnicodeAttribute
  environment: string; // UnicodeAttribute
  account: string; // UnicodeAttribute
  zone: string; // UnicodeAttribute - references Zone ID
  imageAliases: Record<string, string>; // MapAttribute
  repository: string; // UnicodeAttribute
  region: string; // UnicodeAttribute
  tags: Record<string, string>; // MapAttribute
  enforceValidation: string; // UnicodeAttribute
  metadata: Record<string, any>; // MapAttribute
  
  // Additional fields for UI
  slug: string;
  code: string;
  description: string;
  portfolioId: string;
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
  applications: [
    {
      id: 'app-1',
      clientPortfolio: 'client-1#portfolio-1',
      appRegex: '^ecom-.*',
      name: 'Frontend Web App',
      environment: 'production',
      account: 'prod-account',
      zone: 'zone-1',
      imageAliases: { 'web': 'nginx:latest', 'api': 'node:18' },
      repository: 'https://github.com/acme/ecommerce-frontend',
      region: 'us-east-1',
      tags: { 'team': 'frontend', 'env': 'prod' },
      enforceValidation: 'true',
      metadata: { 'created': '2024-01-15', 'version': '1.2.3' },
      slug: 'frontend-web-app',
      code: 'FWA',
      description: 'React-based e-commerce frontend application',
      portfolioId: 'portfolio-1',
      status: 'running',
      version: '1.2.3',
      lastDeploy: '2024-07-25T08:30:00Z',
    },
    {
      id: 'app-2',
      clientPortfolio: 'client-1#portfolio-1',
      appRegex: '^api-.*',
      name: 'Backend API Service',
      environment: 'production',
      account: 'prod-account',
      zone: 'zone-1',
      imageAliases: { 'api': 'node:18', 'db': 'postgres:14' },
      repository: 'https://github.com/acme/ecommerce-api',
      region: 'us-east-1',
      tags: { 'team': 'backend', 'env': 'prod' },
      enforceValidation: 'true',
      metadata: { 'created': '2024-01-20', 'version': '2.1.0' },
      slug: 'backend-api-service',
      code: 'BAS',
      description: 'Node.js API service handling e-commerce operations',
      portfolioId: 'portfolio-1',
      status: 'running',
      version: '2.1.0',
      lastDeploy: '2024-07-24T14:20:00Z',
    },
    {
      id: 'app-3',
      clientPortfolio: 'client-1#portfolio-2',
      appRegex: '^analytics-.*',
      name: 'Analytics Dashboard',
      environment: 'production',
      account: 'analytics-account',
      zone: 'zone-2',
      imageAliases: { 'dashboard': 'react:latest', 'worker': 'python:3.11' },
      repository: 'https://github.com/acme/analytics-dashboard',
      region: 'us-east-1',
      tags: { 'team': 'analytics', 'env': 'prod' },
      enforceValidation: 'true',
      metadata: { 'created': '2024-02-01', 'version': '1.0.5' },
      slug: 'analytics-dashboard',
      code: 'AND',
      description: 'Real-time analytics and reporting dashboard',
      portfolioId: 'portfolio-2',
      status: 'running',
      version: '1.0.5',
      lastDeploy: '2024-07-23T11:45:00Z',
    },
  ],
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