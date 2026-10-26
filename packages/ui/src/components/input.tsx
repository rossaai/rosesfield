import { Input as InputPrimitive } from "@base-ui/react/input"
import { interaction } from "@rosesfield/ui/components/interaction"
import { cn } from "@rosesfield/ui/lib/cn"
import type { ReactElement } from "react"

const fieldInset = "ps-s5 pe-s5"

const wellClass = `w-full min-w-0 max-w-field-max bg-(--well) ${fieldInset} text-body text-ink outline-none placeholder:text-ink-muted disabled:opacity-(--opacity-disabled) ${interaction.fieldRing}`

function Input({ className, ...props }: InputPrimitive.Props): ReactElement {
  return (
    <InputPrimitive
      data-slot="input"
      className={cn(wellClass, "h-field rounded-full", className)}
      {...props}
    />
  )
}

export { fieldInset, Input, wellClass }
