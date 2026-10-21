import { Badge, badgeKinds } from "@rosesfield/ui/components/badge"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

afterEach(cleanup)

describe("Badge", () => {
  it.each(badgeKinds)(
    "rides 4 px after its host's label, 16 px tall, on the one accent's tint, as %s",
    (kind) => {
      render(<Badge kind={kind}>Word</Badge>)
      const badge = screen.getByText("Word").closest("[data-slot='badge']")
      expect(badge?.getAttribute("data-kind")).toBe(kind)
      expect(badge?.className.split(" ")).toEqual(
        expect.arrayContaining(["ms-1", "h-4", "bg-(--tint)", "text-ink"])
      )
      expect(badge?.className).not.toMatch(/hor-|nop-|cem-/)
    }
  )

  it("makes only the Hugging Face mark the link to the weights page, named by that page, in a new tab", () => {
    render(
      <Badge kind="openWeights" href="https://huggingface.co/maker/model">
        Open weights
      </Badge>
    )
    const link = screen.getByRole("link", {
      name: "huggingface.co/maker/model",
    })
    expect(link.getAttribute("href")).toBe("https://huggingface.co/maker/model")
    expect(link.getAttribute("target")).toBe("_blank")
    expect(link.getAttribute("rel")).toBe("noopener noreferrer")
    expect(link.className.split(" ")).toContain("pointer-events-auto")
    expect(link.textContent).toBe("")
    expect(screen.getByText("Open weights").closest("a")).toBeNull()
    const badge = link.closest("[data-slot='badge']")
    expect(badge?.tagName.toLowerCase()).toBe("span")
    expect(badge?.className.split(" ")).toContain("ms-1")
  })

  it("carries the Hugging Face mark as path data on Open weights, and no mark on the other kinds", () => {
    render(
      <>
        <Badge kind="openWeights" href="https://huggingface.co/maker/model">
          Open weights
        </Badge>
        <Badge kind="new">New</Badge>
      </>
    )
    const link = screen.getByRole("link", {
      name: "huggingface.co/maker/model",
    })
    const mark = link.querySelector("[data-slot='hugging-face-mark']")
    expect(mark?.tagName.toLowerCase()).toBe("svg")
    expect(mark?.getAttribute("aria-hidden")).toBe("true")
    expect(
      mark?.querySelector("path")?.getAttribute("d")?.length
    ).toBeGreaterThan(1000)
    expect(link.querySelector("img")).toBeNull()
    const word = screen.getByText("New").closest("[data-slot='badge']")
    expect(word?.querySelector("svg")).toBeNull()
  })

  it("stays a word, not a link, for New, Top and Premium", () => {
    render(
      <Badge kind="new" href="https://example.com">
        New
      </Badge>
    )
    expect(screen.queryByRole("link")).toBeNull()
  })
})
