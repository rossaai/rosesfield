import {
  creditsOfCost,
  inputRoleOf,
  isHostedModelId,
  nameOf,
} from "@rosesfield/catalog/comfy"
import type { AppListing, InputDefinition, Run } from "@rosesfield/contract"
import type { MediaAspect } from "@rosesfield/ui/components/media-tile"
import { appName, aspectOf, isAssetInput } from "@/catalog/app-facts"
import { findCatalogApp } from "@/catalog/catalog-apps"
import { isModeInput } from "@/catalog/mode-input"
import {
  formatAmount,
  formatDuration,
  formatTime,
  joinParts,
  secondsBetween,
  withUnit,
} from "@/copy/format"
import { t, tCatalog } from "@/copy/t"
import { inputCaption, inputUnit } from "@/screens/app/fields/input-copy"
import { openModelLabel, openModelOfFile } from "@/screens/welcome/open-weights"

export const waitingAfterMs = 10_000
export const modelInputName = "model"

const autoValue = "auto"

export type HeadlineSource =
  | { kind: "text"; text: string }
  | { kind: "asset"; assetId: string }
  | { kind: "character"; characterId: string }

export function runAppName(run: Run): string {
  const app = findCatalogApp(run.appId)
  return app === null ? run.appId : appName(app)
}

export function idsOf(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : []
}

export function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null) {
    return true
  }
  if (typeof value === "string") {
    return value.trim() === ""
  }
  return Array.isArray(value) && value.length === 0
}

function choiceLabel(input: InputDefinition, value: string): string | null {
  if (input.type !== "choice") {
    return null
  }
  const option = input.options.find((candidate) => candidate.value === value)
  return option === undefined ? null : tCatalog(option.labelKey)
}

export function inputValueText(
  app: AppListing | null,
  input: InputDefinition,
  value: unknown
): string | null {
  switch (input.type) {
    case "toggle":
      return value === "on" ? t("history.run.on") : t("history.run.off")
    case "choice":
      return typeof value === "string" ? choiceLabel(input, value) : null
    case "number":
      return typeof value === "number"
        ? withUnit(value, app === null ? "" : inputUnit(app, input))
        : null
    case "prompt":
      return typeof value === "string" && value.trim() !== ""
        ? value.trim()
        : null
    case "seed":
      return typeof value === "number" ? String(value) : null
    default:
      return null
  }
}

function headlineText(
  app: AppListing,
  input: InputDefinition,
  value: unknown
): string | null {
  const shown = inputValueText(app, input, value)
  if (shown === null) {
    return null
  }
  if (input.type === "toggle") {
    return t(value === "on" ? "run.toggle.on" : "run.toggle.off", {
      caption: inputCaption(input),
    })
  }
  if (input.type === "number") {
    return t("run.field", { caption: inputCaption(input), value: shown })
  }
  return shown
}

function isHeadlineInput(input: InputDefinition): boolean {
  return (
    input.type !== "seed" &&
    input.name !== modelInputName &&
    !isModeInput(input)
  )
}

function isReferenceInput(input: InputDefinition): boolean {
  return isAssetInput(input) || input.type === "character"
}

function headlineInputsOf(app: AppListing): InputDefinition[] {
  const inputs = app.inputs.filter(isHeadlineInput)
  return [
    ...inputs.filter(isReferenceInput),
    ...inputs.filter((input) => !isReferenceInput(input)),
  ]
}

function promptText(app: AppListing, run: Run): string | null {
  const prompt = app.inputs.find((input) => input.type === "prompt")
  return prompt === undefined
    ? null
    : inputValueText(app, prompt, run.inputs[prompt.name])
}

function sourceOf(
  app: AppListing,
  input: InputDefinition,
  value: unknown
): HeadlineSource | null {
  if (isAssetInput(input)) {
    const [assetId] = idsOf(value)
    return assetId === undefined ? null : { kind: "asset", assetId }
  }
  if (input.type === "character") {
    const [characterId] = idsOf(value)
    return characterId === undefined ? null : { kind: "character", characterId }
  }
  const text = headlineText(app, input, value)
  return text === null ? null : { kind: "text", text }
}

export function headlineSource(run: Run): HeadlineSource {
  const app = findCatalogApp(run.appId)
  const fallback: HeadlineSource = {
    kind: "text",
    text: t("run.noPrompt", { app: runAppName(run) }),
  }
  if (app === null) {
    return fallback
  }
  const prompt = promptText(app, run)
  if (prompt !== null) {
    return { kind: "text", text: prompt }
  }
  for (const input of headlineInputsOf(app)) {
    const value = run.inputs[input.name]
    const source = isEmptyValue(value) ? null : sourceOf(app, input, value)
    if (source !== null) {
      return source
    }
  }
  return fallback
}

export function runOutputName(run: Run): string {
  const app = findCatalogApp(run.appId)
  const prompt = app === null ? null : promptText(app, run)
  return (
    prompt ??
    t("output.name", { app: runAppName(run), time: formatTime(run.createdAt) })
  )
}

export function runHeadline(run: Run): string {
  const source = headlineSource(run)
  return source.kind === "text" ? source.text : runAppName(run)
}

function formatModelFile(file: string): string {
  const model = openModelOfFile(file)
  if (model !== null) {
    return openModelLabel(model)
  }
  const name = file.split("/").at(-1) ?? file
  return name.replace(/\.[a-z0-9]+$/i, "")
}

export function runModel(run: Run, app: AppListing | null): string | null {
  if (run.origin === "demo") {
    return null
  }
  const input = app?.inputs.find((one) => one.name === modelInputName)
  const chosen = run.inputs[modelInputName]
  if (typeof chosen === "string" && isHostedModelId(chosen)) {
    return nameOf(chosen)
  }
  if (
    input !== undefined &&
    typeof chosen === "string" &&
    chosen !== autoValue
  ) {
    const label = choiceLabel(input, chosen)
    if (label !== null) {
      return label
    }
  }
  const [resolved] = run.engine.models
  return resolved === undefined ? null : formatModelFile(resolved)
}

export function runSeconds(run: Run): number | null {
  return run.finishedAt === null
    ? null
    : secondsBetween(run.createdAt, run.finishedAt)
}

export function runPrice(run: Run, estimate: number | null = null): string {
  if (run.origin === "demo") {
    return t("run.price.demo")
  }
  return priceOf(run, estimate) ?? t("run.price.unknown")
}

function captionPrice(run: Run, estimate: number | null): string {
  if (run.origin === "demo") {
    return t("run.caption.price.demo")
  }
  return priceOf(run, estimate) ?? t("run.caption.price.unknown")
}

function priceOf(run: Run, estimate: number | null): string | null {
  if (run.cost !== null) {
    return t("run.price.credits", {
      amount: formatAmount(creditsOfCost(run.cost)),
    })
  }
  return estimate === null
    ? null
    : t("run.price.estimated", { amount: formatAmount(estimate) })
}

function madeCaption(run: Run, lead: string | null): string | null {
  const seconds = runSeconds(run)
  if (seconds === null) {
    return null
  }
  const duration = formatDuration(seconds)
  return lead === null
    ? t("run.made", { duration })
    : t("run.caption.made", { duration })
}

export function runCaption(run: Run, estimate: number | null = null): string {
  const model = runModel(run, findCatalogApp(run.appId))
  if (run.status === "failed" || run.status === "cancelled") {
    return model ?? ""
  }
  const lead = run.origin === "demo" ? t("run.demoCaption") : model
  if (run.status !== "done") {
    return lead ?? ""
  }
  return joinParts([lead, madeCaption(run, lead), captionPrice(run, estimate)])
}

function inputAspectOf(run: Run): string | null {
  const model = run.inputs[modelInputName]
  if (typeof model !== "string" || !isHostedModelId(model)) {
    return null
  }
  const output = findCatalogApp(run.appId)?.output.kind ?? "image"
  for (const [name, value] of Object.entries(run.inputs)) {
    if (inputRoleOf(name, output) === "aspect" && typeof value === "string") {
      return value
    }
  }
  return null
}

export function runAspect(run: Run): MediaAspect {
  return aspectOf(run.aspectRatio ?? inputAspectOf(run))
}
