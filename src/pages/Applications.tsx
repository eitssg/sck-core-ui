import { useState } from "react";
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
    name: "User Management",
    description: "Centralized user administration system",
    status: "active",
    version: "v2.1.3",
    lastDeploy: "2 days ago"
  },
  {
    id: 2,
    portfolio: "Enterprise Suite",
    name: "Analytics Dashboard",
    description: "Real-time business intelligence platform",
    status: "active",
    version: "v1.8.2",
    lastDeploy: "1 week ago"
  },
  {
    id: 3,
    portfolio: "Mobile Apps",
    name: "Customer Portal",
    description: "Mobile customer service application",
    status: "development",
    version: "v0.9.1",
    lastDeploy: "3 days ago"
  },
  {
    id: 4,
    portfolio: "Analytics Platform",
    name: "Data Warehouse",
    description: "Central data storage and processing system",
    status: "maintenance",
    version: "v3.2.1",
    lastDeploy: "5 days ago"
  }
];

export default function Applications() {
  const navigate = useNavigate();
  const { selectedClient } = useReduxData();
  const [applications] = useState(mockApplications);
  const [searchTerms, setSearchTerms] = useState<string[]>([]);
  const [newTerm, setNewTerm] = useState("");

  const filteredApplications = applications.filter(app => {
    if (searchTerms.length === 0) return true;
    
    return searchTerms.every(term =>
      app.name.toLowerCase().includes(term.toLowerCase()) ||
      app.portfolio.toLowerCase().includes(term.toLowerCase()) ||
      app.description.toLowerCase().includes(term.toLowerCase())
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
                      {app.name}
                    </div>
                  </TableCell>
                  <TableCell>{app.portfolio}</TableCell>
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