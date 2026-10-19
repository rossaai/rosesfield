import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import type { ReactElement } from "react"

function TooltipProvider(props: TooltipPrimitive.Provider.Props): ReactElement {
  return <TooltipPrimitive.Provider data-slot="tooltip-provider" {...props} />
}

function Tooltip(props: TooltipPrimitive.Root.Props): ReactElement {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />
}

function TooltipTrigger(props: TooltipPrimitive.Trigger.Props): ReactElement {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

type TooltipContentProps = TooltipPrimitive.Popup.Props &
  Pick<TooltipPrimitive.Positioner.Props, "align" | "side" | "sideOffset">

function TooltipContent({
  className,
  side = "top",
  sideOffset = 7,
  align = "center",
  ...props
}: TooltipContentProps): ReactElement {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        align={align}
        side={side}
        sideOffset={sideOffset}
        className="isolate z-50"
      >
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          data-ground="layer"
          className={cn(
            "material inline-flex w-fit max-w-popover-max items-center gap-s2 rounded-cell px-s4 py-s1_5 text-label text-ink shadow-float",
            motion.popover,
            className
          )}
          {...props}
        />
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger }
