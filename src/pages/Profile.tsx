import { useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store";
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
import ThemeSelector from "@/components/ThemeSelector";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/use-toast";
import { buildApiUrl, getAuthHeaders, API_CONFIG } from "@/lib/api-config";

// Form model (supports both legacy and auth-types fields)
type EditableProfile = {
  display_name: string;
  name: string; // kept in sync with display_name for auth-types
  email: string;
  first_name: string;
  last_name: string;
  profile_description: string;
  timezone: string;
  language: string;
  preferred_region: string;
  avatar_url: string;
};

export default function Profile() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const { isDark } = useTheme();

  const user = useAppSelector(selectUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isLoading = useAppSelector(selectIsLoading);
  const authError = useAppSelector(selectAuthError);

  // Redirect unauthenticated users
  useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate("/login");
  }, [isLoading, isAuthenticated, navigate]);

  // Build initial form state from user (auth-types vs extended)
  const initialForm: EditableProfile = useMemo(() => {
    const u: any = user || {};
    // Map auth-types name -> display_name if needed
    const displayName = u.display_name || u.name || "";
    return {
      display_name: displayName,
      name: displayName,
      email: u.email || "",
      first_name: u.first_name || "",
      last_name: u.last_name || "",
      profile_description: u.profile_description || "",
      timezone: u.timezone || "UTC",
      language: u.language || "en-US",
      preferred_region: u.preferred_region || "us-east-1",
      avatar_url: u.avatar_url || u.avatar || "",
    };
  }, [user]);

  const [editData, setEditData] = useState<EditableProfile>(initialForm);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Keep form in sync when user changes (e.g., after login)
  useEffect(() => {
    setEditData(initialForm);
  }, [initialForm]);

  // Helpers
  const fullName = useMemo(() => {
    if (editData.display_name) return editData.display_name;
    const first = editData.first_name?.trim();
    const last = editData.last_name?.trim();
    return [first, last].filter(Boolean).join(" ") || "Unknown User";
  }, [editData.display_name, editData.first_name, editData.last_name]);

  const initials = useMemo(() => {
    if (editData.display_name) {
      return editData.display_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
    }
    const f = (editData.first_name || "").charAt(0);
    const l = (editData.last_name || "").charAt(0);
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

  // Compute JSON patch (only changed fields)
  const toPatch = (current: EditableProfile, original: EditableProfile) => {
    const diff: Record<string, any> = {};
    (Object.keys(current) as (keyof EditableProfile)[]).forEach((k) => {
      if (current[k] !== original[k]) {
        diff[k] = current[k];
      }
    });
    // Keep auth-types "name" and extended "display_name" consistent
    if ("display_name" in diff && !("name" in diff)) diff.name = diff.display_name;
    if ("name" in diff && !("display_name" in diff)) diff.display_name = diff.name;
    return diff;
  };

  // Save handler: PATCH /auth/v1/me
  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = toPatch(editData, initialForm);
      if (Object.keys(payload).length === 0) {
        setEditing(false);
        setSaving(false);
        return;
      }

      const res = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.ME), {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let msg = "Failed to save profile";
        try {
          const data = await res.json();
          msg = data?.message || data?.error || msg;
        } catch {
          // ignore parse errors
        }
        toast({ title: "Save failed", description: msg, variant: "destructive" });
        setSaving(false);
        return;
      }

      // Optional: attempt to read updated profile (no slice setter in authSlice)
      // We optimistically keep editData as the source of truth in view mode.
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

  if (!user) {
    // Loading state or unauthenticated
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">{isLoading ? "Loading profile..." : "No profile found"}</p>
          {authError && <p className="text-sm text-destructive mt-2">{authError}</p>}
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
                  <AvatarImage src={editData.avatar_url} alt={fullName} />
                  <AvatarFallback className="text-lg">{initials}</AvatarFallback>
                </Avatar>
                {editing && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      // Simple UX: focus input below
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
                    <FieldView label="Display Name" value={editData.display_name || "—"} />
                    <FieldView label="Email" value={editData.email || "—"} />
                    <FieldView label="First Name" value={editData.first_name || "—"} />
                    <FieldView label="Last Name" value={editData.last_name || "—"} />
                    <FieldView label="Timezone" value={editData.timezone || "UTC"} />
                    <FieldView label="Language" value={editData.language || "en-US"} />
                    <FieldView label="Preferred Region" value={editData.preferred_region || "us-east-1"} />
                  </div>
                  <Separator />
                  <FieldView label="Profile Description" value={editData.profile_description || "No description"} />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FieldEdit
                      id="display_name"
                      label="Display Name"
                      value={editData.display_name}
                      onChange={(v) => setEditData((s) => ({ ...s, display_name: v, name: v }))}
                      placeholder="How your name appears"
                    />
                    <FieldEdit
                      id="email"
                      label="Email"
                      type="email"
                      value={editData.email}
                      onChange={(v) => setEditData((s) => ({ ...s, email: v }))}
                      placeholder="you@company.com"
                    />
                    <FieldEdit
                      id="first_name"
                      label="First Name"
                      value={editData.first_name}
                      onChange={(v) => setEditData((s) => ({ ...s, first_name: v }))}
                    />
                    <FieldEdit
                      id="last_name"
                      label="Last Name"
                      value={editData.last_name}
                      onChange={(v) => setEditData((s) => ({ ...s, last_name: v }))}
                    />
                    <FieldEdit
                      id="timezone"
                      label="Timezone"
                      value={editData.timezone}
                      onChange={(v) => setEditData((s) => ({ ...s, timezone: v }))}
                      placeholder="UTC, America/New_York, ..."
                    />
                    <FieldEdit
                      id="language"
                      label="Language"
                      value={editData.language}
                      onChange={(v) => setEditData((s) => ({ ...s, language: v }))}
                      placeholder="en-US, en-GB, ..."
                    />
                    <FieldEdit
                      id="preferred_region"
                      label="Preferred Region"
                      value={editData.preferred_region}
                      onChange={(v) => setEditData((s) => ({ ...s, preferred_region: v }))}
                      placeholder="us-east-1"
                    />
                    <FieldEdit
                      id="avatar_url"
                      label="Avatar URL"
                      value={editData.avatar_url}
                      onChange={(v) => setEditData((s) => ({ ...s, avatar_url: v }))}
                      placeholder="https://example.com/avatar.jpg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile_description">Profile Description</Label>
                    <Textarea
                      id="profile_description"
                      rows={3}
                      value={editData.profile_description}
                      onChange={(e) =>
                        setEditData((s) => ({ ...s, profile_description: e.target.value }))
                      }
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
                {formatDate((user as any)?.created_at)}
              </Row>
              <Row label="Last Login" icon={<Calendar className="h-4 w-4 text-muted-foreground" />}>
                {formatDate((user as any)?.last_login)}
              </Row>
              <Row label="AWS Account" icon={<Building2 className="h-4 w-4 text-muted-foreground" />}>
                {(user as any)?.aws_account_id || "—"}
              </Row>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Current Profile</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {(user as any)?.profile_name || "default"}
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