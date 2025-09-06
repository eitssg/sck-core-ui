import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, MoreHorizontal, Edit, Trash2, Eye, Building2, Globe, Mail } from "lucide-react";

import DashboardLayout from "@/components/DashboardLayout";
import { useReduxData } from "@/hooks/useReduxData";
import { useTheme } from "@/hooks/useTheme";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredClients.map((client: Client) => (
              <Card key={client.client} className="group hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-lg">{client.client_name || client.client}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {client.client_description || "No description provided"}
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
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
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Status</span>
                      {getStatusBadge(client.client_status)}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Client</span>
                      <code className="text-sm font-mono bg-muted px-2 py-1 rounded">{client.client}</code>
                    </div>

                    {client.client_type && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Type</span>
                        <Badge variant="outline">{client.client_type}</Badge>
                      </div>
                    )}

                    {client.domain && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Domain</span>
                        <div className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          <span className="text-sm truncate max-w-[140px]">{client.domain}</span>
                        </div>
                      </div>
                    )}

                    {client.homepage && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Homepage</span>
                        <a
                          href={client.homepage}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline truncate max-w-[140px]"
                        >
                          Visit Site
                        </a>
                      </div>
                    )}

                    {client.organization_email && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Contact</span>
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          <span className="text-sm truncate max-w-[160px]">{client.organization_email}</span>
                        </div>
                      </div>
                    )}

                    {client.created_at && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Created</span>
                        <span className="text-sm">{new Date(client.created_at).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t">
                    <Button asChild variant={isDark ? "secondary" : "outline"} size="sm" className="w-full">
                      <Link to={`/clients/${client.client}`}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
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