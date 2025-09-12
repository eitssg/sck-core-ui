import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Save, X, Globe, Key, Network, Tag, Plus, Trash2, SquarePen, ClipboardCopy, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
// removed Badge; no longer used in Regions header
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/hooks/useTheme";
import { useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "@/store";
import { makeSelectZoneBySlug, updateZoneRemote, createZone } from "@/store/slices/zonesSlice";
import { selectSelectedClient, selectClientBySlug } from "@/store/slices/clientsSlice";
import type { Zone, AccountFacts, RegionFacts } from "@/store/types";
import { AWS_REGION_NAME_BY_CODE, AWS_REGION_AZ_COUNT } from "@/constants/aws-regions";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// --- Small inline editors -------------------------------------------------
type KV = Record<string, string>;

function KeyValueListEditor({
  value,
  onChange,
  addLabel = "Add pair",
  keyPlaceholder = "key",
  valuePlaceholder = "value",
  readOnly = false,
}: {
  value: KV | undefined;
  onChange: (next: KV) => void;
  addLabel?: string;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  readOnly?: boolean;
}) {
  const entries = Object.entries(value || {});
  const [newKey, setNewKey] = useState("");
  const [newVal, setNewVal] = useState("");
  const upsert = (k: string, v: string) => {
    const next = { ...(value || {}) } as KV;
    if (!k) return;
    if (v === "") delete next[k];
    else next[k] = v;
    onChange(next);
  };
  const remove = (k: string) => {
    const next = { ...(value || {}) } as KV;
    delete next[k];
    onChange(next);
  };
  const add = () => {
    const k = newKey.trim();
    if (!k) return;
    const v = newVal;
    const next = { ...(value || {}) } as KV;
    next[k] = v;
    onChange(next);
    setNewKey("");
    setNewVal("");
  };
  return (
    <div className="space-y-2">
      {entries.length === 0 && <p className="text-sm text-muted-foreground">No entries</p>}
      {entries.map(([k, v]) => (
        <div key={k} className="flex gap-2 items-center">
          {readOnly ? (
            <>
              <div className="w-56 text-sm contrast-value truncate" title={k}>{k}</div>
              <div className="flex-1 text-sm contrast-value break-all" title={v}>{v || '—'}</div>
            </>
          ) : (
            <>
              <Input className="w-56" value={k} onChange={(e)=>{
                const nk = e.target.value;
                const next = { ...(value || {}) } as KV;
                delete next[k];
                if (nk) next[nk] = v;
                onChange(next);
              }} />
              <Input className="flex-1" value={v} onChange={(e)=> upsert(k, e.target.value)} />
              <Button variant="ghost" size="icon" onClick={()=>remove(k)}><Trash2 className="h-4 w-4"/></Button>
            </>
          )}
        </div>
      ))}
      {!readOnly && (
        <div className="flex gap-2 items-center">
          <Input className="w-56" placeholder={keyPlaceholder} value={newKey} onChange={(e)=> setNewKey(e.target.value)} />
          <Input className="flex-1" placeholder={valuePlaceholder} value={newVal} onChange={(e)=> setNewVal(e.target.value)} />
          <Button variant="outline" size="sm" onClick={add}><Plus className="h-4 w-4 mr-1"/>{addLabel}</Button>
        </div>
      )}
    </div>
  );
}

function StringArrayEditor({ value, onChange, addLabel = "Add", placeholder = "value", readOnly = false, filter }: { value?: string[]; onChange: (next: string[])=> void; addLabel?: string; placeholder?: string; readOnly?: boolean; filter?: string; }){
  const list = value || [];
  const [draft, setDraft] = useState("");
  const add = ()=>{
    const v = draft.trim();
    if (!v) return;
    onChange([...(list||[]), v]);
    setDraft("");
  };
  const removeAt = (idx: number)=>{
    const next = [...list];
    next.splice(idx,1);
    onChange(next);
  }
  const normalizedFilter = (filter || "").trim().toLowerCase();
  const visible = normalizedFilter
    ? list.map((v, idx)=> ({ v, idx })).filter(({ v })=> v.toLowerCase().includes(normalizedFilter))
    : list.map((v, idx)=> ({ v, idx }));
  return (
    <div className="space-y-2">
      {visible.length===0 && (
        <p className="text-sm text-muted-foreground">{normalizedFilter ? 'No matches' : 'No values'}</p>
      )}
      {visible.map(({ v, idx: originalIdx })=> (
        <div key={`${v}-${originalIdx}`} className="flex items-center gap-2">
          {readOnly ? (
            <div className="flex-1 text-sm contrast-value break-all" title={v}>{v || '—'}</div>
          ) : (
            <>
              <Input className="flex-1" value={v} onChange={(e)=>{
                const next = [...list];
                next[originalIdx] = e.target.value;
                onChange(next);
              }} />
              <Button variant="ghost" size="icon" onClick={()=>removeAt(originalIdx)}><Trash2 className="h-4 w-4"/></Button>
            </>
          )}
        </div>
      ))}
      {!readOnly && (
        <div className="flex gap-2 items-center">
          <Input className="flex-1" placeholder={placeholder} value={draft} onChange={(e)=> setDraft(e.target.value)} />
          <Button variant="outline" size="sm" onClick={add}><Plus className="h-4 w-4 mr-1"/>{addLabel}</Button>
        </div>
      )}
    </div>
  );
}

// Security aliases: map<string, Array<{type,value,description?}>>
type SecurityAlias = { type: string; value: string; description?: string };
function SecurityAliasesEditor({ value, onChange, readOnly = false }: { value?: Record<string, SecurityAlias[]>; onChange: (next: Record<string, SecurityAlias[]>)=> void; readOnly?: boolean; }){
  const aliases = value || {};
  const [newName, setNewName] = useState("");
  const addGroup = ()=>{
    const k = newName.trim();
    if (!k) return;
    if (aliases[k]) return;
    onChange({ ...aliases, [k]: [] });
    setNewName("");
  }
  const addEntry = (k: string)=>{
    const next = { ...aliases } as Record<string, SecurityAlias[]>;
    next[k] = [...(next[k]||[]), { type: "", value: "", description: "" }];
    onChange(next);
  };
  const updateEntry = (k: string, idx: number, patch: Partial<SecurityAlias>)=>{
    const next = { ...aliases } as Record<string, SecurityAlias[]>;
    const row = { ...(next[k]?.[idx] || { type: "", value: "", description: "" }), ...patch };
    next[k] = [...(next[k]||[])];
    next[k][idx] = row;
    onChange(next);
  };
  const removeEntry = (k: string, idx: number)=>{
    const next = { ...aliases } as Record<string, SecurityAlias[]>;
    next[k] = [...(next[k]||[])];
    next[k].splice(idx,1);
    onChange(next);
  };
  const removeGroup = (k: string)=>{
    const next = { ...aliases } as Record<string, SecurityAlias[]>;
    delete next[k];
    onChange(next);
  };
  return (
    <div className="space-y-4">
      {Object.keys(aliases).length===0 && <p className="text-sm text-muted-foreground">No security aliases</p>}
      {Object.entries(aliases).map(([k, list])=> (
        <Card key={k}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div className="font-medium">Alias group: {k}</div>
            <div className="flex gap-2">
              {!readOnly && (
                <>
                  <Button variant="outline" size="sm" onClick={()=>addEntry(k)}><Plus className="h-4 w-4 mr-1"/>Add entry</Button>
                  <Button variant="ghost" size="sm" onClick={()=>removeGroup(k)}><Trash2 className="h-4 w-4 mr-1"/>Remove group</Button>
                </>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {list.length===0 && <p className="text-sm text-muted-foreground">No entries</p>}
            {list.map((row, idx)=> (
              <div key={`${k}-${idx}`} className="grid gap-2 md:grid-cols-3">
                {readOnly ? (
                  <>
                    <div className="text-sm contrast-value break-all" title={row.type}>{row.type || '—'}</div>
                    <div className="text-sm contrast-value break-all" title={row.value}>{row.value || '—'}</div>
                    <div className="text-sm contrast-value break-all" title={row.description}>{row.description || '—'}</div>
                  </>
                ) : (
                  <>
                    <Input placeholder="type" value={row.type} onChange={(e)=> updateEntry(k, idx, { type: e.target.value })} />
                    <Input placeholder="value" value={row.value} onChange={(e)=> updateEntry(k, idx, { value: e.target.value })} />
                    <Input placeholder="description" value={row.description || ""} onChange={(e)=> updateEntry(k, idx, { description: e.target.value })} />
                    <div className="md:col-span-3 flex justify-end"><Button variant="ghost" size="sm" onClick={()=> removeEntry(k, idx)}><Trash2 className="h-4 w-4 mr-1"/>Remove</Button></div>
                  </>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
      {!readOnly && (
        <div className="flex gap-2 items-center">
          <Input className="w-64" placeholder="new alias group name" value={newName} onChange={(e)=> setNewName(e.target.value)} />
          <Button variant="outline" size="sm" onClick={addGroup}><Plus className="h-4 w-4 mr-1"/>Add group</Button>
        </div>
      )}
    </div>
  );
}

const ZoneDetails = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isDark } = useTheme();
  const dispatch = useDispatch<AppDispatch>();

  // Route params: expect /zones/:client/:zone (we still accept legacy /zones/:zone)
  const { client: clientParam, zone: zoneParam, id: idParam } = useParams<{
    client?: string;
    zone?: string;
    id?: string;
  }>();
  const zoneSlug = zoneParam ?? idParam ?? null;
  const selectZone = useMemo(()=> makeSelectZoneBySlug(zoneSlug || ""), [zoneSlug]);
  const zone = useSelector((s: RootState)=> (zoneSlug ? selectZone(s) : null)) as Zone | null;
  const selectedClient = useSelector((s: RootState)=> selectSelectedClient(s));
  const clientObj = useSelector((s: RootState)=> selectedClient ? selectClientBySlug(s, selectedClient) : undefined) as any;

  // Local editable draft
  const [draft, setDraft] = useState<Zone | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [editing, setEditing] = useState(false);
  const [creatingNew, setCreatingNew] = useState(false);

  // Delegates: upload ref
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const [filterDelegates, setFilterDelegates] = useState("");

  // Dialog state
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [newZoneName, setNewZoneName] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(()=>{
    if (zone) setDraft(JSON.parse(JSON.stringify(zone)) as Zone);
  }, [zone]);

  const updateAccount = useCallback((patch: Partial<AccountFacts>)=>{
    setDraft((d)=> d ? ({ ...d, account_facts: { ...(d.account_facts||{}), ...patch } as AccountFacts }) : d);
  }, []);
  const updateRegionFacts = useCallback((label: string, patch: Partial<RegionFacts>)=>{
    setDraft((d)=>{
      if (!d) return d;
      const key = label.trim();
      const rf = { ...(d.region_facts || {}) } as Record<string, RegionFacts>;
      const base = (rf[key] || { aws_region: "" }) as RegionFacts;
      let next: RegionFacts = { ...base, ...patch } as RegionFacts;
      // If aws_region changed and az_count not explicitly provided, auto-fill from constant
      if (patch.aws_region && (patch.az_count === undefined || patch.az_count === null)) {
        const az = AWS_REGION_AZ_COUNT.get(patch.aws_region) ?? next.az_count;
        next = { ...next, az_count: az };
      }
      rf[key] = next;
      return { ...d, region_facts: rf } as Zone;
    });
  }, []);
  const renameRegionLabel = (from: string, toRaw: string) => {
    const to = toRaw.trim().toLowerCase();
    if (!to) return;
    setDraft((d)=>{
      if (!d) return d;
      const rf = { ...(d.region_facts || {}) } as Record<string, RegionFacts>;
      if (!rf[from]) return d;
      if (rf[to]) delete rf[to]; // allow overwrite by move
      rf[to] = rf[from];
      delete rf[from];
      return { ...d, region_facts: rf } as Zone;
    })
  };
  const removeRegionLabel = (label: string) => {
    setDraft((d)=>{
      if (!d) return d;
      const rf = { ...(d.region_facts || {}) } as Record<string, RegionFacts>;
      delete rf[label];
      return { ...d, region_facts: rf } as Zone;
    })
  };
  const addRegionLabel = (labelRaw: string) => {
    const label = labelRaw.trim().toLowerCase();
    if (!label) return;
    setDraft((d)=>{
      if (!d) return d;
      const rf = { ...(d.region_facts || {}) } as Record<string, RegionFacts>;
      if (!rf[label]) rf[label] = { aws_region: "" } as RegionFacts;
      return { ...d, region_facts: rf } as Zone;
    })
  };

  const handleSave = async ()=>{
    if (!draft) return;

    // Validate required fields
    const hasAwsId = Boolean(draft.account_facts?.aws_account_id && String(draft.account_facts.aws_account_id).trim().length > 0);
    const regionAliases = Object.keys(draft.region_facts || {});
    const hasAtLeastOneRegion = regionAliases.length > 0;

    if (!hasAwsId || !hasAtLeastOneRegion) {
      toast({
        title: 'Missing required data',
        description: !hasAwsId ? 'AWS Account ID is required.' : 'At least one Region Alias is required.',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      const action = creatingNew ? await dispatch(createZone(draft)) : await dispatch(updateZoneRemote(draft));
      const isRejected = (creatingNew ? (createZone as any).rejected.match(action) : (updateZoneRemote as any).rejected.match(action));
      if (isRejected) {
        const msg = (action as any).payload || (creatingNew ? 'Failed to create zone' : 'Failed to update zone');
        toast({ title: creatingNew ? 'Create failed' : 'Save failed', description: String(msg), variant: 'destructive' });
      } else {
        toast({ title: creatingNew ? 'Zone created' : 'Zone saved', description: `${draft.client}/${draft.zone}` });
        setEditing(false);
        setCreatingNew(false);
        // Auto-navigate to the new zone route after creating
        if (creatingNew) {
          navigate(`/zones/${draft.client}/${draft.zone}`, { replace: true });
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const openNewDialog = () => {
    setNewZoneName("");
    setNewDialogOpen(true);
  };

  const confirmCreateNew = () => {
    const clientSlug = clientObj?.client || draft?.client || selectedClient;
    if (!clientSlug) {
      toast({ title: 'No client selected', description: 'Select a client before creating a zone.', variant: 'destructive' });
      return;
    }
    const name = newZoneName.trim().toLowerCase().slice(0, 32);
    if (!name) return;

    const newDraft: Zone = {
      client: clientSlug,
      zone: name,
      account_facts: { aws_account_id: '' },
      region_facts: {},
      tags: {}
    } as Zone;

    setDraft(newDraft);
    setEditing(true);
    setCreatingNew(true);
    setActiveTab('overview');
    setNewDialogOpen(false);
  };

  const handleCancel = ()=>{
    if (creatingNew) {
      // Cancel new: reset to existing zone and exit edit mode
      if (zone) setDraft(JSON.parse(JSON.stringify(zone)) as Zone);
      else setDraft(null);
      setCreatingNew(false);
      setEditing(false);
      return;
    }
    if (!zone) return;
    try {
      const reset = JSON.parse(JSON.stringify(zone)) as Zone;
      setDraft(reset);
      toast({ title: 'Changes discarded', description: 'Reverted to last saved values.' });
    } catch {
      setDraft(zone);
    }
    setEditing(false);
  };

  const af = (draft?.account_facts || ({} as AccountFacts));
  const regions = draft?.region_facts || {};
  const allTags = draft?.tags || {};
  const delegatesList: string[] = af.kms?.delegate_aws_account_ids || [];

  const parseDelegatesText = (txt: string): { valid: string[]; rejected: string[] } => {
    // Expect one ID per line; validate exactly 12 digits
    const lines = txt.split(/\r?\n/);
    const valid: string[] = [];
    const rejected: string[] = [];
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      if (/^\d{12}$/.test(line)) {
        valid.push(line);
      } else {
        rejected.push(line);
      }
    }
    // dedupe valid, preserve order
    const seen = new Set<string>();
    const deduped: string[] = [];
    for (const v of valid) {
      if (!seen.has(v)) { seen.add(v); deduped.push(v); }
    }
    return { valid: deduped, rejected };
  };

  const handleCopyDelegates = async () => {
    try {
      const text = (delegatesList || []).join("\n");
      await navigator.clipboard.writeText(text);
      toast({ title: 'Copied', description: 'Delegate AWS account IDs copied to clipboard.' });
    } catch (e) {
      toast({ title: 'Copy failed', description: 'Unable to access clipboard.', variant: 'destructive' });
    }
  };

  const handleDownloadDelegates = () => {
    const text = (delegatesList || []).join("\n");
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'delegates.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleUploadDelegates = () => {
    if (!editing) return;
    uploadInputRef.current?.click();
  };

  const handleDelegatesFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const { valid, rejected } = parseDelegatesText(text);
      updateAccount({ kms: { aws_account_id: af.kms?.aws_account_id || af.aws_account_id || '', ...(af.kms||{}), delegate_aws_account_ids: valid } as any });
      const maxPreview = 10;
      const preview = rejected.slice(0, maxPreview).join(', ');
      const more = rejected.length > maxPreview ? `, and ${rejected.length - maxPreview} more` : '';
      toast({
        title: 'Delegates processed',
        description: rejected.length
          ? `${valid.length} valid ID(s) loaded. Rejected ${rejected.length}: ${preview}${more}.`
          : `${valid.length} valid ID(s) loaded.`
      });
    } catch (err) {
      toast({ title: 'Upload failed', description: 'Could not read the file.', variant: 'destructive' });
    } finally {
      // reset input so the same file can be selected again if needed
      if (uploadInputRef.current) uploadInputRef.current.value = '';
    }
  };

  // Track if draft differs from zone (unsaved changes)
  const hasUnsaved = useMemo(() => {
    if (!editing) return false;
    try {
      const a = JSON.stringify(draft);
      const b = JSON.stringify(zone);
      return a !== b;
    } catch {
      return true;
    }
  }, [editing, draft, zone]);

  // Warn on browser/tab close if there are unsaved changes
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsaved) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
      return undefined;
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [hasUnsaved]);

  // Intercept Back to Zones click when unsaved
  const onBackClick = useCallback((e: React.MouseEvent) => {
    if (hasUnsaved) {
      e.preventDefault();
      const ok = window.confirm('You have unsaved changes. Discard and leave this page?');
      if (ok) navigate('/zones');
    }
  }, [hasUnsaved, navigate]);

  if (!zone || !draft) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/zones" onClick={onBackClick}>
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

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/zones" onClick={onBackClick}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Zones
            </Link>
          </Button>
        </div>
        <div className="flex gap-2">
          {!editing ? (
            <>
              <Button variant="outline" onClick={openNewDialog} className="gap-1">
                <Plus className="mr-2 h-4 w-4" />
                New
              </Button>
              <Button variant="outline" onClick={()=> setDeleteDialogOpen(true)} className="gap-1">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
              <Button variant="outline" onClick={()=> setEditing(true)} className="gap-1">
                <SquarePen className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" disabled={saving} onClick={handleCancel} className="gap-1">
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button
                variant="outline"
                disabled={saving || !(draft?.account_facts?.aws_account_id && Object.keys(draft?.region_facts || {}).length > 0)}
                onClick={handleSave}
                className="gap-1"
              >
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* New Zone Dialog */}
      <Dialog open={newDialogOpen} onOpenChange={(o)=> { if (!saving) setNewDialogOpen(o); }}>
        <DialogContent className="w-[92vw] max-w-sm p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Create New Zone</DialogTitle>
            <DialogDescription>Enter a new zone name (lowercase, max 32 characters).</DialogDescription>
          </DialogHeader>
          <div className="pt-2">
            <label className="text-sm font-medium text-muted-foreground">Enter landing zone name:</label>
            <Input
              className="mt-2"
              value={newZoneName}
              onChange={(e)=> setNewZoneName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0,32))}
              placeholder="my-zone"
              maxLength={32}
            />
          </div>
          <DialogFooter className="pt-4 gap-2">
            <Button variant="outline" onClick={()=> setNewDialogOpen(false)}>Cancel</Button>
            <Button variant="default" onClick={confirmCreateNew} disabled={!newZoneName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog (placeholder) */}
      <Dialog open={deleteDialogOpen} onOpenChange={(o)=> setDeleteDialogOpen(o)}>
        <DialogContent className="w-[92vw] max-w-sm p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Delete Zone</DialogTitle>
            <DialogDescription>Not yet supported.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={()=> setDeleteDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 flex-wrap text-lg sm:text-xl md:text-2xl">
            <Globe className="h-5 w-5" />
            {clientObj?.client_name || draft.client}
          </CardTitle>
          <CardDescription>Landing Zone details for this client</CardDescription>
          <div className="text-sm text-muted-foreground">Zone: <span className="contrast-value">{draft.zone}</span></div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="regions">Regions</TabsTrigger>
              <TabsTrigger value="deployments">Deployments</TabsTrigger>
              <TabsTrigger value="delegates">Delegates</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6 pt-4">
              <Separator />
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Environment moved to Deployments tab */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">AWS Account ID</label>
                    {editing ? (
                      <Input className="font-mono" value={af.aws_account_id || ''} onChange={(e)=> updateAccount({ aws_account_id: e.target.value.replace(/\D/g,'') })} />
                    ) : (
                      <div className="mt-2 font-mono text-sm contrast-value break-all">{af.aws_account_id || '—'}</div>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Account Name</label>
                    {editing ? (
                      <Input value={af.account_name || ''} onChange={(e)=> updateAccount({ account_name: e.target.value })} />
                    ) : (
                      <div className="mt-2 text-sm contrast-value break-all">{af.account_name || '—'}</div>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Organizational Unit</label>
                    {editing ? (
                      <Input value={af.organizational_unit || ''} onChange={(e)=> updateAccount({ organizational_unit: e.target.value })} />
                    ) : (
                      <div className="mt-2 text-sm contrast-value break-all">{af.organizational_unit || '—'}</div>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Resource Namespace</label>
                    {editing ? (
                      <Input value={af.resource_namespace || ''} onChange={(e)=> updateAccount({ resource_namespace: e.target.value })} />
                    ) : (
                      <div className="mt-2 text-sm contrast-value break-all">{af.resource_namespace || '—'}</div>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Network Name</label>
                    {editing ? (
                      <Input value={af.network_name || ''} onChange={(e)=> updateAccount({ network_name: e.target.value })} />
                    ) : (
                      <div className="mt-2 text-sm contrast-value break-all">{af.network_name || '—'}</div>
                    )}
                  </div>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-2">VPC Aliases</div>
                    <StringArrayEditor readOnly={!editing} value={af.vpc_aliases} onChange={(next)=> updateAccount({ vpc_aliases: next })} addLabel="Add alias" placeholder="vpc-alias" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-2">Subnet Aliases</div>
                    <StringArrayEditor readOnly={!editing} value={af.subnet_aliases} onChange={(next)=> updateAccount({ subnet_aliases: next })} addLabel="Add alias" placeholder="subnet-alias" />
                  </div>
                </div>
                <Separator />
                <div className="space-y-3">
                  <div className="text-sm font-medium text-muted-foreground">KMS</div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm text-muted-foreground">KMS Key ARN</label>
                      {editing ? (
                        <Input className="font-mono" value={af.kms?.kms_key_arn || ''} onChange={(e)=> updateAccount({ kms: { aws_account_id: af.kms?.aws_account_id || af.aws_account_id || '', ...(af.kms||{}), kms_key_arn: e.target.value } as any })} />
                      ) : (
                        <div className="mt-2 font-mono text-sm contrast-value break-all">{af.kms?.kms_key_arn || '—'}</div>
                      )}
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">KMS Key</label>
                      {editing ? (
                        <Input className="font-mono" value={af.kms?.kms_key || ''} onChange={(e)=> updateAccount({ kms: { aws_account_id: af.kms?.aws_account_id || af.aws_account_id || '', ...(af.kms||{}), kms_key: e.target.value } as any })} />
                      ) : (
                        <div className="mt-2 font-mono text-sm contrast-value break-all">{af.kms?.kms_key || '—'}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="regions" className="space-y-4 pt-4">
              <RegionsTab
                regions={regions}
                onRename={renameRegionLabel}
                onRemove={removeRegionLabel}
                onAdd={addRegionLabel}
                onPatch={updateRegionFacts}
                readOnly={!editing}
              />
            </TabsContent>

            <TabsContent value="deployments" className="space-y-4 pt-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Zone Type</label>
                  <Select value={af.environment || ''} onValueChange={(v)=> updateAccount({ environment: v })} disabled={!editing}>
                    <SelectTrigger className="w-full" disabled={!editing}>
                      <SelectValue placeholder="Select zone type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dev">Development</SelectItem>
                      <SelectItem value="nonprod">Non-Production</SelectItem>
                      <SelectItem value="prod">Production</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">Zone Tags</div>
                <KeyValueListEditor readOnly={!editing} value={allTags as any} onChange={(next)=> setDraft((d)=> d ? ({ ...d, tags: next as any }) : d)} addLabel="Add tag" keyPlaceholder="tag" valuePlaceholder="value" />
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">Account Tags</div>
                <KeyValueListEditor readOnly={!editing} value={(af.tags as any) || {}} onChange={(next)=> updateAccount({ tags: next as any })} addLabel="Add tag" keyPlaceholder="tag" valuePlaceholder="value" />
              </div>
            </TabsContent>

            <TabsContent value="delegates" className="space-y-4 pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleCopyDelegates} className="gap-1">
                  <ClipboardCopy className="h-4 w-4" />
                  Copy
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownloadDelegates} className="gap-1">
                  <Download className="h-4 w-4" />
                  Download
                </Button>
                <input
                  ref={uploadInputRef}
                  type="file"
                  accept=".txt,text/plain"
                  className="hidden"
                  onChange={handleDelegatesFileChange}
                />
                <Button variant="outline" size="sm" onClick={handleUploadDelegates} disabled={!editing} className="gap-1">
                  <Upload className="h-4 w-4" />
                  Upload
                </Button>
                {editing && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => {
                      const sorted = [...(delegatesList||[])].sort((a,b)=> a.localeCompare(b));
                      updateAccount({ kms: { aws_account_id: af.kms?.aws_account_id || af.aws_account_id || '', ...(af.kms||{}), delegate_aws_account_ids: sorted } as any });
                    }}
                    title="Sort A–Z"
                  >
                    A–Z
                  </Button>
                )}
                <div className="ml-auto w-full sm:w-auto">
                  <Input
                    placeholder="Filter delegates…"
                    value={filterDelegates}
                    onChange={(e) => setFilterDelegates(e.target.value)}
                  />
                </div>
              </div>
              <div className="text-xs text-muted-foreground">Expect one AWS account ID per line. Each must be exactly 12 numeric digits. Duplicates are deduplicated.</div>
              <div className="rounded-md border border-subtle p-2">
                 <StringArrayEditor
                   readOnly={!editing}
                   value={delegatesList}
                   onChange={(next)=> updateAccount({ kms: { aws_account_id: af.kms?.aws_account_id || af.aws_account_id || '', ...(af.kms||{}), delegate_aws_account_ids: next } as any })}
                   addLabel="Add account"
                   placeholder="123456789012"
                   filter={filterDelegates}
                 />
               </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

function RegionsTab({ regions, onRename, onRemove, onAdd, onPatch, readOnly = false }: {
  regions: Record<string, RegionFacts>;
  onRename: (from: string, to: string)=> void;
  onRemove: (label: string)=> void;
  onAdd: (label: string)=> void;
  onPatch: (label: string, patch: Partial<RegionFacts>)=> void;
  readOnly?: boolean;
}){
  const [newLabel, setNewLabel] = useState("");
  const labels = Object.keys(regions||{});
  return (
    <div className="space-y-4">
    {!readOnly && (
        <div className="flex gap-2 items-center">
      <Input placeholder="new region alias (lowercase)" value={newLabel} onChange={(e)=> setNewLabel(e.target.value)} />
      <Button variant="outline" size="sm" onClick={()=> { onAdd(newLabel); setNewLabel(""); }}><Plus className="h-4 w-4 mr-1"/>Add alias</Button>
        </div>
      )}
      {labels.length===0 && <p className="text-sm text-muted-foreground">No regions configured</p>}
      {labels.map((label)=> (
        <Card key={label}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Region Alias</span>
              <Input className="w-48" value={label} readOnly={readOnly} disabled={readOnly} onChange={(e)=> onRename(label, e.target.value)} />
            </div>
            <div className="flex gap-2">
              {!readOnly && (
                <Button variant="ghost" size="sm" onClick={()=> onRemove(label)}><Trash2 className="h-4 w-4 mr-1"/>Remove</Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm text-muted-foreground">AWS Region</label>
                {readOnly ? (
                  <div className="mt-2 text-sm contrast-value break-all">{regions[label]?.aws_region || '—'}</div>
                ) : (
                  <>
                    <Input list={`aws-region-list`} value={regions[label]?.aws_region || ''} onChange={(e)=> onPatch(label, { aws_region: e.target.value })} />
                    <datalist id="aws-region-list">
                      {Array.from(AWS_REGION_NAME_BY_CODE.keys()).map((code)=> (
                        <option key={code} value={code}>{AWS_REGION_NAME_BY_CODE.get(code)}</option>
                      ))}
                    </datalist>
                  </>
                )}
              </div>
              <div>
                <label className="text-sm text-muted-foreground">AZ Count</label>
                <div className="mt-2 text-sm contrast-value">{regions[label]?.az_count ?? '—'}</div>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="text-sm text-muted-foreground">Proxy Host</label>
                {readOnly ? (
                  <div className="mt-2 text-sm contrast-value break-all">{regions[label]?.proxy_host || '—'}</div>
                ) : (
                  <Input value={regions[label]?.proxy_host || ''} onChange={(e)=> onPatch(label, { proxy_host: e.target.value })} />
                )}
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Proxy URL</label>
                {readOnly ? (
                  <div className="mt-2 text-sm contrast-value break-all">{regions[label]?.proxy_url || '—'}</div>
                ) : (
                  <Input value={regions[label]?.proxy_url || ''} onChange={(e)=> onPatch(label, { proxy_url: e.target.value })} />
                )}
              </div>
              <div>
                <label className="text-sm text-muted-foreground">No Proxy</label>
                {readOnly ? (
                  <div className="mt-2 text-sm contrast-value break-all">{regions[label]?.no_proxy || '—'}</div>
                ) : (
                  <Input value={regions[label]?.no_proxy || ''} onChange={(e)=> onPatch(label, { no_proxy: e.target.value })} />
                )}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-2">Name Servers</div>
              <StringArrayEditor readOnly={readOnly} value={regions[label]?.name_servers} onChange={(next)=> onPatch(label, { name_servers: next })} addLabel="Add server" placeholder="8.8.8.8" />
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <div className="text-sm text-muted-foreground mb-2">Image Aliases</div>
                <KeyValueListEditor readOnly={readOnly} value={regions[label]?.image_aliases as any} onChange={(next)=> onPatch(label, { image_aliases: next })} addLabel="Add alias" keyPlaceholder="alias" valuePlaceholder="ami-..." />
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-2">Security Group Aliases</div>
                <KeyValueListEditor readOnly={readOnly} value={regions[label]?.security_group_aliases as any} onChange={(next)=> onPatch(label, { security_group_aliases: next })} addLabel="Add alias" keyPlaceholder="alias" valuePlaceholder="sg-..." />
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-2">Security Aliases</div>
              <SecurityAliasesEditor readOnly={readOnly} value={regions[label]?.security_aliases as any} onChange={(next)=> onPatch(label, { security_aliases: next as any })} />
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-2">Region Tags</div>
              <KeyValueListEditor readOnly={readOnly} value={regions[label]?.tags as any} onChange={(next)=> onPatch(label, { tags: next as any })} addLabel="Add tag" keyPlaceholder="tag" valuePlaceholder="value" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default ZoneDetails;