import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Save, Trash2, Building2, Tag as TagIcon, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
// Removed DashboardLayout for standalone form page

const awsRegions = [
  "us-east-1", "us-east-2", "us-west-1", "us-west-2",
  "eu-west-1", "eu-west-2", "eu-west-3", "eu-central-1",
  "ap-southeast-1", "ap-southeast-2", "ap-northeast-1", "ap-northeast-2",
  "ca-central-1", "sa-east-1"
];

export default function CreateClient() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: isEdit ? "TechCorp Solutions" : "",
    slug: isEdit ? "techcorp" : "",
    description: isEdit ? "Leading technology solutions provider for enterprise clients" : "",
    homepage: isEdit ? "https://techcorp.com" : "",
    contactName: isEdit ? "Sarah Johnson" : "",
    contactEmail: isEdit ? "sarah@techcorp.com" : "",
    primaryAwsRegion: isEdit ? "us-east-1" : ""
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Wire to API. For now, just toast and navigate.
    toast({ title: isEdit ? "Client updated" : "Client created" });
    navigate(isEdit ? `/clients/${id}` : "/clients");
  };

  const handleDelete = () => {
    // TODO: Wire to API. For now, just toast and navigate.
    toast({ title: "Client deleted", variant: "destructive" });
    navigate("/clients");
  };

  const pageTitle = isEdit ? "Edit Client" : "Create Client";
  const pageSubtitle = isEdit ? "Update client information and settings" : "Add a new client organization";

  return (
    <div className="animate-fade-in px-4 sm:px-6 lg:px-8 py-8">
      <div className="mx-auto w-full max-w-lg">
        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              {pageTitle}
            </CardTitle>
            <CardDescription>{pageSubtitle}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Client Name *</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      placeholder="TechCorp Solutions"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">Client Key *</Label>
                  <div className="relative">
                    <TagIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="slug"
                      placeholder="techcorp"
                      value={formData.slug}
                      onChange={(e) => handleInputChange("slug", e.target.value)}
                      className="pl-10"
                      required
                      maxLength={8}
                      pattern="^[a-z]{1,8}$"
                      title="Only lowercase letters (a-z), maximum 8 characters"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Lowercase a–z, up to 8 chars. Used in URLs and API.</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Leading technology solutions provider for enterprise clients"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  className="min-h-[80px]"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="homepage">Homepage URL</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="homepage"
                    type="url"
                    placeholder="https://example.com"
                    value={formData.homepage}
                    onChange={(e) => handleInputChange("homepage", e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="primaryAwsRegion">Primary AWS Region *</Label>
                <Select value={formData.primaryAwsRegion} onValueChange={(value) => handleInputChange("primaryAwsRegion", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select AWS region" />
                  </SelectTrigger>
                  <SelectContent>
                    {awsRegions.map((region) => (
                      <SelectItem key={region} value={region}>
                        {region}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Default region for deployments and resources</p>
              </div>

              <div className="flex gap-3 pt-4 items-center justify-between">
                {isEdit ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button type="button" variant="ghost" className="text-muted-foreground hover:text-foreground gap-1">
                        <Trash2 className="h-4 w-4" /> Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Client</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this client? This action cannot be undone and will remove all associated portfolios and data.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Delete Client
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : (
                  <span />
                )}

                <div className="ml-auto flex gap-3">
                  <Button type="submit">
                    <Save className="h-4 w-4 mr-2" />
                    {isEdit ? "Update Client" : "Create Client"}
                  </Button>
                  <Button type="button" variant="outline" asChild>
                    <Link to={isEdit ? `/clients/${id}` : "/clients"}>Cancel</Link>
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}