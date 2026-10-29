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
  historyLink,
  libraryLink,
  navGroups,
  type ScreenLink,
} from "@/shell/nav-rows"
import { useOpenConnect } from "@/shell/shell-dialogs"

function AppsSheet({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}): ReactElement {
  const { areas } = navGroups()
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" closeLabel={t("shell.menu.close")}>
        <SheetHeader>
          <SheetTitle>{t("shell.create.title")}</SheetTitle>
        </SheetHeader>
        <SheetBody>
          {areas.map((area) => (
            <section key={area.id} className="flex flex-col gap-s2 pb-s5">
              <h3 className="text-label font-medium text-ink-muted">
                {t(area.label)}
              </h3>
              <ul className="grid grid-cols-2 gap-s2">
                {area.apps.map((app) => (
                  <li key={app.id}>
                    <Link
                      to="/apps/$appId"
                      params={{ appId: app.id }}
                      onClick={() => onOpenChange(false)}
                      className={cn(
                        "relative flex h-button items-center gap-s2 rounded-full bg-(--well) px-s4 text-body [&_svg]:glyph",
                        motion.press,
                        interaction.ring
                      )}
                    >
                      {appIcon(app)}
                      <span className="truncate">{appName(app)}</span>
                      <AppNameBadge app={app} />
                    </Link>
                  </li>
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
