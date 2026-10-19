import type { AppListing } from "@rosesfield/contract"
import { Button, IconButton } from "@rosesfield/ui/components/button"
import { Link } from "@tanstack/react-router"
import { HistoryIcon } from "lucide-react"
import type { ReactElement } from "react"
import { appLine, appName } from "@/catalog/app-facts"
import { t } from "@/copy/t"
import { ScreenHeader } from "@/shell/screen-header"

export function AppHistoryLink({ app }: { app: AppListing }): ReactElement {
  return (
    <Button
      tone="quiet"
      size="small"
      render={<Link to="/history" search={{ app: app.id }} />}
      nativeButton={false}
    >
      {t("app.history.link")}
    </Button>
  )
}

export function AppHistoryIcon({ app }: { app: AppListing }): ReactElement {
  return (
    <IconButton
      label={t("app.history.link")}
      tone="quiet"
      render={<Link to="/history" search={{ app: app.id }} />}
      nativeButton={false}
    >
      <HistoryIcon aria-hidden="true" />
    </IconButton>
  )
}

export function AppHeader({
  app,
  isScrolled,
}: {
  app: AppListing
  isScrolled?: boolean
}): ReactElement {
  return (
    <ScreenHeader
      {...(isScrolled === undefined ? {} : { isScrolled })}
      title={appName(app)}
      line={appLine(app)}
      actions={<AppHistoryLink app={app} />}
      phoneAction={<AppHistoryIcon app={app} />}
    />
  )
}
