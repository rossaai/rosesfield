import { Field as FieldPrimitive } from "@base-ui/react/field"
import { cn } from "@rosesfield/ui/lib/cn"
import { CircleAlertIcon } from "lucide-react"
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
      className={cn("text-label text-ink-muted", className)}
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
        className
      )}
      {...props}
    >
      <CircleAlertIcon aria-hidden="true" className="glyph-small" />
      <span>{children}</span>
    </FieldPrimitive.Error>
  )
}

const FieldControl = FieldPrimitive.Control

export { Field, FieldCaption, FieldControl, FieldMessage, FieldNote }
