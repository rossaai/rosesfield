import type { AssetKind, HeldOutput, RunInputs } from "@rosesfield/contract"
import type { AssetId } from "@rosesfield/kernel"
import type { ClipPlan } from "#motion/clip-plan"
import { ClipPlanNoTargetError } from "#motion/clip-plan-no-target.error"
import { ClipPlanUnreadableError } from "#motion/clip-plan-unreadable.error"
import {
  ltx25GuideInputs,
  type RenderQuality,
  renderResolutions,
} from "#motion/comfy/guide-ltx-2-5-binding"
import {
  type ReadClipOutput,
  readClipOutputNodes,
} from "#motion/comfy/read-clip-binding"
import { ltx25GuideModel } from "#motion/motion-models"

export type ReadClip = Record<ReadClipOutput, AssetId>

const outputKinds: Readonly<Record<ReadClipOutput, AssetKind>> = {
  depth: "video",
  mask: "video",
  firstFrame: "image",
}

/** Names the read's held outputs by the node that saved each. A mask the engine dropped as black means no target was found. */
export function readClipOf(held: readonly HeldOutput[]): ReadClip {
  const find = (name: ReadClipOutput): AssetId | null =>
    held.find(
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

/** Maps the read, the edited first frame and the plan to the inputs of the guided render, with the seed the draft and the final share. */
export function renderHandOffOf(input: {
  read: ReadClip
  editedFrame: AssetId
  endKey: AssetId | null
  plan: ClipPlan
  quality: RenderQuality
  seed: number
}): RunInputs {
  const names = ltx25GuideInputs
  return {
    [names.model]: ltx25GuideModel,
    [names.photo]: [input.editedFrame],
    [names.guide]: [input.read.depth],
    [names.mask]: [input.read.mask],
    ...(input.endKey === null ? {} : { [names.endKey]: [input.endKey] }),
    [names.scene]: input.plan.scene,
    [names.resolution]: renderResolutions[input.quality],
    [names.seed]: input.seed,
  }
}
