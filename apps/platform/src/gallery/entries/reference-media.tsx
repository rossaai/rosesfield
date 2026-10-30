import { run } from "@rosesfield/contract"
import { AppTile, AppTileGrid } from "@rosesfield/ui/components/app-tile"
import { Badge } from "@rosesfield/ui/components/badge"
import { Button, IconButton } from "@rosesfield/ui/components/button"
import { MediaFeed, ViewAll } from "@rosesfield/ui/components/media-feed"
import { PresetGrid, PresetTile } from "@rosesfield/ui/components/preset-tile"
import {
  PromoCard,
  PromoRow,
  PromoSkeleton,
} from "@rosesfield/ui/components/promo-card"
import { ResultTile } from "@rosesfield/ui/components/result-tile"
import { SectionHeader } from "@rosesfield/ui/components/section-header"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ImageIcon, VideoIcon, Volume2Icon } from "lucide-react"
import { type ReactElement, useState } from "react"
import { t as tLive } from "@/copy/t"
import { t } from "@/gallery/copy.en"
import { skeletonState } from "@/gallery/entries/reference-kernel"
import demoSquare from "@/gallery/fixtures/demo-image-1-1.png"
import demoTall from "@/gallery/fixtures/demo-image-9-16.png"
import demoWide from "@/gallery/fixtures/demo-image-16-9.png"
import demoVideo from "@/gallery/fixtures/demo-video-16-9.mp4"
import type { GalleryEntry } from "@/gallery/gallery-entry"
import { frameState, interactionStates } from "@/gallery/reference-frames"
import {
  screenAssets,
  screenRuns,
  seeds,
} from "@/gallery/screens/screen-fixtures"
import type { VisualEntry } from "@/screens/explore/explore-tile"
import { ResultViewer } from "@/viewer/result-viewer"

const shapes = [
  { src: demoTall, aspect: { width: 9, height: 16 } },
  { src: demoWide, aspect: { width: 16, height: 9 } },
  { src: demoSquare, aspect: { width: 1, height: 1 } },
] as const

function shapeOf(index: number): (typeof shapes)[number] {
  return shapes[index % shapes.length] ?? shapes[0]
}

function Result({
  index,
  aspect,
  form = "card",
}: {
  index: number
  aspect: { readonly width: number; readonly height: number }
  form?: "card" | "library"
}): ReactElement {
  return (
    <ResultTile
      kind="image"
      src={shapeOf(index).src}
      alt={t("sample.output")}
      aspect={aspect}
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
      {...(form === "library"
        ? {
            sound: (
              <IconButton label={t("sample.sound")} size="dense" tone="glass">
                <Volume2Icon aria-hidden="true" />
              </IconButton>
            ),
          }
        : {})}
    />
  )
}

const twelve = Array.from({ length: 12 }, (_, index) => index)

function HeaderActions(): ReactElement {
  return (
    <>
      <Button tone="primary">{t("sample.start")}</Button>
      <Button>{t("sample.learnMore")}</Button>
    </>
  )
}

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
          {...(layout === "masonry" ? { actions: <HeaderActions /> } : {})}
        />
      }
      viewAll={
        <ViewAll href="?entry=ref-gallery-grid">
          {tLive("explore.viewAll", {
            name:
              layout === "row" ? t("sample.model") : t("sample.section.title"),
          })}
        </ViewAll>
      }
    >
      {twelve.map((index) => (
        <Result key={index} index={index} aspect={shapeOf(index).aspect} />
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
          action={{ label: t("sample.recreate"), href: "?apps=video" }}
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
              {...(id === "video"
                ? {
                    mode: {
                      label: t("sample.kind.video"),
                      icon: <VideoIcon />,
                    },
                  }
                : {})}
            />
          )
        )}
      </AppTileGrid>
    </div>
  )
}

function Promos({ isLoading = false }: { isLoading?: boolean }): ReactElement {
  return (
    <PromoRow
      label={t("sample.promo.title")}
      nextLabel={t("sample.viewer.next")}
      className="-mx-4"
    >
      {isLoading
        ? [0, 1, 2, 3].map((index) => <PromoSkeleton key={index} />)
        : null}
      {(isLoading ? [] : [0, 1, 2, 3]).map((index) => (
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

const viewerEntry: VisualEntry = {
  key: "gallery-viewer",
  run: run.parse({
    ...screenRuns.video,
    appId: "motion",
    origin: "live",
    inputs: {
      photo: [screenAssets.upload.id],
      clip: [screenAssets.clip.id],
      scene: "A paper boat drifts on a pond",
    },
    engine: {
      adapter: "comfy-workflow",
      models: ["ltx-2.5-22b-distilled-transformer-bf16.safetensors"],
      workflowHash: null,
    },
    cost: { amount: 0.021, currency: "USD" },
  }),
  kind: "video",
  aspect: { width: 16, height: 9 },
  source: { kind: "share", shareId: "gallery-viewer", src: demoVideo },
}

function ViewerOpen(): ReactElement {
  const [client] = useState(() => {
    const seeded = new QueryClient({
      defaultOptions: { queries: { enabled: false } },
    })
    seeds.media()(seeded)
    return seeded
  })
  const [open, setOpen] = useState(true)
  return (
    <QueryClientProvider client={client}>
      <ResultViewer
        shown={{ entry: viewerEntry, origin: null }}
        open={open}
        list={[viewerEntry]}
        onClose={() => setOpen(false)}
        onStep={() => undefined}
        onRecreate={() => undefined}
      />
    </QueryClientProvider>
  )
}

export const referenceMediaEntries: GalleryEntry[] = [
  {
    id: "ref-image-card",
    unit: "image-card",
    title: "ref.imageCard",
    states: interactionStates(() => (
      <div className="w-57">
        <Result index={0} aspect={shapeOf(0).aspect} />
      </div>
    )),
  },
  {
    id: "ref-video-tile",
    unit: "video-tile",
    title: "ref.videoTile",
    states: interactionStates(() => (
      <div className="w-82.5">
        <Result index={1} aspect={shapeOf(1).aspect} form="library" />
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
    states: [
      ...interactionStates(() => <Promos />),
      frameState("loading", "state.loading", () => <Promos isLoading />),
    ],
  },
  {
    id: "ref-gallery-grid",
    unit: "gallery-grid",
    title: "ref.galleryGrid",
    states: [
      ...interactionStates(() => <Feed layout="masonry" />),
      skeletonState,
    ],
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
