import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Edit, Building2, Globe, Mail, User, MapPin, Users, Briefcase, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// Mock data
const client = {
  id: "1",
  name: "TechCorp Solutions",
  slug: "techcorp",
  description: "Leading technology solutions provider for enterprise clients with a focus on digital transformation and cloud-native solutions. We help organizations modernize their infrastructure and accelerate their digital journey.",
  homepage: "https://techcorp.com",
  contactName: "Sarah Johnson",
  contactEmail: "sarah@techcorp.com",
  primaryAwsRegion: "us-east-1",
  memberCount: 45,
  portfolioCount: 12,
  createdAt: "2024-01-15",
  lastUpdated: "2024-07-10"
};

const recentPortfolios = [
  { id: "1", name: "E-commerce Platform", description: "Modern shopping experience", lastUpdated: "2024-07-15" },
  { id: "2", name: "Analytics Dashboard", description: "Real-time business insights", lastUpdated: "2024-07-12" },
  { id: "3", name: "Mobile Banking App", description: "Secure financial services", lastUpdated: "2024-07-08" }
];

const recentMembers = [
  { id: "1", name: "John Smith", role: "Senior Developer", joinedAt: "2024-06-01" },
  { id: "2", name: "Lisa Wong", role: "Product Manager", joinedAt: "2024-05-15" },
  { id: "3", name: "David Garcia", role: "DevOps Engineer", joinedAt: "2024-05-10" }
];

export default function ClientDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/clients">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground">{client.name}</h1>
          <p className="text-muted-foreground">{client.slug}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to={`/clients/${id}/portfolios`}>View Portfolios</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to={`/clients/${id}/zones`}>View Zones</Link>
          </Button>
          <Button asChild>
            <Link to={`/clients/${id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Client
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Client Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-foreground mb-2">Description</h3>
                <p className="text-muted-foreground">{client.description}</p>
              </div>
              
              <Separator />
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Client Key</p>
                      <p className="text-sm text-muted-foreground font-mono">{client.slug}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Homepage</p>
                      <a href={client.homepage} target="_blank" rel="noopener noreferrer" 
                         className="text-sm text-blue-600 hover:underline">
                        {client.homepage}
                      </a>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Contact Person</p>
                      <p className="text-sm text-muted-foreground">{client.contactName}</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Contact Email</p>
                      <p className="text-sm text-muted-foreground">{client.contactEmail}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Primary AWS Region</p>
                      <Badge variant="outline">{client.primaryAwsRegion}</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Recent Portfolios
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentPortfolios.map((portfolio) => (
                  <div 
                    key={portfolio.id} 
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors group"
                    onClick={() => navigate(`/portfolio/${portfolio.id}`)}
                  >
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground">{portfolio.name}</h4>
                      <p className="text-sm text-muted-foreground">{portfolio.description}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Updated</p>
                        <p className="text-sm font-medium">{portfolio.lastUpdated}</p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-4" asChild>
                <Link to="/portfolios">View All Portfolios</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Members</span>
                </div>
                <span className="font-semibold">{client.memberCount}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Portfolios</span>
                </div>
                <span className="font-semibold">{client.portfolioCount}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Recent Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentMembers.map((member) => (
                  <div key={member.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                      <User className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.role}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {member.joinedAt}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{client.createdAt}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Updated</span>
                <span>{client.lastUpdated}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}