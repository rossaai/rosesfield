import type {
  ChainLead,
  EndKeyLoopHandler,
  EndKeySteps,
} from "@rosesfield/catalog/motion"
import type { Run } from "@rosesfield/contract"
import { RunStoppedError } from "@/api/run-stopped.error"
import type { ChainStage } from "@/studio/motion/chain-stage"

/** One press of the chain's button: what it runs, under which key, and where each result goes. */
export type Advance = {
  loop: EndKeyLoopHandler
  steps: EndKeySteps | null
  lead: (() => Promise<ChainLead>) | null
  key: string
  isLive: () => boolean
  setChain: (next: ChainStage) => void
  onLed: (steps: EndKeySteps, lead: ChainLead) => void
  onDrafted: (draft: Run) => void
  fail: (cause: unknown) => void
  done: () => void
}

function stoppedOf(step: string, run: Run | null): RunStoppedError {
  return new RunStoppedError({ step, code: run?.failure?.code ?? null })
}

function failOn(go: Advance): (cause: unknown) => void {
  return (cause) => {
    if (go.isLive()) {
      go.fail(cause)
    }
  }
}

/** The steps the draft runs: an example's own, or those your own video's lead makes after it runs held. */
async function draftStepsOf(go: Advance): Promise<EndKeySteps | null> {
  if (go.lead === null) {
    return go.steps
  }
  const lead = await go.lead()
  if (!go.isLive()) {
    return null
  }
  const led = await go.loop.lead({ lead, key: go.key })
  if (led.status === "stopped") {
    throw stoppedOf(led.at, led.run)
  }
  if (go.isLive()) {
    go.onLed(led.steps, lead)
  }
  return led.steps
}

function draftOf(go: Advance): void {
  go.setChain({ stage: "drafting" })
  void draftStepsOf(go)
    .then(async (steps) => {
      if (steps === null || !go.isLive()) {
        return
      }
      const made = await go.loop.draft({ steps, key: go.key })
      if (!go.isLive()) {
        return
      }
      if (made.frame === null) {
        go.fail(stoppedOf("draft", made.draft))
        return
      }
      go.onDrafted(made.draft)
      go.setChain({ stage: "makeFinal", draft: made.draft, frame: made.frame })
    })
    .catch(failOn(go))
}

function restoreOf(go: Advance, steps: EndKeySteps, draft: Run): void {
  go.setChain({ stage: "restoring", draft })
  void go.loop
    .restore({ steps, key: go.key, draft, answer: "yes" })
    .then((restored) => {
      if (!go.isLive()) {
        return
      }
      if (restored.status !== "restored") {
        go.fail(
          stoppedOf(
            "restore",
            restored.status === "stopped" ? restored.run : null
          )
        )
        return
      }
      go.setChain({ stage: "renderFinal", draft, endKey: restored.endKey })
    })
    .catch(failOn(go))
}

function finalOf(
  go: Advance,
  steps: EndKeySteps,
  chain: Extract<ChainStage, { stage: "renderFinal" }>
): void {
  go.setChain({ stage: "finishing" })
  void go.loop
    .final({
      steps,
      key: go.key,
      draft: chain.draft,
      endKey: chain.endKey,
      answer: "yes",
    })
    .then((ended) => {
      if (!go.isLive()) {
        return
      }
      if (ended.status === "done") {
        go.done()
        return
      }
      go.fail(stoppedOf("final", ended.status === "stopped" ? ended.run : null))
    })
    .catch(failOn(go))
}

/** Runs the next step of the chain from the stage it stands at. */
export function advance(go: Advance, chain: ChainStage): void {
  if (chain.stage === "idle") {
    draftOf(go)
    return
  }
  const { steps } = go
  if (steps === null) {
    return
  }
  switch (chain.stage) {
    case "makeFinal":
      restoreOf(go, steps, chain.draft)
      return
    case "renderFinal":
      finalOf(go, steps, chain)
      return
    default:
      return
  }
}
