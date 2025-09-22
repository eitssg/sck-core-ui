import { useEffect, useMemo, useState, useCallback, useRef, ReactNode } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Save, X, Globe, Trash2, SquarePen, ClipboardCopy, Download, Upload, Plus, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
// removed Badge; no longer used in Regions header
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/hooks/useTheme";
import { useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "@/store";
import { makeSelectZoneBySlug, updateZoneRemote, createZone, fetchZoneByKey, selectZonesLoading } from "@/store/slices/zonesSlice";
import { selectSelectedClient, selectClientBySlug } from "@/store/slices/clientsSlice";
import type { Zone, AccountFacts, RegionFacts } from "@/store/types";
import { AWS_REGION_NAME_BY_CODE, AWS_REGION_AZ_COUNT } from "@/constants/aws-regions";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
// DashboardLayout removed for single-card form layout

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
          <Button variant="ghost" size="sm" onClick={add} className="text-muted-foreground hover:text-foreground"><Plus className="h-4 w-4 mr-1"/>{addLabel}</Button>
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
          <Button variant="ghost" size="sm" onClick={add} className="text-muted-foreground hover:text-foreground"><Plus className="h-4 w-4 mr-1"/>{addLabel}</Button>
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
  const [newRows, setNewRows] = useState<Record<string, SecurityAlias>>({});
  const addGroup = ()=>{
    const k = newName.trim();
    if (!k) return;
    if (aliases[k]) return;
    onChange({ ...aliases, [k]: [] });
    setNewName("");
  }
  const addEntry = (k: string)=>{
    const draft = newRows[k] || { type: "", value: "", description: "" };
    if (!draft.type && !draft.value && !draft.description) return; // avoid adding empty rows
    const next = { ...aliases } as Record<string, SecurityAlias[]>;
    next[k] = [...(next[k]||[]), { type: draft.type || "", value: draft.value || "", description: draft.description || "" }];
    onChange(next);
    setNewRows((nr)=> ({ ...nr, [k]: { type: "", value: "", description: "" } }));
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
            <div className="font-medium">{k}</div>
            <div className="flex gap-2">
              {!readOnly && (
                <Button variant="ghost" size="sm" onClick={()=>removeGroup(k)}><Trash2 className="h-4 w-4 mr-1"/>Remove group</Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {list.length===0 && readOnly && <p className="text-sm text-muted-foreground">No entries</p>}
            {list.map((row, idx)=> (
              <div key={`${k}-${idx}`} className="grid gap-2 items-start grid-cols-1 md:grid-cols-[12rem_16rem_1fr_auto]">
                {readOnly ? (
                  <>
                    <div className="text-sm contrast-value break-all" title={row.type}>{row.type || '—'}</div>
                    <div className="text-sm contrast-value break-all" title={row.value}>{row.value || '—'}</div>
                    <div className="text-sm contrast-value break-all" title={row.description}>{row.description || '—'}</div>
                    <div />
                  </>
                ) : (
                  <>
                    <Input placeholder="type" value={row.type} onChange={(e)=> updateEntry(k, idx, { type: e.target.value })} />
                    <Input placeholder="value" value={row.value} onChange={(e)=> updateEntry(k, idx, { value: e.target.value })} />
                    <Input placeholder="description" value={row.description || ""} onChange={(e)=> updateEntry(k, idx, { description: e.target.value })} />
                    <div className="flex md:justify-end">
                      <Button variant="ghost" size="icon" onClick={()=> removeEntry(k, idx)} title="Remove">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {!readOnly && (
              <div className="grid gap-2 items-start grid-cols-1 md:grid-cols-[12rem_16rem_1fr_auto]">
                <Input
                  placeholder="type"
                  value={(newRows[k]?.type) || ''}
                  onChange={(e)=> setNewRows((nr)=> ({ ...nr, [k]: { ...(nr[k]||{ type: '', value: '', description: '' }), type: e.target.value } }))}
                />
                <Input
                  placeholder="value"
                  value={(newRows[k]?.value) || ''}
                  onChange={(e)=> setNewRows((nr)=> ({ ...nr, [k]: { ...(nr[k]||{ type: '', value: '', description: '' }), value: e.target.value } }))}
                />
                <Input
                  placeholder="description"
                  value={(newRows[k]?.description) || ''}
                  onChange={(e)=> setNewRows((nr)=> ({ ...nr, [k]: { ...(nr[k]||{ type: '', value: '', description: '' }), description: e.target.value } }))}
                />
                <div className="flex md:justify-end">
                  <Button variant="outline" size="sm" onClick={()=> addEntry(k)}>
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
      {!readOnly && (
        <div className="flex gap-2 items-center">
          <Input className="w-64" placeholder="new alias group name" value={newName} onChange={(e)=> setNewName(e.target.value)} />
          <Button variant="ghost" size="sm" onClick={addGroup} className="text-muted-foreground hover:text-foreground"><Plus className="h-4 w-4 mr-1"/>Add group</Button>
        </div>
      )}
    </div>
  );
}

// Responsive details row: label left (max-content), value/editor right; stacks on mobile
function DetailsRow({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[14rem_1fr] gap-2 md:gap-4 items-start">
      <div className="text-sm font-medium text-muted-foreground md:w-[14rem] break-words">{label}</div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

// Searchable AWS Region combobox: shows key (e.g., us-east-1) in trigger, friendly names in the menu
function RegionCombobox({ value, onChange, placeholder = "Select region", disabled = false, className = "w-56" }: {
  value?: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const entries = useMemo(() => Array.from(AWS_REGION_NAME_BY_CODE.entries()), []);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={`${className} justify-between`}
        >
          {value ? value : <span className="text-muted-foreground">{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[--radix-popover-trigger-width]">
        <Command shouldFilter>
          <CommandInput placeholder="Search regions…" />
          <CommandEmpty>No region found.</CommandEmpty>
          <CommandGroup>
            {entries.map(([code, name]) => (
              <CommandItem
                key={code}
                // include code in value so typing the key filters too
                value={`${name || code} ${code}`}
                onSelect={() => {
                  onChange(code);
                  setOpen(false);
                }}
              >
                {/* Show key with description underneath */}
                <div className="flex w-full flex-col gap-0.5">
                  <span className="font-mono text-xs">{code}</span>
                  <span className="text-[11px] text-muted-foreground">{name || code}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

const ZoneDetails = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isDark } = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const location = useLocation();

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
  const zonesLoading = useSelector((s: RootState)=> selectZonesLoading(s));
  const clientObj = useSelector((s: RootState)=> selectedClient ? selectClientBySlug(s, selectedClient) : undefined) as any;

  // Local editable draft
  const [draft, setDraft] = useState<Zone | null>(null);
  const [saving, setSaving] = useState(false);
  const tabStorageKey = useMemo(() => (zoneSlug ? `sck.zoneDetails.tab:${zoneSlug}` : 'sck.zoneDetails.tab'), [zoneSlug]);
  const initialTab = useMemo(() => {
    try {
      const v = sessionStorage.getItem(tabStorageKey);
      return v || 'overview';
    } catch {
      return 'overview';
    }
  }, [tabStorageKey]);
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  useEffect(() => {
    // When navigating between zones, restore the stored tab for the new zone
    setActiveTab(initialTab);
  }, [initialTab]);
  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
    try { sessionStorage.setItem(tabStorageKey, value); } catch { /* ignore */ }
  }, [tabStorageKey]);
  const [editing, setEditing] = useState(false);
  const [creatingNew, setCreatingNew] = useState(false);

  // Delegates: upload ref
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const [filterDelegates, setFilterDelegates] = useState("");

  // New zone flow moved to Zones list page. We still accept navigation state to seed a new draft.
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const lastAppliedZoneJsonRef = useRef<string | null>(null);
  useEffect(() => {
    if (!zone) return;
    try {
      const nxt = JSON.stringify(zone);
      if (lastAppliedZoneJsonRef.current !== nxt) {
        const next = JSON.parse(nxt) as Zone;
        setDraft(next);
        lastAppliedZoneJsonRef.current = nxt;
      }
    } catch {
      try {
        const clone = JSON.parse(JSON.stringify(zone)) as Zone;
        setDraft(clone);
        lastAppliedZoneJsonRef.current = JSON.stringify(clone);
      } catch { /* ignore */ }
    }
  }, [zone]);

  // Persist current zone slug (and client) for refresh survival
  useEffect(() => {
    try {
      if (zoneSlug && (clientParam || selectedClient)) {
        const key = { client: (clientParam || (selectedClient as string))!, zone: zoneSlug };
        sessionStorage.setItem('sck.currentZone', JSON.stringify(key));
      }
    } catch { /* ignore */ }
  }, [zoneSlug, clientParam, selectedClient]);

  useEffect(() => {
    // Always fetch the current zone fresh on entry/refresh to ensure up-to-date data
    if (zoneSlug && (clientParam || selectedClient)) {
      const client = (clientParam || (selectedClient as string)) as string;
      dispatch(fetchZoneByKey({ client, zone: zoneSlug }));
    }
    // Intentionally exclude `zone` so we don't refetch on each store update
  }, [zoneSlug, clientParam, selectedClient, dispatch]);

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

  const cloneRegionLabel = (from: string, toRaw: string, newAwsRegion: string) => {
    const to = toRaw.trim().toLowerCase();
    const region = (newAwsRegion || "").trim();
    if (!to) return;
    setDraft((d)=>{
      if (!d) return d;
      const rf = { ...(d.region_facts || {}) } as Record<string, RegionFacts>;
      const source = (rf[from] || { aws_region: "" }) as RegionFacts;
      const az = AWS_REGION_AZ_COUNT.get(region) ?? source.az_count;
      rf[to] = { ...source, aws_region: region, az_count: az } as RegionFacts;
      return { ...d, region_facts: rf } as Zone;
    });
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

  // If navigated here with intent to create a new zone, initialize a draft
  useEffect(() => {
    try {
      const state = (location as any).state as { createNew?: boolean; zoneName?: string; client?: string } | undefined;
      if (!zone && !draft && state?.createNew && state?.zoneName) {
        const clientSlug = state.client || clientObj?.client || selectedClient;
        if (!clientSlug) return;
        const name = String(state.zoneName).trim().toLowerCase().slice(0, 32);
        if (!name) return;
        const newDraft: Zone = {
          client: clientSlug as string,
          zone: name,
          account_facts: { aws_account_id: '' },
          region_facts: {},
          tags: {}
        } as Zone;
        setDraft(newDraft);
        setEditing(true);
        setCreatingNew(true);
        setActiveTab('overview');
      }
    } catch {
      // ignore
    }
  }, [location, zone, draft, clientObj, selectedClient]);

  // Attempt to recover from refresh using sessionStorage if URL params are incomplete
  useEffect(() => {
    if (!zoneSlug) {
      try {
        const raw = sessionStorage.getItem('sck.currentZone');
        if (raw) {
          const parsed = JSON.parse(raw) as { client: string; zone: string };
          if (parsed?.client && parsed?.zone) {
            navigate(`/zones/${encodeURIComponent(parsed.client)}/${encodeURIComponent(parsed.zone)}`, { replace: true });
          }
        }
      } catch { /* ignore */ }
    }
  }, [zoneSlug, navigate]);

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

  // Form layout with explicit Back button

  if (!zone && !draft) {
    // Show loading/not-found in form layout with back button
    const isLoading = Boolean(zoneSlug && (zonesLoading || (clientParam || selectedClient)));
    return (
      <div className="sck-form-container space-y-6 animate-fade-in">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/zones')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Zones
            </Button>
          </div>
          <div className="ml-auto" />
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            {isLoading ? (
              <>
                <h3 className="text-lg font-semibold mb-2">Loading zone…</h3>
                <p className="text-muted-foreground">Fetching zone details. This may take a moment.</p>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold mb-2">Zone not found</h3>
                <p className="text-muted-foreground">The zone you are looking for does not exist.</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Use current to safely reference client/zone during initial render before draft is populated
  const current = (draft || zone) as Zone;

  return (
  <div className="sck-form-container space-y-6 animate-fade-in">
      {/* Top bar: Back link (left) and actions (right) */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/zones')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Zones
          </Button>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {editing ? (
            <>
              <Button variant="ghost" size="sm" disabled={saving} onClick={handleCancel} className="gap-1 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
              <Button
                size="sm"
                disabled={saving || !(draft?.account_facts?.aws_account_id && Object.keys(draft?.region_facts || {}).length > 0)}
                onClick={handleSave}
                className="gap-1"
              >
                <Save className="h-4 w-4 mr-1" />
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={()=> setDeleteDialogOpen(true)} className="gap-1 text-muted-foreground hover:text-foreground">
                <Trash2 className="h-4 w-4 mr-1" /> Delete
              </Button>
              <Button variant="ghost" size="sm" onClick={()=> setEditing(true)} className="gap-1 text-muted-foreground hover:text-foreground">
                <SquarePen className="h-4 w-4 mr-1" /> Edit
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Delete Dialog (placeholder) */}
      <Dialog open={deleteDialogOpen} onOpenChange={(o)=> setDeleteDialogOpen(o)}>
        <DialogContent className="w-[92vw] max-w-sm p-4 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="w-24 h-24 rounded-full bg-red-600 flex items-center justify-center shrink-0">
              <X className="w-12 h-12 text-white" />
            </div>
            <div className="flex-1">
              <DialogHeader>
                <DialogTitle>Delete Zone</DialogTitle>
                <DialogDescription>Not yet supported.</DialogDescription>
              </DialogHeader>
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={()=> setDeleteDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="shadow-soft">
        <CardHeader className="flex flex-row items-start gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="sck-section-title flex items-center gap-2">
              <Globe className="h-5 w-5" />
              {clientObj?.client_name || current.client}
            </CardTitle>
            <CardDescription className="sck-section-subtitle">Landing zone details for this client</CardDescription>
            <div className="text-sm text-muted-foreground">Zone: <span className="contrast-value">{current.zone}</span></div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="regions">Regions</TabsTrigger>
              <TabsTrigger value="deployments">Deployments</TabsTrigger>
              <TabsTrigger value="delegates">Delegates</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6 pt-4">
              {editing && (
                <>
                  <div className="space-y-4">
                    <DetailsRow label="Zone Name">
                      <Input
                        value={draft?.zone || ''}
                        onChange={(e)=> setDraft((d)=> d ? ({ ...d, zone: e.target.value }) : d)}
                      />
                    </DetailsRow>
                  </div>
                </>
              )}

              <div className="space-y-4">
                <DetailsRow label="Namespace">
                  {editing ? (
                    <Input value={af.resource_namespace || ''} onChange={(e)=> updateAccount({ resource_namespace: e.target.value })} />
                  ) : (
                    <div className="text-sm contrast-value break-all">{af.resource_namespace || '—'}</div>
                  )}
                </DetailsRow>
                <DetailsRow label="Account Name">
                  {editing ? (
                    <Input value={af.account_name || ''} onChange={(e)=> updateAccount({ account_name: e.target.value })} />
                  ) : (
                    <div className="text-sm contrast-value break-all">{af.account_name || '—'}</div>
                  )}
                </DetailsRow>
                <DetailsRow label="Account Number">
                  {editing ? (
                    <Input className="font-mono" value={af.aws_account_id || ''} onChange={(e)=> updateAccount({ aws_account_id: e.target.value.replace(/\D/g,'') })} />
                  ) : (
                    <div className="text-sm contrast-value break-all">{af.aws_account_id || '—'}</div>
                  )}
                </DetailsRow>
                <DetailsRow label="Organizational Unit">
                  {editing ? (
                    <Input value={af.organizational_unit || ''} onChange={(e)=> updateAccount({ organizational_unit: e.target.value })} />
                  ) : (
                    <div className="text-sm contrast-value break-all">{af.organizational_unit || '—'}</div>
                  )}
                </DetailsRow>
              </div>
              <DetailsRow label="Network Name">
                {editing ? (
                  <Input value={af.network_name || ''} onChange={(e)=> updateAccount({ network_name: e.target.value })} />
                ) : (
                  <div className="text-sm contrast-value break-all">{af.network_name || '—'}</div>
                )}
              </DetailsRow>
              <DetailsRow label="Subnet Aliases">
                <StringArrayEditor
                  readOnly={!editing}
                  value={af.subnet_aliases}
                  onChange={(next)=> updateAccount({ subnet_aliases: next })}
                  addLabel="Add alias"
                  placeholder="subnet-alias"
                />
              </DetailsRow>
              <DetailsRow label="VPC Aliases">
                <StringArrayEditor readOnly={!editing} value={af.vpc_aliases} onChange={(next)=> updateAccount({ vpc_aliases: next })} addLabel="Add alias" placeholder="vpc-alias" />
              </DetailsRow>
              <div className="space-y-3">
                <DetailsRow label="KMS Key ARN">
                  {editing ? (
                    <Input className="font-mono" value={af.kms?.kms_key_arn || ''} onChange={(e)=> updateAccount({ kms: { aws_account_id: af.kms?.aws_account_id || af.aws_account_id || '', ...(af.kms||{}), kms_key_arn: e.target.value } as any })} />
                  ) : (
                    <div className="text-sm contrast-value break-all">{af.kms?.kms_key_arn || '—'}</div>
                  )}
                </DetailsRow>
                <DetailsRow label="KMS Key">
                  {editing ? (
                    <Input className="font-mono" value={af.kms?.kms_key || ''} onChange={(e)=> updateAccount({ kms: { aws_account_id: af.kms?.aws_account_id || af.aws_account_id || '', ...(af.kms||{}), kms_key: e.target.value } as any })} />
                  ) : (
                    <div className="text-sm contrast-value break-all">{af.kms?.kms_key || '—'}</div>
                  )}
                </DetailsRow>
              </div>
              {/* Tags (moved from Deployments tab) */}
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">Zone Tags</div>
                <KeyValueListEditor
                  readOnly={!editing}
                  value={allTags as any}
                  onChange={(next)=> setDraft((d)=> d ? ({ ...d, tags: next as any }) : d)}
                  addLabel="Add tag"
                  keyPlaceholder="tag"
                  valuePlaceholder="value"
                />
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">Account Tags</div>
                <KeyValueListEditor
                  readOnly={!editing}
                  value={(af.tags as any) || {}}
                  onChange={(next)=> updateAccount({ tags: next as any })}
                  addLabel="Add tag"
                  keyPlaceholder="tag"
                  valuePlaceholder="value"
                />
              </div>
            </TabsContent>

      <TabsContent value="regions" className="space-y-4 pt-4">
              <RegionsTab
                regions={regions}
                onRename={renameRegionLabel}
                onRemove={removeRegionLabel}
                onAdd={addRegionLabel}
                onPatch={updateRegionFacts}
        onClone={cloneRegionLabel}
                readOnly={!editing}
              />
            </TabsContent>

      <TabsContent value="deployments" className="space-y-4 pt-4">
              <DetailsRow label="Environment">
                {editing ? (
                  <Select
                    value={(() => {
                      const raw = (af.environment || '').toString().toLowerCase();
                      return raw === 'prd' || raw === 'nprd' || raw === 'dev' ? raw : undefined;
                    })()}
                    onValueChange={(v)=> updateAccount({ environment: v })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select zone type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dev">Development</SelectItem>
                      <SelectItem value="nprd">Non-Production</SelectItem>
                      <SelectItem value="prd">Production</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="text-sm contrast-value break-all">
                    {(() => {
                      const raw = (af.environment || '').toString().toLowerCase();
                      if (raw === 'prd') return 'Production';
                      if (raw === 'nprd') return 'Non-Production';
                      if (raw === 'dev') return 'Development';
                      return '—';
                    })()}
                  </div>
                )}
              </DetailsRow>
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
              <StringArrayEditor
                readOnly={!editing}
                value={delegatesList}
                onChange={(next)=> updateAccount({ kms: { aws_account_id: af.kms?.aws_account_id || af.aws_account_id || '', ...(af.kms||{}), delegate_aws_account_ids: next } as any })}
                addLabel="Add account"
                placeholder="123456789012"
                filter={filterDelegates}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

function RegionsTab({ regions, onRename, onRemove, onAdd, onPatch, onClone, readOnly = false }: {
  regions: Record<string, RegionFacts>;
  onRename: (from: string, to: string)=> void;
  onRemove: (label: string)=> void;
  onAdd: (label: string)=> void;
  onPatch: (label: string, patch: Partial<RegionFacts>)=> void;
  onClone: (from: string, to: string, newAwsRegion: string)=> void;
  readOnly?: boolean;
}){
  const [addOpen, setAddOpen] = useState(false);
  const [addFrom, setAddFrom] = useState<string | null>(null);
  const [newAlias, setNewAlias] = useState("");
  const [newAwsRegion, setNewAwsRegion] = useState("");
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removeLabel, setRemoveLabel] = useState<string | null>(null);
  const labels = useMemo(() => Object.keys(regions || {}), [regions]);
  const [active, setActive] = useState<string | undefined>(labels[0]);
  useEffect(() => {
    if (!active || !labels.includes(active)) {
      setActive(labels[0]);
    }
  }, [labels, active]);
  const handleRename = useCallback((from: string, to: string) => {
    onRename(from, to);
    const next = (to || '').trim().toLowerCase();
    if (next && from !== next) setActive(next);
  }, [onRename]);
  return (
    <div className="space-y-4">
      {labels.length===0 && <p className="text-sm text-muted-foreground">No regions configured</p>}
      {labels.length>0 && (
        <Tabs value={active} onValueChange={setActive}>
          <div className="flex items-center gap-2">
            <TabsList className="flex-1 overflow-x-auto">
              {labels.map((label)=> (
                <TabsTrigger key={label} value={label} className="whitespace-nowrap">{label}</TabsTrigger>
              ))}
            </TabsList>
            {!readOnly && (
              <div className="ml-2 flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!active || labels.length <= 1}
                  onClick={()=> { setRemoveLabel(active || null); setRemoveOpen(true); }}
                >
                  <Trash2 className="h-4 w-4 mr-1"/>Remove
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={()=> {
                    if (!active) return;
                    setAddFrom(active);
                    setNewAlias("");
                    setNewAwsRegion(regions[active]?.aws_region || "");
                    setAddOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-1"/>Add
                </Button>
              </div>
            )}
          </div>
          {labels.map((label)=> (
            <TabsContent key={`content-${label}`} value={label}>
              <div className="space-y-4 pt-4">
                <DetailsRow label="Region Alias">
                  {readOnly ? (
                    <div className="text-sm contrast-value break-all">{label}</div>
                  ) : (
                    <Input className="w-48" value={label} onChange={(e)=> handleRename(label, e.target.value)} />
                  )}
                </DetailsRow>
                <DetailsRow label="AWS Region">
                  {readOnly ? (
                    <div className="text-sm contrast-value break-all">{regions[label]?.aws_region || '—'}</div>
                  ) : (
                    <RegionCombobox
                      value={regions[label]?.aws_region || ''}
                      onChange={(v)=> onPatch(label, { aws_region: v })}
                      placeholder="Select region"
                      className="w-56"
                    />
                  )}
                </DetailsRow>
                <DetailsRow label="AZ Count">
                  {readOnly ? (
                    <div className="text-sm contrast-value break-all">{regions[label]?.az_count ?? '—'}</div>
                  ) : (
                    <Input className="w-24" value={regions[label]?.az_count ?? ''} readOnly />
                  )}
                </DetailsRow>
                <DetailsRow label="Proxy Host">
                  {readOnly ? (
                    <div className="text-sm contrast-value break-all">{regions[label]?.proxy_host || '—'}</div>
                  ) : (
                    <Input value={regions[label]?.proxy_host || ''} onChange={(e)=> onPatch(label, { proxy_host: e.target.value })} />
                  )}
                </DetailsRow>
                <DetailsRow label="Proxy URL">
                  {readOnly ? (
                    <div className="text-sm contrast-value break-all">{regions[label]?.proxy_url || '—'}</div>
                  ) : (
                    <Input value={regions[label]?.proxy_url || ''} onChange={(e)=> onPatch(label, { proxy_url: e.target.value })} />
                  )}
                </DetailsRow>
                <DetailsRow label="No Proxy">
                  {readOnly ? (
                    <div className="text-sm contrast-value break-all">{regions[label]?.no_proxy || '—'}</div>
                  ) : (
                    <Input value={regions[label]?.no_proxy || ''} onChange={(e)=> onPatch(label, { no_proxy: e.target.value })} />
                  )}
                </DetailsRow>
                <DetailsRow label="Name Servers">
                  <StringArrayEditor readOnly={readOnly} value={regions[label]?.name_servers} onChange={(next)=> onPatch(label, { name_servers: next })} addLabel="Add server" placeholder="8.8.8.8" />
                </DetailsRow>
                <div className="space-y-6">
                  <div className="space-y-3">
                    <div className="text-sm font-medium text-muted-foreground">Image Aliases</div>
                    <KeyValueListEditor readOnly={readOnly} value={regions[label]?.image_aliases as any} onChange={(next)=> onPatch(label, { image_aliases: next })} addLabel="Add alias" keyPlaceholder="alias" valuePlaceholder="ami-..." />
                  </div>
                  <div className="space-y-3">
                    <div className="text-sm font-medium text-muted-foreground">Security Group Aliases</div>
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
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}
      <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <DialogContent className="w-[92vw] max-w-sm p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Remove Region Alias</DialogTitle>
            <DialogDescription>Are you sure you wish to remove this region alias{removeLabel ? ` "${removeLabel}"` : ''}?</DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={()=> setRemoveOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={!removeLabel || labels.length <= 1}
              onClick={()=> {
                if (removeLabel) onRemove(removeLabel);
                setRemoveOpen(false);
                setRemoveLabel(null);
              }}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="w-[92vw] max-w-md p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Add Region Alias</DialogTitle>
            <DialogDescription>Clone settings from the selected alias into a new alias and region.</DialogDescription>
          </DialogHeader>
      <div className="space-y-4">
            <div>
        <label className="text-sm text-muted-foreground mb-2">New Alias</label>
              <Input placeholder="new region alias (lowercase)" value={newAlias} onChange={(e)=> setNewAlias(e.target.value)} />
            </div>
            <div>
        <label className="text-sm text-muted-foreground mb-2">AWS Region</label>
              <RegionCombobox
                value={newAwsRegion}
                onChange={setNewAwsRegion}
                placeholder="Select region"
                className="w-full"
              />
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={()=> { setAddOpen(false); }}>Cancel</Button>
    <Button
              variant="default"
              onClick={()=> {
                if (addFrom && newAlias.trim()) {
      onClone(addFrom, newAlias, newAwsRegion);
      setActive(newAlias.trim().toLowerCase());
                }
                setAddOpen(false);
                setAddFrom(null);
                setNewAlias("");
                setNewAwsRegion("");
              }}
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ZoneDetails;