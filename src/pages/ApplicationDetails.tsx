import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Edit, Trash2, Save, X, ArrowLeft, FolderOpen, Building2, Code, Activity, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { useReduxData } from "@/hooks/useReduxData";
import { useAppSelector } from "@/store";

export default function ApplicationDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { applications, portfolios } = useReduxData();
  const deployments = useAppSelector(state => state.deployments.deployments);
  
  // Find the application from Redux store
  const application = applications.find(app => app.id === id);
  const portfolio = application ? portfolios.find(p => p.id === application.portfolioId) : null;

  // Get deployments for this application
  const applicationDeployments = deployments.filter(dep => dep.applicationId === id);
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: application?.name || '',
    portfolio: portfolio?.name || '',
    description: application?.description || '',
    version: application?.version || '',
    environment: 'production'
  });
  const [isLoading, setIsLoading] = useState(false);
  
  // Handle case where application is not found
  if (!application) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Card>
          <CardContent className="p-12 text-center">
            <h3 className="text-lg font-semibold mb-2">Application Not Found</h3>
            <p className="text-muted-foreground mb-6">The requested application could not be found.</p>
            <Button onClick={() => navigate('/applications')}>Return to Applications</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSave = async () => {
    setIsLoading(true);
    // TODO: Implement actual save logic
    setTimeout(() => {
      setIsLoading(false);
      setIsEditing(false);
    }, 1000);
  };

  const handleViewLogs = () => {
    // Navigate to the latest deployment for this application
    if (applicationDeployments.length === 0) {
      navigate("/deployments");
      return;
    }
    
    // Get the most recent deployment
    const latestDeployment = applicationDeployments.sort((a, b) => 
      new Date(b.deployedAt).getTime() - new Date(a.deployedAt).getTime()
    )[0];
    
    navigate(`/deployments/${latestDeployment.id}`);
  };

  const handleViewPortfolio = () => {
    if (portfolio) {
      navigate(`/portfolios/${portfolio.id}`);
    }
  };

  const handleDelete = () => {
    // TODO: Implement actual delete logic
    navigate("/applications");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "running":
        return "bg-green-100 text-green-800";
      case "deploying":
        return "bg-blue-100 text-blue-800";
      case "stopped":
        return "bg-red-100 text-red-800";
      case "error":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/applications")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Applications
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Application Details</h1>
            <p className="text-muted-foreground">View and manage application information</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {!isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Application</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the application and all its data. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete Application
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button variant="gradient" onClick={handleSave} disabled={isLoading}>
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Application Information */}
        <div className="lg:col-span-2">
          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-primary" />
                Application Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {isEditing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Application Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="portfolio">Portfolio</Label>
                      <Select value={formData.portfolio} onValueChange={(value) => setFormData(prev => ({ ...prev, portfolio: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {portfolios.map((portfolioOption) => (
                            <SelectItem key={portfolioOption.id} value={portfolioOption.name}>
                              {portfolioOption.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="min-h-[80px]"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="version">Version</Label>
                      <Input
                        id="version"
                        value={formData.version}
                        onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
                        className="font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="environment">Environment</Label>
                      <Select value={formData.environment} onValueChange={(value) => setFormData(prev => ({ ...prev, environment: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="development">Development</SelectItem>
                          <SelectItem value="staging">Staging</SelectItem>
                          <SelectItem value="production">Production</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">{application.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{portfolio?.name || 'Unknown Portfolio'}</span>
                    </div>
                  </div>
                  <p className="text-foreground">{application.description}</p>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="flex items-center gap-2">
                      <Code className="h-4 w-4 text-muted-foreground" />
                      <span className="font-mono text-sm">{application.version}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm capitalize">Production</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Application Stats */}
        <div className="space-y-6">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="text-lg">Application Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge className={getStatusColor(application.status)} variant="secondary">
                  {application.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Last Deploy</span>
                <span className="font-medium">{new Date(application.lastDeploy).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Deployments</span>
                <span className="font-medium">{applicationDeployments.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Uptime</span>
                <span className="font-medium text-green-600">99.9%</span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start"
                onClick={handleViewLogs}
              >
                <Activity className="h-4 w-4 mr-2" />
                View Logs
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Code className="h-4 w-4 mr-2" />
                Deploy
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start"
                onClick={() => navigate(`/deployments?application=${encodeURIComponent(application.name)}`)}
              >
                <GitBranch className="h-4 w-4 mr-2" />
                View Deployments
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start"
                onClick={handleViewPortfolio}
              >
                <Building2 className="h-4 w-4 mr-2" />
                View Portfolio
              </Button>
            </CardContent>
          </Card>

          {/* Recent Deployments */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="text-lg">Recent Deployments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {applicationDeployments.slice(0, 5).map((deployment) => (
                  <div 
                    key={deployment.id} 
                    className="flex items-center justify-between p-2 border rounded hover:bg-accent cursor-pointer"
                    onClick={() => navigate(`/deployments/${deployment.id}`)}
                  >
                    <div>
                      <p className="text-sm font-medium">{deployment.tag}</p>
                      <p className="text-xs text-muted-foreground">{deployment.environment}</p>
                    </div>
                    <Badge className={getStatusColor(deployment.status)} variant="secondary">
                      {deployment.status}
                    </Badge>
                  </div>
                ))}
                {applicationDeployments.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No deployments found
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}