import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
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
        motion.press,
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
      data-slot="tabs-content"
      className={cn("outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsContent, TabsList, TabsTrigger }
