import { useState } from "react";
import { Plus, Briefcase, Edit, Trash2, ExternalLink, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Mock data
const mockPortfolios = [
  {
    id: 1,
    name: "Enterprise Suite",
    code: "ENT",
    description: "Comprehensive enterprise applications for business management",
    homePageUrl: "https://enterprise.company.com",
    applicationCount: 12,
    lastUpdated: "2024-01-15",
    status: "active"
  },
  {
    id: 2,
    name: "Mobile Apps",
    code: "MOB",
    description: "Cross-platform mobile applications for customer engagement",
    homePageUrl: "https://mobile.company.com",
    applicationCount: 8,
    lastUpdated: "2024-01-10",
    status: "active"
  },
  {
    id: 3,
    name: "Analytics Platform",
    code: "ANL",
    description: "Business intelligence and data analytics solutions",
    homePageUrl: "https://analytics.company.com",
    applicationCount: 5,
    lastUpdated: "2024-01-08",
    status: "development"
  }
];

export default function Portfolios() {
  const [portfolios] = useState(mockPortfolios);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "development":
        return "bg-blue-100 text-blue-800";
      case "maintenance":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Portfolios</h1>
          <p className="text-muted-foreground">Manage your application portfolios</p>
        </div>
        <Button variant="gradient" className="gap-2">
          <Plus className="h-4 w-4" />
          Create Portfolio
        </Button>
      </div>

      {/* Portfolio Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {portfolios.map((portfolio) => (
          <Card key={portfolio.id} className="shadow-medium hover:shadow-large transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Briefcase className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{portfolio.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">Code: {portfolio.code}</p>
                  </div>
                </div>
                <Badge className={getStatusColor(portfolio.status)} variant="secondary">
                  {portfolio.status}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <p className="text-sm text-foreground">{portfolio.description}</p>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Applications</span>
                  <span className="font-medium text-foreground">{portfolio.applicationCount}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Last Updated</span>
                  <span className="font-medium text-foreground">{portfolio.lastUpdated}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  View
                </Button>
                <Button variant="ghost" size="sm">
                  <Edit className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}