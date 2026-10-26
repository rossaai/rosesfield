import { Select as SelectPrimitive } from "@base-ui/react/select"
import {
  menuItemClass,
  menuLabelClass,
  menuPanelClass,
  menuSeparatorClass,
} from "@rosesfield/ui/components/dropdown-menu"
import { wellClass } from "@rosesfield/ui/components/input"
import { interaction } from "@rosesfield/ui/components/interaction"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import { cva, type VariantProps } from "class-variance-authority"
import { CheckIcon, ChevronDownIcon } from "lucide-react"
import type { ReactElement, ReactNode } from "react"

const Select = SelectPrimitive.Root

const selectTriggerVariants = cva(
  "group/select flex items-center justify-between gap-s2 whitespace-nowrap select-none disabled:opacity-(--opacity-disabled) data-placeholder:text-ink-muted [&_svg]:glyph",
  {
    variants: {
      variant: {
        field: cn(wellClass, "h-field gap-s1_5 rounded-full pe-s4"),
        chip: cn(
          "relative h-button-small max-w-button-max justify-start gap-s1 rounded-full bg-transparent px-s3 font-medium text-body text-ink data-popup-open:bg-(--tint) [&_svg]:glyph-small [&_[data-slot=select-icon]]:hidden",
          interaction.fill,
          interaction.ring
        ),
      },
    },
    defaultVariants: { variant: "field" },
  }
)

type SelectTriggerProps = SelectPrimitive.Trigger.Props &
  VariantProps<typeof selectTriggerVariants> & { icon: ReactElement }

function SelectTrigger({
  className,
  variant,
  icon,
  children,
  ...props
}: SelectTriggerProps): ReactElement {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(selectTriggerVariants({ variant }), className)}
      {...props}
    >
      <span
        aria-hidden="true"
        data-slot="select-lead"
        className="flex shrink-0"
      >
        {icon}
      </span>
      {children}
      <SelectPrimitive.Icon
        data-slot="select-icon"
        className={cn(
          "flex shrink-0 text-ink-muted group-data-popup-open/select:-rotate-180",
          motion.disclosure
        )}
      >
        <ChevronDownIcon aria-hidden="true" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

function SelectValue({
  className,
  ...props
}: SelectPrimitive.Value.Props): ReactElement {
  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      className={cn("min-w-0 flex-1 truncate text-left", className)}
      {...props}
    />
  )
}

type SelectContentProps = SelectPrimitive.Popup.Props &
  Pick<SelectPrimitive.Positioner.Props, "align" | "side" | "sideOffset">

function SelectContent({
  className,
  children,
  side = "bottom",
  sideOffset = 7,
  align = "start",
  ...props
}: SelectContentProps): ReactElement {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignItemWithTrigger={false}
        className="isolate z-50"
      >
        <SelectPrimitive.Popup
          data-slot="select-content"
          data-ground="layer"
          className={cn(menuPanelClass, className)}
          {...props}
        >
          <SelectPrimitive.List>{children}</SelectPrimitive.List>
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  )
}

type SelectItemProps = SelectPrimitive.Item.Props & {
  icon: ReactNode
  description?: string
}

function SelectItem({
  className,
  children,
  icon,
  description,
  ...props
}: SelectItemProps): ReactElement {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(menuItemClass, "pe-s12", className)}
      {...props}
    >
      <span
        aria-hidden="true"
        data-slot="select-item-icon"
        className="flex shrink-0 [&_svg]:glyph"
      >
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <SelectPrimitive.ItemText className="truncate">
          {children}
        </SelectPrimitive.ItemText>
        {description === undefined ? null : (
          <span
            data-slot="select-item-description"
            className="text-caption text-ink-muted"
          >
            {description}
          </span>
        )}
      </span>
      <SelectPrimitive.ItemIndicator className="absolute right-s4 flex text-ink-muted">
        <CheckIcon aria-hidden="true" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
}

function SelectGroup(props: SelectPrimitive.Group.Props): ReactElement {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />
}

function SelectLabel({
  className,
  ...props
}: SelectPrimitive.GroupLabel.Props): ReactElement {
  return (
    <SelectPrimitive.GroupLabel
      data-slot="select-label"
      className={cn(menuLabelClass, className)}
      {...props}
    />
  )
}

function SelectSeparator({
  className,
  ...props
}: SelectPrimitive.Separator.Props): ReactElement {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn(menuSeparatorClass, className)}
      {...props}
    />
  )
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
  selectTriggerVariants,
}
