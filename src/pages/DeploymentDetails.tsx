import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Play, Square, Trash2, GitBranch, Tag, MapPin, Server, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Mock data
const mockDeployment = {
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
  lastActivity: "2 hours ago",
  createdAt: "2024-01-15 10:30:00",
  releaseDate: "2024-01-15 14:20:00",
  description: "Centralized user administration system with role-based access control",
  resources: "3 EC2 instances, 1 RDS database, 2 Load Balancers",
  tags: ["production", "critical", "user-management"]
};

export default function DeploymentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [deployment] = useState(mockDeployment);
  const [isLoading, setIsLoading] = useState(false);

  const handleRelease = () => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      // Would update deployment status
    }, 2000);
  };

  const handleTeardown = () => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      navigate("/deployments");
    }, 2000);
  };

  const getStatusIcon = (status: string) => {
    return status === "released" ? 
      <Play className="h-5 w-5 text-green-600" /> : 
      <Square className="h-5 w-5 text-gray-400" />;
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/deployments")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Deployments
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{deployment.application}</h1>
            <p className="text-muted-foreground font-mono text-sm">{deployment.prn}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {deployment.status === "not-released" ? (
            <Button 
              variant="default" 
              className="gap-2"
              onClick={handleRelease}
              disabled={isLoading}
            >
              <Play className="h-4 w-4" />
              Release
            </Button>
          ) : (
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={handleRelease}
              disabled={isLoading}
            >
              <Square className="h-4 w-4" />
              Stop Release
            </Button>
          )}
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="gap-2">
                <Trash2 className="h-4 w-4" />
                Teardown
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Confirm Teardown
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to teardown this deployment? This action cannot be undone and will permanently remove all resources associated with this deployment.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleTeardown} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Teardown Deployment
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Status Overview */}
      <Card className="shadow-soft">
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex items-center gap-3">
              {getStatusIcon(deployment.status)}
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge className={getStatusColor(deployment.status)} variant="secondary">
                  {deployment.status === "released" ? "Released" : "Not Released"}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Server className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Environment</p>
                <Badge className={getEnvironmentColor(deployment.environment)} variant="secondary">
                  {deployment.environment}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Region</p>
                <p className="font-medium">{deployment.region}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Last Activity</p>
                <p className="font-medium">{deployment.lastActivity}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deployment Information */}
        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle>Deployment Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Portfolio</label>
              <p className="text-foreground">{deployment.portfolio}</p>
            </div>
            <Separator />
            <div>
              <label className="text-sm font-medium text-muted-foreground">Application</label>
              <p className="text-foreground">{deployment.application}</p>
            </div>
            <Separator />
            <div>
              <label className="text-sm font-medium text-muted-foreground">Branch</label>
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-muted-foreground" />
                <code className="text-sm bg-muted px-2 py-1 rounded">{deployment.branch}</code>
              </div>
            </div>
            <Separator />
            <div>
              <label className="text-sm font-medium text-muted-foreground">Tag/Version</label>
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <code className="text-sm bg-muted px-2 py-1 rounded">{deployment.tag}</code>
              </div>
            </div>
            <Separator />
            <div>
              <label className="text-sm font-medium text-muted-foreground">Build ID</label>
              <code className="text-sm bg-muted px-2 py-1 rounded block mt-1">{deployment.build}</code>
            </div>
          </CardContent>
        </Card>

        {/* Deployment Details */}
        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle>Additional Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Description</label>
              <p className="text-foreground">{deployment.description}</p>
            </div>
            <Separator />
            <div>
              <label className="text-sm font-medium text-muted-foreground">Resources</label>
              <p className="text-foreground">{deployment.resources}</p>
            </div>
            <Separator />
            <div>
              <label className="text-sm font-medium text-muted-foreground">Created</label>
              <p className="text-foreground">{deployment.createdAt}</p>
            </div>
            <Separator />
            <div>
              <label className="text-sm font-medium text-muted-foreground">Release Date</label>
              <p className="text-foreground">{deployment.releaseDate || "Not released"}</p>
            </div>
            <Separator />
            <div>
              <label className="text-sm font-medium text-muted-foreground">Tags</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {deployment.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}