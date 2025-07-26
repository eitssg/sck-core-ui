import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, GitBranch, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";

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
}

const mockDeployments: Deployment[] = [
  {
    id: "dep-001",
    appName: "User Management API",
    version: "v2.3.1",
    environment: "Production",
    status: "released",
    deployedAt: "2024-01-26T10:30:00Z",
    deployedBy: "john.doe@techcorp.com",
    events: [
      { id: "evt-001", type: "deploy", message: "Deployment initiated", timestamp: "2024-01-26T10:30:00Z", status: "success" },
      { id: "evt-002", type: "test", message: "Running automated tests", timestamp: "2024-01-26T10:32:00Z", status: "success" },
      { id: "evt-003", type: "release", message: "Released to production", timestamp: "2024-01-26T10:35:00Z", status: "success" }
    ]
  },
  {
    id: "dep-002",
    appName: "Analytics Dashboard",
    version: "v1.8.0",
    environment: "Staging",
    status: "release-in-progress",
    deployedAt: "2024-01-26T09:15:00Z",
    deployedBy: "jane.smith@techcorp.com",
    events: [
      { id: "evt-004", type: "deploy", message: "Deployment completed", timestamp: "2024-01-26T09:15:00Z", status: "success" },
      { id: "evt-005", type: "test", message: "Integration tests passed", timestamp: "2024-01-26T09:18:00Z", status: "success" },
      { id: "evt-006", type: "release", message: "Release in progress...", timestamp: "2024-01-26T09:25:00Z", status: "pending" }
    ]
  },
  {
    id: "dep-003",
    appName: "Inventory Tracker",
    version: "v3.1.2",
    environment: "Development",
    status: "teardown-in-progress",
    deployedAt: "2024-01-26T08:45:00Z",
    deployedBy: "mike.wilson@techcorp.com",
    events: [
      { id: "evt-007", type: "deploy", message: "Deployment failed", timestamp: "2024-01-26T08:45:00Z", status: "failed" },
      { id: "evt-008", type: "error", message: "Database connection timeout", timestamp: "2024-01-26T08:47:00Z", status: "failed" },
      { id: "evt-009", type: "rollback", message: "Initiating teardown...", timestamp: "2024-01-26T08:50:00Z", status: "pending" }
    ]
  },
  {
    id: "dep-004",
    appName: "Customer Portal",
    version: "v2.0.5",
    environment: "Production",
    status: "not-released",
    deployedAt: "2024-01-25T16:20:00Z",
    deployedBy: "sarah.johnson@techcorp.com",
    events: [
      { id: "evt-010", type: "deploy", message: "Deployment successful", timestamp: "2024-01-25T16:20:00Z", status: "success" },
      { id: "evt-011", type: "test", message: "Automated tests completed", timestamp: "2024-01-25T16:25:00Z", status: "success" },
      { id: "evt-012", type: "test", message: "Manual testing required", timestamp: "2024-01-25T16:30:00Z", status: "pending" }
    ]
  },
  {
    id: "dep-005",
    appName: "Data Warehouse ETL",
    version: "v4.2.0",
    environment: "Production",
    status: "released",
    deployedAt: "2024-01-25T14:10:00Z",
    deployedBy: "alex.brown@techcorp.com",
    events: [
      { id: "evt-013", type: "deploy", message: "Deployment initiated", timestamp: "2024-01-25T14:10:00Z", status: "success" },
      { id: "evt-014", type: "test", message: "Performance tests passed", timestamp: "2024-01-25T14:15:00Z", status: "success" },
      { id: "evt-015", type: "release", message: "Successfully released", timestamp: "2024-01-25T14:20:00Z", status: "success" }
    ]
  }
];

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

export default function LatestDeployments({ clientId }: LatestDeploymentsProps) {
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
          {mockDeployments.map((deployment) => (
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
          ))}
        </div>
        
        <div className="mt-6 text-center">
          <Button variant="outline" className="w-full">View All Deployments</Button>
        </div>
      </CardContent>
    </Card>
  );
}