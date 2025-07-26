import { useState } from "react";
import { Save, RefreshCw, Bell, Palette, Server, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { toast } = useToast();
  
  // Load settings from localStorage or use defaults
  const [apiSettings, setApiSettings] = useState({
    baseUrl: localStorage.getItem('api-base-url') || 'https://api.coreautomation.com/v1',
    timeout: parseInt(localStorage.getItem('api-timeout') || '30000'),
    retryAttempts: parseInt(localStorage.getItem('api-retry-attempts') || '3'),
  });

  const [dashboardSettings, setDashboardSettings] = useState({
    refreshInterval: parseInt(localStorage.getItem('dashboard-refresh-interval') || '30'),
    autoRefresh: localStorage.getItem('dashboard-auto-refresh') === 'true',
    defaultView: localStorage.getItem('dashboard-default-view') || 'overview',
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: localStorage.getItem('email-notifications') === 'true',
    pushNotifications: localStorage.getItem('push-notifications') === 'true',
    deploymentAlerts: localStorage.getItem('deployment-alerts') === 'true',
    systemAlerts: localStorage.getItem('system-alerts') === 'true',
  });

  const [uiSettings, setUiSettings] = useState({
    theme: localStorage.getItem('ui-theme') || 'system',
    sidebarCollapsed: localStorage.getItem('sidebar-collapsed') === 'true',
    compactMode: localStorage.getItem('compact-mode') === 'true',
  });

  const saveSettings = () => {
    // Save API settings
    localStorage.setItem('api-base-url', apiSettings.baseUrl);
    localStorage.setItem('api-timeout', apiSettings.timeout.toString());
    localStorage.setItem('api-retry-attempts', apiSettings.retryAttempts.toString());

    // Save dashboard settings
    localStorage.setItem('dashboard-refresh-interval', dashboardSettings.refreshInterval.toString());
    localStorage.setItem('dashboard-auto-refresh', dashboardSettings.autoRefresh.toString());
    localStorage.setItem('dashboard-default-view', dashboardSettings.defaultView);

    // Save notification settings
    localStorage.setItem('email-notifications', notificationSettings.emailNotifications.toString());
    localStorage.setItem('push-notifications', notificationSettings.pushNotifications.toString());
    localStorage.setItem('deployment-alerts', notificationSettings.deploymentAlerts.toString());
    localStorage.setItem('system-alerts', notificationSettings.systemAlerts.toString());

    // Save UI settings
    localStorage.setItem('ui-theme', uiSettings.theme);
    localStorage.setItem('sidebar-collapsed', uiSettings.sidebarCollapsed.toString());
    localStorage.setItem('compact-mode', uiSettings.compactMode.toString());

    toast({
      title: "Settings saved",
      description: "Your preferences have been updated successfully.",
    });
  };

  const testApiConnection = async () => {
    try {
      const response = await fetch(`${apiSettings.baseUrl}/health`);
      if (response.ok) {
        toast({
          title: "Connection successful",
          description: "API endpoint is responding correctly.",
        });
      } else {
        toast({
          title: "Connection failed",
          description: `API returned status ${response.status}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Connection failed",
        description: "Unable to reach the API endpoint.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Configure your Core Automation Portal preferences</p>
        </div>
        <Button onClick={saveSettings} className="gap-2">
          <Save className="h-4 w-4" />
          Save Settings
        </Button>
      </div>

      <Tabs defaultValue="api" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="api" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            API
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="ui" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Interface
          </TabsTrigger>
        </TabsList>

        {/* API Settings */}
        <TabsContent value="api">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                API Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-url">Base API URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="api-url"
                    value={apiSettings.baseUrl}
                    onChange={(e) => setApiSettings({...apiSettings, baseUrl: e.target.value})}
                    placeholder="https://api.coreautomation.com/v1"
                  />
                  <Button variant="outline" onClick={testApiConnection}>
                    Test Connection
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="timeout">Request Timeout (ms)</Label>
                  <Input
                    id="timeout"
                    type="number"
                    value={apiSettings.timeout}
                    onChange={(e) => setApiSettings({...apiSettings, timeout: parseInt(e.target.value)})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="retry">Retry Attempts</Label>
                  <Input
                    id="retry"
                    type="number"
                    value={apiSettings.retryAttempts}
                    onChange={(e) => setApiSettings({...apiSettings, retryAttempts: parseInt(e.target.value)})}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dashboard Settings */}
        <TabsContent value="dashboard">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Dashboard Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-refresh Dashboard</Label>
                  <p className="text-sm text-muted-foreground">Automatically refresh data at set intervals</p>
                </div>
                <Switch
                  checked={dashboardSettings.autoRefresh}
                  onCheckedChange={(checked) => setDashboardSettings({...dashboardSettings, autoRefresh: checked})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="refresh-interval">Refresh Interval (seconds)</Label>
                <Select
                  value={dashboardSettings.refreshInterval.toString()}
                  onValueChange={(value) => setDashboardSettings({...dashboardSettings, refreshInterval: parseInt(value)})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 seconds</SelectItem>
                    <SelectItem value="30">30 seconds</SelectItem>
                    <SelectItem value="60">1 minute</SelectItem>
                    <SelectItem value="300">5 minutes</SelectItem>
                    <SelectItem value="600">10 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="default-view">Default Dashboard View</Label>
                <Select
                  value={dashboardSettings.defaultView}
                  onValueChange={(value) => setDashboardSettings({...dashboardSettings, defaultView: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="overview">Overview</SelectItem>
                    <SelectItem value="deployments">Deployments</SelectItem>
                    <SelectItem value="performance">Performance</SelectItem>
                    <SelectItem value="alerts">Alerts</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'emailNotifications', label: 'Email Notifications', description: 'Receive alerts via email' },
                { key: 'pushNotifications', label: 'Push Notifications', description: 'Browser push notifications' },
                { key: 'deploymentAlerts', label: 'Deployment Alerts', description: 'Notifications for deployment events' },
                { key: 'systemAlerts', label: 'System Alerts', description: 'Critical system notifications' },
              ].map((setting) => (
                <div key={setting.key} className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{setting.label}</Label>
                    <p className="text-sm text-muted-foreground">{setting.description}</p>
                  </div>
                  <Switch
                    checked={notificationSettings[setting.key as keyof typeof notificationSettings]}
                    onCheckedChange={(checked) => 
                      setNotificationSettings({...notificationSettings, [setting.key]: checked})
                    }
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* UI Settings */}
        <TabsContent value="ui">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Interface Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="theme">Theme</Label>
                <Select
                  value={uiSettings.theme}
                  onValueChange={(value) => setUiSettings({...uiSettings, theme: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Sidebar Collapsed by Default</Label>
                  <p className="text-sm text-muted-foreground">Start with sidebar minimized</p>
                </div>
                <Switch
                  checked={uiSettings.sidebarCollapsed}
                  onCheckedChange={(checked) => setUiSettings({...uiSettings, sidebarCollapsed: checked})}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Compact Mode</Label>
                  <p className="text-sm text-muted-foreground">Use smaller spacing and fonts</p>
                </div>
                <Switch
                  checked={uiSettings.compactMode}
                  onCheckedChange={(checked) => setUiSettings({...uiSettings, compactMode: checked})}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}