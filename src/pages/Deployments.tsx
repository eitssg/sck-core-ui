import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Play, Square, Eye, Trash2, Search, GitBranch, Building2, Users, MapPin, ExternalLink, ChevronLeft, ChevronRight, X, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useReduxData } from '@/hooks/useReduxData';
import { useToast } from '@/hooks/use-toast';
import { useAppSelector, useAppDispatch } from '@/store';
import { setDeployments, setEvents } from '@/store/slices/deploymentsSlice';

// Mock data
const mockClients = [
  { id: 1, name: "Acme Corp", slug: "acme-corp" },
  { id: 2, name: "TechStart Inc", slug: "techstart-inc" },
  { id: 3, name: "Global Systems", slug: "global-systems" },
];

const mockDeployments = [
  {
    id: 1,
    prn: "prn:enterprise-suite:user-management:main:build-123",
    clientId: 1,
    portfolio: "Enterprise Suite",
    application: "User Management",
    description: "Centralized user administration system with role-based access control",
    branch: "main",
    build: "build-123",
    environment: "production",
    tag: "v2.1.3",
    region: "us-east-1",
    status: "released",
    lastActivity: "2 hours ago"
  },
  {
    id: 2,
    prn: "prn:enterprise-suite:analytics-dashboard:develop:build-456",
    clientId: 1,
    portfolio: "Enterprise Suite",
    application: "Analytics Dashboard",
    description: "Real-time business intelligence platform with advanced reporting",
    branch: "develop",
    build: "build-456",
    environment: "staging",
    tag: "v1.8.3-rc1",
    region: "us-west-2",
    status: "not-released",
    lastActivity: "1 day ago"
  },
  {
    id: 3,
    prn: "prn:mobile-apps:customer-portal:feature/auth:build-789",
    clientId: 2,
    portfolio: "Mobile Apps",
    application: "Customer Portal",
    description: "Mobile customer service application with enhanced authentication",
    branch: "feature/auth",
    build: "build-789",
    environment: "development",
    tag: "v0.9.2-alpha",
    region: "eu-west-1",
    status: "release-in-progress",
    lastActivity: "3 hours ago"
  },
  {
    id: 4,
    prn: "prn:analytics-platform:data-warehouse:hotfix/security:build-101",
    clientId: 1,
    portfolio: "Analytics Platform",
    application: "Data Warehouse",
    description: "Central data storage and processing system with security enhancements",
    branch: "hotfix/security",
    build: "build-101",
    environment: "production",
    tag: "v3.2.2",
    region: "us-east-1",
    status: "released",
    lastActivity: "30 minutes ago"
  },
  {
    id: 5,
    prn: "prn:enterprise-suite:payment-gateway:main:build-555",
    clientId: 1,
    portfolio: "Enterprise Suite",
    application: "Payment Gateway",
    description: "Secure payment processing service for e-commerce transactions",
    branch: "main",
    build: "build-555",
    environment: "production",
    tag: "v1.5.1",
    region: "us-east-1",
    status: "torndown",
    lastActivity: "2 days ago"
  },
  {
    id: 6,
    prn: "prn:mobile-apps:notification-service:develop:build-333",
    clientId: 2,
    portfolio: "Mobile Apps",
    application: "Notification Service",
    description: "Push notification system for mobile applications",
    branch: "develop",
    build: "build-333",
    environment: "staging",
    tag: "v2.0.0-beta",
    region: "us-west-2",
    status: "not-released",
    lastActivity: "4 hours ago"
  },
  {
    id: 7,
    prn: "prn:enterprise-suite:inventory-system:main:build-777",
    clientId: 1,
    portfolio: "Enterprise Suite",
    application: "Inventory System",
    description: "Real-time inventory management and tracking system",
    branch: "main",
    build: "build-777",
    environment: "production",
    tag: "v1.2.0",
    region: "us-east-1",
    status: "teardown-in-progress",
    lastActivity: "15 minutes ago"
  }
];

export default function Deployments() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { selectedClient } = useReduxData();
  const deployments = useAppSelector(state => state.deployments.deployments);
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTerms, setFilterTerms] = useState<string[]>([]);
  const [newFilterTerm, setNewFilterTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // Generate mock deployment data if not already loaded
  useEffect(() => {
    if (deployments.length === 0) {
      console.log('Generating 60 deployment records...');
      
      // Generate deployment data with specific status distribution
      const generateDeployments = () => {
        const mockDeployments = [];
        const mockEvents = [];
        const environments = ['production', 'staging', 'development'];
        const applications = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9', 'a10', 'a11', 'a12', 'a13', 'a14', 'a15', 'a16', 'a17', 'a18', 'a19', 'a20', 'a21', 'a22', 'a23', 'a24', 'a25', 'a26', 'a27', 'a28', 'a29', 'a30'];
        const usedApps = new Set();
        
        // Helper to generate realistic deployment dates over last 30 days
        const generateDeploymentDate = (index: number, total: number) => {
          const now = new Date();
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          
          // Create clustering around the 15th of the month
          const dayOfMonth = now.getDate();
          const fifteenthThisMonth = new Date(now.getFullYear(), now.getMonth(), 15);
          const fifteenthLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15);
          
          // 40% of deployments cluster around the 15th (±3 days)
          if (index < total * 0.4) {
            const clusterCenter = fifteenthThisMonth > now ? fifteenthLastMonth : fifteenthThisMonth;
            const variance = (Math.random() - 0.5) * 6 * 24 * 60 * 60 * 1000; // ±3 days
            return new Date(clusterCenter.getTime() + variance);
          }
          
          // Remaining 60% spread across the 30 days
          const timeRange = now.getTime() - thirtyDaysAgo.getTime();
          const randomTime = thirtyDaysAgo.getTime() + (Math.random() * timeRange);
          return new Date(randomTime);
        };
        
        // Helper to get client ID from application
        const getClientId = (appId: string) => {
          if (['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9', 'a10', 'a11', 'a12', 'a13', 'a14', 'a15', 'a16', 'a17', 'a18'].includes(appId)) return '1'; // Acme Corp
          if (['a19', 'a20', 'a21', 'a22', 'a23', 'a24', 'a25', 'a26'].includes(appId)) return '2'; // TechStart Inc  
          return '3'; // Global Systems
        };
        
        // Helper to get portfolio ID from application
        const getPortfolioId = (appId: string) => {
          if (['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8'].includes(appId)) return 'p1';
          if (['a9', 'a10', 'a11', 'a12', 'a13', 'a14'].includes(appId)) return 'p2';
          if (['a15', 'a16', 'a17', 'a18'].includes(appId)) return 'p3';
          if (['a19', 'a20', 'a21', 'a22', 'a23'].includes(appId)) return 'p4';
          if (['a24', 'a25', 'a26'].includes(appId)) return 'p5';
          return 'p6';
        };
        
        // Helper to create deployment
        const createDeployment = (index: number, status: string, appId: string | null = null) => {
          let applicationId = appId;
          if (!applicationId) {
            const availableApps = index <= 25 
              ? applications.filter(id => !usedApps.has(id))
              : applications;
            
            applicationId = availableApps.length > 0 
              ? availableApps[Math.floor(Math.random() * availableApps.length)]
              : applications[Math.floor(Math.random() * applications.length)];
          }
          
          if (index <= 25) usedApps.add(applicationId);
          
          const clientId = getClientId(applicationId);
          const portfolioId = getPortfolioId(applicationId);
          const environment = environments[Math.floor(Math.random() * environments.length)];
          const deploymentId = `dep-${index.toString().padStart(3, '0')}`;
          const deploymentDate = generateDeploymentDate(index, 60);
          
          return {
            id: deploymentId,
            prn: `prn:enterprise:${applicationId}:${environment}:build-${index}`,
            clientId,
            portfolioId,
            applicationId,
            description: `Deployment ${index} for application ${applicationId}`,
            branch: Math.random() > 0.7 ? 'develop' : 'main',
            build: `build-${index}`,
            environment,
            tag: `v${Math.floor(Math.random() * 3) + 1}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`,
            region: 'us-east-1',
            status,
            deployedAt: deploymentDate.toISOString(),
            deployedBy: `user${Math.floor(Math.random() * 10) + 1}@${clientId === '1' ? 'acme' : clientId === '2' ? 'techstart' : 'globalsystems'}.com`,
            lastActivity: new Date(deploymentDate.getTime() + Math.random() * 24 * 60 * 60 * 1000).toISOString()
          };
        };
        
        // Helper to create events for deployment
        const createEventsForDeployment = (deployment) => {
          const eventCount = Math.floor(Math.random() * 3) + 3;
          const deploymentEvents = [];
          
          for (let j = 1; j <= eventCount; j++) {
            const eventTypes = ['deploy', 'test', 'release', 'rollback', 'error'];
            let eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
            let status = 'success';
            let message = '';
            
            if (j === 1) {
              eventType = 'deploy';
              message = `Deployment initiated for ${deployment.applicationId} in ${deployment.environment}`;
              status = 'success';
            } else if (deployment.status === 'failed' && j === eventCount) {
              eventType = 'error';
              message = `Deployment failed: Build validation error in ${deployment.environment}`;
              status = 'failed';
            } else {
              switch (eventType) {
                case 'deploy':
                  message = `Building application ${deployment.applicationId}`;
                  break;
                case 'test':
                  message = `Integration tests completed for ${deployment.build}`;
                  break;
                case 'release':
                  message = `Preparing release ${deployment.tag}`;
                  status = deployment.status === 'release-in-progress' ? 'pending' : 'success';
                  break;
                case 'rollback':
                  message = `Rollback procedure initiated`;
                  break;
                case 'error':
                  message = `Warning: Minor issue detected during deployment`;
                  status = 'failed';
                  break;
              }
            }
            
            deploymentEvents.push({
              id: `${deployment.id}-evt-${j}`,
              deploymentId: deployment.id,
              type: eventType,
              message,
              timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
              status
            });
          }
          
          return deploymentEvents;
        };
        
        let deploymentIndex = 1;
        
        // First 25 deployments: 20 "released", 5 "not-released"
        for (let i = 0; i < 20; i++) {
          const deployment = createDeployment(deploymentIndex++, 'released');
          mockDeployments.push(deployment);
          mockEvents.push(...createEventsForDeployment(deployment));
        }
        
        for (let i = 0; i < 5; i++) {
          const deployment = createDeployment(deploymentIndex++, 'not-released');
          mockDeployments.push(deployment);
          mockEvents.push(...createEventsForDeployment(deployment));
        }
        
        // Next 20 deployments: all "not-released"
        for (let i = 0; i < 20; i++) {
          const deployment = createDeployment(deploymentIndex++, 'not-released');
          mockDeployments.push(deployment);
          mockEvents.push(...createEventsForDeployment(deployment));
        }
        
        // Next 5 deployments: "failed"
        for (let i = 0; i < 5; i++) {
          const deployment = createDeployment(deploymentIndex++, 'failed');
          mockDeployments.push(deployment);
          mockEvents.push(...createEventsForDeployment(deployment));
        }
        
        // Next 5 deployments: "teardown-in-progress"
        for (let i = 0; i < 5; i++) {
          const deployment = createDeployment(deploymentIndex++, 'teardown-in-progress');
          mockDeployments.push(deployment);
          mockEvents.push(...createEventsForDeployment(deployment));
        }
        
        // Final 5 deployments: "release-in-progress"
        for (let i = 0; i < 5; i++) {
          const deployment = createDeployment(deploymentIndex++, 'release-in-progress');
          mockDeployments.push(deployment);
          mockEvents.push(...createEventsForDeployment(deployment));
        }
        
        return { mockDeployments, mockEvents };
      };
      
      const { mockDeployments, mockEvents } = generateDeployments();
      console.log('Generated deployments:', mockDeployments.length, 'events:', mockEvents.length);
      
      // Dispatch to Redux store
      dispatch(setDeployments(mockDeployments));
      dispatch(setEvents(mockEvents));
      console.log('Dispatched deployments to Redux store');
    }
    setLastRefresh(new Date());
  }, [deployments.length, dispatch]);

  // Simulate API call to refresh deployment data
  const refreshDeployments = async () => {
    if (!selectedClient) return;
    
    setIsLoading(true);
    
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // In a real app, this would be an API call:
      // const response = await fetch(`/api/deployments?clientId=${selectedClient.id}`);
      // const data = await response.json();
      // dispatch(setDeployments(data.deployments));
      // dispatch(setEvents(data.events));
      
      // For now, we'll simulate some status changes in existing deployments
      const updatedDeployments = deployments.map(dep => {
        // Randomly update some deployment statuses to simulate changes
        if (Math.random() < 0.1) { // 10% chance of status change
          const statuses: ('released' | 'not-released' | 'release-in-progress' | 'teardown-in-progress' | 'failed')[] = 
            ['released', 'not-released', 'release-in-progress', 'teardown-in-progress', 'failed'];
          const newStatus = statuses[Math.floor(Math.random() * statuses.length)];
          return {
            ...dep,
            status: newStatus,
            lastActivity: new Date().toISOString()
          };
        }
        return dep;
      });
      
      dispatch(setDeployments(updatedDeployments));
      setLastRefresh(new Date());
      
      toast({
        title: "Deployments refreshed",
        description: "Latest deployment status has been loaded from server.",
      });
      
    } catch (error) {
      console.error('Failed to refresh deployments:', error);
      toast({
        title: "Refresh failed",
        description: "Could not fetch latest deployment data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-refresh functionality
  useEffect(() => {
    if (autoRefresh && selectedClient) {
      const interval = setInterval(() => {
        refreshDeployments();
      }, 30000); // Refresh every 30 seconds
      
      setAutoRefreshInterval(interval);
      
      return () => {
        if (interval) clearInterval(interval);
      };
    } else if (autoRefreshInterval) {
      clearInterval(autoRefreshInterval);
      setAutoRefreshInterval(null);
    }
  }, [autoRefresh, selectedClient]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
      }
    };
  }, [autoRefreshInterval]);

  // Initialize filters from URL parameters
  useEffect(() => {
    const applicationFilter = searchParams.get('application');
    if (applicationFilter) {
      setFilterTerms([applicationFilter]);
    }
  }, [searchParams]);

  // Filter deployments by selected client and convert format
  const clientDeployments = selectedClient 
    ? deployments.filter(deployment => deployment.clientId === selectedClient.id).map((dep, index) => ({
        id: parseInt(dep.id.replace('dep-', '')),
        prn: dep.prn,
        clientId: parseInt(dep.clientId),
        portfolio: dep.portfolioId,
        application: dep.applicationId,
        description: dep.description,
        branch: dep.branch,
        build: dep.build,
        environment: dep.environment,
        tag: dep.tag,
        region: dep.region,
        status: dep.status,
        lastActivity: dep.lastActivity
      }))
    : [];

  // Apply search and filter terms
  const filteredDeployments = clientDeployments.filter(deployment => {
    const matchesSearch = searchTerm === "" || 
      deployment.prn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deployment.application.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deployment.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deployment.environment.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deployment.portfolio.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilters = filterTerms.length === 0 || filterTerms.every(term =>
      deployment.portfolio.toLowerCase().includes(term.toLowerCase()) ||
      deployment.application.toLowerCase().includes(term.toLowerCase()) ||
      deployment.environment.toLowerCase().includes(term.toLowerCase()) ||
      deployment.prn.toLowerCase().includes(term.toLowerCase()) ||
      deployment.description.toLowerCase().includes(term.toLowerCase())
    );
    
    return matchesSearch && matchesFilters;
  });

  // Pagination calculations
  const totalItems = filteredDeployments.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDeployments = filteredDeployments.slice(startIndex, endIndex);

  // Reset to first page when client or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedClient, searchTerm, filterTerms]);

  // TODO: Replace with actual API call when filter terms change
  useEffect(() => {
    if (selectedClient && (searchTerm || filterTerms.length > 0)) {
      // Future API call structure:
      // fetchDeployments({
      //   clientId: selectedClient.id,
      //   searchTerm,
      //   filterTerms,
      //   page: currentPage,
      //   limit: itemsPerPage
      // });
      console.log('API call would be made with:', {
        clientId: selectedClient.id,
        searchTerm,
        filterTerms,
        page: currentPage,
        limit: itemsPerPage
      });
    }
  }, [selectedClient, searchTerm, filterTerms, currentPage, itemsPerPage]);

  const addFilterTerm = () => {
    if (newFilterTerm.trim() && !filterTerms.includes(newFilterTerm.trim())) {
      setFilterTerms([...filterTerms, newFilterTerm.trim()]);
      setNewFilterTerm("");
    }
  };

  const removeFilterTerm = (termToRemove: string) => {
    setFilterTerms(filterTerms.filter(term => term !== termToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addFilterTerm();
    }
  };

  const getDeletePromptMessage = (status: string) => {
    switch (status) {
      case "released":
        return "Tearing down a released deployment will mean the application is no longer available to consumers. Is this what you really wish to do?";
      case "not-released":
        return "Are you sure?";
      case "release-in-progress":
        return "Cannot teardown a deployment when release is in progress";
      case "teardown-in-progress":
        return "The deployment is already in process of teardown. Is something wrong? Shall we try again?";
      default:
        return "Are you sure you want to delete this deployment?";
    }
  };

  const canDelete = (status: string) => {
    return status !== "release-in-progress";
  };

  const handleDeleteDeployment = (deployment: any) => {
    if (deployment.status === "release-in-progress") {
      toast({
        title: "Cannot delete deployment",
        description: getDeletePromptMessage(deployment.status),
        variant: "destructive",
      });
      return;
    }

    // For deletable deployments, this would be handled by the AlertDialog
    toast({
      title: "Deployment deleted",
      description: `${deployment.application} deployment has been torn down successfully.`,
    });
  };

  const getStatusIcon = (status: string) => {
    return status === "released" ? 
      <Play className="h-4 w-4 text-green-600" /> : 
      <Square className="h-4 w-4 text-gray-400" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "released":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "not-released":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "release-in-progress":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "teardown-in-progress":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const getEnvironmentColor = (environment: string) => {
    switch (environment) {
      case "production":
        return "bg-red-100 text-red-800";
      case "staging":
        return "bg-yellow-100 text-yellow-800";
      case "development":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (!selectedClient) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-medium text-foreground">No Client Selected</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Please select a client from the header to view deployments.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
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

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Deployments</h1>
          <p className="text-muted-foreground">
            Manage application deployments for {selectedClient.name}
            {lastRefresh && (
              <span className="ml-2 text-xs">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Auto-refresh toggle */}
          <div className="flex items-center gap-2 text-sm">
            <label className="text-muted-foreground">Auto-refresh:</label>
            <Button
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="text-xs"
            >
              {autoRefresh ? "ON" : "OFF"}
            </Button>
            {autoRefresh && (
              <span className="text-xs text-muted-foreground">(30s)</span>
            )}
          </div>
          
          {/* Manual refresh button */}
          <Button
            onClick={refreshDeployments}
            disabled={isLoading}
            variant="outline"
            className="gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {isLoading ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Search and Filter Terms */}
      <Card className="shadow-soft">
        <CardContent className="p-4">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search deployments, applications, or PRNs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex gap-2">
                <Input
                  placeholder="Add filter term (portfolio, app, environment)..."
                  value={newFilterTerm}
                  onChange={(e) => setNewFilterTerm(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1"
                />
                <Button onClick={addFilterTerm} disabled={!newFilterTerm.trim()}>
                  Add Filter
                </Button>
              </div>
            </div>
            
            {filterTerms.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-muted-foreground self-center">Active Filters:</span>
                {filterTerms.map((term) => (
                  <Badge key={term} variant="secondary" className="flex items-center gap-1 px-3 py-1">
                    {term}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => removeFilterTerm(term)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilterTerms([])}
                  className="text-muted-foreground"
                >
                  Clear all filters
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Deployments Table */}
      <Card className="shadow-medium">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-primary" />
              <span>Deployments ({totalItems})</span>
            </div>
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
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Application</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>PRN</TableHead>
                <TableHead>Environment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedDeployments.map((deployment) => (
                <TableRow 
                  key={deployment.id} 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => navigate(`/deployments/${deployment.id}`)}
                >
                  <TableCell>
                    <div>
                      <p className="font-medium">{deployment.application}</p>
                      <p className="text-sm text-muted-foreground">{deployment.portfolio}</p>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <p className="truncate">{deployment.description}</p>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded block">
                      {deployment.prn}
                    </code>
                  </TableCell>
                  <TableCell>
                    <Badge className={getEnvironmentColor(deployment.environment)} variant="secondary">
                      {deployment.environment}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(deployment.status)}
                      <Badge className={getStatusColor(deployment.status)} variant="secondary">
                         {deployment.status === "released" ? "Released" : 
                         deployment.status === "not-released" ? "Not Released" :
                         deployment.status === "release-in-progress" ? "Release in Progress" :
                         deployment.status === "teardown-in-progress" ? "Teardown in Progress" :
                         deployment.status === "failed" ? "Failed" :
                         deployment.status}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>{deployment.lastActivity}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/deployments/${deployment.id}`);
                        }}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      {deployment.status === "not-released" ? (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-green-600 hover:text-green-700"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Play className="h-3 w-3" />
                        </Button>
                      ) : (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-yellow-600 hover:text-yellow-700"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Square className="h-3 w-3" />
                        </Button>
                      )}
                      
                      {canDelete(deployment.status) ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-destructive hover:text-destructive"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Deployment</AlertDialogTitle>
                              <AlertDialogDescription>
                                {getDeletePromptMessage(deployment.status)}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={(e) => e.stopPropagation()}>
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteDeployment(deployment);
                                }}
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                {deployment.status === "released" ? "Tear Down" : 
                                 deployment.status === "teardown-in-progress" ? "Try Again" : "Delete"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-gray-400 cursor-not-allowed"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDeployment(deployment);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {paginatedDeployments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No deployments found for the selected filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} deployments
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNumber;
                    if (totalPages <= 5) {
                      pageNumber = i + 1;
                    } else if (currentPage <= 3) {
                      pageNumber = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNumber = totalPages - 4 + i;
                    } else {
                      pageNumber = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNumber}
                        variant={currentPage === pageNumber ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNumber)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNumber}
                      </Button>
                    );
                  })}
                  {totalPages > 5 && currentPage < totalPages - 2 && (
                    <>
                      <span className="text-muted-foreground">...</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(totalPages)}
                        className="w-8 h-8 p-0"
                      >
                        {totalPages}
                      </Button>
                    </>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}