import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useReduxData } from '@/hooks/useReduxData';

const Zones = () => {
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

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client?.name || 'Unknown Client';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Zones</h1>
          <p className="text-muted-foreground">Manage your AWS zones and environments</p>
        </div>
        <Button asChild>
          <Link to="/zones/create">
            <Plus className="mr-2 h-4 w-4" />
            Add Zone
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Zones</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Organizational Unit</TableHead>
                <TableHead>AWS Account ID</TableHead>
                <TableHead>Account Name</TableHead>
                <TableHead>Environment</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {zones.map((zone) => (
                <TableRow key={zone.id}>
                  <TableCell className="font-medium">{getClientName(zone.clientId)}</TableCell>
                  <TableCell>{zone.organizationalUnit}</TableCell>
                  <TableCell>{zone.awsAccountId}</TableCell>
                  <TableCell>{zone.accountName}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      zone.environment === 'production' 
                        ? 'bg-red-100 text-red-800' 
                        : zone.environment === 'development'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {zone.environment}
                    </span>
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