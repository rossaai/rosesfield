import { Button } from "@rosesfield/ui/components/button"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { type ReactNode, useEffect } from "react"
import { settingsQuery } from "@/api/queries"
import { useHasVisitorKey } from "@/api/visitor-keys"
import { formatNumber } from "@/copy/format"
import { t } from "@/copy/t"
import { type Account, accountQuery } from "@/screens/settings/account-query"
import { useOpenKeyDialog } from "@/shell/key-dialog-context"
import { noteSpendCap } from "@/shell/spend-cap"

export type BarSize = "bar" | "barCompact"

export function creditsLabel(account: Account): string | null {
  const { cap, credits } = account
  if (cap !== null) {
    return cap.left > 0
      ? t("key.cap.left", {
          left: formatNumber(cap.left),
          cap: formatNumber(cap.credits),
        })
      : t("key.cap.spent", { cap: formatNumber(cap.credits) })
  }
  return credits === null
    ? null
    : t("key.credits", { amount: formatNumber(credits) })
}

export function CreditBalance({ size }: { size: BarSize }): ReactNode {
  const settings = useQuery(settingsQuery).data
  const hasKey = useHasVisitorKey("engine")
  const account = useQuery({ ...accountQuery, enabled: settings !== undefined })
  const openKey = useOpenKeyDialog()
  const capCredits = account.data?.cap?.credits ?? null
  useEffect(() => noteSpendCap(capCredits), [capCredits])
  if (settings === undefined) {
    return null
  }
  if (settings.mode === "public" && !hasKey) {
    return (
      <Button tone="default" size={size} onClick={openKey}>
        {t("key.add")}
      </Button>
    )
  }
  const label = account.data === undefined ? null : creditsLabel(account.data)
  const isDemo = label === null && settings.engine.origin === "demo"
  if (label === null && !isDemo) {
    return null
  }
  return (
    <Button
      tone="default"
      size={size}
      render={<Link to="/settings" />}
      nativeButton={false}
      {...(isDemo ? { title: t("shell.demoEngine.tooltip") } : {})}
    >
      {label ?? t("shell.demoEngine.row")}
    </Button>
  )
}
