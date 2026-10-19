import { type Asset, routes } from "@rosesfield/contract"
import { IconButton } from "@rosesfield/ui/components/button"
import { Card } from "@rosesfield/ui/components/card"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { useQuery } from "@tanstack/react-query"
import { CheckIcon, CopyIcon } from "lucide-react"
import { type ReactElement, useState } from "react"
import { callRoute } from "@/api/call-route"
import { t } from "@/copy/t"
import { useDevice } from "@/device/device-context"

function useAssetText(assetId: string) {
  return useQuery({
    queryKey: ["asset-text", assetId],
    queryFn: async ({ signal }) => {
      const blob = await callRoute(routes.readAssetContent, {
        params: { assetId },
        signal,
      })
      return blob.text()
    },
    staleTime: Number.POSITIVE_INFINITY,
  })
}

function CopyButton({ text }: { text: string }): ReactElement {
  const device = useDevice()
  const [isCopied, setCopied] = useState(false)
  return (
    <IconButton
      label={isCopied ? t("output.copied") : t("output.copy")}
      tone="quiet"
      size="small"
      className="self-end"
      onClick={() => void device.copyText(text).then(() => setCopied(true))}
      onPointerLeave={() => setCopied(false)}
      onBlur={() => setCopied(false)}
    >
      {isCopied ? (
        <CheckIcon aria-hidden="true" className="text-ink-muted" />
      ) : (
        <CopyIcon aria-hidden="true" />
      )}
    </IconButton>
  )
}

export function TextOutput({ asset }: { asset: Asset }): ReactElement {
  const text = useAssetText(asset.id)
  return (
    <Card className="max-h-full w-full max-w-prose-max overflow-y-auto">
      {text.data === undefined ? (
        <Skeleton className="h-s12 w-full" />
      ) : (
        <>
          <CopyButton text={text.data} />
          <p className="whitespace-pre-wrap text-body">{text.data}</p>
        </>
      )}
    </Card>
  )
}
