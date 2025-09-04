import { useMemo } from "react";
import { Monitor, Moon, Sun, Palette, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useTheme } from "@/hooks/useTheme";

type ThemeSelectorProps = {
  variant?: "dropdown" | "panel";
  buttonClassName?: string;
  align?: "start" | "center" | "end";
};

export default function ThemeSelector({ variant = "dropdown", buttonClassName, align = "end" }: ThemeSelectorProps) {
  const { theme, setTheme, availableThemes, themeConfig } = useTheme();

  const systemThemes = useMemo(
    () => [
      { id: "system", name: "System", icon: Monitor, description: "Follow system preference" },
      { id: "light", name: "Light", icon: Sun, description: "Light mode" },
      { id: "dark", name: "Dark", icon: Moon, description: "Dark mode" },
    ],
    []
  );

  if (variant === "panel") {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium">Theme Preferences</h3>
          <p className="text-sm text-muted-foreground">
            Choose your preferred theme. Your profile setting takes precedence, otherwise the system theme is used.
          </p>
        </div>

        {/* System Themes */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Basic Themes</h4>
          <div className="grid grid-cols-3 gap-3">
            {systemThemes.map((t) => {
              const Icon = t.icon;
              const active = theme === t.id;
              return (
                <Card
                  key={t.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${active ? "ring-2 ring-primary" : ""}`}
                  onClick={() => setTheme(t.id)}
                >
                  <CardContent className="p-4 text-center">
                    <Icon className="h-6 w-6 mx-auto mb-2" />
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Custom/Professional Themes */}
        {Array.isArray(availableThemes) && availableThemes.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Professional Themes</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableThemes.map((customTheme: any) => {
                const active = theme === customTheme.name;
                return (
                  <Card
                    key={customTheme.name}
                    className={`cursor-pointer transition-all hover:shadow-md ${active ? "ring-2 ring-primary" : ""}`}
                    onClick={() => setTheme(customTheme.name)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{customTheme.displayName ?? customTheme.name}</CardTitle>
                        <Badge variant={customTheme.isDark ? "secondary" : "outline"}>
                          {customTheme.isDark ? "Dark" : "Light"}
                        </Badge>
                      </div>
                      {customTheme.description && (
                        <CardDescription className="text-sm">{customTheme.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex space-x-1">
                        {["--primary", "--secondary", "--accent", "--muted"].map((k) => (
                          <div
                            key={k}
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: customTheme.colors?.[k] ? `hsl(${customTheme.colors[k]})` : "transparent", border: "1px solid var(--border)" }}
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Current Theme Info */}
        {themeConfig && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Current Theme: {themeConfig.displayName ?? themeConfig.name ?? theme}
              </CardTitle>
              {themeConfig.description && <CardDescription>{themeConfig.description}</CardDescription>}
            </CardHeader>
          </Card>
        )}
      </div>
    );
  }

  // Dropdown variant (good for header)
  const CurrentIcon =
    theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={buttonClassName} title="Theme">
          <CurrentIcon className="h-5 w-5" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-56">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Palette className="h-4 w-4" />
          Theme
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {systemThemes.map((t) => {
          const Icon = t.icon;
          const active = theme === t.id;
          return (
            <DropdownMenuItem key={t.id} onClick={() => setTheme(t.id)} className="flex items-center gap-2">
              <Icon className="h-4 w-4" />
              <span className="flex-1">{t.name}</span>
              {active && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          );
        })}
        {Array.isArray(availableThemes) && availableThemes.length > 0 && (
          <>
            <DropdownMenuSeparator />
            {availableThemes.map((t: any) => {
              const active = theme === t.name;
              return (
                <DropdownMenuItem key={t.name} onClick={() => setTheme(t.name)} className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 rounded-full border" style={{ backgroundColor: t.colors?.["--primary"] ? `hsl(${t.colors["--primary"]})` : "transparent" }} />
                  <span className="flex-1">{t.displayName ?? t.name}</span>
                  {active && <Check className="h-4 w-4 text-primary" />}
                </DropdownMenuItem>
              );
            })}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}