import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Save, ArrowLeft, Briefcase, Code, FileText, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CreatePortfolio() {
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    homePageUrl: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // TODO: Implement actual portfolio creation logic
    setTimeout(() => {
      setIsLoading(false);
      navigate("/portfolios");
    }, 1000);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Auto-generate code from name
    if (field === "name" && value && !formData.code) {
      const code = value
        .toUpperCase()
        .replace(/[^A-Z0-9\s]/g, "")
        .split(" ")
        .map(word => word.charAt(0))
        .join("")
        .substring(0, 3);
      setFormData(prev => ({ ...prev, code }));
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/portfolios")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Portfolios
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Create Portfolio</h1>
          <p className="text-muted-foreground">Set up a new application portfolio</p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl">
        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              Portfolio Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Portfolio Name *</Label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      placeholder="Enterprise Suite"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="code">Portfolio Code *</Label>
                  <div className="relative">
                    <Code className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="code"
                      placeholder="ENT"
                      value={formData.code}
                      onChange={(e) => handleInputChange("code", e.target.value.toUpperCase())}
                      className="pl-10 font-mono"
                      maxLength={10}
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Unique identifier (auto-generated from name)
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Textarea
                    id="description"
                    placeholder="Comprehensive enterprise applications for business management"
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    className="pl-10 min-h-[80px]"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="homePageUrl">Home Page URL</Label>
                <div className="relative">
                  <ExternalLink className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="homePageUrl"
                    type="url"
                    placeholder="https://enterprise.company.com"
                    value={formData.homePageUrl}
                    onChange={(e) => handleInputChange("homePageUrl", e.target.value)}
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Optional: Link to the portfolio's main landing page
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  variant="gradient"
                  disabled={isLoading || !formData.name || !formData.code || !formData.description}
                  className="flex-1"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? "Creating Portfolio..." : "Create Portfolio"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/portfolios")}
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