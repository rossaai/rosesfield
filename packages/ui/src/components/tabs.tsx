import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { interaction } from "@rosesfield/ui/components/interaction"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import type { ReactElement } from "react"

function Tabs({ className, ...props }: TabsPrimitive.Root.Props): ReactElement {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-s3", className)}
      {...props}
    />
  )
}

function TabsList({
  className,
  children,
  ...props
}: TabsPrimitive.List.Props): ReactElement {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "relative flex max-w-[calc(100%+var(--spacing-focus-ring)*4)] items-center gap-s2 overflow-x-auto",
        interaction.ringRoom,
        className
      )}
      {...props}
    >
      <TabsPrimitive.Indicator
        data-slot="tabs-indicator"
        className={cn(
          "absolute top-0 left-0 z-0 h-(--active-tab-height) w-(--active-tab-width) translate-x-(--active-tab-left) translate-y-(--active-tab-top) rounded-full bg-(--tint)",
          motion.travel
        )}
      />
      {children}
    </TabsPrimitive.List>
  )
}

function TabsTrigger({
  className,
  ...props
}: TabsPrimitive.Tab.Props): ReactElement {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "relative z-1 inline-flex h-tab max-w-button-max shrink-0 items-center gap-s1 truncate rounded-full px-s3 font-medium text-body text-ink-muted select-none hover:not-data-active:bg-(--tint) data-active:text-ink data-disabled:opacity-(--opacity-disabled) [&_svg]:glyph",
        motion.tint,
        interaction.ring,
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: TabsPrimitive.Panel.Props): ReactElement {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-panel"
      className={cn("outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsContent, TabsList, TabsTrigger }
