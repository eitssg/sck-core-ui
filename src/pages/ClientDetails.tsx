import React, { useState, useEffect, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { 
  ArrowLeft, Edit, Save, X, Building2, Globe, Mail, User, MapPin, 
  Users, Briefcase, ExternalLink, Settings, Cloud, Shield, 
  Database, Network, Key, FileText, Calendar, CheckCircle2,
  AlertCircle, Info, Copy, Eye, EyeOff, RefreshCw, Activity, Zap,
  Search, Filter, Clock, XCircle, CheckCircle, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { 
  selectClientBySlug, 
  selectClientsLoading, 
  fetchClient, 
  patchClient,
} from "@/store/slices/clientsSlice";
import { selectPortfolios, fetchPortfolios } from "@/store/slices/portfoliosSlice";
import type { RootState, AppDispatch } from "@/store/store";
import type { Client } from "@/store/slices/clientsSlice";

interface EditableFieldProps {
  label: string;
  value: string | undefined;
  field: keyof Client;
  type?: 'text' | 'email' | 'url' | 'textarea';
  isEditing: boolean;
  onChange: (field: keyof Client, value: string) => void;
  icon?: React.ReactNode;
  placeholder?: string;
  required?: boolean;
}

const EditableField: React.FC<EditableFieldProps> = ({
  label, value, field, type = 'text', isEditing, onChange, icon, placeholder, required
}) => {
  if (isEditing) {
    return (
      <div className="space-y-2">
        <Label htmlFor={field} className="text-sm font-medium flex items-center gap-2">
          {icon}
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
        {type === 'textarea' ? (
          <Textarea
            id={field}
            value={value || ''}
            onChange={(e) => onChange(field, e.target.value)}
            placeholder={placeholder}
            className="min-h-20"
          />
        ) : (
          <Input
            id={field}
            type={type}
            value={value || ''}
            onChange={(e) => onChange(field, e.target.value)}
            placeholder={placeholder}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      {icon && <div className="mt-1 text-muted-foreground">{icon}</div>}
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-sm text-muted-foreground">
          {value || <span className="italic">Not set</span>}
        </p>
      </div>
    </div>
  );
};

interface SecretFieldProps {
  label: string;
  value: string | undefined;
  field: keyof Client;
  isEditing: boolean;
  onChange: (field: keyof Client, value: string) => void;
}

const SecretField: React.FC<SecretFieldProps> = ({ label, value, field, isEditing, onChange }) => {
  const [showSecret, setShowSecret] = useState(false);

  if (isEditing) {
    return (
      <div className="space-y-2">
        <Label htmlFor={field} className="text-sm font-medium flex items-center gap-2">
          <Key className="h-4 w-4" />
          {label}
        </Label>
        <div className="relative">
          <Input
            id={field}
            type={showSecret ? 'text' : 'password'}
            value={value || ''}
            onChange={(e) => onChange(field, e.target.value)}
            placeholder="Enter secret value"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2"
            onClick={() => setShowSecret(!showSecret)}
          >
            {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <Key className="h-4 w-4 mt-1 text-muted-foreground" />
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground font-mono">
            {value ? (showSecret ? value : '••••••••••••••••') : <span className="italic">Not set</span>}
          </p>
          {value && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSecret(!showSecret)}
            >
              {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

interface PortfolioStatus {
  id: string;
  status: 'active' | 'inactive' | 'deploying' | 'failed' | 'updating';
  version?: string;
  lastDeployment?: {
    status: 'success' | 'failed' | 'in-progress';
    timestamp: string;
    version?: string;
  };
  health?: 'healthy' | 'warning' | 'critical';
  uptime?: number;
}

const getPortfolioStatusBadge = (status: string) => {
  switch (status) {
    case 'active': return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
    case 'inactive': return <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" />Inactive</Badge>;
    case 'deploying': return <Badge variant="outline" className="bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1" />Deploying</Badge>;
    case 'updating': return <Badge variant="outline" className="bg-yellow-100 text-yellow-800"><RefreshCw className="w-3 h-3 mr-1" />Updating</Badge>;
    case 'failed': return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
};

const getHealthBadge = (health?: string) => {
  switch (health) {
    case 'healthy': return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Healthy</Badge>;
    case 'warning': return <Badge variant="outline" className="bg-yellow-100 text-yellow-800"><AlertTriangle className="w-3 h-3 mr-1" />Warning</Badge>;
    case 'critical': return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Critical</Badge>;
    default: return null;
  }
};

const getDeploymentStatusIcon = (status?: string) => {
  switch (status) {
    case 'success': return <CheckCircle className="w-4 h-4 text-green-600" />;
    case 'failed': return <XCircle className="w-4 h-4 text-red-600" />;
    case 'in-progress': return <Clock className="w-4 h-4 text-blue-600 animate-spin" />;
    default: return <Clock className="w-4 h-4 text-gray-400" />;
  }
};

const portfolioStatuses: Record<string, PortfolioStatus> = {
  // This would come from your real-time status API
  // For now, using empty object - replace with actual API call
};

export default function ClientDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  
  const client = useSelector((state: RootState) => 
    selectClientBySlug(state, id || '')
  );
  const portfolios = useSelector(selectPortfolios);
  const isLoading = useSelector(selectClientsLoading);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Client>>({});
  const [activeTab, setActiveTab] = useState('overview');
  const [isSaving, setIsSaving] = useState(false);
  const [portfolioSearch, setPortfolioSearch] = useState('');
  const [portfolioStatusFilter, setPortfolioStatusFilter] = useState<string>('all');
  const [portfolioSortBy, setPortfolioSortBy] = useState<'name' | 'status' | 'updated' | 'version'>('name');
  const [isRefreshingPortfolios, setIsRefreshingPortfolios] = useState(false);

  // Pagination state
  const [portfoliosPage, setPortfoliosPage] = useState(0);
  const [portfoliosPerPage] = useState(20); // Fixed page size
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Filter portfolios for this client
  const clientPortfolios = portfolios.filter(p => p.clientId === id);

  useEffect(() => {
    if (id && !client) {
      dispatch(fetchClient({ clientSlug: id }));
    }
  }, [id, client, dispatch]);

  useEffect(() => {
    if (client) {
      setEditData(client);
    }
  }, [client]);

  const handleEdit = () => {
    setIsEditing(true);
    setEditData(client || {});
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData(client || {});
  };

  const handleSave = async () => {
    if (!id || !editData) return;
    
    setIsSaving(true);
    try {
      await dispatch(patchClient({ 
        clientSlug: id, 
        clientData: editData 
      })).unwrap();
      
      setIsEditing(false);
      toast.success('Client updated successfully');
    } catch (error) {
      toast.error('Failed to update client: ' + (error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFieldChange = (field: keyof Client, value: string) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  // Enhanced filtered portfolios with pagination
  const { paginatedPortfolios, totalFiltered } = useMemo(() => {
    const filtered = clientPortfolios.filter(portfolio => {
      const matchesSearch = portfolio.name?.toLowerCase().includes(portfolioSearch.toLowerCase()) ||
                           portfolio.portfolio.toLowerCase().includes(portfolioSearch.toLowerCase()) ||
                           portfolio.description?.toLowerCase().includes(portfolioSearch.toLowerCase());
      
      if (portfolioStatusFilter === 'all') return matchesSearch;
      
      const status = portfolioStatuses[portfolio.id]?.status || portfolio.status;
      return matchesSearch && status === portfolioStatusFilter;
    });

    const sorted = filtered.sort((a, b) => {
      switch (portfolioSortBy) {
        case 'name': {
          // Use actual Portfolio fields: name from project or portfolio slug
          const nameA = a.project?.name || a.portfolio || '';
          const nameB = b.project?.name || b.portfolio || '';
          return nameA.localeCompare(nameB);
        }
        case 'status': {
          // Portfolio interface doesn't have status field - using mock data only
          const statusA = portfolioStatuses[a.id]?.status || 'inactive';
          const statusB = portfolioStatuses[b.id]?.status || 'inactive';
          return statusA.localeCompare(statusB);
        }
        case 'updated': {
          // Use actual Portfolio field: updated_at
          const timeA = portfolioStatuses[a.id]?.lastDeployment?.timestamp || a.updated_at || '';
          const timeB = portfolioStatuses[b.id]?.lastDeployment?.timestamp || b.updated_at || '';
          if (!timeA && !timeB) return 0;
          if (!timeA) return 1;
          if (!timeB) return -1;
          return new Date(timeB).getTime() - new Date(timeA).getTime();
        }
        case 'version': {
          // Portfolio interface doesn't have version - using mock data only
          const versionA = portfolioStatuses[a.id]?.version || '';
          const versionB = portfolioStatuses[b.id]?.version || '';
          return versionB.localeCompare(versionA);
        }
        default:
          return 0;
      }
    });

    const startIndex = portfoliosPage * portfoliosPerPage;
    const endIndex = startIndex + portfoliosPerPage;
    
    return {
      paginatedPortfolios: sorted.slice(startIndex, endIndex),
      totalFiltered: sorted.length
    };
  }, [clientPortfolios, portfolioSearch, portfolioStatusFilter, portfolioSortBy, portfolioStatuses, portfoliosPage, portfoliosPerPage]);

  const handleRefreshPortfolios = async () => {
    setIsRefreshingPortfolios(true);
    try {
      await dispatch(fetchPortfolios({ client: id, force: true }));
      setPortfoliosPage(0); // Reset to first page
      toast.success('Portfolio data refreshed');
    } catch (error) {
      toast.error('Failed to refresh portfolio data');
    } finally {
      setIsRefreshingPortfolios(false);
    }
  };

  const hasMorePortfolios = useSelector((state: RootState) => !!state.portfolios.cursor);

  const getStatusBadge = (status: string | undefined) => {
    switch (status) {
      case 'active': return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>;
      case 'inactive': return <Badge variant="secondary">Inactive</Badge>;
      case 'suspended': return <Badge variant="destructive">Suspended</Badge>;
      default: return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getClientTypeBadge = (type: string | undefined) => {
    switch (type) {
      case 'enterprise': return <Badge variant="default">Enterprise</Badge>;
      case 'startup': return <Badge variant="secondary">Startup</Badge>;
      case 'government': return <Badge variant="outline">Government</Badge>;
      default: return <Badge variant="outline">{type || 'Unknown'}</Badge>;
    }
  };

  if (isLoading && !client) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-muted rounded"></div>
          <div className="flex-1">
            <div className="w-64 h-8 bg-muted rounded mb-2"></div>
            <div className="w-96 h-4 bg-muted rounded"></div>
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="w-full h-96 bg-muted rounded"></div>
          </div>
          <div className="space-y-4">
            <div className="w-full h-48 bg-muted rounded"></div>
            <div className="w-full h-48 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Client Not Found</h3>
            <p className="text-muted-foreground mb-6">
              The requested client "{id}" could not be found.
            </p>
            <Button onClick={() => navigate('/clients')}>Return to Clients</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/clients">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-foreground">
              {client.client_name || client.client}
            </h1>
            {getStatusBadge(client.client_status)}
            {getClientTypeBadge(client.client_type)}
          </div>
          <p className="text-muted-foreground">
            {client.client_description || 'No description provided'}
          </p>
        </div>
        <div className="flex gap-2">
          {!isEditing ? (
            <>
              <Button variant="outline" asChild>
                <Link to={`/clients/${id}/portfolios`}>
                  <Briefcase className="mr-2 h-4 w-4" />
                  Portfolios ({clientPortfolios.length})
                </Link>
              </Button>
              <Button onClick={handleEdit}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Client
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleCancel}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="organization">Organization</TabsTrigger>
          <TabsTrigger value="aws-accounts">AWS Accounts</TabsTrigger>
          <TabsTrigger value="infrastructure">Infrastructure</TabsTrigger>
          <TabsTrigger value="oauth">OAuth & Security</TabsTrigger>
          <TabsTrigger value="portfolios">Portfolios</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <EditableField
                      label="Client Name"
                      value={editData.client_name}
                      field="client_name"
                      isEditing={isEditing}
                      onChange={handleFieldChange}
                      icon={<Building2 className="h-4 w-4" />}
                      placeholder="Enter client name"
                      required
                    />
                    
                    <div className="flex items-start gap-3">
                      <Building2 className="h-4 w-4 mt-1 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">Client ID</p>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-muted-foreground font-mono">{client.client}</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(client.client, 'Client ID')}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <EditableField
                    label="Description"
                    value={editData.client_description}
                    field="client_description"
                    type="textarea"
                    isEditing={isEditing}
                    onChange={handleFieldChange}
                    icon={<FileText className="h-4 w-4" />}
                    placeholder="Describe this client's purpose and business"
                  />

                  <Separator />

                  <div className="grid gap-6 md:grid-cols-2">
                    {isEditing ? (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-2">
                          <Settings className="h-4 w-4" />
                          Client Type
                        </Label>
                        <Select
                          value={editData.client_type || ''}
                          onValueChange={(value) => handleFieldChange('client_type', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select client type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="enterprise">Enterprise</SelectItem>
                            <SelectItem value="startup">Startup</SelectItem>
                            <SelectItem value="government">Government</SelectItem>
                            <SelectItem value="nonprofit">Non-profit</SelectItem>
                            <SelectItem value="individual">Individual</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3">
                        <Settings className="h-4 w-4 mt-1 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">Client Type</p>
                          <p className="text-sm text-muted-foreground">
                            {client.client_type || <span className="italic">Not set</span>}
                          </p>
                        </div>
                      </div>
                    )}

                    {isEditing ? (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          Status
                        </Label>
                        <Select
                          value={editData.client_status || ''}
                          onValueChange={(value) => handleFieldChange('client_status', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                            <SelectItem value="suspended">Suspended</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-4 w-4 mt-1 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">Status</p>
                          <div className="mt-1">
                            {getStatusBadge(client.client_status)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <EditableField
                    label="Domain"
                    value={editData.domain}
                    field="domain"
                    type="url"
                    isEditing={isEditing}
                    onChange={handleFieldChange}
                    icon={<Globe className="h-4 w-4" />}
                    placeholder="example.com"
                  />
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Portfolios</span>
                    </div>
                    <span className="font-semibold">{clientPortfolios.length}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Created</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {client.created_at ? new Date(client.created_at).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Last Updated</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {client.updated_at ? new Date(client.updated_at).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {client.domain && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      Website
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="w-full" asChild>
                      <a href={`https://${client.domain}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Visit {client.domain}
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Organization Tab */}
        <TabsContent value="organization">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Organization Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <EditableField
                  label="Organization ID"
                  value={editData.organization_id}
                  field="organization_id"
                  isEditing={isEditing}
                  onChange={handleFieldChange}
                  icon={<Building2 className="h-4 w-4" />}
                  placeholder="AWS Organization ID"
                />
                
                <EditableField
                  label="Organization Name"
                  value={editData.organization_name}
                  field="organization_name"
                  isEditing={isEditing}
                  onChange={handleFieldChange}
                  icon={<Building2 className="h-4 w-4" />}
                  placeholder="Organization display name"
                />
                
                <EditableField
                  label="Organization Account"
                  value={editData.organization_account}
                  field="organization_account"
                  isEditing={isEditing}
                  onChange={handleFieldChange}
                  icon={<User className="h-4 w-4" />}
                  placeholder="AWS Account ID"
                />
                
                <EditableField
                  label="Organization Email"
                  value={editData.organization_email}
                  field="organization_email"
                  type="email"
                  isEditing={isEditing}
                  onChange={handleFieldChange}
                  icon={<Mail className="h-4 w-4" />}
                  placeholder="contact@organization.com"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AWS Accounts Tab */}
        <TabsContent value="aws-accounts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cloud className="h-5 w-5" />
                AWS Account Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <EditableField
                  label="IAM Account"
                  value={editData.iam_account}
                  field="iam_account"
                  isEditing={isEditing}
                  onChange={handleFieldChange}
                  icon={<Shield className="h-4 w-4" />}
                  placeholder="AWS Account ID for IAM"
                />
                
                <EditableField
                  label="Audit Account"
                  value={editData.audit_account}
                  field="audit_account"
                  isEditing={isEditing}
                  onChange={handleFieldChange}
                  icon={<FileText className="h-4 w-4" />}
                  placeholder="AWS Account ID for auditing"
                />
                
                <EditableField
                  label="Automation Account"
                  value={editData.automation_account}
                  field="automation_account"
                  isEditing={isEditing}
                  onChange={handleFieldChange}
                  icon={<Settings className="h-4 w-4" />}
                  placeholder="AWS Account ID for automation"
                />
                
                <EditableField
                  label="Security Account"
                  value={editData.security_account}
                  field="security_account"
                  isEditing={isEditing}
                  onChange={handleFieldChange}
                  icon={<Shield className="h-4 w-4" />}
                  placeholder="AWS Account ID for security"
                />
                
                <EditableField
                  label="Network Account"
                  value={editData.network_account}
                  field="network_account"
                  isEditing={isEditing}
                  onChange={handleFieldChange}
                  icon={<Network className="h-4 w-4" />}
                  placeholder="AWS Account ID for networking"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Infrastructure Tab */}
        <TabsContent value="infrastructure">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Regional Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-3">
                  <EditableField
                    label="Master Region"
                    value={editData.master_region}
                    field="master_region"
                    isEditing={isEditing}
                    onChange={handleFieldChange}
                    icon={<MapPin className="h-4 w-4" />}
                    placeholder="us-east-1"
                  />
                  
                  <EditableField
                    label="Client Region"
                    value={editData.client_region}
                    field="client_region"
                    isEditing={isEditing}
                    onChange={handleFieldChange}
                    icon={<MapPin className="h-4 w-4" />}
                    placeholder="us-west-2"
                  />
                  
                  <EditableField
                    label="Bucket Region"
                    value={editData.bucket_region}
                    field="bucket_region"
                    isEditing={isEditing}
                    onChange={handleFieldChange}
                    icon={<MapPin className="h-4 w-4" />}
                    placeholder="us-east-1"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  S3 Bucket Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <EditableField
                    label="Main Bucket"
                    value={editData.bucket_name}
                    field="bucket_name"
                    isEditing={isEditing}
                    onChange={handleFieldChange}
                    icon={<Database className="h-4 w-4" />}
                    placeholder="client-main-bucket"
                  />
                  
                  <EditableField
                    label="Documentation Bucket"
                    value={editData.docs_bucket_name}
                    field="docs_bucket_name"
                    isEditing={isEditing}
                    onChange={handleFieldChange}
                    icon={<FileText className="h-4 w-4" />}
                    placeholder="client-docs-bucket"
                  />
                  
                  <EditableField
                    label="Artifacts Bucket"
                    value={editData.artefact_bucket_name}
                    field="artefact_bucket_name"
                    isEditing={isEditing}
                    onChange={handleFieldChange}
                    icon={<Database className="h-4 w-4" />}
                    placeholder="client-artifacts-bucket"
                  />
                  
                  <EditableField
                    label="UI Bucket"
                    value={editData.ui_bucket_name}
                    field="ui_bucket_name"
                    isEditing={isEditing}
                    onChange={handleFieldChange}
                    icon={<Globe className="h-4 w-4" />}
                    placeholder="client-ui-bucket"
                  />
                </div>

                <EditableField
                  label="Resource Scope"
                  value={editData.scope}
                  field="scope"
                  isEditing={isEditing}
                  onChange={handleFieldChange}
                  icon={<Settings className="h-4 w-4" />}
                  placeholder="Resource naming scope/prefix"
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* OAuth & Security Tab */}
        <TabsContent value="oauth">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                OAuth & Security Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <EditableField
                  label="OAuth Client ID"
                  value={editData.client_id}
                  field="client_id"
                  isEditing={isEditing}
                  onChange={handleFieldChange}
                  icon={<Key className="h-4 w-4" />}
                  placeholder="OAuth client identifier"
                />

                <SecretField
                  label="OAuth Client Secret"
                  value={editData.client_secret}
                  field="client_secret"
                  isEditing={isEditing}
                  onChange={handleFieldChange}
                />
              </div>

              {isEditing && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    OAuth Scopes
                  </Label>
                  <Textarea
                    value={Array.isArray(editData.client_scopes) ? editData.client_scopes.join('\n') : ''}
                    onChange={(e) => {
                      const scopes = e.target.value.split('\n').filter(Boolean);
                      setEditData(prev => ({ ...prev, client_scopes: scopes }));
                    }}
                    placeholder="Enter one scope per line&#10;read&#10;write&#10;admin"
                    className="min-h-24"
                  />
                  <p className="text-xs text-muted-foreground">Enter one scope per line</p>
                </div>
              )}

              {!isEditing && client.client_scopes && client.client_scopes.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    OAuth Scopes
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {client.client_scopes.map((scope, index) => (
                      <Badge key={index} variant="outline">{scope}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {isEditing && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Redirect URLs
                  </Label>
                  <Textarea
                    value={Array.isArray(editData.client_redirect_urls) ? editData.client_redirect_urls.join('\n') : ''}
                    onChange={(e) => {
                      const urls = e.target.value.split('\n').filter(Boolean);
                      setEditData(prev => ({ ...prev, client_redirect_urls: urls }));
                    }}
                    placeholder="Enter one URL per line&#10;https://app.example.com/callback&#10;https://localhost:3000/callback"
                    className="min-h-24"
                  />
                  <p className="text-xs text-muted-foreground">Enter one URL per line</p>
                </div>
              )}

              {!isEditing && client.client_redirect_urls && client.client_redirect_urls.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Redirect URLs
                  </p>
                  <div className="space-y-2">
                    {client.client_redirect_urls.map((url, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground font-mono">
                        <span>{url}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(url, 'Redirect URL')}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Portfolios Tab */}
        <TabsContent value="portfolios">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Client Portfolios ({paginatedPortfolios.length} of {clientPortfolios.length})
                </CardTitle>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRefreshPortfolios}
                  disabled={isRefreshingPortfolios}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshingPortfolios ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
              
              {/* Search and Filter Controls */}
              <div className="flex flex-col sm:flex-row gap-4 mt-4">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search portfolios by name, ID, or description..."
                    value={portfolioSearch}
                    onChange={(e) => setPortfolioSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Select value={portfolioStatusFilter} onValueChange={setPortfolioStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="deploying">Deploying</SelectItem>
                      <SelectItem value="updating">Updating</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={portfolioSortBy} onValueChange={(value: any) => setPortfolioSortBy(value)}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                      <SelectItem value="updated">Updated</SelectItem>
                      <SelectItem value="version">Version</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              {paginatedPortfolios.length > 0 ? (
                <>
                  <div className="space-y-3">
                    {paginatedPortfolios.map((portfolio) => {
                      const status = portfolioStatuses[portfolio.id];
                      const currentStatus = status?.status || portfolio.status || 'inactive';
                      
                      return (
                        <div 
                          key={portfolio.id} 
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors group"
                          onClick={() => navigate(`/portfolios/${portfolio.id}`)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-medium text-foreground truncate">
                                {portfolio.name || portfolio.portfolio}
                              </h4>
                              {getPortfolioStatusBadge(currentStatus)}
                              {status?.health && getHealthBadge(status.health)}
                            </div>
                            
                            <p className="text-sm text-muted-foreground truncate mb-2">
                              {portfolio.description || 'No description'}
                            </p>
                            
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="font-mono">ID: {portfolio.portfolio}</span>
                              {status?.version && (
                                <span className="flex items-center gap-1">
                                  <Zap className="w-3 h-3" />
                                  v{status.version}
                                </span>
                              )}
                              {status?.uptime && (
                                <span className="flex items-center gap-1">
                                  <Activity className="w-3 h-3" />
                                  {status.uptime}% uptime
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4 ml-4">
                            {/* Deployment Status */}
                            {status?.lastDeployment && (
                              <div className="text-center min-w-20">
                                <div className="flex items-center justify-center gap-1 mb-1">
                                  {getDeploymentStatusIcon(status.lastDeployment.status)}
                                  <span className="text-xs font-medium">
                                    {status.lastDeployment.status === 'in-progress' ? 'Deploying' : 
                                     status.lastDeployment.status === 'success' ? 'Deployed' : 
                                     status.lastDeployment.status === 'failed' ? 'Failed' : 'Unknown'}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(status.lastDeployment.timestamp).toLocaleDateString()}
                                </p>
                              </div>
                            )}
                            
                            {/* Last Updated */}
                            <div className="text-right min-w-20">
                              <p className="text-xs text-muted-foreground">Updated</p>
                              <p className="text-xs font-medium">
                                {portfolio.lastUpdated ? new Date(portfolio.lastUpdated).toLocaleDateString() : 'N/A'}
                              </p>
                            </div>
                            
                            <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Pagination Controls */}
                  <div className="flex items-center justify-between mt-6 pt-4 border-t">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>
                        Showing {portfoliosPage * portfoliosPerPage + 1} to {Math.min((portfoliosPage + 1) * portfoliosPerPage, totalFiltered)} of {totalFiltered} filtered portfolios
                      </span>
                      {clientPortfolios.length !== totalFiltered && (
                        <span>({clientPortfolios.length} total loaded)</span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPortfoliosPage(Math.max(0, portfoliosPage - 1))}
                        disabled={portfoliosPage === 0}
                      >
                        Previous
                      </Button>
                      
                      <span className="text-sm px-3">
                        Page {portfoliosPage + 1} of {Math.ceil(totalFiltered / portfoliosPerPage)}
                      </span>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPortfoliosPage(portfoliosPage + 1)}
                        disabled={(portfoliosPage + 1) * portfoliosPerPage >= totalFiltered}
                      >
                        Next
                      </Button>
                      
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  {clientPortfolios.length === 0 ? (
                    <>
                      <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Portfolios</h3>
                      <p className="text-muted-foreground mb-6">
                        This client doesn't have any portfolios yet.
                      </p>
                      <Button variant="outline" asChild>
                        <Link to="/portfolios/new">Create Portfolio</Link>
                      </Button>
                    </>
                  ) : (
                    <>
                      <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Results Found</h3>
                      <p className="text-muted-foreground mb-6">
                        No portfolios match your current search and filter criteria.
                      </p>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setPortfolioSearch('');
                          setPortfolioStatusFilter('all');
                        }}
                      >
                        Clear Filters
                      </Button>
                    </>
                  )}
                </div>
              )}
              
              {/* Quick Stats Summary */}
              {clientPortfolios.length > 0 && (
                <div className="mt-6 pt-4 border-t">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-green-600">
                        {clientPortfolios.filter(p => (portfolioStatuses[p.id]?.status || p.status) === 'active').length}
                      </p>
                      <p className="text-xs text-muted-foreground">Active</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-600">
                        {clientPortfolios.filter(p => (portfolioStatuses[p.id]?.status || p.status) === 'deploying').length}
                      </p>
                      <p className="text-xs text-muted-foreground">Deploying</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-red-600">
                        {clientPortfolios.filter(p => (portfolioStatuses[p.id]?.status || p.status) === 'failed').length}
                      </p>
                      <p className="text-xs text-muted-foreground">Failed</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-600">
                        {clientPortfolios.filter(p => (portfolioStatuses[p.id]?.status || p.status) === 'inactive').length}
                      </p>
                      <p className="text-xs text-muted-foreground">Inactive</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-purple-600">
                        {Object.values(portfolioStatuses).filter(s => s.health === 'healthy').length}
                      </p>
                      <p className="text-xs text-muted-foreground">Healthy</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
