import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Building2, ChevronRight, Search, X, Loader2, Filter as FilterIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import DashboardLayout from '@/components/DashboardLayout';
import { useReduxData } from '@/hooks/useReduxData';
import { useToast } from '@/hooks/use-toast';
import type { Zone } from '@/store/types';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/store';
import { fetchZonesPage, resetZonesPaging, selectZonesNextCursor, selectZonesLoading } from '@/store/slices/zonesSlice';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

// Utility contains
const contains = (v: unknown, term: string) => v != null && String(v).toLowerCase().includes(term.toLowerCase());

const Zones = () => {
  const { zones, selectedClient, removeZone } = useReduxData();
  const { toast } = useToast();
  const dispatch = useDispatch<AppDispatch>();
  const loading = useSelector(selectZonesLoading);
  const nextCursor = useSelector(selectZonesNextCursor);

  const [searchParams, setSearchParams] = useSearchParams();
  const [limit, setLimit] = useState(25);
  const [filterTerms, setFilterTerms] = useState<string[]>(() => {
    const q = searchParams.get('q');
    return q ? q.split(',').map(s => s.trim()).filter(Boolean) : [];
  });
  const [newFilterTerm, setNewFilterTerm] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const selectedClientKey: string | null =
    typeof selectedClient === 'string' ? selectedClient : (selectedClient && (selectedClient as any).client) || null;

  // Initial fetch & on client/limit change
  useEffect(() => {
    if (!selectedClientKey) return;
    dispatch(resetZonesPaging());
    dispatch(fetchZonesPage({ client: selectedClientKey, limit, append: false }));
  }, [selectedClientKey, limit, dispatch]);

  // Client-side filtering after accumulation
  const filteredZones = useMemo<Zone[]>(() => {
    let list: Zone[] = Array.isArray(zones) ? (zones as Zone[]) : [];
    if (selectedClientKey) list = list.filter(z => z.client === selectedClientKey);
    if (filterTerms.length > 0) {
      list = list.filter(z => {
        const af = z.account_facts ?? ({} as any);
        const tags = z.tags ?? {};
        return filterTerms.every(term => {
          const tt = term.toLowerCase();
          return (
            contains(z.zone, tt) ||
            contains(af.organizational_unit, tt) ||
            contains(af.aws_account_id, tt) ||
            contains(af.account_name, tt) ||
            contains(af.environment, tt) ||
            contains(af.resource_namespace, tt) ||
            Object.entries(tags).some(([k, v]) => contains(k, tt) || contains(v, tt))
          );
        });
      });
    }
    return list;
  }, [zones, selectedClientKey, filterTerms]);

  const addFilterTerm = () => {
    const val = newFilterTerm.trim();
    if (val && !filterTerms.includes(val)) {
      const next = [...filterTerms, val];
      setFilterTerms(next);
      const sp = new URLSearchParams(searchParams);
      sp.set('q', next.join(','));
      setSearchParams(sp, { replace: true });
      setNewFilterTerm('');
    }
  };
  const removeFilterTerm = (term: string) => {
    const next = filterTerms.filter(t => t !== term);
    setFilterTerms(next);
    const sp = new URLSearchParams(searchParams);
    if (next.length > 0) sp.set('q', next.join(',')); else sp.delete('q');
    setSearchParams(sp, { replace: true });
  };
  const handleKeyPress = (e: React.KeyboardEvent) => { if (e.key === 'Enter') addFilterTerm(); };

  const loadMore = () => {
    if (!selectedClientKey || nextCursor === null) return;
    dispatch(fetchZonesPage({ client: selectedClientKey, limit, cursor: nextCursor, append: true }));
  };

  if (!selectedClientKey) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-medium text-foreground">No Client Selected</h3>
              <p className="mt-1 text-sm text-muted-foreground">Select a client to view zones.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <DashboardLayout activeItem="zones">
      <div className="space-y-6">
        {/* Header (mirrors Clients layout: left title/desc, no right button here) */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Landing Zones</h1>
            <p className="text-muted-foreground">Browse and inspect registered zones for the selected client.</p>
          </div>
          {/* Avatar / profile menu is provided by DashboardLayout top bar */}
        </div>

      {/* Mobile Filters trigger */}
    <div className="sm:hidden">
        <Button variant="outline" className="gap-2" onClick={() => setFiltersOpen(true)}>
          <FilterIcon className="h-4 w-4" />
      Filters{filterTerms.length ? ` (${filterTerms.length})` : ''}
        </Button>
      </div>

      {/* Desktop Filters */}
      <Card className="shadow-soft hidden sm:block">
        <CardContent className="p-4">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* chips-style only; remove live search box on desktop to match unified pattern */}
              <div className="relative">
                <Input
                  placeholder="Add filter term (environment, org unit, etc)..."
                  value={newFilterTerm}
                  onChange={e => setNewFilterTerm(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="pl-3"
                />
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add filter term..."
                  value={newFilterTerm}
                  onChange={e => setNewFilterTerm(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1"
                />
                <Button variant="outline" onClick={addFilterTerm} disabled={!newFilterTerm.trim()}>Add Filter</Button>
              </div>
            </div>
            {filterTerms.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-muted-foreground self-center">Active Filters:</span>
                {filterTerms.map(term => (
                  <Badge key={term} variant="secondary" className="flex items-center gap-1 px-3 py-1">
                    {term}
                    <Button variant="ghost" size="sm" className="h-4 w-4 p-0 hover:bg-transparent" onClick={() => removeFilterTerm(term)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
                <Button variant="ghost" size="sm" onClick={() => { setFilterTerms([]); const sp = new URLSearchParams(searchParams); sp.delete('q'); setSearchParams(sp, { replace: true }); }} className="text-muted-foreground">Clear all</Button>
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
              {/* mobile stacked input to add chips */}
              <div className="relative w-full">
                <Input
                  placeholder="Add filter term..."
                  value={newFilterTerm}
                  onChange={e => setNewFilterTerm(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="w-full"
                />
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add filter term..."
                  value={newFilterTerm}
                  onChange={e => setNewFilterTerm(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1"
                />
                <Button variant="outline" onClick={addFilterTerm} disabled={!newFilterTerm.trim()} className="shrink-0">Add Filter</Button>
              </div>
            </div>
            {filterTerms.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-muted-foreground self-center">Active Filters:</span>
                {filterTerms.map(term => (
                  <Badge key={term} variant="secondary" className="flex items-center gap-1 px-3 py-1">
                    {term}
                    <Button variant="ghost" size="sm" className="h-4 w-4 p-0 hover:bg-transparent" onClick={() => removeFilterTerm(term)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
                <Button variant="ghost" size="sm" onClick={() => { setFilterTerms([]); const sp = new URLSearchParams(searchParams); sp.delete('q'); setSearchParams(sp, { replace: true }); }} className="text-muted-foreground">Clear all</Button>
              </div>
            )}
            <div className="pt-2">
              <Button variant="default" className="w-full" onClick={() => setFiltersOpen(false)}>Apply</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

  <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Loaded {filteredZones.length} zone(s){nextCursor !== null ? ' (more available)' : ''}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Page size:</span>
            <select
              className="border rounded px-2 py-1 text-xs bg-background"
              value={limit}
              disabled={loading}
              onChange={e => setLimit(Number(e.target.value))}
            >
              {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
        {loading && filteredZones.length === 0 && (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4 animate-pulse">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="h-4 w-40 bg-muted rounded" />
                        <div className="h-5 w-14 bg-muted rounded" />
                      </div>
                      <div className="h-3 w-80 bg-muted rounded" />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 bg-muted rounded" />
                      <div className="h-7 w-7 bg-muted rounded" />
                      <div className="h-7 w-7 bg-muted rounded" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        {filteredZones.length === 0 && !loading && (
          <Card><CardContent className="py-10 text-center text-muted-foreground">No zones found</CardContent></Card>
        )}
        <div className="space-y-2">
          {filteredZones.map(zone => {
            const af = zone.account_facts ?? ({} as any);
            const to = `/zones/${encodeURIComponent(zone.client)}/${encodeURIComponent(zone.zone)}`;
            return (
              <Link
                key={`${zone.client}:${zone.zone}`}
                to={to}
                className="block focus:outline-none focus:ring-2 focus:ring-ring rounded-md"
                aria-label={`View zone ${zone.zone}`}
              >
                <Card className="transition-colors hover:bg-muted/30 group">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-medium truncate contrast-value" title={`${zone.client} • ${zone.zone}`}>{zone.zone}</span>
                          <Badge variant={af.environment === 'production' ? 'destructive' : 'secondary'} className="uppercase">{af.environment || '-'}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                          <span className="truncate contrast-value" title={af.organizational_unit || ''}>{af.organizational_unit || '—'}</span>
                          <span className="font-mono contrast-value">{af.aws_account_id || '—'}</span>
                          <span className="truncate contrast-value" title={af.account_name || ''}>{af.account_name || '—'}</span>
                          {af.resource_namespace && <span className="truncate contrast-value" title={af.resource_namespace}>NS: {af.resource_namespace}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 text-muted-foreground group-hover:text-foreground">
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
        <div className="flex justify-center mt-6">
          {nextCursor !== null ? (
            <Button onClick={loadMore} disabled={loading} variant="outline" className="min-w-[160px]">
              {loading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading...</>) : 'Load More'}
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">No more pages</span>
          )}
        </div>
      </div>
      </div>
    </DashboardLayout>
  );
};

export default Zones;