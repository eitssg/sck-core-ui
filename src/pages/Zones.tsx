import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Building2, ExternalLink, Edit, Trash2, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { useReduxData } from '@/hooks/useReduxData';
import { useToast } from '@/hooks/use-toast';
import type { Zone } from '@/store/types';

// Runtime type guard so TS narrows to Zone[]
function isZone(x: unknown): x is Zone {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return typeof o.client === 'string' && typeof o.zone === 'string';
}

const Zones = () => {
  const { zones, selectedClient, removeZone } = useReduxData();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTerms, setFilterTerms] = useState<string[]>([]);
  const [newFilterTerm, setNewFilterTerm] = useState('');

  // Initialize filters from URL parameters
  useEffect(() => {
    const environmentFilter = searchParams.get('environment');
    const orgFilter = searchParams.get('organizationalUnit');
    const initialFilters: string[] = [];
    if (environmentFilter) initialFilters.push(environmentFilter);
    if (orgFilter) initialFilters.push(orgFilter);
    if (initialFilters.length > 0) setFilterTerms(initialFilters);
  }, [searchParams]);

  // Helper to check if a value contains the term
  const contains = (v: unknown, term: string) =>
    v != null && String(v).toLowerCase().includes(term.toLowerCase());

  // selectedClient is a string (client slug). If an object is ever passed, fall back to .client.
  const selectedClientKey: string | null =
    typeof selectedClient === 'string'
      ? selectedClient
      : (selectedClient && (selectedClient as any).client) || null;

  // Always work with a strongly-typed Zone[] list
  const zonesList = useMemo<Zone[]>(
    () => (Array.isArray(zones) ? (zones as unknown[]).filter(isZone) : []),
    [zones]
  );

  // Filter zones by selected client, search term, and filter terms
  const filteredZones = useMemo<Zone[]>(() => {
    let filtered: Zone[] = zonesList.slice();

    if (selectedClientKey) {
      filtered = filtered.filter((z: Zone) => z.client === selectedClientKey);
    }

    // Apply search term across key fields
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      filtered = filtered.filter((z: Zone) => {
        const af = z.account_facts ?? ({} as any);
        const tags = z.tags ?? {};
        return (
          contains(z.zone, t) ||
          contains(af.organizational_unit, t) ||
          contains(af.aws_account_id, t) ||
          contains(af.account_name, t) ||
          contains(af.environment, t) ||
          contains(af.resource_namespace, t) ||
          Object.entries(tags).some(([k, v]) => contains(k, t) || contains(v, t))
        );
      });
    }

    // Apply additional filter terms (AND across terms)
    if (filterTerms.length > 0) {
      filtered = filtered.filter((z: Zone) => {
        const af = z.account_facts ?? ({} as any);
        return filterTerms.every((term) => {
          const tt = term.toLowerCase();
          return (
            contains(z.zone, tt) ||
            contains(af.environment, tt) ||
            contains(af.organizational_unit, tt) ||
            contains(af.account_name, tt) ||
            contains(af.resource_namespace, tt)
          );
        });
      });
    }

    return filtered;
  }, [zonesList, selectedClientKey, searchTerm, filterTerms]);

  // Pagination calculations
  const totalItems = filteredZones.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedZones: Zone[] = filteredZones.slice(startIndex, endIndex);

  // Reset to first page when client, search, or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedClientKey, searchTerm, filterTerms]);

  const addFilterTerm = () => {
    const val = newFilterTerm.trim();
    if (val && !filterTerms.includes(val)) {
      setFilterTerms([...filterTerms, val]);
      setNewFilterTerm('');
    }
  };

  const removeFilterTerm = (termToRemove: string) => {
    setFilterTerms(filterTerms.filter((term) => term !== termToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') addFilterTerm();
  };

  const handleDeleteZone = (zone: Zone) => {
    removeZone({ client: zone.client, zone: zone.zone } as any);
    toast({
      title: 'Zone deleted',
      description: `Zone ${zone.account_facts?.account_name ?? zone.zone} has been deleted successfully.`,
    });

    const newTotalItems = filteredZones.length - 1;
    const newTotalPages = Math.ceil(newTotalItems / itemsPerPage);
    if (currentPage > newTotalPages && newTotalPages > 0) {
      setCurrentPage(newTotalPages);
    }
  };

  if (!selectedClientKey) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-medium text-foreground">No Client Selected</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Please select a client from the header to view zones.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Zones Management</h1>
          <p className="text-muted-foreground">Manage AWS zones and environments</p>
        </div>
        <Button asChild>
          <Link to={`/clients/${encodeURIComponent(selectedClientKey)}/zones/create`}>
            <Plus className="mr-2 h-4 w-4" />
            Add Zone
          </Link>
        </Button>
      </div>

      {/* Search and Filter Terms */}
      <Card className="shadow-soft">
        <CardContent className="p-4">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search zones, accounts, environments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Add filter term (environment, org unit, etc)..."
                  value={newFilterTerm}
                  onChange={(e) => setNewFilterTerm(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1"
                />
                <Button onClick={addFilterTerm} disabled={!newFilterTerm.trim()}>
                  Add Filter
                </Button>
              </div>
            </div>

            {filterTerms.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-muted-foreground self-center">Active Filters:</span>
                {filterTerms.map((term) => (
                  <Badge key={term} variant="secondary" className="flex items-center gap-1 px-3 py-1">
                    {term}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => removeFilterTerm(term)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilterTerms([])}
                  className="text-muted-foreground"
                >
                  Clear all filters
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>Zones ({totalItems})</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Show:</span>
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(value) => {
                    setItemsPerPage(Number(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Badge variant="outline">{totalItems} zones</Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organizational Unit</TableHead>
                <TableHead>Zone Name</TableHead>
                <TableHead>AWS Account ID</TableHead>
                <TableHead>Account Name</TableHead>
                <TableHead>Environment</TableHead>
                <TableHead>Namespace</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedZones.map((zone) => {
                const af = zone.account_facts ?? ({} as any);
                const rowKey = `${zone.client}:${zone.zone}`;
                return (
                  <TableRow key={rowKey}>
                    <TableCell className="font-medium">
                      <div>
                        <div className="font-medium">{af.organizational_unit || '-'}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{zone.zone}</TableCell>
                    <TableCell className="font-mono text-sm">{af.aws_account_id || '-'}</TableCell>
                    <TableCell>{af.account_name || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={af.environment === 'production' ? 'destructive' : 'secondary'}>
                        {af.environment || '-'}
                      </Badge>
                    </TableCell>
                    <TableCell>{af.resource_namespace || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" asChild title="View Zone Details">
                          <Link to={`/zones/${encodeURIComponent(zone.client)}/${encodeURIComponent(zone.zone)}`}>
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm" asChild title="Edit Zone">
                          <Link to={`/zones/${encodeURIComponent(zone.client)}/${encodeURIComponent(zone.zone)}/edit`}>
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Delete Zone"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Zone</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete the zone "{af.account_name ?? zone.zone}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteZone(zone)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {paginatedZones.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No zones found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} zones
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) pageNum = i + 1;
                else if (currentPage <= 3) pageNum = i + 1;
                else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                else pageNum = currentPage - 2 + i;

                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === currentPage ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className="w-8 h-8 p-0 flex items-center justify-center"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Zones;