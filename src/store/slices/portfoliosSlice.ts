import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface Portfolio {
  id: string;
  name: string;
  slug: string;
  code: string;
  description: string;
  clientId: string;
  homePageUrl: string;
  applicationCount: number;
  lastUpdated: string;
  status: string;
}

interface PortfoliosState {
  portfolios: Portfolio[];
  selectedPortfolioId: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: PortfoliosState = {
  portfolios: [],
  selectedPortfolioId: null,
  loading: false,
  error: null,
};

const portfoliosSlice = createSlice({
  name: 'portfolios',
  initialState,
  reducers: {
    setPortfolios: (state, action: PayloadAction<Portfolio[]>) => {
      state.portfolios = action.payload;
    },
    addPortfolio: (state, action: PayloadAction<Portfolio>) => {
      state.portfolios.push(action.payload);
    },
    updatePortfolio: (state, action: PayloadAction<Portfolio>) => {
      const index = state.portfolios.findIndex(portfolio => portfolio.id === action.payload.id);
      if (index !== -1) {
        state.portfolios[index] = action.payload;
      }
    },
    removePortfolio: (state, action: PayloadAction<string>) => {
      state.portfolios = state.portfolios.filter(portfolio => portfolio.id !== action.payload);
    },
    setSelectedPortfolio: (state, action: PayloadAction<string | null>) => {
      state.selectedPortfolioId = action.payload;
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
  setPortfolios,
  addPortfolio,
  updatePortfolio,
  removePortfolio,
  setSelectedPortfolio,
  setLoading,
  setError,
} = portfoliosSlice.actions;

export default portfoliosSlice.reducer;