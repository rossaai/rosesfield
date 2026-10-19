import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { IconButton } from "@rosesfield/ui/components/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@rosesfield/ui/components/tooltip"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import { PanelLeftCloseIcon, PanelLeftOpenIcon, XIcon } from "lucide-react"
import {
  type ComponentProps,
  createContext,
  type ReactElement,
  type ReactNode,
  useContext,
} from "react"

type SidebarWidth = "full" | "rail"

type SidebarState = {
  width: SidebarWidth
  mode: "column" | "sheet"
  onWidthChange: (width: SidebarWidth) => void
  onNavigate: () => void
  closeLabel: string
}

const SidebarContext = createContext<SidebarState>({
  width: "full",
  mode: "column",
  onWidthChange: () => undefined,
  onNavigate: () => undefined,
  closeLabel: "",
})

type SidebarProviderProps = Partial<SidebarState> & {
  children: ReactNode
}

function SidebarProvider({
  children,
  ...state
}: SidebarProviderProps): ReactElement {
  const parent = useContext(SidebarContext)
  return (
    <SidebarContext.Provider value={{ ...parent, ...state }}>
      {children}
    </SidebarContext.Provider>
  )
}

function useSidebar(): SidebarState {
  return useContext(SidebarContext)
}

const railInset = "px-[calc((var(--spacing-rail)-var(--spacing-icon))/2)]"

function Sidebar({
  className,
  ...props
}: ComponentProps<"aside">): ReactElement {
  const { width, mode } = useSidebar()
  return (
    <aside
      data-slot="sidebar"
      data-ground="surface"
      data-width={width}
      className={cn(
        "flex h-full min-h-0 shrink-0 flex-col bg-surface text-ink",
        mode === "sheet" ? "w-full" : width === "rail" ? "w-rail" : "w-sidebar",
        className
      )}
      {...props}
    />
  )
}

function SidebarHeader({
  className,
  children,
  ...props
}: ComponentProps<"div">): ReactElement {
  const { width } = useSidebar()
  return (
    <div
      data-slot="sidebar-header"
      className={cn(
        "flex h-header shrink-0 items-center gap-s2",
        railInset,
        width === "rail" ? "justify-center" : "justify-between pl-s4",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

function SidebarName({
  className,
  ...props
}: ComponentProps<"span">): ReactNode {
  const { width } = useSidebar()
  if (width === "rail") {
    return null
  }
  return (
    <span
      data-slot="sidebar-name"
      className={cn("min-w-0 truncate text-body font-medium", className)}
      {...props}
    />
  )
}

type SidebarToggleProps = {
  collapseLabel: string
  expandLabel: string
}

function SidebarToggle({
  collapseLabel,
  expandLabel,
}: SidebarToggleProps): ReactElement {
  const { width, mode, onWidthChange, onNavigate, closeLabel } = useSidebar()
  if (mode === "sheet") {
    return (
      <IconButton label={closeLabel} tone="quiet" onClick={onNavigate}>
        <XIcon aria-hidden="true" />
      </IconButton>
    )
  }
  const isRail = width === "rail"
  return (
    <IconButton
      label={isRail ? expandLabel : collapseLabel}
      tone="quiet"
      aria-expanded={!isRail}
      onClick={() => onWidthChange(isRail ? "full" : "rail")}
    >
      {isRail ? (
        <PanelLeftOpenIcon aria-hidden="true" />
      ) : (
        <PanelLeftCloseIcon aria-hidden="true" />
      )}
    </IconButton>
  )
}

function SidebarContent({
  className,
  ...props
}: ComponentProps<"div">): ReactElement {
  return (
    <div
      data-slot="sidebar-content"
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-s1 overflow-y-auto py-s2",
        railInset,
        className
      )}
      {...props}
    />
  )
}

function SidebarFooter({
  className,
  ...props
}: ComponentProps<"div">): ReactElement {
  return (
    <div
      data-slot="sidebar-footer"
      className={cn(
        "flex shrink-0 flex-col gap-s1 pb-s3",
        railInset,
        className
      )}
      {...props}
    />
  )
}

type SidebarItemProps = Omit<ButtonPrimitive.Props, "children"> & {
  icon: ReactNode
  label: string
  caption?: ReactNode
  active?: boolean
}

function SidebarItem({
  icon,
  label,
  caption,
  active = false,
  className,
  onClick,
  render,
  ...props
}: SidebarItemProps): ReactElement {
  const { width, mode, onNavigate } = useSidebar()
  const isRail = width === "rail" && mode === "column"
  const row = (
    <ButtonPrimitive
      data-slot="sidebar-item"
      aria-current={active ? "page" : undefined}
      aria-label={isRail ? label : undefined}
      nativeButton={render === undefined}
      render={render}
      onClick={(event) => {
        onClick?.(event)
        onNavigate()
      }}
      className={cn(
        "flex h-button w-full min-w-0 shrink-0 items-center gap-s1 rounded-item text-left text-body text-ink select-none hover:bg-(--tint) aria-[current=page]:bg-(--tint) aria-[current=page]:font-medium",
        motion.tint,
        className
      )}
      {...props}
    >
      <span className="flex size-icon shrink-0 items-center justify-center rounded-full [&_svg]:glyph">
        {icon}
      </span>
      {isRail ? null : <span className="min-w-0 flex-1 truncate">{label}</span>}
      {isRail || caption === undefined ? null : (
        <span className="shrink-0 pr-s3 text-caption text-ink-muted">
          {caption}
        </span>
      )}
    </ButtonPrimitive>
  )
  return (
    <Tooltip disabled={!isRail}>
      <TooltipTrigger render={row} />
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  )
}

export type {
  SidebarItemProps,
  SidebarProviderProps,
  SidebarState,
  SidebarWidth,
}
export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarItem,
  SidebarName,
  SidebarProvider,
  SidebarToggle,
  useSidebar,
}
