import { ltx25GuideInputs, motionAppId } from "@rosesfield/catalog/motion"
import type {
  AppListing,
  AssetKind,
  InputDefinition,
} from "@rosesfield/contract"
import { AspectRatio } from "@rosesfield/kernel"
import type { MediaAspect } from "@rosesfield/ui/components/media-tile"
import { outputKindsOf } from "@/catalog/app-workflows"
import { isModeInput } from "@/catalog/mode-input"
import { formatChoices, formatList } from "@/copy/format"
import { hasCatalogText, t, tCatalog } from "@/copy/t"

export type OutputKind = AppListing["output"]["kind"]
export type TakenKind = "prompt" | "image" | "video" | "audio" | "character"
export type AssetInput = Extract<
  InputDefinition,
  { type: "image" | "video" | "audio" }
>
export type CharacterInput = Extract<InputDefinition, { type: "character" }>

export const outputKinds: readonly OutputKind[] = [
  "image",
  "video",
  "audio",
  "mesh",
  "text",
]
const takenKinds: readonly TakenKind[] = [
  "prompt",
  "image",
  "video",
  "audio",
  "character",
]
const square: MediaAspect = { width: 1, height: 1 }

export function takenKindsOf(app: AppListing): TakenKind[] {
  return takenKinds.filter((kind) =>
    app.inputs.some((input) => input.type === kind)
  )
}

export function appName(app: AppListing): string {
  return tCatalog(app.nameKey)
}

export function appLine(app: AppListing): string {
  return tCatalog(`${app.id}.line`)
}

export function appBadge(app: AppListing): string | null {
  const key = `${app.id}.badge`
  return hasCatalogText(key) ? tCatalog(key) : null
}

export function appKeywords(app: AppListing): string {
  const key = `${app.id}.keywords`
  return hasCatalogText(key) ? tCatalog(key) : ""
}

export function appEmptyTitle(app: AppListing): string {
  const family = app.nameKey.split(".")[0] ?? app.id
  for (const key of [`${app.id}.empty.title`, `${family}.empty.title`]) {
    if (hasCatalogText(key)) {
      return tCatalog(key)
    }
  }
  return t("app.empty.title")
}

export function promptInputOf(
  app: AppListing
): Extract<InputDefinition, { type: "prompt" }> | null {
  return app.inputs.find((input) => input.type === "prompt") ?? null
}

export function assetInputFor(
  app: AppListing,
  kind: AssetKind
): AssetInput | null {
  for (const input of app.inputs) {
    if (isAssetInput(input) && input.type === kind) {
      return input
    }
  }
  return null
}

export function isAssetInput(input: InputDefinition): input is AssetInput {
  return (
    input.type === "image" || input.type === "video" || input.type === "audio"
  )
}

export function characterInputOf(app: AppListing): CharacterInput | null {
  return app.inputs.find((input) => input.type === "character") ?? null
}

function modeOwners(app: AppListing): ReadonlySet<string> {
  const mode = app.inputs.find(isModeInput)
  return new Set(
    mode?.type === "choice" ? mode.options.map((option) => option.value) : []
  )
}

function assetWord(inputs: readonly InputDefinition[]): string {
  const [first] = inputs
  if (first === undefined || !isAssetInput(first)) {
    return ""
  }
  const total = inputs.reduce(
    (sum, input) => sum + (isAssetInput(input) ? input.max : 0),
    0
  )
  return total <= 1
    ? t(`apps.input.${first.type}.single`)
    : t(`apps.input.${first.type}`)
}

function takenWords(app: AppListing): string[] {
  const owners = modeOwners(app)
  const isAlternative = (input: InputDefinition): boolean =>
    isAssetInput(input) && owners.has(input.name)
  const alternatives = app.inputs
    .filter(isAssetInput)
    .filter((input) => owners.has(input.name))
  const placed: Array<{ order: number; word: string }> = []
  takenKinds.forEach((kind, order) => {
    const inputs = app.inputs.filter(
      (input) => input.type === kind && !isAlternative(input)
    )
    if (inputs.length > 0) {
      placed.push({
        order,
        word:
          kind === "prompt" || kind === "character"
            ? t(`apps.input.${kind}`)
            : assetWord(inputs),
      })
    }
  })
  const choices = alternatives.map((input) =>
    t(`apps.input.${input.type}.single`)
  )
  const firstChoice = alternatives[0]
  if (firstChoice !== undefined) {
    placed.push({
      order: takenKinds.indexOf(firstChoice.type),
      word: formatChoices(choices),
    })
  }
  return placed
    .sort((left, right) => left.order - right.order)
    .map((item) => item.word)
}

function outputWord(app: AppListing): string {
  const isSingle = app.output.count.max <= 1
  return formatChoices(
    outputKindsOf(app).map((kind) =>
      isSingle ? t(`apps.output.${kind}.single`) : t(`apps.output.${kind}`)
    )
  )
}

export function takesText(app: AppListing): string {
  const output = outputWord(app)
  const words = takenWords(app)
  if (words.length === 0) {
    return t("apps.card.makes", { output })
  }
  return t("apps.card.takes", { inputs: formatList(words), output })
}

export function aspectOf(ratio: string | null): MediaAspect {
  if (ratio === null || !AspectRatio.isValid(ratio)) {
    return square
  }
  const parsed = AspectRatio.parse(ratio)
  return { width: parsed.width, height: parsed.height }
}

export function defaultAspectOf(app: AppListing): string | null {
  const output = app.output
  return output.kind === "image" || output.kind === "video"
    ? (output.aspectRatios?.default ?? null)
    : null
}

export function ratioOfSize(width: number, height: number): string | null {
  return AspectRatio.ofSize(width, height)?.toString() ?? null
}

export function appsTaking(
  apps: readonly AppListing[],
  kind: AssetKind | "character"
): AppListing[] {
  return apps.filter((app) => app.inputs.some((input) => input.type === kind))
}

type ImageInput = Extract<InputDefinition, { type: "image" }>

const modelInput = "model"

export function modelsTakingInput(input: InputDefinition): readonly string[] {
  return input.type === "image"
    ? (input.when ?? []).flatMap((condition) =>
        "is" in condition && condition.input === modelInput ? condition.is : []
      )
    : []
}

export function referenceImageInputsOf(app: AppListing): ImageInput[] {
  return app.inputs.filter(
    (input): input is ImageInput =>
      input.type === "image" && modelsTakingInput(input).length > 0
  )
}

/** Motion puts your character into a video, so its one photo takes the character's first photo. */
const characterPhotoInputs: Readonly<Record<string, string>> = {
  [motionAppId]: ltx25GuideInputs.photo,
}

/** The one photo of an app that takes a character as that photo, or null. */
export function characterPhotoInputOf(app: AppListing): ImageInput | null {
  const name = Object.hasOwn(characterPhotoInputs, app.id)
    ? characterPhotoInputs[app.id]
    : undefined
  return (
    app.inputs.find(
      (input): input is ImageInput =>
        input.type === "image" && input.name === name
    ) ?? null
  )
}

function takesReferencePhotos(app: AppListing): boolean {
  return referenceImageInputsOf(app).some((input) => input.max > 1)
}

/** An app takes a character when it has a character input, when its reference images take the character's photos, as Image's do, or when its one photo takes the character's first photo, as Motion's does. */
export function appsTakingCharacter(apps: readonly AppListing[]): AppListing[] {
  return apps.filter(
    (app) =>
      app.inputs.some((input) => input.type === "character") ||
      takesReferencePhotos(app) ||
      characterPhotoInputOf(app) !== null
  )
}

export function hasPrompt(app: AppListing): boolean {
  return promptInputOf(app) !== null
}
