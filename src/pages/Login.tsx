import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { Eye, EyeOff, Mail, Lock, Briefcase, AlertCircle, Clock, LogOut, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { sendAuthEvent } from "@/lib/cross-tab";
import { buildApiUrl, buildOAuthAuthorizeUrl, API_CONFIG } from "@/lib/api-config";
import { apiFetch } from "@/lib/api-fetch";
import { authAPI } from "@/lib/auth-api";
import { clearError, setError, logoutUser, selectLogoutReason, clearLogoutReason } from "@/store/slices/authSlice";
import { useReduxData } from "@/hooks/useReduxData";
import type { RootState } from "@/store";

// Lookup table for OAuth /authorize redirect error codes -> friendly messages
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  // Parameter validation
  mci: "Missing client_id.",
  mrt: "Missing response_type.",
  urt: "Unsupported response_type.",
  mru: "Missing redirect_uri.",
  isf: "Invalid state format.",
  // Rate limiting
  rle: "Too many requests. Please wait and try again.",
  // Session/client issues
  cmm: "Invalid session token. Please sign in again.",
  cmc: "Client mismatch. Please sign in again.",
  // Registration/config issues
  cid: "Invalid OAuth Client ID.",
  cnm: "Client configuration mismatch.",
  rnr: "Redirect URI not registered for this application.",
};

function mapOAuthErrorToUserMessage(error: string, statusCode?: number): string {
  const e = (error || "").toLowerCase();
  if (e.includes("invalid_redirect_uri") || e.includes("redirect_uri")) return "Login service configuration error.";
  if (e.includes("invalid_client") || e.includes("client not found")) return "Application configuration error.";
  if (e.includes("invalid_grant") || e.includes("authorization code")) return "Login session expired. Please try again.";
  if (e.includes("access_denied")) return "Access denied. Please check your credentials.";
  if (e.includes("unauthorized") || statusCode === 401) return "Invalid email or password.";
  if (e.includes("invalid_scope")) return "Permission error. Please contact support.";
  if (e.includes("server_error") || statusCode === 500) return "Server error. Please try again.";
  if (e.includes("temporarily_unavailable")) return "Login service temporarily unavailable.";
  if (e.includes("network") || e.includes("fetch")) return "Network connection error.";
  return "Login failed. Please try again.";
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { auth, dispatch } = useReduxData();
  // Theme is applied globally via ThemeProvider; no per-page overrides needed

  const isAuthenticated = useSelector((s: RootState) => s.auth?.isAuthenticated) ?? false;

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const canSubmit = useMemo(() => email.trim().length > 3 && password.length >= 1, [email, password]);

  const [isLoading, setIsLoading] = useState(false);
  const [needMfa, setNeedMfa] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);
  const [mfaError, setMfaError] = useState("");
  const errorMsg = auth?.error || "";
  const errorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // On entering /login: perform a logout only if we likely have a session.
    // Signals: Redux isAuthenticated OR presence of refresh_token in sessionStorage.
    let cancelled = false;
    (async () => {
      try {
        const hasRefresh = (() => {
          try { return !!sessionStorage.getItem('refresh_token'); } catch { return false; }
        })();
        const shouldServerLogout = isAuthenticated || hasRefresh;

        if (shouldServerLogout) {
          // Broadcast to other tabs to sync logout (debounced)
          sendAuthEvent({ type: 'auth:logout' });
          await dispatch(logoutUser()).unwrap();
        }
      } catch { /* ignore */ }
      if (!cancelled) dispatch(clearError());
    })();
    return () => { cancelled = true; };
  }, [dispatch, isAuthenticated]);

  // Remove previous custom hard-logout block; centralized in the effect above

  // Read ?err=code or ?error=code placed by the authorization server
  useEffect(() => {
    const params = new URLSearchParams(location.search || "");
    const code = params.get("err") || params.get("error");
    if (code) {
      const msg = AUTH_ERROR_MESSAGES[code.toLowerCase()] || "Login failed. Please try again.";
      dispatch(setError(msg));
    }
    // We intentionally do not mutate the URL here; user can refresh and still see the error
  }, [location.search, dispatch]);

  // Move focus to the error for accessibility and visibility when it appears
  useEffect(() => {
    if (errorMsg && errorRef.current) {
      errorRef.current.focus();
    }
  }, [errorMsg]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
  dispatch(clearError());
  setMfaError("");
  setNeedMfa(false);

    try {
      // Step 1: Login to obtain a session credential (cookie)
      const url = buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.LOGIN);
      const res = await apiFetch(url, {
        method: "POST",
        cookieFirst: true,
        noAuthRetryOn401: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          client_id: API_CONFIG.OAUTH.CLIENT_ID,
        }),
      });
      // MFA required
      if (res.status === 202) {
        setNeedMfa(true);
        setIsLoading(false);
        return;
      }
      if (!res.ok) {
        let server = { message: "" as string };
        try {
          server = await res.json();
        } catch {
          // ignore parse errors
        }
  const msg = mapOAuthErrorToUserMessage(server.message || "Login failed", res.status);
  dispatch(setError(msg));
        setIsLoading(false);
        return;
      }

  // Success: Redirect to OAuth authorize (session cookie will be sent automatically)
      const authorizeUrl = await buildOAuthAuthorizeUrl();
      window.location.href = authorizeUrl;
      // No further code executes after navigation
    } catch (err) {
      dispatch(setError(mapOAuthErrorToUserMessage(err instanceof Error ? err.message : "Login failed")));
      setIsLoading(false);
    }
  };

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaCode.trim()) return;
    setIsLoading(true);
    setMfaError("");
    try {
      // Verify using cookie-only auth; backend will upgrade mfa_pending to session on success
      const res = await apiFetch(API_CONFIG.ENDPOINTS.AUTH.MFA_VERIFY, {
        method: "POST",
        cookieFirst: true,
        noAuthRetryOn401: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(useRecovery ? { code: mfaCode.trim(), method: "recovery" } : { code: mfaCode.trim() }),
      });
      if (!res.ok) {
        let server: any = {};
        try { server = await res.json(); } catch { /* ignore */ }
        const msg = server?.message || (res.status === 401 ? "Invalid code" : "MFA verification failed");
        setMfaError(msg);
        setIsLoading(false);
        return;
      }
      // On success, backend set the real session cookie; proceed to authorize
      const authorizeUrl = await buildOAuthAuthorizeUrl();
      window.location.href = authorizeUrl;
    } catch (err) {
      setMfaError(err instanceof Error ? err.message : "MFA verification failed");
      setIsLoading(false);
    }
  };

  const handleGitHubLogin = async () => {
    try {
      setIsLoading(true);
      // Backend handles redirect to GitHub
      window.location.href = buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.GITHUB_LOGIN);
    } catch {
      setIsLoading(false);
      dispatch(setError("GitHub login failed. Please try again."));
    }
  };

  // Read and immediately clear a one-shot logout reason from Redux
  const reasonFromRedux = useSelector(selectLogoutReason);
  const [reason, setReason] = useState<string | null>(null);
  useEffect(() => {
    if (reasonFromRedux) {
      setReason(reasonFromRedux);
      dispatch(clearLogoutReason());
    } else {
      setReason(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reasonFromRedux]);

  const banner = (() => {
    if (!reason) return null;
    if (reason === 'session_expired') {
      return (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>Your session expired. Please sign in again.</AlertDescription>
        </Alert>
      );
    }
    if (reason === 'idle_timeout') {
      return (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>You have been auto-logged out due to inactivity.</AlertDescription>
        </Alert>
      );
    }
    if (reason === 'manual') {
      return (
        <Alert>
          <LogOut className="h-4 w-4" />
          <AlertDescription>You have been signed out.</AlertDescription>
        </Alert>
      );
    }
    return null;
  })();

  return (
  <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-4">
        {banner}
        {/* Login Card */}
        <Card className="shadow-large animate-fade-in">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-theme-gradient rounded-full flex items-center justify-center shadow-medium">
              <Briefcase className="h-8 w-8 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
              <p className="text-muted-foreground">Sign in to your admin dashboard</p>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {errorMsg && (
              <Alert ref={errorRef as any} variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errorMsg}</AlertDescription>
              </Alert>
            )}

            {!needMfa && (
              <>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full"
                  onClick={handleGitHubLogin}
                  disabled={isLoading}
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 0C5.374 0 0 5.373 0 12 0 17.302 3.438 21.8 8.207 23.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                  </svg>
                  Continue with GitHub
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
                  </div>
                </div>
              </>
            )}

            {!needMfa && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    name="username"
                    type="email"
                    autoComplete="username"
                    placeholder="admin@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-8 w-8"
                    onClick={() => setShowPassword((s) => !s)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full"
                variant="gradient"
                disabled={isLoading || !canSubmit}
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
            )}

            {needMfa && (
              <form onSubmit={handleMfaVerify} className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="mfa">{useRecovery ? "Enter a recovery code" : "Enter your authentication code"}</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-auto px-2 py-1 text-xs"
                      onClick={() => { setUseRecovery(v => !v); setMfaCode(""); setMfaError(""); }}
                    >
                      {useRecovery ? "Use authenticator app" : "Use a recovery code"}
                    </Button>
                  </div>
                  <div className="relative">
                    <Input
                      id="mfa"
                      name="mfa"
                      inputMode={useRecovery ? "text" : "numeric"}
                      pattern={useRecovery ? undefined : "[0-9]*"}
                      placeholder={useRecovery ? "e.g. 1234 5678" : "123 456"}
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value)}
                      className="pr-10"
                      autoFocus
                      required
                    />
                  </div>
                </div>
                {mfaError && (
                  <div className="text-sm text-destructive">{mfaError}</div>
                )}
                <Button type="submit" size="lg" className="w-full" variant="gradient" disabled={isLoading || !mfaCode}>
                  {isLoading ? "Verifying..." : useRecovery ? "Verify recovery code" : "Verify"}
                </Button>
                <div className="text-xs text-muted-foreground text-center">
                  {useRecovery
                    ? "Recovery codes are single-use. You can generate new ones in your security settings."
                    : "Use a recovery code if you don’t have access to your authenticator."}
                </div>
              </form>
            )}

            <div className="text-center space-y-2">
              <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                Forgot your password?
              </Link>
              <p className="text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link to="/signup" className="text-primary hover:underline">
                  Sign up
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}