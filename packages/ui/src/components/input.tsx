import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "@rosesfield/ui/lib/cn"
import type { ReactElement } from "react"

const wellClass =
  "w-full min-w-0 max-w-field-max bg-(--well) px-s5 text-body text-ink outline-none placeholder:text-ink-muted disabled:opacity-(--opacity-disabled)"

function Input({ className, ...props }: InputPrimitive.Props): ReactElement {
  return (
    <InputPrimitive
      data-slot="input"
      className={cn(wellClass, "h-field rounded-full", className)}
      {...props}
    />
  )
}

export { Input, wellClass }
