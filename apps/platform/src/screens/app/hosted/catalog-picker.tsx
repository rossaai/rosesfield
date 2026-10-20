import type { CatalogModel, ModelTag } from "@rosesfield/catalog/comfy"
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
  return model.kind === "graph" ? t("model.maker.graphs") : model.maker
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
  all: "model.picker.all",
} as const

export function badgesOf(tags: readonly ModelTag[]): ModelBadge[] {
  return tags.some((tag) => tag.kind === "open-weights")
    ? [{ kind: "openWeights", label: t("model.tag.openWeights") }]
    : []
}

export function pickerSections(hosted: HostedState): ModelPickerSection[] {
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
      line: lineOf(row.task),
      tags: row.tags
        .filter((tag) => tag.kind !== "open-weights")
        .map(tagOf),
      mark: <LabMark maker={row.maker} />,
      badges: badgesOf(row.tags),
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
    chosen === null ? undefined : <LabMark maker={makerNameOf(chosen)} />
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
