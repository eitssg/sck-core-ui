import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { Eye, EyeOff, Mail, Lock, Briefcase, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "@/hooks/useTheme";
import { buildApiUrl, buildOAuthAuthorizeUrl, API_CONFIG } from "@/lib/api-config";
import { apiFetch } from "@/lib/api-fetch";
import { authAPI } from "@/lib/auth-api";
import { clearError, setError, logoutUser } from "@/store/slices/authSlice";
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
  const { isDark } = useTheme();

  const isAuthenticated = useSelector((s: RootState) => s.auth?.isAuthenticated) ?? false;

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const canSubmit = useMemo(() => email.trim().length > 3 && password.length >= 1, [email, password]);

  const [isLoading, setIsLoading] = useState(false);
  const errorMsg = auth?.error || "";
  const errorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isAuthenticated) navigate("/dashboard");
    // Clear any stale auth error when landing on login
    dispatch(clearError());
  }, [isAuthenticated, navigate, dispatch]);

  // HARD LOGOUT on entering /login: clear cookie + local/session storage to avoid dangling state
  // Skip when we're in the middle of OAuth callback processing to prevent races
  // Also allow disabling via env flag in development to avoid disruptive loops
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (sessionStorage.getItem('oauth_processing') === '1') {
        return;
      }
      // In dev, respect an opt-in flag to enable hard logout, default to off
      const allowHardLogout = !import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEV_HARD_LOGOUT === 'true';
      if (!allowHardLogout) {
        return;
      }
      try {
        // Try server-side logout to clear HttpOnly session cookie
        // Attempt POST first; if not supported, fall back to GET
        const logoutUrl = buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.LOGOUT);
        try {
          await apiFetch(logoutUrl, { method: "POST", cookieFirst: true, notify401: false, noToast401: true });
        } catch {
          try { await apiFetch(logoutUrl, { method: "GET", cookieFirst: true, notify401: false, noToast401: true }); } catch { /* ignore */ }
        }
      } finally {
        // Revoke token + clear local storage via thunk (also calls authAPI.logout)
        if (!cancelled) dispatch(logoutUser());
        // Ensure local cleanup regardless
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("token");
        sessionStorage.removeItem("oauth_session_token");
        sessionStorage.removeItem("oauth_token_type");
      }
    })();
    return () => { cancelled = true; };
  }, [dispatch]);

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

    try {
      // Step 1: Login to obtain a session credential (cookie)
      const url = buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.LOGIN);
      const res = await apiFetch(url, {
        method: "POST",
        cookieFirst: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          client_id: API_CONFIG.OAUTH.CLIENT_ID,
        }),
      });

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
      const authorizeUrl = buildOAuthAuthorizeUrl();
      window.location.href = authorizeUrl;
      // No further code executes after navigation
    } catch (err) {
      dispatch(setError(mapOAuthErrorToUserMessage(err instanceof Error ? err.message : "Login failed")));
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-dashboard-bg to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
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
              <div
                ref={errorRef}
                role="alert"
                aria-live="assertive"
                tabIndex={-1}
                className="flex items-start gap-3 p-3.5 text-sm rounded-md border bg-destructive/20 border-destructive/40 text-destructive-foreground ring-1 ring-destructive/30 shadow-sm"
              >
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span className="leading-5">{errorMsg}</span>
              </div>
            )}

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

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
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