import type { Run } from "@rosesfield/contract"
import { IconButton } from "@rosesfield/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@rosesfield/ui/components/dropdown-menu"
import { useNavigate } from "@tanstack/react-router"
import { EllipsisIcon } from "lucide-react"
import type { ReactElement, ReactNode } from "react"
import { isWorking } from "@/api/queries"
import { t } from "@/copy/t"
import { useOpenInComfy } from "@/pieces/run/open-in-comfy"
import { useCancelRun, useRepeatRun } from "@/pieces/run/run-actions"

type RunMenuProps = {
  run: Run
  onUseInputs?: (run: Run) => void
  extra?: ReactNode
}

export function RunMenu({
  run,
  onUseInputs,
  extra,
}: RunMenuProps): ReactElement {
  const navigate = useNavigate()
  const cancel = useCancelRun()
  const repeat = useRepeatRun()
  const openInComfy = useOpenInComfy(run)
  const useInputs = (): void => {
    if (onUseInputs === undefined) {
      void navigate({
        to: "/apps/$appId",
        params: { appId: run.appId },
        search: { from: run.id },
      })
      return
    }
    onUseInputs(run)
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <IconButton label={t("run.menu")} tone="quiet">
            <EllipsisIcon aria-hidden="true" />
          </IconButton>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={useInputs}>
          {t("run.useInputs")}
        </DropdownMenuItem>
        {openInComfy === null ? null : (
          <DropdownMenuItem onClick={openInComfy}>
            {t("run.openInComfy")}
          </DropdownMenuItem>
        )}
        {isWorking(run) ? (
          <DropdownMenuItem onClick={() => cancel.mutate(run.id)}>
            {t("state.stop")}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => repeat.mutate(run.id)}>
            {t("run.repeat")}
          </DropdownMenuItem>
        )}
        {extra}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
