import { Dialog as SheetPrimitive } from "@base-ui/react/dialog"
import { IconButton } from "@rosesfield/ui/components/button"
import { DialogScrim } from "@rosesfield/ui/components/dialog"
import { cn } from "@rosesfield/ui/lib/cn"
import { mergeRefs } from "@rosesfield/ui/lib/merge-refs"
import { motion } from "@rosesfield/ui/motion"
import { cva } from "class-variance-authority"
import { XIcon } from "lucide-react"
import { type ComponentProps, type ReactElement, useRef } from "react"

const sheetVariants = cva(
  cn(
    "fixed z-50 flex flex-col gap-s3 overflow-y-auto text-ink outline-none",
    motion.layer
  ),
  {
    variants: {
      side: {
        bottom:
          "inset-x-0 bottom-0 mx-auto max-h-[calc(100dvh-var(--spacing-header))] w-full max-w-dialog rounded-t-vessel bg-layer px-s5 pt-s5 pb-s6 shadow-lift",
        left: "inset-y-0 left-0 w-[min(var(--spacing-sidebar),calc(100%-var(--spacing-s12)))] bg-surface",
      },
    },
    defaultVariants: { side: "bottom" },
  }
)

function Sheet(props: SheetPrimitive.Root.Props): ReactElement {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger(props: SheetPrimitive.Trigger.Props): ReactElement {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose(props: SheetPrimitive.Close.Props): ReactElement {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

type SheetContentProps = SheetPrimitive.Popup.Props & {
  side?: "bottom" | "left"
  closeLabel?: string
}

function SheetContent({
  className,
  children,
  side = "bottom",
  closeLabel,
  ref,
  ...props
}: SheetContentProps): ReactElement {
  const popup = useRef<HTMLDivElement>(null)
  return (
    <SheetPrimitive.Portal>
      <DialogScrim />
      <SheetPrimitive.Popup
        ref={mergeRefs(popup, ref)}
        data-slot="sheet-content"
        data-side={side}
        data-ground={side === "bottom" ? "layer" : "surface"}
        className={cn(sheetVariants({ side }), className)}
        initialFocus={(openType) =>
          openType === "keyboard" ? true : popup.current
        }
        {...props}
      >
        {children}
        {closeLabel === undefined ? null : (
          <SheetPrimitive.Close
            render={
              <IconButton
                label={closeLabel}
                tone="quiet"
                size="small"
                className="absolute top-s5 right-s5"
              />
            }
          >
            <XIcon aria-hidden="true" />
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Popup>
    </SheetPrimitive.Portal>
  )
}

function SheetHeader({
  className,
  ...props
}: ComponentProps<"div">): ReactElement {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex shrink-0 flex-col gap-s1 pr-s12", className)}
      {...props}
    />
  )
}

function SheetBody({
  className,
  ...props
}: ComponentProps<"div">): ReactElement {
  return (
    <div
      data-slot="sheet-body"
      className={cn("-mx-s5 min-h-0 flex-1 overflow-y-auto px-s5", className)}
      {...props}
    />
  )
}

function SheetFooter({
  className,
  ...props
}: ComponentProps<"div">): ReactElement {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex shrink-0 flex-col gap-s2", className)}
      {...props}
    />
  )
}

function SheetTitle({
  className,
  ...props
}: SheetPrimitive.Title.Props): ReactElement {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("text-title", className)}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: SheetPrimitive.Description.Props): ReactElement {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-body text-ink-muted", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
}
