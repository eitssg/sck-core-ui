import { configureStore } from '@reduxjs/toolkit';
import clientReducer from './slices/clientsSlice';
import clientDetailsReducer from './slices/clientDetailsSlice';
import portfoliosReducer from './slices/portfoliosSlice';
import themeReducer from './slices/themeSlice';
import profileReducer from './slices/profileSlice';
import authReducer from './slices/authSlice'

export const store = configureStore({
  reducer: {
    theme: themeReducer,
    clients: clientReducer,
    portfolios: portfoliosReducer,
    profile: profileReducer,
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore timer refs in auth slice
        ignoredPaths: ['auth.refreshTimer'],
        ignoredActions: ['auth/setTokens'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;