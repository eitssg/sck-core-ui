import { configureStore } from '@reduxjs/toolkit';
import clientReducer from './slices/clientsSlice';
import clientDetailsReducer from './slices/clientDetailsSlice';
import portfoliosReducer from './slices/portfoliosSlice';
import themeReducer from './slices/themeSlice';
import profileReducer from './slices/profileSlice';

export const store = configureStore({
  reducer: {
    theme: themeReducer,
    clients: clientReducer,
    portfolios: portfoliosReducer,
    profile: profileReducer,
  },
  devTools: process.env.NODE_ENV !== 'production',
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;