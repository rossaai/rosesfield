import { IconButton } from "@rosesfield/ui/components/button"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@rosesfield/ui/components/sheet"
import { SidebarProvider } from "@rosesfield/ui/components/sidebar"
import { useStoredWidth } from "@rosesfield/ui/hooks/use-stored-width"
import { cn } from "@rosesfield/ui/lib/cn"
import { MenuIcon } from "lucide-react"
import { type ReactElement, type ReactNode, useState } from "react"

type ShellLayoutProps = {
  sidebar: ReactNode
  title: ReactNode
  action?: ReactNode
  menuLabel: string
  closeMenuLabel: string
  storageKey: string
  children: ReactNode
  className?: string
}

function PhoneHeader(
  props: ShellLayoutProps & {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
  }
): ReactElement {
  return (
    <header className="flex h-header shrink-0 items-center gap-s2 px-s5 @regular:hidden">
      <Sheet open={props.isOpen} onOpenChange={props.onOpenChange}>
        <SheetTrigger
          render={
            <IconButton label={props.menuLabel} tone="quiet">
              <MenuIcon aria-hidden="true" />
            </IconButton>
          }
        />
        <SheetContent side="left" aria-label={props.menuLabel}>
          <SheetTitle className="sr-only">{props.menuLabel}</SheetTitle>
          <SidebarProvider
            width="full"
            mode="sheet"
            closeLabel={props.closeMenuLabel}
            onNavigate={() => props.onOpenChange(false)}
          >
            {props.sidebar}
          </SidebarProvider>
        </SheetContent>
      </Sheet>
      <span className="min-w-0 flex-1 truncate text-body font-medium">
        {props.title}
      </span>
      {props.action}
    </header>
  )
}

function ShellLayout(props: ShellLayoutProps): ReactElement {
  const [width, setWidth] = useStoredWidth(props.storageKey)
  const [isOpen, setOpen] = useState(false)
  return (
    <div
      data-slot="shell-layout"
      className={cn("@container size-full min-h-0 bg-canvas", props.className)}
    >
      <div className="flex size-full min-h-0">
        <div className="hidden h-full shrink-0 @regular:flex">
          <SidebarProvider width={width} mode="column" onWidthChange={setWidth}>
            {props.sidebar}
          </SidebarProvider>
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <PhoneHeader {...props} isOpen={isOpen} onOpenChange={setOpen} />
          <main className="min-h-0 flex-1 overflow-y-auto">
            {props.children}
          </main>
        </div>
      </div>
    </div>
  )
}

export type { ShellLayoutProps }
export { ShellLayout }
