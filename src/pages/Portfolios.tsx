import { useState, useEffect, useMemo } from "react";
import { Plus, Search, ExternalLink, Filter, Edit, Trash2, Folder, Building2, ArrowLeft } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { useReduxData } from "@/hooks/useReduxData";

// Mock data
const mockClients = [
  { id: 1, name: "Acme Corporation" },
  { id: 2, name: "TechStart Inc" },
  { id: 3, name: "Global Solutions" }
];

const mockPortfolios = [
  {
    id: 1,
    name: "Enterprise Suite",
    code: "ENT",
    description: "Comprehensive enterprise applications for business management",
    homePageUrl: "https://enterprise.company.com",
    applicationCount: 12,
    lastUpdated: "2024-01-15",
    status: "active",
    clientId: 1,
    clientName: "Acme Corporation"
  },
  {
    id: 2,
    name: "Mobile Apps",
    code: "MOB",
    description: "Cross-platform mobile applications for customer engagement",
    homePageUrl: "https://mobile.company.com",
    applicationCount: 8,
    lastUpdated: "2024-01-10",
    status: "active",
    clientId: 1,
    clientName: "Acme Corporation"
  },
  {
    id: 3,
    name: "Analytics Platform",
    code: "ANL",
    description: "Business intelligence and data analytics solutions",
    homePageUrl: "https://analytics.company.com",
    applicationCount: 5,
    lastUpdated: "2024-01-08",
    status: "development",
    clientId: 2,
    clientName: "TechStart Inc"
  },
  {
    id: 4,
    name: "E-commerce Platform",
    code: "ECO",
    description: "Complete online retail and inventory management system",
    homePageUrl: "https://ecommerce.company.com",
    applicationCount: 15,
    lastUpdated: "2024-01-12",
    status: "active",
    clientId: 2,
    clientName: "TechStart Inc"
  },
  {
    id: 5,
    name: "Data Warehouse",
    code: "DWH",
    description: "Enterprise data storage and analytics infrastructure",
    homePageUrl: "https://datawarehouse.company.com",
    applicationCount: 7,
    lastUpdated: "2024-01-05",
    status: "maintenance",
    clientId: 3,
    clientName: "Global Solutions"
  }
];

export default function Portfolios() {
  const navigate = useNavigate();
  const { portfolios, clients, selectedClient, initializePortfolios, initializeClients } = useReduxData();
  const [searchTerm, setSearchTerm] = useState("");

  // Initialize data
  useEffect(() => {
    if (clients.length === 0) {
      initializeClients([
        {
          id: '1',
          name: 'Acme Corp',
          description: 'Main client',
          homepage: 'https://acme.com',
          contactName: 'John Doe',
          contactEmail: 'john@acme.com',
          primaryAwsRegion: 'us-east-1',
          memberCount: 50,
          portfolioCount: 3,
        }
      ]);
    }

    if (portfolios.length === 0) {
      initializePortfolios([
        {
          id: '1',
          clientId: '1',
          name: 'Enterprise Suite',
          slug: 'enterprise-suite',
          code: 'ENT',
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
          code: 'MOB',
          description: 'Cross-platform mobile applications for customer engagement',
          homePageUrl: 'https://mobile.company.com',
          applicationCount: 8,
          lastUpdated: '2024-01-10',
          status: 'active',
        }
      ]);
    }
  }, [clients.length, portfolios.length, initializeClients, initializePortfolios]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "development":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "maintenance":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  // Filter portfolios by selected client
  const filteredPortfolios = useMemo(() => {
    let filtered = selectedClient ? portfolios.filter(portfolio => portfolio.clientId === selectedClient.id) : portfolios;
    
    if (searchTerm) {
      filtered = filtered.filter(portfolio =>
        portfolio.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        portfolio.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        portfolio.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  }, [portfolios, selectedClient, searchTerm]);

  const handleViewPortfolio = (portfolioId: string) => {
    navigate(`/portfolio/${portfolioId}`);
  };

  const handleEditPortfolio = (portfolioId: string) => {
    navigate(`/portfolio/${portfolioId}?edit=true`);
  };

  const handleDeletePortfolio = (portfolioId: string) => {
    // TODO: Add confirmation dialog and delete logic
    console.log(`Delete portfolio ${portfolioId}`);
  };

  const handleViewApplications = (portfolioId: string, portfolioCode: string) => {
    navigate(`/applications?portfolio=${portfolioCode}`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Selected Client Header - Prominent Display */}
      {selectedClient && (
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
                  <Link to={`/clients/${selectedClient.id}`}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    View Client Details
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {selectedClient ? `Portfolios Management` : 'All Portfolios'}
          </h1>
          <p className="text-muted-foreground">
            {selectedClient 
              ? `Manage application portfolios for ${selectedClient.name}`
              : 'Manage your application portfolios across all clients'
            }
          </p>
        </div>
        <Button variant="gradient" className="gap-2" disabled={!selectedClient}>
          <Plus className="h-4 w-4" />
          Create Portfolio
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex-1 max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search portfolios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          {filteredPortfolios.length} portfolio{filteredPortfolios.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Portfolio Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Portfolio</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Applications</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPortfolios.map((portfolio) => (
              <TableRow 
                key={portfolio.id} 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleViewPortfolio(portfolio.id)}
              >
                <TableCell>
                  <div>
                    <div className="font-medium">{portfolio.name}</div>
                    <div className="text-sm text-muted-foreground">Code: {portfolio.code}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm max-w-md truncate" title={portfolio.description}>
                    {portfolio.description}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm font-medium">{portfolio.applicationCount}</div>
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(portfolio.status)} variant="secondary">
                    {portfolio.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm">{portfolio.lastUpdated}</div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewPortfolio(portfolio.id);
                      }}
                      title="View Portfolio Details"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewApplications(portfolio.id, portfolio.code);
                      }}
                      title="View Applications"
                    >
                      <Folder className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditPortfolio(portfolio.id);
                      }}
                      title="Edit Portfolio"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePortfolio(portfolio.id);
                      }}
                      title="Delete Portfolio"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {filteredPortfolios.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {selectedClient 
              ? `No portfolios found for ${selectedClient.name}`
              : 'No portfolios found'
            }
          </p>
        </div>
      )}
    </div>
  );
}