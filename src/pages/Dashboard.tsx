import { useState } from "react";
import { Plus, Briefcase, FolderOpen, Users, TrendingUp, Activity, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Mock data - will be replaced with real data later
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

const mockStats = [
  { label: "Total Portfolios", value: "3", icon: Briefcase, change: "+2" },
  { label: "Active Applications", value: "24", icon: FolderOpen, change: "+5" },
  { label: "Team Members", value: "18", icon: Users, change: "+3" },
  { label: "Deployments", value: "156", icon: Activity, change: "+12" },
];

export default function Dashboard() {
  const [selectedPortfolio, setSelectedPortfolio] = useState(mockPortfolios[0]);
  const [selectedApp, setSelectedApp] = useState(mockApplications[0]);
  const [appFilter, setAppFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Filter applications based on selected portfolio and search
  const filteredApplications = mockApplications.filter(app => {
    const matchesPortfolio = app.portfolio === selectedPortfolio.name;
    const matchesFilter = appFilter === "all" || app.status === appFilter;
    const matchesSearch = app.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         app.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesPortfolio && matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's what's happening.</p>
        </div>
        <Button variant="gradient" className="gap-2">
          <Plus className="h-4 w-4" />
          Create New
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {mockStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="shadow-soft hover:shadow-medium transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-xs text-green-600">
                      <TrendingUp className="inline h-3 w-3 mr-1" />
                      {stat.change} this month
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Portfolio Selection */}
      <Card className="shadow-soft mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            Portfolio Selection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedPortfolio.name} onValueChange={(value) => {
            const portfolio = mockPortfolios.find(p => p.name === value);
            if (portfolio) setSelectedPortfolio(portfolio);
          }}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {mockPortfolios.map((portfolio) => (
                <SelectItem key={portfolio.id} value={portfolio.name}>
                  {portfolio.name} ({portfolio.code}) - {portfolio.applicationCount} apps
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Portfolio Details */}
        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              Current Portfolio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-foreground">{selectedPortfolio.name}</h3>
              <p className="text-sm text-muted-foreground">Code: {selectedPortfolio.code}</p>
              <p className="text-sm text-foreground">{selectedPortfolio.description}</p>
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Applications</p>
                <p className="text-lg font-semibold text-foreground">{selectedPortfolio.applicationCount}</p>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-sm text-muted-foreground">Status</p>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  selectedPortfolio.status === 'active' ? 'bg-green-100 text-green-800' : 
                  selectedPortfolio.status === 'development' ? 'bg-blue-100 text-blue-800' : 
                  'bg-orange-100 text-orange-800'
                }`}>
                  {selectedPortfolio.status}
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm">View Details</Button>
              <Button variant="admin" size="sm">Edit Portfolio</Button>
            </div>
          </CardContent>
        </Card>

        {/* Application Management */}
        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-primary" />
              Application Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search and Filter */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search applications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Select value={appFilter} onValueChange={setAppFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="development">Development</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Application List */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredApplications.map((app) => (
                <div 
                  key={app.id} 
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedApp.id === app.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedApp(app)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-foreground">{app.name}</h4>
                      <p className="text-xs text-muted-foreground truncate">{app.description}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      app.status === 'active' ? 'bg-green-100 text-green-800' :
                      app.status === 'development' ? 'bg-blue-100 text-blue-800' :
                      'bg-orange-100 text-orange-800'
                    }`}>
                      {app.status}
                    </span>
                  </div>
                </div>
              ))}
              {filteredApplications.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No applications found matching your criteria
                </div>
              )}
            </div>

            {/* Selected App Details */}
            {selectedApp && (
              <div className="pt-4 border-t border-border">
                <h4 className="font-semibold text-foreground mb-2">Selected: {selectedApp.name}</h4>
                <p className="text-sm text-foreground mb-3">{selectedApp.description}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">View Details</Button>
                  <Button variant="admin" size="sm">Manage App</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-20 flex-col gap-2">
              <Briefcase className="h-6 w-6" />
              Create Portfolio
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2">
              <FolderOpen className="h-6 w-6" />
              Add Application
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2">
              <Users className="h-6 w-6" />
              Manage Users
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}