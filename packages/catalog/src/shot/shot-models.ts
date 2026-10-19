import {
  type ChoiceBound,
  type InputDefinition,
  type InputRule,
  type InputWhen,
  inputRulesOf,
  type NumberBound,
} from "@rosesfield/contract"
import { autoValue, shotLists } from "#shot/shot-words"

export const shotModelIds = ["ltx-2-5", "wan-2-2-fun-camera"] as const

export type ShotModelId = (typeof shotModelIds)[number]

export type ShotModel = {
  id: ShotModelId
  startFrame: "unread" | "required"
  movementInput: "words" | "camera"
  movements: readonly string[]
  lengths: readonly number[]
  resolutions: readonly string[]
  framesPerSecond: number
  sound: "made" | "none"
  closing: "sentence" | "none"
}

export const defaultShotModel: ShotModelId = "ltx-2-5"

export const shotResolutions = ["480p", "720p", "1080p"] as const

export const cameraMovements = [
  "static",
  "push-in",
  "pull-out",
  "track-left",
  "track-right",
  "crane-up",
  "crane-down",
] as const

export const shotModels: Readonly<Record<ShotModelId, ShotModel>> = {
  "ltx-2-5": {
    id: "ltx-2-5",
    startFrame: "unread",
    movementInput: "words",
    movements: [autoValue, ...shotLists.movement],
    lengths: [2, 3, 4, 5, 6, 7, 8, 9, 10],
    resolutions: [...shotResolutions],
    framesPerSecond: 24,
    sound: "made",
    closing: "sentence",
  },
  "wan-2-2-fun-camera": {
    id: "wan-2-2-fun-camera",
    startFrame: "required",
    movementInput: "camera",
    movements: [autoValue, ...cameraMovements],
    lengths: [5],
    resolutions: ["480p"],
    framesPerSecond: 16,
    sound: "none",
    closing: "none",
  },
}

const models: readonly ShotModel[] = shotModelIds.map((id) => shotModels[id])

function onModel(model: ShotModel): InputWhen {
  return [{ input: "model", is: [model.id] }]
}

function modelsWhere(test: (model: ShotModel) => boolean): ShotModelId[] {
  return models.filter(test).map((model) => model.id)
}

export const modelBounds: ChoiceBound[] = [
  {
    when: [{ input: "startFrame", state: "empty" }],
    values: modelsWhere((model) => model.startFrame !== "required"),
  },
  {
    when: [{ input: "startFrame", state: "filled" }],
    values: modelsWhere((model) => model.startFrame !== "unread"),
  },
]

export const movementBounds: ChoiceBound[] = models.map((model) => ({
  when: onModel(model),
  values: [...model.movements],
}))

export const resolutionBounds: ChoiceBound[] = models.map((model) => ({
  when: onModel(model),
  values: [...model.resolutions],
}))

export const lengthBounds: NumberBound[] = models.map((model) => ({
  when: onModel(model),
  min: Math.min(...model.lengths),
  max: Math.max(...model.lengths),
}))

export const soundWhen: InputWhen = [
  { input: "model", is: modelsWhere((model) => model.sound === "made") },
]

export type ShotProblem =
  | { input: "startFrame"; kind: "required" }
  | { input: "startFrame"; kind: "unread"; model: ShotModelId }
  | {
      input: "movement" | "length" | "resolution"
      kind: "unsupported"
      model: ShotModelId
      takes: readonly string[]
    }

export function isShotModelId(value: unknown): value is ShotModelId {
  return shotModelIds.some((id) => id === value)
}

export type ShotInputs = Readonly<Record<string, unknown>>

export function shotModelOf(inputs: ShotInputs): ShotModel {
  const chosen = inputs.model
  return shotModels[isShotModelId(chosen) ? chosen : defaultShotModel]
}

type ShotApp = { inputs: readonly InputDefinition[] }

const boundedInputs = ["movement", "length", "resolution"] as const

function isBounded(name: string): name is (typeof boundedInputs)[number] {
  return boundedInputs.some((one) => one === name)
}

function takesOf(rule: InputRule): readonly string[] | null {
  const { range, input } = rule
  if (rule.allowed !== null) {
    return rule.allowed
  }
  if (range === null || input.type !== "number") {
    return null
  }
  const steps = Math.max(0, Math.round((range.max - range.min) / input.step))
  return Array.from({ length: steps + 1 }, (_, index) =>
    String(range.min + index * input.step)
  )
}

function problemOf(
  rule: InputRule,
  model: ShotModel,
  value: unknown
): ShotProblem | null {
  const takes = takesOf(rule)
  const name = rule.input.name
  if (takes === null || value === undefined || takes.includes(String(value))) {
    return null
  }
  if (name === "model") {
    return model.startFrame === "required"
      ? { input: "startFrame", kind: "required" }
      : { input: "startFrame", kind: "unread", model: model.id }
  }
  return isBounded(name)
    ? { input: name, kind: "unsupported", model: model.id, takes }
    : null
}

export function shotProblems(app: ShotApp, inputs: ShotInputs): ShotProblem[] {
  const model = shotModelOf(inputs)
  return inputRulesOf(app, inputs)
    .map((rule) => problemOf(rule, model, inputs[rule.input.name]))
    .filter((problem) => problem !== null)
}
