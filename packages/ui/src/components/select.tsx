import { Select as SelectPrimitive } from "@base-ui/react/select"
import {
  menuItemClass,
  menuLabelClass,
  menuPanelClass,
  menuSeparatorClass,
} from "@rosesfield/ui/components/dropdown-menu"
import { wellClass } from "@rosesfield/ui/components/input"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import { cva, type VariantProps } from "class-variance-authority"
import { CheckIcon, ChevronDownIcon } from "lucide-react"
import type { ReactElement } from "react"

const Select = SelectPrimitive.Root

const selectTriggerVariants = cva(
  "group/select flex items-center justify-between gap-s2 whitespace-nowrap select-none disabled:opacity-(--opacity-disabled) data-placeholder:text-ink-muted [&_svg]:glyph",
  {
    variants: {
      variant: {
        field: cn(wellClass, "h-field rounded-full pr-s4"),
        chip: cn(
          "h-button-small max-w-button-max rounded-full bg-(--well) px-s3 font-medium text-body text-ink hover:bg-(--tint) data-popup-open:bg-(--tint)",
          motion.press
        ),
      },
    },
    defaultVariants: { variant: "field" },
  }
)

type SelectTriggerProps = SelectPrimitive.Trigger.Props &
  VariantProps<typeof selectTriggerVariants>

function SelectTrigger({
  className,
  variant,
  children,
  ...props
}: SelectTriggerProps): ReactElement {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(selectTriggerVariants({ variant }), className)}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon
        className={cn(
          "flex shrink-0 text-ink-muted group-data-popup-open/select:[transform:rotate(-180deg)]",
          motion.control
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

function SelectItem({
  className,
  children,
  ...props
}: SelectPrimitive.Item.Props): ReactElement {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(menuItemClass, "pr-s12", className)}
      {...props}
    >
      <SelectPrimitive.ItemText className="min-w-0 flex-1 truncate">
        {children}
      </SelectPrimitive.ItemText>
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
