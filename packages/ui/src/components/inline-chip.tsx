import { useRender } from "@base-ui/react/use-render"
import { interaction } from "@rosesfield/ui/components/interaction"
import type { InlineChipKind } from "@rosesfield/ui/contracts/inline-chip.generated"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import { LinkIcon } from "lucide-react"
import type { ComponentProps, ReactElement, ReactNode } from "react"

type InlineChipProps = Omit<ComponentProps<"a">, "children"> & {
  children: string
  lead?: ReactNode
  kind?: InlineChipKind
  render?: ReactElement
}

function InlineChip({
  children,
  lead,
  kind = "link",
  render,
  className,
  ...props
}: InlineChipProps): ReactElement {
  return useRender({
    defaultTagName: "a",
    render,
    props: {
      ...props,
      "data-slot": "inline-chip",
      "data-kind": kind,
      className: cn(
        "inline-flex max-w-full items-center gap-s1 rounded-full bg-hor-tint px-s1_5 align-bottom font-medium text-body text-hor-text no-underline",
        motion.press,
        interaction.ring,
        className
      ),
      children: (
        <>
          <span
            aria-hidden="true"
            data-slot="inline-chip-lead"
            className="flex shrink-0 [&_svg]:glyph-small"
          >
            {lead ?? <LinkIcon />}
          </span>
          <span data-slot="inline-chip-words" className="min-w-0 truncate">
            {children}
          </span>
        </>
      ),
    },
  })
}

export type { InlineChipProps }
export { InlineChip }
