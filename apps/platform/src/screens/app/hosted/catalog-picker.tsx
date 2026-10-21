import {
  type CatalogModel,
  type FactBadge,
  factBadgesOf,
  graphMaker,
  type ModelFacts,
  type ModelTag,
} from "@rosesfield/catalog/comfy"
import {
  type ModelBadge,
  ModelPicker,
  type ModelPickerSection,
  type ModelPickerTag,
} from "@rosesfield/ui/components/model-picker"
import {
  ModelChip,
  ModelRowTrigger,
} from "@rosesfield/ui/components/model-trigger"
import {
  CircleCheckIcon,
  ClockIcon,
  LockOpenIcon,
  ScanIcon,
  Volume2Icon,
} from "lucide-react"
import type { ReactElement, ReactNode } from "react"
import { hasCatalogText, t, tCatalog } from "@/copy/t"
import { LabMark } from "@/pieces/lab-mark"
import { ModelNotice } from "@/screens/app/hosted/model-notice"
import { modelSections } from "@/screens/app/hosted/model-sections"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"
import { openModels } from "@/screens/welcome/open-weights"

const lineKeys: Readonly<Record<string, string>> = {
  "text-to-image": "model.line.textToImage",
  "image-edit": "model.line.imageEdit",
  "text-to-video": "model.line.textToVideo",
  "image-to-video": "model.line.imageToVideo",
  "reference-to-video": "model.line.referenceToVideo",
  "first-last-frame": "model.line.firstLastFrame",
  "video-edit": "model.line.videoEdit",
  "lip-sync": "model.line.lipSync",
  speech: "model.line.speech",
  "voice-change": "model.line.voiceChange",
  music: "model.line.music",
  sound: "model.line.sound",
  "three-d": "model.line.threeD",
  upscale: "model.line.upscale",
  background: "model.line.background",
  relight: "model.line.relight",
  "try-on": "model.line.tryOn",
  expand: "model.line.expand",
  chat: "model.line.chat",
}

export function makerNameOf(model: CatalogModel): string {
  return model.maker === graphMaker ? t("model.maker.graphs") : model.maker
}

export function labOf(model: {
  maker: string
  facts?: ModelFacts | undefined
}): string {
  return model.facts?.lab ?? model.maker
}

export function modelNameOf(model: CatalogModel): string {
  return model.nameKey !== null && hasCatalogText(model.nameKey)
    ? tCatalog(model.nameKey)
    : model.name
}

export function lineOf(task: string): string | null {
  const key = lineKeys[task]
  return key === undefined ? null : tCatalog(key)
}

export function modelLineOf(
  task: string,
  facts: ModelFacts | undefined
): string | null {
  const key = facts?.lineKey ?? null
  return key !== null && hasCatalogText(key) ? tCatalog(key) : lineOf(task)
}

export function tagOf(tag: ModelTag): ModelPickerTag {
  switch (tag.kind) {
    case "resolution":
      return { label: tag.value, icon: <ScanIcon aria-hidden="true" /> }
    case "length":
      return {
        label: t("model.tag.length", { min: tag.min, max: tag.max }),
        icon: <ClockIcon aria-hidden="true" />,
      }
    case "sound":
      return {
        label: t("model.tag.sound"),
        icon: <Volume2Icon aria-hidden="true" />,
      }
    case "open-weights":
      return {
        label: t("model.tag.openWeights"),
        icon: <LockOpenIcon aria-hidden="true" />,
      }
    case "hosted":
      return { label: t("model.tag.hosted") }
    case "references":
      return { label: t("model.tag.references", { max: tag.max }) }
    case "proven":
      return {
        label: t("model.tag.proven"),
        icon: <CircleCheckIcon aria-hidden="true" />,
      }
  }
}

const sectionLabels = {
  featured: "model.picker.featured",
  open: "model.tag.openWeights",
  all: "model.picker.all",
} as const

const factBadgeKeys = {
  new: "model.badge.new",
  top: "model.badge.top",
  premium: "model.badge.premium",
} as const

type FactBadgeKind = keyof typeof factBadgeKeys

export function todayOf(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10)
}

const huggingFace = "https://huggingface.co/"
const repoPattern = /^[\w.-]+\/[\w.-]+$/

export function weightsLinkOf(id: string): string | null {
  const model = openModels.find((one) => one.id === id)
  if (model === undefined) {
    return null
  }
  if (model.link.startsWith(huggingFace)) {
    return model.link
  }
  const repo = model.files.find(
    (file) => repoPattern.test(file) && !file.endsWith(".safetensors")
  )
  return repo === undefined ? null : `${huggingFace}${repo}`
}

function factBadgeOf(badge: FactBadge): ModelBadge[] {
  if (badge.kind === "open-weights") {
    return []
  }
  const kind: FactBadgeKind = badge.kind
  const key = factBadgeKeys[kind]
  return hasCatalogText(key) ? [{ kind, label: tCatalog(key) }] : []
}

function weightsBadgeOf(
  id: string,
  tags: readonly ModelTag[],
  facts: ModelFacts | undefined
): ModelBadge[] {
  if (!tags.some((tag) => tag.kind === "open-weights")) {
    return []
  }
  const href = facts?.weights ?? weightsLinkOf(id)
  return [
    {
      kind: "openWeights",
      label: t("model.tag.openWeights"),
      ...(href === null ? {} : { href }),
    },
  ]
}

export function badgesOf(
  id: string,
  tags: readonly ModelTag[],
  facts?: ModelFacts,
  today: string = todayOf()
): ModelBadge[] {
  return [
    ...factBadgesOf(facts, today).flatMap(factBadgeOf),
    ...weightsBadgeOf(id, tags, facts),
  ]
}

export function pickerSections(
  hosted: HostedState,
  today: string = todayOf()
): ModelPickerSection[] {
  const first = [
    ...(hosted.defaultModel === null ? [] : [hosted.defaultModel]),
    ...hosted.ranBefore,
  ]
  const models = hosted.models.map((model) => ({
    ...model,
    maker: makerNameOf(model),
  }))
  return modelSections(models, first, modelNameOf).map((section) => ({
    id: section.id,
    label: t(sectionLabels[section.id]),
    rows: section.rows.map((row) => ({
      id: row.id,
      name: row.name,
      maker: row.maker,
      line: modelLineOf(row.task, row.facts),
      tags: row.tags.filter((tag) => tag.kind !== "open-weights").map(tagOf),
      mark: <LabMark maker={labOf(row)} />,
      badges: badgesOf(row.id, row.tags, row.facts, today),
    })),
  }))
}

type CatalogPickerProps = {
  hosted: HostedState
  defaultOpen?: boolean
  settings?: ReactNode
  place?: "chip" | "row"
}

export function pickerTrigger(
  hosted: HostedState,
  place: "chip" | "row"
): ReactElement {
  const chosen = hosted.chosen
  const name = chosen === null ? t("model.picker.title") : modelNameOf(chosen)
  const mark =
    chosen === null ? undefined : (
      <LabMark maker={chosen.facts?.lab ?? makerNameOf(chosen)} />
    )
  const markProp = mark === undefined ? {} : { mark }
  return place === "row" ? (
    <ModelRowTrigger
      caption={t("model.picker.title")}
      name={name}
      aria-label={`${t("model.picker.title")} ${name}`}
      {...markProp}
    />
  ) : (
    <ModelChip
      name={name}
      aria-label={`${t("model.picker.title")} ${name}`}
      {...markProp}
    />
  )
}

export function CatalogPicker({
  hosted,
  defaultOpen = false,
  settings,
  place = "chip",
}: CatalogPickerProps): ReactElement {
  return (
    <ModelPicker
      trigger={pickerTrigger(hosted, place)}
      title={t("model.picker.title")}
      searchLabel={t("model.picker.search")}
      searchPlaceholder={t("model.picker.searchPlaceholder")}
      emptyLabel={t("model.picker.empty")}
      sections={pickerSections(hosted)}
      chosen={hosted.chosen?.id ?? null}
      onChoose={hosted.choose}
      defaultOpen={defaultOpen}
      settings={settings}
      side={place === "row" ? "right" : "top"}
      isLoading={hosted.isLoading}
      notice={
        hosted.error === null ? null : <ModelNotice error={hosted.error} />
      }
    />
  )
}
