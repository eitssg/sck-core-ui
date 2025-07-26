import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Edit, Save, X, AlertTriangle, Clock, CheckCircle, XCircle, Activity, GitBranch } from "lucide-react";
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
import { useAppSelector } from '@/store';
import { useToast } from '@/hooks/use-toast';

export default function DeploymentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const deployments = useAppSelector(state => state.deployments.deployments);
  const events = useAppSelector(state => state.deployments.events);
  const { toast } = useToast();
  
  // Find deployment from Redux store
  const deployment = deployments.find(dep => dep.id === id);
  const deploymentEvents = events.filter(event => event.deploymentId === id);
  
  // Handle case where deployment is not found
  if (!deployment) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Card>
          <CardContent className="p-12 text-center">
            <h3 className="text-lg font-semibold mb-2">Deployment Not Found</h3>
            <p className="text-muted-foreground mb-6">The requested deployment could not be found.</p>
            <Button onClick={() => navigate('/deployments')}>Return to Deployments</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "released":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "not-released":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "release-in-progress":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "teardown-in-progress":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const getEventIcon = (type: string, status: string) => {
    if (status === 'failed') return <XCircle className="h-4 w-4 text-red-500" />;
    if (status === 'pending') return <Clock className="h-4 w-4 text-yellow-500" />;
    
    switch (type) {
      case 'deploy': return <GitBranch className="h-4 w-4 text-blue-500" />;
      case 'test': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'release': return <Activity className="h-4 w-4 text-purple-500" />;
      case 'rollback': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const handleTeardownDeployment = () => {
    toast({
      title: "Teardown initiated",
      description: "The deployment teardown process has been started.",
    });
  };

  const handlePromoteToRelease = () => {
    toast({
      title: "Promoting to release",
      description: "The deployment is being promoted to release status.",
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/deployments")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Deployment Details</h1>
            <p className="text-muted-foreground">View deployment information and event logs</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                Teardown Deployment
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Teardown Deployment</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to teardown this deployment? This action will stop all running services and cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleTeardownDeployment} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Teardown
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          
          {deployment.status === 'not-released' && (
            <Button onClick={handlePromoteToRelease} variant="default">
              Promote to Release
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Deployment Information */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5 text-primary" />
                Deployment Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-foreground">{deployment.prn}</h2>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(deployment.status)} variant="secondary">
                      {deployment.status.replace('-', ' ')}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {deployment.environment}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-foreground">{deployment.description}</p>

              <Separator />

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Application ID</h4>
                  <p className="text-sm">{deployment.applicationId}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Tag</h4>
                  <p className="text-sm font-mono">{deployment.tag}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Region</h4>
                  <p className="text-sm">{deployment.region}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Branch</h4>
                  <p className="text-sm font-mono">{deployment.branch}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Build</h4>
                  <p className="text-sm font-mono">{deployment.build}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Deployed By</h4>
                  <p className="text-sm">{deployment.deployedBy}</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Deployed At</h4>
                  <p className="text-sm">{formatTimestamp(deployment.deployedAt)}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Last Activity</h4>
                  <p className="text-sm">{deployment.lastActivity || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Event Log */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Event Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {deploymentEvents.length > 0 ? (
                  deploymentEvents.map((event) => (
                    <div key={event.id} className="flex items-start gap-3 p-3 border rounded-lg">
                      {getEventIcon(event.type, event.status)}
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-foreground">
                            {event.message}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {event.type}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatTimestamp(event.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Activity className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-2 text-sm font-medium text-foreground">No Events</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      No deployment events have been logged yet.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <Activity className="mr-2 h-4 w-4" />
                View Application
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <GitBranch className="mr-2 h-4 w-4" />
                View All Deployments
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <AlertTriangle className="mr-2 h-4 w-4" />
                View Logs
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Deployment Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {deploymentEvents.slice(0, 3).map((event, index) => (
                  <div key={event.id} className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      event.status === 'success' ? 'bg-green-500' :
                      event.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{event.type}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatTimestamp(event.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
                {deploymentEvents.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No timeline events
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