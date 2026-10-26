import { cleanup, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { t, tCatalog } from "@/copy/t"
import { defaultsOf } from "@/screens/app/app-form"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"
import { formAppFor } from "@/studio/audio/audio-modes"
import { AudioPanel } from "@/studio/audio/audio-panel"
import type { AudioState } from "@/studio/audio/use-audio-screen"
import {
  advancedToggle,
  formOf,
  isBefore,
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

function stateOf(tab: string): AudioState {
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
    hosted: graphHosted,
    lastSeed: null,
    lengthProblem: undefined,
    fillFromRun: () => undefined,
    onShortcut: () => undefined,
  }
}

describe("the Audio column", () => {
  it("shows the tab's words, then the model once, then its length, with the seed closed under Advanced", () => {
    showColumn(<AudioPanel state={stateOf("music")} />)
    const words = screen.getByRole("textbox")
    const model = theModelChip()
    const length = screen.getByRole("group", {
      name: tCatalog("audio.input.length.label"),
    })
    expect(isBefore(words, model)).toBe(true)
    expect(isBefore(model, length)).toBe(true)
    expect(isBefore(length, advancedToggle())).toBe(true)
    expect(screen.queryByText(t("field.seed.label"))).toBeNull()
  })
})
