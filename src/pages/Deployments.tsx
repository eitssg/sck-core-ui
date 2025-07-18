import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Square, Eye, Trash2, Search, GitBranch, Tag, MapPin } from "lucide-react";
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
const mockDeployments = [
  {
    id: 1,
    prn: "prn:enterprise-suite:user-management:main:build-123",
    portfolio: "Enterprise Suite",
    application: "User Management",
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
    portfolio: "Enterprise Suite",
    application: "Analytics Dashboard",
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
    portfolio: "Mobile Apps",
    application: "Customer Portal",
    branch: "feature/auth",
    build: "build-789",
    environment: "development",
    tag: "v0.9.2-alpha",
    region: "eu-west-1",
    status: "released",
    lastActivity: "3 hours ago"
  }
];

export default function Deployments() {
  const navigate = useNavigate();
  const [deployments] = useState(mockDeployments);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredDeployments = deployments.filter(deployment =>
    deployment.prn.toLowerCase().includes(searchTerm.toLowerCase()) ||
    deployment.application.toLowerCase().includes(searchTerm.toLowerCase()) ||
    deployment.environment.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <p className="text-muted-foreground">Manage application deployments across all environments</p>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="shadow-soft">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search deployments, applications, or environments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
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
                <TableHead>PRN</TableHead>
                <TableHead>Application</TableHead>
                <TableHead>Environment</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Tag</TableHead>
                <TableHead>Region</TableHead>
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
                  <TableCell className="font-mono text-xs max-w-xs truncate">
                    {deployment.prn}
                  </TableCell>
                  <TableCell className="font-medium">{deployment.application}</TableCell>
                  <TableCell>
                    <Badge className={getEnvironmentColor(deployment.environment)} variant="secondary">
                      {deployment.environment}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <GitBranch className="h-3 w-3 text-muted-foreground" />
                      <code className="text-xs">{deployment.branch}</code>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Tag className="h-3 w-3 text-muted-foreground" />
                      <code className="text-xs">{deployment.tag}</code>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs">{deployment.region}</span>
                    </div>
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
                      <Button variant="ghost" size="sm">
                        <Eye className="h-3 w-3" />
                      </Button>
                      {deployment.status === "not-released" ? (
                        <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700">
                          <Play className="h-3 w-3" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" className="text-yellow-600 hover:text-yellow-700">
                          <Square className="h-3 w-3" />
                        </Button>
                      )}
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