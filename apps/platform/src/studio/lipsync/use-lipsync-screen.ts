import type { ModelField } from "@rosesfield/catalog/comfy"
import type { AppListing, Run } from "@rosesfield/contract"
import {
  type KeyboardEvent,
  type RefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useAppRuns } from "@/screens/app/app-canvas"
import { heldProblemsOf, valuesFromRun } from "@/screens/app/app-form"
import { textOf } from "@/screens/app/fields/field-props"
import { modelInputName } from "@/screens/app/hosted/hosted-form"
import {
  type HostedState,
  useHostedModel,
} from "@/screens/app/hosted/use-hosted-model"
import { usePriceRefresh } from "@/screens/app/hosted/use-price-refresh"
import {
  type AppForm,
  type FormCheck,
  useAppForm,
} from "@/screens/app/use-app-form"
import type { AppSeeds } from "@/screens/app/use-app-screen"
import { type StartRun, useStartRun } from "@/screens/app/use-start-run"
import type { MediaFacts } from "@/studio/lipsync/lipsync-checks"
import {
  fieldsOfModel,
  guardedStart,
  type Inputs,
  pricedStart,
  type RunParts,
  runPartsOf,
  withAppModel,
} from "@/studio/lipsync/lipsync-run"
import {
  defaultsOfTab,
  faceOf,
  type LipFields,
  type LipsyncTab,
  lengthStepOf,
  modelsOfTab,
  tabOfInputs,
} from "@/studio/lipsync/lipsync-tabs"
import {
  lipsyncProblems,
  modesOf,
  planOf,
  type WordsMode,
  type WordsPlan,
  wordsOfInputs,
} from "@/studio/lipsync/lipsync-words"
import { chainTargetOf, useChainRun } from "@/studio/lipsync/use-chain-run"
import {
  type LipsyncTabs,
  useLipsyncTabs,
  useTabFit,
} from "@/studio/lipsync/use-lipsync-tabs"
import {
  useLipCredits,
  useSpeechCredits,
  useVoices,
  type Voices,
} from "@/studio/lipsync/use-lipsync-voices"
import {
  type LipsyncWells,
  useLipsyncWells,
} from "@/studio/lipsync/use-lipsync-wells"

export type LipsyncScreen = {
  app: AppListing
  bodyApp: AppListing
  form: AppForm
  start: StartRun
  tab: LipsyncTab
  setTab: (tab: LipsyncTab) => void
  plan: WordsPlan
  modes: readonly WordsMode[]
  setWords: (mode: WordsMode) => void
  fields: LipFields | null
  face: ModelField | null
  isGraph: boolean
  hosted: HostedState
  voices: HostedState
  wellProblems: LipsyncWells["problems"]
  audio: MediaFacts | null
  lastSeed: number | null
  useInputs: (run: Run) => void
  registerWell: (name: string, focus: () => void) => void
  onShortcut: (event: KeyboardEvent<HTMLElement>) => void
}

type LipsyncRun = {
  parts: RunParts
  face: ModelField | null
  start: StartRun
  wells: LipsyncWells
  voices: HostedState
  registerWell: (name: string, focus: () => void) => void
}

type RunOptions = {
  app: AppListing
  form: AppForm
  all: HostedState
  check: RefObject<FormCheck | null>
  tab: LipsyncTab
  plan: WordsPlan
  fields: LipFields | null
  onStarted: () => void
}

function checkOf(
  options: RunOptions,
  parts: RunParts,
  face: ModelField | null
): FormCheck {
  const { app, plan } = options
  const fields = parts.runFields
  return fields === null
    ? (values) => heldProblemsOf(app, values)
    : (values) =>
        lipsyncProblems({ fields, face: face?.name ?? null, plan, values })
}

function useChainedStart(
  options: RunOptions,
  parts: RunParts,
  voices: Voices
): StartRun {
  const { app, form, all, plan, fields } = options
  const started = useStartRun(
    parts.bodyApp,
    form,
    options.onStarted,
    parts.runHosted
  )
  const chained = useChainRun({
    form,
    voices: voices.hosted.models,
    target: chainTargetOf({ appId: app.id, fields, chosen: all.chosen }),
    ask: parts.ask,
    onStarted: options.onStarted,
  })
  return plan.isChain ? { ...started, ...chained } : started
}

function usePricedRun(
  options: RunOptions,
  parts: RunParts,
  voices: Voices
): StartRun {
  const { app, form, all, plan } = options
  const started = useChainedStart(options, parts, voices)
  const lip = useLipCredits({
    appId: app.id,
    ask: plan.isChain ? parts.ask : null,
    keyState: all.keyState,
  })
  const speech = useSpeechCredits({
    voices,
    text: plan.field === null ? "" : textOf(form.values.inputs[plan.field]),
    isChain: plan.isChain,
  })
  return pricedStart(started, lip, speech, plan.isChain)
}

function useLipsyncRun(options: RunOptions): LipsyncRun {
  const { app, form, all, tab, plan, fields } = options
  const voices = useVoices({
    appId: app.id,
    lipsync: all,
    form,
    isChain: plan.isChain,
  })
  const parts = runPartsOf({
    app,
    all,
    fields,
    tab,
    plan,
    voices: voices.hosted.models.map((model) => model.id),
    values: form.values,
  })
  const face = faceOf(fields, tab)
  options.check.current = checkOf(options, parts, face)
  const priced = usePricedRun(options, parts, voices)
  const audio = plan.mode === "audio" ? (fields?.audio?.name ?? null) : null
  const limit = fields?.limit ?? null
  const length = plan.mode === "audio" ? (fields?.length ?? null) : null
  const isGraph = all.chosen?.kind === "graph"
  const wells = useLipsyncWells({
    form,
    app,
    face: { name: face?.name ?? null, kind: tab, limit },
    audio: { name: audio, kind: "audio", limit },
    length,
    lengthStep: lengthStepOf(app, length, isGraph),
    isGraph,
  })
  const focusers = useRef(new Map<string, () => void>())
  return {
    parts,
    face,
    wells,
    voices: voices.hosted,
    start: guardedStart({
      started: priced,
      form,
      wells: [face?.name ?? null, audio],
      isWaiting: wells.isWaiting,
      focus: (name) => focusers.current.get(name)?.(),
    }),
    registerWell: (name, focus) => {
      focusers.current.set(name, focus)
    },
  }
}

function useRestore(
  all: HostedState,
  form: AppForm,
  restore: (inputs: Inputs) => void
): void {
  const done = useRef(false)
  const hold = useRef(restore)
  hold.current = restore
  useEffect(() => {
    if (done.current || form.source !== "seed" || all.isLoading) {
      return
    }
    done.current = true
    hold.current(form.values.inputs)
  })
}

type Words = {
  mode: WordsMode
  setMode: (mode: WordsMode) => void
  restore: (inputs: Inputs) => void
}

function useWords(
  app: AppListing,
  all: HostedState,
  form: AppForm,
  tabs: LipsyncTabs
): Words {
  const [mode, setMode] = useState<WordsMode>("audio")
  const restore = (inputs: Inputs): void => {
    const model =
      all.models.find((one) => one.id === inputs[modelInputName]) ?? null
    const restored = fieldsOfModel(model, app)
    tabs.setTabState(tabOfInputs(inputs, restored))
    setMode(wordsOfInputs(inputs, restored))
  }
  useRestore(all, form, restore)
  return { mode, setMode, restore }
}

function tabHostedOf(
  app: AppListing,
  all: HostedState,
  tabs: LipsyncTabs
): HostedState {
  const listed = modelsOfTab(all.models, tabs.tab, app)
  return {
    ...all,
    models: listed,
    defaultModel: defaultsOfTab(tabs.tab, all.defaultModel)[0] ?? null,
    choose: tabs.choose,
  }
}

export function useLipsyncScreen(
  app: AppListing,
  seeds: AppSeeds,
  onStarted: () => void
): LipsyncScreen {
  const check = useRef<FormCheck | null>(null)
  const form = useAppForm(app, seeds, check)
  const runs = useAppRuns(app)
  const all = withAppModel(app, useHostedModel(app, form))
  usePriceRefresh(app.id, runs.runs)
  const tabs = useLipsyncTabs(app, all, form)
  const words = useWords(app, all, form, tabs)
  const chosen = all.chosen
  const fields = useMemo(() => fieldsOfModel(chosen, app), [chosen, app])
  const plan = planOf(words.mode, fields)
  const options = { app, form, all, check, plan, fields, onStarted }
  const run = useLipsyncRun({ ...options, tab: tabs.tab })
  useTabFit(app, all, tabs.tab, tabs.choose)
  return {
    app,
    bodyApp: run.parts.bodyApp,
    form,
    start: run.start,
    tab: tabs.tab,
    setTab: tabs.setTab,
    plan,
    modes: modesOf(fields),
    setWords: words.setMode,
    fields,
    face: run.face,
    isGraph: chosen?.kind === "graph",
    hosted: tabHostedOf(app, all, tabs),
    voices: run.voices,
    wellProblems: run.wells.problems,
    audio: run.wells.audio,
    lastSeed: runs.runs.find((one) => one.seed !== null)?.seed ?? null,
    useInputs: (one) => {
      form.fill(valuesFromRun(app, one))
      words.restore(one.inputs)
    },
    registerWell: run.registerWell,
    onShortcut: (event) => {
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        run.start.generate()
      }
    },
  }
}
