import type { AppListing } from "@rosesfield/contract"
import { interaction } from "@rosesfield/ui/components/interaction"
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@rosesfield/ui/components/sheet"
import {
  TabBar,
  TabBarGenerate,
  TabBarLink,
} from "@rosesfield/ui/components/tab-bar"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import { Link } from "@tanstack/react-router"
import { PlugIcon } from "lucide-react"
import { type ReactElement, useState } from "react"
import { appName } from "@/catalog/app-facts"
import { t } from "@/copy/t"
import { useAppToolsKey } from "@/pieces/app-tools"
import {
  AppNameBadge,
  appIcon,
  exploreLink,
  FeaturedBadge,
  historyLink,
  libraryLink,
  navGroups,
  type ScreenLink,
} from "@/shell/nav-rows"
import { useOpenConnect } from "@/shell/shell-dialogs"

const sheetRowClass = cn(
  "relative flex h-button items-center gap-s2 rounded-full bg-(--well) px-s4 text-body [&_svg]:glyph",
  motion.press,
  interaction.ring
)

function SheetApp({
  app,
  onPick,
}: {
  app: AppListing
  onPick: () => void
}): ReactElement {
  return (
    <li>
      <Link
        to="/apps/$appId"
        params={{ appId: app.id }}
        onClick={onPick}
        className={sheetRowClass}
      >
        {appIcon(app)}
        <span className="truncate">{appName(app)}</span>
        <AppNameBadge app={app} />
      </Link>
    </li>
  )
}

function AppsSheet({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}): ReactElement {
  const { areas, featured } = navGroups()
  const close = (): void => onOpenChange(false)
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" closeLabel={t("shell.menu.close")}>
        <SheetHeader>
          <SheetTitle>{t("shell.create.title")}</SheetTitle>
        </SheetHeader>
        <SheetBody>
          <ul
            data-slot="featured-pair"
            className="grid grid-cols-2 gap-s2 pb-s5"
          >
            <li>
              <Link
                to={featured.agent.to}
                onClick={close}
                className={sheetRowClass}
              >
                {featured.agent.icon}
                <span className="truncate">{t(featured.agent.label)}</span>
                <FeaturedBadge />
              </Link>
            </li>
            {featured.apps.map((app) => (
              <SheetApp key={app.id} app={app} onPick={close} />
            ))}
          </ul>
          {areas.map((area) => (
            <section key={area.id} className="flex flex-col gap-s2 pb-s5">
              <h3 className="text-label font-medium text-ink-muted">
                {t(area.label)}
              </h3>
              <ul className="grid grid-cols-2 gap-s2">
                {area.apps.map((app) => (
                  <SheetApp key={app.id} app={app} onPick={close} />
                ))}
              </ul>
            </section>
          ))}
        </SheetBody>
      </SheetContent>
    </Sheet>
  )
}

function Tab({ link }: { link: ScreenLink }): ReactElement {
  return (
    <TabBarLink
      icon={link.icon}
      render={<Link to={link.to} activeOptions={{ exact: link.to === "/" }} />}
    >
      {t(link.label)}
    </TabBarLink>
  )
}

export function BottomBar(): ReactElement {
  const [isAppsOpen, setAppsOpen] = useState(false)
  const requestTools = useAppToolsKey()
  const openConnect = useOpenConnect()
  return (
    <>
      <TabBar label={t("shell.bar.label")}>
        <Tab link={exploreLink} />
        <Tab link={libraryLink} />
        <TabBarGenerate
          label={t("run.generate")}
          onClick={() => requestTools(() => setAppsOpen(true))}
        />
        <Tab link={historyLink} />
        <TabBarLink
          icon={<PlugIcon aria-hidden="true" />}
          render={<button type="button" onClick={() => openConnect()} />}
        >
          {t("shell.nav.connect")}
        </TabBarLink>
      </TabBar>
      <AppsSheet open={isAppsOpen} onOpenChange={setAppsOpen} />
    </>
  )
}
