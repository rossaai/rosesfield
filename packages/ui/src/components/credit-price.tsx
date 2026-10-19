import { cn } from "@rosesfield/ui/lib/cn"
import { CoinsIcon } from "lucide-react"
import type { ReactElement } from "react"

type CreditPriceProps = {
  amount: string
  className?: string
}

function CreditPrice({ amount, className }: CreditPriceProps): ReactElement {
  return (
    <span
      data-slot="credit-price"
      className={cn("inline-flex items-center gap-s1 tabular-nums", className)}
    >
      <CoinsIcon aria-hidden="true" className="glyph-small" />
      {amount}
    </span>
  )
}

export type { CreditPriceProps }
export { CreditPrice }
