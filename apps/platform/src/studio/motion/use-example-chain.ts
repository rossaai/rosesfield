import {
  EndKeyLoopHandler,
  type EndKeySteps,
  exampleEndKeySteps,
  type LibraryExample,
} from "@rosesfield/catalog/motion"
import type { Run } from "@rosesfield/contract"
import { assetIdFormat } from "@rosesfield/kernel"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"
import { GatewayRunChain } from "@/api/gateway-run-chain"
import { GatewayStepPricer } from "@/api/gateway-step-pricer"
import { settingsQuery } from "@/api/queries"
import { t, tCatalog } from "@/copy/t"
import { storeRun } from "@/pieces/run/run-actions"
import { listOf } from "@/screens/app/fields/field-props"
import type { AppForm } from "@/screens/app/use-app-form"
import { amountOf, type StartRun } from "@/screens/app/use-start-run"

type OutputId = Parameters<EndKeySteps["restore"]>[0]

export type ChainStage =
  | { stage: "idle" }
  | { stage: "drafting" }
  | { stage: "makeFinal"; draft: Run; frame: OutputId }
  | { stage: "restoring"; draft: Run }
  | { stage: "renderFinal"; draft: Run; endKey: OutputId }
  | { stage: "finishing" }

export type StepPrice = { credits: number | null; kept: boolean }

const pricer = new GatewayStepPricer()

function loopOf(onRun: (run: Run) => void): EndKeyLoopHandler {
  return new EndKeyLoopHandler({
    chain: new GatewayRunChain({
      wait: (ms) => new Promise((done) => setTimeout(done, ms)),
      onRun,
    }),
    prices: pricer,
  })
}

async function creditsOf(step: ReturnType<EndKeySteps["restore"]>) {
  const { price } = await pricer.execute({
    appId: step.appId,
    inputs: step.request.inputs,
    aspectRatio: step.request.aspectRatio,
  })
  return price.credits
}

/** The final's price: the person's own measured run, or the example's own measured run at the same resolution until one exists. */
export function finalPriceOf(
  measured: number | null,
  example: LibraryExample,
  resolution: string
): StepPrice {
  if (measured !== null) {
    return { credits: measured, kept: false }
  }
  const { preview } = example
  return preview !== null && preview.resolution === resolution
    ? { credits: preview.credits, kept: true }
    : { credits: null, kept: false }
}

async function stagePriceOf(
  chain: ChainStage,
  steps: EndKeySteps,
  example: LibraryExample,
  resolution: string
): Promise<StepPrice> {
  switch (chain.stage) {
    case "idle":
      return { credits: await creditsOf(steps.draft), kept: false }
    case "makeFinal": {
      const [restore, final] = await Promise.all([
        creditsOf(steps.restore(chain.frame)),
        creditsOf(steps.final(chain.draft, chain.frame)),
      ])
      const priced = finalPriceOf(final, example, resolution)
      return restore === null || priced.credits === null
        ? { credits: null, kept: false }
        : { credits: restore + priced.credits, kept: priced.kept }
    }
    case "renderFinal": {
      const final = await creditsOf(steps.final(chain.draft, chain.endKey))
      return finalPriceOf(final, example, resolution)
    }
    default:
      return { credits: null, kept: false }
  }
}

const labelKeys = {
  idle: "run.generate",
  makeFinal: "motion.chain.makeFinal",
  renderFinal: "motion.chain.renderFinal",
} as const

function labelOf(chain: ChainStage, resolution: string): string {
  switch (chain.stage) {
    case "makeFinal":
    case "restoring":
      return tCatalog(labelKeys.makeFinal)
    case "renderFinal":
    case "finishing":
      return tCatalog(labelKeys.renderFinal, { resolution })
    default:
      return t(labelKeys.idle)
  }
}

function priceWordsOf(
  label: string,
  price: StepPrice,
  resolution: string
): Pick<StartRun, "priceValue" | "priceName"> {
  const amount = amountOf(price.credits)
  if (amount === null) {
    return { priceValue: null, priceName: null }
  }
  const words = price.kept
    ? t("run.price.kept", { amount, resolution })
    : t("run.price.credits", { amount })
  return { priceValue: amount, priceName: `${label}, ${words}` }
}

export type ExampleChain = {
  stage: ChainStage
  start: StartRun
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

const noPrice: StepPrice = { credits: null, kept: false }

function useStagePrice(
  chain: ChainStage,
  steps: EndKeySteps | null,
  example: LibraryExample | null,
  resolution: string
): StepPrice {
  const settings = useQuery(settingsQuery)
  const isDemo = settings.data?.engine.origin === "demo"
  const [price, setPrice] = useState<StepPrice>(noPrice)
  useEffect(() => {
    if (steps === null || example === null || isDemo) {
      setPrice(noPrice)
      return
    }
    let isCurrent = true
    void stagePriceOf(chain, steps, example, resolution)
      .then((next) => isCurrent && setPrice(next))
      .catch(() => isCurrent && setPrice(noPrice))
    return () => {
      isCurrent = false
    }
  }, [chain, steps, example, resolution, isDemo])
  return price
}

type Advance = {
  loop: EndKeyLoopHandler
  steps: EndKeySteps
  key: string
  chain: ChainStage
  setChain: (next: ChainStage) => void
  fail: (cause: unknown) => void
  renew: () => void
}

function advance(go: Advance): void {
  const { loop, steps, key, chain, setChain, fail } = go
  switch (chain.stage) {
    case "idle":
      setChain({ stage: "drafting" })
      void loop
        .draft({ steps, key })
        .then((made) =>
          setChain(
            made.frame === null
              ? { stage: "idle" }
              : { stage: "makeFinal", draft: made.draft, frame: made.frame }
          )
        )
        .catch(fail)
      return
    case "makeFinal":
      setChain({ stage: "restoring", draft: chain.draft })
      void loop
        .restore({ steps, key, draft: chain.draft, answer: "yes" })
        .then((restored) =>
          setChain(
            restored.status === "restored"
              ? {
                  stage: "renderFinal",
                  draft: chain.draft,
                  endKey: restored.endKey,
                }
              : { stage: "idle" }
          )
        )
        .catch(fail)
      return
    case "renderFinal":
      setChain({ stage: "finishing" })
      void loop
        .final({
          steps,
          key,
          draft: chain.draft,
          endKey: chain.endKey,
          answer: "yes",
        })
        .then(go.renew)
        .catch(fail)
      return
    default:
      return
  }
}

const busyStages: readonly ChainStage["stage"][] = [
  "drafting",
  "restoring",
  "finishing",
]

export function useExampleChain(
  example: LibraryExample | null,
  form: AppForm
): ExampleChain | null {
  const client = useQueryClient()
  const settings = useQuery(settingsQuery)
  const [chain, setChain] = useState<ChainStage>({ stage: "idle" })
  const [error, setError] = useState<Error | null>(null)
  const [key, setKey] = useState(() => crypto.randomUUID())
  const steps = useSteps(example, form)
  const resolution = String(form.values.inputs.resolution ?? "720p")
  const price = useStagePrice(chain, steps, example, resolution)
  const loop = useMemo(() => loopOf((run) => storeRun(client, run)), [client])
  if (example === null || example.guide === null) {
    return null
  }
  const renew = (): void => {
    setChain({ stage: "idle" })
    setKey(crypto.randomUUID())
  }
  const fail = (cause: unknown): void => {
    setError(cause instanceof Error ? cause : new Error(String(cause)))
    setChain({ stage: "idle" })
  }
  const label = labelOf(chain, resolution)
  return {
    stage: chain,
    start: {
      generate: () => {
        setError(null)
        if (steps === null) {
          form.validate()
          return
        }
        advance({ loop, steps, key, chain, setChain, fail, renew })
      },
      isPending: busyStages.includes(chain.stage),
      error,
      price: settings.data?.engine.origin === "demo" ? t("run.price.demo") : "",
      label,
      ...priceWordsOf(label, price, resolution),
    },
    startOver: renew,
  }
}
