import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/store';

// Import from your actual slices
import {
  fetchClients,
  fetchClient,
  createClient,
  updateClient,
  patchClient,
  deleteClient,
  refreshClients,
  refreshClient,
  switchToClient,
  getCurrentClientFromJWT,
  setClients,
  setSelectedClient,
  setDefaultClient,
  syncFromAPI as syncClientFromAPI,
  setCurrentActiveClient,
  clear as clearClients,
  clearSwitchError,
  clearAllCachesForClientSwitch,
  selectClients,
  selectClientsStatus,
  selectClientsError,
  selectSelectedClient,
  selectCurrentActiveClient,
  selectSwitchingToClient,
  selectSwitchError,
  selectIsClientSwitching
} from '@/store/slices/clientsSlice';

import {
  fetchPortfolios,
  fetchPortfolio,
  createPortfolio,
  updatePortfolio,
  patchPortfolio,
  deletePortfolio,
  refreshPortfolios,
  setPortfolios,
  setSelectedPortfolio,
  setCurrentClient,
  syncFromAPI as syncPortfolioFromAPI,
  updatePortfolioApplicationCount,
  clear as clearPortfolios,
  selectPortfolios,
  selectPortfoliosStatus,
  selectPortfoliosError,
  selectSelectedPortfolioId,
  selectCurrentClient,
  selectPortfoliosLoading,
  selectPortfoliosCursor,
  selectHasMorePortfolios
} from '@/store/slices/portfoliosSlice';

// Import only what actually exists in themeSlice
import {
  setTheme,
  initializeTheme,
  updateSystemTheme
} from '@/store/slices/themeSlice';
import type { Zone } from '@/store/types';

export const useReduxData = () => {
  const dispatch = useDispatch<AppDispatch>();

  // All state
  const auth = useSelector((state: RootState) => state.auth);
  const theme = useSelector((state: RootState) => state.theme);
  const profile = useSelector((state: RootState) => state.profile);

  const clients = {
    items: useSelector(selectClients),
    status: useSelector(selectClientsStatus),
    error: useSelector(selectClientsError),
    loading: useSelector(selectClientsStatus) === 'loading',
    selectedClient: useSelector(selectSelectedClient),
    currentActiveClient: useSelector(selectCurrentActiveClient),
    switchingToClient: useSelector(selectSwitchingToClient),
    switchError: useSelector(selectSwitchError),
    isSwitching: useSelector(selectIsClientSwitching)
  };

  const portfolios = {
    items: useSelector(selectPortfolios),
    status: useSelector(selectPortfoliosStatus),
    error: useSelector(selectPortfoliosError),
    loading: useSelector(selectPortfoliosLoading),
    selectedPortfolioId: useSelector(selectSelectedPortfolioId),
    currentClient: useSelector(selectCurrentClient),
    cursor: useSelector(selectPortfoliosCursor),
    hasMore: useSelector(selectHasMorePortfolios),
  };

  const applications = useSelector((state: RootState) => state.applications || { items: [], loading: false, error: null });
  const deployments = useSelector((state: RootState) => state.deployments || { items: [], loading: false, error: null });
  // zones slice shape: { zones: Zone[], ... } -> expose the list
  const zones = useSelector((state: RootState) => (state.zones as any)?.zones ?? []) as Zone[];

  const actions = {
    clients: {
      fetch: (args?: { limit?: number; cursor?: string | null; force?: boolean }) => 
        dispatch(fetchClients(args)),
      fetchSingle: (clientSlug: string, force?: boolean) => 
        dispatch(fetchClient({ clientSlug, force })),
      create: (clientData: any) => dispatch(createClient(clientData)),
      update: (clientSlug: string, clientData: any) => 
        dispatch(updateClient({ clientSlug, clientData })),
      patch: (clientSlug: string, clientData: any) => 
        dispatch(patchClient({ clientSlug, clientData })),
      remove: (clientSlug: string) => dispatch(deleteClient(clientSlug)),
      refresh: () => dispatch(refreshClients()),
      refreshSingle: (clientSlug: string) => dispatch(refreshClient(clientSlug)),
      switchTo: (clientSlug: string) => dispatch(switchToClient(clientSlug)),
      getCurrentFromJWT: () => dispatch(getCurrentClientFromJWT()),
      setItems: (clients: any[]) => dispatch(setClients(clients)),
      setSelected: (clientSlug: string | null) => dispatch(setSelectedClient(clientSlug)),
      setDefault: (clientSlug: string | null) => dispatch(setDefaultClient(clientSlug)),
      setCurrentActive: (clientSlug: string | null) => dispatch(setCurrentActiveClient(clientSlug)),
      syncFromAPI: (client: any) => dispatch(syncClientFromAPI(client)),
      clear: () => dispatch(clearClients()),
      clearSwitchError: () => dispatch(clearSwitchError()),
      clearAllCaches: () => dispatch(clearAllCachesForClientSwitch())
    },
    portfolios: {
      fetch: (client: string, options?: { limit?: number; cursor?: string | null; force?: boolean; append?: boolean }) => 
        dispatch(fetchPortfolios({ client, ...options })),
      fetchSingle: (client: string, portfolio: string, force?: boolean) => 
        dispatch(fetchPortfolio({ client, portfolio, force })),
      create: (client: string, portfolioData: any) => 
        dispatch(createPortfolio({ client, portfolioData })),
      update: (client: string, portfolio: string, portfolioData: any) => 
        dispatch(updatePortfolio({ client, portfolio, portfolioData })),
      patch: (client: string, portfolio: string, portfolioData: any) => 
        dispatch(patchPortfolio({ client, portfolio, portfolioData })),
      remove: (client: string, portfolio: string) => 
        dispatch(deletePortfolio({ client, portfolio })),
      refresh: (client: string) => dispatch(refreshPortfolios(client)),
      setItems: (portfolios: any[], client: string) => 
        dispatch(setPortfolios({ portfolios, client })),
      setSelected: (portfolioId: string | null) => dispatch(setSelectedPortfolio(portfolioId)),
      setCurrentClient: (client: string | null) => dispatch(setCurrentClient(client)),
      syncFromAPI: (portfolio: any, client: string) => 
        dispatch(syncPortfolioFromAPI({ portfolio, client })),
      updateApplicationCount: (portfolioId: string, count: number) => 
        dispatch(updatePortfolioApplicationCount({ portfolioId, count })),
      clear: () => dispatch(clearPortfolios())
    },
    theme: {
      setTheme: (themeName: string) => dispatch(setTheme(themeName)),
      initialize: () => dispatch(initializeTheme()),
      updateSystem: () => dispatch(updateSystemTheme())
    }
  };

  // Selected client - zones expects this
  const selectedClient = useSelector((state: RootState) => state.clients?.selectedClient ?? null);

  // Action helpers that your components expect
  const selectClient = (client: any) => {
    dispatch({ type: 'clients/setSelectedClient', payload: client });
  };

  const removeZone = (key: { client: string; zone: string }) => {
     dispatch({ type: 'zones/removeZone', payload: key });
  };

  const addZone = (zone: any) => {
    dispatch({ type: 'zones/addZone', payload: zone });
  };

  const updateZone = (zone: any) => {
    dispatch({ type: 'zones/updateZone', payload: zone });
  };

  return {
    auth,
    clients,
    portfolios,
    applications,
    deployments,
    zones,
    profile,
    theme,
    actions,
    selectedClient,
    
    // Actions
    dispatch,
    selectClient,
    removeZone,
    addZone,
    updateZone,
  };
};