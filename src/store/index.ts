import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux';
import clientsSlice from './slices/clientsSlice';
import portfoliosSlice from './slices/portfoliosSlice';
import applicationsSlice from './slices/applicationsSlice';
import deploymentsSlice from './slices/deploymentsSlice';
import zonesSlice from './slices/zonesSlice';
import profileSlice from './slices/profileSlice';
import authSlice from './slices/authSlice';
import themeSlice from './slices/themeSlice';
import dashboardSlice from './slices/dashboardSlice';
import { registerTokenSelector } from '@/lib/api-config';
import { selectTokens } from './slices/authSlice';

export const store = configureStore({
  reducer: {
    clients: clientsSlice,
    portfolios: portfoliosSlice,
    dashboard: dashboardSlice,
    applications: applicationsSlice,
    deployments: deploymentsSlice,
    zones: zonesSlice,
    profile: profileSlice,
    auth: authSlice,
    theme: themeSlice, // ← Theme is already here!
  },
});

// Register a token selector for api-config to retrieve the latest access token
registerTokenSelector(() => {
  try {
    const state = store.getState();
    return (selectTokens as any)(state);
  } catch {
    return null;
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Typed hooks for better TypeScript support
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Export types for compatibility
export * from './types';