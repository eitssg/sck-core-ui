import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "@/store";
import AppTheme from '@/AppTheme';
import { AuthProvider } from "@/contexts/AuthContext";
import { useAuth } from "@/contexts/useAuth";
import { lazy, Suspense } from "react";
import { createProtectedRoute, createPublicRoute } from '@/utils/routeHelpers';
import { PageLoader } from '@/components/PageLoader';

// Lazy load all pages
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const EnterCode = lazy(() => import("./pages/EnterCode"));
const NewPassword = lazy(() => import("./pages/NewPassword"));
const NoAccount = lazy(() => import("./pages/NoAccount"));
const NewPasswordSuccess = lazy(() => import("./pages/NewPasswordSuccess"));
const Authorized = lazy(() => import("./pages/Authorized"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Profile = lazy(() => import("./pages/Profile"));
const Settings = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Portfolios = lazy(() => import("./pages/Portfolios"));
const CreatePortfolio = lazy(() => import("./pages/CreatePortfolio"));
const PortfolioDetails = lazy(() => import("./pages/PortfolioDetails"));
const Applications = lazy(() => import("./pages/Applications"));
const CreateApplication = lazy(() => import("./pages/CreateApplication"));
const ApplicationDetails = lazy(() => import("./pages/ApplicationDetails"));
const Clients = lazy(() => import("./pages/Clients"));
const ClientDetails = lazy(() => import("./pages/ClientDetails"));
const CreateClient = lazy(() => import("./pages/CreateClient"));
const Zones = lazy(() => import("./pages/Zones"));
const ZoneDetails = lazy(() => import("./pages/ZoneDetails"));
const CreateZone = lazy(() => import("./pages/CreateZone"));
const Deployments = lazy(() => import("./pages/Deployments"));
const DeploymentDetails = lazy(() => import("./pages/DeploymentDetails"));
const GoToGitHub = lazy(() => import("./pages/GoToGitHub"));
const Docs = lazy(() => import("./pages/Docs"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Landing component that uses auth
const Landing = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoader type="default" />;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/login" replace />;
};

// Routes component
const AppRoutes = () => (
  <Routes>
    {/* Public routes */}
    <Route path="/" element={<Landing />} />
    {createPublicRoute('/login', Login)}
    {createPublicRoute('/signup', Signup)}
    {createPublicRoute('/forgot-password', ForgotPassword)}
    {createPublicRoute('/enter-code', EnterCode)}
    {createPublicRoute('/new-password', NewPassword)}
    {createPublicRoute('/no-account', NoAccount)}
    {createPublicRoute('/new-password-success', NewPasswordSuccess)}
    {createPublicRoute('/authorized', Authorized)}

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
);

// Main App component with provider hierarchy
const App = () => (
  <Provider store={store}>
    <QueryClientProvider client={queryClient}>
      <AppTheme>
        <BrowserRouter basename={import.meta.env.VITE_BASE_PATH || '/'}>
          <AuthProvider>
            <TooltipProvider>
              <AppRoutes />
              <Toaster />
            </TooltipProvider>
          </AuthProvider>
        </BrowserRouter>
      </AppTheme>
    </QueryClientProvider>
  </Provider>
);

export default App;
