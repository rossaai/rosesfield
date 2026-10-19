import { Radio } from "@base-ui/react/radio"
import { RadioGroup } from "@base-ui/react/radio-group"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import type { ReactElement, ReactNode } from "react"

type SegmentedItem<T extends string> = {
  value: T
  label: ReactNode
}

type SegmentedControlProps<T extends string> = {
  items: ReadonlyArray<SegmentedItem<T>>
  value: T
  onValueChange: (value: T) => void
  label: string
  disabled?: boolean
  className?: string
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
      className={cn(
        "absolute inset-y-control-inset left-control-inset rounded-full bg-ink",
        motion.pane
      )}
      style={{
        width: `calc((100% - 2 * var(--spacing-control-inset)) / ${count})`,
        transform: `translateX(${index * 100}%)`,
      }}
    />
  )
}

function SegmentedControl<T extends string>({
  items,
  value,
  onValueChange,
  label,
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
      aria-label={label}
      value={value}
      onValueChange={choose}
      disabled={disabled}
      className={cn(
        "relative grid h-field w-full max-w-field-max auto-cols-fr grid-flow-col rounded-full bg-(--well) p-control-inset data-disabled:opacity-(--opacity-disabled)",
        className
      )}
    >
      <SegmentedThumb index={index} count={items.length} />
      {items.map((item) => (
        <Radio.Root
          key={item.value}
          value={item.value}
          className={cn(
            "relative flex min-w-0 items-center justify-center rounded-full px-s3 text-legal text-ink data-checked:font-medium data-checked:text-canvas",
            motion.tint
          )}
        >
          <span data-slot="segment-label" className="truncate">
            {item.label}
          </span>
        </Radio.Root>
      ))}
    </RadioGroup>
  )
}

export type { SegmentedControlProps, SegmentedItem }
export { SegmentedControl }
