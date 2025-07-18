import { useState } from "react";
import { Plus, Search, ExternalLink, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
  const [portfolios] = useState(mockPortfolios);
  const [selectedClient, setSelectedClient] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

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

  const filteredPortfolios = portfolios.filter((portfolio) => {
    const matchesClient = selectedClient === "all" || portfolio.clientId.toString() === selectedClient;
    const matchesSearch = !searchTerm || 
      portfolio.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      portfolio.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      portfolio.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesClient && matchesSearch;
  });

  const handleViewPortfolio = (portfolioId: number) => {
    navigate(`/portfolio/${portfolioId}`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Portfolios</h1>
          <p className="text-muted-foreground">Manage your application portfolios</p>
        </div>
        <Button variant="gradient" className="gap-2">
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
        <Select value={selectedClient} onValueChange={setSelectedClient}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select client" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All clients</SelectItem>
            {mockClients.map((client) => (
              <SelectItem key={client.id} value={client.id.toString()}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
              <TableHead>Client</TableHead>
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
                  <div className="text-sm">{portfolio.clientName}</div>
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
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewPortfolio(portfolio.id);
                    }}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {filteredPortfolios.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No portfolios found matching your criteria.</p>
        </div>
      )}
    </div>
  );
}