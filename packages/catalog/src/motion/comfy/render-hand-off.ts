import type { AssetKind, RunInputs } from "@rosesfield/contract"
import type { AssetId } from "@rosesfield/kernel"
import type { ClipPlan } from "#motion/clip-plan"
import { ClipPlanNoTargetError } from "#motion/clip-plan-no-target.error"
import { ClipPlanUnreadableError } from "#motion/clip-plan-unreadable.error"
import {
  type ReadClipOutput,
  readClipOutputNodes,
} from "#motion/comfy/read-clip-binding"

export type MadeOutput = {
  nodeId: string
  assetId: AssetId
  kind: AssetKind
}

export type ReadClip = Record<ReadClipOutput, AssetId>

export type RenderQuality = "draft" | "final"

export const renderCoreModel = "ltx-2-5-guide"

/** The input names the guided render binds: the first frame is its photo and the depth is its guide clip. */
export const renderCoreInputs = {
  model: "model",
  firstFrame: "photo",
  guide: "clip",
  mask: "mask",
  endKey: "endKey",
  scene: "scene",
  shortSide: "shortSide",
} as const

export const renderShortSides: Readonly<Record<RenderQuality, number>> = {
  draft: 512,
  final: 768,
}

const outputKinds: Readonly<Record<ReadClipOutput, AssetKind>> = {
  depth: "video",
  mask: "video",
  firstFrame: "image",
}

/** Names the read's outputs by the node that saved each. A mask the engine dropped as black means no target was found. */
export function readClipOf(made: readonly MadeOutput[]): ReadClip {
  const find = (name: ReadClipOutput): AssetId | null =>
    made.find(
      (one) =>
        one.nodeId === readClipOutputNodes[name] &&
        one.kind === outputKinds[name]
    )?.assetId ?? null
  const depth = find("depth")
  const mask = find("mask")
  const firstFrame = find("firstFrame")
  if (depth === null || firstFrame === null) {
    throw new ClipPlanUnreadableError({ cause: "the read made no depth" })
  }
  if (mask === null) {
    throw new ClipPlanNoTargetError()
  }
  return { depth, mask, firstFrame }
}

export type RenderHandOff = {
  inputs: RunInputs
  seed: number
}

/** Maps the read, the edited first frame and the plan to the inputs of the guided render. */
export function renderHandOffOf(input: {
  read: ReadClip
  editedFrame: AssetId
  endKey: AssetId | null
  plan: ClipPlan
  quality: RenderQuality
  seed: number
}): RenderHandOff {
  const names = renderCoreInputs
  return {
    inputs: {
      [names.model]: renderCoreModel,
      [names.firstFrame]: [input.editedFrame],
      [names.guide]: [input.read.depth],
      [names.mask]: [input.read.mask],
      ...(input.endKey === null ? {} : { [names.endKey]: [input.endKey] }),
      [names.scene]: input.plan.scene,
      [names.shortSide]: renderShortSides[input.quality],
    },
    seed: input.seed,
  }
}
