import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import deploymentsSlice from './deploymentsSlice';


interface DashboardState {
  selectedDeploymentId: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: DashboardState = {
  selectedDeploymentId: null,
  loading: false,
  error: null,
};

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  }
});


export const {
  setLoading,
  setError,
} = dashboardSlice.actions;

export default dashboardSlice.reducer;