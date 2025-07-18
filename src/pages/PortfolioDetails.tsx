import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Edit, Trash2, Save, X, ArrowLeft, Briefcase, ExternalLink, FolderOpen, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Mock data - would come from API based on ID
const mockPortfolio = {
  id: 1,
  name: "Enterprise Suite",
  code: "ENT",
  description: "Comprehensive enterprise applications for business management",
  homePageUrl: "https://enterprise.company.com",
  applicationCount: 12,
  lastUpdated: "2024-01-15",
  status: "active",
  client: {
    id: 1,
    name: "TechCorp Solutions",
    slug: "techcorp"
  },
  applications: [
    { id: 1, name: "User Management", slug: "user-mgmt", status: "active" },
    { id: 2, name: "Analytics Dashboard", slug: "analytics-dash", status: "active" },
    { id: 3, name: "Inventory Tracker", slug: "inventory-track", status: "development" },
  ]
};

export default function PortfolioDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: mockPortfolio.name,
    code: mockPortfolio.code,
    description: mockPortfolio.description,
    homePageUrl: mockPortfolio.homePageUrl
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    // TODO: Implement actual save logic
    setTimeout(() => {
      setIsLoading(false);
      setIsEditing(false);
    }, 1000);
  };

  const handleDelete = () => {
    // TODO: Implement actual delete logic
    navigate("/portfolios");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "development":
        return "bg-blue-100 text-blue-800";
      case "maintenance":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/portfolios")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Portfolios
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Portfolio Details</h1>
            <p className="text-muted-foreground">View and manage portfolio information</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {!isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Portfolio</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the portfolio and all its applications. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete Portfolio
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button variant="gradient" onClick={handleSave} disabled={isLoading}>
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Portfolio Information */}
        <div className="lg:col-span-2">
          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                Portfolio Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {isEditing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Portfolio Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="code">Portfolio Code</Label>
                      <Input
                        id="code"
                        value={formData.code}
                        onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                        className="font-mono"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="min-h-[80px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="homePageUrl">Home Page URL</Label>
                    <Input
                      id="homePageUrl"
                      type="url"
                      value={formData.homePageUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, homePageUrl: e.target.value }))}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">{mockPortfolio.name}</h2>
                    <p className="text-muted-foreground">Code: {mockPortfolio.code}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Client</p>
                    <p className="font-medium text-foreground">{mockPortfolio.client.name}</p>
                    <p className="text-xs text-muted-foreground">{mockPortfolio.client.slug}</p>
                  </div>
                  <p className="text-foreground">{mockPortfolio.description}</p>
                  {mockPortfolio.homePageUrl && (
                    <div className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      <a 
                        href={mockPortfolio.homePageUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {mockPortfolio.homePageUrl}
                      </a>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Portfolio Stats */}
        <div className="space-y-6">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="text-lg">Portfolio Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge className={getStatusColor(mockPortfolio.status)} variant="secondary">
                  {mockPortfolio.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Applications</span>
                <span className="font-medium">{mockPortfolio.applicationCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Last Updated</span>
                <span className="font-medium">{mockPortfolio.lastUpdated}</span>
              </div>
            </CardContent>
          </Card>

          {/* Recent Applications */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                Applications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockPortfolio.applications.map((app) => (
                  <div 
                    key={app.id} 
                    className="flex items-center justify-between p-2 bg-muted/30 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group"
                    onClick={() => navigate(`/application/${app.id}`)}
                  >
                    <div>
                      <span className="font-medium">{app.name}</span>
                      <p className="text-xs text-muted-foreground">{app.slug}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(app.status)} variant="secondary">
                        {app.status}
                      </Badge>
                      <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" className="w-full mt-4">
                View All Applications
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}