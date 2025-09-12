import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Search, ChevronRight, Building2, Globe, Users, Circle } from "lucide-react";

import DashboardLayout from "@/components/DashboardLayout";
import { useReduxData } from "@/hooks/useReduxData";
import { useTheme } from "@/hooks/useTheme";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
// Removed row dropdown actions
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import type { Client } from "@/store/types";

const Clients = () => {
  const { clients, actions } = useReduxData();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [searchTerm, setSearchTerm] = useState("");

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
    if (!searchTerm) return list;
    const q = searchTerm.toLowerCase();
    return list.filter((c) =>
      (c.client_name ?? "").toLowerCase().includes(q) ||
      (c.client_description ?? "").toLowerCase().includes(q) ||
      (c.client ?? "").toLowerCase().includes(q) ||
      (c.domain ?? "").toLowerCase().includes(q) ||
      (c.organization_name ?? "").toLowerCase().includes(q)
    );
  }, [clients.items, searchTerm]);

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
    <DashboardLayout activeItem="clients">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Management Accounts</h1>
            <p className="text-muted-foreground">Manage your client organizations and their configurations.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="gap-1">
              <Link to="/clients/create">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">New</span>
              </Link>
            </Button>
          </div>

  </div>

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
                {searchTerm ? "No clients match your search criteria." : "Get started by creating your first client."}
              </p>
              {!searchTerm && (
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
                <span>{searchTerm && `Filtered by: "${searchTerm}"`}</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Clients;