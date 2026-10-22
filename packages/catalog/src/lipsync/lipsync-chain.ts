import type { InputDefinition, Run, RunInputs } from "@rosesfield/contract"
import type { CatalogModel } from "#comfy/model-catalog.contract"
import { lengthOfSeconds } from "#lipsync/comfy/lipsync-frames"
import {
  type SpeechApp,
  speechInputsOf,
  spokenInputs,
} from "#lipsync/lipsync-speech"
import type { ChainRun, SpeechChain } from "#lipsync/speech-chain.port"

export const speechTextInput = "speechText"

export const speechModelInput = "speechModel"

const modelInput = "model"

const speechKeySuffix = "-speech"

const videoKeySuffix = "-video"

export type ChainTarget = {
  appId: string
  audio: string
  length: string | null
}

export type ChainOutcome =
  | { kind: "unplanned" }
  | { kind: "unspoken"; speech: Run }
  | { kind: "started"; speech: Run; video: Run }

function stringOf(value: RunInputs[string] | undefined): string {
  return typeof value === "string" ? value : ""
}

function appDefaultOf(app: SpeechApp): string | null {
  const model = app.inputs.find(
    (input): input is Extract<InputDefinition, { type: "choice" }> =>
      input.type === "choice" && input.name === modelInput
  )
  return typeof model?.default === "string" ? model.default : null
}

export function lipInputsOf(inputs: RunInputs): RunInputs {
  return Object.fromEntries(
    Object.entries(inputs).filter(
      ([name]) => name !== speechTextInput && name !== speechModelInput
    )
  )
}

export function speechPlanOf(options: {
  app: SpeechApp
  voices: readonly CatalogModel[]
  inputs: RunInputs
}): RunInputs | null {
  const { app, voices, inputs } = options
  const picked = stringOf(inputs[speechModelInput])
  const model = picked === "" ? appDefaultOf(app) : picked
  if (model === null) {
    return null
  }
  return speechInputsOf({
    app,
    voice: voices.find((one) => one.id === model) ?? null,
    model,
    text: stringOf(inputs[speechTextInput]),
  })
}

async function lengthedInputs(
  inputs: RunInputs,
  speech: Run,
  target: ChainTarget,
  chain: SpeechChain
): Promise<RunInputs> {
  const [made] = speech.outputs
  if (target.length === null || made === undefined) {
    return inputs
  }
  const seconds = await chain.secondsOf(made)
  return seconds === null
    ? inputs
    : { ...inputs, [target.length]: lengthOfSeconds(seconds) }
}

export async function speakThenSync(options: {
  app: SpeechApp
  voices: readonly CatalogModel[]
  target: ChainTarget
  request: ChainRun
  key: string
  chain: SpeechChain
}): Promise<ChainOutcome> {
  const { app, target, request, chain } = options
  const planned = speechPlanOf({
    app,
    voices: options.voices,
    inputs: request.inputs,
  })
  if (planned === null) {
    return { kind: "unplanned" }
  }
  const queued = await chain.start(
    app.id,
    { inputs: planned, aspectRatio: null },
    `${options.key}${speechKeySuffix}`
  )
  const speech = await chain.settle(queued)
  const spoken = spokenInputs(lipInputsOf(request.inputs), speech, target.audio)
  if (spoken === null) {
    return { kind: "unspoken", speech }
  }
  const video = await chain.start(
    target.appId,
    {
      inputs: await lengthedInputs(spoken, speech, target, chain),
      aspectRatio: request.aspectRatio,
    },
    `${options.key}${videoKeySuffix}`
  )
  return { kind: "started", speech, video }
}
