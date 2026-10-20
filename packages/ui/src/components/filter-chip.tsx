import { Collapsible } from "@base-ui/react/collapsible"
import { interaction } from "@rosesfield/ui/components/interaction"
import { cn } from "@rosesfield/ui/lib/cn"
import { ChevronDownIcon } from "lucide-react"
import type { ComponentProps, ReactElement, ReactNode } from "react"

type FilterChipProps = Omit<ComponentProps<"a">, "children"> & {
  href: string
  children: string
  tag?: string
}

function FilterChip({
  href,
  children,
  tag,
  className,
  ...props
}: FilterChipProps): ReactElement {
  return (
    <a
      data-slot="inline-chip"
      href={href}
      className={cn(
        "relative inline-flex h-8 shrink-0 items-center rounded-dense border border-transparent bg-(--well) px-2.5 font-medium text-body whitespace-nowrap text-ink",
        interaction.light,
        interaction.ring,
        className
      )}
      {...props}
    >
      <span data-slot="inline-chip-words" className="px-1">
        {children}
      </span>
      {tag === undefined ? null : (
        <span
          data-slot="inline-chip-tag"
          className="self-start pt-0.75 text-legal font-medium"
        >
          {tag}
        </span>
      )}
    </a>
  )
}

function FilterChipRow({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}): ReactElement {
  return (
    <nav
      aria-label={label}
      data-slot="filter-chip-row"
      className={cn("@container w-full", className)}
    >
      <div className="flex h-12 flex-nowrap items-center gap-2 overflow-x-auto py-2 [scrollbar-width:none] @regular:h-auto @regular:flex-wrap @regular:justify-center @regular:overflow-visible @regular:py-0">
        {children}
      </div>
    </nav>
  )
}

type SettingGroupProps = {
  name: string
  count: number
  icon: ReactNode
  children: ReactNode
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

function SettingGroup({
  name,
  count,
  icon,
  children,
  ...state
}: SettingGroupProps): ReactElement {
  return (
    <Collapsible.Root
      data-slot="setting-group"
      className="flex flex-col overflow-hidden rounded-card bg-(--well) p-1"
      {...state}
    >
      <Collapsible.Trigger
        data-slot="setting-group-trigger"
        className={cn(
          "group/trigger relative flex h-7 w-full items-center gap-2 rounded-cell px-3 py-1 text-left font-medium text-body text-ink-muted [&_svg]:size-4",
          interaction.light,
          interaction.ring
        )}
      >
        <span aria-hidden="true" className="flex text-ink">
          {icon}
        </span>
        <span className="min-w-0 flex-1 truncate">
          {name}
          <span data-slot="setting-group-count">{` · ${count}`}</span>
        </span>
        <ChevronDownIcon
          aria-hidden="true"
          className="shrink-0 [transition:rotate_var(--control-change)] group-data-panel-open/trigger:rotate-180"
        />
      </Collapsible.Trigger>
      <Collapsible.Panel
        data-slot="setting-group-panel"
        className="h-(--collapsible-panel-height) overflow-hidden [transition:height_var(--control-change)] data-ending-style:h-0 data-starting-style:h-0"
      >
        <div
          data-slot="setting-group-choices"
          className="mt-1 grid grid-cols-[repeat(3,--spacing(22))] gap-2 rounded-cell bg-(--ground) p-2"
        >
          {children}
        </div>
      </Collapsible.Panel>
    </Collapsible.Root>
  )
}

type SettingChoiceProps = {
  label: string
  picture: ReactNode
  isCurrent: boolean
  onChoose: () => void
}

function SettingChoice({
  label,
  picture,
  isCurrent,
  onChoose,
}: SettingChoiceProps): ReactElement {
  return (
    <button
      type="button"
      data-slot="setting-choice"
      aria-pressed={isCurrent}
      onClick={onChoose}
      className={cn(
        "relative flex h-26 items-end justify-center overflow-hidden rounded-dense bg-(--well) p-1 text-ink aria-pressed:inset-ring-4 aria-pressed:inset-ring-ink",
        interaction.ring
      )}
    >
      <span
        aria-hidden="true"
        data-slot="setting-choice-picture"
        className="absolute top-3 left-1/2 flex size-17 -translate-x-1/2 items-center justify-center [&_svg]:size-8"
      >
        {picture}
      </span>
      <span
        data-slot="setting-choice-label"
        className="block h-5 w-full truncate text-center text-label leading-5 font-medium"
      >
        {label}
      </span>
    </button>
  )
}

function SettingGroups({ children }: { children: ReactNode }): ReactElement {
  return (
    <div data-slot="setting-groups" className="flex flex-col gap-2">
      {children}
    </div>
  )
}

export type { FilterChipProps, SettingChoiceProps, SettingGroupProps }
export { FilterChip, FilterChipRow, SettingChoice, SettingGroup, SettingGroups }
