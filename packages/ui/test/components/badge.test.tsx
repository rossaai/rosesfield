import { Badge, badgeKinds } from "@rosesfield/ui/components/badge"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

afterEach(cleanup)

describe("Badge", () => {
  it.each(badgeKinds)(
    "rides 4 px after its host's label, 16 px tall, as %s",
    (kind) => {
      render(<Badge kind={kind}>Word</Badge>)
      const badge = screen.getByText("Word").closest("[data-slot='badge']")
      expect(badge?.getAttribute("data-kind")).toBe(kind)
      expect(badge?.className.split(" ")).toEqual(
        expect.arrayContaining(["ms-1", "h-4"])
      )
    }
  )

  it("opens the weights page from Open weights in a new tab", () => {
    render(
      <Badge kind="openWeights" href="https://huggingface.co/maker/model">
        Open weights
      </Badge>
    )
    const link = screen.getByRole("link", { name: "Open weights" })
    expect(link.getAttribute("target")).toBe("_blank")
    expect(link.getAttribute("rel")).toBe("noopener noreferrer")
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
