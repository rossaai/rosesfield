import { Button, IconButton } from "@rosesfield/ui/components/button"
import { Progress, ProgressLabel } from "@rosesfield/ui/components/progress"
import { SquareIcon } from "lucide-react"
import type { ReactElement } from "react"
import { t } from "@/copy/t"
import type { Upload } from "@/pieces/use-uploads"

type UploadRowProps = {
  upload: Upload
  onStop: () => void
  onRetry: () => void
  onRemove: () => void
}

export function UploadRow({
  upload,
  onStop,
  onRetry,
  onRemove,
}: UploadRowProps): ReactElement | null {
  if (upload.status === "done") {
    return null
  }
  if (upload.status === "uploading") {
    return (
      <div className="flex items-center gap-s2">
        <Progress value={upload.progress * 100} className="min-w-0 flex-1">
          <ProgressLabel className="truncate">
            {t("library.upload.progress", { name: upload.file.name })}
          </ProgressLabel>
        </Progress>
        <IconButton
          label={t("state.stop")}
          size="small"
          tone="quiet"
          onClick={onStop}
        >
          <SquareIcon aria-hidden="true" />
        </IconButton>
      </div>
    )
  }
  const isUnsupported = upload.status === "unsupported"
  return (
    <div role="alert" className="flex flex-wrap items-center gap-s2">
      <p className="min-w-0 flex-1 truncate text-label text-bug-text">
        {isUnsupported
          ? t("library.upload.unsupported")
          : t("library.upload.failed")}
      </p>
      <Button size="small" onClick={isUnsupported ? onRemove : onRetry}>
        {isUnsupported ? t("library.upload.remove") : t("state.tryAgain")}
      </Button>
    </div>
  )
}
