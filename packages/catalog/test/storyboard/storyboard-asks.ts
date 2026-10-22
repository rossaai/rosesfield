import {
  appDefinition,
  type RunInputs,
  startRunBodyFor,
} from "@rosesfield/contract"
import { assetIdFormat, characterIdFormat } from "@rosesfield/kernel"
import { app } from "#storyboard/app"
import {
  anchoredOn,
  type KeyframeCall,
  keyframeCallsOf,
  type StoryboardAsk,
} from "#storyboard/storyboard-chain"

export const definition = appDefinition.parse(app)
export const anchorId = assetIdFormat.parse(
  "1e3a5c7e-9b2d-4f6a-8c0e-2b4d6f8a0c1e"
)
export const firstId = assetIdFormat.parse(
  "2f4b6d8e-0c1a-4b3c-9d5e-7f9a1b3c5d7e"
)
export const characterId = characterIdFormat.parse(
  "4c6e8a0c-2e4a-4b6c-9d0e-6a8c0e2a4c6e"
)
export const look = "late afternoon light, 35 mm lens"
export const scenes = [
  "a girl opens the door of a small bakery",
  "she ties an apron and kneads dough",
  "she slides a tray of bread into the oven",
  "she hands a warm loaf to a neighbour",
  "she sweeps the floor after closing",
  "she counts coins at the counter",
  "she turns off the lights",
  "she walks home under the street lamps",
]

export function askOf(
  count: number,
  extra: RunInputs,
  aspectRatio = "16:9"
): StoryboardAsk {
  const inputs: RunInputs = {
    look,
    sceneCount: String(count),
    model: "qwen-image-edit-2511",
    ...extra,
  }
  scenes.slice(0, count).forEach((scene, index) => {
    inputs[`scene${index + 1}`] = scene
  })
  return { inputs, aspectRatio, hosted: null }
}

export function callsOf(ask: StoryboardAsk): KeyframeCall[] {
  return keyframeCallsOf(ask).map((call) =>
    call.waits ? anchoredOn(ask, call, firstId) : call
  )
}

export function withKeyframe(
  call: KeyframeCall,
  keyframe: string
): KeyframeCall {
  const inputs = { ...call.request.inputs, keyframe }
  return { ...call, request: { ...call.request, inputs } }
}

export function nth(
  calls: readonly KeyframeCall[],
  number: number
): KeyframeCall {
  const call = calls.find((one) => one.number === number)
  if (call === undefined) {
    throw new Error(`No call makes keyframe ${number}`)
  }
  return call
}

export function refusal(call: KeyframeCall | { request: unknown }): string[] {
  const result = startRunBodyFor(definition).safeParse(call.request)
  return result.success
    ? []
    : result.error.issues.map((issue) => issue.path.join("."))
}
