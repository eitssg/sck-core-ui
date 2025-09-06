import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { selectIsAuthenticated } from "@/store/slices/authSlice";
import { apiFetch } from "@/lib/api-fetch";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import { Mail, UserPlus, LogIn, ArrowLeft, AlertTriangle, Sparkles } from "lucide-react";

type RouteState = {
  email?: string;
  from?: string; // e.g., "login-401", "password-reset"
  reason?: string;
};

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export default function NoAccount() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Auth guard: if already authenticated, bounce to dashboard
  const isAuthenticated = useSelector((s: RootState) => s.auth?.isAuthenticated) ?? false;
  useEffect(() => {
    if (isAuthenticated) navigate("/dashboard", { replace: true });
  }, [isAuthenticated, navigate]);

  // Derive route state
  const routeState = (location.state || {}) as RouteState;
  const initialEmail = useMemo(() => routeState.email || "", [routeState.email]);
  const from = routeState.from || "login-401";

  // Local state
  const [email, setEmail] = useState(initialEmail);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fire-and-forget telemetry so we can analyze 401 flows and missing accounts
  useEffect(() => {
    const send = async () => {
      try {
        await apiFetch("/api/v1/telemetry/no-account", {
          method: "POST",
          cookieFirst: true,
          notify401: false,
          noToast401: true,
          contextLabel: "Telemetry",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: initialEmail || null,
            source: from,
            path: location.pathname + (location.search || ""),
            referrer: document.referrer || null,
            ts: new Date().toISOString(),
            userAgent: navigator.userAgent,
          }),
        });
      } catch {
        // Ignore telemetry errors
      }
    };
    send();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canProceed = isValidEmail(email);

  const goSignup = async () => {
    if (!canProceed) {
      toast({ title: "Invalid email", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      navigate("/signup", {
        state: { email, from: "no-account" },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const goLogin = async () => {
    if (!canProceed) {
      // It's fine to allow visiting login without email, but this helps UX
      toast({ title: "Optional: prefill email", description: "Enter an email to prefill on login.", variant: "default" });
    }
    setIsSubmitting(true);
    try {
      navigate("/login", {
        state: { email, from: "no-account" },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const backHome = () => navigate(-1);

  return (
    <div className="relative min-h-screen">
      {/* Ambient gradient backdrop */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
  <div className="absolute top-1/3 left-1/2 -translate-x-1/2 h-40 w-[40rem] rounded-[999px] bg-gradient-to-r from-primary/10 to-primary/20 blur-2xl" />
      </div>

      <div className="mx-auto flex max-w-4xl flex-col items-center px-4 py-16">
        {/* Header */}
        <div className="mb-8 flex w-full items-center justify-between">
          <Button variant="ghost" onClick={backHome} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Badge variant="secondary" className="uppercase">No account</Badge>
        </div>

        <Card className="w-full shadow-large animate-fade-in">
          <CardHeader className="space-y-2 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-theme-gradient text-primary-foreground shadow-medium">
              <Sparkles className="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl">We couldn’t find an account for that email</CardTitle>
            <CardDescription>
              {from === "login-401"
                ? "Your email or password didn’t match an existing account. You can try logging in again or create a new account."
                : "No account exists for this email. You can sign up or go back to login."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <AlertTriangle className="h-3.5 w-3.5" />
              We’ll only use this to prefill the next screen.
            </div>

            <Separator />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Button
                onClick={goSignup}
                disabled={isSubmitting || !canProceed}
                variant="gradient"
                className="gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Create a new account
              </Button>
              <Button onClick={goLogin} disabled={isSubmitting} variant="outline" className="gap-2">
                <LogIn className="h-4 w-4" />
                Try login again
              </Button>
            </div>

            <div className="text-center text-xs text-muted-foreground">
              Already have an account under a different email?{" "}
              <Link to="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}