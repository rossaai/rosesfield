import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ModeTabs } from "@/studio/three-d/three-d-panel"

afterEach(cleanup)

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
