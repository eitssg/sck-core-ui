import { useEffect, useMemo, useState } from "react";
import { useAppSelector } from "@/store";
import {
  selectUser,
  selectIsAuthenticated,
  selectIsLoading,
  selectAuthError,
} from "@/store/slices/authSlice";
import { useNavigate } from "react-router-dom";
import { User as UserIcon, Save, Edit, Camera, Calendar, Building2, Palette } from "lucide-react";
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
import ThemeSelector from "@/components/ThemeSelector";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/use-toast";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/store";
import {
  fetchUserProfile as fetchUserProfileThunk,
  patchCurrentUserProfile,
  putCurrentUserProfile,
  selectUser as selectProfileUser,
  selectProfileLoading,
  selectProfileError,
} from "@/store/slices/profileSlice";
import type { UserProfile } from "@/store/types";
import { AWS_REGIONS, AWS_REGION_NAME_BY_CODE } from "@/constants/aws-regions";

export default function Profile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isDark } = useTheme();
  const dispatch = useDispatch<AppDispatch>();

  const user = useAppSelector(selectUser);
  const authError = useAppSelector(selectAuthError);
  const profileUser = useAppSelector(selectProfileUser as any);
  const profileLoading = useAppSelector(selectProfileLoading as any);
  const profileError = useAppSelector(selectProfileError as any);

  const [editData, setEditData] = useState<UserProfile>({} as UserProfile);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // ProtectedRoute already handles access control.

  // Hydrate-first: do NOT fetch if Redux already has a profile.
  // This runs only to backfill after hard reloads on /profile.
  useEffect(() => {
    if (!profileUser) {
      dispatch(fetchUserProfileThunk({}));
    }
  }, [dispatch, profileUser]);

  // Build initial form state from remote user (fallback to store user)
  const initialForm: UserProfile = useMemo(() => {
    const u: any = (profileUser || user || {}) as UserProfile;
    const displayName = u.display_name || u.name || "";
    return {
      user_id: u.user_id || "",
      profile_name: u.profile_name || "default",
      email: u.email || "",
      display_name: displayName,
      first_name: u.first_name || "",
      last_name: u.last_name || "",
      profile_description: u.profile_description || "",
      timezone: u.timezone || "UTC",
      language: u.language || "en-US",
      preferred_region: u.preferred_region || "us-east-1",
      avatar_url: u.avatar_url || u.avatar || "",
      // preserve any other fields from the backend to keep shape stable in memory
      ...u,
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

  const formatDate = (v?: string) => {
    if (!v) return "—";
    try {
      const d = new Date(v);
      return isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
    } catch {
      return "—";
    }
  };

  // Immediate PATCH on preferred_region selection
  const patchPreferredRegion = async (regionCode: string) => {
    if (!AWS_REGION_NAME_BY_CODE.has(regionCode)) {
      toast({ title: 'Invalid region', description: 'Please select a valid AWS region.', variant: 'destructive' });
      return;
    }
    try {
      const action = await dispatch(patchCurrentUserProfile({
        profile_name: editData.profile_name || 'default',
        preferred_region: regionCode,
      }));
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

  // Save handler: PUT /auth/v1/me (only supported fields)
  const handleSave = async () => {
    setSaving(true);
    try {
  const allowed: (keyof UserProfile)[] = ["first_name", "last_name", "email", "preferred_region"];
  const diff = diffFields(editData as any, initialForm as any, allowed as any);
  const payload: Partial<UserProfile> & { profile_name: string } = { profile_name: editData.profile_name || "default", ...(diff as Partial<UserProfile>) };

      if (Object.keys(diff).length === 0) {
        setEditing(false);
        setSaving(false);
        return;
      }

      const action = await dispatch(putCurrentUserProfile(payload));
      if (putCurrentUserProfile.rejected.match(action)) {
        const msg = (action.payload as string) || 'Failed to save profile';
        toast({ title: 'Save failed', description: msg, variant: 'destructive' });
        setSaving(false);
        return;
      }

  // Optimistically update local state
  setEditData((prev) => ({ ...(prev || {} as any), ...payload } as UserProfile));
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Profile</h1>
          <p className="text-muted-foreground">Manage your account settings and preferences</p>
        </div>
        <div className="flex gap-2">
          {!editing ? (
            <Button onClick={() => setEditing(true)} className="gap-2">
              <Edit className="h-4 w-4" />
              Edit Profile
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => { setEditData(initialForm); setEditing(false); }}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="h-5 w-5 text-primary" />
                Personal Information
              </CardTitle>
              <CardDescription>Update your basic details and preferences</CardDescription>
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
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      const el = document.getElementById("avatar_url");
                      el?.scrollIntoView({ behavior: "smooth", block: "center" });
                      (el as HTMLInputElement | null)?.focus();
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
                    <FieldView label="Display Name" value={String(editData.display_name || "—")} />
                    <FieldView label="Email" value={String(editData.email || "—")} />
                    <FieldView label="First Name" value={String(editData.first_name || "—")} />
                    <FieldView label="Last Name" value={String(editData.last_name || "—")} />
                    <FieldView label="Timezone" value={String(editData.timezone || "UTC")} />
                    <FieldView label="Language" value={String(editData.language || "en-US")} />
                    <FieldView label="Preferred Region" value={String(editData.preferred_region || "us-east-1")} />
                  </div>
                  <Separator />
                  <FieldView label="Profile Description" value={String(editData.profile_description || "No description")} />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <FieldEdit
                      id="timezone"
                      label="Timezone"
                      value={String(editData.timezone || "UTC")}
                      onChange={(v) => setEditData((s) => ({ ...s, timezone: v }))}
                      placeholder="UTC, America/New_York, ..."
                    />
                    <FieldEdit
                      id="language"
                      label="Language"
                      value={String(editData.language || "en-US")}
                      onChange={(v) => setEditData((s) => ({ ...s, language: v }))}
                      placeholder="en-US, en-GB, ..."
                    />
                    <PreferredRegionCombobox
                      value={String(editData.preferred_region || "us-east-1")}
                      onChange={(v) => patchPreferredRegion(v)}
                    />
                    <FieldEdit
                      id="avatar_url"
                      label="Avatar URL"
                      value={String(editData.avatar_url || "")}
                      onChange={(v) => setEditData((s) => ({ ...s, avatar_url: v }))}
                      placeholder="https://example.com/avatar.jpg"
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

          {/* Theme settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                Theme Settings
              </CardTitle>
              <CardDescription>
                Choose a theme. Your saved profile theme takes precedence, otherwise the system theme is used.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ThemeSelector variant="panel" />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Account Info</CardTitle>
              <CardDescription>Metadata and usage</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Row label="Created" icon={<Calendar className="h-4 w-4 text-muted-foreground" />}>
                {formatDate((profileUser as any)?.created_at)}
              </Row>
              <Row label="Last Login" icon={<Calendar className="h-4 w-4 text-muted-foreground" />}>
                {formatDate((profileUser as any)?.last_login)}
              </Row>
              <Row label="AWS Account" icon={<Building2 className="h-4 w-4 text-muted-foreground" />}>
                {(profileUser as any)?.aws_account_id || "—"}
              </Row>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Current Profile</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {(profileUser as any)?.profile_name || "default"}
                </Badge>
              </div>
            </CardContent>
          </Card>
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
}: {
  label: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <span className="text-sm font-medium">{children}</span>
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