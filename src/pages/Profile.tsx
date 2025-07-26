import { useState } from "react";
import { User, Mail, Phone, Building, Calendar, Settings, Building2, Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useReduxData } from "@/hooks/useReduxData";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Mock data
const mockUser = {
  name: "John Administrator",
  email: "john.admin@company.com",
  phone: "+1 (555) 123-4567",
  department: "IT Operations",
  joinDate: "January 2022",
  lastLogin: "2 hours ago"
};

const mockPortfolios = [
  { id: 1, name: "Enterprise Suite", code: "ENT" },
  { id: 2, name: "Mobile Apps", code: "MOB" },
  { id: 3, name: "Analytics Platform", code: "ANL" },
];

export default function Profile() {
  const [isEditing, setIsEditing] = useState(false);
  const [currentProfile, setCurrentProfile] = useState(mockPortfolios[0]);
  const [userData, setUserData] = useState(mockUser);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [requestedClientName, setRequestedClientName] = useState("");
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const { clients, defaultClient, defaultClientId, setUserDefaultClient } = useReduxData();
  const { toast } = useToast();

  const handleSave = () => {
    // TODO: Implement save logic
    setIsEditing(false);
  };

  const handleSetDefaultClient = (clientId: string) => {
    setUserDefaultClient(clientId);
  };

  const generateRequestId = () => {
    return Math.random().toString(36).substring(2, 14).toUpperCase();
  };

  const handleRequestClientAccess = async () => {
    if (!requestedClientName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a client name.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingRequest(true);
    
    // Simulate API call
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const requestId = generateRequestId();
      
      toast({
        title: "Request Submitted Successfully",
        description: `Your client access request has been submitted and will be reviewed by an administrator. For support inquiries, contact support@mynet.com and reference your request ID: ${requestId}`,
        duration: 15000,
        action: (
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(requestId);
              toast({
                title: "Copied!",
                description: "Request ID copied to clipboard",
                duration: 2000,
              });
            }}
          >
            Copy ID
          </Button>
        ),
      });

      setIsRequestDialogOpen(false);
      setRequestedClientName("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">User Profile</h1>
          <p className="text-muted-foreground">Manage your account settings and preferences</p>
        </div>
        <Button 
          variant={isEditing ? "default" : "outline"} 
          onClick={isEditing ? handleSave : () => setIsEditing(true)}
        >
          <Settings className="h-4 w-4 mr-2" />
          {isEditing ? "Save Changes" : "Edit Profile"}
        </Button>
      </div>

      <div className="space-y-8">
        {/* User Information - Top Section */}
        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    value={userData.name}
                    onChange={(e) => setUserData({ ...userData, name: e.target.value })}
                    className="pl-10"
                    disabled={!isEditing}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={userData.email}
                    onChange={(e) => setUserData({ ...userData, email: e.target.value })}
                    className="pl-10"
                    disabled={!isEditing}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    value={userData.phone}
                    onChange={(e) => setUserData({ ...userData, phone: e.target.value })}
                    className="pl-10"
                    disabled={!isEditing}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <div className="relative">
                  <Building className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="department"
                    value={userData.department}
                    onChange={(e) => setUserData({ ...userData, department: e.target.value })}
                    className="pl-10"
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Join Date</p>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm text-foreground">{userData.joinDate}</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Last Login</p>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm text-foreground">{userData.lastLogin}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Client Access Management - Bottom Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Client Access</h2>
              <p className="text-sm text-muted-foreground">
                Manage your client access and set your default client
              </p>
            </div>
            <div className="flex items-center gap-3">
              {defaultClient && (
                <Badge variant="secondary" className="text-sm">
                  Default: {defaultClient.name}
                </Badge>
              )}
              <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Request Client Access
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Request Client Access</DialogTitle>
                    <DialogDescription>
                      Enter the name of the client you would like to request access to.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="clientName">Client Name</Label>
                      <Input
                        id="clientName"
                        placeholder="Enter client name..."
                        value={requestedClientName}
                        onChange={(e) => setRequestedClientName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleRequestClientAccess();
                          }
                        }}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsRequestDialogOpen(false);
                        setRequestedClientName("");
                      }}
                      disabled={isSubmittingRequest}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleRequestClientAccess}
                      disabled={isSubmittingRequest}
                    >
                      {isSubmittingRequest ? "Submitting..." : "Submit Request"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {clients.length === 0 ? (
            <Card className="shadow-medium">
              <CardContent className="text-center py-12">
                <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No clients available</h3>
                <p className="text-sm text-muted-foreground">
                  Contact your administrator to request client access
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {clients.map((client) => (
                <Card
                  key={client.id}
                  className={`shadow-medium transition-colors ${
                    defaultClientId === client.id 
                      ? 'ring-2 ring-primary/20 bg-primary/5' 
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">{client.name}</CardTitle>
                        {defaultClientId === client.id && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </div>
                    </div>
                    <CardDescription className="text-sm">
                      {client.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Members</p>
                        <p className="font-medium">{client.memberCount}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Portfolios</p>
                        <p className="font-medium">{client.portfolioCount}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-muted-foreground">AWS Region</p>
                        <p className="font-medium">{client.primaryAwsRegion}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-2">
                      <div className="text-xs text-muted-foreground">
                        <a href={client.homepage} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
                          {client.homepage}
                        </a>
                      </div>
                      {defaultClientId !== client.id && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSetDefaultClient(client.id)}
                        >
                          Set Default
                        </Button>
                      )}
                      {defaultClientId === client.id && (
                        <Badge variant="default" className="text-xs">
                          Default Client
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}