import type { KeyCheck, RunOrigin } from "@rosesfield/contract"
import {
  type EngineOutput,
  type EngineStatus,
  type EngineSubmission,
  GenerationEngine,
  type PriceRequest,
  type RunPrice,
} from "@rosesfield/generation"

export type FakePrice = RunPrice | Error

export class FakePriceEngine extends GenerationEngine {
  override readonly key = "fake-price"
  override readonly origin: RunOrigin = "live"
  override readonly idempotency = "keyed"

  readonly priced: PriceRequest[] = []
  price: FakePrice

  constructor(options: { price: FakePrice }) {
    super()
    this.price = options.price
  }

  override canRun(): boolean {
    return true
  }

  override outputsPerJob(): "all" {
    return "all"
  }

  override async submit(): Promise<EngineSubmission> {
    throw new Error("The price engine starts no run")
  }

  override submitLimitMs(): number {
    return 0
  }

  override async read(): Promise<EngineStatus> {
    throw new Error("The price engine reads no run")
  }

  override async listOutputs(): Promise<EngineOutput[]> {
    return []
  }

  override cancel(): Promise<void> {
    return Promise.resolve()
  }

  override async checkKey(): Promise<KeyCheck> {
    return "valid"
  }

  override async priceOf(
    _binding: unknown,
    request: PriceRequest
  ): Promise<RunPrice> {
    this.priced.push(request)
    if (this.price instanceof Error) {
      throw this.price
    }
    return this.price
  }
}
