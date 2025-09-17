import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";

import { Code, Info as InfoIcon, PlusCircle, Trash2, Pencil, ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import EnvBadge from "@/components/ui/env-badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

import { useReduxData } from "@/hooks/useReduxData";
import { portfolioDetailsPath } from "@/lib/routes";
import type { Application, Portfolio, Zone, Client } from "@/store/types";
// DashboardLayout removed for single-card form layout
import { useToast } from "@/hooks/use-toast";
import { useAppDispatch } from "@/store";
import { fetchZonesPage, fetchZoneByKey } from "@/store/slices/zonesSlice";
import { fetchApplications, fetchApplicationDetail, updateApplication, deleteApplication, selectApplicationByKey, patchPortfolioAppCount } from "@/store/slices/applicationsSlice";

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
  // Use only path parameters (no query params): portfolio and app slug
  const routePortfolio = portfolioParamFromPath || "";
  const routeApp = idFromPath || "";

  const { selectedClient, portfolios, actions } = useReduxData();
  const currentClient = useMemo(() => (typeof selectedClient === "string" ? selectedClient : ""), [selectedClient]);
  const clientObj = useSelector((s: RootState) => (s as any)?.clients?.byId?.[currentClient]) as Client | undefined;

  const portfoliosList = useMemo<Portfolio[]>(() => {
    const p: any = (portfolios as any)?.items;
    return Array.isArray(p) ? (p as Portfolio[]) : [];
  }, [portfolios]);

  const zonesList = useSelector((s: RootState) => (s as any)?.zones?.zones ?? []) as Zone[];

  // const builds = useSelector((s: RootState) => (s as any)?.deployments?.builds ?? []) as AppDeploymentBuild[]; // not used

  // Always select the full application record by key from Redux; do not fallback to list items
  const applicationFromStore = useSelector((s: RootState) => (routePortfolio && routeApp ? selectApplicationByKey(s, routePortfolio, routeApp) : undefined)) as Application | undefined;
  const application = useMemo<Application | null>(() => (applicationFromStore || null), [applicationFromStore]);

  // On open, hydrate the full app record via store thunk to ensure all fields are available
  const lastFetchedKeyRef = useRef<string>("");
  useEffect(() => {
    if (!currentClient) return;
    const appParam = routeApp;
    const portfolioSlug = routePortfolio;
    if (!appParam || !portfolioSlug) return;
    const key = `${currentClient}::${portfolioSlug}::${appParam}`;
    if (lastFetchedKeyRef.current === key) return;
    lastFetchedKeyRef.current = key;
    dispatchTyped(fetchApplicationDetail({ client: currentClient, portfolio: portfolioSlug, app: appParam }) as any);
  }, [currentClient, routePortfolio, routeApp, dispatchTyped]);

  const zone = useMemo<Zone | null>(() => {
    if (!application?.zone) return null;
    return (zonesList as Zone[]).find((z) => z.zone === application.zone) || null;
  }, [application?.zone, zonesList]);

  const currentPortfolioObj = useMemo<Portfolio | null>(() => {
    const slug = routePortfolio || application?.portfolio || "";
    if (!slug) return null;
    return portfoliosList.find((p) => p.portfolio === slug) || null;
  }, [portfoliosList, routePortfolio, application?.portfolio]);

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
  // Hidden env field (derived from selected zone); not displayed
  const [editEnvironment, setEditEnvironment] = useState<string>((application as any)?.environment || "");

  // When entering edit mode (or when the application record changes while editing),
  // hydrate all edit fields from the current application so inputs aren't blank.
  useEffect(() => {
    if (!isEditing || !application) return;
    setEditZone(application.zone || "");
    setEditRegion(application.region || "");
    setEditRepository(application.repository || undefined);
    setEditEnforceValidation(coerceBool((application as any)?.enforce_validation));
    setEditTags({ ...((application?.tags || {}) as Record<string, string>) });
    setEditMetadata({ ...(((application as any)?.metadata || {}) as Record<string, string>) });
    setEditAppRegex(application.app_regex || "");
    setEditName(application.name || "");
  // Initialize environment from current zone when entering edit (canonical: prd/nprd/dev)
    const initEnv = mapZoneEnv(zone as Zone) || normalizeEnvString((application as any)?.environment) || "";
    setEditEnvironment(initEnv);
  }, [isEditing, application, zone]);

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

  // Keep hidden environment field in sync with selected zone (canonical lowercase)
  useEffect(() => {
    if (!isEditing) return;
    const env = mapZoneEnv((selectedZone || zone) as Zone);
    if (env) setEditEnvironment(env);
  }, [isEditing, selectedZone, zone]);

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

  // Region-level tags for current zone + selected alias (used in edit + view computations)
  const selectedRegionAlias = useMemo(() => (isEditing ? editRegion : (application?.region || '')),
    [isEditing, editRegion, application?.region]);
  const regionTags = useMemo<Record<string, any>>(() => {
    const z = (selectedZone || zone) as Zone | null;
    if (!z || !z.region_facts) return {};
    const rf = z.region_facts as unknown as Record<string, any>;
    const alias = selectedRegionAlias || '';
    const entry = (alias && rf && typeof rf === 'object') ? (rf[alias] || {}) : {};
    const tags = (entry?.tags || {}) as Record<string, any>;
    return tags;
  }, [selectedZone, zone, selectedRegionAlias]);

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
    const pSlug = routePortfolio || application?.portfolio || '';
    const pObj = portfoliosList.find((p) => p.portfolio === pSlug) || null;
    const pTags = (pObj?.tags || {}) as Record<string, any>;
    const cTags = (clientObj?.tags || {}) as Record<string, any>;
    // Precedence (low → high) excluding app layer: region → zone → account → portfolio → client
    return { ...regionTags, ...zTags, ...acctTags, ...pTags, ...cTags } as Record<string, string>;
  }, [selectedZone, zone, regionTags, routePortfolio, application?.portfolio, portfoliosList, clientObj]);

  // View-mode resolved tags: app.tags overlaid by zone -> account -> portfolio -> client (later wins)
  const resolvedTags = useMemo<Record<string, string>>(() => {
    const base = { ...((application?.tags || {}) as Record<string, any>) } as Record<string, string>;
    const z = (selectedZone || zone) as Zone | null;
    const zTags = (z?.tags || {}) as Record<string, any>;
    const acctTags = ((z?.account_facts?.tags) || {}) as Record<string, any>;
    const pSlug = routePortfolio || application?.portfolio || '';
    const pObj = portfoliosList.find((p) => p.portfolio === pSlug) || null;
    const pTags = (pObj?.tags || {}) as Record<string, any>;
    const cTags = (clientObj?.tags || {}) as Record<string, any>;
    // Merge order (lowest to highest priority): app -> region -> zone -> account -> portfolio -> client
    return { ...base, ...regionTags, ...zTags, ...acctTags, ...pTags, ...cTags } as Record<string, string>;
  }, [application?.tags, regionTags, selectedZone, zone, routePortfolio, application?.portfolio, portfoliosList, clientObj]);


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
  const appParam = routeApp || (application as any)?.app;

      const existing = application as any;
      const nextPayload: any = {
        ...existing,
        portfolio,
        // Persist the edited regex; server validates and stores as AppRegex
        app_regex: editAppRegex || (application as any)?.app_regex,
        name: editName || undefined,
        region: editRegion || existing.region,
        zone: editZone || existing.zone,
        repository: editRepository || undefined,
        enforce_validation: editEnforceValidation ? 'true' : 'false',
  // Set environment from selected zone (hidden field)
  environment: editEnvironment || undefined,
        tags: { ...(editTags || {}) },
        metadata: { ...(editMetadata || {}) },
      };

    const actionResult: any = await dispatchTyped(updateApplication({ client, portfolio, app: appParam, payload: nextPayload }) as any);
      if (actionResult?.meta?.requestStatus !== 'fulfilled') {
        throw new Error(actionResult?.payload || 'Update failed');
      }

  // Refresh applications list for this portfolio so PortfolioDetails reflects changes
  await dispatchTyped(fetchApplications({ client, portfolio, limit: 200 }) as any);
  // Optionally update backend app_count from current list snapshot
  await dispatchTyped(patchPortfolioAppCount({ client, portfolio }) as any);

      setIsEditing(false);
  toast({ title: 'Application updated', description: `Saved changes to ${application.name || appParam}.` });
    } catch (e: any) {
      toast({ title: 'Save failed', description: e?.message || 'Unknown error', variant: 'destructive' });
    }
  };

  const onDelete = async () => {
    try {
      if (!currentClient || !application) throw new Error('Missing client or application context');
      const client = currentClient;
      const portfolio = application.portfolio;
      const appParam = routeApp || (application as any)?.app;
      const result: any = await dispatchTyped(deleteApplication({ client, portfolio, app: appParam }) as any);
      if (result?.meta?.requestStatus !== 'fulfilled') {
        throw new Error(result?.payload || 'Delete failed');
      }
  // Update portfolio app_count after confirmed delete
  await dispatchTyped(patchPortfolioAppCount({ client, portfolio }) as any);
      toast({ title: "Application deleted", description: application?.name || (application as any)?.app || "" });
      navigate(-1);
    } catch (e: any) {
      toast({ title: "Delete failed", description: e?.message || "Unknown error", variant: "destructive" });
    }
  };

  // Using Card header/description for titles; no DashboardLayout titles

  if (!currentClient) {
    return (
  <div className="sck-form-container space-y-6">
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
  <div className="sck-form-container space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <h3 className="text-lg font-semibold mb-2">Loading application…</h3>
            <p className="text-muted-foreground">Fetching application details. This may take a moment.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
  <div className="sck-form-container space-y-6 animate-fade-in">
        {/* Top bar: Back link (left) and actions (right) */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate(portfolioDetailsPath({ portfolio: application.portfolio }))}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Portfolio
            </Button>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {isEditing ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
                <Button size="sm" onClick={onSave}>Save</Button>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
        <Card className="shadow-medium">
              <CardHeader className="flex flex-row items-start gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="h-5 w-5 text-primary" />
                    Application Information
                  </CardTitle>
                  <CardDescription>Deployment unit configuration and placement</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isEditing ? (
                  <FormGrid>
                    <FormRow label="Portfolio"><div className="text-sm text-foreground">{application.portfolio}</div></FormRow>
                    <FormRow label="App Name"><div className="text-sm text-foreground">{application.name || "—"}</div></FormRow>
                    <FormRow label="Pipeline Reference Number Regex"><div className="text-sm text-foreground font-mono break-all">{application.app_regex}</div></FormRow>
                    <FormRow label="Zone">
                      <div className="text-sm text-foreground flex items-center gap-2">
                        <span>{application.zone}</span>
                        {zone && <EnvBadge zone={zone} />}
                      </div>
                    </FormRow>
                    <FormRow label="Region"><div className="text-sm text-foreground">{application.region}</div></FormRow>
                    <FormRow label="Repository">
                      <div className="text-sm text-foreground flex items-center gap-2">
                        <span className="break-all">{application.repository || "—"}</span>
                        {application.repository ? (
                          <a
                            href={application.repository}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Open repository"
                            className="inline-flex"
                          >
                            <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                          </a>
                        ) : null}
                      </div>
                    </FormRow>
                    <FormRow label="Account"><div className="text-sm text-foreground">{(zone as any)?.account_facts?.aws_account_id || "—"}</div></FormRow>
                    <FormRow label="Enforce Validation"><div className="text-sm text-foreground">{coerceBool((application as any)?.enforce_validation) ? "Yes" : "No"}</div></FormRow>

                    <FormRow label="Tags">
                      <div className="mt-1 flex flex-wrap gap-2">
                        {Object.entries((resolvedTags || {}) as Record<string, any>).length === 0 ? (
                          <div className="text-xs text-muted-foreground">—</div>
                        ) : (
                          Object.entries((resolvedTags || {}) as Record<string, any>).map(([k, v], i) => (
                            <Badge key={`tag-${k}-${i}`} variant="secondary" className="gap-2">
                              <span>{String(k)}</span>
                              <span className="opacity-70">=</span>
                              <span className="break-all">{String(v)}</span>
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

                    <FormRow label="Pipeline Reference Number Regex">
                      <Input placeholder="e.g., PRN-.*" value={editAppRegex} onChange={(e) => setEditAppRegex(e.target.value)} />
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
                        {selectedZone && <EnvBadge zone={selectedZone} />}
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

                    <FormRow label="Tags">
                      <TagEditor values={editTags} onChange={setEditTags} policies={tagPolicies} requiredNames={requiredTagNames} inherited={inheritedTags} hideHeader />
                    </FormRow>

                    <FormRow label="Tags from Region">
                      <div className="flex flex-wrap gap-2">
                        {Object.entries((regionTags || {}) as Record<string, any>).length === 0 ? (
                          <div className="text-xs text-muted-foreground">No tags found</div>
                        ) : (
                          Object.entries((regionTags || {}) as Record<string, any>).map(([key, val], idx) => (
                            <Badge key={`${key}-${idx}`} variant="secondary" className="gap-2">
                              <span>{String(key)}</span>
                              <span className="opacity-70">=</span>
                              <span>{String(val)}</span>
                            </Badge>
                          ))
                        )}
                      </div>
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

                    <FormRow label="Metadata">
                      <TagEditor title="Metadata" values={editMetadata} onChange={setEditMetadata} helpText={<p>These values will be added to deployment context for use in your templates</p>} hideHeader />
                    </FormRow>
                  </FormGrid>
                )}
              </CardContent>
              {/* Footer actions removed; Save/Cancel are in the top-right */}
            </Card>

        <Card className="shadow-soft">
          <CardContent className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Info label="Created" value={formatDateTime(application.created_at)} />
            <Info label="Updated" value={formatDateTime(application.updated_at)} />
          </CardContent>
        </Card>
    </div>
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
  const badgeVariant: "destructive" | "default" | "secondary" | "outline" =
    env === 'prd' ? 'destructive' : env === 'nprd' ? 'default' : env === 'dev' ? 'secondary' : 'secondary';
  return <Badge variant={badgeVariant} className="uppercase">{env || '-'}</Badge>;
}

function mapZoneEnv(z: Zone): 'prd' | 'nprd' | 'dev' | '' {
  const raw = (z?.account_facts?.environment ?? '').toString().trim().toLowerCase();
  if (["production", "prod", "prd"].includes(raw)) return 'prd';
  if (["nonprod", "non-production", "non production", "nprod", "nprd"].includes(raw)) return 'nprd';
  if (["dev", "development"].includes(raw)) return 'dev';
  return '';
}

// normalizeEnvOption removed (environment deprecated)

// Normalize a raw env string to canonical values
function normalizeEnvString(raw?: string | null): 'prd' | 'nprd' | 'dev' | '' {
  const s = (raw || '').toString().trim().toLowerCase();
  if (["production", "prod", "prd"].includes(s)) return 'prd';
  if (["nonprod", "non-production", "non production", "nprod", "nprd"].includes(s)) return 'nprd';
  if (["dev", "development"].includes(s)) return 'dev';
  return '';
}

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
    const needle = newKey.trim().toLowerCase();
    if (!needle) return [] as string[];
    const existing = new Set(Object.keys(values).map((k) => k.toLowerCase()));
    return options
      .filter((o) => o.toLowerCase().includes(needle))
      .filter((o) => !existing.has(o.toLowerCase()));
  }, [newKey, options, values]);
  const addRow = () => {
    const k = newKey.trim();
    if (!k) return;
    const next = { ...values, [k]: newVal } as Record<string, string>;
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