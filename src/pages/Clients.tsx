import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Building2, Globe, Mail, User, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useReduxData } from "@/hooks/useReduxData";

export default function Clients() {
  // Get clients from Redux store instead of hardcoded data
  const { clients } = useReduxData();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Clients</h1>
          <p className="text-muted-foreground">Manage your client organizations</p>
        </div>
        <Button asChild>
          <Link to="/clients/create">
            <Plus className="mr-2 h-4 w-4" />
            Add Client
          </Link>
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search clients..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredClients.map((client) => (
          <Card key={client.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{client.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">ID: {client.id}</p>
                </div>
                <Building2 className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{client.description}</p>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a href={client.homepage} target="_blank" rel="noopener noreferrer" 
                     className="text-blue-600 hover:underline">
                    {client.homepage}
                  </a>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{client.contactName}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{client.contactEmail}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="outline">{client.primaryAwsRegion}</Badge>
                </div>
              </div>

              <div className="flex justify-between text-sm text-muted-foreground pt-2 border-t">
                <span>{client.memberCount} members</span>
                <span>{client.portfolioCount} portfolios</span>
              </div>

              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm" className="flex-1">
                  <Link to={`/clients/${client.id}`}>View Details</Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="flex-1">
                  <Link to={`/clients/${client.id}/edit`}>Edit</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredClients.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-sm font-semibold text-foreground">No clients found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {searchTerm ? "Try adjusting your search terms" : "Get started by creating your first client"}
          </p>
          {!searchTerm && (
            <div className="mt-6">
              <Button asChild>
                <Link to="/clients/create">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Client
                </Link>
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}