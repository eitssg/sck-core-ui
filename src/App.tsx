import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "@/store";
import { ThemeManager } from "@/components/ThemeManager";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { lazy, Suspense } from "react";
import { createProtectedRoute, createPublicRoute } from '@/utils/routeHelpers';
import { PageLoader } from '@/components/PageLoader';

// Always-loaded components (critical path)
import DashboardLayout from "./components/DashboardLayout";

// Lazy-loaded pages
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const EnterCode = lazy(() => import("./pages/EnterCode"));
const NewPassword = lazy(() => import("./pages/NewPassword"));
const OAuthCallback = lazy(() => import("./pages/OAuthCallback"));
const NoAccount = lazy(() => import("./pages/NoAccount")); 

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Profile = lazy(() => import("./pages/Profile"));
const Settings = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Portfolio pages
const Portfolios = lazy(() => import("./pages/Portfolios"));
const CreatePortfolio = lazy(() => import("./pages/CreatePortfolio"));
const PortfolioDetails = lazy(() => import("./pages/PortfolioDetails"));

// Application pages
const Applications = lazy(() => import("./pages/Applications"));
const CreateApplication = lazy(() => import("./pages/CreateApplication"));
const ApplicationDetails = lazy(() => import("./pages/ApplicationDetails"));

// Client pages
const Clients = lazy(() => import("./pages/Clients"));
const ClientDetails = lazy(() => import("./pages/ClientDetails"));
const CreateClient = lazy(() => import("./pages/CreateClient"));

// Zone pages
const Zones = lazy(() => import("./pages/Zones"));
const ZoneDetails = lazy(() => import("./pages/ZoneDetails"));
const CreateZone = lazy(() => import("./pages/CreateZone"));

// Other pages
const Deployments = lazy(() => import("./pages/Deployments"));
const DeploymentDetails = lazy(() => import("./pages/DeploymentDetails"));
const GoToGitHub = lazy(() => import("./pages/GoToGitHub"));
const Docs = lazy(() => import("./pages/Docs"));

const queryClient = new QueryClient();

// Create separate components to avoid hook usage outside providers
const AppRoutes = () => {
  const Landing = () => {
    const { user } = useAuth();
    
    if (user) {
      return <Navigate to="/dashboard" replace />;
    }
    
    return <Navigate to="/login" replace />;
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Landing />} />
        {createPublicRoute('/login', Login)}
        {createPublicRoute('/signup', Signup)}
        {createPublicRoute('/forgot-password', ForgotPassword)}
        {createPublicRoute('/enter-code', EnterCode)}
        {createPublicRoute('/new-password', NewPassword)}
        {createPublicRoute('/authorized', OAuthCallback)}
        {createPublicRoute('/no-account', NoAccount)}
        
        {/* Protected routes */}
        {createProtectedRoute('/dashboard', Dashboard, 'dashboard')}
        {createProtectedRoute('/profile', Profile, 'form')}
        {createProtectedRoute('/settings', Settings, 'form')}
        
        {/* Portfolio routes */}
        {createProtectedRoute('/portfolios', Portfolios, 'list')}
        {createProtectedRoute('/portfolios/create', CreatePortfolio, 'form')}
        {createProtectedRoute('/portfolios/:id', PortfolioDetails, 'dashboard')}
        
        {/* Application routes */}
        {createProtectedRoute('/applications', Applications, 'list')}
        {createProtectedRoute('/applications/create', CreateApplication, 'form')}
        {createProtectedRoute('/applications/:id', ApplicationDetails, 'dashboard')}
        
        {/* Client routes */}
        {createProtectedRoute('/clients', Clients, 'list')}
        {createProtectedRoute('/clients/create', CreateClient, 'form')}
        {createProtectedRoute('/clients/:id', ClientDetails, 'dashboard')}
        {createProtectedRoute('/clients/:id/edit', CreateClient, 'form')}
        
        {/* Zone routes */}
        {createProtectedRoute('/zones', Zones, 'list')}
        {createProtectedRoute('/zones/create', CreateZone, 'form')}
        {createProtectedRoute('/zones/:id', ZoneDetails, 'dashboard')}
        
        {/* Deployment routes */}
        {createProtectedRoute('/deployments', Deployments, 'list')}
        {createProtectedRoute('/deployments/:id', DeploymentDetails, 'dashboard')}
        
        {/* Other routes */}
        {createProtectedRoute('/docs', Docs, 'default')}
        {createPublicRoute('/github', GoToGitHub)}
        
        <Route path="*" element={
          <Suspense fallback={<PageLoader type="default" />}>
            <NotFound />
          </Suspense>
        } />
      </Routes>
    </BrowserRouter>
  );
};

// Main App component with correct provider hierarchy
const App = () => (
  <Provider store={store}>
    <AuthProvider>
      <ThemeManager>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <AppRoutes />
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeManager>
    </AuthProvider>
  </Provider>
);

export default App;
