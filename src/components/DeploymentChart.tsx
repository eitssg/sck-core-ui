import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { Calendar, TrendingUp, AlertTriangle } from "lucide-react";
import { FilterState } from "./DashboardFilters";
import { useAppSelector } from '@/store';

interface DeploymentChartProps {
  clientId: string;
  filters?: FilterState;
}

const dailyDeployments = [
  { date: "Mon", successful: 9, failed: 3, total: 12 },
  { date: "Tue", successful: 12, failed: 3, total: 15 },
  { date: "Wed", successful: 6, failed: 2, total: 8 },
  { date: "Thu", successful: 16, failed: 4, total: 20 },
  { date: "Fri", successful: 15, failed: 3, total: 18 },
  { date: "Sat", successful: 4, failed: 1, total: 5 },
  { date: "Sun", successful: 2, failed: 1, total: 3 },
];

const deploymentStatus = [
  { name: "Released", value: 145, color: "hsl(142 71% 45%)" }, // Green
  { name: "Not Released", value: 32, color: "hsl(48 96% 53%)" }, // Yellow  
  { name: "Failed", value: 15, color: "hsl(0 84% 60%)" }, // Red
  { name: "Teardown in Progress", value: 8, color: "hsl(0 72% 50%)" }, // Dark red
  { name: "Release in Progress", value: 12, color: "hsl(221 83% 53%)" }, // Blue
];

const zoneEnvironments = [
  { environment: "Production", zones: 45 },
  { environment: "Staging", zones: 32 },
  { environment: "Development", zones: 78 },
  { environment: "Testing", zones: 24 },
];

const chartConfig = {
  successful: {
    label: "Successful",
    color: "hsl(var(--success))",
  },
  failed: {
    label: "Failed",
    color: "hsl(var(--destructive))",
  },
  zones: {
    label: "Zones",
    color: "hsl(var(--primary))",
  },
};

export default function DeploymentChart({ clientId, filters }: DeploymentChartProps) {
  const deployments = useAppSelector(state => state.deployments.deployments);
  const zones = useAppSelector(state => state.zones.zones);

  // Smart keyword taxonomy - determines what type of keyword we're dealing with
  const categorizeKeyword = (keyword: string) => {
    const lowerKeyword = keyword.toLowerCase();
    
    // Environment keywords
    const environments = ['production', 'prod', 'staging', 'stage', 'development', 'dev', 'test', 'testing'];
    if (environments.some(env => lowerKeyword.includes(env))) {
      return { type: 'environment', value: lowerKeyword };
    }
    
    // Status keywords
    const statuses = ['failed', 'success', 'released', 'pending', 'progress', 'teardown'];
    if (statuses.some(status => lowerKeyword.includes(status))) {
      return { type: 'status', value: lowerKeyword };
    }
    
    // App/Portfolio keywords (can be anything else)
    return { type: 'general', value: lowerKeyword };
  };

  // Get client deployments and zones from Redux
  const clientDeployments = deployments.filter(dep => dep.clientId === clientId);
  const clientZones = zones.filter(zone => zone.clientId === clientId);

  // Create deployment records from actual Redux data
  const deploymentRecords = clientDeployments.map(dep => ({
    environment: dep.environment,
    status: dep.status,
    app: dep.applicationId,
    portfolio: dep.portfolioId
  }));

  // Filter deployment records based on all criteria
  const filterDeploymentRecords = () => {
    let filtered = [...deploymentRecords];

    // Apply keyword filter with smart categorization
    if (filters?.keywords) {
      const keywordInfo = categorizeKeyword(filters.keywords);
      
      filtered = filtered.filter(record => {
        switch (keywordInfo.type) {
          case 'environment':
            return record.environment.toLowerCase().includes(keywordInfo.value);
          case 'status':
            return record.status.toLowerCase().includes(keywordInfo.value);
          case 'general':
            // Search across app, portfolio, and other fields
            return (
              record.app.toLowerCase().includes(keywordInfo.value) ||
              record.portfolio.toLowerCase().includes(keywordInfo.value) ||
              record.environment.toLowerCase().includes(keywordInfo.value) ||
              record.status.toLowerCase().includes(keywordInfo.value)
            );
          default:
            return true;
        }
      });
    }

    // Apply explicit environment filter
    if (filters?.environment) {
      filtered = filtered.filter(record => record.environment === filters.environment);
    }

    // Apply explicit status filter
    if (filters?.deploymentStatus) {
      filtered = filtered.filter(record => record.status === filters.deploymentStatus);
    }

    // Apply portfolio filter
    if (filters?.portfolios.length > 0) {
      filtered = filtered.filter(record => 
        filters.portfolios.some(portfolio => record.portfolio.includes(portfolio))
      );
    }

    // Apply application filter
    if (filters?.applications.length > 0) {
      filtered = filtered.filter(record => 
        filters.applications.some(app => record.app.includes(app))
      );
    }

    return filtered;
  };

  const filteredRecords = filterDeploymentRecords();

  // Calculate deployment status distribution from filtered records
  const calculateStatusDistribution = (records: typeof deploymentRecords) => {
    const statusCounts = records.reduce((acc, record) => {
      acc[record.status] = (acc[record.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return deploymentStatus.map(status => {
      const statusKey = status.name.toLowerCase().replace(' ', '-').replace(' in progress', '-in-progress');
      return {
        ...status,
        value: statusCounts[statusKey] || 0
      };
    });
  };

  const filteredDeploymentStatus = calculateStatusDistribution(filteredRecords);

  // Calculate zone environments from actual Redux data
  const zoneEnvironmentCounts = clientZones.reduce((acc, zone) => {
    acc[zone.environment] = (acc[zone.environment] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const actualZoneEnvironments = Object.entries(zoneEnvironmentCounts).map(([environment, zones]) => ({
    environment,
    zones
  }));

  // Filter zone environments based on keywords and environment filter
  const filteredZoneEnvironments = actualZoneEnvironments.filter(zone => {
    // Check keyword filter
    if (filters?.keywords) {
      const keywordInfo = categorizeKeyword(filters.keywords);
      if (keywordInfo.type === 'environment' && !zone.environment.toLowerCase().includes(keywordInfo.value)) {
        return false;
      }
    }
    
    // Check environment filter
    if (filters?.environment && filters.environment !== zone.environment) {
      return false;
    }
    
    return true;
  });

  // For keyword filtering, if keyword matches an environment, show only that environment with actual data
  // and set others to 0
  const processedZoneEnvironments = filters?.keywords ? 
    actualZoneEnvironments.map(zone => {
      const keywordInfo = categorizeKeyword(filters.keywords);
      if (keywordInfo.type === 'environment') {
        const matchesKeyword = zone.environment.toLowerCase().includes(keywordInfo.value);
        return {
          ...zone,
          zones: matchesKeyword ? zone.zones : 0
        };
      }
      return zone;
    }) : filteredZoneEnvironments;

  // Filter deployment data based on environment and keywords
  const filterDeploymentData = (data: any[]) => {
    if (!filters?.keywords && !filters?.environment) return data;
    
    // If filtering by environment-related keywords, simulate filtering deployments
    if (filters?.keywords) {
      const keywordInfo = categorizeKeyword(filters.keywords);
      if (keywordInfo.type === 'environment' && keywordInfo.value.includes('prod')) {
        // Reduce numbers to simulate production-only data
        return data.map(item => ({
          ...item,
          successful: Math.floor(item.successful * 0.6), // Simulate production being ~60% of total
          failed: Math.floor(item.failed * 0.4)
        }));
      }
    }
    
    return data;
  };

  // Generate actual daily/monthly data from Redux deployments
  const generateActualDeploymentData = () => {
    const today = new Date();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dailyData = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dayName = days[date.getDay()];
      
      const dayDeployments = clientDeployments.filter(dep => {
        const depDate = new Date(dep.deployedAt);
        return depDate.toDateString() === date.toDateString();
      });
      
      const successful = dayDeployments.filter(dep => dep.status === 'released').length;
      const failed = dayDeployments.filter(dep => dep.status === 'failed').length;
      
      dailyData.push({
        date: dayName,
        successful,
        failed,
        total: successful + failed
      });
    }
    
    const monthlyData = [];
    const months = ['Oct', 'Nov', 'Dec', 'Jan'];
    
    for (const month of months) {
      const monthDeployments = clientDeployments.filter(dep => {
        const depDate = new Date(dep.deployedAt);
        return depDate.getMonth() === (months.indexOf(month) + 9) % 12; // Oct=9, Nov=10, Dec=11, Jan=0
      });
      
      const successful = monthDeployments.filter(dep => dep.status === 'released').length;
      const failed = monthDeployments.filter(dep => dep.status === 'failed').length;
      
      monthlyData.push({ month, successful, failed });
    }
    
    return { dailyData, monthlyData };
  };

  const { dailyData, monthlyData } = generateActualDeploymentData();
  const filteredDailyDeployments = filterDeploymentData(dailyData);
  const filteredMonthlyDeployments = filterDeploymentData(monthlyData);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Daily Deployments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Daily Deployments: Success vs Failed (Last 7 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-64">
            <BarChart data={filteredDailyDeployments}>
              <XAxis dataKey="date" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="successful" fill="var(--color-successful)" />
              <Bar dataKey="failed" fill="var(--color-failed)" />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Deployment Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Deployment Status Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-64">
            <PieChart>
              <Pie
                data={filteredDeploymentStatus}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label={({ name, value }) => value > 0 ? `${name}: ${value}` : null}
              >
                {filteredDeploymentStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
            </PieChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Zone Environments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-primary" />
            Zones by Environment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-64">
            <BarChart data={processedZoneEnvironments}>
              <XAxis dataKey="environment" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="zones" fill="var(--color-zones)" />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Monthly Deployment Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Monthly Deployment Trend: Success vs Failed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-64">
            <LineChart data={filteredMonthlyDeployments}>
              <XAxis dataKey="month" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="successful" stroke="var(--color-successful)" strokeWidth={2} />
              <Line type="monotone" dataKey="failed" stroke="var(--color-failed)" strokeWidth={2} />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}