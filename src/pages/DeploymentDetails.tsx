import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Play, Square, Trash2, GitBranch, Tag, MapPin, Server, Clock, AlertTriangle, Activity, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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

// Mock events data generator
const generateMockEvents = (count: number, startId: number = 0) => {
  const eventTypes = ['deploy', 'build', 'test', 'release', 'teardown', 'scale', 'config', 'monitor'];
  const itemTypes = ['application', 'database', 'load-balancer', 'container', 'service', 'pipeline'];
  const statuses = ['success', 'error', 'warning', 'info', 'in-progress'];
  const messages = [
    'Deployment started successfully',
    'Build process completed',
    'Unit tests passed',
    'Integration tests failed',
    'Database migration applied',
    'Load balancer configured',
    'Service scaled to 3 instances',
    'Configuration updated',
    'Health check passed',
    'SSL certificate renewed',
    'Cache cleared',
    'Backup completed',
    'Resource allocation updated',
    'Security scan completed',
    'Performance metrics collected'
  ];

  return Array.from({ length: count }, (_, i) => {
    const timestamp = new Date();
    timestamp.setMinutes(timestamp.getMinutes() - (startId + i) * 2);
    
    return {
      id: startId + i,
      timestamp: timestamp.toISOString(),
      event_type: eventTypes[Math.floor(Math.random() * eventTypes.length)],
      item_type: itemTypes[Math.floor(Math.random() * itemTypes.length)],
      message: messages[Math.floor(Math.random() * messages.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)]
    };
  });
};

export default function DeploymentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [deployment] = useState(mockDeployment);
  const [isLoading, setIsLoading] = useState(false);
  const [events, setEvents] = useState(generateMockEvents(50));
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [hasMoreEvents, setHasMoreEvents] = useState(true);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

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

  const getEventStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "bg-green-100 text-green-800";
      case "error":
        return "bg-red-100 text-red-800";
      case "warning":
        return "bg-yellow-100 text-yellow-800";
      case "in-progress":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const loadMoreEvents = useCallback(() => {
    if (isLoadingEvents || !hasMoreEvents) return;
    
    setIsLoadingEvents(true);
    // Simulate API call delay
    setTimeout(() => {
      const newEvents = generateMockEvents(25, events.length);
      setEvents(prev => [...prev, ...newEvents]);
      setIsLoadingEvents(false);
      
      // Simulate no more events after 200 total events
      if (events.length + 25 >= 200) {
        setHasMoreEvents(false);
      }
    }, 1000);
  }, [events.length, isLoadingEvents, hasMoreEvents]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;
    
    // Load more when scrolled 80% down
    if (scrollPercentage > 0.8) {
      loadMoreEvents();
    }
  }, [loadMoreEvents]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
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

      {/* Collapsible Deployment Details */}
      <Collapsible open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <Card className="shadow-medium">
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Deployment Details</CardTitle>
                {isDetailsOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Deployment Information */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Information</h3>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Portfolio</label>
                    <p className="text-sm text-foreground">{deployment.portfolio}</p>
                  </div>
                  <Separator />
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Application</label>
                    <p className="text-sm text-foreground">{deployment.application}</p>
                  </div>
                  <Separator />
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Branch</label>
                    <div className="flex items-center gap-2">
                      <GitBranch className="h-3 w-3 text-muted-foreground" />
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{deployment.branch}</code>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Tag/Version</label>
                    <div className="flex items-center gap-2">
                      <Tag className="h-3 w-3 text-muted-foreground" />
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{deployment.tag}</code>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Build ID</label>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded block mt-1">{deployment.build}</code>
                  </div>
                </div>

                {/* Additional Details */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Additional Details</h3>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Description</label>
                    <p className="text-sm text-foreground">{deployment.description}</p>
                  </div>
                  <Separator />
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Resources</label>
                    <p className="text-sm text-foreground">{deployment.resources}</p>
                  </div>
                  <Separator />
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Created</label>
                    <p className="text-sm text-foreground">{deployment.createdAt}</p>
                  </div>
                  <Separator />
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Release Date</label>
                    <p className="text-sm text-foreground">{deployment.releaseDate || "Not released"}</p>
                  </div>
                  <Separator />
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Tags</label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {deployment.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs px-1.5 py-0.5">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Events Log */}
      <Card className="shadow-medium">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Events Log
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea 
            className="h-[28rem] w-full"
            onScrollCapture={handleScroll}
          >
            <div className="p-6 space-y-3">
              {events.map((event, index) => (
                <div key={event.id} className="flex items-start gap-4 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                  <div className="flex-shrink-0 w-2 h-2 rounded-full bg-primary mt-2"></div>
                  <div className="flex-grow space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {event.event_type}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {event.item_type}
                        </Badge>
                        <Badge className={`text-xs ${getEventStatusColor(event.status)}`} variant="secondary">
                          {event.status}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground font-mono">
                        {formatTimestamp(event.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-foreground">{event.message}</p>
                  </div>
                </div>
              ))}
              
              {isLoadingEvents && (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-start gap-4 p-3">
                      <Skeleton className="w-2 h-2 rounded-full mt-2" />
                      <div className="flex-grow space-y-2">
                        <div className="flex gap-2">
                          <Skeleton className="h-5 w-16" />
                          <Skeleton className="h-5 w-20" />
                          <Skeleton className="h-5 w-14" />
                        </div>
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {!hasMoreEvents && events.length > 0 && (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">No more events to load</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}