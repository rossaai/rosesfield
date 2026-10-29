import type { Run } from "@rosesfield/contract"
import type { EndKeyChain } from "#domain/end-key-chain.port"
import type { EndKeySteps, OutputId, StepRun } from "#domain/end-key-steps"
import { DraftNotReadyError } from "#domain/error/draft-not-ready.error"
import { type RunPrice, unknownPrice } from "#domain/generation-engine.port"

export type EndKeyStage = "draft" | "restore" | "final"

export type EndKeyAnswer = "yes" | "not-yet"

export type StepPricer = {
  execute(input: {
    appId: string
    inputs: StepRun["request"]["inputs"]
    aspectRatio?: string | null
  }): Promise<{ price: RunPrice }>
}

export type EndKeyDraftInput = {
  steps: EndKeySteps
  key: string
}

export type EndKeyDraftOutput = {
  draft: Run
  frame: OutputId | null
  awaits: "yes" | null
}

export type EndKeyFinalInput = {
  steps: EndKeySteps
  key: string
  draft: Run
  answer: EndKeyAnswer
}

export type EndKeyFinalOutput =
  | { status: "waiting" }
  | { status: "stopped"; at: "restore" | "final"; run: Run }
  | { status: "done"; restore: Run; final: Run }

type EndKeyLoopHandlerOptions = {
  chain: EndKeyChain
  prices: StepPricer
}

export class EndKeyLoopHandler {
  static readonly stepSuffix: Readonly<Record<EndKeyStage, string>> = {
    draft: "-draft",
    restore: "-restore",
    final: "-final",
  }

  private readonly chain: EndKeyChain
  private readonly prices: StepPricer

  constructor(options: EndKeyLoopHandlerOptions) {
    this.chain = options.chain
    this.prices = options.prices
  }

  static keyOf(key: string, stage: EndKeyStage): string {
    return `${key}${EndKeyLoopHandler.stepSuffix[stage]}`
  }

  async draft(input: EndKeyDraftInput): Promise<EndKeyDraftOutput> {
    const draft = await this.run(input.steps.draft, input.key, "draft")
    const frame = await this.frameOf(draft)
    return { draft, frame, awaits: frame === null ? null : "yes" }
  }

  async final(input: EndKeyFinalInput): Promise<EndKeyFinalOutput> {
    if (input.answer !== "yes") {
      return { status: "waiting" }
    }
    const frame = await this.readyFrameOf(input.draft)
    const restore = await this.run(
      input.steps.restore(frame),
      input.key,
      "restore"
    )
    const [endKey] = restore.outputs
    if (restore.status !== "done" || endKey === undefined) {
      return { status: "stopped", at: "restore", run: restore }
    }
    const final = await this.run(
      input.steps.final(input.draft, endKey),
      input.key,
      "final"
    )
    return final.status === "done"
      ? { status: "done", restore, final }
      : { status: "stopped", at: "final", run: final }
  }

  async priceDraft(steps: EndKeySteps): Promise<RunPrice> {
    return this.priceOf(steps.draft)
  }

  async priceFinal(steps: EndKeySteps, draft: Run): Promise<RunPrice> {
    const frame = await this.readyFrameOf(draft)
    const prices = await Promise.all([
      this.priceOf(steps.restore(frame)),
      this.priceOf(steps.final(draft, frame)),
    ])
    return sumOf(prices)
  }

  private async run(
    step: StepRun,
    key: string,
    stage: EndKeyStage
  ): Promise<Run> {
    const started = await this.chain.start(
      step.appId,
      step.request,
      EndKeyLoopHandler.keyOf(key, stage)
    )
    return this.chain.settle(started)
  }

  private async priceOf(step: StepRun): Promise<RunPrice> {
    const { price } = await this.prices.execute({
      appId: step.appId,
      inputs: step.request.inputs,
      aspectRatio: step.request.aspectRatio,
    })
    return price
  }

  private async frameOf(draft: Run): Promise<OutputId | null> {
    if (draft.status !== "done") {
      return null
    }
    const kinds = await Promise.all(
      draft.outputs.map((id) => this.chain.kindOf(id))
    )
    const at = kinds.indexOf("image")
    return at === -1 ? null : (draft.outputs[at] ?? null)
  }

  private async readyFrameOf(draft: Run): Promise<OutputId> {
    const frame = await this.frameOf(draft)
    if (frame === null) {
      throw new DraftNotReadyError({ runId: draft.id })
    }
    return frame
  }
}

function sumOf(prices: readonly RunPrice[]): RunPrice {
  let credits = 0
  let measured = true
  for (const price of prices) {
    if (price.credits === null) {
      return unknownPrice
    }
    credits += price.credits
    measured = measured && price.source === "measured"
  }
  return { source: measured ? "measured" : "estimate", credits }
}
