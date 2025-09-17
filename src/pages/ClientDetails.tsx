import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { AWS_REGIONS, AWS_REGION_NAME_BY_CODE, searchAwsRegions } from '@/constants/aws-regions';
import { ChevronsUpDown, Check } from 'lucide-react';

// Minimal classnames helper
function cx(...parts: any[]) { return parts.filter(Boolean).join(' '); }

interface RegionFieldProps { label: string; value?: string; onChange?: (v: string)=>void; editing: boolean }
const RegionField: React.FC<RegionFieldProps> = ({ label, value, onChange, editing }) => {
  if (!editing) {
    const name = value ? AWS_REGION_NAME_BY_CODE.get(value) : '';
    return (
      <div className="space-y-1">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
        <div className="text-sm min-h-[1.5rem] flex items-center gap-2">
          {value ? (<>
            <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">{value}</code>
            <span className="text-muted-foreground text-xs truncate">{name}</span>
          </>) : <span className="opacity-50">—</span>}
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      <RegionSelect value={value} onChange={onChange} />
    </div>
  );
};

interface RegionSelectProps { value?: string; onChange?: (v: string)=>void }
const RegionSelect: React.FC<RegionSelectProps> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const results = searchAwsRegions(query).slice(0, 25);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-mono text-xs">
          {value ? `${value}` : 'Select region'}
          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-80">
  <Command>
          <CommandInput value={query} onValueChange={setQuery} placeholder="Search regions..." className="text-xs" />
          <CommandList>
            <CommandEmpty>No region found.</CommandEmpty>
            <CommandGroup heading="Regions">
              {results.map(r => {
                const selected = r.code === value;
                return (
                  <CommandItem
                    key={r.code}
                    value={r.code}
                    onSelect={() => { onChange?.(r.code); setOpen(false); }}
                    className="flex items-center gap-2"
                  >
                    <Check className={cx('h-3 w-3', selected ? 'opacity-100' : 'opacity-0')} />
                    <span className="font-mono text-xs">{r.code}</span>
                    <span className="text-muted-foreground text-[11px] truncate">{r.name}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

// Simple key/value tags editor (mirrors ZoneDetails UX)
type KV = Record<string, string>;
const KeyValueListEditor: React.FC<{
  value: KV | undefined;
  onChange: (next: KV) => void;
  addLabel?: string;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  readOnly?: boolean;
}> = ({ value, onChange, addLabel = 'Add pair', keyPlaceholder = 'key', valuePlaceholder = 'value', readOnly = false }) => {
  const entries = Object.entries(value || {});
  const [newKey, setNewKey] = useState('');
  const [newVal, setNewVal] = useState('');
  const upsert = (k: string, v: string) => {
    const next = { ...(value || {}) } as KV;
    if (!k) return;
    if (v === '') delete next[k];
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
    setNewKey('');
    setNewVal('');
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
};
import { Label } from '@/components/ui/label';
import { selectClientBySlug, fetchClient, selectIsClientCachedWithFullData, patchClient } from '@/store/slices/clientsSlice';
import { useToast } from '@/components/ui/use-toast';
import type { RootState } from '@/store';
import type { Client } from '@/store/types';
import { ArrowLeft, Pencil, Save, X, Shield, Network, KeyRound, Repeat2, FileSearch, UserCheck, Trash2, Plus } from 'lucide-react';
// DashboardLayout removed in favor of single-card form layout

interface FieldProps { label: string; value?: string; onChange?: (v: string)=>void; readOnly?: boolean; mono?: boolean; placeholder?: string }
const Field: React.FC<FieldProps> = ({ label, value, onChange, readOnly, mono, placeholder }) => (
  <div className="space-y-1">
    <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
    {readOnly ? (
  <div className={`text-sm ${mono? 'font-mono':''} min-h-[1.5rem] contrast-value`}>{value || <span className="opacity-50">—</span>}</div>
    ) : (
      <Input value={value || ''} placeholder={placeholder} onChange={(e)=>onChange?.(e.target.value)} className={mono? 'font-mono':''} />
    )}
  </div>
);

const grid = 'grid gap-6 sm:grid-cols-2 lg:grid-cols-3';
// Icon + semantics mapping for account fields
const ACCOUNT_ICON_META: Record<string, { Icon: any; title: string; desc: string }> = {
  iam_account: { Icon: UserCheck, title: 'IAM / Identity', desc: 'Identity & access management, credentials, federation.' },
  audit_account: { Icon: FileSearch, title: 'Audit / Logging', desc: 'Centralized logging, monitoring, trail aggregation.' },
  automation_account: { Icon: Repeat2, title: 'Automation / DevOps', desc: 'Pipelines, build/deploy automation, repeatability.' },
  network_account: { Icon: Network, title: 'Network / Connectivity', desc: 'Shared networking, transit, peering, routing.' },
  security_account: { Icon: Shield, title: 'Security / Compliance', desc: 'KMS encryption, guard duty, security hub, compliance.' },
};

interface AccountFieldRowProps { field: keyof Client; value?: string; editing: boolean; setField: (k: keyof Client, v: any)=>void; error?: string }
const AccountFieldRow: React.FC<AccountFieldRowProps> = ({ field, value, editing, setField, error }) => {
  const meta = ACCOUNT_ICON_META[field as string];
  const labelBase = field.replace(/_/g,' ').replace(/\b\w/g, c=>c.toUpperCase());
  return (
    <div className="space-y-1">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-2">
        {meta && <meta.Icon className="h-4 w-4 text-muted-foreground" />}
        <span>{labelBase}</span>
      </Label>
      {editing ? (
        <Input
          value={value || ''}
          onChange={(e)=> setField(field, e.target.value)}
          placeholder={meta?.title || labelBase}
          className="font-mono"
        />
      ) : (
        <div className="text-sm min-h-[1.5rem] font-mono flex items-center gap-2">
          {value ? <code className="px-1.5 py-0.5 rounded bg-muted text-xs">{value}</code> : <span className="opacity-50">—</span>}
        </div>
      )}
      {error && error !== '' && (
        <p className="mt-1 text-xs error-text">{error}</p>
      )}
      {!editing && meta?.desc && value && (
        <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">{meta.desc}</p>
      )}
    </div>
  );
};

const isAwsAccount = (v?: string) => !!v && /^[0-9]{12}$/.test(v);

const ClientDetails: React.FC = () => {
  const { client: slug } = useParams<{client: string}>();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const client = useSelector((s:RootState)=> slug? selectClientBySlug(s, slug): undefined) as Client | undefined;
  const full = useSelector((s:RootState)=> slug? selectIsClientCachedWithFullData(s, slug): false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Client|undefined>(client);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [saving, setSaving] = useState(false);
  const [acctErrors, setAcctErrors] = useState<Record<string,string>>({});
  const { toast } = useToast();

  // Fetch full details if needed
  useEffect(()=> {
    if (slug && !full) {
      setLoading(true);
      (dispatch(fetchClient({ clientSlug: slug, force: true }) as any).unwrap?.() ?? Promise.resolve())
        .catch((e:any)=> { setError(String(e)); toast({ variant: 'destructive', title: 'Load failed', description: String(e) }); })
        .finally(()=> setLoading(false));
    }
  }, [slug, full, dispatch, toast]);

  // Removed retainOnlyClient call to preserve full clients list in memory when returning to /clients.

  // Sync draft when client changes
  useEffect(()=> { if (client) setDraft(client); }, [client]);

  const setField = (k: keyof Client, v: any) => {
    setDraft(d => d? { ...d, [k]: v }: d);
    // Live validation for AWS account number fields
    const acctFields: (keyof Client)[] = [
      'organization_account','iam_account','audit_account','automation_account','security_account','network_account'
    ];
    if (acctFields.includes(k)) {
      const raw = String(v || '').replace(/[^0-9]/g,'').slice(0,12);
      setDraft(d => d? { ...d, [k]: raw }: d);
      setAcctErrors(e => ({ ...e, [k]: raw.length === 0 ? '' : (raw.length === 12 && isAwsAccount(raw) ? '' : 'Must be exactly 12 digits (0-9)') }));
    }
  };

  const calcPatch = useCallback(() => {
    if (!client || !draft) return {};
    const diff: Record<string, any> = {};
    (Object.keys(draft) as (keyof Client)[]).forEach(k => {
      if (draft[k] !== client[k]) diff[k as string] = draft[k];
    });
    delete diff.client; // never patch primary key
    return diff;
  }, [client, draft]);

  const handleSave = async () => {
    // Prevent save if any AWS account number invalid
    const acctFields: (keyof Client)[] = [
      'organization_account','iam_account','audit_account','automation_account','security_account','network_account'
    ];
    const bad = acctFields.filter(f => {
      const val = (draft as any)?.[f];
      if (!val) return false; // allow empty optional fields
      return !isAwsAccount(val);
    });
    if (bad.length) {
      bad.forEach(f => setAcctErrors(e => ({ ...e, [f]: 'Must be exactly 12 digits (0-9)' })));
      toast({ variant:'destructive', title:'Invalid AWS Account', description:`Fix ${bad.length} account field${bad.length>1?'s':''} before saving.` });
      return;
    }
    if (!slug || !draft) return;
    const payload = calcPatch();
    if (Object.keys(payload).length === 0) { setEditing(false); return; }
    setSaving(true);
    try {
      await (dispatch(patchClient({ clientSlug: slug, clientData: payload }) as any).unwrap?.() ?? Promise.resolve());
      setEditing(false);
      toast({ title: 'Client updated', description: `${slug} changes saved successfully.` });
    } catch (e:any) {
      const msg = String(e);
      setError(msg);
      toast({ variant: 'destructive', title: 'Update failed', description: msg });
    } finally {
      setSaving(false);
    }
  };

  // Defensive redirect if param missing
  useEffect(()=> {
    if (!slug) navigate('/clients');
  }, [slug, navigate]);
  if (!slug) return <div className="p-6 text-sm text-destructive">Client identifier missing – redirecting…</div>;
  if (loading) return (
    <div className="sck-form-container space-y-4">
      <div className="h-6 w-40 bg-muted animate-pulse rounded" />
      <div className="h-4 w-72 bg-muted animate-pulse rounded" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 bg-muted animate-pulse rounded" />
        ))}
      </div>
    </div>
  );
  if (error) return <div className="sck-form-container text-sm text-destructive">{error}</div>;
  if (!client) return <div className="sck-form-container">Client not found.</div>;

  const status = client.client_status || 'active';

  return (
    <div className="sck-form-container space-y-6 animate-fade-in">
      {/* Top bar: Back and actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={()=> navigate('/clients')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Clients
          </Button>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {!editing ? (
            <Button variant="ghost" size="sm" onClick={()=> setEditing(true)} className="gap-1 text-muted-foreground hover:text-foreground">
              <Pencil className="h-4 w-4" /> Edit
            </Button>
          ) : (
            <>
              <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1">
                <Save className="h-4 w-4" />{saving? 'Saving...':'Save'}
              </Button>
              <Button size="sm" variant="ghost" onClick={()=> { setEditing(false); setDraft(client); }} className="gap-1 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" /> Cancel
              </Button>
            </>
          )}
        </div>
      </div>

      <Card className="shadow-soft">
        <CardHeader className="flex flex-row items-start gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="sck-section-title">{client.client_name || client.client}</CardTitle>
            <CardDescription className="sck-section-subtitle">Client details</CardDescription>
            <div className="text-sm text-muted-foreground">
              Client: <span className="font-mono contrast-value">{client.client}</span>
              <span className="ml-3 inline-flex items-center gap-2 text-xs uppercase tracking-wide">
                <span className={`h-2 w-2 rounded-full ${status === 'inactive' ? 'bg-muted-foreground' : status === 'suspended' ? 'bg-accent-foreground' : 'bg-primary'}`} />
                {status}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="accounts">Accounts</TabsTrigger>
              <TabsTrigger value="buckets">Buckets</TabsTrigger>
              <TabsTrigger value="metadata">Metadata</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className={grid}>
                <Field label="Client Name" value={draft?.client_name} onChange={(v)=> setField('client_name', v)} readOnly={!editing} />
                <Field label="Organization Name" value={draft?.organization_name} onChange={(v)=> setField('organization_name', v)} readOnly={!editing} />
                <div>
                  <Field label="Organization Account" value={draft?.organization_account} onChange={(v)=> setField('organization_account', v)} readOnly={!editing} mono />
                  {editing && acctErrors.organization_account && acctErrors.organization_account !== '' && (
                    <p className="mt-1 text-xs error-text">{acctErrors.organization_account}</p>
                  )}
                </div>
                <Field label="Organization Email" value={draft?.organization_email} onChange={(v)=> setField('organization_email', v)} readOnly={!editing} />
                <Field label="Scope Prefix" value={draft?.scope} onChange={(v)=> setField('scope', v)} readOnly={!editing} />
              </div>
            </TabsContent>

            <TabsContent value="accounts">
              <div className={grid}>
                <RegionField
                  label="Master Region"
                  value={draft?.master_region}
                  onChange={(v)=> setField('master_region', v)}
                  editing={editing}
                />
                {(['iam_account','audit_account','automation_account','network_account','security_account'] as (keyof Client)[]).map(f => (
                  <AccountFieldRow
                    key={f}
                    field={f}
                    value={(draft as any)?.[f]}
                    editing={editing}
                    setField={setField}
                    error={acctErrors[f]}
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="buckets">
              <div className={grid}>
                <Field label="Automation Bucket" value={draft?.bucket_name} onChange={(v)=> setField('bucket_name', v)} readOnly={!editing} mono />
                <Field label="Docs Bucket" value={draft?.docs_bucket_name} onChange={(v)=> setField('docs_bucket_name', v)} readOnly={!editing} mono />
                <Field label="Artefact Bucket" value={draft?.artefact_bucket_name} onChange={(v)=> setField('artefact_bucket_name', v)} readOnly={!editing} mono />
                <Field label="UI Bucket" value={draft?.ui_bucket_name || draft?.ui_bucket} onChange={(v)=> setField('ui_bucket_name', v)} readOnly={!editing} mono />
                <RegionField
                  label="Bucket Region"
                  value={draft?.bucket_region}
                  onChange={(v)=> setField('bucket_region', v)}
                  editing={editing}
                />
              </div>
            </TabsContent>

            <TabsContent value="metadata">
              <div className="space-y-4">
                <div>
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">Description</Label>
                  {editing ? (
                    <Textarea rows={5} value={draft?.client_description || ''} onChange={(e)=> setField('client_description', e.target.value)} />
                  ) : <div className="text-sm whitespace-pre-wrap min-h-[4rem]">{draft?.client_description || <span className="opacity-50">No description</span>}</div>}
                </div>
                <div className={grid}>
                  <Field label="Domain" value={draft?.domain} onChange={(v)=> setField('domain', v)} readOnly={!editing} />
                  <Field label="Homepage" value={draft?.homepage} onChange={(v)=> setField('homepage', v)} readOnly={!editing} />
                  <Field label="Created At" value={draft?.created_at} readOnly />
                  <Field label="Updated At" value={draft?.updated_at} readOnly />
                  <RegionField
                    label="Client Region"
                    value={draft?.client_region}
                    onChange={(v)=> setField('client_region', v)}
                    editing={editing}
                  />
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">Client Tags</div>
                  <KeyValueListEditor
                    readOnly={!editing}
                    value={(draft?.tags as any) || {}}
                    onChange={(next)=> setField('tags', next as any)}
                    addLabel="Add tag"
                    keyPlaceholder="tag"
                    valuePlaceholder="value"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientDetails;