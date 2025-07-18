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

// Mock portfolios for selection
const mockPortfolios = [
  { id: 1, name: "Enterprise Suite", code: "ENT" },
  { id: 2, name: "Mobile Apps", code: "MOB" },
  { id: 3, name: "Analytics Platform", code: "ANL" }
];

export default function CreateApplication() {
  const [formData, setFormData] = useState({
    name: "",
    portfolio: "",
    description: "",
    version: "v1.0.0",
    environment: "development"
  });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // TODO: Implement actual application creation logic
    setTimeout(() => {
      setIsLoading(false);
      navigate("/applications");
    }, 1000);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/applications")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Applications
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Create Application</h1>
          <p className="text-muted-foreground">Add a new application to your portfolio</p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl">
        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-primary" />
              Application Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Application Name *</Label>
                  <div className="relative">
                    <FolderOpen className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      placeholder="User Management System"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="portfolio">Portfolio *</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                    <Select value={formData.portfolio} onValueChange={(value) => handleInputChange("portfolio", value)}>
                      <SelectTrigger className="pl-10">
                        <SelectValue placeholder="Select portfolio" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockPortfolios.map((portfolio) => (
                          <SelectItem key={portfolio.id} value={portfolio.name}>
                            {portfolio.name} ({portfolio.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Textarea
                    id="description"
                    placeholder="Centralized user administration and management system"
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    className="pl-10 min-h-[80px]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="version">Initial Version</Label>
                  <div className="relative">
                    <Code className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="version"
                      placeholder="v1.0.0"
                      value={formData.version}
                      onChange={(e) => handleInputChange("version", e.target.value)}
                      className="pl-10 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="environment">Environment</Label>
                  <Select value={formData.environment} onValueChange={(value) => handleInputChange("environment", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="development">Development</SelectItem>
                      <SelectItem value="staging">Staging</SelectItem>
                      <SelectItem value="production">Production</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  variant="gradient"
                  disabled={isLoading || !formData.name || !formData.portfolio || !formData.description}
                  className="flex-1"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? "Creating Application..." : "Create Application"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/applications")}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}