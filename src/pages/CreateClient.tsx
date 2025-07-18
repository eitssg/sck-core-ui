import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

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
    
    // Auto-generate slug from name
    if (field === "name" && !isEdit) {
      const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      setFormData(prev => ({ ...prev, slug }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    toast({
      title: isEdit ? "Client updated" : "Client created",
      description: isEdit ? "Client details have been updated successfully." : "New client has been created successfully.",
    });
    
    navigate("/clients");
  };

  const handleDelete = () => {
    toast({
      title: "Client deleted",
      description: "The client has been permanently deleted.",
      variant: "destructive",
    });
    
    navigate("/clients");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to={isEdit ? `/clients/${id}` : "/clients"}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground">
            {isEdit ? "Edit Client" : "Create New Client"}
          </h1>
          <p className="text-muted-foreground">
            {isEdit ? "Update client information and settings" : "Add a new client organization"}
          </p>
        </div>
        {isEdit && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Client</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this client? This action cannot be undone and will 
                  remove all associated portfolios and data.
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
        )}
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Client Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Enter client name"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="slug">Client Key *</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => handleInputChange("slug", e.target.value)}
                  placeholder="client-slug"
                  required
                  pattern="^[a-z0-9-]+$"
                  title="Only lowercase letters, numbers, and hyphens are allowed"
                />
                <p className="text-xs text-muted-foreground">
                  Used in URLs and API endpoints. Only lowercase letters, numbers, and hyphens.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Describe the client organization"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="homepage">Homepage URL</Label>
              <Input
                id="homepage"
                type="url"
                value={formData.homepage}
                onChange={(e) => handleInputChange("homepage", e.target.value)}
                placeholder="https://example.com"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contactName">Contact Name</Label>
                <Input
                  id="contactName"
                  value={formData.contactName}
                  onChange={(e) => handleInputChange("contactName", e.target.value)}
                  placeholder="Primary contact person"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => handleInputChange("contactEmail", e.target.value)}
                  placeholder="contact@example.com"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Technical Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
              <p className="text-xs text-muted-foreground">
                Default AWS region for deployments and resources
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit">
            <Save className="mr-2 h-4 w-4" />
            {isEdit ? "Update Client" : "Create Client"}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link to={isEdit ? `/clients/${id}` : "/clients"}>
              Cancel
            </Link>
          </Button>
        </div>
      </form>
    </div>
  );
}