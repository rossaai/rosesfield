import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { interaction } from "@rosesfield/ui/components/interaction"
import { Skeleton, SkeletonGroup } from "@rosesfield/ui/components/skeleton"
import type { ModelRowPlace } from "@rosesfield/ui/contracts/model-row.generated"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import { ChevronDownIcon } from "lucide-react"
import type { ReactElement, ReactNode } from "react"

type ModelTriggerProps = Omit<ButtonPrimitive.Props, "children"> & {
  name: string
  mark?: ReactNode
}

const place: ModelRowPlace = "trigger"

const chipClass = cn(
  "group/model relative inline-flex h-button-small max-w-button-max min-w-0 shrink items-center in-data-[density=composer]:max-w-none in-data-[density=composer]:shrink-0 gap-s1_5 rounded-full bg-(--well) ps-s2 pe-s2 font-medium text-body whitespace-nowrap text-ink select-none in-data-[density=composer]:bg-transparent data-popup-open:bg-(--tint) [&_svg]:glyph-small",
  interaction.fill,
  motion.press,
  interaction.ring
)

function ModelChip({
  name,
  mark,
  className,
  ...props
}: ModelTriggerProps): ReactElement {
  return (
    <ButtonPrimitive
      data-slot="model-row"
      data-place={place}
      className={cn(chipClass, className)}
      {...props}
    >
      {mark === undefined ? null : (
        <span
          data-slot="model-row-mark"
          aria-hidden="true"
          className="flex shrink-0"
        >
          {mark}
        </span>
      )}
      <span data-slot="model-row-name" className="min-w-0 truncate">
        {name}
      </span>
      <ChevronDownIcon
        aria-hidden="true"
        className={cn(
          "text-ink-muted group-hover/model:text-ink group-data-popup-open/model:-rotate-180",
          motion.disclosure
        )}
      />
    </ButtonPrimitive>
  )
}

function ModelChipSkeleton({
  className,
}: {
  className?: string
}): ReactElement {
  return (
    <SkeletonGroup
      data-place={place}
      className={cn(
        "inline-flex h-button-small w-[calc(4*var(--spacing-s8))] shrink-0 items-center gap-s1_5 rounded-full bg-(--well) ps-s2 pe-s3 in-data-[density=composer]:bg-transparent",
        className
      )}
    >
      <Skeleton shape="circle" size="glyphSm" />
      <Skeleton shape="line" text="caption" measure="full" />
    </SkeletonGroup>
  )
}

function ModelRowTrigger({
  caption,
  ...props
}: ModelTriggerProps & { caption: string }): ReactElement {
  return (
    <div
      data-slot="model-row-field"
      className="flex h-button min-w-0 items-center justify-between gap-s3 ps-s3 pe-s1_5"
    >
      <span className="shrink-0 text-body text-ink">{caption}</span>
      <ModelChip {...props} />
    </div>
  )
}

export type { ModelTriggerProps }
export { ModelChip, ModelChipSkeleton, ModelRowTrigger }
