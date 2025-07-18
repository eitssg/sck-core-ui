import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, FolderOpen, Edit, Trash2, ExternalLink, Search } from "lucide-react";
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
  const [applications] = useState(mockApplications);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredApplications = applications.filter(app =>
    app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.portfolio.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Applications</h1>
          <p className="text-muted-foreground">Manage applications across all portfolios</p>
        </div>
        <Button variant="gradient" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Application
        </Button>
      </div>

      {/* Search and Filters */}
      <Card className="shadow-soft">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search applications, portfolios, or descriptions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
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