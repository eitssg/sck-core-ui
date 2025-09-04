import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  Sparkles,
  Globe,
  Key,
  Network,
  Tags as TagsIcon,
  Plus,
  X,
} from "lucide-react";

import type { RootState } from "@/store";
import { selectIsAuthenticated } from "@/store/slices/authSlice";

import { useReduxData } from "@/hooks/useReduxData";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/hooks/useTheme";

import { API_CONFIG, buildApiUrl, getAuthHeaders } from "@/lib/api-config";
import type { Zone, Client } from "@/store/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";

const zoneSchema = z.object({
  // Client context
  client: z.string().min(1, "Client is required"),

  // Zone key
  zone: z.string().min(2, "Zone identifier is required"),

  // Account facts
  environment: z.enum(["production", "staging", "development", "testing"]).default("development"),
  organizational_unit: z.string().min(1, "Organizational unit is required"),
  aws_account_id: z.string().regex(/^\d{12}$/, "AWS Account ID must be 12 digits"),
  account_name: z.string().min(1, "Account name is required"),
  resource_namespace: z.string().optional().or(z.literal("")),

  // KMS (optional)
  kms_key_arn: z.string().optional().or(z.literal("")),
  kms_key: z.string().optional().or(z.literal("")),
  delegate_aws_account_ids: z.array(z.string().regex(/^\d{12}$/, "Must be a 12-digit AWS account ID")).default([]),

  // Networking aliases
  vpc_aliases: z.array(z.string()).default([]),
  subnet_aliases: z.array(z.string()).default([]),

  // Tags
  tags: z.record(z.string(), z.string()).default({}),

  // Notes (local only)
  notes: z.string().optional().or(z.literal("")),
});

type ZoneFormData = z.infer<typeof zoneSchema>;

// Utility chip input subcomponent
function ChipList({
  label,
  values,
  onAdd,
  onRemove,
  placeholder,
  inputRef,
}: {
  label: string;
  values: string[];
  onAdd: (v: string) => void;
  onRemove: (v: string) => void;
  placeholder: string;
  inputRef?: React.RefObject<HTMLInputElement>;
}) {
  const [value, setValue] = useState("");

  const addValue = () => {
    const v = value.trim();
    if (!v) return;
    if (!values.includes(v)) onAdd(v);
    setValue("");
    if (inputRef?.current) inputRef.current.focus();
  };

  return (
    <div className="space-y-2">
      <FormLabel className="text-sm">{label}</FormLabel>
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addValue();
            }
          }}
        />
        <Button type="button" variant="outline" onClick={addValue} className="gap-2">
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {values.map((v) => (
          <Badge key={v} variant="secondary" className="flex items-center gap-1">
            {v}
            <X className="h-3 w-3 cursor-pointer" onClick={() => onRemove(v)} />
          </Badge>
        ))}
        {values.length === 0 && <div className="text-xs text-muted-foreground">No items added</div>}
      </div>
    </div>
  );
}

export default function CreateZone() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isDark } = useTheme();
  const [searchParams] = useSearchParams();

  // Auth guard via authSlice
  const isAuthenticated = useSelector((s: RootState) => selectIsAuthenticated(s));
  useEffect(() => {
    if (!isAuthenticated) navigate("/login", { replace: true });
  }, [isAuthenticated, navigate]);

  // Redux-backed data
  const { clients, selectedClient, actions } = useReduxData();

  // Load clients if idle
  useEffect(() => {
    if (clients.status === "idle") actions.clients.fetch({ limit: 100 });
  }, [clients.status, actions.clients]);

  const clientItems = useMemo<Client[]>(
    () => (Array.isArray((clients as any)?.items) ? ((clients as any).items as Client[]) : []),
    [clients?.items]
  );

  // Default client from selected or URL ?client=
  const urlClient = searchParams.get("client");
  const defaultClient = urlClient || (typeof selectedClient === "string" ? selectedClient : "");

  // Form
  const form = useForm<ZoneFormData>({
    resolver: zodResolver(zoneSchema),
    defaultValues: {
      client: defaultClient,
      zone: "",
      environment: "development",
      organizational_unit: "",
      aws_account_id: "",
      account_name: "",
      resource_namespace: "",
      kms_key_arn: "",
      kms_key: "",
      delegate_aws_account_ids: [],
      vpc_aliases: [],
      subnet_aliases: [],
      tags: {},
      notes: "",
    },
    mode: "onChange",
  });

  // Keep form client in sync with selectedClient if not fixed by URL
  useEffect(() => {
    if (!urlClient && typeof selectedClient === "string" && form.getValues("client") !== selectedClient) {
      form.setValue("client", selectedClient);
    }
  }, [selectedClient, urlClient, form]);

  const addingVpcRef = useRef<HTMLInputElement>(null);
  const addingSubnetRef = useRef<HTMLInputElement>(null);
  const addingDelegateRef = useRef<HTMLInputElement>(null);

  const onSubmit = async (data: ZoneFormData) => {
    const zonePayload: Zone = {
      client: data.client,
      zone: data.zone,
      account_facts: {
        organizational_unit: data.organizational_unit,
        aws_account_id: data.aws_account_id,
        account_name: data.account_name,
        environment: data.environment,
        resource_namespace: data.resource_namespace || undefined,
        vpc_aliases: data.vpc_aliases,
        subnet_aliases: data.subnet_aliases,
        kms:
          data.kms_key_arn || data.kms_key || data.delegate_aws_account_ids.length > 0
            ? {
                aws_account_id: data.aws_account_id,
                kms_key_arn: data.kms_key_arn || undefined,
                kms_key: data.kms_key || undefined,
                delegate_aws_account_ids: data.delegate_aws_account_ids,
              }
            : undefined,
        tags: Object.keys(data.tags).length ? (data.tags as Record<string, any>) : undefined,
      },
      region_facts: {}, // optional initially
      tags: Object.keys(data.tags).length ? (data.tags as Record<string, any>) : undefined,
    };

    try {
      const res = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.API.ZONES), {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(zonePayload),
      });

      if (!res.ok) {
        let msg = `Failed to create zone (HTTP ${res.status})`;
        try {
          const j = await res.json();
          msg = j?.message || msg;
        } catch {
          // ignore
        }
        toast({ title: "Create failed", description: msg, variant: "destructive" });
        return;
      }

      toast({
        title: "Zone created",
        description: `Zone ${data.zone} for client ${data.client} was created.`,
      });

      // Optimistically update zones slice if desired
      // dispatch({ type: "zones/addZone", payload: zonePayload })

      // Navigate to details
      navigate(`/zones/${encodeURIComponent(data.zone)}?client=${encodeURIComponent(data.client)}`);
    } catch (err) {
      toast({
        title: "Network error",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const [tagKey, setTagKey] = useState("");
  const [tagValue, setTagValue] = useState("");

  const addTag = () => {
    const k = tagKey.trim();
    const v = tagValue.trim();
    if (!k || !v) return;
    const current = form.getValues("tags");
    if (current[k]) return; // skip duplicates
    form.setValue("tags", { ...current, [k]: v }, { shouldDirty: true });
    setTagKey("");
    setTagValue("");
  };

  const removeTag = (key: string) => {
    const next = { ...form.getValues("tags") };
    delete next[key];
    form.setValue("tags", next, { shouldDirty: true });
  };

  const canSubmit = form.formState.isValid && form.formState.isDirty;

  if (!isAuthenticated) return null;

  return (
    <div className="space-y-6">
      {/* Ambient backdrop */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 h-40 w-[40rem] rounded-[999px] bg-gradient-to-r from-primary/10 to-primary-light/10 blur-2xl" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/zones">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Zones
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-medium flex items-center justify-center">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Create Zone</h1>
            <p className="text-sm text-muted-foreground">Provision a new zone for your client</p>
          </div>
        </div>
        <div />
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                Basic Information
              </CardTitle>
              <CardDescription>Client context, zone identifier, and environment</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="client"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a client" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clientItems.map((c) => (
                          <SelectItem key={c.client} value={c.client}>
                            {c.client_name || c.client}
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
                name="zone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zone Identifier</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., prod-core, dev-shared" {...field} />
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
                    <Select value={field.value} onValueChange={field.onChange}>
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

              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (optional)</FormLabel>
                      <FormControl>
                        <Textarea rows={3} placeholder="Describe the purpose of this zone..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* AWS Account Facts */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                AWS Account Facts
              </CardTitle>
              <CardDescription>Account metadata used by automation</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="organizational_unit"
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
                name="aws_account_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>AWS Account ID</FormLabel>
                    <FormControl>
                      <Input placeholder="123456789012" inputMode="numeric" maxLength={12} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="account_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Name</FormLabel>
                    <FormControl>
                      <Input placeholder="prod-account, dev-shared, ..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="resource_namespace"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resource Namespace (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., prod, dev, core" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* KMS */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" />
                KMS Configuration (optional)
              </CardTitle>
              <CardDescription>Encryption keys and delegated accounts</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="kms_key_arn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>KMS Key ARN</FormLabel>
                    <FormControl>
                      <Input placeholder="arn:aws:kms:region:acct:key/..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="md:col-span-1">
                <div className="text-xs text-muted-foreground mt-7">
                  Provide either KMS Key ARN or Key ID. Leave blank if not applicable.
                </div>
              </div>

              <FormField
                control={form.control}
                name="kms_key"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>KMS Key ID (alternative)</FormLabel>
                    <FormControl>
                      <Input placeholder="key-id-or-alias" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="delegate_aws_account_ids"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <ChipList
                      label="Delegated AWS Account IDs"
                      values={field.value || []}
                      onAdd={(v) => field.onChange([...(field.value || []), v])}
                      onRemove={(v) => field.onChange((field.value || []).filter((x: string) => x !== v))}
                      placeholder="Enter 12-digit AWS account ID and press Enter"
                      inputRef={addingDelegateRef}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Networking */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="h-5 w-5 text-primary" />
                Networking Aliases
              </CardTitle>
              <CardDescription>Aliases used by automation to locate resources</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="vpc_aliases"
                render={({ field }) => (
                  <FormItem>
                    <ChipList
                      label="VPC Aliases"
                      values={field.value || []}
                      onAdd={(v) => field.onChange([...(field.value || []), v])}
                      onRemove={(v) => field.onChange((field.value || []).filter((x: string) => x !== v))}
                      placeholder="Add VPC alias and press Enter"
                      inputRef={addingVpcRef}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="subnet_aliases"
                render={({ field }) => (
                  <FormItem>
                    <ChipList
                      label="Subnet Aliases"
                      values={field.value || []}
                      onAdd={(v) => field.onChange([...(field.value || []), v])}
                      onRemove={(v) => field.onChange((field.value || []).filter((x: string) => x !== v))}
                      placeholder="Add subnet alias and press Enter"
                      inputRef={addingSubnetRef}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Tags */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TagsIcon className="h-5 w-5 text-primary" />
                Tags
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div className="md:col-span-1">
                  <FormLabel>Key</FormLabel>
                  <Input
                    placeholder="e.g., owner"
                    value={tagKey}
                    onChange={(e) => setTagKey(e.target.value)}
                  />
                </div>
                <div className="md:col-span-1">
                  <FormLabel>Value</FormLabel>
                  <Input
                    placeholder="e.g., platform-team"
                    value={tagValue}
                    onChange={(e) => setTagValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                  />
                </div>
                <div className="md:col-span-1 flex items-end">
                  <Button type="button" onClick={addTag} className="w-full gap-2">
                    <Plus className="h-4 w-4" /> Add Tag
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="flex flex-wrap gap-2">
                {Object.entries(form.watch("tags")).map(([k, v]) => (
                  <Badge key={k} variant="secondary" className="flex items-center gap-1">
                    {k}: {v}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => removeTag(k)} />
                  </Badge>
                ))}
                {Object.keys(form.watch("tags")).length === 0 && (
                  <div className="text-xs text-muted-foreground">No tags added</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" asChild>
              <Link to="/zones">Cancel</Link>
            </Button>
            <Button type="submit" disabled={!canSubmit} variant={isDark ? "secondary" : "default"}>
              Create Zone
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}