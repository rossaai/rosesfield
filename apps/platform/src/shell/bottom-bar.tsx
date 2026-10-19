import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@rosesfield/ui/components/sheet"
import { SidebarProvider } from "@rosesfield/ui/components/sidebar"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import { Link, useRouterState } from "@tanstack/react-router"
import { CompassIcon, ImagesIcon, MenuIcon, PlusIcon } from "lucide-react"
import { type ReactElement, type ReactNode, useState } from "react"
import { t } from "@/copy/t"
import { createRows, navGroups } from "@/shell/nav-rows"
import { NavSidebar } from "@/shell/nav-sidebar"

const inputScreens: readonly RegExp[] = [
  /^\/apps\/[^/]+/,
  /^\/agent(\/|$)/,
  /^\/characters\/new(\/|$)/,
]

export function hasInputs(pathname: string): boolean {
  return inputScreens.some((pattern) => pattern.test(pathname))
}

const itemClass =
  "flex min-w-0 flex-1 flex-col items-center justify-center gap-s1 text-label text-ink-muted aria-[current=page]:text-ink [&_svg]:glyph"

function BarItem({
  icon,
  label,
  ...props
}: {
  icon: ReactNode
  label: string
  onClick?: () => void
  current?: boolean
}): ReactElement {
  return (
    <button
      type="button"
      className={cn(itemClass, motion.press)}
      aria-current={props.current === true ? "page" : undefined}
      onClick={props.onClick}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  )
}

function CreateSheet({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}): ReactElement {
  const rows = createRows(navGroups())
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" closeLabel={t("shell.menu.close")}>
        <SheetHeader>
          <SheetTitle>{t("shell.create.title")}</SheetTitle>
        </SheetHeader>
        <SheetBody>
          <ul className="grid grid-cols-2 gap-s2 pb-s5">
            {rows.map((row) => (
              <li key={row.id}>
                <Link
                  to={
                    row.target.kind === "app" ? "/apps/$appId" : row.target.to
                  }
                  params={
                    row.target.kind === "app" ? { appId: row.target.appId } : {}
                  }
                  onClick={() => onOpenChange(false)}
                  className={cn(
                    "flex h-button items-center gap-s2 rounded-full bg-(--well) px-s4 text-body [&_svg]:glyph",
                    motion.press
                  )}
                >
                  {row.icon}
                  <span className="truncate">{t(row.label)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </SheetBody>
      </SheetContent>
    </Sheet>
  )
}

function MenuSheet({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}): ReactElement {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" aria-label={t("shell.menu.open")}>
        <SheetTitle className="sr-only">{t("shell.menu.open")}</SheetTitle>
        <SidebarProvider
          width="full"
          mode="sheet"
          closeLabel={t("shell.menu.close")}
          onNavigate={() => onOpenChange(false)}
        >
          <NavSidebar />
        </SidebarProvider>
      </SheetContent>
    </Sheet>
  )
}

export function BottomBar(): ReactNode {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const [layer, setLayer] = useState<"create" | "menu" | null>(null)
  if (hasInputs(pathname)) {
    return null
  }
  const close = (open: boolean): void => {
    if (!open) {
      setLayer(null)
    }
  }
  return (
    <>
      <nav
        aria-label={t("shell.bar.label")}
        data-ground="surface"
        className="flex h-header shrink-0 items-stretch gap-s2 bg-surface px-s5 pb-[env(safe-area-inset-bottom)] @regular:hidden"
      >
        <Link
          to="/"
          className={itemClass}
          activeOptions={{ exact: true }}
          activeProps={{ "aria-current": "page" }}
        >
          <CompassIcon aria-hidden="true" />
          <span className="truncate">{t("shell.nav.explore")}</span>
        </Link>
        <div className="flex flex-1 items-center justify-center">
          <button
            type="button"
            aria-label={t("shell.bar.create")}
            onClick={() => setLayer("create")}
            className={cn(
              "flex h-button items-center gap-s1_5 rounded-full bg-ink px-s5 text-label text-canvas [&_svg]:glyph",
              motion.press
            )}
          >
            <PlusIcon aria-hidden="true" />
            {t("shell.bar.create")}
          </button>
        </div>
        <Link
          to="/library"
          className={itemClass}
          activeProps={{ "aria-current": "page" }}
        >
          <ImagesIcon aria-hidden="true" />
          <span className="truncate">{t("shell.nav.library")}</span>
        </Link>
        <BarItem
          icon={<MenuIcon aria-hidden="true" />}
          label={t("shell.bar.menu")}
          onClick={() => setLayer("menu")}
        />
      </nav>
      <CreateSheet open={layer === "create"} onOpenChange={close} />
      <MenuSheet open={layer === "menu"} onOpenChange={close} />
    </>
  )
}
