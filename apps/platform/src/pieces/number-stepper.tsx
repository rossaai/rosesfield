import { IconButton } from "@rosesfield/ui/components/button"
import { wellClass } from "@rosesfield/ui/components/input"
import { cn } from "@rosesfield/ui/lib/cn"
import { MinusIcon, PlusIcon } from "lucide-react"
import { type ReactElement, type ReactNode, type Ref, useState } from "react"
import { withUnit } from "@/copy/format"
import { t } from "@/copy/t"

type NumberStepperProps = {
  value: number
  fallback: number
  min: number
  max: number
  step: number
  unit: string
  shown?: string
  label: string
  icon: ReactNode
  onChange: (value: number) => void
  ref?: Ref<HTMLInputElement>
}

type Bounds = Pick<NumberStepperProps, "min" | "max" | "step">

const typedRing =
  "has-[input:focus-visible]:outline-(length:--spacing-focus-ring) has-[input:focus-visible]:outline-solid has-[input:focus-visible]:outline-hor-text has-[input:focus-visible]:outline-offset-(--spacing-focus-ring)"

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function onStep(value: number, bounds: Bounds): number {
  const base = Number.isFinite(bounds.min) ? bounds.min : 0
  const steps = Math.round((value - base) / bounds.step)
  const snapped = Number((base + steps * bounds.step).toFixed(6))
  if (snapped > bounds.max) {
    return Number((snapped - bounds.step).toFixed(6))
  }
  return snapped < bounds.min
    ? Number((snapped + bounds.step).toFixed(6))
    : snapped
}

/** Reads what you typed into a stepper: empty is the field's default, a number settles inside the bounds and onto the step from the min, and anything else keeps the value it had. */
function settledNumberOf(
  text: string,
  props: Pick<NumberStepperProps, "value" | "fallback"> & Bounds
): number {
  const trimmed = text.trim()
  if (trimmed === "") {
    return props.fallback
  }
  const typed = Number(trimmed.replace(",", "."))
  if (!Number.isFinite(typed)) {
    return props.value
  }
  return onStep(clamp(typed, props.min, props.max), props)
}

function boundsAria(props: Bounds): Record<string, number> {
  return {
    ...(Number.isFinite(props.min) ? { "aria-valuemin": props.min } : {}),
    ...(Number.isFinite(props.max) ? { "aria-valuemax": props.max } : {}),
  }
}

function TypedValue(props: NumberStepperProps): ReactElement {
  const [draft, setDraft] = useState<string | null>(null)
  const shown = props.shown ?? withUnit(props.value, props.unit)
  const commit = (text: string): number => {
    const next = settledNumberOf(text, props)
    if (next !== props.value) {
      props.onChange(next)
    }
    return next
  }
  return (
    <input
      ref={props.ref}
      type="text"
      role="spinbutton"
      aria-label={props.label}
      aria-valuenow={props.value}
      aria-valuetext={shown}
      {...boundsAria(props)}
      inputMode={Number.isInteger(props.step) ? "numeric" : "decimal"}
      data-slot="stepper-value"
      className="h-full min-w-0 flex-1 truncate bg-transparent p-0 text-start text-body text-ink outline-none placeholder:text-ink-muted"
      value={draft ?? shown}
      placeholder={String(props.fallback)}
      onFocus={() => setDraft(String(props.value))}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={(event) => {
        commit(event.target.value)
        setDraft(null)
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault()
          setDraft(String(commit(event.currentTarget.value)))
        }
      }}
    />
  )
}

export function NumberStepper(props: NumberStepperProps): ReactElement {
  const change = (direction: 1 | -1): void => {
    const next = Number((props.value + direction * props.step).toFixed(6))
    props.onChange(clamp(next, props.min, props.max))
  }
  return (
    // biome-ignore lint/a11y/useSemanticElements: a fieldset's content box ignores the fieldset's height, so its row sits above the field's middle
    <div
      role="group"
      aria-label={props.label}
      data-slot="number-stepper"
      className={cn(
        wellClass,
        typedRing,
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
      <TypedValue {...props} />
      <IconButton
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
    </div>
  )
}
