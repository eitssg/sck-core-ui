import { useAppSelector, useAppDispatch } from '@/store';
import { setClients, setSelectedClient, setDefaultClient } from '@/store/slices/clientsSlice';
import { setPortfolios, setSelectedPortfolio } from '@/store/slices/portfoliosSlice';
import { setApplications, setSelectedApplication } from '@/store/slices/applicationsSlice';
import { setZones, setSelectedZone, addZone, updateZone, removeZone } from '@/store/slices/zonesSlice';
import type { Client } from '@/store/slices/clientsSlice';
import type { Portfolio } from '@/store/slices/portfoliosSlice';
import type { Application } from '@/store/slices/applicationsSlice';
import type { Zone } from '@/store/slices/zonesSlice';

// Custom hook for easier data management
export const useReduxData = () => {
  const dispatch = useAppDispatch();
  
  // Selectors
  const clients = useAppSelector(state => state.clients.items);
  const selectedClientId = useAppSelector(state => state.clients.selectedClient);
  const defaultClientId = useAppSelector(state => state.clients.defaultClient);
  const selectedClient = useAppSelector(state => 
    state.clients.items.find(client => client.id === state.clients.selectedClient)
  );
  const defaultClient = useAppSelector(state => 
    state.clients.items.find(client => client.id === state.clients.defaultClient)
  );
  
  const portfolios = useAppSelector(state => state.portfolios.portfolios);
  const selectedPortfolioId = useAppSelector(state => state.portfolios.selectedPortfolioId);
  const selectedPortfolio = useAppSelector(state => 
    state.portfolios.portfolios.find(portfolio => portfolio.id === state.portfolios.selectedPortfolioId)
  );
  
  const applications = useAppSelector(state => state.applications.applications);
  const selectedApplicationId = useAppSelector(state => state.applications.selectedApplicationId);
  const selectedApplication = useAppSelector(state => 
    state.applications.applications.find(app => app.id === state.applications.selectedApplicationId)
  );
  
  const zones = useAppSelector(state => state.zones.zones);
  const selectedZoneId = useAppSelector(state => state.zones.selectedZoneId);
  const selectedZone = useAppSelector(state => 
    state.zones.zones.find(zone => zone.id === state.zones.selectedZoneId)
  );
  
  // Actions
  const initializeClients = (clientsData: Client[]) => {
    dispatch(setClients(clientsData));
    // Auto-select first client as default if none exists
    if (clientsData.length > 0 && !defaultClientId) {
      dispatch(setDefaultClient(clientsData[0].id));
    }
  };
  
  const selectClient = (clientId: string | null) => {
    dispatch(setSelectedClient(clientId));
  };

  const setUserDefaultClient = (clientId: string | null) => {
    dispatch(setDefaultClient(clientId));
  };
  
  const initializePortfolios = (portfoliosData: Portfolio[]) => {
    dispatch(setPortfolios(portfoliosData));
  };
  
  const selectPortfolio = (portfolioId: string | null) => {
    dispatch(setSelectedPortfolio(portfolioId));
  };
  
  const initializeApplications = (applicationsData: Application[]) => {
    dispatch(setApplications(applicationsData));
  };
  
  const selectApplication = (applicationId: string | null) => {
    dispatch(setSelectedApplication(applicationId));
  };
  
  const initializeZones = (zonesData: Zone[]) => {
    dispatch(setZones(zonesData));
  };
  
  const selectZone = (zoneId: string | null) => {
    dispatch(setSelectedZone(zoneId));
  };
  
  const createZone = (zoneData: Zone) => {
    dispatch(addZone(zoneData));
  };
  
  const editZone = (zoneData: Zone) => {
    dispatch(updateZone(zoneData));
  };
  
  const deleteZone = (zoneId: string) => {
    dispatch(removeZone(zoneId));
  };
  
  return {
    // Data
    clients,
    selectedClientId,
    selectedClient,
    defaultClientId,
    defaultClient,
    portfolios,
    selectedPortfolioId,
    selectedPortfolio,
    applications,
    selectedApplicationId,
    selectedApplication,
    zones,
    selectedZoneId,
    selectedZone,
    
    // Actions
    initializeClients,
    selectClient,
    setUserDefaultClient,
    initializePortfolios,
    selectPortfolio,
    initializeApplications,
    selectApplication,
    initializeZones,
    selectZone,
    addZone: createZone,
    updateZone: editZone,
    removeZone: deleteZone,
  };
};