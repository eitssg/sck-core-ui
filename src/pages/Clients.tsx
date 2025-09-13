import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Plus, Search, ChevronRight, Building2, Globe, Users, Circle, X, Filter as FilterIcon } from "lucide-react";

import DashboardLayout from "@/components/DashboardLayout";
import { useReduxData } from "@/hooks/useReduxData";
// import { useTheme } from "@/hooks/useTheme";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
// Removed row dropdown actions
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

import type { Client } from "@/store/types";

const Clients = () => {
  const { clients, actions } = useReduxData();
  const navigate = useNavigate();
  // const { isDark } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  // chip-based search terms synced with URL (?q=...)
  const [searchTerms, setSearchTerms] = useState<string[]>(() => {
    const q = searchParams.get('q');
    return q ? q.split(',').map(s => s.trim()).filter(Boolean) : [];
  });
  const [newTerm, setNewTerm] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Keep state in sync if URL changes (back/forward navigation)
  useEffect(() => {
    const q = searchParams.get('q');
    const next = q ? q.split(',').map(s => s.trim()).filter(Boolean) : [];
    const curr = searchTerms.join(',');
    const incoming = next.join(',');
    if (curr !== incoming) {
      setSearchTerms(next);
    }
  }, [searchParams, searchTerms]);

  const syncToUrl = (terms: string[]) => {
    const sp = new URLSearchParams(searchParams);
    if (terms.length > 0) sp.set('q', terms.join(','));
    else sp.delete('q');
    setSearchParams(sp, { replace: true });
  };

  const addSearchTerm = () => {
    const t = newTerm.trim();
    if (!t) return;
    if (searchTerms.includes(t)) {
      setNewTerm("");
      return;
    }
    const next = [...searchTerms, t];
    setSearchTerms(next);
    setNewTerm("");
    syncToUrl(next);
  };

  const removeSearchTerm = (term: string) => {
    const next = searchTerms.filter((t) => t !== term);
    setSearchTerms(next);
    syncToUrl(next);
  };

  // Load clients on mount if stale (>5m) or empty
  const lastFetched = (clients as any).lastFetched as number | null;
  useEffect(() => {
    if (!actions?.clients?.fetch) return;
    const hasAny = Array.isArray(clients.items) && clients.items.length > 0;
    const stale = !lastFetched || (Date.now() - lastFetched) > (5 * 60 * 1000);
    if (!hasAny || stale) {
      actions.clients.fetch({ limit: 100 });
    }
  }, [actions?.clients, clients.items, lastFetched]);

  const filteredClients = useMemo<Client[]>(() => {
    const list = Array.isArray(clients.items) ? (clients.items as Client[]) : ([] as Client[]);
    if (searchTerms.length === 0) return list;
    const terms = searchTerms.map(t => t.toLowerCase());
    return list.filter((c) => {
      const hay = [
        c.client_name ?? "",
        c.client_description ?? "",
        c.client ?? "",
        c.domain ?? "",
        c.organization_name ?? "",
      ].join(' ').toLowerCase();
      return terms.every(t => hay.includes(t));
    });
  }, [clients.items, searchTerms]);

  // Deletion now only available from details (submenu removed)

  const renderStatus = (status?: string) => {
    const s = (status ?? 'active').toLowerCase();
    const meta = { label: s };
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Circle className={`h-2 w-2 ${s === 'inactive' ? 'text-muted-foreground' : s === 'suspended' ? 'text-accent-foreground' : 'text-primary'}`} />
        <span className="uppercase tracking-wide">{meta.label}</span>
      </span>
    );
  };

  return (
    <DashboardLayout
      activeItem="clients"
      pageTitle="Management Accounts"
      pageSubtitle="Manage your client organizations and their configurations"
    >
      <div className="space-y-6">
        {/* Header actions */}
        <div className="flex items-center justify-end">
          <Button asChild variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground">
            <Link to="/clients/create">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New</span>
            </Link>
          </Button>
        </div>

          {/* Mobile Filters trigger */}
        <div className="sm:hidden">
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={() => setFiltersOpen(true)}>
              <FilterIcon className="h-4 w-4" />
      {`Filters${searchTerms.length > 0 ? ` (${searchTerms.length})` : ''}`}
            </Button>
          </div>
        </div>

        {/* Desktop Search (chips) */}
        <Card className="shadow-soft hidden sm:block">
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Add search term..."
                    value={newTerm}
                    onChange={(e) => setNewTerm(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSearchTerm(); } }}
                    className="pl-10"
                  />
                </div>
                <Button onClick={() => addSearchTerm()} disabled={!newTerm.trim()}>Add</Button>
              </div>
              {searchTerms.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {searchTerms.map((term) => (
                    <Button key={term} variant="secondary" size="sm" className="h-auto px-2 py-0.5" onClick={() => removeSearchTerm(term)}>
                      <span className="flex items-center gap-1">
                        {term}
                        <X className="h-3 w-3" />
                      </span>
                    </Button>
                  ))}
                  <Button variant="ghost" size="sm" onClick={() => { setSearchTerms([]); const sp = new URLSearchParams(searchParams); sp.delete('q'); setSearchParams(sp, { replace: true }); }} className="text-muted-foreground">Clear all</Button>
                </div>
              )}
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
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSearchTerm(); } }}
                    className="pl-10 w-full"
                  />
                </div>
                <div>
                  <Button onClick={() => addSearchTerm()} disabled={!newTerm.trim()} className="w-full" variant="outline">Add</Button>
                </div>
              </div>
              {searchTerms.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {searchTerms.map((term) => (
                    <Button key={term} variant="secondary" size="sm" className="h-auto px-2 py-0.5" onClick={() => removeSearchTerm(term)}>
                      <span className="flex items-center gap-1">
                        {term}
                        <X className="h-3 w-3" />
                      </span>
                    </Button>
                  ))}
                  <Button variant="ghost" size="sm" onClick={() => { setSearchTerms([]); const sp = new URLSearchParams(searchParams); sp.delete('q'); setSearchParams(sp, { replace: true }); }} className="text-muted-foreground">Clear all</Button>
                </div>
              )}
              <div className="pt-2">
                <Button variant="default" className="w-full" onClick={() => setFiltersOpen(false)}>
                  Apply
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* helpers */}
        {/** Add/remove helpers for chips with URL sync **/}

  {/* Content */}
        {clients.loading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span>Loading clients...</span>
              </div>
            </CardContent>
          </Card>
        ) : clients.error ? (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="text-destructive">
                <h3 className="font-semibold">Error Loading Clients</h3>
                <p className="text-sm mt-1">{clients.error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => actions?.clients?.fetch && actions.clients.fetch({ force: true })}
                >
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : filteredClients.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No clients found</h3>
              <p className="text-muted-foreground text-center mb-4">
                {searchTerms.length > 0 ? "No clients match your search criteria." : "Get started by creating your first client."}
              </p>
              {searchTerms.length === 0 && (
                <Button asChild>
                  <Link to="/clients/create">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Client
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-4">
              <ul className="divide-y divide-border">
                {filteredClients.map((client: Client) => {
                  const title = client.client_name || client.client;
                  const subtitle = client.client_description || "No description provided";
                  const org = client.organization_name || "";
                  const created = client.created_at ? new Date(client.created_at).toLocaleDateString() : undefined;
                  const initials = (title || client.client || 'C')
                    .split(/\s+/)
                    .map((s) => s.charAt(0))
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();

                  const goDetails = () => navigate(`/clients/${client.client}`);
                  const handleRowClick = (e: React.MouseEvent) => {
                    const target = e.target as HTMLElement;
                    if (target.closest('a,button,[role="menuitem"],[data-no-rownav]')) return; // ignore interactive elements
                    goDetails();
                  };
                  const handleKeyDown = (e: React.KeyboardEvent) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      goDetails();
                    }
                  };

                  return (
                    <li
                      key={client.client}
                      className="py-3 px-2 -mx-2 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 hover:bg-muted/40 cursor-pointer"
                      onClick={handleRowClick}
                      onKeyDown={handleKeyDown}
                      tabIndex={0}
                      role="button"
                      aria-label={`Open details for client ${title}`}
                    >
                      <div className="flex items-center gap-4">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-muted text-foreground font-semibold">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <div className="flex flex-col">
                                  <Link to={`/clients/${client.client}`} className="font-medium hover:underline truncate" data-no-rownav>
                                    {title}
                                  </Link>
                                  {renderStatus(client.client_status)}
                                </div>
                              </div>
                              <div className="text-sm text-muted-foreground truncate">
                                {subtitle}
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <code className="font-mono bg-muted px-1.5 py-0.5 rounded contrast-value">{client.client}</code>
                                </div>
                                {org && (
                                  <div className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    <span className="truncate max-w-[240px] contrast-value">{org}</span>
                                  </div>
                                )}
                                {client.organization_account && (
                                  <div className="flex items-center gap-1">
                                    <span className="font-medium text-foreground">AWS Billing Account:</span>
                                    <span className="truncate max-w-[160px] contrast-value">{client.organization_account}</span>
                                  </div>
                                )}
                                {client.domain && (
                                  <div className="flex items-center gap-1">
                                    <Globe className="h-3 w-3" />
                                    <span className="truncate max-w-[200px] contrast-value">{client.domain}</span>
                                  </div>
                                )}
                                {created && <span>Created {created}</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-1" data-no-rownav>
                              <Button variant="ghost" size="icon" asChild aria-label="Open details" data-no-rownav>
                                <Link to={`/clients/${client.client}`} data-no-rownav>
                                  <ChevronRight className="h-4 w-4" />
                                </Link>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Summary */}
        {filteredClients.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Showing {filteredClients.length} of {clients.items?.length || 0} clients</span>
                <span>{searchTerms.length > 0 ? `Filtered by: ${searchTerms.join(', ')}` : ''}</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Clients;