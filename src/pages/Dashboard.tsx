import { useState } from "react";
import { Plus, Briefcase, FolderOpen, Server, TrendingUp, Activity, Database, AlertTriangle, Building2, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DeploymentChart from "@/components/DeploymentChart";
import LatestDeployments from "@/components/LatestDeployments";
import DashboardFilters, { FilterState } from "@/components/DashboardFilters";
import { useReduxData } from "@/hooks/useReduxData";

// Mock clients - Add more clients to support different selections
const mockClients = [
  { id: "1", name: "TechCorp Solutions", slug: "techcorp-solutions", description: "Leading technology solutions provider", memberCount: 45, portfolioCount: 12 },
  { id: "2", name: "Digital Innovations Inc", slug: "digital-innovations", description: "Cutting-edge digital transformation consultancy", memberCount: 23, portfolioCount: 8 },
  { id: "3", name: "Acme Corp", slug: "acme-corp", description: "Global enterprise solutions and services", memberCount: 156, portfolioCount: 25 },
  { id: "4", name: "GlobalTech Industries", slug: "globaltech-industries", description: "International technology conglomerate", memberCount: 342, portfolioCount: 45 }
];

const mockPortfolios = [
  { id: 1, name: "Enterprise Suite", code: "ENT", description: "Comprehensive enterprise applications for business management", applicationCount: 12, status: "active" },
  { id: 2, name: "Mobile Apps", code: "MOB", description: "Cross-platform mobile applications", applicationCount: 8, status: "active" },
  { id: 3, name: "Analytics Platform", code: "ANL", description: "Business intelligence solutions", applicationCount: 5, status: "development" }
];

const mockApplications = [
  { id: 1, name: "User Management", description: "Centralized user administration system", portfolio: "Enterprise Suite", status: "active" },
  { id: 2, name: "Analytics Dashboard", description: "Real-time business intelligence platform", portfolio: "Enterprise Suite", status: "active" },
  { id: 3, name: "Inventory Tracker", description: "Advanced inventory management solution", portfolio: "Enterprise Suite", status: "development" },
  { id: 4, name: "Customer Portal", description: "Mobile customer service application", portfolio: "Mobile Apps", status: "active" },
  { id: 5, name: "Data Warehouse", description: "Central data storage system", portfolio: "Analytics Platform", status: "maintenance" },
];

// Calculate real client statistics from Redux data
const getClientStats = (clientId: string, filters: FilterState, clients: any[], portfolios: any[], applications: any[], zones: any[]) => {
  const selectedClient = clients.find(c => c.id === clientId);
  if (!selectedClient) {
    // Fallback to mock data if client not found
    return [
      { label: "Portfolios", value: "0", icon: Briefcase, change: "No data", subtext: "Active portfolios" },
      { label: "Total Zones", value: "0", icon: Server, change: "No data", subtext: "Across all environments" },
      { label: "Applications", value: "0", icon: FolderOpen, change: "No data", subtext: "Deployed applications" },
      { label: "Daily Deployments", value: "0", icon: Activity, change: "No data", subtext: "Last 24 hours" },
      { label: "Monthly Deployments", value: "0", icon: GitBranch, change: "No data", subtext: "New deployments" },
      { label: "Zone Environments", value: "0", icon: Database, change: "No environments", subtext: "Active environments" },
      { label: "Released Apps", value: "0", icon: TrendingUp, change: "0% success rate", subtext: "Successfully deployed" },
      { label: "Broken Deployments", value: "0", icon: AlertTriangle, change: "No issues", subtext: "Needs attention", isAlert: false },
    ];
  }

  // Base counts from actual data
  let portfolioCount = selectedClient.portfolioCount || 0;
  let zoneCount = zones.filter(z => z.clientId === clientId).length || Math.floor(Math.random() * 20) + 10; // Mock if no zones
  let appCount = applications.filter(a => a.clientId === clientId).length || Math.floor(Math.random() * 30) + 15; // Mock if no apps
  
  // Calculate deployment stats (mock realistic numbers based on client size)
  const clientSize = selectedClient.memberCount || 1;
  const sizeMultiplier = Math.max(1, Math.floor(clientSize / 25)); // Scale with team size
  
  let dailyDeployments = Math.floor(Math.random() * 5 * sizeMultiplier) + 1;
  let monthlyDeployments = dailyDeployments * 7 + Math.floor(Math.random() * 20);
  let environmentCount = Math.min(4, Math.floor(clientSize / 10) + 1); // More envs for larger teams
  let releasedApps = Math.floor(appCount * 0.85); // 85% success rate
  let brokenCount = Math.floor(appCount * 0.05) + (Math.random() > 0.7 ? 1 : 0); // ~5% broken rate

  // Apply keyword filters
  if (filters.keywords) {
    const keywordLower = filters.keywords.toLowerCase();
    if (keywordLower.includes('prod')) {
      environmentCount = Math.min(environmentCount, 1);
      dailyDeployments = Math.floor(dailyDeployments * 0.7); // Less frequent prod deployments
    }
    if (keywordLower.includes('fail') || keywordLower.includes('error')) {
      brokenCount = Math.max(brokenCount, 3);
      releasedApps = Math.floor(releasedApps * 0.6);
    }
  }

  // Apply environment filter
  if (filters.environment) {
    if (filters.environment === 'Production') {
      dailyDeployments = Math.floor(dailyDeployments * 0.6); // Fewer prod deployments
      brokenCount = Math.max(1, Math.floor(brokenCount * 0.5)); // Fewer broken in prod
    } else if (filters.environment === 'Development') {
      dailyDeployments = Math.floor(dailyDeployments * 1.5); // More dev deployments
      brokenCount = Math.floor(brokenCount * 1.3); // More broken in dev
    }
  }

  // Apply portfolio filter
  if (filters.portfolios.length > 0) {
    const portfolioRatio = filters.portfolios.length / portfolioCount;
    appCount = Math.floor(appCount * portfolioRatio);
    dailyDeployments = Math.floor(dailyDeployments * portfolioRatio);
    monthlyDeployments = Math.floor(monthlyDeployments * portfolioRatio);
  }

  // Calculate change indicators based on client activity
  const portfolioChange = `+${Math.floor(portfolioCount * 0.1)} this month`;
  const zoneChange = `+${Math.floor(zoneCount * 0.15)} this month`;
  const appChange = `+${Math.floor(appCount * 0.2)} this month`;
  const dailyChange = `+${Math.floor(dailyDeployments * 0.5)} today`;
  const monthlyChange = `+${Math.floor(monthlyDeployments * 0.3)} this month`;
  const successRate = Math.floor((releasedApps / appCount) * 100);

  return [
    { 
      label: "Portfolios", 
      value: portfolioCount.toString(), 
      icon: Briefcase, 
      change: portfolioChange, 
      subtext: "Active portfolios" 
    },
    { 
      label: "Total Zones", 
      value: zoneCount.toString(), 
      icon: Server, 
      change: zoneChange, 
      subtext: "Across all environments" 
    },
    { 
      label: "Applications", 
      value: appCount.toString(), 
      icon: FolderOpen, 
      change: appChange, 
      subtext: "Deployed applications" 
    },
    { 
      label: "Daily Deployments", 
      value: dailyDeployments.toString(), 
      icon: Activity, 
      change: dailyChange, 
      subtext: "Last 24 hours" 
    },
    { 
      label: "Monthly Deployments", 
      value: monthlyDeployments.toString(), 
      icon: GitBranch, 
      change: monthlyChange, 
      subtext: "New deployments" 
    },
    { 
      label: "Zone Environments", 
      value: environmentCount.toString(), 
      icon: Database, 
      change: "Prod, Staging, Dev, Test", 
      subtext: "Active environments" 
    },
    { 
      label: "Released Apps", 
      value: releasedApps.toString(), 
      icon: TrendingUp, 
      change: `${successRate}% success rate`, 
      subtext: "Successfully deployed" 
    },
    { 
      label: "Broken Deployments", 
      value: brokenCount.toString(), 
      icon: AlertTriangle, 
      change: brokenCount > 5 ? "Critical" : "Under control", 
      subtext: "Needs attention", 
      isAlert: brokenCount > 0 
    },
  ];
};

// Mock deployment issues with dates - updated to include failed status
const brokenDeployments = [
  { id: "1", app: "Inventory Tracker", type: "failed", date: "2024-01-26", environment: "development" },
  { id: "2", app: "Payment Gateway", type: "teardown-in-progress", date: "2024-01-26", environment: "staging" },
  { id: "3", app: "Analytics API", type: "release-in-progress", date: "2024-01-25", environment: "production" },
];

export default function Dashboard() {
  // Get the selected client from Redux store instead of local state
  const { selectedClient, clients, portfolios, applications, zones } = useReduxData();
  
  // Use a fallback client if none is selected or if selectedClient is not in our mock data
  const currentClient = selectedClient || mockClients[0];
  
  const [filters, setFilters] = useState<FilterState>({
    keywords: "",
    portfolios: [],
    applications: [],
    zones: [],
    dateRange: { from: undefined, to: undefined },
  });
  
  const clientStats = getClientStats(currentClient.id, filters, clients, portfolios || [], applications || [], zones || []);

  const handleFiltersChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    // Here you would typically trigger API calls to fetch filtered data
    console.log('Filters changed:', newFilters);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard - {currentClient.name}</h1>
          <p className="text-muted-foreground">Overview of {currentClient.name}'s infrastructure and deployments</p>
        </div>
        <Button variant="gradient" className="gap-2">
          <Plus className="h-4 w-4" />
          Create New
        </Button>
      </div>

      {/* Dashboard Filters - NOW AT TOP */}
      <DashboardFilters clientId={currentClient.id} onFiltersChange={handleFiltersChange} />

      {/* Stats Grid - NOW FILTERED */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {clientStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card 
              key={stat.label} 
              className={`shadow-soft hover:shadow-medium transition-shadow ${
                stat.isAlert ? 'border-destructive/20 bg-destructive/5' : ''
              }`}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                    <p className={`text-2xl font-bold ${stat.isAlert ? 'text-destructive' : 'text-foreground'}`}>
                      {stat.value}
                    </p>
                    <p className={`text-xs ${stat.isAlert ? 'text-destructive' : 'text-green-600'}`}>
                      {!stat.isAlert && <TrendingUp className="inline h-3 w-3 mr-1" />}
                      {stat.isAlert && <AlertTriangle className="inline h-3 w-3 mr-1" />}
                      {stat.change}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{stat.subtext}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    stat.isAlert ? 'bg-destructive/10' : 'bg-primary/10'
                  }`}>
                    <Icon className={`h-6 w-6 ${stat.isAlert ? 'text-destructive' : 'text-primary'}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Broken Deployments Alert */}
      {brokenDeployments.length > 0 && (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Attention Required: Broken Deployments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {brokenDeployments.map((deployment) => (
                <div key={deployment.id} className="flex items-center justify-between p-3 bg-background border border-destructive/20 rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">{deployment.app}</p>
                    <p className="text-sm text-muted-foreground">
                      {deployment.type} in {deployment.environment} - {deployment.date}
                    </p>
                  </div>
                  <Button variant="destructive" size="sm">Fix Now</Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Section */}
      <DeploymentChart clientId={currentClient.id} filters={filters} />

      {/* Latest Deployments */}
      <LatestDeployments clientId={currentClient.id} filters={filters} />

      {/* Quick Actions */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-20 flex-col gap-2">
              <Briefcase className="h-6 w-6" />
              Create Portfolio
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2">
              <FolderOpen className="h-6 w-6" />
              Add Application
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2">
              <Server className="h-6 w-6" />
              Create Zone
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2">
              <GitBranch className="h-6 w-6" />
              Deploy Application
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}