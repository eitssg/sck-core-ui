import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { ArrowLeft, Edit, Save, X, Briefcase, ExternalLink, Plus, Users, Clock, Activity, Globe, Tag, Link as LinkIcon, Network, Trash2, Mail, Phone, IdCard, PlusCircle, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
import type { Portfolio, Application } from "@/store/types";
import DashboardLayout from "@/components/DashboardLayout";

export default function PortfolioDetails() {
  const navigate = useNavigate();
  

  // Auth guard via authSlice
  const isAuthenticated = useSelector((s: RootState) => s.auth?.isAuthenticated) ?? false;
  useEffect(() => {
    if (!isAuthenticated) navigate("/login");
  }, [isAuthenticated, navigate]);

  // Route params: /portfolios/:portfolio
  const { portfolio: portfolioParam } = useParams<{ portfolio: string }>();

  // Redux-backed data
  const { selectedClient, portfolios, applications, actions } = useReduxData();
  const activeClient = useSelector((s: RootState) => (s as any)?.clients?.currentActiveClient ?? null) as string | null;
  const currentClient = useMemo(() => (typeof selectedClient === "string" && selectedClient)
    ? selectedClient
    : (typeof activeClient === "string" ? activeClient : null), [selectedClient, activeClient]);

  // Normalize data lists
  const portfoliosList = useMemo<Portfolio[]>(() => {
    const p: any = portfolios?.items;
    return Array.isArray(p) ? (p as Portfolio[]) : [];
  }, [portfolios?.items]);

  const appsList = useMemo<Application[]>(() => {
    const a: any = (applications as any)?.items ?? applications;
    return Array.isArray(a) ? (a as Application[]) : [];
  }, [applications]);

  // Ensure we have portfolio loaded; show a local loading state while fetching
  const [detailLoading, setDetailLoading] = useState(false);
  useEffect(() => {
    let cancelled = false;
    if (!currentClient || !portfolioParam) return;
    (async () => {
      try {
        setDetailLoading(true);
        await (actions.portfolios.fetchSingle(currentClient, portfolioParam, true) as any);
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => { cancelled = true };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentClient, portfolioParam]);

  // Select portfolio
  const portfolio = useMemo<Portfolio | null>(() => {
    if (!portfolioParam) return null;
    return portfoliosList.find((p) => p.portfolio === portfolioParam) || null;
  }, [portfoliosList, portfolioParam]);

  // Applications in this portfolio
  const portfolioApplications = useMemo<Application[]>(() => {
    if (!portfolio) return [];
    return appsList.filter((a) => a.portfolio === portfolio.portfolio);
  }, [appsList, portfolio]);

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorCtx, setEditorCtx] = useState<
    | { kind: "owner" | "technical_owner" | "business_owner"; index?: undefined; data: any }
    | { kind: "contact"; index: number; data: any }
    | null
  >(null);
  const [activeTab, setActiveTab] = useState<string>("overview");

  // Approvers state (grouped by sequence)
  type ApproverItem = {
    sequence: number;
    name: string;
    email?: string;
    roles?: string[];
    attributes?: Record<string, string>;
    depends_on?: number[];
    enabled: boolean;
  };
  type ApproverGroup = { sequence: number; items: ApproverItem[] };

  const computeApproverGroups = useCallback((list?: ApproverItem[] | null): ApproverGroup[] => {
    const arr = Array.isArray(list) ? list : [];
    const map = new Map<number, ApproverItem[]>();
    for (const a of arr) {
      const seq = typeof a.sequence === "number" ? a.sequence : 0;
      if (!map.has(seq)) map.set(seq, []);
      map.get(seq)!.push({ ...a });
    }
    const groups = Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([sequence, items]) => ({ sequence, items: items }));
    return groups;
  }, []);

  const [approverGroups, setApproverGroups] = useState<ApproverGroup[]>(computeApproverGroups((portfolio as any)?.approvers as any));
  useEffect(() => {
    setApproverGroups(computeApproverGroups((portfolio as any)?.approvers as any));
  }, [portfolio, computeApproverGroups]);

  const normalizeAndPersistApprovers = async (groups: ApproverGroup[]) => {
    // Reassign consecutive sequences starting at 1
    const normalized: ApproverItem[] = groups
      .map((g, idx) => g.items.map((it) => ({ ...it, sequence: idx + 1 })))
      .flat();
    setApproverGroups(groups.map((g, idx) => ({ sequence: idx + 1, items: g.items })));
    if (!currentClient) return;
    await actions.portfolios.patch(currentClient, portfolio.portfolio, { approvers: normalized } as any);
  };

  // Approver editor state
  const [approverEditorOpen, setApproverEditorOpen] = useState(false);
  const [approverEditorCtx, setApproverEditorCtx] = useState<null | { groupIndex?: number; itemIndex?: number; data?: Partial<ApproverItem> }>(null);
  const openNewApprover = () => { setApproverEditorCtx({ data: { enabled: true, name: "", email: "" } }); setApproverEditorOpen(true); };
  const openEditApprover = (groupIndex: number, itemIndex: number, data: ApproverItem) => { setApproverEditorCtx({ groupIndex, itemIndex, data }); setApproverEditorOpen(true); };

  const [formData, setFormData] = useState(() => ({
    project_name: portfolio?.project?.name || "",
    project_code: portfolio?.project?.code || "",
    project_description: portfolio?.project?.description || "",
    domain: portfolio?.domain || "",
    contacts: Array.isArray((portfolio as any)?.contacts) ? (portfolio as any).contacts.map((c: any) => ({
      name: c?.name || "",
      email: c?.email || "",
      enabled: typeof c?.enabled === "boolean" ? c.enabled : true,
      attributes: c?.attributes || undefined,
    })) : [],
  }));

  // Shared vCard attribute label suggestions (defaults + discovered keys)
  const defaultAttributeLabels = useMemo(
    () => [
      // Identity
      "Name",
      "GivenName",
      "MiddleName",
      "FamilyName",
      "Nickname",
      // Work
      "Title",
      "JobTitle",
      "Department",
      "Organization",
      "Company",
      "Role",
      "Team",
      "Manager",
      "Assistant",
      "Office",
      "Location",
      // Phones
      "Phone",
      "Mobile",
      "iPhone",
      "WorkPhone",
      "HomePhone",
      "MainPhone",
      "Fax",
      "WorkFax",
      "HomeFax",
      "Pager",
      "Extension",
      // Email
      "Email",
      "WorkEmail",
      "HomeEmail",
      "AltEmail",
      "iCloud",
      // Web / Social
      "Website",
      "URL",
      "Homepage",
      "Blog",
      "Profile",
      "LinkedIn",
      "Twitter",
      "GitHub",
      "Facebook",
      "Instagram",
      "Mastodon",
      // Messaging
      "Skype",
      "Slack",
      "Teams",
      "WhatsApp",
      "Telegram",
      "Signal",
      "WeChat",
      "QQ",
      "Line",
      // Address
      "Address",
      "Street",
      "City",
      "State",
      "Province",
      "Region",
      "PostalCode",
      "Zip",
      "Country",
      // Locale/Other
      "Timezone",
      "Language",
      // Dates
      "Birthday",
      "Anniversary",
      // Misc
      "Notes",
    ],
    []
  );

  const attributeSuggestions = useMemo(() => {
    const set = new Set<string>(defaultAttributeLabels);
    const addAttrs = (m: any) => {
      if (m && typeof m === "object") {
        Object.keys(m).forEach((k) => set.add(k));
      }
    };
    // From persisted portfolio
    addAttrs((portfolio as any)?.owner?.attributes);
    addAttrs((portfolio as any)?.business_owner?.attributes);
    addAttrs((portfolio as any)?.technical_owner?.attributes);
    (Array.isArray((portfolio as any)?.contacts) ? (portfolio as any).contacts : []).forEach((c: any) => addAttrs(c?.attributes));
    // From current edit form state
    (Array.isArray((formData as any)?.contacts) ? (formData as any).contacts : []).forEach((c: any) => addAttrs(c?.attributes));
    return Array.from(set);
  }, [defaultAttributeLabels, portfolio, formData]);

  // Sync form when portfolio changes
  useEffect(() => {
    setFormData({
      project_name: portfolio?.project?.name || "",
      project_code: portfolio?.project?.code || "",
      project_description: portfolio?.project?.description || "",
      domain: portfolio?.domain || "",
      contacts: Array.isArray((portfolio as any)?.contacts) ? (portfolio as any).contacts.map((c: any) => ({
        name: c?.name || "",
        email: c?.email || "",
        enabled: typeof c?.enabled === "boolean" ? c.enabled : true,
        attributes: c?.attributes || undefined,
      })) : [],
    });
  }, [portfolio]);

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
            {detailLoading ? (
              <>
                <h3 className="text-lg font-semibold mb-2">Loading Portfolio…</h3>
                <p className="text-muted-foreground mb-6">Fetching details for {portfolioParam}…</p>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold mb-2">Portfolio Not Found</h3>
                <p className="text-muted-foreground mb-6">The requested portfolio could not be found for client {currentClient}.</p>
              </>
            )}
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
        contacts: Array.isArray(formData.contacts)
          ? formData.contacts
              .filter((c) => (c.name || c.email))
              .map((c) => ({
                name: c.name || undefined,
                email: c.email || undefined,
                enabled: typeof c.enabled === "boolean" ? c.enabled : undefined,
                attributes: c.attributes || undefined,
              }))
          : undefined,
      };
      await actions.portfolios.patch(currentClient, portfolio.portfolio, patch);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  // Contacts editing helpers
  const addContact = () =>
    setFormData((s) => ({
      ...s,
      contacts: [...(s.contacts || []), { name: "", email: "", enabled: true }],
    }));
  const updateContact = (idx: number, field: "name" | "email" | "enabled" | "attributes", value: any) =>
    setFormData((s) => ({
      ...s,
      contacts: (s.contacts || []).map((c: any, i: number) => (i === idx ? { ...c, [field]: value } : c)),
    }));
  const removeContact = (idx: number) =>
    setFormData((s) => ({
      ...s,
      contacts: (s.contacts || []).filter((_: any, i: number) => i !== idx),
    }));

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

  // Open editor helpers
  const openEditOwner = (kind: "owner" | "technical_owner" | "business_owner", data: any) => {
    setEditorCtx({ kind, data: data || {} });
    setEditorOpen(true);
  };
  const openEditContact = (index: number, data: any) => {
    setEditorCtx({ kind: "contact", index, data: data || {} });
    setEditorOpen(true);
  };

  // Save from editor
  const handleEditorSave = async (payload: any, opts?: { remove?: boolean }) => {
    if (!editorCtx || !currentClient) return;
    const patch: any = {};
    if (editorCtx.kind === "contact") {
      const orig = Array.isArray((portfolio as any)?.contacts) ? (portfolio as any).contacts : [];
      if (opts?.remove) {
        patch.contacts = orig.filter((_: any, i: number) => i !== (editorCtx.index as number));
      } else {
        const updated = orig.map((c: any, i: number) => (i === (editorCtx.index as number) ? payload : c));
        patch.contacts = updated;
      }
    } else {
  // owner | technical_owner | business_owner
  patch[editorCtx.kind] = opts?.remove ? null : payload;
    }
    await actions.portfolios.patch(currentClient, portfolio.portfolio, patch);
    setEditorOpen(false);
    setEditorCtx(null);
  };

  const appStatCount = portfolioApplications.length;
  const lastUpdated = portfolio.updated_at ? new Date(portfolio.updated_at).toLocaleString() : "—";

  const envs = Array.from(new Set(portfolioApplications.map((a) => (a.environment || "").trim()).filter(Boolean)));
  const zones = Array.from(new Set(portfolioApplications.map((a) => a.zone).filter(Boolean)));

  return (
    <DashboardLayout
      activeItem="portfolios"
      pageTitle="Portfolio Information"
      pageSubtitle="Update metadata and basic information"
    >
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{portfolio.project?.name || portfolio.portfolio}</h1>
              <p className="text-muted-foreground">
                Portfolio: <span className="font-mono">{portfolio.portfolio}</span>
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button variant="secondary" onClick={() => setIsEditing(false)} className="gap-2">
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                  <Save className="h-4 w-4" />
                  {isSaving ? "Saving..." : "Save"}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setIsEditing(true)} className="gap-2">
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" disabled={isDeleting} className="gap-2">
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete portfolio “{portfolio.project?.name || portfolio.portfolio}”?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone and may affect associated applications.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
      {/* Tabbed details */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="contacts">Contacts</TabsTrigger>
        <TabsTrigger value="approvers">Approvers</TabsTrigger>
              <TabsTrigger value="compliance">Compliance</TabsTrigger>
              <TabsTrigger value="links">Links</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle>Portfolio</CardTitle>
                  <CardDescription>Overview and basic information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!isEditing ? (
                    <div className="space-y-4">
                      {(portfolio.category || portfolio.lifecycle_status) && (
                        <div className="flex gap-2 flex-wrap">
                          {portfolio.category && <Badge variant="secondary">{portfolio.category}</Badge>}
                          {portfolio.lifecycle_status && <Badge variant="outline">{portfolio.lifecycle_status}</Badge>}
                        </div>
                      )}
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-muted-foreground">Description</label>
                          <p className="text-foreground">{portfolio.project?.description || "No description provided"}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Domain</label>
                          <div className="mt-1 flex items-center gap-2">
                            <Globe className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{portfolio.domain || "—"}</span>
                          </div>
                        </div>
                      </div>

                      {portfolio.labels && portfolio.labels.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {portfolio.labels.map((l) => (
                            <Badge key={l} variant="outline" className="text-xs"><Tag className="h-3 w-3 mr-1" />{l}</Badge>
                          ))}
                        </div>
                      )}

                      {/* Domain moved next to Description above for wide screens */}

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
                      {/* Save/Cancel controls are shown in the page header while editing */}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Applications (Overview only) */}
              <Card className="shadow-soft mt-6">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-primary" />
                      Applications ({portfolioApplications.length})
                    </CardTitle>
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/applications/create`}>
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
                          onClick={() => navigate(`/applications/${encodeURIComponent(app.app_regex)}`)}
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
                          <Link to={`/applications/create`}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Application
                          </Link>
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="approvers">
              <Card className="shadow-soft">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Approvers</CardTitle>
                      <CardDescription>Define approval workflow and roles</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={openNewApprover} className="gap-1">
                      <PlusCircle className="h-4 w-4" /> Add Approver
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {approverGroups.length === 0 && (
                      <div className="text-sm text-muted-foreground">No approvers</div>
                    )}

                    {/* Helper: vertical drop zone component (visible, above/below rows) */}
                    {(() => {
                      const DropZone = ({ index }: { index: number }) => (
                        <div
                          className="h-8 my-2 rounded-md border-2 border-dashed border-transparent transition-colors"
                          onDragEnter={(e) => {
                            e.preventDefault();
                            const el = e.currentTarget as HTMLDivElement;
                            el.classList.add("border-primary", "bg-primary/20");
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            const el = e.currentTarget as HTMLDivElement;
                            el.classList.add("border-primary", "bg-primary/20");
                          }}
                          onDragLeave={(e) => {
                            const el = e.currentTarget as HTMLDivElement;
                            el.classList.remove("border-primary", "bg-primary/20");
                          }}
                          onDrop={(e) => {
                            const el = e.currentTarget as HTMLDivElement;
                            el.classList.remove("border-primary", "bg-primary/20");
                            // Group re-order
                            const gTxt = e.dataTransfer.getData("application/x-approver-group");
                            if (gTxt) {
                              const { gIdx: from } = JSON.parse(gTxt) as { gIdx: number };
                              let to = index;
                              const copy = approverGroups.map((g) => ({ sequence: g.sequence, items: [...g.items] }));
                              const [moved] = copy.splice(from, 1);
                              if (from < to) to = Math.max(0, to - 1);
                              copy.splice(to, 0, moved);
                              setApproverGroups(copy);
                              normalizeAndPersistApprovers(copy);
                              return;
                            }
                            // Item -> new step
                            const iTxt = e.dataTransfer.getData("application/x-approver-item");
                            if (iTxt) {
                              const { fromG, fromI } = JSON.parse(iTxt) as { fromG: number; fromI: number };
                              let to = index;
                              const copy = approverGroups.map((g) => ({ sequence: g.sequence, items: [...g.items] }));
                              const [item] = copy[fromG].items.splice(fromI, 1);
                              // Remove empty group if needed and adjust target index
                              if (copy[fromG].items.length === 0) {
                                copy.splice(fromG, 1);
                                if (fromG < to) to = Math.max(0, to - 1);
                              }
                              copy.splice(to, 0, { sequence: to + 1, items: [item] });
                              setApproverGroups(copy);
                              normalizeAndPersistApprovers(copy);
                            }
                          }}
                        />
                      );

                      return (
                        <>
                          {/* Top drop zone (before first group) */}
                          <DropZone index={0} />
                          {approverGroups.map((group, gIdx) => (
                            <>
                              <div key={`group-${gIdx}`} className="border rounded-lg">
                                {/* Group drag handle and header */}
                              <div
                                className="flex items-center gap-3 px-3 py-2 bg-muted/50 border-b cursor-move"
                                draggable
                                onDragStart={(e) => {
                                  e.dataTransfer.setData("application/x-approver-group", JSON.stringify({ gIdx }));
                                  e.dataTransfer.effectAllowed = "move";
                                }}
                              >
                                <GripVertical className="h-4 w-4 text-muted-foreground" />
                                <div className="text-sm font-medium">Step {gIdx + 1}</div>
                              </div>

                              {/* Items row and drop target to group approvers */}
                              <div
                                className="flex items-stretch gap-3 p-3 min-h-[64px]"
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                  const txt = e.dataTransfer.getData("application/x-approver-item");
                                  if (!txt) return;
                                  const { fromG, fromI } = JSON.parse(txt) as { fromG: number; fromI: number };
                                  const copy = approverGroups.map((g) => ({ sequence: g.sequence, items: [...g.items] }));
                                  const [item] = copy[fromG].items.splice(fromI, 1);
                                  copy[gIdx].items.push(item);
                                  // Remove empty groups
                                  const filtered = copy.filter((g) => g.items.length > 0);
                                  setApproverGroups(filtered);
                                  normalizeAndPersistApprovers(filtered);
                                }}
                              >
                                {group.items.map((a, iIdx) => (
                                  <div
                                    key={`a-${gIdx}-${iIdx}`}
                                    className="flex items-center gap-3 border rounded-md px-3 py-2 bg-card min-w-[260px]"
                                    draggable
                                    onDragStart={(e) => {
                                      e.dataTransfer.setData("application/x-approver-item", JSON.stringify({ fromG: gIdx, fromI: iIdx }));
                                      e.dataTransfer.effectAllowed = "move";
                                    }}
                                  >
                                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium truncate">{a.name || "(no name)"}</div>
                                      <div className="text-xs text-muted-foreground truncate">{a.email || ""}</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div className="flex items-center gap-2">
                                        <Switch
                                          id={`approver-enabled-${gIdx}-${iIdx}`}
                                          checked={!!a.enabled}
                                          onCheckedChange={async (v) => {
                                            const copy = approverGroups.map((g) => ({ sequence: g.sequence, items: g.items.map((it) => ({ ...it })) }));
                                            copy[gIdx].items[iIdx].enabled = v;
                                            setApproverGroups(copy);
                                            await normalizeAndPersistApprovers(copy);
                                          }}
                                          size="sm"
                                        />
                                      </div>
                                      <Button variant="ghost" size="icon" onClick={() => openEditApprover(gIdx, iIdx, a)}>
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              </div>
                              {/* Drop zone after each group (outside the bordered group) */}
                              <DropZone index={gIdx + 1} />
                            </>
                          ))}
                        </>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contacts">
              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle>Contacts</CardTitle>
                  <CardDescription>Owners and contact vCards</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Owner/Technical/Business vCards with labels */}
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Owner vCard</label>
                      <ContactVCard role="Owner" person={portfolio.owner as any} onEdit={() => openEditOwner("owner", portfolio.owner)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Technical Owner vCard</label>
                      <ContactVCard role="Technical Owner" person={portfolio.technical_owner as any} onEdit={() => openEditOwner("technical_owner", portfolio.technical_owner)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Business Owner vCard</label>
                      <ContactVCard role="Business Owner" person={portfolio.business_owner as any} onEdit={() => openEditOwner("business_owner", portfolio.business_owner)} />
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-border" />

                  {/* Contacts list manager */}
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-foreground">Contacts</div>
                    {isEditing && (
                      <Button variant="outline" size="sm" onClick={addContact} className="gap-1">
                        <PlusCircle className="h-4 w-4" /> Add Contact
                      </Button>
                    )}
                  </div>

                  {!isEditing ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {Array.isArray(portfolio.contacts) && portfolio.contacts.length > 0 ? (
                        portfolio.contacts.map((c: any, i: number) => (
                          <ContactVCard key={`${c.email || c.name || 'contact'}-${i}`} role={c.role || 'Contact'} person={c} onEdit={() => openEditContact(i, c)} />
                        ))
                      ) : (
                        <div className="text-sm text-muted-foreground">No contacts</div>
                      )}
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {(formData.contacts || []).map((c: any, i: number) => (
                        <div key={`edit-contact-${i}`} className="border rounded-lg p-4 bg-card">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 space-y-3">
                              <div className="space-y-1">
                                <Label className="text-xs">Name</Label>
                                <Input value={c.name} onChange={(e) => updateContact(i, "name", e.target.value)} placeholder="Full name" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Email</Label>
                                <Input value={c.email} onChange={(e) => updateContact(i, "email", e.target.value)} placeholder="name@company.com" />
                              </div>
                              <div className="flex items-center gap-2">
                                <Switch
                                  id={`enabled-${i}`}
                                  checked={!!c.enabled}
                                  onCheckedChange={(v) => updateContact(i, "enabled", v)}
                                  size="sm"
                                />
                                <Label htmlFor={`enabled-${i}`} className="text-xs">Enabled</Label>
                              </div>
                              {/* Simple attributes key/value while bulk editing */}
                              <AttributeEditor
                                rows={Object.entries(c.attributes || {}).map(([k, v]) => ({ key: k, value: String(v) }))}
                                onChange={(rows) => updateContact(i, "attributes", rows.reduce((acc: any, r) => { if (r.key) acc[r.key] = r.value; return acc; }, {}))}
                                suggestions={attributeSuggestions}
                                compact
                              />
                            </div>
                            <Button variant="outline" size="sm" onClick={() => removeContact(i)} className="gap-1">
                              <Trash2 className="h-4 w-4" />
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))}
                      {(formData.contacts || []).length === 0 && (
                        <div className="text-sm text-muted-foreground">No contacts</div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="compliance">
              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle>Compliance & Identifiers</CardTitle>
                  <CardDescription>Governance, risk, and identifiers</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-2">Compliance</h4>
                      <div className="space-y-1 text-sm">
                        {Object.entries(portfolio.compliance ?? {}).map(([k, v]) => (
                          <div key={k} className="flex items-center justify-between">
                            <span className="text-muted-foreground">{k}</span>
                            <span className="font-medium">{String(v)}</span>
                          </div>
                        ))}
                        {Object.keys(portfolio.compliance ?? {}).length === 0 && (
                          <div className="text-sm text-muted-foreground">No compliance info</div>
                        )}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Identifiers</h4>
                      <div className="space-y-1 text-sm">
                        {Object.entries(portfolio.identifiers ?? {}).map(([k, v]) => (
                          <div key={k} className="flex items-center justify-between">
                            <span className="text-muted-foreground">{k}</span>
                            <span className="font-medium">{String(v)}</span>
                          </div>
                        ))}
                        {Object.keys(portfolio.identifiers ?? {}).length === 0 && (
                          <div className="text-sm text-muted-foreground">No identifiers set</div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="links">
              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle>Links & Dependencies</CardTitle>
                  <CardDescription>Related systems and references</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Links</h4>
                    {Array.isArray(portfolio.links) ? (
                      <ul className="list-disc list-inside text-sm text-muted-foreground">
                        {portfolio.links.map((l: any, i: number) => (
                          <li key={i} className="flex items-center gap-2">
                            <LinkIcon className="h-3 w-3" />
                            <span>{l?.title || l?.name || l?.url || JSON.stringify(l)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-sm text-muted-foreground">No links</div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Dependencies</h4>
                    {Array.isArray(portfolio.dependencies) && portfolio.dependencies.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {portfolio.dependencies.map((d: any, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs"><Network className="h-3 w-3 mr-1" />{String(d)}</Badge>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">No dependencies</div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Portfolio Record Details moved here */}
              <div className="mt-6">
                <Card className="shadow-soft">
                  <CardHeader>
                    <CardTitle>Portfolio Record Details</CardTitle>
                    <CardDescription>System metadata for this record</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                        <p className="text-sm mt-1">{lastUpdated}</p>
                      </div>
                      {portfolio?.created_at && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Created</label>
                          <p className="text-sm mt-1">{new Date(portfolio.created_at as any).toLocaleString()}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
          {/* Applications moved inside Overview tab */}
        </div>

        {/* Sidebar: only show on Overview tab */}
        {activeTab === "overview" && (
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
          </div>
        )}
      </div>

      {/* Applications card is rendered within Overview tab above */}
      </div>
      {/* Contact Editor Sheet */}
      <ContactEditorSheet
        open={editorOpen}
        onOpenChange={setEditorOpen}
        context={editorCtx}
        onCancel={() => { setEditorOpen(false); setEditorCtx(null); }}
        onSave={handleEditorSave}
  suggestions={attributeSuggestions}
      />
      {/* Approver Editor Sheet */}
      <ApproverEditorSheet
        open={approverEditorOpen}
        onOpenChange={setApproverEditorOpen}
        context={approverEditorCtx}
        onCancel={() => { setApproverEditorOpen(false); setApproverEditorCtx(null); }}
        onSave={async (payload, opts) => {
          // payload: ApproverItem (partial allowed)
          const copy = approverGroups.map((g) => ({ sequence: g.sequence, items: g.items.map((it) => ({ ...it })) }));
          if (opts?.remove && approverEditorCtx && typeof approverEditorCtx.groupIndex === 'number' && typeof approverEditorCtx.itemIndex === 'number') {
            copy[approverEditorCtx.groupIndex].items.splice(approverEditorCtx.itemIndex, 1);
            const filtered = copy.filter((g) => g.items.length > 0);
            setApproverGroups(filtered);
            await normalizeAndPersistApprovers(filtered);
          } else if (approverEditorCtx && typeof approverEditorCtx.groupIndex === 'number' && typeof approverEditorCtx.itemIndex === 'number') {
            // edit existing
            const gi = approverEditorCtx.groupIndex;
            const ii = approverEditorCtx.itemIndex;
            copy[gi].items[ii] = { ...copy[gi].items[ii], ...payload } as ApproverItem;
            setApproverGroups(copy);
            await normalizeAndPersistApprovers(copy);
          } else {
            // new approver -> append as new group at end
            const item: ApproverItem = { sequence: copy.length + 1, enabled: true, name: '', email: '', ...payload } as ApproverItem;
            const next = [...copy, { sequence: copy.length + 1, items: [item] }];
            setApproverGroups(next);
            await normalizeAndPersistApprovers(next);
          }
          setApproverEditorOpen(false);
          setApproverEditorCtx(null);
        }}
        suggestions={attributeSuggestions}
      />
    </DashboardLayout>
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

/* Presentational helper: vCard for a contact */
function ContactVCard({
  role,
  person,
  onEdit,
}: {
  role: string;
  person?: { name?: string; email?: string; phone?: string } | null;
  onEdit?: () => void;
}) {
  const name = person?.name?.trim() || "";
  const email = person?.email?.trim() || "";
  const phone = person?.phone?.trim() || "";
  const isEmpty = !name && !email && !phone;

  if (isEmpty) {
    return (
      <div className="relative border rounded-lg p-6 bg-card text-card-foreground flex flex-col items-center justify-center text-center min-h-[112px]">
        {onEdit && (
          <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={onEdit}>
            <Edit className="h-4 w-4" />
          </Button>
        )}
        <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
          <IdCard className="h-5 w-5" />
        </div>
        <div className="mt-2 text-sm text-muted-foreground">No Contact</div>
        <div className="text-[11px] text-muted-foreground/80">{role}</div>
      </div>
    );
  }

  return (
    <div className="relative border rounded-lg p-4 bg-card text-card-foreground hover:bg-accent/30 transition-colors">
      {onEdit && (
        <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={onEdit}>
          <Edit className="h-4 w-4" />
        </Button>
      )}
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
          <IdCard className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="truncate">
              <div className="font-medium truncate">{name}</div>
              <div className="text-xs text-muted-foreground truncate">{role}</div>
            </div>
          </div>
          <div className="mt-3 space-y-1 text-sm">
            {email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a className="truncate hover:underline" href={`mailto:${email}`}>{email}</a>
              </div>
            )}
            {phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a className="truncate hover:underline" href={`tel:${phone}`}>{phone}</a>
              </div>
            )}
            {!email && !phone && (
              <div className="text-xs text-muted-foreground">No contact details</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* Attribute Editor component */
function AttributeEditor({
  rows,
  onChange,
  compact,
  suggestions,
}: {
  rows: { key: string; value: string }[];
  onChange: (rows: { key: string; value: string }[]) => void;
  compact?: boolean;
  suggestions?: string[];
}) {
  const baseLabels = [
  // Identity
  "Name",
  "GivenName",
  "MiddleName",
  "FamilyName",
  "Nickname",
  // Work
  "Title",
  "JobTitle",
  "Department",
  "Organization",
  "Company",
  "Role",
  "Team",
  "Manager",
  "Assistant",
  "Office",
  "Location",
  // Phones
  "Phone",
  "Mobile",
  "iPhone",
  "WorkPhone",
  "HomePhone",
  "MainPhone",
  "Fax",
  "WorkFax",
  "HomeFax",
  "Pager",
  "Extension",
  // Email
  "Email",
  "WorkEmail",
  "HomeEmail",
  "AltEmail",
  "iCloud",
  // Web / Social
  "Website",
  "URL",
  "Homepage",
  "Blog",
  "Profile",
  "LinkedIn",
  "Twitter",
  "GitHub",
  "Facebook",
  "Instagram",
  "Mastodon",
  // Messaging
  "Skype",
  "Slack",
  "Teams",
  "WhatsApp",
  "Telegram",
  "Signal",
  "WeChat",
  "QQ",
  "Line",
  // Address
  "Address",
  "Street",
  "City",
  "State",
  "Province",
  "Region",
  "PostalCode",
  "Zip",
  "Country",
  // Locale/Other
  "Timezone",
  "Language",
  // Dates
  "Birthday",
  "Anniversary",
  // Misc
  "Notes",
  ];

  const commonLabels = (Array.isArray(suggestions) && suggestions.length > 0) ? suggestions : baseLabels;

  const update = (i: number, field: "key" | "value", value: string) => {
    const copy = [...rows];
    copy[i] = { ...copy[i], [field]: value } as any;
    onChange(copy);
  };
  const add = () => onChange([...(rows || []), { key: "", value: "" }]);
  const remove = (i: number) => onChange((rows || []).filter((_, idx) => idx !== i));

  function AttributeRow({ index, r }: { index: number; r: { key: string; value: string } }) {
    const [open, setOpen] = useState(false);
    const filtered = (r.key ? commonLabels.filter((l) => l.toLowerCase().includes(r.key.toLowerCase())) : commonLabels).slice(0, 10);
    return (
      <div className="w-full">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              value={r.key}
              onChange={(e) => { update(index, "key", e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 120)}
              placeholder="Label"
              className="flex-1"
            />
            {open && filtered.length > 0 && (
              <div className="absolute z-30 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md max-h-44 overflow-auto">
                {filtered.map((l) => (
                  <button
                    type="button"
                    key={l}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { update(index, "key", l); setOpen(false); }}
                  >
                    {l}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Input
            value={r.value}
            onChange={(e) => update(index, "value", e.target.value)}
            placeholder="Value"
            className="flex-[2]"
          />
          <Button variant="outline" size="icon" onClick={() => remove(index)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {(rows || []).map((r, i) => (
        <AttributeRow key={`attr-${i}`} index={i} r={r} />
      ))}
      <Button variant="outline" size="sm" onClick={add} className="gap-1">
        <PlusCircle className="h-4 w-4" /> Add attribute
      </Button>
    </div>
  );
}

/* Contact Editor Sheet */
function ContactEditorSheet({
  open,
  onOpenChange,
  context,
  onCancel,
  onSave,
  suggestions,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  context: | { kind: "owner" | "technical_owner" | "business_owner"; index?: undefined; data: any } | { kind: "contact"; index: number; data: any } | null;
  onCancel: () => void;
  onSave: (payload: any, opts?: { remove?: boolean }) => Promise<void> | void;
  suggestions?: string[];
}) {
  const kind = context?.kind;
  const isContact = kind === "contact";
  const initial = context?.data || {};
  const [name, setName] = useState<string>(initial?.name || "");
  const [email, setEmail] = useState<string>(initial?.email || "");
  const [phone, setPhone] = useState<string>(initial?.phone || "");
  const [enabled, setEnabled] = useState<boolean>(initial?.enabled ?? true);
  const [attrs, setAttrs] = useState<{ key: string; value: string }[]>(
    Object.entries(initial?.attributes || {}).map(([k, v]) => ({ key: k, value: String(v) }))
  );

  useEffect(() => {
    const init = context?.data || {};
    setName(init?.name || "");
    setEmail(init?.email || "");
    setPhone(init?.phone || "");
    setEnabled(init?.enabled ?? true);
    setAttrs(Object.entries(init?.attributes || {}).map(([k, v]) => ({ key: k, value: String(v) })));
  }, [context]);

  const save = async () => {
    const attributes = attrs.reduce((acc: any, r) => { if (r.key) acc[r.key] = r.value; return acc; }, {} as any);
    const payload: any = isContact
      ? { name: name || undefined, email: email || undefined, enabled, attributes: Object.keys(attributes).length ? attributes : undefined }
      : { name: name || undefined, email: email || undefined, phone: phone || undefined, attributes: Object.keys(attributes).length ? attributes : undefined };
    await onSave(payload);
  };

  const remove = async () => {
    await onSave(isContact ? {} : null, { remove: true });
  };

  const title = isContact ? "Edit Contact" : kind === "owner" ? "Edit Owner" : kind === "technical_owner" ? "Edit Technical Owner" : "Edit Business Owner";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>Update vCard details and attributes</SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" />
            </div>
            {!isContact && (
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555-0123" />
              </div>
            )}
            {isContact && (
              <div className="flex items-center gap-2 mt-1">
                <Switch id="contact-enabled" checked={!!enabled} onCheckedChange={setEnabled} size="sm" />
                <Label htmlFor="contact-enabled" className="text-sm">Enabled</Label>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Attributes</Label>
            <AttributeEditor rows={attrs} onChange={setAttrs} suggestions={suggestions} />
          </div>
        </div>
        <SheetFooter className="mt-6 flex items-center justify-between">
          <div className="flex gap-2 items-center">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="link"
                  className="px-0 h-auto text-destructive/80 hover:text-destructive"
                >
                  Delete Contact
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{isContact ? "Delete contact?" : "Remove owner contact?"}</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. {isContact ? "The contact will be removed from this portfolio." : "This owner field will be cleared."}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Confirm
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onCancel} className="gap-2">
              <X className="h-4 w-4" /> Cancel
            </Button>
            <Button onClick={save} className="gap-2">
              <Save className="h-4 w-4" /> Save
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/* Approver Editor Sheet */
function ApproverEditorSheet({
  open,
  onOpenChange,
  context,
  onCancel,
  onSave,
  suggestions,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  context: null | { groupIndex?: number; itemIndex?: number; data?: Partial<{ name: string; email?: string; enabled: boolean; roles?: string[]; attributes?: Record<string, string> }> };
  onCancel: () => void;
  onSave: (payload: Partial<{ name: string; email?: string; enabled: boolean; roles?: string[]; attributes?: Record<string, string> }>, opts?: { remove?: boolean }) => Promise<void> | void;
  suggestions?: string[];
}) {
  const initial = context?.data || {};
  const [name, setName] = useState<string>(initial?.name || "");
  const [email, setEmail] = useState<string>(initial?.email || "");
  const [enabled, setEnabled] = useState<boolean>(initial?.enabled ?? true);
  const [rolesText, setRolesText] = useState<string>((initial?.roles || []).join(', '));
  const [attrs, setAttrs] = useState<{ key: string; value: string }[]>(
    Object.entries(initial?.attributes || {}).map(([k, v]) => ({ key: k, value: String(v) }))
  );

  useEffect(() => {
    const init = context?.data || {};
    setName(init?.name || "");
    setEmail(init?.email || "");
    setEnabled(init?.enabled ?? true);
    setRolesText(((init?.roles as string[] | undefined) || []).join(', '));
    setAttrs(Object.entries((init?.attributes as any) || {}).map(([k, v]) => ({ key: k, value: String(v) })));
  }, [context]);

  const save = async () => {
    const attributes = attrs.reduce((acc: any, r) => { if (r.key) acc[r.key] = r.value; return acc; }, {} as any);
    const roles = rolesText.split(',').map((s) => s.trim()).filter(Boolean);
    const payload: any = { name: name || undefined, email: email || undefined, enabled, roles: roles.length ? roles : undefined, attributes: Object.keys(attributes).length ? attributes : undefined };
    await onSave(payload);
  };

  const remove = async () => { await onSave({}, { remove: true }); };

  const isEditing = typeof context?.groupIndex === 'number' && typeof context?.itemIndex === 'number';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Edit Approver' : 'Add Approver'}</SheetTitle>
          <SheetDescription>Configure approver details and attributes</SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Switch id="approver-enabled" checked={!!enabled} onCheckedChange={setEnabled} size="sm" />
              <Label htmlFor="approver-enabled" className="text-sm">Enabled</Label>
            </div>
            <div className="space-y-1">
              <Label>Roles</Label>
              <Input value={rolesText} onChange={(e) => setRolesText(e.target.value)} placeholder="e.g. Security, Finance" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Attributes</Label>
            <AttributeEditor rows={attrs} onChange={setAttrs} suggestions={suggestions} />
          </div>
        </div>
        <SheetFooter className="mt-6 flex items-center justify-between">
          <div className="flex gap-2 items-center">
            {isEditing && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="link" className="px-0 h-auto text-destructive/80 hover:text-destructive">Delete Approver</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete approver?</AlertDialogTitle>
                    <AlertDialogDescription>This action cannot be undone. The approver will be removed from this workflow.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Confirm</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onCancel} className="gap-2"><X className="h-4 w-4" /> Cancel</Button>
            <Button onClick={save} className="gap-2"><Save className="h-4 w-4" /> Save</Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}