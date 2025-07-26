import { useState } from "react";
import { Plus, Briefcase, FolderOpen, Server, TrendingUp, Activity, Database, AlertTriangle, Building2, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DeploymentChart from "@/components/DeploymentChart";
import LatestDeployments from "@/components/LatestDeployments";
import DashboardFilters, { FilterState } from "@/components/DashboardFilters";

// Mock data - will be replaced with real data later
const mockClients = [
  { id: "1", name: "TechCorp Solutions", slug: "techcorp-solutions", description: "Leading technology solutions provider", memberCount: 45, portfolioCount: 12 },
  { id: "2", name: "Digital Innovations Inc", slug: "digital-innovations", description: "Cutting-edge digital transformation consultancy", memberCount: 23, portfolioCount: 8 }
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

// Client-specific stats that update based on selected client
const getClientStats = (clientId: string) => [
  { label: "Portfolios", value: "12", icon: Briefcase, change: "+2 this month", subtext: "Active portfolios" },
  { label: "Total Zones", value: "179", icon: Server, change: "+8 this month", subtext: "Across all environments" },
  { label: "Applications", value: "67", icon: FolderOpen, change: "+5 this month", subtext: "Deployed applications" },
  { label: "Daily Deployments", value: "18", icon: Activity, change: "+12 today", subtext: "Last 24 hours" },
  { label: "Monthly Deployments", value: "165", icon: GitBranch, change: "+23 this month", subtext: "New deployments" },
  { label: "Zone Environments", value: "4", icon: Database, change: "Prod, Staging, Dev, Test", subtext: "Active environments" },
  { label: "Released Apps", value: "145", icon: TrendingUp, change: "87% success rate", subtext: "Successfully deployed" },
  { label: "Broken Deployments", value: "8", icon: AlertTriangle, change: "3 teardown, 5 release", subtext: "Needs attention", isAlert: true },
];

// Mock deployment issues with dates - updated to include failed status
const brokenDeployments = [
  { id: "1", app: "Inventory Tracker", type: "failed", date: "2024-01-26", environment: "development" },
  { id: "2", app: "Payment Gateway", type: "teardown-in-progress", date: "2024-01-26", environment: "staging" },
  { id: "3", app: "Analytics API", type: "release-in-progress", date: "2024-01-25", environment: "production" },
];

export default function Dashboard() {
  const [selectedClient, setSelectedClient] = useState(mockClients[0]);
  const [filters, setFilters] = useState<FilterState>({
    keywords: "",
    portfolios: [],
    applications: [],
    zones: [],
    dateRange: { from: undefined, to: undefined },
  });
  
  const clientStats = getClientStats(selectedClient.id);

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
          <h1 className="text-3xl font-bold text-foreground">Dashboard - {selectedClient.name}</h1>
          <p className="text-muted-foreground">Overview of {selectedClient.name}'s infrastructure and deployments</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedClient.id} onValueChange={(value) => {
            const client = mockClients.find(c => c.id === value);
            if (client) setSelectedClient(client);
          }}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {mockClients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="gradient" className="gap-2">
            <Plus className="h-4 w-4" />
            Create New
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
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

      {/* Dashboard Filters */}
      <DashboardFilters clientId={selectedClient.id} onFiltersChange={handleFiltersChange} />

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
      <DeploymentChart clientId={selectedClient.id} filters={filters} />

      {/* Latest Deployments */}
      <LatestDeployments clientId={selectedClient.id} filters={filters} />

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