import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import type { TypedUseSelectorHook } from 'react-redux';
import clientsSlice from './slices/clientsSlice';
import portfoliosSlice from './slices/portfoliosSlice';
import applicationsSlice from './slices/applicationsSlice';

export const store = configureStore({
  reducer: {
    clients: clientsSlice,
    portfolios: portfoliosSlice,
    applications: applicationsSlice,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Typed hooks for better TypeScript support
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;