import { Separator as SeparatorPrimitive } from "@base-ui/react/separator"
import { cn } from "@rosesfield/ui/lib/cn"
import type { ReactElement } from "react"

function Separator({
  className,
  orientation = "horizontal",
  ...props
}: SeparatorPrimitive.Props): ReactElement {
  return (
    <SeparatorPrimitive
      data-slot="separator"
      orientation={orientation}
      className={cn(
        "shrink-0 bg-(--line)",
        orientation === "horizontal"
          ? "h-hairline w-full"
          : "w-hairline self-stretch",
        className
      )}
      {...props}
    />
  )
}

export { Separator }
