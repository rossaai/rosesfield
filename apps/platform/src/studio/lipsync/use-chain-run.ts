import { findApp } from "@rosesfield/catalog"
import type { CatalogModel } from "@rosesfield/catalog/comfy"
import {
  type ChainRun,
  type ChainTarget,
  type SpeechApp,
  SpeechChain,
  speakThenSync,
} from "@rosesfield/catalog/lipsync"
import { type Run, runInputs } from "@rosesfield/contract"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { GatewayRefusedError } from "@/api/gateway-refused.error"
import { storeRun } from "@/pieces/run/run-actions"
import type { StartRunBodyInput } from "@/screens/app/app-form"
import type { AppForm } from "@/screens/app/use-app-form"
import { GatewaySpeechChain } from "@/studio/lipsync/gateway-speech-chain"
import type { LipFields } from "@/studio/lipsync/lipsync-tabs"
import { voiceAppOf } from "@/studio/lipsync/use-lipsync-voices"

export type ChainStart = {
  generate: () => void
  isPending: boolean
  error: Error | null
}

export type ChainPress = {
  speechApp: SpeechApp | null
  voices: readonly CatalogModel[]
  target: ChainTarget | null
  ask: StartRunBodyInput | null
  key: string
  chain: SpeechChain
  onStarted: (run: Run) => void
}

const failedCode = "RUN_FAILED"

const failedStatus = 502

const refusedCode = "RUN_INPUT_INVALID"

const refusedStatus = 400

export function chainTargetOf(options: {
  appId: string
  fields: LipFields | null
  chosen: CatalogModel | null
}): ChainTarget | null {
  const audio = options.fields?.audio ?? null
  const app = findApp(options.appId)
  if (audio === null || app === null) {
    return null
  }
  const isGraph = options.chosen?.kind === "graph"
  const form = isGraph ? null : (options.chosen?.form ?? null)
  return {
    appId: options.appId,
    audio: audio.name,
    length: isGraph ? (options.fields?.length?.name ?? null) : null,
    check: {
      app,
      form:
        form === null
          ? null
          : { model: options.chosen?.id ?? "", fields: form },
    },
  }
}

function requestOf(ask: StartRunBodyInput): ChainRun | null {
  const inputs = runInputs.safeParse(ask.inputs)
  if (!inputs.success) {
    return null
  }
  return { inputs: inputs.data, aspectRatio: ask.aspectRatio ?? null }
}

function refused(code: string, status: number): GatewayRefusedError {
  return new GatewayRefusedError({ code, status, retryAfterSeconds: null })
}

class StartedChain extends SpeechChain {
  private readonly inner: SpeechChain
  private readonly onStarted: (run: Run) => void
  private isFirst = true

  constructor(options: {
    inner: SpeechChain
    onStarted: (run: Run) => void
  }) {
    super()
    this.inner = options.inner
    this.onStarted = options.onStarted
  }

  async start(appId: string, request: ChainRun, key: string): Promise<Run> {
    const run = await this.inner.start(appId, request, key)
    if (this.isFirst) {
      this.isFirst = false
      this.onStarted(run)
    }
    return run
  }

  settle(run: Run): Promise<Run> {
    return this.inner.settle(run)
  }

  secondsOf(assetId: string): Promise<number | null> {
    return this.inner.secondsOf(assetId)
  }
}

export async function pressChain(press: ChainPress): Promise<Run> {
  const { speechApp, target, ask } = press
  if (speechApp === null || target === null || ask === null) {
    throw refused(refusedCode, refusedStatus)
  }
  const request = requestOf(ask)
  if (request === null) {
    throw refused(refusedCode, refusedStatus)
  }
  const outcome = await speakThenSync({
    app: speechApp,
    voices: press.voices,
    target,
    request,
    key: press.key,
    chain: new StartedChain({
      inner: press.chain,
      onStarted: press.onStarted,
    }),
  })
  if (outcome.kind === "unplanned" || outcome.kind === "invalid") {
    throw refused(refusedCode, refusedStatus)
  }
  if (outcome.kind === "unspoken") {
    const failure = outcome.speech.failure
    throw refused(failure?.code ?? failedCode, failure?.status ?? failedStatus)
  }
  return outcome.video
}

function waitMs(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export function useChainRun(options: {
  form: AppForm
  voices: readonly CatalogModel[]
  target: ChainTarget | null
  ask: StartRunBodyInput | null
  onStarted: (run: Run) => void
}): ChainStart {
  const client = useQueryClient()
  const source = voiceAppOf()
  const start = useMutation({
    mutationFn: (key: string) =>
      pressChain({
        speechApp: source === null ? null : findApp(source),
        voices: options.voices,
        target: options.target,
        ask: options.ask,
        key,
        chain: new GatewaySpeechChain({
          wait: waitMs,
          onRun: (run) => storeRun(client, run),
        }),
        onStarted: options.onStarted,
      }),
  })
  return {
    generate: () => {
      if (start.isPending || !options.form.validate()) {
        return
      }
      start.mutate(crypto.randomUUID())
    },
    isPending: start.isPending,
    error: start.error,
  }
}
