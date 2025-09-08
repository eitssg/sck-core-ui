import { useEffect, useMemo, useState } from "react";
import { useAppSelector } from "@/store";
import {
  selectUser,
  selectIsAuthenticated,
  selectIsLoading,
  selectAuthError,
} from "@/store/slices/authSlice";
import { Link, useNavigate } from "react-router-dom";
import { User as UserIcon, Save, Edit, Camera, Calendar, Building2, Trash2, Cloud, LogOut, ArrowLeftRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandList, CommandInput, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import UserMenu from "@/components/UserMenu";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/use-toast";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/store";
import { refreshAccessToken } from "@/store/slices/authSlice";
import { useAuth as useAuthRedux } from "@/hooks/useAuth";
import { useAuth as useAuthContext } from "@/contexts/useAuth";
import { useReduxData } from "@/hooks/useReduxData";
import {
  fetchUserProfile as fetchUserProfileThunk,
  patchCurrentUserProfile,
  putCurrentUserProfile,
  selectUser as selectProfileUser,
  selectProfileLoading,
  selectProfileError,
  switchToProfile,
} from "@/store/slices/profileSlice";
import { selectUserProfiles, selectCurrentProfile, setCurrentProfile } from "@/store/slices/profileSlice";
import {
  selectCurrentActiveClient,
  selectClientBySlug,
  fetchClient,
  selectClients,
  selectSelectedClient,
  selectSelectedClientName,
} from "@/store/slices/clientsSlice";
import type { UserProfile } from "@/store/types";
import { AWS_REGIONS, AWS_REGION_NAME_BY_CODE } from "@/constants/aws-regions";
import { SUPPORTED_LANGUAGES } from "@/constants/languages";
import { getTimezones } from "@/constants/timezones";
import { authAPI } from "@/lib/auth-api";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function Profile() {
  const { logout: logoutCtx } = useAuthContext();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isDark, toggleTheme } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { logout: logoutRedux } = useAuthRedux();
  const { clients, actions, selectedClient } = useReduxData();

  const user = useAppSelector(selectUser);
  const authError = useAppSelector(selectAuthError);
  const profileUser = useAppSelector(selectProfileUser as any);
  const profileLoading = useAppSelector(selectProfileLoading as any);
  const profileError = useAppSelector(selectProfileError as any);
  const profiles = useAppSelector(selectUserProfiles as any) as UserProfile[];
  const currentProfileName = useAppSelector(selectCurrentProfile as any);
  const activeClientSlug = useAppSelector(selectCurrentActiveClient as any);
  const clientList = useAppSelector(selectClients as any) as any[];
  const selectedClientSlug = useAppSelector(selectSelectedClient as any) as string | null;
  const selectedClientName = useAppSelector(selectSelectedClientName as any) as string;

  const [editData, setEditData] = useState<UserProfile>({} as UserProfile);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<{ aws_account_id?: string }>({});
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
  const [photoUrlDraft, setPhotoUrlDraft] = useState<string>("");
  const [photoError, setPhotoError] = useState<string | undefined>(undefined);

  // Derive client context from available sources (prefer explicit fields, fallback to JWT claim)
  const jwtClient = useMemo(() => authAPI.getCurrentClient(), []);
  // Resolve client context via profile -> active client slice -> JWT
  const clientSlug = useMemo(() => {
    const p: any = profileUser || {};
    return p.client || activeClientSlug || jwtClient || "";
  }, [profileUser, activeClientSlug, jwtClient]);
  // Pull client details from clients slice if available
  const clientObj = useAppSelector((state) => selectClientBySlug(state as any, clientSlug || ""));
  const clientName = useMemo(() => {
    const p: any = profileUser || {};
    return (clientObj as any)?.client_name || p.client_name || "";
  }, [clientObj, profileUser]);
  const organizationName = useMemo(() => {
    const p: any = profileUser || {};
    return (clientObj as any)?.organization_name || p.organization_name || "";
  }, [clientObj, profileUser]);

  // ProtectedRoute already handles access control.

  // Hydrate-first: do NOT fetch if Redux already has a profile.
  // This runs only to backfill after hard reloads on /profile.
  useEffect(() => {
    // If no profile in store, fetch. If profile exists but missing names, force a refetch
    if (!profileUser) {
      dispatch(fetchUserProfileThunk({}));
    } else {
      const fn = (profileUser as any)?.first_name;
      const ln = (profileUser as any)?.last_name;
      if (!fn || !ln) {
        dispatch(fetchUserProfileThunk({ force: true } as any));
      }
    }
  }, [dispatch, profileUser]);

  // Ensure clients are fetched for header controls
  useEffect(() => {
    if ((clients as any)?.status === 'idle') {
      actions.clients.fetch({ limit: 100 });
    }
  }, [clients, actions.clients]);

  // Ensure client details are loaded when we have a slug
  useEffect(() => {
    const slug = clientSlug;
    if (!slug) return;
    if (!clientObj) {
      dispatch(fetchClient({ clientSlug: slug } as any));
    }
  }, [dispatch, clientSlug, clientObj]);

  // Build initial form state from remote user (fallback to store user)
  const initialForm: UserProfile = useMemo(() => {
    const u: any = (profileUser || user || {}) as UserProfile;
    const displayName = u.display_name || u.name || "";
    return {
  // preserve any other fields from the backend to keep shape stable in memory
  ...u,
  // then override with normalized defaults to avoid being overwritten by undefined
  user_id: u.user_id ?? "",
  profile_name: u.profile_name ?? "default",
  email: u.email ?? "",
  display_name: displayName,
  first_name: u.first_name ?? "",
  last_name: u.last_name ?? "",
  profile_description: u.profile_description ?? "",
  timezone: u.timezone ?? "UTC",
  language: u.language ?? "en-US",
  preferred_region: u.preferred_region ?? "us-east-1",
  avatar_url: u.avatar_url ?? u.avatar ?? "",
    } as UserProfile;
  }, [profileUser, user]);

  // Keep form in sync when user changes (e.g., after login/fetch)
  useEffect(() => {
    setEditData(initialForm);
  }, [initialForm]);

  // Helpers
  const fullName = useMemo(() => {
    if (editData.display_name) return editData.display_name as string;
    const first = (editData.first_name || "").trim();
    const last = (editData.last_name || "").trim();
    return [first, last].filter(Boolean).join(" ") || "Unknown User";
  }, [editData.display_name, editData.first_name, editData.last_name]);

  const initials = useMemo(() => {
    if (editData.display_name) {
      return String(editData.display_name)
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
    }
    const f = String(editData.first_name || "").charAt(0);
    const l = String(editData.last_name || "").charAt(0);
    return `${f}${l}`.toUpperCase() || "U";
  }, [editData.display_name, editData.first_name, editData.last_name]);

  // Parse server date/time strings. Server sends UTC; coerce strings without timezone to UTC.
  const parseServerDate = (v?: unknown): Date | null => {
    if (!v) return null;
    try {
      if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
      const s = String(v).trim();
      if (!s) return null;
      // Numeric epoch support (ms or s)
      if (/^\d{10}$/.test(s)) return new Date(Number(s) * 1000);
      if (/^\d{13}$/.test(s)) return new Date(Number(s));

      // Normalize common formats without TZ to explicit UTC
      // e.g., "2025-09-08T12:34:56" or "2025-09-08 12:34:56"
      let iso = s.replace(' ', 'T');
      const hasTZ = /[zZ]|[+-]\d{2}:?\d{2}$/.test(iso);
      if (!hasTZ) iso += 'Z';

      const d = new Date(iso);
      return isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  };

  // Timezone-aware date/time formatter (defaults to user's timezone or UTC)
  const userTimezone = useMemo(() => {
    const tz = String((profileUser as any)?.timezone || editData.timezone || 'UTC');
    return tz || 'UTC';
  }, [profileUser, editData.timezone]);

  const formatDateTime = (v?: unknown, tz?: string) => {
    const d = parseServerDate(v);
    if (!d) return '—';
    try {
      return new Intl.DateTimeFormat(undefined, {
        timeZone: tz || userTimezone,
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    } catch {
      // Fallback if timezone invalid
      return d.toLocaleString();
    }
  };

  // (old timezone helpers removed in favor of parseServerDate + formatDateTime above)
  
  // AWS account ID helpers
  const normalizeAwsAccountId = (input: string) => input.replace(/\D/g, '');
  const isValidAwsAccountId = (input?: string) => {
    if (!input) return false;
    const digits = normalizeAwsAccountId(String(input));
    return /^\d{12}$/.test(digits);
  };

  // Derived: whether profile indicates AWS credentials configured
  const hasAwsCreds = useMemo(() => {
    const p: any = profileUser || {};
    const c: any = p.credentials || {};
    return Boolean(c.AwsCredentials);
  }, [profileUser]);

  // Capture any recently detected invalid status from other pages (e.g., Dashboard 401)
  const awsInvalid = useMemo(() => {
    try {
      return sessionStorage.getItem('aws_cred_status') === 'invalid';
    } catch {
      return false;
    }
  }, []);

  const awsRotation = useMemo(() => {
    try {
      return sessionStorage.getItem('aws_cred_status') === 'rotation';
    } catch {
      return false;
    }
  }, []);


  // Immediate update on preferred_region selection (minimal PATCH with only changed field)
  const patchPreferredRegion = async (regionCode: string) => {
    if (!AWS_REGION_NAME_BY_CODE.has(regionCode)) {
      toast({ title: 'Invalid region', description: 'Please select a valid AWS region.', variant: 'destructive' });
      return;
    }
    try {
      const minimal = { profile_name: editData.profile_name || 'default', preferred_region: regionCode } as any;
      const action = await dispatch(patchCurrentUserProfile(minimal));
      if (patchCurrentUserProfile.rejected.match(action)) {
        const err = action.payload as string | undefined;
        toast({ title: 'Update failed', description: err || 'Failed to update preferred region', variant: 'destructive' });
        return;
      }
      // Optimistically update local state from form as well
      setEditData((s) => ({ ...s, preferred_region: regionCode }));
      toast({ title: 'Preferred region updated', description: `${AWS_REGION_NAME_BY_CODE.get(regionCode)} (${regionCode})` });
    } catch (e) {
      toast({ title: 'Network error', description: 'Could not update preferred region.', variant: 'destructive' });
    }
  };

  // Compute diff helper
  function diffFields<T extends Record<string, any>>(current: T, original: T, fields: (keyof T)[]) {
    const out: Partial<T> = {};
    fields.forEach((k) => {
      if (current[k] !== original[k]) out[k] = current[k];
    });
    return out as Record<string, any>;
  }

  // Save handler: PATCH /auth/v1/me (send only changed fields)
  const handleSave = async () => {
    setSaving(true);
    try {
      // Compute diffs for allowed fields
      const allowed: (keyof UserProfile)[] = [
        "first_name",
        "last_name",
        "email",
        "preferred_region",
        "language",
        "timezone",
        "display_name",
        "avatar_url",
        "profile_description",
        "aws_account_id",
      ];
      const diff = diffFields(editData as any, initialForm as any, allowed as any);

      // Validate AWS account if being changed and non-empty; normalize to 12 digits
      if (Object.prototype.hasOwnProperty.call(diff, 'aws_account_id')) {
        const raw = String((diff as any).aws_account_id || '');
        if (raw.trim() !== '') {
          const normalized = normalizeAwsAccountId(raw);
          if (!isValidAwsAccountId(normalized)) {
            setFormErrors((e) => ({ ...e, aws_account_id: 'Enter a valid 12-digit AWS account ID' }));
            const el = document.getElementById('aws_account_id');
            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            (el as HTMLInputElement | null)?.focus();
            toast({ title: 'Invalid AWS account ID', description: 'Please enter a 12-digit account ID (e.g., 123456789012).', variant: 'destructive' });
            setSaving(false);
            return;
          }
          (diff as any).aws_account_id = normalized;
        } else {
          // Allow clearing the field
          (diff as any).aws_account_id = '';
          setFormErrors((e) => ({ ...e, aws_account_id: undefined }));
        }
      }
      if (Object.keys(diff).length === 0) {
        setEditing(false);
        setSaving(false);
        return;
      }

      const action = await dispatch(patchCurrentUserProfile({ profile_name: editData.profile_name || 'default', ...(diff as any) }));
      if (patchCurrentUserProfile.rejected.match(action)) {
        const msg = (action.payload as string) || 'Failed to save profile';
        toast({ title: 'Save failed', description: msg, variant: 'destructive' });
        setSaving(false);
        return;
      }

      // Optimistically update local state
      setEditData((prev) => ({ ...(prev || {} as any), ...(diff as any) } as UserProfile));
      toast({ title: "Profile updated", description: "Your settings were saved." });
      setEditing(false);
    } catch (err) {
      toast({
        title: "Save error",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // AWS Credentials entry moved to dedicated page; keep status and link only.
  const handleLogout = async () => {
    try {
      try {
        localStorage.removeItem('sck_logged_in');
        sessionStorage.removeItem('sck_logged_in');
      } catch {
        // ignore storage errors
      }
      await Promise.resolve(logoutRedux());
      await Promise.resolve(logoutCtx());
      navigate('/login', { replace: true });
    } catch (err) {
      // log but do not block navigation
      console.error('Logout failed:', err);
    }
  };

  // Loading / empty states
  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center space-y-3">
          <p className="text-muted-foreground">No profile found for your account.</p>
          <div className="flex items-center justify-center gap-2">
            <Button onClick={() => window.location.reload()}>Retry</Button>
            <Button variant="outline" onClick={() => navigate('/dashboard')}>Back</Button>
          </div>
          {(profileError || authError) && <p className="text-sm text-destructive mt-2">{String(profileError || authError)}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col">
      {/* Header (matching dashboard header, no sidebar) */}
      <header className="bg-dashboard-header shadow-soft border-b border-border w-full">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-theme-gradient rounded-lg flex items-center justify-center">
              <Cloud className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Profile: {String((profileUser as any)?.profile_name || currentProfileName || 'default')}</h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Client Selection: only show when multiple clients exist */}
            {Array.isArray(clientList) && clientList.length > 1 && (
              <div className="flex items-center gap-2">
                <Select
                  value={selectedClientSlug ?? ''}
                  onValueChange={(value) => actions.clients.setSelected(value || null)}
                >
                  <SelectTrigger className="w-56">
                    <SelectValue placeholder="Select client..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clientList.map((client: any) => (
                      <SelectItem key={client.client} value={client.client}>
                        {client.client_name || client.client}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Current client display */}
            <div className="hidden sm:flex items-center px-2 py-1 rounded-md bg-muted/60 text-muted-foreground max-w-[200px]">
              <span className="truncate" title={selectedClientName}>{selectedClientName}</span>
            </div>

            {/* Shared avatar menu */}
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Page content */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8 w-full">
  {/* Page Header removed to avoid duplication; title shown in top header */}

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile info */}
          <Card>
            <CardHeader className="flex flex-row items-start gap-2">
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="h-5 w-5 text-primary" />
                Personal Information
              </CardTitle>
              <div className="ml-auto flex items-center gap-2">
                {!editing ? (
                  <>
                    <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground" onClick={() => setEditing(true)}>
                      <Edit className="h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-muted-foreground hover:text-foreground"
                      disabled={String((profileUser as any)?.profile_name || currentProfileName || 'default') === 'default'}
                      onClick={() => {
                        const name = String((profileUser as any)?.profile_name || currentProfileName || 'default');
                        if (name === 'default') return;
                        const ok = confirm(`Delete profile "${name}"? This cannot be undone.`);
                        if (!ok) return;
                        toast({ title: 'Delete not available', description: 'Profile deletion is not supported in this view yet.', variant: 'destructive' });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => { setEditData(initialForm); setEditing(false); }}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1">
                      <Save className="h-4 w-4" />
                      {saving ? "Saving..." : "Save"}
                    </Button>
                  </>
                )}
              </div>
              {/* Removed redundant helper description per request */}
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={String(editData.avatar_url || "")} alt={fullName} />
                  <AvatarFallback className="text-lg">{initials}</AvatarFallback>
                </Avatar>
                {editing && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="gap-2 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setPhotoUrlDraft(String(editData.avatar_url || ""));
                      setPhotoError(undefined);
                      setPhotoDialogOpen(true);
                    }}
                  >
                    <Camera className="h-4 w-4" />
                    Change Photo URL
                  </Button>
                )}
              </div>

              {!editing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Client details */}
                    <FieldView
                      label="Client"
                      value={String(
                        (clientName || clientSlug)
                          ? `${clientName || clientSlug}${clientSlug ? ` (${clientSlug})` : ''}`
                          : '—'
                      )}
                    />
                    <FieldView label="Organization" value={String(organizationName || '—')} />
                    <div className="md:col-span-2"><Separator /></div>
                    {/* Profile details */}
                    <FieldView label="Display Name" value={String(editData.display_name || "—")} />
                    <FieldView label="Email" value={String(editData.email || "—")} />
                    <FieldView label="First Name" value={String(editData.first_name || "—")} />
                    <FieldView label="Last Name" value={String(editData.last_name || "—")} />
                    <FieldView label="Language" value={String(editData.language || "en-US")} />
                    {/* AWS Credentials inline field */}
                    <div>
                      <div className="flex items-center">
                        <Label className="text-sm font-medium text-muted-foreground">AWS Credentials</Label>
                        <Button asChild variant="ghost" size="icon" className="h-7 w-7 ml-1 text-muted-foreground">
                          <a href="/aws-credentials" aria-label="Edit AWS Credentials">
                            <Edit className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                      <p className="mt-1 text-sm">
                        {awsRotation ? (
                          'Key Rotation Required'
                        ) : awsInvalid ? (
                          'Invalid'
                        ) : hasAwsCreds ? (
                          'Available'
                        ) : (
                          'Not Configured'
                        )}
                      </p>
                    </div>
                    <FieldView label="My Home AWS Account" value={String((profileUser as any)?.aws_account_id || '—')} />
                    <FieldView label="Preferred Region" value={String(editData.preferred_region || "us-east-1")} />
                  </div>
                  <Separator />
                  <FieldView label="Profile Description" value={String(editData.profile_description || "No description")} />
                </div>
              ) : (
                 <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Client details */}
                      <FieldView
                        label="Client"
                        value={String(
                          (clientName || clientSlug)
                            ? `${clientName || clientSlug}${clientSlug ? ` (${clientSlug})` : ''}`
                            : '—'
                        )}
                      />
                      <FieldView label="Organization" value={String(organizationName || '—')} />
                      <div className="md:col-span-2"><Separator /></div>
                      {/* Profile details (order mirrors view-only) */}
                    <FieldEdit
                      id="display_name"
                      label="Display Name"
                      value={String(editData.display_name || "")}
                      onChange={(v) => setEditData((s) => ({ ...s, display_name: v }))}
                      placeholder="How your name appears"
                    />
                    <FieldEdit
                      id="email"
                      label="Email"
                      type="email"
                      value={String(editData.email || "")}
                      onChange={(v) => setEditData((s) => ({ ...s, email: v }))}
                      placeholder="you@company.com"
                    />
                    <FieldEdit
                      id="first_name"
                      label="First Name"
                      value={String(editData.first_name || "")}
                      onChange={(v) => setEditData((s) => ({ ...s, first_name: v }))}
                    />
                    <FieldEdit
                      id="last_name"
                      label="Last Name"
                      value={String(editData.last_name || "")}
                      onChange={(v) => setEditData((s) => ({ ...s, last_name: v }))}
                    />
                    <LanguageCombobox
                      value={String(editData.language || "en-US")}
                      onChange={(v) => setEditData((s) => ({ ...s, language: v }))}
                    />
                    {/* AWS Credentials status row (non-editable, same as view-only) */}
                    <div>
                      <div className="flex items-center">
                        <Label className="text-sm font-medium text-muted-foreground">AWS Credentials</Label>
                        <Button asChild variant="ghost" size="icon" className="h-7 w-7 ml-1 text-muted-foreground">
                          <a href="/aws-credentials" aria-label="Edit AWS Credentials">
                            <Edit className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                      <p className="mt-1 text-sm">
                        {awsRotation ? (
                          'Key Rotation Required'
                        ) : awsInvalid ? (
                          'Invalid'
                        ) : hasAwsCreds ? (
                          'Available'
                        ) : (
                          'Not Configured'
                        )}
                      </p>
                    </div>
                    {/* Editable AWS Account ID with validation (edit mode only) */}
                    <div className="space-y-2">
                      <Label htmlFor="aws_account_id">My Home AWS Account</Label>
                      <Input
                        id="aws_account_id"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={14}
                        value={String(editData.aws_account_id || '')}
                        onChange={(e) => {
                          // Allow digits and dashes while typing, but limit to 12 digits max
                          const raw = e.target.value;
                          if (!/^[0-9-]*$/.test(raw)) return;
                          const nextDigits = raw.replace(/\D/g, '').slice(0, 12);
                          setEditData((s) => ({ ...s, aws_account_id: nextDigits }));
                          if (!nextDigits) {
                            setFormErrors((er) => ({ ...er, aws_account_id: undefined }));
                          }
                        }}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (!v) {
                            setEditData((s) => ({ ...s, aws_account_id: '' }));
                            setFormErrors((er) => ({ ...er, aws_account_id: undefined }));
                            return;
                          }
                          const normalized = normalizeAwsAccountId(v);
                          if (!isValidAwsAccountId(normalized)) {
                            setFormErrors((er) => ({ ...er, aws_account_id: 'Enter a valid 12-digit AWS account ID' }));
                          } else {
                            setEditData((s) => ({ ...s, aws_account_id: normalized }));
                            setFormErrors((er) => ({ ...er, aws_account_id: undefined }));
                          }
                        }}
                        placeholder="123456789012"
                        aria-invalid={!!formErrors.aws_account_id}
                      />
                      {formErrors.aws_account_id ? (
                        <p className="text-sm text-destructive">{formErrors.aws_account_id}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground">12 digits, e.g., 123456789012</p>
                      )}
                    </div>
                    <PreferredRegionCombobox
                      value={String(editData.preferred_region || "us-east-1")}
                      onChange={(v) => patchPreferredRegion(v)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile_description">Profile Description</Label>
                    <Textarea
                      id="profile_description"
                      rows={3}
                      value={String(editData.profile_description || "")}
                      onChange={(e) => setEditData((s) => ({ ...s, profile_description: e.target.value }))}
                      placeholder="Describe your role or this profile's purpose"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          {/* Change Photo URL Dialog */}
    <Dialog open={photoDialogOpen} onOpenChange={setPhotoDialogOpen}>
            <DialogContent className="w-[92vw] max-w-md sm:max-w-lg p-4 sm:p-6">
              <DialogHeader>
                <DialogTitle>Change photo URL</DialogTitle>
                <DialogDescription>
      Paste an image URL. If it loads in your browser, it should work. Recommended: square image, at least 128x128 px; renders at 80x80 here.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <Label htmlFor="avatar_url_input">Image URL</Label>
                <Input
                  id="avatar_url_input"
                  type="url"
                  inputMode="url"
                  placeholder="https://example.com/me.png"
                  value={photoUrlDraft}
                  onChange={(e) => {
                    const v = e.target.value.trimStart();
                    setPhotoUrlDraft(v);
                    setPhotoError(undefined);
                  }}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (!v) return;
                    try {
            // Basic URL validation only; no file extension checks
            new URL(v);
                    } catch {
                      setPhotoError("Enter a valid URL");
                    }
                  }}
                  aria-invalid={!!photoError}
                />
                {photoError ? (
                  <p className="text-sm text-destructive">{photoError}</p>
                ) : (
          <p className="text-xs text-muted-foreground">Images are displayed as a circle. Use a square image ≥ 128x128 for best results. Max recommended file size: ~1 MB.</p>
                )}
                {photoUrlDraft ? (
                  <div className="pt-2">
                    <Label className="text-xs">Preview</Label>
                    <div className="mt-2 flex items-center gap-3">
                      <Avatar className="h-20 w-20">
                        <AvatarImage src={photoUrlDraft} alt="Preview" />
                        <AvatarFallback className="text-lg">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="text-xs text-muted-foreground break-all max-w-[60ch]">{photoUrlDraft}</div>
                    </div>
                  </div>
                ) : null}
              </div>
              <DialogFooter className="pt-4">
                <Button variant="ghost" onClick={() => setPhotoDialogOpen(false)}>Cancel</Button>
                <Button
                  onClick={() => {
                    const v = (photoUrlDraft || "").trim();
                    if (!v) {
                      setPhotoError("URL cannot be empty");
                      return;
                    }
                    try {
                      // Accept any valid URL without enforcing file extensions
                      new URL(v);
                    } catch {
                      setPhotoError("Enter a valid URL");
                      return;
                    }
                    setEditData((s) => ({ ...s, avatar_url: v }));
                    setPhotoDialogOpen(false);
                  }}
                >
                  Use this photo
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Theme settings removed per design; theme controlled via avatar menu */}
        </div>

  {/* Sidebar */}
  <div className="space-y-6">
      <Card>
            <CardHeader>
        <CardTitle className="text-base font-medium text-muted-foreground">Account info</CardTitle>
        <CardDescription className="text-xs">Metadata and usage</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Row label="Created" icon={<Calendar className="h-4 w-4 text-muted-foreground" />} muted>
                {formatDateTime((profileUser as any)?.created_at, userTimezone)}
              </Row>
              <Row label="Last Login" icon={<Calendar className="h-4 w-4 text-muted-foreground" />} muted>
                {formatDateTime((profileUser as any)?.last_login, userTimezone)}
              </Row>
            </CardContent>
          </Card>

          
        </div>
      </div>
    </div>
  </div>
  );
}

/* Small presentational helpers */
function FieldView({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Label className="text-sm font-medium text-muted-foreground">{label}</Label>
      <p className="mt-1 text-sm">{value || "—"}</p>
    </div>
  );
}

// Profile combobox was removed per new design (selection via avatar menu)

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
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function Row({
  label,
  children,
  icon,
  muted,
}: {
  label: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className={`flex items-center gap-2 ${muted ? 'text-muted-foreground' : ''}`}>
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <span className={`text-sm font-medium ${muted ? 'text-muted-foreground' : ''}`}>{children}</span>
    </div>
  );
}

// Searchable combobox for AWS regions. Only allows picking a valid region from the list.
function PreferredRegionCombobox({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const currentName = AWS_REGION_NAME_BY_CODE.get(value) || value;

  const handleSelect = (code: string) => {
    onChange(code);
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="preferred_region">Preferred Region</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="preferred_region"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {currentName || 'Select region...'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[--radix-popover-trigger-width]">
          <Command filter={(val, search) => {
            // filter by code or name
            const code = val.toLowerCase();
            const name = AWS_REGION_NAME_BY_CODE.get(val)?.toLowerCase() || '';
            const s = search.toLowerCase();
            return code.includes(s) || name.includes(s) ? 1 : 0;
          }}>
            <CommandInput placeholder="Type a region code or name..." />
            <CommandEmpty>No region found.</CommandEmpty>
            <CommandList>
              <CommandGroup heading="AWS Commercial">
                {AWS_REGIONS.filter(r => r.partition === 'aws').map((r) => (
                  <CommandItem key={r.code} value={r.code} onSelect={handleSelect}>
                    <div className="flex flex-col">
                      <span className="font-medium">{r.name}</span>
                      <span className="text-xs text-muted-foreground">{r.code}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandGroup heading="AWS GovCloud">
                {AWS_REGIONS.filter(r => r.partition === 'aws-us-gov').map((r) => (
                  <CommandItem key={r.code} value={r.code} onSelect={handleSelect}>
                    <div className="flex flex-col">
                      <span className="font-medium">{r.name}</span>
                      <span className="text-xs text-muted-foreground">{r.code}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandGroup heading="AWS China">
                {AWS_REGIONS.filter(r => r.partition === 'aws-cn').map((r) => (
                  <CommandItem key={r.code} value={r.code} onSelect={handleSelect}>
                    <div className="flex flex-col">
                      <span className="font-medium">{r.name}</span>
                      <span className="text-xs text-muted-foreground">{r.code}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Language selector combobox (structured like AWS regions combobox)
function LanguageCombobox({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = SUPPORTED_LANGUAGES.find((l) => l.code === value) || SUPPORTED_LANGUAGES[0];

  const handleSelect = (code: string) => {
    onChange(code);
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="language">Language</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button id="language" variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
            {current?.name || value || 'Select language...'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[--radix-popover-trigger-width]">
          <Command filter={(val, search) => {
            const code = val.toLowerCase();
            const name = SUPPORTED_LANGUAGES.find((l) => l.code === val)?.name.toLowerCase() || '';
            const s = search.toLowerCase();
            return code.includes(s) || name.includes(s) ? 1 : 0;
          }}>
            <CommandInput placeholder="Type a code or name..." />
            <CommandEmpty>No language found.</CommandEmpty>
            <CommandList>
              <CommandGroup heading="Supported Languages">
                {SUPPORTED_LANGUAGES.map((l) => (
                  <CommandItem key={l.code} value={l.code} onSelect={handleSelect}>
                    <div className="flex flex-col">
                      <span className="font-medium">{l.name}</span>
                      <span className="text-xs text-muted-foreground">{l.code}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Timezone selector combobox using IANA timezones (searchable)
function TimezoneCombobox({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const tzs = useMemo(() => getTimezones(), []);
  const current = value && tzs.includes(value) ? value : 'UTC';

  const handleSelect = (code: string) => {
    onChange(code);
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="timezone">Timezone</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button id="timezone" variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
            {current}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[--radix-popover-trigger-width] max-h-72 overflow-auto">
          <Command filter={(val, search) => {
            const v = val.toLowerCase();
            const s = search.toLowerCase();
            return v.includes(s) ? 1 : 0;
          }}>
            <CommandInput placeholder="Type a timezone..." />
            <CommandEmpty>No timezone found.</CommandEmpty>
            <CommandList>
              <CommandGroup heading="IANA Timezones">
                {tzs.map((tz) => (
                  <CommandItem key={tz} value={tz} onSelect={handleSelect}>
                    <span className="font-medium">{tz}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}