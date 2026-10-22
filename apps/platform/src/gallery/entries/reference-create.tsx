import { Canvas, StepCards } from "@rosesfield/ui/components/canvas"
import { Chip } from "@rosesfield/ui/components/chip"
import { CountStepper } from "@rosesfield/ui/components/count-stepper"
import { GenerateButton } from "@rosesfield/ui/components/generate-button"
import { InputPanel, PromptBlock } from "@rosesfield/ui/components/input-panel"
import {
  ModelPicker,
  type ModelPickerSection,
} from "@rosesfield/ui/components/model-picker"
import {
  ModelChip,
  ModelRowTrigger,
} from "@rosesfield/ui/components/model-trigger"
import { PromptBar } from "@rosesfield/ui/components/prompt-bar"
import { Tabs, TabsList, TabsTrigger } from "@rosesfield/ui/components/tabs"
import {
  DropZone,
  ReferenceTile,
  StartFrame,
} from "@rosesfield/ui/components/upload-zone"
import {
  AtSignIcon,
  BookOpenIcon,
  FlaskConicalIcon,
  FolderIcon,
  GemIcon,
  ImageIcon,
  MusicIcon,
  ScanIcon,
  VideoIcon,
  Volume2Icon,
} from "lucide-react"
import type { ReactElement } from "react"
import { catalogApps } from "@/catalog/catalog-apps"
import { tCatalog } from "@/copy/t"
import { t } from "@/gallery/copy.en"
import {
  composerState,
  overPhoto,
  viewStates,
} from "@/gallery/entries/reference-kernel"
import demoSquare from "@/gallery/fixtures/demo-image-1-1.png"
import demoVideo from "@/gallery/fixtures/demo-video-16-9.mp4"
import type { GalleryEntry } from "@/gallery/gallery-entry"
import { frameState, interactionStates } from "@/gallery/reference-frames"
import type { AppForm } from "@/screens/app/use-app-form"
import { tileSizes, ViewCluster } from "@/screens/library/view-cluster"
import { VideoChips } from "@/studio/video/video-chips"
import { MakeSwitch, ModeTabs } from "@/studio/video/video-panel"

const mark = <FlaskConicalIcon aria-hidden="true" />

function SettingChips(): ReactElement {
  return (
    <div className="flex h-8 items-center gap-1">
      <Chip caption={t("sample.setting.aspect")} icon={<ScanIcon />}>
        {t("sample.setting.aspect.auto")}
      </Chip>
      <Chip caption={t("sample.setting.quality")} icon={<GemIcon />}>
        {t("sample.setting.quality.high")}
      </Chip>
      <CountStepper
        value={1}
        max={4}
        onValueChange={() => undefined}
        label={t("sample.count")}
        lessLabel={t("sample.count.less")}
        moreLabel={t("sample.count.more")}
      />
    </div>
  )
}

function Bar(): ReactElement {
  return (
    <PromptBar
      value=""
      onValueChange={() => undefined}
      onSubmit={() => undefined}
      label={t("sample.prompt.label")}
      placeholder={t("sample.prompt.placeholder")}
      submitLabel={t("sample.generate")}
      submitValue={t("sample.price")}
      removeLabel={t("sample.remove")}
      placement="dock"
      leading={
        <ReferenceTile
          referencesLabel={t("sample.references")}
          elementsLabel={t("sample.elements")}
          onReferences={() => undefined}
          onElements={() => undefined}
        />
      }
      chips={
        <>
          <ModelChip name={t("sample.model")} mark={mark} />
          <SettingChips />
        </>
      }
    />
  )
}

const videoApp = catalogApps.find((one) => one.id === "video")

const sampleForm: AppForm = {
  values: { inputs: {}, seedMode: "random", count: 1, aspectRatio: null },
  problems: new Map(),
  setInput: () => undefined,
  setForm: () => undefined,
  fill: () => undefined,
  validate: () => true,
  register: () => undefined,
}

function Column(): ReactElement {
  return (
    <div className="h-195">
      <InputPanel
        label={t("sample.sheet.title")}
        className="h-full"
        tabs={
          <ModeTabs screen={{ tab: "text-image", setTab: () => undefined }} />
        }
        footer={
          <GenerateButton
            form="bar"
            label={t("sample.generate")}
            price={t("sample.price")}
          />
        }
      >
        <StartFrame
          src={demoVideo}
          alt={t("sample.output")}
          title={tCatalog("video.preset.title")}
          line={t("sample.model")}
          changeLabel={tCatalog("video.preset.change")}
          onChange={() => undefined}
        />
        <MakeSwitch onExtend={() => undefined} />
        <DropZone
          title={t("sample.drop.title")}
          line={t("sample.drop.line")}
          kinds={[
            <ImageIcon key="image" />,
            <VideoIcon key="video" />,
            <MusicIcon key="music" />,
          ]}
        />
        <PromptBlock
          label={t("sample.prompt.caption")}
          chips={
            <>
              <Chip icon={<AtSignIcon />}>{t("sample.elements")}</Chip>
              <Chip icon={<Volume2Icon />}>{t("sample.sound")}</Chip>
            </>
          }
        >
          <textarea
            aria-label={t("sample.prompt.caption")}
            placeholder={t("sample.prompt.placeholder")}
            className="min-h-0 flex-1 resize-none bg-transparent text-body text-ink outline-none placeholder:text-ink-muted"
          />
        </PromptBlock>
        <ModelRowTrigger
          caption={t("sample.model.caption")}
          name={t("sample.model")}
          mark={mark}
        />
        {videoApp === undefined ? null : (
          <VideoChips app={videoApp} form={sampleForm} fields={null} />
        )}
      </InputPanel>
    </div>
  )
}

const sections: ModelPickerSection[] = [
  {
    id: "featured",
    label: t("sample.models.featured"),
    rows: [
      {
        id: "sample",
        name: t("sample.model"),
        maker: t("sample.model"),
        tags: [],
        mark,
        badges: [
          { kind: "new", label: t("sample.badge.new") },
          {
            kind: "openWeights",
            label: t("sample.badge.openWeights"),
            href: "https://huggingface.co/",
          },
        ],
      },
    ],
  },
]

function Picker({ open }: { open: boolean }): ReactElement {
  return (
    <div className="flex h-200 items-end">
      <ModelPicker
        trigger={<ModelChip name={t("sample.model")} mark={mark} />}
        title={t("sample.model.caption")}
        searchLabel={t("sample.models.search")}
        searchPlaceholder={t("sample.models.placeholder")}
        emptyLabel={t("sample.models.empty")}
        sections={sections}
        chosen="sample"
        onChoose={() => undefined}
        defaultOpen={open}
      />
    </div>
  )
}

function Generates({ unpriced }: { unpriced: boolean }): ReactElement {
  const price = unpriced ? {} : { price: t("sample.price") }
  return (
    <div className="flex items-end gap-6">
      <GenerateButton form="tile" label={t("sample.generate")} {...price} />
      <div className="w-71.5">
        <GenerateButton form="bar" label={t("sample.generate")} {...price} />
      </div>
    </div>
  )
}

function CanvasDemo({ hasRuns }: { hasRuns: boolean }): ReactElement {
  const steps = [
    ["add", "sample.how.add", "sample.how.add.line"],
    ["preset", "sample.how.preset", "sample.how.preset.line"],
    ["get", "sample.how.get", "sample.how.get.line"],
  ] as const
  return (
    <div className="h-195 w-full max-w-270">
      <Canvas
        label={t("sample.canvas.label")}
        hasRuns={hasRuns}
        className="h-full"
        tabs={
          <Tabs defaultValue="how">
            <TabsList aria-label={t("sample.canvas.label")}>
              <TabsTrigger value="history">
                <FolderIcon aria-hidden="true" />
                {t("sample.tab.history")}
              </TabsTrigger>
              <TabsTrigger value="how">
                <BookOpenIcon aria-hidden="true" />
                {t("sample.tab.how")}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        }
        cluster={
          <ViewCluster
            layout="list"
            onLayout={() => undefined}
            size={tileSizes.initial}
            onSize={() => undefined}
            groups={[]}
          />
        }
      >
        <div className="@regular:px-4">
          <StepCards
            title={t("sample.how.title")}
            line={t("sample.how.line")}
            steps={steps.map(([id, title, line], index) => ({
              id,
              title: t(title),
              line: t(line),
              media:
                index === 0 ? (
                  <img alt="" src={demoSquare} />
                ) : (
                  <video src={demoVideo} muted loop playsInline autoPlay />
                ),
            }))}
          />
        </div>
      </Canvas>
    </div>
  )
}

export const referenceCreateEntries: GalleryEntry[] = [
  {
    id: "ref-prompt-bar",
    unit: "prompt-bar",
    title: "ref.promptBar",
    states: [...interactionStates(() => <Bar />), composerState],
  },
  {
    id: "ref-input-panel",
    unit: "input-panel",
    title: "ref.inputPanel",
    states: interactionStates(() => <Column />),
  },
  {
    id: "ref-model-picker",
    unit: "model-picker",
    title: "ref.modelPicker",
    states: [
      ...interactionStates(() => <Picker open={false} />),
      frameState("open", "state.open", () => <Picker open />),
      frameState("over-photo", "state.overMedia", () =>
        overPhoto(<Picker open />)
      ),
    ],
  },
  {
    id: "ref-setting-chips",
    unit: "setting-chips",
    title: "ref.settingChips",
    states: interactionStates(() => <SettingChips />),
  },
  {
    id: "ref-generate-button",
    unit: "generate-button",
    title: "ref.generate",
    states: [
      ...interactionStates(() => <Generates unpriced={false} />),
      frameState("unpriced", "state.unpriced", () => <Generates unpriced />),
    ],
  },
  {
    id: "ref-upload-zone",
    unit: "upload-zone",
    title: "ref.uploadZone",
    states: interactionStates(() => (
      <div className="flex w-75.5 flex-col gap-4">
        <StartFrame
          src={demoVideo}
          alt={t("sample.output")}
          title={t("sample.preset.dolly")}
          line={t("sample.model")}
          changeLabel={t("sample.change")}
          onChange={() => undefined}
        />
        <ReferenceTile
          referencesLabel={t("sample.references")}
          elementsLabel={t("sample.elements")}
          onReferences={() => undefined}
          onElements={() => undefined}
        />
        <DropZone
          title={t("sample.drop.title")}
          line={t("sample.drop.line")}
          kinds={[
            <ImageIcon key="image" />,
            <VideoIcon key="video" />,
            <MusicIcon key="music" />,
          ]}
        />
      </div>
    )),
  },
  {
    id: "ref-canvas-and-history",
    unit: "canvas-and-history",
    title: "ref.canvas",
    states: [
      frameState("rest", "state.rest", () => <CanvasDemo hasRuns={false} />),
      frameState("runs", "state.withRuns", () => <CanvasDemo hasRuns />),
      ...viewStates,
    ],
  },
]
