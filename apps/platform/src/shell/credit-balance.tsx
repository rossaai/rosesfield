import { AppBarAction } from "@rosesfield/ui/components/app-bar"
import { IconButton } from "@rosesfield/ui/components/button"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { useQuery } from "@tanstack/react-query"
import { CoinsIcon, KeyRoundIcon } from "lucide-react"
import { type ReactElement, type ReactNode, useEffect } from "react"
import { useKeyReach } from "@/api/key-reach"
import { settingsQuery } from "@/api/queries"
import { formatAmount } from "@/copy/format"
import { t } from "@/copy/t"
import { type Account, accountQuery } from "@/screens/settings/account-query"
import { useOpenKeyDialog } from "@/shell/key-dialog-context"
import { useOpenCredits } from "@/shell/shell-dialogs"
import { noteSpendCap } from "@/shell/spend-cap"

export function creditsLabel(account: Account): string | null {
  const { cap, credits } = account
  if (cap !== null) {
    return cap.left > 0
      ? t("key.cap.left", {
          left: formatAmount(cap.left),
          cap: formatAmount(cap.credits),
        })
      : t("key.cap.spent", { cap: formatAmount(cap.credits) })
  }
  return credits === null
    ? null
    : t("key.credits", { amount: formatAmount(credits) })
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
  const reach = useKeyReach()
  const account = useQuery({ ...accountQuery, enabled: settings !== undefined })
  const openKey = useOpenKeyDialog()
  const openCredits = useOpenCredits()
  const capCredits = account.data?.cap?.credits ?? null
  useEffect(() => noteSpendCap(capCredits), [capCredits])
  if (settings === undefined) {
    return <BalanceSkeleton />
  }
  if (reach === "add") {
    return (
      <>
        <CompactKey label={t("key.add")} onPress={openKey} />
        <span className="hidden @regular:flex">
          <AppBarAction
            icon={<KeyRoundIcon aria-hidden="true" />}
            onClick={openKey}
          >
            {t("key.add")}
          </AppBarAction>
        </span>
      </>
    )
  }
  const label = account.data === undefined ? null : creditsLabel(account.data)
  const isDemo = label === null && settings.engine.origin === "demo"
  if (label === null && !isDemo) {
    return null
  }
  const words = label ?? t("shell.demoEngine.row")
  const credits = account.data?.cap === null ? account.data.credits : null
  const shown =
    credits === null || credits === undefined ? words : formatAmount(credits)
  return (
    <>
      <CompactKey label={words} onPress={openCredits} />
      <span className="hidden @regular:flex">
        <AppBarAction
          icon={<CoinsIcon aria-hidden="true" />}
          onClick={openCredits}
          aria-label={words}
          {...(isDemo ? { title: t("shell.demoEngine.tooltip") } : {})}
        >
          {shown}
        </AppBarAction>
      </span>
    </>
  )
}
