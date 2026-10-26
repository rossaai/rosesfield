import { findApp } from "@rosesfield/catalog"
import { appListing } from "@rosesfield/contract"
import { TooltipProvider } from "@rosesfield/ui/components/tooltip"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { t, tCatalog } from "@/copy/t"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"
import type { AppForm } from "@/screens/app/use-app-form"
import { ShotPanel } from "@/studio/shot/shot-panel"
import { choicesOf, wordsOf } from "@/studio/shot/shot-prompt"
import type { ShotScreen } from "@/studio/shot/use-shot-screen"
import { advancedToggle, isBefore, theModelChip } from "../column"

beforeEach(() => {
  vi.stubGlobal("fetch", () => new Promise(() => undefined))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const shot = appListing.parse(findApp("shot"))
const scene = "A boat leaves the harbor"

const form: AppForm = {
  values: { inputs: {}, seedMode: "random", count: 1, aspectRatio: "16:9" },
  problems: new Map(),
  setInput: () => undefined,
  setForm: () => undefined,
  fill: () => undefined,
  validate: () => true,
  register: () => undefined,
}

const hosted: HostedState = {
  isTaskApp: true,
  models: [],
  isLoading: false,
  error: null,
  keyState: "set",
  defaultModel: "ltx-2-5",
  chosen: null,
  fields: null,
  choose: () => undefined,
}

function screenOf(change: Partial<ShotScreen>): ShotScreen {
  const choices = choicesOf({})
  return {
    state: {
      form,
      start: {
        generate: () => undefined,
        isPending: false,
        error: null,
        price: "",
      },
      hosted,
      lastSeed: null,
      hasRuns: false,
      useInputs: () => undefined,
      onShortcut: () => undefined,
    },
    hosted,
    picker: hosted,
    fields: null,
    isGraph: true,
    promptName: "prompt",
    shot: { scene: "", choices },
    words: "",
    start: { name: "startFrame", max: 1 },
    filled: 0,
    setScene: () => undefined,
    setChoice: () => undefined,
    fillFromRun: () => undefined,
    ...change,
  }
}

function show(value: ShotScreen): HTMLElement {
  const view = render(
    <QueryClientProvider client={new QueryClient()}>
      <TooltipProvider>
        <ShotPanel app={shot} screen={value} />
      </TooltipProvider>
    </QueryClientProvider>
  )
  return view.container
}

const look = ["camera", "lens", "focus", "light", "color", "mood"]

function lookToggle(): HTMLElement {
  return screen.getByRole("button", {
    name: tCatalog("storyboard.input.look.label"),
  })
}

describe("Shot's input column when it opens", () => {
  it("shows the model, then Movement, the format and the length, then a closed Look section and a closed Advanced section, with no Sound chip", () => {
    show(screenOf({}))
    const model = theModelChip()
    const movement = screen.getByText(tCatalog("shot.input.movement.label"))
    const format = screen.getByText(t("field.aspect.label"))
    const length = screen.getByRole("group", {
      name: tCatalog("shot.input.length.label"),
    })
    const toggle = lookToggle()
    const advanced = advancedToggle()
    expect(isBefore(model, movement)).toBe(true)
    expect(isBefore(movement, format)).toBe(true)
    expect(isBefore(format, length)).toBe(true)
    expect(isBefore(length, toggle)).toBe(true)
    expect(isBefore(toggle, advanced)).toBe(true)
    for (const list of look) {
      expect(
        screen.queryByText(tCatalog(`shot.input.${list}.label`))
      ).toBeNull()
    }
    expect(
      screen.queryByRole("button", { name: tCatalog("shot.input.sound.label") })
    ).toBeNull()
    expect(screen.queryByText(t("field.seed.label"))).toBeNull()
  })

  it("shows the six other look choices, each on Auto, once you open Look", () => {
    const container = show(screenOf({}))
    fireEvent.click(lookToggle())
    const choices = container.querySelector<HTMLElement>(
      "[data-slot='shot-choices']"
    )
    if (choices === null) {
      throw new Error("the Look section has no shot choices")
    }
    for (const list of look) {
      expect(
        within(choices).getByText(tCatalog(`shot.input.${list}.label`))
      ).toBeTruthy()
    }
    expect(
      within(choices).queryByText(tCatalog("shot.input.movement.label"))
    ).toBeNull()
    expect(
      within(choices).getAllByText(tCatalog("choice.auto")).length
    ).toBeGreaterThanOrEqual(look.length)
  })

  it("shows the start frame well, and no words while the scene is empty", () => {
    const container = show(screenOf({}))
    expect(container.querySelector("[data-slot='video-wells']")).not.toBeNull()
    expect(container.querySelector("[data-slot='shot-words']")).toBeNull()
  })
})

describe("the words under the prompt", () => {
  it("shows the words Shot sends", () => {
    const words = wordsOf(scene, choicesOf({ light: "night" }))
    show(screenOf({ shot: { scene, choices: choicesOf({}) }, words }))
    const region = screen.getByRole("region", {
      name: tCatalog("shot.sentWords.label"),
    })
    expect(region.textContent).toContain(words)
  })
})

describe("a model whose schema takes no start frame", () => {
  it("draws no start frame well", () => {
    const container = show(screenOf({ start: null }))
    expect(container.querySelector("[data-slot='video-wells']")).toBeNull()
    expect(screen.getByText(tCatalog("shot.input.movement.label"))).toBeTruthy()
  })
})

describe("the column's Advanced section", () => {
  it("shows the seed once you open it", () => {
    show(screenOf({ filled: 1 }))
    fireEvent.click(advancedToggle())
    expect(screen.getByText(t("field.seed.label"))).toBeTruthy()
  })
})
