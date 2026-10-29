import {
  EndKeyLoopHandler,
  type EndKeySteps,
  exampleEndKeySteps,
  type LibraryExample,
} from "@rosesfield/catalog/motion"
import type { Run } from "@rosesfield/contract"
import { assetIdFormat } from "@rosesfield/kernel"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useRef, useState } from "react"
import { GatewayRunChain } from "@/api/gateway-run-chain"
import { settingsQuery } from "@/api/queries"
import { RunStoppedError } from "@/api/run-stopped.error"
import { t } from "@/copy/t"
import { storeRun } from "@/pieces/run/run-actions"
import { listOf } from "@/screens/app/fields/field-props"
import type { AppForm } from "@/screens/app/use-app-form"
import type { StartRun } from "@/screens/app/use-start-run"
import {
  chainPricer,
  priceNoteOf,
  priceWordsOf,
  useStagePrice,
} from "@/studio/motion/example-chain-price"
import {
  busyStages,
  type ChainStage,
  labelOf,
} from "@/studio/motion/example-chain-stage"

export type { ChainStage } from "@/studio/motion/example-chain-stage"

function loopOf(onRun: (run: Run) => void): EndKeyLoopHandler {
  return new EndKeyLoopHandler({
    chain: new GatewayRunChain({
      wait: (ms) => new Promise((done) => setTimeout(done, ms)),
      onRun,
    }),
    prices: chainPricer,
  })
}

export type ExampleChain = {
  stage: ChainStage
  start: StartRun
  priceNote: string | null
  canStartOver: boolean
  startOver: () => void
}

function useSteps(
  example: LibraryExample | null,
  form: AppForm
): EndKeySteps | null {
  const [photo] = listOf(form.values.inputs.photo)
  const chosen = form.values.inputs.resolution
  const resolution = typeof chosen === "string" ? chosen : "720p"
  return useMemo(
    () =>
      example === null || photo === undefined || !assetIdFormat.is(photo)
        ? null
        : exampleEndKeySteps({ example, photo, resolution }),
    [example, photo, resolution]
  )
}

type Advance = {
  loop: EndKeyLoopHandler
  steps: EndKeySteps
  key: string
  isLive: () => boolean
  setChain: (next: ChainStage) => void
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

function draftOf(go: Advance): void {
  go.setChain({ stage: "drafting" })
  void go.loop
    .draft({ steps: go.steps, key: go.key })
    .then((made) => {
      if (!go.isLive()) {
        return
      }
      if (made.frame === null) {
        go.fail(stoppedOf("draft", made.draft))
        return
      }
      go.setChain({ stage: "makeFinal", draft: made.draft, frame: made.frame })
    })
    .catch(failOn(go))
}

function restoreOf(go: Advance, draft: Run): void {
  go.setChain({ stage: "restoring", draft })
  void go.loop
    .restore({ steps: go.steps, key: go.key, draft, answer: "yes" })
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
  chain: Extract<ChainStage, { stage: "renderFinal" }>
): void {
  go.setChain({ stage: "finishing" })
  void go.loop
    .final({
      steps: go.steps,
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

function advance(go: Advance, chain: ChainStage): void {
  switch (chain.stage) {
    case "idle":
      draftOf(go)
      return
    case "makeFinal":
      restoreOf(go, chain.draft)
      return
    case "renderFinal":
      finalOf(go, chain)
      return
    default:
      return
  }
}

function useChainKey(): {
  key: string
  isCurrent: (key: string) => boolean
  renew: () => void
} {
  const [key, setKey] = useState(() => crypto.randomUUID())
  const current = useRef(key)
  return {
    key,
    isCurrent: (one) => current.current === one,
    renew: () => {
      const next = crypto.randomUUID()
      current.current = next
      setKey(next)
    },
  }
}

type ChainParts = {
  chain: ChainStage
  setChain: (next: ChainStage) => void
  error: Error | null
  setError: (next: Error | null) => void
}

function useChainParts(): ChainParts {
  const [chain, setChain] = useState<ChainStage>({ stage: "idle" })
  const [error, setError] = useState<Error | null>(null)
  return { chain, setChain, error, setError }
}

export function useExampleChain(
  example: LibraryExample | null,
  form: AppForm
): ExampleChain | null {
  const client = useQueryClient()
  const settings = useQuery(settingsQuery)
  const parts = useChainParts()
  const chainKey = useChainKey()
  const steps = useSteps(example, form)
  const resolution = String(form.values.inputs.resolution ?? "720p")
  const price = useStagePrice(parts.chain, steps, example, resolution)
  const loop = useMemo(() => loopOf((run) => storeRun(client, run)), [client])
  if (example === null || example.guide === null) {
    return null
  }
  const { chain, error } = parts
  const renew = (): void => {
    chainKey.renew()
    parts.setChain({ stage: "idle" })
  }
  const label = labelOf(chain, resolution)
  const note = priceNoteOf(price, example, resolution)
  const generate = (): void => {
    parts.setError(null)
    if (steps === null) {
      form.validate()
      return
    }
    const { key } = chainKey
    advance(
      {
        loop,
        steps,
        key,
        isLive: () => chainKey.isCurrent(key),
        setChain: parts.setChain,
        fail: (cause) => {
          parts.setError(
            cause instanceof Error ? cause : new Error(String(cause))
          )
          renew()
        },
        done: renew,
      },
      chain
    )
  }
  return {
    stage: chain,
    start: {
      generate,
      isPending: busyStages.includes(chain.stage),
      error,
      price: settings.data?.engine.origin === "demo" ? t("run.price.demo") : "",
      label,
      ...priceWordsOf(label, note, price),
    },
    priceNote: chain.stage === "idle" ? null : note,
    canStartOver: chain.stage !== "idle" || error !== null,
    startOver: () => {
      parts.setError(null)
      renew()
    },
  }
}
