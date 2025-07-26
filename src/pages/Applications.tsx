import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, FolderOpen, Edit, Trash2, ExternalLink, X, Building2, Users, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useReduxData } from '@/hooks/useReduxData';

// Mock data
const mockApplications = [
  {
    id: 1,
    portfolio: "Enterprise Suite",
    portfolioCode: "ENT-001",
    name: "User Management",
    applicationCode: "ENT-USR-001",
    description: "Centralized user administration system",
    status: "active",
    version: "v2.1.3",
    lastDeploy: "2 days ago"
  },
  {
    id: 2,
    portfolio: "Enterprise Suite",
    portfolioCode: "ENT-001",
    name: "Analytics Dashboard",
    applicationCode: "ENT-ANL-002",
    description: "Real-time business intelligence platform",
    status: "active",
    version: "v1.8.2",
    lastDeploy: "1 week ago"
  },
  {
    id: 3,
    portfolio: "Mobile Apps",
    portfolioCode: "MOB-002",
    name: "Customer Portal",
    applicationCode: "MOB-CUS-003",
    description: "Mobile customer service application",
    status: "development",
    version: "v0.9.1",
    lastDeploy: "3 days ago"
  },
  {
    id: 4,
    portfolio: "Analytics Platform",
    portfolioCode: "ANL-003",
    name: "Data Warehouse",
    applicationCode: "ANL-DWH-004",
    description: "Central data storage and processing system",
    status: "maintenance",
    version: "v3.2.1",
    lastDeploy: "5 days ago"
  }
];

export default function Applications() {
  const navigate = useNavigate();
  const { selectedClient, applications, portfolios, initializeApplications, initializePortfolios } = useReduxData();
  const [searchTerms, setSearchTerms] = useState<string[]>([]);
  const [newTerm, setNewTerm] = useState("");

  // Initialize data
  useEffect(() => {
    if (portfolios.length === 0) {
      initializePortfolios([
        {
          id: '1',
          clientId: '1',
          name: 'Enterprise Suite',
          slug: 'enterprise-suite',
          code: 'ENT-SYS-001',
          description: 'Comprehensive enterprise applications for business management',
          homePageUrl: 'https://enterprise.company.com',
          applicationCount: 12,
          lastUpdated: '2024-01-15',
          status: 'active',
        },
        {
          id: '2',
          clientId: '1',
          name: 'Mobile Apps',
          slug: 'mobile-apps',
          code: 'MOB-APP-002',
          description: 'Cross-platform mobile applications for customer engagement',
          homePageUrl: 'https://mobile.company.com',
          applicationCount: 8,
          lastUpdated: '2024-01-10',
          status: 'active',
        },
        {
          id: '3',
          clientId: '1',
          name: 'Analytics Platform',
          slug: 'analytics-platform',
          code: 'ANL-PLT-003',
          description: 'Data analytics and business intelligence solutions',
          homePageUrl: 'https://analytics.company.com',
          applicationCount: 6,
          lastUpdated: '2024-01-12',
          status: 'active',
        }
      ]);
    }

    if (applications.length === 0) {
      initializeApplications([
        {
          id: '1',
          name: 'User Management',
          slug: 'user-management',
          code: 'ENT-USR-001',
          description: 'Centralized user administration system',
          portfolioId: '1',
          status: 'running',
          version: 'v2.1.3',
          lastDeploy: '2 days ago'
        },
        {
          id: '2',
          name: 'Analytics Dashboard',
          slug: 'analytics-dashboard',
          code: 'ENT-ANL-002',
          description: 'Real-time business intelligence platform',
          portfolioId: '1',
          status: 'running',
          version: 'v1.8.2',
          lastDeploy: '1 week ago'
        },
        {
          id: '3',
          name: 'Customer Portal',
          slug: 'customer-portal',
          code: 'MOB-CUS-003',
          description: 'Mobile customer service application',
          portfolioId: '2',
          status: 'deploying',
          version: 'v0.9.1',
          lastDeploy: '3 days ago'
        },
        {
          id: '4',
          name: 'Data Warehouse',
          slug: 'data-warehouse',
          code: 'ANL-DWH-004',
          description: 'Central data storage and processing system',
          portfolioId: '3',
          status: 'stopped',
          version: 'v3.2.1',
          lastDeploy: '5 days ago'
        },
        {
          id: '5',
          name: 'Payment Gateway',
          slug: 'payment-gateway',
          code: 'ENT-PAY-005',
          description: 'Secure payment processing service',
          portfolioId: '1',
          status: 'running',
          version: 'v1.5.7',
          lastDeploy: '1 day ago'
        }
      ]);
    }
  }, [applications.length, portfolios.length, initializeApplications, initializePortfolios]);

  const filteredApplications = applications.filter(app => {
    // Get the portfolio for this application
    const portfolio = portfolios.find(p => p.id === app.portfolioId);
    
    if (searchTerms.length === 0) return true;
    
    return searchTerms.every(term =>
      app.name.toLowerCase().includes(term.toLowerCase()) ||
      (portfolio?.name.toLowerCase().includes(term.toLowerCase())) ||
      app.description.toLowerCase().includes(term.toLowerCase()) ||
      app.code.toLowerCase().includes(term.toLowerCase())
    );
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "development":
        return "bg-blue-100 text-blue-800";
      case "maintenance":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const addSearchTerm = () => {
    if (newTerm.trim() && !searchTerms.includes(newTerm.trim())) {
      setSearchTerms([...searchTerms, newTerm.trim()]);
      setNewTerm("");
    }
  };

  const removeSearchTerm = (termToRemove: string) => {
    setSearchTerms(searchTerms.filter(term => term !== termToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addSearchTerm();
    }
  };

  if (!selectedClient) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-medium text-foreground">No Client Selected</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Please select a client from the header to view applications.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Selected Client Header - Prominent Display */}
      <Card className="border-l-4 border-l-primary bg-primary/5">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">ACTIVE CLIENT</span>
                  <Badge variant="secondary" className="bg-primary/10 text-primary">Tenant</Badge>
                </div>
                <h2 className="text-2xl font-bold text-foreground">{selectedClient.name}</h2>
                <p className="text-sm text-muted-foreground">{selectedClient.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <a href={selectedClient.homepage} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Website
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Applications</h1>
          <p className="text-muted-foreground">Manage applications for {selectedClient.name}</p>
        </div>
        <Button variant="gradient" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Application
        </Button>
      </div>

      {/* Search Terms Filter */}
      <Card className="shadow-soft">
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Add search term..."
                value={newTerm}
                onChange={(e) => setNewTerm(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1"
              />
              <Button onClick={addSearchTerm} disabled={!newTerm.trim()}>
                Add
              </Button>
            </div>
            {searchTerms.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {searchTerms.map((term) => (
                  <Badge key={term} variant="secondary" className="flex items-center gap-1 px-3 py-1">
                    {term}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => removeSearchTerm(term)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchTerms([])}
                  className="text-muted-foreground"
                >
                  Clear all
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Applications Table */}
      <Card className="shadow-medium">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-primary" />
            Application List ({filteredApplications.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Application</TableHead>
                <TableHead>Portfolio</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Last Deploy</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredApplications.map((app) => (
                <TableRow 
                  key={app.id} 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => navigate(`/applications/${app.id}`)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-primary/10 rounded-md flex items-center justify-center">
                        <FolderOpen className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{app.name}</div>
                        <div className="text-xs text-muted-foreground">{app.code}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {portfolios.find(p => p.id === app.portfolioId)?.name || 'Unknown Portfolio'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {portfolios.find(p => p.id === app.portfolioId)?.code || 'N/A'}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{app.description}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(app.status)} variant="secondary">
                      {app.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{app.version}</TableCell>
                  <TableCell>{app.lastDeploy}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
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