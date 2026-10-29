import type { Run } from "@rosesfield/contract"
import type {
  PriceRunInput,
  PriceRunOutput,
} from "#application/price-run/price-run.handler"
import type {
  ChainLead,
  EndKeySteps,
  OutputId,
  StepRun,
} from "#domain/end-key-steps"
import { DraftNotReadyError } from "#domain/error/draft-not-ready.error"
import { type RunPrice, unknownPrice } from "#domain/generation-engine.port"
import { type RunChain, stepKeyOf } from "#domain/run-chain.port"

export type EndKeyStage = "draft" | "restore" | "final"

export type EndKeyAnswer = "yes" | "not-yet"

export type StepPricer = {
  execute(input: PriceRunInput): Promise<PriceRunOutput>
}

export type EndKeyLeadInput = {
  lead: ChainLead
  key: string
}

export type EndKeyLeadOutput =
  | { status: "stopped"; at: string; run: Run }
  | { status: "led"; steps: EndKeySteps }

export type EndKeyDraftInput = {
  steps: EndKeySteps
  key: string
}

export type EndKeyDraftOutput = {
  draft: Run
  frame: OutputId | null
  awaits: "yes" | null
}

export type EndKeyRestoreInput = EndKeyDraftInput & {
  draft: Run
  answer: EndKeyAnswer
}

export type EndKeyRestoreOutput =
  | { status: "waiting" }
  | { status: "stopped"; at: "restore"; run: Run }
  | { status: "restored"; restore: Run; endKey: OutputId; awaits: "yes" }

export type EndKeyFinalInput = EndKeyRestoreInput & {
  endKey: OutputId
}

export type EndKeyFinalOutput =
  | { status: "waiting" }
  | { status: "stopped"; at: "final"; run: Run }
  | { status: "done"; final: Run }

type EndKeyLoopHandlerOptions = {
  chain: RunChain
  prices: StepPricer
}

/** Runs a draft, and after each yes the restore of its last frame, then the final with that end key. The steps of a lead run held before the draft, and the restore runs held, so none of them reaches the library. */
export class EndKeyLoopHandler {
  private readonly chain: RunChain
  private readonly prices: StepPricer

  constructor(options: EndKeyLoopHandlerOptions) {
    this.chain = options.chain
    this.prices = options.prices
  }

  /** Runs each step of the lead in turn under its own key, and stops at the first that ends with no result. */
  async lead(input: EndKeyLeadInput): Promise<EndKeyLeadOutput> {
    const made: Run[] = []
    for (const one of input.lead.steps) {
      const step = await one.stepOf(made)
      const run = await this.run(step, input.key, one.stage)
      if (run.status !== "done") {
        return { status: "stopped", at: one.stage, run }
      }
      made.push(run)
    }
    return { status: "led", steps: await input.lead.endKeyStepsOf(made) }
  }

  async draft(input: EndKeyDraftInput): Promise<EndKeyDraftOutput> {
    const draft = await this.run(input.steps.draft, input.key, "draft")
    const frame = frameOf(input.steps, draft)
    return { draft, frame, awaits: frame === null ? null : "yes" }
  }

  async restore(input: EndKeyRestoreInput): Promise<EndKeyRestoreOutput> {
    if (input.answer !== "yes") {
      return { status: "waiting" }
    }
    const frame = readyFrameOf(input.steps, input.draft)
    const restore = await this.run(
      input.steps.restore(frame),
      input.key,
      "restore"
    )
    const endKey = restore.held?.[0]?.assetId ?? restore.outputs[0]
    if (restore.status !== "done" || endKey === undefined) {
      return { status: "stopped", at: "restore", run: restore }
    }
    return { status: "restored", restore, endKey, awaits: "yes" }
  }

  async final(input: EndKeyFinalInput): Promise<EndKeyFinalOutput> {
    if (input.answer !== "yes") {
      return { status: "waiting" }
    }
    readyFrameOf(input.steps, input.draft)
    const final = await this.run(
      input.steps.final(input.draft, input.endKey),
      input.key,
      "final"
    )
    return final.status === "done"
      ? { status: "done", final }
      : { status: "stopped", at: "final", run: final }
  }

  async priceDraft(steps: EndKeySteps): Promise<RunPrice> {
    return this.priceOf(steps.draft)
  }

  /** The price Generate shows before a lead: every step of the lead and the draft as one sum. */
  async priceLead(lead: ChainLead): Promise<RunPrice> {
    return sumOf(
      await Promise.all(lead.priced.map((step) => this.priceOf(step)))
    )
  }

  /** The price Make final shows: the restore and the final render as one sum. */
  async priceMakeFinal(steps: EndKeySteps, draft: Run): Promise<RunPrice> {
    const frame = readyFrameOf(steps, draft)
    const prices = await Promise.all([
      this.priceOf(steps.restore(frame)),
      this.priceOf(steps.final(draft, frame)),
    ])
    return sumOf(prices)
  }

  /** The price of the final render alone, shown before the second yes. */
  async priceFinal(
    steps: EndKeySteps,
    draft: Run,
    endKey: OutputId
  ): Promise<RunPrice> {
    return this.priceOf(steps.final(draft, endKey))
  }

  private async run(step: StepRun, key: string, stage: string): Promise<Run> {
    const started = await this.chain.start(
      step.appId,
      step.request,
      stepKeyOf(key, stage)
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
}

function frameOf(steps: EndKeySteps, draft: Run): OutputId | null {
  return draft.status === "done" ? steps.frameOf(draft) : null
}

function readyFrameOf(steps: EndKeySteps, draft: Run): OutputId {
  const frame = frameOf(steps, draft)
  if (frame === null) {
    throw new DraftNotReadyError({ runId: draft.id })
  }
  return frame
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
