import { useAppSelector, useAppDispatch } from '@/store';
import { setClients, setSelectedClient } from '@/store/slices/clientsSlice';
import { setPortfolios, setSelectedPortfolio } from '@/store/slices/portfoliosSlice';
import { setApplications, setSelectedApplication } from '@/store/slices/applicationsSlice';
import type { Client } from '@/store/slices/clientsSlice';
import type { Portfolio } from '@/store/slices/portfoliosSlice';
import type { Application } from '@/store/slices/applicationsSlice';

// Custom hook for easier data management
export const useReduxData = () => {
  const dispatch = useAppDispatch();
  
  // Selectors
  const clients = useAppSelector(state => state.clients.clients);
  const selectedClientId = useAppSelector(state => state.clients.selectedClientId);
  const selectedClient = useAppSelector(state => 
    state.clients.clients.find(client => client.id === state.clients.selectedClientId)
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
  
  // Actions
  const initializeClients = (clientsData: Client[]) => {
    dispatch(setClients(clientsData));
  };
  
  const selectClient = (clientId: string | null) => {
    dispatch(setSelectedClient(clientId));
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
  
  return {
    // Data
    clients,
    selectedClientId,
    selectedClient,
    portfolios,
    selectedPortfolioId,
    selectedPortfolio,
    applications,
    selectedApplicationId,
    selectedApplication,
    
    // Actions
    initializeClients,
    selectClient,
    initializePortfolios,
    selectPortfolio,
    initializeApplications,
    selectApplication,
  };
};