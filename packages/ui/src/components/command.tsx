import { Autocomplete } from "@base-ui/react/autocomplete"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { IconButton } from "@rosesfield/ui/components/button"
import { DialogScrim, dialogPanelClass } from "@rosesfield/ui/components/dialog"
import {
  menuItemClass,
  menuLabelClass,
} from "@rosesfield/ui/components/dropdown-menu"
import { cn } from "@rosesfield/ui/lib/cn"
import { SearchIcon, XIcon } from "lucide-react"
import type { ReactElement, ReactNode } from "react"

type CommandEntry = {
  value: string
  label: string
  icon?: ReactNode
  shortcut?: ReactNode
  onSelect: () => void
}

type CommandSection = {
  value: string
  label: string
  items: CommandEntry[]
}

type CommandProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  sections: CommandSection[]
  title: string
  placeholder: string
  empty: ReactNode
  closeLabel: string
  defaultQuery?: string
}

function CommandRow({
  entry,
  onDone,
}: {
  entry: CommandEntry
  onDone: () => void
}): ReactElement {
  const select = (): void => {
    entry.onSelect()
    onDone()
  }
  return (
    <Autocomplete.Item value={entry} onClick={select} className={menuItemClass}>
      {entry.icon}
      <span className="min-w-0 flex-1 truncate">{entry.label}</span>
      {entry.shortcut}
    </Autocomplete.Item>
  )
}

function CommandList({
  onDone,
  empty,
}: {
  onDone: () => void
  empty: ReactNode
}): ReactElement {
  return (
    <div className="flex max-h-list-max flex-col overflow-y-auto">
      <Autocomplete.Empty className="px-s4 py-s3 text-body text-ink-muted empty:hidden">
        {empty}
      </Autocomplete.Empty>
      <Autocomplete.List className="flex flex-col gap-s1_5">
        {(section: CommandSection) => (
          <Autocomplete.Group key={section.value} items={section.items}>
            <Autocomplete.GroupLabel className={menuLabelClass}>
              {section.label}
            </Autocomplete.GroupLabel>
            <Autocomplete.Collection>
              {(entry: CommandEntry) => (
                <CommandRow key={entry.value} entry={entry} onDone={onDone} />
              )}
            </Autocomplete.Collection>
          </Autocomplete.Group>
        )}
      </Autocomplete.List>
    </div>
  )
}

function CommandSearch({
  title,
  placeholder,
  closeLabel,
}: Pick<CommandProps, "title" | "placeholder" | "closeLabel">): ReactElement {
  return (
    <Autocomplete.InputGroup className="flex h-field items-center gap-s2 rounded-full bg-(--well) pr-s1 pl-s5">
      <SearchIcon aria-hidden="true" className="glyph text-ink-muted" />
      <Autocomplete.Input
        aria-label={title}
        placeholder={placeholder}
        className="h-full min-w-0 flex-1 bg-transparent text-body text-ink outline-none placeholder:text-ink-muted"
      />
      <DialogPrimitive.Close
        render={<IconButton label={closeLabel} tone="quiet" size="small" />}
      >
        <XIcon aria-hidden="true" />
      </DialogPrimitive.Close>
    </Autocomplete.InputGroup>
  )
}

function Command({
  open,
  onOpenChange,
  sections,
  title,
  placeholder,
  empty,
  closeLabel,
  defaultQuery = "",
}: CommandProps): ReactElement {
  const close = (): void => onOpenChange(false)
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogScrim />
        <DialogPrimitive.Popup
          aria-label={title}
          data-ground="layer"
          className={cn(dialogPanelClass, "gap-s2_5 p-s2_5")}
        >
          <Autocomplete.Root
            open
            inline
            items={sections}
            defaultValue={defaultQuery}
            itemToStringValue={(entry: CommandEntry) => entry.label}
            autoHighlight="always"
            keepHighlight
          >
            <CommandSearch
              title={title}
              placeholder={placeholder}
              closeLabel={closeLabel}
            />
            <CommandList onDone={close} empty={empty} />
          </Autocomplete.Root>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export type { CommandEntry, CommandProps, CommandSection }
export { Command }
