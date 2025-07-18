import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Square, Eye, Trash2, Search, GitBranch, Tag, MapPin, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Mock data
const mockClients = [
  { id: 1, name: "Acme Corp", slug: "acme-corp" },
  { id: 2, name: "TechStart Inc", slug: "techstart-inc" },
  { id: 3, name: "Global Systems", slug: "global-systems" },
];

const mockDeployments = [
  {
    id: 1,
    prn: "prn:enterprise-suite:user-management:main:build-123",
    clientId: 1,
    portfolio: "Enterprise Suite",
    application: "User Management",
    description: "Centralized user administration system with role-based access control",
    branch: "main",
    build: "build-123",
    environment: "production",
    tag: "v2.1.3",
    region: "us-east-1",
    status: "released",
    lastActivity: "2 hours ago"
  },
  {
    id: 2,
    prn: "prn:enterprise-suite:analytics-dashboard:develop:build-456",
    clientId: 1,
    portfolio: "Enterprise Suite",
    application: "Analytics Dashboard",
    description: "Real-time business intelligence platform with advanced reporting",
    branch: "develop",
    build: "build-456",
    environment: "staging",
    tag: "v1.8.3-rc1",
    region: "us-west-2",
    status: "not-released",
    lastActivity: "1 day ago"
  },
  {
    id: 3,
    prn: "prn:mobile-apps:customer-portal:feature/auth:build-789",
    clientId: 2,
    portfolio: "Mobile Apps",
    application: "Customer Portal",
    description: "Mobile customer service application with enhanced authentication",
    branch: "feature/auth",
    build: "build-789",
    environment: "development",
    tag: "v0.9.2-alpha",
    region: "eu-west-1",
    status: "released",
    lastActivity: "3 hours ago"
  },
  {
    id: 4,
    prn: "prn:analytics-platform:data-warehouse:hotfix/security:build-101",
    clientId: 1,
    portfolio: "Analytics Platform",
    application: "Data Warehouse",
    description: "Central data storage and processing system with security enhancements",
    branch: "hotfix/security",
    build: "build-101",
    environment: "production",
    tag: "v3.2.2",
    region: "us-east-1",
    status: "released",
    lastActivity: "30 minutes ago"
  }
];

export default function Deployments() {
  const navigate = useNavigate();
  const [selectedClient, setSelectedClient] = useState(mockClients[0]);
  const [searchTerm, setSearchTerm] = useState("");
  const [portfolioFilter, setPortfolioFilter] = useState("all");
  const [applicationFilter, setApplicationFilter] = useState("all");

  // Filter deployments by selected client
  const clientDeployments = mockDeployments.filter(
    deployment => deployment.clientId === selectedClient.id
  );

  // Get unique portfolios and applications for filters
  const portfolios = ["all", ...new Set(clientDeployments.map(d => d.portfolio))];
  const applications = ["all", ...new Set(clientDeployments.map(d => d.application))];

  // Apply filters
  const filteredDeployments = clientDeployments.filter(deployment => {
    const matchesSearch = 
      deployment.prn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deployment.application.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deployment.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deployment.environment.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPortfolio = portfolioFilter === "all" || deployment.portfolio === portfolioFilter;
    const matchesApplication = applicationFilter === "all" || deployment.application === applicationFilter;
    
    return matchesSearch && matchesPortfolio && matchesApplication;
  });

  const getStatusIcon = (status: string) => {
    return status === "released" ? 
      <Play className="h-4 w-4 text-green-600" /> : 
      <Square className="h-4 w-4 text-gray-400" />;
  };

  const getStatusColor = (status: string) => {
    return status === "released" ? 
      "bg-green-100 text-green-800" : 
      "bg-gray-100 text-gray-800";
  };

  const getEnvironmentColor = (environment: string) => {
    switch (environment) {
      case "production":
        return "bg-red-100 text-red-800";
      case "staging":
        return "bg-yellow-100 text-yellow-800";
      case "development":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Deployments</h1>
          <p className="text-muted-foreground">Manage application deployments for {selectedClient.name}</p>
        </div>
        
        {/* Client Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2 bg-background z-50">
              {selectedClient.name}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-background border shadow-lg z-50">
            {mockClients.map((client) => (
              <DropdownMenuItem
                key={client.id}
                onClick={() => setSelectedClient(client)}
                className={selectedClient.id === client.id ? "bg-accent" : ""}
              >
                {client.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Search and Filters */}
      <Card className="shadow-soft">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search deployments, applications, or PRNs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={portfolioFilter} onValueChange={setPortfolioFilter}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Filter by Portfolio" />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-lg z-50">
                {portfolios.map((portfolio) => (
                  <SelectItem key={portfolio} value={portfolio}>
                    {portfolio === "all" ? "All Portfolios" : portfolio}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={applicationFilter} onValueChange={setApplicationFilter}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Filter by Application" />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-lg z-50">
                {applications.map((application) => (
                  <SelectItem key={application} value={application}>
                    {application === "all" ? "All Applications" : application}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Deployments Table */}
      <Card className="shadow-medium">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-primary" />
            Deployments ({filteredDeployments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Application</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>PRN</TableHead>
                <TableHead>Environment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDeployments.map((deployment) => (
                <TableRow 
                  key={deployment.id} 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => navigate(`/deployments/${deployment.id}`)}
                >
                  <TableCell>
                    <div>
                      <p className="font-medium">{deployment.application}</p>
                      <p className="text-sm text-muted-foreground">{deployment.portfolio}</p>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <p className="truncate">{deployment.description}</p>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded block">
                      {deployment.prn}
                    </code>
                  </TableCell>
                  <TableCell>
                    <Badge className={getEnvironmentColor(deployment.environment)} variant="secondary">
                      {deployment.environment}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(deployment.status)}
                      <Badge className={getStatusColor(deployment.status)} variant="secondary">
                        {deployment.status === "released" ? "Released" : "Not Released"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>{deployment.lastActivity}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/deployments/${deployment.id}`);
                        }}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      {deployment.status === "not-released" ? (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-green-600 hover:text-green-700"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Play className="h-3 w-3" />
                        </Button>
                      ) : (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-yellow-600 hover:text-yellow-700"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Square className="h-3 w-3" />
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-destructive hover:text-destructive"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}