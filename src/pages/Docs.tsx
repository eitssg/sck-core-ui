import { useState } from "react";
import { Search, FileText, ExternalLink, Calendar, Download, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Mock documentation data (would be loaded from sphinx output)
const mockDocs = [
  {
    id: 1,
    title: "API Reference Guide",
    description: "Complete API documentation with endpoints, parameters, and examples",
    category: "API",
    lastUpdated: "2024-01-15",
    size: "2.3 MB",
    url: "/docs/api-reference.html",
    downloadUrl: "/docs/api-reference.pdf"
  },
  {
    id: 2,
    title: "User Administration Manual",
    description: "Step-by-step guide for managing users and permissions",
    category: "User Guide",
    lastUpdated: "2024-01-12",
    size: "1.8 MB",
    url: "/docs/user-admin.html",
    downloadUrl: "/docs/user-admin.pdf"
  },
  {
    id: 3,
    title: "Portfolio Management Guide",
    description: "Comprehensive guide for creating and managing portfolios",
    category: "User Guide",
    lastUpdated: "2024-01-10",
    size: "1.2 MB",
    url: "/docs/portfolio-guide.html",
    downloadUrl: "/docs/portfolio-guide.pdf"
  },
  {
    id: 4,
    title: "Application Development Standards",
    description: "Development guidelines and best practices for applications",
    category: "Development",
    lastUpdated: "2024-01-08",
    size: "956 KB",
    url: "/docs/dev-standards.html",
    downloadUrl: "/docs/dev-standards.pdf"
  },
  {
    id: 5,
    title: "Database Schema Documentation",
    description: "Complete database structure and relationship documentation",
    category: "Technical",
    lastUpdated: "2024-01-05",
    size: "3.1 MB",
    url: "/docs/database-schema.html",
    downloadUrl: "/docs/database-schema.pdf"
  },
  {
    id: 6,
    title: "Security & Compliance Guide",
    description: "Security protocols and compliance requirements",
    category: "Security",
    lastUpdated: "2024-01-03",
    size: "1.5 MB",
    url: "/docs/security-guide.html",
    downloadUrl: "/docs/security-guide.pdf"
  }
];

const categories = ["All", "API", "User Guide", "Development", "Technical", "Security"];

export default function Docs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const filteredDocs = mockDocs.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "All" || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "API":
        return "bg-blue-100 text-blue-800";
      case "User Guide":
        return "bg-green-100 text-green-800";
      case "Development":
        return "bg-purple-100 text-purple-800";
      case "Technical":
        return "bg-orange-100 text-orange-800";
      case "Security":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Documentation</h1>
          <p className="text-muted-foreground">Browse and access system documentation</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Download All
        </Button>
      </div>

      {/* Search and Filters */}
      <Card className="shadow-soft">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documentation..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Filter className="h-4 w-4" />
                  {selectedCategory}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {categories.map((category) => (
                  <DropdownMenuItem
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Documentation Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDocs.map((doc) => (
          <Card key={doc.id} className="shadow-medium hover:shadow-large transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg leading-tight">{doc.title}</CardTitle>
                  </div>
                </div>
                <Badge className={getCategoryColor(doc.category)} variant="secondary">
                  {doc.category}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <p className="text-sm text-foreground">{doc.description}</p>
              
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>Last Updated</span>
                  <span>{doc.lastUpdated}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>File Size</span>
                  <span>{doc.size}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1" asChild>
                  <a href={doc.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View
                  </a>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <a href={doc.downloadUrl} download>
                    <Download className="h-3 w-3" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredDocs.length === 0 && (
        <Card className="shadow-soft">
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No documentation found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search terms or category filter.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}