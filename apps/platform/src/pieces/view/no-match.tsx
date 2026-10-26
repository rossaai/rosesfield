import { Button } from "@rosesfield/ui/components/button"
import { StateView } from "@rosesfield/ui/components/state-view"
import type { ReactElement } from "react"
import { t } from "@/copy/t"

export function NoMatch({
  onShowAll,
}: {
  onShowAll: () => void
}): ReactElement {
  return (
    <StateView
      kind="empty"
      title={t("library.filterEmpty.title")}
      actions={
        <Button onClick={onShowAll}>{t("library.filterEmpty.action")}</Button>
      }
    />
  )
}
