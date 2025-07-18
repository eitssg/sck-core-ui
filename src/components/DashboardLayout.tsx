import { useState } from "react";
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
  List
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Mock data - will be replaced with real data later
const mockPortfolios = [
  { id: 1, name: "Enterprise Suite", code: "ENT" },
  { id: 2, name: "Mobile Apps", code: "MOB" },
  { id: 3, name: "Analytics Platform", code: "ANL" },
];

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPortfolio, setCurrentPortfolio] = useState(mockPortfolios[0]);
  const navigate = useNavigate();
  const location = useLocation();

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "Portfolios", href: "/portfolios", icon: Briefcase },
    { name: "Applications", href: "/applications", icon: FolderOpen },
    { name: "Documentation", href: "/docs", icon: List },
    { name: "Profile", href: "/profile", icon: User },
  ];

  const handleLogout = () => {
    // TODO: Implement logout logic
    navigate("/login");
  };

  const isActive = (href: string) => location.pathname === href;

  return (
    <div className="min-h-screen bg-dashboard-bg">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 w-64 bg-dashboard-sidebar shadow-large animate-slide-in">
          <SidebarContent 
            navigation={navigation} 
            isActive={isActive}
            onClose={() => setSidebarOpen(false)}
          />
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-dashboard-sidebar shadow-medium">
          <SidebarContent navigation={navigation} isActive={isActive} />
        </div>
      </div>

      {/* Main content */}
      <div className="lg:ml-64 flex flex-col flex-1">
        {/* Header */}
        <header className="bg-dashboard-header shadow-soft border-b border-border">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              
              {/* Portfolio Selector */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Briefcase className="h-4 w-4" />
                    {currentPortfolio.name}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  {mockPortfolios.map((portfolio) => (
                    <DropdownMenuItem
                      key={portfolio.id}
                      onClick={() => setCurrentPortfolio(portfolio)}
                      className={currentPortfolio.id === portfolio.id ? "bg-accent" : ""}
                    >
                      <Briefcase className="mr-2 h-4 w-4" />
                      {portfolio.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center gap-2">
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
  );
}

interface SidebarContentProps {
  navigation: Array<{
    name: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
  }>;
  isActive: (href: string) => boolean;
  onClose?: () => void;
}

function SidebarContent({ navigation, isActive, onClose }: SidebarContentProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo/Brand */}
      <div className="flex items-center justify-between p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-light rounded-lg flex items-center justify-center">
            <Briefcase className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Admin Portal</h1>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="lg:hidden">
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
              onClick={onClose}
            >
              <Icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Quick Actions */}
      <div className="p-4 border-t border-border">
        <Button variant="gradient" className="w-full gap-2" onClick={() => {}}>
          <Plus className="h-4 w-4" />
          Quick Create
        </Button>
      </div>
    </div>
  );
}