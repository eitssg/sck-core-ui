import { selectUser as selectProfileUser, selectUserProfiles, selectCurrentProfile, switchToProfile, fetchAuthProfiles, fetchAuthProfile, patchAuthProfile, createAuthProfile } from '@/store/slices/profileSlice'
import { useEffect, useMemo, useState } from "react";
import { useAppSelector } from "@/store";
import { AlertTriangle } from "lucide-react";
import { selectUser } from "@/store/slices/authSlice";
import { Link, useNavigate } from "react-router-dom";
import { User as UserIcon, Save, Edit, Camera, Calendar, Building2, Trash2, Cloud, LogOut, ArrowLeftRight, Plus, Pencil, Check, X, KeyRound } from "lucide-react";
import { deleteAuthProfile } from '@/store/slices/profileSlice';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
import { getThemesList } from "@/lib/themes";
import { useToast } from "@/hooks/use-toast";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/store";
import { refreshAccessToken } from "@/store/slices/authSlice";
import { useAuth as useAuthRedux } from "@/hooks/useAuth";
import { useAuth as useAuthContext } from "@/contexts/useAuth";
import { useReduxData } from "@/hooks/useReduxData";
// Removed deprecated /auth/v1/me imports (fetchUserProfileThunk, patchCurrentUserProfile, etc.)
import { selectProfileLoading } from '@/store/slices/profileSlice'
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
import { apiFetch } from '@/lib/api-fetch';
import { buildApiUrl } from '@/lib/api-config';
// ...existing imports...
import { useAppDispatch } from '@/store';
import { selectPasskeys, selectPasskeysStatus, fetchPasskeys, renamePasskey, deletePasskeyAction } from '@/store/slices/passkeysSlice';

// Base64url helpers for WebAuthn
function base64urlToBytes(b64url: string): Uint8Array {
  const pad = (s: string) => s + '==='.slice((s.length + 3) % 4);
  const b64 = pad(b64url.replace(/-/g, '+').replace(/_/g, '/'));
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function bytesToBase64url(buf: ArrayBuffer | Uint8Array): string {
  const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

// Helper to create new profile via new /auth/v1/profiles endpoint
async function createProfileClone(base: any, newName: string, dispatch: any) {
  const payload = { ...(base || {}), profile_name: newName };
  delete payload.created_at; delete payload.updated_at; delete payload.last_login; delete (payload as any).credentials;
  const action = await dispatch(createAuthProfile({ profileData: payload }));
  if (createAuthProfile.rejected.match(action)) {
    throw new Error(action.payload as any || 'Profile create failed');
  }
  return (action as any).payload?.profile;
}

export default function Profile() {
  const { logout: logoutCtx } = useAuthContext();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isDark, toggleTheme } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { logout: logoutRedux } = useAuthRedux();
  const { clients, actions, selectedClient } = useReduxData();

  const user = useAppSelector(selectUser);
  const profileUser = useAppSelector(selectProfileUser as any);
  const profileLoading = useAppSelector(selectProfileLoading as any);
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
  // New profile modal state
  const [addOpen, setAddOpen] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  // Delete profile dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  // Passkeys state
  const passkeys = useAppSelector(selectPasskeys as any);
  const passkeysStatus = useAppSelector(selectPasskeysStatus as any);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState<string>('');
  const passkeysEnabled = useMemo(() => Array.isArray(passkeys) && (passkeys as any[]).length > 0, [passkeys]);
  const [passkeyDeleteAllOpen, setPasskeyDeleteAllOpen] = useState(false);
  const [passkeyBulkDeleting, setPasskeyBulkDeleting] = useState(false);

  // WebAuthn support detection (gate Add passkey)
  const webAuthnSupported = useMemo(() => {
    try {
      const hasCreds = typeof window !== 'undefined' && !!(navigator as any)?.credentials;
      const hasPKC = typeof window !== 'undefined' && 'PublicKeyCredential' in window;
      const isSecure = typeof window !== 'undefined' && (window.isSecureContext ?? location.protocol === 'https:');
      return Boolean(hasCreds && hasPKC && isSecure);
    } catch {
      return false;
    }
  }, []);

  // Add Passkey handler (register flow)
  const handleAddPasskey = async () => {
    try {
      // 1) Begin: issue challenge + options (cookie-bound)
      const beginRes = await apiFetch(buildApiUrl('/auth/v1/webauthn/register/begin'), {
        method: 'POST',
        contextLabel: 'PasskeyRegisterBegin',
      });
      if (!beginRes.ok) {
        const err = await beginRes.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to begin registration');
      }
      const beginJson = await beginRes.json();
      const options = (beginJson?.data) ? beginJson.data : beginJson; // tolerate envelope or raw

      // 2) Convert options to proper WebAuthn shapes (ArrayBuffers)
      const publicKey: PublicKeyCredentialCreationOptions = {
        challenge: base64urlToBytes(String(options.challenge)),
        attestation: options.attestation || 'none',
        timeout: options.timeout || 60000,
        pubKeyCredParams: options.pubKeyCredParams || [ { type: 'public-key', alg: -7 } ],
        authenticatorSelection: {
          ...(options.authenticatorSelection || {}),
          // Nudge toward external authenticators when possible
          authenticatorAttachment: (options.authenticatorSelection?.authenticatorAttachment as any) || 'cross-platform',
        } as any,
        rp: options.rp || { name: 'Simple Cloud Kit', id: window.location.hostname },
        user: options.user ? {
          id: base64urlToBytes(String(options.user.id || '')),
          name: String(options.user.name || ''),
          displayName: String(options.user.displayName || options.user.name || ''),
        } : undefined,
        excludeCredentials: Array.isArray(options.excludeCredentials)
          ? options.excludeCredentials.map((c: any) => ({ type: 'public-key', id: base64urlToBytes(String(c.id)), transports: c.transports }))
          : undefined,
      } as any;

      // 3) Create credential
      const cred = await navigator.credentials.create({ publicKey }) as PublicKeyCredential;
      if (!cred) throw new Error('User cancelled or credential not created');

      const attResp = cred.response as AuthenticatorAttestationResponse & { getTransports?: () => string[] };

      // 4) Complete: send attestation back (server verifies + persists)
      const completePayload: any = {
        key_id: cred.id,
        clientDataJSON: bytesToBase64url(attResp.clientDataJSON),
        attestationObject: bytesToBase64url(attResp.attestationObject),
        clientDataChallenge: String(options.challenge),
      };
      try {
        if (typeof (attResp as any).getTransports === 'function') {
          completePayload.transports = (attResp as any).getTransports();
        }
      } catch { /* ignore */ }

      const finishRes = await apiFetch(buildApiUrl('/auth/v1/webauthn/register/complete'), {
        method: 'POST',
        body: JSON.stringify(completePayload),
        contextLabel: 'PasskeyRegisterComplete',
      });
      if (!finishRes.ok) {
        const err = await finishRes.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to complete registration');
      }

      // 5) Refresh list and notify
      await dispatch(fetchPasskeys() as any);
      toast({ title: 'Passkey added', description: 'Your new passkey is ready to use.' });
    } catch (e: any) {
      toast({ title: 'Add passkey failed', description: e?.message || 'Unable to register passkey', variant: 'destructive' });
    }
  };
  // Theme presets selection (per profile)
  const allPresetThemes = useMemo(() => getThemesList(), []);
  const lightThemes = useMemo(() => allPresetThemes.filter((t:any) => !t.isDark), [allPresetThemes]);
  const darkThemes = useMemo(() => allPresetThemes.filter((t:any) => t.isDark), [allPresetThemes]);
  const currentLightPresetId = String(((profileUser as any)?.preferences?.ui?.lightThemeId) || '');
  const currentDarkPresetId = String(((profileUser as any)?.preferences?.ui?.darkThemeId) || '');

  // Derive client context (prefer selected client, then active slice, then profile, then JWT)
  const jwtClient = useMemo(() => authAPI.getCurrentClient(), []);
  const effectiveClientSlug = useMemo(() => {
    const p: any = profileUser || {};
    return selectedClientSlug || activeClientSlug || p.client || jwtClient || "";
  }, [selectedClientSlug, activeClientSlug, profileUser, jwtClient]);
  // Pull client details for effective client
  const clientObj = useAppSelector((state) => selectClientBySlug(state as any, effectiveClientSlug || ""));
  const clientName = useMemo(() => {
    const p: any = profileUser || {};
    return (clientObj as any)?.client_name || selectedClientName || p.client_name || "";
  }, [clientObj, selectedClientName, profileUser]);
  const organizationName = useMemo(() => {
    const p: any = profileUser || {};
    return (clientObj as any)?.organization_name || p.organization_name || "";
  }, [clientObj, profileUser]);

  // ProtectedRoute already handles access control.

  // Removed local initial profiles fetch; centralized in ProfileBootstrap to avoid duplicate network calls.

  // Ensure clients are fetched for header controls
  useEffect(() => {
    if ((clients as any)?.status === 'idle') {
      actions.clients.fetch({ limit: 100 });
    }
  }, [clients, actions.clients]);

  // Fetch passkeys on mount (5m cached in slice)
  useEffect(() => {
    dispatch(fetchPasskeys() as any);
  }, [dispatch]);

  // Ensure client details are loaded when we have a slug
  useEffect(() => {
    const slug = effectiveClientSlug;
    if (!slug) return;
    if (!clientObj) {
      dispatch(fetchClient({ clientSlug: slug } as any));
    }
  }, [dispatch, effectiveClientSlug, clientObj]);

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

  // MFA status derived from profile (fallback false if absent)
  const mfaEnabled = useMemo(() => {
    const p: any = profileUser || {};
    return Boolean(p.mfa_enabled);
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


  // Preferred region changes are staged and applied on Save (no immediate PATCH)

  // Compute diff helper
  function diffFields<T extends Record<string, any>>(current: T, original: T, fields: (keyof T)[]) {
    const out: Partial<T> = {};
    fields.forEach((k) => {
      if (current[k] !== original[k]) out[k] = current[k];
    });
    return out as Record<string, any>;
  }

  // Save handler: PATCH /auth/v1/profiles/{profile_name} (send only changed fields)
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
        // include preferences so theme presets can be saved with Save button
        "preferences" as any,
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

  const action = await dispatch(patchAuthProfile({ profileName: editData.profile_name || 'default', profileData: diff as any }));
  if (patchAuthProfile.rejected.match(action)) {
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

  // Note: Do not show a "No profile" overlay; a user always has a profile. If
  // profile is not yet loaded, we rely on the loading state above and
  // render the page using safe fallbacks.

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

            {/* Removed redundant current client label; dropdown above is sufficient */}

            {/* Passkeys indicator moved into Passkeys card below */}

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
            <CardHeader data-testid="personal-info-header" className="flex flex-row items-start gap-2">
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="h-5 w-5 text-primary" />
                Personal Information
              </CardTitle>
              <div className="ml-auto flex items-center gap-2">
        {!editing ? (
                  <>
                    <Button data-testid="personal-info-edit" aria-label="Edit personal information" variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground" onClick={() => setEditing(true)}>
                      <Edit className="h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-muted-foreground hover:text-foreground"
                      onClick={() => { setAddOpen(true); setNewProfileName(''); setAddError(null); }}
                    >
                      <Plus className="h-4 w-4" />
                      Add
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-muted-foreground hover:text-foreground"
                      disabled={String((profileUser as any)?.profile_name || currentProfileName || 'default') === 'default'}
                      onClick={() => {
                        const name = String((profileUser as any)?.profile_name || currentProfileName || 'default');
                        if (name === 'default') return;
                        setDeleteTarget(name);
                        setDeleteDialogOpen(true);
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
                    <Button data-testid="personal-info-save" aria-label="Save personal information" size="sm" onClick={handleSave} disabled={saving} className="gap-1">
                      <Save className="h-4 w-4" />
                      {saving ? "Saving..." : "Save"}
                    </Button>
                  </>
                )}
              </div>
              {/* Removed redundant helper description per request */}
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar row with passkeys status on the right */}
              <div className="flex items-start justify-between">
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
                {/* Passkeys status badge removed as redundant; detailed section exists below */}
              </div>

              {!editing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Client details */}
                    <FieldView
                      label="Client"
                      value={String(
                        (clientName || effectiveClientSlug)
                          ? `${clientName || effectiveClientSlug}${effectiveClientSlug ? ` (${effectiveClientSlug})` : ''}`
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
                          <Link to="/aws-credentials" aria-label="Edit AWS Credentials">
                            <Edit className="h-4 w-4" />
                          </Link>
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
                    {/* MFA status row */}
                    <div>
                      <div className="flex items-center">
                        <Label className="text-sm font-medium text-muted-foreground">MFA</Label>
                        <Button asChild variant="ghost" size="icon" className="h-7 w-7 ml-1 text-muted-foreground">
                          <Link to="/mfa-token" aria-label="Edit MFA Settings">
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                      <p className="mt-1 text-sm">{mfaEnabled ? 'Active' : 'Inactive'}</p>
                    </div>
                    {/* Passkeys Enabled/Disabled */}
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Passkeys</Label>
                      <div className="mt-1">
                        <Badge variant={passkeysEnabled ? 'default' : 'secondary'}>{passkeysEnabled ? 'Enabled' : 'Disabled'}</Badge>
                      </div>
                    </div>
                    <FieldView label="My Home AWS Account" value={String((profileUser as any)?.aws_account_id || '—')} />
                    <FieldView label="Preferred Region" value={String(editData.preferred_region || "us-east-1")} />
                  </div>
                  <Separator />
                  <FieldView label="Profile Description" value={String(editData.profile_description || "No description")} />

                  {/* Theme Preferences (view mode, shows current presets) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FieldView label="Light Theme Preset" value={String(currentLightPresetId || 'Default')} />
                    <FieldView label="Dark Theme Preset" value={String(currentDarkPresetId || 'Default')} />
                  </div>
                </div>
              ) : (
                 <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Client details */}
                      <FieldView
                        label="Client"
                        value={String(
                          (clientName || effectiveClientSlug)
                            ? `${clientName || effectiveClientSlug}${effectiveClientSlug ? ` (${effectiveClientSlug})` : ''}`
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
                          <Link to="/aws-credentials" aria-label="Edit AWS Credentials">
                            <Edit className="h-4 w-4" />
                          </Link>
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
                    {/* MFA status row (non-editable) */}
                    <div>
                      <div className="flex items-center">
                        <Label className="text-sm font-medium text-muted-foreground">MFA</Label>
                        <Button asChild variant="ghost" size="icon" className="h-7 w-7 ml-1 text-muted-foreground">
                          <Link to="/mfa-token" aria-label="Edit MFA Settings">
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                      <p className="mt-1 text-sm">{mfaEnabled ? 'Active' : 'Inactive'}</p>
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
                      onChange={(v) => setEditData((s) => ({ ...s, preferred_region: v }))}
                    />
                  </div>
                  <div className="space-y-2">

                    {/* Theme Preferences (edit mode) */}
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Light Theme Preset</Label>
                        <Select
                          value={String((editData as any)?.preferences?.ui?.lightThemeId || currentLightPresetId || 'default')}
                          onValueChange={(value) => {
                            const nextPrefs = { ...((editData as any)?.preferences || {}) } as any;
                            const ui = { ...(nextPrefs.ui || {}) };
                            if (value === 'default') delete ui.lightThemeId; else ui.lightThemeId = value;
                            nextPrefs.ui = ui;
                            setEditData((s) => ({ ...s, preferences: nextPrefs } as any));
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Default (base light)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">Default (base light)</SelectItem>
                            {lightThemes.map((t:any) => (
                              <SelectItem key={t.name} value={t.name}>{t.displayName || t.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Dark Theme Preset</Label>
                        <Select
                          value={String((editData as any)?.preferences?.ui?.darkThemeId || currentDarkPresetId || 'default')}
                          onValueChange={(value) => {
                            const nextPrefs = { ...((editData as any)?.preferences || {}) } as any;
                            const ui = { ...(nextPrefs.ui || {}) };
                            if (value === 'default') delete ui.darkThemeId; else ui.darkThemeId = value;
                            nextPrefs.ui = ui;
                            setEditData((s) => ({ ...s, preferences: nextPrefs } as any));
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Default (base dark)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">Default (base dark)</SelectItem>
                            {darkThemes.map((t:any) => (
                              <SelectItem key={t.name} value={t.name}>{t.displayName || t.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
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
          {/* Add New Profile Dialog */}
          <Dialog open={addOpen} onOpenChange={(o) => { if (!adding) { setAddOpen(o); if(!o){ setNewProfileName(''); setAddError(null);} } }}>
            <DialogContent className="w-[92vw] max-w-sm p-4 sm:p-6">
              <DialogHeader>
                <DialogTitle>Create New Profile</DialogTitle>
                <DialogDescription>Please enter profile identifier (lowercase a-z, max 12 characters).</DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="new_profile_name">Profile Identifier</Label>
                <Input
                  id="new_profile_name"
                  autoFocus
                  placeholder="e.g. devops"
                  value={newProfileName}
                  disabled={adding}
                  onChange={(e) => {
                    const raw = e.target.value.toLowerCase();
                    if (!/^[a-z]*$/.test(raw)) return; // block invalid chars
                    if (raw.length > 12) return; // enforce length
                    setNewProfileName(raw);
                    setAddError(null);
                  }}
                />
                {addError && <p className="text-sm text-destructive">{addError}</p>}
              </div>
              <DialogFooter className="pt-4 gap-2">
                <Button variant="ghost" disabled={adding} onClick={() => { setAddOpen(false); setNewProfileName(''); setAddError(null); }}>Cancel</Button>
                <Button
                  disabled={adding || !newProfileName}
                  onClick={async () => {
                    if (!newProfileName) return;
                    if (!/^[a-z]{1,12}$/.test(newProfileName)) { setAddError('Must be 1-12 lowercase letters a-z'); return; }
                    // Check existing profiles
                    if (profiles.some(p => (p as any)?.profile_name === newProfileName)) {
                      setAddError('Profile already exists');
                      return;
                    }
                    try {
                      setAdding(true);
                      const base = profileUser || profiles.find(p => (p as any)?.profile_name === currentProfileName) || {};
                      const created = await createProfileClone(base, newProfileName, dispatch);
                      // Refetch profiles list to include the newly created one (force bypass cache)
                      await dispatch(fetchAuthProfiles({ force: true }) as any);
                      // Fetch full profile details (authoritative) then switch; fallback to local switch if fetch fails
                      try {
                        const act: any = await dispatch(fetchAuthProfile({ profileName: newProfileName, force: true }) as any);
                        if (fetchAuthProfile.rejected.match(act)) {
                          // fallback local switch
                          dispatch(switchToProfile({ profileName: newProfileName }) as any);
                        }
                      } catch {
                        dispatch(switchToProfile({ profileName: newProfileName }) as any);
                      }
                      try { sessionStorage.setItem('sck_profile_name', newProfileName); } catch { /* ignore storage errors */ }
                      toast({ title: 'Profile created', description: `Switched to ${newProfileName}` });
                      setAddOpen(false);
                      setNewProfileName('');
                    } catch (e:any) {
                      setAddError(e?.message || 'Failed to create profile');
                    } finally {
                      setAdding(false);
                    }
                  }}
                >
                  {adding ? 'Saving...' : 'Save'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          {/* Delete Profile Confirmation Dialog */}
          <Dialog open={deleteDialogOpen} onOpenChange={(o) => { if(!deleting) { setDeleteDialogOpen(o); if(!o){ setDeleteTarget(null); } } }}>
            <DialogContent className="w-[92vw] max-w-sm p-4 sm:p-6">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Delete Profile
                </DialogTitle>
                <DialogDescription>
                  You are deleting your current profile{deleteTarget ? ` "${deleteTarget}"` : ''}. This action cannot be undone. Are you sure you wish to continue?
                </DialogDescription>
              </DialogHeader>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>The application will switch to the default profile before deletion.</p>
              </div>
              <DialogFooter className="pt-4 gap-2">
                <Button variant="ghost" disabled={deleting} onClick={() => { setDeleteDialogOpen(false); setDeleteTarget(null); }}>No</Button>
                <Button
                  variant="destructive"
                  disabled={deleting || !deleteTarget}
                  onClick={async () => {
                    if (!deleteTarget) return;
                    setDeleting(true);
                    try {
                      // Switch to default first (if not already)
                      if (deleteTarget !== 'default') {
                        dispatch(switchToProfile({ profileName: 'default' }) as any);
                      }
                      // Perform deletion
                      await dispatch(deleteAuthProfile({ profileName: deleteTarget }) as any).unwrap();
                      toast({ title: 'Profile deleted', description: `Profile ${deleteTarget} removed.` });
                      setDeleteDialogOpen(false);
                      setDeleteTarget(null);
                    } catch (e:any) {
                      toast({ title: 'Delete failed', description: e?.message || 'Error deleting profile', variant: 'destructive' });
                    } finally {
                      setDeleting(false);
                    }
                  }}
                >
                  {deleting ? 'Deleting...' : 'Yes, Delete'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

  {/* Sidebar */}
  <div className="space-y-6">
          {/* Delete All Passkeys Confirmation Dialog */}
          <Dialog open={passkeyDeleteAllOpen} onOpenChange={(o) => { if(!passkeyBulkDeleting) setPasskeyDeleteAllOpen(o); }}>
            <DialogContent className="w-[92vw] max-w-sm p-4 sm:p-6">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Delete All Passkeys
                </DialogTitle>
                <DialogDescription>
                  This will remove all registered passkeys from your account. You can add new passkeys later. Continue?
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="pt-4 gap-2">
                <Button variant="ghost" disabled={passkeyBulkDeleting} onClick={() => setPasskeyDeleteAllOpen(false)}>Cancel</Button>
                <Button
                  variant="destructive"
                  disabled={passkeyBulkDeleting}
                  onClick={async () => {
                    try {
                      setPasskeyBulkDeleting(true);
                      const list = Array.isArray(passkeys) ? (passkeys as any[]) : [];
                      for (const pk of list) {
                        try {
                          await (dispatch as any)(deletePasskeyAction({ key_id: pk.key_id } as any));
                        } catch {/* ignore per-item */}
                      }
                      await (dispatch as any)(fetchPasskeys());
                      setPasskeyDeleteAllOpen(false);
                      toast({ title: 'Passkeys deleted', description: 'All passkeys were removed.' });
                    } catch (e:any) {
                      toast({ title: 'Delete failed', description: e?.message || 'Error deleting passkeys', variant: 'destructive' });
                    } finally {
                      setPasskeyBulkDeleting(false);
                    }
                  }}
                >
                  {passkeyBulkDeleting ? 'Deleting…' : 'Yes, Delete All'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Passkeys section (moved before Account info) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">Passkeys</CardTitle>
              <CardDescription className="text-xs">Passwordless devices registered to your account</CardDescription>
              <div className="ml-auto flex items-center gap-2 justify-end">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground"
                          onClick={handleAddPasskey}
                          disabled={!webAuthnSupported}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add passkey
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {!webAuthnSupported && (
                      <TooltipContent side="left">
                        Your browser must support WebAuthn in a secure context (HTTPS) to add a passkey.
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
                {Array.isArray(passkeys) && (passkeys as any[]).length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={() => setPasskeyDeleteAllOpen(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete all
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
        {passkeysStatus === 'loading' ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !passkeys || (passkeys as any[]).length === 0 ? (
                <p className="text-sm text-muted-foreground">No passkeys registered.</p>
              ) : (
                <div className="space-y-2">
          {(passkeys as any[]).map((pk: any) => (
                    <div key={pk.key_id} data-testid={`passkey-row-${pk.key_id}`} className="flex items-center gap-2 justify-between border rounded-md px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
              {renamingId === pk.key_id ? (
                            <Input
                data-testid={`passkey-rename-input-${pk.key_id}`}
                              value={renameDraft}
                              onChange={(e) => setRenameDraft(e.target.value)}
                              className="h-8"
                            />
                          ) : (
                            <span className="text-sm font-medium truncate">
                              {pk.name || 'Unnamed device'}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {pk.device_type || 'device'} • {pk.key_id}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Last used {formatDateTime(pk.last_used_at, userTimezone)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {renamingId === pk.key_id ? (
                          <>
                            <Button
                              data-testid={`passkey-save-${pk.key_id}`}
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={async () => {
                                const name = renameDraft.trim();
                                try {
                                  const act: any = await dispatch(renamePasskey({ key_id: pk.key_id, name }) as any);
                                  if (renamePasskey.rejected.match(act)) throw new Error(act.payload as any);
                                  setRenamingId(null);
                                  setRenameDraft('');
                                  toast({ title: 'Renamed', description: 'Passkey name updated.' });
                                } catch (e: any) {
                                  toast({ title: 'Rename failed', description: e?.message || 'Error', variant: 'destructive' });
                                }
                              }}
                              aria-label="Save name"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => { setRenamingId(null); setRenameDraft(''); }}
                              aria-label="Cancel rename"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            data-testid={`passkey-rename-${pk.key_id}`}
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => { setRenamingId(pk.key_id); setRenameDraft(String(pk.name || '')); }}
                            aria-label="Rename"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive"
                          onClick={async () => {
                            try {
                              const act: any = await dispatch(deletePasskeyAction({ key_id: pk.key_id }) as any);
                              if (deletePasskeyAction.rejected.match(act)) throw new Error(act.payload as any);
                              toast({ title: 'Deleted', description: 'Passkey removed.' });
                            } catch (e: any) {
                              toast({ title: 'Delete failed', description: e?.message || 'Error', variant: 'destructive' });
                            }
                          }}
                          aria-label="Delete passkey"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Account info (moved after Passkeys) */}
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
  <p className="mt-1 text-sm contrast-value">{value || "—"}</p>
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
  <span className={`text-sm font-medium ${muted ? 'text-muted-foreground' : 'contrast-value'}`}>{children}</span>
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
                  <CommandItem key={r.code} value={r.code} onSelect={handleSelect} data-testid={`region-option-${r.code}`}>
                    <div className="flex flex-col">
                      <span className="font-medium">{r.name}</span>
                      <span className="text-xs text-muted-foreground">{r.code}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandGroup heading="AWS GovCloud">
                {AWS_REGIONS.filter(r => r.partition === 'aws-us-gov').map((r) => (
                  <CommandItem key={r.code} value={r.code} onSelect={handleSelect} data-testid={`region-option-${r.code}`}>
                    <div className="flex flex-col">
                      <span className="font-medium">{r.name}</span>
                      <span className="text-xs text-muted-foreground">{r.code}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandGroup heading="AWS China">
                {AWS_REGIONS.filter(r => r.partition === 'aws-cn').map((r) => (
                  <CommandItem key={r.code} value={r.code} onSelect={handleSelect} data-testid={`region-option-${r.code}`}>
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