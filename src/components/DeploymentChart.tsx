import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { Calendar, TrendingUp, AlertTriangle } from "lucide-react";

interface DeploymentChartProps {
  clientId: string;
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

export default function DeploymentChart({ clientId }: DeploymentChartProps) {
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
            <BarChart data={dailyDeployments}>
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
            <BarChart data={zoneEnvironments}>
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
            <LineChart data={[
              { month: "Oct", successful: 105, failed: 15 },
              { month: "Nov", successful: 128, failed: 17 },
              { month: "Dec", successful: 162, failed: 18 },
              { month: "Jan", successful: 145, failed: 20 },
            ]}>
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