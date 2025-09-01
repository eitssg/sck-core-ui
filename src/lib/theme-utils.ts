import { cn } from "@/lib/utils"

// Helper to create theme-aware page layouts
export const pageClasses = cn(
  "min-h-screen bg-background text-foreground transition-colors duration-200"
)

export const cardClasses = cn(
  "bg-card text-card-foreground shadow-medium border-border"
)

export const headerClasses = cn(
  "bg-card/50 border-b border-border backdrop-blur supports-[backdrop-filter]:bg-card/60"
)
