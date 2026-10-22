import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { Button, type ButtonProps } from "@rosesfield/ui/components/button"
import { DialogScrim, dialogPanelClass } from "@rosesfield/ui/components/dialog"
import { useLayerOrigin } from "@rosesfield/ui/hooks/use-layer-origin"
import { cn } from "@rosesfield/ui/lib/cn"
import { mergeRefs } from "@rosesfield/ui/lib/merge-refs"
import { type ComponentProps, type ReactElement, useMemo } from "react"

function AlertDialog(props: DialogPrimitive.Root.Props): ReactElement {
  return <DialogPrimitive.Root data-slot="alert-dialog" {...props} />
}

function AlertDialogTrigger(
  props: DialogPrimitive.Trigger.Props
): ReactElement {
  return <DialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />
}

function AlertDialogContent({
  className,
  ref,
  ...props
}: DialogPrimitive.Popup.Props): ReactElement {
  const origin = useLayerOrigin()
  const popupRef = useMemo(() => mergeRefs(origin, ref), [origin, ref])
  return (
    <DialogPrimitive.Portal>
      <DialogScrim forceRender />
      <DialogPrimitive.Popup
        ref={popupRef}
        data-slot="alert-dialog-content"
        data-ground="layer"
        role="alertdialog"
        className={cn(
          dialogPanelClass,
          "w-[min(var(--spacing-alert),calc(100%-2*var(--spacing-s5)))] gap-s5",
          className
        )}
        {...props}
      />
    </DialogPrimitive.Portal>
  )
}

function AlertDialogHeader({
  className,
  ...props
}: ComponentProps<"div">): ReactElement {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn("flex flex-col gap-s1", className)}
      {...props}
    />
  )
}

function AlertDialogTitle({
  className,
  ...props
}: DialogPrimitive.Title.Props): ReactElement {
  return (
    <DialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={cn("text-body font-medium", className)}
      {...props}
    />
  )
}

function AlertDialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props): ReactElement {
  return (
    <DialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cn("text-body text-ink-muted", className)}
      {...props}
    />
  )
}

function AlertDialogFooter({
  className,
  ...props
}: ComponentProps<"div">): ReactElement {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn("grid auto-cols-fr grid-flow-col gap-s2", className)}
      {...props}
    />
  )
}

function AlertDialogCancel(props: DialogPrimitive.Close.Props): ReactElement {
  return (
    <DialogPrimitive.Close
      data-slot="alert-dialog-cancel"
      render={<Button className="max-w-none" />}
      {...props}
    />
  )
}

function AlertDialogAction({ className, ...props }: ButtonProps): ReactElement {
  return (
    <Button
      data-slot="alert-dialog-action"
      className={cn("max-w-none", className)}
      {...props}
    />
  )
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
}
