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
}

function ChipSelect<T extends string>({
  label,
  value,
  onValueChange,
  options,
  icon,
  display,
  disabled = false,
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
              className={cn("min-w-0 shrink", motion.press)}
            >
              <span className="sr-only">{`${label} `}</span>
              <SelectValue>{display}</SelectValue>
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
          <SelectLabel className="flex h-8 items-center px-2 py-0">
            {label}
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

export type { ChipOption, ChipSelectProps }
export { ChipSelect }
