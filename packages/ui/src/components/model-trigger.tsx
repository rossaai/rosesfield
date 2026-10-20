import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { interaction } from "@rosesfield/ui/components/interaction"
import type { ModelRowPlace } from "@rosesfield/ui/contracts/model-row.generated"
import { cn } from "@rosesfield/ui/lib/cn"
import { ChevronRightIcon } from "lucide-react"
import type { ReactElement, ReactNode } from "react"

type ModelTriggerProps = Omit<ButtonPrimitive.Props, "children"> & {
  name: string
  mark?: ReactNode
}

const place: ModelRowPlace = "trigger"

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
      className={cn(
        "group/model relative inline-flex h-8 shrink-0 items-center rounded-dense border border-transparent bg-(--well) px-3 font-medium text-body whitespace-nowrap text-ink select-none [&_svg]:size-4",
        interaction.light,
        interaction.ring,
        className
      )}
      {...props}
    >
      <span data-slot="model-row-mark" aria-hidden="true" className="flex">
        {mark}
      </span>
      <span data-slot="model-row-name" className="ms-2 truncate px-1">
        {name}
      </span>
      <ChevronRightIcon
        aria-hidden="true"
        className="shrink-0 text-ink-muted group-hover/model:text-ink"
      />
    </ButtonPrimitive>
  )
}

function ModelRowTrigger({
  name,
  mark,
  caption,
  className,
  ...props
}: ModelTriggerProps & { caption: string }): ReactElement {
  return (
    <ButtonPrimitive
      data-slot="model-row"
      data-place={place}
      className={cn(
        "relative flex h-12 w-full items-center gap-2 rounded-cell bg-(--well) px-3 text-left select-none [&_svg]:size-4",
        interaction.light,
        interaction.ring,
        className
      )}
      {...props}
    >
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-caption text-ink-muted">{caption}</span>
        <span className="flex min-w-0 items-center gap-1">
          <span
            data-slot="model-row-name"
            className="truncate font-medium text-body text-ink"
          >
            {name}
          </span>
          <span
            data-slot="model-row-mark"
            aria-hidden="true"
            className="flex shrink-0"
          >
            {mark}
          </span>
        </span>
      </span>
      <ChevronRightIcon
        aria-hidden="true"
        className="shrink-0 text-ink-muted"
      />
    </ButtonPrimitive>
  )
}

export type { ModelTriggerProps }
export { ModelChip, ModelRowTrigger }
