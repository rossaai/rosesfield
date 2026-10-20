import { Button, type ButtonProps } from "@rosesfield/ui/components/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@rosesfield/ui/components/tooltip"
import { cn } from "@rosesfield/ui/lib/cn"
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
      size="recreate"
      className={cn(
        "group/chip min-w-0 shrink gap-1 rounded-dense data-popup-open:bg-(--tint)",
        className
      )}
      {...props}
    >
      {caption === undefined ? null : (
        <span className="sr-only">{`${caption} `}</span>
      )}
      {icon === undefined ? null : (
        <span
          aria-hidden="true"
          data-slot="chip-icon"
          className="flex shrink-0 [&_svg]:size-4"
        >
          {icon}
        </span>
      )}
      <span className="min-w-0 truncate">{children}</span>
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
