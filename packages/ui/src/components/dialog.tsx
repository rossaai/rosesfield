import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { IconButton } from "@rosesfield/ui/components/button"
import { LayerDepth } from "@rosesfield/ui/components/layer-depth"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import { XIcon } from "lucide-react"
import type { ComponentProps, ReactElement } from "react"

const dialogPanelClass = cn(
  "fixed inset-0 z-50 m-auto flex h-fit max-h-[calc(100dvh-2*var(--spacing-s6))] w-[min(var(--spacing-dialog),calc(100%-2*var(--spacing-s5)))] flex-col gap-s3 overflow-y-auto rounded-vessel bg-layer p-s4 text-ink shadow-lift outline-none",
  motion.layer
)

function Dialog(props: DialogPrimitive.Root.Props): ReactElement {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger(props: DialogPrimitive.Trigger.Props): ReactElement {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogClose(props: DialogPrimitive.Close.Props): ReactElement {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogScrim({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props): ReactElement {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-scrim"
      className={cn("fixed inset-0 z-50 bg-scrim", motion.scrim, className)}
      {...props}
    />
  )
}

type DialogContentProps = DialogPrimitive.Popup.Props & {
  closeLabel: string
}

function DialogContent({
  className,
  children,
  closeLabel,
  ...props
}: DialogContentProps): ReactElement {
  return (
    <DialogPrimitive.Portal>
      <DialogScrim />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        data-ground="layer"
        className={cn(dialogPanelClass, className)}
        {...props}
      >
        <LayerDepth>{children}</LayerDepth>
        <DialogPrimitive.Close
          render={
            <IconButton
              label={closeLabel}
              tone="quiet"
              size="small"
              className="absolute top-s4 right-s4"
            />
          }
        >
          <XIcon aria-hidden="true" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  )
}

function DialogHeader({
  className,
  ...props
}: ComponentProps<"div">): ReactElement {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-s1 pr-s12", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  ...props
}: ComponentProps<"div">): ReactElement {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-wrap items-center justify-end gap-s2",
        className
      )}
      {...props}
    />
  )
}

function DialogTitle({
  className,
  ...props
}: DialogPrimitive.Title.Props): ReactElement {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-title", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props): ReactElement {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("line-clamp-2 text-body text-ink-muted", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogScrim,
  DialogTitle,
  DialogTrigger,
  dialogPanelClass,
}
