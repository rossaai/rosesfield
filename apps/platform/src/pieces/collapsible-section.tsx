import { Collapsible } from "@base-ui/react/collapsible"
import { fieldInset } from "@rosesfield/ui/components/input"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import { ChevronDownIcon } from "lucide-react"
import type { ReactElement, ReactNode } from "react"

type CollapsibleSectionProps = {
  title: string
  children: ReactNode
  defaultOpen?: boolean
}

export function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
}: CollapsibleSectionProps): ReactElement {
  return (
    <Collapsible.Root
      defaultOpen={defaultOpen}
      className="flex flex-col gap-s3"
    >
      <Collapsible.Trigger
        className={cn(
          "group/collapsible flex h-button items-center justify-between gap-s2 rounded-item text-label text-ink-muted hover:bg-(--tint) [&_svg]:glyph",
          fieldInset,
          motion.tint
        )}
      >
        {title}
        <ChevronDownIcon
          aria-hidden="true"
          className={cn(
            "group-data-[panel-open]/collapsible:rotate-180",
            motion.control
          )}
        />
      </Collapsible.Trigger>
      <Collapsible.Panel className="flex flex-col gap-s4">
        {children}
      </Collapsible.Panel>
    </Collapsible.Root>
  )
}
