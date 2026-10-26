import { IconButton } from "@rosesfield/ui/components/button"
import { wellClass } from "@rosesfield/ui/components/input"
import { cn } from "@rosesfield/ui/lib/cn"
import { MinusIcon, PlusIcon } from "lucide-react"
import type { ReactElement, ReactNode, Ref } from "react"
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
  icon: ReactNode
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
    <fieldset
      aria-label={props.label}
      data-slot="number-stepper"
      className={cn(
        wellClass,
        "flex h-field items-center gap-s1_5 rounded-full pe-s1 [&_svg]:glyph"
      )}
    >
      <span
        aria-hidden="true"
        data-slot="stepper-lead"
        className="flex shrink-0"
      >
        {props.icon}
      </span>
      <output
        aria-live="polite"
        className="min-w-0 flex-1 truncate text-start text-body"
      >
        {props.shown ?? withUnit(props.value, props.unit)}
      </output>
      <IconButton
        ref={props.ref}
        label={t("field.number.decrease")}
        size="dense"
        disabled={props.value <= props.min}
        onClick={() => change(-1)}
      >
        <MinusIcon aria-hidden="true" />
      </IconButton>
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
