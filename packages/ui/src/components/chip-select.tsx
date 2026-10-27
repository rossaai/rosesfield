import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@rosesfield/ui/components/select"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@rosesfield/ui/components/tooltip"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import type { ReactElement, ReactNode } from "react"

type ChipOption<T extends string> = {
  value: T
  label: string
  icon: ReactNode
  description?: string
}

type ChipSelectProps<T extends string> = {
  label: string
  value: T
  onValueChange: (value: T) => void
  options: ReadonlyArray<ChipOption<T>>
  icon: ReactElement
  display?: string
  disabled?: boolean
  hint?: ReactNode
  compact?: ChipSelectCompact
}

type ChipSelectCompact = "label" | "icon"

const compactTrigger = {
  label: "min-w-0 shrink",
  icon: "min-w-0 shrink @max-regular:w-button-small @max-regular:shrink-0 @max-regular:justify-center @max-regular:px-0",
} satisfies Record<ChipSelectCompact, string>

const compactValue = {
  label: "",
  icon: "@max-regular:hidden",
} satisfies Record<ChipSelectCompact, string>

function ChipSelect<T extends string>({
  label,
  value,
  onValueChange,
  options,
  icon,
  display,
  disabled = false,
  hint,
  compact = "label",
}: ChipSelectProps<T>): ReactElement {
  const choose = (next: unknown): void => {
    const option = options.find((candidate) => candidate.value === next)
    if (option !== undefined) {
      onValueChange(option.value)
    }
  }
  return (
    <Select
      items={options}
      value={value}
      onValueChange={choose}
      disabled={disabled}
    >
      <Tooltip>
        <TooltipTrigger
          render={
            <SelectTrigger
              variant="chip"
              icon={icon}
              aria-label={label}
              data-slot="chip-select"
              data-compact={compact}
              className={cn(compactTrigger[compact], motion.press)}
            >
              <span className="sr-only">{`${label} `}</span>
              <SelectValue className={compactValue[compact]}>
                {display}
              </SelectValue>
            </SelectTrigger>
          }
        />
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
      <SelectContent
        side="top"
        align="start"
        sideOffset={4}
        className={cn(
          "min-w-0 p-2",
          options.some((option) => option.description !== undefined)
            ? "w-64"
            : "w-50"
        )}
      >
        <SelectGroup className="flex flex-col gap-0.5">
          <SelectLabel className="flex h-8 items-center gap-s1_5 px-2 py-0">
            {label}
            {hint}
          </SelectLabel>
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              icon={option.icon}
              {...(option.description === undefined
                ? {}
                : { description: option.description })}
              className="min-h-9 gap-2 ps-2 py-s1_5 data-selected:bg-(--tint)"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

export type { ChipOption, ChipSelectCompact, ChipSelectProps }
export { ChipSelect }
