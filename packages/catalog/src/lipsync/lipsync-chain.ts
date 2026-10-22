import {
  type AppDefinition,
  assetId,
  type InputDefinition,
  type Run,
  type RunInputs,
  startRunBodyFor,
} from "@rosesfield/contract"
import {
  appOnlyInputsOf,
  checkModelInputs,
  type ModelForm,
} from "@rosesfield/generation/bindings"
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

export type VideoCheck = {
  app: AppDefinition
  form: ModelForm | null
}

export type ChainTarget = {
  appId: string
  audio: string
  length: string | null
  check: VideoCheck
}

export type ChainOutcome =
  | { kind: "unplanned" }
  | { kind: "invalid"; issues: string[] }
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

/** Lists what the gateway's own input check refuses in a video run's inputs, with no run started. */
export function videoProblemsOf(
  check: VideoCheck,
  request: ChainRun
): string[] {
  if (check.form === null) {
    const parsed = startRunBodyFor(check.app).safeParse(
      request.aspectRatio === null
        ? { inputs: request.inputs }
        : { inputs: request.inputs, aspectRatio: request.aspectRatio }
    )
    return parsed.success
      ? []
      : parsed.error.issues.map(
          (issue) => `${issue.path.join(".") || "body"}: ${issue.message}`
        )
  }
  const own = appOnlyInputsOf(check.app, request.inputs)
  const checked = checkModelInputs(check.form, own.rest)
  return [...(checked.kind === "invalid" ? checked.issues : []), ...own.issues]
}

function foreseenProblemsOf(target: ChainTarget, request: ChainRun): string[] {
  const inputs = {
    ...lipInputsOf(request.inputs),
    [target.audio]: [assetId.parse(crypto.randomUUID())],
  }
  const length = target.length
  return videoProblemsOf(target.check, { ...request, inputs }).filter(
    (issue) =>
      length === null ||
      !(issue.startsWith(`${length}:`) || issue.startsWith(`inputs.${length}`))
  )
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
  const issues = foreseenProblemsOf(target, request)
  if (issues.length > 0) {
    return { kind: "invalid", issues }
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
