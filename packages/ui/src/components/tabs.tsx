import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { interaction } from "@rosesfield/ui/components/interaction"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import type { ReactElement, ReactNode } from "react"

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
  ...props
}: TabsPrimitive.List.Props): ReactElement {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "flex max-w-full items-center gap-s2 overflow-x-auto",
        className
      )}
      {...props}
    />
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
        "inline-flex h-tab max-w-button-max shrink-0 items-center gap-s1 truncate rounded-full px-s3 font-medium text-body text-ink-muted select-none hover:bg-(--tint) data-active:bg-(--tint) data-active:text-ink data-disabled:opacity-(--opacity-disabled) [&_svg]:glyph",
        motion.tint,
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

function ModeStrip({
  className,
  ...props
}: TabsPrimitive.List.Props): ReactElement {
  return (
    <TabsPrimitive.List
      data-slot="tabs-strip"
      data-form="strip"
      className={cn(
        "flex max-w-full shrink-0 items-start gap-3 overflow-x-auto [scrollbar-width:none]",
        className
      )}
      {...props}
    />
  )
}

function ModeTab({
  className,
  children,
  ...props
}: TabsPrimitive.Tab.Props): ReactElement {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-title"
      className={cn(
        "inline-flex h-9 shrink-0 items-center border-b-2 border-transparent font-medium text-body whitespace-nowrap text-ink-muted transition-none select-none data-active:border-ink data-active:text-ink data-disabled:opacity-(--opacity-disabled)",
        interaction.ring,
        className
      )}
      {...props}
    >
      {children}
    </TabsPrimitive.Tab>
  )
}

function SegmentedTabs({
  className,
  children,
  ...props
}: TabsPrimitive.List.Props & { children: ReactNode }): ReactElement {
  return (
    <TabsPrimitive.List
      data-slot="tabs-strip"
      data-form="segmented"
      className={cn("relative inline-flex shrink-0 items-center gap-1", className)}
      {...props}
    >
      <TabsPrimitive.Indicator
        data-slot="segmented-control-thumb"
        className="absolute top-(--active-tab-top) left-(--active-tab-left) z-0 h-(--active-tab-height) w-(--active-tab-width) rounded-dense bg-(--well) transition-none"
      />
      {children}
    </TabsPrimitive.List>
  )
}

type SegmentedTabProps = TabsPrimitive.Tab.Props & {
  icon?: ReactNode
}

function SegmentedTab({
  className,
  icon,
  children,
  ...props
}: SegmentedTabProps): ReactElement {
  return (
    <TabsPrimitive.Tab
      data-slot="segmented-control-cells"
      className={cn(
        "relative z-1 inline-flex h-8 shrink-0 items-center gap-1 rounded-dense px-2 py-1 font-medium text-label whitespace-nowrap text-ink-muted transition-none select-none data-active:text-ink data-disabled:opacity-(--opacity-disabled) [&_svg]:size-4",
        interaction.ring,
        className
      )}
      {...props}
    >
      {icon === undefined ? null : (
        <span data-slot="tabs-lead" aria-hidden="true" className="flex">
          {icon}
        </span>
      )}
      {children}
    </TabsPrimitive.Tab>
  )
}

export type { SegmentedTabProps }
export {
  ModeStrip,
  ModeTab,
  SegmentedTab,
  SegmentedTabs,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
}
