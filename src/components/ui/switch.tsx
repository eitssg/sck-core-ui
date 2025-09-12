import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

type Size = "sm" | "md"

type SwitchProps = React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> & {
  size?: Size
}

const sizeClasses: Record<Size, { root: string; thumb: string; translate: string }> = {
  md: { root: "h-6 w-11", thumb: "h-5 w-5", translate: "data-[state=checked]:translate-x-5" },
  sm: { root: "h-4 w-7", thumb: "h-3 w-3", translate: "data-[state=checked]:translate-x-3" },
}

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  SwitchProps
>(({ className, size = "md", ...props }, ref) => {
  const s = sizeClasses[size]
  const checkedBg = size === "sm" ? "data-[state=checked]:bg-white/80" : "data-[state=checked]:bg-primary"
  return (
    <SwitchPrimitives.Root
      className={cn(
        "peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=unchecked]:bg-input",
        checkedBg,
        s.root,
        className
      )}
      {...props}
      ref={ref}
    >
      <SwitchPrimitives.Thumb
        className={cn(
          "pointer-events-none block rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=unchecked]:translate-x-0",
          s.thumb,
          s.translate
        )}
      />
    </SwitchPrimitives.Root>
  )
})
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
