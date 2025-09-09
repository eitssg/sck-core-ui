import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api-fetch";
import { Eye, EyeOff, Download, Copy, Briefcase } from "lucide-react";

interface IssuedSecrets {
  client_id: string;
  client_secret: string;
}

export default function RegisterClient() {
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [issued, setIssued] = useState<IssuedSecrets | null>(null);
  const [reveal, setReveal] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const canSubmit = slug.trim().length >= 2 && name.trim().length >= 2;

  const toKebab = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setIsLoading(true);

    try {
      // POST to our registry clients API; backend should return client_id and client_secret once
      const res = await apiFetch("/api/v1/registry/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client: toKebab(slug), client_name: name, issue_secret: true }),
      });

      if (!res.ok) {
        let msg = `Failed to register client (HTTP ${res.status})`;
  try { const j = await res.json(); msg = j.message || j.error || msg; } catch {/* ignore parse error */}
        toast({ title: "Registration failed", description: msg, variant: "destructive" });
        setIsLoading(false);
        return;
      }

      const data = await res.json();
      const client_id = data?.data?.client_id || data?.client_id;
      const client_secret = data?.data?.client_secret || data?.client_secret;
      if (!client_id || !client_secret) {
        toast({ title: "Registration incomplete", description: "Server did not return credentials." });
        setIsLoading(false);
        return;
      }
      setIssued({ client_id, client_secret });
      toast({ title: "Client registered", description: "Save the secret now. You will not see it again." });
    } catch (err) {
      toast({ title: "Network error", description: (err as Error).message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied to clipboard" });
  } catch {/* ignore clipboard errors */}
  };

  const handleDownload = () => {
    if (!issued) return;
    const blob = new Blob([
      JSON.stringify(
        {
          client_id: issued.client_id,
          client_secret: issued.client_secret,
          created_at: new Date().toISOString(),
        },
        null,
        2
      ),
    ], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${issued.client_id}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dashboard-bg to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <Card className="shadow-large animate-fade-in">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-theme-gradient rounded-full flex items-center justify-center shadow-medium">
              <Briefcase className="h-8 w-8 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">Register New Client</CardTitle>
              <p className="text-muted-foreground">Issue a client_id and one-time client_secret</p>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {!issued ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="slug">Client Slug</Label>
                  <Input
                    id="slug"
                    type="text"
                    placeholder="acme"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    autoComplete="off"
                    required
                  />
                  <p className="text-xs text-muted-foreground">Lowercase, URL-friendly. e.g., acme</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Client Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Acme Group"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="organization"
                    required
                  />
                </div>

                <Separator />

                <Button type="submit" size="lg" className="w-full" variant="gradient" disabled={!canSubmit || isLoading}>
                  {isLoading ? "Registering..." : "Register Client"}
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="p-3 rounded-md border bg-card">
                  <Label>Client ID</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <Input readOnly value={issued.client_id} />
                    <Button type="button" variant="outline" onClick={() => handleCopy(issued.client_id)} className="gap-2">
                      <Copy className="h-4 w-4" /> Copy
                    </Button>
                  </div>
                </div>

                <div className="p-3 rounded-md border bg-card">
                  <Label>Client Secret (one-time)</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <Input readOnly type={reveal ? "text" : "password"} value={issued.client_secret} />
                    <Button type="button" variant="outline" onClick={() => setReveal((s) => !s)} className="gap-2">
                      {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />} {reveal ? "Hide" : "Reveal"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => handleCopy(issued.client_secret)} className="gap-2">
                      <Copy className="h-4 w-4" /> Copy
                    </Button>
                    <Button type="button" variant="gradient" onClick={handleDownload} className="gap-2">
                      <Download className="h-4 w-4" /> Download
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">Store this secret securely. You won’t be able to see it again.</p>
                </div>

                <Separator />
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIssued(null)}>Register Another</Button>
                  <Button variant="default" onClick={() => navigate("/clients")}>Done</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

            {/* Guidance: OAuth authorize + PKCE requirements */}
            <div className="rounded-lg border bg-muted/40 p-4 text-sm leading-relaxed">
              <div className="font-semibold mb-1">/auth/v1/authorize requirements</div>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Required query params: <span className="font-mono text-foreground">client_id</span>, <span className="font-mono text-foreground">response_type=code</span>, <span className="font-mono text-foreground">redirect_uri</span> (must match a registered URI exactly).</li>
                <li>Recommended: <span className="font-mono text-foreground">scope</span> (space-delimited) and <span className="font-mono text-foreground">state</span> (random, printable ≤512 chars; store and validate on callback).</li>
                <li>PKCE: For browser-based SPAs, do not embed <span className="font-mono text-foreground">client_secret</span>. Use PKCE with <span className="font-mono text-foreground">code_challenge_method=S256</span>. The <span className="font-mono text-foreground">code_challenge</span> is optional for now but will become required for public clients.</li>
                <li>Token exchange: Call <span className="font-mono text-foreground">POST /auth/v1/token</span> with <span className="font-mono text-foreground">grant_type=authorization_code</span>, <span className="font-mono text-foreground">code</span>, <span className="font-mono text-foreground">redirect_uri</span>, <span className="font-mono text-foreground">client_id</span>, and for SPAs, include <span className="font-mono text-foreground">code_verifier</span>. Do not send a client secret from the browser.</li>
              </ul>

              <div className="mt-3 font-medium">PKCE (S256) quick-start for SPAs</div>
              <pre className="mt-2 whitespace-pre-wrap rounded-md bg-background p-3 border text-xs overflow-x-auto">
{`// 1) Generate a code_verifier (43–128 chars from [A-Z a-z 0-9 - . _ ~])
const randomString = (len = 64) => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~';
  const bytes = new Uint32Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => chars[b % chars.length]).join('');
};

// 2) Create code_challenge = BASE64URL(SHA256(code_verifier))
const base64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)))
  .replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
const sha256 = async (input) => {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64url(digest);
};

// 3) Build the authorize URL and redirect
async function startLogin({ clientId, authorizeUrl, redirectUri, scope }) {
  const state = crypto.randomUUID();
  const verifier = randomString(64);
  const challenge = await sha256(verifier);
  sessionStorage.setItem('oauth_state', state);
  sessionStorage.setItem('pkce_verifier', verifier);
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: scope || 'read:profile',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });
  window.location.assign(
    authorizeUrl + (authorizeUrl.includes('?') ? '&' : '?') + params.toString()
  );
}

// 4) On callback, validate state and exchange code
async function exchangeCodeForTokens({ tokenUrl, clientId, redirectUri }) {
  const url = new URL(window.location.href);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const expected = sessionStorage.getItem('oauth_state');
  if (!code || !state || state !== expected) throw new Error('Invalid OAuth state');
  const verifier = sessionStorage.getItem('pkce_verifier');
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: verifier || '',
  });
  const res = await fetch(tokenUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  if (!res.ok) throw new Error('Token exchange failed');
  return await res.json();
}`}
              </pre>

              <p className="mt-2 text-xs text-muted-foreground">
                Note: Confidential clients (server-based) may authenticate at <span className="font-mono">/auth/v1/token</span> using HTTP Basic with
                their client_secret. Public browser SPAs must use PKCE and should never embed secrets.
              </p>
            </div>
      </div>
    </div>
  );
}
