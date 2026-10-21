import type { EngineBinding, KeyCheck } from "@rosesfield/contract"
import {
  comfyWorkflowAdapter,
  type EngineOutput,
  type EngineRequest,
  type EngineStatus,
  type EngineSubmission,
  GenerationEngine,
  type OutputsPerJob,
} from "@rosesfield/generation"

const madeBytes = Uint8Array.of(0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70)

export class FakeShotEngine extends GenerationEngine {
  override readonly key = comfyWorkflowAdapter
  override readonly origin = "live"
  override readonly idempotency = "keyed"
  readonly sent: EngineRequest[] = []
  readonly cancelled: string[] = []
  private readonly isAlone: boolean

  constructor(isAlone: boolean) {
    super()
    this.isAlone = isAlone
  }

  override canRun(binding: EngineBinding): boolean {
    return binding.adapter === comfyWorkflowAdapter
  }

  override outputsPerJob(): OutputsPerJob {
    return "one"
  }

  override submitsAlone(): boolean {
    return this.isAlone
  }

  override async submit(request: EngineRequest): Promise<EngineSubmission> {
    this.sent.push(request)
    return { ref: `job-${this.sent.length}`, models: [], workflowHash: null }
  }

  override submitLimitMs(): number {
    return 1000
  }

  override async read(): Promise<EngineStatus> {
    return { state: "succeeded", cost: { amount: 0.01, currency: "USD" } }
  }

  override async listOutputs(): Promise<EngineOutput[]> {
    return [
      {
        kind: "video",
        mime: "video/mp4",
        bytes: madeBytes,
        width: 848,
        height: 480,
        durationSeconds: 5,
      },
    ]
  }

  override async cancel(ref: string): Promise<void> {
    this.cancelled.push(ref)
  }

  override async checkKey(): Promise<KeyCheck> {
    return "valid"
  }
}
