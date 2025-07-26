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
  portfolios: [
    {
      id: 'portfolio-1',
      name: 'E-Commerce Platform',
      slug: 'ecommerce-platform',
      code: 'ECOM',
      description: 'Modern e-commerce platform with microservices architecture',
      clientId: 'client-1',
      homePageUrl: 'https://ecommerce.acme.com',
      applicationCount: 5,
      lastUpdated: '2024-07-25T10:30:00Z',
      status: 'active',
    },
    {
      id: 'portfolio-2',
      name: 'Customer Analytics',
      slug: 'customer-analytics',
      code: 'CUST',
      description: 'Advanced analytics and reporting for customer behavior',
      clientId: 'client-1',
      homePageUrl: 'https://analytics.acme.com',
      applicationCount: 3,
      lastUpdated: '2024-07-24T15:45:00Z',
      status: 'active',
    },
    {
      id: 'portfolio-3',
      name: 'Enterprise Suite',
      slug: 'enterprise-suite',
      code: 'ENT',
      description: 'Comprehensive enterprise management solution',
      clientId: 'client-2',
      homePageUrl: 'https://enterprise.globaltech.com',
      applicationCount: 8,
      lastUpdated: '2024-07-23T09:15:00Z',
      status: 'active',
    },
  ],
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