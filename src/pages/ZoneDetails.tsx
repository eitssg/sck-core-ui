import { useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Edit, Trash2, Globe, Key, Network, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
import { useReduxData } from "@/hooks/useReduxData";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/hooks/useTheme";
import type { Zone, Client } from "@/store/types";

const ZoneDetails = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isDark } = useTheme();

  // Route params: support /zones/:zone and legacy /zones/:id
  const { client: clientParam, zone: zoneParam, id: idParam } = useParams<{
    client?: string;
    zone?: string;
    id?: string;
  }>();
  const zoneSlug = zoneParam ?? idParam ?? null;

  // Redux data/actions
  const { zones, clients, selectedClient, removeZone } = useReduxData();

  const allZones = Array.isArray(zones) ? (zones as Zone[]) : ([] as Zone[]);
  const clientItems = Array.isArray((clients as any)?.items) ? ((clients as any).items as Client[]) : ([] as Client[]);
  const effectiveClient = clientParam ?? (typeof selectedClient === "string" ? selectedClient : null);

  const zone = useMemo(() => {
    if (!zoneSlug) return null;
    const matches = allZones.filter((z) => z.zone === zoneSlug);
    if (matches.length === 0) return null;
    if (effectiveClient) {
      return matches.find((z) => z.client === effectiveClient) ?? matches[0];
    }
    return matches[0];
  }, [allZones, zoneSlug, effectiveClient]);

  const client = useMemo(
    () => (zone ? clientItems.find((c) => c.client === zone.client) ?? null : null),
    [clientItems, zone]
  );

  const handleDelete = () => {
    if (!zone) return;
    removeZone({ client: zone.client, zone: zone.zone });
    toast({
      title: "Zone deleted",
      description: `Zone ${zone.zone} has been deleted successfully.`,
    });
    navigate("/zones");
  };

  if (!zone) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/zones">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Zones
            </Link>
          </Button>
        </div>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold">Zone not found</h2>
          <p className="text-muted-foreground">The zone you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const af = zone.account_facts;
  const env = af?.environment ?? "unknown";
  const kms = af?.kms;
  const vpcs = af?.vpc_aliases ?? [];
  const subnets = af?.subnet_aliases ?? [];
  const ns = af?.resource_namespace;
  const allTags = {
    ...(zone.tags ?? {}),
    ...(af?.tags ?? {}),
  } as Record<string, any>;

  return (
    <div className="space-y-6">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/zones">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Zones
            </Link>
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant={isDark ? "secondary" : "outline"} asChild>
            <Link to={`/zones/${zone.zone}/edit${zone.client ? `?client=${zone.client}` : ""}`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Zone
            </Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Zone
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Zone</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete the zone “{zone.zone}”? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Zone info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Zone Information
          </CardTitle>
          <CardDescription>Core attributes and AWS account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Client</label>
              <p className="text-sm">{client?.client_name || client?.client || zone.client}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Zone</label>
              <p className="text-sm font-mono">{zone.zone}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Environment</label>
              <Badge variant={env === "production" ? "destructive" : "secondary"}>{env}</Badge>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">AWS Account ID</label>
              <p className="text-sm font-mono">{af?.aws_account_id || "—"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Account Name</label>
              <p className="text-sm">{af?.account_name || "—"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Organizational Unit</label>
              <p className="text-sm">{af?.organizational_unit || "—"}</p>
            </div>
            {ns && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Resource Namespace</label>
                <p className="text-sm">{ns}</p>
              </div>
            )}
          </div>
          <Separator />
          <div>
            <label className="text-sm font-medium text-muted-foreground">Regions</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.keys(zone.region_facts || {}).length > 0 ? (
                Object.keys(zone.region_facts).map((r) => (
                  <Badge key={r} variant="outline">
                    {r}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No regions configured</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KMS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            KMS Configuration
          </CardTitle>
          <CardDescription>Keys and delegated accounts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {kms?.kms_key_arn || kms?.kms_key ? (
            <>
              {kms.kms_key_arn && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">KMS Key ARN</label>
                  <p className="text-sm font-mono break-all">{kms.kms_key_arn}</p>
                </div>
              )}
              {kms.kms_key && !kms.kms_key_arn && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">KMS Key</label>
                  <p className="text-sm font-mono break-all">{kms.kms_key}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Delegated AWS Accounts</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(kms.delegate_aws_account_ids ?? []).length > 0 ? (
                    kms.delegate_aws_account_ids.map((acct) => (
                      <Badge key={acct} variant="outline">
                        {acct}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">None</p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No KMS configuration</p>
          )}
        </CardContent>
      </Card>

      {/* Networking aliases */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5" />
              VPC Aliases
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {vpcs.length > 0 ? (
                vpcs.map((v) => (
                  <Badge key={v} variant="outline">
                    {v}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No VPC aliases</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5" />
              Subnet Aliases
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {subnets.length > 0 ? (
                subnets.map((s) => (
                  <Badge key={s} variant="outline">
                    {s}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No subnet aliases</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tags */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Tags
          </CardTitle>
        </CardHeader>
        <CardContent>
          {allTags && Object.keys(allTags).length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {Object.entries(allTags).map(([k, v]) => (
                <Badge key={k} variant="secondary">
                  {k}: {String(v)}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No tags</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ZoneDetails;