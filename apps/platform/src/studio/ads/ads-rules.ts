import { adsHostedInputsOf } from "@rosesfield/catalog/ads"
import {
  type CatalogModel,
  isHostedModelId,
  type ModelField,
} from "@rosesfield/catalog/comfy"
import {
  type AppListing,
  type InputDefinition,
  inputRulesOf,
  isAppOnly,
  type Run,
} from "@rosesfield/contract"
import { isAssetInput } from "@/catalog/app-facts"
import {
  bodyOf,
  type FieldProblem,
  type FieldValue,
  type FormValues,
  problemsOf,
  type StartRunBodyInput,
  valuesFromRun,
} from "@/screens/app/app-form"
import { hostedDefaults } from "@/screens/app/hosted/hosted-form"

type Inputs = Readonly<Record<string, FieldValue>>

type PromptInput = Extract<InputDefinition, { type: "prompt" }>

export type AdsKind = "product-shot" | "ad"

export type AdsProblem = {
  input: string
  key: string
  values: Readonly<Record<string, number>>
  focus: "prompt" | "attach"
}

export const kindInput = "kind"
export const modelInput = "model"
export const characterInput = "character"
const lineCount = 2

function textOf(value: FieldValue): string {
  return typeof value === "string" ? value : ""
}

function listOf(value: FieldValue): string[] {
  return Array.isArray(value) ? value : []
}

export function kindOf(inputs: Inputs): AdsKind {
  return inputs[kindInput] === "ad" ? "ad" : "product-shot"
}

function appliedNames(app: AppListing, inputs: Inputs): ReadonlySet<string> {
  return new Set(inputRulesOf(app, inputs).map((rule) => rule.input.name))
}

export function promptInputsOf(app: AppListing, kind: AdsKind): PromptInput[] {
  const applied = appliedNames(app, { [kindInput]: kind })
  return app.inputs.filter(
    (input): input is PromptInput =>
      input.type === "prompt" && applied.has(input.name)
  )
}

export function barTextOf(app: AppListing, inputs: Inputs): string {
  return promptInputsOf(app, kindOf(inputs))
    .map((input) => textOf(inputs[input.name]))
    .filter((text, index) => index === 0 || text !== "")
    .join("\n")
}

export function barTextInputs(
  app: AppListing,
  kind: AdsKind,
  text: string
): Record<string, string> {
  const [first, second] = promptInputsOf(app, kind)
  if (first === undefined) {
    return {}
  }
  if (second === undefined) {
    return { [first.name]: text }
  }
  const breakAt = text.indexOf("\n")
  return breakAt < 0
    ? { [first.name]: text, [second.name]: "" }
    : {
        [first.name]: text.slice(0, breakAt),
        [second.name]: text.slice(breakAt + 1),
      }
}

export function holdsBarText(
  app: AppListing,
  inputs: Inputs,
  kind: AdsKind,
  text: string
): boolean {
  return Object.entries(barTextInputs(app, kind, text)).every(
    ([name, value]) => (inputs[name] ?? "") === value
  )
}

function optional(input: InputDefinition): InputDefinition {
  return "presence" in input ? { ...input, presence: "optional" } : input
}

export function optionalApp(app: AppListing): AppListing {
  return { ...app, inputs: app.inputs.map(optional) }
}

function photoInputsOf(app: AppListing): InputDefinition[] {
  return app.inputs.filter(
    (input) => isAssetInput(input) || input.type === characterInput
  )
}

function isFilledPhoto(input: InputDefinition, inputs: Inputs): boolean {
  return (
    (isAssetInput(input) || input.type === characterInput) &&
    listOf(inputs[input.name]).length > 0
  )
}

export function bodyAppFor(app: AppListing, inputs: Inputs): AppListing {
  const applied = appliedNames(app, inputs)
  return {
    ...app,
    inputs: app.inputs.filter(
      (input) => applied.has(input.name) || isFilledPhoto(input, inputs)
    ),
  }
}

export function formProblemsOf(
  app: AppListing,
  values: FormValues
): FieldProblem[] {
  return problemsOf(bodyAppFor(app, values.inputs), values)
}

export function photoRoomOf(app: AppListing, inputs: Inputs): number {
  return app.inputs
    .filter(isAssetInput)
    .reduce(
      (room, input) =>
        room + Math.max(0, input.max - listOf(inputs[input.name]).length),
      0
    )
}

export function photoMaxOf(app: AppListing): number {
  return app.inputs
    .filter(isAssetInput)
    .reduce((total, input) => total + input.max, 0)
}

export function photoLimitOf(app: AppListing, model: string): number {
  const photos = photoInputsOf(app)
  let limit = 0
  for (let filled = 1; filled <= photos.length; filled += 1) {
    const inputs: Record<string, FieldValue> = { [modelInput]: model }
    for (const input of photos.slice(0, filled)) {
      inputs[input.name] = ["probe"]
    }
    const rules = inputRulesOf(app, inputs)
    const keepsAll = photos
      .slice(0, filled)
      .every((input) => rules.some((rule) => rule.input.name === input.name))
    const modelRule = rules.find((rule) => rule.input.name === modelInput)
    if (keepsAll && (modelRule?.allowed ?? []).includes(model)) {
      limit = filled
    }
  }
  return limit
}

function problem(
  input: string,
  key: string,
  focus: AdsProblem["focus"],
  values: Record<string, number> = {}
): AdsProblem {
  return { input, key, values, focus }
}

function lengthProblem(
  app: AppListing,
  input: PromptInput,
  text: string
): AdsProblem | null {
  if (input.presence === "required" && text.trim() === "") {
    return problem(
      input.name,
      `${app.id}.input.${input.name}.required`,
      "prompt"
    )
  }
  if (text.length > input.maxLength) {
    return problem(input.name, `${app.id}.input.${input.name}.long`, "prompt", {
      max: input.maxLength,
    })
  }
  return null
}

function promptProblems(app: AppListing, inputs: Inputs): AdsProblem[] {
  const prompts = promptInputsOf(app, kindOf(inputs))
  const found = prompts.flatMap((input) => {
    const text = textOf(inputs[input.name])
    const length = lengthProblem(app, input, text)
    return length === null ? [] : [length]
  })
  const last = prompts.at(-1)
  if (prompts.length > 1 && last !== undefined) {
    if (textOf(inputs[last.name]).includes("\n")) {
      found.push(
        problem(
          last.name,
          `${app.id}.input.${last.name}.tooManyLines`,
          "prompt",
          {
            max: lineCount,
          }
        )
      )
    }
  }
  return found
}

const maskPattern = /mask/i

function hostedPhotoLimitOf(model: CatalogModel): number {
  const tagged = model.tags.find((tag) => tag.kind === "references")
  if (tagged?.kind === "references") {
    return tagged.max
  }
  const images = (model.form ?? []).flatMap((field) =>
    field.kind === "media" &&
    field.media === "image" &&
    !maskPattern.test(field.name)
      ? [field.max]
      : []
  )
  return Math.max(1, ...images)
}

export function modelPhotoLimitOf(
  app: AppListing,
  id: string,
  model: CatalogModel | undefined
): number {
  return model?.kind === "hosted"
    ? hostedPhotoLimitOf(model)
    : photoLimitOf(app, id)
}

function hostedPhotoProblems(
  app: AppListing,
  inputs: Inputs,
  model: CatalogModel | undefined
): AdsProblem[] {
  if (model === undefined) {
    return []
  }
  const limit = hostedPhotoLimitOf(model)
  const sent = photoInputsOf(app).reduce(
    (total, input) => total + listOf(inputs[input.name]).length,
    0
  )
  return sent > limit ? [tooManyPhotos(app, limit)] : []
}

function tooManyPhotos(app: AppListing, max: number): AdsProblem {
  return problem(
    modelInput,
    `${app.id}.input.${modelInput}.tooManyPhotos`,
    "attach",
    { max }
  )
}

function photoProblems(
  app: AppListing,
  inputs: Inputs,
  models: readonly CatalogModel[]
): AdsProblem[] {
  const required = app.inputs.find(
    (input) => isAssetInput(input) && input.presence === "required"
  )
  if (required !== undefined && listOf(inputs[required.name]).length === 0) {
    return [
      problem(
        required.name,
        `${app.id}.input.${required.name}.required`,
        "attach"
      ),
    ]
  }
  const model = textOf(inputs[modelInput]) || defaultModelOf(app)
  if (isHostedModelId(model)) {
    return hostedPhotoProblems(
      app,
      inputs,
      models.find((one) => one.id === model)
    )
  }
  const rules = inputRulesOf(app, inputs)
  const dropped = photoInputsOf(app).some(
    (input) =>
      listOf(inputs[input.name]).length > 0 &&
      !rules.some((rule) => rule.input.name === input.name)
  )
  const allowed =
    rules.find((rule) => rule.input.name === modelInput)?.allowed ?? null
  const isRefused = allowed !== null && !allowed.includes(model)
  if (!dropped && !isRefused) {
    return []
  }
  return [tooManyPhotos(app, photoLimitOf(app, model))]
}

function defaultModelOf(app: AppListing): string {
  const input = app.inputs.find((one) => one.name === modelInput)
  return input?.type === "choice" ? input.default : ""
}

export function adsProblems(
  app: AppListing,
  inputs: Inputs,
  models: readonly CatalogModel[] = []
): AdsProblem[] {
  return [
    ...photoProblems(app, inputs, models),
    ...promptProblems(app, inputs),
  ]
}

export function adsValuesOf(app: AppListing, run: Run): FormValues {
  const { [modelInput]: model, ...kept } = run.inputs
  const values = valuesFromRun(app, { ...run, inputs: kept })
  return typeof model === "string"
    ? { ...values, inputs: { ...values.inputs, [modelInput]: model } }
    : values
}

export function compactedPhotos(
  app: AppListing,
  inputs: Inputs
): Record<string, string[]> | null {
  const photos = app.inputs.filter(isAssetInput)
  const ids = photos.flatMap((input) => listOf(inputs[input.name]))
  const placed = Object.fromEntries(
    photos.map((input, index) => [input.name, ids.slice(index, index + 1)])
  )
  const isSame = photos.every(
    (input) =>
      listOf(inputs[input.name]).join() === (placed[input.name] ?? []).join()
  )
  return isSame ? null : placed
}

type BodyValue = StartRunBodyInput["inputs"][string]

function filledOf(
  inputs: Readonly<Record<string, FieldValue>>
): Record<string, BodyValue> {
  return Object.fromEntries(
    Object.entries(inputs).filter(
      (entry): entry is [string, BodyValue] =>
        entry[1] !== undefined &&
        entry[1] !== "" &&
        !(Array.isArray(entry[1]) && entry[1].length === 0)
    )
  )
}

export function adsHostedBodyOf(
  app: AppListing,
  values: FormValues,
  fields: readonly ModelField[],
  characterPhoto: string | null,
  own: StartRunBodyInput
): StartRunBodyInput {
  const sent = bodyAppFor(app, values.inputs)
  const appOnly = bodyOf(
    { ...sent, inputs: sent.inputs.filter(isAppOnly) },
    values
  ).inputs
  const filled = adsHostedInputsOf({
    inputs: values.inputs,
    fields,
    characterPhoto,
    aspectRatio: values.aspectRatio,
  })
  return {
    ...own,
    inputs: {
      ...filledOf(hostedDefaults(fields, {})),
      ...own.inputs,
      ...filled,
      ...filledOf(appOnly),
    },
  }
}
