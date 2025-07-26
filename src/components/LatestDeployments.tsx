import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, GitBranch, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { FilterState } from "./DashboardFilters";
import { useAppSelector } from '@/store';

interface DeploymentEvent {
  id: string;
  type: 'deploy' | 'test' | 'release' | 'rollback' | 'error';
  message: string;
  timestamp: string;
  status: 'success' | 'failed' | 'pending';
}

interface Deployment {
  id: string;
  appName: string;
  version: string;
  environment: string;
  status: 'released' | 'not-released' | 'teardown-in-progress' | 'release-in-progress' | 'failed';
  deployedAt: string;
  deployedBy: string;
  events: DeploymentEvent[];
}

interface LatestDeploymentsProps {
  clientId: string;
  filters?: FilterState;
}

// All data now comes from Redux store

const getStatusColor = (status: string) => {
  switch (status) {
    case 'released': return 'bg-green-100 text-green-800 border-green-200';
    case 'not-released': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'release-in-progress': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'teardown-in-progress': return 'bg-red-100 text-red-800 border-red-200';
    case 'failed': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getEventIcon = (type: string, status: string) => {
  if (status === 'failed') return <XCircle className="h-4 w-4 text-red-500" />;
  if (status === 'pending') return <Clock className="h-4 w-4 text-yellow-500" />;
  
  switch (type) {
    case 'deploy': return <GitBranch className="h-4 w-4 text-blue-500" />;
    case 'test': return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'release': return <Activity className="h-4 w-4 text-purple-500" />;
    case 'rollback': return <AlertCircle className="h-4 w-4 text-orange-500" />;
    case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
    default: return <Activity className="h-4 w-4 text-gray-500" />;
  }
};

const formatTimestamp = (timestamp: string) => {
  return new Date(timestamp).toLocaleString();
};

export default function LatestDeployments({ clientId, filters }: LatestDeploymentsProps) {
  const deployments = useAppSelector(state => state.deployments.deployments);
  const events = useAppSelector(state => state.deployments.events);

  // Get deployments for this client  
  const clientDeployments = deployments.filter(dep => dep.clientId === clientId);

  // Convert Redux deployment format to match component interface
  const deploymentData = clientDeployments.map(dep => {
    const deploymentEvents = events.filter(event => event.deploymentId === dep.id);
    return {
      id: dep.id,
      appName: dep.applicationId, // Will show as application ID for now
      version: dep.tag,
      environment: dep.environment,
      status: dep.status,
      deployedAt: dep.deployedAt,
      deployedBy: dep.deployedBy,
      events: deploymentEvents.map(event => ({
        id: event.id,
        type: event.type,
        message: event.message,
        timestamp: event.timestamp,
        status: event.status
      }))
    };
  });

  // Filter deployments based on applied filters
  const filteredDeployments = deploymentData.filter(deployment => {
    // Keyword filter
    if (filters?.keywords) {
      const keyword = filters.keywords.toLowerCase();
      const matchesKeyword = 
        deployment.appName.toLowerCase().includes(keyword) ||
        deployment.environment.toLowerCase().includes(keyword) ||
        deployment.status.toLowerCase().includes(keyword) ||
        deployment.deployedBy.toLowerCase().includes(keyword);
      
      if (!matchesKeyword) return false;
    }

    // Environment filter
    if (filters?.environment && deployment.environment !== filters.environment) {
      return false;
    }

    // Deployment status filter
    if (filters?.deploymentStatus && deployment.status !== filters.deploymentStatus) {
      return false;
    }

    // Application filter
    if (filters?.applications.length > 0 && !filters.applications.includes(deployment.appName)) {
      return false;
    }

    // Date range filter
    if (filters?.dateRange.from || filters?.dateRange.to) {
      const deploymentDate = new Date(deployment.deployedAt);
      if (filters.dateRange.from && deploymentDate < filters.dateRange.from) return false;
      if (filters.dateRange.to && deploymentDate > filters.dateRange.to) return false;
    }

    return true;
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Latest Deployments
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {filteredDeployments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No deployments found matching your filter criteria
            </div>
          ) : (
            filteredDeployments.map((deployment) => (
            <div key={deployment.id} className="border rounded-lg p-4 space-y-4">
              {/* Deployment Header */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h4 className="font-semibold text-foreground">{deployment.appName}</h4>
                    <Badge variant="outline">{deployment.version}</Badge>
                    <Badge variant="secondary">{deployment.environment}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Deployed by {deployment.deployedBy}</span>
                    <span>{formatTimestamp(deployment.deployedAt)}</span>
                  </div>
                </div>
                <Badge className={getStatusColor(deployment.status)}>
                  {deployment.status.replace('-', ' ')}
                </Badge>
              </div>

              {/* Latest 3 Events */}
              <div className="space-y-3 pl-4 border-l-2 border-border">
                <h5 className="text-sm font-medium text-muted-foreground">Recent Events</h5>
                {deployment.events.slice(-3).map((event) => (
                  <div key={event.id} className="flex items-start gap-3">
                    {getEventIcon(event.type, event.status)}
                    <div className="flex-1 space-y-1">
                      <p className="text-sm text-foreground">{event.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatTimestamp(event.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm">View Details</Button>
                {deployment.status === 'not-released' && (
                  <Button variant="default" size="sm">Release</Button>
                )}
                {deployment.status.includes('in-progress') && (
                  <Button variant="destructive" size="sm">Cancel</Button>
                )}
              </div>
            </div>
            ))
          )}
        </div>
        
        <div className="mt-6 text-center">
          <Button variant="outline" className="w-full">View All Deployments</Button>
        </div>
      </CardContent>
    </Card>
  );
}