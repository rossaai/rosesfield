import { Button } from "@rosesfield/ui/components/button"
import { Link } from "@tanstack/react-router"
import type { ReactElement } from "react"
import { t } from "@/copy/t"
import { ScreenState } from "@/pieces/screen-state"
import { ScreenHeader } from "@/shell/screen-header"
import { ShellFrame } from "@/shell/shell-frame"

export function NotFoundScreen(): ReactElement {
  return (
    <>
      <ScreenHeader title={null} />
      <ScreenState
        kind="empty"
        title={t("notFound.title")}
        actions={
          <Button tone="primary" render={<Link to="/" />} nativeButton={false}>
            {t("notFound.action")}
          </Button>
        }
      />
    </>
  )
}

export function ShellNotFound(): ReactElement {
  return (
    <ShellFrame>
      <NotFoundScreen />
    </ShellFrame>
  )
}
