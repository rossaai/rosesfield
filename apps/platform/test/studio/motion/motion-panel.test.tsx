import { cleanup, fireEvent, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { t, tCatalog } from "@/copy/t"
import { defaultsOf } from "@/screens/app/app-form"
import { MotionPanel } from "@/studio/motion/motion-panel"
import { graphRestOf } from "@/studio/motion/motion-tabs"
import type { MotionState } from "@/studio/motion/use-motion-screen"
import {
  advancedToggle,
  formOf,
  isBefore,
  showColumn,
  theModelChip,
} from "../column"
import { catalog, graph, guide, motionListing } from "./motion-fixtures"

const app = motionListing()

beforeEach(() => {
  vi.stubGlobal("fetch", () => new Promise<Response>(() => undefined))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function graphState(): MotionState {
  return {
    app,
    tab: "move",
    mode: "clip",
    setMode: () => undefined,
    form: formOf(defaultsOf(app)),
    start: {
      generate: () => undefined,
      isPending: false,
      error: null,
      price: "",
    },
    hosted: {
      isTaskApp: true,
      models: [...catalog],
      isLoading: false,
      error: null,
      keyState: "set",
      defaultModel: graph.id,
      chosen: graph,
      fields: null,
      choose: () => undefined,
    },
    isGraph: true,
    names: { clip: "clip", photo: "photo" },
    range: null,
    checks: { clip: null, photo: null, readingInput: null },
    clipMessage: null,
    photoMessage: null,
    restFields: [],
    graphRest: graphRestOf(app),
    lastSeed: null,
    pickCharacter: () => undefined,
    registerWell: () => undefined,
    useInputs: () => undefined,
    onShortcut: () => undefined,
  }
}

describe("the Motion column", () => {
  it("shows the clip and the photo, then the model once, then the format, with the clip's sound sent on out of sight and the seed closed under Advanced", () => {
    showColumn(<MotionPanel state={graphState()} />)
    const photo = screen.getByText(tCatalog("motion.input.photo.label"))
    const model = theModelChip()
    const format = screen.getByText(t("field.aspect.label"))
    expect(
      screen.queryByRole("switch", {
        name: tCatalog("motion.input.sound.label"),
      })
    ).toBeNull()
    expect(isBefore(photo, model)).toBe(true)
    expect(isBefore(model, format)).toBe(true)
    expect(isBefore(format, advancedToggle())).toBe(true)
    expect(screen.queryByText(tCatalog("motion.input.seed.label"))).toBeNull()
  })
})

describe("Motion's two modes", () => {
  it("offers Pick a character under the photo well in Copy a clip, so you swap a character from the same column with no tab of its own", () => {
    showColumn(<MotionPanel state={graphState()} />)
    const photo = screen.getByText(tCatalog("motion.input.photo.label"))
    const pick = screen.getByRole("button", {
      name: t("field.character.pick"),
    })
    expect(isBefore(photo, pick)).toBe(true)
    expect(isBefore(pick, theModelChip())).toBe(true)
    const tabs = screen.getAllByRole("tab").map((tab) => tab.textContent)
    expect(tabs).toEqual([
      tCatalog("motion.tab.clip"),
      tCatalog("motion.tab.guide"),
    ])
    expect(
      screen
        .getByRole("tab", { name: tCatalog("motion.tab.clip") })
        .getAttribute("aria-selected")
    ).toBe("true")
  })

  it("switches to Follow a guide from its tab", () => {
    const picked: string[] = []
    const state = {
      ...graphState(),
      setMode: (mode: string) => picked.push(mode),
    }
    showColumn(<MotionPanel state={state} />)
    const tab = screen.getByRole("tab", { name: tCatalog("motion.tab.guide") })
    fireEvent.mouseDown(tab)
    fireEvent.click(tab)
    expect(picked).toContain("guide")
  })

  it("names the video well Guide video with its note in Follow a guide, and leaves the clip's sound out", () => {
    const state: MotionState = {
      ...graphState(),
      tab: "guide",
      mode: "guide",
      graphRest: graphRestOf(app, "guide"),
    }
    state.hosted = { ...state.hosted, models: [guide], chosen: guide }
    showColumn(<MotionPanel state={state} />)
    expect(
      screen.getByText(tCatalog("motion.input.guide.label")).isConnected
    ).toBe(true)
    expect(
      screen.getByText(tCatalog("motion.input.guide.note")).isConnected
    ).toBe(true)
    expect(screen.queryByText(tCatalog("motion.input.clip.label"))).toBeNull()
    expect(
      screen.queryByRole("switch", {
        name: tCatalog("motion.input.sound.label"),
      })
    ).toBeNull()
    expect(
      screen
        .getByRole("tab", { name: tCatalog("motion.tab.guide") })
        .getAttribute("aria-selected")
    ).toBe("true")
  })
})
