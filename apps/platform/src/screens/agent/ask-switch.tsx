import { Switch } from "@rosesfield/ui/components/switch"
import { type ReactElement, useId } from "react"
import type { RunApproval } from "@/api/conversation-wire"
import { t } from "@/copy/t"

type AskSwitchProps = {
  value: RunApproval
  onValueChange: (value: RunApproval) => void
  disabled?: boolean
}

export function AskSwitch(props: AskSwitchProps): ReactElement {
  const labelId = useId()
  return (
    <div className="flex h-button-small max-w-button-max shrink-0 items-center gap-s2 rounded-full bg-(--well) pr-[calc((var(--spacing-button-small)-var(--spacing-switch-height))/2)] pl-s3 text-body font-medium">
      <span id={labelId} className="min-w-0 truncate">
        {t("agent.ask.label")}
      </span>
      <Switch
        aria-labelledby={labelId}
        checked={props.value === "ask"}
        disabled={props.disabled === true}
        onCheckedChange={(isOn) => props.onValueChange(isOn ? "ask" : "auto")}
      />
    </div>
  )
}
