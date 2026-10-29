import type { Run, RunInputs } from "@rosesfield/contract"
import type {
  ChainLead,
  EndKeySteps,
  LeadStep,
  StepRun,
} from "@rosesfield/generation/bindings"
import type { AssetId } from "@rosesfield/kernel"
import { type ClipPlan, keptPlanOf } from "#motion/clip-plan"
import { ClipPlanUnreadableError } from "#motion/clip-plan-unreadable.error"
import { clipPlanInputs } from "#motion/comfy/clip-plan-binding"
import { finalAt, motionEndKeySteps } from "#motion/comfy/end-key-steps"
import {
  type FrameEditModel,
  frameEditRequestOf,
} from "#motion/comfy/frame-edit"
import type { FrameSize } from "#motion/comfy/guide-fit"
import { readClipRequestOf } from "#motion/comfy/read-clip-binding"
import {
  type ReadClip,
  readClipOf,
  renderHandOffOf,
} from "#motion/comfy/render-hand-off"
import { motionAppId, planModel } from "#motion/motion-models"

/** Your own video, your photos and your prompt, as Generate takes them. */
export type OwnVideoAsk = {
  clip: AssetId
  frames: readonly AssetId[]
  photos: readonly AssetId[]
  sentence: string
  frameSize: FrameSize
  aspectRatio: string | null
  resolution: string
  seed: number
  editor?: FrameEditModel | null
}

/** Reads the text of a file a step held. */
export type HeldText = (assetId: AssetId) => Promise<string>

export const ownVideoStages = ["plan", "read", "edit"] as const

export type OwnVideoStage = (typeof ownVideoStages)[number]

const pricedTarget = "the person"

function sentenceOf(ask: OwnVideoAsk): RunInputs {
  const words = ask.sentence.trim()
  return words === "" ? {} : { [clipPlanInputs.sentence]: words }
}

function planStep(ask: OwnVideoAsk): StepRun {
  return {
    appId: motionAppId,
    request: {
      inputs: {
        model: planModel,
        [clipPlanInputs.clip]: [ask.clip],
        [clipPlanInputs.photos]: [...ask.photos],
        ...(ask.frames.length === 0
          ? {}
          : { [clipPlanInputs.frames]: [...ask.frames] }),
        ...sentenceOf(ask),
      },
      aspectRatio: null,
      place: "held",
    },
  }
}

function heldOf(run: Run): AssetId {
  const [first] = run.held ?? []
  const made = first?.assetId ?? run.outputs[0]
  if (made === undefined) {
    throw new ClipPlanUnreadableError({ cause: `run ${run.id} held nothing` })
  }
  return made
}

/** The plan Generate prices before anything runs: one thing, every photo on it. */
function pricedPlanOf(ask: OwnVideoAsk): ClipPlan {
  return {
    targets: [
      {
        find: pricedTarget,
        becomes: pricedTarget,
        photos: ask.photos.map((_, at) => at),
      },
    ],
    editPrompt: pricedTarget,
    scene: pricedTarget,
    unusedPhotos: [],
  }
}

/** The plan, the read and the first-frame edit your own video runs before its draft, held, and the end-key chain a Library example runs after them. */
export class OwnVideoLead implements ChainLead {
  readonly steps: readonly LeadStep[]
  readonly priced: readonly StepRun[]

  private readonly ask: OwnVideoAsk
  private readonly heldText: HeldText
  private kept: ClipPlan | null = null

  constructor(options: { ask: OwnVideoAsk; heldText: HeldText }) {
    this.ask = options.ask
    this.heldText = options.heldText
    this.steps = [
      { stage: "plan", stepOf: async () => planStep(this.ask) },
      { stage: "read", stepOf: (made) => this.readStep(made) },
      { stage: "edit", stepOf: (made) => this.editStep(made) },
    ]
    this.priced = this.pricedSteps()
  }

  /** The plan once its step ran, or null before it. */
  get plan(): ClipPlan | null {
    return this.kept
  }

  async endKeyStepsOf(made: readonly Run[]): Promise<EndKeySteps> {
    const [, read, edit] = made
    if (read === undefined || edit === undefined) {
      throw new ClipPlanUnreadableError({ cause: "the lead ran no edit" })
    }
    return this.stepsOf(
      readClipOf(read.held ?? []),
      heldOf(edit),
      this.planOf()
    )
  }

  private async readStep(made: readonly Run[]): Promise<StepRun> {
    const [planned] = made
    if (planned === undefined) {
      throw new ClipPlanUnreadableError({ cause: "the lead ran no plan" })
    }
    this.kept = keptPlanOf(await this.heldText(heldOf(planned)))
    return readClipRequestOf({ clip: this.ask.clip, plan: this.kept })
  }

  private async editStep(made: readonly Run[]): Promise<StepRun> {
    const [, read] = made
    if (read === undefined) {
      throw new ClipPlanUnreadableError({ cause: "the lead ran no read" })
    }
    return this.editOf(readClipOf(read.held ?? []).firstFrame, this.planOf())
  }

  private editOf(firstFrame: AssetId, plan: ClipPlan): StepRun {
    const { ask } = this
    return frameEditRequestOf({
      firstFrame,
      frameSize: ask.frameSize,
      photos: ask.photos,
      plan,
      model: ask.editor ?? null,
      seed: ask.seed,
    })
  }

  private stepsOf(
    read: ReadClip,
    editedFrame: AssetId,
    plan: ClipPlan
  ): EndKeySteps {
    const { ask } = this
    const inputs = renderHandOffOf({
      read,
      editedFrame,
      endKey: null,
      plan,
      quality: "draft",
      seed: ask.seed,
    })
    const steps = motionEndKeySteps({
      inputs: { ...inputs, ...sentenceOf(ask) },
      photos: [...ask.photos],
      aspectRatio: ask.aspectRatio,
      frameSize: ask.frameSize,
    })
    return finalAt(steps, ask.resolution)
  }

  private planOf(): ClipPlan {
    if (this.kept === null) {
      throw new ClipPlanUnreadableError({ cause: "the plan is not read" })
    }
    return this.kept
  }

  private pricedSteps(): StepRun[] {
    const { clip } = this.ask
    const plan = pricedPlanOf(this.ask)
    const read: ReadClip = { depth: clip, mask: clip, firstFrame: clip }
    return [
      planStep(this.ask),
      readClipRequestOf({ clip, plan }),
      this.editOf(clip, plan),
      this.stepsOf(read, clip, plan).draft,
    ]
  }
}
