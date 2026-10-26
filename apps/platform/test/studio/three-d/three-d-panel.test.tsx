import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { defaultsOf } from "@/screens/app/app-form"
import { ModeTabs, ThreeDPanel } from "@/studio/three-d/three-d-panel"
import {
  advancedToggle,
  formOf,
  isBefore,
  showColumn,
  theModelChip,
} from "../column"
import { meshy71, threeDApp } from "./three-d-models"

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("the 3D column", () => {
  it("shows the prompt, then the model once, then the model's settings closed under Advanced", () => {
    vi.stubGlobal("fetch", () => new Promise<Response>(() => undefined))
    const app = threeDApp()
    const form = formOf(defaultsOf(app))
    showColumn(
      <ThreeDPanel
        app={app}
        screen={{
          state: {
            form,
            start: {
              generate: () => undefined,
              isPending: false,
              error: null,
              price: "",
            },
            lastSeed: null,
            hasRuns: false,
            useInputs: () => undefined,
            onShortcut: () => undefined,
          },
          hosted: {
            isTaskApp: true,
            models: [meshy71],
            isLoading: false,
            error: null,
            keyState: "set",
            defaultModel: meshy71.id,
            chosen: meshy71,
            fields: meshy71.form,
            choose: () => undefined,
          },
          tab: "text",
          tabs: ["text", "image"],
          tabModels: [meshy71],
          setTab: () => undefined,
          fillFromRun: () => undefined,
        }}
      />
    )
    const model = theModelChip()
    expect(isBefore(screen.getByRole("textbox"), model)).toBe(true)
    expect(isBefore(model, advancedToggle())).toBe(true)
  })
})

describe("the 3D mode tabs", () => {
  it("shows From text first and chosen, then From an image", () => {
    render(
      <ModeTabs
        screen={{
          tab: "text",
          tabs: ["text", "image"],
          setTab: () => undefined,
        }}
      />
    )
    const tabs = screen.getAllByRole("tab")
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      "From text",
      "From an image",
    ])
    const text = screen.getByRole("tab", { name: "From text" })
    expect(text.getAttribute("aria-selected")).toBe("true")
  })

  it("shows no From an image tab while the screen lists only From text", () => {
    render(
      <ModeTabs
        screen={{ tab: "text", tabs: ["text"], setTab: () => undefined }}
      />
    )
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "From text",
    ])
  })

  it("moves to From an image when you press it", () => {
    const setTab = vi.fn()
    render(
      <ModeTabs screen={{ tab: "text", tabs: ["text", "image"], setTab }} />
    )
    fireEvent.click(screen.getByRole("tab", { name: "From an image" }))
    expect(setTab).toHaveBeenCalledWith("image")
  })
})
