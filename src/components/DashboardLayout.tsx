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
  GitBranch
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

// Mock data - will be replaced with real data later
const mockPortfolios = [
  { id: 1, name: "Enterprise Suite", code: "ENT" },
  { id: 2, name: "Mobile Apps", code: "MOB" },
  { id: 3, name: "Analytics Platform", code: "ANL" },
];

export default function DashboardLayout() {
  const [currentPortfolio, setCurrentPortfolio] = useState(mockPortfolios[0]);
  const navigate = useNavigate();
  const location = useLocation();
  const { clients, selectedClient, initializeClients, selectClient } = useReduxData();

  // Initialize clients data
  useEffect(() => {
    if (clients.length === 0) {
      initializeClients([
        {
          id: '1',
          name: 'Acme Corp',
          description: 'Main enterprise client with comprehensive applications',
          homepage: 'https://acme.com',
          contactName: 'John Doe',
          contactEmail: 'john@acme.com',
          primaryAwsRegion: 'us-east-1',
          memberCount: 50,
          portfolioCount: 3,
        },
        {
          id: '2',
          name: 'TechStart Inc',
          description: 'Innovative startup focused on mobile solutions',
          homepage: 'https://techstart.com',
          contactName: 'Jane Smith',
          contactEmail: 'jane@techstart.com',
          primaryAwsRegion: 'us-west-2',
          memberCount: 25,
          portfolioCount: 2,
        },
        {
          id: '3',
          name: 'Global Systems',
          description: 'International corporation with distributed infrastructure',
          homepage: 'https://globalsystems.com',
          contactName: 'Bob Johnson',
          contactEmail: 'bob@globalsystems.com',
          primaryAwsRegion: 'eu-west-1',
          memberCount: 150,
          portfolioCount: 5,
        }
      ]);
    }
  }, [clients.length, initializeClients]);

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
    <SidebarProvider>
      <div className="min-h-screen w-full flex">
        <AppSidebar navigation={navigation} isActive={isActive} handleLogout={handleLogout} />
        
        {/* Main content */}
        <div className="flex flex-col flex-1">
          {/* Header */}
          <header className="bg-dashboard-header shadow-soft border-b border-border">
            <div className="flex items-center justify-between px-4 py-4">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
              </div>

              <div className="flex items-center gap-4">
                {/* Client Selection Dropdown */}
                {clients.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Select value={selectedClient?.id || ""} onValueChange={(value) => selectClient(value || null)}>
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
                
                <Button variant="ghost" size="icon">
                  <Settings className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleLogout}>
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </header>

          {/* Page content */}
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
}

function AppSidebar({ navigation, isActive, handleLogout }: AppSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  return (
    <Sidebar className="border-r bg-dashboard-sidebar">
      <SidebarContent>
        {/* Logo/Brand */}
        <div className="flex items-center gap-3 p-6 border-b border-border">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-light rounded-lg flex items-center justify-center">
            <Briefcase className="h-5 w-5 text-white" />
          </div>
          {!collapsed && <h1 className="text-xl font-bold text-foreground">Admin Portal</h1>}
        </div>

        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton asChild isActive={isActive(item.href)}>
                      <Link to={item.href} className="flex items-center gap-3">
                        <Icon className="h-5 w-5" />
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
          {!collapsed && (
            <Button variant="gradient" className="w-full gap-2">
              <Plus className="h-4 w-4" />
              Quick Create
            </Button>
          )}
          {collapsed && (
            <Button variant="gradient" size="icon" className="w-full">
              <Plus className="h-4 w-4" />
            </Button>
          )}
          
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <button onClick={handleLogout} className="flex items-center gap-3 w-full text-left">
                  <LogOut className="h-5 w-5" />
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