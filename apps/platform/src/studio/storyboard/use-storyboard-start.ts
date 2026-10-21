import {
  type HostedAsk,
  type KeptKeyframe,
  type KeyframeChain,
  runKeyframes,
  type StoryboardAsk,
} from "@rosesfield/catalog/storyboard"
import type { AppListing, Run } from "@rosesfield/contract"
import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { GatewayRefusedError } from "@/api/gateway-refused.error"
import { characterQuery, settingsQuery } from "@/api/queries"
import { formatNumber } from "@/copy/format"
import { t } from "@/copy/t"
import { storeRun } from "@/pieces/run/run-actions"
import type { FormValues } from "@/screens/app/app-form"
import { priceQuery } from "@/screens/app/hosted/model-catalog-query"
import { useDebounced } from "@/screens/app/hosted/use-debounced"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"
import { randomSeed } from "@/screens/app/inputs-panel"
import type { AppForm } from "@/screens/app/use-app-form"
import type { StartRun } from "@/screens/app/use-start-run"
import { GatewaySpeechChain } from "@/studio/lipsync/gateway-speech-chain"
import { keepKeyframe } from "@/studio/storyboard/kept-keyframes"
import {
  callsCredits,
  priceAsksOf,
  storyboardAskOf,
} from "@/studio/storyboard/storyboard-model"

const priceDelayMs = 300

const seedInput = "seed"

const refusedCode = "RUN_INPUT_INVALID"

const refusedStatus = 400

const emptyAsk = { inputs: {} }

export type KeyframePress = {
  app: AppListing
  values: FormValues
  model: HostedState
  key: string
  chain: KeyframeChain
  photosOf: (characterId: string) => Promise<HostedAsk["photos"]>
  keep: (run: Run, keyframe: KeptKeyframe) => void
  onStarted: (run: Run) => void
}

function useCallsPrice(
  app: AppListing,
  ask: StoryboardAsk | null,
  keyState: string
): number | null {
  const asks = useDebounced(priceAsksOf(ask), priceDelayMs)
  const text = useQuery({
    ...priceQuery(app.id, asks.text ?? emptyAsk, keyState),
    enabled: asks.text !== null,
  })
  const edit = useQuery({
    ...priceQuery(app.id, asks.edit ?? emptyAsk, keyState),
    enabled: asks.edit !== null,
  })
  return callsCredits([
    { price: text.data?.price, calls: asks.text === null ? 0 : 1 },
    { price: edit.data?.price, calls: asks.edits },
  ])
}

export function priceCaptionOf(start: StartRun): string {
  const amount = start.priceValue ?? null
  return amount === null ? start.price : t("run.price.credits", { amount })
}

export function seededValues(values: FormValues): FormValues {
  if (values.seedMode === "fixed") {
    return values
  }
  return {
    ...values,
    seedMode: "fixed",
    inputs: { ...values.inputs, [seedInput]: randomSeed() },
  }
}

function characterOf(values: FormValues): string | null {
  const value = values.inputs.character
  const [first] = Array.isArray(value) ? value : []
  return first === undefined || first === "" ? null : first
}

export function startedOnce(options: {
  chain: KeyframeChain
  onStarted: (run: Run) => void
}): KeyframeChain {
  let isFirst = true
  return {
    start: async (appId, request, key) => {
      const run = await options.chain.start(appId, request, key)
      if (isFirst) {
        isFirst = false
        options.onStarted(run)
      }
      return run
    },
    settle: (run) => options.chain.settle(run),
  }
}

export async function pressKeyframes(
  press: KeyframePress
): Promise<(Run | null)[]> {
  const values = seededValues(press.values)
  const chosen = press.model.chosen
  const character = characterOf(values)
  const photos =
    chosen === null || chosen.form === null || character === null
      ? []
      : await press.photosOf(character)
  const ask = storyboardAskOf({ app: press.app, values, chosen, photos })
  if (ask === null) {
    throw new GatewayRefusedError({
      code: refusedCode,
      status: refusedStatus,
      retryAfterSeconds: null,
    })
  }
  return runKeyframes({
    ask,
    key: press.key,
    chain: startedOnce({ chain: press.chain, onStarted: press.onStarted }),
    keep: press.keep,
  })
}

function waitMs(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function gatewayChain(client: QueryClient): KeyframeChain {
  const inner = new GatewaySpeechChain({
    wait: waitMs,
    onRun: (run) => storeRun(client, run),
  })
  return {
    start: (appId, request, key) => inner.start(appId, request, key),
    settle: async (run) => {
      const settled = await inner.settle(run)
      storeRun(client, settled)
      return settled
    },
  }
}

export function useStoryboardStart(
  app: AppListing,
  form: AppForm,
  model: HostedState,
  onStarted: (run: Run) => void
): StartRun {
  const client = useQueryClient()
  const settings = useQuery(settingsQuery)
  const isDemo = settings.data?.engine.origin === "demo"
  const ask = storyboardAskOf({
    app,
    values: form.values,
    chosen: model.chosen,
    photos: [],
  })
  const credits = useCallsPrice(app, ask, model.keyState)
  const start = useMutation({
    mutationFn: (key: string) =>
      pressKeyframes({
        app,
        values: form.values,
        model,
        key,
        chain: gatewayChain(client),
        photosOf: async (characterId) => {
          const answer = await client.fetchQuery(characterQuery(characterId))
          return answer.character.references
        },
        keep: keepKeyframe,
        onStarted,
      }),
  })
  const amount = isDemo || credits === null ? null : formatNumber(credits)
  return {
    generate: () => {
      if (!start.isPending) {
        start.mutate(crypto.randomUUID())
      }
    },
    isPending: start.isPending,
    error: start.error,
    price: isDemo
      ? t("run.price.demo")
      : amount === null
        ? t("run.price.unknown")
        : "",
    priceValue: amount,
    priceName: amount === null ? null : t("run.generate.priced", { amount }),
  }
}
