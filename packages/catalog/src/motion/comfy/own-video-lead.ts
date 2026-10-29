import type { Run, RunInputs } from "@rosesfield/contract"
import type {
  ChainLead,
  EndKeySteps,
  LeadStep,
  StepRun,
} from "@rosesfield/generation/bindings"
import { AspectRatio, type AssetId } from "@rosesfield/kernel"
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
import { exampleInput, ownVideo } from "#motion/examples/example-binding"
import { motionAppId, planModel } from "#motion/motion-models"

/** Your own video, your photos and your prompt, as Generate takes them. */
export type OwnVideoAsk = {
  clip: AssetId
  frames: readonly AssetId[]
  photos: readonly AssetId[]
  sentence: string
  frameSize: FrameSize | null
  aspectRatio: string | null
  resolution: string
  seed: number
  editor?: FrameEditModel | null
}

/** Reads the text of a file a step held. */
export type HeldText = (assetId: AssetId) => Promise<string>

/** Reads the size of an image a step held, or null when it is not known. */
export type HeldSize = (assetId: AssetId) => Promise<FrameSize | null>

const squareFrame: FrameSize = { width: 1, height: 1 }

export const ownVideoStages = ["plan", "read", "edit"] as const

export type OwnVideoStage = (typeof ownVideoStages)[number]

const pricedTarget = "the person"

function sentenceOf(ask: OwnVideoAsk): RunInputs {
  const words = ask.sentence.trim()
  return words === "" ? {} : { [clipPlanInputs.sentence]: words }
}

/** A Motion step on your own video names it, so its price is read as its run is. */
function ownStep(step: StepRun): StepRun {
  return {
    ...step,
    request: {
      ...step.request,
      inputs: { [exampleInput]: ownVideo, ...step.request.inputs },
    },
  }
}

function planStep(ask: OwnVideoAsk): StepRun {
  return {
    appId: motionAppId,
    request: {
      inputs: {
        [exampleInput]: ownVideo,
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
  private readonly heldSize: HeldSize | null
  private kept: ClipPlan | null = null
  private size: FrameSize | null

  constructor(options: {
    ask: OwnVideoAsk
    heldText: HeldText
    heldSize?: HeldSize
  }) {
    this.ask = options.ask
    this.heldText = options.heldText
    this.heldSize = options.heldSize ?? null
    this.size = options.ask.frameSize
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
    return ownStep(readClipRequestOf({ clip: this.ask.clip, plan: this.kept }))
  }

  private async editStep(made: readonly Run[]): Promise<StepRun> {
    const [, read] = made
    if (read === undefined) {
      throw new ClipPlanUnreadableError({ cause: "the lead ran no read" })
    }
    const { firstFrame } = readClipOf(read.held ?? [])
    if (this.size === null) {
      this.size = (await this.heldSize?.(firstFrame)) ?? null
    }
    if (this.size === null) {
      throw new ClipPlanUnreadableError({ cause: "the first frame's size" })
    }
    return this.editOf(firstFrame, this.planOf())
  }

  /** The frame's size: your video's own, else the first frame's the read made. A step priced before the read uses a square. */
  private frameSize(): FrameSize {
    return this.size ?? squareFrame
  }

  private editOf(firstFrame: AssetId, plan: ClipPlan): StepRun {
    const { ask } = this
    return frameEditRequestOf({
      firstFrame,
      frameSize: this.frameSize(),
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
    const size = this.frameSize()
    const steps = motionEndKeySteps({
      inputs: { [exampleInput]: ownVideo, ...inputs, ...sentenceOf(ask) },
      photos: [...ask.photos],
      aspectRatio:
        ask.aspectRatio ??
        AspectRatio.ofSize(size.width, size.height)?.toString() ??
        null,
      frameSize: size,
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
      ownStep(readClipRequestOf({ clip, plan })),
      this.editOf(clip, plan),
      this.stepsOf(read, clip, plan).draft,
    ]
  }
}
