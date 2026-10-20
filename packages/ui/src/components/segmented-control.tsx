import { Radio } from "@base-ui/react/radio"
import { RadioGroup } from "@base-ui/react/radio-group"
import { interaction } from "@rosesfield/ui/components/interaction"
import type { SegmentedControlDensity } from "@rosesfield/ui/contracts/segmented-control.generated"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import type { ReactElement, ReactNode } from "react"

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
  chrome: "h-field w-full max-w-field-max rounded-full bg-(--well) p-control-inset",
  composer: "h-12 w-full rounded-cell bg-(--well) p-1",
  row: "h-8 gap-1",
} satisfies Record<SegmentedControlDensity, string>

const thumbs = {
  chrome: "inset-y-control-inset left-control-inset rounded-full bg-ink",
  composer: "inset-y-1 left-1 rounded-dense bg-(--tint)",
  row: "inset-y-0 left-0 rounded-dense bg-(--well)",
} satisfies Record<SegmentedControlDensity, string>

const insets = {
  chrome: "2 * var(--spacing-control-inset)",
  composer: "2 * var(--spacing)",
  row: "0%",
} satisfies Record<SegmentedControlDensity, string>

const cells = {
  chrome: "rounded-full px-s3 text-legal data-checked:text-canvas",
  composer: "rounded-dense px-3 text-body data-checked:text-ink",
  row: "rounded-dense px-2 py-1 text-label data-checked:text-ink",
} satisfies Record<SegmentedControlDensity, string>

function SegmentedThumb({
  index,
  count,
  density,
}: {
  index: number
  count: number
  density: SegmentedControlDensity
}): ReactElement {
  return (
    <span
      aria-hidden="true"
      data-slot="segmented-control-thumb"
      className={cn("absolute transition-none", thumbs[density])}
      style={{
        width: `calc((100% - ${insets[density]}) / ${count})`,
        transform: `translateX(${index * 100}%)`,
      }}
    />
  )
}

function SegmentedCell<T extends string>({
  item,
  density,
}: {
  item: SegmentedItem<T>
  density: SegmentedControlDensity
}): ReactElement {
  return (
    <Radio.Root
      value={item.value}
      data-slot="segmented-control-cells"
      className={cn(
        "relative flex min-w-0 items-center justify-center gap-1 text-ink-muted data-checked:font-medium [&_svg]:size-4",
        cells[density],
        motion.tint,
        interaction.ring
      )}
    >
      {item.icon === undefined ? null : (
        <span aria-hidden="true" className="flex shrink-0">
          {item.icon}
        </span>
      )}
      <span data-slot="segment-label" className="truncate">
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
        "relative grid auto-cols-fr grid-flow-col data-disabled:opacity-(--opacity-disabled)",
        tracks[density],
        className
      )}
    >
      <SegmentedThumb index={index} count={items.length} density={density} />
      {items.map((item) => (
        <SegmentedCell key={item.value} item={item} density={density} />
      ))}
    </RadioGroup>
  )
}

export type { SegmentedControlProps, SegmentedItem }
export { SegmentedControl }
