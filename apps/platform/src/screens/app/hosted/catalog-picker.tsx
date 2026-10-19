import type { CatalogModel, ModelTag } from "@rosesfield/catalog/comfy"
import { Chip } from "@rosesfield/ui/components/chip"
import {
  ModelPicker,
  type ModelPickerSection,
  type ModelPickerTag,
} from "@rosesfield/ui/components/model-picker"
import {
  CircleCheckIcon,
  ClockIcon,
  LockOpenIcon,
  ScanIcon,
  Volume2Icon,
} from "lucide-react"
import type { ReactElement, ReactNode } from "react"
import { hasCatalogText, t, tCatalog } from "@/copy/t"
import { ModelNotice } from "@/screens/app/hosted/model-notice"
import { modelSections } from "@/screens/app/hosted/model-sections"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"

const lineKeys: Readonly<Record<string, string>> = {
  "text-to-image": "model.line.textToImage",
  "image-edit": "model.line.imageEdit",
  "text-to-video": "model.line.textToVideo",
  "image-to-video": "model.line.imageToVideo",
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
    label: section.label ?? t("model.picker.first"),
    rows: section.rows.map((row) => ({
      id: row.id,
      name: row.name,
      maker: row.maker,
      line: lineOf(row.task),
      tags: row.tags.map(tagOf),
    })),
  }))
}

export function CatalogPicker({
  hosted,
  defaultOpen = false,
  settings,
}: {
  hosted: HostedState
  defaultOpen?: boolean
  settings?: ReactNode
}): ReactElement {
  const name =
    hosted.chosen === null
      ? t("model.picker.title")
      : modelNameOf(hosted.chosen)
  return (
    <ModelPicker
      trigger={<Chip caption={t("model.picker.title")}>{name}</Chip>}
      title={t("model.picker.title")}
      searchLabel={t("model.picker.search")}
      searchPlaceholder={t("model.picker.searchPlaceholder")}
      emptyLabel={t("model.picker.empty")}
      sections={pickerSections(hosted)}
      chosen={hosted.chosen?.id ?? null}
      onChoose={hosted.choose}
      defaultOpen={defaultOpen}
      settings={settings}
      isLoading={hosted.isLoading}
      notice={
        hosted.error === null ? null : <ModelNotice error={hosted.error} />
      }
    />
  )
}
