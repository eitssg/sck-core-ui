import { useState } from "react";
import { Plus, Briefcase, FolderOpen, Users, TrendingUp, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Mock data - will be replaced with real data later
const mockPortfolio = {
  id: 1,
  name: "Enterprise Suite",
  code: "ENT",
  description: "Comprehensive enterprise applications for business management",
  homePageUrl: "https://enterprise.company.com",
  applicationCount: 12,
  lastUpdated: "2024-01-15"
};

const mockApplications = [
  { id: 1, name: "User Management", description: "Centralized user administration system" },
  { id: 2, name: "Analytics Dashboard", description: "Real-time business intelligence platform" },
  { id: 3, name: "Inventory Tracker", description: "Advanced inventory management solution" },
  { id: 4, name: "CRM Portal", description: "Customer relationship management system" },
];

const mockStats = [
  { label: "Total Portfolios", value: "3", icon: Briefcase, change: "+2" },
  { label: "Active Applications", value: "24", icon: FolderOpen, change: "+5" },
  { label: "Team Members", value: "18", icon: Users, change: "+3" },
  { label: "Deployments", value: "156", icon: Activity, change: "+12" },
];

export default function Dashboard() {
  const [selectedApp, setSelectedApp] = useState(mockApplications[0]);

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
              <h3 className="text-xl font-semibold text-foreground">{mockPortfolio.name}</h3>
              <p className="text-sm text-muted-foreground">Code: {mockPortfolio.code}</p>
              <p className="text-sm text-foreground">{mockPortfolio.description}</p>
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Applications</p>
                <p className="text-lg font-semibold text-foreground">{mockPortfolio.applicationCount}</p>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-sm text-muted-foreground">Last Updated</p>
                <p className="text-sm text-foreground">{mockPortfolio.lastUpdated}</p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm">View Details</Button>
              <Button variant="admin" size="sm">Edit Portfolio</Button>
            </div>
          </CardContent>
        </Card>

        {/* Application Details */}
        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-primary" />
                Application Details
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    {selectedApp.name}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {mockApplications.map((app) => (
                    <DropdownMenuItem
                      key={app.id}
                      onClick={() => setSelectedApp(app)}
                      className={selectedApp.id === app.id ? "bg-accent" : ""}
                    >
                      <FolderOpen className="mr-2 h-4 w-4" />
                      {app.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-foreground">{selectedApp.name}</h3>
              <p className="text-sm text-foreground">{selectedApp.description}</p>
            </div>
            
            <div className="space-y-3 pt-4 border-t border-border">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Status</span>
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Active</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Last Deploy</span>
                <span className="text-sm text-foreground">2 days ago</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Version</span>
                <span className="text-sm text-foreground">v2.1.3</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm">View Details</Button>
              <Button variant="admin" size="sm">Manage App</Button>
            </div>
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