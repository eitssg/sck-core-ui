import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, Globe, Key, Network, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useReduxData } from '@/hooks/useReduxData';
import { useToast } from '@/hooks/use-toast';

const ZoneDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { zones, clients, selectZone, removeZone: deleteZone } = useReduxData();
  const [zone, setZone] = useState(zones.find(z => z.id === id));

  useEffect(() => {
    if (id) {
      selectZone(id);
      const foundZone = zones.find(z => z.id === id);
      setZone(foundZone);
    }
  }, [id, zones, selectZone]);

  const handleDelete = () => {
    if (zone) {
      deleteZone(zone.id);
      toast({
        title: "Zone deleted",
        description: `Zone ${zone.accountName} has been deleted successfully.`,
      });
      navigate('/zones');
    }
  };

  if (!zone) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/zones">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Zones
            </Link>
          </Button>
        </div>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold">Zone not found</h2>
          <p className="text-muted-foreground">The zone you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const client = clients.find(c => c.id === zone.clientId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/zones">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Zones
            </Link>
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to={`/zones/${zone.id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Zone
            </Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Zone
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Zone</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this zone? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Zone Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Client</label>
              <p className="text-sm">{client?.name || 'Unknown Client'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Organizational Unit</label>
              <p className="text-sm">{zone.organizationalUnit}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">AWS Account ID</label>
              <p className="text-sm font-mono">{zone.awsAccountId}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Account Name</label>
              <p className="text-sm">{zone.accountName}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Environment</label>
              <Badge variant={zone.environment === 'production' ? 'destructive' : 'secondary'}>
                {zone.environment}
              </Badge>
            </div>
            {zone.namespace && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Namespace</label>
                <p className="text-sm">{zone.namespace}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              KMS Keys
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {zone.kmsKeys.length > 0 ? (
                zone.kmsKeys.map((key, index) => (
                  <Badge key={index} variant="outline">
                    {key}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No KMS keys assigned</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5" />
              VPC Aliases
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {zone.vpcAliases.length > 0 ? (
                zone.vpcAliases.map((vpc, index) => (
                  <Badge key={index} variant="outline">
                    {vpc}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No VPC aliases</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5" />
              Subnet Aliases
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {zone.subnetAliases.length > 0 ? (
                zone.subnetAliases.map((subnet, index) => (
                  <Badge key={index} variant="outline">
                    {subnet}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No subnet aliases</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Tags
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.keys(zone.tags).length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {Object.entries(zone.tags).map(([key, value]) => (
                  <Badge key={key} variant="secondary">
                    {key}: {value}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No tags assigned</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ZoneDetails;