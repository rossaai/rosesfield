import { IconButton } from "@rosesfield/ui/components/button"
import { MinusIcon, PlusIcon } from "lucide-react"
import type { ReactElement, Ref } from "react"
import { withUnit } from "@/copy/format"
import { t } from "@/copy/t"

type NumberStepperProps = {
  value: number
  min: number
  max: number
  step: number
  unit: string
  shown?: string
  label: string
  onChange: (value: number) => void
  ref?: Ref<HTMLButtonElement>
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function NumberStepper(props: NumberStepperProps): ReactElement {
  const change = (direction: 1 | -1): void => {
    const next = Number((props.value + direction * props.step).toFixed(6))
    props.onChange(clamp(next, props.min, props.max))
  }
  return (
    <fieldset aria-label={props.label} className="flex items-center gap-s2">
      <IconButton
        ref={props.ref}
        label={t("field.number.decrease")}
        size="dense"
        disabled={props.value <= props.min}
        onClick={() => change(-1)}
      >
        <MinusIcon aria-hidden="true" />
      </IconButton>
      <output aria-live="polite" className="min-w-s8 text-center text-body">
        {props.shown ?? withUnit(props.value, props.unit)}
      </output>
      <IconButton
        label={t("field.number.increase")}
        size="dense"
        disabled={props.value >= props.max}
        onClick={() => change(1)}
      >
        <PlusIcon aria-hidden="true" />
      </IconButton>
    </fieldset>
  )
}
