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
      </div>
    </div>
  );
}
