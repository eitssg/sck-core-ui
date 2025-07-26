import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Save, ArrowLeft, FolderOpen, Code, FileText, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useReduxData } from "@/hooks/useReduxData";
import { useToast } from "@/hooks/use-toast";

export default function CreateApplication() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { portfolios, selectedClient } = useReduxData();
  
  // Filter portfolios for the selected client
  const clientPortfolios = portfolios.filter(p => p.clientId === selectedClient?.id);

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    code: "",
    description: "",
    portfolioId: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
      // Auto-generate slug from name
      ...(field === 'name' && {
        slug: value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        code: value.toUpperCase().replace(/[^A-Z0-9]+/g, '').substring(0, 6)
      })
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Application name is required",
        variant: "destructive",
      });
      return false;
    }
    
    if (!formData.portfolioId) {
      toast({
        title: "Validation Error", 
        description: "Please select a portfolio",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);

    try {
      // Create new application object
      const newApplication = {
        id: crypto.randomUUID(),
        clientPortfolio: `${formData.portfolioId}`,
        appRegex: `^${formData.slug.trim()}.*$`,
        name: formData.name.trim(),
        environment: 'Development',
        account: 'default-account',
        zone: 'z1', // Should be selectable in form
        imageAliases: {},
        repository: `repo/${formData.slug.trim()}`,
        region: 'us-east-1',
        tags: { created: new Date().toISOString() },
        enforceValidation: 'true',
        metadata: {},
        slug: formData.slug.trim(),
        code: formData.code.trim(),
        description: formData.description.trim(),
        portfolioId: formData.portfolioId,
        status: 'stopped' as const,
        version: '1.0.0',
        lastDeploy: new Date().toISOString(),
      };

      // TODO: Call proper Redux action to create application via API
      // Should call: createApplication(newApplication) which simulates API call

      toast({
        title: "Success!",
        description: `Application "${formData.name}" has been created successfully.`,
      });

      // Navigate back to applications list
      navigate('/applications');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create application. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!selectedClient) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Card className="shadow-soft">
          <CardContent className="p-12 text-center">
            <h3 className="text-lg font-semibold text-foreground mb-2">No Client Selected</h3>
            <p className="text-muted-foreground mb-6">
              Please select a client first to create an application.
            </p>
            <Button onClick={() => navigate('/dashboard')}>
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="icon"
          onClick={() => navigate('/applications')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Create Application</h1>
          <p className="text-muted-foreground">Add a new application to your portfolio</p>
        </div>
      </div>

      {/* Create Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5 text-primary" />
              Application Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Application Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., User Management System"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">Application Code</Label>
                <Input
                  id="code"
                  placeholder="e.g., UMS"
                  value={formData.code}
                  onChange={(e) => handleInputChange('code', e.target.value)}
                  maxLength={6}
                />
                <p className="text-xs text-muted-foreground">
                  Auto-generated from name, or enter custom code (max 6 chars)
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">URL Slug</Label>
              <Input
                id="slug"
                placeholder="e.g., user-management-system"
                value={formData.slug}
                onChange={(e) => handleInputChange('slug', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Auto-generated from name, used in URLs and deployment paths
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what this application does..."
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
              />
            </div>

            {/* Portfolio Selection */}
            <div className="space-y-2">
              <Label htmlFor="portfolio">Portfolio *</Label>
              <Select 
                value={formData.portfolioId} 
                onValueChange={(value) => handleInputChange('portfolioId', value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a portfolio" />
                </SelectTrigger>
                <SelectContent>
                  {clientPortfolios.map((portfolio) => (
                    <SelectItem key={portfolio.id} value={portfolio.id}>
                      <div className="flex items-center gap-2">
                        <FolderOpen className="h-4 w-4" />
                        {portfolio.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {clientPortfolios.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No portfolios available. Create a portfolio first.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/applications')}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="gradient"
            disabled={isSubmitting || clientPortfolios.length === 0}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {isSubmitting ? "Creating..." : "Create Application"}
          </Button>
        </div>
      </form>
    </div>
  );
}