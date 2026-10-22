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
  chrome:
    "h-field w-full max-w-field-max rounded-full bg-(--well) p-control-inset",
  composer: "h-12 w-full rounded-cell bg-(--well) p-1",
  row: "h-8 gap-1",
} satisfies Record<SegmentedControlDensity, string>

const plates = {
  chrome: "rounded-full bg-ink",
  composer: "rounded-dense bg-surface-2",
  row: "rounded-dense bg-(--well)",
} satisfies Record<SegmentedControlDensity, string>

type PlateGeometry = {
  pad: string
  gap: string
  inset: string
}

const geometry = {
  chrome: {
    pad: "var(--spacing-control-inset)",
    gap: "0%",
    inset: "0%",
  },
  composer: {
    pad: "var(--spacing)",
    gap: "0%",
    inset: "var(--spacing-control-inset)",
  },
  row: { pad: "0%", gap: "var(--spacing)", inset: "0%" },
} satisfies Record<SegmentedControlDensity, PlateGeometry>

function plateBox(
  { pad, gap, inset }: PlateGeometry,
  index: number,
  count: number
): CSSProperties {
  const edge = `calc(${pad} + ${inset})`
  const cell = `((100% - 2 * ${pad} - ${count - 1} * ${gap}) / ${count})`
  return {
    top: edge,
    bottom: edge,
    left: edge,
    width: `calc(${cell} - 2 * ${inset})`,
    transform: `translateX(calc(${index} * (100% + 2 * ${inset} + ${gap})))`,
  }
}

const cells = {
  chrome: "rounded-full px-s3 text-legal data-checked:text-canvas",
  composer: "rounded-dense px-3 text-body data-checked:text-ink",
  row: "rounded-dense px-2 py-1 text-label data-checked:text-ink",
} satisfies Record<SegmentedControlDensity, string>

const labelMotion = {
  chrome: "[transition:color_var(--travel)]",
  composer: motion.tint,
  row: motion.tint,
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
      className={cn("absolute", plates[density], motion.travel)}
      style={plateBox(geometry[density], index, count)}
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
  const labelId = useId()
  return (
    <Radio.Root
      value={item.value}
      aria-labelledby={labelId}
      data-slot="segmented-control-cells"
      className={cn(
        "relative flex min-w-0 items-center justify-center gap-1 font-medium text-ink-muted [&_svg]:size-4",
        cells[density],
        labelMotion[density],
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
