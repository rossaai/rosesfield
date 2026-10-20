import { AppBar } from "@rosesfield/ui/components/app-bar"
import { Button, IconButton } from "@rosesfield/ui/components/button"
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
  NavLink,
  NavSeparator,
  navLinkClass,
} from "@rosesfield/ui/components/nav-link"
import { Link, useRouterState } from "@tanstack/react-router"
import { MenuIcon } from "lucide-react"
import type { ReactElement } from "react"
import { appLine, appName } from "@/catalog/app-facts"
import { t } from "@/copy/t"
import { useIsRegularWindow } from "@/pieces/use-is-regular"
import { FieldMark, Lockup } from "@/shell/brand-mark"
import { type BarSize, CreditBalance } from "@/shell/credit-balance"
import {
  appIcon,
  type MediaArea,
  type NavGroups,
  navGroups,
  type ScreenLink,
} from "@/shell/nav-rows"
import { appIdOfPath } from "@/shell/page-kind"

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
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        data-slot="app-bar-areas"
        aria-current={current ? "page" : undefined}
        className={navLinkClass}
      >
        {t(area.label)}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        data-slot="app-bar-areaMenu"
        sideOffset={4}
        className="max-w-none min-w-72"
      >
        {area.apps.map((app) => (
          <DropdownMenuItem
            key={app.id}
            render={<Link to="/apps/$appId" params={{ appId: app.id }} />}
            className="items-start"
          >
            <span aria-hidden="true" className="mt-0.5 flex [&_svg]:size-5">
              {appIcon(app)}
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="font-medium text-body text-ink">
                {appName(app)}
              </span>
              <span className="truncate text-label text-ink-muted">
                {appLine(app)}
              </span>
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
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
  const isRegular = useIsRegularWindow()
  const isAppPage = appIdOfPath(pathname) !== null
  const size: BarSize = isAppPage && isRegular ? "barCompact" : "bar"
  const groups = navGroups()
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
      balance={<CreditBalance size={size} />}
      connect={
        <Button
          tone="primary"
          size={size}
          render={<Link to="/connect" />}
          nativeButton={false}
        >
          {t("shell.nav.connect")}
        </Button>
      }
    />
  )
}
