
import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ArrowLeft, Building2, ExternalLink, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useReduxData } from '@/hooks/useReduxData';

const Zones = () => {
  const { zones, clients, selectedClient, initializeZones, initializeClients, selectClient } = useReduxData();

  useEffect(() => {
    // Initialize with mock data - replace with API calls
    initializeClients([
      {
        id: '1',
        name: 'Acme Corp',
        description: 'Main client',
        homepage: 'https://acme.com',
        contactName: 'John Doe',
        contactEmail: 'john@acme.com',
        primaryAwsRegion: 'us-east-1',
        memberCount: 50,
        portfolioCount: 3,
      }
    ]);

    initializeZones([
      {
        id: '1',
        clientId: '1',
        organizationalUnit: 'Production',
        awsAccountId: '123456789012',
        accountName: 'prod-account',
        environment: 'production',
        namespace: 'prod-ns',
        kmsKeys: ['key-1', 'key-2'],
        vpcAliases: ['main-vpc', 'backup-vpc'],
        subnetAliases: ['web-subnet', 'db-subnet'],
        tags: { Environment: 'prod', Team: 'platform' },
      },
      {
        id: '2',
        clientId: '1',
        organizationalUnit: 'Development',
        awsAccountId: '123456789013',
        accountName: 'dev-account',
        environment: 'development',
        kmsKeys: ['dev-key-1'],
        vpcAliases: ['dev-vpc'],
        subnetAliases: ['dev-subnet'],
        tags: { Environment: 'dev', Team: 'development' },
      }
    ]);
  }, []);

  // Filter zones by selected client
  const filteredZones = useMemo(() => {
    return selectedClient ? zones.filter(zone => zone.clientId === selectedClient.id) : zones;
  }, [zones, selectedClient]);

  return (
    <div className="space-y-6">
      {/* Selected Client Header - Prominent Display */}
      {selectedClient && (
        <Card className="border-l-4 border-l-primary bg-primary/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">ACTIVE CLIENT</span>
                    <Badge variant="secondary" className="bg-primary/10 text-primary">Tenant</Badge>
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">{selectedClient.name}</h2>
                  <p className="text-sm text-muted-foreground">{selectedClient.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/clients/${selectedClient.id}`}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    View Client Details
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">
            {selectedClient ? `Zones Management` : 'All Zones'}
          </h1>
          <p className="text-muted-foreground">
            {selectedClient 
              ? `Manage AWS zones and environments for ${selectedClient.name}`
              : 'Manage your AWS zones and environments across all clients'
            }
          </p>
        </div>
        <Button asChild disabled={!selectedClient}>
          <Link to={selectedClient ? `/clients/${selectedClient.id}/zones/create` : "/zones/create"}>
            <Plus className="mr-2 h-4 w-4" />
            Add Zone
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>
              {selectedClient ? `${selectedClient.name} Zones` : 'All Zones'}
            </span>
            <Badge variant="outline">{filteredZones.length} zones</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organizational Unit</TableHead>
                <TableHead>AWS Account ID</TableHead>
                <TableHead>Account Name</TableHead>
                <TableHead>Environment</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredZones.map((zone) => (
                <TableRow key={zone.id}>
                  <TableCell className="font-medium">{zone.organizationalUnit}</TableCell>
                  <TableCell className="font-mono text-sm">{zone.awsAccountId}</TableCell>
                  <TableCell>{zone.accountName}</TableCell>
                  <TableCell>
                    <Badge variant={zone.environment === 'production' ? 'destructive' : 'secondary'}>
                      {zone.environment}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        asChild
                        title="View Zone Details"
                      >
                        <Link to={`/zones/${zone.id}`}>
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        asChild
                        title="Edit Zone"
                      >
                        <Link to={`/zones/${zone.id}/edit`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        title="Delete Zone"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          // TODO: Add delete confirmation dialog
                          console.log(`Delete zone ${zone.id}`);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredZones.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {selectedClient 
                      ? `No zones found for ${selectedClient.name}`
                      : 'No zones found'
                    }
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Zones;
