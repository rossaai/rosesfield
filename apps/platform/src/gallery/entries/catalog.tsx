import type { CatalogModel } from "@rosesfield/catalog/comfy"
import { Badge } from "@rosesfield/ui/components/badge"
import { Button } from "@rosesfield/ui/components/button"
import { CreditPrice } from "@rosesfield/ui/components/credit-price"
import { MediaGrid } from "@rosesfield/ui/components/media-grid"
import { MediaTile } from "@rosesfield/ui/components/media-tile"
import { PromptBar } from "@rosesfield/ui/components/prompt-bar"
import { ClockIcon, LockOpenIcon, ScanIcon, Volume2Icon } from "lucide-react"
import type { ReactElement } from "react"
import { GatewayRefusedError } from "@/api/gateway-refused.error"
import { t } from "@/gallery/copy.en"
import demoSquare from "@/gallery/fixtures/demo-image-1-1.png"
import demoTall from "@/gallery/fixtures/demo-image-9-16.png"
import demoWide from "@/gallery/fixtures/demo-image-16-9.png"
import type { GalleryEntry } from "@/gallery/gallery-entry"
import { CatalogPicker } from "@/screens/app/hosted/catalog-picker"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"

function hostedModel(
  id: string,
  maker: string,
  change: Partial<CatalogModel> = {}
): CatalogModel {
  return {
    id,
    kind: "hosted",
    maker,
    name: id.split("/")[1] ?? id,
    nameKey: null,
    task: "text-to-image",
    tags: [{ kind: "hosted" }],
    proven: false,
    form: [],
    ...change,
  }
}

export const galleryModels: CatalogModel[] = [
  hostedModel("open-picture", "Comfy Cloud", {
    kind: "graph",
    name: "Open picture",
    tags: [{ kind: "open-weights" }],
    form: null,
  }),
  hostedModel("maker/picture-2", "Maker", { name: "Picture 2" }),
  hostedModel("maker/picture-2-fast", "Maker", { name: "Picture 2 Fast" }),
  hostedModel("studio/clip-3", "Studio", {
    name: "Clip 3",
    task: "text-to-video",
    tags: [
      { kind: "hosted" },
      { kind: "resolution", value: "1080p" },
      { kind: "length", min: 5, max: 10 },
      { kind: "sound" },
    ],
  }),
  hostedModel("studio/sketch-1", "Studio", { name: "Sketch 1" }),
]

function hostedState(change: Partial<HostedState> = {}): HostedState {
  return {
    isTaskApp: true,
    models: galleryModels,
    isLoading: false,
    error: null,
    keyState: "set",
    defaultModel: "maker/picture-2",
    chosen: galleryModels[1] ?? null,
    fields: [],
    ranBefore: ["studio/clip-3"],
    choose: () => undefined,
    ...change,
  }
}

function refused(code: string): GatewayRefusedError {
  return new GatewayRefusedError({ code, status: 412, retryAfterSeconds: null })
}

function OpenPicker({ hosted }: { hosted: HostedState }): ReactElement {
  return (
    <div className="min-h-[calc(1.6*var(--spacing-dialog))]">
      <CatalogPickerOpen hosted={hosted} />
    </div>
  )
}

function CatalogPickerOpen({ hosted }: { hosted: HostedState }): ReactElement {
  return <CatalogPicker hosted={hosted} defaultOpen />
}

const modelPicker: GalleryEntry = {
  id: "model-picker",
  title: "entry.modelPicker",
  states: [
    {
      id: "closed",
      label: "state.closed",
      render: () => <CatalogPicker hosted={hostedState()} />,
    },
    {
      id: "open",
      label: "state.open",
      placement: "layer",
      render: () => <OpenPicker hosted={hostedState()} />,
    },
    {
      id: "loading",
      label: "state.loading",
      placement: "layer",
      render: () => (
        <OpenPicker hosted={hostedState({ isLoading: true, models: [] })} />
      ),
    },
    {
      id: "workspace",
      label: "state.keyOutsideWorkspace",
      placement: "layer",
      render: () => (
        <OpenPicker
          hosted={hostedState({
            models: [],
            error: refused("ENGINE_KEY_OUTSIDE_WORKSPACE"),
          })}
        />
      ),
    },
    {
      id: "account",
      label: "state.notEnabled",
      placement: "layer",
      render: () => (
        <OpenPicker
          hosted={hostedState({
            models: [],
            error: refused("ENGINE_NOT_ENABLED"),
          })}
        />
      ),
    },
  ],
}

const generatePrice: GalleryEntry = {
  id: "generate-price",
  title: "entry.generatePrice",
  states: [
    {
      id: "priced",
      label: "state.priced",
      render: () => (
        <div className="flex flex-col gap-s4">
          <PromptBar
            value={t("sample.prompt.short")}
            onValueChange={() => undefined}
            onSubmit={() => undefined}
            label={t("sample.prompt.label")}
            placeholder=""
            submitLabel={t("sample.generate")}
            submitValue={<CreditPrice amount="14.48" />}
            submitName={t("sample.generatePriced")}
            removeLabel={t("sample.remove")}
          />
          <Button tone="primary" aria-label={t("sample.generatePriced")}>
            {t("sample.generate")}
            <CreditPrice amount="14.48" />
          </Button>
        </div>
      ),
    },
    {
      id: "unknown",
      label: "state.priceUnknown",
      render: () => (
        <PromptBar
          value={t("sample.prompt.short")}
          onValueChange={() => undefined}
          onSubmit={() => undefined}
          label={t("sample.prompt.label")}
          placeholder=""
          submitLabel={t("sample.generate")}
          price={t("sample.priceUnknown")}
          removeLabel={t("sample.remove")}
        />
      ),
    },
  ],
}

const factualTags: GalleryEntry = {
  id: "factual-tags",
  title: "entry.factualTags",
  states: [
    {
      id: "tags",
      label: "state.tones",
      render: () => (
        <div className="flex flex-wrap gap-s1 [&_svg]:glyph-small">
          <Badge tone="neutral">
            <ScanIcon aria-hidden="true" />
            1080p
          </Badge>
          <Badge tone="neutral">
            <ClockIcon aria-hidden="true" />
            {t("sample.tagLength")}
          </Badge>
          <Badge tone="neutral">
            <Volume2Icon aria-hidden="true" />
            {t("sample.tagSound")}
          </Badge>
          <Badge tone="neutral">
            <LockOpenIcon aria-hidden="true" />
            {t("sample.tagOpenWeights")}
          </Badge>
        </div>
      ),
    },
  ],
}

const masonry: GalleryEntry = {
  id: "masonry-grid",
  title: "entry.masonryGrid",
  states: [
    {
      id: "ratios",
      label: "state.ratios",
      width: "full",
      render: () => (
        <MediaGrid layout="masonry">
          <MediaTile
            kind="image"
            src={demoTall}
            alt={t("sample.output")}
            aspect={{ width: 9, height: 16 }}
          />
          <MediaTile
            kind="image"
            src={demoWide}
            alt={t("sample.output")}
            aspect={{ width: 16, height: 9 }}
          />
          <MediaTile
            kind="image"
            src={demoSquare}
            alt={t("sample.output")}
            aspect={{ width: 1, height: 1 }}
          />
          <MediaTile
            kind="image"
            src={demoWide}
            alt={t("sample.output")}
            aspect={{ width: 16, height: 9 }}
          />
          <MediaTile
            kind="image"
            src={demoTall}
            alt={t("sample.output")}
            aspect={{ width: 9, height: 16 }}
          />
          <MediaTile
            kind="image"
            src={demoSquare}
            alt={t("sample.output")}
            aspect={{ width: 1, height: 1 }}
          />
        </MediaGrid>
      ),
    },
  ],
}

export const catalogEntries: GalleryEntry[] = [
  modelPicker,
  generatePrice,
  factualTags,
  masonry,
]
