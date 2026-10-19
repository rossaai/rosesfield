import type { Run } from "@rosesfield/contract"
import { useMutation } from "@tanstack/react-query"
import { type ReactElement, useEffect, useRef, useState } from "react"
import { t } from "@/copy/t"
import { useDevice } from "@/device/device-context"
import { DialogOrSheet } from "@/pieces/responsive-layer"
import { type SharedOutput, shareRun } from "@/screens/explore/share-api"
import { type Clip, makeClip } from "@/screens/explore/share-clip"
import { clipColors, clipSourcesOf } from "@/screens/explore/share-sources"
import {
  ClipHeading,
  ClipIdle,
  ClipPreview,
  LinkRow,
  ShareFailed,
  ShareMaking,
} from "@/screens/explore/share-views"

type ShareDialogProps = {
  run: Run
  outputId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function shareUrlOf(share: SharedOutput): string {
  return new URL(share.path, window.location.origin).href
}

function MadeClip({ clip, url }: { clip: Clip; url: string }): ReactElement {
  const device = useDevice()
  const [src] = useState(() => URL.createObjectURL(clip.blob))
  useEffect(() => () => URL.revokeObjectURL(src), [src])
  const extension = clip.mime === "video/mp4" ? "mp4" : "webm"
  return (
    <ClipPreview
      src={src}
      url={url}
      onSave={() =>
        void device.save({
          name: `rosesfield-clip.${extension}`,
          blob: clip.blob,
        })
      }
    />
  )
}

function ClipSection({
  run,
  outputId,
  url,
}: {
  run: Run
  outputId: string
  url: string
}): ReactElement {
  const clip = useMutation({
    mutationFn: async () => {
      const sources = await clipSourcesOf(run, outputId)
      try {
        return await makeClip(sources.plan, clipColors())
      } finally {
        sources.release()
      }
    },
  })
  return (
    <section className="flex flex-col gap-s2">
      <ClipHeading />
      {clip.data === undefined ? (
        <ClipIdle
          busy={clip.isPending}
          failed={clip.isError}
          onMake={() => clip.mutate()}
        />
      ) : (
        <MadeClip clip={clip.data} url={url} />
      )}
    </section>
  )
}

function ShareBody({
  run,
  outputId,
}: {
  run: Run
  outputId: string
}): ReactElement {
  const share = useMutation({
    mutationFn: () => shareRun(run.id),
  })
  const { mutate } = share
  const started = useRef(false)
  useEffect(() => {
    if (!started.current) {
      started.current = true
      mutate()
    }
  }, [mutate])
  if (share.isError) {
    return <ShareFailed onRetry={() => share.mutate()} />
  }
  if (share.data === undefined) {
    return <ShareMaking />
  }
  const url = shareUrlOf(share.data)
  return (
    <div className="flex flex-col gap-s6">
      <LinkRow url={url} />
      <ClipSection run={run} outputId={outputId} url={url} />
    </div>
  )
}

export function ShareDialog(props: ShareDialogProps): ReactElement {
  return (
    <DialogOrSheet
      open={props.open}
      onOpenChange={props.onOpenChange}
      title={t("share.title")}
    >
      {props.open ? (
        <ShareBody run={props.run} outputId={props.outputId} />
      ) : null}
    </DialogOrSheet>
  )
}
