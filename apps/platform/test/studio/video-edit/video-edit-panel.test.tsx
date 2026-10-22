import type { CatalogModel } from "@rosesfield/catalog/comfy"
import { TooltipProvider } from "@rosesfield/ui/components/tooltip"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import type { ReactElement } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { t, tCatalog } from "@/copy/t"
import type { FieldProblem, FieldValue } from "@/screens/app/app-form"
import {
  pickerSections,
  pickerTrigger,
} from "@/screens/app/hosted/catalog-picker"
import { fieldCaption } from "@/screens/app/hosted/hosted-fields"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"
import type { AppForm } from "@/screens/app/use-app-form"
import { clipLimitOf, clipProblemOf } from "@/studio/video-edit/clip-limit"
import type { VideoEditState } from "@/studio/video-edit/use-video-edit-screen"
import type { VideoEditMode } from "@/studio/video-edit/video-edit-modes"
import {
  ModeTabs,
  tabHostedOf,
  VideoEditPanel,
} from "@/studio/video-edit/video-edit-panel"
import { clipFieldOf, modelsOfTab } from "@/studio/video-edit/video-edit-tabs"
import {
  catalog,
  dreamina,
  dreaminaId,
  fiveTabs,
  fluxEdit,
  graphs,
} from "./video-edit-catalog"

beforeEach(() => {
  vi.stubGlobal("fetch", () => new Promise(() => undefined))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const clipId = "0b1c2d3e-4f50-4a6b-8c7d-9e0f1a2b3c4d"

function formOf(inputs: Record<string, FieldValue>): AppForm {
  return {
    values: { inputs, seedMode: "random", count: 1, aspectRatio: null },
    problems: new Map(),
    setInput: () => undefined,
    setForm: () => undefined,
    fill: () => undefined,
    validate: () => true,
    register: () => undefined,
  }
}

function hostedOf(chosen: CatalogModel | null): HostedState {
  return {
    isTaskApp: true,
    models: catalog,
    isLoading: false,
    error: null,
    keyState: "valid",
    defaultModel: dreaminaId,
    chosen,
    fields: chosen?.form ?? null,
    ranBefore: [],
    choose: () => undefined,
  }
}

function stateOf(
  mode: VideoEditMode,
  chosen: CatalogModel | null,
  inputs: Record<string, FieldValue>,
  clipProblem?: FieldProblem
): VideoEditState {
  return {
    app: fiveTabs,
    mode,
    setMode: () => undefined,
    form: formOf(inputs),
    start: {
      generate: () => undefined,
      isPending: false,
      error: null,
      price: "",
    },
    hosted: hostedOf(chosen),
    tabModels: modelsOfTab(catalog, fiveTabs, mode),
    chooseModel: () => undefined,
    clipField: clipFieldOf(chosen),
    clipLimit: clipLimitOf(chosen),
    clip: null,
    clipProblem,
    isSameFormat: false,
    lastSeed: null,
    hasRuns: false,
    useInputs: () => undefined,
    register: () => undefined,
    onShortcut: () => undefined,
  }
}

function show(node: ReactElement): void {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <TooltipProvider>{node}</TooltipProvider>
    </QueryClientProvider>
  )
}

function isBefore(first: Element, second: Element): boolean {
  return Boolean(
    first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING
  )
}

describe("Video edit's tabs", () => {
  it("shows Edit, Extend, Reframe, Background and Frame rate, and switches on a press", () => {
    const setMode = vi.fn()
    show(<ModeTabs state={{ app: fiveTabs, mode: "edit", setMode }} />)
    const tabs = screen.getAllByRole("tab")
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      tCatalog("videoEdit.choice.mode.edit"),
      tCatalog("videoEdit.choice.mode.extend"),
      tCatalog("videoEdit.choice.mode.reframe"),
      tCatalog("videoEdit.choice.mode.background"),
      tCatalog("videoEdit.choice.mode.frameRate"),
    ])
    fireEvent.click(tabs[3] as HTMLElement)
    expect(setMode).toHaveBeenCalledWith("background")
  })
})

describe("the Edit tab on Dreamina Seedance 2.5", () => {
  it("shows the clip well with its limits, then the model's inputs, then the model row", () => {
    show(<VideoEditPanel state={stateOf("edit", dreamina, { video: [] })} />)
    const well = document.querySelector("[data-slot='clip-well']")
    const [promptField] = dreamina.form ?? []
    if (promptField === undefined) {
      throw new Error("Dreamina's form has no prompt")
    }
    const prompt = screen.getByRole("textbox", {
      name: fieldCaption(promptField),
    })
    const row = screen.getByRole("button", {
      name: `${t("model.picker.title")} ${dreaminaId}`,
    })
    if (well === null) {
      throw new Error("the panel has no clip well")
    }
    expect(well.textContent).toContain(
      "MP4, MOV or WebM, 2 to 15 seconds, up to 100 MB"
    )
    expect(isBefore(well, prompt)).toBe(true)
    expect(isBefore(prompt, row)).toBe(true)
    expect(screen.getAllByRole("textbox")).toHaveLength(1)
    const wells = document.querySelectorAll("[data-slot='drop-well']")
    expect(wells).toHaveLength(1)
  })

  it("names the model's limit on a longer clip and keeps the words you typed", () => {
    const problem = clipProblemOf(
      "video",
      { assetId: clipId, seconds: 20, width: 1280, height: 720 },
      null,
      clipLimitOf(dreamina)
    )
    show(
      <VideoEditPanel
        state={stateOf(
          "edit",
          dreamina,
          { video: [clipId], prompt: "make it snow" },
          problem
        )}
      />
    )
    expect(
      screen.getByText(
        "This clip runs 20 seconds. Pick one of 15 seconds or less."
      )
    ).toBeTruthy()
    expect(screen.getByRole("textbox")).toHaveProperty("value", "make it snow")
  })
})

describe("the model row of a tab", () => {
  it("lists every video edit model of the catalog with its maker and its name, and its capabilities", () => {
    const state = stateOf("edit", dreamina, {})
    const rows = pickerSections(tabHostedOf(state)).flatMap(
      (section) => section.rows
    )
    expect(new Set(rows.map((row) => row.id))).toEqual(
      new Set(state.tabModels.map((model) => model.id))
    )
    for (const row of rows) {
      expect(row.maker).not.toBe("")
      expect(row.name).not.toBe("")
      expect(row.tags.length).toBeLessThanOrEqual(4)
    }
    expect(rows.some((row) => row.id === graphs.background.id)).toBe(false)
  })

  it("sends a pick to the tab's chooser and names the model you picked", () => {
    const chooseModel = vi.fn()
    const state = { ...stateOf("edit", fluxEdit, {}), chooseModel }
    tabHostedOf(state).choose(fluxEdit.id)
    expect(chooseModel).toHaveBeenCalledWith(fluxEdit.id)
    show(pickerTrigger(tabHostedOf(state), "row"))
    expect(
      screen.getByRole("button", {
        name: `${t("model.picker.title")} ${fluxEdit.id}`,
      })
    ).toBeTruthy()
  })

  it("is absent while the app runs its graphs alone", () => {
    const state = stateOf("background", null, { mode: "background" })
    show(
      <VideoEditPanel
        state={{ ...state, hosted: { ...state.hosted, isTaskApp: false } }}
      />
    )
    const picker = new RegExp(t("model.picker.title"))
    expect(screen.queryByRole("button", { name: picker })).toBeNull()
    expect(
      screen.getByText(tCatalog("videoEdit.input.color.label"))
    ).toBeTruthy()
  })
})
