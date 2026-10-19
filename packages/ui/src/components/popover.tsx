import { Popover as PopoverPrimitive } from "@base-ui/react/popover"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import type { ComponentProps, ReactElement } from "react"

function Popover(props: PopoverPrimitive.Root.Props): ReactElement {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />
}

function PopoverTrigger(props: PopoverPrimitive.Trigger.Props): ReactElement {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
}

function PopoverClose(props: PopoverPrimitive.Close.Props): ReactElement {
  return <PopoverPrimitive.Close data-slot="popover-close" {...props} />
}

type PopoverContentProps = PopoverPrimitive.Popup.Props &
  Pick<PopoverPrimitive.Positioner.Props, "align" | "side" | "sideOffset">

function PopoverContent({
  className,
  align = "start",
  side = "bottom",
  sideOffset = 7,
  ...props
}: PopoverContentProps): ReactElement {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner
        align={align}
        side={side}
        sideOffset={sideOffset}
        className="isolate z-50"
      >
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          data-ground="layer"
          className={cn(
            "material z-50 flex min-w-popover-min max-w-popover-max flex-col gap-s3 rounded-vessel p-s4 text-ink shadow-float outline-none",
            motion.popover,
            className
          )}
          {...props}
        />
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  )
}

function PopoverTitle({
  className,
  ...props
}: PopoverPrimitive.Title.Props): ReactElement {
  return (
    <PopoverPrimitive.Title
      data-slot="popover-title"
      className={cn("text-body font-medium", className)}
      {...props}
    />
  )
}

function PopoverDescription({
  className,
  ...props
}: PopoverPrimitive.Description.Props): ReactElement {
  return (
    <PopoverPrimitive.Description
      data-slot="popover-description"
      className={cn("text-body text-ink-muted", className)}
      {...props}
    />
  )
}

function PopoverHeader({
  className,
  ...props
}: ComponentProps<"div">): ReactElement {
  return (
    <div
      data-slot="popover-header"
      className={cn("flex flex-col gap-s1", className)}
      {...props}
    />
  )
}

export {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
}
