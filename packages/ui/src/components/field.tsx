import { Field as FieldPrimitive } from "@base-ui/react/field"
import { fieldInset } from "@rosesfield/ui/components/input"
import { interaction } from "@rosesfield/ui/components/interaction"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@rosesfield/ui/components/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@rosesfield/ui/components/tooltip"
import { cn } from "@rosesfield/ui/lib/cn"
import { CircleAlertIcon, CircleHelpIcon } from "lucide-react"
import type { ReactElement } from "react"

function Field({
  className,
  ...props
}: FieldPrimitive.Root.Props): ReactElement {
  return (
    <FieldPrimitive.Root
      data-slot="field"
      className={cn("flex w-full max-w-field-max flex-col gap-s1_5", className)}
      {...props}
    />
  )
}

function FieldCaption({
  className,
  ...props
}: FieldPrimitive.Label.Props): ReactElement {
  return (
    <FieldPrimitive.Label
      data-slot="field-caption"
      className={cn(
        "flex items-center justify-between gap-s2 text-label text-ink-muted",
        fieldInset,
        className
      )}
      {...props}
    />
  )
}

function FieldNote({
  className,
  ...props
}: FieldPrimitive.Description.Props): ReactElement {
  return (
    <FieldPrimitive.Description
      data-slot="field-note"
      className={cn("text-label text-ink-muted", fieldInset, className)}
      {...props}
    />
  )
}

function FieldMessage({
  className,
  children,
  ...props
}: FieldPrimitive.Error.Props): ReactElement {
  return (
    <FieldPrimitive.Error
      data-slot="field-message"
      match={true}
      className={cn(
        "flex items-start gap-s1_5 text-label text-bug-text",
        fieldInset,
        className
      )}
      {...props}
    >
      <CircleAlertIcon aria-hidden="true" className="glyph-small" />
      <span>{children}</span>
    </FieldPrimitive.Error>
  )
}

type FieldHintProps = {
  label: string
  text: string
  place: "hover" | "tap"
}

const hintMark = cn(
  "inline-flex shrink-0 items-center justify-center rounded-full text-ink-muted outline-none",
  interaction.fieldRing
)

function FieldHint({ label, text, place }: FieldHintProps): ReactElement {
  const mark = <CircleHelpIcon aria-hidden="true" className="glyph-small" />
  if (place === "tap") {
    return (
      <Popover>
        <PopoverTrigger
          data-slot="field-hint"
          aria-label={label}
          className={hintMark}
        >
          {mark}
        </PopoverTrigger>
        <PopoverContent side="top" className="text-label">
          {text}
        </PopoverContent>
      </Popover>
    )
  }
  return (
    <Tooltip>
      <TooltipTrigger
        data-slot="field-hint"
        aria-label={label}
        className={hintMark}
      >
        {mark}
      </TooltipTrigger>
      <TooltipContent className="h-auto py-s1_5 whitespace-normal">
        {text}
      </TooltipContent>
    </Tooltip>
  )
}

const FieldControl = FieldPrimitive.Control

export type { FieldHintProps }
export { Field, FieldCaption, FieldControl, FieldHint, FieldMessage, FieldNote }
