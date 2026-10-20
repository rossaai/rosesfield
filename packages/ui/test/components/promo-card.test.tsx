import { PromoCard, PromoRow } from "@rosesfield/ui/components/promo-card"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

afterEach(cleanup)

describe("PromoCard", () => {
  it("runs 512 px cards 20 px apart past the edge, each one link over a 16:9 figure", () => {
    render(
      <PromoRow label="New">
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
      expect.arrayContaining(["gap-5", "overflow-x-auto", "px-4"])
    )
    const link = screen.getByRole("link", { name: "Open Picture 2" })
    const card = link.closest("[data-slot='preset-tile']")
    expect(card?.className.split(" ")).toEqual(
      expect.arrayContaining(["@regular:w-128", "w-78"])
    )
    expect(card?.querySelector(".aspect-video")).not.toBeNull()
  })

  it("binds the preset tile record's clip form and the media feed record's row", () => {
    render(
      <PromoRow label="New">
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
})
