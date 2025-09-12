import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { selectIsAuthenticated } from "@/store/slices/authSlice";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { buildApiUrl, getAuthHeaders, API_CONFIG } from "@/lib/api-config";
import { useReduxData } from "@/hooks/useReduxData";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/hooks/use-toast";

import type { Application, Portfolio, Zone } from "@/store/types";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  ArrowLeft,
  Globe,
  Package2,
  Plus,
  Settings2,
  Sparkles,
  Tag,
  GitBranch,
} from "lucide-react";

const envOptions = ["development", "staging", "testing", "production"] as const;

const schema = z.object({
  client: z.string().min(1, "Client is required"),
  portfolio: z.string().min(1, "Portfolio is required"),
  name: z.string().min(2, "Name is required"),
  slug: z
    .string()
    .min(2, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and dashes"),
  app_regex: z
    .string()
    .min(2, "Regex is required")
    .regex(/^\^.*$/, "Regex should typically start with ^"),
  environment: z.enum(envOptions),
  region: z.string().min(2, "Region is required"),
  zone: z.string().min(1, "Zone is required"),
  repository: z.string().optional(),
  enforce_validation: z.enum(["true", "false"]).default("true"),
  image_aliases: z.record(z.string()).default({}),
  tags: z.record(z.string()).default({}),
  description: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

function slugify(v: string) {
  return v.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function CreateApplication() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isDark } = useTheme();
  const { toast } = useToast();

  // Auth guard
  const isAuthenticated = useSelector((s: RootState) => selectIsAuthenticated(s));
  useEffect(() => {
    if (!isAuthenticated) navigate("/login", { replace: true });
  }, [isAuthenticated, navigate]);

  // Redux-backed data
  const { selectedClient, portfolios, zones, actions } = useReduxData();

  // Current client from selection only (do not read from URL)
  const currentClient = useMemo(
    () => (typeof selectedClient === "string" ? selectedClient : ""),
    [selectedClient]
  );

  // Load portfolios for current client (unconditional hook)
  useEffect(() => {
    if (!currentClient) return;
    if (portfolios.currentClient !== currentClient) {
      actions.portfolios.setCurrentClient(currentClient);
    }
    if (portfolios.status === "idle" || portfolios.currentClient !== currentClient) {
      actions.portfolios.fetch(currentClient, { force: false });
    }
  }, [currentClient, portfolios.status, portfolios.currentClient, actions.portfolios]);

  // Lists
  const portfoliosList = useMemo<Portfolio[]>(
    () => (Array.isArray((portfolios as any)?.items) ? ((portfolios as any).items as Portfolio[]) : []),
  [portfolios]
  );
  const clientPortfolios = useMemo(() => portfoliosList, [portfoliosList]);

  const zonesList = useMemo<Zone[]>(
    () => (Array.isArray(zones) ? (zones as Zone[]) : []),
    [zones]
  );
  const clientZones = useMemo(() => zonesList, [zonesList]);

  // Regions derived from zones (keys of region_facts)
  const regionOptions = useMemo(() => {
    const set = new Set<string>();
    clientZones.forEach((z) => Object.keys(z.region_facts || {}).forEach((r) => set.add(r)));
    return Array.from(set.size ? set : new Set(["us-east-1", "us-west-2", "eu-west-1"]));
  }, [clientZones]);

  // Form
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      client: currentClient,
      portfolio: searchParams.get("portfolio") || "",
      name: "",
      slug: "",
      app_regex: "",
      environment: "development",
      region: regionOptions[0] || "us-east-1",
      zone: searchParams.get("zone") || "",
      repository: "",
      enforce_validation: "true",
      image_aliases: {},
      tags: {},
      description: "",
    },
    mode: "onChange",
  });

  // Keep client default in sync when url/selection changes
  useEffect(() => {
    if (currentClient && form.getValues("client") !== currentClient) {
      form.setValue("client", currentClient, { shouldDirty: false });
    }
  }, [currentClient, form]);

  // If zone changes, pre-fill environment if available
  const zoneValue = form.watch("zone");
  useEffect(() => {
    const z = clientZones.find((cz) => cz.zone === zoneValue);
    const env = z?.account_facts?.environment;
    if (env && (envOptions as readonly string[]).includes(env)) {
      form.setValue("environment", env as FormData["environment"], { shouldDirty: true });
    }
  }, [zoneValue, clientZones, form]);

  // Auto-derive slug/app_regex from name until user edits slug manually
  const slugEditedRef = useRef(false);
  const nameValue = form.watch("name");
  const slugValue = form.watch("slug");
  useEffect(() => {
    if (!nameValue) return;
    if (!slugEditedRef.current) {
      const s = slugify(nameValue);
      form.setValue("slug", s, { shouldDirty: true, shouldValidate: true });
      if (!form.getValues("app_regex")) {
        form.setValue("app_regex", `^${s}.*$`, { shouldDirty: true, shouldValidate: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nameValue]);

  useEffect(() => {
    if (slugValue) slugEditedRef.current = true;
  }, [slugValue]);

  const onSubmit = async (data: FormData) => {
    const payload: Application = {
      portfolio: data.portfolio,
      app_regex: data.app_regex,
      name: data.name || undefined,
      environment: data.environment,
      region: data.region,
      zone: data.zone,
      repository: data.repository || undefined,
      enforce_validation: data.enforce_validation,
      image_aliases: Object.keys(data.image_aliases).length ? data.image_aliases : undefined,
      tags: Object.keys(data.tags).length ? data.tags : undefined,
      metadata: data.description ? { description: data.description } : undefined,
    };

    try {
  const url = `${buildApiUrl(API_CONFIG.ENDPOINTS.API.APPLICATIONS)}`;
      const res = await fetch(url, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        let msg = `Failed to create application (HTTP ${res.status})`;
        try {
          const j = await res.json();
          msg = j?.message || msg;
        } catch {
          // ignore
        }
        throw new Error(msg);
      }

      toast({
        title: "Application created",
        description: `"${data.name}" was added to ${data.portfolio}.`,
      });
      navigate("/applications");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Create failed";
      toast({ title: "Create failed", description: msg, variant: "destructive" });
    }
  };

  // Subcomponent: simple key/value editor for maps
  function KeyValueEditor({
    label,
    values,
    onChange,
    placeholderKey = "key",
    placeholderValue = "value",
    icon,
  }: {
    label: string;
    values: Record<string, string>;
    onChange: (next: Record<string, string>) => void;
    placeholderKey?: string;
    placeholderValue?: string;
    icon?: React.ReactNode;
  }) {
    const [k, setK] = useState("");
    const [v, setV] = useState("");
    const keyRef = useRef<HTMLInputElement>(null);

    const add = () => {
      const key = k.trim();
      const val = v.trim();
      if (!key || !val) return;
      if (values[key] === val) return;
      onChange({ ...values, [key]: val });
      setK("");
      setV("");
      keyRef.current?.focus();
    };

    const remove = (rk: string) => {
      const { [rk]: _, ...rest } = values;
      onChange(rest);
    };

    return (
      <div className="space-y-2">
        <FormLabel className="text-sm flex items-center gap-2">
          {icon}
          {label}
        </FormLabel>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Input
            ref={keyRef}
            placeholder={placeholderKey}
            value={k}
            onChange={(e) => setK(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
          />
          <Input
            placeholder={placeholderValue}
            value={v}
            onChange={(e) => setV(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
          />
          <Button type="button" variant="outline" onClick={add} className="gap-2">
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(values).length === 0 && (
            <div className="text-xs text-muted-foreground">No items added</div>
          )}
          {Object.entries(values).map(([key, val]) => (
            <Badge key={key} variant="secondary" className="gap-2">
              <span className="font-mono">{key}</span>
              <span className="opacity-70">=</span>
              <span className="font-mono">{val}</span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-4 w-4 p-0"
                onClick={() => remove(key)}
                aria-label={`Remove ${key}`}
              >
                ×
              </Button>
            </Badge>
          ))}
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !currentClient) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Ambient header with theme accents */}
      <div className="relative overflow-hidden rounded-xl border bg-card/80 shadow-medium">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -left-20 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute -bottom-24 -right-20 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
        </div>
        <div className="relative flex items-center justify-between p-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-medium flex items-center justify-center">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Create Application</h1>
              <p className="text-sm text-muted-foreground">
                Onboard a new application into your portfolio
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/applications">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Applications
            </Link>
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package2 className="h-5 w-5 text-primary" />
                Application Details
              </CardTitle>
              <CardDescription>Core identifiers and placement</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {/* Client (read-only) */}
              <FormField
                control={form.control}
                name="client"
                render={() => (
                  <FormItem>
                    <FormLabel>Client</FormLabel>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono">{currentClient}</Badge>
                      <span className="text-xs text-muted-foreground">From header context</span>
                    </div>
                    <FormDescription>The application will be created under this client.</FormDescription>
                  </FormItem>
                )}
              />

              {/* Portfolio */}
              <FormField
                control={form.control}
                name="portfolio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Portfolio</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select portfolio" />
                      </SelectTrigger>
                      <SelectContent>
                        {clientPortfolios.map((p) => (
                          <SelectItem key={`${p.client}/${p.portfolio}`} value={p.portfolio}>
                            {p.project?.name || p.portfolio}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Application Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Order Service" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Slug + Regex */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:col-span-2">
                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slug</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="order-service"
                          {...field}
                          onChange={(e) => {
                            slugEditedRef.current = true;
                            field.onChange(e);
                          }}
                        />
                      </FormControl>
                      <FormDescription>Used for app_regex and identifiers</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="app_regex"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Application Regex</FormLabel>
                      <FormControl>
                        <Input placeholder="^order-service.*$" {...field} />
                      </FormControl>
                      <FormDescription>Regex to match deployment names for this app</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Placement */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                Environment & Placement
              </CardTitle>
              <CardDescription>Environment, region, and zone</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              {/* Environment */}
              <FormField
                control={form.control}
                name="environment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Environment</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select environment" />
                      </SelectTrigger>
                      <SelectContent>
                        {envOptions.map((env) => (
                          <SelectItem key={env} value={env}>
                            {env}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Region */}
              <FormField
                control={form.control}
                name="region"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Region</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select region" />
                      </SelectTrigger>
                      <SelectContent>
                        {regionOptions.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Zone */}
              <FormField
                control={form.control}
                name="zone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zone</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select zone" />
                      </SelectTrigger>
                      <SelectContent>
                        {clientZones.map((z) => (
                          <SelectItem key={`${z.client}/${z.zone}`} value={z.zone}>
                            {z.zone} {z.account_facts?.environment ? `(${z.account_facts.environment})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Advanced */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-primary" />
                Advanced Settings
              </CardTitle>
              <CardDescription>Repository, validation, aliases, and tags</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Repository + validation */}
              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="repository"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Repository URL (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://github.com/org/repo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="enforce_validation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Enforce Validation</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">True</SelectItem>
                          <SelectItem value="false">False</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>Require validation before releases</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Image Aliases */}
              <FormField
                control={form.control}
                name="image_aliases"
                render={({ field }) => (
                  <FormItem>
                    <KeyValueEditor
                      label="Image Aliases"
                      values={(field.value || {}) as Record<string, string>}
                      onChange={(next) => field.onChange(next)}
                      placeholderKey="alias (e.g., app)"
                      placeholderValue="image:tag"
                      icon={<GitBranch className="h-4 w-4 text-primary" />}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Tags */}
              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <KeyValueEditor
                      label="Tags"
                      values={(field.value || {}) as Record<string, string>}
                      onChange={(next) => field.onChange(next)}
                      placeholderKey="key"
                      placeholderValue="value"
                      icon={<Tag className="h-4 w-4 text-primary" />}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (optional)</FormLabel>
                    <FormControl>
                      <Textarea rows={3} placeholder="Describe this application’s purpose" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/applications">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Cancel
              </Link>
            </Button>
            <div className="flex items-center gap-3">
              <Separator className="hidden md:block w-32" />
              <Button type="submit" disabled={!form.formState.isValid || form.formState.isSubmitting} variant={isDark ? "secondary" : "default"}>
                {form.formState.isSubmitting ? "Creating..." : "Create Application"}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}