import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Briefcase, Building2, Plus, Search, X } from "lucide-react";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useReduxData } from "@/hooks/useReduxData";
import type { Portfolio, Application } from "@/store/types";

export default function Portfolios() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Auth guard
  const isAuthenticated = useSelector((s: RootState) => s.auth?.isAuthenticated) ?? false;
  useEffect(() => {
    if (!isAuthenticated) navigate("/login");
  }, [isAuthenticated, navigate]);

  const { selectedClient, portfolios, applications, actions, selectClient } = useReduxData();

  // Local search terms UX
  const [searchTerms, setSearchTerms] = useState<string[]>([]);
  const [newTerm, setNewTerm] = useState("");

  // URL param can set/override selected client
  useEffect(() => {
    const clientParam = searchParams.get("client");
    if (clientParam && clientParam !== selectedClient) {
      selectClient(clientParam);
    }
  }, [searchParams, selectClient, selectedClient]);

  // Fetch portfolios for current client
  const currentClient = selectedClient || null;
  const portfoliosList = useMemo<Portfolio[]>(() => {
    const p: any = portfolios?.items;
    return Array.isArray(p) ? (p as Portfolio[]) : [];
  }, [portfolios?.items]);

  const appsList = useMemo<Application[]>(() => {
    const a: any = (applications as any)?.items ?? applications;
    return Array.isArray(a) ? (a as Application[]) : [];
  }, [applications]);

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

  // Derived lists
  const clientPortfolios = useMemo<Portfolio[]>(() => {
    if (!currentClient) return [];
    return portfoliosList.filter((p) => p.client === currentClient);
  }, [portfoliosList, currentClient]);

  // Apply search terms
  const filteredPortfolios = useMemo<Portfolio[]>(() => {
    if (searchTerms.length === 0) return clientPortfolios;
    const terms = searchTerms.map((t) => t.toLowerCase());
    return clientPortfolios.filter((p) => {
      const hay = [
        p.portfolio,
        p.project?.name ?? "",
        p.project?.code ?? "",
        p.project?.description ?? "",
        p.domain ?? "",
        ...(Object.keys(p.tags ?? {})),
      ]
        .join(" ")
        .toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
  }, [clientPortfolios, searchTerms]);

  // App count per portfolio
  const getAppCount = (portfolio: string) => appsList.filter((a) => a.portfolio === portfolio).length;

  const addSearchTerm = () => {
    const v = newTerm.trim();
    if (!v) return;
    if (!searchTerms.includes(v)) {
      setSearchTerms((s) => [...s, v]);
    }
    setNewTerm("");
  };

  const removeSearchTerm = (term: string) => {
    setSearchTerms((s) => s.filter((t) => t !== term));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSearchTerm();
    }
  };

  if (!currentClient) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-medium text-foreground">No Client Selected</h3>
              <p className="mt-1 text-sm text-muted-foreground">Please select a client from the header to view portfolios.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Portfolios</h1>
          <p className="text-muted-foreground">Manage portfolios for {currentClient}</p>
        </div>
        <Button asChild variant="gradient" className="gap-2">
          <Link to={`/portfolios/create?client=${currentClient}`}>
            <Plus className="h-4 w-4" />
            Create Portfolio
          </Link>
        </Button>
      </div>

      {/* Search */}
      <Card className="shadow-soft">
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
            {searchTerms.length > 0 && (
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
                <Button variant="ghost" size="sm" onClick={() => setSearchTerms([])} className="text-muted-foreground">
                  Clear all
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="shadow-medium">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            Portfolio List ({filteredPortfolios.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Portfolio</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Applications</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPortfolios.map((p) => {
                const key = `${p.client}/${p.portfolio}`;
                const name = p.project?.name || p.portfolio;
                const desc = p.project?.description || "";
                const code = p.project?.code || "—";
                const updated = p.updated_at ? new Date(p.updated_at).toLocaleString() : "—";
                const appCount = getAppCount(p.portfolio);

                return (
                  <TableRow
                    key={key}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => navigate(`/portfolios/${p.portfolio}?client=${p.client}`)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary/10 rounded-md flex items-center justify-center">
                          <Briefcase className="h-4 w-4 text-primary" />
                        </div>
                        <div className="truncate">
                          <div className="font-medium">{name}</div>
                          <div className="text-xs text-muted-foreground">{p.portfolio}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{desc || "—"}</TableCell>
                    <TableCell>{appCount} apps</TableCell>
                    <TableCell>{code}</TableCell>
                    <TableCell>{updated}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/portfolios/${p.portfolio}?client=${p.client}`}>View Details</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredPortfolios.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No portfolios found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}