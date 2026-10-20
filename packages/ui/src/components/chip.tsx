import { Button, type ButtonProps } from "@rosesfield/ui/components/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@rosesfield/ui/components/tooltip"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import { ChevronDownIcon } from "lucide-react"
import type { ReactElement, ReactNode } from "react"

type ChipProps = Omit<ButtonProps, "size" | "children"> & {
  children: string
  caption?: string
  icon?: ReactNode
}

function Chip({
  children,
  caption,
  icon,
  className,
  ...props
}: ChipProps): ReactElement {
  const chip = (
    <Button
      data-slot="chip"
      size="small"
      className={cn("group/chip min-w-0 shrink gap-s1_5", className)}
      {...props}
    >
      {caption === undefined ? null : (
        <span className="sr-only">{`${caption} `}</span>
      )}
      {icon === undefined ? null : (
        <span
          aria-hidden="true"
          data-slot="chip-icon"
          className="flex shrink-0 text-ink-muted [&_svg]:glyph-small"
        >
          {icon}
        </span>
      )}
      <span className="min-w-0 truncate">{children}</span>
      <ChevronDownIcon
        aria-hidden="true"
        className={cn(
          "shrink-0 text-ink-muted group-data-popup-open/chip:[transform:rotate(-180deg)]",
          motion.control
        )}
      />
    </Button>
  )
  if (caption === undefined) {
    return chip
  }
  return (
    <Tooltip>
      <TooltipTrigger render={chip} />
      <TooltipContent>{caption}</TooltipContent>
    </Tooltip>
  )
}

export type { ChipProps }
export { Chip }
