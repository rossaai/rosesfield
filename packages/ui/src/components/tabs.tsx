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
  children,
  ...props
}: TabsPrimitive.List.Props): ReactElement {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "relative flex max-w-full items-center gap-s2 overflow-x-auto",
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
  children,
  ...props
}: TabsPrimitive.List.Props): ReactElement {
  return (
    <TabsPrimitive.List
      data-slot="tabs-strip"
      data-form="strip"
      className={cn(
        "relative flex max-w-full shrink-0 items-start gap-3 overflow-x-auto [scrollbar-width:none]",
        interaction.ringRoom,
        className
      )}
      {...props}
    >
      <TabsPrimitive.Indicator
        data-slot="tabs-underline"
        className={cn(
          "absolute top-0 left-0 h-0.5 w-(--active-tab-width) translate-x-(--active-tab-left) translate-y-[calc(var(--active-tab-top)+var(--active-tab-height)-var(--spacing)*0.5)] bg-ink",
          motion.travel
        )}
      />
      {children}
    </TabsPrimitive.List>
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
        "inline-flex h-9 shrink-0 items-center border-b-2 border-transparent font-medium text-body whitespace-nowrap text-ink-muted select-none data-active:text-ink data-disabled:opacity-(--opacity-disabled)",
        motion.tint,
        interaction.ring,
        className
      )}
      {...props}
    >
      {children}
    </TabsPrimitive.Tab>
  )
}

type SegmentedForm = "canvas" | "well"

const segmentedLists = {
  canvas: "",
  well: "h-9 rounded-dense bg-canvas p-0.5",
} satisfies Record<SegmentedForm, string>

const segmentedPlates = {
  canvas:
    "h-(--active-tab-height) w-(--active-tab-width) translate-x-(--active-tab-left) translate-y-(--active-tab-top)",
  well: "h-tab w-[calc(var(--active-tab-width)-2*var(--spacing-hairline))] translate-x-[calc(var(--active-tab-left)+var(--spacing-hairline))] translate-y-[calc(var(--active-tab-top)+var(--spacing-hairline))]",
} satisfies Record<SegmentedForm, string>

type SegmentedTabsProps = TabsPrimitive.List.Props & {
  children: ReactNode
  form?: SegmentedForm
}

function SegmentedTabs({
  className,
  children,
  form = "canvas",
  ...props
}: SegmentedTabsProps): ReactElement {
  return (
    <TabsPrimitive.List
      data-slot="tabs-strip"
      data-form={form === "canvas" ? "segmented" : form}
      className={cn(
        "relative inline-flex shrink-0 items-center gap-1",
        segmentedLists[form],
        className
      )}
      {...props}
    >
      <TabsPrimitive.Indicator
        data-slot="segmented-control-thumb"
        className={cn(
          "absolute top-0 left-0 z-0 rounded-dense bg-(--well)",
          segmentedPlates[form],
          motion.travel
        )}
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
        "relative z-1 inline-flex h-8 shrink-0 items-center gap-1 rounded-dense px-2 py-1 font-medium text-label whitespace-nowrap text-ink-muted select-none data-active:text-ink data-disabled:opacity-(--opacity-disabled) [&_svg]:size-4",
        motion.tint,
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

export type { SegmentedForm, SegmentedTabProps, SegmentedTabsProps }
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
