import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { ArrowLeft, Edit, Save, X, Briefcase, ExternalLink, Plus, Users, Clock, Activity, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { useReduxData } from "@/hooks/useReduxData";
import { useTheme } from "@/hooks/useTheme";
import type { Portfolio, Application } from "@/store/types";

export default function PortfolioDetails() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isDark } = useTheme();

  // Auth guard via authSlice
  const isAuthenticated = useSelector((s: RootState) => s.auth?.isAuthenticated) ?? false;
  useEffect(() => {
    if (!isAuthenticated) navigate("/login");
  }, [isAuthenticated, navigate]);

  // Route params: /portfolios/:portfolio?client=<slug>
  const { portfolio: portfolioParam } = useParams<{ portfolio: string }>();

  // Redux-backed data
  const { selectedClient, portfolios, applications, actions } = useReduxData();

  const currentClient = useMemo(() => {
    return searchParams.get("client") || (typeof selectedClient === "string" ? selectedClient : null);
  }, [searchParams, selectedClient]);

  // Normalize data lists
  const portfoliosList = useMemo<Portfolio[]>(() => {
    const p: any = portfolios?.items;
    return Array.isArray(p) ? (p as Portfolio[]) : [];
  }, [portfolios?.items]);

  const appsList = useMemo<Application[]>(() => {
    const a: any = (applications as any)?.items ?? applications;
    return Array.isArray(a) ? (a as Application[]) : [];
  }, [applications]);

  // Ensure we have portfolio loaded
  useEffect(() => {
    if (!currentClient || !portfolioParam) return;
    const exists = portfoliosList.some((p) => p.client === currentClient && p.portfolio === portfolioParam);
    if (!exists) {
      actions.portfolios.fetchSingle(currentClient, portfolioParam, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentClient, portfolioParam]);

  // Select portfolio
  const portfolio = useMemo<Portfolio | null>(() => {
    if (!currentClient || !portfolioParam) return null;
    return portfoliosList.find((p) => p.client === currentClient && p.portfolio === portfolioParam) || null;
  }, [portfoliosList, currentClient, portfolioParam]);

  // Applications in this portfolio
  const portfolioApplications = useMemo<Application[]>(() => {
    if (!portfolio) return [];
    return appsList.filter((a) => a.portfolio === portfolio.portfolio);
  }, [appsList, portfolio]);

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState(() => ({
    project_name: portfolio?.project?.name || "",
    project_code: portfolio?.project?.code || "",
    project_description: portfolio?.project?.description || "",
    domain: portfolio?.domain || "",
  }));

  // Sync form when portfolio changes
  useEffect(() => {
    setFormData({
      project_name: portfolio?.project?.name || "",
      project_code: portfolio?.project?.code || "",
      project_description: portfolio?.project?.description || "",
      domain: portfolio?.domain || "",
    });
  }, [portfolio?.project?.name, portfolio?.project?.code, portfolio?.project?.description, portfolio?.domain]);

  if (!currentClient) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Card>
          <CardContent className="p-12 text-center">
            <h3 className="text-lg font-semibold mb-2">No Client Selected</h3>
            <p className="text-muted-foreground mb-6">Select a client from the header to view portfolio details.</p>
            <Button onClick={() => navigate("/portfolios")}>Go to Portfolios</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/portfolios">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Portfolios
            </Link>
          </Button>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <h3 className="text-lg font-semibold mb-2">Portfolio Not Found</h3>
            <p className="text-muted-foreground mb-6">The requested portfolio could not be found for client {currentClient}.</p>
            <Button asChild>
              <Link to="/portfolios">Return to Portfolios</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Save PATCH using slice action
  const handleSave = async () => {
    if (!currentClient) return;
    setIsSaving(true);
    try {
      // Build minimal patch payload aligned to model
      const patch = {
        project: {
          name: formData.project_name || undefined,
          code: formData.project_code || undefined,
          description: formData.project_description || undefined,
        },
        domain: formData.domain || undefined,
      };
      await actions.portfolios.patch(currentClient, portfolio.portfolio, patch);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!currentClient) return;
    setIsDeleting(true);
    try {
      await actions.portfolios.remove(currentClient, portfolio.portfolio);
      navigate("/portfolios");
    } finally {
      setIsDeleting(false);
    }
  };

  const appStatCount = portfolioApplications.length;
  const lastUpdated = portfolio.updated_at ? new Date(portfolio.updated_at).toLocaleString() : "—";

  const envs = Array.from(new Set(portfolioApplications.map((a) => (a.environment || "").trim()).filter(Boolean)));
  const zones = Array.from(new Set(portfolioApplications.map((a) => a.zone).filter(Boolean)));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/portfolios")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{portfolio.project?.name || portfolio.portfolio}</h1>
            <p className="text-muted-foreground">
              Client: <span className="font-mono">{portfolio.client}</span> • Portfolio:{" "}
              <span className="font-mono">{portfolio.portfolio}</span>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Portfolio
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Portfolio Information */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                Portfolio Information
              </CardTitle>
              <CardDescription>Update metadata and basic information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isEditing ? (
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-foreground">{portfolio.project?.name || portfolio.portfolio}</h2>
                      <p className="text-sm text-muted-foreground">{portfolio.project?.code || "—"}</p>
                    </div>
                    <Badge variant="secondary" className="uppercase">
                      {envs.length > 0 ? envs.join(", ") : "no-env"}
                    </Badge>
                  </div>
                  <p className="text-foreground">{portfolio.project?.description || "No description provided"}</p>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Domain</label>
                      <div className="mt-1 flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{portfolio.domain || "—"}</span>
                        {portfolio.domain && (
                          <Button asChild size="sm" variant={isDark ? "secondary" : "outline"} className="ml-auto">
                            <a href={`https://${portfolio.domain}`} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4 mr-1" />
                              Open
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                      <p className="text-sm mt-1">{lastUpdated}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FieldEdit
                      id="project_name"
                      label="Project Name"
                      value={formData.project_name}
                      onChange={(v) => setFormData((s) => ({ ...s, project_name: v }))}
                      placeholder="Portfolio display name"
                    />
                    <FieldEdit
                      id="project_code"
                      label="Project Code"
                      value={formData.project_code}
                      onChange={(v) => setFormData((s) => ({ ...s, project_code: v }))}
                      placeholder="Internal code"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="project_description">Description</Label>
                    <Textarea
                      id="project_description"
                      rows={3}
                      value={formData.project_description}
                      onChange={(e) => setFormData((s) => ({ ...s, project_description: e.target.value }))}
                      placeholder="Describe this portfolio"
                    />
                  </div>

                  <FieldEdit
                    id="domain"
                    label="Domain"
                    value={formData.domain}
                    onChange={(v) => setFormData((s) => ({ ...s, domain: v }))}
                    placeholder="example.com"
                  />
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border">
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">{appStatCount}</div>
                  <div className="text-sm text-muted-foreground">Applications</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">{envs.length}</div>
                  <div className="text-sm text-muted-foreground">Environments</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">{zones.length}</div>
                  <div className="text-sm text-muted-foreground">Zones</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">{lastUpdated !== "—" ? 1 : 0}</div>
                  <div className="text-sm text-muted-foreground">Updated</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Applications */}
          <Card className="shadow-soft">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-primary" />
                  Applications ({portfolioApplications.length})
                </CardTitle>
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/applications/create?client=${portfolio.client}&portfolio=${portfolio.portfolio}`}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Application
                  </Link>
                </Button>
              </div>
              <CardDescription>Applications that belong to this portfolio</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {portfolioApplications.map((app) => {
                  const env = app.environment || "unknown";
                  const sub = `${app.region} • ${app.zone}`;
                  return (
                    <div
                      key={`${app.portfolio}:${app.app_regex}:${app.region}:${app.zone}`}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                      onClick={() => navigate(`/applications/${encodeURIComponent(app.app_regex)}?client=${portfolio.client}&portfolio=${portfolio.portfolio}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Briefcase className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-medium text-foreground">{app.name || app.app_regex}</h4>
                          <p className="text-sm text-muted-foreground">{sub}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={env === "production" ? "destructive" : "secondary"}>{env}</Badge>
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  );
                })}
              </div>

              {portfolioApplications.length === 0 && (
                <div className="text-center py-8">
                  <Briefcase className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-medium text-foreground">No applications</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Get started by creating your first application.</p>
                  <div className="mt-6">
                    <Button variant="outline" asChild>
                      <Link to={`/applications/create?client=${portfolio.client}&portfolio=${portfolio.portfolio}`}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Application
                      </Link>
                    </Button>
                  </div>
                </div>
              )}
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
              <Button variant="outline" className="w-full justify-start" asChild>
                <a
                  href={portfolio.domain ? `https://${portfolio.domain}` : "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Visit Domain
                </a>
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Users className="mr-2 h-4 w-4" />
                Manage Members
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Activity className="mr-2 h-4 w-4" />
                View Analytics
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Last changes and updates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-center py-4">
                  <Clock className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">No recent activity</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Portfolio Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full" disabled={isDeleting}>
                    Delete Portfolio
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the portfolio
                      and may affect associated applications.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete Portfolio
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* Presentational helper */
function FieldEdit({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}