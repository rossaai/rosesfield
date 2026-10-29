import { type ClipPlan, clipPlanLimits } from "#motion/clip-plan"
import { ClipPlanNoTargetError } from "#motion/clip-plan-no-target.error"
import type { ClipPlanInput } from "#motion/comfy/clip-plan-turn"
import type { ClipPlanAnswer } from "#motion/comfy/router-clip-plan-turn"

const demoTargets: readonly { find: string; becomes: string }[] = [
  { find: "the person", becomes: "the person of photo 1" },
  { find: "their clothes", becomes: "the clothes of photo 2" },
  { find: "the thing in their hand", becomes: "the thing of photo 3" },
]

/** The demo engine's plan: each of the first photos goes to one thing, at most 3, and the rest match nothing. It calls no model. */
export class DemoClipPlanTurn {
  async ask(input: ClipPlanInput, _key: string): Promise<ClipPlanAnswer> {
    const used = Math.min(input.photos.length, clipPlanLimits.mostTargets)
    if (used === 0) {
      throw new ClipPlanNoTargetError()
    }
    const targets = demoTargets
      .slice(0, used)
      .map((target, at) => ({ ...target, photos: [at] }))
    const plan: ClipPlan = {
      targets,
      editPrompt: "Keep image 1 and change each thing into its photo.",
      scene: "The video as it is, with each thing changed into its photo.",
      unusedPhotos: Array.from(
        { length: input.photos.length - used },
        (_, at) => used + at
      ),
    }
    return { plan, cost: null, attempts: 1 }
  }
}
