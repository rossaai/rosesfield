import type {
  Cost,
  EngineBinding,
  KeyCheck,
  RunInputs,
  RunOrigin,
} from "@rosesfield/contract"
import {
  type EngineFile,
  type EngineOutput,
  type EngineRequest,
  type EngineStatus,
  type EngineSubmission,
  GenerationEngine,
  type OutputsPerJob,
  RunFailedError,
} from "@rosesfield/generation"
import { creditsOfCost } from "#comfy/comfy-credits"
import { base64Of } from "#media-base64"
import { ClipPlanUnreadableError } from "#motion/clip-plan-unreadable.error"
import {
  clipPlanAdapter,
  clipPlanInputs,
  keptPlanMime,
} from "#motion/comfy/clip-plan-binding"
import {
  type ClipPlanInput,
  clipPlanModel,
  type PlanImage,
} from "#motion/comfy/clip-plan-turn"
import {
  type ClipPlanAnswer,
  RouterClipPlanTurn,
} from "#motion/comfy/router-clip-plan-turn"

export type ClipPlanTurn = {
  ask(input: ClipPlanInput, key: string): Promise<ClipPlanAnswer>
}

/** Reads the 4 frames the plan sees from the clip, where this server has a tool that opens a video. */
export type ClipFrames = {
  framesOf(clip: EngineFile): Promise<PlanImage[]>
}

type ClipPlanGenerationEngineOptions = {
  turn: ClipPlanTurn
  origin: RunOrigin
  frames?: ClipFrames | null
}

const planMimes: readonly PlanImage["mime"][] = [
  "image/jpeg",
  "image/png",
  "image/webp",
]

function isPlanMime(mime: string): mime is PlanImage["mime"] {
  return planMimes.some((one) => one === mime)
}

function idsOf(inputs: RunInputs, name: string): readonly string[] {
  const value = inputs[name]
  return Array.isArray(value) ? value : []
}

function filesOf(request: EngineRequest, name: string): EngineFile[] {
  return idsOf(request.inputs, name).flatMap((id) => {
    const file = request.files.find((one) => one.assetId === id)
    return file === undefined ? [] : [file]
  })
}

function imageOf(file: EngineFile): PlanImage {
  if (!isPlanMime(file.mime)) {
    throw new ClipPlanUnreadableError({ cause: `a ${file.mime} image` })
  }
  return { mime: file.mime, base64: base64Of(file.bytes) }
}

function outputOf(answer: ClipPlanAnswer): EngineOutput {
  return {
    kind: "text",
    mime: keptPlanMime,
    bytes: new TextEncoder().encode(JSON.stringify(answer.plan)),
    width: null,
    height: null,
    durationSeconds: null,
  }
}

/** Plans a change to a Motion clip in its submit, and keeps the plan as the run's one held output. */
export class ClipPlanGenerationEngine extends GenerationEngine {
  override readonly key = clipPlanAdapter
  override readonly origin: RunOrigin
  override readonly idempotency = "keyed"

  private readonly turn: ClipPlanTurn
  private readonly frames: ClipFrames | null

  constructor(options: ClipPlanGenerationEngineOptions) {
    super()
    this.turn = options.turn
    this.origin = options.origin
    this.frames = options.frames ?? null
  }

  override canRun(binding: EngineBinding): boolean {
    return binding.adapter === clipPlanAdapter
  }

  override outputsPerJob(_binding: EngineBinding): OutputsPerJob {
    return "all"
  }

  override submitLimitMs(): number {
    return RouterClipPlanTurn.timeoutMs * (RouterClipPlanTurn.maxRetries + 1)
  }

  override creditsOf(cost: Cost): number {
    return creditsOfCost(cost)
  }

  override async submit(request: EngineRequest): Promise<EngineSubmission> {
    const answer = await this.turn.ask(
      await this.inputOf(request),
      request.idempotencyKey
    )
    return {
      ref: `${clipPlanAdapter}|${request.idempotencyKey}`,
      models: [clipPlanModel],
      workflowHash: null,
      finished: { outputs: [outputOf(answer)], cost: answer.cost },
    }
  }

  override async read(_ref: string): Promise<EngineStatus> {
    return { state: "succeeded" }
  }

  override async listOutputs(ref: string): Promise<EngineOutput[]> {
    throw new RunFailedError({ cause: `the plan ${ref} kept its output` })
  }

  override async cancel(_ref: string): Promise<void> {
    return
  }

  override checksKey(): boolean {
    return false
  }

  override async checkKey(): Promise<KeyCheck> {
    return "valid"
  }

  private async inputOf(request: EngineRequest): Promise<ClipPlanInput> {
    const sentence = request.inputs[clipPlanInputs.sentence]
    return {
      frames: await this.framesOf(request),
      photos: filesOf(request, clipPlanInputs.photos).map(imageOf),
      sentence: typeof sentence === "string" ? sentence : "",
    }
  }

  private async framesOf(request: EngineRequest): Promise<PlanImage[]> {
    const given = filesOf(request, clipPlanInputs.frames)
    if (given.length > 0) {
      return given.map(imageOf)
    }
    const [clip] = filesOf(request, clipPlanInputs.clip)
    if (clip === undefined || this.frames === null) {
      throw new ClipPlanUnreadableError({ cause: "no frames of the clip" })
    }
    return this.frames.framesOf(clip)
  }
}
