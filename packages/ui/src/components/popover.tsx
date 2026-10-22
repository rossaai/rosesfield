import { Popover as PopoverPrimitive } from "@base-ui/react/popover"
import {
  nestedLayerClass,
  useIsInLayer,
} from "@rosesfield/ui/components/layer-depth"
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

type PopoverMotion = "pop" | "none"

type PopoverMaterial = "regular" | "thick"

const collisionAvoidance = { fallbackAxisSide: "none" } as const

const motions = {
  pop: motion.popover,
  none: "",
} satisfies Record<PopoverMotion, string>

const materials = {
  regular: "material",
  thick: "material-thick",
} satisfies Record<PopoverMaterial, string>

type PopoverContentProps = PopoverPrimitive.Popup.Props &
  Pick<
    PopoverPrimitive.Positioner.Props,
    "align" | "side" | "sideOffset" | "anchor" | "collisionPadding"
  > & {
    motion?: PopoverMotion
    material?: PopoverMaterial
  }

function PopoverContent({
  className,
  align = "start",
  side = "bottom",
  sideOffset = 7,
  anchor,
  collisionPadding,
  motion: moves = "pop",
  material = "regular",
  ...props
}: PopoverContentProps): ReactElement {
  const isNested = useIsInLayer()
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner
        align={align}
        side={side}
        sideOffset={sideOffset}
        collisionAvoidance={collisionAvoidance}
        {...(anchor === undefined ? {} : { anchor })}
        {...(collisionPadding === undefined ? {} : { collisionPadding })}
        className="isolate z-50"
      >
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          data-ground="layer"
          data-material={material}
          data-depth={isNested ? "nested" : undefined}
          className={cn(
            "z-50 flex max-h-(--available-height) min-w-popover-min max-w-popover-max flex-col gap-s3 overflow-y-auto rounded-vessel p-s4 text-ink shadow-float outline-none",
            materials[material],
            motions[moves],
            isNested ? nestedLayerClass : "",
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

export type { PopoverMaterial, PopoverMotion }
export {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
}
