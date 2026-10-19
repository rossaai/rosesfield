import { IconButton } from "@rosesfield/ui/components/button"
import { Separator } from "@rosesfield/ui/components/separator"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarItem,
  SidebarToggle,
  useSidebar,
} from "@rosesfield/ui/components/sidebar"
import { Link, useMatchRoute } from "@tanstack/react-router"
import { PanelLeftOpenIcon, SettingsIcon } from "lucide-react"
import type { ReactElement } from "react"
import { t, tCount } from "@/copy/t"
import { FieldMark, Lockup } from "@/shell/brand-mark"
import { KeyFoot } from "@/shell/key-foot"
import { type NavRow, navGroups } from "@/shell/nav-rows"
import { useWorkingRuns } from "@/shell/use-working-runs"

function NavItem({ row }: { row: NavRow }): ReactElement {
  const matchRoute = useMatchRoute()
  const working = useWorkingRuns().length
  const { target } = row
  if (target.kind === "app") {
    return (
      <SidebarItem
        icon={row.icon}
        label={t(row.label)}
        active={
          matchRoute({
            to: "/apps/$appId",
            params: { appId: target.appId },
          }) !== false
        }
        render={<Link to="/apps/$appId" params={{ appId: target.appId }} />}
      />
    )
  }
  return (
    <SidebarItem
      icon={row.icon}
      label={t(row.label)}
      active={matchRoute({ to: target.to, fuzzy: target.to !== "/" }) !== false}
      render={<Link to={target.to} />}
      {...(target.to === "/history" && working > 0
        ? { caption: tCount("shell.history.working", working) }
        : {})}
    />
  )
}

function NavRows(): ReactElement {
  const groups = navGroups()
  return (
    <SidebarContent>
      <NavItem row={groups.explore} />
      {groups.areas.map((row) => (
        <NavItem key={row.id} row={row} />
      ))}
      <Separator className="my-s1 shrink-0" />
      {groups.chains.map((row) => (
        <NavItem key={row.id} row={row} />
      ))}
      <Separator className="my-s1 shrink-0" />
      {groups.work.map((row) => (
        <NavItem key={row.id} row={row} />
      ))}
    </SidebarContent>
  )
}

function NavFooter(): ReactElement {
  const matchRoute = useMatchRoute()
  return (
    <SidebarFooter>
      <KeyFoot />
      <SidebarItem
        icon={<SettingsIcon aria-hidden="true" />}
        label={t("shell.nav.settings")}
        active={matchRoute({ to: "/settings" }) !== false}
        render={<Link to="/settings" />}
      />
    </SidebarFooter>
  )
}

function NavHeader(): ReactElement {
  const { width, mode, onWidthChange } = useSidebar()
  if (width === "rail" && mode === "column") {
    return (
      <SidebarHeader>
        <IconButton
          label={t("shell.sidebar.expand")}
          tone="quiet"
          aria-expanded={false}
          className="group"
          onClick={() => onWidthChange("full")}
        >
          <FieldMark className="group-hover:hidden group-focus-visible:hidden" />
          <PanelLeftOpenIcon
            aria-hidden="true"
            className="hidden group-hover:block group-focus-visible:block"
          />
        </IconButton>
      </SidebarHeader>
    )
  }
  return (
    <SidebarHeader>
      <Link to="/" className="flex min-w-0 items-center">
        <Lockup />
      </Link>
      <SidebarToggle
        collapseLabel={t("shell.sidebar.collapse")}
        expandLabel={t("shell.sidebar.expand")}
      />
    </SidebarHeader>
  )
}

export function NavSidebar(): ReactElement {
  return (
    <Sidebar aria-label={t("shell.name")}>
      <NavHeader />
      <NavRows />
      <NavFooter />
    </Sidebar>
  )
}
