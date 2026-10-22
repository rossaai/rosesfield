import type { Run } from "@rosesfield/contract"
import { IconButton } from "@rosesfield/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@rosesfield/ui/components/dropdown-menu"
import { useNavigate } from "@tanstack/react-router"
import {
  EllipsisIcon,
  RepeatIcon,
  RotateCwIcon,
  SquareIcon,
} from "lucide-react"
import type { ReactElement, ReactNode } from "react"
import { isWorking } from "@/api/queries"
import { t } from "@/copy/t"
import { LabMark } from "@/pieces/lab-mark"
import { useOpenInComfy } from "@/pieces/run/open-in-comfy"
import { useCancelRun, useRepeatRun } from "@/pieces/run/run-actions"

type RunMenuProps = {
  run: Run
  onUseInputs?: (run: Run) => void
  extra?: ReactNode
  form?: "line" | "card"
}

export const comfyMaker = "Comfy"

export function useRunInputs(
  run: Run,
  onUseInputs: ((run: Run) => void) | undefined
): () => void {
  const navigate = useNavigate()
  return () => {
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
}

export function RunMenu({
  run,
  onUseInputs,
  extra,
  form = "line",
}: RunMenuProps): ReactElement {
  const cancel = useCancelRun()
  const repeat = useRepeatRun()
  const openInComfy = useOpenInComfy(run)
  const useInputs = useRunInputs(run, onUseInputs)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <IconButton
            label={t("run.menu")}
            tone={form === "card" ? "glass" : "quiet"}
          >
            <EllipsisIcon aria-hidden="true" />
          </IconButton>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          lead={<RepeatIcon aria-hidden="true" />}
          onClick={useInputs}
        >
          {t("run.useInputs")}
        </DropdownMenuItem>
        {openInComfy === null ? null : (
          <DropdownMenuItem
            lead={<LabMark maker={comfyMaker} />}
            onClick={openInComfy}
          >
            {t("run.openInComfy")}
          </DropdownMenuItem>
        )}
        {isWorking(run) ? (
          <DropdownMenuItem
            lead={<SquareIcon aria-hidden="true" />}
            onClick={() => cancel.mutate(run.id)}
          >
            {t("state.stop")}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            lead={<RotateCwIcon aria-hidden="true" />}
            onClick={() => repeat.mutate(run.id)}
          >
            {t("run.repeat")}
          </DropdownMenuItem>
        )}
        {extra}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
