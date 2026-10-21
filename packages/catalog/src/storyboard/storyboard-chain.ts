import type { Run, RunInputs } from "@rosesfield/contract"
import { fieldRoleOf, type ModelField } from "@rosesfield/generation/bindings"
import type { ChainRun, SpeechChain } from "#lipsync/speech-chain.port"
import { keyframeAspects } from "#storyboard/comfy/keyframe-sizes"
import { keyframeTextModel } from "#storyboard/comfy/storyboard-binding"
import { keepSentence } from "#storyboard/comfy/storyboard-nodes"
import { storyboardAppId } from "#storyboard/keyframe-facts"
import {
  firstKeyframeInput,
  keyframeInput,
  maxScenes,
  sceneCountInput,
  sceneInputName,
  sceneNumbers,
} from "#storyboard/storyboard-inputs"

type Ids = Extract<RunInputs[string], readonly unknown[]>

type Id = Ids[number]

export type HostedAsk = {
  form: readonly ModelField[]
  settings: RunInputs
  photos: Ids
}

export type StoryboardAsk = {
  inputs: RunInputs
  aspectRatio: string | null
  hosted: HostedAsk | null
}

export type KeyframeCall = {
  number: number
  kind: "text" | "edit"
  request: ChainRun
  kept: RunInputs
  waits: boolean
}

export type KeptKeyframe = {
  press: string
  inputs: RunInputs
}

export type KeyframeChain = Pick<SpeechChain, "start" | "settle">

const keyframeKeySuffix = "-keyframe-"

const imageOutput = "image"

const modelInput = "model"

const aspectRole = "aspect"

function textOf(value: RunInputs[string] | undefined): string {
  return typeof value === "string" ? value.trim() : ""
}

function idsOf(value: RunInputs[string] | undefined): Ids {
  return Array.isArray(value) ? value : []
}

function sceneCountOf(inputs: RunInputs): number {
  const count = Number(inputs[sceneCountInput] ?? "1")
  return Number.isInteger(count) ? Math.min(Math.max(count, 1), maxScenes) : 1
}

function isAnchored(inputs: RunInputs): boolean {
  return (
    idsOf(inputs.reference).length > 0 || idsOf(inputs.character).length > 0
  )
}

function ownInputs(inputs: RunInputs): RunInputs {
  return Object.fromEntries(
    Object.entries(inputs).filter(
      ([name]) => name !== keyframeInput && name !== firstKeyframeInput
    )
  )
}

export function keyframePromptOf(inputs: RunInputs, number: number): string {
  return [
    keepSentence,
    textOf(inputs[sceneInputName(number)]),
    textOf(inputs.look),
  ]
    .filter((part) => part !== "")
    .join(" ")
}

function promptFieldOf(form: readonly ModelField[]): ModelField | null {
  return (
    form.find((field) => fieldRoleOf(field, imageOutput) === "prompt") ?? null
  )
}

function imageFieldOf(
  form: readonly ModelField[]
): Extract<ModelField, { kind: "media" }> | null {
  return (
    form.find(
      (field): field is Extract<ModelField, { kind: "media" }> =>
        field.kind === "media" &&
        field.media === imageOutput &&
        fieldRoleOf(field, imageOutput) !== null
    ) ?? null
  )
}

function hostedEdit(
  ask: StoryboardAsk,
  hosted: HostedAsk,
  number: number,
  anchor: Id | null
): ChainRun {
  const inputs: Record<string, RunInputs[string]> = {
    ...hosted.settings,
    [modelInput]: ask.inputs[modelInput] ?? "",
  }
  const prompt = promptFieldOf(hosted.form)
  if (prompt !== null) {
    inputs[prompt.name] = keyframePromptOf(ask.inputs, number)
  }
  const images = imageFieldOf(hosted.form)
  const reference = idsOf(ask.inputs.reference)
  const photos = reference.length > 0 ? reference : hosted.photos
  const sent = (anchor === null ? photos : [anchor]).slice(0, images?.max ?? 0)
  if (images !== null && sent.length > 0) {
    inputs[images.name] = [...sent]
  }
  return { inputs, aspectRatio: null }
}

function graphEdit(
  ask: StoryboardAsk,
  number: number,
  anchor: Id | null
): ChainRun {
  return {
    inputs: {
      ...ownInputs(ask.inputs),
      [keyframeInput]: String(number),
      ...(anchor === null ? {} : { [firstKeyframeInput]: [anchor] }),
    },
    aspectRatio: ask.aspectRatio,
  }
}

function editRequest(
  ask: StoryboardAsk,
  number: number,
  anchor: Id | null
): ChainRun {
  return ask.hosted === null
    ? graphEdit(ask, number, anchor)
    : hostedEdit(ask, ask.hosted, number, anchor)
}

function keptEdit(
  ask: StoryboardAsk,
  number: number,
  anchor: Id | null
): RunInputs {
  return {
    ...(ask.hosted?.settings ?? {}),
    ...graphEdit(ask, number, anchor).inputs,
  }
}

function editCall(
  ask: StoryboardAsk,
  number: number,
  anchor: Id | null,
  waits: boolean
): KeyframeCall {
  return {
    number,
    kind: "edit",
    request: editRequest(ask, number, anchor),
    kept: keptEdit(ask, number, anchor),
    waits,
  }
}

function hostedAspectOf(hosted: HostedAsk | null): string | null {
  const field = hosted?.form.find(
    (one) => fieldRoleOf(one, imageOutput) === aspectRole
  )
  const value = field === undefined ? undefined : hosted?.settings[field.name]
  return typeof value === "string" && keyframeAspects.includes(value)
    ? value
    : null
}

function textRequest(ask: StoryboardAsk): ChainRun {
  return {
    inputs: {
      ...ownInputs(ask.inputs),
      [modelInput]: keyframeTextModel?.value ?? "",
      [keyframeInput]: "1",
    },
    aspectRatio: ask.aspectRatio ?? hostedAspectOf(ask.hosted),
  }
}

export function keyframeCallsOf(ask: StoryboardAsk): KeyframeCall[] {
  const anchored = isAnchored(ask.inputs)
  return sceneNumbers
    .slice(0, sceneCountOf(ask.inputs))
    .map((number): KeyframeCall => {
      if (!anchored && number === 1) {
        const request = textRequest(ask)
        return {
          number,
          kind: "text",
          request,
          kept: request.inputs,
          waits: false,
        }
      }
      return editCall(ask, number, null, !anchored)
    })
}

export function anchoredOn(
  ask: StoryboardAsk,
  call: KeyframeCall,
  assetId: Id
): KeyframeCall {
  return editCall(ask, call.number, assetId, false)
}

export function keyframeKeyOf(key: string, number: number): string {
  return `${key}${keyframeKeySuffix}${number}`
}

async function firstImageOf(first: Promise<Run | null>): Promise<Id | null> {
  const run = await first
  const [made] = run?.outputs ?? []
  return run?.status === "done" && made !== undefined ? made : null
}

export async function runKeyframes(options: {
  ask: StoryboardAsk
  key: string
  chain: KeyframeChain
  keep?: (run: Run, keyframe: KeptKeyframe) => void
}): Promise<(Run | null)[]> {
  const { ask, key, chain, keep } = options
  const calls = keyframeCallsOf(ask)
  const run = async (call: KeyframeCall): Promise<Run> => {
    const started = await chain.start(
      storyboardAppId,
      call.request,
      keyframeKeyOf(key, call.number)
    )
    keep?.(started, { press: key, inputs: call.kept })
    return chain.settle(started)
  }
  const free = new Map(
    calls
      .filter((call) => !call.waits)
      .map((call): [number, Promise<Run>] => [call.number, run(call)])
  )
  const first = free.get(1) ?? Promise.resolve(null)
  return Promise.all(
    calls.map(async (call): Promise<Run | null> => {
      const started = free.get(call.number)
      if (started !== undefined) {
        return started
      }
      const image = await firstImageOf(first)
      return image === null ? null : run(anchoredOn(ask, call, image))
    })
  )
}
