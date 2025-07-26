import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus, Briefcase, Search, Users, MapPin, X, Building2 } from "lucide-react";
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

export default function Portfolios() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { selectedClient, portfolios, applications } = useReduxData();
  const [searchTerms, setSearchTerms] = useState<string[]>([]);
  const [newTerm, setNewTerm] = useState("");

  // Initialize search terms from URL parameters
  useEffect(() => {
    const clientFilter = searchParams.get('client');
    if (clientFilter) {
      setSearchTerms([clientFilter]);
    }
  }, [searchParams]);

  // Filter portfolios based on selected client
  const clientPortfolios = portfolios.filter(portfolio => {
    if (!selectedClient) return true;
    return portfolio.clientId === selectedClient.id;
  });

  // Apply search terms
  const filteredPortfolios = clientPortfolios.filter(portfolio => {
    if (searchTerms.length === 0) return true;
    
    return searchTerms.every(term =>
      portfolio.name.toLowerCase().includes(term.toLowerCase()) ||
      portfolio.description.toLowerCase().includes(term.toLowerCase()) ||
      portfolio.code.toLowerCase().includes(term.toLowerCase())
    );
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "development":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "maintenance":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "archived":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
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
                Please select a client from the header to view portfolios.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Portfolios</h1>
          <p className="text-muted-foreground">
            Manage portfolios for {selectedClient.name}
          </p>
        </div>
        <Button variant="gradient" className="gap-2">
          <Plus className="h-4 w-4" />
          Create Portfolio
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

      {/* Portfolios Table */}
      <Card className="shadow-medium">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            Portfolio List ({filteredPortfolios.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Portfolio</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Applications</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPortfolios.map((portfolio) => (
                <TableRow 
                  key={portfolio.id} 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => navigate(`/portfolios/${portfolio.id}`)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-primary/10 rounded-md flex items-center justify-center">
                        <Briefcase className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{portfolio.name}</div>
                        <div className="text-xs text-muted-foreground">{portfolio.code}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{portfolio.description}</TableCell>
                  <TableCell>
                    {applications.filter(app => app.portfolioId === portfolio.id).length} apps
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(portfolio.status)} variant="secondary">
                      {portfolio.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{portfolio.lastUpdated}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      View Details
                    </Button>
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