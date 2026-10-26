import type { AppListing } from "@rosesfield/contract"
import { IconButton } from "@rosesfield/ui/components/button"
import { Chip } from "@rosesfield/ui/components/chip"
import { ChipSelect } from "@rosesfield/ui/components/chip-select"
import {
  type PromptAttachment,
  PromptBar,
} from "@rosesfield/ui/components/prompt-bar"
import { AtSignIcon, PaperclipIcon } from "lucide-react"
import { type ReactElement, type ReactNode, useState } from "react"
import { isAssetInput } from "@/catalog/app-facts"
import { catalogApps } from "@/catalog/catalog-apps"
import { withChoiceIcons } from "@/catalog/setting-registry"
import { withUnit } from "@/copy/format"
import { tCatalog, tCount, t as tPlatform } from "@/copy/t"
import { type GalleryKey, t } from "@/gallery/copy.en"
import demoSquare from "@/gallery/fixtures/demo-image-1-1.png"
import demoWide from "@/gallery/fixtures/demo-image-16-9.png"
import type { GalleryEntry } from "@/gallery/gallery-entry"
import { inputSlotsOf } from "@/screens/app/bar/input-slots"
import { chipIconOf, inputIconOf } from "@/screens/app/bar/setting-chip"
import { inputCaption, inputUnit } from "@/screens/app/fields/input-copy"
import { aspectItems } from "@/screens/app/fields/output-fields"

const formats = withChoiceIcons("aspect", "aspect", [
  { value: "1:1", label: "1:1" },
  { value: "4:3", label: "4:3" },
  { value: "3:4", label: "3:4" },
  { value: "16:9", label: "16:9" },
  { value: "9:16", label: "9:16" },
])

const counts = withChoiceIcons("count", "count", [
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
])

const sampleAttachments: PromptAttachment[] = [
  {
    id: "first",
    src: demoSquare,
    alt: t("sample.attachment"),
    caption: t("sample.attachment.caption"),
  },
  {
    id: "second",
    src: demoWide,
    alt: t("sample.attachment"),
    caption: t("sample.attachment.caption"),
  },
]

const sampleThumb: PromptAttachment = {
  id: "sample",
  src: demoSquare,
  alt: t("sample.attachment"),
}

function Chips(): ReactElement {
  const [format, setFormat] = useState("16:9")
  const [count, setCount] = useState("4")
  return (
    <>
      <ChipSelect
        label={t("sample.format")}
        icon={chipIconOf("aspect")}
        value={format}
        onValueChange={setFormat}
        options={formats}
      />
      <ChipSelect
        label={t("sample.count")}
        icon={chipIconOf("count")}
        value={count}
        onValueChange={setCount}
        options={counts}
      />
    </>
  )
}

function Leading(): ReactElement {
  return (
    <>
      <IconButton label={t("sample.attach")} size="dense">
        <PaperclipIcon aria-hidden="true" />
      </IconButton>
      <IconButton label={t("sample.mention")} size="dense">
        <AtSignIcon aria-hidden="true" />
      </IconButton>
    </>
  )
}

type PromptDemoProps = {
  value?: string
  withAttachments?: boolean
  busy?: boolean
}

function PromptDemo({
  value = "",
  withAttachments = false,
  busy = false,
}: PromptDemoProps): ReactElement {
  const [text, setText] = useState(value)
  const [attachments, setAttachments] = useState(
    withAttachments ? sampleAttachments : []
  )
  return (
    <PromptBar
      value={text}
      onValueChange={setText}
      onSubmit={() => setText("")}
      label={t("sample.prompt.caption")}
      placeholder={t("sample.prompt.placeholder")}
      submitLabel={t("sample.generate")}
      removeLabel={t("sample.remove")}
      attachments={attachments}
      onRemoveAttachment={(id) =>
        setAttachments((items) => items.filter((item) => item.id !== id))
      }
      leading={<Leading />}
      chips={<Chips />}
      busy={busy}
    />
  )
}

type ChipSpec =
  | { kind: "model" | "aspect" | "count" }
  | { kind: "input"; name: string }

const barChips: ReadonlyArray<{
  appId: string
  label: GalleryKey
  chips: readonly ChipSpec[]
}> = [
  {
    appId: "image",
    label: "state.longestImage",
    chips: [{ kind: "model" }, { kind: "aspect" }, { kind: "count" }],
  },
  {
    appId: "video",
    label: "state.longestVideo",
    chips: [
      { kind: "model" },
      { kind: "aspect" },
      { kind: "input", name: "length" },
      { kind: "input", name: "cameraMove" },
    ],
  },
  {
    appId: "ads",
    label: "state.longestAds",
    chips: [{ kind: "model" }, { kind: "aspect" }, { kind: "count" }],
  },
]

function longest(labels: readonly string[]): string {
  return labels.reduce(
    (found, label) => (label.length > found.length ? label : found),
    ""
  )
}

function inputChip(
  app: AppListing,
  name: string
): { caption: string; text: string } | null {
  const input = app.inputs.find((one) => one.name === name)
  if (input?.type === "choice") {
    return {
      caption: inputCaption(input),
      text: longest(input.options.map((one) => tCatalog(one.labelKey))),
    }
  }
  if (input?.type === "number") {
    return {
      caption: inputCaption(input),
      text: withUnit(input.max, inputUnit(app, input)),
    }
  }
  return null
}

function chipOf(
  app: AppListing,
  spec: ChipSpec
): { caption: string; text: string; icon?: ReactNode } | null {
  switch (spec.kind) {
    case "model":
      return inputChip(app, "model")
    case "aspect":
      return {
        caption: tPlatform("field.aspect.label"),
        text: longest(aspectItems(app).map((item) => item.label)),
        icon: chipIconOf("aspect"),
      }
    case "count":
      return {
        caption: tPlatform("field.count.label"),
        text: tCount(
          app.output.kind === "video" ? "bar.count.video" : "bar.count.image",
          app.output.count.max
        ),
        icon: chipIconOf("count"),
      }
    case "input": {
      const chip = inputChip(app, spec.name)
      const input = app.inputs.find((one) => one.name === spec.name)
      return chip === null || input === undefined
        ? chip
        : { ...chip, icon: inputIconOf(app, input) }
    }
  }
}

function LongestChipsBar({
  appId,
  chips,
}: {
  appId: string
  chips: readonly ChipSpec[]
}): ReactElement | null {
  const [text, setText] = useState("")
  const app = catalogApps.find((one) => one.id === appId)
  if (app === undefined) {
    return null
  }
  const first = app.inputs.find(isAssetInput)
  const slots =
    first === undefined
      ? undefined
      : inputSlotsOf(
          app,
          { [first.name]: [sampleThumb.id] },
          [sampleThumb],
          () => undefined
        )
  return (
    <PromptBar
      value={text}
      onValueChange={setText}
      onSubmit={() => setText("")}
      label={t("sample.prompt.caption")}
      placeholder={t("sample.prompt.placeholder")}
      submitLabel={t("sample.generate")}
      removeLabel={t("sample.remove")}
      slots={slots}
      leading={<Leading />}
      chips={chips.map((spec, index) => {
        const chip = chipOf(app, spec)
        return chip === null ? null : (
          // biome-ignore lint/suspicious/noArrayIndexKey: the specs are a fixed list
          <Chip key={index} caption={chip.caption} icon={chip.icon}>
            {chip.text}
          </Chip>
        )
      })}
    />
  )
}

const promptBar: GalleryEntry = {
  id: "prompt-bar",
  title: "entry.promptBar",
  states: [
    { id: "empty", label: "state.empty", render: () => <PromptDemo /> },
    {
      id: "filled",
      label: "state.filled",
      render: () => <PromptDemo value={t("sample.prompt.short")} />,
    },
    {
      id: "attachments",
      label: "state.attachments",
      render: () => (
        <PromptDemo value={t("sample.prompt.short")} withAttachments />
      ),
    },
    {
      id: "six-lines",
      label: "state.sixLines",
      render: () => <PromptDemo value={t("sample.prompt.long")} />,
    },
    {
      id: "busy",
      label: "state.busy",
      render: () => <PromptDemo value={t("sample.prompt.short")} busy />,
    },
    ...barChips.map((bar) => ({
      id: `longest-${bar.appId}`,
      label: bar.label,
      width: "full" as const,
      render: () => <LongestChipsBar appId={bar.appId} chips={bar.chips} />,
    })),
  ],
}

const chipSelect: GalleryEntry = {
  id: "chip-select",
  title: "entry.chipSelect",
  states: [
    {
      id: "closed",
      label: "state.closed",
      render: () => (
        <div
          data-ground="surface"
          className="flex gap-s2 rounded-vessel bg-surface p-s3"
        >
          <Chips />
        </div>
      ),
    },
    {
      id: "not-set",
      label: "state.notSet",
      render: () => (
        <div
          data-ground="surface"
          className="flex gap-s2 rounded-vessel bg-surface p-s3"
        >
          <ChipSelect
            label={t("sample.resolution")}
            icon={chipIconOf("resolution")}
            value=""
            display={tPlatform("bar.notSet", { field: t("sample.resolution") })}
            onValueChange={() => undefined}
            options={formats}
          />
        </div>
      ),
    },
  ],
}

export const pieceEntries: GalleryEntry[] = [promptBar, chipSelect]
