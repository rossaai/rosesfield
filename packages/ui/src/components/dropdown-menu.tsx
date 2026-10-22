import { Menu as MenuPrimitive } from "@base-ui/react/menu"
import {
  nestedLayerClass,
  useIsInLayer,
} from "@rosesfield/ui/components/layer-depth"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import { CheckIcon, ChevronRightIcon } from "lucide-react"
import type { ComponentProps, ReactElement, ReactNode } from "react"

const menuPanelClass = cn(
  "material z-50 flex has-[[data-slot=dropdown-menu-lead]]:[--menu-lead:calc(var(--spacing-glyph)+var(--spacing-s3))] max-h-(--available-height) min-w-popover-min max-w-popover-max flex-col overflow-y-auto rounded-vessel p-s2_5 text-ink shadow-float outline-none",
  motion.popover
)

const menuItemClass = cn(
  "relative flex min-h-button w-full cursor-default items-center gap-s3 rounded-item py-s2 ps-[calc(var(--spacing-s4)+var(--menu-lead,0px))] pe-s4 has-[>[data-slot=dropdown-menu-lead]]:ps-s4 text-left text-body text-ink outline-none select-none data-highlighted:bg-(--tint) data-disabled:pointer-events-none data-disabled:opacity-(--opacity-disabled) data-[tone=danger]:text-bug-text [&_svg]:glyph",
  motion.tint
)

const menuLabelClass = "px-s4 py-s1_5 text-label font-medium text-ink-muted"

const menuSeparatorClass = "mx-s4 my-s1_5 h-px shrink-0 bg-layer-line"

function DropdownMenu(props: MenuPrimitive.Root.Props): ReactElement {
  return <MenuPrimitive.Root data-slot="dropdown-menu" {...props} />
}

function DropdownMenuTrigger(props: MenuPrimitive.Trigger.Props): ReactElement {
  return <MenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />
}

type DropdownMenuContentProps = MenuPrimitive.Popup.Props &
  Pick<MenuPrimitive.Positioner.Props, "align" | "side" | "sideOffset">

function DropdownMenuContent({
  align = "start",
  side = "bottom",
  sideOffset = 7,
  className,
  ...props
}: DropdownMenuContentProps): ReactElement {
  const isNested = useIsInLayer()
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        className="isolate z-50 outline-none"
        align={align}
        side={side}
        sideOffset={sideOffset}
      >
        <MenuPrimitive.Popup
          data-slot="dropdown-menu-content"
          data-ground="layer"
          data-depth={isNested ? "nested" : undefined}
          className={cn(
            menuPanelClass,
            isNested ? nestedLayerClass : "",
            className
          )}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  )
}

function DropdownMenuGroup(props: MenuPrimitive.Group.Props): ReactElement {
  return <MenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />
}

function DropdownMenuLabel({
  className,
  ...props
}: MenuPrimitive.GroupLabel.Props): ReactElement {
  return (
    <MenuPrimitive.GroupLabel
      data-slot="dropdown-menu-label"
      className={cn(menuLabelClass, className)}
      {...props}
    />
  )
}

function MenuLead({ lead }: { lead: ReactNode }): ReactNode {
  if (lead === undefined || lead === null) {
    return null
  }
  return (
    <span
      aria-hidden="true"
      data-slot="dropdown-menu-lead"
      className="flex size-glyph shrink-0 items-center justify-center text-ink-muted [&_svg]:glyph"
    >
      {lead}
    </span>
  )
}

type DropdownMenuItemProps = MenuPrimitive.Item.Props & {
  tone?: "default" | "danger"
  lead?: ReactNode
}

function DropdownMenuItem({
  className,
  tone = "default",
  lead,
  children,
  ...props
}: DropdownMenuItemProps): ReactElement {
  return (
    <MenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-tone={tone}
      className={cn(menuItemClass, className)}
      {...props}
    >
      <MenuLead lead={lead} />
      {children}
    </MenuPrimitive.Item>
  )
}

function DropdownMenuSub(props: MenuPrimitive.SubmenuRoot.Props): ReactElement {
  return <MenuPrimitive.SubmenuRoot data-slot="dropdown-menu-sub" {...props} />
}

function DropdownMenuSubTrigger({
  className,
  children,
  lead,
  ...props
}: MenuPrimitive.SubmenuTrigger.Props & { lead?: ReactNode }): ReactElement {
  return (
    <MenuPrimitive.SubmenuTrigger
      data-slot="dropdown-menu-sub-trigger"
      className={cn(menuItemClass, "data-popup-open:bg-(--tint)", className)}
      {...props}
    >
      <MenuLead lead={lead} />
      {children}
      <ChevronRightIcon aria-hidden="true" className="ml-auto text-ink-muted" />
    </MenuPrimitive.SubmenuTrigger>
  )
}

function DropdownMenuSubContent({
  side = "right",
  sideOffset = 0,
  ...props
}: DropdownMenuContentProps): ReactElement {
  return <DropdownMenuContent side={side} sideOffset={sideOffset} {...props} />
}

function DropdownMenuRadioGroup(
  props: MenuPrimitive.RadioGroup.Props
): ReactElement {
  return (
    <MenuPrimitive.RadioGroup
      data-slot="dropdown-menu-radio-group"
      {...props}
    />
  )
}

function DropdownMenuRadioItem({
  className,
  children,
  lead,
  ...props
}: MenuPrimitive.RadioItem.Props & { lead?: ReactNode }): ReactElement {
  return (
    <MenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      className={cn(menuItemClass, "pe-s12", className)}
      {...props}
    >
      <MenuLead lead={lead} />
      {children}
      <MenuPrimitive.RadioItemIndicator className="absolute right-s4 flex text-ink-muted">
        <CheckIcon aria-hidden="true" />
      </MenuPrimitive.RadioItemIndicator>
    </MenuPrimitive.RadioItem>
  )
}

function DropdownMenuSeparator({
  className,
  ...props
}: MenuPrimitive.Separator.Props): ReactElement {
  return (
    <MenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn(menuSeparatorClass, className)}
      {...props}
    />
  )
}

function DropdownMenuShortcut({
  className,
  ...props
}: ComponentProps<"span">): ReactElement {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn("ml-auto text-caption text-ink-muted", className)}
      {...props}
    />
  )
}

export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  menuItemClass,
  menuLabelClass,
  menuPanelClass,
  menuSeparatorClass,
}
