import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ModeTabs } from "@/studio/three-d/three-d-panel"

afterEach(cleanup)

describe("the 3D mode tabs", () => {
  it("shows From an image and From text, with From an image chosen", () => {
    render(<ModeTabs screen={{ tab: "image", setTab: () => undefined }} />)
    const tabs = screen.getAllByRole("tab")
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      "From an image",
      "From text",
    ])
    const image = screen.getByRole("tab", { name: "From an image" })
    expect(image.getAttribute("aria-selected")).toBe("true")
  })

  it("moves to From text when you press it", () => {
    const setTab = vi.fn()
    render(<ModeTabs screen={{ tab: "image", setTab }} />)
    fireEvent.click(screen.getByRole("tab", { name: "From text" }))
    expect(setTab).toHaveBeenCalledWith("text")
  })
})
