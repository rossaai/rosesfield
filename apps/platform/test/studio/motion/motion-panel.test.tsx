import { exampleOf } from "@rosesfield/catalog/motion"
import { cleanup, fireEvent, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { t, tCatalog } from "@/copy/t"
import { defaultsOf } from "@/screens/app/app-form"
import { MotionPanel, MotionTabs } from "@/studio/motion/motion-panel"
import { graphRestOf } from "@/studio/motion/motion-tabs"
import type { MotionState } from "@/studio/motion/use-motion-screen"
import {
  advancedToggle,
  formOf,
  isBefore,
  modelChips,
  showColumn,
  theModelChip,
} from "../column"
import { catalog, graph, motionListing } from "./motion-fixtures"

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
    example: null,
    chain: null,
    useOwnVideo: () => undefined,
    tab: "move",
    setTab: () => undefined,
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
    isOwnChain: false,
    names: { clip: "clip", photo: "photo" },
    range: null,
    checks: {
      clip: null,
      photo: null,
      readingInput: null,
      clipSize: null,
      clipSeconds: null,
    },
    clipMessage: null,
    clipNote: null,
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

describe("Motion's tabs", () => {
  it("are one row named Mode with Move and Swap, and Swap asks the screen for the Swap mode", () => {
    const asked: string[] = []
    showColumn(
      <MotionTabs state={{ tab: "move", setTab: (tab) => asked.push(tab) }} />
    )
    const row = screen.getByRole("tablist", {
      name: tCatalog("motion.tabs.label"),
    })
    const tabs = Array.from(row.querySelectorAll("[role='tab']"))
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      tCatalog("motion.tab.move"),
      tCatalog("motion.tab.swap"),
    ])
    expect(tCatalog("motion.tab.move")).toBe("Move")
    expect(tCatalog("motion.tab.swap")).toBe("Swap")
    fireEvent.click(screen.getByRole("tab", { name: "Swap" }))
    expect(asked).toEqual(["swap"])
  })

  it("offer Pick a character under the photo well, so you pick who goes into your video on either tab", () => {
    showColumn(<MotionPanel state={graphState()} />)
    const photo = screen.getByText(tCatalog("motion.input.photo.label"))
    const pick = screen.getByRole("button", {
      name: t("field.character.pick"),
    })
    expect(isBefore(photo, pick)).toBe(true)
    expect(isBefore(pick, theModelChip())).toBe(true)
  })
})

describe("Motion's notes", () => {
  it("say which stretch Motion keeps of a long clip under the video well, as a note and not a fault", () => {
    const words = "Motion takes the first 10 seconds of your 38-second video."
    showColumn(<MotionPanel state={{ ...graphState(), clipNote: words }} />)
    const note = screen.getByText(words)
    expect(note.closest("[data-slot='field-note']")).not.toBeNull()
    expect(note.closest("[data-slot='field-message']")).toBeNull()
  })

  it("show no note under the video well for a clip Motion takes whole, the control", () => {
    showColumn(<MotionPanel state={graphState()} />)
    expect(document.querySelector("[data-slot='field-note']")).toBeNull()
  })

  it("never say how many photos your own video takes", () => {
    showColumn(<MotionPanel state={{ ...graphState(), isOwnChain: true }} />)
    expect(
      screen.getByText(tCatalog("motion.input.photos.label")).isConnected
    ).toBe(true)
    expect(screen.queryByText(/1 to 15/)).toBeNull()
    expect(document.querySelector("[data-slot='field-note']")).toBeNull()
  })
})

describe("Motion with an example from its Library", () => {
  it("shows the example's result in place of the video well with no hint about your photo, asks for your image, and hides the model", () => {
    const grab = exampleOf("grab-and-run")
    let ownVideo = 0
    const state: MotionState = {
      ...graphState(),
      example: grab,
      useOwnVideo: () => {
        ownVideo += 1
      },
    }
    showColumn(<MotionPanel state={state} />)
    const name = screen.getByText(tCatalog("motion.example.grabAndRun.name"))
    expect(
      screen.queryByText(tCatalog("motion.example.grabAndRun.photo"))
    ).toBeNull()
    expect(document.querySelector("[data-slot='field-note']")).toBeNull()
    expect(
      screen.getByText(tCatalog("motion.input.photo.label")).isConnected
    ).toBe(true)
    expect(
      document.querySelector("[data-slot='motion-example'] video")
    ).not.toBeNull()
    expect(screen.queryByText(tCatalog("motion.input.clip.note"))).toBeNull()
    expect(modelChips()).toHaveLength(0)
    fireEvent.click(
      screen.getByRole("button", { name: tCatalog("motion.example.change") })
    )
    expect(ownVideo).toBe(1)
    expect(name.isConnected).toBe(true)
  })

  it("shows your own video well and the model with no example, the control", () => {
    showColumn(<MotionPanel state={graphState()} />)
    expect(
      screen.queryByText(tCatalog("motion.example.grabAndRun.name"))
    ).toBeNull()
    expect(theModelChip().isConnected).toBe(true)
  })
})

describe("the price words under Generate in an example's chain", () => {
  it("shows where the final's credits come from as visible text, not only in a label", () => {
    const state: MotionState = {
      ...graphState(),
      example: exampleOf("grab-and-run"),
      chain: {
        stage: { stage: "idle" },
        start: graphState().start,
        priceNote: "16.79 Comfy credits, measured on a 4-second 1080p run",
        canStartOver: true,
        startOver: () => undefined,
        leftOut: null,
      },
    }
    showColumn(<MotionPanel state={state} />)
    const note = screen.getByText(
      "16.79 Comfy credits, measured on a 4-second 1080p run"
    )
    expect(note.closest("[data-slot='motion-price']")).not.toBeNull()
    expect(note.getAttribute("aria-hidden")).toBeNull()
  })

  it("shows no price words with no chain, the control", () => {
    showColumn(<MotionPanel state={graphState()} />)
    expect(document.querySelector("[data-slot='motion-price']")).toBeNull()
  })
})
