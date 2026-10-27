import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { interaction } from "@rosesfield/ui/components/interaction"
import type { GenerateButtonForm } from "@rosesfield/ui/contracts/generate-button.generated"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import { CoinsIcon } from "lucide-react"
import type { ReactElement, ReactNode } from "react"

type GenerateButtonPriceKind = "figure" | "note"

type GenerateButtonProps = Omit<ButtonPrimitive.Props, "children" | "form"> & {
  label: string
  price?: ReactNode
  priceKind?: GenerateButtonPriceKind
  icon?: ReactNode
  form?: GenerateButtonForm
  busy?: boolean
}

const forms = {
  tile: "h-button-dense min-w-button-dense flex-row justify-center gap-s1_5 rounded-full px-s3 @regular:h-20 @regular:w-30 @regular:min-w-0 @regular:flex-col @regular:gap-0.5 @regular:rounded-cell @regular:px-3",
  bar: "h-field w-full flex-row justify-center gap-2 rounded-cell px-4",
} satisfies Record<GenerateButtonForm, string>

const priceFits = {
  tile: "max-w-tile @regular:max-w-none",
  bar: "",
} satisfies Record<GenerateButtonForm, string>

const tileNote = "hidden @regular:inline-flex"

function Price({
  price,
  form,
  kind,
}: {
  price: ReactNode
  form: GenerateButtonForm
  kind: GenerateButtonPriceKind
}): ReactElement {
  return (
    <span
      data-slot="generate-button-price"
      className={cn(
        "inline-flex min-w-0 items-center gap-0.5 text-label tabular-nums",
        priceFits[form],
        form === "tile" && kind === "note" ? tileNote : ""
      )}
    >
      <CoinsIcon aria-hidden="true" className="glyph-small shrink-0" />
      <span className="min-w-0 truncate">{price}</span>
    </span>
  )
}

const glyphOnly = "w-button-dense px-0 @regular:px-3"

function Glyph({ icon }: { icon: ReactNode }): ReactElement {
  return (
    <span
      data-slot="generate-button-glyph"
      aria-hidden="true"
      className="flex [&_svg]:glyph @regular:hidden"
    >
      {icon}
    </span>
  )
}

function GenerateButton({
  label,
  price,
  priceKind = "figure",
  icon,
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
  const isPriced =
    price !== undefined && price !== null && priceKind === "figure"
  const glyph = form === "tile" && icon !== undefined ? icon : null
  return (
    <ButtonPrimitive
      data-slot="generate-button"
      data-form={form}
      data-priced={
        price === undefined || price === null
          ? "no"
          : priceKind === "figure"
            ? "yes"
            : "note"
      }
      aria-busy={busy || undefined}
      onClick={guardedClick}
      className={cn(
        "relative inline-flex shrink-0 items-center bg-ink font-medium text-canvas select-none disabled:pointer-events-none disabled:opacity-(--opacity-disabled) data-disabled:pointer-events-none data-disabled:opacity-(--opacity-disabled) aria-busy:opacity-(--opacity-pulse)",
        forms[form],
        glyph !== null && !isPriced ? glyphOnly : "",
        motion.press,
        interaction.ring,
        className
      )}
      {...props}
    >
      {glyph === null ? null : <Glyph icon={glyph} />}
      <span
        data-slot="generate-button-label"
        className={cn(
          "whitespace-nowrap text-body",
          glyph === null ? "" : "sr-only @regular:not-sr-only"
        )}
      >
        {label}
      </span>
      {price === undefined || price === null ? null : (
        <Price price={price} form={form} kind={priceKind} />
      )}
    </ButtonPrimitive>
  )
}

export type { GenerateButtonPriceKind, GenerateButtonProps }
export { GenerateButton }
