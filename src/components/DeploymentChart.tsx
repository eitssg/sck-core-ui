import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { Calendar, TrendingUp, AlertTriangle } from "lucide-react";

interface DeploymentChartProps {
  clientId: string;
}

const dailyDeployments = [
  { date: "Mon", deployments: 12, newApps: 3 },
  { date: "Tue", deployments: 15, newApps: 5 },
  { date: "Wed", deployments: 8, newApps: 2 },
  { date: "Thu", deployments: 20, newApps: 7 },
  { date: "Fri", deployments: 18, newApps: 4 },
  { date: "Sat", deployments: 5, newApps: 1 },
  { date: "Sun", deployments: 3, newApps: 0 },
];

const deploymentStatus = [
  { name: "Released", value: 145, color: "hsl(var(--success))" },
  { name: "Not Released", value: 32, color: "hsl(var(--warning))" },
  { name: "Teardown in Progress", value: 8, color: "hsl(var(--destructive))" },
  { name: "Release in Progress", value: 12, color: "hsl(var(--info))" },
];

const zoneEnvironments = [
  { environment: "Production", zones: 45 },
  { environment: "Staging", zones: 32 },
  { environment: "Development", zones: 78 },
  { environment: "Testing", zones: 24 },
];

const chartConfig = {
  deployments: {
    label: "Deployments",
    color: "hsl(var(--primary))",
  },
  newApps: {
    label: "New Apps",
    color: "hsl(var(--secondary))",
  },
};

export default function DeploymentChart({ clientId }: DeploymentChartProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Daily Deployments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Daily Deployments (Last 7 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-64">
            <BarChart data={dailyDeployments}>
              <XAxis dataKey="date" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="deployments" fill="var(--color-deployments)" />
              <Bar dataKey="newApps" fill="var(--color-newApps)" />
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
                data={deploymentStatus}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {deploymentStatus.map((entry, index) => (
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
            <BarChart data={zoneEnvironments} layout="horizontal">
              <XAxis type="number" />
              <YAxis dataKey="environment" type="category" width={80} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="zones" fill="hsl(var(--primary))" />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Monthly Deployment Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Monthly Deployment Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-64">
            <LineChart data={[
              { month: "Oct", deployments: 120, newApps: 25 },
              { month: "Nov", deployments: 145, newApps: 32 },
              { month: "Dec", deployments: 180, newApps: 38 },
              { month: "Jan", deployments: 165, newApps: 28 },
            ]}>
              <XAxis dataKey="month" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="deployments" stroke="var(--color-deployments)" strokeWidth={2} />
              <Line type="monotone" dataKey="newApps" stroke="var(--color-newApps)" strokeWidth={2} />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}