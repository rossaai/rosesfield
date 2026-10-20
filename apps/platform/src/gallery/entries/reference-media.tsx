import { AppTile, AppTileGrid } from "@rosesfield/ui/components/app-tile"
import { Badge } from "@rosesfield/ui/components/badge"
import { Button, IconButton } from "@rosesfield/ui/components/button"
import { MediaFeed, ViewAll } from "@rosesfield/ui/components/media-feed"
import { PresetGrid, PresetTile } from "@rosesfield/ui/components/preset-tile"
import { PromoCard, PromoRow } from "@rosesfield/ui/components/promo-card"
import { ResultTile } from "@rosesfield/ui/components/result-tile"
import { SectionHeader } from "@rosesfield/ui/components/section-header"
import { Viewer } from "@rosesfield/ui/components/viewer"
import { ImageIcon, Volume2Icon } from "lucide-react"
import { type ReactElement, useState } from "react"
import { t } from "@/gallery/copy.en"
import demoSquare from "@/gallery/fixtures/demo-image-1-1.png"
import demoTall from "@/gallery/fixtures/demo-image-9-16.png"
import demoWide from "@/gallery/fixtures/demo-image-16-9.png"
import demoVideo from "@/gallery/fixtures/demo-video-16-9.mp4"
import type { GalleryEntry } from "@/gallery/gallery-entry"
import { frameState, interactionStates } from "@/gallery/reference-frames"

const shapes = [
  { src: demoTall, aspect: { width: 9, height: 16 } },
  { src: demoWide, aspect: { width: 16, height: 9 } },
  { src: demoSquare, aspect: { width: 1, height: 1 } },
] as const

function Result({
  index,
  form = "card",
  narrow = true,
}: {
  index: number
  form?: "card" | "library"
  narrow?: boolean
}): ReactElement {
  const shape = shapes[index % shapes.length] ?? shapes[0]
  return (
    <ResultTile
      kind="image"
      src={shape.src}
      alt={t("sample.output")}
      aspect={shape.aspect}
      app={t("sample.nav.image")}
      model={t("sample.model")}
      openLabel={t("sample.openResult")}
      expandLabel={t("sample.expandResult")}
      moreLabel={t("sample.moreActions")}
      recreateLabel={t("sample.recreate")}
      recreateName={t("sample.recreateName")}
      onOpen={() => undefined}
      onRecreate={() => undefined}
      form={form}
      narrow={narrow}
      {...(form === "library"
        ? {
            sound: (
              <IconButton label={t("sample.sound")} place="clip" tone="glass">
                <Volume2Icon aria-hidden="true" />
              </IconButton>
            ),
          }
        : {})}
    />
  )
}

const twelve = Array.from({ length: 12 }, (_, index) => index)

function Feed({ layout }: { layout: "masonry" | "row" }): ReactElement {
  return (
    <MediaFeed
      label={t("sample.section.title")}
      layout={layout}
      header={
        <SectionHeader
          title={
            layout === "row" ? t("sample.model") : t("sample.section.title")
          }
          line={t("sample.section.line")}
          href="?entry=ref-media-row"
        />
      }
      viewAll={
        <ViewAll href="?entry=ref-gallery-grid">{t("sample.viewAll")}</ViewAll>
      }
    >
      {twelve.map((index) => (
        <Result key={index} index={index} narrow={layout === "masonry"} />
      ))}
    </MediaFeed>
  )
}

function Presets(): ReactElement {
  return (
    <PresetGrid label={t("sample.presets")}>
      {twelve.map((index) => (
        <PresetTile
          key={index}
          name={t("sample.preset.dolly")}
          href="?preset=dolly"
          viewLabel={t("sample.preset.dolly")}
          line={t("sample.preset.line")}
          action={{ label: t("sample.tryIt"), href: "?apps=video" }}
          clip={{
            src: demoVideo,
            poster: demoWide,
            alt: t("sample.preset.dolly"),
          }}
          aspect={
            index % 2 === 0
              ? { width: 9, height: 16 }
              : { width: 16, height: 9 }
          }
        />
      ))}
    </PresetGrid>
  )
}

function Apps(): ReactElement {
  return (
    <div className="w-full @regular:w-186.75">
      <AppTileGrid label={t("sample.nav.apps")}>
        {["image", "video", "audio", "recast", "motion", "effects"].map(
          (id) => (
            <AppTile
              key={id}
              href={`?app=${id}`}
              name={t("sample.nav.image")}
              line={t("sample.appTile.line")}
              icon={<ImageIcon />}
              {...(id === "image"
                ? { badge: <Badge kind="new">{t("sample.badge.new")}</Badge> }
                : {})}
            />
          )
        )}
      </AppTileGrid>
    </div>
  )
}

function Promos(): ReactElement {
  return (
    <PromoRow label={t("sample.promo.title")} className="-mx-4">
      {[0, 1, 2, 3].map((index) => (
        <PromoCard
          key={index}
          name={t("sample.promo.title")}
          line={t("sample.promo.line")}
          href="?promo"
          openLabel={t("sample.promo.open")}
          clip={<img alt="" src={demoWide} />}
        />
      ))}
    </PromoRow>
  )
}

function ViewerOpen(): ReactElement {
  const [open, setOpen] = useState(true)
  return (
    <Viewer
      open={open}
      onOpenChange={setOpen}
      origin={null}
      aspect={{ width: 16, height: 9 }}
      title={t("sample.viewer.title")}
      closeLabel={t("sample.close")}
      aside={
        <div className="flex h-full flex-col gap-4">
          <p className="text-body">{t("sample.model")}</p>
          <span className="flex-1" />
          <Button tone="accent" width="full" className="rounded-cell">
            {t("sample.recreate")}
          </Button>
          <Button width="full" className="rounded-cell">
            {t("sample.viewer.download")}
          </Button>
        </div>
      }
    >
      <video
        src={demoVideo}
        poster={demoWide}
        muted
        loop
        playsInline
        className="size-full"
      />
    </Viewer>
  )
}

export const referenceMediaEntries: GalleryEntry[] = [
  {
    id: "ref-image-card",
    unit: "image-card",
    title: "ref.imageCard",
    states: interactionStates(() => (
      <div className="w-57">
        <Result index={0} />
      </div>
    )),
  },
  {
    id: "ref-video-tile",
    unit: "video-tile",
    title: "ref.videoTile",
    states: interactionStates(() => (
      <div className="w-82.5">
        <Result index={1} form="library" />
      </div>
    )),
  },
  {
    id: "ref-effect-tile",
    unit: "effect-tile",
    title: "ref.effectTile",
    states: interactionStates(() => <Presets />),
  },
  {
    id: "ref-app-tile",
    unit: "app-tile",
    title: "ref.appTile",
    states: interactionStates(() => <Apps />),
  },
  {
    id: "ref-promo-card",
    unit: "promo-card",
    title: "ref.promoCard",
    states: interactionStates(() => <Promos />),
  },
  {
    id: "ref-gallery-grid",
    unit: "gallery-grid",
    title: "ref.galleryGrid",
    states: interactionStates(() => <Feed layout="masonry" />),
  },
  {
    id: "ref-media-row",
    unit: "media-row",
    title: "ref.mediaRow",
    states: interactionStates(() => <Feed layout="row" />),
  },
  {
    id: "ref-media-viewer",
    unit: "media-viewer",
    title: "ref.mediaViewer",
    states: [frameState("open", "state.open", () => <ViewerOpen />)],
  },
]
