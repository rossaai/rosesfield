import {
  StateView,
  type StateViewProps,
} from "@rosesfield/ui/components/state-view"
import type { ReactElement } from "react"
import { t } from "@/copy/t"

type ScreenStateProps = Omit<StateViewProps, "mark" | "density">

export function ScreenState(props: ScreenStateProps): ReactElement {
  return (
    <StateView
      {...props}
      density="full"
      mark={<span className="text-title">{t("shell.name")}</span>}
    />
  )
}
