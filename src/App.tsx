import { Toaster } from "@/components/ui/toaster";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Provider } from "react-redux";
import { store, useAppSelector } from "@/store";
import AppTheme from '@/AppTheme';
import { AuthProvider } from "@/contexts/AuthContext";
import SessionManager from '@/components/SessionManager';
import { useAuth } from "@/contexts/useAuth";
import { lazy, Suspense } from "react";
import { createProtectedRoute, createPublicRoute } from '@/utils/routeHelpers';
import { PageLoader } from '@/components/PageLoader';
import PermissionIssues from '@/components/PermissionIssues';
import AuthBootstrap from '@/components/AuthBootstrap';
import ProfileBootstrap from '@/components/ProfileBootstrap';
import ClientsBootstrap from '@/components/ClientsBootstrap';
import TokenBootstrap from '@/components/TokenBootstrap';
import { selectUser as selectProfileUser } from '@/store/slices/profileSlice';
import { ProtectedRoute } from '@/components/ProtectedRoute';

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
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Profile = lazy(() => import("./pages/Profile"));
const AWSCredentials = lazy(() => import("./pages/AWSCredentials"));
const MFAToken = lazy(() => import("./pages/MFAToken"));
const Settings = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Portfolios = lazy(() => import("./pages/Portfolios"));
const CreatePortfolio = lazy(() => import("./pages/CreatePortfolio"));
const PortfolioDetails = lazy(() => import("./pages/PortfolioDetails"));
// Applications routes removed (now listed under PortfolioDetails)
// const Applications = lazy(() => import("./pages/Applications"));
// const CreateApplication = lazy(() => import("./pages/CreateApplication"));
const ApplicationDetails = lazy(() => import("./pages/ApplicationDetails"));
const Clients = lazy(() => import("./pages/Clients"));
const ClientDetails = lazy(() => import("./pages/ClientDetails"));
const CreateClient = lazy(() => import("./pages/CreateClient"));
const RegisterClient = lazy(() => import("./pages/RegisterClient"));
const Zones = lazy(() => import("./pages/Zones"));
const ZoneDetails = lazy(() => import("./pages/ZoneDetails"));
const CreateZone = lazy(() => import("./pages/CreateZone"));
const Deployments = lazy(() => import("./pages/Deployments"));
const DeploymentDetails = lazy(() => import("./pages/DeploymentDetails"));
const GoToGitHub = lazy(() => import("./pages/GoToGitHub"));
const Docs = lazy(() => import("./pages/Docs"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const Welcome = lazy(() => import("./pages/Welcome"));

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

// Global toast bridge: listens for window 'sck:toast' events and shows a toast (with dedupe handled by notify)
const ToastBridge = () => {
  const { toast } = useToast();
  useEffect(() => {
    const handler = (e: Event) => {
      const ev = e as CustomEvent<{ level: string; title: string; description?: string }>;
      const { level, title, description } = ev.detail || ({} as any);
      toast({ title, description, variant: level === 'error' ? 'destructive' : undefined });
    };
    window.addEventListener('sck:toast', handler as EventListener);
    return () => window.removeEventListener('sck:toast', handler as EventListener);
  }, [toast]);
  return null;
};

// Dashboard entry point that chooses between Onboarding and Dashboard based on AWS credentials flag
const DashboardEntry = () => {
  const profileUser = useAppSelector(selectProfileUser as any) as any;
  const hasAwsCreds = Boolean((profileUser?.credentials || {})?.AwsCredentials);
  return (
    <Suspense fallback={<PageLoader type="dashboard" />}> 
      {hasAwsCreds ? <Dashboard /> : <Onboarding />}
    </Suspense>
  );
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
    {createPublicRoute('/verify-email', VerifyEmail)}
    {createPublicRoute('/welcome', Welcome)}
    {createPublicRoute('/authorized', Authorized)}

    {/* Protected routes */}
    <Route
      key="/dashboard"
      path="/dashboard"
      element={
        <ProtectedRoute>
          <Suspense fallback={<PageLoader type="dashboard" />}> 
            <DashboardEntry />
          </Suspense>
        </ProtectedRoute>
      }
    />
    {createProtectedRoute('/profile', Profile, 'form')}
    {createProtectedRoute('/aws-credentials', AWSCredentials, 'form')}
    {createProtectedRoute('/mfa-token', MFAToken, 'form')}
    {createProtectedRoute('/settings', Settings, 'form')}

    {/* Portfolio routes */}
    {createProtectedRoute('/portfolios', Portfolios, 'list')}
    {createProtectedRoute('/portfolios/create', CreatePortfolio, 'form')}
  {createProtectedRoute('/portfolios/:portfolio', PortfolioDetails, 'dashboard')}

  {/* Application routes removed; detail remains accessible via portfolio/application links */}
  {createProtectedRoute('/applications/:id', ApplicationDetails, 'dashboard')}

    {/* Client routes */}
    {createProtectedRoute('/clients', Clients, 'list')}
    {createProtectedRoute('/clients/create', CreateClient, 'form')}
    {createProtectedRoute('/clients/:client', ClientDetails, 'dashboard')}

    {/* Register OAUTH client_id SPA or Client App */}
    {createProtectedRoute('/register-client', RegisterClient, 'form')}

    {/* Zone routes */}
    {createProtectedRoute('/zones', Zones, 'list')}
    {createProtectedRoute('/zones/create', CreateZone, 'form')}
    {createProtectedRoute('/zones/:client/:zone', ZoneDetails, 'dashboard')}

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
        <BrowserRouter basename={import.meta.env.DEV ? undefined : (import.meta.env.VITE_BASE_PATH || undefined)}>
          <AuthProvider>
            <TooltipProvider>
              <TokenBootstrap />
              <AuthBootstrap />
              <ProfileBootstrap />
              <ClientsBootstrap />
              <SessionManager />
              <ToastBridge />
              <PermissionIssues />
              {/* Temporarily disabling the global AWS Credentials gate to restore normal login flow */}
              {/* <AwsCredentialsGate /> */}
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
