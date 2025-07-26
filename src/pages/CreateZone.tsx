import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useReduxData } from '@/hooks/useReduxData';
import { useToast } from '@/hooks/use-toast';
import type { Zone } from '@/store/slices/zonesSlice';

const zoneSchema = z.object({
  clientId: z.string().min(1, 'Client is required'),
  organizationalUnit: z.string().min(1, 'Organizational unit is required'),
  awsAccountId: z.string().regex(/^\d{12}$/, 'AWS Account ID must be 12 digits'),
  accountName: z.string().min(1, 'Account name is required'),
  environment: z.string().min(1, 'Environment is required'),
  namespace: z.string().optional(),
});

type ZoneFormData = z.infer<typeof zoneSchema>;

const CreateZone = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { zones, clients, addZone, updateZone } = useReduxData();
  const [kmsKeys, setKmsKeys] = useState<string[]>([]);
  const [newKmsKey, setNewKmsKey] = useState('');
  const [vpcAliases, setVpcAliases] = useState<string[]>([]);
  const [newVpcAlias, setNewVpcAlias] = useState('');
  const [subnetAliases, setSubnetAliases] = useState<string[]>([]);
  const [newSubnetAlias, setNewSubnetAlias] = useState('');
  const [tags, setTags] = useState<Record<string, string>>({});
  const [newTagKey, setNewTagKey] = useState('');
  const [newTagValue, setNewTagValue] = useState('');

  const isEditing = !!id;
  const existingZone = zones.find(z => z.id === id);

  const form = useForm<ZoneFormData>({
    resolver: zodResolver(zoneSchema),
    defaultValues: {
      clientId: '',
      organizationalUnit: '',
      awsAccountId: '',
      accountName: '',
      environment: '',
      namespace: '',
    },
  });

  useEffect(() => {
    if (isEditing && existingZone) {
      form.reset({
        clientId: existingZone.clientId,
        organizationalUnit: existingZone.organizationalUnit,
        awsAccountId: existingZone.awsAccountId,
        accountName: existingZone.accountName,
        environment: existingZone.environment,
        namespace: existingZone.namespace || '',
      });
      setKmsKeys(existingZone.kmsKeys);
      setVpcAliases(existingZone.vpcAliases);
      setSubnetAliases(existingZone.subnetAliases);
      setTags(existingZone.tags);
    }
  }, [isEditing, existingZone, form]);

  const handleAddKmsKey = () => {
    if (newKmsKey.trim() && !kmsKeys.includes(newKmsKey.trim())) {
      setKmsKeys([...kmsKeys, newKmsKey.trim()]);
      setNewKmsKey('');
    }
  };

  const handleRemoveKmsKey = (key: string) => {
    setKmsKeys(kmsKeys.filter(k => k !== key));
  };

  const handleAddVpcAlias = () => {
    if (newVpcAlias.trim() && !vpcAliases.includes(newVpcAlias.trim())) {
      setVpcAliases([...vpcAliases, newVpcAlias.trim()]);
      setNewVpcAlias('');
    }
  };

  const handleRemoveVpcAlias = (alias: string) => {
    setVpcAliases(vpcAliases.filter(a => a !== alias));
  };

  const handleAddSubnetAlias = () => {
    if (newSubnetAlias.trim() && !subnetAliases.includes(newSubnetAlias.trim())) {
      setSubnetAliases([...subnetAliases, newSubnetAlias.trim()]);
      setNewSubnetAlias('');
    }
  };

  const handleRemoveSubnetAlias = (alias: string) => {
    setSubnetAliases(subnetAliases.filter(a => a !== alias));
  };

  const handleAddTag = () => {
    if (newTagKey.trim() && newTagValue.trim() && !tags[newTagKey.trim()]) {
      setTags({ ...tags, [newTagKey.trim()]: newTagValue.trim() });
      setNewTagKey('');
      setNewTagValue('');
    }
  };

  const handleRemoveTag = (key: string) => {
    const newTags = { ...tags };
    delete newTags[key];
    setTags(newTags);
  };

  const onSubmit = (data: ZoneFormData) => {
    const zoneData: Zone = {
      id: isEditing ? id! : Math.random().toString(36).substr(2, 9),
      clientId: data.clientId,
      organizationalUnit: data.organizationalUnit,
      awsAccountId: data.awsAccountId,
      accountName: data.accountName,
      environment: data.environment,
      namespace: data.namespace,
      kmsKeys,
      vpcAliases,
      subnetAliases,
      tags,
    };

    if (isEditing) {
      updateZone(zoneData);
      toast({
        title: "Zone updated",
        description: `Zone ${data.accountName} has been updated successfully.`,
      });
    } else {
      addZone(zoneData);
      toast({
        title: "Zone created",
        description: `Zone ${data.accountName} has been created successfully.`,
      });
    }

    navigate(isEditing ? `/zones/${id}` : '/zones');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to={isEditing ? `/zones/${id}` : "/zones"}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {isEditing ? 'Back to Zone Details' : 'Back to Zones'}
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {isEditing ? 'Edit Zone' : 'Create New Zone'}
          </h1>
          <p className="text-muted-foreground">
            {isEditing ? 'Update zone details' : 'Add a new zone to your infrastructure'}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a client" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="organizationalUnit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organizational Unit</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Production, Development" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="awsAccountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>AWS Account ID</FormLabel>
                    <FormControl>
                      <Input placeholder="123456789012" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="accountName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Name</FormLabel>
                    <FormControl>
                      <Input placeholder="prod-account" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="environment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Environment</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select environment" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="production">Production</SelectItem>
                        <SelectItem value="staging">Staging</SelectItem>
                        <SelectItem value="development">Development</SelectItem>
                        <SelectItem value="testing">Testing</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="namespace"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Namespace (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="prod-ns" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>KMS Keys</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter KMS key"
                  value={newKmsKey}
                  onChange={(e) => setNewKmsKey(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddKmsKey())}
                />
                <Button type="button" onClick={handleAddKmsKey}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {kmsKeys.map((key) => (
                  <Badge key={key} variant="secondary" className="flex items-center gap-1">
                    {key}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => handleRemoveKmsKey(key)}
                    />
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>VPC Aliases</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter VPC alias"
                  value={newVpcAlias}
                  onChange={(e) => setNewVpcAlias(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddVpcAlias())}
                />
                <Button type="button" onClick={handleAddVpcAlias}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {vpcAliases.map((alias) => (
                  <Badge key={alias} variant="secondary" className="flex items-center gap-1">
                    {alias}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => handleRemoveVpcAlias(alias)}
                    />
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Subnet Aliases</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter subnet alias"
                  value={newSubnetAlias}
                  onChange={(e) => setNewSubnetAlias(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSubnetAlias())}
                />
                <Button type="button" onClick={handleAddSubnetAlias}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {subnetAliases.map((alias) => (
                  <Badge key={alias} variant="secondary" className="flex items-center gap-1">
                    {alias}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => handleRemoveSubnetAlias(alias)}
                    />
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Tag key"
                  value={newTagKey}
                  onChange={(e) => setNewTagKey(e.target.value)}
                />
                <Input
                  placeholder="Tag value"
                  value={newTagValue}
                  onChange={(e) => setNewTagValue(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                />
                <Button type="button" onClick={handleAddTag}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(tags).map(([key, value]) => (
                  <Badge key={key} variant="secondary" className="flex items-center gap-1">
                    {key}: {value}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => handleRemoveTag(key)}
                    />
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" asChild>
              <Link to={isEditing ? `/zones/${id}` : "/zones"}>Cancel</Link>
            </Button>
            <Button type="submit">
              {isEditing ? 'Update Zone' : 'Create Zone'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default CreateZone;