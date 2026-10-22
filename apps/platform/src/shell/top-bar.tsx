import { AppBar, AppBarAction } from "@rosesfield/ui/components/app-bar"
import { IconButton } from "@rosesfield/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@rosesfield/ui/components/dropdown-menu"
import {
  AreaMenu,
  NavLink,
  NavSeparator,
} from "@rosesfield/ui/components/nav-link"
import { Link, useRouterState } from "@tanstack/react-router"
import { MenuIcon } from "lucide-react"
import type { ReactElement } from "react"
import { appLine, appName } from "@/catalog/app-facts"
import { t } from "@/copy/t"
import { FieldMark, Lockup } from "@/shell/brand-mark"
import { CreditBalance } from "@/shell/credit-balance"
import {
  appIcon,
  type MediaArea,
  type NavGroups,
  navGroups,
  type ScreenLink,
} from "@/shell/nav-rows"
import { appIdOfPath } from "@/shell/page-kind"
import { useOpenConnect } from "@/shell/shell-dialogs"

export function isAreaCurrent(area: MediaArea, pathname: string): boolean {
  const appId = appIdOfPath(pathname)
  return appId !== null && area.apps.some((app) => app.id === appId)
}

function ScreenNav({ link }: { link: ScreenLink }): ReactElement {
  return (
    <NavLink
      render={<Link to={link.to} activeOptions={{ exact: link.to === "/" }} />}
    >
      {t(link.label)}
    </NavLink>
  )
}

function AreaNav({
  area,
  current,
}: {
  area: MediaArea
  current: boolean
}): ReactElement {
  const apps = area.apps.map((app) => ({
    id: app.id,
    name: appName(app),
    line: appLine(app),
    icon: appIcon(app),
    href: `/apps/${app.id}`,
  }))
  return (
    <AreaMenu
      apps={apps}
      current={current}
      renderLink={(app) => (
        <Link to="/apps/$appId" params={{ appId: app.id }} />
      )}
    >
      {t(area.label)}
    </AreaMenu>
  )
}

function AreaLinks({
  groups,
  pathname,
}: {
  groups: NavGroups
  pathname: string
}): ReactElement {
  return (
    <>
      <ScreenNav link={groups.explore} />
      {groups.areas.map((area) => (
        <AreaNav
          key={area.id}
          area={area}
          current={isAreaCurrent(area, pathname)}
        />
      ))}
      <NavSeparator />
      {groups.rest.map((link) => (
        <ScreenNav key={link.id} link={link} />
      ))}
    </>
  )
}

function MenuLink({ link }: { link: ScreenLink }): ReactElement {
  return (
    <DropdownMenuItem
      render={<Link to={link.to} activeOptions={{ exact: link.to === "/" }} />}
    >
      {link.icon}
      {t(link.label)}
    </DropdownMenuItem>
  )
}

function PhoneMenu({ groups }: { groups: NavGroups }): ReactElement {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <IconButton label={t("shell.menu.open")} tone="quiet" place="bar">
            <MenuIcon aria-hidden="true" />
          </IconButton>
        }
      />
      <DropdownMenuContent align="end" sideOffset={4}>
        <MenuLink link={groups.explore} />
        {groups.areas.map((area) => (
          <DropdownMenuGroup key={area.id}>
            <DropdownMenuLabel>{t(area.label)}</DropdownMenuLabel>
            {area.apps.map((app) => (
              <DropdownMenuItem
                key={app.id}
                render={<Link to="/apps/$appId" params={{ appId: app.id }} />}
              >
                {appIcon(app)}
                {appName(app)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        ))}
        <DropdownMenuSeparator />
        {groups.rest.map((link) => (
          <MenuLink key={link.id} link={link} />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function TopBar(): ReactElement {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const isAppPage = appIdOfPath(pathname) !== null
  const groups = navGroups()
  const openConnect = useOpenConnect()
  return (
    <AppBar
      label={t("shell.name")}
      density={isAppPage ? "compact" : "full"}
      mark={
        <Link to="/" aria-label={t("shell.name")} className="flex">
          <FieldMark className="size-full" />
        </Link>
      }
      lockup={
        <Link to="/" className="flex items-center">
          <Lockup className="h-8" />
        </Link>
      }
      areas={<AreaLinks groups={groups} pathname={pathname} />}
      areaMenu={<PhoneMenu groups={groups} />}
      balance={<CreditBalance />}
      connect={
        <AppBarAction tone="primary" onClick={() => openConnect()}>
          {t("shell.nav.connect")}
        </AppBarAction>
      }
    />
  )
}
