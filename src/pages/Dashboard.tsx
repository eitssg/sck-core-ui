import { useEffect, useMemo, useState, useCallback } from "react";
import { useAppSelector } from "@/store";
import { selectUser as selectProfileUser } from "@/store/slices/profileSlice";
import { Link } from "react-router-dom";

import { useReduxData } from "@/hooks/useReduxData";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/use-toast";

import DashboardLayout from "@/components/DashboardLayout";
import DeploymentChart from "@/components/DeploymentChart";
import LatestDeployments from "@/components/LatestDeployments";

import { buildApiUrl, API_CONFIG } from "@/lib/api-config";
import { apiFetch } from "@/lib/api-fetch";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

import {
  Sparkles,
  Users,
  Briefcase,
  Server,
  GitBranch,
  Activity,
  Plus,
  Clock,
  Building2,
} from "lucide-react";

// Minimal API response helpers
type ApiResponse<T> = {
  data: T[] | T;
  metadata?: { total?: number; cursor?: string | null; [k: string]: any };
  message?: string;
  status?: string;
};
function toArray<T>(v: T[] | T | undefined | null): T[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

type Deployment = {
  id: string;
  prn?: string;
  client?: string;
  portfolio?: string;
  application?: string;
  environment?: string;
  region?: string;
  status?: string;
  tag?: string;
  created_at?: string;
  last_activity?: string;
};

export default function Dashboard() {
  const { isDark } = useTheme();
  const { toast } = useToast();
  const profileUser = useAppSelector(selectProfileUser as any);

  // Redux-backed data
  const { clients, portfolios, actions, selectedClient } = useReduxData();
  const currentClient = typeof selectedClient === "string" ? selectedClient : null;

  // Pretty client label
  const clientName = useMemo(() => {
    const items: any[] = Array.isArray((clients as any)?.items) ? (clients as any).items : [];
    return items.find((c) => c.client === currentClient)?.client_name || currentClient || "—";
  }, [clients, currentClient]);

  // Page-local API-derived stats
  const [appTotal, setAppTotal] = useState<number>(0);
  const [depTotal, setDepTotal] = useState<number>(0);
  const [activeDeployments, setActiveDeployments] = useState<number>(0);
  const [recentDeployments, setRecentDeployments] = useState<Deployment[]>([]);
  const [busy, setBusy] = useState<boolean>(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [aws401, setAws401] = useState<string | null>(null);

  // Determine AWS credentials presence from profile
  const hasAwsCreds = useMemo(() => {
    const p: any = profileUser || {};
    const c: any = p.credentials || {};
    return Boolean(c.AwsCredentials);
  }, [profileUser]);

  // Initial fetches
  useEffect(() => {
    // Always have client list handy
    if (clients.status === "idle") actions.clients.fetch({ limit: 100 });
  }, [clients.status, actions.clients]);

  useEffect(() => {
    if (!currentClient) return;
    // Ensure portfolios are fetched for current client (chart reads state)
    if (portfolios?.currentClient !== currentClient) {
      actions.portfolios.setCurrentClient(currentClient);
    }
    if (portfolios.status === "idle" || portfolios.currentClient !== currentClient) {
      actions.portfolios.fetch(currentClient, { force: false });
    }
  }, [currentClient, portfolios.status, portfolios.currentClient, actions.portfolios]);

  // Dashboard API fetch (apps + deployments slim stats)
  const fetchDashboardStats = useCallback(async () => {
    if (!currentClient) return;
    setBusy(true);
    try {
      // Applications total
      const appsUrl = new URL(buildApiUrl(API_CONFIG.ENDPOINTS.API.APPLICATIONS));
      appsUrl.searchParams.set("client", currentClient);
      appsUrl.searchParams.set("limit", "1");
      const appsRes = await apiFetch(appsUrl.toString(), {
        cookieFirst: true,
        notify401: true,
        contextLabel: "Applications",
      });
      if (appsRes.ok) {
        const appsJson = (await appsRes.json()) as ApiResponse<any>;
        setAppTotal(appsJson.metadata?.total ?? toArray(appsJson.data).length);
      } else {
        if (appsRes.status === 401) {
          try {
            const j = await appsRes.clone().json().catch(() => ({}));
            const msg = String(j?.message || "");
            if (msg) {
              if (msg.includes('key_rotation_required')) {
                setAws401('key_rotation_required');
                try { sessionStorage.setItem('aws_cred_status', 'rotation'); } catch { /* ignore storage errors */ }
              } else if (msg.includes('invalid_credentils') || msg.includes('aws_credentials_invalid')) {
                setAws401('aws_credentials_invalid');
                try { sessionStorage.setItem('aws_cred_status', 'invalid'); } catch { /* ignore storage errors */ }
              } else if (msg.includes('aws_credentials_missing')) {
                setAws401('aws_credentials_missing');
                try { sessionStorage.setItem('aws_cred_status', 'missing'); } catch { /* ignore storage errors */ }
              }
            }
          } catch { /* ignore */ }
        }
        setAppTotal(0);
      }

      // Deployments recent + totals
      const depUrl = new URL(buildApiUrl(API_CONFIG.ENDPOINTS.API.DEPLOYMENTS));
      depUrl.searchParams.set("client", currentClient);
      depUrl.searchParams.set("limit", "5");
      depUrl.searchParams.set("order", "desc");
      const depRes = await apiFetch(depUrl.toString(), {
        cookieFirst: true,
        notify401: true,
        contextLabel: "Deployments",
      });
      if (depRes.ok) {
        const depJson = (await depRes.json()) as ApiResponse<Deployment>;
        const rows = toArray(depJson.data);
        setRecentDeployments(rows);
        setDepTotal(depJson.metadata?.total ?? rows.length);
        const active = rows.filter((d) =>
          ["released", "release-in-progress"].includes((d.status || "").toLowerCase())
        ).length;
        setActiveDeployments(active);
      } else {
        if (depRes.status === 401) {
          try {
            const j = await depRes.clone().json().catch(() => ({}));
            const msg = String(j?.message || "");
            if (msg) {
              if (msg.includes('key_rotation_required')) {
                setAws401('key_rotation_required');
                try { sessionStorage.setItem('aws_cred_status', 'rotation'); } catch { /* ignore storage errors */ }
              } else if (msg.includes('invalid_credentils') || msg.includes('aws_credentials_invalid')) {
                setAws401('aws_credentials_invalid');
                try { sessionStorage.setItem('aws_cred_status', 'invalid'); } catch { /* ignore storage errors */ }
              } else if (msg.includes('aws_credentials_missing')) {
                setAws401('aws_credentials_missing');
                try { sessionStorage.setItem('aws_cred_status', 'missing'); } catch { /* ignore storage errors */ }
              }
            }
          } catch { /* ignore */ }
        }
        setRecentDeployments([]);
        setDepTotal(0);
        setActiveDeployments(0);
      }

      setLastRefresh(new Date());
    } catch (err) {
      toast({
        title: "Dashboard load failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }, [currentClient, toast]);

  useEffect(() => {
    if (!currentClient || !hasAwsCreds) return;
    fetchDashboardStats();
  }, [currentClient, hasAwsCreds, fetchDashboardStats]);

  // Derived stat cards (clients/portfolios from store)
  const totalClients = clients.items?.length || 0;
  const totalPortfolios = Array.isArray((portfolios as any)?.items)
    ? (portfolios as any).items.length
    : 0;

  return (
    <DashboardLayout
      activeItem="dashboard"
      pageTitle="Dashboard"
      pageSubtitle="Overview and recent activity"
    >
      <div className="space-y-6">
        {/* AWS Credentials CTA */}
  {!hasAwsCreds && (
          <div className="rounded-lg border bg-amber-50 dark:bg-amber-950/30 p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                <Activity className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <div className="font-semibold">AWS credentials required</div>
                <div className="text-sm text-muted-foreground">
      Add your AWS Access Key and Secret to enable /api features.
                </div>
                <div className="mt-2">
      <Link to="/aws-credentials" className="text-sm underline">Add AWS Credentials →</Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {aws401 && (
          <div className="rounded-lg border bg-red-50 dark:bg-red-950/30 p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                <Activity className="h-5 w-5 text-red-600" />
              </div>
              <div className="flex-1">
                <div className="font-semibold">API access blocked</div>
                <div className="text-sm text-muted-foreground">
                  {aws401 === 'key_rotation_required'
                    ? 'Your AWS credentials must be rotated. Please enter new keys on the AWS Credentials page.'
                    : aws401 === 'aws_credentials_invalid'
                      ? 'Your AWS credentials are invalid. Please update them on the AWS Credentials page.'
                      : 'AWS credentials are missing. Please add them on the AWS Credentials page.'}
                </div>
                <div className="mt-2">
                  <Link to="/aws-credentials" className="text-sm underline">Open AWS Credentials →</Link>
                </div>
              </div>
            </div>
          </div>
        )}
  {/* Removed ambient header banner panel per request */}

        {/* Context warning */}
        {!currentClient && (
          <Card>
            <CardContent className="p-8 text-center">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-3 text-lg font-semibold">No client selected</h3>
              <p className="text-sm text-muted-foreground">Pick a client from the header to load your data.</p>
            </CardContent>
          </Card>
        )}

        {/* Stat tiles */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalClients}</div>
              <p className="text-xs text-muted-foreground">Organizations onboarded</p>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Portfolios</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalPortfolios}</div>
              <p className="text-xs text-muted-foreground">
                {currentClient ? "In selected client" : "Select a client to view"}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Applications</CardTitle>
              <Server className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{appTotal}</div>
              <p className="text-xs text-muted-foreground">Tracked across environments</p>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Deployments</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeDeployments}</div>
              <p className="text-xs text-muted-foreground">Releases in progress or live</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts + Recent */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5 text-primary" />
                Deployment Overview
              </CardTitle>
              <CardDescription>Daily status, zone environments, and monthly trends</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              {currentClient ? (
                <DeploymentChart client={currentClient} />
              ) : (
                <div className="space-y-3">
                  <Skeleton className="h-6 w-1/2" />
                  <Skeleton className="h-48 w-full" />
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="col-span-3 shadow-soft">
            <CardHeader>
              <CardTitle>Recent Deployments</CardTitle>
              <CardDescription>Latest activity for {clientName}</CardDescription>
            </CardHeader>
            <CardContent>
              <LatestDeployments />
            </CardContent>
          </Card>
        </div>

        {/* Errors */}
        {(clients.error || portfolios.error) && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="text-destructive">
                <h3 className="font-semibold">Error Loading Data</h3>
                <p className="text-sm mt-1">{clients.error || portfolios.error}</p>
                <Separator className="my-3" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    actions.clients.fetch({ force: true });
                    if (currentClient) actions.portfolios.fetch(currentClient, { force: true });
                    fetchDashboardStats();
                  }}
                >
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}