import { useEffect, useMemo, useState, useCallback, useRef, Fragment } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { ArrowLeft, Edit, Save, X, Briefcase, ExternalLink, Plus, Users, Clock, Activity, Globe, Tag, Link as LinkIcon, Network, Trash2, Mail, Phone, IdCard, PlusCircle, GripVertical, ArrowDown, MoreHorizontal, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { useApiHeaders } from "@/hooks/useApiHeaders";
import SecureImg from "@/components/SecureImg";

export default function PortfolioDetails() {
  const navigate = useNavigate();
  const { getAuthHeaders } = useApiHeaders();
  

  // Auth guard via authSlice: avoid redirect if refresh token exists (refresh may be in-flight)
  const isAuthenticated = useSelector((s: RootState) => s.auth?.isAuthenticated) ?? false;
  const hasRefreshToken = useMemo(() => {
    try { return Boolean(sessionStorage.getItem('refresh_token')); } catch { return false; }
  }, []);
  // Pages must never navigate to /login. If unauth and no refresh token, render nothing.
  const blockRender = !isAuthenticated && !hasRefreshToken;

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
  // Icon editor dialog
  const [iconDialogOpen, setIconDialogOpen] = useState(false);
  const [iconDraft, setIconDraft] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  // Preview state no longer needs a cache-buster; Response headers are no-cache

  const triggerFilePicker = () => fileInputRef.current?.click();

  const handleIconFileChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    try {
      const file = e.target.files?.[0];
      if (!file || !currentClient || !portfolio) return;
      setUploadingIcon(true);
      setUploadError(null);

      // 1) Request a presigned PUT URL from API
    const initRes = await fetch(
        `/api/v1/registry/clients/${encodeURIComponent(currentClient)}/portfolios/${encodeURIComponent(portfolio.portfolio)}/icon/upload`,
        {
          method: "POST",
      headers: { ...getAuthHeaders() },
          body: JSON.stringify({
            fileName: file.name,
            contentType: file.type || "application/octet-stream",
            fileSize: file.size,
          }),
        }
      );
      const initJson = await initRes.json().catch(() => ({}));
      if (!initRes.ok || initJson?.status === "error") {
        throw new Error(initJson?.message || initJson?.data || `Upload init failed (${initRes.status})`);
      }

      const payload = initJson?.data ?? initJson; // API responses are wrapped with {status, data}
      const uploadUrl: string = payload.uploadUrl;
      const headers: Record<string, string> = payload.headers || {};
      const iconUrl: string = payload.iconUrl; // redirecting GET endpoint

      // 2) Upload file directly to S3 via presigned PUT
      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": headers["Content-Type"] || file.type || "application/octet-stream",
          "Cache-Control": headers["Cache-Control"] || "public, max-age=31536000, immutable",
        },
        body: file,
      });
      if (!putRes.ok) throw new Error(`S3 upload failed (${putRes.status})`);

  // 3) Store canonical redirect URL
  setIconDraft(iconUrl || "");
    } catch (err: any) {
      setUploadError(err?.message || "Upload failed");
    } finally {
      setUploadingIcon(false);
      if (e.target) e.target.value = ""; // reset input to allow same file re-pick
    }
  };

  const handleIconDialogSave = () => {
    setFormData((s) => ({ ...s, icon_url: iconDraft || "" }));
    setIconDialogOpen(false);
  };
  // Compliance & Identifiers edit state
  const [isComplianceEditing, setIsComplianceEditing] = useState(false);
  const [complianceRows, setComplianceRows] = useState<{ key: string; value: string }[]>([]);
  const [identifierRows, setIdentifierRows] = useState<{ key: string; value: string }[]>([]);
  // Structured compliance and identifiers forms
  const KNOWN_COMPLIANCE_KEYS = [
    "data_classification",
    "handles_pii",
    "pii_types",
    "encryption_at_rest",
    "encryption_in_transit",
    "encryption_algorithms",
    "compliance_standards",
    "audit_logging",
    "audit_log_retention_days",
    "accessibility_standard",
  ] as const;
  const KNOWN_IDENTIFIER_KEYS = [
    "license",
    "spdx_id",
    "license_url",
    "sbom_url",
    "issue_tracker_url",
    "documentation_url",
    "artifact_registry",
    "docker_image",
    "npm_package",
    "pypi_package",
    "maven_coordinates",
    "cicd_pipeline_url",
  ] as const;

  type ComplianceForm = {
    data_classification: string;
    handles_pii: boolean;
    pii_types_csv: string; // comma-separated
    encryption_at_rest: boolean;
    encryption_in_transit: boolean;
    encryption_algorithms: string;
    standards_csv: string; // comma-separated
    audit_logging: boolean;
    audit_log_retention_days: string; // store as string; convert to number on save
    accessibility_standard: string;
  };
  type IdentifiersForm = {
    license: string;
    spdx_id: string;
    license_url: string;
    sbom_url: string;
    issue_tracker_url: string;
    documentation_url: string;
    artifact_registry: string;
    docker_image: string;
    npm_package: string;
    pypi_package: string;
    maven_coordinates: string;
    cicd_pipeline_url: string;
  };

  const [complianceForm, setComplianceForm] = useState<ComplianceForm>(() => ({
    data_classification: "",
    handles_pii: false,
    pii_types_csv: "",
    encryption_at_rest: true,
    encryption_in_transit: true,
    encryption_algorithms: "",
    standards_csv: "",
    audit_logging: true,
    audit_log_retention_days: "90",
    accessibility_standard: "",
  }));
  const [identifiersForm, setIdentifiersForm] = useState<IdentifiersForm>(() => ({
    license: "",
    spdx_id: "",
    license_url: "",
    sbom_url: "",
    issue_tracker_url: "",
    documentation_url: "",
    artifact_registry: "",
    docker_image: "",
    npm_package: "",
    pypi_package: "",
    maven_coordinates: "",
    cicd_pipeline_url: "",
  }));

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
  const [dragActive, setDragActive] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    if (!dragActive) return;
    const body = document.body;
    const prevOverflow = body.style.overflow;
    const prevTouchAction = (body.style as any).touchAction;
    const prevOverscroll = (body.style as any).overscrollBehavior;
    body.style.overflow = "hidden";
    (body.style as any).touchAction = "none";
    (body.style as any).overscrollBehavior = "contain";
    return () => {
      body.style.overflow = prevOverflow;
      (body.style as any).touchAction = prevTouchAction;
      (body.style as any).overscrollBehavior = prevOverscroll;
    };
  }, [dragActive]);
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
    // Top-level Portfolio
    name: portfolio?.name || "",
    portfolio_version: (portfolio as any)?.portfolio_version || "",
    icon_url: (portfolio as any)?.icon_url || "",
    // Domain
    domain: portfolio?.domain || "",
    // Project
    project_name: portfolio?.project?.name || "",
    project_code: portfolio?.project?.code || "",
    project_description: portfolio?.project?.description || "",
    project_repository: portfolio?.project?.repository || "",
    // Bizapp (optional parallel to project)
    bizapp_name: (portfolio as any)?.bizapp?.name || "",
    bizapp_code: (portfolio as any)?.bizapp?.code || "",
    bizapp_description: (portfolio as any)?.bizapp?.description || "",
    bizapp_repository: (portfolio as any)?.bizapp?.repository || "",
    // Contacts (unchanged)
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
      "PreferredName",
      "Nickname",
      "Pronouns",
      "EmployeeId",
      // Work
      "Title",
      "JobTitle",
      "Role",
      "Seniority",
      "Department",
      "Division",
      "Organization",
      "Company",
      "BusinessUnit",
      "CostCenter",
      "Team",
      "Squad",
      "Tribe",
      "Manager",
      "ManagerEmail",
      "Assistant",
      "Office",
      "Location",
      "Building",
      "Floor",
      "Room",
      "Desk",
      "WorkHours",
      "Schedule",
      // Phones
      "Phone",
      "Mobile",
      "iPhone",
      "WorkPhone",
      "HomePhone",
      "MainPhone",
      "DirectLine",
      "AltPhone",
      "Fax",
      "WorkFax",
      "HomeFax",
      "Pager",
      "Extension",
      "SIP",
      // Email
      "Email",
      "WorkEmail",
      "HomeEmail",
      "AltEmail",
      "PersonalEmail",
      "iCloud",
      // Web / Social / Profiles
      "Website",
      "URL",
      "Homepage",
      "Portfolio",
      "Resume",
      "Blog",
      "Profile",
      "LinkedIn",
      "Twitter",
      "X",
      "Facebook",
      "Instagram",
      "TikTok",
      "GitHub",
      "GitLab",
      "Bitbucket",
      "StackOverflow",
      "Reddit",
      "YouTube",
      "Vimeo",
      "Dribbble",
      "Behance",
      "Twitch",
      "Discord",
      "Mastodon",
      "Bluesky",
      "Threads",
      // Messaging / IM
      "Skype",
      "SkypeId",
      "Slack",
      "Teams",
      "WhatsApp",
      "Telegram",
      "Signal",
      "WeChat",
      "QQ",
      "Line",
      "Zoom",
      "GoogleMeet",
      "Webex",
      // Address
      "Address",
      "Address2",
      "POBox",
      "Street",
      "City",
      "State",
      "Province",
      "Region",
      "County",
      "PostalCode",
      "Zip",
      "Country",
      "CountryCode",
      "Latitude",
      "Longitude",
      // Locale/Other
      "Timezone",
      "Language",
      "Locale",
      // Dates
      "Birthday",
      "Anniversary",
      "StartDate",
      "HireDate",
      "LastPromotion",
      // People / Relationships
      "EmergencyContact",
      "EmergencyPhone",
      "Mentor",
      "Buddy",
      // Misc / Useful
      "Notes",
      "Bio",
      "Interests",
      "Skills",
      "Certifications",
      "Clearance",
      "SecurityLevel",
      "OktaUsername",
      "ADUsername",
      "SSHKey",
      "PGPKey",
      "Calendly",
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
      name: portfolio?.name || "",
      portfolio_version: (portfolio as any)?.portfolio_version || "",
      icon_url: (portfolio as any)?.icon_url || "",
      domain: portfolio?.domain || "",
      project_name: portfolio?.project?.name || "",
      project_code: portfolio?.project?.code || "",
      project_description: portfolio?.project?.description || "",
      project_repository: portfolio?.project?.repository || "",
      bizapp_name: (portfolio as any)?.bizapp?.name || "",
      bizapp_code: (portfolio as any)?.bizapp?.code || "",
      bizapp_description: (portfolio as any)?.bizapp?.description || "",
      bizapp_repository: (portfolio as any)?.bizapp?.repository || "",
      contacts: Array.isArray((portfolio as any)?.contacts) ? (portfolio as any).contacts.map((c: any) => ({
        name: c?.name || "",
        email: c?.email || "",
        enabled: typeof c?.enabled === "boolean" ? c.enabled : true,
        attributes: c?.attributes || undefined,
      })) : [],
    });
  }, [portfolio]);

  // Sync compliance/identifiers editor rows when portfolio changes
  useEffect(() => {
    const c = (portfolio?.compliance ?? {}) as any;
    setComplianceRows(Object.entries(c).map(([k, v]) => ({ key: k, value: String(v) })));
    setComplianceForm({
      data_classification: String(c?.data_classification ?? ""),
      handles_pii: Boolean(c?.handles_pii ?? false),
      pii_types_csv: Array.isArray(c?.pii_types) ? (c.pii_types as string[]).join(", ") : String(c?.pii_types ?? ""),
      encryption_at_rest: c?.encryption_at_rest !== undefined ? Boolean(c.encryption_at_rest) : true,
      encryption_in_transit: c?.encryption_in_transit !== undefined ? Boolean(c.encryption_in_transit) : true,
      encryption_algorithms: String(c?.encryption_algorithms ?? ""),
      standards_csv: Array.isArray(c?.compliance_standards) ? (c.compliance_standards as string[]).join(", ") : String(c?.compliance_standards ?? ""),
      audit_logging: c?.audit_logging !== undefined ? Boolean(c.audit_logging) : true,
      audit_log_retention_days: String(c?.audit_log_retention_days ?? "90"),
      accessibility_standard: String(c?.accessibility_standard ?? ""),
    });

    const idObj = (portfolio?.identifiers ?? {}) as any;
    setIdentifierRows(Object.entries(idObj).map(([k, v]) => ({ key: k, value: String(v) })));
    setIdentifiersForm({
      license: String(idObj?.license ?? ""),
      spdx_id: String(idObj?.spdx_id ?? ""),
      license_url: String(idObj?.license_url ?? ""),
      sbom_url: String(idObj?.sbom_url ?? ""),
      issue_tracker_url: String(idObj?.issue_tracker_url ?? ""),
      documentation_url: String(idObj?.documentation_url ?? ""),
      artifact_registry: String(idObj?.artifact_registry ?? ""),
      docker_image: String(idObj?.docker_image ?? ""),
      npm_package: String(idObj?.npm_package ?? ""),
      pypi_package: String(idObj?.pypi_package ?? ""),
      maven_coordinates: String(idObj?.maven_coordinates ?? ""),
      cicd_pipeline_url: String(idObj?.cicd_pipeline_url ?? ""),
    });
  }, [portfolio]);

  const handleComplianceCancel = () => {
    const c = (portfolio?.compliance ?? {}) as any;
    setComplianceRows(Object.entries(c).map(([k, v]) => ({ key: k, value: String(v) })));
    setComplianceForm({
      data_classification: String(c?.data_classification ?? ""),
      handles_pii: Boolean(c?.handles_pii ?? false),
      pii_types_csv: Array.isArray(c?.pii_types) ? (c.pii_types as string[]).join(", ") : String(c?.pii_types ?? ""),
      encryption_at_rest: c?.encryption_at_rest !== undefined ? Boolean(c.encryption_at_rest) : true,
      encryption_in_transit: c?.encryption_in_transit !== undefined ? Boolean(c.encryption_in_transit) : true,
      encryption_algorithms: String(c?.encryption_algorithms ?? ""),
      standards_csv: Array.isArray(c?.compliance_standards) ? (c.compliance_standards as string[]).join(", ") : String(c?.compliance_standards ?? ""),
      audit_logging: c?.audit_logging !== undefined ? Boolean(c.audit_logging) : true,
      audit_log_retention_days: String(c?.audit_log_retention_days ?? "90"),
      accessibility_standard: String(c?.accessibility_standard ?? ""),
    });
    const idObj = (portfolio?.identifiers ?? {}) as any;
    setIdentifierRows(Object.entries(idObj).map(([k, v]) => ({ key: k, value: String(v) })));
    setIdentifiersForm({
      license: String(idObj?.license ?? ""),
      spdx_id: String(idObj?.spdx_id ?? ""),
      license_url: String(idObj?.license_url ?? ""),
      sbom_url: String(idObj?.sbom_url ?? ""),
      issue_tracker_url: String(idObj?.issue_tracker_url ?? ""),
      documentation_url: String(idObj?.documentation_url ?? ""),
      artifact_registry: String(idObj?.artifact_registry ?? ""),
      docker_image: String(idObj?.docker_image ?? ""),
      npm_package: String(idObj?.npm_package ?? ""),
      pypi_package: String(idObj?.pypi_package ?? ""),
      maven_coordinates: String(idObj?.maven_coordinates ?? ""),
      cicd_pipeline_url: String(idObj?.cicd_pipeline_url ?? ""),
    });
    setIsComplianceEditing(false);
  };

  const handleComplianceSave = async () => {
    if (!currentClient || !portfolio) return;
    const existingCompliance = { ...(portfolio.compliance || {}) } as any;
    const existingIdentifiers = { ...(portfolio.identifiers || {}) } as any;

    // Build structured compliance
    const pii_types = (complianceForm.pii_types_csv || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const compliance: Record<string, any> = {
      ...existingCompliance,
      data_classification: complianceForm.data_classification || undefined,
      handles_pii: !!complianceForm.handles_pii,
      pii_types: pii_types.length ? pii_types : undefined,
      encryption_at_rest: !!complianceForm.encryption_at_rest,
      encryption_in_transit: !!complianceForm.encryption_in_transit,
      encryption_algorithms: complianceForm.encryption_algorithms || undefined,
      compliance_standards: (complianceForm.standards_csv || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      audit_logging: !!complianceForm.audit_logging,
      audit_log_retention_days: Number.isFinite(Number(complianceForm.audit_log_retention_days))
        ? Number(complianceForm.audit_log_retention_days)
        : undefined,
      accessibility_standard: complianceForm.accessibility_standard || undefined,
    };

    // Remove keys explicitly cleared
    KNOWN_COMPLIANCE_KEYS.forEach((k) => {
      if (
        (k === "pii_types" && (!compliance.pii_types || compliance.pii_types.length === 0)) ||
        (k === "compliance_standards" && (!compliance.compliance_standards || compliance.compliance_standards.length === 0)) ||
        compliance[k as keyof typeof compliance] === undefined || compliance[k as keyof typeof compliance] === ""
      ) {
        delete compliance[k as any];
      }
    });

    // Build structured identifiers
    const identifiers: Record<string, any> = {
      ...existingIdentifiers,
      license: identifiersForm.license || undefined,
      spdx_id: identifiersForm.spdx_id || undefined,
      license_url: identifiersForm.license_url || undefined,
      sbom_url: identifiersForm.sbom_url || undefined,
      issue_tracker_url: identifiersForm.issue_tracker_url || undefined,
      documentation_url: identifiersForm.documentation_url || undefined,
      artifact_registry: identifiersForm.artifact_registry || undefined,
      docker_image: identifiersForm.docker_image || undefined,
      npm_package: identifiersForm.npm_package || undefined,
      pypi_package: identifiersForm.pypi_package || undefined,
      maven_coordinates: identifiersForm.maven_coordinates || undefined,
      cicd_pipeline_url: identifiersForm.cicd_pipeline_url || undefined,
    };
    KNOWN_IDENTIFIER_KEYS.forEach((k) => {
      if (identifiers[k] === undefined || identifiers[k] === "") {
        delete identifiers[k];
      }
    });

    await actions.portfolios.patch(currentClient, portfolio.portfolio, { compliance, identifiers } as any);
    setIsComplianceEditing(false);
  };

  if (!currentClient) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Card>
          <CardContent className="p-12 text-center">
            <h3 className="text-lg font-semibold mb-2">No Client Selected</h3>
            <p className="text-muted-foreground mb-6">Select a client from the header to view portfolio details.</p>
            <Button variant="outline" onClick={() => navigate("/portfolios")}>Go to Portfolios</Button>
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
            <Button variant="outline" asChild>
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
      const patch: any = {
        // Top-level
        name: formData.name || undefined,
        portfolio_version: formData.portfolio_version || undefined,
        icon_url: formData.icon_url || undefined,
        domain: formData.domain || undefined,
        // Project
        project: (
          formData.project_name || formData.project_code || formData.project_description || formData.project_repository
        ) ? {
          name: formData.project_name || undefined,
          code: formData.project_code || undefined,
          description: formData.project_description || undefined,
          repository: formData.project_repository || undefined,
        } : undefined,
        // Bizapp (optional)
        bizapp: (
          formData.bizapp_name || formData.bizapp_code || formData.bizapp_description || formData.bizapp_repository
        ) ? {
          name: formData.bizapp_name || undefined,
          code: formData.bizapp_code || undefined,
          description: formData.bizapp_description || undefined,
          repository: formData.bizapp_repository || undefined,
        } : undefined,
        // Contacts
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

  if (blockRender) return null;
  return (
    <DashboardLayout
      activeItem="portfolios"
      pageTitle="Portfolio Information"
      pageSubtitle="Update metadata and basic information"
    >
      <div className="space-y-6 animate-fade-in">
        {/* Sticky header actions: show only while editing */}
        {isEditing && (
          <div className="sck-header-actions sticky top-16 z-30 bg-background/95 supports-[backdrop-filter]:bg-background/60 backdrop-blur py-2 px-2 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} className="gap-1 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-1">
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        )}

  <div className="grid gap-6 lg:grid-cols-1">
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
                <CardHeader className="flex flex-row items-start gap-2">
                  <div>
                    <CardTitle className="sck-section-title">Portfolio</CardTitle>
                    <CardDescription className="sck-section-subtitle">Overview and basic information</CardDescription>
                  </div>
                  {/* Actions for overview tab: Edit/Delete on the right when not editing */}
                  {!isEditing && (
                    <div className="ml-auto flex items-center gap-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" disabled={isDeleting} className="gap-1 text-muted-foreground hover:text-foreground">
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
                      <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="gap-1 text-muted-foreground hover:text-foreground">
                        <Edit className="h-4 w-4" />
                        Edit
                      </Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {!isEditing ? (
                    <div className="space-y-4">
                      {/* Header row with icon and names */}
                      <div className="flex items-center gap-4">
            <div className="relative">
                          {portfolio.icon_url ? (
              <SecureImg src={portfolio.icon_url} alt={portfolio.name || portfolio.project?.name || portfolio.portfolio} containerClassName="bg-white rounded-md" className="w-12 h-12 object-cover" />
                          ) : (
                            <div className="w-12 h-12 bg-primary/10 rounded-md flex items-center justify-center">
                              <Briefcase className="h-6 w-6 text-primary" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-base font-semibold truncate">{portfolio.name || portfolio.project?.name || portfolio.portfolio}</div>
                          {(portfolio as any)?.portfolio_version && (
                            <div className="text-xs text-muted-foreground truncate">Version: {(portfolio as any).portfolio_version}</div>
                          )}
                        </div>
                      </div>

                      {(portfolio.category || portfolio.lifecycle_status) && (
                        <div className="flex gap-2 flex-wrap">
                          {portfolio.category && <Badge variant="secondary">{portfolio.category}</Badge>}
                          {portfolio.lifecycle_status && <Badge variant="outline">{portfolio.lifecycle_status}</Badge>}
                        </div>
                      )}
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-muted-foreground">Project Name</label>
                          <p className="text-foreground">{portfolio.project?.name || "—"}</p>
                        </div>
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-muted-foreground">Project Description</label>
                          <p className="text-foreground">{portfolio.project?.description || "No description provided"}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Domain</label>
                          <div className="mt-1 flex items-center gap-2">
                            <Globe className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{portfolio.domain || "—"}</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-muted-foreground">Project Home Page</label>
                            {portfolio.project?.repository ? (
                              <a
                                href={portfolio.project.repository}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Open repository"
                                className="inline-flex"
                              >
                                <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                              </a>
                            ) : null}
                          </div>
                          <p className="text-sm text-muted-foreground break-all">{portfolio.project?.repository || "—"}</p>
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
                      {/* Row: icon and basic fields */}
                      <div className="flex items-start gap-4">
            <div className="relative">
                          {formData.icon_url ? (
              <SecureImg src={formData.icon_url} alt={formData.name || formData.project_name || portfolio.portfolio} containerClassName="bg-white rounded-md" className="w-12 h-12 object-cover" />
                          ) : (
                            <div className="w-12 h-12 bg-primary/10 rounded-md flex items-center justify-center">
                              <Briefcase className="h-6 w-6 text-primary" />
                            </div>
                          )}
                          <button type="button" className="absolute -bottom-2 -right-2 bg-background border rounded-full p-1 shadow-sm" onClick={() => { setIconDraft(formData.icon_url || ""); setUploadError(null); setIconDialogOpen(true); }} aria-label="Edit icon">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                          <FieldEdit
                            id="portfolio_name"
                            label="Portfoio Name"
                            value={formData.name}
                            onChange={(v) => setFormData((s) => ({ ...s, name: v }))}
                            placeholder="Display name"
                          />
                          <FieldEdit
                            id="portfolio_version"
                            label="Version"
                            value={formData.portfolio_version}
                            onChange={(v) => setFormData((s) => ({ ...s, portfolio_version: v }))}
                            placeholder="e.g. 1.0, 2025.09"
                          />
                        </div>
                      </div>

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
                        <Label htmlFor="project_description">Project Description</Label>
                        <Textarea
                          id="project_description"
                          rows={3}
                          value={formData.project_description}
                          onChange={(e) => setFormData((s) => ({ ...s, project_description: e.target.value }))}
                          placeholder="Describe this portfolio"
                        />
                      </div>

                      <FieldEdit
                        id="project_repository"
                        label="Project Home Page"
                        value={formData.project_repository}
                        onChange={(v) => setFormData((s) => ({ ...s, project_repository: v }))}
                        placeholder="https://..."
                        type="url"
                      />

                      <FieldEdit
                        id="domain"
                        label="Domain"
                        value={formData.domain}
                        onChange={(v) => setFormData((s) => ({ ...s, domain: v }))}
                        placeholder="example.com"
                      />

                      {/* Bizapp section */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        <FieldEdit
                          id="bizapp_name"
                          label="Business App Name"
                          value={formData.bizapp_name}
                          onChange={(v) => setFormData((s) => ({ ...s, bizapp_name: v }))}
                          placeholder="Optional"
                        />
                        <FieldEdit
                          id="bizapp_code"
                          label="Business App Code"
                          value={formData.bizapp_code}
                          onChange={(v) => setFormData((s) => ({ ...s, bizapp_code: v }))}
                          placeholder="Optional"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bizapp_description">Business App Description</Label>
                        <Textarea
                          id="bizapp_description"
                          rows={2}
                          value={formData.bizapp_description}
                          onChange={(e) => setFormData((s) => ({ ...s, bizapp_description: e.target.value }))}
                          placeholder="Optional"
                        />
                      </div>
                      <FieldEdit
                        id="bizapp_repository"
                        label="Business App Repository"
                        value={formData.bizapp_repository}
                        onChange={(v) => setFormData((s) => ({ ...s, bizapp_repository: v }))}
                        placeholder="https://..."
                        type="url"
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
                    <CardTitle className="sck-section-title flex items-center gap-2">
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
                  <CardDescription className="sck-section-subtitle">Applications that belong to this portfolio</CardDescription>
                </CardHeader>
                <CardContent>
                  <div
                    className={`space-y-3 overscroll-contain ${dragActive ? 'touch-none select-none' : ''}`}
                    onTouchMove={(e) => { if (dragActive) e.preventDefault(); }}
                  >
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
                      <CardTitle className="sck-section-title">Approvers</CardTitle>
                      <CardDescription className="sck-section-subtitle">Define approval workflow and roles</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={openNewApprover} className="gap-1">
                      <Plus className="h-4 w-4" />
                      Add
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div
                    className={`space-y-3 overscroll-contain ${dragActive ? 'touch-none select-none overflow-hidden' : ''}`}
                    onTouchStart={(e) => {
                      const t = e.touches?.[0];
                      if (t) touchStartRef.current = { x: t.clientX, y: t.clientY };
                    }}
                    onTouchMove={(e) => {
                      const start = touchStartRef.current;
                      const t = e.touches?.[0];
                      if (start && t) {
                        const dx = t.clientX - start.x;
                        const dy = t.clientY - start.y;
                        if (!dragActive && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
                          setDragActive(true);
                        }
                      }
                      if (dragActive) e.preventDefault();
                    }}
                    onTouchEnd={() => { touchStartRef.current = null; setDragActive(false); }}
                    onTouchCancel={() => { touchStartRef.current = null; setDragActive(false); }}
                  >
                    {approverGroups.length === 0 && (
                      <div className="text-sm text-muted-foreground">No approvers</div>
                    )}

                    {/* Helper: vertical drop zone component (visible, above/below rows) */}
                    {(() => {
                      const DropZone = ({ index }: { index: number }) => (
                        <div
                          className="relative h-8 my-2 rounded-md border-2 border-dashed border-transparent transition-colors"
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
                            setDragActive(false);
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
                        >
                          {index > 0 && index < approverGroups.length ? (
                            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                              <ArrowDown className="h-4 w-4 text-muted-foreground/60" />
                            </div>
                          ) : null}
                        </div>
                      );

                      return (
                        <>
                          {/* Top drop zone (before first group) */}
                          <DropZone index={0} />
                          {approverGroups.map((group, gIdx) => (
                            <Fragment key={`group-${gIdx}`}>
                              <div className="border rounded-lg">
                                {/* Group drag handle and header */}
                              <div
                                className="flex items-center gap-3 px-3 py-2 bg-muted/50 border-b cursor-move"
                                draggable
                                onDragStart={(e) => {
                                  e.dataTransfer.setData("application/x-approver-group", JSON.stringify({ gIdx }));
                                  e.dataTransfer.effectAllowed = "move";
                                  setDragActive(true);
                                }}
                                onDragEnd={() => setDragActive(false)}
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
                  setDragActive(false);
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
                                      setDragActive(true);
                                    }}
                                    onDragEnd={() => setDragActive(false)}
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
              {/* Mobile subtle more icon; desktop pencil */}
              <Button aria-label="Edit" variant="ghost" size="icon" className="lg:hidden"
                onPointerDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}
                onClick={() => openEditApprover(gIdx, iIdx, a)}>
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
              <Button aria-label="Edit" variant="ghost" size="icon" className="hidden lg:inline-flex"
                onPointerDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}
                onClick={() => openEditApprover(gIdx, iIdx, a)}>
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              </div>
                              {/* Drop zone after each group (outside the bordered group) */}
                              <DropZone index={gIdx + 1} />
                            </Fragment>
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
                  <CardTitle className="sck-section-title">Contacts</CardTitle>
                  <CardDescription className="sck-section-subtitle">Owners and contact vCards</CardDescription>
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
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="sck-section-title">Compliance & Identifiers</CardTitle>
                      <CardDescription className="sck-section-subtitle">Governance, risk, and identifiers</CardDescription>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      {!isComplianceEditing ? (
                        <Button variant="ghost" size="sm" onClick={() => setIsComplianceEditing(true)} className="gap-1 text-muted-foreground hover:text-foreground">
                          <Edit className="h-4 w-4" />
                          Edit
                        </Button>
                      ) : (
                        <>
                          <Button variant="ghost" size="sm" onClick={handleComplianceCancel} className="gap-1 text-muted-foreground hover:text-foreground">
                            <X className="h-4 w-4" />
                            Cancel
                          </Button>
                          <Button size="sm" onClick={handleComplianceSave} className="gap-1">
                            <Save className="h-4 w-4" />
                            Save
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!isComplianceEditing ? (
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <h4 className="font-semibold mb-2">Compliance</h4>
                        <ReadOnlyRow label="Data Classification" value={(portfolio.compliance as any)?.data_classification} />
                        <ReadOnlyRow label="Handles PII" value={String((portfolio.compliance as any)?.handles_pii ?? "—")} />
                        <ReadOnlyRow label="PII Types" value={Array.isArray((portfolio.compliance as any)?.pii_types) ? ((portfolio.compliance as any).pii_types as string[]).join(", ") : (portfolio.compliance as any)?.pii_types} />
                        <ReadOnlyRow label="Encryption at Rest" value={String((portfolio.compliance as any)?.encryption_at_rest ?? "—")} />
                        <ReadOnlyRow label="Encryption in Transit" value={String((portfolio.compliance as any)?.encryption_in_transit ?? "—")} />
                        <ReadOnlyRow label="Encryption Algorithms" value={(portfolio.compliance as any)?.encryption_algorithms} />
                        <ReadOnlyRow label="Compliance Standards" value={Array.isArray((portfolio.compliance as any)?.compliance_standards) ? ((portfolio.compliance as any).compliance_standards as string[]).join(", ") : (portfolio.compliance as any)?.compliance_standards} />
                        <ReadOnlyRow label="Audit Logging" value={String((portfolio.compliance as any)?.audit_logging ?? "—")} />
                        <ReadOnlyRow label="Audit Log Retention Days" value={String((portfolio.compliance as any)?.audit_log_retention_days ?? "—")} />
                        <ReadOnlyRow label="Accessibility Standard" value={(portfolio.compliance as any)?.accessibility_standard} />
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-semibold mb-2">Identifiers</h4>
                        <ReadOnlyRow label="License" value={(portfolio.identifiers as any)?.license} />
                        <ReadOnlyRow label="SPDX ID" value={(portfolio.identifiers as any)?.spdx_id} />
                        <ReadOnlyRow label="License URL" value={(portfolio.identifiers as any)?.license_url} isLink />
                        <ReadOnlyRow label="SBOM URL" value={(portfolio.identifiers as any)?.sbom_url} isLink />
                        <ReadOnlyRow label="Issue Tracker" value={(portfolio.identifiers as any)?.issue_tracker_url} isLink />
                        <ReadOnlyRow label="Documentation" value={(portfolio.identifiers as any)?.documentation_url} isLink />
                        <ReadOnlyRow label="Artifact Registry" value={(portfolio.identifiers as any)?.artifact_registry} />
                        <ReadOnlyRow label="Docker Image" value={(portfolio.identifiers as any)?.docker_image} />
                        <ReadOnlyRow label="npm Package" value={(portfolio.identifiers as any)?.npm_package} />
                        <ReadOnlyRow label="PyPI Package" value={(portfolio.identifiers as any)?.pypi_package} />
                        <ReadOnlyRow label="Maven Coordinates" value={(portfolio.identifiers as any)?.maven_coordinates} />
                        <ReadOnlyRow label="CI/CD Pipeline" value={(portfolio.identifiers as any)?.cicd_pipeline_url} isLink />
                      </div>
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <h4 className="font-semibold mb-2">Compliance</h4>
                        <FieldEdit id="cf_data_classification" label="Data Classification" value={complianceForm.data_classification} onChange={(v) => setComplianceForm((s) => ({ ...s, data_classification: v }))} placeholder="e.g., Public, Internal, Confidential" />
                        <div className="flex items-center gap-2">
                          <Switch id="cf_handles_pii" checked={!!complianceForm.handles_pii} onCheckedChange={(v) => setComplianceForm((s) => ({ ...s, handles_pii: v }))} size="sm" />
                          <Label htmlFor="cf_handles_pii" className="text-sm">Handles PII</Label>
                        </div>
                        <FieldEdit id="cf_pii_types" label="PII Types" value={complianceForm.pii_types_csv} onChange={(v) => setComplianceForm((s) => ({ ...s, pii_types_csv: v }))} placeholder="e.g., Email, Phone, SSN" />
                        <div className="flex items-center gap-2">
                          <Switch id="cf_enc_rest" checked={!!complianceForm.encryption_at_rest} onCheckedChange={(v) => setComplianceForm((s) => ({ ...s, encryption_at_rest: v }))} size="sm" />
                          <Label htmlFor="cf_enc_rest" className="text-sm">Encryption at Rest</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch id="cf_enc_transit" checked={!!complianceForm.encryption_in_transit} onCheckedChange={(v) => setComplianceForm((s) => ({ ...s, encryption_in_transit: v }))} size="sm" />
                          <Label htmlFor="cf_enc_transit" className="text-sm">Encryption in Transit</Label>
                        </div>
                        <FieldEdit id="cf_algorithms" label="Encryption Algorithms" value={complianceForm.encryption_algorithms} onChange={(v) => setComplianceForm((s) => ({ ...s, encryption_algorithms: v }))} placeholder="e.g., AES-256, TLS 1.2+" />
                        <FieldEdit id="cf_standards" label="Compliance Standards" value={complianceForm.standards_csv} onChange={(v) => setComplianceForm((s) => ({ ...s, standards_csv: v }))} placeholder="e.g., SOC 2, ISO 27001" />
                        <div className="flex items-center gap-2">
                          <Switch id="cf_audit_logging" checked={!!complianceForm.audit_logging} onCheckedChange={(v) => setComplianceForm((s) => ({ ...s, audit_logging: v }))} size="sm" />
                          <Label htmlFor="cf_audit_logging" className="text-sm">Audit Logging Enabled</Label>
                        </div>
                        <FieldEdit id="cf_retention" label="Audit Log Retention (days)" value={complianceForm.audit_log_retention_days} onChange={(v) => setComplianceForm((s) => ({ ...s, audit_log_retention_days: v }))} placeholder="e.g., 90" type="number" />
                        <FieldEdit id="cf_accessibility" label="Accessibility Standard" value={complianceForm.accessibility_standard} onChange={(v) => setComplianceForm((s) => ({ ...s, accessibility_standard: v }))} placeholder="e.g., WCAG 2.1 AA" />
                      </div>
                      <div className="space-y-3">
                        <h4 className="font-semibold mb-2">Identifiers</h4>
                        <FieldEdit id="id_license" label="License" value={identifiersForm.license} onChange={(v) => setIdentifiersForm((s) => ({ ...s, license: v }))} placeholder="e.g., MIT" />
                        <FieldEdit id="id_spdx" label="SPDX ID" value={identifiersForm.spdx_id} onChange={(v) => setIdentifiersForm((s) => ({ ...s, spdx_id: v }))} placeholder="e.g., MIT" />
                        <FieldEdit id="id_license_url" label="License URL" value={identifiersForm.license_url} onChange={(v) => setIdentifiersForm((s) => ({ ...s, license_url: v }))} placeholder="https://…" type="url" />
                        <FieldEdit id="id_sbom_url" label="SBOM URL" value={identifiersForm.sbom_url} onChange={(v) => setIdentifiersForm((s) => ({ ...s, sbom_url: v }))} placeholder="https://…" type="url" />
                        <FieldEdit id="id_issue_tracker" label="Issue Tracker URL" value={identifiersForm.issue_tracker_url} onChange={(v) => setIdentifiersForm((s) => ({ ...s, issue_tracker_url: v }))} placeholder="https://…" type="url" />
                        <FieldEdit id="id_docs" label="Documentation URL" value={identifiersForm.documentation_url} onChange={(v) => setIdentifiersForm((s) => ({ ...s, documentation_url: v }))} placeholder="https://…" type="url" />
                        <FieldEdit id="id_registry" label="Artifact Registry" value={identifiersForm.artifact_registry} onChange={(v) => setIdentifiersForm((s) => ({ ...s, artifact_registry: v }))} placeholder="e.g., ghcr.io/org/pkg" />
                        <FieldEdit id="id_docker" label="Docker Image" value={identifiersForm.docker_image} onChange={(v) => setIdentifiersForm((s) => ({ ...s, docker_image: v }))} placeholder="e.g., org/image:tag" />
                        <FieldEdit id="id_npm" label="npm Package" value={identifiersForm.npm_package} onChange={(v) => setIdentifiersForm((s) => ({ ...s, npm_package: v }))} placeholder="e.g., @org/pkg" />
                        <FieldEdit id="id_pypi" label="PyPI Package" value={identifiersForm.pypi_package} onChange={(v) => setIdentifiersForm((s) => ({ ...s, pypi_package: v }))} placeholder="e.g., package-name" />
                        <FieldEdit id="id_maven" label="Maven Coordinates" value={identifiersForm.maven_coordinates} onChange={(v) => setIdentifiersForm((s) => ({ ...s, maven_coordinates: v }))} placeholder="e.g., group:artifact:version" />
                        <FieldEdit id="id_cicd" label="CI/CD Pipeline URL" value={identifiersForm.cicd_pipeline_url} onChange={(v) => setIdentifiersForm((s) => ({ ...s, cicd_pipeline_url: v }))} placeholder="https://…" type="url" />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="links">
              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle className="sck-section-title">Links & Dependencies</CardTitle>
                  <CardDescription className="sck-section-subtitle">Related systems and references</CardDescription>
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
                    <CardTitle className="sck-section-title">Portfolio Record Details</CardTitle>
                    <CardDescription className="sck-section-subtitle">System metadata for this record</CardDescription>
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

        {/* Stack previously-sidebar cards below main content to make them full width */}
        {activeTab === "overview" && (
          <div className="space-y-6 lg:col-span-2">
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
      {/* Icon URL / Upload Dialog */}
      <Dialog open={iconDialogOpen} onOpenChange={setIconDialogOpen}>
        <DialogContent className="w-[92vw] max-w-md sm:max-w-lg p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Set Icon</DialogTitle>
            <DialogDescription>
              Paste an image URL or upload a file. Recommended: square, 128–256px. Renders at 48×48 here.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="icon_url_input">Image URL</Label>
            <Input
              id="icon_url_input"
              type="url"
              inputMode="url"
              placeholder="https://example.com/icon.png"
              value={iconDraft}
              onChange={(e) => setIconDraft(e.target.value)}
            />
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={handleIconFileChange}
              />
              <Button type="button" variant="outline" size="sm" onClick={triggerFilePicker} disabled={uploadingIcon}>
                {uploadingIcon ? "Uploading…" : "Upload"}
              </Button>
              {uploadError && <span className="text-xs text-destructive">{uploadError}</span>}
            </div>
            <div className="mt-2">
              <Label className="text-xs text-muted-foreground">Preview</Label>
              <div className="mt-1">
                {iconDraft ? (
                  <SecureImg src={iconDraft} alt="Icon preview" containerClassName="bg-white rounded-md" className="w-24 h-24 object-cover border" />
                ) : (
                  <div className="w-24 h-24 bg-primary/10 rounded-md flex items-center justify-center border">
                    <Briefcase className="h-8 w-8 text-primary" />
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setIconDialogOpen(false)}>Cancel</Button>
            <Button type="button" onClick={handleIconDialogSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

/* Presentational helper: read-only label/value row with optional link */
function ReadOnlyRow({
  label,
  value,
  isLink,
}: {
  label: string;
  value?: string | number | boolean | null;
  isLink?: boolean;
}) {
  const str = typeof value === "boolean" ? String(value) : (value ?? "").toString();
  const empty = str.trim().length === 0;
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-muted-foreground">{label}</label>
      {isLink ? (
        empty ? (
          <p className="text-sm text-muted-foreground">—</p>
        ) : (
          <a
            href={str}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-foreground hover:underline break-all inline-flex items-center gap-1"
          >
            {str}
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
          </a>
        )
      ) : (
        <p className="text-sm text-foreground break-all">{empty ? "—" : str}</p>
      )}
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
    <>
      <Button aria-label="Edit" variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 lg:hidden"
        onPointerDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}
        onClick={onEdit}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
      <Button aria-label="Edit" variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 hidden lg:inline-flex"
        onPointerDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}
        onClick={onEdit}>
              <Edit className="h-4 w-4" />
            </Button>
          </>
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
  <>
    <Button aria-label="Edit" variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 lg:hidden"
      onPointerDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}
      onClick={onEdit}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
    <Button aria-label="Edit" variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 hidden lg:inline-flex"
      onPointerDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}
      onClick={onEdit}>
            <Edit className="h-4 w-4" />
          </Button>
        </>
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

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {(rows || []).map((r, i) => (
        <AttrRow
          key={`attr-${i}`}
          index={i}
          r={r}
          suggestions={commonLabels}
          onUpdate={update}
          onRemove={remove}
        />
      ))}
      <Button variant="outline" size="sm" onClick={add} className="gap-1">
        <PlusCircle className="h-4 w-4" /> Add attribute
      </Button>
    </div>
  );
}

/* Stable row component to prevent remount on each edit (preserves input focus) */
function AttrRow({
  index,
  r,
  suggestions,
  onUpdate,
  onRemove,
}: {
  index: number;
  r: { key: string; value: string };
  suggestions?: string[];
  onUpdate: (i: number, field: "key" | "value", value: string) => void;
  onRemove: (i: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const labels = suggestions || [];
  const filtered = (r.key ? labels.filter((l) => l.toLowerCase().includes(r.key.toLowerCase())) : labels).slice(0, 100);
  return (
    <div className="w-full">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Input
            value={r.key}
            onChange={(e) => { onUpdate(index, "key", e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 120)}
            onKeyDown={(e) => e.stopPropagation()}
            onKeyUp={(e) => e.stopPropagation()}
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
                  onClick={() => { onUpdate(index, "key", l); setOpen(false); }}
                >
                  {l}
                </button>
              ))}
            </div>
          )}
        </div>
        <Input
          value={r.value}
          onChange={(e) => onUpdate(index, "value", e.target.value)}
          onKeyDown={(e) => e.stopPropagation()}
          onKeyUp={(e) => e.stopPropagation()}
          placeholder="Value"
          className="flex-[2]"
        />
        <Button variant="outline" size="icon" onClick={() => onRemove(index)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
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