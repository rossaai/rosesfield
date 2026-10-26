import { cleanup, screen } from "@testing-library/react"
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
    tab: "move",
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
    setTab: () => undefined,
    pickCharacter: () => undefined,
    registerWell: () => undefined,
    useInputs: () => undefined,
    onShortcut: () => undefined,
  }
}

describe("the Motion column", () => {
  it("shows the clip and the photo, then the model once, then the format and Sound as rows, with the seed closed under Advanced", () => {
    showColumn(<MotionPanel state={graphState()} />)
    const photo = screen.getByText(tCatalog("motion.input.photo.label"))
    const model = theModelChip()
    const format = screen.getByText(t("field.aspect.label"))
    const sound = screen.getByRole("switch", {
      name: tCatalog("motion.input.sound.label"),
    })
    expect(isBefore(photo, model)).toBe(true)
    expect(isBefore(model, format)).toBe(true)
    expect(isBefore(format, sound)).toBe(true)
    expect(isBefore(sound, advancedToggle())).toBe(true)
    expect(screen.queryByText(tCatalog("motion.input.seed.label"))).toBeNull()
  })
})
