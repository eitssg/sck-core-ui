import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { 
  Home, 
  User, 
  Briefcase, 
  Plus, 
  Settings, 
  LogOut, 
  Menu,
  X,
  ChevronDown,
  FolderOpen,
  List,
  Building2,
  GitBranch,
  Cloud
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useReduxData } from "@/hooks/useReduxData";
import { useAppDispatch, useAppSelector } from '@/store';
import { setDeployments, setEvents } from '@/store/slices/deploymentsSlice';

// Mock data - will be replaced with real data later
const mockPortfolios = [
  { id: 1, name: "Enterprise Suite", code: "ENT" },
  { id: 2, name: "Mobile Apps", code: "MOB" },
  { id: 3, name: "Analytics Platform", code: "ANL" },
];

export default function DashboardLayout() {
  const [currentPortfolio, setCurrentPortfolio] = useState(mockPortfolios[0]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const deployments = useAppSelector(state => state.deployments.deployments);
  const { clients, selectedClient, defaultClient, initializeClients, selectClient, initializePortfolios, initializeApplications, initializeZones } = useReduxData();

  // Initialize all store data with realistic aligned mock data
  useEffect(() => {
    console.log('DashboardLayout useEffect triggered, clients.length:', clients.length);
    console.log('Current deployments in store:', deployments.length);
    
    if (clients.length === 0 || deployments.length === 0) {
      // Initialize clients
      const mockClients = [
        {
          id: '1',
          name: 'Acme Corp',
          description: 'Main enterprise client with comprehensive applications',
          homepage: 'https://acme.com',
          contactName: 'John Doe',
          contactEmail: 'john@acme.com',
          primaryAwsRegion: 'us-east-1',
          memberCount: 50,
          portfolioCount: 3,
        },
        {
          id: '2',
          name: 'TechStart Inc',
          description: 'Innovative startup focused on mobile solutions',
          homepage: 'https://techstart.com',
          contactName: 'Jane Smith',
          contactEmail: 'jane@techstart.com',
          primaryAwsRegion: 'us-west-2',
          memberCount: 25,
          portfolioCount: 2,
        },
        {
          id: '3',
          name: 'Global Systems',
          description: 'International corporation with distributed infrastructure',
          homepage: 'https://globalsystems.com',
          contactName: 'Bob Johnson',
          contactEmail: 'bob@globalsystems.com',
          primaryAwsRegion: 'eu-west-1',
          memberCount: 150,
          portfolioCount: 5,
        }
      ];
      
      initializeClients(mockClients);
      
      // Initialize portfolios aligned with client portfolio counts
      const mockPortfolios = [
        // Acme Corp portfolios (3 total)
        { id: 'p1', clientId: '1', name: 'Enterprise Core', slug: 'enterprise-core', code: 'ENT', description: 'Core business applications', homePageUrl: 'https://acme.com/enterprise', applicationCount: 8, lastUpdated: '2024-01-25', status: 'active' },
        { id: 'p2', clientId: '1', name: 'Customer Portal', slug: 'customer-portal', code: 'CUS', description: 'Customer-facing applications', homePageUrl: 'https://acme.com/portal', applicationCount: 6, lastUpdated: '2024-01-24', status: 'active' },
        { id: 'p3', clientId: '1', name: 'Analytics Suite', slug: 'analytics-suite', code: 'ANA', description: 'Data and analytics platform', homePageUrl: 'https://acme.com/analytics', applicationCount: 4, lastUpdated: '2024-01-23', status: 'active' },
        
        // TechStart Inc portfolios (2 total)
        { id: 'p4', clientId: '2', name: 'Mobile Platform', slug: 'mobile-platform', code: 'MOB', description: 'Mobile application ecosystem', homePageUrl: 'https://techstart.com/mobile', applicationCount: 5, lastUpdated: '2024-01-26', status: 'active' },
        { id: 'p5', clientId: '2', name: 'Backend Services', slug: 'backend-services', code: 'BKD', description: 'API and backend infrastructure', homePageUrl: 'https://techstart.com/backend', applicationCount: 3, lastUpdated: '2024-01-25', status: 'active' },
        
        // Global Systems portfolios (5 total)
        { id: 'p6', clientId: '3', name: 'ERP Systems', slug: 'erp-systems', code: 'ERP', description: 'Enterprise resource planning', homePageUrl: 'https://globalsystems.com/erp', applicationCount: 12, lastUpdated: '2024-01-26', status: 'active' },
        { id: 'p7', clientId: '3', name: 'Manufacturing', slug: 'manufacturing', code: 'MFG', description: 'Manufacturing control systems', homePageUrl: 'https://globalsystems.com/mfg', applicationCount: 8, lastUpdated: '2024-01-25', status: 'active' },
        { id: 'p8', clientId: '3', name: 'Supply Chain', slug: 'supply-chain', code: 'SCM', description: 'Supply chain management', homePageUrl: 'https://globalsystems.com/scm', applicationCount: 6, lastUpdated: '2024-01-24', status: 'active' },
        { id: 'p9', clientId: '3', name: 'HR Platform', slug: 'hr-platform', code: 'HRP', description: 'Human resources platform', homePageUrl: 'https://globalsystems.com/hr', applicationCount: 4, lastUpdated: '2024-01-23', status: 'active' },
        { id: 'p10', clientId: '3', name: 'Financial Systems', slug: 'financial-systems', code: 'FIN', description: 'Financial and accounting systems', homePageUrl: 'https://globalsystems.com/finance', applicationCount: 7, lastUpdated: '2024-01-22', status: 'active' },
      ];
      
      initializePortfolios(mockPortfolios);
      
      // Initialize applications aligned with portfolio counts
      const mockApplications = [
        // Acme Corp applications (18 total: 8+6+4) - Portfolio p1, p2, p3
        { id: 'a1', clientPortfolio: 'p1', appRegex: '^user-mgmt.*$', name: 'User Management API', environment: 'Production', account: 'acme-prod', zone: 'z1', imageAliases: { 'latest': '2.1.3' }, repository: 'repo/user-mgmt-api', region: 'us-east-1', tags: { team: 'backend' }, enforceValidation: 'true', metadata: {}, slug: 'user-mgmt-api', code: 'UMA', description: 'Core user management service', portfolioId: 'p1', status: 'running' as const, version: '2.1.3', lastDeploy: '2024-01-25' },
        { id: 'a2', clientPortfolio: 'p1', appRegex: '^order.*$', name: 'Order Processing', environment: 'Production', account: 'acme-prod', zone: 'z1', imageAliases: { 'latest': '1.8.2' }, repository: 'repo/order-processing', region: 'us-east-1', tags: { team: 'backend' }, enforceValidation: 'true', metadata: {}, slug: 'order-processing', code: 'ORP', description: 'Order processing service', portfolioId: 'p1', status: 'running' as const, version: '1.8.2', lastDeploy: '2024-01-24' },
        { id: 'a3', clientPortfolio: 'p1', appRegex: '^inventory.*$', name: 'Inventory Service', environment: 'Production', account: 'acme-prod', zone: 'z2', imageAliases: { 'latest': '1.5.1' }, repository: 'repo/inventory-service', region: 'us-west-2', tags: { team: 'inventory' }, enforceValidation: 'true', metadata: {}, slug: 'inventory-service', code: 'INV', description: 'Inventory management service', portfolioId: 'p1', status: 'deploying' as const, version: '1.5.1', lastDeploy: '2024-01-26' },
        { id: 'a4', clientPortfolio: 'p1', appRegex: '^payment.*$', name: 'Payment Gateway', environment: 'Production', account: 'acme-prod', zone: 'z1', imageAliases: { 'latest': '3.2.1' }, repository: 'repo/payment-gateway', region: 'us-east-1', tags: { team: 'payments' }, enforceValidation: 'true', metadata: {}, slug: 'payment-gateway', code: 'PAY', description: 'Payment processing gateway', portfolioId: 'p1', status: 'running' as const, version: '3.2.1', lastDeploy: '2024-01-23' },
        { id: 'a5', clientPortfolio: 'p1', appRegex: '^notification.*$', name: 'Notification Service', environment: 'Staging', account: 'acme-staging', zone: 'z3', imageAliases: { 'latest': '1.3.4' }, repository: 'repo/notification-service', region: 'us-east-1', tags: { team: 'platform' }, enforceValidation: 'true', metadata: {}, slug: 'notification-service', code: 'NOT', description: 'Notification delivery service', portfolioId: 'p1', status: 'error' as const, version: '1.3.4', lastDeploy: '2024-01-22' },
        { id: 'a6', clientPortfolio: 'p1', appRegex: '^audit.*$', name: 'Audit Logger', environment: 'Production', account: 'acme-prod', zone: 'z1', imageAliases: { 'latest': '2.0.1' }, repository: 'repo/audit-logger', region: 'us-east-1', tags: { team: 'security' }, enforceValidation: 'true', metadata: {}, slug: 'audit-logger', code: 'AUD', description: 'System audit logging', portfolioId: 'p1', status: 'running' as const, version: '2.0.1', lastDeploy: '2024-01-25' },
        { id: 'a7', clientPortfolio: 'p1', appRegex: '^config.*$', name: 'Configuration Manager', environment: 'Production', account: 'acme-prod', zone: 'z2', imageAliases: { 'latest': '1.7.3' }, repository: 'repo/config-manager', region: 'us-west-2', tags: { team: 'platform' }, enforceValidation: 'true', metadata: {}, slug: 'config-manager', code: 'CFG', description: 'Application configuration management', portfolioId: 'p1', status: 'running' as const, version: '1.7.3', lastDeploy: '2024-01-24' },
        { id: 'a8', clientPortfolio: 'p1', appRegex: '^health.*$', name: 'Health Monitor', environment: 'Production', account: 'acme-prod', zone: 'z1', imageAliases: { 'latest': '2.3.2' }, repository: 'repo/health-monitor', region: 'us-east-1', tags: { team: 'ops' }, enforceValidation: 'true', metadata: {}, slug: 'health-monitor', code: 'HLT', description: 'System health monitoring', portfolioId: 'p1', status: 'running' as const, version: '2.3.2', lastDeploy: '2024-01-26' },

        { id: 'a9', clientPortfolio: 'p2', appRegex: '^customer-portal.*$', name: 'Customer Portal Web', environment: 'Production', account: 'acme-prod', zone: 'z1', imageAliases: { 'latest': '4.1.2' }, repository: 'repo/customer-portal-web', region: 'us-east-1', tags: { team: 'frontend' }, enforceValidation: 'true', metadata: {}, slug: 'customer-portal-web', code: 'CPW', description: 'Customer web portal', portfolioId: 'p2', status: 'running' as const, version: '4.1.2', lastDeploy: '2024-01-25' },
        { id: 'a10', clientPortfolio: 'p2', appRegex: '^customer-mobile.*$', name: 'Customer Mobile App', environment: 'Production', account: 'acme-prod', zone: 'z2', imageAliases: { 'latest': '3.8.1' }, repository: 'repo/customer-mobile-app', region: 'us-west-2', tags: { team: 'mobile' }, enforceValidation: 'true', metadata: {}, slug: 'customer-mobile-app', code: 'CMA', description: 'Customer mobile application', portfolioId: 'p2', status: 'running' as const, version: '3.8.1', lastDeploy: '2024-01-24' },
        { id: 'a11', clientPortfolio: 'p2', appRegex: '^customer-api.*$', name: 'Customer API Gateway', environment: 'Production', account: 'acme-prod', zone: 'z1', imageAliases: { 'latest': '2.5.3' }, repository: 'repo/customer-api-gateway', region: 'us-east-1', tags: { team: 'api' }, enforceValidation: 'true', metadata: {}, slug: 'customer-api-gateway', code: 'CAG', description: 'Customer API gateway', portfolioId: 'p2', status: 'running' as const, version: '2.5.3', lastDeploy: '2024-01-23' },
        { id: 'a12', clientPortfolio: 'p2', appRegex: '^support.*$', name: 'Support Portal', environment: 'Staging', account: 'acme-staging', zone: 'z3', imageAliases: { 'latest': '1.9.4' }, repository: 'repo/support-portal', region: 'us-east-1', tags: { team: 'support' }, enforceValidation: 'true', metadata: {}, slug: 'support-portal', code: 'SUP', description: 'Customer support portal', portfolioId: 'p2', status: 'stopped' as const, version: '1.9.4', lastDeploy: '2024-01-22' },
        { id: 'a13', clientPortfolio: 'p2', appRegex: '^feedback.*$', name: 'Feedback System', environment: 'Production', account: 'acme-prod', zone: 'z2', imageAliases: { 'latest': '1.4.2' }, repository: 'repo/feedback-system', region: 'us-west-2', tags: { team: 'product' }, enforceValidation: 'true', metadata: {}, slug: 'feedback-system', code: 'FBK', description: 'Customer feedback system', portfolioId: 'p2', status: 'running' as const, version: '1.4.2', lastDeploy: '2024-01-26' },
        { id: 'a14', clientPortfolio: 'p2', appRegex: '^chat.*$', name: 'Chat Service', environment: 'Production', account: 'acme-prod', zone: 'z1', imageAliases: { 'latest': '2.1.1' }, repository: 'repo/chat-service', region: 'us-east-1', tags: { team: 'support' }, enforceValidation: 'true', metadata: {}, slug: 'chat-service', code: 'CHT', description: 'Customer chat service', portfolioId: 'p2', status: 'running' as const, version: '2.1.1', lastDeploy: '2024-01-25' },

        { id: 'a15', clientPortfolio: 'p3', appRegex: '^data-pipeline.*$', name: 'Data Pipeline', environment: 'Production', account: 'acme-prod', zone: 'z1', imageAliases: { 'latest': '3.4.2' }, repository: 'repo/data-pipeline', region: 'us-east-1', tags: { team: 'data' }, enforceValidation: 'true', metadata: {}, slug: 'data-pipeline', code: 'DPL', description: 'Data processing pipeline', portfolioId: 'p3', status: 'running' as const, version: '3.4.2', lastDeploy: '2024-01-24' },
        { id: 'a16', clientPortfolio: 'p3', appRegex: '^analytics.*$', name: 'Analytics Dashboard', environment: 'Production', account: 'acme-prod', zone: 'z2', imageAliases: { 'latest': '2.7.1' }, repository: 'repo/analytics-dashboard', region: 'us-west-2', tags: { team: 'analytics' }, enforceValidation: 'true', metadata: {}, slug: 'analytics-dashboard', code: 'ADB', description: 'Analytics dashboard frontend', portfolioId: 'p3', status: 'running' as const, version: '2.7.1', lastDeploy: '2024-01-23' },
        { id: 'a17', clientPortfolio: 'p3', appRegex: '^reporting.*$', name: 'Reporting Engine', environment: 'Production', account: 'acme-prod', zone: 'z1', imageAliases: { 'latest': '1.8.3' }, repository: 'repo/reporting-engine', region: 'us-east-1', tags: { team: 'reporting' }, enforceValidation: 'true', metadata: {}, slug: 'reporting-engine', code: 'RPT', description: 'Report generation engine', portfolioId: 'p3', status: 'running' as const, version: '1.8.3', lastDeploy: '2024-01-22' },
        { id: 'a18', clientPortfolio: 'p3', appRegex: '^ml-model.*$', name: 'ML Model Service', environment: 'Development', account: 'acme-dev', zone: 'z4', imageAliases: { 'latest': '0.9.2' }, repository: 'repo/ml-model-service', region: 'us-east-1', tags: { team: 'ml' }, enforceValidation: 'true', metadata: {}, slug: 'ml-model-service', code: 'MLS', description: 'Machine learning model service', portfolioId: 'p3', status: 'deploying' as const, version: '0.9.2', lastDeploy: '2024-01-26' },

        // TechStart Inc applications (8 total: 5+3) - Portfolio p4, p5
        { id: 'a19', clientPortfolio: 'p4', appRegex: '^ios.*$', name: 'iOS App', environment: 'Production', account: 'techstart-prod', zone: 'z5', imageAliases: { 'latest': '2.4.1' }, repository: 'repo/ios-app', region: 'us-west-2', tags: { team: 'mobile', platform: 'ios' }, enforceValidation: 'true', metadata: {}, slug: 'ios-app', code: 'IOS', description: 'iOS mobile application', portfolioId: 'p4', status: 'running' as const, version: '2.4.1', lastDeploy: '2024-01-25' },
        { id: 'a20', clientPortfolio: 'p4', appRegex: '^android.*$', name: 'Android App', environment: 'Production', account: 'techstart-prod', zone: 'z5', imageAliases: { 'latest': '2.4.0' }, repository: 'repo/android-app', region: 'us-west-2', tags: { team: 'mobile', platform: 'android' }, enforceValidation: 'true', metadata: {}, slug: 'android-app', code: 'AND', description: 'Android mobile application', portfolioId: 'p4', status: 'running' as const, version: '2.4.0', lastDeploy: '2024-01-25' },
        { id: 'a21', clientPortfolio: 'p4', appRegex: '^pwa.*$', name: 'PWA Frontend', environment: 'Staging', account: 'techstart-staging', zone: 'z6', imageAliases: { 'latest': '1.3.2' }, repository: 'repo/pwa-frontend', region: 'us-west-2', tags: { team: 'frontend' }, enforceValidation: 'true', metadata: {}, slug: 'pwa-frontend', code: 'PWA', description: 'Progressive web app frontend', portfolioId: 'p4', status: 'running' as const, version: '1.3.2', lastDeploy: '2024-01-24' },
        { id: 'a22', clientPortfolio: 'p4', appRegex: '^push.*$', name: 'Push Notification Service', environment: 'Production', account: 'techstart-prod', zone: 'z5', imageAliases: { 'latest': '1.2.1' }, repository: 'repo/push-notification', region: 'us-west-2', tags: { team: 'platform' }, enforceValidation: 'true', metadata: {}, slug: 'push-notification', code: 'PNS', description: 'Push notification service', portfolioId: 'p4', status: 'running' as const, version: '1.2.1', lastDeploy: '2024-01-23' },
        { id: 'a23', clientPortfolio: 'p4', appRegex: '^mobile-analytics.*$', name: 'Mobile Analytics', environment: 'Development', account: 'techstart-dev', zone: 'z7', imageAliases: { 'latest': '1.1.4' }, repository: 'repo/mobile-analytics', region: 'us-west-2', tags: { team: 'analytics' }, enforceValidation: 'true', metadata: {}, slug: 'mobile-analytics', code: 'MAN', description: 'Mobile app analytics', portfolioId: 'p4', status: 'running' as const, version: '1.1.4', lastDeploy: '2024-01-22' },

        { id: 'a24', clientPortfolio: 'p5', appRegex: '^core-api.*$', name: 'Core API', environment: 'Production', account: 'techstart-prod', zone: 'z5', imageAliases: { 'latest': '3.1.2' }, repository: 'repo/core-api', region: 'us-west-2', tags: { team: 'backend' }, enforceValidation: 'true', metadata: {}, slug: 'core-api', code: 'API', description: 'Core backend API', portfolioId: 'p5', status: 'running' as const, version: '3.1.2', lastDeploy: '2024-01-26' },
        { id: 'a25', clientPortfolio: 'p5', appRegex: '^auth.*$', name: 'Authentication Service', environment: 'Staging', account: 'techstart-staging', zone: 'z6', imageAliases: { 'latest': '2.3.1' }, repository: 'repo/auth-service', region: 'us-west-2', tags: { team: 'security' }, enforceValidation: 'true', metadata: {}, slug: 'auth-service', code: 'AUTH', description: 'Authentication service', portfolioId: 'p5', status: 'running' as const, version: '2.3.1', lastDeploy: '2024-01-25' },
        { id: 'a26', clientPortfolio: 'p5', appRegex: '^data-sync.*$', name: 'Data Sync Service', environment: 'Development', account: 'techstart-dev', zone: 'z7', imageAliases: { 'latest': '1.5.3' }, repository: 'repo/data-sync', region: 'us-west-2', tags: { team: 'data' }, enforceValidation: 'true', metadata: {}, slug: 'data-sync', code: 'DSS', description: 'Data synchronization service', portfolioId: 'p5', status: 'error' as const, version: '1.5.3', lastDeploy: '2024-01-24' },

        // Global Systems applications (sample - keeping list shorter for readability)
        { id: 'a27', clientPortfolio: 'p6', appRegex: '^erp.*$', name: 'ERP Core', environment: 'Production', account: 'global-prod', zone: 'z8', imageAliases: { 'latest': '5.2.1' }, repository: 'repo/erp-core', region: 'us-east-1', tags: { team: 'erp' }, enforceValidation: 'true', metadata: {}, slug: 'erp-core', code: 'ERC', description: 'Core ERP system', portfolioId: 'p6', status: 'running' as const, version: '5.2.1', lastDeploy: '2024-01-26' },
        { id: 'a28', clientPortfolio: 'p6', appRegex: '^procurement.*$', name: 'Procurement Module', environment: 'Production', account: 'global-prod', zone: 'z8', imageAliases: { 'latest': '2.8.3' }, repository: 'repo/procurement-module', region: 'us-east-1', tags: { team: 'procurement' }, enforceValidation: 'true', metadata: {}, slug: 'procurement-module', code: 'PRC', description: 'Procurement management', portfolioId: 'p6', status: 'running' as const, version: '2.8.3', lastDeploy: '2024-01-25' },
        { id: 'a29', clientPortfolio: 'p6', appRegex: '^finance.*$', name: 'Finance Module', environment: 'Production', account: 'global-prod', zone: 'z9', imageAliases: { 'latest': '3.1.4' }, repository: 'repo/finance-module', region: 'eu-west-1', tags: { team: 'finance' }, enforceValidation: 'true', metadata: {}, slug: 'finance-module', code: 'FIN', description: 'Financial management module', portfolioId: 'p6', status: 'running' as const, version: '3.1.4', lastDeploy: '2024-01-24' },
        { id: 'a30', clientPortfolio: 'p6', appRegex: '^inventory.*$', name: 'Inventory Module', environment: 'Production', account: 'global-prod', zone: 'z8', imageAliases: { 'latest': '2.5.2' }, repository: 'repo/inventory-module', region: 'us-east-1', tags: { team: 'inventory' }, enforceValidation: 'true', metadata: {}, slug: 'inventory-module', code: 'INM', description: 'Inventory management module', portfolioId: 'p6', status: 'running' as const, version: '2.5.2', lastDeploy: '2024-01-23' },
      ];
      
      initializeApplications(mockApplications);
      
      // Initialize zones aligned with applications and environments
      const mockZones = [
        // Acme Corp zones (6 zones across 3 environments)
        { id: 'z1', clientId: '1', name: 'acme-prod-east', organizationalUnit: 'Production', orgId: 'acme-prod', awsAccountId: '123456789012', accountName: 'Acme Production', environment: 'Production', namespace: 'acme-prod', kmsKeys: ['key1'], vpcAliases: ['prod-vpc'], subnetAliases: ['prod-subnet'], tags: { Environment: 'Production', Client: 'Acme' } },
        { id: 'z2', clientId: '1', name: 'acme-prod-west', organizationalUnit: 'Production', orgId: 'acme-prod', awsAccountId: '123456789013', accountName: 'Acme Production West', environment: 'Production', namespace: 'acme-prod-west', kmsKeys: ['key2'], vpcAliases: ['prod-vpc-west'], subnetAliases: ['prod-subnet-west'], tags: { Environment: 'Production', Client: 'Acme' } },
        { id: 'z3', clientId: '1', name: 'acme-staging', organizationalUnit: 'Non-Production', orgId: 'acme-staging', awsAccountId: '123456789014', accountName: 'Acme Staging', environment: 'Staging', namespace: 'acme-staging', kmsKeys: ['key3'], vpcAliases: ['staging-vpc'], subnetAliases: ['staging-subnet'], tags: { Environment: 'Staging', Client: 'Acme' } },
        { id: 'z4', clientId: '1', name: 'acme-development', organizationalUnit: 'Non-Production', orgId: 'acme-dev', awsAccountId: '123456789015', accountName: 'Acme Development', environment: 'Development', namespace: 'acme-dev', kmsKeys: ['key4'], vpcAliases: ['dev-vpc'], subnetAliases: ['dev-subnet'], tags: { Environment: 'Development', Client: 'Acme' } },
        
        // TechStart Inc zones (3 zones across 3 environments)
        { id: 'z5', clientId: '2', name: 'techstart-prod', organizationalUnit: 'Production', orgId: 'tech-prod', awsAccountId: '234567890123', accountName: 'TechStart Production', environment: 'Production', namespace: 'techstart-prod', kmsKeys: ['tech-key1'], vpcAliases: ['tech-prod-vpc'], subnetAliases: ['tech-prod-subnet'], tags: { Environment: 'Production', Client: 'TechStart' } },
        { id: 'z6', clientId: '2', name: 'techstart-staging', organizationalUnit: 'Non-Production', orgId: 'tech-staging', awsAccountId: '234567890124', accountName: 'TechStart Staging', environment: 'Staging', namespace: 'techstart-staging', kmsKeys: ['tech-key2'], vpcAliases: ['tech-staging-vpc'], subnetAliases: ['tech-staging-subnet'], tags: { Environment: 'Staging', Client: 'TechStart' } },
        { id: 'z7', clientId: '2', name: 'techstart-dev', organizationalUnit: 'Non-Production', orgId: 'tech-dev', awsAccountId: '234567890125', accountName: 'TechStart Development', environment: 'Development', namespace: 'techstart-dev', kmsKeys: ['tech-key3'], vpcAliases: ['tech-dev-vpc'], subnetAliases: ['tech-dev-subnet'], tags: { Environment: 'Development', Client: 'TechStart' } },
        
        // Global Systems zones (8 zones across 4 environments)
        { id: 'z8', clientId: '3', name: 'global-prod-us', organizationalUnit: 'Production', orgId: 'global-prod', awsAccountId: '345678901234', accountName: 'Global Production US', environment: 'Production', namespace: 'global-prod-us', kmsKeys: ['global-key1'], vpcAliases: ['global-prod-vpc'], subnetAliases: ['global-prod-subnet'], tags: { Environment: 'Production', Client: 'Global', Region: 'US' } },
        { id: 'z9', clientId: '3', name: 'global-prod-eu', organizationalUnit: 'Production', orgId: 'global-prod', awsAccountId: '345678901235', accountName: 'Global Production EU', environment: 'Production', namespace: 'global-prod-eu', kmsKeys: ['global-key2'], vpcAliases: ['global-prod-vpc-eu'], subnetAliases: ['global-prod-subnet-eu'], tags: { Environment: 'Production', Client: 'Global', Region: 'EU' } },
        { id: 'z10', clientId: '3', name: 'global-staging-us', organizationalUnit: 'Non-Production', orgId: 'global-staging', awsAccountId: '345678901236', accountName: 'Global Staging US', environment: 'Staging', namespace: 'global-staging-us', kmsKeys: ['global-key3'], vpcAliases: ['global-staging-vpc'], subnetAliases: ['global-staging-subnet'], tags: { Environment: 'Staging', Client: 'Global', Region: 'US' } },
        { id: 'z11', clientId: '3', name: 'global-staging-eu', organizationalUnit: 'Non-Production', orgId: 'global-staging', awsAccountId: '345678901237', accountName: 'Global Staging EU', environment: 'Staging', namespace: 'global-staging-eu', kmsKeys: ['global-key4'], vpcAliases: ['global-staging-vpc-eu'], subnetAliases: ['global-staging-subnet-eu'], tags: { Environment: 'Staging', Client: 'Global', Region: 'EU' } },
        { id: 'z12', clientId: '3', name: 'global-dev', organizationalUnit: 'Non-Production', orgId: 'global-dev', awsAccountId: '345678901238', accountName: 'Global Development', environment: 'Development', namespace: 'global-dev', kmsKeys: ['global-key5'], vpcAliases: ['global-dev-vpc'], subnetAliases: ['global-dev-subnet'], tags: { Environment: 'Development', Client: 'Global' } },
        { id: 'z13', clientId: '3', name: 'global-test', organizationalUnit: 'Non-Production', orgId: 'global-test', awsAccountId: '345678901239', accountName: 'Global Testing', environment: 'Test', namespace: 'global-test', kmsKeys: ['global-key6'], vpcAliases: ['global-test-vpc'], subnetAliases: ['global-test-subnet'], tags: { Environment: 'Test', Client: 'Global' } },
      ];
      
      initializeZones(mockZones);
      
      // Initialize 60 deployments with specific status distribution and date clustering
      const generateDeployments = () => {
        const deployments = [];
        const events = [];
        const environments = ['production', 'staging', 'development'];
        const applications = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9', 'a10', 'a11', 'a12', 'a13', 'a14', 'a15', 'a16', 'a17', 'a18', 'a19', 'a20', 'a21', 'a22', 'a23', 'a24', 'a25', 'a26', 'a27', 'a28', 'a29', 'a30'];
        const usedApps = new Set();
        
        // Helper to generate realistic deployment dates over last 30 days
        const generateDeploymentDate = (index, total) => {
          const now = new Date();
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          
          // Create clustering around the 15th of the month
          const dayOfMonth = now.getDate();
          const fifteenthThisMonth = new Date(now.getFullYear(), now.getMonth(), 15);
          const fifteenthLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15);
          
          // 40% of deployments cluster around the 15th (±3 days)
          if (index <= total * 0.4) {
            const clusterCenter = fifteenthThisMonth > now ? fifteenthLastMonth : fifteenthThisMonth;
            const variance = (Math.random() - 0.5) * 6 * 24 * 60 * 60 * 1000; // ±3 days
            return new Date(clusterCenter.getTime() + variance);
          }
          
          // Remaining 60% spread across the 30 days
          const timeRange = now.getTime() - thirtyDaysAgo.getTime();
          const randomTime = thirtyDaysAgo.getTime() + (Math.random() * timeRange);
          return new Date(randomTime);
        };
        
        // Helper to get client ID from portfolio - Weight heavily toward Client 1 (Acme Corp)
        const getClientId = (portfolioId) => {
          // Put 80% of deployments in Client 1 (Acme Corp) for better demo experience
          if (Math.random() < 0.8) return '1'; // 80% go to Acme Corp
          if (['p4', 'p5'].includes(portfolioId)) return '2'; // TechStart Inc
          if (['p6', 'p7', 'p8', 'p9', 'p10'].includes(portfolioId)) return '3'; // Global Systems
          return '1'; // Default to Acme Corp
        };
        
        // Helper to create deployment
        const createDeployment = (index, status, appId = null) => {
          let applicationId = appId;
          if (!applicationId) {
            // For first 25 deployments, use unique apps. For others, allow reuse
            const availableApps = index <= 25 
              ? applications.filter(id => !usedApps.has(id))
              : applications;
            
            if (availableApps.length === 0) {
              applicationId = applications[Math.floor(Math.random() * applications.length)];
            } else {
              applicationId = availableApps[Math.floor(Math.random() * availableApps.length)];
            }
          }
          
          if (index <= 25) usedApps.add(applicationId);
          
          // Get portfolio for this application
          let portfolioId;
          if (['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8'].includes(applicationId)) portfolioId = 'p1';
          else if (['a9', 'a10', 'a11', 'a12', 'a13', 'a14'].includes(applicationId)) portfolioId = 'p2';
          else if (['a15', 'a16', 'a17', 'a18'].includes(applicationId)) portfolioId = 'p3';
          else if (['a19', 'a20', 'a21', 'a22', 'a23'].includes(applicationId)) portfolioId = 'p4';
          else if (['a24', 'a25', 'a26'].includes(applicationId)) portfolioId = 'p5';
          else portfolioId = 'p6'; // Default for remaining apps
          
          const clientId = getClientId(portfolioId);
          const environment = environments[Math.floor(Math.random() * environments.length)];
          const deploymentId = `dep-${index.toString().padStart(3, '0')}`;
          const deploymentDate = generateDeploymentDate(index, 60);
          
          const deployment = {
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
          
          return deployment;
        };
        
        // Helper to create realistic events for a deployment (exactly 3 events as agreed)
        const createEventsForDeployment = (deployment) => {
          const deploymentEvents = [];
          
          // Create exactly 3 events per deployment
          for (let j = 1; j <= 3; j++) {
            const eventTypes = ['deploy', 'test', 'release', 'rollback', 'error'];
            let eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
            let status = 'success';
            let message = '';
            
            // Create realistic event flow based on deployment status
            if (j === 1) {
              eventType = 'deploy';
              message = `Deployment initiated for ${deployment.applicationId} in ${deployment.environment}`;
              status = 'success';
            } else if (j === 2) {
              eventType = 'test';
              message = `Running automated tests for build ${deployment.build}`;
              status = deployment.status === 'failed' && Math.random() > 0.5 ? 'failed' : 'success';
            } else if (j === 3 && deployment.status === 'released') {
              eventType = 'release';
              message = `Successfully released ${deployment.tag} to ${deployment.environment}`;
              status = 'success';
            } else if (deployment.status === 'failed' && j === 3) {
              eventType = 'error';
              message = `Deployment failed: Build validation error in ${deployment.environment}`;
              status = 'failed';
            } else {
              // Random event for middle events
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
                  status = deployment.status === 'teardown-in-progress' ? 'pending' : 'success';
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
              timestamp: new Date(deployment.deployedAt).toISOString(),
              status
            });
          }
          
          return deploymentEvents;
        };
        
        let deploymentIndex = 1;
        
        // First 25 deployments: 20 "released", 5 "not-released" (using 25 different apps)
        for (let i = 0; i < 20; i++) {
          const deployment = createDeployment(deploymentIndex++, 'released');
          deployments.push(deployment);
          events.push(...createEventsForDeployment(deployment));
        }
        
        for (let i = 0; i < 5; i++) {
          const deployment = createDeployment(deploymentIndex++, 'not-released');
          deployments.push(deployment);
          events.push(...createEventsForDeployment(deployment));
        }
        
        // Next 20 deployments: all "not-released" (can reuse apps)
        for (let i = 0; i < 20; i++) {
          const deployment = createDeployment(deploymentIndex++, 'not-released');
          deployments.push(deployment);
          events.push(...createEventsForDeployment(deployment));
        }
        
        // Next 5 deployments: "failed"
        for (let i = 0; i < 5; i++) {
          const deployment = createDeployment(deploymentIndex++, 'failed');
          deployments.push(deployment);
          events.push(...createEventsForDeployment(deployment));
        }
        
        // Next 5 deployments: "teardown-in-progress"
        for (let i = 0; i < 5; i++) {
          const deployment = createDeployment(deploymentIndex++, 'teardown-in-progress');
          deployments.push(deployment);
          events.push(...createEventsForDeployment(deployment));
        }
        
        // Final 5 deployments: "release-in-progress"
        for (let i = 0; i < 5; i++) {
          const deployment = createDeployment(deploymentIndex++, 'release-in-progress');
          deployments.push(deployment);
          events.push(...createEventsForDeployment(deployment));
        }
        
        return { deployments, events };
      };

      const { deployments, events } = generateDeployments();
      console.log('Generated deployments:', deployments.length, 'events:', events.length);
      dispatch(setDeployments(deployments));
      dispatch(setEvents(events));
      console.log('Dispatched deployments to Redux store');
      
      // Auto-select first client as default if none exists
      if (!defaultClient) {
        selectClient(mockClients[0].id);
      }
    }
  }, [clients.length, deployments.length, dispatch]);

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "Clients", href: "/clients", icon: Building2 },
    { name: "Zones", href: "/zones", icon: GitBranch },
    { name: "Portfolios", href: "/portfolios", icon: Briefcase },
    { name: "Applications", href: "/applications", icon: FolderOpen },
    { name: "Deployments", href: "/deployments", icon: GitBranch },
    { name: "Documentation", href: "/docs", icon: List },
    { name: "Profile", href: "/profile", icon: User },
  ];

  const handleLogout = () => {
    // TODO: Implement logout logic
    navigate("/login");
  };

  const isActive = (href: string) => location.pathname === href || location.pathname.startsWith(href + '/');

  return (
    <SidebarProvider open={!sidebarCollapsed} onOpenChange={(open) => setSidebarCollapsed(!open)}>
      <div className="min-h-screen w-full flex flex-col">
        {/* Full width header with portal branding */}
        <header className="bg-dashboard-header shadow-soft border-b border-border w-full">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-light rounded-lg flex items-center justify-center">
                  <Cloud className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-xl font-bold text-foreground">Core Automation Portal</h1>
              </div>
              <SidebarTrigger />
            </div>

            <div className="flex items-center gap-4">
              {/* Client Selection Dropdown */}
              {clients.length > 0 && (
                <div className="flex items-center gap-2">
                  <Select 
                    value={selectedClient?.id || defaultClient?.id || ""} 
                    onValueChange={(value) => selectClient(value || null)}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select client..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <Button variant="ghost" size="icon" asChild>
                <Link to="/settings">
                  <Settings className="h-5 w-5" />
                </Link>
              </Button>
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Content area with sidebar and main content */}
        <div className="flex flex-1">
          <AppSidebar 
            navigation={navigation} 
            isActive={isActive} 
            handleLogout={handleLogout} 
            collapsed={sidebarCollapsed}
          />
          
          {/* Main content */}
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

interface AppSidebarProps {
  navigation: Array<{
    name: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
  }>;
  isActive: (href: string) => boolean;
  handleLogout: () => void;
  collapsed: boolean;
}

function AppSidebar({ navigation, isActive, handleLogout, collapsed }: AppSidebarProps) {

  return (
    <Sidebar 
      className={`border-r bg-dashboard-sidebar transition-all duration-200 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
      collapsible="none"
    >
      <SidebarContent>

        {/* Navigation */}
        <SidebarGroup className="pt-4">
          {!collapsed && <SidebarGroupLabel>Navigation</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive(item.href)}
                      className={collapsed ? 'justify-center' : ''}
                      title={collapsed ? item.name : undefined}
                    >
                      <Link to={item.href} className="flex items-center gap-3">
                        <Icon className="h-5 w-5 flex-shrink-0" />
                        {!collapsed && <span>{item.name}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Quick Actions & Logout */}
        <div className="mt-auto p-4 border-t border-border space-y-2">
          <Button 
            variant="gradient" 
            className={`gap-2 ${collapsed ? 'px-2' : 'w-full'}`}
            size={collapsed ? 'icon' : 'default'}
            title={collapsed ? 'Quick Create' : undefined}
          >
            <Plus className="h-4 w-4" />
            {!collapsed && 'Quick Create'}
          </Button>
          
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton 
                asChild 
                className={collapsed ? 'justify-center' : ''}
                title={collapsed ? 'Logout' : undefined}
              >
                <button onClick={handleLogout} className="flex items-center gap-3 w-full text-left">
                  <LogOut className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && <span>Logout</span>}
                </button>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}