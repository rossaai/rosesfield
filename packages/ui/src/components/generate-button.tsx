import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { interaction } from "@rosesfield/ui/components/interaction"
import type { GenerateButtonForm } from "@rosesfield/ui/contracts/generate-button.generated"
import { cn } from "@rosesfield/ui/lib/cn"
import { SparkleIcon } from "lucide-react"
import type { ReactElement, ReactNode } from "react"

type GenerateButtonProps = Omit<ButtonPrimitive.Props, "children" | "form"> & {
  label: string
  price?: ReactNode
  form?: GenerateButtonForm
  busy?: boolean
}

const forms = {
  tile: "h-20 w-30 flex-col justify-center gap-0.5 rounded-card px-3",
  bar: "h-12 w-full flex-row justify-center gap-2 rounded-cell px-4",
} satisfies Record<GenerateButtonForm, string>

const glyphs = {
  tile: "size-3",
  bar: "size-5",
} satisfies Record<GenerateButtonForm, string>

function Price({
  price,
  form,
}: {
  price: ReactNode
  form: GenerateButtonForm
}): ReactElement {
  return (
    <span
      data-slot="generate-button-price"
      className={cn(
        "inline-flex items-center gap-0.5 tabular-nums",
        form === "tile" ? "text-label" : "text-body"
      )}
    >
      <SparkleIcon
        aria-hidden="true"
        className={cn("shrink-0", glyphs[form])}
      />
      {price}
    </span>
  )
}

function GenerateButton({
  label,
  price,
  form = "bar",
  busy = false,
  className,
  onClick,
  ...props
}: GenerateButtonProps): ReactElement {
  const guardedClick: NonNullable<GenerateButtonProps["onClick"]> = (event) => {
    if (busy) {
      event.preventDefault()
      return
    }
    onClick?.(event)
  }
  return (
    <ButtonPrimitive
      data-slot="generate-button"
      data-form={form}
      data-priced={price === undefined || price === null ? "no" : "yes"}
      aria-busy={busy || undefined}
      onClick={guardedClick}
      className={cn(
        "relative inline-flex shrink-0 items-center bg-ink font-medium text-canvas select-none disabled:pointer-events-none disabled:opacity-(--opacity-disabled) data-disabled:pointer-events-none data-disabled:opacity-(--opacity-disabled) aria-busy:opacity-(--opacity-pulse)",
        forms[form],
        interaction.light,
        interaction.ring,
        className
      )}
      {...props}
    >
      <span
        data-slot="generate-button-label"
        className="whitespace-nowrap text-body"
      >
        {label}
      </span>
      {price === undefined || price === null ? null : (
        <Price price={price} form={form} />
      )}
    </ButtonPrimitive>
  )
}

export type { GenerateButtonProps }
export { GenerateButton }
