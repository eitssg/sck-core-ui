import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { 
  Home, 
  User, 
  Briefcase, 
  Plus, 
  Settings, 
  LogOut, 
  Menu,
  X,
  ChevronDown,
  FolderOpen,
  List,
  Building2,
  GitBranch,
  Cloud
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useReduxData } from "@/hooks/useReduxData";
import { useAppDispatch, useAppSelector } from '@/store';
import { setDeployments, setEvents } from '@/store/slices/deploymentsSlice';

// Mock data - will be replaced with real data later
const mockPortfolios = [
  { id: 1, name: "Enterprise Suite", code: "ENT" },
  { id: 2, name: "Mobile Apps", code: "MOB" },
  { id: 3, name: "Analytics Platform", code: "ANL" },
];

export default function DashboardLayout() {
  const [currentPortfolio, setCurrentPortfolio] = useState(mockPortfolios[0]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const deployments = useAppSelector(state => state.deployments.deployments);
  const { clients, selectedClient, defaultClient, selectClient } = useReduxData();

  // All data should be managed by Redux slices, not initialized here
  useEffect(() => {
    console.log('DashboardLayout mounted - data should come from Redux slice initial states');
    
    // Auto-select first client if available and none selected
    if (clients.length > 0 && !defaultClient) {
      selectClient(clients[0].id);
    }
  }, [clients.length, defaultClient, selectClient]);

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "Clients", href: "/clients", icon: Building2 },
    { name: "Zones", href: "/zones", icon: GitBranch },
    { name: "Portfolios", href: "/portfolios", icon: Briefcase },
    { name: "Applications", href: "/applications", icon: FolderOpen },
    { name: "Deployments", href: "/deployments", icon: GitBranch },
    { name: "Documentation", href: "/docs", icon: List },
    { name: "Profile", href: "/profile", icon: User },
  ];

  const handleLogout = () => {
    // TODO: Implement logout logic
    navigate("/login");
  };

  const isActive = (href: string) => location.pathname === href || location.pathname.startsWith(href + '/');

  return (
    <SidebarProvider open={!sidebarCollapsed} onOpenChange={(open) => setSidebarCollapsed(!open)}>
      <div className="min-h-screen w-full flex flex-col">
        {/* Full width header with portal branding */}
        <header className="bg-dashboard-header shadow-soft border-b border-border w-full">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-light rounded-lg flex items-center justify-center">
                  <Cloud className="h-5 w-5 text-primary-foreground" />
                </div>
                <h1 className="text-xl font-bold text-foreground">Core Automation Portal</h1>
              </div>
              <SidebarTrigger />
            </div>

            <div className="flex items-center gap-4">
              {/* Client Selection Dropdown */}
              {clients.length > 0 && (
                <div className="flex items-center gap-2">
                  <Select 
                    value={selectedClient?.id || defaultClient?.id || ""} 
                    onValueChange={(value) => selectClient(value || null)}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select client..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <Button variant="ghost" size="icon" asChild>
                <Link to="/settings">
                  <Settings className="h-5 w-5" />
                </Link>
              </Button>
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Content area with sidebar and main content */}
        <div className="flex flex-1">
          <AppSidebar 
            navigation={navigation} 
            isActive={isActive} 
            handleLogout={handleLogout} 
            collapsed={sidebarCollapsed}
          />
          
          {/* Main content */}
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

interface AppSidebarProps {
  navigation: Array<{
    name: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
  }>;
  isActive: (href: string) => boolean;
  handleLogout: () => void;
  collapsed: boolean;
}

function AppSidebar({ navigation, isActive, handleLogout, collapsed }: AppSidebarProps) {

  return (
    <Sidebar 
      className={`border-r bg-dashboard-sidebar transition-all duration-200 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
      collapsible="none"
    >
      <SidebarContent>

        {/* Navigation */}
        <SidebarGroup className="pt-4">
          {!collapsed && <SidebarGroupLabel>Navigation</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive(item.href)}
                      className={collapsed ? 'justify-center' : ''}
                      title={collapsed ? item.name : undefined}
                    >
                      <Link to={item.href} className="flex items-center gap-3">
                        <Icon className="h-5 w-5 flex-shrink-0" />
                        {!collapsed && <span>{item.name}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Quick Actions & Logout */}
        <div className="mt-auto p-4 border-t border-border space-y-2">
          <Button 
            variant="gradient" 
            className={`gap-2 ${collapsed ? 'px-2' : 'w-full'}`}
            size={collapsed ? 'icon' : 'default'}
            title={collapsed ? 'Quick Create' : undefined}
          >
            <Plus className="h-4 w-4" />
            {!collapsed && 'Quick Create'}
          </Button>
          
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton 
                asChild 
                className={collapsed ? 'justify-center' : ''}
                title={collapsed ? 'Logout' : undefined}
              >
                <button onClick={handleLogout} className="flex items-center gap-3 w-full text-left">
                  <LogOut className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && <span>Logout</span>}
                </button>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}