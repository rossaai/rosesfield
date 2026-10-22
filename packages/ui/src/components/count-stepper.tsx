import { interaction } from "@rosesfield/ui/components/interaction"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import { MinusIcon, PlusIcon } from "lucide-react"
import type { ReactElement } from "react"

type CountStepperProps = {
  value: number
  max: number
  onValueChange: (value: number) => void
  label: string
  lessLabel: string
  moreLabel: string
  min?: number
}

const stepClass = cn(
  "relative flex size-icon-small shrink-0 items-center justify-center rounded-full text-ink-muted hover:text-ink disabled:opacity-(--opacity-disabled) [&_svg]:glyph-small",
  motion.pressRound,
  interaction.ring
)

function CountStepper({
  value,
  max,
  onValueChange,
  label,
  lessLabel,
  moreLabel,
  min = 1,
}: CountStepperProps): ReactElement {
  return (
    <fieldset
      data-slot="count-stepper"
      aria-label={label}
      className={cn(
        "m-0 inline-flex h-button-small shrink-0 items-center gap-s1 rounded-full border-0 bg-transparent p-0 hover:bg-(--tint) in-data-[gallery=hover]:bg-(--tint)",
        motion.tint
      )}
    >
      <button
        type="button"
        aria-label={lessLabel}
        disabled={value <= min}
        onClick={() => onValueChange(Math.max(min, value - 1))}
        className={stepClass}
      >
        <MinusIcon aria-hidden="true" />
      </button>
      <output aria-live="polite" className="text-body tabular-nums">
        <span className="font-medium text-ink">{value}</span>
        <span className="text-ink-muted">{`/${max}`}</span>
      </output>
      <button
        type="button"
        aria-label={moreLabel}
        disabled={value >= max}
        onClick={() => onValueChange(Math.min(max, value + 1))}
        className={stepClass}
      >
        <PlusIcon aria-hidden="true" />
      </button>
    </fieldset>
  )
}

export type { CountStepperProps }
export { CountStepper }
