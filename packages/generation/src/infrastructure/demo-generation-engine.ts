import type { AssetKind, EngineBinding, KeyCheck } from "@rosesfield/contract"
import { AspectRatio, type Clock } from "@rosesfield/kernel"
import { RunFailedError } from "#domain/error/run-failed.error"
import {
  type EngineOutput,
  type EngineRequest,
  type EngineStatus,
  type EngineSubmission,
  GenerationEngine,
  type OutputsPerJob,
  type Pause,
  type PriceRequest,
  pauseOn,
  type RunPrice,
  unknownPrice,
} from "#domain/generation-engine.port"
import { writeFlatMp4 } from "#infrastructure/demo/flat-mp4"
import { writeFlatPng } from "#infrastructure/demo/flat-png"
import { writeSilentWav } from "#infrastructure/demo/silent-wav"
import { type Timer, TimerJobRunner } from "#infrastructure/timer-job-runner"

type DemoGenerationEngineOptions = {
  clock: Clock
  rates?: GenerationEngine
  timer?: Timer
}

type DemoRun = {
  submittedAt: number
  kind: AssetKind
  width: number
  height: number
  count: number
}

export class DemoGenerationEngine extends GenerationEngine {
  static readonly delayMs = 3000
  static readonly frameMs = 250
  static readonly imageSide = 1024
  static readonly videoSide = 640
  static readonly seconds = 2
  static readonly sampleRate = 24_000
  static readonly gray = 128
  static readonly refPattern: RegExp =
    /^demo:(\d+):(image|video|audio|text):(\d+)x(\d+):(\d+)$/

  override readonly key = "demo"
  override readonly origin = "demo"
  override readonly idempotency = "keyed"

  private readonly clock: Clock
  private readonly rates: GenerationEngine | null
  private readonly pause: Pause

  constructor(options: DemoGenerationEngineOptions) {
    super()
    this.clock = options.clock
    this.rates = options.rates ?? null
    this.pause = pauseOn((options.timer ?? TimerJobRunner.systemTimer).after)
  }

  override canRun(_binding: EngineBinding): boolean {
    return true
  }

  override outputsPerJob(_binding: EngineBinding): OutputsPerJob {
    return "all"
  }

  override async priceOf(
    binding: EngineBinding,
    request: PriceRequest
  ): Promise<RunPrice> {
    if (this.rates === null || (await this.rates.formOf(binding)) === null) {
      return unknownPrice
    }
    return this.rates.priceOf(binding, request)
  }

  override submitLimitMs(): number {
    return 0
  }

  override async submit(request: EngineRequest): Promise<EngineSubmission> {
    const side =
      request.outputKind === "video"
        ? DemoGenerationEngine.videoSide
        : DemoGenerationEngine.imageSide
    const { width, height } = sizeOf(request.aspectRatio, side)
    const now = this.clock.now().getTime()
    return {
      ref: `demo:${now}:${request.outputKind}:${width}x${height}:${request.count}`,
      models: [],
      workflowHash: null,
    }
  }

  override async read(ref: string): Promise<EngineStatus> {
    const run = parseRef(ref)
    const elapsed = this.clock.now().getTime() - run.submittedAt
    if (elapsed >= DemoGenerationEngine.delayMs) {
      return { state: "succeeded" }
    }
    const progress = Math.max(0, elapsed) / DemoGenerationEngine.delayMs
    return {
      state: progress < 0.5 ? "queued" : "running",
      progress: progress < 0.5 ? null : progress,
      retryAfterSeconds: 1,
    }
  }

  override watch(
    ref: string,
    signal: AbortSignal
  ): AsyncGenerator<EngineStatus, void, void> {
    return this.readEvery(ref, {
      everyMs: DemoGenerationEngine.frameMs,
      pause: this.pause,
      signal,
    })
  }

  override async listOutputs(ref: string): Promise<EngineOutput[]> {
    const run = parseRef(ref)
    const output = await outputOf(run)
    return Array.from({ length: run.count }, () => ({
      ...output,
      bytes: new Uint8Array(output.bytes),
    }))
  }

  override async cancel(ref: string): Promise<void> {
    parseRef(ref)
  }

  override async checkKey(): Promise<KeyCheck> {
    return "valid"
  }
}

function parseRef(ref: string): DemoRun {
  const match = DemoGenerationEngine.refPattern.exec(ref)
  const kind = match?.[2]
  if (
    match === null ||
    (kind !== "image" &&
      kind !== "video" &&
      kind !== "audio" &&
      kind !== "text")
  ) {
    throw new RunFailedError({ cause: ref })
  }
  return {
    submittedAt: Number(match[1]),
    kind,
    width: Number(match[3]),
    height: Number(match[4]),
    count: Number(match[5]),
  }
}

function sizeOf(
  aspectRatio: string | null,
  side: number
): { width: number; height: number } {
  const ratio = AspectRatio.parse(aspectRatio ?? "1:1")
  const even = (value: number): number => Math.max(2, Math.round(value / 2) * 2)
  return ratio.width >= ratio.height
    ? { width: side, height: even((side * ratio.height) / ratio.width) }
    : { width: even((side * ratio.width) / ratio.height), height: side }
}

async function outputOf(run: DemoRun): Promise<EngineOutput> {
  const { width, height } = run
  switch (run.kind) {
    case "image":
      return {
        kind: "image",
        mime: "image/png",
        bytes: await writeFlatPng({
          width,
          height,
          gray: DemoGenerationEngine.gray,
        }),
        width,
        height,
        durationSeconds: null,
      }
    case "video":
      return {
        kind: "video",
        mime: "video/mp4",
        bytes: writeFlatMp4({
          width,
          height,
          seconds: DemoGenerationEngine.seconds,
        }),
        width,
        height,
        durationSeconds: DemoGenerationEngine.seconds,
      }
    case "audio":
      return {
        kind: "audio",
        mime: "audio/wav",
        bytes: writeSilentWav({
          seconds: DemoGenerationEngine.seconds,
          sampleRate: DemoGenerationEngine.sampleRate,
        }),
        width: null,
        height: null,
        durationSeconds: DemoGenerationEngine.seconds,
      }
    case "text":
      return {
        kind: "text",
        mime: "text/plain",
        bytes: new Uint8Array(0),
        width: null,
        height: null,
        durationSeconds: null,
      }
  }
}
