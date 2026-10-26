import type { CatalogModel } from "@rosesfield/catalog/comfy"
import { appListing } from "@rosesfield/contract"
import { cleanup, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { t, tCatalog } from "@/copy/t"
import { defaultsOf } from "@/screens/app/app-form"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"
import { formAppFor } from "@/studio/audio/audio-modes"
import { AudioPanel, audioTabRowOf } from "@/studio/audio/audio-panel"
import type { AudioState } from "@/studio/audio/use-audio-screen"
import {
  advancedToggle,
  formOf,
  isBefore,
  modelChips,
  showColumn,
  theModelChip,
} from "../column"
import { audioListing } from "./audio-app"

const audio = audioListing()

beforeEach(() => {
  vi.stubGlobal("fetch", () => new Promise<Response>(() => undefined))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const graphHosted: HostedState = {
  isTaskApp: true,
  models: [],
  isLoading: false,
  error: null,
  keyState: "set",
  defaultModel: null,
  chosen: null,
  fields: null,
  choose: () => undefined,
}

const speechGraph: CatalogModel = {
  id: "chatterbox",
  kind: "graph",
  maker: "Resemble AI",
  name: "Chatterbox",
  nameKey: null,
  task: "speech",
  tags: [],
  form: null,
}

const speechHosted: CatalogModel = {
  ...speechGraph,
  id: "maker/speech-two",
  kind: "hosted",
  name: "Speech Two",
  tags: [{ kind: "hosted" }],
}

function stateOf(
  tab: string,
  models: readonly CatalogModel[] = []
): AudioState {
  return {
    app: audio,
    formApp: formAppFor(audio, tab),
    tab,
    setTab: () => undefined,
    choose: () => undefined,
    form: formOf({ ...defaultsOf(audio), inputs: { mode: tab } }),
    start: {
      generate: () => undefined,
      isPending: false,
      error: null,
      price: "",
    },
    hosted: { ...graphHosted, models: [...models] },
    lastSeed: null,
    lengthProblem: undefined,
    fillFromRun: () => undefined,
    onShortcut: () => undefined,
  }
}

describe("the Audio column", () => {
  it("shows the tab's words, then its length, with the count and the seed closed under Advanced, and no model chip for one model", () => {
    showColumn(<AudioPanel state={stateOf("music")} />)
    const words = screen.getByRole("textbox")
    const length = screen.getByRole("group", {
      name: tCatalog("audio.input.length.label"),
    })
    expect(isBefore(words, length)).toBe(true)
    expect(isBefore(length, advancedToggle())).toBe(true)
    expect(modelChips()).toHaveLength(0)
    expect(
      screen.queryByRole("group", { name: t("field.count.label") })
    ).toBeNull()
    expect(screen.queryByText(t("field.seed.label"))).toBeNull()
  })

  it("shows the model once, after the words, when the tab offers two models", () => {
    showColumn(
      <AudioPanel state={stateOf("speech", [speechGraph, speechHosted])} />
    )
    const words = screen.getByRole("textbox")
    expect(isBefore(words, theModelChip())).toBe(true)
  })
})

describe("the Audio tab row", () => {
  it("is drawn only for an app with two or more modes", () => {
    const one = appListing.parse({
      ...audio,
      inputs: audio.inputs.map((input) =>
        input.name === "mode" && input.type === "choice"
          ? { ...input, options: input.options.slice(0, 1) }
          : input
      ),
    })
    const view = { tab: "speech", setTab: () => undefined }
    expect(audioTabRowOf({ ...view, app: one })).toBeUndefined()
    expect(audioTabRowOf({ ...view, app: audio })).toBeDefined()
  })
})
