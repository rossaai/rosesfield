import { Badge, badgeKinds } from "@rosesfield/ui/components/badge"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

afterEach(cleanup)

describe("Badge", () => {
  it.each([
    ["new", "nop"],
    ["value", "cem"],
    ["openWeights", "cem"],
  ] as const)(
    "rides 4 px after its host's label, 16 px tall, %s on the %s tint with its text tone",
    (kind, hue) => {
      render(<Badge kind={kind}>Word</Badge>)
      const badge = screen.getByText("Word").closest("[data-slot='badge']")
      expect(badge?.getAttribute("data-kind")).toBe(kind)
      expect(badge?.getAttribute("data-tone")).toBe(hue)
      expect(badge?.className.split(" ")).toEqual(
        expect.arrayContaining([
          "ms-1",
          "h-4",
          `bg-${hue}-tint`,
          `text-${hue}-text`,
        ])
      )
      expect(badge?.className.split(" ")).not.toContain("bg-(--tint)")
    }
  )

  it("gives every kind a hue tint, and two kinds a hue only when one of them carries a mark, and no rank kind, since the rank rides the lab's mark", () => {
    const tones = badgeKinds.map((kind) => {
      render(<Badge kind={kind}>{kind}</Badge>)
      return (
        screen
          .getByText(kind)
          .closest("[data-slot='badge']")
          ?.getAttribute("data-tone") ?? ""
      )
    })
    expect(
      tones.every((tone) => ["nop", "hor", "cem", "bug"].includes(tone))
    ).toBe(true)
    expect(badgeKinds).toEqual(["new", "value", "openWeights", "featured"])
    expect(new Set(tones.slice(0, 2)).size).toBe(2)
  })

  it("draws Featured in bugambilia, a tone no other kind shares, so it never reads as New or Best value", () => {
    const toneOf = (kind: (typeof badgeKinds)[number]): string => {
      render(<Badge kind={kind}>{kind}</Badge>)
      return (
        screen
          .getByText(kind)
          .closest("[data-slot='badge']")
          ?.getAttribute("data-tone") ?? ""
      )
    }
    const featured = toneOf("featured")
    expect(featured).toBe("bug")
    for (const kind of badgeKinds.filter((one) => one !== "featured")) {
      expect({ kind, tone: toneOf(kind) }).not.toEqual({ kind, tone: featured })
    }
  })

  it("takes a tone of its own, and the quiet tint with no kind, for a fact a screen shows", () => {
    render(
      <>
        <Badge>Demo engine</Badge>
        <Badge tone="glass">12 s</Badge>
        <Badge kind="new" tone="hor">
          Fresh
        </Badge>
      </>
    )
    const quiet = screen.getByText("Demo engine").closest("[data-slot='badge']")
    expect(quiet?.getAttribute("data-kind")).toBeNull()
    expect(quiet?.className.split(" ")).toEqual(
      expect.arrayContaining(["bg-(--tint)", "text-ink"])
    )
    const glass = screen.getByText("12 s").closest("[data-slot='badge']")
    expect(glass?.className.split(" ")).toContain("material-thin")
    const fresh = screen.getByText("Fresh").closest("[data-slot='badge']")
    expect(fresh?.className.split(" ")).toContain("bg-hor-tint")
    expect(fresh?.className.split(" ")).not.toContain("bg-nop-tint")
  })

  it("leads with a mark a screen gives, in the colour it gives", () => {
    render(
      <Badge tone="quiet" mark={<svg data-testid="lab" />} markColour="red">
        Lab
      </Badge>
    )
    const mark = screen.getByTestId("lab").closest("[data-slot='badge-mark']")
    expect(mark?.getAttribute("aria-hidden")).toBe("true")
    expect(mark instanceof HTMLElement ? mark.style.color : "").toBe("red")
  })

  it("makes the whole Open weights badge the link to the weights page, named by its words, in a new tab", () => {
    render(
      <Badge kind="openWeights" href="https://huggingface.co/maker/model">
        Open weights
      </Badge>
    )
    const link = screen.getByRole("link", { name: "Open weights" })
    expect(link.getAttribute("href")).toBe("https://huggingface.co/maker/model")
    expect(link.getAttribute("target")).toBe("_blank")
    expect(link.getAttribute("rel")).toBe("noopener noreferrer")
    expect(link.getAttribute("aria-description")).toBe(
      "huggingface.co/maker/model"
    )
    expect(link.getAttribute("data-slot")).toBe("badge")
    expect(link.getAttribute("data-kind")).toBe("openWeights")
    expect(link.className.split(" ")).toEqual(
      expect.arrayContaining(["pointer-events-auto", "ms-1", "bg-cem-tint"])
    )
    expect(link.querySelector("[data-slot='hugging-face-mark']")).not.toBeNull()
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
    const link = screen.getByRole("link", { name: "Open weights" })
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

  it("stays a word, not a link, for New and Best value", () => {
    render(
      <Badge kind="new" href="https://example.com">
        New
      </Badge>
    )
    expect(screen.queryByRole("link")).toBeNull()
  })
})
