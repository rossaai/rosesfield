import { Radio } from "@base-ui/react/radio"
import { RadioGroup } from "@base-ui/react/radio-group"
import { interaction } from "@rosesfield/ui/components/interaction"
import type { SegmentedControlDensity } from "@rosesfield/ui/contracts/segmented-control.generated"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import {
  type CSSProperties,
  type ReactElement,
  type ReactNode,
  useId,
} from "react"

type SegmentedItem<T extends string> = {
  value: T
  label: ReactNode
  icon?: ReactNode
}

type SegmentedControlProps<T extends string> = {
  items: ReadonlyArray<SegmentedItem<T>>
  value: T
  onValueChange: (value: T) => void
  label: string
  density?: SegmentedControlDensity
  disabled?: boolean
  className?: string
}

const tracks = {
  chrome: "h-field w-full max-w-field-max",
  composer: "h-button-small",
  row: "h-button-small",
} satisfies Record<SegmentedControlDensity, string>

const pad = "var(--spacing-control-inset)"

const gap = "var(--spacing-s1)"

function plateBox(index: number, count: number): CSSProperties {
  const cell = `((100% - 2 * ${pad} - ${count - 1} * ${gap}) / ${count})`
  return {
    top: pad,
    bottom: pad,
    left: pad,
    width: `calc(${cell})`,
    transform: `translateX(calc(${index} * (100% + ${gap})))`,
  }
}

function SegmentedThumb({
  index,
  count,
}: {
  index: number
  count: number
}): ReactElement {
  return (
    <span
      aria-hidden="true"
      data-slot="segmented-control-thumb"
      className={cn("absolute rounded-full bg-ink", motion.travel)}
      style={plateBox(index, count)}
    />
  )
}

function SegmentedCell<T extends string>({
  item,
}: {
  item: SegmentedItem<T>
}): ReactElement {
  const labelId = useId()
  return (
    <Radio.Root
      value={item.value}
      aria-labelledby={labelId}
      data-slot="segmented-control-cells"
      className={cn(
        "relative flex min-w-0 items-center justify-center gap-s1_5 rounded-full px-s2_5 font-normal text-legal text-ink hover:not-data-checked:bg-(--tint) data-checked:font-medium data-checked:text-canvas data-disabled:opacity-(--opacity-disabled) [&_svg]:glyph-small",
        motion.tint,
        interaction.ring
      )}
    >
      {item.icon === undefined ? null : (
        <span aria-hidden="true" className="flex shrink-0">
          {item.icon}
        </span>
      )}
      <span id={labelId} data-slot="segment-label" className="truncate">
        {item.label}
      </span>
    </Radio.Root>
  )
}

function SegmentedControl<T extends string>({
  items,
  value,
  onValueChange,
  label,
  density = "chrome",
  disabled = false,
  className,
}: SegmentedControlProps<T>): ReactElement {
  const index = Math.max(
    0,
    items.findIndex((item) => item.value === value)
  )
  const choose = (next: unknown): void => {
    const item = items.find((candidate) => candidate.value === next)
    if (item !== undefined) {
      onValueChange(item.value)
    }
  }
  return (
    <RadioGroup
      data-slot="segmented-control"
      data-density={density}
      aria-label={label}
      value={value}
      onValueChange={choose}
      disabled={disabled}
      className={cn(
        "relative grid auto-cols-fr grid-flow-col gap-s1 rounded-full bg-track p-control-inset data-disabled:opacity-(--opacity-disabled)",
        tracks[density],
        className
      )}
    >
      <SegmentedThumb index={index} count={items.length} />
      {items.map((item) => (
        <SegmentedCell key={item.value} item={item} />
      ))}
    </RadioGroup>
  )
}

export type { SegmentedControlProps, SegmentedItem }
export { SegmentedControl }
