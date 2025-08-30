import { useTheme } from "@/hooks/useTheme"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Monitor, Moon, Sun, Palette } from "lucide-react"

export function ThemeSelector() {
  const { theme, themeConfig, setTheme, availableThemes, isAuthenticated } = useTheme()

  const systemThemes = [
    { id: "light", name: "Light", icon: Sun, description: "Light mode" },
    { id: "dark", name: "Dark", icon: Moon, description: "Dark mode" },
    { id: "system", name: "System", icon: Monitor, description: "Use system preference" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Theme Preferences</h3>
        <p className="text-sm text-muted-foreground">
          {isAuthenticated 
            ? "Choose your preferred theme. This will be saved to your profile."
            : "Choose your preferred theme for this session."
          }
        </p>
      </div>

      {/* System Themes */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium">Basic Themes</h4>
        <div className="grid grid-cols-3 gap-3">
          {systemThemes.map((systemTheme) => {
            const Icon = systemTheme.icon
            return (
              <Card 
                key={systemTheme.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  theme === systemTheme.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setTheme(systemTheme.id)}
              >
                <CardContent className="p-4 text-center">
                  <Icon className="h-6 w-6 mx-auto mb-2" />
                  <p className="text-sm font-medium">{systemTheme.name}</p>
                  <p className="text-xs text-muted-foreground">{systemTheme.description}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Professional Themes - Only show for authenticated users */}
      {isAuthenticated && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Professional Themes</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableThemes.map((customTheme) => (
              <Card 
                key={customTheme.name}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  theme === customTheme.name ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setTheme(customTheme.name)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{customTheme.displayName}</CardTitle>
                    <Badge variant={customTheme.isDark ? "secondary" : "outline"}>
                      {customTheme.isDark ? "Dark" : "Light"}
                    </Badge>
                  </div>
                  <CardDescription className="text-sm">
                    {customTheme.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex space-x-1">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: `hsl(${customTheme.colors['--primary']})` }} />
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: `hsl(${customTheme.colors['--secondary']})` }} />
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: `hsl(${customTheme.colors['--accent']})` }} />
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: `hsl(${customTheme.colors['--muted']})` }} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Current Theme Info */}
      {themeConfig && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Current Theme: {themeConfig.displayName}
            </CardTitle>
            <CardDescription>{themeConfig.description}</CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  )
}
