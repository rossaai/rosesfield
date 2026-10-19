import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rosesfield/ui/components/select"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@rosesfield/ui/components/tooltip"
import type { ReactElement, ReactNode } from "react"

type ChipOption<T extends string> = {
  value: T
  label: string
}

type ChipSelectProps<T extends string> = {
  label: string
  value: T
  onValueChange: (value: T) => void
  options: ReadonlyArray<ChipOption<T>>
  icon?: ReactNode
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
              data-slot="chip-select"
              className="min-w-0 shrink"
            >
              {icon}
              <span className="sr-only">{`${label} `}</span>
              <SelectValue>{display}</SelectValue>
            </SelectTrigger>
          }
        />
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export type { ChipOption, ChipSelectProps }
export { ChipSelect }
