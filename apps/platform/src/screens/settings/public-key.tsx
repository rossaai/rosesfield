import { Button } from "@rosesfield/ui/components/button"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { type ReactElement, type ReactNode, useState } from "react"
import { forgetVisitorKey, useHasVisitorKey } from "@/api/visitor-keys"
import { formatNumber } from "@/copy/format"
import { t } from "@/copy/t"
import { accountQuery } from "@/screens/settings/account-query"
import {
  Balance,
  isRefusal,
  KeyDialog,
  KeyRefusal,
  RetentionLine,
} from "@/screens/settings/key-dialog"

function KeptKey(): ReactElement {
  const client = useQueryClient()
  const account = useQuery(accountQuery)
  const status = account.data?.key ?? null
  const credits = account.data?.credits ?? null
  return (
    <div className="flex flex-col gap-s2">
      <div className="flex flex-wrap items-center justify-between gap-s2">
        <p className="text-body">{t("key.kept")}</p>
        <Button
          onClick={() => {
            void forgetVisitorKey("engine").then(() =>
              client.invalidateQueries()
            )
          }}
        >
          {t("key.forget")}
        </Button>
      </div>
      {credits === null ? null : <Balance credits={credits} />}
      {status !== null && isRefusal(status) ? (
        <KeyRefusal status={status} />
      ) : null}
      <RetentionLine />
    </div>
  )
}

export function CapLine(): ReactNode {
  const cap = useQuery(accountQuery).data?.cap ?? null
  if (cap === null) {
    return null
  }
  return (
    <p className="text-body">
      {cap.left > 0
        ? t("key.cap.left", {
            left: formatNumber(cap.left),
            cap: formatNumber(cap.credits),
          })
        : t("key.cap.spent", { cap: formatNumber(cap.credits) })}
    </p>
  )
}

export function OwnerBalance(): ReactElement {
  const credits = useQuery(accountQuery).data?.credits ?? null
  return (
    <div className="flex flex-col gap-s1">
      {credits === null ? null : <Balance credits={credits} />}
      <CapLine />
    </div>
  )
}

export function AddKeyButton({ tone }: { tone?: "primary" }): ReactElement {
  const [isOpen, setOpen] = useState(false)
  return (
    <>
      <Button
        {...(tone === undefined ? {} : { tone })}
        className="self-start"
        onClick={() => setOpen(true)}
      >
        {t("key.add")}
      </Button>
      <KeyDialog open={isOpen} onOpenChange={setOpen} />
    </>
  )
}

export function PublicKey(): ReactElement {
  const hasKey = useHasVisitorKey("engine")
  if (hasKey) {
    return <KeptKey />
  }
  return (
    <div className="flex flex-col gap-s2">
      <p className="text-body">{t("key.sentence")}</p>
      <AddKeyButton tone="primary" />
      <RetentionLine />
    </div>
  )
}
