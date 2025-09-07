import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, MoreHorizontal, Edit, Trash2, Eye, Building2, Globe, Mail, Users } from "lucide-react";

import DashboardLayout from "@/components/DashboardLayout";
import { useReduxData } from "@/hooks/useReduxData";
import { useTheme } from "@/hooks/useTheme";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import type { Client } from "@/store/types";

const Clients = () => {
  const { clients, actions } = useReduxData();
  const { isDark } = useTheme();
  const [searchTerm, setSearchTerm] = useState("");

  // Load clients on mount (cached by slice)
  useEffect(() => {
    if (actions?.clients?.fetch) {
      actions.clients.fetch({ limit: 100 });
    }
  }, [actions?.clients]);

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

  const handleDelete = (clientSlug: string) => {
    if (!clientSlug) return;
    if (window.confirm("Are you sure you want to delete this client?")) {
      if (actions?.clients?.remove) {
        actions.clients.remove(clientSlug);
      }
    }
  };

  const getStatusBadge = (status?: string) => {
    const s = (status ?? "active").toLowerCase();
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
      active: { label: "Active", variant: "default" },
      inactive: { label: "Inactive", variant: "secondary" },
      suspended: { label: "Suspended", variant: "destructive" },
    };
    const m = statusMap[s] ?? statusMap.active;
    return <Badge variant={m.variant}>{m.label}</Badge>;
  };

  return (
    <DashboardLayout activeItem="clients">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
            <p className="text-muted-foreground">Manage your client organizations and their configurations.</p>
          </div>
          <Button asChild>
            <Link to="/clients/create">
              <Plus className="mr-2 h-4 w-4" />
              Add Client
            </Link>
          </Button>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search clients by name, description, domain..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                  aria-label="Search clients"
                />
              </div>
            </div>
          </CardContent>
        </Card>

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
                  return (
                    <li key={client.client} className="py-3">
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
                                <Link to={`/clients/${client.client}`} className="font-medium hover:underline truncate">
                                  {title}
                                </Link>
                                {getStatusBadge(client.client_status)}
                              </div>
                              <div className="text-sm text-muted-foreground truncate">
                                {subtitle}
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <code className="font-mono bg-muted px-1.5 py-0.5 rounded">{client.client}</code>
                                </div>
                                {org && (
                                  <div className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    <span className="truncate max-w-[240px]">{org}</span>
                                  </div>
                                )}
                                {client.domain && (
                                  <div className="flex items-center gap-1">
                                    <Globe className="h-3 w-3" />
                                    <span className="truncate max-w-[200px]">{client.domain}</span>
                                  </div>
                                )}
                                {created && <span>Created {created}</span>}
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" aria-label="Client actions">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link to={`/clients/${client.client}`}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link to={`/clients/${client.client}/edit`}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(client.client)}>
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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