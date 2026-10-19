import { IconButton } from "@rosesfield/ui/components/button"
import { CheckIcon, CopyIcon } from "lucide-react"
import { type ReactElement, useState } from "react"
import { t } from "@/copy/t"
import { useDevice } from "@/device/device-context"

type CopyButtonProps = {
  text: string
  label?: string
}

export function CopyButton({ text, label }: CopyButtonProps): ReactElement {
  const device = useDevice()
  const [isCopied, setCopied] = useState(false)
  return (
    <IconButton
      label={isCopied ? t("output.copied") : (label ?? t("connect.copy"))}
      tone="quiet"
      size="small"
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

export function CodeBlock({ code }: { code: string }): ReactElement {
  return (
    <div className="flex items-start gap-s2 rounded-cell bg-(--well) p-s3">
      <pre className="min-w-0 flex-1 overflow-x-auto font-mono text-code break-all whitespace-pre-wrap">
        {code}
      </pre>
      <CopyButton text={code} />
    </div>
  )
}
