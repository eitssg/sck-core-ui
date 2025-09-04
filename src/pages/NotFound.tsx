import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { selectIsAuthenticated } from "@/store/slices/authSlice";
import { buildApiUrl, getAuthHeaders } from "@/lib/api-config";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import {
  ArrowLeft,
  Home,
  Compass,
  LifeBuoy,
  FileQuestion,
  Search,
  Copy,
  Send,
} from "lucide-react";

export default function NotFound() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark } = useTheme();
  const { toast } = useToast();
  const isAuthenticated = useSelector((s: RootState) => selectIsAuthenticated(s));

  const [query, setQuery] = useState("");
  const requestedPath = useMemo(
    () => `${location.pathname}${location.search || ""}`,
    [location.pathname, location.search]
  );

  // Basic telemetry in dev console
  useEffect(() => {
    console.warn("404 Not Found:", requestedPath, { referrer: document.referrer || "—" });
  }, [requestedPath]);

  const handleBack = () => navigate(-1);
  const handleDashboard = () => navigate("/dashboard");
  const handleLogin = () => navigate("/login");
  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = query.trim();
    if (!q) return;
    navigate(`/docs?q=${encodeURIComponent(q)}`);
  };
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(requestedPath);
      toast({ title: "Copied", description: "Path copied to clipboard." });
    } catch {
      toast({ title: "Copy failed", description: "Unable to copy path.", variant: "destructive" });
    }
  };

  const handleReport = async () => {
    try {
      const url = buildApiUrl("/api/v1/telemetry/not-found");
      const res = await fetch(url, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          path: requestedPath,
          referrer: document.referrer || null,
          ts: new Date().toISOString(),
          userAgent: navigator.userAgent,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast({ title: "Thanks!", description: "We’ve recorded the broken link." });
    } catch (err) {
      toast({
        title: "Couldn’t report",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Ambient backdrop */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 h-40 w-[40rem] rounded-[999px] bg-gradient-to-r from-primary/10 to-primary-light/10 blur-2xl" />
      </div>

      <div className="mx-auto flex max-w-5xl flex-col items-center px-4 py-16">
        {/* Hero */}
        <div className="relative mb-10 flex flex-col items-center text-center">
          <div className="relative">
            <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-primary/30 via-primary/10 to-accent/30 blur" />
            <div className="relative rounded-full border border-border bg-card/60 px-6 py-2 backdrop-blur">
              <Badge variant="secondary" className="uppercase">Error</Badge>
              <span className="ml-2 text-sm text-muted-foreground">The page you’re looking for doesn’t exist</span>
            </div>
          </div>

          <h1 className="mt-8 bg-gradient-to-b from-foreground to-muted-foreground bg-clip-text text-7xl font-extrabold tracking-tight text-transparent md:text-8xl">
            404
          </h1>
          <p className="mt-4 max-w-2xl text-balance text-muted-foreground">
            We couldn’t find “{requestedPath}”. It may have moved or the link could be broken.
          </p>

          {/* Quick actions */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <Button variant="outline" onClick={handleBack} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </Button>

            {isAuthenticated ? (
              <Button variant={isDark ? "secondary" : "gradient"} onClick={handleDashboard} className="gap-2">
                <Home className="h-4 w-4" />
                Go to Dashboard
              </Button>
            ) : (
              <Button variant={isDark ? "secondary" : "gradient"} onClick={handleLogin} className="gap-2">
                <Home className="h-4 w-4" />
                Go to Login
              </Button>
            )}

            <Button variant="outline" onClick={handleCopy} className="gap-2">
              <Copy className="h-4 w-4" />
              Copy Path
            </Button>
            <Button variant="outline" onClick={handleReport} className="gap-2">
              <Send className="h-4 w-4" />
              Report Issue
            </Button>
          </div>
        </div>

        {/* Search and helpful links */}
        <div className="grid w-full grid-cols-1 items-start gap-6 md:grid-cols-3">
          {/* Search */}
          <Card className="md:col-span-2 shadow-medium">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5 text-primary" />
                Try searching our docs
              </CardTitle>
              <CardDescription>Look up pages and topics that might help you find what you need</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search documentation..."
                    className="pl-9"
                  />
                </div>
                <Button type="submit" className="shrink-0">Search</Button>
              </form>
              <div className="mt-3 text-xs text-muted-foreground">Tip: Use keywords like “zones”, “portfolios”, or “oauth”</div>
            </CardContent>
          </Card>

          {/* Quick links */}
          <Card className="shadow-medium">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Compass className="h-5 w-5 text-primary" />
                Explore
              </CardTitle>
              <CardDescription>Jump to popular sections</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild variant="outline" className="w-full justify-start gap-2">
                <Link to="/portfolios">
                  <FileQuestion className="h-4 w-4" />
                  Portfolios
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start gap-2">
                <Link to="/applications">
                  <FileQuestion className="h-4 w-4" />
                  Applications
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start gap-2">
                <Link to="/zones">
                  <FileQuestion className="h-4 w-4" />
                  Zones
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start gap-2">
                <Link to="/docs">
                  <LifeBuoy className="h-4 w-4" />
                  Docs
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Footer hint */}
        <div className="mt-10 text-center text-xs text-muted-foreground">
          If this keeps happening, please report it with the button above so we can fix the link.
        </div>
      </div>
    </div>
  );
}