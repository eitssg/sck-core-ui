import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { selectIsAuthenticated } from "@/store/slices/authSlice";
import { buildApiUrl, getAuthHeaders, API_CONFIG } from "@/lib/api-config";
import { useReduxData } from "@/hooks/useReduxData";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/use-toast";

import {
  ArrowLeft,
  Activity,
  GitBranch,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Globe,
  Tag as TagIcon,
  RefreshCcw,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

type Deployment = {
  id: string;
  prn?: string;
  client?: string;
  portfolio?: string;
  application?: string;
  environment?: string;
  region?: string;
  status?: "released" | "not-released" | "failed" | "release-in-progress" | "teardown-in-progress" | string;
  tag?: string;
  description?: string;
  created_at?: string;
  last_activity?: string;
  // Optional fields that may exist in your backend
  branch?: string;
  build?: string;
  deployed_by?: string;
  deployed_at?: string;
};

type DeploymentEvent = {
  id: string;
  deploymentId?: string;
  type: string; // e.g., deploy|test|release|rollback|error
  status: "pending" | "success" | "failed" | string;
  message: string;
  timestamp: string;
};

type ApiResponse<T> = {
  data: T[] | T;
  metadata?: Record<string, any>;
  message?: string;
  status?: string;
};

function toArray<T>(v: T[] | T | undefined | null): T[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

function formatDateTime(v?: string) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
}

function statusVariant(s?: string): "default" | "secondary" | "destructive" | "outline" {
  switch (s) {
    case "released":
      return "default";
    case "failed":
      return "destructive";
    case "release-in-progress":
    case "teardown-in-progress":
      return "secondary";
    case "not-released":
      return "outline";
    default:
      return "outline";
  }
}

function statusIcon(s?: string) {
  switch (s) {
    case "released":
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-red-500" />;
    case "release-in-progress":
    case "teardown-in-progress":
      return <RefreshCcw className="h-4 w-4 text-blue-500 animate-spin" />;
    default:
      return <Activity className="h-4 w-4 text-muted-foreground" />;
  }
}

function eventIcon(type: string, status: string) {
  if (status === "failed") return <XCircle className="h-4 w-4 text-red-500" />;
  if (status === "pending") return <Clock className="h-4 w-4 text-yellow-500" />;
  switch (type) {
    case "deploy":
      return <GitBranch className="h-4 w-4 text-blue-500" />;
    case "test":
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "release":
      return <Sparkles className="h-4 w-4 text-purple-500" />;
    case "rollback":
      return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    default:
      return <Activity className="h-4 w-4 text-muted-foreground" />;
  }
}

export default function DeploymentDetails() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isDark } = useTheme();
  const isAuthenticated = useSelector((s: RootState) => selectIsAuthenticated(s));
  const { selectedClient } = useReduxData();

  const { id } = useParams<{ id: string }>();
  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [events, setEvents] = useState<DeploymentEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!isAuthenticated) navigate("/login", { replace: true });
  }, [isAuthenticated, navigate]);

  const idOrPrn = useMemo(() => id ?? "", [id]);
  const clientSlug = useMemo(() => (typeof selectedClient === "string" ? selectedClient : null), [selectedClient]);

  const detailsUrl = useMemo(() => {
    if (!idOrPrn) return null;
    const base = buildApiUrl(`${API_CONFIG.ENDPOINTS.API.DEPLOYMENTS}/${encodeURIComponent(idOrPrn)}`);
    return clientSlug ? `${base}?client=${encodeURIComponent(clientSlug)}` : base;
  }, [idOrPrn, clientSlug]);

  const eventsUrl = useMemo(() => {
    if (!idOrPrn) return null;
    const base = buildApiUrl(`${API_CONFIG.ENDPOINTS.API.DEPLOYMENTS}/${encodeURIComponent(idOrPrn)}/events`);
    return clientSlug ? `${base}?client=${encodeURIComponent(clientSlug)}` : base;
  }, [idOrPrn, clientSlug]);

  const fetchDetails = useCallback(async () => {
    if (!detailsUrl) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(detailsUrl, {
        method: "GET",
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        let msg = `Failed to load deployment (HTTP ${res.status})`;
        try {
          const j = await res.json();
          msg = j?.message || msg;
        } catch {
          // ignore
        }
        throw new Error(msg);
      }
      const json = (await res.json()) as ApiResponse<Deployment>;
      const item = toArray(json.data)[0] || null;
      setDeployment(item);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setDeployment(null);
    } finally {
      setLoading(false);
    }
  }, [detailsUrl]);

  const fetchEvents = useCallback(async () => {
    if (!eventsUrl) return;
    setLoadingEvents(true);
    try {
      const res = await fetch(eventsUrl, {
        method: "GET",
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        // Events are optional; show toast but don’t block page
        try {
          const j = await res.json();
          toast({
            title: "Could not load events",
            description: j?.message || `HTTP ${res.status}`,
            variant: "destructive",
          });
        } catch {
          // ignore
        }
        setEvents([]);
        return;
      }
      const json = (await res.json()) as ApiResponse<DeploymentEvent>;
      setEvents(toArray(json.data));
    } catch {
      setEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  }, [eventsUrl, toast]);

  useEffect(() => {
    if (!idOrPrn || !isAuthenticated) return;
    fetchDetails();
    fetchEvents();
  }, [idOrPrn, isAuthenticated, fetchDetails, fetchEvents]);

  const canPromote = deployment?.status === "not-released";
  const promoteUrl = useMemo(() => {
    if (!idOrPrn) return null;
    const base = buildApiUrl(`${API_CONFIG.ENDPOINTS.API.DEPLOYMENTS}/${encodeURIComponent(idOrPrn)}/release`);
    return clientSlug ? `${base}?client=${encodeURIComponent(clientSlug)}` : base;
  }, [idOrPrn, clientSlug]);

  const teardownUrl = useMemo(() => {
    if (!idOrPrn) return null;
    const base = buildApiUrl(`${API_CONFIG.ENDPOINTS.API.DEPLOYMENTS}/${encodeURIComponent(idOrPrn)}/teardown`);
    return clientSlug ? `${base}?client=${encodeURIComponent(clientSlug)}` : base;
  }, [idOrPrn, clientSlug]);

  const handlePromote = async () => {
    if (!promoteUrl) return;
    setActionBusy(true);
    try {
      const res = await fetch(promoteUrl, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        let msg = `Failed to promote (HTTP ${res.status})`;
        try {
          const j = await res.json();
          msg = j?.message || msg;
        } catch {
          // ignore
        }
        throw new Error(msg);
      }
      toast({ title: "Promotion started", description: "Release is in progress." });
      await fetchDetails();
      await fetchEvents();
    } catch (err) {
      toast({
        title: "Promotion failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setActionBusy(false);
    }
  };

  const handleTeardown = async () => {
    if (!teardownUrl) return;
    setActionBusy(true);
    try {
      const res = await fetch(teardownUrl, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        let msg = `Failed to start teardown (HTTP ${res.status})`;
        try {
          const j = await res.json();
          msg = j?.message || msg;
        } catch {
          // ignore
        }
        throw new Error(msg);
      }
      toast({ title: "Teardown started", description: "Tearing down deployment." });
      await fetchDetails();
      await fetchEvents();
    } catch (err) {
      toast({
        title: "Teardown failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setActionBusy(false);
    }
  };

  if (!isAuthenticated) return null;

  if (loading) {
    return (
      <DashboardLayout pageTitle="Deployments" pageSubtitle="Loading deployment details">
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-end">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/deployments">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Deployments
              </Link>
            </Button>
          </div>
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5 text-primary" />
                Loading deployment…
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-4 w-2/3" />
              <Separator />
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !deployment) {
    return (
      <DashboardLayout pageTitle="Deployments" pageSubtitle="Deployment not found">
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-end">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/deployments">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Deployments
              </Link>
            </Button>
          </div>
          <Card className="shadow-soft">
            <CardContent className="p-12 text-center">
              <h3 className="text-lg font-semibold mb-2">Deployment Not Found</h3>
              <p className="text-muted-foreground mb-6">{error || "The requested deployment could not be found."}</p>
              <Button asChild>
                <Link to="/deployments">Return to Deployments</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const title = deployment.prn || deployment.id;
  const subtitle = [deployment.application, deployment.portfolio].filter(Boolean).join(" • ");

  return (
    <DashboardLayout pageTitle={title} pageSubtitle={subtitle || "Deployment details and event logs"}>
      <div className="space-y-6 animate-fade-in">
        {/* Actions under global header */}
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/deployments">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Deployments
            </Link>
          </Button>
          {canPromote && (
            <Button onClick={handlePromote} disabled={actionBusy} className="gap-2">
              <Sparkles className="h-4 w-4" />
              Promote to Release
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={actionBusy} className="gap-2">
                <AlertTriangle className="h-4 w-4" />
                Teardown Deployment
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Teardown Deployment</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to teardown this deployment? This will stop all running services and cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleTeardown}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Teardown
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Details and Events */}
        <div className="lg:col-span-2 space-y-6">
          {/* Deployment Information */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5 text-primary" />
                Deployment Information
              </CardTitle>
              <CardDescription>Core attributes and metadata</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {deployment.description && <p className="text-foreground">{deployment.description}</p>}
              <Separator />
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Info label="Client" value={deployment.client || "—"} />
                <Info label="Application" value={deployment.application || "—"} />
                <Info label="Portfolio" value={deployment.portfolio || "—"} />
                <Info
                  label="Environment"
                  value={
                    deployment.environment ? (
                      <Badge variant={deployment.environment === "production" ? "destructive" : "secondary"} className="gap-1">
                        <Globe className="h-3 w-3" />
                        {deployment.environment}
                      </Badge>
                    ) : (
                      "—"
                    )
                  }
                />
                <Info label="Region" value={deployment.region || "—"} />
                <Info
                  label="Tag"
                  value={
                    deployment.tag ? (
                      <Badge variant="outline" className="gap-1">
                        <TagIcon className="h-3 w-3" />
                        {deployment.tag}
                      </Badge>
                    ) : (
                      "—"
                    )
                  }
                />
                <Info label="Branch" value={deployment.branch || "—"} mono />
                <Info label="Build" value={deployment.build || "—"} mono />
                <Info label="Deployed By" value={deployment.deployed_by || "—"} />
                <Info label="Created" value={formatDateTime(deployment.created_at)} />
                <Info label="Deployed At" value={formatDateTime(deployment.deployed_at)} />
                <Info label="Last Activity" value={formatDateTime(deployment.last_activity)} />
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
              <CardDescription>Build, test, release, and lifecycle events</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingEvents ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : events.length > 0 ? (
                <div className="space-y-3">
                  {events.map((evt) => (
                    <div key={evt.id} className="flex items-start gap-3 p-3 border rounded-lg bg-card/60">
                      {eventIcon(evt.type, evt.status)}
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-foreground">{evt.message}</p>
                          <Badge variant="outline" className="text-xs">
                            {evt.type}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{formatDateTime(evt.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <Activity className="mx-auto h-10 w-10 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-medium text-foreground">No Events</h3>
                  <p className="mt-1 text-sm text-muted-foreground">No deployment events have been logged yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Quick Actions and Summary */}
        <div className="space-y-6">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Navigate and troubleshoot</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild variant={isDark ? "secondary" : "outline"} className="w-full justify-start gap-2">
                <Link to="/applications">
                  <Activity className="h-4 w-4" />
                  View Application
                </Link>
              </Button>
              <Button asChild variant={isDark ? "secondary" : "outline"} className="w-full justify-start gap-2">
                <Link to="/deployments">
                  <GitBranch className="h-4 w-4" />
                  View All Deployments
                </Link>
              </Button>
              <Button variant={isDark ? "secondary" : "outline"} className="w-full justify-start gap-2" onClick={fetchEvents}>
                <RefreshCcw className="h-4 w-4" />
                Refresh Events
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Deployment Snapshot</CardTitle>
              <CardDescription>At-a-glance stats</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <Stat label="Status" value={(deployment.status || "unknown").replace(/-/g, " ")} />
                <Stat label="Environment" value={deployment.environment || "—"} />
                <Stat label="Region" value={deployment.region || "—"} />
                <Stat label="Events" value={String(events.length)} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
    </DashboardLayout>
  );
}

function Info({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <div className={`text-sm ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3 bg-card/60">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}