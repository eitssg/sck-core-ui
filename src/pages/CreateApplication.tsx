import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { Plus, Code, Braces, Save, ArrowLeft } from "lucide-react";
import EnvBadge from "@/components/ui/env-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useReduxData } from "@/hooks/useReduxData";
import type { RootState } from "@/store";
import type { Zone } from "@/store/types";
import { useAppDispatch } from "@/store";
import { fetchZonesPage, fetchZoneByKey } from "@/store/slices/zonesSlice";
import { createApplication, fetchApplications, patchPortfolioAppCount } from "@/store/slices/applicationsSlice";
import { appDetailsPath } from "@/lib/routes";
import { useToast } from "@/hooks/use-toast";

function slugify(input: string) {
  return (input || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\-\s]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function CreateApplication() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const { portfolio: routePortfolio } = useParams<{ portfolio: string }>();
  const { selectedClient } = useReduxData();
  const currentClient = typeof selectedClient === "string" ? selectedClient : null;

  const zonesList = useSelector((s: RootState) => (s as any)?.zones?.zones ?? []) as Zone[];

  const [name, setName] = useState("");
  const [zone, setZone] = useState("");
  const [region, setRegion] = useState("");
  const [appRegex, setAppRegex] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Load zones if missing
  useEffect(() => {
    if (!currentClient) return;
    if (!Array.isArray(zonesList) || zonesList.length === 0) {
      dispatch(fetchZonesPage({ client: currentClient, limit: 200, append: false }) as any);
    }
  }, [currentClient, zonesList, dispatch]);

  // When zone changes, ensure full zone is loaded and pick default region
  const selectedZone = useMemo(() => (zonesList || []).find((z) => z.zone === zone) || null, [zonesList, zone]);
  useEffect(() => {
    if (!currentClient || !zone) return;
    if (!selectedZone || !selectedZone.region_facts) {
      dispatch(fetchZoneByKey({ client: currentClient, zone }) as any);
    }
  }, [currentClient, zone, selectedZone, dispatch]);

  const regions = useMemo(() => Object.keys(selectedZone?.region_facts || {}), [selectedZone]);
  // Keep region selection in sync with selected zone's available aliases
  useEffect(() => {
    // If no regions available for selected zone, clear region
    if (!regions || regions.length === 0) {
      if (region) setRegion("");
      return;
    }
    // If current region is empty or not valid for this zone, select the first alias
    if (!region || !regions.includes(region)) {
      setRegion(regions[0]);
    }
  }, [regions, region]);

  // Build PRN-based default regex: ^prn:{portfolio}:{app}:.*:.*
  const [regexEdited, setRegexEdited] = useState(false);
  const portfolioSlug = routePortfolio || "";
  useEffect(() => {
    if (!portfolioSlug) return;
    if (regexEdited) return; // don't override manual edits
    const appPart = name ? slugify(name) : "*";
    const rawEnv = (selectedZone as any)?.account_facts?.environment
      ? String((selectedZone as any).account_facts.environment).toLowerCase()
      : "";
    const envKey = ["production","prod","prd"].includes(rawEnv)
      ? "prd"
      : ["nonprod","non-production","non production","nprod","nprd"].includes(rawEnv)
      ? "nprd"
      : ["dev","development"].includes(rawEnv)
      ? "dev"
      : "*";
    const next = `^prn:${portfolioSlug}:${appPart}:${envKey}:*`;
    if (!appRegex || appRegex.startsWith('^prn:')) {
      setAppRegex(next);
    }
  }, [name, portfolioSlug, regexEdited, appRegex, selectedZone]);

  const canSubmit = !!currentClient && !!routePortfolio && !!zone && !!region && !!appRegex;

  const onCancel = () => {
    if (routePortfolio) navigate(`/portfolios/${encodeURIComponent(routePortfolio)}`);
    else navigate(-1);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !currentClient || !routePortfolio) return;
    try {
      setSubmitting(true);
      // POST to create — backend generates slug and returns it
      const payload: any = {
        portfolio: routePortfolio,
        app_regex: appRegex,
        name: name || undefined,
        zone,
        region,
      };
      const res: any = await dispatch(
        createApplication({ client: currentClient, portfolio: routePortfolio, payload }) as any
      );
      if (res?.meta?.requestStatus !== "fulfilled") {
        throw new Error(res?.payload || "Create failed");
      }

      // Extract returned slug from item
      const created = res?.payload?.item as any;
      const slug = created?.app || created?.slug || created?.id;

      // Refresh list and app_count, then navigate to details
      await dispatch(fetchApplications({ client: currentClient, portfolio: routePortfolio, limit: 200 }) as any);
      await dispatch(patchPortfolioAppCount({ client: currentClient, portfolio: routePortfolio }) as any);

      toast({ title: "Application created", description: created?.name || slug || "" });
      if (slug) navigate(appDetailsPath({ portfolio: routePortfolio, app: slug }));
      else navigate(`/portfolios/${encodeURIComponent(routePortfolio)}`);
    } catch (err: any) {
      toast({ title: "Create failed", description: err?.message || "Unknown error", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in px-4 sm:px-6 lg:px-8 py-8">
      <div className="mx-auto w-full max-w-lg">
        <div className="mb-4">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Create Application
            </CardTitle>
            <CardDescription>Enter basic details to create the application in this portfolio</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">App Name</Label>
                <div className="relative">
                  <Code className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="name" className="pl-10" placeholder="Payments Service" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
              </div>

              {/* Slug is generated by backend on POST; no slug field here */}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Zone *</Label>
                  <Select value={zone} onValueChange={setZone}>
                    <SelectTrigger className="pl-3">
                      <SelectValue placeholder="Select a zone" />
                    </SelectTrigger>
                    <SelectContent>
                      {(zonesList || []).map((z) => (
                        <SelectItem key={z.zone} value={z.zone}>
                          <div className="flex items-center justify-between gap-2">
                            <span>{z.zone}</span>
                            <EnvBadge zone={z} />
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {/* Environment badge already displayed alongside zone in the dropdown; redundant helper removed */}
                </div>
                <div className="space-y-2">
                  <Label>Region *</Label>
                  <Select value={region} onValueChange={setRegion} disabled={!zone || regions.length === 0}>
                    <SelectTrigger className="pl-3">
                      <SelectValue placeholder={zone ? "Select a region" : "Select zone first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {regions.map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="app_regex">Pipeline Reference Number Regex:</Label>
                <div className="relative">
                  <Braces className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="app_regex"
                    className="pl-10 font-mono"
                    placeholder={`^prn:${portfolioSlug || 'portfolio'}:*:*:*`}
                    value={appRegex}
                    onChange={(e) => {
                      setRegexEdited(true);
                      setAppRegex(e.target.value.toLowerCase());
                    }}
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Regex matches the PRN. The Pipeline Reference Number to match will be
                  {" "}
                  <span className="font-mono">prn:{portfolioSlug || 'portfolio'}:{'{app}'}:{'{branch}'}:{'{build}'}</span>.
                  Deployments are identified by PRN.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Infrastructure As Code GitOps should have a branch in your infrastructure repository for each environment. Verify the regex branch code is correct.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" className="flex-1" disabled={!canSubmit || submitting}>
                  <Save className="h-4 w-4 mr-2" />
                  {submitting ? "Creating…" : "Create Application"}
                </Button>
                <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}