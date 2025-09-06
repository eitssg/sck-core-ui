import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams, Link, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "@/store";

import { ArrowLeft, GitBranch, Code, Calendar, Clock, Hash, FolderOpen, Activity, BadgePercent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { useReduxData } from "@/hooks/useReduxData";
import { useTheme } from "@/hooks/useTheme";
import type { Application, Portfolio, Zone, AppDeploymentBuild } from "@/store/types";
import { fetchBuilds } from "@/store/slices/deploymentsSlice";

function toArray<T>(v: T | T[] | null | undefined): T[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

function safeLower(v?: string) {
  return (v || "").toLowerCase();
}

function formatDateTime(v?: string) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
}

export default function ApplicationDetails() {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { isDark } = useTheme();

  // Route params and query
  const { portfolio: portfolioParamFromPath } = useParams<{ portfolio?: string }>();
  const [searchParams] = useSearchParams();
  const qpClient = searchParams.get("client") || "";
  const qpPortfolio = searchParams.get("portfolio") || portfolioParamFromPath || "";
  const qpRegex = searchParams.get("app_regex") || searchParams.get("regex") || searchParams.get("app") || "";

  // Redux data
  const { selectedClient, portfolios, applications } = useReduxData();
  const currentClient = useMemo(() => {
    return qpClient || (typeof selectedClient === "string" ? selectedClient : "");
  }, [qpClient, selectedClient]);

  // Normalize lists
  const portfoliosList = useMemo<Portfolio[]>(() => {
    const p: any = (portfolios as any)?.items;
    return Array.isArray(p) ? (p as Portfolio[]) : [];
  }, [portfolios]);

  const appsList = useMemo<Application[]>(() => {
    const a: any = (applications as any)?.items ?? applications;
    return Array.isArray(a) ? (a as Application[]) : [];
  }, [applications]);

  const zonesList = useSelector((s: RootState) => (s as any)?.zones?.zones ?? []) as Zone[];

  // Fetch latest builds (scoped by current client server-side)
  useEffect(() => {
    if (!currentClient) return;
    dispatch(fetchBuilds({ limit: 100 }));
  }, [dispatch, currentClient]);

  const builds = useSelector((s: RootState) => (s as any)?.deployments?.builds ?? []) as AppDeploymentBuild[];
  const buildsLoading = useSelector((s: RootState) => (s as any)?.deployments?.loading) as boolean;

  // Filter by client and portfolio first
  const clientApps = useMemo<Application[]>(() => {
    const inClient = appsList; // apps are already scoped by fetch; if not, add client filter when available
    if (!qpPortfolio) return inClient;
    return inClient.filter((a) => a.portfolio === qpPortfolio);
  }, [appsList, qpPortfolio]);

  // Pick an application:
  // 1) match exact app_regex if provided
  // 2) else if only one app in portfolio, use it
  // 3) else leave null (not found / ambiguous)
  const application = useMemo<Application | null>(() => {
    if (qpRegex) {
      const decoded = qpRegex;
      const exact = clientApps.find((a) => a.app_regex === decoded);
      if (exact) return exact;
      // Try decodeURIComponent in case encoded
      try {
        const alt = decodeURIComponent(decoded);
        const match = clientApps.find((a) => a.app_regex === alt);
        if (match) return match;
      } catch {
        // ignore
      }
    }
    if (clientApps.length === 1) return clientApps[0];
    return null;
  }, [clientApps, qpRegex]);

  // Derive zone details for this application
  const zone = useMemo<Zone | null>(() => {
    if (!application?.zone) return null;
    // If zones are cross-client, also filter by client from selection when available
    const all = (zonesList as Zone[]).filter((z) => !currentClient || z.client === currentClient);
    return all.find((z) => z.zone === application.zone) || null;
  }, [application?.zone, zonesList, currentClient]);

  // Compile regex to match builds that belong to this application (PRN-based)
  const appRegex = useMemo<RegExp | null>(() => {
    if (!application?.app_regex) return null;
    try {
      return new RegExp(application.app_regex);
    } catch {
      return null;
    }
  }, [application?.app_regex]);

  // Filter builds for this application
  const appBuilds = useMemo<AppDeploymentBuild[]>(() => {
    if (!appRegex) return [];
    return builds.filter((b) => {
      const candidates = [b.prn, b.app_prn, b.prn, b.portfolio_prn].filter(Boolean) as string[];
      return candidates.some((p) => appRegex.test(p));
    });
  }, [builds, appRegex]);

  // Derive branches (from branch_prn) and latest builds per branch
  type BranchRow = {
    branch: string;
    latestBuild: string;
    latestAt: string;
    status: string;
    totalBuilds: number;
  };

  const branches = useMemo<BranchRow[]>(() => {
    const map = new Map<string, AppDeploymentBuild[]>();

    appBuilds.forEach((b) => {
      const raw = b.branch_prn || "";
      // Try to extract branch name; fallback to full branch_prn
      let name = raw;
      if (raw.includes(":")) {
        const parts = raw.split(":");
        name = parts[parts.length - 1].trim() || raw;
      }
      const list = map.get(name) || [];
      list.push(b);
      map.set(name, list);
    });

    const rows: BranchRow[] = [];
    map.forEach((list, branch) => {
      const sorted = [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const latest = sorted[0];
      rows.push({
        branch,
        latestBuild: latest?.name || "—",
        latestAt: latest?.created_at || "",
        status: latest?.status || "—",
        totalBuilds: list.length,
      });
    });
    // Sort branches by latest timestamp desc
    rows.sort((a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime());
    return rows;
  }, [appBuilds]);

  const [isEditing, setIsEditing] = useState(false);

  const titleName = application?.name || (application?.app_regex ? "App (regex)" : "Application");
  const subtitle = application
    ? `portfolio: ${application.portfolio} • zone: ${application.zone} • region: ${application.region}`
    : "";

  // Not found / missing context
  if (!currentClient) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-12 text-center">
            <h3 className="text-lg font-semibold mb-2">No Client Selected</h3>
            <p className="text-muted-foreground mb-6">Select a client from the header to view application details.</p>
            <Button onClick={() => navigate("/applications")}>Go to Applications</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/applications">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Applications
            </Link>
          </Button>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <h3 className="text-lg font-semibold mb-2">Application Not Found</h3>
            <p className="text-muted-foreground">
              {qpPortfolio
                ? `No application found in portfolio “${qpPortfolio}”.`
                : "Specify portfolio and app_regex in the URL."}
            </p>
            <div className="mt-4">
              <Button variant="outline" onClick={() => navigate("/applications")}>
                Return to Applications
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/applications")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Applications
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <FolderOpen className="h-7 w-7 text-primary" />
              {titleName}
            </h1>
            <p className="text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {!isEditing ? (
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsEditing(false)}>Save</Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: App Information + Branches */}
        <div className="lg:col-span-2 space-y-6">
          {/* Application Information */}
          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5 text-primary" />
                Application Information
              </CardTitle>
              <CardDescription>Deployment unit configuration and placement</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Info label="Portfolio" value={<span className="font-mono">{application.portfolio}</span>} />
                <Info label="Zone" value={application.zone} />
                <Info label="Region" value={application.region} />
                <Info label="Environment" value={application.environment || "—"} />
                <Info label="Repository" value={application.repository || "—"} />
                <Info label="Enforce Validation" value={application.enforce_validation || "—"} />
              </div>
              <Separator />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Info
                  label="App Regex"
                  value={<span className="font-mono break-all">{application.app_regex}</span>}
                  mono
                />
                <Info label="Name" value={application.name || "—"} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Info label="Created" value={formatDateTime(application.created_at)} />
                <Info label="Updated" value={formatDateTime(application.updated_at)} />
              </div>
            </CardContent>
          </Card>

          {/* Branches and Builds */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5 text-primary" />
                Branches
              </CardTitle>
              <CardDescription>Latest build per branch (matched via app_regex)</CardDescription>
            </CardHeader>
            <CardContent>
              {buildsLoading && branches.length === 0 ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-8 w-full bg-muted/40 rounded-md animate-pulse" />
                  ))}
                </div>
              ) : branches.length === 0 ? (
                <div className="text-sm text-muted-foreground">No builds found for this app.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Branch</TableHead>
                      <TableHead>Latest Build</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Latest At</TableHead>
                      <TableHead className="text-right">Total Builds</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {branches.map((row) => (
                      <TableRow key={row.branch}>
                        <TableCell className="font-medium">{row.branch}</TableCell>
                        <TableCell className="font-mono text-sm">{row.latestBuild}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(row.status)}>{String(row.status || "").replace(/-/g, " ")}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{formatDateTime(row.latestAt)}</TableCell>
                        <TableCell className="text-right">{row.totalBuilds}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Deployment Target and Zone */}
        <div className="space-y-6">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="text-lg">Deployment Target</CardTitle>
              <CardDescription>Single zone target for this app</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Info label="Zone" value={application.zone} />
              <Info label="Environment" value={zone?.account_facts?.environment || application.environment || "—"} />
              <Info label="AWS Account ID" value={zone?.account_facts?.aws_account_id || "—"} />
              <Info
                label="Regions"
                value={
                  Object.keys(zone?.region_facts || {}).length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {Object.keys(zone!.region_facts).map((r) => (
                        <Badge key={r} variant="outline">
                          {r}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    "—"
                  )
                }
              />
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant={isDark ? "secondary" : "outline"}
                className="w-full justify-start gap-2"
                asChild
              >
                <Link to={`/deployments?application=${encodeURIComponent(application.name || application.app_regex)}`}>
                  <Activity className="h-4 w-4" />
                  View Deployments
                </Link>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                asChild
              >
                <Link to={`/portfolios/${encodeURIComponent(application.portfolio)}?client=${encodeURIComponent(currentClient)}`}>
                  <FolderOpen className="h-4 w-4" />
                  View Portfolio
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
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

function statusVariant(s?: string): "default" | "secondary" | "destructive" | "outline" {
  switch ((s || "").toLowerCase()) {
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