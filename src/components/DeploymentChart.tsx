import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis } from "recharts";
import { Calendar, TrendingUp, AlertTriangle } from "lucide-react";
import { FilterState } from "./DashboardFilters";
import { useReduxData } from "@/hooks/useReduxData";
import type { Zone } from "@/store/types";

type DeploymentChartProps = {
  client?: string; // optional; will fall back to selected client from store
  filters?: FilterState;
};

type MaybeDeployment = {
  id?: string;
  client?: string;
  portfolio?: string;
  application?: string;
  environment?: string;
  status?: string;
  created_at?: string | number | Date;
};

const chartConfig = {
  successful: { label: "Successful", color: "hsl(var(--success))" },
  failed: { label: "Failed", color: "hsl(var(--destructive))" },
  zones: { label: "Zones", color: "hsl(var(--primary))" },
};

const safe = (v: unknown) => (v == null ? "" : String(v));
const toDate = (v: unknown): Date | null => {
  if (!v) return null;
  try {
    const d = new Date(v as any);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
};

export default function DeploymentChart({ client, filters }: DeploymentChartProps) {
  const { deployments, zones, selectedClient } = useReduxData();

  const clientSlug = client ?? (typeof selectedClient === "string" ? selectedClient : null);

  const deploymentsList = useMemo<MaybeDeployment[]>(() => {
    const d: any = deployments;
    if (Array.isArray(d?.items)) return d.items as MaybeDeployment[];
    if (Array.isArray(d)) return d as MaybeDeployment[];
    return [];
  }, [deployments]);

  const zonesList = useMemo<Zone[]>(
    () => (Array.isArray(zones) ? (zones as Zone[]) : ([] as Zone[])),
    [zones]
  );

  const clientDeployments = useMemo<MaybeDeployment[]>(
    () => (clientSlug ? deploymentsList.filter((dep) => dep.client === clientSlug) : deploymentsList),
    [deploymentsList, clientSlug]
  );

  const clientZones = useMemo<Zone[]>(
    () => (clientSlug ? zonesList.filter((z) => z.client === clientSlug) : zonesList),
    [zonesList, clientSlug]
  );

  const matchesFilters = (dep: MaybeDeployment): boolean => {
    // Date range
    if (filters?.dateRange?.from || filters?.dateRange?.to) {
      const d = toDate(dep.created_at) ?? new Date(0);
      const from = filters.dateRange.from ? new Date(filters.dateRange.from) : null;
      const to = filters.dateRange.to ? new Date(filters.dateRange.to) : null;
      if (from && d < from) return false;
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        if (d > end) return false;
      }
    }

    // Environment
    if (filters?.environment && safe(dep.environment) !== filters.environment) return false;

    // Status
    if (filters?.deploymentStatus && safe(dep.status) !== filters.deploymentStatus) return false;

    // Portfolios
    if (filters?.portfolios?.length) {
      const p = safe(dep.portfolio).toLowerCase();
      if (!filters.portfolios.some((x) => p.includes(x.toLowerCase()))) return false;
    }

    // Applications
    if (filters?.applications?.length) {
      const a = safe(dep.application).toLowerCase();
      if (!filters.applications.some((x) => a.includes(x.toLowerCase()))) return false;
    }

    // Keywords
    if (filters?.keywords) {
      const kw = filters.keywords.toLowerCase();
      const hay = [
        safe(dep.environment),
        safe(dep.status),
        safe(dep.application),
        safe(dep.portfolio),
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(kw)) return false;
    }

    return true;
  };

  const filteredDeployments = useMemo<MaybeDeployment[]>(
    () => clientDeployments.filter(matchesFilters),
    [clientDeployments, filters]
  );

  // Status Distribution
  const statusTypes = [
    { name: "Released", key: "released", color: "hsl(142 71% 45%)" },
    { name: "Not Released", key: "not-released", color: "hsl(48 96% 53%)" },
    { name: "Failed", key: "failed", color: "hsl(0 84% 60%)" },
    { name: "Teardown in Progress", key: "teardown-in-progress", color: "hsl(0 72% 50%)" },
    { name: "Release in Progress", key: "release-in-progress", color: "hsl(221 83% 53%)" },
  ];

  const statusDistribution = useMemo(
    () => {
      const counts = filteredDeployments.reduce((acc, d) => {
        const s = safe(d.status);
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      return statusTypes
        .map((s) => ({ name: s.name, value: counts[s.key] || 0, color: s.color }))
        .filter((s) => s.value > 0);
    },
    [filteredDeployments]
  );

  // Zones by environment (from zone.account_facts.environment)
  const zoneEnvironments = useMemo(() => {
    const counts = clientZones.reduce((acc, z) => {
      const env = safe(z.account_facts?.environment) || "unknown";
      acc[env] = (acc[env] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    let rows = Object.entries(counts).map(([environment, zones]) => ({ environment, zones }));
    // Apply environment/keyword filters to zone envs
    if (filters?.environment) rows = rows.filter((r) => r.environment === filters.environment);
    if (filters?.keywords) {
      const kw = filters.keywords.toLowerCase();
      rows = rows.filter((r) => r.environment.toLowerCase().includes(kw));
    }
    return rows;
  }, [clientZones, filters?.environment, filters?.keywords]);

  // Time-bucket deployments (Daily last 7 days, Monthly last 4 months)
  const dailyData = useMemo(() => {
    // Build last 7 day buckets
    const today = new Date();
    const days: { key: string; label: string }[] = [];
    const fmt = (d: Date) => d.toISOString().slice(0, 10); // YYYY-MM-DD
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      days.push({ key: fmt(d), label: dayNames[d.getDay()] });
    }

    const buckets: Record<string, { successful: number; failed: number }> = {};
    days.forEach((d) => (buckets[d.key] = { successful: 0, failed: 0 }));

    filteredDeployments.forEach((d) => {
      const created = toDate(d.created_at);
      const key = created ? created.toISOString().slice(0, 10) : days[days.length - 1].key;
      if (!buckets[key]) return;
      const s = safe(d.status);
      if (s === "released") buckets[key].successful += 1;
      else if (s === "failed") buckets[key].failed += 1;
    });

    return days.map(({ key, label }) => ({
      date: label,
      successful: buckets[key].successful,
      failed: buckets[key].failed,
    }));
  }, [filteredDeployments]);

  const monthlyData = useMemo(() => {
    // Last 4 month labels based on current date
    const months: { key: string; label: string }[] = [];
    const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const cursor = new Date();

    for (let i = 3; i >= 0; i--) {
      const d = new Date(cursor.getFullYear(), cursor.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months.push({ key, label: monthLabels[d.getMonth()] });
    }

    const buckets: Record<string, { successful: number; failed: number }> = {};
    months.forEach((m) => (buckets[m.key] = { successful: 0, failed: 0 }));

    filteredDeployments.forEach((d) => {
      const created = toDate(d.created_at);
      if (!created) return;
      const key = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, "0")}`;
      if (!buckets[key]) return;
      const s = safe(d.status);
      if (s === "released") buckets[key].successful += 1;
      else if (s === "failed") buckets[key].failed += 1;
    });

    return months.map(({ key, label }) => ({
      month: label,
      successful: buckets[key].successful,
      failed: buckets[key].failed,
    }));
  }, [filteredDeployments]);

  if (!clientSlug) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Select a client to see charts</CardTitle>
          </CardHeader>
          <CardContent />
        </Card>
      </div>
    );
  }

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
            <BarChart data={dailyData}>
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
                data={statusDistribution}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label={({ name, value }) => (value > 0 ? `${name}: ${value}` : null)}
              >
                {statusDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
            </PieChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Zones by Environment */}
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
            <LineChart data={monthlyData}>
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