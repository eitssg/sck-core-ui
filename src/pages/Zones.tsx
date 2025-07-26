
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ArrowLeft, Building2, ExternalLink, Edit, Trash2, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useReduxData } from '@/hooks/useReduxData';
import { useToast } from '@/hooks/use-toast';

const Zones = () => {
  const { zones, clients, selectedClient, initializeZones, initializeClients, selectClient, removeZone } = useReduxData();
  const { toast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [searchTerm, setSearchTerm] = useState("");

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
        name: 'Production Zone',
        organizationalUnit: 'Production',
        orgId: 'o-1a2b3c4d5e',
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
        name: 'Development Zone',
        organizationalUnit: 'Development',
        orgId: 'o-6f7g8h9i0j',
        awsAccountId: '123456789013',
        accountName: 'dev-account',
        environment: 'development',
        kmsKeys: ['dev-key-1'],
        vpcAliases: ['dev-vpc'],
        subnetAliases: ['dev-subnet'],
        tags: { Environment: 'dev', Team: 'development' },
      },
      {
        id: '3',
        clientId: '1',
        name: 'Staging Zone',
        organizationalUnit: 'Staging',
        orgId: 'o-k1l2m3n4o5',
        awsAccountId: '123456789014',
        accountName: 'staging-account',
        environment: 'staging',
        namespace: 'staging-ns',
        kmsKeys: ['staging-key-1'],
        vpcAliases: ['staging-vpc'],
        subnetAliases: ['staging-subnet'],
        tags: { Environment: 'staging', Team: 'qa' },
      }
    ]);
  }, []);

  // Filter zones by selected client and search term
  const filteredZones = useMemo(() => {
    let filtered = selectedClient ? zones.filter(zone => zone.clientId === selectedClient.id) : zones;
    
    if (searchTerm) {
      filtered = filtered.filter(zone =>
        zone.organizationalUnit.toLowerCase().includes(searchTerm.toLowerCase()) ||
        zone.awsAccountId.includes(searchTerm) ||
        zone.accountName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        zone.environment.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (zone.namespace && zone.namespace.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    return filtered;
  }, [zones, selectedClient, searchTerm]);

  // Pagination calculations
  const totalItems = filteredZones.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedZones = filteredZones.slice(startIndex, endIndex);

  // Reset to first page when client or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedClient, searchTerm]);

  const handleDeleteZone = (zone: any) => {
    removeZone(zone.id);
    toast({
      title: "Zone deleted",
      description: `Zone ${zone.accountName} has been deleted successfully.`,
    });
    
    // Adjust current page if we deleted the last item on current page
    const newTotalItems = filteredZones.length - 1;
    const newTotalPages = Math.ceil(newTotalItems / itemsPerPage);
    if (currentPage > newTotalPages && newTotalPages > 0) {
      setCurrentPage(newTotalPages);
    }
  };

  if (!selectedClient) {
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
      {/* Selected Client Header - Prominent Display */}
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
                <a href={selectedClient.homepage} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Website
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Zones Management</h1>
          <p className="text-muted-foreground">
            Manage AWS zones and environments for {selectedClient.name}
          </p>
        </div>
        <Button asChild>
          <Link to={`/clients/${selectedClient.id}/zones/create`}>
            <Plus className="mr-2 h-4 w-4" />
            Add Zone
          </Link>
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex-1 max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search zones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>
              {selectedClient.name} Zones
            </span>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Show:</span>
                <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                  setItemsPerPage(Number(value));
                  setCurrentPage(1);
                }}>
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
              {paginatedZones.map((zone) => (
                <TableRow key={zone.id}>
                  <TableCell className="font-medium">
                    <div>
                      <div className="font-medium">{zone.organizationalUnit}</div>
                      <div className="text-xs text-muted-foreground">{zone.orgId}</div>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{zone.name}</TableCell>
                  <TableCell className="font-mono text-sm">{zone.awsAccountId}</TableCell>
                  <TableCell>{zone.accountName}</TableCell>
                  <TableCell>
                    <Badge variant={zone.environment === 'production' ? 'destructive' : 'secondary'}>
                      {zone.environment}
                    </Badge>
                  </TableCell>
                  <TableCell>{zone.namespace || '-'}</TableCell>
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
                              Are you sure you want to delete the zone "{zone.accountName}"? This action cannot be undone.
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
              ))}
              {paginatedZones.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className="w-10"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
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
