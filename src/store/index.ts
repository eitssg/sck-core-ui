import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux';
import clientDetailsSlice from './slices/clientDetailsSlice';
import clientsSlice from './slices/clientsSlice';
import portfoliosSlice from './slices/portfoliosSlice';
import applicationsSlice from './slices/applicationsSlice';
import deploymentsSlice from './slices/deploymentsSlice';
import zonesSlice from './slices/zonesSlice';
import profileSlice from './slices/profileSlice';
import authSlice from './slices/authSlice';

export const store = configureStore({
  reducer: {
    clients: clientsSlice,
    portfolios: portfoliosSlice,
    applications: applicationsSlice,
    deployments: deploymentsSlice,
    zones: zonesSlice,
    profile: profileSlice,
    auth: authSlice,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Typed hooks for better TypeScript support
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;