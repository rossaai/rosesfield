import { Button } from "@rosesfield/ui/components/button"
import { MediaGrid } from "@rosesfield/ui/components/media-grid"
import { MediaTile } from "@rosesfield/ui/components/media-tile"
import { PreviewSlot } from "@rosesfield/ui/components/preview-slot"
import { Progress } from "@rosesfield/ui/components/progress"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { Viewer } from "@rosesfield/ui/components/viewer"
import { WorkingPulse } from "@rosesfield/ui/components/working-pulse"
import { type ReactElement, useEffect, useRef, useState } from "react"
import { formatDuration } from "@/copy/format"
import { t } from "@/gallery/copy.en"
import demoSquare from "@/gallery/fixtures/demo-image-1-1.png"
import demoTall from "@/gallery/fixtures/demo-image-9-16.png"
import demoWide from "@/gallery/fixtures/demo-image-16-9.png"
import demoVideo from "@/gallery/fixtures/demo-video-16-9.mp4"
import type { GalleryEntry } from "@/gallery/gallery-entry"

const square = { width: 1, height: 1 }
const wide = { width: 16, height: 9 }
const tall = { width: 9, height: 16 }

function ViewerDemo({
  startOpen = false,
}: {
  startOpen?: boolean
}): ReactElement {
  const tile = useRef<HTMLButtonElement>(null)
  const [origin, setOrigin] = useState<HTMLElement | null>(null)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (startOpen && tile.current !== null) {
      setOrigin(tile.current)
      setOpen(true)
    }
  }, [startOpen])
  return (
    <div className="w-[calc(2*var(--spacing-tile))]">
      <MediaTile
        ref={tile}
        kind="image"
        src={demoWide}
        alt={t("sample.output")}
        aspect={wide}
        caption={t("sample.demoCaption")}
        onOpen={(element) => {
          setOrigin(element)
          setOpen(true)
        }}
      />
      <Viewer
        open={open}
        onOpenChange={setOpen}
        origin={origin}
        aspect={wide}
        title={t("sample.viewer.title")}
        closeLabel={t("sample.close")}
        previous={{
          label: t("sample.viewer.previous"),
          onSelect: () => undefined,
        }}
        next={{ label: t("sample.viewer.next"), onSelect: () => undefined }}
        aside={<ViewerInfo />}
      >
        <img src={demoWide} alt={t("sample.output")} className="size-full" />
      </Viewer>
    </div>
  )
}

function ViewerInfo(): ReactElement {
  return (
    <>
      <dl className="flex flex-col gap-s3">
        <div className="flex flex-col gap-s1">
          <dt className="text-label text-ink-muted">
            {t("sample.viewer.prompt")}
          </dt>
          <dd className="text-body">{t("sample.prompt.short")}</dd>
        </div>
        <div className="flex flex-col gap-s1">
          <dt className="text-label text-ink-muted">
            {t("sample.viewer.model")}
          </dt>
          <dd className="text-body">{t("sample.demoEngine")}</dd>
        </div>
      </dl>
      <div className="flex flex-wrap gap-s2">
        <Button tone="primary">{t("sample.viewer.download")}</Button>
        <Button>{t("sample.viewer.useIn")}</Button>
        <Button tone="danger">{t("sample.delete")}</Button>
      </div>
    </>
  )
}

const mediaTile: GalleryEntry = {
  id: "media-tile",
  title: "entry.mediaTile",
  states: [
    {
      id: "image",
      label: "state.image",
      render: () => (
        <div className="w-[calc(2*var(--spacing-tile))]">
          <MediaTile
            kind="image"
            src={demoSquare}
            alt={t("sample.output")}
            aspect={square}
            caption={t("sample.demoCaption")}
          />
        </div>
      ),
    },
    {
      id: "video",
      label: "state.video",
      render: () => (
        <div className="w-[calc(3*var(--spacing-tile))]">
          <MediaTile
            kind="video"
            src={demoVideo}
            alt={t("sample.output")}
            aspect={wide}
            length={formatDuration(2)}
          />
        </div>
      ),
    },
    {
      id: "ratios",
      label: "state.ratios",
      render: () => (
        <div className="flex h-[calc(2*var(--spacing-tile))] gap-s2">
          {[
            { src: demoSquare, aspect: square },
            { src: demoWide, aspect: wide },
            { src: demoTall, aspect: tall },
          ].map((item) => (
            <MediaTile
              key={item.src}
              kind="image"
              src={item.src}
              alt={t("sample.output")}
              aspect={item.aspect}
              className="h-full w-auto"
            />
          ))}
        </div>
      ),
    },
  ],
}

const mediaGrid: GalleryEntry = {
  id: "media-grid",
  title: "entry.mediaGrid",
  states: [
    {
      id: "mixed",
      label: "state.mixed",
      render: () => (
        <MediaGrid>
          <WorkingPulse label={t("sample.working")} />
          <MediaTile
            kind="image"
            src={demoSquare}
            alt={t("sample.output")}
            onOpen={() => undefined}
          />
          <MediaTile
            kind="video"
            src={demoVideo}
            alt={t("sample.output")}
            length={formatDuration(2)}
          />
          <MediaTile
            kind="image"
            src={demoWide}
            alt={t("sample.output")}
            onOpen={() => undefined}
          />
          <MediaTile kind="image" src={demoTall} alt={t("sample.output")} />
        </MediaGrid>
      ),
    },
    {
      id: "loading",
      label: "state.loading",
      render: () => (
        <MediaGrid>
          {["a", "b", "c", "d", "e", "f"].map((key) => (
            <Skeleton key={key} />
          ))}
        </MediaGrid>
      ),
    },
  ],
}

const previewSlot: GalleryEntry = {
  id: "preview-slot",
  title: "entry.previewSlot",
  states: [
    {
      id: "ratios",
      label: "state.ratios",
      render: () => (
        <div className="grid grid-cols-3 items-start gap-s2">
          <PreviewSlot aspect={square} label={t("sample.previewSlot")} />
          <PreviewSlot aspect={wide} label={t("sample.previewSlot")} />
          <PreviewSlot aspect={tall} label={t("sample.previewSlot")} />
        </div>
      ),
    },
  ],
}

const workingPulse: GalleryEntry = {
  id: "working-pulse",
  title: "entry.workingPulse",
  states: [
    {
      id: "working",
      label: "state.working",
      render: () => (
        <div className="grid grid-cols-2 items-start gap-s2">
          <WorkingPulse label={t("sample.working")} aspect={wide} />
          <WorkingPulse label={t("sample.working")} aspect={wide}>
            <Progress value={40} aria-label={t("sample.working")} />
          </WorkingPulse>
          <div className="col-span-2 flex items-center justify-between gap-s2">
            <span className="text-caption text-ink-muted">
              {t("sample.waiting")}
            </span>
            <Button size="small">{t("sample.stop")}</Button>
          </div>
        </div>
      ),
    },
  ],
}

const viewer: GalleryEntry = {
  id: "viewer",
  title: "entry.viewer",
  states: [
    { id: "closed", label: "state.closed", render: () => <ViewerDemo /> },
    {
      id: "open",
      label: "state.withInfo",
      placement: "layer",
      render: () => <ViewerDemo startOpen />,
    },
  ],
}

export const mediaEntries: GalleryEntry[] = [
  mediaTile,
  mediaGrid,
  previewSlot,
  workingPulse,
  viewer,
]
