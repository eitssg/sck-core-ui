import { useEffect, useRef, useState } from "react";
import { RefreshCw, Bell, Palette, Server, Cloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useDispatch, useSelector } from "react-redux";
import UserMenu from "@/components/UserMenu";
import { authAPI } from "@/lib/auth-api";
import { selectUser as selectProfileUser, patchCurrentUserProfile } from "@/store/slices/profileSlice";
import { AppDispatch } from "@/store";

// Types and stable defaults (module scope to avoid re-creation and satisfy exhaustive-deps)
interface ApiSettings { baseUrl: string; timeout: number; retryAttempts: number }
interface DashboardSettings { autoRefresh: boolean; refreshInterval: number; defaultView: string }
interface NotificationSettings { emailNotifications: boolean; pushNotifications: boolean; deploymentAlerts: boolean; systemAlerts: boolean }
interface UiSettings { theme: string; sidebarCollapsed: boolean; compactMode: boolean }

const DEFAULT_API: ApiSettings = { baseUrl: "https://api.coreautomation.com/v1", timeout: 30000, retryAttempts: 3 };
const DEFAULT_DASHBOARD: DashboardSettings = { refreshInterval: 30, autoRefresh: false, defaultView: "overview" };
const DEFAULT_NOTIFICATIONS: NotificationSettings = { emailNotifications: false, pushNotifications: false, deploymentAlerts: true, systemAlerts: true };
const DEFAULT_UI: UiSettings = { theme: "system", sidebarCollapsed: false, compactMode: false };

export default function Settings() {
  const { toast } = useToast();
  const dispatch = useDispatch<AppDispatch>();
  const profileUser = useSelector(selectProfileUser as any) as any;

  // Preferences snapshot
  const [prefs, setPrefs] = useState<Record<string, any>>({});

  // Section states
  const [apiSettings, setApiSettings] = useState<ApiSettings>(DEFAULT_API);
  const [dashboardSettings, setDashboardSettings] = useState<DashboardSettings>(DEFAULT_DASHBOARD);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATIONS);
  const [uiSettings, setUiSettings] = useState<UiSettings>(DEFAULT_UI);
  const [refreshingToken, setRefreshingToken] = useState(false);
  const [tokenResponse, setTokenResponse] = useState<string>("");

  // Debounce timers
  const baseUrlTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const defaultViewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (baseUrlTimer.current) clearTimeout(baseUrlTimer.current);
      if (timeoutTimer.current) clearTimeout(timeoutTimer.current);
      if (retryTimer.current) clearTimeout(retryTimer.current);
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      if (defaultViewTimer.current) clearTimeout(defaultViewTimer.current);
    };
  }, []);

  // Deep helpers
  const getIn = (obj: any, path: string[]) => path.reduce((acc, k) => (acc && typeof acc === "object" ? acc[k] : undefined), obj);
  const setIn = (obj: any, path: string[], value: any): any => {
    if (path.length === 0) return value;
    const [k, ...rest] = path;
    return { ...(obj || {}), [k]: setIn(obj?.[k], rest, value) };
  };

  // Initialize from profile preferences
  useEffect(() => {
    const p = (profileUser as any)?.preferences || {};
    setPrefs(p);
    setApiSettings({
      baseUrl: getIn(p, ["api", "base_url"]) ?? DEFAULT_API.baseUrl,
      timeout: Number(getIn(p, ["api", "timeout_ms"]) ?? DEFAULT_API.timeout),
      retryAttempts: Number(getIn(p, ["api", "retry_attempts"]) ?? DEFAULT_API.retryAttempts),
    });
    setDashboardSettings({
      autoRefresh: Boolean(getIn(p, ["dashboard", "auto_refresh"]) ?? DEFAULT_DASHBOARD.autoRefresh),
      refreshInterval: Number(getIn(p, ["dashboard", "refresh_interval_s"]) ?? DEFAULT_DASHBOARD.refreshInterval),
      defaultView: String(getIn(p, ["dashboard", "default_view"]) ?? DEFAULT_DASHBOARD.defaultView),
    });
    setNotificationSettings({
      emailNotifications: Boolean(getIn(p, ["notifications", "email"]) ?? DEFAULT_NOTIFICATIONS.emailNotifications),
      pushNotifications: Boolean(getIn(p, ["notifications", "push"]) ?? DEFAULT_NOTIFICATIONS.pushNotifications),
      deploymentAlerts: Boolean(getIn(p, ["notifications", "deployment_alerts"]) ?? DEFAULT_NOTIFICATIONS.deploymentAlerts),
      systemAlerts: Boolean(getIn(p, ["notifications", "system_alerts"]) ?? DEFAULT_NOTIFICATIONS.systemAlerts),
    });
    setUiSettings({
      theme: String(getIn(p, ["ui", "theme"]) ?? DEFAULT_UI.theme),
      sidebarCollapsed: Boolean(getIn(p, ["ui", "sidebar_collapsed"]) ?? DEFAULT_UI.sidebarCollapsed),
      compactMode: Boolean(getIn(p, ["ui", "compact_mode"]) ?? DEFAULT_UI.compactMode),
    });
  }, [profileUser]);

  // Single preference patcher (sends full merged prefs)
  const patchPref = async (path: string[], value: any, rollback: () => void) => {
    const next = setIn(prefs, path, value);
    const action = await dispatch(
      patchCurrentUserProfile({
        profile_name: (profileUser as any)?.profile_name || "default",
        preferences: next,
      } as any)
    );
    if ((patchCurrentUserProfile as any).rejected?.match?.(action)) {
      rollback();
      toast({ title: "Update failed", description: String(action.payload || "Could not save preference"), variant: "destructive" });
      return false;
    }
    setPrefs(next);
    return true;
  };

  const testApiConnection = async () => {
    try {
      const response = await fetch(`${apiSettings.baseUrl}/health`);
      if (response.ok) {
        toast({ title: "Connection successful", description: "API endpoint is responding correctly." });
      } else {
        toast({ title: "Connection failed", description: `API returned status ${response.status}`, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Connection failed", description: "Unable to reach the API endpoint.", variant: "destructive" });
    }
  };

  const refreshOAuthToken = async () => {
    try {
      setRefreshingToken(true);
      const stateVal = [...crypto.getRandomValues(new Uint8Array(8))]
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      const result = await authAPI.refreshToken(stateVal);
      if (!result || (result as any).error) {
        const err = (result as any)?.error_description || (result as any)?.error || "Token refresh failed";
        setTokenResponse(typeof result === 'object' ? JSON.stringify(result, null, 2) : String(err));
        toast({ title: "Token refresh failed", description: String(err), variant: "destructive" });
        return;
      }
      setTokenResponse(JSON.stringify(result, null, 2));
      toast({ title: "Token refreshed", description: "Access token obtained.", variant: "default" });
    } catch (e: any) {
      const msg = String(e?.message || e || "Unknown error");
      setTokenResponse(msg);
      toast({ title: "Token refresh failed", description: msg, variant: "destructive" });
    } finally {
      setRefreshingToken(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col">
      {/* Header */}
      <header className="bg-dashboard-header shadow-soft border-b border-border w-full">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-theme-gradient rounded-lg flex items-center justify-center">
              <Cloud className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Settings</h1>
          </div>
          <div className="flex items-center gap-4">
            <UserMenu />
          </div>
        </div>
      </header>

  {/* Page content */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 w-full">
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
                      onChange={(e) => {
                        const v = e.target.value;
                        const prev = apiSettings.baseUrl;
                        setApiSettings({ ...apiSettings, baseUrl: v });
                        if (baseUrlTimer.current) clearTimeout(baseUrlTimer.current);
                        baseUrlTimer.current = setTimeout(async () => {
                          const trimmed = v.trim();
                          if (trimmed === prev) return;
                          await patchPref(["api", "base_url"], trimmed, () => setApiSettings((s) => ({ ...s, baseUrl: prev })));
                        }, 400);
                      }}
                      placeholder="https://api.coreautomation.com/v1"
                    />
                    <Button variant="outline" onClick={testApiConnection}>
                      Test Connection
                    </Button>
                    <Button variant="secondary" onClick={refreshOAuthToken} disabled={refreshingToken} className="gap-2">
                      <RefreshCw className="h-4 w-4" />
                      {refreshingToken ? "Refreshing…" : "Refresh OAuth Token"}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Last Token Response</Label>
                  <textarea
                    readOnly
                    value={tokenResponse}
                    placeholder="Token response will appear here after refresh..."
                    className="font-mono text-sm w-full min-h-[140px] p-3 border rounded-md bg-muted/30 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="timeout">Request Timeout (ms)</Label>
                    <Input
                      id="timeout"
                      type="number"
                      value={apiSettings.timeout}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const prev = apiSettings.timeout;
                        // Allow blank while typing without persisting invalid value
                        if (raw === "") {
                          setApiSettings({ ...apiSettings, timeout: 0 });
                          if (timeoutTimer.current) clearTimeout(timeoutTimer.current);
                          return;
                        }
                        const v = parseInt(raw, 10);
                        if (Number.isNaN(v)) return;
                        setApiSettings({ ...apiSettings, timeout: v });
                        if (timeoutTimer.current) clearTimeout(timeoutTimer.current);
                        timeoutTimer.current = setTimeout(async () => {
                          if (v === prev) return;
                          await patchPref(["api", "timeout_ms"], v, () => setApiSettings((s) => ({ ...s, timeout: prev })));
                        }, 400);
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="retry">Retry Attempts</Label>
                    <Input
                      id="retry"
                      type="number"
                      value={apiSettings.retryAttempts}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const prev = apiSettings.retryAttempts;
                        if (raw === "") {
                          setApiSettings({ ...apiSettings, retryAttempts: 0 });
                          if (retryTimer.current) clearTimeout(retryTimer.current);
                          return;
                        }
                        const v = parseInt(raw, 10);
                        if (Number.isNaN(v)) return;
                        setApiSettings({ ...apiSettings, retryAttempts: v });
                        if (retryTimer.current) clearTimeout(retryTimer.current);
                        retryTimer.current = setTimeout(async () => {
                          if (v === prev) return;
                          await patchPref(["api", "retry_attempts"], v, () => setApiSettings((s) => ({ ...s, retryAttempts: prev })));
                        }, 400);
                      }}
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
                    onCheckedChange={async (checked) => {
                      const prev = dashboardSettings.autoRefresh;
                      setDashboardSettings({ ...dashboardSettings, autoRefresh: checked });
                      await patchPref(["dashboard", "auto_refresh"], checked, () => setDashboardSettings((s) => ({ ...s, autoRefresh: prev })));
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="refresh-interval">Refresh Interval (seconds)</Label>
                  <Select
                    value={dashboardSettings.refreshInterval.toString()}
                    onValueChange={(value) => {
                      const v = parseInt(value, 10);
                      if (Number.isNaN(v)) return;
                      const prev = dashboardSettings.refreshInterval;
                      setDashboardSettings({ ...dashboardSettings, refreshInterval: v });
                      if (refreshTimer.current) clearTimeout(refreshTimer.current);
                      refreshTimer.current = setTimeout(async () => {
                        if (v === prev) return;
                        await patchPref(["dashboard", "refresh_interval_s"], v, () => setDashboardSettings((s) => ({ ...s, refreshInterval: prev })));
                      }, 400);
                    }}
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
                    onValueChange={(value) => {
                      const prev = dashboardSettings.defaultView;
                      setDashboardSettings({ ...dashboardSettings, defaultView: value });
                      if (defaultViewTimer.current) clearTimeout(defaultViewTimer.current);
                      defaultViewTimer.current = setTimeout(async () => {
                        if (value === prev) return;
                        await patchPref(["dashboard", "default_view"], value, () => setDashboardSettings((s) => ({ ...s, defaultView: prev })));
                      }, 300);
                    }}
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
                  { key: "emailNotifications", label: "Email Notifications", description: "Receive alerts via email" },
                  { key: "pushNotifications", label: "Push Notifications", description: "Browser push notifications" },
                  { key: "deploymentAlerts", label: "Deployment Alerts", description: "Notifications for deployment events" },
                  { key: "systemAlerts", label: "System Alerts", description: "Critical system notifications" },
                ].map((setting) => (
                  <div key={setting.key} className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>{setting.label}</Label>
                      <p className="text-sm text-muted-foreground">{setting.description}</p>
                    </div>
                    <Switch
                      checked={notificationSettings[setting.key as keyof typeof notificationSettings]}
                      onCheckedChange={async (checked) => {
                        const prev = notificationSettings[setting.key as keyof typeof notificationSettings] as boolean;
                        setNotificationSettings({ ...notificationSettings, [setting.key]: checked });
                        const map: Record<string, string[]> = {
                          emailNotifications: ["notifications", "email"],
                          pushNotifications: ["notifications", "push"],
                          deploymentAlerts: ["notifications", "deployment_alerts"],
                          systemAlerts: ["notifications", "system_alerts"],
                        };
                        await patchPref(map[setting.key], checked, () => setNotificationSettings((s) => ({ ...s, [setting.key]: prev })));
                      }}
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
                    onValueChange={async (value) => {
                      const prev = uiSettings.theme;
                      setUiSettings({ ...uiSettings, theme: value });
                      await patchPref(["ui", "theme"], value, () => setUiSettings((s) => ({ ...s, theme: prev })));
                    }}
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
                    onCheckedChange={async (checked) => {
                      const prev = uiSettings.sidebarCollapsed;
                      setUiSettings({ ...uiSettings, sidebarCollapsed: checked });
                      await patchPref(["ui", "sidebar_collapsed"], checked, () => setUiSettings((s) => ({ ...s, sidebarCollapsed: prev })));
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Compact Mode</Label>
                    <p className="text-sm text-muted-foreground">Use smaller spacing and fonts</p>
                  </div>
                  <Switch
                    checked={uiSettings.compactMode}
                    onCheckedChange={async (checked) => {
                      const prev = uiSettings.compactMode;
                      setUiSettings({ ...uiSettings, compactMode: checked });
                      await patchPref(["ui", "compact_mode"], checked, () => setUiSettings((s) => ({ ...s, compactMode: prev })));
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}