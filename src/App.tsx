import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "@/store";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Portfolios from "./pages/Portfolios";
import Applications from "./pages/Applications";
import CreatePortfolio from "./pages/CreatePortfolio";
import CreateApplication from "./pages/CreateApplication";
import PortfolioDetails from "./pages/PortfolioDetails";
import ApplicationDetails from "./pages/ApplicationDetails";
import Clients from "./pages/Clients";
import ClientDetails from "./pages/ClientDetails";
import CreateClient from "./pages/CreateClient";
import Zones from "./pages/Zones";
import ZoneDetails from "./pages/ZoneDetails";
import CreateZone from "./pages/CreateZone";
import Deployments from "./pages/Deployments";
import DeploymentDetails from "./pages/DeploymentDetails";
import Docs from "./pages/Docs";
import DashboardLayout from "./components/DashboardLayout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Landing page component for authenticated users
const Landing = () => {
  const { user } = useAuth();
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <Navigate to="/login" replace />;
};

const App = () => (
  <Provider store={store}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          
          {/* Protected dashboard routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
          </Route>
          <Route path="/profile" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Profile />} />
          </Route>
          <Route path="/portfolios" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Portfolios />} />
          </Route>
          <Route path="/portfolios/create" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<CreatePortfolio />} />
          </Route>
          <Route path="/portfolios/:id" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<PortfolioDetails />} />
          </Route>
          <Route path="/applications" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Applications />} />
          </Route>
          <Route path="/applications/create" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<CreateApplication />} />
          </Route>
          <Route path="/applications/:id" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<ApplicationDetails />} />
          </Route>
          <Route path="/clients" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Clients />} />
          </Route>
          <Route path="/clients/create" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<CreateClient />} />
          </Route>
          <Route path="/clients/:id" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<ClientDetails />} />
          </Route>
          <Route path="/clients/:id/edit" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<CreateClient />} />
          </Route>
          <Route path="/clients/:clientId/zones" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Zones />} />
          </Route>
          <Route path="/clients/:clientId/zones/create" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<CreateZone />} />
          </Route>
          <Route path="/zones" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Zones />} />
          </Route>
          <Route path="/zones/create" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<CreateZone />} />
          </Route>
          <Route path="/zones/:id" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<ZoneDetails />} />
          </Route>
          <Route path="/zones/:id/edit" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<CreateZone />} />
          </Route>
          <Route path="/deployments" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Deployments />} />
          </Route>
          <Route path="/deployments/:id" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<DeploymentDetails />} />
          </Route>
          <Route path="/docs" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Docs />} />
          </Route>
          <Route path="/settings" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Settings />} />
          </Route>
          
          {/* Catch-all route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </Provider>
);

export default App;
