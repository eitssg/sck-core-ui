import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Save, Edit, Camera, Briefcase, Calendar, Building2, Palette, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppSelector, useAppDispatch } from "@/store";
import { selectUser, selectUserProfiles, selectCurrentProfile, fetchUserProfile } from "@/store/slices/profileSlice";
import { useReduxData } from "@/hooks/useReduxData";
import { ThemeSelector } from "@/components/ThemeSelector";
import { useTheme } from "@/hooks/useTheme";

export default function Profile() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { selectedClient, portfolios } = useReduxData();
  const { theme, themeConfig } = useTheme();
  
  // Get Redux profile data
  const user = useAppSelector(selectUser);
  const userProfiles = useAppSelector(selectUserProfiles);
  const currentProfile = useAppSelector(selectCurrentProfile);
  
  // Local state for editing
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editData, setEditData] = useState({
    display_name: '',
    email: '',
    first_name: '',
    last_name: '',
    profile_description: '',
    timezone: '',
    language: '',
    preferred_region: '',
    avatar_url: '',
  });

  // Initialize edit data when user data changes
  useEffect(() => {
    if (user) {
      setEditData({
        display_name: user.display_name || '',
        email: user.email || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        profile_description: user.profile_description || '',
        timezone: user.timezone || 'UTC',
        language: user.language || 'en-US',
        preferred_region: user.preferred_region || 'us-east-1',
        avatar_url: user.avatar_url || '',
      });
    }
  }, [user]);

  const userPortfolios = selectedClient ? portfolios.filter(p => p.clientId === selectedClient.id) : [];

  const handleSave = async () => {
    setIsLoading(true);
    
    try {
      // TODO: Implement profile update API call
      // const result = await authAPI.updateProfile(editData);
      // if (result.error) {
      //   setError(result.error);
      //   return;
      // }
      
      // For now, just simulate the save
      setTimeout(() => {
        setIsLoading(false);
        setIsEditing(false);
        // TODO: Update Redux state with new profile data
      }, 1000);
    } catch (error) {
      console.error('Save profile failed:', error);
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const handleProfileSwitch = async (profileName: string) => {
    try {
      await dispatch(fetchUserProfile(profileName)).unwrap();
    } catch (error) {
      console.error('Failed to switch profile:', error);
    }
  };

  // Format full name from first/last name
  const getFullName = () => {
    if (!user) return 'Unknown User';
    if (user.display_name) return user.display_name;
    
    const firstName = user.first_name || '';
    const lastName = user.last_name || '';
    return `${firstName} ${lastName}`.trim() || 'Unknown User';
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user) return 'U';
    if (user.display_name) {
      return user.display_name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    
    const firstName = user.first_name || '';
    const lastName = user.last_name || '';
    return `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase() || 'U';
  };

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not available';
    return new Date(dateString).toLocaleDateString();
  };

  // Show loading if no user data
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in bg-background text-foreground">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Profile</h1>
          <p className="text-muted-foreground">Manage your account settings and preferences</p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Profile Selector */}
          {userProfiles && userProfiles.length > 1 && (
            <Select 
              value={currentProfile || user.profile_name} 
              onValueChange={handleProfileSwitch}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select profile" />
              </SelectTrigger>
              <SelectContent>
                {userProfiles.map((profile) => (
                  <SelectItem key={profile} value={profile}>
                    {profile}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          {/* Edit/Save Buttons */}
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)} className="gap-2">
              <Edit className="h-4 w-4" />
              Edit Profile
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isLoading} className="gap-2">
                <Save className="h-4 w-4" />
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Information */}
          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Section */}
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={user.avatar_url} alt={getFullName()} />
                  <AvatarFallback className="text-lg">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                {isEditing && (
                  <Button variant="outline" size="sm" className="gap-2">
                    <Camera className="h-4 w-4" />
                    Change Photo
                  </Button>
                )}
              </div>

              {!isEditing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Display Name</Label>
                      <p className="mt-1">{user.display_name || 'Not set'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                      <p className="mt-1">{user.email || 'Not set'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">First Name</Label>
                      <p className="mt-1">{user.first_name || 'Not set'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Last Name</Label>
                      <p className="mt-1">{user.last_name || 'Not set'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Timezone</Label>
                      <p className="mt-1">{user.timezone || 'UTC'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Language</Label>
                      <p className="mt-1">{user.language || 'en-US'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Preferred Region</Label>
                      <p className="mt-1">{user.preferred_region || 'us-east-1'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Profile</Label>
                      <Badge variant="secondary">{user.profile_name || 'default'}</Badge>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Profile Description</Label>
                    <p className="mt-1">{user.profile_description || 'No description available'}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="display_name">Display Name</Label>
                      <Input
                        id="display_name"
                        value={editData.display_name}
                        onChange={(e) => handleInputChange('display_name', e.target.value)}
                        placeholder="How you want your name to appear"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={editData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="first_name">First Name</Label>
                      <Input
                        id="first_name"
                        value={editData.first_name}
                        onChange={(e) => handleInputChange('first_name', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last_name">Last Name</Label>
                      <Input
                        id="last_name"
                        value={editData.last_name}
                        onChange={(e) => handleInputChange('last_name', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="timezone">Timezone</Label>
                      <Select value={editData.timezone} onValueChange={(value) => handleInputChange('timezone', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select timezone" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="UTC">UTC</SelectItem>
                          <SelectItem value="America/New_York">Eastern Time</SelectItem>
                          <SelectItem value="America/Chicago">Central Time</SelectItem>
                          <SelectItem value="America/Denver">Mountain Time</SelectItem>
                          <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                          <SelectItem value="Europe/London">London</SelectItem>
                          <SelectItem value="Europe/Paris">Paris</SelectItem>
                          <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="language">Language</Label>
                      <Select value={editData.language} onValueChange={(value) => handleInputChange('language', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en-US">English (US)</SelectItem>
                          <SelectItem value="en-GB">English (UK)</SelectItem>
                          <SelectItem value="es-ES">Spanish</SelectItem>
                          <SelectItem value="fr-FR">French</SelectItem>
                          <SelectItem value="de-DE">German</SelectItem>
                          <SelectItem value="ja-JP">Japanese</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="preferred_region">Preferred AWS Region</Label>
                      <Select value={editData.preferred_region} onValueChange={(value) => handleInputChange('preferred_region', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select region" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="us-east-1">US East (N. Virginia)</SelectItem>
                          <SelectItem value="us-east-2">US East (Ohio)</SelectItem>
                          <SelectItem value="us-west-1">US West (N. California)</SelectItem>
                          <SelectItem value="us-west-2">US West (Oregon)</SelectItem>
                          <SelectItem value="eu-west-1">Europe (Ireland)</SelectItem>
                          <SelectItem value="eu-central-1">Europe (Frankfurt)</SelectItem>
                          <SelectItem value="ap-southeast-1">Asia Pacific (Singapore)</SelectItem>
                          <SelectItem value="ap-northeast-1">Asia Pacific (Tokyo)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="avatar_url">Avatar URL</Label>
                      <Input
                        id="avatar_url"
                        value={editData.avatar_url}
                        onChange={(e) => handleInputChange('avatar_url', e.target.value)}
                        placeholder="https://example.com/avatar.jpg"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="profile_description">Profile Description</Label>
                    <Textarea
                      id="profile_description"
                      value={editData.profile_description}
                      onChange={(e) => handleInputChange('profile_description', e.target.value)}
                      rows={3}
                      placeholder="Describe your role or this profile's purpose"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Theme Settings */}
          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                Theme Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ThemeSelector />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Account Stats */}
          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle>Account Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Created</span>
                </div>
                <span className="text-sm font-medium">{formatDate(user.created_at)}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Last Login</span>
                </div>
                <span className="text-sm font-medium">{formatDate(user.last_login)}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">AWS Account</span>
                </div>
                <span className="text-sm font-medium">{user.aws_account_id || 'Not set'}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Portfolios</span>
                </div>
                <span className="text-sm font-medium">{userPortfolios.length}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Sessions</span>
                </div>
                <span className="text-sm font-medium">{user.session_count || 0}</span>
              </div>

              {/* Current Profile Indicator */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Current Profile</span>
                </div>
                <Badge variant={user.is_active ? "default" : "secondary"} className="text-xs">
                  {currentProfile || user.profile_name}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* AWS Information */}
          {user.aws_user_arn && (
            <Card className="shadow-medium">
              <CardHeader>
                <CardTitle>AWS Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">User ARN</Label>
                  <p className="text-xs font-mono break-all">{user.aws_user_arn}</p>
                </div>
                
                {user.access_key_prefix && (
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">Access Key</Label>
                    <p className="text-xs font-mono">{user.access_key_prefix}********</p>
                  </div>
                )}
                
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Preferred Region</Label>
                  <p className="text-xs">{user.preferred_region || 'us-east-1'}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Portfolios */}
          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle>Your Portfolios</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {userPortfolios.slice(0, 3).map((portfolio) => (
                  <div 
                    key={portfolio.id} 
                    className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
                    onClick={() => navigate(`/portfolios/${portfolio.id}`)}
                  >
                    <div>
                      <p className="font-medium">{portfolio.name}</p>
                      <p className="text-xs text-muted-foreground">{portfolio.code}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {portfolio.status}
                    </Badge>
                  </div>
                ))}
                {userPortfolios.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No portfolios available
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}