import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, GitBranch, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useDispatch } from "react-redux";
import type { AppDeploymentBuild } from "@/store/types";
import { useReduxData } from "@/hooks/useReduxData";
import type { AppDispatch, RootState } from "@/store";
// Builds API not available yet; slice thunk is a no-op returning empty results
import { fetchBuilds } from "@/store/slices/deploymentsSlice";
import { useSelector } from "react-redux";

type LatestDeploymentsProps = {
  limit?: number; // default 5-10
};

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

export default function LatestDeployments({ limit = 5 }: LatestDeploymentsProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { selectedClient } = useReduxData();
  const builds = useSelector((s: RootState) => (s as any)?.deployments?.builds ?? []) as AppDeploymentBuild[];
  const loading = useSelector((s: RootState) => (s as any)?.deployments?.loading) as boolean;
  const lastFetched = useSelector((s: RootState) => (s as any)?.deployments?.lastFetched) as number | null;
  const cachedForClient = useSelector((s: RootState) => (s as any)?.deployments?.cachedForClient) as string | null;

  // Fetch once per client (server uses current client from token)
  React.useEffect(() => {
    // Intentionally do nothing until backend exists; thunk returns empty list anyway
    if (!selectedClient) return;
    if (!lastFetched || cachedForClient !== selectedClient) {
      dispatch(fetchBuilds({ limit: Math.max(limit, 5) }));
    }
  }, [dispatch, selectedClient, lastFetched, cachedForClient, limit]);

  // Take the top N builds (already ordered by backend; if not, sort by created_at desc)
  const list = React.useMemo(() => {
    const sorted = [...builds].sort((a, b) => {
      const ta = new Date(a.created_at).getTime();
      const tb = new Date(b.created_at).getTime();
      return tb - ta;
    });
    return sorted.slice(0, limit);
  }, [builds, limit]);

  // Map to display model
  const filteredDeployments = list.map((b) => ({
    id: b.prn,
    appName: b.app_prn || b.portfolio_prn || b.prn || 'unknown-app',
    version: b.name,
    environment: (b as any).environment || '—',
    status: b.status as any,
    deployedAt: b.created_at,
    deployedBy: (b as any).deployed_by || '—',
    events: [] as any[],
  }));

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
          {loading && filteredDeployments.length === 0 ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-10 w-full bg-muted/40 rounded-md animate-pulse" />
              ))}
            </div>
          ) : filteredDeployments.length === 0 ? (
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
                {/* Events are not available from builds endpoint; omit for now */}

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