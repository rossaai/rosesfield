import {
  type ChainLead,
  EndKeyLoopHandler,
  type EndKeySteps,
  exampleEndKeySteps,
  finalAt,
  type LibraryExample,
  ltx25GuideModel,
  type OwnVideoAsk,
  OwnVideoLead,
} from "@rosesfield/catalog/motion"
import type { Run } from "@rosesfield/contract"
import { assetIdFormat } from "@rosesfield/kernel"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useRef, useState } from "react"
import { GatewayRunChain } from "@/api/gateway-run-chain"
import { settingsQuery } from "@/api/queries"
import { ratioOfSize } from "@/catalog/app-facts"
import { t } from "@/copy/t"
import { storeRun } from "@/pieces/run/run-actions"
import { listOf } from "@/screens/app/fields/field-props"
import type { AppForm } from "@/screens/app/use-app-form"
import type { StartRun } from "@/screens/app/use-start-run"
import { advance } from "@/studio/motion/chain-advance"
import {
  chainPricer,
  priceNoteOf,
  priceWordsOf,
  useStagePrice,
} from "@/studio/motion/chain-price"
import {
  busyStages,
  type ChainStage,
  labelOf,
} from "@/studio/motion/chain-stage"
import {
  browserClipFrames,
  type ClipFramesOf,
  type FrameSize,
  gatewayHeldText,
  type HeldTextOf,
} from "@/studio/motion/clip-frames"

export type { ChainStage } from "@/studio/motion/chain-stage"

/** The photos, counted from 0, that matched nothing in your video, named under the draft they were left out of. */
export type LeftOut = { draftId: string; photos: readonly number[] }

export type MotionChain = {
  stage: ChainStage
  start: StartRun
  priceNote: string | null
  canStartOver: boolean
  startOver: () => void
  leftOut: LeftOut | null
}

export type MotionChainInput = {
  example: LibraryExample | null
  form: AppForm
  clipSize: FrameSize | null
  frames?: ClipFramesOf
  heldText?: HeldTextOf
}

const seedSpan = 2_147_483_647

function loopOf(onRun: (run: Run) => void): EndKeyLoopHandler {
  return new EndKeyLoopHandler({
    chain: new GatewayRunChain({
      wait: (ms) => new Promise((done) => setTimeout(done, ms)),
      onRun,
    }),
    prices: chainPricer,
  })
}

function resolutionOf(form: AppForm): string {
  const chosen = form.values.inputs.resolution
  return typeof chosen === "string" ? chosen : "720p"
}

function seedOf(form: AppForm): number {
  const value = form.values.inputs.seed
  if (form.values.seedMode === "fixed" && typeof value === "number") {
    return value
  }
  return (crypto.getRandomValues(new Uint32Array(1))[0] ?? 0) % seedSpan
}

function useExampleSteps(
  example: LibraryExample | null,
  form: AppForm
): EndKeySteps | null {
  const [photo] = listOf(form.values.inputs.photo)
  const resolution = resolutionOf(form)
  return useMemo(
    () =>
      example === null || photo === undefined || !assetIdFormat.is(photo)
        ? null
        : exampleEndKeySteps({ example, photo, resolution }),
    [example, photo, resolution]
  )
}

/** Says whether Generate runs your own video through the chain: no example, on the LTX 2.5 guided render. */
export function isOwnChain(
  example: LibraryExample | null,
  form: Pick<AppForm, "values">
): boolean {
  return example === null && form.values.inputs.model === ltx25GuideModel
}

type OwnAsk = Omit<OwnVideoAsk, "frames" | "seed">

function useOwnAsk(
  isOwn: boolean,
  form: AppForm,
  clipSize: FrameSize | null
): OwnAsk | null {
  const [clip = ""] = listOf(form.values.inputs.clip)
  const photos = listOf(form.values.inputs.photo).join(",")
  const scene = form.values.inputs.scene
  const sentence = typeof scene === "string" ? scene : ""
  const resolution = resolutionOf(form)
  const width = clipSize?.width ?? 0
  const height = clipSize?.height ?? 0
  return useMemo(() => {
    const ids = photos.split(",").filter(assetIdFormat.is)
    if (!isOwn || !assetIdFormat.is(clip) || ids.length === 0 || width === 0) {
      return null
    }
    return {
      clip,
      photos: ids,
      sentence,
      frameSize: { width, height },
      aspectRatio: ratioOfSize(width, height),
      resolution,
    }
  }, [isOwn, clip, photos, sentence, width, height, resolution])
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
  led: EndKeySteps | null
  setLed: (next: EndKeySteps | null) => void
  leftOut: LeftOut | null
  setLeftOut: (next: LeftOut | null) => void
}

function useChainParts(): ChainParts {
  const [chain, setChain] = useState<ChainStage>({ stage: "idle" })
  const [error, setError] = useState<Error | null>(null)
  const [led, setLed] = useState<EndKeySteps | null>(null)
  const [leftOut, setLeftOut] = useState<LeftOut | null>(null)
  return { chain, setChain, error, setError, led, setLed, leftOut, setLeftOut }
}

type Sources = {
  steps: EndKeySteps | null
  priced: ChainLead | null
  leadOf: (() => Promise<ChainLead>) | null
}

function useSources(
  input: MotionChainInput,
  parts: ChainParts,
  isOwn: boolean
): Sources {
  const { example, form, clipSize } = input
  const exampleSteps = useExampleSteps(example, form)
  const ask = useOwnAsk(isOwn, form, clipSize)
  const resolution = resolutionOf(form)
  const heldText = input.heldText ?? gatewayHeldText
  const frames = input.frames ?? browserClipFrames
  const priced = useMemo(
    () =>
      ask === null
        ? null
        : new OwnVideoLead({ ask: { ...ask, frames: [], seed: 0 }, heldText }),
    [ask, heldText]
  )
  const { led } = parts
  const steps = useMemo(
    () =>
      isOwn ? (led === null ? null : finalAt(led, resolution)) : exampleSteps,
    [isOwn, led, resolution, exampleSteps]
  )
  if (!isOwn || ask === null) {
    return { steps, priced: null, leadOf: null }
  }
  const leadOf = async (): Promise<ChainLead> =>
    new OwnVideoLead({
      ask: {
        ...ask,
        frames: (await frames(ask.clip)).filter(assetIdFormat.is),
        seed: seedOf(form),
      },
      heldText,
    })
  return {
    steps,
    priced: parts.chain.stage === "idle" ? priced : null,
    leadOf,
  }
}

function canStart(sources: Sources, chain: ChainStage): boolean {
  return chain.stage === "idle"
    ? sources.leadOf !== null || sources.steps !== null
    : sources.steps !== null
}

type Press = {
  sources: Sources
  parts: ChainParts
  chainKey: ReturnType<typeof useChainKey>
  loop: EndKeyLoopHandler
  form: AppForm
  renew: () => void
}

function pressOf(press: Press): () => void {
  const { sources, parts, chainKey, loop, form, renew } = press
  const { chain } = parts
  return () => {
    parts.setError(null)
    if (!canStart(sources, chain)) {
      form.validate()
      return
    }
    if (chain.stage === "idle") {
      parts.setLeftOut(null)
    }
    const { key } = chainKey
    let left: readonly number[] = []
    advance(
      {
        loop,
        steps: sources.steps,
        lead: chain.stage === "idle" ? sources.leadOf : null,
        key,
        isLive: () => chainKey.isCurrent(key),
        setChain: parts.setChain,
        onLed: (steps, lead) => {
          parts.setLed(steps)
          left =
            lead instanceof OwnVideoLead ? (lead.plan?.unusedPhotos ?? []) : []
        },
        onDrafted: (draft) =>
          parts.setLeftOut(
            left.length === 0 ? null : { draftId: draft.id, photos: left }
          ),
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
}

export function useMotionChain(input: MotionChainInput): MotionChain | null {
  const { example, form } = input
  const client = useQueryClient()
  const settings = useQuery(settingsQuery)
  const parts = useChainParts()
  const chainKey = useChainKey()
  const isOwn = isOwnChain(example, form)
  const sources = useSources(input, parts, isOwn)
  const resolution = resolutionOf(form)
  const price = useStagePrice(parts.chain, {
    steps: sources.steps,
    lead: sources.priced,
    example,
    resolution,
  })
  const loop = useMemo(() => loopOf((run) => storeRun(client, run)), [client])
  if (!isOwn && (example === null || example.guide === null)) {
    return null
  }
  const { chain, error } = parts
  const renew = (): void => {
    chainKey.renew()
    parts.setChain({ stage: "idle" })
    parts.setLed(null)
  }
  const label = labelOf(chain, resolution)
  const note = priceNoteOf(price, example, resolution)
  return {
    stage: chain,
    start: {
      generate: pressOf({ sources, parts, chainKey, loop, form, renew }),
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
      parts.setLeftOut(null)
      renew()
    },
    leftOut: parts.leftOut,
  }
}
