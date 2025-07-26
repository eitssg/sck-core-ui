import { useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Plus, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useReduxData } from '@/hooks/useReduxData';

const Zones = () => {
  const { clientId } = useParams<{ clientId?: string }>();
  const { zones, clients, initializeZones, initializeClients } = useReduxData();

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
  }, [initializeZones, initializeClients]);

  // Filter zones by client if clientId is provided
  const filteredZones = useMemo(() => {
    return clientId ? zones.filter(zone => zone.clientId === clientId) : zones;
  }, [zones, clientId]);

  const selectedClient = clientId ? clients.find(c => c.id === clientId) : null;

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client?.name || 'Unknown Client';
  };

  return (
    <div className="space-y-6">
      {clientId && (
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/clients/${clientId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Client
            </Link>
          </Button>
        </div>
      )}
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">
            {selectedClient ? `${selectedClient.name} - Zones` : 'Zones'}
          </h1>
          <p className="text-muted-foreground">
            {selectedClient 
              ? `Manage zones for ${selectedClient.name}`
              : 'Manage your AWS zones and environments'
            }
          </p>
        </div>
        <Button asChild>
          <Link to={clientId ? `/clients/${clientId}/zones/create` : "/zones/create"}>
            <Plus className="mr-2 h-4 w-4" />
            Add Zone
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {selectedClient ? `${selectedClient.name} Zones` : 'All Zones'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {!clientId && <TableHead>Client</TableHead>}
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
                  {!clientId && (
                    <TableCell className="font-medium">{getClientName(zone.clientId)}</TableCell>
                  )}
                  <TableCell>{zone.organizationalUnit}</TableCell>
                  <TableCell>{zone.awsAccountId}</TableCell>
                  <TableCell>{zone.accountName}</TableCell>
                  <TableCell>
                    <Badge variant={zone.environment === 'production' ? 'destructive' : 'secondary'}>
                      {zone.environment}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/zones/${zone.id}`}>View Details</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Zones;