import type { AppListing } from "@rosesfield/contract"
import { AppBar } from "@rosesfield/ui/components/app-bar"
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
import { appLine, appName, isFeaturedApp } from "@/catalog/app-facts"
import { t } from "@/copy/t"
import { FieldMark, Lockup } from "@/shell/brand-mark"
import { CreditBalance } from "@/shell/credit-balance"
import {
  AppNameBadge,
  appIcon,
  FeaturedBadge,
  type FeaturedPair,
  type MediaArea,
  type NavGroups,
  navGroups,
  type ScreenLink,
} from "@/shell/nav-rows"
import { appIdOfPath } from "@/shell/page-kind"
import { usePhoneTitleSlot } from "@/shell/screen-header"
import { useOpenConnect, useShowSettings } from "@/shell/shell-dialogs"

export function isAreaCurrent(
  area: MediaArea,
  pathname: string,
  featured: readonly AppListing[] = []
): boolean {
  const appId = appIdOfPath(pathname)
  return (
    appId !== null &&
    area.apps.some((app) => app.id === appId) &&
    !featured.some((app) => app.id === appId)
  )
}

function ScreenNav({
  link,
  badge,
}: {
  link: ScreenLink
  badge?: ReactElement
}): ReactElement {
  const showSettings = useShowSettings()
  const openConnect = useOpenConnect()
  if (link.to === "/connect") {
    return (
      <NavLink render={<button type="button" onClick={() => openConnect()} />}>
        {t(link.label)}
      </NavLink>
    )
  }
  if (link.to === "/settings") {
    return (
      <NavLink render={<button type="button" onClick={() => showSettings()} />}>
        {t(link.label)}
      </NavLink>
    )
  }
  return (
    <NavLink
      badge={badge}
      render={<Link to={link.to} activeOptions={{ exact: link.to === "/" }} />}
    >
      {t(link.label)}
    </NavLink>
  )
}

function FeaturedNav({
  pair,
  pathname,
}: {
  pair: FeaturedPair
  pathname: string
}): ReactElement {
  return (
    <>
      <ScreenNav link={pair.agent} badge={<FeaturedBadge />} />
      {pair.apps.map((app) => (
        <NavLink
          key={app.id}
          current={appIdOfPath(pathname) === app.id}
          badge={<FeaturedBadge />}
          render={<Link to="/apps/$appId" params={{ appId: app.id }} />}
        >
          {appName(app)}
        </NavLink>
      ))}
    </>
  )
}

function AreaNav({
  area,
  current,
  pathname,
}: {
  area: MediaArea
  current: boolean
  pathname: string
}): ReactElement {
  const apps = area.apps.map((app) => ({
    id: app.id,
    name: appName(app),
    line: appLine(app),
    icon: appIcon(app),
    href: `/apps/${app.id}`,
    ...(isFeaturedApp(app) ? { badge: <FeaturedBadge /> } : {}),
  }))
  return (
    <AreaMenu
      apps={apps}
      current={current}
      currentId={/^\/apps\/([^/?#]+)/.exec(pathname)?.[1] ?? null}
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
          current={isAreaCurrent(area, pathname, groups.featured.apps)}
          pathname={pathname}
        />
      ))}
      <ScreenNav link={groups.mcp} />
      <NavSeparator />
      <FeaturedNav pair={groups.featured} pathname={pathname} />
      <NavSeparator />
      {groups.rest.map((link) => (
        <ScreenNav key={link.id} link={link} />
      ))}
    </>
  )
}

function MenuLink({
  link,
  badge,
}: {
  link: ScreenLink
  badge?: ReactElement
}): ReactElement {
  const openConnect = useOpenConnect()
  if (link.to === "/connect") {
    return (
      <DropdownMenuItem onClick={() => openConnect()}>
        {link.icon}
        {t(link.label)}
      </DropdownMenuItem>
    )
  }
  return (
    <DropdownMenuItem
      render={<Link to={link.to} activeOptions={{ exact: link.to === "/" }} />}
    >
      {link.icon}
      {t(link.label)}
      {badge}
    </DropdownMenuItem>
  )
}

function MenuApp({ app }: { app: AppListing }): ReactElement {
  return (
    <DropdownMenuItem
      render={<Link to="/apps/$appId" params={{ appId: app.id }} />}
    >
      {appIcon(app)}
      {appName(app)}
      <AppNameBadge app={app} />
    </DropdownMenuItem>
  )
}

function PhoneMenu({ groups }: { groups: NavGroups }): ReactElement {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <IconButton label={t("shell.menu.open")} tone="quiet">
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
              <MenuApp key={app.id} app={app} />
            ))}
          </DropdownMenuGroup>
        ))}
        <DropdownMenuSeparator />
        <MenuLink link={groups.mcp} />
        <DropdownMenuSeparator />
        <MenuLink link={groups.featured.agent} badge={<FeaturedBadge />} />
        {groups.featured.apps.map((app) => (
          <MenuApp key={app.id} app={app} />
        ))}
        <DropdownMenuSeparator />
        {groups.rest.map((link) => (
          <MenuLink key={link.id} link={link} />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function PhoneLead(): ReactElement {
  const slot = usePhoneTitleSlot()
  if (slot.titles > 0) {
    return (
      <span
        ref={slot.setNode}
        data-slot="app-bar-title"
        className="flex h-full max-w-[calc(100cqw-var(--spacing-s5)*2-var(--spacing-icon)*2-var(--spacing-s4)*2-var(--spacing))] min-w-0 items-center"
      />
    )
  }
  return (
    <Link to="/" className="flex items-center">
      <Lockup className="h-8" />
    </Link>
  )
}

export function TopBar(): ReactElement {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const isAppPage = appIdOfPath(pathname) !== null
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
      lockup={<PhoneLead />}
      areas={<AreaLinks groups={groups} pathname={pathname} />}
      areaMenu={<PhoneMenu groups={groups} />}
      balance={<CreditBalance />}
    />
  )
}
