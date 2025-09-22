import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, FileText, ExternalLink, Download, X } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

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

const categories = ["All", "API", "User Guide", "Development", "Technical", "Security"] as const;
type Category = typeof categories[number];

export default function Docs() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<Category>("All");

  const filteredDocs = useMemo(() => {
    const s = search.trim().toLowerCase();
    return mockDocs.filter(doc => {
      const matchesSearch = !s || doc.title.toLowerCase().includes(s) || doc.description.toLowerCase().includes(s);
      const matchesCategory = category === "All" || doc.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [search, category]);

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
    <DashboardLayout
      activeItem="docs"
      pageTitle="Documentation"
      pageSubtitle="Browse generated guides, references and standards"
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2 order-2 sm:order-1">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => {/* TODO: bulk download hook */}}>
              <Download className="h-4 w-4" />
              Download All
            </Button>
          </div>
          <div className="order-1 sm:order-2 w-full sm:max-w-md relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documentation..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              aria-label="Search documentation"
            />
            {search && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearch("")}
                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <Card className="shadow-soft">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Categories</CardTitle>
            <CardDescription>Select a category to filter the list</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => {
                const active = cat === category;
                return (
                  <Button
                    key={cat}
                    size="sm"
                    variant={active ? 'default' : 'secondary'}
                    className="h-7 px-3"
                    onClick={() => setCategory(cat)}
                    aria-pressed={active}
                  >
                    {cat}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" role="list" aria-label="Documentation entries">
          {filteredDocs.map(doc => (
            <Card key={doc.id} className="shadow-medium hover:shadow-large transition-shadow" role="listitem">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg leading-tight line-clamp-2">{doc.title}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">Updated {doc.lastUpdated}</p>
                    </div>
                  </div>
                  <Badge className="whitespace-nowrap" variant="secondary">{doc.category}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-3">{doc.description}</p>
                <Separator />
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <a href={doc.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View
                    </a>
                  </Button>
                  <Button variant="ghost" size="sm" asChild aria-label={`Download ${doc.title}`}>
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
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No documentation found</h3>
              <p className="text-muted-foreground mb-4">Adjust search terms or choose another category.</p>
              {search && (
                <Button size="sm" variant="secondary" onClick={() => setSearch("")}>Clear Search</Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}