import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { API_CONFIG, buildApiUrl, getAuthHeaders } from '@/lib/api-config';
import type { RootState, AppDispatch } from '../store';
import type { ApiResponse } from '../shared';
import { toArray } from '../shared';

/**
 * PORTFOLIO CONCEPTS:
 * 
 * Portfolio = Business Application/Software Package
 * - Think of it as a "store" or "software" registered in business CMDB
 * - It's the "Application I want to Run" (e.g., E-Commerce Platform, Analytics Dashboard)
 * - Composed of one or more Deployments (dev, staging, prod environments)
 * - The "portfolio" field is the "slug" for the software package/solution/enterprise app
 * 
 * Client Context:
 * - Every API call REQUIRES the client "slug" 
 * - Client determines which portfolios/applications are available
 * - Client slug can be in query param, path param, or request body
 * 
 * Hierarchy: Client -> Portfolio (Business App) -> Deployments -> Components
 * 
 * CACHING STRATEGY:
 * - Redux stores data to minimize server calls (each call costs money!)
 * - TTL of 5 minutes for portfolio lists
 * - Individual portfolios cached until explicitly refreshed
 * - Client change forces fresh fetch
 * - Force flag available for manual refresh
 */

// Contact information for portfolio stakeholders
export interface ContactFacts {
  name: string;
  email?: string;
  attributes?: Record<string, string>;
  enabled?: boolean;
}

// Approval workflow configuration for portfolio operations
export interface ApproverFacts {
  sequence?: number; // Order of approval (1, 2, 3...)
  name: string;
  email?: string;
  roles?: string[]; // Roles this approver can approve
  attributes?: Record<string, string>;
  depends_on?: number[]; // Sequence numbers this approver depends on
  enabled?: boolean;
}

// Owner information for the portfolio
export interface OwnerFacts {
  name: string;
  email?: string;
  phone?: string;
  attributes?: Record<string, string>;
}

// Project/Business application details
export interface ProjectFacts {
  name: string;
  code: string; // Short code for the project
  repository?: string; // Git repository URL
  description?: string;
  attributes?: Record<string, string>;
}

// Portfolio interface based on your PortfolioFact Pydantic model
export interface Portfolio {
  // Core portfolio identification
  portfolio: string; // Primary key - portfolio slug/ID (the business app identifier)
  
  // Portfolio configuration
  contacts?: ContactFacts[]; // Stakeholder contact information
  approvers?: ApproverFacts[]; // Approval workflow for deployments
  project?: ProjectFacts; // Primary project/business app details
  domain?: string; // Domain name for this business application
  bizapp?: ProjectFacts; // Alternative business app details
  owner?: OwnerFacts; // Portfolio owner information
  
  // Resource management
  tags?: Record<string, string>; // AWS resource tags for cost/organization
  metadata?: Record<string, string>; // Additional metadata
  attributes?: Record<string, string>; // Custom attributes
  user_instantiated?: string; // User who created this portfolio
  
  // Audit fields (inherited from DatabaseRecord)
  created_at?: string;
  updated_at?: string;
  
  // UI compatibility fields (derived from core data)
  id?: string; // Will be set to portfolio value for UI compatibility
  name?: string; // Will be set to project.name or portfolio for display
  description?: string; // Will be set to project.description
  clientId?: string; // Client this portfolio belongs to (for UI filtering)
  code?: string; // Will be set to project.code for display
  status?: string; // Derived status (active/inactive based on enabled state)
  
  // Calculated/derived fields for UI
  applicationCount?: number; // Number of deployments under this portfolio
  lastUpdated?: string; // Will be set to updated_at for display
  homePageUrl?: string; // Will be derived from domain
}

// Summary interface for list operations (matches your API response)
export interface PortfolioSummary {
  Portfolio: string; // Portfolio slug
  // Add other summary fields as they become available from your API
  Name?: string;
  Description?: string;
  Domain?: string;
}

interface PortfoliosState {
  items: Portfolio[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error?: string | null;
  cursor: string | null;
  lastFetched: number | null;
  selectedPortfolioId: string | null;
  currentClient: string | null; // Track which client's portfolios we're viewing
}

const initialState: PortfoliosState = {
  items: [],
  status: 'idle',
  error: null,
  cursor: null,
  lastFetched: null,
  selectedPortfolioId: null,
  currentClient: null,
};

// Helper function to transform portfolio data for UI compatibility
const transformPortfolioForUI = (portfolio: Portfolio, clientId?: string): Portfolio => ({
  ...portfolio,
  id: portfolio.portfolio, // Set id to portfolio slug for UI compatibility
  name: portfolio.project?.name || portfolio.portfolio, // Use project name or portfolio slug
  description: portfolio.project?.description || portfolio.bizapp?.description,
  code: portfolio.project?.code || portfolio.bizapp?.code,
  clientId: clientId || portfolio.clientId,
  status: portfolio.contacts?.some(c => c.enabled !== false) ? 'active' : 'inactive', // Derive status
  lastUpdated: portfolio.updated_at,
  homePageUrl: portfolio.domain ? `https://${portfolio.domain}` : undefined,
  applicationCount: 0, // Will be populated when we have deployment data
});

// CRUD Operations for Portfolio Management
// Note: All operations require client slug in the path

// CREATE - Create new portfolio (POST /api/v1/registry/{client}/portfolios)
export const createPortfolio = createAsyncThunk(
  'portfolios/create',
  async ({ client, portfolioData }: { 
    client: string; 
    portfolioData: Partial<Portfolio> 
  }, thunkAPI) => {
    try {
      const response = await fetch(buildApiUrl(`/api/v1/registry/${client}/portfolios`), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(portfolioData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create portfolio');
      }

      const result = await response.json();
      return { portfolio: transformPortfolioForUI(result.data, client), client };
    } catch (error) {
      return thunkAPI.rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// READ - List all portfolios for a client (GET /api/v1/registry/{client}/portfolios)
// OPTIMIZED FOR MINIMAL SERVER CALLS - uses strict caching
export const fetchPortfolios = createAsyncThunk<
  { data: ApiResponse<PortfolioSummary>; client: string; append: boolean },
  { client: string; limit?: number; cursor?: string | null; force?: boolean; append?: boolean },
  { state: RootState }
>(
  'portfolios/fetchList',
  async ({ client, limit = 50, cursor = null, append = false }) => { // Reduced default limit for pagination
    const url = new URL(buildApiUrl(`/api/v1/registry/${client}/portfolios`));
    url.searchParams.set('limit', String(limit));
    if (cursor) url.searchParams.set('cursor', cursor);

    const response = await fetch(url.toString(), {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const json = await response.json() as ApiResponse<PortfolioSummary>;
    return { data: json, client, append };
  },
  {
    condition: ({ client, force, cursor }, { getState }) => {
      const state = getState();
      if (force) return true;

      // Always allow if we have a cursor (pagination request)
      if (cursor) return true;

      // Check if portfolios slice exists in state
      if (!state.portfolios) return true;
      
      const slice = state.portfolios;
      if (slice.status === 'loading') return false;

      // Force refetch if client changed
      if (slice.currentClient !== client) return true;

      // Extended TTL for cost savings - 5 minutes for initial load
      const ttlMs = 5 * 60 * 1000;
      const fresh = !!slice.lastFetched && Date.now() - slice.lastFetched < ttlMs;
      return !fresh;
    },
  }
);

// READ - Get single portfolio (GET /api/v1/registry/{client}/portfolio/{portfolio})
// CACHED - only fetches if not in store or explicitly forced
export const fetchPortfolio = createAsyncThunk<
  { portfolio: Portfolio; client: string },
  { client: string; portfolio: string; force?: boolean },
  { state: RootState }
>(
  'portfolios/fetchSingle',
  async ({ client, portfolio }) => {
    try {
      const response = await fetch(buildApiUrl(`/api/v1/registry/${client}/portfolio/${portfolio}`), {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch portfolio');
      }

      const result = await response.json();
      return { portfolio: transformPortfolioForUI(result.data, client), client };
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Unknown error');
    }
  },
  {
    condition: ({ client, portfolio, force }, { getState }) => {
      if (force) return true;
      
      const state = getState();
      if (!state.portfolios) return true;
      
      // Check if we already have this portfolio in cache
      const existingPortfolio = state.portfolios.items.find(p => 
        p.portfolio === portfolio && p.clientId === client
      );
      
      // Only fetch if not in cache
      return !existingPortfolio;
    },
  }
);

// UPDATE - Full update portfolio (PUT /api/v1/registry/{client}/portfolio/{portfolio})
// Note: PUT replaces entire record, unsupplied attributes will be set to null
export const updatePortfolio = createAsyncThunk(
  'portfolios/update',
  async ({ client, portfolio, portfolioData }: { 
    client: string; 
    portfolio: string; 
    portfolioData: Portfolio 
  }, thunkAPI) => {
    try {
      const response = await fetch(buildApiUrl(`/api/v1/registry/${client}/portfolio/${portfolio}`), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(portfolioData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update portfolio');
      }

      const result = await response.json();
      return { portfolio: transformPortfolioForUI(result.data, client), client };
    } catch (error) {
      return thunkAPI.rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// PATCH - Partial update portfolio (PATCH /api/v1/registry/{client}/portfolio/{portfolio})
// Note: PATCH only updates provided fields, leaving others unchanged
export const patchPortfolio = createAsyncThunk(
  'portfolios/patch',
  async ({ client, portfolio, portfolioData }: { 
    client: string; 
    portfolio: string; 
    portfolioData: Partial<Portfolio> 
  }, thunkAPI) => {
    try {
      const response = await fetch(buildApiUrl(`/api/v1/registry/${client}/portfolio/${portfolio}`), {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(portfolioData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to patch portfolio');
      }

      const result = await response.json();
      return { portfolio: transformPortfolioForUI(result.data, client), client };
    } catch (error) {
      return thunkAPI.rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// DELETE - Delete portfolio (DELETE /api/v1/registry/{client}/portfolio/{portfolio})
export const deletePortfolio = createAsyncThunk(
  'portfolios/delete',
  async ({ client, portfolio }: { client: string; portfolio: string }, thunkAPI) => {
    try {
      const response = await fetch(buildApiUrl(`/api/v1/registry/${client}/portfolio/${portfolio}`), {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete portfolio');
      }

      return { client, portfolio };
    } catch (error) {
      return thunkAPI.rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// Refresh action for force reload
export const refreshPortfolios = (client: string) => (dispatch: AppDispatch) => {
  dispatch(portfoliosSlice.actions.clear());
  return dispatch(fetchPortfolios({ client, limit: 100, cursor: null, force: true }));
};

const portfoliosSlice = createSlice({
  name: 'portfolios',
  initialState,
  reducers: {
    clear(state) {
      state.items = [];
      state.cursor = null;
      state.lastFetched = null;
      state.status = 'idle';
      state.error = null;
      state.selectedPortfolioId = null;
      state.currentClient = null;
    },
    setPortfolios(state, action: PayloadAction<{ portfolios: Portfolio[]; client: string }>) {
      state.items = action.payload.portfolios?.map(p => transformPortfolioForUI(p, action.payload.client)) ?? [];
      state.currentClient = action.payload.client;
      state.lastFetched = Date.now();
      state.status = 'succeeded';
      state.error = null;
    },
    setSelectedPortfolio(state, action: PayloadAction<string | null>) {
      state.selectedPortfolioId = action.payload ?? null;
    },
    setCurrentClient(state, action: PayloadAction<string | null>) {
      // Clear portfolios when client changes to force fresh fetch
      if (state.currentClient !== action.payload) {
        state.items = [];
        state.cursor = null;
        state.lastFetched = null;
        state.selectedPortfolioId = null;
      }
      state.currentClient = action.payload ?? null;
    },
    syncFromAPI(state, action: PayloadAction<{ portfolio: Portfolio; client: string }>) {
      const portfolio = transformPortfolioForUI(action.payload.portfolio, action.payload.client);
      const existingIndex = state.items.findIndex(p => p.portfolio === portfolio.portfolio);
      
      if (existingIndex >= 0) {
        state.items[existingIndex] = portfolio;
      } else {
        state.items.push(portfolio);
      }
    },
    updatePortfolioApplicationCount(state, action: PayloadAction<{ portfolioId: string; count: number }>) {
      // Helper to update application count when deployment data is loaded
      const portfolio = state.items.find(p => p.portfolio === action.payload.portfolioId);
      if (portfolio) {
        portfolio.applicationCount = action.payload.count;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // CREATE Portfolio
      .addCase(createPortfolio.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(createPortfolio.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items.push(action.payload.portfolio);
        state.currentClient = action.payload.client;
        state.lastFetched = Date.now();
      })
      .addCase(createPortfolio.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })

      // READ Portfolios List
      .addCase(fetchPortfolios.pending, (state, action) => {
        state.status = 'loading';
        state.error = null;
        // Set current client from action args
        state.currentClient = action.meta.arg.client;
      })
      .addCase(fetchPortfolios.fulfilled, (state, action) => {
        const summaryData = toArray<PortfolioSummary>(action.payload.data.data);
        const client = action.payload.client;
        const append = action.payload.append;
        
        // Transform PortfolioSummary to Portfolio interface
        const portfolios = summaryData.map(summary => transformPortfolioForUI({
          portfolio: summary.Portfolio,
          project: summary.Name ? { 
            name: summary.Name, 
            code: summary.Portfolio,
            description: summary.Description 
          } : undefined,
          domain: summary.Domain,
        }, client));
        
        // Either replace or append based on append flag
        if (append) {
          state.items = [...state.items, ...portfolios];
        } else {
          state.items = portfolios;
        }
        
        state.cursor = action.payload.data.metadata?.cursor ?? null;
        state.status = 'succeeded';
        state.lastFetched = Date.now();
        state.error = null;
        state.currentClient = client;
      })
      .addCase(fetchPortfolios.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message ?? 'Failed to load portfolios';
      })

      // READ Single Portfolio
      .addCase(fetchPortfolio.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchPortfolio.fulfilled, (state, action) => {
        state.status = 'succeeded';
        
        // Update or add the portfolio in the list
        const existingIndex = state.items.findIndex(p => p.portfolio === action.payload.portfolio.portfolio);
        if (existingIndex >= 0) {
          state.items[existingIndex] = action.payload.portfolio;
        } else {
          state.items.push(action.payload.portfolio);
        }
        
        state.currentClient = action.payload.client;
        state.lastFetched = Date.now();
      })
      .addCase(fetchPortfolio.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message ?? 'Failed to fetch portfolio';
      })

      // UPDATE Portfolio (PUT)
      .addCase(updatePortfolio.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(updatePortfolio.fulfilled, (state, action) => {
        state.status = 'succeeded';
        
        // Update the portfolio in the list
        const index = state.items.findIndex(p => p.portfolio === action.payload.portfolio.portfolio);
        if (index >= 0) {
          state.items[index] = action.payload.portfolio;
        }
        
        state.currentClient = action.payload.client;
        state.lastFetched = Date.now();
      })
      .addCase(updatePortfolio.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })

      // PATCH Portfolio (PATCH)
      .addCase(patchPortfolio.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(patchPortfolio.fulfilled, (state, action) => {
        state.status = 'succeeded';
        
        // Update the portfolio in the list
        const index = state.items.findIndex(p => p.portfolio === action.payload.portfolio.portfolio);
        if (index >= 0) {
          state.items[index] = action.payload.portfolio;
        }
        
        state.currentClient = action.payload.client;
        state.lastFetched = Date.now();
      })
      .addCase(patchPortfolio.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })

      // DELETE Portfolio
      .addCase(deletePortfolio.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(deletePortfolio.fulfilled, (state, action) => {
        state.status = 'succeeded';
        
        // Remove the portfolio from the list
        state.items = state.items.filter(p => p.portfolio !== action.payload.portfolio);
        
        // Clear selection if deleted portfolio was selected
        if (state.selectedPortfolioId === action.payload.portfolio) {
          state.selectedPortfolioId = null;
        }
        
        state.lastFetched = Date.now();
      })
      .addCase(deletePortfolio.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      });
  },
});

export const { 
  clear, 
  setPortfolios, 
  setSelectedPortfolio, 
  setCurrentClient, 
  syncFromAPI,
  updatePortfolioApplicationCount 
} = portfoliosSlice.actions;

// Selectors for accessing portfolio state
export const selectPortfolios = (state: RootState) => state.portfolios.items;
export const selectPortfoliosStatus = (state: RootState) => state.portfolios.status;
export const selectPortfoliosError = (state: RootState) => state.portfolios.error;
export const selectPortfoliosCursor = (state: RootState) => state.portfolios.cursor;
export const selectPortfoliosLastFetched = (state: RootState) => state.portfolios.lastFetched;
export const selectSelectedPortfolioId = (state: RootState) => state.portfolios.selectedPortfolioId;
export const selectCurrentClient = (state: RootState) => state.portfolios.currentClient;
export const selectPortfolioBySlug = (state: RootState, portfolioSlug: string) => 
  state.portfolios.items.find(p => p.portfolio === portfolioSlug);
export const selectPortfoliosLoading = (state: RootState) => state.portfolios.status === 'loading';

// Filtered selectors for UI convenience
export const selectActivePortfolios = (state: RootState) => 
  state.portfolios.items.filter(p => p.status === 'active');
export const selectPortfoliosByClient = (state: RootState, clientId: string) => 
  state.portfolios.items.filter(p => p.clientId === clientId);
export const selectHasMorePortfolios = (state: RootState) => !!state.portfolios.cursor;
export const selectPortfoliosPage = (state: RootState, page: number, pageSize: number = 20) => {
  const start = page * pageSize;
  const end = start + pageSize;
  return state.portfolios.items.slice(start, end);
};

export default portfoliosSlice.reducer;
