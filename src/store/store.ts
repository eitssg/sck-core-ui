import { configureStore } from '@reduxjs/toolkit';
import clientsReducer from './slices/clientsSlice';
import clientDetailsReducer from './slices/clientDetailsSlice';

export const store = configureStore({
  reducer: {
    clients: clientsReducer,
    clientDetails: clientDetailsReducer,
  },
  devTools: process.env.NODE_ENV !== 'production',
});

// Inferred types exported for slices/components (use `import type`)
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;