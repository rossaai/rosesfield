import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@rosesfield/ui/components/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@rosesfield/ui/components/popover"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@rosesfield/ui/components/sheet"
import type { ReactElement, ReactNode } from "react"
import { t } from "@/copy/t"
import { useIsRegularWindow } from "@/pieces/use-is-regular"

type LayerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: ReactNode
}

export function DialogOrSheet(props: LayerProps): ReactElement {
  const isRegular = useIsRegularWindow()
  if (isRegular) {
    return (
      <Dialog open={props.open} onOpenChange={props.onOpenChange}>
        <DialogContent closeLabel={t("viewer.close")}>
          <DialogHeader>
            <DialogTitle>{props.title}</DialogTitle>
          </DialogHeader>
          {props.children}
        </DialogContent>
      </Dialog>
    )
  }
  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent side="bottom" closeLabel={t("viewer.close")}>
        <SheetHeader>
          <SheetTitle>{props.title}</SheetTitle>
        </SheetHeader>
        {props.children}
      </SheetContent>
    </Sheet>
  )
}

export function PopoverOrSheet(
  props: LayerProps & { trigger: ReactElement }
): ReactElement {
  const isRegular = useIsRegularWindow()
  if (isRegular) {
    return (
      <Popover open={props.open} onOpenChange={props.onOpenChange}>
        <PopoverTrigger render={props.trigger} />
        <PopoverContent>
          <PopoverTitle className="sr-only">{props.title}</PopoverTitle>
          {props.children}
        </PopoverContent>
      </Popover>
    )
  }
  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetTrigger render={props.trigger} />
      <SheetContent side="bottom" closeLabel={t("viewer.close")}>
        <SheetHeader>
          <SheetTitle>{props.title}</SheetTitle>
        </SheetHeader>
        {props.children}
      </SheetContent>
    </Sheet>
  )
}
