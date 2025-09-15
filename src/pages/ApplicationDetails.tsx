import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";

import { Code, Info as InfoIcon, PlusCircle, Trash2, Pencil, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

import { useReduxData } from "@/hooks/useReduxData";
import type { Application, Portfolio, Zone, Client } from "@/store/types";
import DashboardLayout from "@/components/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import { useAppDispatch } from "@/store";
import { fetchZonesPage, fetchZoneByKey } from "@/store/slices/zonesSlice";
import { buildApiUrl, getAuthHeaders } from "@/lib/api-config";

function formatDateTime(v?: string) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "—" : `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
}

export default function ApplicationDetails() {
  const navigate = useNavigate();
  const dispatchTyped = useAppDispatch();
  const { toast } = useToast();

  const { id: idFromPath, portfolio: portfolioParamFromPath } = useParams<{ id?: string; portfolio?: string }>();
  const [searchParams] = useSearchParams();
  const qpPortfolio = searchParams.get("portfolio") || portfolioParamFromPath || "";
  const qpRegex = searchParams.get("app_regex") || searchParams.get("regex") || searchParams.get("app") || idFromPath || "";

  const { selectedClient, portfolios, applications, actions } = useReduxData();
  const currentClient = useMemo(() => (typeof selectedClient === "string" ? selectedClient : ""), [selectedClient]);
  const clientObj = useSelector((s: RootState) => (s as any)?.clients?.byId?.[currentClient]) as Client | undefined;

  const portfoliosList = useMemo<Portfolio[]>(() => {
    const p: any = (portfolios as any)?.items;
    return Array.isArray(p) ? (p as Portfolio[]) : [];
  }, [portfolios]);

  const appsList = useMemo<Application[]>(() => {
    const a: any = (applications as any)?.items ?? applications;
    return Array.isArray(a) ? (a as Application[]) : [];
  }, [applications]);

  const zonesList = useSelector((s: RootState) => (s as any)?.zones?.zones ?? []) as Zone[];

  // Stabilize actions to avoid refetch loops when actions object identity changes
  const actionsRef = useRef(actions);
  useEffect(() => { actionsRef.current = actions; }, [actions]);
  useEffect(() => {
    if (!currentClient) return;
    const scopePortfolio = qpPortfolio || null;
    (actionsRef.current as any)?.applications?.fetch?.(currentClient, { portfolio: scopePortfolio, limit: 200 });
  }, [currentClient, qpPortfolio]);

  // const builds = useSelector((s: RootState) => (s as any)?.deployments?.builds ?? []) as AppDeploymentBuild[]; // not used

  const clientApps = useMemo<Application[]>(() => {
    const inClient = appsList;
    if (!qpPortfolio) return inClient;
    return inClient.filter((a) => a.portfolio === qpPortfolio);
  }, [appsList, qpPortfolio]);

  const application = useMemo<Application | null>(() => {
    if (qpRegex) {
      const decoded = qpRegex;
      const exact = clientApps.find((a) => a.app_regex === decoded);
      if (exact) return exact;
      try {
        const alt = decodeURIComponent(decoded);
        const match = clientApps.find((a) => a.app_regex === alt);
        if (match) return match;
  } catch (e) { /* ignore */ }
    }
    if (clientApps.length === 1) return clientApps[0];
    return null;
  }, [clientApps, qpRegex]);

  const zone = useMemo<Zone | null>(() => {
    if (!application?.zone) return null;
    return (zonesList as Zone[]).find((z) => z.zone === application.zone) || null;
  }, [application?.zone, zonesList]);

  const currentPortfolioObj = useMemo<Portfolio | null>(() => {
    const slug = qpPortfolio || application?.portfolio || "";
    if (!slug) return null;
    return portfoliosList.find((p) => p.portfolio === slug) || null;
  }, [portfoliosList, qpPortfolio, application?.portfolio]);

  const [isEditing, setIsEditing] = useState(false);
  const [editZone, setEditZone] = useState<string>(application?.zone || "");
  // environment deprecated — removed from UI/state
  const [editRegion, setEditRegion] = useState<string>(application?.region || "");
  const [editRepository, setEditRepository] = useState<string | undefined>(application?.repository || undefined);
  const [editEnforceValidation, setEditEnforceValidation] = useState<boolean>(coerceBool((application as any)?.enforce_validation));
  const [editTags, setEditTags] = useState<Record<string, string>>(() => ({ ...(application?.tags || {}) } as Record<string, string>));
  const [editMetadata, setEditMetadata] = useState<Record<string, string>>(() => ({ ...(application as any)?.metadata || {} }));
  const [editAppRegex, setEditAppRegex] = useState<string>(application?.app_regex || "");
  const [editName, setEditName] = useState<string>(application?.name || "");

  useEffect(() => {
    if (!isEditing) return;
    if (!currentClient) return;
    if (!Array.isArray(zonesList) || zonesList.length === 0) {
      dispatchTyped(fetchZonesPage({ client: currentClient, limit: 200, append: false }) as any);
    }
    const hasPolicy = Array.isArray((clientObj as any)?.tags_policy) || Array.isArray((clientObj as any)?.tag_policy);
    if (!hasPolicy) {
      (actions as any)?.clients?.fetchSingle?.(currentClient, true);
    }
  }, [isEditing, currentClient, zonesList, clientObj, actions, dispatchTyped]);

  const selectedZone: Zone | null = useMemo(() => {
    if (!editZone) return null;
    const z = (zonesList as Zone[]).find((zz) => zz.zone === editZone) || null;
    return z;
  }, [editZone, zonesList]);

  useEffect(() => {
    if (!currentClient || !editZone) return;
    if (!selectedZone || !selectedZone.region_facts) {
      dispatchTyped(fetchZoneByKey({ client: currentClient, zone: editZone }) as any);
    }
  }, [currentClient, editZone, selectedZone, dispatchTyped]);

  const regionAliases: string[] = useMemo(() => {
    const rf = selectedZone?.region_facts || {};
    return Object.keys(rf);
  }, [selectedZone?.region_facts]);

  useEffect(() => {
    if (!regionAliases || regionAliases.length === 0) return;
    if (!editRegion || !regionAliases.includes(editRegion)) {
      setEditRegion(regionAliases[0]);
    }
  }, [regionAliases, editRegion]);

  // environment options removed

  type UITagPolicy = { tag_name: string; required: boolean; description?: string };
  const tagPolicies: UITagPolicy[] = useMemo(() => {
    const raw: any = (clientObj as any)?.tags_policy ?? (clientObj as any)?.tag_policy;
    const arr = Array.isArray(raw) ? raw : [];
    return arr
      .map((p: any) => ({ tag_name: p?.tag_name ?? p?.name ?? "", required: !!p?.required, description: p?.description ?? "" }))
      .filter((p: UITagPolicy) => p.tag_name);
  }, [clientObj]);
  const requiredTagNames = useMemo(() => tagPolicies.filter(p => p.required).map(p => p.tag_name), [tagPolicies]);

  const inheritedTags = useMemo<Record<string, string>>(() => {
    const z = (selectedZone || zone) as Zone | null;
    const zTags = (z?.tags || {}) as Record<string, any>;
    const acctTags = ((z?.account_facts?.tags) || {}) as Record<string, any>;
    const pSlug = qpPortfolio || application?.portfolio || '';
    const pObj = portfoliosList.find((p) => p.portfolio === pSlug) || null;
    const pTags = (pObj?.tags || {}) as Record<string, any>;
    const cTags = (clientObj?.tags || {}) as Record<string, any>;
    return { ...cTags, ...pTags, ...zTags, ...acctTags } as Record<string, string>;
  }, [selectedZone, zone, qpPortfolio, application?.portfolio, portfoliosList, clientObj]);

  const onSave = async () => {
    const inheritedSet = new Set(Object.keys(inheritedTags || {}).map((s) => s.toLowerCase()));
    const appTagEntries = Object.entries(editTags || {});
    const appTagMapLC = new Map<string, string>(appTagEntries.map(([k, v]) => [k.toLowerCase(), String(v)]));
    const missing: string[] = [];
    (requiredTagNames || []).forEach((name) => {
      const lc = name.toLowerCase();
      if (inheritedSet.has(lc)) return;
      const val = appTagMapLC.get(lc);
      if (typeof val !== 'string' || val.trim() === '') missing.push(name);
    });
    if (missing.length > 0) {
      const lines = missing.map((n) => `⚠️ ${n} tag is required by tag policy`).join('\n');
      toast({ title: "Missing required tags", description: lines, variant: "destructive" });
      return;
    }

    try {
      if (!currentClient || !application) throw new Error('Missing client or application context');
  const client = currentClient;
  const portfolio = application.portfolio;
  // Use the canonical 'app' key for the {app} path parameter; fall back to app_regex if needed
  const appParam = (application as any)?.app || (application as any)?.app_regex;

  const basePath = `/api/v1/registry/clients/${encodeURIComponent(client)}/portfolios/${encodeURIComponent(portfolio)}/apps/${encodeURIComponent(appParam)}`;

      let existing: any = {};
      try {
        const resGet = await fetch(buildApiUrl(basePath), { headers: getAuthHeaders() });
        if (resGet.ok) {
          const j = await resGet.json().catch(() => null);
          existing = j?.data || {};
        }
  } catch (e) { /* ignore */ }

      const nextPayload: any = {
        ...existing,
        portfolio,
  app_regex: (application as any)?.app_regex,
  name: editName || undefined,
        region: editRegion || existing.region,
        zone: editZone || existing.zone,
        repository: editRepository || undefined,
        enforce_validation: editEnforceValidation ? 'true' : 'false',
        tags: { ...(editTags || {}) },
        metadata: { ...(editMetadata || {}) },
      };

      const resPut = await fetch(buildApiUrl(basePath), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(nextPayload),
      });
      if (!resPut.ok) {
        let msg = `Failed to update application (HTTP ${resPut.status})`;
        try {
          const j = await resPut.json();
          msg = j?.message || msg;
  } catch (e) { /* ignore */ }
        throw new Error(msg);
      }

  try { (actions as any)?.applications?.fetch?.(client, { portfolio, limit: 200 }); } catch (e) { /* ignore */ }

      setIsEditing(false);
  toast({ title: 'Application updated', description: `Saved changes to ${application.name || appParam}.` });
    } catch (e: any) {
      toast({ title: 'Save failed', description: e?.message || 'Unknown error', variant: 'destructive' });
    }
  };

  const onDelete = async () => {
    try {
      toast({ title: "Application deleted", description: application?.name || application?.app_regex || "" });
      navigate(-1);
    } catch (e: any) {
      toast({ title: "Delete failed", description: e?.message || "Unknown error", variant: "destructive" });
    }
  };

  const titleName = application?.name || (application?.app_regex ? "App (regex)" : "Application");
  const subtitle = application ? `portfolio: ${application.portfolio} • zone: ${application.zone} • region: ${application.region}` : "";

  if (!currentClient) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-12 text-center">
            <h3 className="text-lg font-semibold mb-2">No Client Selected</h3>
            <p className="text-muted-foreground mb-6">Select a client from the header to view application details.</p>
            <Button onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <h3 className="text-lg font-semibold mb-2">Application Not Found</h3>
            <p className="text-muted-foreground">
              {qpPortfolio ? `No application found in portfolio “${qpPortfolio}”.` : "Specify portfolio and app_regex in the URL."}
            </p>
            <div className="mt-4">
              <Button variant="outline" onClick={() => navigate("/dashboard")}>
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <DashboardLayout activeItem="applications" pageTitle={titleName} pageSubtitle={subtitle}>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-end gap-2">
          {!isEditing ? (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" aria-label="Edit application" onClick={() => setIsEditing(true)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" aria-label="Delete application">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete application?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently remove the application
                      {application?.name ? ` “${application.name}”` : ""}.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction asChild>
                      <Button variant="destructive" onClick={onDelete}>Delete</Button>
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
              <Button variant="default" onClick={onSave}>Save</Button>
            </>
          )}
        </div>

        <div className="space-y-6">
          <Card className="shadow-medium">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5 text-primary" />
                  Application Information
                </CardTitle>
                <CardDescription>Deployment unit configuration and placement</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isEditing ? (
                  <FormGrid>
                    <FormRow label="Portfolio"><div className="text-sm text-foreground">{application.portfolio}</div></FormRow>
                    <FormRow label="App Name"><div className="text-sm text-foreground">{application.name || "—"}</div></FormRow>
                    <FormRow label="App Regex"><div className="text-sm text-foreground font-mono break-all">{application.app_regex}</div></FormRow>
                    <FormRow label="Zone"><div className="text-sm text-foreground">{application.zone}</div></FormRow>
                    <FormRow label="Region"><div className="text-sm text-foreground">{application.region}</div></FormRow>
                    <FormRow label="Repository"><div className="text-sm text-foreground">{application.repository || "—"}</div></FormRow>
                    <FormRow label="Account"><div className="text-sm text-foreground">{(zone as any)?.account_facts?.aws_account_id || "—"}</div></FormRow>
                    <FormRow label="Enforce Validation"><div className="text-sm text-foreground">{coerceBool((application as any)?.enforce_validation) ? "Yes" : "No"}</div></FormRow>

                    <FormRow label="Tags">
                      <div className="mt-1 flex flex-wrap gap-2">
                        {Object.entries((application.tags || {}) as Record<string, any>).length === 0 ? (
                          <div className="text-xs text-muted-foreground">—</div>
                        ) : (
                          Object.entries((application.tags || {}) as Record<string, any>).map(([k, v], i) => (
                            <Badge key={`tag-${k}-${i}`} variant="secondary" className="gap-2">
                              <span>{String(k)}</span>
                              <span className="opacity-70">=</span>
                              <span>{String(v)}</span>
                            </Badge>
                          ))
                        )}
                      </div>
                    </FormRow>

                    <FormRow label="Metadata">
                      <div className="mt-1 flex flex-wrap gap-2">
                        {Object.entries((application.metadata || {}) as Record<string, any>).length === 0 ? (
                          <div className="text-xs text-muted-foreground">—</div>
                        ) : (
                          Object.entries((application.metadata || {}) as Record<string, any>).map(([k, v], i) => (
                            <Badge key={`meta-${k}-${i}`} variant="secondary" className="gap-2">
                              <span>{String(k)}</span>
                              <span className="opacity-70">=</span>
                              <span>{String(v)}</span>
                            </Badge>
                          ))
                        )}
                      </div>
                    </FormRow>

                    <FormRow label="Image Aliases">
                      <div className="mt-1 flex flex-wrap gap-2">
                        {Object.entries((application.image_aliases || {}) as Record<string, any>).length === 0 ? (
                          <div className="text-xs text-muted-foreground">—</div>
                        ) : (
                          Object.entries((application.image_aliases || {}) as Record<string, any>).map(([k, v], i) => (
                            <Badge key={`img-${k}-${i}`} variant="secondary" className="gap-2">
                              <span>{String(k)}</span>
                              <span className="opacity-70">=</span>
                              <span>{String(v)}</span>
                            </Badge>
                          ))
                        )}
                      </div>
                    </FormRow>
                  </FormGrid>
                ) : (
                  <FormGrid>
                    <FormRow label="Portfolio">
                      <Input value={application.portfolio} readOnly />
                    </FormRow>

                    <FormRow label="App Name">
                      <Input placeholder="Descriptive name" value={editName} onChange={(e) => setEditName(e.target.value)} />
                    </FormRow>

                    <FormRow label="App Regex">
                      <Input placeholder="e.g., myapp-.*" value={editAppRegex} onChange={(e) => setEditAppRegex(e.target.value)} />
                    </FormRow>

                    <FormRow label="Zone">
                      <div className="flex items-center gap-2">
                        <Select value={editZone ?? ""} onValueChange={(v) => setEditZone(v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select zone" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.isArray(zonesList) && zonesList.map((z) => (
                              <SelectItem
                                key={`${z.client}/${z.zone}`}
                                value={z.zone}
                                textValue={z.zone}
                                data-acct-label={z?.account_facts?.aws_account_id ? `Acct: ${z.account_facts.aws_account_id}` : ''}
                                className="flex flex-col items-start h-auto py-2 after:content-[attr(data-acct-label)] after:block after:text-xs after:text-muted-foreground after:mt-1"
                              >
                                {z.zone}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedZone && renderZoneEnvBadge(selectedZone)}
                      </div>
                    </FormRow>

                    <FormRow label="Region">
                      <Select value={editRegion ?? ""} onValueChange={(v) => setEditRegion(v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select region" />
                        </SelectTrigger>
                        <SelectContent>
                          {regionAliases.map((r) => (
                            <SelectItem key={r} value={r}>{r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormRow>

                    {/* Environment removed (deprecated) */}

                    <FormRow label="Enforce Validation">
                      <div className="flex items-center gap-2">
                        <Checkbox checked={!!editEnforceValidation} onCheckedChange={(val) => setEditEnforceValidation(Boolean(val))} aria-label="Toggle enforce validation" />
                        <span className="text-sm text-muted-foreground">Enforce Validation</span>
                      </div>
                    </FormRow>

                    <FormRow label="Repository">
                      <Input placeholder="https://..." value={editRepository || ""} onChange={(e) => setEditRepository(e.target.value)} />
                    </FormRow>

                    <FormRow label="Metadata">
                      <TagEditor title="Metadata" values={editMetadata} onChange={setEditMetadata} helpText={<p>These values will be added to deployment context for use in your templates</p>} hideHeader />
                    </FormRow>

                    <FormRow label="Tags">
                      <TagEditor values={editTags} onChange={setEditTags} policies={tagPolicies} requiredNames={requiredTagNames} inherited={inheritedTags} hideHeader />
                    </FormRow>

                    <FormRow label="Tags from Zone">
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(((selectedZone || zone)?.tags || {}) as Record<string, any>).length === 0 ? (
                          <div className="text-xs text-muted-foreground">No tags found</div>
                        ) : (
                          Object.entries(((selectedZone || zone)?.tags || {}) as Record<string, any>).map(([key, val], idx) => (
                            <Badge key={`${key}-${idx}`} variant="secondary" className="gap-2">
                              <span>{String(key)}</span>
                              <span className="opacity-70">=</span>
                              <span>{String(val)}</span>
                            </Badge>
                          ))
                        )}
                      </div>
                    </FormRow>

                    <FormRow label="Tags from Account">
                      <div className="flex flex-wrap gap-2">
                        {Object.entries((((selectedZone || zone)?.account_facts?.tags) || {}) as Record<string, any>).length === 0 ? (
                          <div className="text-xs text-muted-foreground">No tags found</div>
                        ) : (
                          Object.entries((((selectedZone || zone)?.account_facts?.tags) || {}) as Record<string, any>).map(([key, val], idx) => (
                            <Badge key={`${key}-${idx}`} variant="secondary" className="gap-2">
                              <span>{String(key)}</span>
                              <span className="opacity-70">=</span>
                              <span>{String(val)}</span>
                            </Badge>
                          ))
                        )}
                      </div>
                    </FormRow>

                    <FormRow label="Tags from Portfolio">
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(((currentPortfolioObj?.tags || {}) as Record<string, any>)).length === 0 ? (
                          <div className="text-xs text-muted-foreground">No tags found</div>
                        ) : (
                          Object.entries(((currentPortfolioObj?.tags || {}) as Record<string, any>)).map(([key, val], idx) => (
                            <Badge key={`${key}-${idx}`} variant="secondary" className="gap-2">
                              <span>{String(key)}</span>
                              <span className="opacity-70">=</span>
                              <span>{String(val)}</span>
                            </Badge>
                          ))
                        )}
                      </div>
                    </FormRow>

                    <FormRow label="Tags from Client">
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(((clientObj?.tags || {}) as Record<string, any>)).length === 0 ? (
                          <div className="text-xs text-muted-foreground">No tags found</div>
                        ) : (
                          Object.entries(((clientObj?.tags || {}) as Record<string, any>)).map(([key, val], idx) => (
                            <Badge key={`${key}-${idx}`} variant="secondary" className="gap-2">
                              <span>{String(key)}</span>
                              <span className="opacity-70">=</span>
                              <span>{String(val)}</span>
                            </Badge>
                          ))
                        )}
                      </div>
                    </FormRow>
                  </FormGrid>
                )}
              </CardContent>
            </Card>
        </div>

  <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="text-lg">Audit</CardTitle>
            <CardDescription>Timestamps</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Info label="Created" value={formatDateTime(application.created_at)} />
            <Info label="Updated" value={formatDateTime(application.updated_at)} />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function FormGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[max-content_1fr] gap-y-3 sm:gap-x-8 items-start">
      {children}
    </div>
  );
}

function FormRow({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="contents">
  <div className="text-sm font-medium text-muted-foreground whitespace-nowrap text-left pr-4">{label}</div>
      <div className="w-full text-left">{children}</div>
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

function renderZoneEnvBadge(z: Zone) {
  const env = mapZoneEnv(z);
  const envLabel = env?.toUpperCase() || '-';
  const badgeVariant = env === 'PROD' ? 'destructive' : env === 'NPROD' ? 'default' : env === 'DEV' ? 'secondary' : 'secondary';
  return <Badge variant={badgeVariant as any} className="uppercase">{envLabel}</Badge>;
}

function mapZoneEnv(z: Zone): 'PROD' | 'NPROD' | 'DEV' | '' {
  const raw = (z?.account_facts?.environment ?? '').toString().trim().toLowerCase();
  if (["production", "prod", "prd"].includes(raw)) return 'PROD';
  if (["nonprod", "non-production", "non production", "nprod", "nprd"].includes(raw)) return 'NPROD';
  if (["dev", "development"].includes(raw)) return 'DEV';
  return '';
}

// normalizeEnvOption removed (environment deprecated)

function coerceBool(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') return ['true','1','yes','y','on'].includes(v.trim().toLowerCase());
  return true;
}

function TagEditor({ values, onChange, policies, requiredNames, inherited, title = "Tags", helpText, hideHeader = false }: { values: Record<string, string>; onChange: (next: Record<string, string>) => void; policies?: { tag_name: string; required: boolean; description?: string }[]; requiredNames?: string[]; inherited?: Record<string, string>; title?: string; helpText?: React.ReactNode; hideHeader?: boolean }) {
  const options = useMemo(
    () => Array.from(new Set((policies || []).map((p) => String(p.tag_name || "")).filter(Boolean))),
    [policies]
  );
  const requiredSet = useMemo(() => new Set((requiredNames || []).map((s) => s.toLowerCase())), [requiredNames]);
  const inheritedSet = useMemo(() => new Set(Object.keys(inherited || {}).map((s) => s.toLowerCase())), [inherited]);

  useEffect(() => {
    const next = { ...values } as Record<string, string>;
    let changed = false;
    (requiredNames || []).forEach((name) => {
      const lc = name.toLowerCase();
      if (inheritedSet.has(lc)) return;
      if (!(name in next)) {
        next[name] = next[name] ?? "";
        changed = true;
      }
    });
    if (changed) onChange(next);
  }, [requiredNames, inheritedSet, onChange, values]);

  const rows = useMemo(() => Object.entries(values).map(([key, value]) => ({ key, value })), [values]);
  const updateRow = (i: number, field: "key" | "value", val: string) => {
    const entries = Object.entries(values);
    const [k, v] = entries[i] || ["", ""];
    if (field === "key") {
      const nk = val;
      const next: Record<string, string> = {};
      entries.forEach(([ek, ev], idx) => {
        if (idx === i) {
          if (nk) next[nk] = v;
        } else next[ek] = ev;
      });
      onChange(next);
    } else {
      const next = { ...values, [k]: val };
      onChange(next);
    }
  };
  const removeRow = (i: number) => {
    const entries = Object.entries(values);
    const [k] = entries[i] || [""];
    const isReq = requiredSet.has(k.toLowerCase()) && !inheritedSet.has(k.toLowerCase());
    if (isReq) return;
    const next = { ...values } as Record<string, string>;
    delete next[k];
    onChange(next);
  };

  const [newKey, setNewKey] = useState("");
  const [newVal, setNewVal] = useState("");
  const [open, setOpen] = useState(false);
  const filtered = useMemo(() => {
    const q = newKey.trim().toLowerCase();
    return (q ? options.filter((o) => o.toLowerCase().includes(q)) : options).slice(0, 100);
  }, [newKey, options]);
  const addRow = () => {
    const k = newKey.trim();
    if (!k) return;
    const next = { ...values } as Record<string, string>;
    next[k] = newVal;
    onChange(next);
    setNewKey("");
    setNewVal("");
  };

  return (
    <div className="space-y-2">
      {!hideHeader && (
        <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <span>{title}</span>
          <Popover>
            <PopoverTrigger asChild>
              <button type="button" aria-label={`${title} help`} className="inline-flex items-center text-muted-foreground hover:text-foreground">
                <InfoIcon className="h-4 w-4" />
              </button>
            </PopoverTrigger>
            {helpText ? (
              <PopoverContent align="start" className="max-w-md text-sm leading-relaxed">{helpText}</PopoverContent>
            ) : (
              <PopoverContent align="start" className="max-w-md text-sm leading-relaxed">
                <p>Tags are inhereted. Tag policy may require tags be defined in your app. Replacement variables are allowed. Popular examples are {'{{'} context.Branch {'}}'} and {'{{'} context.Build {'}}'}. See documentation for details.</p>
              </PopoverContent>
            )}
          </Popover>
        </div>
      )}
      <div className="space-y-2">
        {rows.length === 0 && <div className="text-xs text-muted-foreground">No tags</div>}
        {rows.map((r, i) => {
          const req = requiredSet.has(r.key.toLowerCase()) && !inheritedSet.has(r.key.toLowerCase());
          return (
            <div key={`tag-${i}`} className="flex items-center gap-2">
              <div className="relative flex-1">
                <Input value={r.key} onChange={(e) => updateRow(i, "key", e.target.value)} onKeyDown={(e) => e.stopPropagation()} onKeyUp={(e) => e.stopPropagation()} placeholder="Label" />
              </div>
              <Input value={r.value} onChange={(e) => updateRow(i, "value", e.target.value)} onKeyDown={(e) => e.stopPropagation()} onKeyUp={(e) => e.stopPropagation()} placeholder="Value" className="flex-[2]" />
              <Button variant="outline" size="icon" onClick={() => removeRow(i)} disabled={req} title={req ? "Required tag cannot be removed" : "Remove tag"}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input value={newKey} onChange={(e) => { setNewKey(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 120)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRow(); setOpen(false); } }} onKeyUp={(e) => e.stopPropagation()} placeholder="Label" />
            {open && filtered.length > 0 && (
              <div className="absolute z-30 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md max-h-44 overflow-auto">
                {filtered.map((l) => (
                  <button type="button" key={l} className="w-full text-left px-3 py-2 text-sm hover:bg-accent" onMouseDown={(e) => e.preventDefault()} onClick={() => { setNewKey(l); setOpen(false); }}>
                    {l}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Input value={newVal} onChange={(e) => setNewVal(e.target.value)} onKeyDown={(e) => e.stopPropagation()} onKeyUp={(e) => e.stopPropagation()} placeholder="Value" className="flex-[2]" />
          <Button variant="outline" size="icon" onClick={addRow} title="Add tag">
            <PlusCircle className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}