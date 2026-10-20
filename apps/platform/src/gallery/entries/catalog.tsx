import type { CatalogModel, ModelField } from "@rosesfield/catalog/comfy"
import { Button } from "@rosesfield/ui/components/button"
import { CreditPrice } from "@rosesfield/ui/components/credit-price"
import { MediaGrid } from "@rosesfield/ui/components/media-grid"
import { MediaTile } from "@rosesfield/ui/components/media-tile"
import { PromptBar } from "@rosesfield/ui/components/prompt-bar"
import type { ReactElement, ReactNode } from "react"
import { GatewayRefusedError } from "@/api/gateway-refused.error"
import { type GalleryKey, t } from "@/gallery/copy.en"
import demoSquare from "@/gallery/fixtures/demo-image-1-1.png"
import demoTall from "@/gallery/fixtures/demo-image-9-16.png"
import demoWide from "@/gallery/fixtures/demo-image-16-9.png"
import type { GalleryEntry, GalleryState } from "@/gallery/gallery-entry"
import { CatalogPicker } from "@/screens/app/hosted/catalog-picker"
import { HostedFields } from "@/screens/app/hosted/hosted-fields"
import { ModelNotice } from "@/screens/app/hosted/model-notice"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"
import type { AppForm } from "@/screens/app/use-app-form"

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
    form: [],
    ...change,
  }
}

export const galleryModels: CatalogModel[] = [
  hostedModel("open-picture", "comfy-cloud", {
    kind: "graph",
    name: "Open picture",
    tags: [{ kind: "open-weights" }],
    form: null,
  }),
  hostedModel("maker/picture-2", "Maker", {
    name: "Picture 2",
    tags: [{ kind: "hosted" }, { kind: "proven" }],
  }),
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

function OpenPicker({
  hosted,
  settings,
}: {
  hosted: HostedState
  settings?: ReactNode
}): ReactElement {
  return (
    <div className="min-h-[calc(1.6*var(--spacing-dialog))]">
      <CatalogPicker hosted={hosted} settings={settings} defaultOpen />
    </div>
  )
}

const sampleFields: ModelField[] = [
  {
    kind: "choice",
    name: "promptExpansionMode",
    path: "prompt_expansion_mode",
    required: true,
    options: ["balanced", "quality"],
    default: null,
  },
  {
    kind: "number",
    name: "safetyTolerance",
    path: "safety_tolerance",
    required: false,
    min: 0,
    max: 4,
    integer: true,
    default: 2,
  },
  {
    kind: "toggle",
    name: "grounding",
    path: "grounding",
    required: false,
    default: true,
  },
]

const sampleForm: AppForm = {
  values: {
    inputs: { safetyTolerance: 2, grounding: "on" },
    seedMode: "random",
    count: 1,
    aspectRatio: null,
  },
  problems: new Map(),
  setInput: () => undefined,
  setForm: () => undefined,
  fill: () => undefined,
  validate: () => true,
  register: () => undefined,
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
      id: "with-settings",
      label: "state.withSettings",
      placement: "layer",
      render: () => (
        <OpenPicker
          hosted={hostedState()}
          settings={<HostedFields fields={sampleFields} form={sampleForm} />}
        />
      ),
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
            models: galleryModels.filter((one) => one.kind === "graph"),
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
            models: galleryModels.filter((one) => one.kind === "graph"),
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

function refusedState(
  id: string,
  label: GalleryKey,
  code: string
): GalleryState {
  return {
    id,
    label,
    render: () => <ModelNotice error={refused(code)} />,
  }
}

const generateRefused: GalleryEntry = {
  id: "generate-refused",
  title: "entry.generateRefused",
  states: [
    refusedState(
      "workspace",
      "state.keyOutsideWorkspace",
      "ENGINE_KEY_OUTSIDE_WORKSPACE"
    ),
    refusedState("account", "state.notEnabled", "ENGINE_NOT_ENABLED"),
    refusedState("credits", "state.noCredits", "ENGINE_NO_CREDITS"),
  ],
}

export const catalogEntries: GalleryEntry[] = [
  modelPicker,
  generateRefused,
  generatePrice,
  masonry,
]
