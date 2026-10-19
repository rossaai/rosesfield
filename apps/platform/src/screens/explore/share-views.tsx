import { Button } from "@rosesfield/ui/components/button"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { StateView } from "@rosesfield/ui/components/state-view"
import type { ReactElement } from "react"
import { t } from "@/copy/t"
import { CopyButton } from "@/pieces/copy-button"

export function ShareMaking(): ReactElement {
  return (
    <div
      role="status"
      aria-label={t("share.making")}
      className="flex flex-col gap-s2"
    >
      <Skeleton className="h-s5 w-1/3" />
      <Skeleton className="h-field w-full rounded-full" />
    </div>
  )
}

export function ShareFailed({
  onRetry,
}: {
  onRetry: () => void
}): ReactElement {
  return (
    <StateView
      kind="failed"
      density="compact"
      title={t("share.failed.title")}
      body={t("share.failed.body")}
      actions={<Button onClick={onRetry}>{t("state.tryAgain")}</Button>}
    />
  )
}

export function LinkRow({ url }: { url: string }): ReactElement {
  return (
    <div className="flex flex-col gap-s1_5">
      <p className="text-label text-ink-muted">{t("share.link.label")}</p>
      <div className="flex items-center gap-s2 rounded-full bg-(--well) py-s1 pr-s1 pl-s5">
        <span className="min-w-0 flex-1 truncate font-mono text-code">
          {url}
        </span>
        <CopyButton text={url} label={t("share.link.copy")} />
      </div>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="self-start text-body text-hor-text underline"
      >
        {t("share.link.open")}
      </a>
    </div>
  )
}

export function ClipIdle({
  busy,
  failed,
  onMake,
}: {
  busy: boolean
  failed: boolean
  onMake: () => void
}): ReactElement {
  return (
    <>
      <p className="text-body text-ink-muted">{t("share.clip.body")}</p>
      <Button className="self-start" busy={busy} onClick={onMake}>
        {t("share.clip.make")}
      </Button>
      {failed ? (
        <p role="alert" className="text-label text-bug-text">
          {t("share.clip.failed")}
        </p>
      ) : null}
    </>
  )
}

export function ClipPreview({
  src,
  url,
  onSave,
}: {
  src: string
  url: string
  onSave: () => void
}): ReactElement {
  const caption = t("share.caption.text", { link: url })
  return (
    <div className="flex flex-col gap-s3">
      <video
        src={src}
        aria-label={t("share.clip.label")}
        controls
        autoPlay
        muted
        loop
        playsInline
        className="aspect-[9/16] w-1/2 self-start rounded-cell bg-(--well) object-contain"
      />
      <Button className="self-start" onClick={onSave}>
        {t("share.clip.save")}
      </Button>
      <div className="flex flex-col gap-s1_5">
        <p className="text-label text-ink-muted">{t("share.caption.label")}</p>
        <div className="flex items-start gap-s2 rounded-cell bg-(--well) p-s3">
          <p className="min-w-0 flex-1 text-body break-words">{caption}</p>
          <CopyButton text={caption} label={t("share.caption.copy")} />
        </div>
      </div>
    </div>
  )
}

export function ClipHeading(): ReactElement {
  return <h3 className="text-body font-medium">{t("share.clip.title")}</h3>
}
