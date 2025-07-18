import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Portfolios from "./pages/Portfolios";
import Applications from "./pages/Applications";
import CreatePortfolio from "./pages/CreatePortfolio";
import CreateApplication from "./pages/CreateApplication";
import PortfolioDetails from "./pages/PortfolioDetails";
import ApplicationDetails from "./pages/ApplicationDetails";
import Docs from "./pages/Docs";
import DashboardLayout from "./components/DashboardLayout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          
          {/* Protected dashboard routes */}
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Dashboard />} />
          </Route>
          <Route path="/profile" element={<DashboardLayout />}>
            <Route index element={<Profile />} />
          </Route>
          <Route path="/portfolios" element={<DashboardLayout />}>
            <Route index element={<Portfolios />} />
          </Route>
          <Route path="/portfolios/create" element={<DashboardLayout />}>
            <Route index element={<CreatePortfolio />} />
          </Route>
          <Route path="/portfolios/:id" element={<DashboardLayout />}>
            <Route index element={<PortfolioDetails />} />
          </Route>
          <Route path="/applications" element={<DashboardLayout />}>
            <Route index element={<Applications />} />
          </Route>
          <Route path="/applications/create" element={<DashboardLayout />}>
            <Route index element={<CreateApplication />} />
          </Route>
          <Route path="/applications/:id" element={<DashboardLayout />}>
            <Route index element={<ApplicationDetails />} />
          </Route>
          <Route path="/docs" element={<DashboardLayout />}>
            <Route index element={<Docs />} />
          </Route>
          
          {/* Catch-all route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
