import { AppBarAction } from "@rosesfield/ui/components/app-bar"
import { IconButton } from "@rosesfield/ui/components/button"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { useQuery } from "@tanstack/react-query"
import { CoinsIcon, KeyRoundIcon } from "lucide-react"
import { type ReactElement, type ReactNode, useEffect } from "react"
import { settingsQuery } from "@/api/queries"
import { useHasVisitorKey } from "@/api/visitor-keys"
import { formatNumber } from "@/copy/format"
import { t } from "@/copy/t"
import { type Account, accountQuery } from "@/screens/settings/account-query"
import { useOpenConnect, useOpenCredits } from "@/shell/shell-dialogs"
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

function BalanceSkeleton(): ReactElement {
  return (
    <span data-slot="balance-skeleton" className="flex">
      <Skeleton shape="circle" size="touch" className="@regular:hidden" />
      <Skeleton
        shape="chip"
        className="hidden h-button w-[calc(5*var(--spacing-s8))] @regular:block @regular:in-data-[density=compact]:h-button-small"
      />
    </span>
  )
}

function CompactKey({
  label,
  onPress,
}: {
  label: string
  onPress: () => void
}): ReactElement {
  return (
    <span className="flex @regular:hidden">
      <IconButton label={label} tone="quiet" onClick={onPress}>
        <KeyRoundIcon aria-hidden="true" />
      </IconButton>
    </span>
  )
}

export function CreditBalance(): ReactNode {
  const settings = useQuery(settingsQuery).data
  const hasKey = useHasVisitorKey("engine")
  const account = useQuery({ ...accountQuery, enabled: settings !== undefined })
  const openConnect = useOpenConnect()
  const openCredits = useOpenCredits()
  const capCredits = account.data?.cap?.credits ?? null
  useEffect(() => noteSpendCap(capCredits), [capCredits])
  if (settings === undefined) {
    return <BalanceSkeleton />
  }
  if (settings.keyFrom === "settings" && !hasKey) {
    return (
      <CompactKey
        label={t("shell.nav.connect")}
        onPress={() => openConnect()}
      />
    )
  }
  const label = account.data === undefined ? null : creditsLabel(account.data)
  const isDemo = label === null && settings.engine.origin === "demo"
  if (label === null && !isDemo) {
    return null
  }
  const words = label ?? t("shell.demoEngine.row")
  return (
    <>
      <CompactKey label={words} onPress={openCredits} />
      <span className="hidden @regular:flex">
        <AppBarAction
          icon={<CoinsIcon aria-hidden="true" />}
          onClick={openCredits}
          {...(isDemo ? { title: t("shell.demoEngine.tooltip") } : {})}
        >
          {words}
        </AppBarAction>
      </span>
    </>
  )
}
