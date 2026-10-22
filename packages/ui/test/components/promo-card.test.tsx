import {
  PromoCard,
  PromoRow,
  PromoSkeleton,
} from "@rosesfield/ui/components/promo-card"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const cardWidth =
  "@regular:w-[clamp(calc(var(--spacing)*100),calc((100cqw_-_var(--spacing)*320)*1000),calc(var(--spacing)*128))]"

function card(name: string) {
  return (
    <PromoCard
      key={name}
      name={name}
      line="Faces in any light"
      href={`/apps/${name}`}
      openLabel={`Open ${name}`}
      clip={<img alt="" src="a.png" />}
    />
  )
}

function stubRowSize(scrollWidth: number, clientWidth: number): void {
  vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(
    scrollWidth
  )
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(
    clientWidth
  )
}

describe("PromoCard", () => {
  it("runs 512 px cards 20 px apart past the edge, each one link over a 16:9 figure", () => {
    render(
      <PromoRow label="New" nextLabel="Next">
        <PromoCard
          name="Picture 2"
          line="Faces in any light"
          href="/apps/image"
          openLabel="Open Picture 2"
          clip={<img alt="" src="a.png" />}
        />
      </PromoRow>
    )
    const row = screen.getByRole("region", { name: "New" }).firstElementChild
    expect(row?.className.split(" ")).toEqual(
      expect.arrayContaining([
        "gap-5",
        "overflow-x-auto",
        "px-4",
        "scroll-px-4",
        "snap-x",
        "-my-[calc(var(--spacing-focus-ring)*2)]",
        "py-[calc(var(--spacing-focus-ring)*2)]",
      ])
    )
    const section = screen.getByRole("region", { name: "New" })
    expect(section.className.split(" ")).not.toContain("w-full")
    const link = screen.getByRole("link", { name: "Open Picture 2" })
    const tile = link.closest("[data-slot='preset-tile']")
    expect(tile?.className.split(" ")).toEqual(
      expect.arrayContaining([cardWidth, "w-78", "snap-start"])
    )
    expect(tile?.querySelector(".aspect-video")).not.toBeNull()
  })

  it("binds the preset tile record's clip form and the media feed record's row", () => {
    render(
      <PromoRow label="New" nextLabel="Next">
        <PromoCard
          name="Picture 2"
          line="Faces in any light"
          href="/apps/image"
          openLabel="Open Picture 2"
          clip={<img alt="" src="a.png" />}
        />
      </PromoRow>
    )
    const row = screen.getByRole("region", { name: "New" })
    expect(row.getAttribute("data-slot")).toBe("media-feed")
    expect(row.getAttribute("data-layout")).toBe("row")
    expect(row.firstElementChild?.getAttribute("data-slot")).toBe(
      "media-feed-items"
    )
    const card = row.querySelector("[data-slot='preset-tile']")
    expect(card?.getAttribute("data-form")).toBe("clip")
    const slots = [...(card?.querySelectorAll("[data-slot]") ?? [])].map(
      (part) => part.getAttribute("data-slot")
    )
    expect(slots).toEqual([
      "preset-tile-clip",
      "preset-tile-name",
      "preset-tile-line",
    ])
    expect(document.querySelector("[data-slot^='promo']")).toBeNull()
  })

  it("shows a 36 px glass arrow at the row's right edge on hover while cards remain, and scrolls one card", () => {
    stubRowSize(2000, 1440)
    const scrollBy = vi.fn()
    Object.defineProperty(HTMLElement.prototype, "scrollBy", {
      configurable: true,
      value: scrollBy,
    })
    render(
      <PromoRow label="New" nextLabel="Next">
        {["image", "video", "audio"].map(card)}
      </PromoRow>
    )
    const next = screen.getByRole("button", { name: "Next" })
    expect(next.parentElement?.className.split(" ")).toEqual(
      expect.arrayContaining([
        "absolute",
        "right-1",
        "opacity-0",
        "group-hover/promo-row:opacity-100",
        "hidden",
        "@regular:flex",
      ])
    )
    expect(next.className.split(" ")).toEqual(
      expect.arrayContaining(["size-icon", "material-thin", "shadow-float"])
    )
    fireEvent.click(next)
    expect(scrollBy).toHaveBeenCalledTimes(1)
  })

  it("hides the arrow once the last card is in view", () => {
    stubRowSize(1440, 1440)
    render(
      <PromoRow label="New" nextLabel="Next">
        {["image", "video"].map(card)}
      </PromoRow>
    )
    expect(screen.queryByRole("button", { name: "Next" })).toBeNull()
  })

  it("holds a skeleton card of the same box while the cards load", () => {
    render(
      <PromoRow label="New" nextLabel="Next">
        <PromoSkeleton />
      </PromoRow>
    )
    const skeleton = screen
      .getByRole("region", { name: "New" })
      .querySelector("[data-slot='media-feed-items'] > div")
    expect(skeleton?.className.split(" ")).toEqual(
      expect.arrayContaining([cardWidth, "w-78", "gap-3"])
    )
    expect(skeleton?.querySelector(".aspect-video")).not.toBeNull()
    expect(skeleton?.getAttribute("aria-hidden")).toBe("true")
  })
})
