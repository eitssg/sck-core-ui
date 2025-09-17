import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/store";

import { Briefcase, Building2, Plus, Search, X, GitBranch, Filter as FilterIcon } from "lucide-react";
import EnvBadge from "@/components/ui/env-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { useReduxData } from "@/hooks/useReduxData";
import DashboardLayout from "@/components/DashboardLayout";
import { useTheme } from "@/hooks/useTheme";

import type { Portfolio, Application, Zone, AppDeploymentBuild } from "@/store/types";
import { fetchBuilds } from "@/store/slices/deploymentsSlice";

export default function Applications() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useDispatch<AppDispatch>();
  const { isDark } = useTheme();

  // Redux data via hook
  const { selectedClient, portfolios, applications, zones, actions, selectClient } = useReduxData();

  // Optional: deployments builds (future: show latest build per portfolio/app)
  const builds = useSelector((s: RootState) => (s as any)?.deployments?.builds ?? []) as AppDeploymentBuild[];
  const buildsLoading = useSelector((s: RootState) => (s as any)?.deployments?.loading) as boolean;

  // Selected client derives from store; do not override via URL
  // (Client context is set globally; data is tenant-scoped server-side.)

  const currentClient = typeof selectedClient === "string" ? selectedClient : null;

  // Normalize lists
  const portfoliosList = useMemo<Portfolio[]>(() => {
    const p: any = portfolios?.items;
    return Array.isArray(p) ? (p as Portfolio[]) : [];
  }, [portfolios?.items]);

  const appsList = useMemo<Application[]>(() => {
    const a: any = (applications as any)?.items ?? applications;
    return Array.isArray(a) ? (a as Application[]) : [];
  }, [applications]);

  const zonesList = useMemo<Zone[]>(
    () => (Array.isArray(zones) ? (zones as Zone[]) : []),
    [zones]
  );

  // Fetch portfolios for current client
  useEffect(() => {
    if (!currentClient) return;
    const shouldFetch =
      portfolios?.status === "idle" ||
      portfoliosList.length === 0 ||
      portfolios?.currentClient !== currentClient;

    if (shouldFetch) {
      actions.portfolios.setCurrentClient(currentClient);
      actions.portfolios.fetch(currentClient, { force: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentClient]);

  // Fetch recent builds (server-side scoped by current client)
  useEffect(() => {
    if (currentClient) dispatch(fetchBuilds({ limit: 25 }));
  }, [dispatch, currentClient]);

  // Do not filter by client field; server already scopes data per selected client
  const clientPortfolios = useMemo<Portfolio[]>(() => portfoliosList, [portfoliosList]);

  // Local search terms
  const [searchTerms, setSearchTerms] = useState<string[]>(() => {
    const q = searchParams.get('q');
    return q ? q.split(',').map(s => s.trim()).filter(Boolean) : [];
  });
  const [newTerm, setNewTerm] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const addSearchTerm = () => {
    const v = newTerm.trim();
    if (!v) return;
    if (!searchTerms.includes(v)) {
      const next = [...searchTerms, v];
      setSearchTerms(next);
      const sp = new URLSearchParams(searchParams);
      sp.set('q', next.join(','));
      setSearchParams(sp, { replace: true });
    }
    setNewTerm("");
  };
  const removeSearchTerm = (term: string) => {
    const next = searchTerms.filter((t) => t !== term);
    setSearchTerms(next);
    const sp = new URLSearchParams(searchParams);
    if (next.length > 0) sp.set('q', next.join(',')); else sp.delete('q');
    setSearchParams(sp, { replace: true });
  };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSearchTerm();
    }
  };

  const chipsRow = (
    searchTerms.length > 0 && (
      <div className="flex flex-wrap gap-2">
        {searchTerms.map((term) => (
          <Badge key={term} variant="secondary" className="flex items-center gap-1 px-3 py-1">
            {term}
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 hover:bg-transparent"
              onClick={() => removeSearchTerm(term)}
              aria-label={`Remove ${term}`}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        ))}
  <Button variant="ghost" size="sm" onClick={() => { setSearchTerms([]); const sp = new URLSearchParams(searchParams); sp.delete('q'); setSearchParams(sp, { replace: true }); }} className="text-muted-foreground">
          Clear all
        </Button>
      </div>
    )
  );

  const activeFiltersCount = searchTerms.length;

  // Derived helpers
  const appsByPortfolio = useMemo(() => {
    const map = new Map<string, Application[]>();
    appsList.forEach((a) => {
      if (!a.portfolio) return;
      const arr = map.get(a.portfolio) || [];
      arr.push(a);
      map.set(a.portfolio, arr);
    });
    return map;
  }, [appsList]);

  const zonesByName = useMemo(() => {
    const map = new Map<string, Zone>();
    zonesList.forEach((z) => map.set(z.zone, z));
    return map;
  }, [zonesList]);

  // FUTURE: Build info per portfolio (placeholder; needs PRN mapping)
  const latestBuildByPortfolio = useMemo(() => {
    // If you have a mapping from portfolio -> portfolio_prn, calculate here.
    // For now, return an empty map; UI will show "—".
    return new Map<string, AppDeploymentBuild | undefined>();
  }, []);

  const filteredPortfolios = useMemo<Portfolio[]>(() => {
    if (searchTerms.length === 0) return clientPortfolios;
    const terms = searchTerms.map((t) => t.toLowerCase());
    return clientPortfolios.filter((p) => {
      const details = [
        p.portfolio,
        p.project?.name ?? "",
        p.project?.code ?? "",
        p.project?.description ?? "",
        p.domain ?? "",
        ...(Object.keys(p.tags ?? {})),
      ]
        .join(" ")
        .toLowerCase();
      return terms.every((t) => details.includes(t));
    });
  }, [clientPortfolios, searchTerms]);

  if (!currentClient) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-medium text-foreground">No Client Selected</h3>
              <p className="mt-1 text-sm text-muted-foreground">Select a client from the header to view applications.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <DashboardLayout
      activeItem="applications"
      pageTitle="Applications"
      pageSubtitle="Deployment units organized by portfolio"
    >
      <div className="space-y-6">
        {/* Header actions */}
        <div className="flex items-center justify-end">
          <Button asChild variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground">
            <Link to="/applications/create">
              <Plus className="h-4 w-4" /> New
            </Link>
          </Button>
        </div>

  {/* Mobile Filters trigger */}
      <div className="sm:hidden">
        <Button variant="outline" className="gap-2" onClick={() => setFiltersOpen(true)}>
          <FilterIcon className="h-4 w-4" />
          Filters{activeFiltersCount ? ` (${activeFiltersCount})` : ''}
        </Button>
      </div>

      {/* Desktop Search */}
      <Card className="shadow-soft hidden sm:block">
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Add search term..."
                  value={newTerm}
                  onChange={(e) => setNewTerm(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-10"
                />
              </div>
              <Button onClick={addSearchTerm} disabled={!newTerm.trim()}>
                Add
              </Button>
            </div>
            {chipsRow}
          </div>
        </CardContent>
      </Card>

      {/* Mobile Filters Sheet */}
      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            <div className="flex flex-col gap-3">
              <div className="relative w-full">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Add search term..."
                  value={newTerm}
                  onChange={(e) => setNewTerm(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-10 w-full"
                />
              </div>
              <div>
                <Button onClick={addSearchTerm} disabled={!newTerm.trim()} className="w-full" variant="outline">
                  Add
                </Button>
              </div>
            </div>
            {chipsRow}
            <div className="pt-2">
              <Button variant="default" className="w-full" onClick={() => setFiltersOpen(false)}>
                Apply
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

  {/* Portfolios table */}
      <Card className="shadow-medium">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            Portfolios ({filteredPortfolios.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Portfolio</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Deployment Units</TableHead>
                <TableHead>Zones</TableHead>
                <TableHead>Current Version</TableHead>
                <TableHead>Last Deployed</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPortfolios.map((p) => {
                const key = `${p.portfolio}`;
                const name = p.project?.name || p.portfolio;
                const desc = p.project?.description || "—";
                const appUnits = appsByPortfolio.get(p.portfolio) || [];
                const zoneNames = Array.from(new Set(appUnits.map((a) => a.zone).filter(Boolean)));
                const zoneBadges = zoneNames.map((zn) => {
                  const z = zonesByName.get(zn);
                  if (!z) return (
                    <Badge key={`${key}:${zn}`} variant="outline">{zn}</Badge>
                  );
                  return (
                    <Badge key={`${key}:${zn}`} variant="outline" className="gap-1">
                      <span>{z.zone}</span>
                      <EnvBadge zone={z} />
                    </Badge>
                  );
                });

                // FUTURE: resolve latest build per portfolio via PRN mapping
                const latestBuild = latestBuildByPortfolio.get(p.portfolio);
                const currentVersion = "—";
                const lastDeployed = latestBuild ? new Date(latestBuild.created_at).toLocaleString() : "—";

                return (
                  <TableRow
                    key={key}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => navigate(`/portfolios/${p.portfolio}`)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary/10 rounded-md flex items-center justify-center">
                          <GitBranch className="h-4 w-4 text-primary" />
                        </div>
                        <div className="truncate">
                          <div className="font-medium">{name}</div>
                          <div className="text-xs text-muted-foreground">{p.portfolio}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{desc}</TableCell>
                    <TableCell>{appUnits.length}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {zoneBadges.length > 0
                          ? zoneBadges.slice(0, 4)
                          : <span className="text-muted-foreground">—</span>}
                        {zoneBadges.length > 4 && (
                          <Badge variant="secondary">+{zoneBadges.length - 4}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{currentVersion}</TableCell>
                    <TableCell className="text-sm">{lastDeployed}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/portfolios/${p.portfolio}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredPortfolios.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No portfolios found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      </div>
    </DashboardLayout>
  );
}