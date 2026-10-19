import { SidebarItem } from "@rosesfield/ui/components/sidebar"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { CoinsIcon, FlaskConicalIcon, KeyRoundIcon } from "lucide-react"
import { type ReactNode, useEffect } from "react"
import { settingsQuery } from "@/api/queries"
import { useHasVisitorKey } from "@/api/visitor-keys"
import { formatNumber } from "@/copy/format"
import { t } from "@/copy/t"
import { type Account, accountQuery } from "@/screens/settings/account-query"
import { useOpenKeyDialog } from "@/shell/key-dialog-context"
import { noteSpendCap } from "@/shell/spend-cap"

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

export function KeyFoot(): ReactNode {
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
      <SidebarItem
        icon={<KeyRoundIcon aria-hidden="true" />}
        label={t("key.add")}
        onClick={openKey}
      />
    )
  }
  const label = account.data === undefined ? null : creditsLabel(account.data)
  if (label !== null) {
    return (
      <SidebarItem
        icon={<CoinsIcon aria-hidden="true" />}
        label={label}
        render={<Link to="/settings" />}
      />
    )
  }
  if (settings.engine.origin === "demo") {
    return (
      <SidebarItem
        icon={<FlaskConicalIcon aria-hidden="true" />}
        label={t("shell.demoEngine.row")}
        title={t("shell.demoEngine.tooltip")}
        className="text-cem-text"
        render={<Link to="/settings" />}
      />
    )
  }
  return null
}
