import { useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Search, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useReduxData } from "@/hooks/useReduxData";
import type { Zone } from "@/store/types";

export interface FilterState {
  keywords: string;
  portfolios: string[];
  applications: string[];
  zones: string[];
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
  environment?: string;
  deploymentStatus?: string;
}

type DashboardFiltersProps = {
  onFiltersChange: (filters: FilterState) => void;
  client?: string; // optional; if omitted we'll use the selected client from the store
};

// Minimal shapes aligned to current model names
type Portfolio = {
  client: string;
  portfolio: string;
  name?: string;
};

type Application = {
  client: string;
  portfolio?: string;
  application: string;
  name?: string;
};

export default function DashboardFilters({ onFiltersChange, client }: DashboardFiltersProps) {
  const { portfolios: portfoliosState, applications: applicationsState, zones, selectedClient } = useReduxData();
  const clientSlug = client ?? (typeof selectedClient === "string" ? selectedClient : null);

  // Normalize lists from Redux
  const portfoliosList = useMemo<Portfolio[]>(
    () =>
      Array.isArray((portfoliosState as any)?.items)
        ? ((portfoliosState as any).items as Portfolio[])
        : ([] as Portfolio[]),
    [portfoliosState]
  );

  const applicationsList = useMemo<Application[]>(
    () =>
      Array.isArray((applicationsState as any)?.items)
        ? ((applicationsState as any).items as Application[])
        : ([] as Application[]),
    [applicationsState]
  );

  const zonesList = useMemo<Zone[]>(
    () => (Array.isArray(zones) ? (zones as Zone[]) : ([] as Zone[])),
    [zones]
  );

  // Filter data for the selected client
  const clientPortfolios = useMemo<Portfolio[]>(
    () => (clientSlug ? portfoliosList.filter((p) => p.client === clientSlug) : portfoliosList),
    [portfoliosList, clientSlug]
  );

  const clientApplications = useMemo<Application[]>(
    () => (clientSlug ? applicationsList.filter((a) => a.client === clientSlug) : applicationsList),
    [applicationsList, clientSlug]
  );

  const clientZones = useMemo<Zone[]>(
    () => (clientSlug ? zonesList.filter((z) => z.client === clientSlug) : zonesList),
    [zonesList, clientSlug]
  );

  // Derive environments from zones
  const environments = useMemo<string[]>(() => {
    const set = new Set<string>();
    clientZones.forEach((z) => {
      const env = z.account_facts?.environment;
      if (env) set.add(env);
    });
    return Array.from(set.size ? set : new Set(["production", "staging", "development", "testing"]));
  }, [clientZones]);

  const deploymentStatuses = ["released", "not-released", "failed", "release-in-progress", "teardown-in-progress"];

  const [filters, setFilters] = useState<FilterState>({
    keywords: "",
    portfolios: [],
    applications: [],
    zones: [],
    dateRange: { from: undefined, to: undefined },
    environment: undefined,
    deploymentStatus: undefined,
  });

  const [keywordInput, setKeywordInput] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  const updateFilters = (newFilters: Partial<FilterState>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    onFiltersChange(updatedFilters);
  };

  const applyKeywords = () => {
    updateFilters({ keywords: keywordInput });
  };

  const clearAllFilters = () => {
    const cleared: FilterState = {
      keywords: "",
      portfolios: [],
      applications: [],
      zones: [],
      dateRange: { from: undefined, to: undefined },
      environment: undefined,
      deploymentStatus: undefined,
    };
    setFilters(cleared);
    setKeywordInput("");
    onFiltersChange(cleared);
  };

  const removeFilter = (type: keyof FilterState, value?: string) => {
    switch (type) {
      case "portfolios":
        updateFilters({ portfolios: filters.portfolios.filter((p) => p !== value) });
        break;
      case "applications":
        updateFilters({ applications: filters.applications.filter((a) => a !== value) });
        break;
      case "zones":
        updateFilters({ zones: filters.zones.filter((z) => z !== value) });
        break;
      case "environment":
        updateFilters({ environment: undefined });
        break;
      case "deploymentStatus":
        updateFilters({ deploymentStatus: undefined });
        break;
      case "dateRange":
        updateFilters({ dateRange: { from: undefined, to: undefined } });
        break;
      case "keywords":
        updateFilters({ keywords: "" });
        setKeywordInput("");
        break;
    }
  };

  const hasActiveFilters =
    !!filters.keywords ||
    filters.portfolios.length > 0 ||
    filters.applications.length > 0 ||
    filters.zones.length > 0 ||
    !!filters.dateRange.from ||
    !!filters.environment ||
    !!filters.deploymentStatus;

  // Label helpers
  const portfolioLabel = (p: Portfolio) => p.name || p.portfolio;
  const portfolioValue = (p: Portfolio) => p.portfolio;

  const applicationLabel = (a: Application) => a.name || a.application;
  const applicationValue = (a: Application) => a.application;

  const zoneLabel = (z: Zone) => z.zone;
  const zoneValue = (z: Zone) => z.zone;

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            Dashboard Filters
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-2">
                {[
                  filters.keywords && 1,
                  filters.portfolios.length,
                  filters.applications.length,
                  filters.zones.length,
                  filters.dateRange.from && 1,
                  filters.environment && 1,
                  filters.deploymentStatus && 1,
                ]
                  .filter(Boolean)
                  .reduce((a, b) => Number(a) + Number(b), 0)}{" "}
                active
              </Badge>
            )}
          </CardTitle>
          <div className="flex gap-2">
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearAllFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setIsExpanded(!isExpanded)}>
              {isExpanded ? "Collapse" : "Expand"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Always visible: Keywords search */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search across portfolios, apps, zones..."
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyKeywords();
                }
              }}
              className="pl-10"
            />
          </div>
          <Button onClick={applyKeywords} disabled={keywordInput === filters.keywords} className="shrink-0">
            Apply
          </Button>
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2">
            {filters.keywords && (
              <Badge variant="outline" className="gap-1">
                Keywords: {filters.keywords}
                <X className="h-3 w-3 cursor-pointer" onClick={() => removeFilter("keywords")} />
              </Badge>
            )}
            {filters.portfolios.map((portfolio) => (
              <Badge key={portfolio} variant="outline" className="gap-1">
                Portfolio: {portfolio}
                <X className="h-3 w-3 cursor-pointer" onClick={() => removeFilter("portfolios", portfolio)} />
              </Badge>
            ))}
            {filters.applications.map((app) => (
              <Badge key={app} variant="outline" className="gap-1">
                App: {app}
                <X className="h-3 w-3 cursor-pointer" onClick={() => removeFilter("applications", app)} />
              </Badge>
            ))}
            {filters.zones.map((zone) => (
              <Badge key={zone} variant="outline" className="gap-1">
                Zone: {zone}
                <X className="h-3 w-3 cursor-pointer" onClick={() => removeFilter("zones", zone)} />
              </Badge>
            ))}
            {filters.environment && (
              <Badge variant="outline" className="gap-1">
                Environment: {filters.environment}
                <X className="h-3 w-3 cursor-pointer" onClick={() => removeFilter("environment")} />
              </Badge>
            )}
            {filters.deploymentStatus && (
              <Badge variant="outline" className="gap-1">
                Status: {filters.deploymentStatus}
                <X className="h-3 w-3 cursor-pointer" onClick={() => removeFilter("deploymentStatus")} />
              </Badge>
            )}
            {filters.dateRange.from && (
              <Badge variant="outline" className="gap-1">
                Date: {format(filters.dateRange.from, "MMM dd")}
                {filters.dateRange.to && ` - ${format(filters.dateRange.to, "MMM dd")}`}
                <X className="h-3 w-3 cursor-pointer" onClick={() => removeFilter("dateRange")} />
              </Badge>
            )}
          </div>
        )}

        {/* Expanded Filters */}
        {isExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
            {/* Portfolio Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Portfolios</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    {filters.portfolios.length > 0 ? `${filters.portfolios.length} selected` : "Select portfolios"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-0">
                  <Command>
                    <CommandInput placeholder="Search portfolios..." />
                    <CommandList>
                      <CommandEmpty>No portfolios found.</CommandEmpty>
                      <CommandGroup>
                        {clientPortfolios.map((p) => {
                          const label = portfolioLabel(p);
                          const value = portfolioValue(p);
                          return (
                            <CommandItem key={`p:${value}`}>
                              <Checkbox
                                checked={filters.portfolios.includes(value)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    updateFilters({ portfolios: [...filters.portfolios, value] });
                                  } else {
                                    updateFilters({ portfolios: filters.portfolios.filter((x) => x !== value) });
                                  }
                                }}
                                className="mr-2"
                              />
                              {label}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Application Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Applications</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    {filters.applications.length > 0 ? `${filters.applications.length} selected` : "Select applications"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-0">
                  <Command>
                    <CommandInput placeholder="Search applications..." />
                    <CommandList>
                      <CommandEmpty>No applications found.</CommandEmpty>
                      <CommandGroup>
                        {clientApplications.map((a) => {
                          const label = applicationLabel(a);
                          const value = applicationValue(a);
                          return (
                            <CommandItem key={`a:${value}`}>
                              <Checkbox
                                checked={filters.applications.includes(value)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    updateFilters({ applications: [...filters.applications, value] });
                                  } else {
                                    updateFilters({ applications: filters.applications.filter((x) => x !== value) });
                                  }
                                }}
                                className="mr-2"
                              />
                              {label}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Zone Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Zones</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    {filters.zones.length > 0 ? `${filters.zones.length} selected` : "Select zones"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-0">
                  <Command>
                    <CommandInput placeholder="Search zones..." />
                    <CommandList>
                      <CommandEmpty>No zones found.</CommandEmpty>
                      <CommandGroup>
                        {clientZones.map((z) => {
                          const label = zoneLabel(z);
                          const value = zoneValue(z);
                          const env = z.account_facts?.environment;
                          return (
                            <CommandItem key={`z:${z.client}/${value}`}>
                              <Checkbox
                                checked={filters.zones.includes(value)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    updateFilters({ zones: [...filters.zones, value] });
                                  } else {
                                    updateFilters({ zones: filters.zones.filter((x) => x !== value) });
                                  }
                                }}
                                className="mr-2"
                              />
                              {label} {env ? `(${env})` : ""}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Date Range Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateRange.from ? (
                      filters.dateRange.to ? (
                        <>
                          {format(filters.dateRange.from, "LLL dd")} - {format(filters.dateRange.to, "LLL dd")}
                        </>
                      ) : (
                        format(filters.dateRange.from, "LLL dd")
                      )
                    ) : (
                      "Pick date range"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    defaultMonth={filters.dateRange.from}
                    selected={{
                      from: filters.dateRange.from,
                      to: filters.dateRange.to,
                    }}
                    onSelect={(range) => {
                      updateFilters({
                        dateRange: {
                          from: range?.from,
                          to: range?.to,
                        },
                      });
                    }}
                    numberOfMonths={2}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Environment Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Environment</label>
              <Select value={filters.environment} onValueChange={(value) => updateFilters({ environment: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select environment" />
                </SelectTrigger>
                <SelectContent>
                  {environments.map((env) => (
                    <SelectItem key={env} value={env}>
                      {env}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Deployment Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Deployment Status</label>
              <Select
                value={filters.deploymentStatus}
                onValueChange={(value) => updateFilters({ deploymentStatus: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {deploymentStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.replace("-", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}