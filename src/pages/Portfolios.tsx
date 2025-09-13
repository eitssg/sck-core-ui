import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Briefcase, Plus, Search, X, Tag, Filter as FilterIcon } from "lucide-react";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useReduxData } from "@/hooks/useReduxData";
import type { Portfolio, Application } from "@/store/types";
import DashboardLayout from "@/components/DashboardLayout";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export default function Portfolios() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Auth guard
  const isAuthenticated = useSelector((s: RootState) => s.auth?.isAuthenticated) ?? false;
  useEffect(() => {
    if (!isAuthenticated) navigate("/login");
  }, [isAuthenticated, navigate]);

  const { selectedClient, portfolios, applications, actions } = useReduxData();

  // Local search terms UX (sync with URL 'q' as comma-separated list)
  const [searchTerms, setSearchTerms] = useState<string[]>(() => {
    const q = searchParams.get('q');
    if (!q) return [];
    return q.split(',').map(s => s.trim()).filter(Boolean);
  });
  const [newTerm, setNewTerm] = useState("");

  // Client context is global (selectedClient); do not read or override via URL.

  // Initialize facets from URL
  useEffect(() => {
    const urlCategory = searchParams.get('category');
    const urlStatus = searchParams.get('status');
    const urlLabel = searchParams.get('label');
    if (urlCategory) setCategoryFilter(urlCategory);
    if (urlStatus) setStatusFilter(urlStatus);
    if (urlLabel) setLabelFilter(urlLabel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch portfolios for current client
  const currentClient = selectedClient as string; // always defined (Core by default)
  const portfoliosList = useMemo<Portfolio[]>(() => {
    const p: any = portfolios?.items;
    return Array.isArray(p) ? (p as Portfolio[]) : [];
  }, [portfolios?.items]);

  const appsList = useMemo<Application[]>(() => {
    const a: any = (applications as any)?.items ?? applications;
    return Array.isArray(a) ? (a as Application[]) : [];
  }, [applications]);

  // Infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!sentinelRef.current) return;
    const el = sentinelRef.current;
    const obs = new IntersectionObserver((entries) => {
      const e = entries[0];
      if (e.isIntersecting) {
        if (currentClient && portfolios.hasMore && !portfolios.loading) {
          actions.portfolios.fetch(currentClient, { cursor: portfolios.cursor || undefined, append: true });
        }
      }
    }, { rootMargin: '400px 0px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [currentClient, portfolios.hasMore, portfolios.loading, portfolios.cursor, actions.portfolios]);

  useEffect(() => {
    if (!currentClient) return;
    // If already loading, skip; otherwise fetch or refresh as needed
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

  // Reflect cursor to URL when it changes
  useEffect(() => {
    if (!currentClient) return;
    const sp = new URLSearchParams(searchParams);
    const c = portfolios.cursor;
    if (c) {
      sp.set('cursor', c);
    } else {
      sp.delete('cursor');
    }
    setSearchParams(sp, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portfolios.cursor, currentClient]);

  // Derived lists
  // API already returns portfolios for the selected client; no extra filter needed
  const clientPortfolios = useMemo<Portfolio[]>(() => portfoliosList, [portfoliosList]);

  // Facets
  const categories = useMemo(() => Array.from(new Set(clientPortfolios.map(p => p.category).filter(Boolean))) as string[], [clientPortfolios]);
  const allLabels = useMemo(() => Array.from(new Set(clientPortfolios.flatMap(p => p.labels ?? []))), [clientPortfolios]);
  const statuses = useMemo(() => Array.from(new Set(clientPortfolios.map(p => p.lifecycle_status).filter(Boolean))) as string[], [clientPortfolios]);

  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [labelFilter, setLabelFilter] = useState<string>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Apply search terms + facets
  const filteredPortfolios = useMemo<Portfolio[]>(() => {
    const terms = searchTerms.map((t) => t.toLowerCase());
    return clientPortfolios.filter((p) => {
      // text search
      const hay = [
        p.portfolio,
        p.name || p.project?.name || "",
        p.project?.code ?? "",
        p.description || p.project?.description || "",
        p.domain ?? "",
        ...(p.labels ?? []),
        p.category ?? "",
        p.lifecycle_status ?? "",
      ]
        .join(" ")
        .toLowerCase();
      const matchesText = terms.length === 0 || terms.every((t) => hay.includes(t));

      // category facet
      const matchesCategory = categoryFilter === "all" || p.category === categoryFilter;
      // status facet
      const matchesStatus = statusFilter === "all" || p.lifecycle_status === statusFilter;
      // label facet
      const matchesLabel = labelFilter === "all" || (p.labels ?? []).includes(labelFilter);

      return matchesText && matchesCategory && matchesStatus && matchesLabel;
    });
  }, [clientPortfolios, searchTerms, categoryFilter, statusFilter, labelFilter]);

  // App count per portfolio
  const getAppCount = (portfolio: string) => appsList.filter((a) => a.portfolio === portfolio).length;

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
  // Derived UI helpers
  const activeFiltersCount = (searchTerms.length)
    + (categoryFilter !== 'all' ? 1 : 0)
    + (statusFilter !== 'all' ? 1 : 0)
    + (labelFilter !== 'all' ? 1 : 0);

  // Shared filter controls (search + selects)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSearchTerm();
    }
  };

  const filterControls = (
    <div
      className="flex items-center gap-2 sm:gap-3 overflow-x-auto whitespace-nowrap"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {/* Search */}
      <div className="relative flex-1 min-w-[160px]">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Add search term..."
          value={newTerm}
          onChange={(e) => setNewTerm(e.target.value)}
          onKeyDown={handleKeyDown}
          className="pl-10"
        />
      </div>
      <Button onClick={addSearchTerm} disabled={!newTerm.trim()} className="shrink-0" variant="outline">
        Add
      </Button>

      {/* Category */}
      <div className="shrink-0 min-w-[140px]">
        <Select value={categoryFilter} onValueChange={(v) => {
          setCategoryFilter(v);
          const sp = new URLSearchParams(searchParams);
          if (v === 'all') sp.delete('category'); else sp.set('category', v);
          setSearchParams(sp, { replace: true });
        }}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Status */}
      <div className="shrink-0 min-w-[120px]">
        <Select value={statusFilter} onValueChange={(v) => {
          setStatusFilter(v);
          const sp = new URLSearchParams(searchParams);
          if (v === 'all') sp.delete('status'); else sp.set('status', v);
          setSearchParams(sp, { replace: true });
        }}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {statuses.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Label */}
      <div className="shrink-0 min-w-[140px]">
        <Select value={labelFilter} onValueChange={(v) => {
          setLabelFilter(v);
          const sp = new URLSearchParams(searchParams);
          if (v === 'all') sp.delete('label'); else sp.set('label', v);
          setSearchParams(sp, { replace: true });
        }}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Label" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Labels</SelectItem>
            {allLabels.map((l) => (
              <SelectItem key={l} value={l}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const chipsRow = (
    searchTerms.length > 0 && (
      <div className="flex flex-wrap gap-2 mt-3">
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
        <Button variant="ghost" size="sm" onClick={() => {
          setSearchTerms([]);
          const sp = new URLSearchParams(searchParams);
          sp.delete('q');
          setSearchParams(sp, { replace: true });
        }} className="text-muted-foreground">
          Clear all
        </Button>
      </div>
    )
  );

  // Mobile-only: vertical stacked controls
  const filterControlsMobile = (
    <div className="flex flex-col gap-3">
      {/* Search */}
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

      {/* Category */}
      <div className="w-full">
        <Select value={categoryFilter} onValueChange={(v) => {
          setCategoryFilter(v);
          const sp = new URLSearchParams(searchParams);
          if (v === 'all') sp.delete('category'); else sp.set('category', v);
          setSearchParams(sp, { replace: true });
        }}>
          <SelectTrigger className="h-10 w-full text-sm">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Status */}
      <div className="w-full">
        <Select value={statusFilter} onValueChange={(v) => {
          setStatusFilter(v);
          const sp = new URLSearchParams(searchParams);
          if (v === 'all') sp.delete('status'); else sp.set('status', v);
          setSearchParams(sp, { replace: true });
        }}>
          <SelectTrigger className="h-10 w-full text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {statuses.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Label */}
      <div className="w-full">
        <Select value={labelFilter} onValueChange={(v) => {
          setLabelFilter(v);
          const sp = new URLSearchParams(searchParams);
          if (v === 'all') sp.delete('label'); else sp.set('label', v);
          setSearchParams(sp, { replace: true });
        }}>
          <SelectTrigger className="h-10 w-full text-sm">
            <SelectValue placeholder="Label" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Labels</SelectItem>
            {allLabels.map((l) => (
              <SelectItem key={l} value={l}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  

  return (
    <DashboardLayout
      activeItem="portfolios"
      pageTitle="Portfolios"
      pageSubtitle={`Manage portfolios for ${currentClient}`}
    >
      <div className="space-y-6">
        {/* Header actions (right side) */}
        <div className="flex items-center justify-end">
          <Button asChild variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground">
            <Link to="/portfolios/create">
              <Plus className="h-4 w-4" /> New
            </Link>
          </Button>
        </div>

      {/* Mobile: Filters button opens overlay */}
      <div className="sm:hidden">
        <Button variant="outline" className="gap-2" onClick={() => setFiltersOpen(true)}>
          <FilterIcon className="h-4 w-4" />
          Filters{activeFiltersCount ? ` (${activeFiltersCount})` : ''}
        </Button>
      </div>

      {/* Desktop: Inline filter toolbar */}
      <Card className="shadow-soft hidden sm:block">
        <CardContent className="px-3 py-3 sm:p-4">
          {filterControls}
          {chipsRow}
        </CardContent>
      </Card>

      {/* Mobile Filters Sheet */}
      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            {filterControlsMobile}
            {chipsRow}
            <div className="pt-2">
              <Button variant="default" className="w-full" onClick={() => setFiltersOpen(false)}>
                Apply
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

  {/* Grid */}
  <div>
          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                Portfolios ({filteredPortfolios.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredPortfolios.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">No portfolios found.</div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredPortfolios.map((p) => {
                    const key = `${currentClient}/${p.portfolio}`;
                    const name = p.name || p.portfolio;
                    const desc = p.description || "";
                    const appCount = getAppCount(p.portfolio);
                    const updated = p.updated_at ? new Date(p.updated_at).toLocaleDateString() : "—";
                    return (
                      <Card key={key} className="hover:shadow-lg transition-shadow cursor-pointer"
                        onClick={() => navigate(`/portfolios/${p.portfolio}`)}
                      >
                        <CardContent className="p-4 space-y-3">
                          {/* Two-column layout: fixed 96px icon column, flexible text column */}
                          <div className="grid grid-cols-[96px,1fr] gap-4 items-start">
                            <div className="w-[96px]">
                              {p.icon_url ? (
                                <img src={p.icon_url} alt={name} className="w-[96px] h-[96px] rounded-md object-cover" />
                              ) : (
                                <div className="w-[96px] h-[96px] bg-primary/10 rounded-md flex items-center justify-center">
                                  <Briefcase className="h-12 w-12 text-primary" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 space-y-1">
                              <div className="font-semibold truncate">{name}</div>
                              <div className="text-xs text-muted-foreground truncate">{p.portfolio}</div>
                              {(p as any)?.portfolio_version && (
                                <div className="text-xs text-muted-foreground truncate">Version: {(p as any).portfolio_version}</div>
                              )}
                              {desc && (
                                <p className="text-xs text-muted-foreground line-clamp-2">{desc}</p>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {p.category && <Badge variant="secondary">{p.category}</Badge>}
                            {p.lifecycle_status && <Badge variant="outline">{p.lifecycle_status}</Badge>}
                          </div>

                          {p.labels && p.labels.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {p.labels.slice(0, 5).map((l) => (
                                <Badge key={l} variant="outline" className="text-xs">
                                  <Tag className="h-3 w-3 mr-1" />{l}
                                </Badge>
                              ))}
                              {p.labels.length > 5 && (
                                <span className="text-xs text-muted-foreground">+{p.labels.length - 5} more</span>
                              )}
                            </div>
                          )}

                          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                            <span>{appCount} apps</span>
                            <span>Updated {updated}</span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* Infinite scroll status */}
              <div className="flex justify-center mt-6 text-sm text-muted-foreground select-none">
                {portfolios.loading ? 'Loading…' : (portfolios.hasMore ? 'Scroll to load more' : 'End of List')}
              </div>
              {/* Infinite scroll sentinel */}
              <div ref={sentinelRef} aria-hidden="true" className="h-1 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}