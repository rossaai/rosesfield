import {
  DropZone,
  ReferenceTile,
  StartFrame,
} from "@rosesfield/ui/components/upload-zone"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

afterEach(cleanup)

describe("ReferenceTile", () => {
  it("holds References and Elements as two 32 px glyph buttons in one 65 by 32 tile", () => {
    const calls = { references: vi.fn(), elements: vi.fn() }
    render(
      <ReferenceTile
        referencesLabel="References"
        elementsLabel="Elements"
        onReferences={calls.references}
        onElements={calls.elements}
      />
    )
    const references = screen.getByRole("button", { name: "References" })
    const elements = screen.getByRole("button", { name: "Elements" })
    expect(references.textContent).toBe("")
    expect(references.className.split(" ")).toContain("size-8")
    expect(references.parentElement?.className.split(" ")).toEqual(
      expect.arrayContaining(["h-8", "w-16.25"])
    )
    fireEvent.click(elements)
    expect(calls.elements).toHaveBeenCalledTimes(1)
    expect(calls.references).not.toHaveBeenCalled()
  })
})

describe("StartFrame", () => {
  it("plays a muted loop 130 px tall with Change in its corner", () => {
    const change = vi.fn()
    render(
      <StartFrame
        src="start.mp4"
        alt="The start frame"
        title="Dolly in"
        line="Model 4"
        changeLabel="Change"
        onChange={change}
      />
    )
    const video = screen.getByLabelText("The start frame")
    expect(video instanceof HTMLVideoElement && video.muted && video.loop).toBe(
      true
    )
    const button = screen.getByRole("button", { name: "Change" })
    const chip = button.querySelector("[data-slot='start-frame-change']")
    expect(chip?.className.split(" ")).toEqual(
      expect.arrayContaining(["top-1.5", "right-1.5", "h-6"])
    )
    fireEvent.click(button)
    expect(change).toHaveBeenCalledTimes(1)
  })

  it("takes focus as the whole frame, so Tab lands on the frame itself", () => {
    render(
      <StartFrame
        src="start.mp4"
        alt="The start frame"
        title="Dolly in"
        line="Model 4"
        changeLabel="Change"
        onChange={() => undefined}
      />
    )
    const frame = document.querySelector(
      "[data-slot='composer-attachments-tiles']"
    )
    const button = screen.getByRole("button", { name: "Change" })
    expect(button.parentElement).toBe(frame)
    expect(button.hasAttribute("data-cover")).toBe(true)
    expect(button.className.split(" ")).toEqual(
      expect.arrayContaining(["absolute", "inset-0"])
    )
    expect(screen.getAllByRole("button")).toHaveLength(1)
  })
})

describe("StartFrame's scrim and focus", () => {
  it("darkens from clear at the top to the dark scheme's scrim by mid-height, sets its caption in the dark scheme, and rings the whole frame outside its edge", () => {
    render(
      <StartFrame
        src="start.mp4"
        alt="The start frame"
        title="Dolly in"
        line="Model 4"
        changeLabel="Change"
        onChange={() => undefined}
      />
    )
    const frame = document.querySelector(
      "[data-slot='composer-attachments-tiles']"
    )
    const scrim = frame?.querySelector("[data-slot='start-frame-scrim']")
    expect(scrim?.className.split(" ")).toEqual(
      expect.arrayContaining(["from-transparent", "to-scrim", "to-50%"])
    )
    expect(scrim?.getAttribute("data-theme")).toBe("dark")
    expect(frame?.querySelector("figcaption")?.getAttribute("data-theme")).toBe(
      "dark"
    )
    expect(frame?.className.split(" ")).toEqual(
      expect.arrayContaining([
        "has-[>[data-cover]:focus-visible]:outline-(length:--spacing-focus-ring)",
        "has-[>[data-cover]:focus-visible]:outline-solid",
        "has-[>[data-cover]:focus-visible]:outline-offset-(--spacing-focus-ring)",
      ])
    )
  })
})

describe("DropZone", () => {
  it("is at least 120 px tall with a dashed edge and names what it takes", () => {
    render(
      <DropZone
        title="Drop your files"
        line="Image, video or audio"
        kinds={[<svg key="image" />, <svg key="video" />, <svg key="audio" />]}
      />
    )
    const zone = screen.getByRole("button", { name: /Drop your files/ })
    expect(zone.className.split(" ")).toEqual(
      expect.arrayContaining(["min-h-30", "border-dashed", "p-4"])
    )
    expect(zone.textContent).toBe("Drop your filesImage, video or audio")
  })
})
