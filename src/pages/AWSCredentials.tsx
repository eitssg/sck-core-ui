import { useState } from "react";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/store";
import { useToast } from "@/hooks/use-toast";
import { useAppSelector } from "@/store";
import { selectUser as selectProfileUser, patchCurrentUserProfile } from "@/store/slices/profileSlice";
import { refreshAccessToken } from "@/store/slices/authSlice";
import { fetchClients, selectSelectedClient, setSelectedClient, selectClientContext } from "@/store/slices/clientsSlice";
import { fetchPortfolios, setCurrentClient as setPortfoliosCurrentClient, clear as clearPortfolios } from "@/store/slices/portfoliosSlice";
import { resetZonesPaging, fetchZonesPage } from "@/store/slices/zonesSlice";
import { clear as clearDeployments, fetchBuilds } from "@/store/slices/deploymentsSlice";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LockKeyhole, KeyRound, Eye, EyeOff, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";

export default function AWSCredentials() {
  const dispatch = useDispatch<AppDispatch>();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation() as any;
  const profileUser = useAppSelector(selectProfileUser as any);
  const selectedClient = useAppSelector(selectSelectedClient as any) as string | null;
  const profileName: string = (profileUser as any)?.profile_name || "default";

  const [ak, setAk] = useState("");
  const [sk, setSk] = useState("");
  const [busy, setBusy] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [akError, setAkError] = useState<string | null>(null);
  const [skError, setSkError] = useState<string | null>(null);

  // AWS credential validators
  const akRegex = /^(?:[A-Z0-9]{20})$/; // Access Key ID is 20 uppercase alphanumeric chars (commonly starts with AKIA or ASIA)
  const skRegex = /^[A-Za-z0-9/+=]{40}$/; // Secret Access Key is 40 base64-like chars

  const validateAk = (value: string) => {
    const v = value.trim();
    if (!v) return 'Access Key ID is required';
    if (!akRegex.test(v)) return 'Access Key ID must be 20 uppercase letters/digits';
    // Optional: soft hint on known prefixes without blocking
    const prefix = v.slice(0, 4);
    if (prefix !== 'AKIA' && prefix !== 'ASIA') {
      return null; // Accept others; some accounts may issue different prefixes
    }
    return null;
  };

  const validateSk = (value: string) => {
    const v = value.trim();
    if (!v) return 'Secret Access Key is required';
    if (!skRegex.test(v)) return 'Secret Access Key must be 40 characters';
    return null;
  };

  const onSave = async (e?: React.FormEvent) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    const access = ak.trim();
    const secret = sk.trim();
    const akErr = validateAk(access);
    const skErr = validateSk(secret);
    setAkError(akErr);
    setSkError(skErr);
    if (akErr || skErr) return;

    setBusy(true);
    try {
      const action = await dispatch(patchCurrentUserProfile({ profile_name: profileName, aws_access_key: access, aws_secret_key: secret } as any));
      if (patchCurrentUserProfile.rejected.match(action)) {
        const err = (action.payload as string) || 'Failed to save AWS credentials';
        toast({ title: 'Save failed', description: err, variant: 'destructive' });
        return;
      }

      // Queue token refresh and heavy bootstrap AFTER navigation to avoid flicker/remounts here
      setTimeout(async () => {
        try {
          const refresh = await dispatch(refreshAccessToken('aws_credentials'));
          // Proceed regardless; downstream calls will be cookie-first where possible

          // 1) Refresh clients list (force)
          await dispatch(fetchClients({ force: true }) as any);

          // 2) Decide target client: keep current selection, or persisted, or fallback to 'core'
          let target = selectedClient;
          if (!target) {
            try { target = localStorage.getItem('sck.selectedClient') || null; } catch { /* ignore */ }
          }
          if (!target) target = 'core';

          // 3) Clear dependent caches and set selection using shared helper
          await dispatch(selectClientContext(target) as any);

          // 4) Portfolios: hard clear + set current client + force fetch first page
          await dispatch(clearPortfolios() as any);
          await dispatch(setPortfoliosCurrentClient(target) as any);
          await dispatch(fetchPortfolios({ client: target, force: true }) as any);

          // 5) Zones: reset paging and fetch first page
          await dispatch(resetZonesPaging() as any);
          await dispatch(fetchZonesPage({ client: target, limit: 50, append: false }) as any);

          // 6) Deployments builds: clear cache and refetch latest
          await dispatch(clearDeployments() as any);
          await dispatch(fetchBuilds({ limit: 10 }) as any);
        } catch {
          // Non-fatal; dashboard will lazy-load as needed
        }
      }, 0);

      // Clear any previous status banner flags
      try { sessionStorage.removeItem('aws_cred_status'); } catch { /* ignore */ }
      setAk(""); setSk("");
      toast({ title: 'AWS credentials saved', description: 'Your credentials are encrypted and ready to use.' });
      const from = (location?.state && (location.state as any).from) || '/profile';
      navigate(from);
    } catch (e) {
      toast({ title: 'Network error', description: 'Could not save AWS credentials.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Busy overlay to prevent flicker during theme/context updates */}
      {busy && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 backdrop-blur-[2px]">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Saving credentials…</span>
          </div>
        </div>
      )}
      <div className="w-full max-w-lg">
        <Card className="shadow-large">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-theme-gradient rounded-full flex items-center justify-center shadow-medium">
              <LockKeyhole className="h-8 w-8 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">AWS Credentials</CardTitle>
              <p className="text-muted-foreground">Enter your Access Key ID and Secret Access Key</p>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ak">Access Key ID</Label>
                <Input
                  id="ak"
                  name="username"
                  type="text"
                  autoComplete="username"
                  placeholder="AKIA..."
                  value={ak}
                  onChange={(e) => { setAk(e.target.value); if (akError) setAkError(null); }}
                  required
                />
                {akError && <p className="text-xs text-destructive mt-1">{akError}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="sk">Secret Access Key</Label>
                <div className="relative">
                  <Input
                    id="sk"
                    name="password"
                    type={showSecret ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••••••••••"
                    value={sk}
                    onChange={(e) => { setSk(e.target.value); if (skError) setSkError(null); }}
                    className="pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-8 w-8"
                    onClick={() => setShowSecret((s) => !s)}
                    tabIndex={-1}
                    aria-label={showSecret ? "Hide secret" : "Show secret"}
                  >
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {skError && <p className="text-xs text-destructive mt-1">{skError}</p>}
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Button type="submit" disabled={busy} className="gap-2 w-full">
                  {busy ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <KeyRound className="h-4 w-4" />
                      Save Credentials
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate(-1)}
                  disabled={busy}
                >
                  Cancel
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">This form is write-only. Your keys are encrypted server-side and cannot be viewed later.</p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
